// Save protection in a real page: damaged save → backup restores it (with a visible note);
// legacy save loads and is rewritten in the versioned format; pause menu offers export/import.
import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8080";
let failed = 0;
const out = (ok, name, d = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${d ? "  — " + d : ""}`);
};
const browser = await launchBrowser(true);
async function boot(seed) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await preparePage(page);
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("seeded")) {
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
      sessionStorage.setItem("seeded", "1");
    }
  }, seed);
  await page.goto(`${BASE}/?qa=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => window.__SACK_V2_INPUT__?.simulate, { timeout: 150000 });
  // Saving and HUD updates run in the render loop, which starts after shaders compile and
  // textures upload (slow in software rendering). Judge saves only once it is running.
  await page.waitForFunction(() => (window.__SACK_LOAD_DIAG__?.().frames ?? 0) > 3, null, {
    timeout: 150000,
  });
  return page;
}
const money = (page) =>
  page.evaluate(() =>
    Number(
      (document.body.innerText.match(/SACKDOLLARS\s*\$?([\d,]+)/) || [])[1]?.replace(/,/g, "") ??
        NaN,
    ),
  );
{
  const page = await boot({
    "sack-v2": "{damaged",
    "sack-v2-backup": JSON.stringify({
      v: 2,
      savedAt: "2026-10-30T00:00:00Z",
      data: { dollars: 777, respect: 9 },
    }),
  });
  const shown = await page
    .waitForFunction(() => /restored from a backup/.test(document.body.innerText), null, {
      timeout: 8000,
    })
    .then(() => true)
    .catch(() => false);
  out(
    (await money(page)) === 777 && shown,
    "damaged save → progress restored from the backup, with a visible note",
    `$${await money(page)} · note ${shown}`,
  );
  await page.close();
}
{
  const page = await boot({
    "sack-v2": JSON.stringify({ dollars: 431, respect: 12, mission: "Talk to K Blanco" }),
  });
  out((await money(page)) === 431, "legacy (v1) save loads", `$${await money(page)}`);
  await page
    .waitForFunction(() => JSON.parse(localStorage.getItem("sack-v2") || "{}").v === 2, null, {
      timeout: 15000,
    })
    .catch(() => {});
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("sack-v2") || "null"));
  out(
    stored?.v === 2 && stored?.data?.dollars === 431,
    "…and is rewritten in the versioned format",
    JSON.stringify(stored).slice(0, 90),
  );
  await page.keyboard.press("Escape");
  const menu = await page
    .waitForSelector('[data-testid="pause-menu"]', { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  out(
    menu &&
      (await page.locator('[data-testid="save-export"]').count()) === 1 &&
      (await page.locator('[data-testid="save-import"]').count()) === 1,
    "pause menu offers Export save and Import save",
  );
  await page.close();
}
await closeBrowser(browser);
process.exit(failed ? 1 : 0);
