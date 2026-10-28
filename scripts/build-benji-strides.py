"""Build Benji's walk-cycle frames from his OWN approved sprites (no redraw).

Front/back: one leg (below mid-thigh) is compressed so that foot lifts 14 px.
Sides: the lower legs are sheared ±15 px at the hip. Every pixel is Benji's,
so his face, cap, chain, shirt and shoes never change. The approved PNGs are
read-only inputs; output goes to public/game-v2/characters/benji/stride/.
"""
from PIL import Image
import numpy as np

D = "public/game-v2/characters/benji"

def _bottom(a):
    return max(y for y in range(a.shape[0]) if a[y, :, 3].max() > 40)

def lift(view, side, cut_y, split_x, rise=14):
    im = Image.open(f"{D}/{view}.png").convert("RGBA"); a = np.array(im); bottom = _bottom(a)
    x0, x1 = (0, split_x) if side == "l" else (split_x, a.shape[1])
    leg = im.crop((x0, cut_y, x1, bottom + 1)).resize((x1 - x0, bottom + 1 - cut_y - rise), Image.LANCZOS)
    out = a.copy(); out[cut_y:bottom + 1, x0:x1] = 0
    out = Image.fromarray(out); out.alpha_composite(leg, (x0, cut_y)); return out

def swing(view, cut_y, shift):
    a = np.array(Image.open(f"{D}/{view}.png").convert("RGBA")); out = a.copy(); bottom = _bottom(a)
    out[cut_y:bottom + 1] = 0
    for y in range(cut_y, bottom + 1):
        d = int(round(shift * (y - cut_y) / (bottom - cut_y))); row = a[y]
        if d > 0: out[y, d:] = row[:-d]
        elif d < 0: out[y, :d] = row[-d:]
        else: out[y] = row
    return Image.fromarray(out)

if __name__ == "__main__":
    frames = {"back-l": lift("back", "l", 218, 69), "back-r": lift("back", "r", 218, 69),
              "front-l": lift("front", "l", 222, 69), "front-r": lift("front", "r", 222, 69),
              "left-a": swing("left", 205, -15), "left-b": swing("left", 205, 15),
              "right-a": swing("right", 205, 15), "right-b": swing("right", 205, -15)}
    for n, im in frames.items():
        im.save(f"{D}/stride/{n}.png", optimize=True)
    print("built", len(frames), "stride frames")
