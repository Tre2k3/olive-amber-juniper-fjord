import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("/workspace/artifacts/characters", { recursive: true });
const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));
await page.addInitScript(() => localStorage.removeItem("sack-v2"));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__SACK_V2_INPUT__ && window.__SACK_V2__, { timeout: 30000 });
await page.waitForTimeout(2200);

const shots = [
  ["01-benji-front.png", { x: -42, z: 5.2, yaw: 0, facing: "front", night: false, dialogue: "", dist: 4.2, dollars: 240, respect: 12, carrying: false }],
  ["02-benji-back.png", { x: -42, z: 5.2, yaw: 0, facing: "back", dialogue: "", dist: 4.2 }],
  ["03-benji-left.png", { x: -42, z: 5.2, yaw: 0, facing: "left", dialogue: "", dist: 4.2 }],
  ["04-benji-right.png", { x: -42, z: 5.2, yaw: 0, facing: "right", dialogue: "", dist: 4.2 }],
  ["05-k-blanco.png", { place: "hq", x: 79.35, z: 203.15, yaw: Math.PI / 2, facing: "right", dialogue: "", dist: 5.1 }],
  ["06-court-og.png", { x: 50.15, z: -11.15, yaw: Math.PI, facing: "front", dialogue: "", dist: 5.6 }],
  ["07-mama-dee.png", { x: -24.3, z: 4.7, yaw: 0, facing: "left", dialogue: "", dist: 5.4 }],
  ["08-unc-j.png", { x: 38.5, z: -4.45, yaw: Math.PI, facing: "front", dialogue: "", dist: 5.4 }],
  ["09-nitro.png", { x: 56.5, z: 4.55, yaw: 0, facing: "right", dialogue: "", dist: 5.4 }],
  ["10-strike.png", { x: 22.2, z: -4.4, yaw: Math.PI, facing: "left", dialogue: "", dist: 5.4 }],
  ["11-pedestrians.png", { x: -10.8, z: 3.55, yaw: 0, facing: "back", dialogue: "", dist: 9.2 }],
  ["12-benji-among-peds.png", { x: -12.6, z: 4.55, yaw: 0.35, facing: "right", dialogue: "", dist: 6.4 }],
  ["13-talk-k.png", { place: "hq", x: 79.7, z: 202.7, yaw: Math.PI / 2, facing: "right", dialogue: "K Blanco — Take this drop to Court OG. He is outside the 901 court.", dist: 5.2 }],
  ["14-beside-court-og.png", { x: 50.4, z: -11.35, yaw: Math.PI, facing: "front", dialogue: "Court OG — K said a drop was coming. You holding it?", dist: 5.8 }],
];

for (const [name, shot] of shots) {
  await page.evaluate((s) => window.__SACK_V2_INPUT__.setShot(s), shot);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `/workspace/artifacts/characters/${name}`, animations: "disabled", timeout: 45000 });
  console.log("shot", name);
}
console.log("errors", errors);
await browser.close();
