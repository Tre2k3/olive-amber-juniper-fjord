import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const out = process.env.QA_OUTPUT || "/workspace/screenshots/claude-canonical";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const errors = [], missing = [], shots = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => { if (r.status() >= 400 && r.url().includes("/game-v2/")) missing.push(r.url()); });
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__SACK_V2_INPUT__?.spriteState(), null, { timeout: 90000 });
  const frames = async (n = 3) => page.evaluate(async (count) => {
    for (let i = 0; i < count; i++) await new Promise((r) => requestAnimationFrame(r));
  }, n);
  await frames(5);
  const state = await page.evaluate(() => window.__SACK_V2_INPUT__.spriteState());
  const actors = [state.player, ...state.actors];
  const expected = ["benji", "k-blanco", "court-og", "mama-dee", "nitro", "unc-j", "strike",
    "ped-green-jacket-man", "ped-orange-woman", "ped-blue-hoodie-boy", "ped-denim-girl",
    "ped-black-hoodie-man", "ped-pink-jacket-girl", "ped-bucket-hat-oldman", "ped-purple-tracksuit-kid"];
  for (const id of expected) {
    const actor = actors.find((a) => a.id === id);
    assert.ok(actor, "Missing live actor " + id);
    for (const face of ["front", "back", "left", "right", ...(id.startsWith("ped-") ? ["walk"] : [])])
      assert.ok(actor.views[face]?.loaded, "Missing loaded canonical pose " + id + "/" + face);
  }
  console.log("PASS: all 15 identities and 68 available directional/stride textures loaded in the actual game");
  // Use the real keyboard handlers and normal movement update for the four directions.
  for (const [key, face] of [["KeyA", "left"], ["KeyD", "right"], ["KeyW", "back"], ["KeyS", "front"]]) {
    await page.evaluate(() => window.__SACK_V2_INPUT__.setShot({ x: -24, z: 6.35, yaw: 0, facing: "front", night: false }));
    await frames();
    const start = await page.evaluate(() => ({ ...window.__SACK_V2__ }));
    await page.keyboard.down(key);
    await frames(8);
    await page.keyboard.up(key);
    await frames(3);
    const end = await page.evaluate(() => ({ ...window.__SACK_V2__, sprite: window.__SACK_V2_INPUT__.spriteState().player }));
    assert.equal(end.facing, face);
    assert.equal(end.sprite.face, face);
    assert.ok(end.sprite.src.includes("/benji/" + face + ".png"));
    assert.ok(Math.hypot(end.x - start.x, end.z - start.z) > 0.1, "Keyboard movement failed");
    console.log("PASS: " + key + " moves and displays approved " + face);
  }
  async function shot(name, opts) {
    await page.evaluate((s) => window.__SACK_V2_INPUT__.setShot(s), opts);
    await frames(3);
    const state = await page.evaluate(() => window.__SACK_V2_INPUT__.spriteState());
    await page.screenshot({ path: out + "/" + name + ".png", timeout: 60000, animations: "allow" });
    shots.push({ name, opts, state });
    console.log("Captured " + name);
  }
  for (const face of ["front", "back", "left", "right"])
    await shot("benji-" + face, { x: -24, z: 6.35, yaw: 0, facing: face, night: false, dist: 4.2, height: 1.5 });
  const named = ["mama-dee", "unc-j", "nitro", "strike", "court-og"];
  for (const id of named) {
    if (id === "mama-dee") {
      await shot(id, { x: -21.9, z: 5.8, yaw: 0, dist: 4.8, height: 1.6, facing: "back", night: false });
      continue;
    }
    const actor = (await page.evaluate(() => window.__SACK_V2_INPUT__.spriteState())).actors.find((a) => a.id === id);
    const heading = actor.heading ?? Math.PI;
    const fx = Math.sin(heading), fz = Math.cos(heading);
    await shot(id, { x: actor.x + fx * 2.4 + fz * 1.2, z: actor.z + fz * 2.4 - fx * 1.2,
      yaw: heading + Math.PI, facing: "back", night: false, dist: 3.4, height: 1.45 });
  }
  await shot("hq-k-blanco", { place: "hq", x: 80, z: 202.7, yaw: Math.PI, facing: "back", night: false, dist: 3.05, height: 1.5 });
  for (const id of expected.filter((id) => id.startsWith("ped-"))) {
    if (id === "ped-pink-jacket-girl") {
      await shot(id, { x: -3.2, z: -4.5, yaw: Math.PI, dist: 4.2, height: 1.6, facing: "back", night: false });
      continue;
    }
    const actor = (await page.evaluate(() => window.__SACK_V2_INPUT__.spriteState())).actors.find((a) => a.id === id);
    const h = actor.heading ?? Math.PI, fx = Math.sin(h), fz = Math.cos(h);
    await shot(id, { x: actor.x + fx * 2.3 + fz * 1.3, z: actor.z + fz * 2.3 - fx * 1.3,
      yaw: h + Math.PI, facing: "back", night: false, dist: 3.4, height: 1.45 });
  }
  for (const [name, opts] of [
    ["hq-exterior", { x: 24, z: -7.4, yaw: Math.PI, facing: "back", night: false, dist: 7, height: 2.1, lookY: 2.8 }],
    ["neighborhood-vehicles", { x: -30, z: 5.8, yaw: Math.PI / 2, facing: "right", night: false, dist: 4.5, height: 1.7 }],
    ["901-court", { place: "court", x: 66, z: -18.4, yaw: Math.PI, facing: "back", golden: true, dist: 5.5, height: 2.1 }],
    ["beale-night", { x: 40, z: -48.2, yaw: Math.PI / 2, facing: "right", night: true, dist: 5, height: 1.7 }],
    ["riverfront", { x: -16, z: -71, yaw: Math.PI, facing: "back", night: false, dist: 5, height: 2.1 }],
  ]) await shot(name, opts);
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("mobile-neighborhood", { x: -30, z: 5.8, yaw: Math.PI / 2, facing: "right", night: false });
  assert.deepEqual(errors, [], "Runtime errors");
  assert.deepEqual(missing, [], "Missing game artwork");
  await writeFile(out + "/observations.json", JSON.stringify({ expected, errors, missing, shots }, null, 2));
} finally {
  await browser.close();
}
