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
await page.waitForTimeout(2800);
const shots = [
  ["env-hq.png", { x: 24, z: -6.2, yaw: Math.PI, facing: "back", dialogue: "", dist: 12 }],
];
for (const [name, shot] of shots) {
  await page.evaluate((s) => window.__SACK_V2_INPUT__.setShot(s), shot);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `/workspace/artifacts/${name}`, timeout: 60000 });
  console.log("shot", name);
}
console.log("errors", errors);
await browser.close();
