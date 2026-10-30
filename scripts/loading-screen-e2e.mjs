// The loading screen shows progress while Memphis loads, then fades out.
import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const out = (ok, name, d = "") =>
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${d ? "  — " + d : ""}`);
await preparePage(page);
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForSelector('[data-testid="loading-screen"]', {
  state: "attached",
  timeout: 150000,
});
let seen = "";
for (let i = 0; i < 40 && !/\d+%/.test(seen); i++) {
  seen = await page.evaluate(
    () => document.querySelector('[data-testid="loading-screen"]')?.textContent || "",
  );
  await page.waitForTimeout(250);
}
out(
  /Loading Memphis… \d+%/.test(seen),
  "shows loading progress",
  seen.replace(/\s+/g, " ").slice(0, 60),
);
const done = await page
  .waitForFunction(
    () =>
      document.querySelector('[data-testid="loading-screen"]')?.getAttribute("aria-hidden") ===
      "true",
    { timeout: 120000 },
  )
  .then(() => true)
  .catch(() => false);
out(done, "fades out once Memphis has loaded");
out(errors.length === 0, "no page errors", errors.slice(0, 1).join(" | "));
await closeBrowser(browser);
