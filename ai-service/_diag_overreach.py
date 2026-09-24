"""Quantify how far the softened lung mask reaches past the lung field, and
where the peak of the masked heatmap actually lands.

The suspicion: dilate(9) + GaussianBlur(31) at 256 px widens the mask well past
the anatomy, and because _restrict_to_lungs renormalises by the masked peak, a
fringe value outside the lungs can become the hottest point on the display.
"""
import glob
import os
import sys

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lungmask as LM

W = LM._WORK


def chosen_components(gray_full):
    gray = cv2.resize(gray_full, (W, W), interpolation=cv2.INTER_AREA)
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    body = LM._body_mask(gray)
    inside = gray[body > 0]
    if inside.size == 0:
        return None, None
    cut = np.percentile(inside, 42)
    dark = ((gray <= cut) & (body > 0)).astype(np.uint8)
    dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((11, 11), np.uint8))
    n, labels, stats, cents = cv2.connectedComponentsWithStats(dark, 8)
    cands = []
    for i in range(1, n):
        a = stats[i, cv2.CC_STAT_AREA]
        if not (0.012 * W * W <= a <= 0.42 * W * W):
            continue
        if cents[i][1] / W > 0.78:
            continue
        cands.append((a, i))
    if not cands:
        return None, gray
    cands.sort(reverse=True)
    keep = [i for _, i in cands[:2]]
    return np.isin(labels, keep).astype(np.float32), gray


print('%-30s %9s %9s %9s %9s %8s' % ('image', 'core%', 'soft>.5%', 'soft>.05%',
                                     'growth x', 'ring px'))
print('-' * 84)
for f in sorted(glob.glob(sys.argv[1] if len(sys.argv) > 1
                          else '../backend/uploads/xrays/*')):
    try:
        rgb = np.asarray(Image.open(f).convert('RGB'))
    except Exception:
        continue
    gray_full = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    core, gray = chosen_components(gray_full)
    if core is None:
        print('%-30s   no lung components found' % os.path.basename(f)[:30])
        continue

    soft = cv2.dilate(core, np.ones((9, 9), np.uint8))
    soft = np.clip(cv2.GaussianBlur(soft, (31, 31), 0), 0, 1)

    a_core = float(core.sum())
    a_50 = float((soft > 0.5).sum())
    a_05 = float((soft > 0.05).sum())
    # how many pixels the 0.05 contour sits outside the core, on average
    dist = cv2.distanceTransform((core < 0.5).astype(np.uint8), cv2.DIST_L2, 5)
    ring = dist[(soft > 0.05) & (core < 0.5)]
    print('%-30s %8.1f%% %8.1f%% %8.1f%% %8.2f %8.1f'
          % (os.path.basename(f)[:30], 100 * a_core / (W * W),
             100 * a_50 / (W * W), 100 * a_05 / (W * W),
             a_05 / max(a_core, 1), float(ring.max()) if ring.size else 0.0))

print()
print('core%%     = the two chosen dark components, the actual lung estimate')
print('soft>.05%% = everything the returned mask still lets through')
print('growth x  = how many times larger the effective mask is than the estimate')
print('ring px   = furthest distance (at %d px) that mask leaks past the estimate'
      % W)
