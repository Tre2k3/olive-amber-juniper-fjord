#!/usr/bin/env node
/**
 * Connected city smoke for the live game-v2 renderer.
 *
 * This replaces the historical legacy-world check that waited for the
 * removed "ENTER MEMPHIS" landing button / __SACK_TRAFFIC__ debug object.
 * Those were never part of the current shipping game-v2 route.
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { carOnRoad } from "./v2-live-check.mjs";

const gameUrl = process.env.GAME_URL || "http://127.0.0.1:8080/";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const issues = [];
const check = (condition, label, detail) => {
  assert.ok(condition, label + ": " + JSON.stringify(detail));
  console.log("PASS: " + label);
};

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", (e) => issues.push(e.message));
  const response = await page.goto(gameUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  check((response?.status() ?? 500) < 400, "Memphis game-v2 route loads", { status: response?.status() });
  await page.waitForFunction(
    () => window.__SACK_V2__ && window.__SACK_V2_INPUT__,
    { timeout: 90000 },
  );
  const state = await page.evaluate(() => {
    const input = window.__SACK_V2_INPUT__;
    input.setShot({ x: 38, z: -6.35, yaw: 0, facing: "front" });
    const snap = window.__SACK_V2__;
    return { cars: snap.cars, pedestrians: input.peds() };
  });
  check(state.cars.length >= 8, "authored city traffic exists", { count: state.cars.length });
  check(state.pedestrians.length >= 8, "illustrated pedestrian population exists",
    { count: state.pedestrians.length });
  check(state.cars.every(carOnRoad), "all sampled cars stay on an authored asphalt street", state.cars);
  // On software WebGL rendering can be slow. Compare a few actual animation
  // frames rather than expecting multiple seconds to equal many rendered frames.
  const travel = await page.evaluate(async () => {
    const before = window.__SACK_V2__.cars.map(({ x, z }) => ({ x, z }));
    for (let i = 0; i < 22; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    const cars = window.__SACK_V2__.cars;
    const moving = cars.filter((p, i) => {
      const start = before[i];
      return start && Math.hypot(p.x - start.x, p.z - start.z) > 0.02;
    }).length;
    return { moving, cars };
  });
  check(travel.moving >= 3, "city traffic advances along lanes", { moving: travel.moving });
  check(travel.cars.every(carOnRoad), "cars stay on asphalt after advancing", travel.cars);
  // Slow WebGL compositors on CI can time out in screenshot capture after
  // traffic and road assertions already pass. Visual snapshots are an explicit
  // opt-in review task and never substitute for functional collision checks.
  if (process.env.CAPTURE_QA === "1") {
    await mkdir("artifacts/traffic", { recursive: true });
    try {
      await page.screenshot({
        path: "artifacts/traffic/connected-memphis.png",
        animations: "allow",
        timeout: 7000,
      });
    } catch (error) {
      console.warn("Traffic image unavailable in software WebGL:", String(error));
    }
  }
  check(issues.length === 0, "world/traffic produce no uncaught browser errors", issues);
  console.log("Live game-v2 traffic smoke passed");
} finally {
  await browser.close();
}
