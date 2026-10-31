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
// Completion gate: fail → error → remove the injected failure (asset now 200) → Reload →
// ready → movement works → no stale error, one runtime instance, one status listener.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await preparePage(page, { loadScreen: true });
  await page.addInitScript(() => {
    window.__sackLoadListeners = 0;
    const add = window.addEventListener.bind(window);
    const remove = window.removeEventListener.bind(window);
    window.addEventListener = (type, fn, o) => {
      if (type === "sack-load") window.__sackLoadListeners++;
      return add(type, fn, o);
    };
    window.removeEventListener = (type, fn, o) => {
      if (type === "sack-load") window.__sackLoadListeners--;
      return remove(type, fn, o);
    };
  });
  const LAWN = "**/game-v2/places/home/lawn.jpg*";
  await page.route(LAWN, (r) => r.abort());
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120000 });
  const errored = await waitState(page, '"state":"error"', 120000);
  const firstDiag = await page.evaluate(() => window.__SACK_LOAD_DIAG__?.());
  out(
    errored && firstDiag?.failed?.some((f) => /lawn\.jpg/.test(f.url)),
    "gate 1: injected failure → error naming the asset",
    JSON.stringify(firstDiag?.failed),
  );
  await page.unrouteAll({ behavior: "ignoreErrors" });
  const status = await page.evaluate(
    async () => (await fetch("/game-v2/places/home/lawn.jpg", { cache: "reload" })).status,
  );
  out(status === 200, "gate 2: injection removed — the asset now returns 200", `status ${status}`);
  const netBad = [];
  page.on("response", (r) => {
    if (r.status() >= 400) netBad.push(`${r.status()} ${new URL(r.url()).pathname}`);
  });
  page.on("requestfailed", (r) =>
    netBad.push(`FAILED ${r.url().slice(0, 100)} ${r.failure()?.errorText}`),
  );
  await page.locator('[data-testid="loading-screen"] button').click();
  const t0 = Date.now();
  const ready = await waitState(page, '"state":"ready"', 150000);
  const d = await page.evaluate(() => ({
    diag: window.__SACK_LOAD_DIAG__?.(),
    listeners: window.__sackLoadListeners,
    screen: document.querySelector('[data-testid="loading-screen"]')?.getAttribute("aria-hidden"),
  }));
  out(
    ready,
    "gate 3: Reload reaches ready",
    `${((Date.now() - t0) / 1000).toFixed(1)} s · history ${JSON.stringify(d.diag?.history)}`,
  );
  if (!ready) {
    console.log(
      "   FAILED",
      JSON.stringify(d.diag?.failed),
      "| NETWORK",
      netBad.slice(0, 8).join(" | "),
    );
    console.log("   PENDING", JSON.stringify(d.diag?.pending).slice(0, 900));
  }
  if (ready) {
    const before = d.diag?.player;
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(2500);
    await page.keyboard.up("KeyW");
    const after = await page.evaluate(() => window.__SACK_LOAD_DIAG__().player);
    const moved = before && after ? Math.hypot(after.x - before.x, after.z - before.z) : 0;
    out(moved > 1, "gate 4: movement works after recovery", `${moved.toFixed(1)} m`);
    out(
      d.screen === "true" &&
        d.diag?.failed?.length === 0 &&
        d.diag?.token === d.diag?.activeToken &&
        d.diag?.token === 1 &&
        d.listeners === 1,
      "gate 5: no stale error, one runtime instance, one status listener",
      `screen hidden ${d.screen} · failed ${d.diag?.failed?.length} · instance ${d.diag?.token}/${d.diag?.activeToken} · listeners ${d.listeners}`,
    );
  }
  await page.close();
}
await closeBrowser(browser);
if (failed) process.exit(1);
