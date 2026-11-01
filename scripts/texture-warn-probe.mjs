import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await preparePage(page);
await page.addInitScript(() => {
  window.__texWarn = [];
  const orig = console.warn;
  console.warn = function (...args) {
    const msg = args.map(String).join(" ");
    if (/no image data/i.test(msg))
      window.__texWarn.push(
        new Error().stack
          .split("\n")
          .slice(2, 9)
          .map((l) => l.trim().replace(/https?:\/\/[^/]+\//, ""))
          .join(" ← "),
      );
    return orig.apply(this, args);
  };
});
await page.goto("http://127.0.0.1:8080/?qa=1", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForFunction(() => window.__SACK_V2_INPUT__?.simulate, { timeout: 150000 });
await page
  .waitForFunction(() => (window.__SACK_LOAD_DIAG__?.().frames ?? 0) > 2, null, { timeout: 150000 })
  .catch(() => {});
await page.waitForTimeout(2000);
const I = (fn, a) => page.evaluate(fn, a);
await I(() =>
  window.__SACK_V2_INPUT__.setShot({ place: "haunt", x: 0, z: 0, yaw: 0, dialogue: "" }),
).catch(() => {});
await I(() => window.__SACK_V2_INPUT__.simulate(3));
await I(() =>
  window.__SACK_V2_INPUT__.setShot({
    place: "court",
    x: 64,
    z: -26,
    yaw: Math.PI,
    ballHeld: true,
    dialogue: "",
  }),
);
await I(() => window.__SACK_V2_INPUT__.startBasketball("half")).catch(() => {});
await I(() => window.__SACK_V2_INPUT__.simulate(4));
await page.waitForTimeout(3000);
const w = await page.evaluate(() => window.__texWarn);
console.log("WARNINGS", w.length);
console.log(
  "OFFENDERS",
  JSON.stringify(await page.evaluate(() => window.__SACK_V2_INPUT__.texturesWithoutImage())).slice(
    0,
    900,
  ),
);
for (const s of [...new Set(w)].slice(0, 4)) console.log("  STACK", s.slice(0, 600));
await closeBrowser(browser);
