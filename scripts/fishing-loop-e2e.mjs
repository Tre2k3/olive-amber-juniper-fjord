// Plays fishing like a person: E arms/releases the cast, hook the bite after a 0.25 s
// reaction, fight by holding Space below ~0.5 tension and easing off above ~0.66 (with a
// one-step reaction lag), five casts in a row. Reports each outcome.
import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8080";
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await preparePage(page);
await page.goto(`${BASE}/?qa=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => window.__SACK_V2_INPUT__?.simulate, { timeout: 150000 });
await page
  .waitForFunction(() => (window.__SACK_LOAD_DIAG__?.().frames ?? 0) > 2, null, { timeout: 150000 })
  .catch(() => {});
const I = (fn, a) => page.evaluate(fn, a);
const sim = (s) => I((v) => window.__SACK_V2_INPUT__.simulate(v), s);
const fish = () => I(() => window.__SACK_V2_INPUT__.activityState().fish);
const pier = await I(() => window.__SACK_V2_INPUT__.activityState().pier);
await I(
  (p) =>
    window.__SACK_V2_INPUT__.setShot({
      place: "street",
      x: p.x,
      z: p.z,
      yaw: Math.PI,
      dialogue: "",
    }),
  pier,
);
await sim(0.5);
const results = [];
for (let cast = 1; cast <= 5; cast++) {
  await page.keyboard.press("KeyE");
  await sim(0.6);
  await page.keyboard.press("KeyE");
  let f = null;
  for (let t = 0; t < 120 && !(f = await fish())?.phase?.match(/wait|bite/); t++) await sim(0.25);
  if (!f) {
    results.push(`cast ${cast}: never entered the water`);
    continue;
  }
  let waited = 0;
  for (; waited < 240 && (f = await fish())?.phase === "wait"; waited++) await sim(0.25);
  if (f?.phase !== "bite") {
    results.push(`cast ${cast}: no bite in ${waited * 0.25}s (phase ${f?.phase})`);
    await page.keyboard.press("KeyE");
    await sim(0.5);
    continue;
  }
  await sim(0.25);
  await page.keyboard.press("KeyE");
  await sim(0.1);
  let holding = false,
    maxT = 0,
    t = 0,
    keys = "";
  if (cast === 1) keys = Object.keys((await fish()) || {}).join(",");
  for (; t < 900; t++) {
    f = await fish();
    if (!f || !/fight|bite/.test(f.phase)) break;
    const ten = f.tension ?? 0;
    maxT = Math.max(maxT, ten);
    const want = holding ? ten < 0.66 : ten < 0.5;
    if (want !== holding) {
      holding = want;
      if (holding) await page.keyboard.down("Space");
      else await page.keyboard.up("Space");
    }
    await sim(0.1);
  }
  if (holding) await page.keyboard.up("Space");
  const end = await I(() => window.__SACK_V2_INPUT__.activityState());
  results.push(
    `cast ${cast}: ${end.fish?.phase ?? "idle/landed"} after ${(t * 0.1).toFixed(1)}s fight · max tension ${maxT.toFixed(2)} · cooler ${end.cooler ?? end.fish?.cooler ?? "?"}${keys ? " · fish keys: " + keys : ""}`,
  );
  await sim(2.5);
}
console.log(results.join("\n"));
console.log("errors", errors.length, errors.slice(0, 1));
await closeBrowser(browser);
