import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const files = [];
page.on("response", async (r) => {
  try {
    const b = await r.body();
    files.push({ url: r.url(), bytes: b.length });
  } catch {}
});
await preparePage(page);
const t0 = Date.now();
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForFunction(() => window.__SACK_V2_INPUT__, { timeout: 180000 });
const tReady = Date.now() - t0;
const enter = page.getByRole("button", { name: /enter memphis/i });
if (await enter.count())
  await enter
    .first()
    .click()
    .catch(() => {});
await page.waitForTimeout(25000);
const byExt = {};
for (const f of files) {
  const p = new URL(f.url).pathname;
  const ext = (p.match(/\.([a-z0-9]+)$/i)?.[1] || "other").toLowerCase();
  byExt[ext] = byExt[ext] || { n: 0, mb: 0 };
  byExt[ext].n++;
  byExt[ext].mb += f.bytes / 1e6;
}
console.log(
  `ready after ${(tReady / 1000).toFixed(1)} s (software renderer) | files ${files.length} | total ${(files.reduce((a, f) => a + f.bytes, 0) / 1e6).toFixed(1)} MB`,
);
console.log(
  "by type:",
  Object.entries(byExt)
    .sort((a, b) => b[1].mb - a[1].mb)
    .slice(0, 8)
    .map(([e, v]) => `${e} ${v.n} files ${v.mb.toFixed(1)} MB`)
    .join(" | "),
);
console.log(
  "largest:",
  files
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 8)
    .map(
      (f) =>
        `${new URL(f.url).pathname.split("/").slice(-2).join("/")} ${(f.bytes / 1e6).toFixed(2)}`,
    )
    .join(" | "),
);
await closeBrowser(browser);
