import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await preparePage(page);
await page.goto("http://127.0.0.1:8080/?qa=1", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => window.__SACK_V2_INPUT__?.simulate, { timeout: 150000 });
await page
  .waitForFunction(() => (window.__SACK_LOAD_DIAG__?.().frames ?? 0) > 2, null, { timeout: 150000 })
  .catch(() => {});
const I = (fn, a) => page.evaluate(fn, a);
for (const [o, name] of [
  [
    {
      place: "court",
      x: 66,
      z: -17.5,
      yaw: Math.PI,
      dist: 7,
      height: 2.6,
      lookY: 1.8,
      golden: false,
      night: false,
      dialogue: "",
    },
    "court-north",
  ],
  [
    {
      place: "court",
      x: 70,
      z: -25,
      yaw: 0,
      dist: 6,
      height: 2.4,
      lookY: 2.6,
      golden: false,
      night: false,
      dialogue: "",
    },
    "court-scoreboard",
  ],
]) {
  await I((v) => window.__SACK_V2_INPUT__.setShot(v), o);
  await I(() => window.__SACK_V2_INPUT__.simulate(1.2));
  await page.waitForTimeout(4000);
  await I(() => window.__SACK_V2_INPUT__.simulate(0.2));
  for (let i = 0; i < 2; i++)
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
  await page.screenshot({ path: `artifacts/after/${name}.png` });
}
console.log("errors", errors.length, errors.slice(0, 1));
await closeBrowser(browser);
