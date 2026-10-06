import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const out = "artifacts/walk-cycle";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(90000);
const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForFunction(() => window.__SACK_V2_INPUT__ && window.__SACK_V2__, { timeout: 90000 });
await page.waitForTimeout(800);

async function grab(name, run) {
  const data = await page.evaluate(run);
  const ys = data.samples.map((s) => s.y);
  const poses = [...new Set(data.samples.map((s) => s.pose))];
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  console.log(name, JSON.stringify({ poses, yMin: +yMin.toFixed(3), yMax: +yMax.toFixed(3), n: data.samples.length, end: data.samples.at(-1) }));
  if (data.shot) {
    await writeFile(`${out}/${name}.jpg`, Buffer.from(data.shot.split(",")[1], "base64"));
  }
  return { poses, yMin, yMax };
}

const front = await grab("front-stride", async () => {
  window.__SACK_V2_INPUT__.setShot({ x: -32, z: 8.4, yaw: 0, facing: "front", dist: 3.8, height: 1.28, lookY: 0.92 });
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyS", key: "s", bubbles: true }));
  const samples = [];
  let shot = "";
  for (let i = 0; i < 28; i++) {
    await new Promise((r) => requestAnimationFrame(r));
    const s = window.__SACK_V2__;
    samples.push({ pose: s.pose, y: s.y, facing: s.facing, x: +s.x.toFixed(2), z: +s.z.toFixed(2) });
    if (!shot && s.pose === "front-walk") {
      const canvas = document.querySelector("canvas");
      shot = canvas ? canvas.toDataURL("image/jpeg", 0.86) : "";
    }
  }
  window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyS", key: "s", bubbles: true }));
  return { samples, shot };
});

const back = await grab("back-still", async () => {
  window.__SACK_V2_INPUT__.setShot({ x: -30.2, z: 5.6, yaw: 0, facing: "back", dist: 3.8, height: 1.28, lookY: 0.92 });
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW", key: "w", bubbles: true }));
  const samples = [];
  let shot = "";
  for (let i = 0; i < 16; i++) {
    await new Promise((r) => requestAnimationFrame(r));
    const s = window.__SACK_V2__;
    samples.push({ pose: s.pose, y: s.y, facing: s.facing, x: +s.x.toFixed(2), z: +s.z.toFixed(2) });
    if (i === 8) {
      const canvas = document.querySelector("canvas");
      shot = canvas ? canvas.toDataURL("image/jpeg", 0.86) : "";
    }
  }
  window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW", key: "w", bubbles: true }));
  return { samples, shot };
});

const trees = await page.evaluate(async () => {
  window.__SACK_V2_INPUT__.setShot({ x: -32, z: 6.15, yaw: 0, facing: "back", dist: 6.2, height: 2.15, lookY: 2.35 });
  for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r));
  const canvas = document.querySelector("canvas");
  const s = window.__SACK_V2__;
  return {
    shot: canvas ? canvas.toDataURL("image/jpeg", 0.86) : "",
    y: s.y,
    pose: s.pose,
    facing: s.facing,
  };
});
if (trees.shot.startsWith("data:image")) {
  await writeFile(`${out}/trees.jpg`, Buffer.from(trees.shot.split(",")[1], "base64"));
}
console.log("trees", JSON.stringify({ y: trees.y, pose: trees.pose, facing: trees.facing }));
console.log("ERRORS", errors.slice(0, 6));
const frontOk = front.poses.includes("front") && front.poses.includes("front-walk");
const backOk = back.poses.length === 1 && back.poses[0] === "back";
console.log("y-delta is ground height, not a body pop", { front: +(front.yMax - front.yMin).toFixed(3), back: +(back.yMax - back.yMin).toFixed(3) });
console.log(frontOk && backOk ? "WALK_OK" : "WALK_FAIL");
await browser.close();
process.exit(frontOk && backOk ? 0 : 1);
