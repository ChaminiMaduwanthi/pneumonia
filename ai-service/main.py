"""
LungVision AI — inference microservice.

A small FastAPI service that the PHP backend calls to run real predictions with the
trained Keras models (DenseNet121 by default) and returns class probabilities plus a
Grad-CAM heatmap. Run with:

    uvicorn main:app --host 127.0.0.1 --port 8001
"""

import base64
import io
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

import config
import inference
import ood


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Warm up the production model(s) so the first real request is fast.
    for key in config.PRELOAD_MODELS:
        try:
            inference.load_model(key)
            print(f"[startup] loaded model: {key} ({config.MODELS[key]['label']})")
        except Exception as exc:  # don't block startup if one model is missing
            print(f"[startup] WARNING could not load '{key}': {exc}")
    yield


app = FastAPI(title="LungVision AI Inference", version="1.0.0", lifespan=lifespan)


def _png_base64(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "default_model": config.DEFAULT_MODEL,
        "loaded_models": list(inference._loaded.keys()),
        "available_models": list(config.MODELS.keys()),
        "ood_calibrated": {key: ood.get_detector(key) is not None for key in config.MODELS},
    }


@app.get("/models")
def models():
    return {
        "default": config.DEFAULT_MODEL,
        "models": {
            key: {
                "label": cfg["label"],
                "img_size": cfg["img_size"],
                "preprocess": cfg["preprocess"],
                "test_accuracy": cfg["test_accuracy"],
            }
            for key, cfg in config.MODELS.items()
        },
        "classes": [config.DISPLAY_NAMES[c] for c in config.CLASS_NAMES],
    }


@app.post("/predict")
async def predict(
    image: UploadFile = File(...),
    model: str = Form(default=""),
):
    model_key = (model or config.DEFAULT_MODEL).lower()
    if model_key not in config.MODELS:
        raise HTTPException(status_code=400, detail=f"Unknown model '{model_key}'")

    raw = await image.read()
    try:
        pil_image = Image.open(io.BytesIO(raw))
        pil_image.load()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=422, detail="Uploaded file is not a valid image")

    try:
        result = inference.predict(pil_image, model_key)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}")

    gradcam = result.pop("gradcam_image")
    confidence = result["confidence"]
    lung_focus = result.get("lung_focus")
    ood_block = result.get("ood", {"available": False, "is_ood": False})

    if ood_block.get("is_ood"):
        explanation = (
            f"Warning - out-of-distribution input. {ood_block.get('reason', '')} "
            f"The closest in-distribution class would be {result['predicted_class']} "
            f"({confidence}% softmax confidence), but this result should not be trusted."
        )
    elif lung_focus is None:
        explanation = (
            f"The highlighted regions show the areas most influential to the "
            f"{result['predicted_class']} prediction ({confidence}% confidence)."
        )
    else:
        explanation = (
            f"The highlighted regions show the areas most influential to the "
            f"{result['predicted_class']} prediction ({confidence}% confidence), "
            f"restricted to the detected lung fields."
        )
        # Be explicit when most of the model's attention sat outside the lungs: the
        # masked picture looks clean, but the decision was not driven by lung tissue.
        if lung_focus < 0.5:
            explanation += (
                f" Note: only {round(lung_focus * 100)}% of the model's attention fell "
                f"inside the lungs, so this result should be interpreted with caution."
            )

    return JSONResponse(
        {
            "success": True,
            "model": result["model"],
            "model_label": result["model_label"],
            "model_accuracy": result["model_accuracy"],
            "disease": result["predicted_class"],
            "disease_raw": result["predicted_class_raw"],
            "disease_confidence": confidence,
            "scores": result["scores"],
            "ood": ood_block,
            "lung_focus": lung_focus,
            "gradcam_base64": _png_base64(gradcam) if gradcam is not None else None,
            "explanation": explanation,
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=config.HOST, port=config.PORT, reload=False)
