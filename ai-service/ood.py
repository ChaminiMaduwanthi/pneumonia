"""
Post-hoc out-of-distribution (OOD) detection for the LungVision AI models.

NO RETRAINING: this works on the already-trained Keras classifiers using only
inference-time signals derived from the model's existing forward pass.

The trained classifier ends in a 4-way softmax (COVID / Normal / Bacterial /
Viral). Softmax is *closed-world*: it always normalises to one of the 4 classes,
so a non-chest-X-ray, or a chest X-ray with an untrained condition, still gets a
confident label. That is unsafe for a clinical tool. These post-hoc signals let
us flag such inputs and withhold the prediction.

Signals
-------
1. Mahalanobis distance (Lee et al., 2018) in the penultimate feature space,
   with class-conditional means and a shared (tied) covariance. Strongest on
   *near-OOD* (e.g. a chest X-ray with a condition the model never saw).
2. Energy score (Liu et al., 2020):  E(x) = -logsumexp(logits).
   Aligned with input density and far less overconfident than softmax.
   Strongest on *far-OOD* (e.g. a photo that is not an X-ray at all).
   Requires the true pre-softmax logits, which softmax discards.
3. Max softmax probability (MSP, Hendrycks & Gimpel, 2017): reported as a
   familiar baseline; weak on its own (the very failure mode we are fixing).

The Gaussian statistics and the decision thresholds are fit ONCE by
`calibrate_ood.py` on the model's own in-distribution train/validation data and
saved as `<artifacts>/<model_key>_ood.npz` (+ a human-readable `.json`). This
module only *loads* and *applies* them — it never trains anything.
"""

from __future__ import annotations

import json
import os
import threading
from dataclasses import dataclass, field

import numpy as np
from tensorflow import keras

ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ood_artifacts")

# Valid combination policies for the final boolean verdict.
_POLICIES = {"maha", "energy", "msp", "energy_or_maha", "any", "majority"}


# ── Feature / logit extraction ───────────────────────────────────────────────
def build_feature_extractor(model: keras.Model):
    """
    Return (extractor, W, b) where:
      - `extractor` is a keras.Model mapping the input to the penultimate-layer
        features (the input to the final classification Dense layer), and
      - W, b are that final Dense layer's kernel/bias.

    logits = features @ W + b  (recovered exactly; softmax(logits) == model output)

    Works for all three registry models: the final layer is a Dense softmax and
    the layer feeding it is the penultimate representation.
    """
    classifier = model.layers[-1]
    weights = classifier.get_weights()
    if len(weights) != 2:
        raise ValueError(
            f"Expected final layer '{classifier.name}' to be a Dense(kernel, bias); "
            f"got {len(weights)} weight arrays."
        )
    W, b = weights
    penultimate = model.layers[-2].output
    extractor = keras.Model(model.inputs, penultimate, name=f"{model.name}_penultimate")
    return extractor, np.asarray(W, dtype=np.float64), np.asarray(b, dtype=np.float64)


def features_to_logits(features: np.ndarray, W: np.ndarray, b: np.ndarray) -> np.ndarray:
    return features.astype(np.float64) @ W + b


# ── Scalar score functions (batched; accept (N, ...) arrays) ─────────────────
def _softmax(logits: np.ndarray) -> np.ndarray:
    z = logits - logits.max(axis=-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)


def msp_score(logits: np.ndarray) -> np.ndarray:
    """Max softmax probability. Higher = more in-distribution."""
    return _softmax(logits).max(axis=-1)


def energy_score(logits: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    """
    Energy E(x) = -T * logsumexp(logits / T). LOWER (more negative) = more
    in-distribution; higher = more OOD.
    """
    z = logits / temperature
    lse = np.log(np.exp(z - z.max(axis=-1, keepdims=True)).sum(axis=-1)) + z.max(axis=-1)
    return -temperature * lse


def mahalanobis_min_dist(features: np.ndarray, means: np.ndarray, precision: np.ndarray) -> np.ndarray:
    """
    Squared Mahalanobis distance to the nearest class-conditional Gaussian.
    LOWER = more in-distribution; higher = more OOD.

    features: (N, D)  means: (C, D)  precision: (D, D) shared inverse covariance.
    """
    features = features.astype(np.float64)
    dists = np.empty((features.shape[0], means.shape[0]), dtype=np.float64)
    for c in range(means.shape[0]):
        diff = features - means[c]              # (N, D)
        dists[:, c] = np.einsum("nd,dk,nk->n", diff, precision, diff)
    return dists.min(axis=1)


# ── Detector ─────────────────────────────────────────────────────────────────
@dataclass
class OODResult:
    is_ood: bool
    confidence: float            # 0..1, how confident we are the input is OOD
    reason: str
    scores: dict = field(default_factory=dict)
    thresholds: dict = field(default_factory=dict)
    flags: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "is_ood": bool(self.is_ood),
            "ood_confidence": round(float(self.confidence), 3),
            "reason": self.reason,
            "scores": {k: round(float(v), 4) for k, v in self.scores.items()},
            "thresholds": {k: round(float(v), 4) for k, v in self.thresholds.items()},
            "flags": {k: bool(v) for k, v in self.flags.items()},
        }


class OODDetector:
    """Loads calibration artifacts for one model and assesses single samples."""

    def __init__(self, model_key, means, precision, thresholds, meta):
        self.model_key = model_key
        self.means = np.asarray(means, dtype=np.float64)
        self.precision = np.asarray(precision, dtype=np.float64)
        self.thresholds = dict(thresholds)             # energy, maha, msp
        self.meta = dict(meta)
        self.temperature = float(meta.get("temperature", 1.0))
        # Allow runtime override of the decision policy without recalibrating.
        self.policy = os.getenv("OOD_POLICY", meta.get("policy", "maha")).lower()
        if self.policy not in _POLICIES:
            self.policy = "maha"

    # -- loading ---------------------------------------------------------------
    @classmethod
    def artifact_paths(cls, model_key: str):
        base = os.path.join(ARTIFACTS_DIR, f"{model_key}_ood")
        return base + ".npz", base + ".json"

    @classmethod
    def load(cls, model_key: str) -> "OODDetector | None":
        npz_path, json_path = cls.artifact_paths(model_key)
        if not (os.path.exists(npz_path) and os.path.exists(json_path)):
            return None
        arr = np.load(npz_path)
        with open(json_path, "r", encoding="utf-8") as fh:
            meta = json.load(fh)
        return cls(
            model_key=model_key,
            means=arr["means"],
            precision=arr["precision"],
            thresholds=meta["thresholds"],
            meta=meta,
        )

    # -- assessment ------------------------------------------------------------
    def assess(self, features: np.ndarray, logits: np.ndarray) -> OODResult:
        """
        features: (1, D) or (D,)   logits: (1, C) or (C,)
        Returns an OODResult for the single sample.
        """
        feats = np.atleast_2d(features)
        lg = np.atleast_2d(logits)

        energy = float(energy_score(lg, self.temperature)[0])
        maha = float(mahalanobis_min_dist(feats, self.means, self.precision)[0])
        msp = float(msp_score(lg)[0])

        t = self.thresholds
        flags = {
            "energy": energy > t["energy"],     # high energy  -> OOD
            "maha": maha > t["maha"],           # far from all class means -> OOD
            "msp": msp < t["msp"],              # low max-prob -> OOD
        }

        if self.policy == "maha":
            is_ood = flags["maha"]
        elif self.policy == "energy":
            is_ood = flags["energy"]
        elif self.policy == "msp":
            is_ood = flags["msp"]
        elif self.policy == "energy_or_maha":
            is_ood = flags["energy"] or flags["maha"]
        elif self.policy == "any":
            is_ood = any(flags.values())
        elif self.policy == "majority":
            is_ood = sum(flags.values()) >= 2
        else:
            is_ood = flags["energy"] or flags["maha"]

        reason = self._reason(is_ood, flags)
        confidence = self._confidence(energy, maha, msp, flags, is_ood)

        return OODResult(
            is_ood=is_ood,
            confidence=confidence,
            reason=reason,
            scores={"energy": energy, "mahalanobis": maha, "msp": msp},
            thresholds={"energy": t["energy"], "mahalanobis": t["maha"], "msp": t["msp"]},
            flags=flags,
        )

    def _reason(self, is_ood: bool, flags: dict) -> str:
        if not is_ood:
            return "Input looks consistent with the training distribution of chest X-rays."
        fired = []
        if flags["maha"]:
            fired.append("its feature representation is far from every known class (Mahalanobis)")
        if flags["energy"]:
            fired.append("its energy score is outside the in-distribution range")
        if flags["msp"]:
            fired.append("the model's maximum class probability is unusually low")
        return (
            "Input flagged as out-of-distribution: "
            + "; ".join(fired)
            + ". The prediction below is unreliable and is shown for reference only."
        )

    def _confidence(self, energy, maha, msp, flags, is_ood) -> float:
        """
        Bounded 0..1 measure of OOD-ness: 0 for clearly in-distribution, growing
        toward 1 the further a signal exceeds its threshold. Computed only from
        the signal(s) the active policy considers, so it is consistent with the
        is_ood verdict. Not a calibrated probability.
        """
        t = self.thresholds
        # Normalised exceedance past each threshold (0 if not exceeded).
        exceed = {
            "maha": max(0.0, (maha - t["maha"]) / (abs(t["maha"]) + 1e-6)),
            "energy": max(0.0, (energy - t["energy"]) / (abs(t["energy"]) + 1e-6)),
            "msp": max(0.0, (t["msp"] - msp) / (abs(t["msp"]) + 1e-6)),
        }
        if self.policy == "maha":
            m = exceed["maha"]
        elif self.policy == "energy":
            m = exceed["energy"]
        elif self.policy == "msp":
            m = exceed["msp"]
        elif self.policy == "energy_or_maha":
            m = max(exceed["energy"], exceed["maha"])
        else:  # any / majority -> strongest evidence across all signals
            m = max(exceed.values())
        return float(max(0.0, min(1.0, m)))


# ── Registry-style cache so the service loads each detector once ─────────────
_detectors: dict[str, "OODDetector | None"] = {}
_load_lock = threading.Lock()


def get_detector(model_key: str) -> "OODDetector | None":
    """Return a cached detector for `model_key`, or None if not calibrated yet."""
    if model_key in _detectors:
        return _detectors[model_key]
    with _load_lock:
        if model_key not in _detectors:
            _detectors[model_key] = OODDetector.load(model_key)
    return _detectors[model_key]
