// In-page React remount: the game's effects are torn down and re-created in the SAME
// document (no reload). Proves cleanup: one live runtime (created/disposed counters),
// no duplicate global listeners (net counts per type unchanged), no stale error, and
// the fresh instance reaches ready and accepts input. Exit 0 pass / 1 fail / else inconclusive.
import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8080";
let failed = 0;
const out = (ok, name, d = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${d ? "  — " + d : ""}`);
};
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await preparePage(page, { loadScreen: true });
await page.addInitScript(() => {
  const net = (window.__sackNetListeners = {});
  for (const target of [window, document]) {
    const add = target.addEventListener.bind(target);
    const remove = target.removeEventListener.bind(target);
    const name = target === window ? "window" : "document";
    target.addEventListener = (type, fn, o) => {
      const k = `${name}:${type}`;
      net[k] = (net[k] || 0) + 1;
      return add(type, fn, o);
    };
    target.removeEventListener = (type, fn, o) => {
      const k = `${name}:${type}`;
      net[k] = (net[k] || 0) - 1;
      return remove(type, fn, o);
    };
  }
});
const snap = () =>
  page.evaluate(() => ({
    life: { ...window.__SACK_RUNTIME_LIFECYCLE__ },
    net: { ...window.__sackNetListeners },
    diag: window.__SACK_LOAD_DIAG__?.(),
    hidden: document.querySelector('[data-testid="loading-screen"]')?.getAttribute("aria-hidden"),
  }));
const waitReady = (token, ms) =>
  page
    .waitForFunction(
      (t) => {
        const d = window.__SACK_LOAD_DIAG__?.();
        return d && d.token === t && d.activeToken === t && d.state === "ready";
      },
      token,
      { timeout: ms },
    )
    .then(() => true)
    .catch(() => false);
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
const first = await waitReady(1, 120000);
const a = await snap();
out(first, "1 first instance reaches ready", `life ${JSON.stringify(a.life)}`);
if (!first) console.log("   DIAG", JSON.stringify(a.diag).slice(0, 700));
await page.evaluate(() => window.__SACK_REMOUNT__());
const t0 = Date.now();
const second = await waitReady(2, 120000);
const b = await snap();
out(
  second,
  "2 remounted instance reaches ready (same document)",
  `${((Date.now() - t0) / 1000).toFixed(1)} s · history ${JSON.stringify(b.diag?.history)}`,
);
if (!second) console.log("   DIAG", JSON.stringify(b.diag).slice(0, 900));
out(
  b.life.created === 2 && b.life.disposed === 1,
  "3 lifecycle: 2 created, 1 disposed (one live runtime)",
  JSON.stringify(b.life),
);
const changed = Object.keys({ ...a.net, ...b.net })
  .filter((k) => (a.net[k] || 0) !== (b.net[k] || 0))
  .map((k) => `${k} ${a.net[k] || 0}→${b.net[k] || 0}`);
out(
  changed.length === 0 && b.net["window:sack-load"] === 1,
  "4 no duplicate global listeners after remount",
  changed.length
    ? changed.join(", ")
    : `${Object.keys(b.net).length} listener types unchanged · sack-load ${b.net["window:sack-load"]}`,
);
out(
  b.hidden === "true" && (b.diag?.failed?.length ?? 1) === 0 && b.diag?.inputBlocked === false,
  "5 no stale error after remount",
  `screen hidden ${b.hidden} · failed ${b.diag?.failed?.length} · inputBlocked ${b.diag?.inputBlocked}`,
);
if (second) {
  await page.mouse.click(640, 420);
  const before = await page.evaluate(() => window.__SACK_LOAD_DIAG__().player);
  // Hold W until the game has run at least 8 frames (software rendering here can be
  // ~0.5 fps), so the check measures input, not this machine's frame rate.
  const fStart = await page.evaluate(() => window.__SACK_LOAD_DIAG__().frames);
  await page.keyboard.down("KeyW");
  await page
    .waitForFunction((f) => window.__SACK_LOAD_DIAG__().frames >= f + 8, fStart, { timeout: 90000 })
    .catch(() => {});
  await page.keyboard.up("KeyW");
  const fEnd = await page.evaluate(() => window.__SACK_LOAD_DIAG__().frames);
  console.log(`   FRAMES during W: ${fEnd - fStart}`);
  const after = await page.evaluate(() => window.__SACK_LOAD_DIAG__().player);
  const moved = before && after ? Math.hypot(after.x - before.x, after.z - before.z) : 0;
  out(
    moved > 0.3,
    "6 the remounted game accepts input",
    `${moved.toFixed(1)} m over ${fEnd - fStart} frames of W`,
  );
}
await closeBrowser(browser);
process.exit(failed ? 1 : 0);
