import { chromium } from "playwright";

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.addInitScript(() => localStorage.removeItem("sack-v2"));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__SACK_V2_INPUT__, { timeout: 30000 });
await page.waitForTimeout(1200);
const info = await page.evaluate(() => {
  window.__SACK_CHARACTER_DEBUG__ = true;
  const api = window.__SACK_V2_INPUT__;
  api.setShot({ x: -20.5, z: 8.7, yaw: 0, facing: "back", height: 0.7, lookY: 0.35, dist: 3.2, night: false, dialogue: "" });
  return { peds: api.peds(), player: { x: api.x, y: api.y, z: api.z } };
});
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/artifacts/feet-mama-close.png", timeout: 60000 });
await page.evaluate(() => {
  window.__SACK_V2_INPUT__.setShot({ x: -8, z: 6.38, yaw: Math.PI / 2, facing: "right", height: 0.42, lookY: 0.08, dist: 2.4, night: false, dialogue: "" });
});
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/artifacts/feet-benji-close.png", timeout: 60000 });
console.log(JSON.stringify(info, null, 2));
await browser.close();
