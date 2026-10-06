import { chromium } from "playwright";

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.addInitScript(() => localStorage.removeItem("sack-v2"));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__SACK_V2_INPUT__, { timeout: 30000 });
await page.waitForTimeout(1600);

const shots = [
  ["feet-strike", { x: 34, z: -6.38, yaw: Math.PI / 2, facing: "right", height: 0.55, lookY: 0.2, dist: 3.2 }],
  ["feet-mama", { x: -20.5, z: 8.2, yaw: 0, facing: "back", height: 1.1, lookY: 0.7, dist: 4.2 }],
  ["district-bowl", { x: 84, z: -9.5, yaw: Math.PI, facing: "front", height: 1.8, lookY: 1.4, dist: 9 }],
  ["district-river", { x: -16, z: -62, yaw: Math.PI, facing: "front", height: 1.7, lookY: 1.1, dist: 8 }],
  ["district-trucks", { x: 72, z: 14, yaw: 0, facing: "back", height: 2.2, lookY: 1.3, dist: 10 }],
  ["district-meet", { x: -40, z: -28, yaw: Math.PI, facing: "front", height: 2, lookY: 1.2, dist: 9 }],
];

for (const [name, shot] of shots) {
  await page.evaluate((s) => window.__SACK_V2_INPUT__.setShot({ ...s, night: false, dialogue: "" }), shot);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `/workspace/artifacts/${name}.png`, timeout: 60000 });
  console.log("shot", name);
}
const peds = await page.evaluate(() => window.__SACK_V2_INPUT__.peds());
console.log(JSON.stringify(peds.filter((p) => p.id === "strike" || p.id === "mama-dee" || p.y < 0.05), null, 2));
await browser.close();
