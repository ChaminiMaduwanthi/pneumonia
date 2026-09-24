"""
Calibrate the post-hoc OOD detector for a trained model — NO RETRAINING.

What it does (forward passes only):
  1. Reads the model's own train/val split (`data_split.csv` produced during
     training) so calibration uses exactly the in-distribution (ID) data the
     model was trained on.
  2. Extracts penultimate features for ID *train* images and fits class-
     conditional Gaussians with a shared (tied) covariance  ->  Mahalanobis.
  3. Scores ID *val* images (Energy / Mahalanobis / MSP) and sets each
     threshold to retain a target fraction of genuine ID scans.
  4. Saves artifacts to  ood_artifacts/<model>_ood.npz  (+ .json).
  5. Reports measured ID retention on val/test and an indicative separation
     against synthetic far-OOD images (noise / gradients) for a sanity check.

Usage:
    .venv\\Scripts\\python calibrate_ood.py                 # densenet121, defaults
    .venv\\Scripts\\python calibrate_ood.py --model densenet121 --id-retention 0.95
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import time

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")

import numpy as np
import tensorflow as tf
from PIL import Image

import config
import inference
import ood


def _forward(extractor, batch: np.ndarray) -> np.ndarray:
    """Penultimate-feature forward pass. predict_on_batch is the fastest path here:
    it uses the compiled graph (unlike eager __call__, slow on deep nets) without
    predict()'s per-call dataset overhead."""
    return np.asarray(extractor.predict_on_batch(batch))

_BASE = os.path.dirname(os.path.abspath(__file__))

# Default split file per model (created by the training notebooks).
_DEFAULT_SPLIT = {
    "densenet121": os.path.join(config._MODELS_ROOT, "DenseNet121", "densenet121_workspace", "data_split.csv"),
    "efficientnetv2b3": os.path.join(config._MODELS_ROOT, "EfficientNetV2B3", "efficientnetv2b3_workspace", "data_split.csv"),
    "efficientnetv2s": os.path.join(config._MODELS_ROOT, "EfficientNetV2S", "efficientnetv2s_workspace", "data_split.csv"),
}


# ── Data loading ─────────────────────────────────────────────────────────────
def read_split(csv_path: str):
    """Return {'train': [(path,label_idx)], 'val': [...], 'test': [...]}."""
    label_to_idx = {name: i for i, name in enumerate(config.CLASS_NAMES)}
    rows = {"train": [], "val": [], "test": []}
    with open(csv_path, newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            split = r["split"].strip()
            label = r["label"].strip()
            if split in rows and label in label_to_idx:
                rows[split].append((r["filepath"].strip(), label_to_idx[label]))
    return rows


def _subsample_per_class(items, per_class, n_classes, seed=0):
    if per_class is None or per_class <= 0:
        return items
    rng = np.random.default_rng(seed)
    by_cls = {c: [] for c in range(n_classes)}
    for path, y in items:
        by_cls[y].append((path, y))
    out = []
    for c, lst in by_cls.items():
        idx = rng.permutation(len(lst))[:per_class]
        out.extend(lst[i] for i in idx)
    rng.shuffle(out)
    return out


def extract_features(items, extractor, W, b, model_key, batch_size=32, log_every=256):
    """Run forward passes; return (features (N,D), logits (N,C), labels (N,))."""
    feats, logits, labels = [], [], []
    buf_imgs, buf_lbls = [], []
    done = 0
    t0 = time.time()

    def flush():
        nonlocal done
        if not buf_imgs:
            return
        batch = np.concatenate(buf_imgs, axis=0)
        f = _forward(extractor, batch)
        feats.append(f)
        logits.append(ood.features_to_logits(f, W, b))
        labels.extend(buf_lbls)
        done += len(buf_lbls)
        buf_imgs.clear()
        buf_lbls.clear()

    for path, y in items:
        try:
            img = Image.open(path)
            buf_imgs.append(inference._preprocess(img, model_key))
            buf_lbls.append(y)
        except Exception:
            continue
        if len(buf_imgs) >= batch_size:
            flush()
            if done % log_every < batch_size:
                rate = done / max(time.time() - t0, 1e-6)
                print(f"    ...{done} images ({rate:.1f}/s)", flush=True)
    flush()

    if not feats:
        return np.empty((0,)), np.empty((0,)), np.empty((0,))
    return np.concatenate(feats, 0), np.concatenate(logits, 0), np.asarray(labels)


# ── Gaussian fit (tied covariance) ───────────────────────────────────────────
def fit_gaussians(features: np.ndarray, labels: np.ndarray, n_classes: int, shrinkage: float):
    D = features.shape[1]
    means = np.zeros((n_classes, D), dtype=np.float64)
    centered = np.empty_like(features, dtype=np.float64)
    n_used = 0
    for c in range(n_classes):
        mask = labels == c
        if not mask.any():
            raise ValueError(f"No training features for class index {c} ({config.CLASS_NAMES[c]}).")
        mu = features[mask].mean(axis=0)
        means[c] = mu
        centered[mask] = features[mask] - mu
        n_used += int(mask.sum())

    # Pooled (shared) covariance, as in Lee et al. (2018).
    cov = (centered.T @ centered) / max(n_used - n_classes, 1)
    mu_diag = np.trace(cov) / D
    cov_shrunk = (1.0 - shrinkage) * cov + shrinkage * mu_diag * np.eye(D)
    try:
        precision = np.linalg.inv(cov_shrunk)
    except np.linalg.LinAlgError:
        precision = np.linalg.pinv(cov_shrunk)
    return means, precision


# ── Synthetic far-OOD (for an indicative separation check only) ──────────────
def synthetic_ood_batch(model_key: str, n: int = 60, seed: int = 123):
    rng = np.random.default_rng(seed)
    size = config.MODELS[model_key]["img_size"]
    out = []
    for i in range(n):
        kind = i % 3
        if kind == 0:                                   # uniform RGB noise
            arr = rng.integers(0, 256, (size[0], size[1], 3), dtype=np.uint8)
        elif kind == 1:                                 # smooth gradient
            g = np.linspace(0, 255, size[1], dtype=np.uint8)
            arr = np.repeat(g[None, :, None], size[0], 0).repeat(3, 2)
        else:                                           # solid random colour blocks
            arr = np.full((size[0], size[1], 3), rng.integers(0, 256, 3), dtype=np.uint8)
        out.append(inference._preprocess(Image.fromarray(arr, "RGB"), model_key))
    return np.concatenate(out, 0)


def auroc(id_scores: np.ndarray, ood_scores: np.ndarray) -> float:
    """AUROC treating higher score = more OOD. Rank-based (Mann–Whitney)."""
    y = np.concatenate([np.zeros(len(id_scores)), np.ones(len(ood_scores))])
    s = np.concatenate([id_scores, ood_scores])
    order = np.argsort(s, kind="mergesort")
    ranks = np.empty(len(s), dtype=np.float64)
    ranks[order] = np.arange(1, len(s) + 1)
    n_pos = y.sum()
    n_neg = len(y) - n_pos
    if n_pos == 0 or n_neg == 0:
        return float("nan")
    return float((ranks[y == 1].sum() - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg))


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=config.DEFAULT_MODEL)
    ap.add_argument("--data-split", default=None, help="Path to data_split.csv")
    ap.add_argument("--per-class-train", type=int, default=300)
    ap.add_argument("--per-class-val", type=int, default=150)
    ap.add_argument("--id-retention", type=float, default=0.95,
                    help="Fraction of genuine ID val scans each threshold should keep.")
    ap.add_argument("--policy", default="maha", choices=sorted(ood._POLICIES),
                    help="Decision policy. 'maha' (Mahalanobis) is the strongest single "
                         "signal here; energy/msp are still computed and reported.")
    ap.add_argument("--shrinkage", type=float, default=0.01)
    ap.add_argument("--temperature", type=float, default=1.0)
    ap.add_argument("--batch-size", type=int, default=64)
    args = ap.parse_args()

    model_key = args.model.lower()
    if model_key not in config.MODELS:
        raise SystemExit(f"Unknown model '{model_key}'. Choices: {list(config.MODELS)}")
    split_path = args.data_split or _DEFAULT_SPLIT.get(model_key)
    if not split_path or not os.path.exists(split_path):
        raise SystemExit(f"data_split.csv not found: {split_path}")

    n_classes = len(config.CLASS_NAMES)
    print(f"[1/6] Loading model '{model_key}' ...", flush=True)
    model = inference.load_model(model_key)
    extractor, W, b = ood.build_feature_extractor(model)

    print(f"[2/6] Reading split: {split_path}", flush=True)
    splits = read_split(split_path)
    print(f"      train={len(splits['train'])} val={len(splits['val'])} test={len(splits['test'])}", flush=True)

    train_items = _subsample_per_class(splits["train"], args.per_class_train, n_classes, seed=1)
    val_items = _subsample_per_class(splits["val"], args.per_class_val, n_classes, seed=2)
    test_items = _subsample_per_class(splits["test"], args.per_class_val, n_classes, seed=3)

    print(f"[3/6] Extracting ID train features ({len(train_items)} imgs) ...", flush=True)
    tr_feats, _, tr_labels = extract_features(train_items, extractor, W, b, model_key, args.batch_size)
    if len(tr_feats) == 0:
        raise SystemExit("No training features extracted — check that dataset paths in the CSV exist.")
    print(f"      got {tr_feats.shape[0]} feature vectors, dim={tr_feats.shape[1]}", flush=True)

    print("[4/6] Fitting class Gaussians (tied covariance) ...", flush=True)
    means, precision = fit_gaussians(tr_feats, tr_labels, n_classes, args.shrinkage)

    print(f"[5/6] Scoring ID val ({len(val_items)} imgs) to set thresholds ...", flush=True)
    val_feats, val_logits, _ = extract_features(val_items, extractor, W, b, model_key, args.batch_size)
    energy_val = ood.energy_score(val_logits, args.temperature)
    maha_val = ood.mahalanobis_min_dist(val_feats, means, precision)
    msp_val = ood.msp_score(val_logits)

    ret = args.id_retention
    thr = {
        "energy": float(np.quantile(energy_val, ret)),       # OOD if above
        "maha": float(np.quantile(maha_val, ret)),           # OOD if above
        "msp": float(np.quantile(msp_val, 1.0 - ret)),       # OOD if below
    }

    # Measured ID retention of the *combined* policy on val + held-out test.
    def policy_keep(feats, logits):
        e = ood.energy_score(logits, args.temperature)
        m = ood.mahalanobis_min_dist(feats, means, precision)
        p = ood.msp_score(logits)
        f_e, f_m, f_p = e > thr["energy"], m > thr["maha"], p < thr["msp"]
        if args.policy == "maha": is_ood = f_m
        elif args.policy == "energy": is_ood = f_e
        elif args.policy == "msp": is_ood = f_p
        elif args.policy == "energy_or_maha": is_ood = f_e | f_m
        elif args.policy == "any": is_ood = f_e | f_m | f_p
        else: is_ood = (f_e.astype(int) + f_m.astype(int) + f_p.astype(int)) >= 2
        return 1.0 - is_ood.mean()

    val_keep = policy_keep(val_feats, val_logits)
    test_feats, test_logits, _ = extract_features(test_items, extractor, W, b, model_key, args.batch_size)
    test_keep = policy_keep(test_feats, test_logits)

    # Indicative separation vs synthetic far-OOD.
    print("[6/6] Sanity check vs synthetic far-OOD ...", flush=True)
    ood_batch = synthetic_ood_batch(model_key)
    ood_feats = _forward(extractor, ood_batch)
    ood_logits = ood.features_to_logits(ood_feats, W, b)
    energy_ood = ood.energy_score(ood_logits, args.temperature)
    maha_ood = ood.mahalanobis_min_dist(ood_feats, means, precision)
    auroc_energy = auroc(energy_val, energy_ood)
    auroc_maha = auroc(maha_val, maha_ood)
    syn_keep = policy_keep(ood_feats, ood_logits)
    syn_flag_rate = 1.0 - syn_keep

    # ── Save artifacts ────────────────────────────────────────────────────────
    os.makedirs(ood.ARTIFACTS_DIR, exist_ok=True)
    npz_path, json_path = ood.OODDetector.artifact_paths(model_key)
    np.savez(npz_path, means=means, precision=precision)
    meta = {
        "model": model_key,
        "model_label": config.MODELS[model_key]["label"],
        "class_names": config.CLASS_NAMES,
        "feature_dim": int(tr_feats.shape[1]),
        "policy": args.policy,
        "temperature": args.temperature,
        "id_retention_target": ret,
        "shrinkage": args.shrinkage,
        "thresholds": thr,
        "measured_id_retention": {"val": round(float(val_keep), 4), "test": round(float(test_keep), 4)},
        "synthetic_far_ood_flag_rate": round(float(syn_flag_rate), 4),
        "auroc_vs_synthetic_far_ood": {"energy": round(auroc_energy, 4), "mahalanobis": round(auroc_maha, 4)},
        "n_train_features": int(tr_feats.shape[0]),
        "n_val_features": int(val_feats.shape[0]),
    }
    with open(json_path, "w", encoding="utf-8") as fh:
        json.dump(meta, fh, indent=2)

    print("\n------------ calibration complete ------------")
    print(f"  thresholds        : energy>{thr['energy']:.3f}  maha>{thr['maha']:.2f}  msp<{thr['msp']:.4f}")
    print(f"  policy            : {args.policy}")
    print(f"  ID retention      : val={val_keep:.1%}  test={test_keep:.1%}  (target {ret:.0%})")
    print(f"  far-OOD flagged   : {syn_flag_rate:.1%} of synthetic non-X-ray images")
    print(f"  AUROC vs far-OOD  : energy={auroc_energy:.3f}  mahalanobis={auroc_maha:.3f}")
    print(f"  artifacts         : {os.path.relpath(npz_path, _BASE)} , {os.path.relpath(json_path, _BASE)}")


if __name__ == "__main__":
    main()
