#!/usr/bin/env node
/** Main game-v2 Drop Day mission regression; never depends on legacy menus. */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const url = process.env.GAME_URL || "http://127.0.0.1:8080/";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const screenshots = [
  "01-home-start.png",
  "02-k-blanco-hq.png",
  "03-court-og-delivery.png",
  "04-save-restored.png",
];
const errors = [];
const check = (condition, name, detail) => {
  assert.ok(condition, name + ": " + JSON.stringify(detail));
  console.log("PASS: " + name);
};
async function frames(page, count = 5) {
  await page.evaluate(async (number) => {
    for (let i = 0; i < number; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }, count);
}
async function shot(page, filename) {
  if (process.env.CAPTURE_QA !== "1") return;
  try {
    await page.screenshot({
      path: "artifacts/" + filename, animations: "allow", timeout: 12000,
    });
  } catch (error) {
    console.warn("Unable to capture visual QA frame " + filename + ": " + String(error));
  }
}
try {
  await mkdir("artifacts", { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e.message)));
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => window.__SACK_V2__ && window.__SACK_V2_INPUT__, null, { timeout: 90000 });
  await frames(page);
  const initial = await page.evaluate(() => {
    const game = window.__SACK_V2__;
    return { place: game.place, dollars: game.dollars, respect: game.respect,
      mission: game.mission, carrying: game.carrying };
  });
  check(initial.place === "street" || initial.place === "court", "new game boots in Memphis", initial);
  await shot(page, screenshots[0]);

  // Move to the real HQ character anchor and use the actual E interaction.
  await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({
    place: "hq", x: 81.9, z: 200.1, yaw: Math.PI, facing: "back",
  }));
  await frames(page, 7);
  await shot(page, screenshots[1]);
  await page.evaluate(() => window.__SACK_V2_INPUT__.press("KeyE"));
  await frames(page, 7);
  const pickup = await page.evaluate(() => {
    const game = window.__SACK_V2__;
    return { place: game.place, dollars: game.dollars, respect: game.respect,
      carrying: game.carrying, mission: game.mission, dialogue: game.dialogue };
  });
  check(pickup.place === "hq" && pickup.carrying === true,
    "K Blanco hands over the Court OG package", pickup);
  check(/Court OG/i.test(pickup.mission), "package pickup sets delivery objective", pickup);

  await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({
    x: 66, z: -16.4, yaw: Math.PI, facing: "back",
  }));
  await frames(page, 5);
  await page.evaluate(() => window.__SACK_V2_INPUT__.press("KeyE"));
  await frames(page, 7);
  const delivered = await page.evaluate(() => {
    const game = window.__SACK_V2__;
    return { place: game.place, dollars: game.dollars, respect: game.respect,
      carrying: game.carrying, mission: game.mission, dialogue: game.dialogue };
  });
  check(!delivered.carrying && delivered.dollars >= pickup.dollars + 80
    && delivered.respect >= pickup.respect + 10,
    "Court OG delivery awards $80 and 10 Respect", { pickup, delivered });
  await shot(page, screenshots[2]);

  // Capture the runtime's exact save. Reopen into a fresh page to avoid
  // unreliable in-place reload timing on software WebGL.
  await frames(page, 10);
  const raw = await page.evaluate(() => localStorage.getItem("sack-v2"));
  check(Boolean(raw), "mission writes a save record", { size: raw?.length });
  const saved = JSON.parse(raw);
  check(saved.delivered && !saved.carrying, "save retains delivered state", saved);
  const resumed = await context.newPage();
  resumed.on("pageerror", (e) => errors.push(String(e.message)));
  await resumed.addInitScript((payload) => { localStorage.setItem("sack-v2", payload); }, raw);
  await resumed.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await resumed.waitForFunction(() => window.__SACK_V2__, null, { timeout: 90000 });
  await frames(resumed, 6);
  const persisted = await resumed.evaluate(() => ({
    dollars: window.__SACK_V2__.dollars,
    respect: window.__SACK_V2__.respect,
    carrying: window.__SACK_V2__.carrying,
  }));
  check(persisted.dollars === delivered.dollars && persisted.respect === delivered.respect
    && !persisted.carrying, "mission reward and package survive reopen", persisted);
  await shot(resumed, screenshots[3]);
  check(errors.length === 0, "Drop Day mission has no uncaught page errors", errors);
  await context.close();
  console.log("Drop Day gameplay and save checks complete; screenshots requested: " + (process.env.CAPTURE_QA === "1"));
} finally {
  await browser.close();
}
