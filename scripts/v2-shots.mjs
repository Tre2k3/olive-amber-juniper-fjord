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
await page.waitForFunction(() => window.__SACK_V2_INPUT__ && window.__SACK_V2__, { timeout: 20000 });
await page.waitForTimeout(1200);

async function state() {
  return page.evaluate(() => {
    const a = window.__SACK_V2__;
    return { x: a.x, z: a.z, place: a.place, dollars: a.dollars, respect: a.respect, mission: a.mission, carrying: a.carrying, dialogue: a.dialogue };
  });
}

await page.evaluate(() => {
  window.__SACK_V2_INPUT__.setShot({ place: "hq", x: 82.15, z: 203.55, yaw: Math.PI, facing: "back", dist: 3.1, dollars: 240, respect: 12, carrying: false, delivered: false, mission: "Talk to K Blanco", dialogue: "" });
});
await page.waitForTimeout(400);
const before = await state();
await page.evaluate(() => window.__SACK_V2_INPUT__.press("KeyE"));
await page.waitForTimeout(700);
const talked = await state();
await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({ x: 52, z: -11.2, yaw: Math.PI, facing: "back" }));
await page.waitForTimeout(300);
await page.evaluate(() => window.__SACK_V2_INPUT__.press("KeyE"));
await page.waitForTimeout(700);
const delivered = await state();
console.log("MISSION", JSON.stringify({ before, talked, delivered }));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__SACK_V2__, { timeout: 20000 });
await page.waitForTimeout(600);
const reloaded = await page.evaluate(() => ({ api: { dollars: window.__SACK_V2__.dollars, respect: window.__SACK_V2__.respect, mission: window.__SACK_V2__.mission, carrying: window.__SACK_V2__.carrying }, save: localStorage.getItem("sack-v2") }));

const shots = [
  ["v2-home.png", { x: -32, z: 6.15, yaw: 0, facing: "back", dollars: 240, respect: 12, mission: "Walk the block to SackReligious HQ", carrying: false, delivered: false, dialogue: "", night: false }],
  ["v2-benji-front.png", { x: -28.5, z: 6.2, yaw: 0.15, facing: "front", dollars: 240, respect: 12, mission: "Walk the block to SackReligious HQ", dialogue: "" }],
  ["v2-neighborhood.png", { x: -14, z: 6.05, yaw: Math.PI / 2, facing: "right", mission: "Walk the block to SackReligious HQ", dialogue: "" }],
  ["v2-traffic.png", { x: -6, z: 4.7, yaw: Math.PI / 2, facing: "right", dialogue: "" }],
  ["v2-intersection.png", { x: 1.2, z: 4.8, yaw: 0.55, facing: "back", dialogue: "" }],
  ["v2-hq-day.png", { x: 24, z: -7.6, yaw: Math.PI, facing: "back", night: false, dialogue: "" }],
  ["v2-hq-night.png", { x: 24, z: -7.6, yaw: Math.PI, facing: "back", night: true, dialogue: "" }],
  ["v2-hq-interior.png", { place: "hq", x: 80.1, z: 201.7, yaw: Math.PI, facing: "back", dist: 3.2, night: false, dialogue: "" }],
  ["v2-k-blanco.png", { place: "hq", x: 81.2, z: 203.45, yaw: 1.72, facing: "back", dist: 2.7, dialogue: "" }],
  ["v2-dialogue.png", { place: "hq", x: 81.2, z: 203.45, yaw: 1.72, facing: "back", dist: 2.7, carrying: true, mission: "Deliver the package to Court OG", dialogue: "K Blanco — Take this drop to Court OG. He is outside the 901 court. SackDollars and Respect when it lands." }],
  ["v2-delivery.png", { x: 44, z: -9.2, yaw: Math.PI, facing: "back", carrying: true, mission: "Deliver the package to Court OG", dialogue: "" }],
  ["v2-court.png", { x: 52, z: -10.1, yaw: Math.PI, facing: "back", carrying: false, delivered: true, dollars: 320, respect: 22, mission: "Delivery complete. The 901 court is open.", dialogue: "" }],
  ["v2-court-play.png", { x: 47.2, z: -22, yaw: -Math.PI / 2, facing: "left", ballHeld: true, dialogue: "" }],
  ["v2-shot.png", { x: 46.2, z: -22, yaw: -Math.PI / 2, facing: "left", ballAt: { x: 44.6, y: 3.15, z: -22 }, mission: "Bucket.", dialogue: "" }],
];

for (const [name, shot] of shots) {
  await page.evaluate((s) => window.__SACK_V2_INPUT__.setShot(s), shot);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `/workspace/artifacts/${name}`, animations: "disabled", timeout: 45000 });
  console.log("shot", name);
}

await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({ x: -30.2, z: 5.55, yaw: Math.PI / 2, facing: "back", night: false, dialogue: "", mission: "Walk the block to SackReligious HQ", dollars: 240, respect: 12, carrying: false }));
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/artifacts/v2-mobile.png", animations: "disabled", timeout: 45000 });
console.log("shot mobile");
console.log(JSON.stringify({ before, talked, delivered, reloaded, errors }, null, 2));
await browser.close();
