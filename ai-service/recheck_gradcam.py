"""
Rigorous re-audit of the Grad-CAM setup. Checks, on real X-rays:

  1. Reconstruction fidelity: the grad-model's logits must reproduce the real
     model's output EXACTLY (softmax(grad logits) == model.predict). Otherwise the
     gradients are taken w.r.t. the wrong function.
  2. Target layer: conv feature map is the last 4-D backbone output.
  3. Gradients are non-None and non-negligible.
  4. Class-discriminativeness: heatmaps for different target classes must DIFFER
     (the defining property of Grad-CAM vs a generic saliency map).
  5. Heatmap is normalised to [0,1] and non-degenerate.
"""

import glob
import os
import sys

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")

import numpy as np
import tensorflow as tf
from PIL import Image

import config
import inference
import ood

mk = sys.argv[1] if len(sys.argv) > 1 else config.DEFAULT_MODEL
model = inference.load_model(mk)
extractor, W, b = inference._get_extractor(model, mk)
grad_model = inference._get_grad_model(model, mk)
conv_index = inference._last_conv_index(model)

print(f"Model: {config.MODELS[mk]['label']}")
print(f"[2] target conv layer: '{model.layers[conv_index].name}'  output={model.layers[conv_index].output.shape}")
print(f"    grad-model outputs: conv + {grad_model.outputs[1].shape} (expected (None,{len(config.CLASS_NAMES)}) logits)\n")

all_ok = True
imgs = sorted(glob.glob("../backend/uploads/xrays/*"))[:4]
for p in imgs:
    img = Image.open(p)
    batch = inference._preprocess(img, mk)
    tb = tf.convert_to_tensor(batch)

    # Real model output (softmax) and grad-model output.
    model_probs = np.asarray(model.predict_on_batch(batch))[0]
    conv, grad_logits = grad_model(tb, training=False)
    grad_logits = np.asarray(grad_logits)[0]
    grad_probs = np.asarray(tf.nn.softmax(grad_logits))

    # (1) reconstruction fidelity
    max_prob_err = float(np.max(np.abs(grad_probs - model_probs)))
    recon_ok = max_prob_err < 1e-5

    # (3) gradient magnitude for the predicted class
    cls = int(np.argmax(grad_logits))
    with tf.GradientTape() as tape:
        c, lg = grad_model(tb, training=False)
        score = lg[:, cls]
    g = tape.gradient(score, c)
    grad_ok = g is not None and float(tf.reduce_mean(tf.abs(g))) > 1e-6

    # (4) class-discriminativeness: heatmaps for each class should not be identical
    hms = []
    for k in range(len(config.CLASS_NAMES)):
        hm = inference._compute_heatmap(batch, model, mk, k)
        hms.append(hm)
    # pairwise correlation between predicted-class map and the others
    base = hms[cls].ravel()
    diffs = []
    for k in range(len(config.CLASS_NAMES)):
        if k == cls or hms[k] is None:
            continue
        corr = float(np.corrcoef(base, hms[k].ravel())[0, 1])
        diffs.append(corr)
    discriminative = any(c < 0.999 for c in diffs)  # at least one class map differs

    # (5) heatmap range / non-degenerate
    hm = hms[cls]
    range_ok = hm is not None and 0.0 <= hm.min() and abs(hm.max() - 1.0) < 1e-6 and hm.std() > 0.02

    ok = recon_ok and grad_ok and discriminative and range_ok
    all_ok = all_ok and ok
    name = os.path.basename(p)[:24]
    print(f"{name:24s} class={config.CLASS_NAMES[cls]:20s}")
    print(f"   [1] logits reproduce model softmax : {recon_ok}  (max prob err {max_prob_err:.2e})")
    print(f"   [3] gradient non-degenerate        : {grad_ok}  (mean|grad| {float(tf.reduce_mean(tf.abs(g))):.2e})")
    print(f"   [4] class-discriminative           : {discriminative}  (corr w/ other classes: {[round(c,3) for c in diffs]})")
    print(f"   [5] heatmap in [0,1], structured   : {range_ok}  (min {hm.min():.2f} max {hm.max():.2f} std {hm.std():.2f})")
    print(f"   => {'PASS' if ok else 'FAIL'}\n")

print("OVERALL:", "ALL CHECKS PASS" if all_ok else "SOME CHECKS FAILED")
