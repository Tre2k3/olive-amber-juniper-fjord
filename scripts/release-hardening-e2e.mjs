// Release regression checks against the production preview (:8080). CI runs these.
// Loading: loading → ready | error; any startup download failure shows the error at once,
// blocks gameplay input, and a reload recovers. On failure, prints window.__SACK_LOAD_DIAG__.
import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8080";
let failed = 0;
const out = (ok, name, d = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${d ? "  — " + d : ""}`);
};
const bad = await fetch(`${BASE}/%E0%A4%A`);
out(
  bad.status === 400 && !/at |Error/.test(await bad.text()),
  "malformed URL → 400 without a stack trace",
  `status ${bad.status}`,
);
const m = await (await fetch(`${BASE}/release.json`)).json().catch(() => null);
out(
  !!m &&
    /^[0-9a-f]{40}$|^unknown$/.test(m.commit || "") &&
    /^\d+\.\d+\.\d+/.test(m.version || "") &&
    !!m.builtAt,
  "release.json has commit, version and build time",
  m ? `${m.version} ${String(m.commit).slice(0, 7)}` : "missing",
);
out(
  !/fonts\.googleapis|fonts\.gstatic|grok\.com/.test(await (await fetch(`${BASE}/`)).text()),
  "served page has no external font or Grok references",
);
const browser = await launchBrowser(true);
const snapshot = (page) =>
  page.evaluate(() => ({
    diag: window.__SACK_LOAD_DIAG__?.(),
    screen: document.querySelector('[data-testid="loading-screen"]')?.textContent?.slice(0, 120),
  }));
const waitState = (page, re, ms) =>
  page
    .waitForFunction(
      (src) => new RegExp(src).test(JSON.stringify(window.__SACK_LOAD_STATE__ || {})),
      re,
      { timeout: ms },
    )
    .then(() => true)
    .catch(() => false);
async function scenario(name, setup, url, expect, extra) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await preparePage(page, { loadScreen: true });
  if (setup) await setup(page);
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  const ok = await waitState(page, expect.state, expect.ms);
  const text = await page.evaluate(
    () => document.querySelector('[data-testid="loading-error"]')?.textContent || "",
  );
  const pass = ok && (!expect.text || expect.text.test(text));
  out(pass, name, `${((Date.now() - t0) / 1000).toFixed(1)} s${text ? " · " + text : ""}`);
  if (!pass) console.log("   DIAG", JSON.stringify(await snapshot(page)).slice(0, 1200));
  if (pass && extra) await extra(page);
  await page.close();
}
// failed texture → error immediately; screen blocks input
await scenario(
  "failed texture → error + Reload immediately",
  (p) => p.route("**/game-v2/places/home/lawn.jpg*", (r) => r.abort()),
  `${BASE}/`,
  { state: '"state":"error"', ms: 90000, text: /Couldn't load lawn\.jpg/ },
  async (page) => {
    const hit = await page.evaluate(() => {
      const el = document.elementFromPoint(640, 400);
      return !!el?.closest('[data-testid="loading-screen"]');
    });
    const before = await page.evaluate(() => window.__SACK_LOAD_DIAG__().player);
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(1500);
    await page.keyboard.up("KeyW");
    const after = await page.evaluate(() => window.__SACK_LOAD_DIAG__().player);
    out(
      hit && JSON.stringify(before) === JSON.stringify(after),
      "error screen covers the game and blocks gameplay input",
      `screen on top ${hit} · player ${JSON.stringify(before)} → ${JSON.stringify(after)}`,
    );
  },
);
await scenario(
  "failed model → error",
  (p) => p.route("**/props/hanging-fern.glb*", (r) => r.abort()),
  `${BASE}/`,
  { state: '"state":"error"', ms: 90000, text: /Couldn't load hanging-fern\.glb/ },
);
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await preparePage(page, { loadScreen: true });
  await page.route("**/assets/runtime-*.js", (r) => r.abort());
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120000 });
  const ok = await page
    .waitForFunction(
      () =>
        /game code failed/.test(
          document.querySelector('[data-testid="loading-error"]')?.textContent || "",
        ),
      { timeout: 60000 },
    )
    .then(() => true)
    .catch(() => false);
  out(ok, "failed code import → explicit error + Reload");
  await page.close();
}
await scenario(
  "stalled request → error after the limit (never success)",
  (p) => p.route("**/game-v2/places/home/lawn.jpg*", () => {}),
  `${BASE}/?loadTimeout=6000`,
  { state: '"state":"error"', ms: 90000, text: /Still waiting on \d+ file/ },
);
// The recovery and remount gates run as their own scripts: load-recovery-gate.mjs, load-remount-gate.mjs.
await closeBrowser(browser);
if (failed) process.exit(1);
