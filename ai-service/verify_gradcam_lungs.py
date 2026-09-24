"""
Verification for the lung-restricted Grad-CAM change.

Produces, for each radiograph, a BEFORE (raw Grad-CAM) / AFTER (lung-restricted)
pair plus the numbers behind them:

  in-lung   share of heatmap mass inside the estimated lung field
  r-lung    Pearson r against occlusion sensitivity, lung pixels only — checks the
            map still tracks what the model actually used after masking

Usage:  .venv\\Scripts\\python verify_gradcam_lungs.py [n_images]
"""
import os, sys, glob, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")

import numpy as np, tensorflow as tf, cv2
from PIL import Image
import config, inference, lungmask

MK = config.DEFAULT_MODEL
model = inference.load_model(MK)
grad_model = inference._get_grad_model(model, MK)
SIZE = config.MODELS[MK]["img_size"][0]
OUT = "_gradcam_lungs_check"
os.makedirs(OUT, exist_ok=True)


def occlusion(batch, cls, patch=48, stride=16):
    base = float(np.asarray(grad_model(tf.convert_to_tensor(batch), training=False)[1])[0, cls])
    fill = float(batch.mean())
    pos = list(range(0, SIZE - patch + 1, stride))
    vs, cs = [], []
    for y in pos:
        for x in pos:
            v = batch[0].copy(); v[y:y+patch, x:x+patch, :] = fill
            vs.append(v); cs.append((y, x))
    vs = np.asarray(vs, np.float32)
    outs = []
    for i in range(0, len(vs), 32):
        outs.append(np.asarray(grad_model(tf.convert_to_tensor(vs[i:i+32]), training=False)[1])[:, cls])
    outs = np.concatenate(outs)
    m = np.zeros((len(pos), len(pos)), np.float32)
    for (y, x), lg in zip(cs, outs):
        m[y // stride, x // stride] = base - float(lg)
    return np.maximum(m, 0)


def norm(a):
    a = np.maximum(a.astype(np.float32), 0)
    return a / a.max() if a.max() > 0 else a


seen, files = set(), []
for p in sorted(glob.glob("../backend/uploads/xrays/*")):
    try:
        h = hashlib.md5(open(p, "rb").read()).hexdigest()
    except OSError:
        continue
    if h not in seen:
        seen.add(h); files.append(p)

limit = int(sys.argv[1]) if len(sys.argv) > 1 else 8
print(f"Model: {config.MODELS[MK]['label']}\n")
print(f"{'image':30s} {'pred':22s} {'in-lung BEFORE':>15s} {'in-lung AFTER':>14s} {'r-lung BEFORE':>14s} {'r-lung AFTER':>13s}")
print("-" * 114)

rows, tiles = [], []
for p in files:
    if len(rows) >= limit:
        break
    img = Image.open(p)
    rgb = np.asarray(img.convert("RGB"))
    if lungmask.lung_mask(rgb) is None:
        continue

    batch = inference._preprocess(img, MK)
    logits = np.asarray(grad_model(tf.convert_to_tensor(batch), training=False)[1])[0]
    cls = int(np.argmax(logits))

    raw = inference._compute_heatmap(batch, model, MK, cls)
    after, focus = inference._restrict_to_lungs(img, raw)

    h, w = rgb.shape[:2]
    before_full = cv2.resize(raw, (w, h))
    mask = lungmask.lung_mask(rgb)
    mb = mask > 0.5

    def in_lung(hm):
        t = hm.sum()
        return float((hm * mb).sum() / t) if t > 0 else 0.0

    occ = cv2.resize(norm(occlusion(batch, cls)), (w, h))

    def r_lung(hm):
        a, b = hm[mb], occ[mb]
        return float("nan") if a.std() < 1e-9 or b.std() < 1e-9 else float(np.corrcoef(a, b)[0, 1])

    rows.append((in_lung(before_full), in_lung(after), r_lung(before_full), r_lung(after)))
    print(f"{os.path.basename(p)[:30]:30s} {config.CLASS_NAMES[cls]:22s} "
          f"{rows[-1][0]*100:14.1f}% {rows[-1][1]*100:13.1f}% {rows[-1][2]:14.3f} {rows[-1][3]:13.3f}")

    pair = np.hstack([
        cv2.resize(np.asarray(inference._overlay(img, before_full)), (240, 240)),
        cv2.resize(np.asarray(inference._overlay(img, after)), (240, 240)),
    ])
    tiles.append(pair)

a = np.array(rows)
print("-" * 114)
print(f"{'MEAN':30s} {'':22s} {np.nanmean(a[:,0])*100:14.1f}% {np.nanmean(a[:,1])*100:13.1f}% "
      f"{np.nanmean(a[:,2]):14.3f} {np.nanmean(a[:,3]):13.3f}")

if tiles:
    grid = np.vstack(tiles[:6])
    Image.fromarray(grid).save(os.path.join(OUT, "before_after.png"))
    print(f"\nBEFORE (left) / AFTER (right) pairs saved to {os.path.join(OUT, 'before_after.png')}")
print("\nPASS criteria: in-lung AFTER > 80%, and r-lung AFTER within ~0.1 of BEFORE")
print("(masking must raise anatomical focus without destroying the in-lung signal)")
