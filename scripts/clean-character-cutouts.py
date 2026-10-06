"""Clean runtime character cutouts.

Punches leftover white between limbs, drops the black contact shadow under
the shoes, fills tears inside clothing, and feathers the outer edge.
Rewrites the PNGs in place. Run analyze-character-alpha.py afterward.
"""
from __future__ import annotations

import os
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("public/game-v2/characters")


def luminance(rgb: np.ndarray) -> np.ndarray:
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def chroma(rgb: np.ndarray) -> np.ndarray:
    return rgb.max(axis=2) - rgb.min(axis=2)


def flood(mask: np.ndarray) -> np.ndarray:
    """True where mask touches the image border."""
    height, width = mask.shape
    seen = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        if mask[0, x]:
            queue.append((0, x))
        if mask[height - 1, x]:
            queue.append((height - 1, x))
    for y in range(height):
        if mask[y, 0]:
            queue.append((y, 0))
        if mask[y, width - 1]:
            queue.append((y, width - 1))
    while queue:
        y, x = queue.popleft()
        if y < 0 or x < 0 or y >= height or x >= width or seen[y, x] or not mask[y, x]:
            continue
        seen[y, x] = True
        queue.append((y + 1, x))
        queue.append((y - 1, x))
        queue.append((y, x + 1))
        queue.append((y, x - 1))
    return seen


def punch_border_white(image: np.ndarray) -> None:
    rgb = image[..., :3].astype(np.float32)
    alpha = image[..., 3]
    paper = (alpha < 20) | ((chroma(rgb) < 14) & (luminance(rgb) > 236) & (alpha > 0))
    outside = flood(paper)
    image[outside, 3] = 0


def punch_leg_gap(image: np.ndarray) -> None:
    """White trapped between the legs. Does not touch a white shirt or white shoes."""
    height, width = image.shape[:2]
    rgb = image[..., :3].astype(np.float32)
    alpha = image[..., 3]
    lum = luminance(rgb)
    paper = (alpha < 20) | ((chroma(rgb) < 12) & (lum > 242))
    y0 = int(height * 0.50)
    y1 = int(height * 0.93)
    for y in range(y0, y1):
        row_paper = paper[y]
        row_alpha = alpha[y]
        row_lum = lum[y]
        x = 0
        while x < width:
            if not row_paper[x] or row_alpha[x] < 20:
                x += 1
                continue
            start = x
            while x < width and row_paper[x] and row_alpha[x] >= 20:
                x += 1
            end = x
            if end - start < 5 or start == 0 or end >= width:
                continue
            left = int(row_lum[start - 1]) if row_alpha[start - 1] > 200 else 255
            right = int(row_lum[end]) if row_alpha[end] > 200 else 255
            if left < 130 and right < 130:
                image[y, start:end, 3] = 0


def remove_contact_shadow(image: np.ndarray) -> None:
    """Drop the black puddle under the shoes. Stop at the sole. Never eat a dark pant leg."""
    height, width = image.shape[:2]
    limit = max(4, int(height * 0.09))
    rgb = image[..., :3].astype(np.float32)
    alpha = image[..., 3]
    lum = luminance(rgb)
    ch = chroma(rgb)
    for x in range(width):
        marks: list[int] = []
        for y in range(height - 1, height - limit - 1, -1):
            if alpha[y, x] < 16:
                if marks:
                    break
                continue
            if lum[y, x] < 36 and ch[y, x] < 16:
                marks.append(y)
            else:
                break
        for y in marks:
            image[y, x, 3] = 0


def fill_fabric_tears(image: np.ndarray) -> None:
    """Fill small transparent tears inside clothing. Leave real gaps between limbs."""
    height, width = image.shape[:2]
    alpha = image[..., 3]
    empty = alpha < 16
    outside = flood(empty)
    holes = empty & ~outside
    seen = np.zeros((height, width), dtype=bool)
    for y in range(height):
        xs = np.flatnonzero(holes[y] & ~seen[y])
        for x in xs:
            if seen[y, x]:
                continue
            stack = [(y, x)]
            seen[y, x] = True
            pts: list[tuple[int, int]] = []
            miny = maxy = y
            minx = maxx = x
            while stack:
                cy, cx = stack.pop()
                pts.append((cy, cx))
                miny, maxy = min(miny, cy), max(maxy, cy)
                minx, maxx = min(minx, cx), max(maxx, cx)
                for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                    if 0 <= ny < height and 0 <= nx < width and holes[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            tall = maxy - miny
            wide = maxx - minx
            if tall > height * 0.2 or wide > width * 0.34 or len(pts) > 6000:
                continue
            for cy, cx in pts:
                found = None
                for radius in range(1, 14):
                    y0, y1 = max(0, cy - radius), min(height, cy + radius + 1)
                    x0, x1 = max(0, cx - radius), min(width, cx + radius + 1)
                    patch = image[y0:y1, x0:x1]
                    solid = patch[..., 3] > 200
                    if solid.any():
                        colors = patch[solid][..., :3]
                        found = colors.mean(axis=0)
                        break
                if found is None:
                    continue
                image[cy, cx, 0] = found[0]
                image[cy, cx, 1] = found[1]
                image[cy, cx, 2] = found[2]
                image[cy, cx, 3] = 255


def smooth_edge(image: np.ndarray) -> None:
    """Feather the outer pixel only. Do not repaint the drawn black stroke."""
    height, width = image.shape[:2]
    alpha = image[..., 3]
    opaque = alpha > 200
    current = opaque.copy()
    ring = np.zeros_like(current)
    ring[1:] |= ~current[:-1]
    ring[:-1] |= ~current[1:]
    ring[:, 1:] |= ~current[:, :-1]
    ring[:, :-1] |= ~current[:, 1:]
    ring &= current
    coverage = np.zeros((height, width), dtype=np.float32)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0:
                continue
            shifted = np.zeros_like(opaque)
            y0s, y1s = max(0, dy), height + min(0, dy)
            x0s, x1s = max(0, dx), width + min(0, dx)
            y0d, y1d = max(0, -dy), height + min(0, -dy)
            x0d, x1d = max(0, -dx), width + min(0, -dx)
            shifted[y0d:y1d, x0d:x1d] = opaque[y0s:y1s, x0s:x1s]
            coverage += shifted
    image[ring, 3] = np.clip(150 + coverage[ring] * 12, 170, 230).astype(np.uint8)


def crop_to_ink(image: np.ndarray) -> np.ndarray:
    alpha = image[..., 3]
    ys, xs = np.nonzero(alpha > 24)
    if len(ys) == 0:
        return image
    top, bottom = int(ys.min()), int(ys.max())
    left, right = int(xs.min()), int(xs.max())
    return image[top : bottom + 1, left : right + 1]


def clean(path: Path) -> None:
    image = np.array(Image.open(path).convert("RGBA"))
    punch_border_white(image)
    punch_leg_gap(image)
    remove_contact_shadow(image)
    punch_border_white(image)
    punch_leg_gap(image)
    fill_fabric_tears(image)
    smooth_edge(image)
    image = crop_to_ink(image)
    Image.fromarray(image).save(path)


def main() -> None:
    os.chdir(Path(__file__).resolve().parents[1])
    paths = sorted(ROOT.rglob("*.png"))
    for path in paths:
        clean(path)
        print(path)
    print(f"{len(paths)} cutouts cleaned")


if __name__ == "__main__":
    main()
