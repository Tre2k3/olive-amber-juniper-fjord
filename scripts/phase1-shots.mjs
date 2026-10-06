import fs from "node:fs";
import { chromium } from "playwright";
import path from "node:path";

const OUT = "/workspace/artifacts/phase1";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const cdp = await page.context().newCDPSession(page);
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => window.__SACK_V2_INPUT__, { timeout: 45000 });
await page.waitForTimeout(900);

async function shot(name, opts) {
  await page.evaluate((o) => window.__SACK_V2_INPUT__.setShot(o), opts);
  await page.waitForTimeout(450);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, "base64"));
  console.log(name);
}

await shot("benji-front", { x: -28, z: 5.4, yaw: 0, facing: "front", dist: 2.5, height: 1.15, lookY: 0.85 });
await shot("benji-back", { x: -28, z: 5.4, yaw: 0, facing: "back", dist: 2.5, height: 1.15, lookY: 0.85 });
await shot("benji-left", { x: -28, z: 5.4, yaw: 0, facing: "left", dist: 2.5, height: 1.15, lookY: 0.85 });
await shot("benji-right", { x: -28, z: 5.4, yaw: 0, facing: "right", dist: 2.5, height: 1.15, lookY: 0.85 });
await shot("benji-feet", { x: -28, z: 5.4, yaw: 0, facing: "front", dist: 1.7, height: 0.42, lookY: 0.15 });
await page.keyboard.down("KeyW");
await page.waitForTimeout(700);
await page.keyboard.up("KeyW");
await shot("benji-walk", { x: -26.2, z: 5.4, yaw: 0, facing: "back", dist: 2.6, height: 1.15, lookY: 0.85 });
await page.waitForTimeout(700);
await shot("peds", { x: -10, z: 3.7, yaw: 0.05, facing: "back", dist: 5.4, height: 1.35, lookY: 0.85 });
await shot("mama", { x: -18.2, z: 6.35, yaw: -1.05, facing: "left", dist: 3.3, height: 1.12, lookY: 0.78 });
await shot("mama-feet", { x: -19.15, z: 6.55, yaw: -0.85, facing: "left", dist: 2.35, height: 0.55, lookY: 0.28 });
await shot("k-blanco", {
  place: "hq",
  x: 81.15,
  z: 203.55,
  yaw: Math.PI,
  facing: "back",
  dist: 2.55,
  height: 1.28,
  lookY: 0.95,
});
await shot("k-feet", {
  place: "hq",
  x: 81.15,
  z: 203.15,
  yaw: Math.PI,
  facing: "back",
  dist: 1.85,
  height: 0.48,
  lookY: 0.2,
});
await shot("court-og", { x: 63.6, z: -19.6, yaw: 0.25, facing: "right", place: "court", dist: 3.5, height: 1.25, lookY: 0.9 });
await shot("og-feet", { x: 64.4, z: -18.2, yaw: 0.35, facing: "right", place: "court", dist: 2.15, height: 0.5, lookY: 0.22 });
const peds = await page.evaluate(() => window.__SACK_V2_INPUT__.peds());
fs.writeFileSync(path.join(OUT, "peds.json"), JSON.stringify(peds, null, 2));
await browser.close();
console.log("done");
