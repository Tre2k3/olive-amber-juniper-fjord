import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  return import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
}
const { vehicleFace } = await load('../src/game-v2/core/vehicle-facing.ts');
for (const sign of [-1, 1]) {
  const side = sign > 0 ? 'left' : 'right';
  assert.equal(vehicleFace(sign * 0.87, 'front'), 'front');
  assert.equal(vehicleFace(sign * 1.02, 'front'), side);
  assert.equal(vehicleFace(sign * 0.8, side), side);
  assert.equal(vehicleFace(sign * 0.68, side), 'front');
  assert.equal(vehicleFace(sign * 2.18, side), side);
  assert.equal(vehicleFace(sign * 2.3, side), 'back');
  assert.equal(vehicleFace(sign * 2.1, 'back'), 'back');
  assert.equal(vehicleFace(sign * 1.98, 'back'), side);
}
assert.equal(vehicleFace(-Math.PI, 'back'), 'back');
assert.equal(vehicleFace(9 * Math.PI, 'back'), 'back');
console.log('PASS: vehicle views retain their identity around both thresholds and angle wrap');

const { pullCamera } = await load('../src/game-v2/core/camera-collision.ts');
const wall = { minX: 1, maxX: 2, minZ: -1, maxZ: 1 };
assert.deepEqual(pullCamera(0, 0, 4, 0, [], 0, 0), { x: 4, z: 0 });
assert.deepEqual(pullCamera(0, 0, 0, 0, [wall], 0, 0), { x: 0, z: 0 });
assert.ok(Math.abs(pullCamera(0, 0, 4, 0, [wall], 0, 0).x - 0.75) < 1e-9);
assert.deepEqual(pullCamera(0, 3, 4, 3, [wall], 0, 0), { x: 4, z: 3 });
const close = pullCamera(0, 0, 3, 0, [{ ...wall, minX: 0.4 }], 0, 0);
assert.ok(close.x < 0.2 && close.x >= 0);
const offset = pullCamera(0, 0, 8, 0, [wall], 3, 0);
assert.ok(Math.abs(offset.x - 3.75) < 1e-9);
assert.deepEqual(pullCamera(0, 0, -4, 0, [wall], 0, 0), { x: -4, z: 0 });
console.log('PASS: camera segments clip near walls, respect offsets and preserve unobstructed distance');

const { createSaveWriter } = await load('../src/game-v2/core/persistence.ts');
const writes = [];
const save = createSaveWriter(value => writes.push(value));
save({ dollars: 240 }); save({ dollars: 240 }); save({ dollars: 250 });
assert.equal(writes.length, 2);
assert.deepEqual(JSON.parse(writes[1]), { dollars: 250 });
let failures = 0, warnings = 0;
const originalWarn = console.warn;
try {
  console.warn = () => warnings++;
  const fail = createSaveWriter(() => { failures++; throw new Error('QuotaExceededError'); });
  assert.doesNotThrow(() => { fail({ dollars: 240 }); fail({ dollars: 240 }); fail({ dollars: 250 }); });
  assert.equal(failures, 2);
  assert.equal(warnings, 1);
} finally { console.warn = originalWarn; }
console.log('PASS: unchanged saves are skipped and denied storage never throws into gameplay');

const { productionLanes, gapAhead } = await load('../src/game-v2/roads/lanes.ts');
for (const lane of productionLanes()) {
  for (const laps of [-4, -1, 0, 1, 4]) {
    assert.ok(Math.abs(gapAhead(lane, lane.total * laps + 100, 107) - 7) < 1e-9);
    assert.ok(Math.abs(gapAhead(lane, lane.total * laps + 100, 93) - (lane.total - 7)) < 1e-9);
  }
}
console.log('PASS: traffic forward gaps remain correct across repeated route loops');
