import { chromium } from "playwright";

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
await page.evaluate(() => {
  window.__SACK_CHARACTER_DEBUG__ = true;
});

const aim = (px, pz, tx, tz) => Math.atan2(tx - px, tz - pz);
const low = { height: 0.42, lookY: 0.08, dialogue: "" };
const shots = [
  ["feet-benji.png", { x: -24.2, z: 6.35, yaw: Math.PI, facing: "front", dist: 1.65, ...low }],
  ["feet-k.png", { place: "hq", x: 82.55, z: 203.35, yaw: Math.PI + 0.55, facing: "left", dist: 2.35, height: 0.55, lookY: 0.15, dialogue: "" }],
  ["feet-og.png", { x: 54.2, z: -16.4, yaw: -1.15, facing: "left", dist: 3.1, height: 0.7, lookY: 0.2, dialogue: "" }],
  ["feet-mama.png", { x: -18.7, z: 8.35, yaw: 0.35, facing: "back", dist: 3.2, height: 0.7, lookY: 0.25, dialogue: "" }],
  ["feet-porch.png", { x: -20.5, z: 10.05, yaw: 0, facing: "back", dist: 2.6, height: 0.62, lookY: 0.12, dialogue: "" }],
];
for (const [name, shot] of shots) {
  await page.evaluate((s) => window.__SACK_V2_INPUT__.setShot(s), shot);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `/workspace/artifacts/${name}`, timeout: 60000 });
  console.log("shot", name);
}
console.log("errors", errors);
await browser.close();
