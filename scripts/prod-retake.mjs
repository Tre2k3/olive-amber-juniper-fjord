import { chromium } from "playwright";

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.addInitScript(() => localStorage.removeItem("sack-v2"));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__SACK_V2_INPUT__, { timeout: 25000 });
await page.waitForTimeout(1600);
const shots = [
  ["prod-11-k-full.png", { place: "hq", x: 81.15, z: 201.9, yaw: Math.PI, facing: "back", night: false, dialogue: "", dist: 5.4 }],
  ["prod-12-k-talk.png", { place: "hq", x: 81.15, z: 201.9, yaw: Math.PI, facing: "back", dialogue: "K Blanco — Take this drop to Court OG. He is outside the 901 court.", dist: 5.4 }],
];
for (const [name, shot] of shots) {
  await page.evaluate((s) => window.__SACK_V2_INPUT__.setShot(s), shot);
  await page.waitForTimeout(450);
  await page.screenshot({ path: `/workspace/artifacts/${name}`, animations: "disabled", timeout: 45000 });
  console.log("shot", name);
}
console.log("ERRORS", JSON.stringify(errors));
await browser.close();
