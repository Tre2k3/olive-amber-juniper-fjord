// Startup phase timings + long main-thread tasks on the real player path (production preview).
import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8080";
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await preparePage(page, { loadScreen: true });
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
const ok = await page.waitForFunction(() => window.__SACK_LOAD_DIAG__?.().state === "ready", null, { timeout: 150000 }).then(() => true).catch(() => false);
const d = await page.evaluate(() => window.__SACK_LOAD_DIAG__?.());
const m = d?.startup || {};
const span = (k) => (m[`${k}:end`] ?? NaN) - (m[`${k}:start`] ?? NaN);
console.log(`STATE ${d?.state} (ready=${ok}) · history ${JSON.stringify(d?.history)}`);
console.log(`PHASES buildWorld ${span("buildWorld")} ms · staticBatch ${span("staticBatch")} ms · shaderCompile (async) ${span("shaderCompile")} ms · firstFrame at ${m.firstFrame} ms`);
console.log(`LONG TASKS (ms, last 12) ${JSON.stringify(d?.longTasksMs)}`);
await closeBrowser(browser);
process.exit(ok ? 0 : 1);
