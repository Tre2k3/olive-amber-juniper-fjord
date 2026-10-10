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
await mkdir("artifacts/foundation", { recursive: true });
const errors = [];
const check = (condition, name, detail) => {
  assert.ok(condition, `${name}: ${JSON.stringify(detail)}`);
  console.log(`PASS: ${name}`);
};

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  const resp = await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
  check((resp?.status() ?? 0) < 400, "game-v2 document loads", { status: resp?.status() });
  await page.waitForFunction(() => window.__SACK_V2__ && window.__SACK_V2_INPUT__, { timeout: 90000 });
  const block = await readHomeBlock(page);
  const dz = block.walked.z - block.start.z;
  const dx = block.walked.x - block.start.x;
  check(dz > 0.4 && Math.abs(dx) < 0.45, "direct W moves north and stays in lane", { dx, dz, walked: block.walked });
  check(block.walked.facing === "back", "away-facing is the back cutout", block.walked);
  check(block.start.y > 0.05 && block.walked.y < 0.6, "sole stays on a walkable surface", { start: block.start, walked: block.walked });
  check(block.entered === "home", "hero door still enters the house", { entered: block.entered });
  check(block.cars.length >= 4 && block.cars.every(carOnRoad), "avenue and cross-street cars stay on asphalt", block.cars);
  // The camera is independent from the directional movement contract:
  // Q/R orbit the view and the same W axis then follows the rotated view.
  const orbit = await page.evaluate(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const input = window.__SACK_V2_INPUT__;
    input.setShot({ x: -30, z: 5.6, yaw: Math.PI / 2, facing: "back" });
    await frame();
    const start = input.cameraYaw();
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyR", key: "r" }));
    for (let i = 0; i < 5; i++) await frame();
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyR", key: "r" }));
    const afterRight = input.cameraYaw();
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyQ", key: "q" }));
    for (let i = 0; i < 5; i++) await frame();
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyQ", key: "q" }));
    return { start, afterRight, afterLeft: input.cameraYaw() };
  });
  check(orbit.afterRight > orbit.start + 0.02 && orbit.afterLeft < orbit.afterRight - 0.02,
    "Q/R camera orbit responds in both directions", orbit);

  const hqExit = await page.evaluate(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const input = window.__SACK_V2_INPUT__;
    input.setShot({ place: "hq", x: 80, z: 205.1, yaw: Math.PI, facing: "front" });
    for (let i = 0; i < 3; i++) await frame();
    const entered = window.__SACK_V2__.place;
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyS", key: "s" }));
    for (let i = 0; i < 18; i++) await frame();
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyS", key: "s" }));
    for (let i = 0; i < 3; i++) await frame();
    return { entered, left: window.__SACK_V2__.place,
      x: window.__SACK_V2__.x, z: window.__SACK_V2__.z };
  });
  check(hqExit.entered === "hq" && hqExit.left === "street",
    "HQ front door exits naturally by walking toward the camera", hqExit);
  // Court art must not move gameplay hoop centers, gate or Court OG.
  const court = await page.evaluate(() => window.__SACK_V2_INPUT__.courtProduction());
  check(court.built && court.stage === 1 && court.features.includes("901-mural-panel") &&
    court.features.filter((name) => name === "901-court-ball-rack").length === 2,
    "901 Court production art mounts without replacing playable court", court);
  check(court.gateWidth >= 2.6 && court.rims.length === 2 &&
    Math.abs(court.rims[0].x - 57.3) < 0.02 &&
    Math.abs(court.rims[1].x - 74.7) < 0.02 &&
    Math.abs(court.courtOg.z + 16.4) < 0.02,
    "Court entrance, OG and scoring rim coordinates stay unchanged", court);
  const river = await page.evaluate(() => window.__SACK_V2_INPUT__.riverfrontProduction());
  check(river.built && river.version === 1 && river.archSpans === 2 &&
    river.cooler && river.tackle && river.ripples,
    "production riverfront bridge, river and fishing detail mount", river);
  check(river.pier.x === -16 && river.pier.z === -70 &&
    river.bait.x === -30 && river.bait.z === -55.6,
    "riverfront retains fishing and bait gameplay anchors", river);
  // Cars preserve their illustrated identity but now require grounded wheels,
  // 3D chassis and headlights. Street lamps must have day/night light pools.
  const visuals = await page.evaluate(() => window.__SACK_V2_INPUT__.vehicleProduction());
  check(visuals.count >= 8 && visuals.complete === visuals.count,
    "illustrated car fleet mounts complete grounded 3D support rigs", visuals);
  check(visuals.kinds.includes("coupe") && visuals.kinds.includes("sedan") &&
    visuals.kinds.includes("suv") && visuals.kinds.includes("van") &&
    visuals.lampPools >= 8,
    "Memphis fleet variants and controlled street illumination present", visuals);
  // Beale atmosphere must be a true nighttime effect rather than flat
  // permanently glowing floor artwork. No screenshot is needed to verify
  // the authored mesh/material state.
  const bealeDay = await page.evaluate(() => window.__SACK_V2_INPUT__.bealeProduction());
  check(bealeDay.built && bealeDay.version === 2 && bealeDay.poolCount === 7,
    "production Beale neon spill meshes mount and reuse light materials", bealeDay);
  const bealeNight = await page.evaluate(async () => {
    window.__SACK_V2_INPUT__.setShot({ x: 40, z: -48.2, night: true });
    for (let i = 0; i < 2; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
    return window.__SACK_V2_INPUT__.bealeProduction();
  });
  check(bealeNight.opacities.length === 7 && bealeNight.opacities.every((a) => a >= 0.22),
    "nighttime Beale venue signs illuminate pavement", bealeNight);
  check(errors.length === 0, "foundation boot has no page errors", errors);
  console.log("foundation smoke passed");
} finally {
  await browser.close();
}
