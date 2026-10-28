// ?perf=1 shows a live frame readout; startup (with shader precompile) still works.
import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const out = (ok, name, d = "") =>
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${d ? "  — " + d : ""}`);
await preparePage(page);
await page.goto("http://127.0.0.1:8080/?perf=1", {
  waitUntil: "domcontentloaded",
  timeout: 120000,
});
await page.waitForFunction(() => window.__SACK_V2_INPUT__, { timeout: 150000 });
const enter = page.getByRole("button", { name: /enter memphis/i });
if (await enter.count())
  await enter
    .first()
    .click()
    .catch(() => {});
await page
  .waitForFunction(
    () => /fps/.test(document.querySelector('[data-testid="perf-overlay"]')?.textContent || ""),
    { timeout: 60000 },
  )
  .catch(() => {});
const text = await page.evaluate(
  () => document.querySelector('[data-testid="perf-overlay"]')?.textContent || "",
);
out(
  /\d+ fps .* draws \d+ .* tris .* res \d+%/.test(text),
  "?perf=1 shows fps, draw calls, triangles and render scale",
  text,
);
out(errors.length === 0, "no page errors", errors.slice(0, 1).join(" | "));
await closeBrowser(browser);
