"""
Lung-field estimation for chest radiographs (classical CV, no extra model weights).

Used to keep Grad-CAM style explanations inside the anatomy that can actually carry
pneumonia findings. Restricting the explanation to the lung field is the remedy
reported by Teixeira et al., *Impact of Lung Segmentation on the Diagnosis and
Explanation of COVID-19 in Chest X-ray Images*, Sensors 21(21):7116, 2021 — models
that see the whole radiograph frequently attend to shoulders, borders and burnt-in
markers instead of lung tissue.

The estimator is deliberately conservative: it finds the patient's body, then the
air-filled (dark) fields inside it. If it cannot find a plausible pair of lung
fields it returns None, and callers fall back to the unmasked map rather than
showing a wrong mask.
"""

from __future__ import annotations

import cv2
import numpy as np

# Working resolution for the mask search — small is enough and keeps it fast.
_WORK = 256


def _body_mask(gray: np.ndarray) -> np.ndarray:
    """Silhouette of the patient: the bright blob that is not image background."""
    blur = cv2.GaussianBlur(gray, (7, 7), 0)
    _, body = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Keep the largest bright component and fill it, so interior dark lungs are inside.
    n, labels, stats, _ = cv2.connectedComponentsWithStats((body > 0).astype(np.uint8), 8)
    if n <= 1:
        return np.ones_like(gray, dtype=np.uint8)
    largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    body = (labels == largest).astype(np.uint8)

    body = cv2.morphologyEx(body, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    contours, _ = cv2.findContours(body, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros_like(body)
    cv2.drawContours(filled, contours, -1, 1, thickness=cv2.FILLED)
    return filled


def lung_mask(image_rgb: np.ndarray) -> np.ndarray | None:
    """
    Estimate the lung fields of a chest radiograph.

    `image_rgb` is an HxWx3 uint8 array. Returns a float32 mask in [0, 1] at the same
    HxW, or None when no plausible lung field is found (non-CXR input, bad exposure).
    """
    if image_rgb.ndim == 3:
        gray_full = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    else:
        gray_full = image_rgb
    h0, w0 = gray_full.shape[:2]

    gray = cv2.resize(gray_full, (_WORK, _WORK), interpolation=cv2.INTER_AREA)
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)

    body = _body_mask(gray)
    if body.sum() < 0.20 * _WORK * _WORK:
        return None

    # Inside the body, lungs are the dark (air) regions. Threshold on body pixels only.
    inside = gray[body > 0]
    if inside.size == 0:
        return None
    cut = np.percentile(inside, 42)
    dark = ((gray <= cut) & (body > 0)).astype(np.uint8)
    dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((11, 11), np.uint8))

    n, labels, stats, centroids = cv2.connectedComponentsWithStats(dark, 8)
    if n <= 1:
        return None

    candidates = []
    min_area = 0.012 * _WORK * _WORK
    max_area = 0.42 * _WORK * _WORK
    for i in range(1, n):
        area = stats[i, cv2.CC_STAT_AREA]
        if not (min_area <= area <= max_area):
            continue
        cy = centroids[i][1] / _WORK
        # Lung fields sit in the upper/middle chest, never in the bottom strip
        # (that is stomach gas / below the diaphragm).
        if cy > 0.78:
            continue
        candidates.append((area, i))

    if not candidates:
        return None

    candidates.sort(reverse=True)
    keep = [i for _, i in candidates[:2]]
    mask = np.isin(labels, keep).astype(np.float32)

    if mask.sum() < 0.03 * _WORK * _WORK:
        return None

    # Soften the boundary so the overlay does not get a hard, fake-looking edge.
    mask = cv2.dilate(mask, np.ones((9, 9), np.uint8))
    mask = cv2.GaussianBlur(mask, (31, 31), 0)
    mask = np.clip(mask, 0.0, 1.0)

    return cv2.resize(mask, (w0, h0), interpolation=cv2.INTER_LINEAR)
