"""
Standalone sanity check: loads the default model and runs a real prediction +
Grad-CAM on a sample X-ray, independent of the web server.

Usage:
    .venv\\Scripts\\python verify_model.py [path-to-image] [model-key]
"""

import glob
import os
import sys

import config
import inference


def main():
    image_path = sys.argv[1] if len(sys.argv) > 1 else None
    model_key = sys.argv[2] if len(sys.argv) > 2 else config.DEFAULT_MODEL

    if not image_path:
        samples = sorted(glob.glob(os.path.join(os.path.dirname(__file__), "..", "backend", "uploads", "xrays", "*")))
        if not samples:
            print("No sample image found; pass an image path explicitly.")
            sys.exit(1)
        image_path = samples[0]

    from PIL import Image

    print(f"Model      : {config.MODELS[model_key]['label']}")
    print(f"Model acc. : {config.MODELS[model_key]['test_accuracy']}%  (overall test-set accuracy)")
    print(f"Image      : {image_path}")

    image = Image.open(image_path)
    result = inference.predict(image, model_key)

    print(f"Prediction : {result['predicted_class']}  ({result['confidence']}% confidence)")
    print("Scores     :")
    for label, score in sorted(result["scores"].items(), key=lambda kv: kv[1], reverse=True):
        print(f"   {label:<20} {score:6.2f}%")
    print(f"Grad-CAM   : {'generated' if result['gradcam_image'] is not None else 'unavailable'}")

    total = sum(result["scores"].values())
    assert 99.0 <= total <= 101.0, f"Softmax scores should sum to ~100, got {total:.2f}"
    print("\nOK - real inference verified.")


if __name__ == "__main__":
    main()
