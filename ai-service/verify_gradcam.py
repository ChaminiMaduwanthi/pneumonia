"""
Empirical check that Grad-CAM is set up correctly.

Compares the OLD behaviour (differentiate the softmax probability) against the
FIXED behaviour (differentiate the pre-softmax logit) on real chest X-rays, and
saves side-by-side overlays. For confident predictions the softmax gradient
saturates (vanishes), so the old heatmap is degenerate; the logit gradient stays
informative.

Usage:  .venv\\Scripts\\python verify_gradcam.py [model_key]
"""

import glob
import os
import sys

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")

import numpy as np
import tensorflow as tf
from tensorflow import keras
from PIL import Image

import config
import inference

mk = sys.argv[1] if len(sys.argv) > 1 else config.DEFAULT_MODEL
model = inference.load_model(mk)
ci = inference._last_conv_index(model)
backbone = model.layers[ci]
inp = model.inputs

# OLD grad model: [features, softmax probabilities] (the previous, incorrect target)
f = backbone(inp[0])
x = f
for layer in model.layers[ci + 1:]:
    x = layer(x)
softmax_gm = keras.Model(inp, [f, x])

# FIXED grad model from inference.py: [features, logits]
logit_gm = inference._get_grad_model(model, mk)


def analyze(gm, batch, cls):
    t = tf.convert_to_tensor(batch)
    with tf.GradientTape() as tape:
        conv, out = gm(t, training=False)
        ch = out[:, cls]
    g = tape.gradient(ch, conv)
    pooled = tf.reduce_mean(g, axis=(0, 1, 2))
    hm = tf.maximum(tf.squeeze(conv[0] @ pooled[..., tf.newaxis]), 0)
    mx = float(tf.reduce_max(hm))
    hmn = (hm / (mx if mx > 0 else 1.0)).numpy()
    return {
        "mean_abs_grad": float(tf.reduce_mean(tf.abs(g))),
        "heatmap_max": mx,
        "heatmap_std": float(np.std(hmn)),
        "frac_active": float((hmn > 0.2).mean()),  # share of map strongly activated
        "hm": hmn,
    }


out_dir = os.path.join(os.path.dirname(__file__), "_gradcam_check")
os.makedirs(out_dir, exist_ok=True)

print(f"Model: {config.MODELS[mk]['label']}\n")
for p in sorted(glob.glob("../backend/uploads/xrays/*"))[:4]:
    img = Image.open(p)
    batch = inference._preprocess(img, mk)
    conv, logits = logit_gm(tf.convert_to_tensor(batch), training=False)
    cls = int(np.argmax(logits[0]))
    conf = float(tf.nn.softmax(logits[0])[cls]) * 100

    s = analyze(softmax_gm, batch, cls)
    l = analyze(logit_gm, batch, cls)

    name = os.path.basename(p)[:24]
    print(f"{name:24s}  predicted={config.CLASS_NAMES[cls]:20s} conf={conf:5.1f}%")
    print(f"   softmax-target : mean|grad|={s['mean_abs_grad']:.3e}  heatmap_max={s['heatmap_max']:.3e}  active={s['frac_active']*100:5.1f}%")
    print(f"   logit-target   : mean|grad|={l['mean_abs_grad']:.3e}  heatmap_max={l['heatmap_max']:.3e}  active={l['frac_active']*100:5.1f}%")
    ratio = l["mean_abs_grad"] / s["mean_abs_grad"] if s["mean_abs_grad"] > 0 else float("inf")
    print(f"   logit gradient is {ratio:.0f}x larger than softmax gradient\n")

    # Save side-by-side overlays for visual inspection.
    base = os.path.splitext(os.path.basename(p))[0]
    inference._overlay(img, s["hm"]).save(os.path.join(out_dir, f"{base}_OLD_softmax.png"))
    inference._overlay(img, l["hm"]).save(os.path.join(out_dir, f"{base}_NEW_logit.png"))

print(f"Overlays saved to: {os.path.relpath(out_dir)}")
