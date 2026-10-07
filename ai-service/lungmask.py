"""
Lung-field estimation for chest radiographs (classical CV, no extra model weights).

Used to keep Grad-CAM style explanations inside the anatomy that can actually carry
pneumonia findings. Restricting the explanation to the lung field is the remedy
reported by Teixeira et al., *Impact of Lung Segmentation on the Diagnosis and
Explanation of COVID-19 in Chest X-ray Images*, Sensors 21(21):7116, 2021 — models
that see the whole radiograph frequently attend to shoulders, borders and burnt-in
markers instead of lung tissue.

The primary estimator is a pretrained lung segmentation U-Net (imlab-uiip,
lung-segmentation-2d, MIT licence, trained on the JSRT and Montgomery sets; weights in
lung_seg/). The classical thresholding estimator below it leaked onto the shoulders,
the neck and the image corners whenever the radiograph was cropped tightly to the
chest, so it is kept only as a fallback for a deployment without the weights file.
If no plausible lung field is found, None is returned and the caller shows no heatmap
at all, so heat is never drawn outside the lungs.
"""

from __future__ import annotations

import os
import threading

import cv2
import numpy as np

# Working resolution for the mask search — small is enough and keeps it fast.
_WORK = 256

_UNET_WEIGHTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lung_seg", "trained_model.hdf5")
_unet = None
_unet_lock = threading.Lock()


def _build_unet():
    """Keras 3 rebuild of the original Keras 2 U-Net, loading its weights layer by layer."""
    import h5py
    import keras
    from keras import layers

    conv = lambda f: layers.Conv2D(f, 3, padding="same", activation="relu")
    inp = keras.Input((256, 256, 1))
    c1 = conv(32)(conv(32)(inp))
    c2 = conv(64)(conv(64)(layers.MaxPooling2D()(c1)))
    c3 = conv(64)(conv(64)(layers.MaxPooling2D()(c2)))
    c4 = conv(128)(conv(128)(layers.MaxPooling2D()(c3)))
    x = conv(256)(layers.MaxPooling2D()(c4))
    for skip, f in ((c4, 256), (c3, 256), (c2, 128), (c1, 64)):
        x = conv(f)(conv(f)(layers.UpSampling2D()(x)))
        x = conv(f)(layers.concatenate([skip, x]))
    out = layers.Conv2D(1, 3, padding="same", activation="sigmoid")(x)
    model = keras.Model(inp, out)

    convs = [l for l in model.layers if isinstance(l, layers.Conv2D)]
    with h5py.File(_UNET_WEIGHTS, "r") as f:
        g = f["model_weights"]
        for i, layer in enumerate(convs, start=1):
            w = g[f"conv2d_{i}"][f"conv2d_{i}"]
            layer.set_weights([w["kernel:0"][()], w["bias:0"][()]])
    return model


def _unet_lung_mask(gray_full: np.ndarray) -> np.ndarray | None:
    global _unet
    if _unet is None:
        with _unet_lock:
            if _unet is None:
                _unet = _build_unet()
    h0, w0 = gray_full.shape[:2]

    # Preprocessing as in training: resize, histogram equalisation, standardisation.
    g = cv2.equalizeHist(cv2.resize(gray_full, (_WORK, _WORK), interpolation=cv2.INTER_AREA))
    g = g.astype(np.float32)
    g = (g - g.mean()) / (g.std() + 1e-6)
    prob = _unet(g[None, ..., None], training=False).numpy()[0, ..., 0]

    # Keep at most the two largest plausible lung regions: drop specks and anything
    # centred below the diaphragm (bowel gas is dark and air filled too).
    n, labels, stats, cents = cv2.connectedComponentsWithStats((prob > 0.5).astype(np.uint8), 8)
    regions = [(stats[i, cv2.CC_STAT_AREA], i) for i in range(1, n)
               if stats[i, cv2.CC_STAT_AREA] >= 0.01 * _WORK * _WORK and cents[i][1] / _WORK <= 0.80]
    if not regions:
        return None
    regions.sort(reverse=True)
    mask = np.isin(labels, [i for _, i in regions[:2]]).astype(np.uint8)
    if mask.sum() < 0.04 * _WORK * _WORK:
        return None

    # Fill holes (a dense opacity can leave a gap inside a lung), then soften the edge
    # without letting the field grow, exactly as the classical estimator does.
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(mask, contours, -1, 1, thickness=cv2.FILLED)
    m = cv2.GaussianBlur(mask.astype(np.float32), (9, 9), 2.0)
    m = np.clip((m - 0.25) / 0.5, 0.0, 1.0)
    return cv2.resize(m, (w0, h0), interpolation=cv2.INTER_LINEAR)


def lung_mask(image_rgb: np.ndarray) -> np.ndarray | None:
    """
    Estimate the lung fields of a chest radiograph.

    `image_rgb` is an HxWx3 uint8 array. Returns a float32 mask in [0, 1] at the same
    HxW, or None when no plausible lung field is found (non-CXR input, bad exposure).
    """
    if not os.path.exists(_UNET_WEIGHTS):
        return _classical_lung_mask(image_rgb)
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY) if image_rgb.ndim == 3 else image_rgb
    return _unet_lung_mask(gray)


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


def _classical_lung_mask(image_rgb: np.ndarray) -> np.ndarray | None:
    """
    Classical fallback estimate of the lung fields of a chest radiograph, used only
    when the U-Net weights in lung_seg/ are not available.

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

    # Soften the boundary so the overlay does not get a hard, fake-looking edge,
    # WITHOUT letting the field grow. The previous dilate(9) + blur(31) pushed the
    # mask up to 15 px past the lung estimate at this working resolution, roughly
    # 6 per cent of the image on every side, so the "restricted" map still fell on
    # the neck, the shoulders and below the diaphragm. Blurring the binary mask on
    # its own leaves the half contour exactly on the estimated boundary; rescaling
    # about that contour then cuts the remaining tail, giving a transition about
    # three pixels wide and nothing at all beyond it.
    mask = cv2.GaussianBlur(mask, (9, 9), 2.0)
    mask = np.clip((mask - 0.25) / 0.5, 0.0, 1.0)

    return cv2.resize(mask, (w0, h0), interpolation=cv2.INTER_LINEAR)
