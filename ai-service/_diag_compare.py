"""Side by side: raw Grad-CAM, the old over-grown lung mask, and the tightened one.

Columns per radiograph:
  1  original
  2  raw Grad-CAM, unmasked
  3  restricted with the OLD mask   (dilate 9 + blur 31)
  4  restricted with the NEW mask   (blur 9 sigma 2, rescaled about the boundary)
  5  the two mask outlines, old in red, new in green

Usage:  .venv\\Scripts\\python _diag_compare.py [glob]
"""
import glob
import os
import sys

os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '3')
os.environ.setdefault('CUDA_VISIBLE_DEVICES', '-1')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cv2
import numpy as np
import tensorflow as tf
from PIL import Image

import config
import inference
import lungmask as LM

W = LM._WORK
MK = config.DEFAULT_MODEL
OUT = '_diag_lungmask'
os.makedirs(OUT, exist_ok=True)


def core_mask(gray_full):
    """The binary lung estimate, before any softening."""
    gray = cv2.resize(gray_full, (W, W), interpolation=cv2.INTER_AREA)
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    body = LM._body_mask(gray)
    inside = gray[body > 0]
    if inside.size == 0:
        return None
    cut = np.percentile(inside, 42)
    dark = ((gray <= cut) & (body > 0)).astype(np.uint8)
    dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((11, 11), np.uint8))
    n, lab, st, ce = cv2.connectedComponentsWithStats(dark, 8)
    c = [(st[i, cv2.CC_STAT_AREA], i) for i in range(1, n)
         if 0.012 * W * W <= st[i, cv2.CC_STAT_AREA] <= 0.42 * W * W
         and ce[i][1] / W <= 0.78]
    if not c:
        return None
    c.sort(reverse=True)
    return np.isin(lab, [i for _, i in c[:2]]).astype(np.float32)


def old_soft(core):
    m = cv2.dilate(core, np.ones((9, 9), np.uint8))
    return np.clip(cv2.GaussianBlur(m, (31, 31), 0), 0.0, 1.0)


def new_soft(core):
    m = cv2.GaussianBlur(core, (9, 9), 2.0)
    return np.clip((m - 0.25) / 0.5, 0.0, 1.0)


def label(img, text):
    img = img.copy()
    cv2.rectangle(img, (0, 0), (img.shape[1], 20), (0, 0, 0), -1)
    cv2.putText(img, text, (5, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.42,
                (255, 255, 255), 1, cv2.LINE_AA)
    return img


def outline(gray, mask, colour, canvas=None):
    base = canvas if canvas is not None else cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)
    cs, _ = cv2.findContours((mask > 0.5).astype(np.uint8), cv2.RETR_EXTERNAL,
                             cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(base, cs, -1, colour, 2)
    return base


model = inference.load_model(MK)
pats = sys.argv[1:] or ['../backend/uploads/xrays/*']
files = []
for p in pats:
    files.extend(sorted(glob.glob(p)))

print('%-30s %8s %9s %9s %9s %9s'
      % ('image', 'core%', 'old pass%', 'new pass%', 'in-lung OLD', 'in-lung NEW'))
print('-' * 82)

rows = []
for f in files:
    img = Image.open(f)
    rgb = np.asarray(img.convert('RGB'))
    gray_full = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    core = core_mask(gray_full)
    if core is None:
        print('%-30s   no lung field found, skipped' % os.path.basename(f)[:30])
        continue

    batch = inference._preprocess(img, MK)
    probs = np.asarray(model.predict_on_batch(batch))[0]
    cls = int(np.argmax(probs))
    raw = inference._compute_heatmap(batch, model, MK, cls)
    if raw is None:
        continue

    h, w = rgb.shape[:2]
    raw_full = cv2.resize(raw, (w, h))
    total = float(raw_full.sum())

    m_old = cv2.resize(old_soft(core), (w, h), interpolation=cv2.INTER_LINEAR)
    m_new = cv2.resize(new_soft(core), (w, h), interpolation=cv2.INTER_LINEAR)
    m_core = cv2.resize(core, (w, h), interpolation=cv2.INTER_NEAREST)

    def restrict(m):
        r = raw_full * m
        p = float(r.max())
        return r / p if p > 0 else r

    # share of the raw map that each mask actually lets through
    share_old = float((raw_full * m_old).sum()) / total if total else 0
    share_new = float((raw_full * m_new).sum()) / total if total else 0

    a = lambda m: 100 * float((m > 0.05).sum()) / m.size
    print('%-30s %7.1f%% %8.1f%% %8.1f%% %9.3f %9.3f'
          % (os.path.basename(f)[:30], 100 * float(m_core.sum()) / m_core.size,
             a(m_old), a(m_new), share_old, share_new))

    g = cv2.resize(gray_full, (260, 260))
    tiles = [
        label(cv2.cvtColor(g, cv2.COLOR_GRAY2RGB), 'original'),
        label(cv2.resize(np.asarray(inference._overlay(img, raw_full)), (260, 260)),
              'raw Grad-CAM'),
        label(cv2.resize(np.asarray(inference._overlay(img, restrict(m_old))), (260, 260)),
              'OLD mask  (leaks out)'),
        label(cv2.resize(np.asarray(inference._overlay(img, restrict(m_new))), (260, 260)),
              'NEW mask  (tight)'),
    ]
    edges = cv2.cvtColor(g, cv2.COLOR_GRAY2RGB)
    edges = outline(g, cv2.resize(m_old, (260, 260)), (255, 60, 60), edges)
    edges = outline(g, cv2.resize(m_new, (260, 260)), (60, 255, 60), edges)
    tiles.append(label(edges, 'old red / new green'))
    rows.append(np.hstack(tiles))

if rows:
    Image.fromarray(np.vstack(rows)).save(os.path.join(OUT, 'old_vs_new.png'))
    print('\nwritten %s' % os.path.join(OUT, 'old_vs_new.png'))
