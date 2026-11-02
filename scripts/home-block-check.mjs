// Same steps as foundation-smoke / connected-slice-smoke, on the shared-lib browser:
// load the game normally, wait for the API, then readHomeBlock (direct W walks north).
import { closeBrowser, launchBrowser } from "./smoke-lib.mjs";
import { readHomeBlock } from "./v2-live-check.mjs";
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(process.env.GAME_URL || "http://127.0.0.1:8080/", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForFunction(() => window.__SACK_V2__ && window.__SACK_V2_INPUT__, null, {
  timeout: 90000,
});
const block = await readHomeBlock(page);
const dz = block.walked.z - block.start.z,
  dx = block.walked.x - block.start.x;
const ok = dz > 0.2 && Math.abs(dx) < 0.6;
console.log(
  `${ok ? "PASS" : "FAIL"}  direct W moves north and stays in lane  — dx ${dx.toFixed(2)} dz ${dz.toFixed(2)}`,
);
await closeBrowser(browser);
process.exit(ok ? 0 : 1);
