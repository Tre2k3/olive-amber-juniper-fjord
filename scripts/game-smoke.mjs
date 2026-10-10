#!/usr/bin/env node
/**
 * Fast boot and asset smoke for the LIVE game-v2 route.
 * Detailed movement/grounding/collision tests are intentionally kept in
 * foundation-smoke and connected-slice-smoke; duplicating 35 requestAnimationFrame
 * waits here used to hit the four-minute hard timeout in software WebGL.
 */
import { closeBrowser, createOk, installHardTimeout, launchBrowser, preparePage } from "./smoke-lib.mjs";
const url = process.env.GAME_URL || "http://127.0.0.1:8080/";
const failures = [];
const errors = [];
const ok = createOk(failures);
const clear = installHardTimeout("Game smoke", 120000);
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1024, height: 720 } });
page.setDefaultNavigationTimeout(60000);
page.on("pageerror", (err) => errors.push(String(err?.message || err)));
await preparePage(page);
try {
  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  ok((resp?.status() ?? 0) < 400, "production Memphis game returns OK", { status: resp?.status() });
  await page.waitForFunction(() => Boolean(window.__SACK_V2__ && window.__SACK_V2_INPUT__), null, { timeout: 90000 });
  const state = await page.evaluate(async () => {
    const image = new Image();
    image.src = "/game-v2/characters/benji/front.png";
    await image.decode();
    const game = window.__SACK_V2__;
    const input = window.__SACK_V2_INPUT__;
    return {
      cutoutWidth: image.naturalWidth, cutoutHeight: image.naturalHeight,
      canvas: Boolean(document.querySelector("canvas")),
      characterCount: input.peds().length,
      cars: game.cars?.length ?? 0,
      controls: typeof input.setShot === "function" && typeof input.press === "function",
      court: input.courtProduction(),
      dollars: game.dollars,
    };
  });
  ok(state.cutoutWidth >= 80 && state.cutoutHeight >= 200, "Benji illustrated cutout decodes", state);
  ok(state.canvas, "Three.js game canvas mounts", state);
  ok(state.controls && state.characterCount >= 8 && state.cars >= 4,
    "game exposes live movement, people and traffic", state);
  ok(state.court.built && state.court.rims.length === 2, "production 901 Court is mounted", state.court);
  ok(errors.length === 0, "no boot errors", errors);
} catch(error) {
  ok(false, "game smoke threw", String(error?.stack || error));
} finally {
  clear();
  await closeBrowser(browser);
}
if (failures.length) {
  console.error("Game smoke failed (" + failures.length + ")");
  process.exit(1);
}
console.log("Game smoke passed");
