import { chromium } from "playwright";
import fs from "node:fs";

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
const warnings = [];
const failed = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
  else if (msg.type() === "warning") warnings.push(msg.text());
});
page.on("pageerror", (err) => errors.push(String(err)));
page.on("response", (res) => {
  if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`);
});
const t0 = Date.now();
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => window.__SACK_V2__, { timeout: 45000 });
const loadMs = Date.now() - t0;
await page.waitForTimeout(800);
const before = await page.evaluate(() => {
  const s = window.__SACK_V2__;
  return { x: s.x, z: s.z, dollars: s.dollars, respect: s.respect, mission: s.mission, place: s.place };
});
const desktopFps = await page.evaluate(
  () =>
    new Promise((resolve) => {
      let frames = 0;
      let worstDt = 0;
      let prev = performance.now();
      const start = prev;
      const loop = (now) => {
        frames += 1;
        worstDt = Math.max(worstDt, now - prev);
        prev = now;
        if (now - start < 2000) requestAnimationFrame(loop);
        else resolve({ avg: Math.round((frames / (now - start)) * 1000), worstFrameMs: Math.round(worstDt) });
      };
      requestAnimationFrame(loop);
    }),
);
try {
  await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({ x: 8, z: 4, yaw: 0, facing: "back", dist: 7, height: 2.2 }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/workspace/artifacts/audit/04-intersection.png", timeout: 20000, animations: "disabled" });
} catch (err) {
  console.error("intersection shot", err instanceof Error ? err.message : err);
}
let after = null;
let reloadError = "";
try {
  await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForFunction(() => window.__SACK_V2__, { timeout: 20000 });
  after = await page.evaluate(() => {
    const s = window.__SACK_V2__;
    return { x: s.x, z: s.z, dollars: s.dollars, respect: s.respect, mission: s.mission, place: s.place };
  });
} catch (err) {
  reloadError = err instanceof Error ? err.message : String(err);
}
await page.close();

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
const t1 = Date.now();
await mobile.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
await mobile.waitForFunction(() => window.__SACK_V2__, { timeout: 45000 });
const mobileLoad = Date.now() - t1;
await mobile.waitForTimeout(600);
await mobile.evaluate(() => window.__SACK_V2_INPUT__.setShot({ x: -24, z: 5.4, yaw: 0, facing: "back", dist: 4.4, height: 1.55 }));
await mobile.waitForTimeout(400);
try {
  await mobile.screenshot({ path: "/workspace/artifacts/audit/26-mobile.png", timeout: 20000, animations: "disabled" });
} catch (err) {
  console.error("mobile shot", err instanceof Error ? err.message : err);
}
const mobileFps = await mobile.evaluate(
  () =>
    new Promise((resolve) => {
      let frames = 0;
      let worstDt = 0;
      let prev = performance.now();
      const start = prev;
      const loop = (now) => {
        frames += 1;
        worstDt = Math.max(worstDt, now - prev);
        prev = now;
        if (now - start < 2000) requestAnimationFrame(loop);
        else resolve({ avg: Math.round((frames / (now - start)) * 1000), worstFrameMs: Math.round(worstDt) });
      };
      requestAnimationFrame(loop);
    }),
);
await browser.close();
const report = { loadMs, mobileLoad, desktopFps, mobileFps, before, after, reloadError, errors: [...new Set(errors)].slice(0, 40), warnings: [...new Set(warnings)].slice(0, 20), failed: [...new Set(failed)].slice(0, 40) };
fs.writeFileSync("/workspace/artifacts/audit/capture-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
