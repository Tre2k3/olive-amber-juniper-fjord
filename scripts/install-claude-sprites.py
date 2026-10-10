#!/usr/bin/env python3
"""Apply the user-approved Claude character/vehicle atlas extraction to a clone.

Usage: python scripts/install-claude-sprites.py [ZIP-or-extracted-pack]
Default: imports/Claude_Canonical_Sprites_Integration.zip.

This does not synthesize, recolor, or replace any approved identities.
Work on the feature branch, not main. No sprite fallback is permitted.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
from shutil import copyfile
from PIL import Image
import subprocess
import sys

repo = Path(__file__).resolve().parents[1]
pack = Path(sys.argv[1] if len(sys.argv) > 1 else repo / "imports/Claude_Canonical_Sprites_Integration.zip").resolve()
# Read the ZIP directly; reject archive traversal before extracting any member.
archive_workspace = TemporaryDirectory() if pack.is_file() else None
if archive_workspace:
    with ZipFile(pack) as archive:
        for member in archive.infolist():
            path = Path(member.filename)
            if path.is_absolute() or ".." in path.parts:
                raise SystemExit(f"Unsafe archive path: {member.filename}")
        archive.extractall(archive_workspace.name)
    pack = Path(archive_workspace.name)
art_root = pack / "public" / "game-v2"
if not (art_root / "characters/pedestrians/orange_woman/front.png").is_file():
    raise SystemExit("Original Claude PNG extraction is missing. Use the complete sprite ZIP.")

mapping = {
    "male01": ("green_jacket_man", 1.78),
    "female01": ("orange_woman", 1.72),
    "male02": ("blue_hoodie_boy", 1.62),
    "female02": ("denim_girl", 1.68),
    "male03": ("black_hoodie_man", 1.79),
    "female03": ("pink_jacket_girl", 1.64),
    "male04": ("bucket_hat_oldman", 1.71),
    "female04": ("purple_tracksuit_kid", 1.55),
}
for name, _ in mapping.values():
    for facing in ("front", "back", "left", "right", "walk"):
        if not (art_root / "characters" / "pedestrians" / name / f"{facing}.png").is_file():
            raise SystemExit(f"Missing approved frame for {name}: {facing}")

for name in ("benji", "k-blanco", "court-og", "mama-dee", "nitro", "unc-j", "strike"):
    for facing in ("front", "back", "left", "right"):
        if not (art_root / "characters" / name / f"{facing}.png").is_file():
            raise SystemExit(f"Missing approved cast frame: {name}/{facing}")
for kind in ("coupe", "sedan", "suv", "van"):
    for face in ("front", "rear", "side", "side-reverse"):
        if not (art_root / "vehicles" / f"{kind}-{face}.png").is_file():
            raise SystemExit(f"Missing approved vehicle frame: {kind}-{face}")

# Decode every source before touching the installed set. A damaged PNG must
# not leave a mixed old/new cast after a partially completed import.
sources = sorted(art_root.rglob("*.png"))
if len(sources) != 85:
    raise SystemExit(f"Expected 85 approved PNGs; found {len(sources)}")
for src in sources:
    with Image.open(src) as image:
        if image.mode != "RGBA":
            raise SystemExit(f"Approved PNG lacks transparency: {src}")
        image.verify()

count = 0
for src in sources:
    target = repo / "public/game-v2" / src.relative_to(art_root)
    target.parent.mkdir(parents=True, exist_ok=True)
    # Copy bytes without restoring old archive mtimes; file watchers and sync
    # must see the replacement of an already-existing legacy sprite.
    copyfile(src, target)
    count += 1

# All named cast folders already match their live turnaround() paths.
# The alternate smile pose is not a motion frame. Never retain legacy walk art.
registry = repo / "src/game-v2/assets/characters.ts"
text = registry.read_text()
start = text.index("  pedestrian: {")
end = text.index("\n  },\n} as const satisfies", start) + len("\n  },")
lines = ["  pedestrian: {"]
for key, (name, height) in mapping.items():
    lines.append(
        f'    {key}: {{ id: "ped-{name.replace("_", "-")}", height: {height}, '
        f'views: {{ ...turnaround("pedestrians/{name}"), '
        f'walk: cut("/game-v2/characters/pedestrians/{name}/walk.png") }} }},'
    )
lines.append("  },")
text = text[:start] + "\n".join(lines) + text[end:]
text = text.replace(
    'portrait: "/game-v2/characters/k-blanco/portrait.png",',
    'portrait: "/game-v2/characters/k-blanco/front.png",',
)

# The old Benji walk frame was cut from the superseded art pack, not this
# approved turnaround. Keeping it creates exactly the character-identity pop
# the user reported. Remove the legacy step slot
# until there is a true matching walk drawing.
old_walk = '      walk: cut("/game-v2/characters/benji/walk.png"),\n'
text = text.replace(old_walk, "")
text = text.replace('      walk: cut("/game-v2/characters/benji/front.png"),\n', "")
text = text.replace("Named cast is cut from the Character Bible photographs",
                    "Named cast and pedestrians use the user-approved illustrated Claude atlases.")
text = text.replace(" * (SackReligious_Character_Bible_AI_Reference_Pack). Not the old",
                    " * Never substitute photo-human or generic legacy character art.")
text = text.replace(" * illustrated public/game people.", "")
text = text.replace("?v=10", "?v=12")
registry.write_text(text)

# The existing car renderer requests kind-(left|right|front|back).png.
# Use the actual illustrated vehicle turnaround images, not generic cars.
for kind in ("coupe", "sedan", "suv", "van"):
    for source_name, target_name in (
        ("side", "left"), ("side-reverse", "right"),
        ("front", "front"), ("rear", "back"),
    ):
        src = art_root / "vehicles" / f"{kind}-{source_name}.png"
        if not src.is_file():
            raise SystemExit(f"Missing Claude vehicle view: {src}")
        copyfile(src, repo / "public/game-v2/vehicles" / f"{kind}-{target_name}.png")
        count += 1

# Do not guess sole offsets. Recompute measured alpha/foot metadata for every
# asset after replacing images, using the repo's existing analyzer.
subprocess.check_call([sys.executable, str(repo / "scripts/analyze-character-alpha.py")], cwd=repo)
subprocess.check_call([sys.executable, str(repo / "scripts/verify-claude-assets.py")], cwd=repo)
print(f"Installed {count} approved PNG images and rebuilt measured character bounds.")
print("Now run npm run typecheck; npm run lint; npm run build; npm run test:foundation")
