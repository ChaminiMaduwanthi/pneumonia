"""
Model registry and label configuration for the LungVision AI inference service.

All three models were trained on the same 4-class Mendeley Chest X-Ray dataset with
the class order fixed by `sorted(labels)` in the training notebooks:

    Class indices: {'COVID': 0, 'Normal': 1, 'Pneumonia-Bacterial': 2, 'Pneumonia-Viral': 3}

Preprocessing differs per model (taken directly from each training notebook):
    DenseNet121      -> 224x224, rescale 1/255
    EfficientNetV2B3 -> 300x300, efficientnet_v2.preprocess_input  ([-1, 1])
    EfficientNetV2S  -> 300x300, rescale 1/255
"""

import os

# ── Training class order (DO NOT REORDER — matches the softmax output indices) ──
CLASS_NAMES = ["COVID", "Normal", "Pneumonia-Bacterial", "Pneumonia-Viral"]

# Human-friendly labels shown in the web UI / stored as `disease`.
DISPLAY_NAMES = {
    "COVID": "COVID-19",
    "Normal": "Normal",
    "Pneumonia-Bacterial": "Bacterial Pneumonia",
    "Pneumonia-Viral": "Viral Pneumonia",
}

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(_BASE_DIR, "..", "models"))

# ── Model registry ─────────────────────────────────────────────────────────────
# `preprocess` is one of: "rescale" (x/255) or "effnetv2" (preprocess_input).
MODELS = {
    "densenet121": {
        "label": "DenseNet121",
        "path": os.path.join(_MODELS_ROOT, "DenseNet121", "densenet121_workspace", "DenseNet121_final.keras"),
        "img_size": (224, 224),
        "preprocess": "rescale",
        "test_accuracy": 85.31,
    },
    "efficientnetv2b3": {
        "label": "EfficientNetV2B3",
        "path": os.path.join(_MODELS_ROOT, "EfficientNetV2B3", "efficientnetv2b3_workspace", "EfficientNetV2B3_final.keras"),
        "img_size": (300, 300),
        "preprocess": "effnetv2",
        "test_accuracy": 84.30,
    },
    "efficientnetv2s": {
        "label": "EfficientNetV2S",
        "path": os.path.join(_MODELS_ROOT, "EfficientNetV2S", "efficientnetv2s_workspace", "EfficientNetV2S_final.keras"),
        "img_size": (300, 300),
        "preprocess": "rescale",
        "test_accuracy": 80.54,
    },
}

# DenseNet121 is the default production model (highest test accuracy).
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "densenet121").lower()

# Models to load eagerly at startup. By default only the production model is
# loaded to keep memory/startup low; set PRELOAD_MODELS="all" to load every model.
_preload = os.getenv("PRELOAD_MODELS", DEFAULT_MODEL).lower()
if _preload == "all":
    PRELOAD_MODELS = list(MODELS.keys())
else:
    PRELOAD_MODELS = [m.strip() for m in _preload.split(",") if m.strip() in MODELS]
    if not PRELOAD_MODELS:
        PRELOAD_MODELS = [DEFAULT_MODEL]

HOST = os.getenv("AI_SERVICE_HOST", "127.0.0.1")
PORT = int(os.getenv("AI_SERVICE_PORT", "8001"))
