import os
os.environ["TF_CPP_MIN_LOG_LEVEL"]="3"; os.environ["CUDA_VISIBLE_DEVICES"]="-1"
import glob, numpy as np
from PIL import Image
import inference, config
m = inference.load_model("densenet121")
# inspect last layers
print("== last layers ==")
for l in m.layers[-6:]:
    try: print(l.name, l.output.shape)
    except Exception as e: print(l.name, "noshape", e)
conv = inference._last_conv_layer(m)
print("last_conv:", conv.name if conv else None, getattr(conv,'output',None).shape if conv else None)
# try gradcam directly, surface error
import traceback, tensorflow as tf
imgs = sorted(glob.glob("../backend/uploads/xrays/*"))
for p in imgs:
    batch = inference._preprocess(Image.open(p), "densenet121")
    probs = m.predict(batch, verbose=0)[0]
    print(os.path.basename(p), "->", config.CLASS_NAMES[int(np.argmax(probs))], np.round(probs,3))
print("== gradcam attempt ==")
try:
    batch = inference._preprocess(Image.open(imgs[0]), "densenet121")
    hm = inference._compute_heatmap(batch, m, int(np.argmax(m.predict(batch,verbose=0)[0])))
    print("heatmap:", None if hm is None else hm.shape)
except Exception:
    traceback.print_exc()
