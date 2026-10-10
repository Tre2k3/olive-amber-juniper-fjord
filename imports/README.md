# Approved Claude sprite import

The original user-approved ZIP is preserved unchanged in this folder. Install it with:

```sh
python3 scripts/install-claude-sprites.py
```

Python requires Pillow for the existing alpha analyzer. The installer accepts either the ZIP path or an extracted folder, validates all required cast/pedestrian/vehicle files before copying, and regenerates sole/alpha metadata. Repeating it is safe.

The ZIP's older README says to retain Benji's legacy walk art. That instruction is superseded: it belongs to a different identity. Benji's `front_alt` is an expression, not a stride. Only the eight pedestrians have an approved front walk pose; other directions and the named cast translate using approved standing turnarounds until matching animation is supplied.

Artwork is copied byte-for-byte. Vehicle side/rear names are also copied to the runtime's left/right/back aliases. No image generation, recoloring, mirroring, or replacement identities are used.
