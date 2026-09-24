"""
Model loading, preprocessing, prediction and Grad-CAM for the LungVision AI service.

Lazily loads Keras models on first use and caches them. Grad-CAM is implemented in
an architecture-agnostic way: it locates the last 4-D (convolutional) feature map in
the model graph — which is the nested backbone layer (`densenet121` / `efficientnetv2-*`)
in these models — and computes class-discriminative localisation from it.
"""

import os
import threading

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")  # CPU inference is plenty for single images

import cv2
import numpy as np
import tensorflow as tf
from tensorflow import keras
from PIL import Image

from config import MODELS, CLASS_NAMES, DISPLAY_NAMES
import lungmask
import ood

_loaded: dict[str, keras.Model] = {}
_grad_models: dict[str, keras.Model] = {}
_extractors: dict[str, tuple] = {}        # model_key -> (penultimate extractor, W, b)
_locks: dict[str, threading.Lock] = {key: threading.Lock() for key in MODELS}
_gradcam_failed: set[str] = set()


# ── Model loading ───────────────────────────────────────────────────────────────
def load_model(model_key: str) -> keras.Model:
    """Load (and cache) a model by registry key. Thread-safe per model."""
    if model_key not in MODELS:
        raise KeyError(f"Unknown model '{model_key}'. Available: {list(MODELS)}")
    if model_key in _loaded:
        return _loaded[model_key]

    with _locks[model_key]:
        if model_key in _loaded:  # re-check inside the lock
            return _loaded[model_key]
        path = MODELS[model_key]["path"]
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model file not found for '{model_key}': {path}")
        model = keras.models.load_model(path, compile=False)
        _loaded[model_key] = model
        return model


def _get_extractor(model: keras.Model, model_key: str):
    """Cached (penultimate-feature extractor, W, b) for the model's classifier head."""
    if model_key not in _extractors:
        with _locks[model_key]:
            if model_key not in _extractors:
                _extractors[model_key] = ood.build_feature_extractor(model)
    return _extractors[model_key]


# ── Preprocessing ───────────────────────────────────────────────────────────────
def _preprocess(image: Image.Image, model_key: str) -> np.ndarray:
    cfg = MODELS[model_key]
    size = cfg["img_size"]  # (h, w) — square here
    img = image.convert("RGB").resize((size[1], size[0]))
    arr = np.asarray(img, dtype=np.float32)

    if cfg["preprocess"] == "rescale":
        arr = arr / 255.0
    elif cfg["preprocess"] == "effnetv2":
        arr = keras.applications.efficientnet_v2.preprocess_input(arr)
    else:
        raise ValueError(f"Unknown preprocess mode: {cfg['preprocess']}")

    return np.expand_dims(arr, axis=0)


# ── Grad-CAM ────────────────────────────────────────────────────────────────────
def _last_conv_index(model: keras.Model) -> int | None:
    """Index of the last layer producing a 4-D (B, H, W, C) feature map."""
    for i in range(len(model.layers) - 1, -1, -1):
        try:
            shape = model.layers[i].output.shape
        except (AttributeError, ValueError):
            continue
        if shape is not None and len(shape) == 4:
            return i
    return None


def _get_grad_model(model: keras.Model, model_key: str) -> keras.Model | None:
    """
    Build (and cache) a model that maps the input to [conv_features, logits].

    The backbone (DenseNet121 / EfficientNetV2*) is a *nested* functional layer, so its
    intermediate `.output` is not part of the outer graph. We instead re-run the forward
    pass — backbone, then each head layer in order — which connects the feature map to the
    input and lets us differentiate the class score with respect to it.

    Important: the second output is the **pre-softmax logit**, not the softmax probability.
    Grad-CAM must differentiate the logit — softmax saturates at high confidence (∂p/∂A ≈ 0
    when p ≈ 1), which is the norm here, and would yield vanishing/degenerate heatmaps.
    We rebuild the final classifier as a linear Dense carrying the same weights, leaving the
    original (softmax) model untouched.
    """
    if model_key in _grad_models:
        return _grad_models[model_key]

    conv_index = _last_conv_index(model)
    if conv_index is None:
        return None

    backbone = model.layers[conv_index]
    classifier = model.layers[-1]
    inputs = model.inputs
    features = backbone(inputs[0])

    # Re-run the head up to (but excluding) the final classifier.
    x = features
    for layer in model.layers[conv_index + 1:-1]:
        x = layer(x)

    # Apply the final classifier WITHOUT its softmax activation -> logits.
    logit_layer = keras.layers.Dense(classifier.units, activation=None, name="gradcam_logits")
    logits = logit_layer(x)
    logit_layer.set_weights(classifier.get_weights())

    grad_model = keras.Model(inputs, [features, logits])
    _grad_models[model_key] = grad_model
    return grad_model


def _compute_heatmap(batch: np.ndarray, model: keras.Model, model_key: str, class_index: int) -> np.ndarray | None:
    grad_model = _get_grad_model(model, model_key)
    if grad_model is None:
        return None

    inputs = tf.convert_to_tensor(batch)
    with tf.GradientTape() as tape:
        conv_out, logits = grad_model(inputs, training=False)
        class_channel = logits[:, class_index]  # pre-softmax score y^c (no saturation)

    grads = tape.gradient(class_channel, conv_out)
    if grads is None:
        return None

    pooled = tf.reduce_mean(grads, axis=(0, 1, 2))
    conv_out = conv_out[0]
    heatmap = tf.squeeze(conv_out @ pooled[..., tf.newaxis])
    heatmap = tf.maximum(heatmap, 0)
    denom = tf.reduce_max(heatmap)
    if denom <= 0:
        return None
    heatmap = heatmap / denom
    return heatmap.numpy()


def _restrict_to_lungs(original: Image.Image, heatmap: np.ndarray) -> tuple[np.ndarray, float | None]:
    """
    Keep the explanation inside the lung fields, and report how much of the model's
    attention was there before masking.

    A DenseNet121 trained on whole radiographs spreads a lot of its attention over
    shoulders, image borders and burnt-in laterality markers rather than lung tissue
    — the shortcut behaviour documented by DeGrave et al., *AI for radiographic
    COVID-19 detection selects shortcuts over signal*, Nature Machine Intelligence 3
    (2021). Measured on this model, only ~45% of raw Grad-CAM mass lands in the lung
    field, which is what a uniform map would score.

    Restricting the displayed map to the lungs is the remedy used by Teixeira et al.
    (Sensors 21:7116, 2021). It is a presentation fix, not a cure: masking cannot make
    the classifier stop using out-of-lung pixels, so the *unmasked* in-lung fraction is
    returned alongside and reported to the user rather than quietly discarded.

    Returns (heatmap, lung_focus). `lung_focus` is None when no lung field could be
    found (non-radiograph input), in which case the map is left untouched.
    """
    base = np.asarray(original.convert("RGB"))
    mask = lungmask.lung_mask(base)
    if mask is None:
        return heatmap, None

    # Upsample the coarse 7x7 CAM first, then mask — masking at feature resolution
    # would quantise the lung boundary to ~32-pixel blocks.
    h, w = base.shape[:2]
    full = cv2.resize(heatmap, (w, h))
    total = float(full.sum())
    lung_focus = float((full * mask).sum() / total) if total > 0 else 0.0

    masked = full * mask
    peak = float(masked.max())
    if peak <= 0:
        # Nothing survived inside the lungs; keep the original rather than a blank map.
        return full, lung_focus
    return masked / peak, lung_focus


def _overlay(original: Image.Image, heatmap: np.ndarray, alpha: float = 0.6) -> Image.Image:
    base = np.asarray(original.convert("RGB")).astype(np.float32)
    h, w = base.shape[:2]
    heat = np.clip(cv2.resize(heatmap, (w, h)), 0.0, 1.0)
    colored = cv2.applyColorMap(np.uint8(255 * heat), cv2.COLORMAP_JET)
    colored = cv2.cvtColor(colored, cv2.COLOR_BGR2RGB).astype(np.float32)

    # Blend in proportion to the heat, so cold and masked-out areas show the
    # radiograph itself. A flat wash there would read as "evaluated and low" when
    # it actually means "outside the lung field, not part of the explanation".
    weight = (alpha * heat)[..., None]
    return Image.fromarray(np.uint8(base * (1 - weight) + colored * weight))


# ── Public API ──────────────────────────────────────────────────────────────────
def predict(image: Image.Image, model_key: str) -> dict:
    """Run classification + OOD assessment + Grad-CAM. Returns scores, prediction,
    an out-of-distribution verdict and the heatmap image."""
    model = load_model(model_key)
    batch = _preprocess(image, model_key)

    # One forward pass to the penultimate layer yields features (for Mahalanobis OOD),
    # logits (for energy OOD) and softmax probabilities all at once — softmax(logits)
    # equals the model's own output exactly.
    extractor, W, b = _get_extractor(model, model_key)
    features = np.asarray(extractor.predict_on_batch(batch), dtype=np.float64)  # (1, D)
    logits = ood.features_to_logits(features, W, b)                             # (1, C)
    probs = ood._softmax(logits)[0]
    probs = np.asarray(probs, dtype=float)

    # Post-hoc out-of-distribution check (no retraining). If the model has not been
    # calibrated yet (no artifacts), this is reported as unavailable rather than failing.
    ood_block = _assess_ood(model_key, features, logits)

    top_index = int(np.argmax(probs))
    raw_class = CLASS_NAMES[top_index]

    # Per-class softmax confidence keyed by friendly display names.
    scores = {DISPLAY_NAMES[CLASS_NAMES[i]]: round(float(probs[i]) * 100, 2) for i in range(len(CLASS_NAMES))}

    # Per-scan prediction confidence. Capped at 99.9% — as a clinical decision-support
    # tool it should never present absolute (100%) certainty for a single image.
    confidence = min(round(float(probs[top_index]) * 100, 1), 99.9)

    gradcam_image = None
    lung_focus = None
    if model_key not in _gradcam_failed:
        try:
            heatmap = _compute_heatmap(batch, model, model_key, top_index)
            if heatmap is not None:
                heatmap, lung_focus = _restrict_to_lungs(image, heatmap)
                gradcam_image = _overlay(image, heatmap)
        except Exception:
            # Grad-CAM is best-effort: never fail a prediction because of it.
            _gradcam_failed.add(model_key)
            gradcam_image = None

    return {
        "model": model_key,
        "model_label": MODELS[model_key]["label"],
        "model_accuracy": MODELS[model_key].get("test_accuracy"),
        "predicted_class": DISPLAY_NAMES[raw_class],
        "predicted_class_raw": raw_class,
        "confidence": confidence,
        "scores": scores,
        "ood": ood_block,
        "gradcam_image": gradcam_image,  # PIL.Image or None
        # Share of the raw (unmasked) Grad-CAM mass that fell inside the lung fields.
        # None when the lung field could not be estimated. See _restrict_to_lungs.
        "lung_focus": lung_focus,
    }


def _assess_ood(model_key: str, features: np.ndarray, logits: np.ndarray) -> dict:
    """Run the calibrated OOD detector if available; degrade gracefully otherwise."""
    detector = ood.get_detector(model_key)
    if detector is None:
        return {
            "available": False,
            "is_ood": False,
            "reason": "OOD detector not calibrated for this model (run calibrate_ood.py).",
        }
    result = detector.assess(features, logits).to_dict()
    result["available"] = True
    return result
