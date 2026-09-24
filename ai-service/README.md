# LungVision AI — Inference Service

Python microservice that serves the trained Keras models to the PHP backend.
**DenseNet121 is the default production model** (highest test accuracy, 85.31%).

## Models

| Key                | Architecture      | Input   | Preprocessing            |
| ------------------ | ----------------- | ------- | ------------------------ |
| `densenet121` ⭐    | DenseNet121       | 224×224 | rescale 1/255            |
| `efficientnetv2b3` | EfficientNetV2B3  | 300×300 | `preprocess_input`       |
| `efficientnetv2s`  | EfficientNetV2S   | 300×300 | rescale 1/255            |

Classes (fixed order): `COVID-19`, `Normal`, `Bacterial Pneumonia`, `Viral Pneumonia`.

The model files are read from `../models/<Arch>/<workspace>/<Arch>_final.keras`.

## Setup

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

## Run

```bash
.venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8001
```

The PHP backend expects the service at `http://127.0.0.1:8001` (override with
`AI_SERVICE_URL` in `backend/config/ai.php`). Keep this process running alongside
Apache/MySQL.

## Endpoints

- `GET  /health` — service status + loaded models
- `GET  /models` — registry + class list
- `POST /predict` — multipart `image` (file), optional `model` (form field).
  Returns `disease`, `disease_confidence`, per-class `scores`, an `ood` verdict
  block, a base64 Grad-CAM PNG (`gradcam_base64`) and an `explanation`.

Quick test:

```bash
curl -F "image=@../backend/uploads/xrays/<some>.jpg" http://127.0.0.1:8001/predict
```

## Out-of-distribution (OOD) detection — post-hoc, no retraining

A 4-way softmax is closed-world: a non-X-ray photo, or a chest X-ray with an
untrained condition, still gets a confident label. That is unsafe for a clinical
tool. We flag such inputs using only **inference-time** signals on the already
trained model (see `ood.py`):

| Signal           | Space            | Strong at | Notes |
| ---------------- | ---------------- | --------- | ----- |
| **Mahalanobis**  | penultimate feat | near-OOD  | class Gaussians + tied covariance; **primary verdict** |
| Energy           | logits           | far-OOD   | `-logsumexp(logits)`; reported (weak on this model — overconfident logits) |
| Max softmax prob | softmax          | baseline  | reported only |

The Gaussian statistics and thresholds are fit **once** on the model's own
training/validation split (`calibrate_ood.py`) — forward passes only, no
gradient updates:

```bash
.venv\Scripts\python calibrate_ood.py --model densenet121
# writes ood_artifacts/densenet121_ood.npz + .json
```

Thresholds target a configurable ID retention (`--id-retention`, default 0.95 →
flag ~5% of genuine scans). Tune strictness at runtime without recalibrating via
`OOD_POLICY` (`maha` | `energy` | `msp` | `energy_or_maha` | `any` | `majority`).
`GET /health` reports which models are calibrated. If artifacts are absent the
service still runs and returns `ood.available = false`.

The `/predict` `ood` block:

```json
"ood": {
  "available": true, "is_ood": true, "ood_confidence": 0.71,
  "reason": "Input flagged as out-of-distribution: its feature representation is far from every known class (Mahalanobis). ...",
  "scores": {"energy": -4.7, "mahalanobis": 9142.8, "msp": 0.52},
  "thresholds": {"energy": -3.39, "mahalanobis": 458.9, "msp": 0.55},
  "flags": {"energy": false, "maha": true, "msp": true}
}
```

## Switching the default model

Set `DEFAULT_MODEL` (and optionally `PRELOAD_MODELS`) before launching, e.g.

```bash
set DEFAULT_MODEL=efficientnetv2s
```
