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
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__SACK_V2_INPUT__?.hauntState(), null, { timeout: 90000 });
  await page.waitForFunction(() => {
    const brand = window.__SACK_V2_INPUT__?.brandState();
    return brand && brand.logos >= 8 && brand.loaded === brand.logos;
  }, null, { timeout: 90000 });
  const frames = count => page.evaluate(async n => {
    for (let i = 0; i < n; i++) await new Promise(r => requestAnimationFrame(r));
  }, count);
  const set = opts => page.evaluate(o => window.__SACK_V2_INPUT__.setShot(o), opts);
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
  }
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
  // Real interaction enters bowling: Benji remains visible and the ball starts
  // at hand height, then lowers into a rolling release with activity framing.
  const door = await page.evaluate(() => window.__SACK_V2_INPUT__.activityState().bowlDoor);
  await set({ place: 'street', x: door.x, z: door.z, yaw: Math.PI, dialogue: '' });
  await page.keyboard.press('KeyE'); await frames(12);
  const aiming = await page.evaluate(() => window.__SACK_V2_INPUT__.activityState());
  assert.equal(aiming.bowl?.phase, 'aim');
  assert.equal(aiming.avatarVisible, true, 'Bowling must show Benji');
  assert.ok(aiming.bowlBall.y > 0.6 && Math.abs(aiming.bowlBall.x - 92) < 0.5, 'Aiming ball must be held beside Benji');
  await page.screenshot({ path: 'artifacts/haunt/bowling-held.png', timeout: 60000 });
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
  const pier = await page.evaluate(() => window.__SACK_V2_INPUT__.activityState().pier);
  await set({ place: 'street', x: pier.x, z: pier.z, yaw: Math.PI, dialogue: '' });
  await page.keyboard.press('KeyE'); await frames(4);
  const fishing = await page.evaluate(() => window.__SACK_V2_INPUT__.activityState());
  assert.ok(fishing.fish && fishing.rodVisible && fishing.lineVisible, 'Fishing must show the held rod and a line to the bobber');
  await page.screenshot({ path: 'artifacts/haunt/fishing-held-rod.png', timeout: 60000 });
  console.log('PASS: bowling held/release presentation and moving basketball dribble');
  console.log('PASS: modeled house, ticket, room doorway, furniture collision, light budget and exit');
  assert.deepEqual(errors, [], 'House gameplay must have no uncaught errors');
  assert.deepEqual(shaderErrors, [], 'Flagship logo materials must compile without shader errors');
  console.log('PASS: library chair collision and doorway route remain playable');
  console.log('PASS: exact flagship logo loaded and fourteen actual house, HQ, court and activity screenshots captured');
} finally { await browser.close(); }


