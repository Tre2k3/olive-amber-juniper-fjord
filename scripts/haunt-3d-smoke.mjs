import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => requests.push(r.url()));
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__SACK_V2_INPUT__?.hauntState(), null, { timeout: 90000 });
  const frames = count => page.evaluate(async n => {
    for (let i = 0; i < n; i++) await new Promise(r => requestAnimationFrame(r));
  }, count);
  const set = opts => page.evaluate(o => window.__SACK_V2_INPUT__.setShot(o), opts);
  const state = await page.evaluate(() => window.__SACK_V2_INPUT__.hauntState());
  assert.ok(state.houseMeshes > 100 && state.foyerMeshes > 60, 'House and foyer must contain modeled architecture');
  assert.ok(!requests.some(url => /\/haunt\/(facade\.png|foyer\.jpg|stair\.jpg)/.test(url)), 'House must not load exterior or room pictures as architecture');
  await set({ place: 'street', x: -88.6, z: 4.35, dollars: 240, yaw: 0 });
  await page.keyboard.press('KeyE'); await frames(3);
  assert.equal((await page.evaluate(() => window.__SACK_V2_INPUT__.hauntState())).ticket, true);
  assert.equal(await page.evaluate(() => window.__SACK_V2__.dollars), 230, 'Ticket still costs $10');
  await set({ place: 'street', x: -78, z: 8.3, yaw: 0 });
  await page.keyboard.press('KeyE'); await frames(3);
  assert.equal(await page.evaluate(() => window.__SACK_V2__.place), 'haunt', 'Gate enters the actual interior');
  assert.ok((await page.evaluate(() => window.__SACK_V2_INPUT__.hauntState())).activeLights <= 4);
  await set({ place: 'haunt', x: 7.1, z: 503.9, yaw: 0, dialogue: '' });
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__SACK_V2__.x > 8.3, null, { timeout: 90000 });
  await page.keyboard.up('KeyD'); await frames(2);
  assert.ok(await page.evaluate(() => window.__SACK_V2__.x > 8.3), 'Player must walk through the doorway into the stair hall');
  await set({ place: 'haunt', x: 6.2, z: 502, yaw: 0 });
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__SACK_V2__.x >= 6.4, null, { timeout: 90000 });
  await frames(8); await page.keyboard.up('KeyD'); await frames(2);
  assert.ok(await page.evaluate(() => window.__SACK_V2__.x < 6.5), 'Console table must block the player');
  await set({ place: 'haunt', x: 4, z: 501.2, yaw: Math.PI });
  await page.keyboard.press('KeyE'); await frames(3);
  assert.equal(await page.evaluate(() => window.__SACK_V2__.place), 'street', 'House exit returns to the neighborhood');
  console.log('PASS: modeled house, ticket, room doorway, furniture collision, light budget and exit');
  await mkdir('artifacts/haunt', { recursive: true });
  for (const [name, shot] of [
    ['house-front-day', { place: 'street', x: -78, z: 1, yaw: 0, dist: 14, height: 6, lookY: 6, night: false }],
    ['house-front-night', { place: 'street', x: -78, z: 1, yaw: 0, dist: 14, height: 6, lookY: 6, night: true }],
    ['house-side', { place: 'street', x: -85, z: 4, yaw: 0.65, dist: 10, height: 5, lookY: 5, golden: true }],
    ['foyer', { place: 'haunt', x: 4.4, z: 504.6, yaw: Math.PI, dist: 2.6, height: 1.8, lookY: 2.05, night: false, dialogue: '' }],
    ['library', { place: 'haunt', x: 28, z: 503.8, yaw: Math.PI / 2, dist: 2.5, height: 1.65, lookY: 1.6, night: false, dialogue: '' }],
  ]) {
    await set(shot); await frames(8);
    await page.screenshot({ path: `artifacts/haunt/${name}.png`, timeout: 60000 });
  }
  assert.deepEqual(errors, [], 'House gameplay must have no uncaught errors');
  console.log('PASS: five actual rendered house and room screenshots captured');
} finally { await browser.close(); }
