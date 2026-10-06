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
  check(errors.length === 0, "foundation boot has no page errors", errors);
  console.log("foundation smoke passed");
} finally {
  await browser.close();
}
