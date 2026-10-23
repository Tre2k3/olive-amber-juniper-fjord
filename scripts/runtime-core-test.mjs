import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  let code = outputText;
  if (path.endsWith('basketball-camera.ts') || path.endsWith('court-camera-cutaway.ts')) code=code.replace('"three"',JSON.stringify(import.meta.resolve('three')));
  if (path.endsWith('basketball-match.ts')) {
    const dependency = await readFile(new URL('../src/game-v2/core/basketball.ts', import.meta.url), 'utf8');
    const compiled = ts.transpileModule(dependency, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    code = code.replace('"./basketball"', '"data:text/javascript;base64,' + Buffer.from(compiled).toString('base64') + '"');
  }
  if (path.endsWith('city.ts')) {
    const dependency = await readFile(new URL('../src/game-v2/play/racing.ts', import.meta.url), 'utf8');
    const compiled = ts.transpileModule(dependency, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    code = code.replace('"./racing"', '"data:text/javascript;base64,' + Buffer.from(compiled).toString('base64') + '"');
    const bowling = await readFile(new URL('../src/game-v2/play/bowling.ts', import.meta.url), 'utf8');
    const bowlingCompiled = ts.transpileModule(bowling, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    code = code.replace('"./bowling"', '"data:text/javascript;base64,' + Buffer.from(bowlingCompiled).toString('base64') + '"');
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
const cross = createCourtMatch('half');
cross.players[0].x = 64; cross.players[0].z = -22;
tickCourtMatch(cross, 0, rims, cross.players[0], false);
const rightSide = cross.ball.z;
const startHeight = cross.ball.y;
assert.equal(courtAction(cross, 'cross', rims), true);
assert.equal(courtAction(cross, 'cross', rims), false, 'An active crossover cannot restart');
tickCourtMatch(cross, 0, rims, cross.players[0], false);
assert.ok(Math.abs(cross.ball.z - rightSide) < 1e-8, 'Crossover starts at the existing hand');
assert.ok(Math.abs(cross.ball.y - startHeight) < 1e-8, 'Crossover preserves the starting ball height');
for (let i = 0; i < 30; i++) tickCourtMatch(cross, 1/60, rims, cross.players[0], false);
assert.equal(cross.players[0].dribbleHand, -1);
assert.ok(cross.ball.z > cross.players[0].z + 0.3, 'Left hand remains active after the crossover');
assert.equal(courtAction(cross, 'cross', rims), true);
for (let i = 0; i < 30; i++) tickCourtMatch(cross, 1/60, rims, cross.players[0], false);
assert.equal(cross.players[0].dribbleHand, 1);
assert.ok(cross.ball.z < cross.players[0].z - 0.3);
console.log('PASS: crossover alternates hands continuously and retains the receiving hand');
for (const mode of ['half', 'full']) {
  const match = createCourtMatch(mode);
  for (let i = 0; i < 18000; i++) tickCourtMatch(match, 1 / 60, rims, match.players[0], false);
  assert.equal(match.phase, 'finished', 'AI game must reach a real winner');
  assert.ok(Math.max(...match.score) >= 21 && Math.abs(match.score[0] - match.score[1]) >= 2);
}
console.log('PASS: complete half/full AI games terminate at 21 with a two-point lead');



const layup = createCourtMatch('half');
assert.equal(courtAction(layup, 'layup', rims), false, 'Layup requires close range');
layup.players[0].x = 59; layup.players[0].z = -22;
layup.players[2].x = 65; layup.players[3].x = 66;
assert.equal(courtAction(layup, 'layup', rims), true);
for (let i = 0; i < 30; i++) tickCourtMatch(layup, 1/60, rims, layup.players[0], false);
assert.equal(layup.owner, 0, 'Ball remains held during takeoff');
assert.equal(layup.score[0], 0, 'Layup must not award points before a rim crossing');
for (let i = 0; i < 12; i++) tickCourtMatch(layup, 1/60, rims, layup.players[0], false);
assert.equal(layup.owner, -1, 'Palm releases into a live flight');
let layupNet = false;
for (let i = 0; i < 90; i++) {
  tickCourtMatch(layup, 1/60, rims, layup.players[0], false); layupNet ||= layup.net === 0;
}
assert.equal(layup.score[0], 2); assert.ok(layupNet);
const uncleared = createCourtMatch('half'); uncleared.players[0].x = 59; uncleared.players[0].z = -22; uncleared.cleared = false;
assert.equal(courtAction(uncleared, 'layup', rims), false, 'Half-court clearance applies to layups');
console.log('PASS: close-range layup holds then releases, swept rim scoring, net reaction and arc clearance');

const { hauntFloorAt, canWalkHaunt } = await load('../src/game-v2/core/haunt-navigation.ts');
assert.equal(hauntFloorAt(1.6, 1.2), 0.08);
assert.ok(Math.abs(hauntFloorAt(1.6, 6) - 2.48) < 1e-9);
assert.equal(canWalkHaunt(3, 3, 1.6, 3), false, 'High steps cannot be mounted sideways');
assert.equal(canWalkHaunt(3, 6, 3, 5), false, 'Gallery front cannot be walked off');
for (const direction of [-1, 1]) {
  let z = direction > 0 ? 1.2 : 6.6;
  for (let i = 0; i < 68; i++) {
    const next = z + direction * 0.08;
    assert.equal(canWalkHaunt(1.6, z, 1.6, next), true, 'Substepped movement must traverse all risers both ways');
    z = next;
  }
}
console.log('PASS: staircase heights, bidirectional traversal, side-entry and gallery drop prevention');

const fishing = await load('../src/game-v2/play/city.ts');
const fishingCity = fishing.freshCity();
fishing.triggerSpot(fishingCity, 'pier', 240);
assert.equal(fishingCity.fish.phase, 'wait');
fishing.triggerSpot(fishingCity, 'pier', 240);
assert.equal(fishingCity.fish.phase, 'wait', 'An early interaction must not end fishing');
fishing.tickCity(fishingCity, 4.1, false, 0);
assert.equal(fishingCity.fish.phase, 'bite');
assert.equal(fishingCity.fish.left, 3, 'Bare-hook bites leave three seconds to react');
const caught = fishing.hookFish(fishingCity);
assert.ok(caught.dollars >= 16);
assert.equal(fishingCity.fish.phase, 'wait', 'Catch keeps the session going');
assert.deepEqual(fishing.hookFish(fishingCity), {}, 'Repeated taps cannot claim another catch');
fishing.tickCity(fishingCity, 4.1, false, 0);
fishing.tickCity(fishingCity, 3.1, false, 0);
assert.equal(fishingCity.fish.phase, 'wait', 'Miss keeps the line out');
fishingCity.bait = 2;
fishing.tickCity(fishingCity, 4.1, false, 0);
fishing.hookFish(fishingCity);
assert.equal(fishingCity.bait, 1, 'Next bite consumes exactly one bait');
fishing.tickCity(fishingCity, 4.1, false, 0);
assert.equal(fishingCity.fish.left, 3.5);
console.log('PASS: forgiving continuous fishing, repeat-tap safety and bait consumption');

const { bowlingScore } = await load('../src/game-v2/play/city.ts');
assert.equal(bowlingScore(Array.from({length:10},(_,i)=>i===9?[10,10,10]:[10])),300);
assert.equal(bowlingScore(Array.from({length:10},(_,i)=>i===9?[5,5,5]:[5,5])),150);
assert.equal(bowlingScore(Array.from({length:10},()=>[0,0])),0);
assert.equal(bowlingScore([[10],[3,4]]),24);
const {createRace,tickRace,sampleRace,nearestRace,RACE_LENGTH,RACE_LAPS,validateRaceTrack}=await load('../src/game-v2/play/racing.ts');
assert.equal(validateRaceTrack(),true);
for(let s=0;s<RACE_LENGTH;s+=1) { const p=sampleRace(s), n=nearestRace(p.x,p.z); assert.ok(Math.abs(n.s-s)<1e-7 || s===0&&Math.abs(n.s-RACE_LENGTH)<1e-7); }
const drive=createRace();tickRace(drive,3,1,0,false);assert.equal(drive.phase,'running');
for(let frame=0;frame<16000&&drive.phase!=='finished';frame++) {
  const p=nearestRace(drive.x,drive.z),target=sampleRace(p.s+5);
  const yaw=Math.atan2(-(target.x-drive.x),-(target.z-drive.z));
  const diff=Math.atan2(Math.sin(yaw-drive.yaw),Math.cos(yaw-drive.yaw));
  tickRace(drive,1/120,1,Math.max(-1,Math.min(1,diff*4)),false);
}
assert.equal(drive.phase,'finished');assert.equal(drive.won,true);assert.ok(drive.nextGate>RACE_LAPS*4);
assert.ok(drive.progress>=RACE_LAPS*RACE_LENGTH);
const steerRace=createRace();tickRace(steerRace,3,1,0,false);tickRace(steerRace,1,1,0,false);
const yawBefore=steerRace.yaw;tickRace(steerRace,.2,1,1,false);assert.ok(steerRace.yaw>yawBefore,'A steering turns the nose left');
const braking=steerRace.speed;tickRace(steerRace,.2,-1,0,false);assert.ok(steerRace.speed<braking);
const {freshVeli,veliOrder,VELI_MENU,VELI_FLAVORS}=await load('../src/game-v2/play/veli.ts');
assert.equal(VELI_MENU.length,10);assert.equal(VELI_FLAVORS.length,7);
const v=freshVeli();v.open=true;assert.equal(veliOrder(v,14,0,0).dollars,undefined);assert.equal(v.serving,0);assert.equal(v.open,true);
assert.equal(veliOrder(v,30,0,0,true,2).dollars,-19);assert.equal(v.serving,4);assert.equal(veliOrder(v,30,0,0),null);
assert.equal(veliOrder({...freshVeli(),open:true},100,NaN,0),null);
console.log('PASS: ten-frame bowling scores, ordered three-lap car race and original Veli menu purchases');

const {freshCity,triggerSpot,tickCity,crossFinish}=await load('../src/game-v2/play/city.ts');
const fullBowl=freshCity();triggerSpot(fullBowl,'bowl',240);
fullBowl.bowl.rollSeed=11;fullBowl.bowl.roll.seed=11;
// A real game: pocket line, release at the bottom of the swing, let the ball and pins settle.
const {bowlingScore:scoreFrames}=await load('../src/game-v2/play/city.ts');
for(let roll=0;roll<24&&fullBowl.bowl.phase!=='finished';roll++) {
  assert.equal(fullBowl.bowl.phase,'aim');
  fullBowl.bowl.roll.aim=-0.32;
  tickCity(fullBowl,1/60,true,0);
  while(fullBowl.bowl.phase==='approach'&&fullBowl.bowl.roll.approach<0.78) tickCity(fullBowl,1/120,true,0);
  tickCity(fullBowl,1/120,false,0);
  for(let g=0;g<600&&fullBowl.bowl.phase==='roll';g++) tickCity(fullBowl,1/60,false,0);
  assert.equal(fullBowl.bowl.phase,'show');
  tickCity(fullBowl,1.5,false,0);
}
assert.equal(fullBowl.bowl.phase,'finished');
assert.equal(fullBowl.bowl.throws.length,10,'ten frames were played');
assert.equal(fullBowl.bowl.score,scoreFrames(fullBowl.bowl.throws),'the running score is the ten-pin score of the recorded rolls');
const tenth=fullBowl.bowl.throws[9];const tenthBonus=tenth[0]===10||tenth[0]+tenth[1]===10;
assert.equal(tenth.length,tenthBonus?3:2,'tenth-frame bonus ball only after a strike or spare');
assert.ok(fullBowl.bowl.score>0&&fullBowl.bowl.score<300,'a simulated game is neither perfect nor empty');
const finishedCity=freshCity();finishedCity.race=drive;assert.equal(crossFinish(finishedCity).dollars,110);assert.equal(crossFinish(finishedCity),null);
console.log('PASS: full bowling game including tenth bonuses, race reward only once');

const {createHash}=await import('node:crypto');
const menuBytes=await readFile(new URL('../public/game-v2/vendors/veli/menu-original.png',import.meta.url));
assert.equal(createHash('sha256').update(menuBytes).digest('hex'),'e3cd0592b33b863ad8dc52c1f332bf2b34690ab6cbd18191341443419ed7178f','Original Veli menu must upload completely and remain unchanged');
console.log('PASS: exact original Veli menu byte integrity');

const otherFood=freshCity();
assert.equal(triggerSpot(otherFood,'truck',240).dollars,-12);
assert.equal(triggerSpot(otherFood,'truck',240).dollars,-10);
console.log('PASS: remaining shared stalls sell 901 plates/Soul bowls, not the removed Crown menu');

const {freshFoodCourt,orderFood}=await load('../src/game-v2/play/food-court.ts');
const trucks=freshFoodCourt();trucks.open='brothers';
assert.equal(orderFood(trucks,11,'brothers',0).dollars,undefined);
assert.equal(trucks.left,0);assert.equal(trucks.open,'brothers');
assert.equal(orderFood(trucks,30,'catch901',0),null,'Cannot order at a different truck');
assert.equal(orderFood(trucks,30,'brothers',NaN),null);
assert.equal(orderFood(trucks,30,'brothers',0).dollars,-12);
assert.equal(trucks.left,4);assert.equal(trucks.open,null);
assert.equal(orderFood(trucks,30,'brothers',0),null,'No duplicate serving charge');
console.log('PASS: separate truck menus, insufficient funds, invalid input and duplicate order protection');
const foodManifest=JSON.parse(await readFile(new URL('../public/game-v2/vendors/food-court/manifest.json',import.meta.url),'utf8'));
for(const asset of foodManifest.original_assets) {
 const bytes=await readFile(new URL('../'+asset.path,import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
}
console.log('PASS: source Brotherz/901 logos and music clip remain byte-identical');

assert.equal(trucks.activeBrother,0);assert.equal(trucks.nextBrother,1);
trucks.left=0;trucks.serving=null;trucks.open='brothers';
assert.equal(orderFood(trucks,0,'brothers',0).dollars,undefined);
assert.equal(trucks.nextBrother,1,'Rejected orders do not consume a turn');
orderFood(trucks,30,'brothers',0);
assert.equal(trucks.activeBrother,1);assert.equal(trucks.nextBrother,0);
trucks.left=0;trucks.serving=null;trucks.open='catch901';orderFood(trucks,30,'catch901',0);
assert.equal(trucks.nextBrother,0,'901 orders do not alter Brotherz turns');
console.log('PASS: brothers alternate only on successful orders; rejected and other-vendor orders preserve turns');

const THREE = await import('three');
const {createBasketballCamera,BASKETBALL_CAMERAS} = await load('../src/game-v2/core/basketball-camera.ts');
for(const aspect of [1280/800,390/844]) for(const mode of BASKETBALL_CAMERAS) for(const rimX of [57,75]) {
 const camera=new THREE.PerspectiveCamera(58,aspect,.1,220);camera.position.set(66,3.3,-15);
 const rig=createBasketballCamera(camera),player=new THREE.Vector3(66,.08,-22),rim={x:rimX,y:3.2,z:-22};
 const points=[player,new THREE.Vector3(66,3.08,-22),new THREE.Vector3(rimX,3.6,-22),new THREE.Vector3(63,7,-22)];
 for(let i=0;i<100;i++)rig.update(1/60,mode,player,rim,points);
 assert.ok(camera.position.y<5.3,'Shot tracking must not climb into a birdseye view');
 if(mode==='behind')assert.ok((camera.position.x-player.x)*(rimX-player.x)<0,'Default camera stays behind the shooter');
 camera.updateMatrixWorld();
 for(const p of points){const q=p.clone().project(camera);assert.ok(Math.abs(q.x)<.9&&Math.abs(q.y)<.9&&q.z>-1&&q.z<1,'Low camera keeps shooter, high arc and rim visible');}
 const before=camera.position.clone();points[3].y+=.2;rig.update(1/60,mode,player,rim,points);
 assert.ok(camera.position.distanceTo(before)<1,'Small arc changes must not create camera cuts');
}
console.log('PASS: three low basketball camera angles retain both rims/high arcs in desktop/portrait without camera cuts');
const {createCourtCameraCutaway}=await load('../src/game-v2/core/court-camera-cutaway.ts');
const cameraTestScenery=new THREE.Group(), cameraTestWall=new THREE.Mesh(new THREE.BoxGeometry(6,5,.2),new THREE.MeshBasicMaterial());cameraTestWall.position.y=2;
const cameraTestFloor=new THREE.Mesh(new THREE.PlaneGeometry(22,14),new THREE.MeshBasicMaterial());cameraTestFloor.rotation.x=-Math.PI/2;
const cameraTestActor=new THREE.Mesh(new THREE.PlaneGeometry(3,3),new THREE.MeshBasicMaterial());cameraTestActor.name='sprite';cameraTestScenery.add(cameraTestWall,cameraTestFloor,cameraTestActor);
const cameraTestCutaway=createCourtCameraCutaway(cameraTestScenery);
for(let i=0;i<40;i++)cameraTestCutaway.update(new THREE.Vector3(0,3,-4),[new THREE.Vector3(0,0,4),new THREE.Vector3(0,1.85,4),new THREE.Vector3(0,2,4),new THREE.Vector3(0,3,4)],1/60);
assert.ok(cameraTestWall.material.opacity<.03);assert.equal(cameraTestFloor.visible,true);assert.equal(cameraTestActor.visible,true);
cameraTestCutaway.restore();assert.equal(cameraTestWall.visible,true);assert.equal(cameraTestCutaway.count,0);
console.log('PASS: court camera removes a blocking wall, preserves floor/athlete art and restores scenery');
const spacing=createCourtMatch('half');
for(let i=0;i<120;i++)tickCourtMatch(spacing,1/60,rims,spacing.players[0],false);
assert.ok(Math.hypot(spacing.players[2].x-spacing.players[3].x,spacing.players[2].z-spacing.players[3].z)>1.3,'Defenders must cover distinct threats');
const reboundChase=createCourtMatch('full');reboundChase.owner=-1;reboundChase.shooter=0;reboundChase.ball={x:72,y:1.2,z:-26};reboundChase.velocity={x:0,y:-1,z:0};
const chaseBefore=Math.hypot(reboundChase.players[3].x-72,reboundChase.players[3].z+26);
for(let i=0;i<12;i++)tickCourtMatch(reboundChase,1/60,rims,reboundChase.players[0],false);
assert.ok(Math.hypot(reboundChase.players[3].x-72,reboundChase.players[3].z+26)<chaseBefore,'AI must close toward a descending rebound');
const palmRelease=createCourtMatch('half');palmRelease.charge=.65;palmRelease.ball={x:63.72,y:2.15,z:-24.18};
tickCourtMatch(palmRelease,0,rims,palmRelease.players[0],false);
assert.deepEqual(palmRelease.ball,{x:63.72,y:2.15,z:-24.18},'Release must retain the rendered palm origin');
console.log('PASS: separate defensive assignments, rebound pursuit and non-teleporting palm release');

// ---- rim and backboard contact (added with the iron pass) ----
{
  const { rimContact, backboardContact, RIM_RADIUS, BALL_RADIUS, SCORE_APERTURE } = await load('../src/game-v2/core/basketball.ts');
  const rim = { x: 60, y: 3.05, z: -22 };
  const clean = { x: 60, y: 3.2, z: -22 }, v1 = { x: 0, y: -4, z: 0 };
  assert.strictEqual(rimContact(clean, v1, rim), null, 'a dead-centre descending ball never touches iron');
  const short = { x: 60 + RIM_RADIUS + BALL_RADIUS * 0.3, y: rim.y + 0.1, z: -22 }, v2 = { x: -1, y: -4, z: 0 };
  assert.strictEqual(rimContact(short, v2, rim), 'rim', 'a short shot clangs the front iron');
  assert.ok(v2.y > -4, 'the clang redirects the ball upward');
  const rising = { x: 60 + RIM_RADIUS, y: rim.y - 0.05, z: -22 }, v3 = { x: 0, y: 5, z: 0 };
  assert.strictEqual(rimContact(rising, v3, rim), null, 'a ball climbing past the ring from below is not deflected');
  const board = { x: 59.58, minY: 2.54, maxY: 4.02, minZ: -23.1, maxZ: -20.9, nx: 1 };
  const prev = { x: 59.9, y: 3.3, z: -22 }, now = { x: 59.5, y: 3.3, z: -22 }, v4 = { x: -6, y: -1, z: 0 };
  assert.strictEqual(backboardContact(prev, now, v4, board), 'backboard', 'a fast ball crossing the board plane is caught');
  assert.ok(v4.x > 0 && now.x >= board.x, 'the board reflects it back toward the court');
  void SCORE_APERTURE;
  console.log('PASS: rim torus and backboard contact');
}

// ---- racing rival: lanes, passing, drafting, contact (added with the rival pass) ----
{
  const racingModule = await load('../src/game-v2/play/racing.ts');
  const { createRace, tickRace, rivalPose, RACE_LENGTH } = racingModule;
  const run = (race, seconds, throttle, steer = 0, drift = false) => { for (let i = 0; i < seconds * 60; i++) tickRace(race, 1 / 60, throttle, steer, drift); };
  // A parked human: Nitro drives, changes lane around him, and finishes.
  const parked = createRace(); parked.countdown = 0; parked.phase = 'running';
  const lanes = new Set();
  for (let i = 0; i < 60 * 60; i++) { tickRace(parked, 1 / 60, 0, 0, false); if (i % 30 === 0) lanes.add(Math.round(parked.rival.lane * 4)); }
  assert.ok(parked.opponent > RACE_LENGTH, 'Nitro laps on his own');
  assert.ok(lanes.size >= 2, 'Nitro moves between lanes instead of a fixed line');
  const pose = rivalPose(parked);
  assert.ok(Number.isFinite(pose.x) && Number.isFinite(pose.z), 'rival pose is a world position');
  // Contact: force the cars together and expect a shove plus a scrub.
  const bump = createRace(); bump.countdown = 0; bump.phase = 'running';
  run(bump, 4, 1);
  bump.opponent = bump.progress - 0.5; bump.rival.lane = bump.lane; bump.rival.speed = bump.speed;
  const beforeSpeed = bump.speed;
  tickRace(bump, 1 / 60, 1, 0, false);
  assert.ok(bump.events.includes('contact'), 'side-by-side cars register contact');
  assert.ok(bump.speed < beforeSpeed, 'contact scrubs speed');
  assert.ok(Math.abs(bump.lane - bump.rival.lane) > 0.1, 'contact shoves the cars apart');
  // Drafting: sit 5 m behind Nitro in his lane at speed.
  const tow = createRace(); tow.countdown = 0; tow.phase = 'running';
  run(tow, 4, 1);
  tow.opponent = tow.progress + 5; tow.rival.lane = tow.lane; tow.rival.speed = tow.speed;
  tickRace(tow, 1 / 60, 1, 0, false);
  assert.ok(tow.drafting && tow.events.includes('draft'), 'tucked in behind Nitro you draft');
  // A full-throttle human still gets a real race that ends.
  const race = createRace(); race.countdown = 0; race.phase = 'running';
  for (let i = 0; i < 200 * 60 && race.phase === 'running'; i++) {
    // naive driver: full gas, steer toward the centreline heading
    const f = raceFrame(race);
    tickRace(race, 1 / 60, 1, Math.max(-1, Math.min(1, f)), false);
  }
  assert.equal(race.phase, 'finished', 'race ends');
  console.log('PASS: Nitro drives lanes, passes, drafts and trades paint');
  function raceFrame(r) { // steering error toward the track heading at the car's progress
    const { sampleRace } = racingModule; const target = sampleRace(r.progress + 4).yaw; let d = target - r.yaw;
    while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d * 2;
  }
}


// ---- bowling: the roll is simulated, not decided (added with the bowling pass) ----
{
  const B = await load('../src/game-v2/play/bowling.ts');
  const up = () => Array(10).fill(true);
  const bowl = (aim, releaseAt, seed = 1, standing = up()) => {
    const r = B.freshRoll(standing, seed); r.aim = aim;
    B.tickRoll(r, { dt: 1 / 60, hold: true, steer: 0 });
    while (r.phase === 'approach' && r.approach < releaseAt) B.tickRoll(r, { dt: 1 / 120, hold: true, steer: 0 });
    B.tickRoll(r, { dt: 1 / 120, hold: false, steer: 0 });
    const ev = []; let g = 0; while (r.phase === 'roll' && g++ < 5000) ev.push(...B.tickRoll(r, { dt: 1 / 60, hold: false, steer: 0 }));
    return { r, ev };
  };
  const sweet = bowl(0.18, B.RELEASE_SWEET);
  assert.ok(sweet.r.ball.s > B.LANE_LENGTH && sweet.r.fellThisRoll > 0, 'a clean release reaches the pins');
  const foul = bowl(0.18, 1.05);
  assert.ok(foul.r.foul && foul.r.fellThisRoll === 0, 'over the line is a foul and counts zero');
  const gutter = bowl(1, B.RELEASE_SWEET);
  assert.ok(gutter.ev.includes('gutter') && gutter.r.fellThisRoll === 0, 'the edge of the lane is a gutter');
  let pocketStrikes = 0, headStrikes = 0;
  for (let s = 1; s <= 40; s++) { if (bowl(-0.32, B.RELEASE_SWEET, s).r.fellThisRoll === 10) pocketStrikes++; if (bowl(0, 0.98, s).r.fellThisRoll === 10) headStrikes++; }
  assert.ok(pocketStrikes > headStrikes, 'a hooked pocket ball strikes more than a flat head-on ball');
  assert.ok(pocketStrikes < 32, 'strikes are never automatic');
  const first = bowl(-0.32, B.RELEASE_SWEET, 7); const left = first.r.fallen.map((f) => !f);
  const second = bowl(-0.32, B.RELEASE_SWEET, 8, left);
  assert.ok(second.r.fallen.every((f, i) => f || left[i]), 'the second ball only counts pins still standing');
  console.log('PASS: bowling approach, foul, gutter, pocket strikes and spare pickups are simulated');
}

// ---- bowling scoreboard strip (added with the finish pass) ----
{
  const { frameBoard, bowlingScore } = await load('../src/game-v2/play/city.ts');
  const bowl = (throws, frame, phase = 'aim') => ({ throws, frame, phase, score: bowlingScore(throws), standing: 10 });
  let b = frameBoard(bowl([[10], [7, 3], [4, 2], []], 3));
  assert.deepEqual(b[0].rolls, ['X'], 'strike shows as X');
  assert.deepEqual(b[1].rolls, ['7', '/'], 'spare shows as /');
  assert.equal(b[0].total, 20, 'strike total waits for two rolls then counts them: 10+7+3');
  assert.equal(b[1].total, 34, 'spare counts the next roll: 20 + 10 + 4');
  assert.equal(b[2].total, 40, 'open frame adds its pins');
  assert.equal(b[3].total, null, 'the frame in play has no total yet');
  assert.ok(b[3].current, 'the frame in play is marked');
  b = frameBoard(bowl([[10], []], 1));
  assert.equal(b[0].total, null, 'a strike has no total until its bonus rolls exist');
  b = frameBoard(bowl([[0, 0], [10], [10], [10], [10], [10], [10], [10], [10], [10, 10, 10]], 9, 'finished'));
  assert.equal(b[9].total, 270, 'tenth frame totals the whole game');
  console.log('PASS: bowling scoreboard marks strikes, spares, pending and running totals');
}
