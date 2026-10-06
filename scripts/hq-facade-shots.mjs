import { chromium } from "playwright";

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.addInitScript(() => localStorage.removeItem("sack-v2"));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__SACK_V2_INPUT__, { timeout: 30000 });
await page.waitForTimeout(1800);
const shots = [
  ["hq-facade-day.png", { x: 24, z: -8.2, yaw: Math.PI, facing: "back", night: false, dialogue: "", dist: 8.2 }],
  ["hq-facade-night.png", { x: 24, z: -8.2, yaw: Math.PI, facing: "back", night: true, dialogue: "", dist: 8.2 }],
  ["hq-facade-angle.png", { x: 16.5, z: -6.4, yaw: Math.atan2(24 - 16.5, -11.2 - -6.4), facing: "back", night: false, dialogue: "", dist: 9 }],
];
for (const [name, shot] of shots) {
  await page.evaluate((s) => window.__SACK_V2_INPUT__.setShot(s), shot);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/workspace/artifacts/${name}`, timeout: 60000 });
  console.log("shot", name);
}
await browser.close();
