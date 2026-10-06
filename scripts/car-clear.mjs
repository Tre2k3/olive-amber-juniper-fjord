import { chromium } from "playwright";

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.addInitScript(() => localStorage.removeItem("sack-v2"));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__SACK_V2_INPUT__, { timeout: 30000 });
await page.waitForTimeout(1500);
const shots = [
  ["car-clear-north", { x: -16, z: 2.2, yaw: 0.2, facing: "back", height: 1.7, lookY: 1.1, dist: 8 }],
  ["car-clear-suv", { x: 33.5, z: -9.5, yaw: 0, facing: "back", height: 1.6, lookY: 1.05, dist: 8 }],
  ["car-clear-road", { x: 10, z: -3.2, yaw: 0.4, facing: "back", height: 1.6, lookY: 1.0, dist: 9 }],
];
for (const [name, shot] of shots) {
  await page.evaluate((s) => window.__SACK_V2_INPUT__.setShot({ ...s, night: false, dialogue: "" }), shot);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `/workspace/artifacts/${name}.png`, timeout: 60000 });
  console.log("shot", name);
}
await browser.close();
