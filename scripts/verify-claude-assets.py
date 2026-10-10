#!/usr/bin/env python3
"""Check installed canonical art byte-for-byte against the preserved approved ZIP."""
from pathlib import Path
from zipfile import ZipFile
import hashlib

repo = Path(__file__).resolve().parents[1]
with ZipFile(repo / "imports/Claude_Canonical_Sprites_Integration.zip") as archive:
    paths = [n for n in archive.namelist() if n.startswith("public/game-v2/") and n.endswith(".png")]
    assert len(paths) == 85, f"Expected 85 approved frames, got {len(paths)}"
    for name in paths:
        assert (repo / name).read_bytes() == archive.read(name), f"Canonical art mismatch: {name}"
    for kind in ("coupe", "sedan", "suv", "van"):
        for source, target in (("side", "left"), ("side-reverse", "right"), ("rear", "back"), ("front", "front")):
            name = f"public/game-v2/vehicles/{kind}-{target}.png"
            expected = archive.read(f"public/game-v2/vehicles/{kind}-{source}.png")
            assert (repo / name).read_bytes() == expected, f"Vehicle alias mismatch: {name}"
    print("PASS: all 85 approved PNGs and 16 runtime vehicle views match the ZIP byte-for-byte")
print("ZIP SHA256:", hashlib.sha256((repo / "imports/Claude_Canonical_Sprites_Integration.zip").read_bytes()).hexdigest())
