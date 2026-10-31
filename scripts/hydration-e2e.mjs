// No hydration mismatch (React #418) on touch devices or with mouse controls enabled, and
// the on-screen controls still appear after hydration.
import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8080";
let failed = 0;
const out = (ok, name, d = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${d ? "  — " + d : ""}`);
};
const browser = await launchBrowser(true);
for (const [label, ctxOpts, prep] of [
  [
    "phone (touch)",
    { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    { mouseControls: false },
  ],
  ["narrow desktop with mouse controls enabled", { viewport: { width: 390, height: 844 } }, {}],
]) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  await preparePage(page, { ...prep, loadScreen: true });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const shot = await page
    .getByRole("button", { name: "SHOT", exact: true })
    .waitFor({ timeout: 90000 })
    .then(() => true)
    .catch(() => false);
  await page.waitForTimeout(1500);
  out(
    errors.length === 0 && shot,
    `${label}: no hydration/page errors, controls shown`,
    errors.length ? errors.join(" | ") : "SHOT visible",
  );
  await ctx.close();
}
await closeBrowser(browser);
process.exit(failed ? 1 : 0);
