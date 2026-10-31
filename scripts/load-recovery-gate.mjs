// Loader completion gate (run alone against the production preview on :8080):
// fail → error → remove the injected failure → the RELOADED PAGE itself fetches the asset
// with 200 → Reload reaches ready → movement works → no stale error, one runtime, net one
// status listener. Exit 0 = pass, 1 = fail; anything else (timeout/dead server) = inconclusive.
import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8080";
let failed = 0;
const out = (ok, name, d = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${d ? "  — " + d : ""}`);
};
const waitState = (page, re, ms) =>
  page
    .waitForFunction(
      (src) => new RegExp(src).test(JSON.stringify(window.__SACK_LOAD_STATE__ || {})),
      re,
      { timeout: ms },
    )
    .then(() => true)
    .catch(() => false);
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await preparePage(page, { loadScreen: true });
await page.addInitScript(() => {
  window.__sackLoadListeners = { added: 0, removed: 0 };
  const add = window.addEventListener.bind(window);
  const remove = window.removeEventListener.bind(window);
  window.addEventListener = (type, fn, o) => {
    if (type === "sack-load") window.__sackLoadListeners.added++;
    return add(type, fn, o);
  };
  window.removeEventListener = (type, fn, o) => {
    if (type === "sack-load") window.__sackLoadListeners.removed++;
    return remove(type, fn, o);
  };
});
const LAWN = "**/game-v2/places/home/lawn.jpg*";
await page.route(LAWN, (r) => r.abort());
const t0 = Date.now();
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
const errored = await waitState(page, '"state":"error"', 100000);
const first = await page.evaluate(() => window.__SACK_LOAD_DIAG__?.());
out(
  errored && first?.failed?.some((f) => /lawn\.jpg/.test(f.url)),
  "1 injected failure → error naming the asset",
  `${((Date.now() - t0) / 1000).toFixed(1)} s · ${JSON.stringify(first?.failed)}`,
);
if (!errored) console.log("   DIAG", JSON.stringify(first).slice(0, 900));
await page.unrouteAll({ behavior: "ignoreErrors" });
const precheck = await page.evaluate(
  async () => (await fetch("/game-v2/places/home/lawn.jpg", { cache: "reload" })).status,
);
out(
  precheck === 200,
  "2 injection removed — separate fetch returns 200 (precheck)",
  `status ${precheck}`,
);
const lawnInReload = [];
const netBad = [];
page.on("response", (r) => {
  const u = new URL(r.url()).pathname;
  if (u.endsWith("/places/home/lawn.jpg")) lawnInReload.push(r.status());
  if (r.status() >= 400) netBad.push(`${r.status()} ${u}`);
});
page.on("requestfailed", (r) =>
  netBad.push(`FAILED ${r.url().slice(0, 100)} ${r.failure()?.errorText}`),
);
await page
  .locator('[data-testid="loading-screen"] button')
  .click({ timeout: 10000, noWaitAfter: true })
  .catch((e) => console.log("   reload click failed:", String(e).slice(0, 120)));
const t1 = Date.now();
const ready = await waitState(page, '"state":"ready"', 130000);
const d = await page.evaluate(() => ({
  diag: window.__SACK_LOAD_DIAG__?.(),
  listeners: window.__sackLoadListeners,
  hidden: document.querySelector('[data-testid="loading-screen"]')?.getAttribute("aria-hidden"),
}));
out(
  lawnInReload.includes(200),
  "3 the reloaded page itself fetched lawn.jpg with 200",
  `statuses ${JSON.stringify(lawnInReload)}`,
);
out(
  ready,
  "4 Reload reaches ready",
  `${((Date.now() - t1) / 1000).toFixed(1)} s · history ${JSON.stringify(d.diag?.history)}`,
);
if (!ready) {
  console.log(
    "   FAILED",
    JSON.stringify(d.diag?.failed),
    "| NETWORK",
    netBad.slice(0, 8).join(" | "),
  );
  console.log("   PENDING", JSON.stringify(d.diag?.pending).slice(0, 900));
} else {
  const pre = await page.evaluate(() => ({
    focus: document.hasFocus(),
    active: document.activeElement?.tagName,
    blocked: window.__SACK_LOAD_DIAG__().inputBlocked,
    frames: performance.now(),
  }));
  await page.mouse.click(640, 420); // give the game the same focus a player's first click does
  const before = await page.evaluate(() => window.__SACK_LOAD_DIAG__().player);
  // Hold W until the game has run at least 8 frames (software rendering can be ~0.5 fps).
  const fStart = await page.evaluate(() => window.__SACK_LOAD_DIAG__().frames);
  await page.keyboard.down("KeyW");
  await page
    .waitForFunction((f) => window.__SACK_LOAD_DIAG__().frames >= f + 8, fStart, { timeout: 90000 })
    .catch(() => {});
  await page.keyboard.up("KeyW");
  const fEnd = await page.evaluate(() => window.__SACK_LOAD_DIAG__().frames);
  console.log(
    "   INPUT",
    JSON.stringify(pre),
    "after click focus:",
    await page.evaluate(() => document.hasFocus()),
  );
  const after = await page.evaluate(() => window.__SACK_LOAD_DIAG__().player);
  const moved = before && after ? Math.hypot(after.x - before.x, after.z - before.z) : 0;
  // Software rendering runs ~0.5 fps here (each frame capped at a 0.033 s step), so the bar
  // is "the key moved Benji at all" (no input = exactly 0), not a distance per second.
  out(
    moved > 0.3,
    "5 movement works after recovery",
    `${moved.toFixed(1)} m over ${fEnd - fStart} frames of W`,
  );
  const net = d.listeners.added - d.listeners.removed;
  out(
    d.hidden === "true" &&
      d.diag?.failed?.length === 0 &&
      d.diag?.token === 1 &&
      d.diag?.activeToken === 1 &&
      net === 1,
    "6 no stale error · first runtime of this document · net one status listener",
    `screen hidden ${d.hidden} · failed ${d.diag?.failed?.length} · instance ${d.diag?.token}/${d.diag?.activeToken} · listeners +${d.listeners.added}/-${d.listeners.removed}`,
  );
}
await closeBrowser(browser);
process.exit(failed ? 1 : 0);
