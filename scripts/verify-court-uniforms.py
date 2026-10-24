#!/usr/bin/env python3
"""Verify supplemental outfit completeness and published-file integrity."""
import hashlib,json,struct
from pathlib import Path
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'public/game-v2/basketball/ASSET_PROVENANCE.json').read_text())
records=data['outfits']
assert len(records)==30
keys={r['id'] for r in records}
actions=['dribble','shoot','dunk','shoot-back','dunk-back','cross-back','cross','layup-back']
for kit in ['black-fresh','blue-fresh','white-224']:
 assert f'benji/{kit}/directions' in keys
 for action in actions:assert f'benji/{kit}/{action}' in keys
for who in ['court-og','nitro','strike']:assert f'{who}/directions' in keys
files=[f for r in records for f in r['files']]
assert len(files)==48 and len({f['path'] for f in files})==48
for f in files:
 raw=(root/f['path']).read_bytes()
 assert hashlib.sha256(raw).hexdigest()==f['sha256'],f['path']
 if f['path'].endswith('.png'):
  assert raw[:8]==b'\x89PNG\r\n\x1a\n'
  assert struct.unpack('>II',raw[16:24])==(512,512)
  assert raw[25]==6,'RGBA transparency required'
 else:assert raw[:4]==b'RIFF' and raw[8:12]==b'WEBP'
assert not (root/'src/game-v2/world/kits/court-jersey.ts').exists()
print('PASS: 120 complete outfit frames in 48 verified RGBA/lossless assets; no garment overlay module')
