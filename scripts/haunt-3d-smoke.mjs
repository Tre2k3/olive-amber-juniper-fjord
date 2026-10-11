import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
assert.equal(createHash('sha256').update(await readFile(new URL('../public/game-v2/brand/flagship-logo.png', import.meta.url))).digest('hex'),
  '76f17e304922d7a9fe4f56c2d43cb92ac22de5b4deaa6b736230a5e3e3a53cd4', 'Flagship artwork must match the original file');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [], requests = [], shaderErrors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => {
    if (message.type() === 'error' && /WebGLProgram|shader.*error/i.test(message.text())) shaderErrors.push(message.text());
  });
  page.on('request', r => requests.push(r.url()));
  const gameUrl = new URL(process.env.GAME_URL || 'http://127.0.0.1:8080/');
  gameUrl.searchParams.set('qa', '1');
  await page.goto(gameUrl.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__SACK_V2_INPUT__?.hauntState(), null, { timeout: 90000 });
  await page.waitForFunction(() => {
    const brand = window.__SACK_V2_INPUT__?.brandState();
    return brand && brand.logos >= 8 && brand.loaded === brand.logos;
  }, null, { timeout: 90000 });
  const frames = count => page.evaluate(async n => {
    for (let i = 0; i < n; i++) await new Promise(r => requestAnimationFrame(r));
  }, count);
  const set = opts => page.evaluate(o => window.__SACK_V2_INPUT__.setShot(o), opts);
  const freezeState = () => page.evaluate(() => {
    window.__SACK_V2_INPUT__.freezeCapture(true);
    return window.__SACK_V2_INPUT__.basketballState();
  });
  const captureAction = async path => {
    await page.evaluate(() => window.__SACK_V2_INPUT__.freezeCapture(true));
    try { await page.screenshot({ path, timeout: 60000 }); }
    finally { await page.evaluate(() => window.__SACK_V2_INPUT__.freezeCapture(false)); }
  };
  const state = await page.evaluate(() => window.__SACK_V2_INPUT__.hauntState());
  assert.ok(state.houseMeshes > 140 && state.foyerMeshes > 90, 'House and foyer must retain modeled architecture and dressing');
  assert.ok(!requests.some(url => /\/haunt\/(facade\.png|foyer\.jpg|stair\.jpg)/.test(url)), 'House must not load exterior or room pictures as architecture');
  await mkdir('artifacts/haunt', { recursive: true });
  for (const [name, shot] of [
    ['house-front-day', { place: 'street', x: -78, z: 1, yaw: 0, dist: 14, height: 6, lookY: 6, night: false }],
    ['house-front-night', { place: 'street', x: -78, z: 1, yaw: 0, dist: 14, height: 6, lookY: 6, night: true }],
    ['house-side', { place: 'street', x: -85, z: 4, yaw: 0.65, dist: 10, height: 5, lookY: 5, golden: true }],
    ['foyer', { place: 'haunt', x: 4.4, z: 503.5, yaw: 0, dist: 4.25, height: 2.35, lookY: 2.18, night: false, dialogue: '' }],
    ['library', { place: 'haunt', x: 29.2, z: 503.8, yaw: -Math.PI / 2, dist: 3.6, height: 2, lookY: 1.5, night: false, dialogue: '' }],
    ['library-hearth', { place: 'haunt', x: 29.1, z: 505.2, yaw: 0, dist: 3.6, height: 1.7, lookY: 1.55, night: false, dialogue: '' }],
    ['hq-flagship-exterior', { place: 'street', x: 24, z: -6.2, yaw: Math.PI, dist: 8, height: 3.8, lookY: 3.5, night: false, dialogue: '' }],
    ['hq-flagship-interior', { place: 'hq', x: 80, z: 203.5, yaw: Math.PI, dist: 4, height: 2, lookY: 2.2, night: false, dialogue: '' }],
    ['court-flagship', { place: 'court', x: 66, z: -24.5, yaw: Math.PI, dist: 7, height: 2.7, lookY: 2, night: false, dialogue: '' }],
    ['court-floor-flagship', { place: 'court', x: 66, z: -22, yaw: Math.PI, dist: 0.2, height: 21, lookY: 0.06, night: false, dialogue: '' }],
  ]) {
    await set(shot); await frames(8);
    await page.screenshot({ path: `artifacts/haunt/${name}.png`, timeout: 60000 });
    if (name === 'library-hearth') {
      const heights = await page.evaluate(async () => {
        const values = [];
        for (let i = 0; i < 20; i++) {
          await new Promise(r => requestAnimationFrame(r));
          const state = window.__SACK_V2_INPUT__.hauntState();
          if (state.activeLights > 4 || state.hearth.intensity > 5) throw new Error('Hearth exceeds the lighting budget');
          values.push(state.hearth.flameHeight);
        }
        return values;
      });
      assert.ok(Math.max(...heights) - Math.min(...heights) > 0.01, 'Hearth flames must animate in the running game');
      await page.screenshot({ path: 'artifacts/haunt/library-hearth-flicker.png', timeout: 60000 });
      console.log('PASS: animated hearth stays below five intensity and within four active house lights');
    }
  }
  // Use real keyboard movement to climb, cross the gallery, and return downstairs.
  await set({ place: 'haunt', x: 1.6, z: 501.2, yaw: 0, dialogue: '' });
  await page.keyboard.down('KeyW');
  await page.waitForFunction(() => window.__SACK_V2__.z > 505.9 && window.__SACK_V2__.y > 2.5,
    null, { timeout: 90000 });
  await page.keyboard.up('KeyW'); await frames(12);
  assert.ok(Math.abs(await page.evaluate(() => window.__SACK_V2__.y) - 2.51) < 0.001,
    'Benji soles must reach the physical gallery top');
  assert.equal((await page.evaluate(() => window.__SACK_V2_INPUT__.hauntState())).gallery, true);
  await page.screenshot({ path: 'artifacts/haunt/stairs-climbed.png', timeout: 60000 });
  await page.keyboard.down('KeyW'); await frames(12); await page.keyboard.up('KeyW'); await frames(2);
  assert.ok(await page.evaluate(() => window.__SACK_V2__.z < 506.76), 'Rear gallery guard must stop walking off upstairs');
  await set({ place: 'haunt', x: 3, z: 506, yaw: 0, dialogue: '' });
  await page.keyboard.down('KeyA');
  await page.waitForFunction(() => window.__SACK_V2__.x > 3.2, null, { timeout: 90000 });
  await frames(8); await page.keyboard.up('KeyA'); await frames(3);
  assert.ok(await page.evaluate(() => window.__SACK_V2__.x < 3.32), 'Upstairs console must block Benji at its own height');
  await set({ place: 'haunt', x: 2.8, z: 506, yaw: Math.PI / 2, dialogue: '' }); await frames(12);
  await page.screenshot({ path: 'artifacts/haunt/upstairs-gallery.png', timeout: 60000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await set({ place: 'haunt', x: 2.8, z: 506, yaw: Math.PI / 2, dialogue: '' }); await frames(12);
  await page.screenshot({ path: 'artifacts/haunt/upstairs-gallery-mobile.png', timeout: 60000 });
  await page.setViewportSize({ width: 1280, height: 800 });
  await set({ place: 'haunt', x: 1.6, z: 505.85, yaw: 0, dialogue: '' });
  await page.keyboard.down('KeyS');
  await page.waitForFunction(() => window.__SACK_V2__.z < 501.4, null, { timeout: 90000 });
  await page.keyboard.up('KeyS'); await frames(20);
  assert.ok(Math.abs(await page.evaluate(() => window.__SACK_V2__.y) - 0.11) < 0.001, 'Descending stairs returns soles to the foyer floor');
  await page.screenshot({ path: 'artifacts/haunt/stairs-descended.png', timeout: 60000 });
  await set({ place: 'haunt', x: 3, z: 503, yaw: 0, dialogue: '' });
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__SACK_V2__.x < 2.85, null, { timeout: 90000 });
  await frames(10); await page.keyboard.up('KeyD'); await frames(2);
  assert.ok(await page.evaluate(() => window.__SACK_V2__.x >= 2.375 && window.__SACK_V2__.y < 0.2),
    'Entering stairs sideways must not teleport Benji onto a high tread');
  console.log('PASS: real stair ascent/descent, gallery guards, upstairs console, portrait camera and no side teleport');
  await set({ place: 'street', x: -88.6, z: 4.35, dollars: 240, yaw: 0 });
  await page.keyboard.press('KeyE'); await frames(3);
  assert.equal((await page.evaluate(() => window.__SACK_V2_INPUT__.hauntState())).ticket, true);
  assert.equal(await page.evaluate(() => window.__SACK_V2__.dollars), 230, 'Ticket still costs $10');
  await set({ place: 'street', x: -78, z: 8.3, yaw: 0 });
  await page.keyboard.press('KeyE'); await frames(3);
  assert.equal(await page.evaluate(() => window.__SACK_V2__.place), 'haunt', 'Gate enters the actual interior');
  assert.ok((await page.evaluate(() => window.__SACK_V2_INPUT__.hauntState())).activeLights <= 4);
  await set({ place: 'haunt', x: 7.1, z: 503.9, yaw: Math.PI, dialogue: '' });
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__SACK_V2__.x > 8.3, null, { timeout: 90000 });
  await page.keyboard.up('KeyD'); await frames(2);
  assert.ok(await page.evaluate(() => window.__SACK_V2__.x > 8.3), 'Player must walk through the doorway into the stair hall');
  await set({ place: 'haunt', x: 6.2, z: 502, yaw: Math.PI });
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__SACK_V2__.x >= 6.4, null, { timeout: 90000 });
  await frames(8); await page.keyboard.up('KeyD'); await frames(2);
  assert.ok(await page.evaluate(() => window.__SACK_V2__.x < 6.5), 'Console table must block the player');
  await set({ place: 'haunt', x: 27.35, z: 506, yaw: Math.PI });
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__SACK_V2__.x > 27.5, null, { timeout: 90000 });
  await frames(8); await page.keyboard.up('KeyD'); await frames(2);
  assert.ok(await page.evaluate(() => window.__SACK_V2__.x < 27.9), 'Library armchair must block the player');
  await set({ place: 'haunt', x: 25.8, z: 503.9, yaw: Math.PI });
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__SACK_V2__.x > 32.3, null, { timeout: 90000 });
  await page.keyboard.up('KeyD'); await frames(2);
  assert.ok(await page.evaluate(() => window.__SACK_V2__.x > 32.3), 'Library furniture must leave the route into the attic open');
  await set({ place: 'haunt', x: 4, z: 501.2, yaw: Math.PI });
  await page.keyboard.press('KeyE'); await frames(3);
  assert.equal(await page.evaluate(() => window.__SACK_V2__.place), 'street', 'House exit returns to the neighborhood');
  // Original supplied menu, paid orders and actual rendered serving frames.
  await set({place:'street',x:62,z:22.4,yaw:0,dist:5.8,height:2.5,lookY:1.8,dollars:240,dialogue:''});
  await page.waitForFunction(()=>window.__SACK_V2_INPUT__.veliState().loaded,null,{timeout:90000});
  await frames(12);
  await page.screenshot({path:'artifacts/haunt/veli-truck.png',timeout:60000});
  await page.keyboard.press('KeyE');
  await page.getByTestId('veli-menu').waitFor({timeout:60000});
  assert.equal(await page.getByTestId('veli-order-0').textContent().then(x=>x.trim()),'10pc party wing combo · $15');
  await page.screenshot({path:'artifacts/haunt/veli-menu.png',timeout:60000});
  await page.getByTestId('veli-order-0').click();
  await page.waitForFunction(()=>window.__SACK_V2_INPUT__.veliState().frame===2,null,{polling:'raf',timeout:90000});
  await page.evaluate(()=>window.__SACK_V2_INPUT__.freezeCapture(true));
  assert.equal(await page.evaluate(()=>window.__SACK_V2__.dollars),225);
  assert.equal((await page.evaluate(()=>window.__SACK_V2_INPUT__.veliState())).price,15);
  await page.screenshot({path:'artifacts/haunt/veli-serving.png',timeout:60000});
  await page.evaluate(()=>window.__SACK_V2_INPUT__.freezeCapture(false));
  await page.waitForFunction(()=>window.__SACK_V2_INPUT__.veliState().box,null,{polling:'raf',timeout:90000});
  await page.evaluate(()=>window.__SACK_V2_INPUT__.freezeCapture(true));
  await page.screenshot({path:'artifacts/haunt/veli-handoff.png',timeout:60000});
  await page.evaluate(()=>window.__SACK_V2_INPUT__.freezeCapture(false));
  await page.waitForFunction(()=>window.__SACK_V2_INPUT__.veliState().serving===0,null,{polling:'raf',timeout:90000});
  await page.setViewportSize({width:390,height:844});
  await set({place:'street',x:62,z:22.4,yaw:0,dist:5.8,height:2.5,lookY:1.8,dollars:240,dialogue:''});
  await page.getByRole('button',{name:'E',exact:true}).click();
  await page.getByTestId('veli-menu').waitFor({timeout:60000});
  await page.screenshot({path:'artifacts/haunt/veli-menu-mobile.png',timeout:60000});
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByTestId('veli-menu').waitFor({state:'hidden',timeout:15000});
  await page.setViewportSize({width:1280,height:800});
  // Race requires throttle and steering; no walking finish trigger.
  await set({place:'street',x:-40,z:-36,yaw:Math.PI,dialogue:''});
  await page.keyboard.press('KeyE');await frames(12);
  assert.equal((await page.evaluate(()=>window.__SACK_V2_INPUT__.raceState())).phase,'countdown');
  await page.waitForFunction(()=>window.__SACK_V2_INPUT__.raceState()?.phase==='running',null,{polling:'raf',timeout:90000});
  await page.evaluate(()=>window.__SACK_V2_INPUT__.raceOverview(true));await frames(2);
  await page.screenshot({path:'artifacts/haunt/race-circuit.png',timeout:60000});
  await page.evaluate(()=>window.__SACK_V2_INPUT__.raceOverview(false));
  await page.keyboard.down('KeyW');await frames(35);
  let race=await page.evaluate(()=>window.__SACK_V2_INPUT__.raceState());
  assert.ok(race.speed>4&&race.x>-31.5);
  await page.screenshot({path:'artifacts/haunt/race-driving.png',timeout:60000});
  const yawBefore=race.yaw;
  await page.keyboard.down('KeyA');await page.keyboard.down('Space');await frames(12);
  await page.keyboard.up('KeyA');await page.keyboard.up('Space');
  race=await page.evaluate(()=>window.__SACK_V2_INPUT__.raceState());assert.ok(race.yaw>yawBefore,'A turns racing nose left');
  await page.keyboard.up('KeyW');await page.keyboard.down('KeyS');await frames(12);await page.keyboard.up('KeyS');
  assert.ok((await page.evaluate(()=>window.__SACK_V2_INPUT__.raceState())).speed<race.speed);
  await page.keyboard.press('KeyE');await frames(3);
  assert.equal(await page.evaluate(()=>window.__SACK_V2_INPUT__.raceState()),null);
  // Moving translucent apparitions are geometry inside the real house.
  await set({place:'haunt',x:20,z:504,yaw:Math.PI/2,dist:3.2,height:1.8,lookY:1.7,dialogue:''});await frames(12);
  const ghostBefore=await page.evaluate(()=>window.__SACK_V2_INPUT__.atmosphereState());
  assert.equal(ghostBefore.ghosts.length,2);assert.equal(ghostBefore.cars,18);assert.ok(ghostBefore.crowds>=26);
  await page.screenshot({path:'artifacts/haunt/haunt-apparition.png',timeout:60000});await frames(10);
  const ghostAfter=await page.evaluate(()=>window.__SACK_V2_INPUT__.atmosphereState());
  assert.notDeepEqual(ghostAfter.ghosts,ghostBefore.ghosts);
  console.log('PASS: Veli paid menu, serving, handoff/mobile; race throttle/steer/brake/exit; moving haunt geometry and busier city');
  // Real interaction enters bowling: Benji remains visible and the ball starts
  // at hand height, then lowers into a rolling release with activity framing.
  const door = await page.evaluate(() => window.__SACK_V2_INPUT__.activityState().bowlDoor);
  await set({ place: 'street', x: door.x, z: door.z, yaw: Math.PI, dialogue: '' });
  await page.keyboard.press('KeyE'); await frames(12);
  const aiming = await page.evaluate(() => window.__SACK_V2_INPUT__.activityState());
  assert.equal(aiming.bowl?.phase, 'aim');
  assert.equal(aiming.avatarVisible, true, 'Bowling must show Benji');
  assert.ok(aiming.bowlBall.y > 0.6 && Math.abs(aiming.bowlBall.x - 92) < 0.5, 'Aiming ball must be held beside Benji');
  const heldCapture = await page.screenshot({ path: 'artifacts/haunt/bowling-held.png', timeout: 60000 });
  const projected = await page.evaluate(() => window.__SACK_V2_INPUT__.renderState().playerScreen);
  const visibleShirt = await page.evaluate(async ({ bytes, projected }) => {
    const image = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    const height = projected.feetY - projected.headY;
    const centerX = (projected.headX + projected.feetX) / 2;
    let green = 0;
    for (let y = Math.max(0, Math.floor(projected.headY + height * 0.28)); y < Math.min(image.height, projected.headY + height * 0.65); y++) {
      for (let x = Math.max(0, Math.floor(centerX - height * 0.12)); x < Math.min(image.width, centerX + height * 0.12); x++) {
        const i = (y * image.width + x) * 4;
        if (pixels[i + 1] > 100 && pixels[i] < pixels[i + 1] * 0.65 && pixels[i + 2] < pixels[i + 1] * 0.8) green++;
      }
    }
    return green;
  }, { bytes: [...heldCapture], projected });
  assert.ok(visibleShirt > 40, 'Benji must actually render in the bowling capture, not disappear behind transparent glass');
  await page.keyboard.down('Space'); await frames(8); await page.keyboard.up('Space');
  await page.waitForFunction(() => window.__SACK_V2_INPUT__.activityState().bowl?.phase === 'roll', null, { timeout: 90000 });
  await frames(5);
  const rolling = await page.evaluate(() => window.__SACK_V2_INPUT__.activityState());
  assert.equal(rolling.avatarVisible, true);
  assert.ok(rolling.bowlBall.z < aiming.bowlBall.z && rolling.bowlBall.y < aiming.bowlBall.y, 'Release must lower the ball and send it toward the pins');
  await page.screenshot({ path: 'artifacts/haunt/bowling-roll.png', timeout: 60000 });
  await set({ place: 'court', x: 66, z: -22, yaw: Math.PI, ballHeld: true, dialogue: '' });
  await page.keyboard.down('KeyD');
  const dribble = await page.evaluate(async () => {
    const heights = [];
    for (let i = 0; i < 14; i++) {
      await new Promise(r => requestAnimationFrame(r));
      heights.push(window.__SACK_V2_INPUT__.ballState().position.y);
    }
    return heights;
  });
  assert.ok(Math.max(...dribble) - Math.min(...dribble) > 0.1, 'Moving with the basketball must dribble');
  assert.ok(Math.min(...dribble) >= 0.16, 'Dribble must stay above the court surface');
  await page.screenshot({ path: 'artifacts/haunt/basketball-dribble.png', timeout: 60000 });
  await page.keyboard.up('KeyD');
  const assertShotFrame = state => {
    assert.ok(state.shotCameraActive, 'Shot camera must engage during charge and flight');
    for (const point of state.shotScreen) {
      assert.ok(Math.abs(point.x) < 0.95 && Math.abs(point.y) < 0.95 && point.z > -1 && point.z < 1,
        'Shot camera must retain Benji, the live ball and hoop');
    }
  };
  for (const [name, width, height] of [['desktop', 1280, 800], ['portrait', 390, 844]]) {
    await page.setViewportSize({ width, height });
    await set({ place: 'court', x: 66, z: -22, yaw: Math.PI / 2, ballHeld: true, dialogue: '' });
    const orbit = await page.evaluate(() => window.__SACK_V2_INPUT__.cameraYaw());
    await page.evaluate(() => window.__SACK_V2_INPUT__.setCharge(true));
    await frames(12);
    assertShotFrame(await page.evaluate(() => window.__SACK_V2_INPUT__.ballState()));
    await page.screenshot({ path: `artifacts/haunt/basketball-charge-${name}.png`, timeout: 60000 });
    await page.evaluate(() => window.__SACK_V2_INPUT__.setCharge(false));
    await frames(10);
    assertShotFrame(await page.evaluate(() => window.__SACK_V2_INPUT__.ballState()));
    await page.screenshot({ path: `artifacts/haunt/basketball-flight-${name}.png`, timeout: 60000 });
    await frames(100);
    assert.equal((await page.evaluate(() => window.__SACK_V2_INPUT__.ballState())).shotCameraActive, false,
      'Shot camera must return after landing or timeout');
    assert.equal(await page.evaluate(() => window.__SACK_V2_INPUT__.cameraYaw()), orbit,
      'Shot camera must preserve the player orbit');
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  console.log('PASS: desktop and portrait shot cameras frame Benji, ball and hoop and restore orbit');
  const pier = await page.evaluate(() => window.__SACK_V2_INPUT__.activityState().pier);
  await set({ place: 'street', x: -16, z: -64, yaw: 0, dist: 18, height: 8, lookY: 3, night: false, dialogue: '' });
  await frames(24);
  await page.screenshot({ path: 'artifacts/haunt/riverfront-overview.png', timeout: 60000 });
  await set({ place: 'street', x: pier.x, z: pier.z, yaw: Math.PI, dialogue: '' });
  await page.keyboard.press('KeyE'); await frames(20);
  const fishing = await page.evaluate(() => window.__SACK_V2_INPUT__.activityState());
  assert.ok(fishing.fish && fishing.rodVisible && fishing.lineVisible, 'Fishing must show the held rod and a line to the bobber');
  const assertFishingFrame = (state) => {
    for (const point of [state.fishingScreen.tip, state.fishingScreen.float]) {
      assert.ok(Math.abs(point.x) < 0.95 && Math.abs(point.y) < 0.95, 'Fishing camera must retain both rod tip and bobber');
    }
  };
  assertFishingFrame(fishing);
  assert.ok(fishing.lineEndX < -18.1 && fishing.lineEndZ < -66, 'Cast must land in open water beside the pier');
  assert.ok(Math.abs(fishing.lineEndY - fishing.waterY) < 0.001, 'Fishing line must enter the river surface');
  assert.ok(Math.abs(fishing.floatY - fishing.waterY) < 0.06, 'Bobber must float at the water');
  await page.waitForFunction(() => window.__SACK_V2_INPUT__.activityState().fish?.phase === 'bite',
    null, { timeout: 90000, polling: 'raf' });
  const beforeCatch = await page.evaluate(() => window.__SACK_V2__.dollars);
  await page.keyboard.press('KeyE'); await frames(2);
  assert.ok(await page.evaluate(n => window.__SACK_V2__.dollars > n, beforeCatch), 'Live E catches a fish');
  assert.equal((await page.evaluate(() => window.__SACK_V2_INPUT__.activityState())).fish.phase, 'wait',
    'Catch must leave fishing active');
  await page.keyboard.press('KeyE'); await frames(2);
  assert.ok((await page.evaluate(() => window.__SACK_V2_INPUT__.activityState())).fish,
    'Early tap must keep the line out');
  await page.screenshot({ path: 'artifacts/haunt/fishing-held-rod.png', timeout: 60000 });
  const handView = await page.evaluate(() => window.__SACK_V2_INPUT__.renderState().playerScreen);
  const detailY = Math.max(0, Math.floor(handView.headY - 15));
  await page.screenshot({ path: 'artifacts/haunt/fishing-hand-detail.png', timeout: 60000,
    clip: { x: Math.max(0, Math.floor(handView.feetX - 80)), y: detailY, width: 240,
      height: Math.min(800 - detailY, Math.ceil(handView.feetY - handView.headY + 30)) } });
  await page.setViewportSize({ width: 390, height: 844 });
  await set({ place: 'street', x: pier.x, z: pier.z, yaw: Math.PI, dialogue: '' });
  await page.keyboard.press('KeyE'); await frames(20);
  assertFishingFrame(await page.evaluate(() => window.__SACK_V2_INPUT__.activityState()));
  await page.screenshot({ path: 'artifacts/haunt/fishing-mobile.png', timeout: 60000 });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForFunction(() => window.__SACK_V2_INPUT__.activityState().fish?.phase === 'bite',
    null, { timeout: 90000, polling: 'raf' });
  await page.waitForFunction(() => window.__SACK_V2_INPUT__.activityState().fish?.phase === 'wait',
    null, { timeout: 90000, polling: 'raf' });
  assert.ok((await page.evaluate(() => window.__SACK_V2_INPUT__.activityState())).rodVisible, 'Miss keeps rod and line active');
  await page.screenshot({ path: 'artifacts/haunt/fishing-continues.png', timeout: 60000 });
  await page.keyboard.down('KeyD'); await frames(3); await page.keyboard.up('KeyD');
  assert.equal((await page.evaluate(() => window.__SACK_V2_INPUT__.activityState())).fish, null,
    'Movement exits continuous fishing');
  await frames(2);
  assert.equal((await page.evaluate(() => window.__SACK_V2_INPUT__.activityState())).lineVisible, false);
  console.log('PASS: water contact, live catch/miss continuation, early tap, movement exit and fishing camera');
  await set({ place: 'court', x: 61, z: -22, yaw: Math.PI, ballHeld: true, dialogue: '' });
  const beforeMake = (await page.evaluate(() => window.__SACK_V2_INPUT__.ballState())).made;
  await page.evaluate(() => window.__SACK_V2_INPUT__.setCharge(true));
  await page.waitForFunction(() => window.__SACK_V2_INPUT__.ballState().charge > 0.67, null, { timeout: 90000, polling: 'raf' });
  await page.evaluate(() => window.__SACK_V2_INPUT__.setCharge(false));
  await page.waitForFunction(n => window.__SACK_V2_INPUT__.ballState().made > n, beforeMake, { timeout: 90000, polling: 'raf' });
  assert.equal((await page.evaluate(() => window.__SACK_V2_INPUT__.ballState())).held, false, 'Made practice shot remains live instead of teleporting to the hand');
  await page.screenshot({ path: 'artifacts/haunt/basketball-made-net.png', timeout: 60000 });
  for (const mode of ['half', 'full']) {
    await page.evaluate(m => window.__SACK_V2_INPUT__.startBasketball(m), mode);
    await frames(20);
    await page.waitForFunction(() => window.__SACK_V2_INPUT__.basketballState()?.animation.loaded === 8, null, { timeout: 90000 });
    const match = await page.evaluate(() => window.__SACK_V2_INPUT__.basketballState());
    assert.equal(match.mode, mode); assert.equal(match.players.length, 4);
    assert.equal(match.duplicateCastVisible, 0, 'Court participants must not also stand on the sidelines');
    assert.ok(match.animation.visible && match.animation.action === 'dribble', 'Ball owner must use supplementary dribble poses');
    if (mode === 'half') assert.ok(match.players.every(p => p.x <= 66));
    assert.ok(match.players.every(p => p.x >= 55.5 && p.x <= 76.5 && p.z >= -28.5 && p.z <= -15.5));
    await page.screenshot({ path: `artifacts/haunt/basketball-2v2-${mode}.png`, timeout: 60000 });
  }
  const assertMatchHudClear = async () => {
    const view = await page.evaluate(() => {
      const player = window.__SACK_V2_INPUT__.renderState().playerScreen;
      return { player, overlays: ['court-score', 'interaction-prompt', 'shot-charge'].flatMap(id => {
        const node = document.querySelector(`[data-testid="${id}"]`);
        return node ? [{ id, bottom: node.getBoundingClientRect().bottom }] : [];
      }) };
    });
    assert.ok(view.overlays.every(o => o.bottom < view.player.headY), 'Match HUD must sit above the action body');
  };
  await page.evaluate(() => window.__SACK_V2_INPUT__.setCharge(true)); await frames(12);
  assert.equal((await page.evaluate(() => window.__SACK_V2_INPUT__.basketballState())).animation.action, 'shoot-back');
  await assertMatchHudClear();
  await captureAction('artifacts/haunt/basketball-animated-gather.png');
  await page.evaluate(() => window.__SACK_V2_INPUT__.setCharge(false)); await frames(2);
  assert.equal((await page.evaluate(() => window.__SACK_V2_INPUT__.basketballState())).animation.action, 'shoot-back');
  await captureAction('artifacts/haunt/basketball-animated-release.png');
  await frames(5);
  await captureAction('artifacts/haunt/basketball-animated-follow.png');
  await page.evaluate(() => window.__SACK_V2_INPUT__.startBasketball('half'));
  await set({ place: 'court', x: 58, z: -22, yaw: Math.PI, ballHeld: true, dialogue: '' }); await frames(2);
  await page.keyboard.press('KeyV'); await frames(15);
  const dunkView = await freezeState();
  assert.equal(dunkView.animation.action, 'dunk-back');
  assert.ok(dunkView.actionScreen.every(p => Math.abs(p.x) < .95 && Math.abs(p.y) < .95 && p.z > -1 && p.z < 1), 'Rear dunk camera retains player, ball and rim'); assert.equal(dunkView.animation.visible, true);
  assert.equal(dunkView.animation.gripVisible, true, 'Dunk must show its gripping fingers over the ball edge');
  await captureAction('artifacts/haunt/basketball-animated-dunk.png');
  const throughRim = await page.evaluate(async () => {
    for (let i = 0; i < 120; i++) {
      const current = window.__SACK_V2_INPUT__.basketballState();
      if (current?.dunk === 0 && current.scored && current.animation.frame === 2
          && 1 - current.actionLeft / .85 >= .68) {
        window.__SACK_V2_INPUT__.freezeCapture(true);
        return current;
      }
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    throw new Error('Dunk never reached the through-rim follow-through');
  });
  assert.ok(throughRim.hand[1] > throughRim.rim.y + .1, 'Dunk wrist stays above the rim while its forearm crosses the opening');
  assert.ok(Math.hypot(throughRim.hand[0] - throughRim.rim.x, throughRim.hand[2] - throughRim.rim.z) < .1,
    'Dunk wrist must stay within the hoop opening');
  await captureAction('artifacts/haunt/basketball-dunk-through-rim.png');
  await page.evaluate(() => window.__SACK_V2_INPUT__.startBasketball('half'));
  await set({ place: 'court', x: 59, z: -22, yaw: Math.PI, ballHeld: true, dialogue: '' }); await frames(2);
  await page.keyboard.press('KeyL'); await frames(8);
  let layupView = await freezeState();
  assert.equal(layupView.animation.action, 'layup-back');
  assert.equal(layupView.owner, 0);
  assert.equal(layupView.animation.gripVisible, true);
  await captureAction('artifacts/haunt/basketball-layup-takeoff.png');
  await frames(12);
  await page.waitForFunction(() => window.__SACK_V2_INPUT__.basketballState()?.owner === -1, null, { polling: 'raf', timeout: 60000 });
  layupView = await freezeState();
  assert.equal(layupView.animation.action, 'layup-back');
  assert.equal(layupView.owner, -1, 'Layup releases the live ball');
  assert.equal(layupView.animation.gripVisible, false, 'Release removes the grip layer');
  await captureAction('artifacts/haunt/basketball-layup-release.png');
  await page.evaluate(() => window.__SACK_V2_INPUT__.startBasketball('half')); await frames(3);
  await page.keyboard.press('KeyC'); await frames(2);
  let crossView = await page.evaluate(() => window.__SACK_V2_INPUT__.basketballState());
  assert.equal(crossView.animation.action, 'cross-back');
  assert.equal(crossView.players[0].dribbleHand, -1);
  await captureAction('artifacts/haunt/basketball-crossover-start.png');
  await frames(6);
  crossView = await page.evaluate(() => window.__SACK_V2_INPUT__.basketballState());
  assert.equal(crossView.animation.action, 'cross-back');
  await assertMatchHudClear();
  await captureAction('artifacts/haunt/basketball-crossover-receive.png');
  await frames(8);
  crossView = await page.evaluate(() => window.__SACK_V2_INPUT__.basketballState());
  assert.equal(crossView.players[0].dribbleHand, -1, 'Receiving hand stays active');
  await captureAction('artifacts/haunt/basketball-left-hand-dribble.png');
  await page.keyboard.press('KeyC'); await frames(16);
  assert.equal((await page.evaluate(() => window.__SACK_V2_INPUT__.basketballState())).players[0].dribbleHand, 1);
  console.log('PASS: rear shot/dunk and right-to-left-to-right crossover, persistent hand');
  // Reset possession for the existing mobile pass check.
  await page.evaluate(() => window.__SACK_V2_INPUT__.startBasketball('full')); await frames(3);
  const beforeLeft = await page.evaluate(() => window.__SACK_V2__.x);
  await page.keyboard.down('KeyA'); await frames(5); await page.keyboard.up('KeyA');
  assert.ok(await page.evaluate(x => window.__SACK_V2__.x < x - 0.05, beforeLeft), 'Match A must move screen-left');
  const beforeRight = await page.evaluate(() => window.__SACK_V2__.x);
  await page.keyboard.down('KeyD'); await frames(8); await page.keyboard.up('KeyD');
  assert.ok(await page.evaluate(x => window.__SACK_V2__.x > x + 0.05, beforeRight), 'Match D must move screen-right');
  await page.setViewportSize({ width: 390, height: 844 }); await frames(20);
  await page.screenshot({ path: 'artifacts/haunt/basketball-2v2-mobile.png', timeout: 60000 });
  await page.getByRole('button', { name: 'PASS', exact: true }).click(); await frames(3);
  // Live defenders can intercept before this snapshot, replacing the feedback.
  assert.equal((await page.evaluate(() => window.__SACK_V2_INPUT__.basketballState())).players[0].action, 'pass');
  await page.getByRole('button', { name: 'EXIT', exact: true }).click(); await frames(2);
  assert.equal(await page.evaluate(() => window.__SACK_V2_INPUT__.basketballState()), null);
  await page.setViewportSize({ width: 1280, height: 800 });
  console.log('PASS: supplementary dribble, gather, release poses and hidden duplicate court cast');
  console.log('PASS: live made shot, four-player half/full court, A/D controls, mobile pass and match exit');
  console.log('PASS: bowling held/release presentation and moving basketball dribble');
  console.log('PASS: modeled house, ticket, room doorway, furniture collision, light budget and exit');
  assert.deepEqual(errors, [], 'House gameplay must have no uncaught errors');
  assert.deepEqual(shaderErrors, [], 'Flagship logo materials must compile without shader errors');
  console.log('PASS: library chair collision and doorway route remain playable');
  console.log('PASS: exact flagship logo loaded and thirty-nine actual house, HQ, court and activity screenshots captured');
} finally { await browser.close(); }

