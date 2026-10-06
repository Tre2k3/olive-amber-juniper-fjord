"""Runtime cutouts from Character Bible photos.

Light-gray sheets are column-split, then each figure is matted with
u2net_human_seg so white and black clothing survives. K Blanco's sheet
is black-on-black, so color key cannot be used on her dress.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove

BIBLE = Path(
    "/workspace/production-reference/character-bible/SackReligious_Character_Bible_AI_Reference_Pack"
)
OUT = Path("/tmp/bible-runtime")
OUT.mkdir(parents=True, exist_ok=True)
SESSION = new_session("u2net_human_seg")


def trim(im: Image.Image, pad: int = 2) -> Image.Image | None:
    a = np.array(im.convert("RGBA"))
    alpha = a[:, :, 3]
    # drop a faint fringe that is almost empty
    alpha[alpha < 18] = 0
    a[:, :, 3] = alpha
    ys, xs = np.where(alpha > 24)
    if len(xs) < 50:
        return None
    y0, y1 = max(0, int(ys.min()) - pad), min(a.shape[0], int(ys.max()) + 1 + pad)
    x0, x1 = max(0, int(xs.min()) - pad), min(a.shape[1], int(xs.max()) + 1 + pad)
    crop = a[y0:y1, x0:x1]
    if crop.shape[0] < 160 or crop.shape[1] < 40:
        return None
    return Image.fromarray(crop, "RGBA")


def matte(crop: Image.Image) -> Image.Image | None:
    out = remove(crop.convert("RGB"), session=SESSION)
    return trim(out)


def light_spans(rgb: np.ndarray, y0: int, y1: int, min_dist: int = 180) -> list[tuple[int, int]]:
    band = rgb[y0:y1]
    lum = band.mean(2)
    fg = lum < 188
    col = fg.mean(0)
    sm = np.convolve(col, np.ones(21) / 21, mode="same")
    peaks = []
    for i in range(2, len(sm) - 2):
        if sm[i] >= 0.32 and sm[i] >= sm[i - 1] and sm[i] >= sm[i + 1] and sm[i] >= sm[i - 2]:
            if not peaks or i - peaks[-1] > min_dist:
                peaks.append(i)
            elif sm[i] > sm[peaks[-1]]:
                peaks[-1] = i
    if len(peaks) < 2:
        return []
    cuts = [0]
    for a, b in zip(peaks, peaks[1:]):
        cuts.append(a + int(np.argmin(sm[a:b])))
    cuts.append(rgb.shape[1])
    spans = []
    for a, b in zip(cuts, cuts[1:]):
        sl = np.where(sm[a:b] > 0.08)[0]
        if len(sl) < 40:
            continue
        spans.append((a + int(sl[0]), a + int(sl[-1]) + 1))
    return spans


def content_band(rgb: np.ndarray) -> tuple[int, int]:
    lum = rgb.mean(2)
    content = (lum < 185).mean(1)
    rows = np.where(content > 0.12)[0]
    rows = rows[rows > 60]
    if len(rows) == 0:
        return 80, rgb.shape[0] // 2
    # first cluster
    start = int(rows[0])
    prev = start
    end = start
    for y in rows[1:]:
        if y - prev > 36 and (prev - start) > 240:
            break
        end = int(y)
        prev = int(y)
    return start, end + 8


def save_fig(im: Image.Image, path: Path):
    im.save(path)
    print(f"  {path.name} {im.size[0]}x{im.size[1]}")


def cut_sheet(name: str, path: Path, y0: int, y1: int):
    rgb = np.array(Image.open(path).convert("RGB"))
    spans = light_spans(rgb, y0, y1)
    print(name, "band", y0, y1, "spans", spans)
    im = Image.fromarray(rgb, "RGB")
    for i, (x0, x1) in enumerate(spans):
        pad = 8
        crop = im.crop((max(0, x0 - pad), max(0, y0 - 6), min(rgb.shape[1], x1 + pad), min(rgb.shape[0], y1 + 12)))
        matted = matte(crop)
        if matted is None:
            print("  skip", i)
            continue
        save_fig(matted, OUT / f"{name}_{i}.png")


def cut_k():
    path = BIBLE / "02_Core_NPCs/01_K_Blanco_CANONICAL/k_blanco_CANONICAL_reference.png"
    rgb = np.array(Image.open(path).convert("RGB"))
    # bright pixels (skin, hair, jewelry) locate the figures; the dress is black
    mx = rgb.max(2)
    bright = mx > 70
    col = bright[100:880].mean(0)
    sm = np.convolve(col, np.ones(11) / 11, mode="same")
    on = sm > 0.03
    spans = []
    s = None
    for i, v in enumerate(on):
        if v and s is None:
            s = i
        elif not v and s is not None:
            if i - s > 40:
                spans.append((s, i))
            s = None
    if s is not None and len(on) - s > 40:
        spans.append((s, len(on)))
    print("k spans", spans)
    im = Image.fromarray(rgb, "RGB")
    for i, (x0, x1) in enumerate(spans):
        crop = im.crop((max(0, x0 - 18), 90, min(rgb.shape[1], x1 + 18), 900))
        matted = matte(crop)
        if matted is None:
            print("  skip", i)
            continue
        save_fig(matted, OUT / f"k_{i}.png")


def clean_benji():
    ident = BIBLE / "01_Benji/00_Canonical_Identity"
    mapping = {
        "benji_front.png": "benji_front_smile_CANONICAL.png",
        "benji_back.png": "benji_back_CANONICAL.png",
        "benji_threeq.png": "benji_three_quarter_CANONICAL.png",
        "benji_leftfile.png": "benji_left_CANONICAL.png",
    }
    for dest, src in mapping.items():
        a = np.array(Image.open(ident / src).convert("RGBA"))
        lum = a[:, :, :3].mean(2)
        al = a[:, :, 3]
        al[(al < 230) & (lum < 48)] = 0
        al[al < 12] = 0
        a[:, :, 3] = al
        ys, xs = np.where(al > 16)
        y0, y1 = max(0, ys.min() - 1), min(a.shape[0], ys.max() + 2)
        x0, x1 = max(0, xs.min() - 1), min(a.shape[1], xs.max() + 2)
        im = Image.fromarray(a[y0:y1, x0:x1], "RGBA")
        save_fig(im, OUT / dest)


if __name__ == "__main__":
    sheets = {
        "court": (BIBLE / "02_Core_NPCs/02_Court_OG/court_og_reference_sheet.png", 90, 478),
        "mama": (BIBLE / "02_Core_NPCs/03_Mama_Dee/mama_dee_reference_sheet.png", 90, 400),
        "unc": (BIBLE / "02_Core_NPCs/04_Unc_J/unc_j_reference_sheet.png", 90, 560),
        "nitro": (BIBLE / "02_Core_NPCs/05_Nitro/nitro_reference_sheet.png", 90, 440),
        "strike": (BIBLE / "02_Core_NPCs/06_Strike/strike_reference_sheet.png", 90, 500),
    }
    for name, (path, y0, y1) in sheets.items():
        cut_sheet(name, path, y0, y1)
