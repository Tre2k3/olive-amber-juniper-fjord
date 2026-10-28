// Every pedestrian on the map is a different person, and 901 Catch Kitchen has its cook.
import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const out = (ok, name, d = "") =>
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${d ? "  — " + d : ""}`);
await preparePage(page);
await page.goto("http://127.0.0.1:8080/?qa=1", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForFunction(() => window.__SACK_V2_INPUT__?.simulate, { timeout: 150000 });
const enter = page.getByRole("button", { name: /enter memphis/i });
if (await enter.count())
  await enter
    .first()
    .click()
    .catch(() => {});
const sim = (s) => page.evaluate((v) => window.__SACK_V2_INPUT__.simulate(v), s);
await sim(0.5);
const ids = await page.evaluate(() =>
  window.__SACK_V2_INPUT__
    .peds()
    .map((p) => p.id)
    .filter((id) => id.startsWith("ped-")),
);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
out(
  dupes.length === 0,
  "no duplicate people walking around",
  `${ids.length} pedestrians, ${new Set(ids).size} different people${dupes.length ? " | repeated: " + [...new Set(dupes)].join(",") : ""}`,
);
out(ids.length >= 18, "the streets are still populated", `${ids.length}`);
await page.evaluate(() =>
  window.__SACK_V2_INPUT__.setShot({
    place: "street",
    x: 78,
    z: 17.6,
    yaw: 0,
    dist: 3.4,
    height: 1.9,
    lookY: 1.9,
    golden: true,
    dialogue: "",
  }),
);
await sim(1.0);
for (let i = 0; i < 2; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
await page.screenshot({ path: "artifacts/after/catch-cook.png" });
out(errors.length === 0, "no page errors", errors.slice(0, 1).join(" | "));
await closeBrowser(browser);
