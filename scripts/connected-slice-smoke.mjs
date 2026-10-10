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
  // Gameplay assertions above are the release gate. Software WebGL can take
  // over a minute per compositor screenshot; do not conflate that with a
  // gameplay failure. Visual QA is enabled explicitly with CAPTURE_QA=1.
  if (process.env.CAPTURE_QA === "1") {
    const snapshots = [
      {
        name: "production-home-golden.png",
        scene: { x: -32, z: 6.1, yaw: 0, facing: "back", golden: true, dist: 4.2 },
      },
      {
        name: "production-hq-interior.png",
        scene: { place: "hq", x: 80, z: 202.7, yaw: Math.PI, facing: "back" },
      },
      {
        name: "production-901-court.png",
        scene: { place: "court", x: 66, z: -18.4, yaw: Math.PI, facing: "back", golden: true, dist: 5.5 },
      },
    ];
    for (const snap of snapshots) {
      await page.evaluate((opts) => window.__SACK_V2_INPUT__.setShot(opts), snap.scene);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
      try {
        await page.screenshot({
          path: "artifacts/connected-slice/" + snap.name,
          timeout: 14000,
          animations: "allow",
        });
        console.log("Captured " + snap.name);
      } catch (error) {
        console.warn("Visual snapshot timed out (not a gameplay regression): " + snap.name + " " + String(error));
      }
    }
  }
  check(errors.length === 0, "slice boot has no page errors", errors);
  console.log("connected slice smoke passed");
} finally {
  await browser.close();
}
