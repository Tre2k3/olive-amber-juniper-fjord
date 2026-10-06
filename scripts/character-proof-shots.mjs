import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const out = "/workspace/artifacts/character-proof";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
const failed = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("response", (res) => {
  if (res.status() >= 400 && res.url().includes("characters")) failed.push(`${res.status()} ${res.url()}`);
});
await page.addInitScript(() => localStorage.removeItem("sack-v2"));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__SACK_V2_INPUT__, { timeout: 25000 });
await page.waitForTimeout(2200);
const cdp = await page.context().newCDPSession(page);

const shots = [
  ["01-benji-front.png", { x: 4, z: 5.4, yaw: Math.PI, facing: "front", night: false, dialogue: "", dist: 4.2 }],
  ["02-benji-back.png", { x: 4, z: 5.4, yaw: Math.PI, facing: "back", dialogue: "", dist: 4.2 }],
  ["03-benji-left.png", { x: 4, z: 5.4, yaw: Math.PI, facing: "left", dialogue: "", dist: 4.2 }],
  ["04-benji-right.png", { x: 4, z: 5.4, yaw: Math.PI, facing: "right", dialogue: "", dist: 4.2 }],
  ["05-k-blanco.png", { place: "hq", x: 82.6, z: 201.9, yaw: Math.PI, facing: "left", night: false, dialogue: "", dist: 4.6 }],
  ["06-court-og.png", { x: 54.4, z: -12.9, yaw: Math.PI / 2, facing: "left", night: false, dialogue: "", dist: 5.2 }],
  ["07-mama-dee.png", { x: -20.2, z: 6.55, yaw: Math.PI / 2, facing: "left", dialogue: "", dist: 4.8 }],
  ["08-unc-j.png", { x: 42.8, z: -6.35, yaw: Math.PI / 2, facing: "left", dialogue: "", dist: 4.8 }],
  ["09-nitro.png", { x: 60.8, z: 6.4, yaw: Math.PI / 2, facing: "left", dialogue: "", dist: 4.8 }],
  ["10-strike.png", { x: 26.6, z: -6.3, yaw: Math.PI / 2, facing: "left", dialogue: "", dist: 4.8 }],
  ["11-pedestrians.png", { x: -10.5, z: 4.15, yaw: 0, facing: "back", dialogue: "", dist: 7.2 }],
  ["12-benji-among-peds.png", { x: -11.2, z: 5.15, yaw: 0.35, facing: "back", dialogue: "", dist: 6.4 }],
  ["13-benji-talks-k.png", { place: "hq", x: 81.15, z: 203.15, yaw: Math.PI, facing: "back", dialogue: "K Blanco: The new drop is ready. Walk it to Court OG.", dist: 5.2 }],
  ["14-benji-beside-og.png", { x: 54.2, z: -12.2, yaw: -2.4, facing: "left", night: false, dialogue: "", dist: 5.6 }],
];

for (const [name, shot] of shots) {
  await page.evaluate((s) => window.__SACK_V2_INPUT__.setShot(s), shot);
  await page.waitForTimeout(700);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${out}/${name}`, Buffer.from(data, "base64"));
  console.log("shot", name);
}
console.log("FAILED", JSON.stringify(failed));
console.log("ERRORS", JSON.stringify(errors));
await browser.close();
