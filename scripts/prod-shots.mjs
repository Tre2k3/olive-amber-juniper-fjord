import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("/workspace/artifacts", { recursive: true });
const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.addInitScript(() => localStorage.removeItem("sack-v2"));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__SACK_V2_INPUT__ && window.__SACK_V2__, { timeout: 25000 });
await page.waitForTimeout(1800);

const shots = [
  ["prod-01-home-day.png", { x: -32, z: 7.2, yaw: 0, facing: "back", night: false, dialogue: "", dist: 5.4 }],
  ["prod-02-street.png", { x: -18, z: 5.6, yaw: Math.PI / 2, facing: "right", night: false, dialogue: "", dist: 6.2 }],
  ["prod-03-house.png", { x: -28.4, z: 8.6, yaw: 0.15, facing: "back", dialogue: "", dist: 4.1 }],
  ["prod-04-traffic.png", { x: -8, z: 4.4, yaw: Math.PI / 2, facing: "right", dialogue: "", dist: 7 }],
  ["prod-05-coupe.png", { x: -32.2, z: 6.4, yaw: 0.35, facing: "back", dialogue: "", dist: 5.2 }],
  ["prod-06-van.png", { x: 32.5, z: -16.5, yaw: Math.PI, facing: "back", dialogue: "", dist: 6 }],
  ["prod-07-hq-day.png", { x: 24, z: -8.2, yaw: Math.PI, facing: "back", night: false, dialogue: "", dist: 7.2 }],
  ["prod-08-hq-night.png", { x: 24, z: -8.2, yaw: Math.PI, facing: "back", night: true, dialogue: "", dist: 7.2 }],
  ["prod-09-storefront.png", { x: 24, z: -9.4, yaw: Math.PI, facing: "back", night: false, dialogue: "", dist: 4.6 }],
  ["prod-10-interior.png", { place: "hq", x: 80.2, z: 202.4, yaw: Math.PI, facing: "back", night: false, dialogue: "", dist: 4.6 }],
  ["prod-11-k-full.png", { place: "hq", x: 83.1, z: 201.15, yaw: -2.2, facing: "left", night: false, dialogue: "", dist: 4.4 }],
  ["prod-12-k-talk.png", { place: "hq", x: 81.15, z: 201.9, yaw: Math.PI, facing: "back", dialogue: "K Blanco — Take this drop to Court OG. He is outside the 901 court.", dist: 5.3 }],
  ["prod-13-court.png", { x: 52, z: -12.2, yaw: Math.PI, facing: "back", night: false, dialogue: "", dist: 8 }],
  ["prod-14-hoop.png", { x: 46.5, z: -22, yaw: -Math.PI / 2, facing: "left", ballHeld: true, dialogue: "", dist: 6.2 }],
  ["prod-15-peds.png", { x: 10.2, z: 4.8, yaw: Math.PI / 2, facing: "right", dialogue: "", dist: 6 }],
];

for (const [name, shot] of shots) {
  await page.evaluate((s) => window.__SACK_V2_INPUT__.setShot(s), shot);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `/workspace/artifacts/${name}`, animations: "disabled", timeout: 45000 });
  console.log("shot", name);
}
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({ x: -30.2, z: 5.7, yaw: Math.PI / 2, facing: "back", night: false, dialogue: "", dist: 6.2 }));
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/artifacts/prod-16-mobile.png", animations: "disabled", timeout: 45000 });
console.log("shot mobile");
console.log("ERRORS", JSON.stringify(errors));
await browser.close();
