import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'sack-v2') throw new DOMException('Test blocked storage', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__SACK_V2_INPUT__?.renderState(), null, { timeout: 90000 });
  const frames = n => page.evaluate(async count => {
    for (let i = 0; i < count; i++) await new Promise(resolve => requestAnimationFrame(resolve));
  }, n);
  const pos = () => page.evaluate(() => ({ x: window.__SACK_V2__.x, z: window.__SACK_V2__.z }));
  await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({ x: -24, z: 6.35, yaw: 0, place: 'street' }));
  await frames(4);
  const first = await page.evaluate(() => window.__SACK_V2_INPUT__.renderState());
  await frames(12);
  const stable = await page.evaluate(() => window.__SACK_V2_INPUT__.renderState());
  assert.equal(first.resizeCount, stable.resizeCount, 'Stable viewport must not resize render targets every frame');
  console.log('PASS: stable viewport does not reallocate render targets');

  await page.keyboard.down('KeyD');
  await frames(6);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.keyboard.up('KeyD');
  await frames(1);
  const stopped = await pos();
  await frames(8);
  assert.deepEqual(await pos(), stopped, 'Keyboard movement must stop after focus loss');
  const touchStart = await pos();
  await page.evaluate(() => window.__SACK_V2_INPUT__.setStick(1, 0));
  await frames(6);
  const touchMoved = await pos();
  assert.ok(Math.hypot(touchMoved.x - touchStart.x, touchMoved.z - touchStart.z) > 0.05, 'Touch must move before interruption');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await frames(1);
  const touchStopped = await pos();
  await frames(8);
  assert.deepEqual(await pos(), touchStopped, 'Touch movement must stop after focus loss');
  console.log('PASS: keyboard and touch stop immediately after focus loss');

  await page.evaluate(() => {
    window.__SACK_V2_INPUT__.setShot({ x: 66, z: -18.4, yaw: Math.PI, place: 'court', ballHeld: true });
    window.__SACK_V2_INPUT__.setCharge(true);
  });
  await frames(5);
  assert.ok((await page.evaluate(() => window.__SACK_V2_INPUT__.ballState())).charge > 0, 'Touch charge must begin');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await frames(3);
  const released = await page.evaluate(() => window.__SACK_V2_INPUT__.ballState());
  assert.equal(released.held, false, 'Interrupted touch shot must release');
  assert.equal(released.charge, 0);
  const taken = released.taken;
  await page.evaluate(() => {
    window.__SACK_V2_INPUT__.setShot({ x: 66, z: -18.4, place: 'court', ballHeld: true });
    window.__SACK_V2_INPUT__.setCharge(true);
  });
  await page.waitForFunction(previous => window.__SACK_V2_INPUT__.ballState().taken > previous, taken, { timeout: 90000 });
  const maximum = await page.evaluate(() => window.__SACK_V2_INPUT__.ballState());
  assert.equal(maximum.held, false, 'Maximum charge must automatically shoot while button is held');
  await page.evaluate(() => window.__SACK_V2_INPUT__.setCharge(false));
  console.log('PASS: interrupted and maximum-charge basketball shots release');

  await page.keyboard.down('KeyN');
  await page.keyboard.up('KeyN');
  await frames(5);
  const lighting = await page.getByText('GOLDEN', { exact: true }).count();
  assert.equal(lighting, 1, 'First light-cycle press must select golden hour');
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyN', key: 'n', repeat: true })));
  await frames(5);
  assert.equal(await page.getByText('GOLDEN', { exact: true }).count(), lighting, 'Key repeat must not toggle lighting again');
  console.log('PASS: held light-cycle key does not cycle repeatedly');

  await page.setViewportSize({ width: 390, height: 844 });
  await frames(5);
  const mobile = await page.evaluate(() => window.__SACK_V2_INPUT__.renderState());
  assert.equal(mobile.width, 390); assert.equal(mobile.height, 844);
  await frames(5);
  assert.equal((await page.evaluate(() => window.__SACK_V2_INPUT__.renderState())).resizeCount, mobile.resizeCount);
  // Exercise the actual HUD controls, including browser pointer cancellation.
  const shot = page.getByRole('button', { name: 'SHOT', exact: true });
  await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({ place: 'court', x: 66, z: -18.4, ballHeld: true }));
  const box = await shot.boundingBox();
  assert.ok(box);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await frames(5);
  await shot.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' });
  await page.mouse.up();
  await frames(3);
  assert.equal((await page.evaluate(() => window.__SACK_V2_INPUT__.ballState())).held, false, 'Cancelled HUD shot must release');
  console.log('PASS: mobile viewport and cancelled HUD shot work');
  await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({ place: 'court', x: 66, z: -18.4, yaw: Math.PI, ballHeld: true }));
  await page.waitForFunction(() => {
    const state = window.__SACK_V2_INPUT__.renderState();
    return state.fov > 60 && state.playerScreen.feetY - state.playerScreen.headY < state.height * 0.55;
  }, null, { timeout: 90000 });
  const framed = await page.evaluate(() => window.__SACK_V2_INPUT__.renderState());
  assert.ok(framed.playerScreen.headY > 0 && framed.playerScreen.feetY < framed.height - 140,
    'Portrait framing must show the full player above the touch controls');
  const prompt = await page.getByTestId('interaction-prompt').boundingBox();
  const score = await page.getByTestId('court-score').boundingBox();
  const shotBox = await shot.boundingBox();
  assert.ok(prompt && score && shotBox);
  assert.ok(prompt.y + prompt.height <= score.y, 'Prompt must not overlap court score');
  assert.ok(score.y + score.height < framed.playerScreen.headY, 'Court HUD must stay above the player');
  assert.ok(prompt.x >= 0 && prompt.x + prompt.width <= framed.width, 'Prompt must fit the viewport');
  assert.ok(score.y + score.height < shotBox.y, 'Court HUD must not overlap the shot control');
  console.log('PASS: portrait camera shows the whole player and court HUD clears the play area');
  assert.deepEqual(errors, [], 'Storage denial and gameplay must have no uncaught runtime errors');
  console.log('PASS: blocked storage does not interrupt gameplay');
  if (process.env.CAPTURE_QA === '1') {
    await mkdir('artifacts/runtime', { recursive: true });
    await page.screenshot({ path: 'artifacts/runtime/mobile-court.png', timeout: 60000 });
    await page.setViewportSize({ width: 390, height: 640 });
    await frames(30);
    const compact = await page.evaluate(() => window.__SACK_V2_INPUT__.renderState());
    assert.ok(compact.playerScreen.feetY - compact.playerScreen.headY < compact.height * 0.55,
      'Compact portrait devices must retain space around the player');
    const compactScore = await page.getByTestId('court-score').boundingBox();
    assert.ok(compactScore.y + compactScore.height < compact.playerScreen.headY, 'Compact court HUD must clear the player');
    await page.screenshot({ path: 'artifacts/runtime/mobile-court-compact.png', timeout: 60000 });
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const [name, opts] of [
      ['neighborhood-vehicles', { place: 'street', x: -30, z: 5.8, yaw: Math.PI / 2, night: false }],
      ['hq-interior', { place: 'hq', x: 80, z: 202.7, yaw: Math.PI, night: false }],
    ]) {
      await page.evaluate(options => window.__SACK_V2_INPUT__.setShot(options), opts);
      await frames(5);
      await page.screenshot({ path: `artifacts/runtime/${name}.png`, timeout: 60000 });
    }
  }
} finally { await browser.close(); }
