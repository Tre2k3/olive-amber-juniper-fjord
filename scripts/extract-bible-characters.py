"""Cut runtime sprites from the Character Bible photos. Pixels only — no redraw."""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

BIBLE = Path(
    "/workspace/production-reference/character-bible/SackReligious_Character_Bible_AI_Reference_Pack"
)
OUT = Path("/tmp/bible-cut")
OUT.mkdir(parents=True, exist_ok=True)


def flood(candidate: np.ndarray) -> np.ndarray:
    h, w = candidate.shape
    vis = np.zeros((h, w), np.uint8)
    q: deque[tuple[int, int]] = deque()
    for x in range(0, w, 1):
        for y in (0, h - 1):
            if candidate[y, x] and not vis[y, x]:
                vis[y, x] = 1
                q.append((y, x))
    for y in range(0, h, 1):
        for x in (0, w - 1):
            if candidate[y, x] and not vis[y, x]:
                vis[y, x] = 1
                q.append((y, x))
    while q:
        y, x = q.popleft()
        if y + 1 < h and not vis[y + 1, x] and candidate[y + 1, x]:
            vis[y + 1, x] = 1
            q.append((y + 1, x))
        if y - 1 >= 0 and not vis[y - 1, x] and candidate[y - 1, x]:
            vis[y - 1, x] = 1
            q.append((y - 1, x))
        if x + 1 < w and not vis[y, x + 1] and candidate[y, x + 1]:
            vis[y, x + 1] = 1
            q.append((y, x + 1))
        if x - 1 >= 0 and not vis[y, x - 1] and candidate[y, x - 1]:
            vis[y, x - 1] = 1
            q.append((y, x - 1))
    return vis


def light_bg(rgb: np.ndarray, tol: int = 30) -> np.ndarray:
    border = np.concatenate([rgb[0, ::2], rgb[-1, ::2], rgb[::2, 0], rgb[::2, -1]])
    light = border[border.min(1) > 160]
    bg = np.median(light, 0) if len(light) else np.array([222, 220, 218])
    diff = np.abs(rgb.astype(np.int16) - bg.astype(np.int16)).max(2)
    chroma = rgb.max(2).astype(np.int16) - rgb.min(2).astype(np.int16)
    return (diff < tol) & (chroma < 36) & (rgb.min(2) > 160)


def dark_bg(rgb: np.ndarray, mx_lim: int = 26) -> np.ndarray:
    mx = rgb.max(2).astype(np.int16)
    mn = rgb.min(2).astype(np.int16)
    return (mx < mx_lim) & ((mx - mn) < 14)


def largest_blob(fg: np.ndarray) -> np.ndarray:
    h, w = fg.shape
    seen = np.zeros((h, w), np.uint8)
    best = None
    best_area = 0
    ys, xs = np.where(fg)
    step = 2
    for y, x in zip(ys[::step], xs[::step]):
        if seen[y, x]:
            continue
        q = deque([(int(y), int(x))])
        seen[y, x] = 1
        area = 0
        minx = maxx = int(x)
        miny = maxy = int(y)
        while q:
            cy, cx = q.popleft()
            area += 1
            if cx < minx:
                minx = cx
            if cx > maxx:
                maxx = cx
            if cy < miny:
                miny = cy
            if cy > maxy:
                maxy = cy
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = 1
                    q.append((ny, nx))
        if area > best_area:
            best_area = area
            best = (minx, miny, maxx, maxy, area)
    if best is None:
        return fg
    minx, miny, maxx, maxy, _ = best
    mask = np.zeros_like(fg)
    # re-flood just that bbox's component from its center-ish fg pixel
    sub = fg[miny : maxy + 1, minx : maxx + 1]
    # keep pixels in bbox that belong to the largest component: approximate by
    # keeping the bbox and dropping small specks via a second pass
    mask[miny : maxy + 1, minx : maxx + 1] = sub
    return mask


def hole_fill(fg: np.ndarray) -> np.ndarray:
    """Fill interior holes that are not connected to the crop border."""
    outside = flood(~fg.astype(bool))
    return outside == 0


def trim(rgb: np.ndarray, alpha: np.ndarray, pad: int = 2):
    ys, xs = np.where(alpha > 12)
    if len(xs) == 0:
        return None
    y0, y1 = max(0, ys.min() - pad), min(rgb.shape[0], ys.max() + 1 + pad)
    x0, x1 = max(0, xs.min() - pad), min(rgb.shape[1], xs.max() + 1 + pad)
    out = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    out[:, :, :3] = rgb[y0:y1, x0:x1]
    out[:, :, 3] = alpha[y0:y1, x0:x1]
    return out


def save_rgba(arr: np.ndarray, path: Path):
    Image.fromarray(arr, "RGBA").save(path)
    print(f"  {path.name} {arr.shape[1]}x{arr.shape[0]}")


def split_valleys(fg: np.ndarray, min_peak: float = 0.35) -> list[tuple[int, int]]:
    col = fg.mean(0)
    sm = np.convolve(col, np.ones(17) / 17, mode="same")
    # peaks: local maxima above min_peak, separated by a real dip
    peaks = []
    for i in range(2, len(sm) - 2):
        if sm[i] >= min_peak and sm[i] >= sm[i - 1] and sm[i] >= sm[i + 1] and sm[i] >= sm[i - 2] and sm[i] >= sm[i + 2]:
            if not peaks or i - peaks[-1] > 40:
                peaks.append(i)
            elif sm[i] > sm[peaks[-1]]:
                peaks[-1] = i
    if not peaks:
        xs = np.where(fg.any(0))[0]
        return [(int(xs.min()), int(xs.max()) + 1)] if len(xs) else []
    cuts = [0]
    for a, b in zip(peaks, peaks[1:]):
        valley = a + int(np.argmin(sm[a:b]))
        cuts.append(valley)
    cuts.append(len(sm))
    spans = []
    for a, b in zip(cuts, cuts[1:]):
        sl = fg[:, a:b]
        if sl.mean() < 0.02:
            continue
        xs = np.where(sl.any(0))[0]
        if len(xs) == 0:
            continue
        spans.append((a + int(xs.min()), a + int(xs.max()) + 1))
    return spans


def cut_band(rgb: np.ndarray, y0: int, y1: int, bg_fn, name: str) -> list[Path]:
    band = rgb[y0:y1]
    vis = flood(bg_fn(band))
    fg = vis == 0
    spans = split_valleys(fg)
    print(name, "band", y0, y1, "spans", spans)
    paths = []
    for i, (x0, x1) in enumerate(spans):
        sub_fg = fg[:, x0:x1]
        blob = largest_blob(sub_fg)
        filled = hole_fill(blob)
        # drop a dangling caption: if the bottom 12% is a thin disconnected strip, hole_fill keeps it
        # if it's a separate component below a gap, largest_blob already dropped it
        alpha = np.where(filled, 255, 0).astype(np.uint8)
        # soften only the outer 1px of fully-hard edges is unnecessary; kill near-bg fringe already gone
        piece = trim(band[:, x0:x1], alpha, 1)
        if piece is None:
            continue
        if piece.shape[0] < 180:
            print("  skip short", i, piece.shape)
            continue
        path = OUT / f"{name}_{i}.png"
        save_rgba(piece, path)
        paths.append(path)
    return paths


def top_band(rgb: np.ndarray) -> tuple[int, int]:
    """Y range of the upper turnaround row only."""
    h = rgb.shape[0]
    lum = rgb.mean(2)
    # content rows are not near-uniform light gray
    content = ((lum < 190).mean(1) > 0.08) & ((lum < 190).mean(1) < 0.85)
    # skip title
    y = 70
    while y < h and not content[y]:
        y += 1
    y0 = y
    gap = 0
    y1 = y0
    while y < int(h * 0.72):
        if content[y]:
            y1 = y
            gap = 0
        else:
            gap += 1
            if gap > 28 and (y1 - y0) > 220:
                break
        y += 1
    return y0, y1 + 1


def clean_benji(src: Path, dest: Path):
    a = np.array(Image.open(src).convert("RGBA"))
    rgb, al = a[:, :, :3].astype(np.int16), a[:, :, 3]
    lum = rgb.mean(2)
    # dark semi-transparent halo, not the opaque body
    al[(al < 230) & (lum < 48)] = 0
    al[al < 12] = 0
    a[:, :, 3] = al.astype(np.uint8)
    ys, xs = np.where(al > 16)
    pad = 1
    y0, y1 = max(0, ys.min() - pad), min(a.shape[0], ys.max() + 1 + pad)
    x0, x1 = max(0, xs.min() - pad), min(a.shape[1], xs.max() + 1 + pad)
    crop = a[y0:y1, x0:x1]
    Image.fromarray(crop, "RGBA").save(dest)
    print(dest.name, crop.shape[1], crop.shape[0])


def main():
    ident = BIBLE / "01_Benji/00_Canonical_Identity"
    clean_benji(ident / "benji_front_smile_CANONICAL.png", OUT / "benji_front.png")
    clean_benji(ident / "benji_back_CANONICAL.png", OUT / "benji_back.png")
    clean_benji(ident / "benji_three_quarter_CANONICAL.png", OUT / "benji_threeq.png")
    clean_benji(ident / "benji_left_CANONICAL.png", OUT / "benji_leftfile.png")

    sheets = {
        "court": BIBLE / "02_Core_NPCs/02_Court_OG/court_og_reference_sheet.png",
        "mama": BIBLE / "02_Core_NPCs/03_Mama_Dee/mama_dee_reference_sheet.png",
        "unc": BIBLE / "02_Core_NPCs/04_Unc_J/unc_j_reference_sheet.png",
        "nitro": BIBLE / "02_Core_NPCs/05_Nitro/nitro_reference_sheet.png",
        "strike": BIBLE / "02_Core_NPCs/06_Strike/strike_reference_sheet.png",
    }
    for name, path in sheets.items():
        rgb = np.array(Image.open(path).convert("RGB"))
        y0, y1 = top_band(rgb)
        cut_band(rgb, y0, y1, light_bg, name)

    kb = np.array(Image.open(BIBLE / "02_Core_NPCs/01_K_Blanco_CANONICAL/k_blanco_CANONICAL_reference.png").convert("RGB"))
    # figures live in the middle band; the right block is the hero portrait
    cut_band(kb, 100, 900, dark_bg, "k")


if __name__ == "__main__":
    main()
