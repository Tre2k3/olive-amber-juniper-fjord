#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { closeBrowser, createOk, installHardTimeout, launchBrowser, preparePage } from "./smoke-lib.mjs";
import { carOnRoad, readHomeBlock } from "./v2-live-check.mjs";

const url = process.env.GAME_URL || "http://127.0.0.1:8080/";
const failures = [];
const pageErrors = [];
const ok = createOk(failures);
const clearHardTimeout = installHardTimeout("Game smoke");

const browser = await launchBrowser(true);
await mkdir("artifacts", { recursive: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(20000);
page.setDefaultNavigationTimeout(60000);
page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));
await preparePage(page);

try {
  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  ok((resp?.status() ?? 0) < 400, "live preview returns OK", { status: resp?.status() });
  await page.waitForFunction(() => window.__SACK_V2__ && window.__SACK_V2_INPUT__, { timeout: 90000 });
  const benji = await page.evaluate(async () => {
    const img = new Image();
    img.src = "/game-v2/characters/benji/front.png";
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight };
  });
  ok(benji.width >= 80 && benji.height >= 200, "Benji cutout decodes", benji);
  const block = await readHomeBlock(page);
  const dz = block.walked.z - block.start.z;
  const dx = block.walked.x - block.start.x;
  ok(dz > 0.4 && Math.abs(dx) < 0.45, "W moves away from the camera on the home sidewalk", { dx, dz, block });
  ok(block.walked.facing === "back", "walking away faces back", block.walked);
  ok(block.walked.y > 0.05 && block.walked.y < 0.6, "feet stay on the sidewalk, not in the ground", block.walked);
  ok(block.entered === "home", "E at the hero door enters home", block);
  ok(block.cars.length >= 4 && block.cars.every(carOnRoad), "traffic stays on the asphalt", block.cars);
  ok(!pageErrors.length, "no page errors", pageErrors);
} catch (error) {
  ok(false, "game smoke threw", String(error?.stack || error));
} finally {
  clearHardTimeout();
  await closeBrowser(browser);
}

if (failures.length) {
  console.error(`Game smoke failed (${failures.length})`);
  process.exit(1);
}
console.log("Game smoke passed");
