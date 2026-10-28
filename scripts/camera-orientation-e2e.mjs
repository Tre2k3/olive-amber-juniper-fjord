// Regression test: the follow camera must never flip (head drawn below feet) —
// after a cross-map move, on the first steps, or while walking.
import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.addInitScript(() => {
  window.__pad = {
    connected: true,
    id: "Test Controller",
    mapping: "standard",
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
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
const frames = [];
const look = async () => {
  const p = await I(() => window.__SACK_V2_INPUT__.renderState().playerScreen);
  frames.push(p.headY < p.feetY ? "up" : "FLIPPED");
};
// Natural play: no QA teleports — the game's own spawn, the camera settles, then walk.
await sim(1.5);
for (const [axes, tag] of [
  [[0, -0.55], "forward"],
  [[0, 0.7], "toward camera"],
  [[0.8, 0], "sideways"],
]) {
  await sim(0.6);
  await look();
  await I((a) => {
    window.__pad.axes = [a[0], a[1], 0, 0];
  }, axes);
  for (let i = 0; i < 5; i++) {
    await sim(0.11);
    await look();
  }
  await I(() => {
    window.__pad.axes = [0, 0, 0, 0];
  });
  await sim(0.1);
}
const bad = frames.filter((f) => f !== "up").length;
console.log("frames:", frames.join(" "));
console.log(
  `${bad === 0 ? "PASS" : "FAIL"}  camera stays upright in natural play (walking forward, toward camera, sideways) — ${frames.length - bad}/${frames.length} frames upright`,
);
console.log(`${errors.length === 0 ? "PASS" : "FAIL"}  no page errors`);
await closeBrowser(browser);
