import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  let code = outputText;
  if (path.endsWith('basketball-match.ts')) {
    const dependency = await readFile(new URL('../src/game-v2/core/basketball.ts', import.meta.url), 'utf8');
    const compiled = ts.transpileModule(dependency, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    code = code.replace('"./basketball"', '"data:text/javascript;base64,' + Buffer.from(compiled).toString('base64') + '"');
  }
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}
const { vehicleFace } = await load('../src/game-v2/core/vehicle-facing.ts');
const { cameraFraming } = await load('../src/game-v2/core/camera-framing.ts');
assert.deepEqual(cameraFraming(1280 / 800, 42, false), { fov: 42, distanceScale: 1 });
assert.deepEqual(cameraFraming(844 / 390, 54, true), { fov: 54, distanceScale: 1 });
const portrait = cameraFraming(390 / 844, 42, false);
assert.ok(portrait.fov > 60 && portrait.fov <= 62);
assert.ok(portrait.distanceScale > 1.2 && portrait.distanceScale <= 1.25);
assert.equal(cameraFraming(390 / 844, 54, true).distanceScale, 1, 'Interior cameras must retain their wall clearance');
console.log('PASS: portrait framing widens the view while desktop and indoor distances remain stable');
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

const { shotVelocity, rimCrossing, shotPoints } = await load('../src/game-v2/core/basketball.ts');
const rims = [{ x: 57.3, y: 2.72, z: -22 }, { x: 74.7, y: 2.72, z: -22 }];
for (const distance of [1, 4, 8, 15]) {
  const start = { x: rims[0].x + distance, y: 1.75, z: -22 };
  const shot = shotVelocity(start, rims[0], 0.7);
  const end = { x: start.x + shot.x * shot.time,
    y: start.y + shot.y * shot.time - 6 * shot.time ** 2, z: start.z + shot.z * shot.time };
  assert.ok(Math.hypot(end.x - rims[0].x, end.y - rims[0].y, end.z - rims[0].z) < 1e-8);
}
assert.equal(rimCrossing({ x: 57.3, y: 3, z: -22 }, { x: 57.3, y: 2.3, z: -22 }, rims[0]), true);
assert.equal(rimCrossing({ x: 57.7, y: 3, z: -22 }, { x: 57.7, y: 2.3, z: -22 }, rims[0]), false);
assert.equal(rimCrossing({ x: 57.3, y: 2.3, z: -22 }, { x: 57.3, y: 3, z: -22 }, rims[0]), false);
assert.equal(shotPoints({ x: 64, z: -22 }, rims[0]), 3);
console.log('PASS: ballistic shots reach the rim; swept scoring rejects wide and upward crossings');

const { createCourtMatch, courtAction, tickCourtMatch, matchRim } = await load('../src/game-v2/core/basketball-match.ts');
for (const mode of ['half', 'full']) {
  const match = createCourtMatch(mode);
  assert.equal(match.players.length, 4);
  assert.equal(match.players.filter(p => p.team === 0).length, 2);
  const human = { x: 64, z: -24 };
  const opponentStart = match.players[2].x;
  for (let i = 0; i < 60; i++) tickCourtMatch(match, 1 / 60, rims, human, false);
  assert.notEqual(match.players[2].x, opponentStart, 'AI defenders move');
  match.clock = 0.01;
  tickCourtMatch(match, 1 / 60, rims, human, false);
  assert.equal(match.possession, 1, 'Shot-clock violation transfers possession');
  assert.equal(match.phase, 'check');
  assert.equal(matchRim(match, rims), rims[mode === 'half' ? 0 : 0]);
}
const boundsMatch = createCourtMatch('half');
assert.ok(boundsMatch.players.every(p => p.x <= 66));
for (let i = 0; i < 100; i++) tickCourtMatch(boundsMatch, 1/60, rims, {x: 80, z: -12}, false);
assert.ok(boundsMatch.players.every(p => p.x >= 56 && p.x <= 66 && p.z >= -28 && p.z <= -16), 'Separation must not push half-court athletes past bounds');
const dunk = createCourtMatch('half');
dunk.players[0].x = 58; dunk.players[0].z = -22;
dunk.players[2].x = 65; dunk.players[3].x = 66;
assert.equal(courtAction(dunk, 'dunk', rims), true);
let pulsed = false;
for (let i = 0; i < 60; i++) {
  tickCourtMatch(dunk, 1 / 60, rims, dunk.players[0], false);
  pulsed ||= dunk.net === 0;
}
assert.equal(dunk.score[0], 2); assert.equal(pulsed, true); assert.equal(dunk.possession, 1);
const pass = createCourtMatch('half');
assert.equal(courtAction(pass, 'pass', rims), true); assert.equal(pass.owner, -1);
assert.equal(pass.feedback, 'PASS');
console.log('PASS: 2v2 rosters, moving defenders, clock turnovers, travelling passes and scored dunks');
for (const mode of ['half', 'full']) {
  const match = createCourtMatch(mode);
  for (let i = 0; i < 18000; i++) tickCourtMatch(match, 1 / 60, rims, match.players[0], false);
  assert.equal(match.phase, 'finished', 'AI game must reach a real winner');
  assert.ok(Math.max(...match.score) >= 21 && Math.abs(match.score[0] - match.score[1]) >= 2);
}
console.log('PASS: complete half/full AI games terminate at 21 with a two-point lead');

