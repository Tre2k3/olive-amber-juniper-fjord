import { chromium } from "playwright";

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.addInitScript(() => localStorage.removeItem("sack-v2"));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__SACK_V2_INPUT__, { timeout: 30000 });
await page.waitForTimeout(1500);
const shot = { x: -22, z: 4.6, yaw: Math.PI / 2, facing: "right", night: false, dialogue: "", dist: 8 };
await page.evaluate((s) => window.__SACK_V2_INPUT__.setShot(s), shot);
await page.waitForTimeout(400);
const a = await page.evaluate(() => window.__SACK_V2_INPUT__.peds());
await page.screenshot({ path: "/workspace/artifacts/walk-a.png", timeout: 60000 });
await page.evaluate(() => window.__SACK_V2_INPUT__.setStick(1, 0.15));
await page.waitForTimeout(1600);
await page.screenshot({ path: "/workspace/artifacts/walk-b.png", timeout: 60000 });
const b = await page.evaluate(() => window.__SACK_V2_INPUT__.peds());
console.log("peds-a", JSON.stringify(a));
console.log("peds-b", JSON.stringify(b));
await page.evaluate(() => window.__SACK_V2_INPUT__.setStick(0, 0));
await browser.close();
