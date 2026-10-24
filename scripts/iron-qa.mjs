// Free-shoot iron check: short charge must miss (and may clang), repeated flights never freeze, no page errors.
import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
await preparePage(page);
await page.goto(process.env.GAME_URL || "http://127.0.0.1:8080/?qa=1", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForFunction(() => window.__SACK_V2_INPUT__?.simulate, { timeout: 120000 });
const enter = page.getByRole("button", { name: /enter memphis/i }); if (await enter.count()) await enter.first().click().catch(() => {});
const sim = (s) => page.evaluate((v) => window.__SACK_V2_INPUT__.simulate(v), s);
const api = () => page.evaluate(() => { const b = window.__SACK_V2_INPUT__.ballState(); return { made: b.made, taken: b.taken, place: window.__SACK_V2__.place }; });
await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({ x: 61.9, z: -22, yaw: -Math.PI / 2, dollars: 100, ballHeld: true }));
await sim(0.3);
const results = [];
for (const charge of [0.3, 0.7, 0.7, 0.95, 0.7, 0.5, 0.7]) {
  await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({ x: 61.9, z: -22, yaw: -Math.PI / 2, ballHeld: true }));
  await sim(0.2);
  const before = await api();
  await page.evaluate(() => window.__SACK_V2_INPUT__.setCharge(true));
  await sim(charge * 0.85); // charge rate is 1/0.85 per second
  await page.evaluate(() => window.__SACK_V2_INPUT__.setCharge(false));
  await sim(3.5);
  const after = await api();
  results.push({ charge, taken: after.taken - before.taken, made: after.made - before.made });
}
console.log(JSON.stringify(results));
const shots = results.filter((r) => r.taken === 1).length;
const perfectMakes = results.filter((r) => r.charge === 0.7 && r.made === 1).length;
const badMakes = results.filter((r) => r.charge !== 0.7 && r.made === 1).length;
console.log(`shots fired ${shots}/7 · perfect-timing makes ${perfectMakes}/4 · mistimed makes ${badMakes}/3 · errors ${errors.length}`);
await page.screenshot({ path: "artifacts/activities/iron-free-shoot.png" });
await closeBrowser(browser);
process.exit(shots === 7 && perfectMakes >= 3 && badMakes === 0 && errors.length === 0 ? 0 : 1);
