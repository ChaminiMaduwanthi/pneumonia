"""Diagnostic for the lung field estimator.

Renders every stage of lungmask.lung_mask for each radiograph so the failure can
be seen rather than guessed: body silhouette, the dark (air) threshold, the
components that survived the filters, and the final softened mask over the image.

Usage:  .venv\\Scripts\\python _diag_lungmask.py [glob ...]
"""
import glob
import os
import sys

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lungmask as LM

OUT = '_diag_lungmask'
os.makedirs(OUT, exist_ok=True)
W = LM._WORK


def stages(gray_full):
    """Repeat lung_mask step by step, returning each intermediate."""
    gray = cv2.resize(gray_full, (W, W), interpolation=cv2.INTER_AREA)
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    body = LM._body_mask(gray)

    inside = gray[body > 0]
    cut = np.percentile(inside, 42) if inside.size else 0
    dark = ((gray <= cut) & (body > 0)).astype(np.uint8)
    dark_raw = dark.copy()
    dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((11, 11), np.uint8))

    n, labels, stats, cents = cv2.connectedComponentsWithStats(dark, 8)
    min_area, max_area = 0.012 * W * W, 0.42 * W * W
    rows, cands = [], []
    for i in range(1, n):
        area = stats[i, cv2.CC_STAT_AREA]
        cy = cents[i][1] / W
        cx = cents[i][0] / W
        why = []
        if area < min_area:
            why.append('too small')
        if area > max_area:
            why.append('too large')
        if cy > 0.78:
            why.append('too low')
        rows.append((i, int(area), round(cx, 2), round(cy, 2),
                     ', '.join(why) if why else 'KEPT-candidate'))
        if not why:
            cands.append((area, i))
    cands.sort(reverse=True)
    keep = [i for _, i in cands[:2]]
    chosen = np.isin(labels, keep).astype(np.float32) if keep else np.zeros_like(dark, np.float32)

    soft = cv2.dilate(chosen, np.ones((9, 9), np.uint8))
    soft = cv2.GaussianBlur(soft, (31, 31), 0)
    soft = np.clip(soft, 0.0, 1.0)
    return dict(gray=gray, body=body, dark_raw=dark_raw, dark=dark,
                labels=labels, chosen=chosen, soft=soft, rows=rows,
                keep=keep, cut=cut, body_frac=body.mean())


def tint(gray, mask, colour):
    base = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB).astype(np.float32)
    lay = np.zeros_like(base)
    lay[..., 0], lay[..., 1], lay[..., 2] = colour
    a = np.clip(mask, 0, 1)[..., None] * 0.55
    return np.uint8(base * (1 - a) + lay * a)


def label_img(img, text):
    img = img.copy()
    cv2.rectangle(img, (0, 0), (img.shape[1], 18), (0, 0, 0), -1)
    cv2.putText(img, text, (4, 13), cv2.FONT_HERSHEY_SIMPLEX, 0.38,
                (255, 255, 255), 1, cv2.LINE_AA)
    return img


pats = sys.argv[1:] or ['../backend/uploads/xrays/*']
files = []
for p in pats:
    files.extend(sorted(glob.glob(p)))
print('%-34s %7s %7s %7s  %s' % ('image', 'body%', 'cut', 'kept', 'components'))
print('-' * 110)

tiles = []
for f in files:
    try:
        rgb = np.asarray(Image.open(f).convert('RGB'))
    except Exception as exc:
        print('%-34s  cannot read: %s' % (os.path.basename(f), exc))
        continue
    gray_full = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    st = stages(gray_full)
    final = LM.lung_mask(rgb)
    print('%-34s %6.1f%% %7.1f %7s  %s'
          % (os.path.basename(f)[:34], st['body_frac'] * 100, st['cut'],
             st['keep'] if st['keep'] else 'NONE',
             ' | '.join('#%d a=%d c=(%.2f,%.2f) %s' % r for r in st['rows'][:6])))

    g = st['gray']
    row = np.hstack([
        label_img(cv2.cvtColor(g, cv2.COLOR_GRAY2RGB), 'input (CLAHE)'),
        label_img(tint(g, st['body'].astype(np.float32), (255, 200, 0)), 'body mask'),
        label_img(tint(g, st['dark'].astype(np.float32), (0, 160, 255)), 'dark/air after morph'),
        label_img(tint(g, st['chosen'], (0, 255, 80)), 'components kept'),
        label_img(tint(g, st['soft'], (255, 0, 120)), 'FINAL mask (dilate+blur)'),
    ])
    tiles.append(row)

if tiles:
    grid = np.vstack(tiles)
    Image.fromarray(grid).save(os.path.join(OUT, 'stages.png'))
    print('\nwritten %s  (%d rows)' % (os.path.join(OUT, 'stages.png'), len(tiles)))
