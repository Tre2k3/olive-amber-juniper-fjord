#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { carOnRoad, readHomeBlock } from "./v2-live-check.mjs";

const base = process.env.GAME_URL || "http://127.0.0.1:8080/";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
await mkdir("artifacts/connected-slice", { recursive: true });
const errors = [];
const check = (condition, name, detail) => {
  assert.ok(condition, `${name}: ${JSON.stringify(detail)}`);
  console.log(`PASS: ${name}`);
};

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => window.__SACK_V2__ && window.__SACK_V2_INPUT__, { timeout: 90000 });
  const block = await readHomeBlock(page);
  const ids = block.peds.map((ped) => ped.id);
  check(ids.includes("mama-dee"), "Mama Dee is on the home block", ids);
  check(ids.includes("unc-j") && ids.includes("nitro"), "named neighbors are still placed", ids);
  check(block.peds.length >= 8, "the block has residents, not an empty street", { count: block.peds.length });
  check(block.peds.every((ped) => ped.y > -0.05 && ped.y < 1.2), "pedestrian soles are on the ground", block.peds);
  check(block.entered === "home", "connected slice can still enter Benji's house", block.entered);
  check(block.cars.length >= 4 && block.cars.every(carOnRoad), "slice traffic stays on the road profile", block.cars);
  // Screenshot the current production interior, not a rendered concept board.
  // The QA artifact lets us compare actual WebGL output with the approved HQ target.
  await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({
    place: "hq", x: 80, z: 201.15, yaw: Math.PI, facing: "back",
  }));
  await page.evaluate(async () => {
    for (let i = 0; i < 6; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  });
  await page.screenshot({
    path: "artifacts/connected-slice/production-hq-interior.png",
    animations: "disabled",
  });
  console.log("Saved actual game-v2 HQ screenshot for visual review");
  check(errors.length === 0, "slice boot has no page errors", errors);
  console.log("connected slice smoke passed");
} finally {
  await browser.close();
}
