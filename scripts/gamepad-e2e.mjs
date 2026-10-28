import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const out = (ok, name, d = "") =>
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${d ? "  — " + d : ""}`);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
// A stand-in controller in the "standard" layout, driven from the test.
await page.addInitScript(() => {
  const btn = () => ({ pressed: false, value: 0 });
  window.__pad = {
    connected: true,
    id: "Test Controller (STANDARD GAMEPAD)",
    mapping: "standard",
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, btn),
  };
  navigator.getGamepads = () => [window.__pad, null, null, null];
});
await preparePage(page);
await page.goto("http://127.0.0.1:8080/?qa=1", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForFunction(() => window.__SACK_V2_INPUT__?.simulate, { timeout: 150000 });
const enter = page.getByRole("button", { name: /enter memphis/i });
if (await enter.count())
  await enter
    .first()
    .click()
    .catch(() => {});
const I = (fn, a) => page.evaluate(fn, a);
const sim = (s) => I((v) => window.__SACK_V2_INPUT__.simulate(v), s);
const tap = async (i) => {
  await I((n) => {
    window.__pad.buttons[n] = { pressed: true, value: 1 };
  }, i);
  await sim(0.1);
  await I((n) => {
    window.__pad.buttons[n] = { pressed: false, value: 0 };
  }, i);
  await sim(0.1);
};
await I(() =>
  window.__SACK_V2_INPUT__.setShot({ place: "street", x: -26, z: 4.6, yaw: 0, dialogue: "" }),
);
await sim(0.3);
const hint = await I(() => document.body.innerText.includes("Left stick move"));
out(hint, "HUD switches to controller hints when a pad is connected");
const before = await I(() => ({ x: window.__SACK_V2__.x, z: window.__SACK_V2__.z }));
await I(() => {
  window.__pad.axes = [0, -1, 0, 0];
});
await sim(1.0);
await I(() => {
  window.__pad.axes = [0, 0, 0, 0];
});
await sim(0.2);
const after = await I(() => ({ x: window.__SACK_V2__.x, z: window.__SACK_V2__.z }));
const moved = Math.hypot(after.x - before.x, after.z - before.z);
out(moved > 5, "left stick full forward runs Benji forward", `${moved.toFixed(1)} m in 1 s`);
await I(() =>
  window.__SACK_V2_INPUT__.setShot({ place: "hq", x: 75.1, z: 204.15, yaw: Math.PI, dialogue: "" }),
);
await sim(0.3);
await tap(0);
await page.waitForTimeout(400);
out(
  (await page.locator('[data-testid="shop-panel"]').count()) === 1,
  "A at the HQ counter opens the shop",
);
await tap(1);
await page.waitForTimeout(400);
out((await page.locator('[data-testid="shop-panel"]').count()) === 0, "B closes the shop");
await tap(1);
await page.waitForTimeout(300);
out(
  (await page.locator('[data-testid="pause-menu"]').count()) === 0,
  "B with nothing open does not pause",
);
await tap(9);
await page.waitForTimeout(400);
const paused = await page.locator('[data-testid="pause-menu"]').count();
await tap(9);
await page.waitForTimeout(400);
const resumed = await page.locator('[data-testid="pause-menu"]').count();
out(
  paused === 1 && resumed === 0,
  "Start opens and closes the pause menu",
  `open ${paused}, after ${resumed}`,
);
out(errors.length === 0, "no page errors", errors.slice(0, 1).join(" | "));
await closeBrowser(browser);
