// A 2v2 always has its six courtside fans (CI contract) — and nobody is duplicated.
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
await page.evaluate(() =>
  window.__SACK_V2_INPUT__.setShot({
    place: "court",
    x: 64,
    z: -26,
    yaw: Math.PI,
    ballHeld: true,
    dialogue: "",
  }),
);
await page.evaluate(() => window.__SACK_V2_INPUT__.startBasketball("half"));
await page.evaluate(() => window.__SACK_V2_INPUT__.simulate(0.5));
const s = await page.evaluate(() => window.__SACK_V2_INPUT__.basketballState());
out(s.spectators === 6, "a match has its six courtside fans", `spectators ${s.spectators}`);
out(s.jerseys === 4, "four players in jerseys", `jerseys ${s.jerseys}`);
const ids = await page.evaluate(() =>
  window.__SACK_V2_INPUT__
    .peds()
    .map((p) => p.id)
    .filter((id) => id.startsWith("ped-")),
);
out(
  new Set(ids).size === ids.length,
  "still nobody duplicated on the streets",
  `${ids.length} pedestrians`,
);
out(errors.length === 0, "no page errors", errors.slice(0, 1).join(" | "));
await closeBrowser(browser);
