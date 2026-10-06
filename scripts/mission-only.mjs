import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--no-sandbox"] });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__SACK_V2_INPUT__, { timeout: 20000 });
await page.evaluate(() => localStorage.removeItem("sack-v2"));
await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({
  place: "hq", x: 82.15, z: 203.55, yaw: Math.PI, facing: "back",
  dollars: 240, respect: 12, carrying: false, delivered: false, mission: "Talk to K Blanco", dialogue: "",
}));
await page.waitForTimeout(200);
await page.evaluate(() => window.__SACK_V2_INPUT__.press("KeyE"));
await page.waitForTimeout(400);
const talked = await page.evaluate(() => ({ ...window.__SACK_V2__ }));
await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({ x: 52, z: -12.4, yaw: Math.PI, facing: "back" }));
await page.waitForTimeout(250);
await page.evaluate(() => window.__SACK_V2_INPUT__.press("KeyE"));
await page.waitForTimeout(500);
const delivered = await page.evaluate(() => ({
  x: window.__SACK_V2__.x, z: window.__SACK_V2__.z, dollars: window.__SACK_V2__.dollars,
  respect: window.__SACK_V2__.respect, carrying: window.__SACK_V2__.carrying, mission: window.__SACK_V2__.mission,
  dialogue: window.__SACK_V2__.dialogue, save: localStorage.getItem("sack-v2"),
}));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__SACK_V2__, { timeout: 20000 });
await page.waitForTimeout(400);
const again = await page.evaluate(() => ({ dollars: window.__SACK_V2__.dollars, respect: window.__SACK_V2__.respect, mission: window.__SACK_V2__.mission, carrying: window.__SACK_V2__.carrying, save: localStorage.getItem("sack-v2") }));
console.log(JSON.stringify({ talked: { carrying: talked.carrying, mission: talked.mission, dialogue: talked.dialogue }, delivered, again }, null, 2));
await browser.close();
