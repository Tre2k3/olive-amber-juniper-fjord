import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__SACK_V2_INPUT__, { timeout: 20000 });
await page.evaluate(() => {
  localStorage.clear();
  window.__SACK_V2_INPUT__.setShot({ place: "hq", x: 82.15, z: 203.55, yaw: Math.PI, dollars: 240, respect: 12, carrying: false, delivered: false, mission: "Talk to K Blanco", dialogue: "" });
});
await page.waitForTimeout(400);
await page.evaluate(() => window.__SACK_V2_INPUT__.press("KeyE"));
await page.waitForTimeout(500);
for (let i = 0; i < 6; i++) {
  await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({ x: 52, z: -12.9, yaw: Math.PI, facing: "back" }));
  await page.waitForTimeout(200);
  const text = await page.locator("body").innerText();
  if (text.includes("Deliver")) {
    await page.evaluate(() => window.__SACK_V2_INPUT__.press("KeyE"));
    break;
  }
}
await page.waitForTimeout(600);
const done = await page.evaluate(() => ({ d: window.__SACK_V2__.dollars, r: window.__SACK_V2__.respect, c: window.__SACK_V2__.carrying, m: window.__SACK_V2__.mission, x: window.__SACK_V2__.x, z: window.__SACK_V2__.z }));
console.log("done", JSON.stringify(done));
await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({ x: 24, z: -8.4, yaw: Math.PI, facing: "back", night: false, dist: 6.4, dialogue: "", mission: "Walk the block to SackReligious HQ", dollars: 240, respect: 12, carrying: false, delivered: false }));
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/screenshots/v2-hq-day.png", animations: "disabled", timeout: 60000 });
await page.screenshot({ path: "/workspace/artifacts/v2-hq-day.png", animations: "disabled", timeout: 60000 });
console.log("day");
await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({ night: true, x: 24, z: -8.4, yaw: Math.PI, dist: 6.4 }));
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/artifacts/v2-hq-night.png", animations: "disabled", timeout: 60000 });
console.log("night");
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({ x: -30.2, z: 5.55, yaw: Math.PI / 2, facing: "back", night: false, dialogue: "", mission: "Walk the block to SackReligious HQ", dollars: 240, respect: 12, carrying: false }));
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/artifacts/v2-mobile.png", animations: "disabled", timeout: 60000 });
console.log("mobile");
await browser.close();
