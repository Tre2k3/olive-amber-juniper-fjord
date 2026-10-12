// Capture the real WebGL frame and its pose metadata in one animation callback.
// Full gameplay/UI screenshots remain in claude-visual-qa; these frames support
// accurate reference comparisons when an NPC turns during compositor capture.
import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const out = process.env.QA_OUTPUT || "/workspace/screenshots/claude-canonical";
const replay = JSON.parse(await readFile(out + "/observations.json", "utf8"));
await mkdir(out + "/matched-frames", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:8080/");
  await page.waitForFunction(() => window.__SACK_V2_INPUT__?.spriteState(), null, { timeout: 90000 });
  for (const id of replay.expected) {
    if (process.env.QA_ONLY && id !== process.env.QA_ONLY) continue;
    const name = id === "benji" ? "benji-front" : id === "k-blanco" ? "hq-k-blanco" : id;
    const shot = replay.shots.find((shot) => shot.name === name);
    let opts = shot.opts;
    if (id === "ped-pink-jacket-girl")
      opts = { x: -2, z: -5.4, yaw: -Math.PI / 2, facing: "back", night: false, dist: 3.4, height: 1.45 };
    if (["ped-green-jacket-man", "ped-denim-girl", "ped-purple-tracksuit-kid"].includes(id)) {
      const live = await page.evaluate((target) =>
        window.__SACK_V2_INPUT__.spriteState().actors.find((a) => a.id === target), id);
      const h = live.heading, fx = Math.sin(h), fz = Math.cos(h);
      opts = { x: live.x + fx * 2.3 + fz * 1.3, z: live.z + fz * 2.3 - fx * 1.3,
        yaw: h + Math.PI, facing: "back", night: false, dist: 3.4, height: 1.45 };
    }
    await page.evaluate((camera) => window.__SACK_V2_INPUT__.setShot(camera), opts);
    const frame = await page.evaluate(async () => {
      for (let i = 0; i < 12; i++) await new Promise((r) => requestAnimationFrame(r));
      return new Promise((resolve) => requestAnimationFrame(() => {
        resolve({ state: window.__SACK_V2_INPUT__.spriteState(),
          png: document.querySelector("canvas").toDataURL("image/png") });
      }));
    });
    const actor = [frame.state.player, ...frame.state.actors].find((a) => a.id === id);
    if (!actor?.loaded || !actor.visible || actor.opacity < 1)
      throw new Error("Comparison target is not fully visible: " + id);
    const b = actor.screenBounds;
    if (b.left < 0 || b.right > 1280 || b.top < 0 || b.bottom > 800)
      throw new Error("Comparison target is clipped: " + id);
    await writeFile(out + "/matched-frames/" + id + ".png",
      Buffer.from(frame.png.split(",")[1], "base64"));
    results.push({ id, actor, camera: opts });
    console.log("Matched real rendered frame: " + id + "/" + actor.face);
  }
  if (process.env.QA_ONLY) {
    const previous = JSON.parse(await readFile(out + "/matched-frames/metadata.json", "utf8"));
    for (const row of previous) if (row.id !== process.env.QA_ONLY) results.push(row);
    results.sort((a, b) => replay.expected.indexOf(a.id) - replay.expected.indexOf(b.id));
  }
  await writeFile(out + "/matched-frames/metadata.json", JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
