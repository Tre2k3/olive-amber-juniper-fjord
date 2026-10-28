"""Finish generated pedestrian turnarounds for the game.

For each folder in NEW_PEDS: drop stray specks (keep the largest opaque shape),
build walk.png from the character's own front view (lift one lower leg, the same
pixel technique as Benji's strides — nothing is redrawn), and print bounds
entries for src/game-v2/assets/character-bounds.ts.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = "public/game-v2/characters/pedestrians"
NEW_PEDS = ["church_hat_lady", "red_shirt_uncle", "braids_teen_girl", "puffer_vest_man", "scrubs_nurse", "flatcap_grandpa"]

def clean(path):
    im = Image.open(path).convert("RGBA"); a = np.array(im)
    mask = a[..., 3] > 20
    lab, n = ndimage.label(mask)
    if n > 1:
        sizes = ndimage.sum(mask, lab, range(1, n + 1)); keep = 1 + int(np.argmax(sizes))
        a[(lab != keep) & (lab != 0), 3] = 0
        Image.fromarray(a).save(path, optimize=True)
    return Image.open(path).convert("RGBA")

def walk_from_front(front: Image.Image) -> Image.Image:
    a = np.array(front); alpha = a[..., 3] > 40
    ys = np.where(alpha.any(1))[0]; top, bottom = int(ys[0]), int(ys[-1]); h = bottom - top
    cut_y = top + int(h * 0.66)                       # just below the knees' upper half / hem
    knee = top + int(h * 0.80)
    xs = np.where(alpha[knee])[0]
    mid = (int(xs[0]) + int(xs[-1])) // 2 if len(xs) else a.shape[1] // 2
    gaps = [x for x in range(int(xs[0]), int(xs[-1])) if not alpha[knee, x]] if len(xs) else []
    split = int(np.median(gaps)) if gaps else mid
    rise = max(6, int(h * 0.04))
    leg = front.crop((0, cut_y, split, bottom + 1)).resize((split, bottom + 1 - cut_y - rise), Image.LANCZOS)
    out = a.copy(); out[cut_y:bottom + 1, :split] = 0
    out = Image.fromarray(out); out.alpha_composite(leg, (0, cut_y)); return out

def bounds(path, im):
    al = np.array(im)[..., 3] > 10; ys = np.where(al.any(1))[0]; xs = np.where(al.any(0))[0]
    return (f"  '/game-v2/characters/pedestrians/{path}': {{ pxWidth: {im.width}, pxHeight: {im.height}, visibleTop: {ys[0]}, "
            f"visibleBottom: {ys[-1]}, visibleLeft: {xs[0]}, visibleRight: {xs[-1]}, bottomPadding: {im.height - 1 - ys[-1]} }},")

if __name__ == "__main__":
    lines = []
    names = sys.argv[2:] or NEW_PEDS
    for name in names:
        for v in ["front", "back", "left", "right"]:
            im = clean(f"{ROOT}/{name}/{v}.png"); lines.append(bounds(f"{name}/{v}.png", im))
        w = walk_from_front(Image.open(f"{ROOT}/{name}/front.png").convert("RGBA"))
        w.save(f"{ROOT}/{name}/walk.png", optimize=True); lines.append(bounds(f"{name}/walk.png", w))
    open(sys.argv[1] if len(sys.argv) > 1 else "/tmp/ped-bounds.ts", "w").write("\n".join(lines) + "\n")
    print("built", len(names), "characters,", len(lines), "bounds entries")
