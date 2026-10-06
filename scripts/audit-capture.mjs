import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = "/workspace/artifacts/audit";
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, "video"), { recursive: true });

const errors = [];
const warnings = [];
const failed = [];

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: path.join(OUT, "video"), size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
page.on("console", (msg) => {
  const text = msg.text();
  if (msg.type() === "error") errors.push(text);
  else if (msg.type() === "warning") warnings.push(text);
});
page.on("pageerror", (err) => errors.push(String(err)));
page.on("response", (res) => {
  const status = res.status();
  if (status >= 400) failed.push(`${status} ${res.url()}`);
});

const t0 = Date.now();
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => window.__SACK_V2__, { timeout: 45000 });
const loadMs = Date.now() - t0;
await page.waitForTimeout(1200);

async function shot(name) {
  try {
    await page.screenshot({ path: path.join(OUT, `${name}.png`), timeout: 60000, animations: "disabled" });
  } catch (err) {
    errors.push(`screenshot ${name}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
async function hold(key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}
async function walk(ms) {
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(ms);
  await page.keyboard.up("KeyW");
  await page.keyboard.up("ShiftLeft");
}
async function place(opts) {
  await page.evaluate((o) => window.__SACK_V2_INPUT__.setShot(o), opts);
  await page.waitForTimeout(450);
}
async function fps(ms = 2500) {
  return page.evaluate(
    (windowMs) =>
      new Promise((resolve) => {
        let frames = 0;
        let worst = 999;
        let prev = performance.now();
        const start = prev;
        const loop = (now) => {
          frames += 1;
          const dt = now - prev;
          prev = now;
          if (dt > 0) worst = Math.min(worst, 1000 / dt);
          if (now - start < windowMs) requestAnimationFrame(loop);
          else resolve({ avg: Math.round((frames / (now - start)) * 1000), worst: Math.round(worst) });
        };
        requestAnimationFrame(loop);
      }),
    ms,
  );
}

await shot("00-boot");
await hold("KeyW", 1600);
await hold("KeyD", 900);
await hold("KeyA", 900);
await hold("KeyS", 700);
await hold("ArrowUp", 1400);
await hold("ArrowRight", 800);
await hold("ArrowLeft", 800);
await hold("ArrowDown", 600);
await page.keyboard.down("ShiftLeft");
await hold("KeyW", 1400);
await page.keyboard.up("ShiftLeft");
await walk(7000);
await hold("KeyA", 2200);
await hold("KeyD", 2200);
await walk(6000);
await shot("06-benji-near-street");

const desktopFps = await fps(2500);

await place({ x: -28, z: 6.2, yaw: 0, facing: "back", dist: 2.15, height: 0.55, lookY: 0.25 });
await hold("KeyW", 900);
await shot("feet-benji");

await place({ x: 2.2, z: 5.2, yaw: 0, facing: "back", dist: 4.2, height: 1.55 });
await page.waitForTimeout(700);
await shot("05-pedestrians");
await place({ x: -5.2, z: -5.3, yaw: Math.PI, facing: "front", dist: 3.2, height: 0.7, lookY: 0.2 });
await shot("feet-npcs");

await place({ x: -21.6, z: 7.3, yaw: 0.4, facing: "left", dist: 3.4 });
await walk(2500);
await page.waitForTimeout(300);
const promptMama = await page.evaluate(() => {
  const el = document.body.innerText;
  return /Mama|Talk|E /.test(el);
});
await page.keyboard.press("KeyE");
await page.waitForTimeout(400);
await shot("07-mama-dee");

await place({ x: 22.5, z: -8.6, yaw: Math.PI, facing: "front", dist: 5.5, height: 1.7 });
await walk(3000);
await shot("12-hq-exterior");
await page.keyboard.press("KeyE");
await page.waitForTimeout(600);
await shot("13-hq-interior");
await page.keyboard.press("KeyE");
await page.waitForTimeout(500);
await shot("08-k-blanco");

await place({ x: 64.2, z: -16.2, yaw: Math.PI, facing: "back", dist: 5.2, height: 1.8, place: "court" });
await walk(2500);
await shot("14-901-court");
await page.keyboard.press("KeyE");
await page.waitForTimeout(250);
await page.keyboard.down("Space");
await page.waitForTimeout(120);
await page.keyboard.up("Space");
await page.waitForTimeout(500);
await shot("15-basketball-tap");
await page.keyboard.press("KeyE");
await page.keyboard.down("Space");
await page.waitForTimeout(700);
await page.keyboard.up("Space");
await page.waitForTimeout(900);
await shot("15b-basketball-hold");

await place({ x: 63, z: -18.5, yaw: 0.2, facing: "right", dist: 4.6 });
await shot("09-court-og");

await place({ x: -8, z: 4.2, yaw: Math.PI / 2, facing: "right", dist: 6, height: 2.1 });
await page.waitForTimeout(900);
await shot("10-traffic");

await place({ x: -32.4, z: 6.4, yaw: 0, facing: "back", dist: 6.2, height: 1.7 });
await shot("01-benji-home");
await shot("11-benji-coupe");
await place({ x: -18, z: 4.5, yaw: 0, facing: "back", dist: 8, height: 2.4 });
await shot("02-neighborhood");
await place({ x: -20.2, z: 8.2, yaw: 0, facing: "back", dist: 4.2, height: 1.5 });
await shot("03-house-close");
await place({ x: 20, z: -8, yaw: Math.PI, facing: "front", dist: 8, height: 2.4 });
await shot("16-skyline-not-downtown");

await place({ x: 86, z: -12.2, yaw: Math.PI, facing: "back", dist: 6, height: 1.8 });
await walk(2500);
await shot("18-bowling-exterior");
await page.keyboard.press("KeyE");
await page.waitForTimeout(500);
await shot("18b-bowling-lane");

await place({ x: 70, z: 16.5, yaw: 0, facing: "back", dist: 6, height: 1.8 });
await shot("20-food-trucks");
await place({ x: -36, z: -33, yaw: Math.PI, facing: "back", dist: 6, height: 1.8 });
await shot("19-racing");
await place({ x: -16, z: -62, yaw: Math.PI, facing: "back", dist: 7, height: 2 });
await shot("17-riverfront");
await place({ x: -78, z: 4.2, yaw: 0, facing: "back", dist: 8, height: 1.9 });
await walk(3000);
await shot("22-haunted");

await place({ x: -24, z: 5.6, yaw: 0, facing: "back", dist: 5.5, height: 1.6, night: false });
await shot("23-day");
await place({ x: -24, z: 5.6, yaw: 0, facing: "back", dist: 5.5, height: 1.6, golden: true });
await shot("24-golden");
await place({ x: -24, z: 5.6, yaw: 0, facing: "back", dist: 5.5, height: 1.6, night: true });
await shot("25-night");

const before = await page.evaluate(() => ({ ...window.__SACK_V2__ }));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__SACK_V2__, { timeout: 45000 });
await page.waitForTimeout(800);
const after = await page.evaluate(() => ({ ...window.__SACK_V2__ }));
await shot("save-reload");

const video = page.video();
await context.close();

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mpage = await mobile.newPage();
const tMobile = Date.now();
await mpage.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
await mpage.waitForFunction(() => window.__SACK_V2__, { timeout: 45000 });
const mobileLoad = Date.now() - tMobile;
await mpage.waitForTimeout(1000);
await mpage.evaluate(() => window.__SACK_V2_INPUT__.setShot({ x: -24, z: 5.4, yaw: 0, facing: "back", dist: 4.4, height: 1.55 }));
await mpage.waitForTimeout(500);
await mpage.screenshot({ path: path.join(OUT, "26-mobile.png"), timeout: 60000, animations: "disabled" });
const mobileFps = await mpage.evaluate(
  () =>
    new Promise((resolve) => {
      let frames = 0;
      let worst = 999;
      let prev = performance.now();
      const start = prev;
      const loop = (now) => {
        frames += 1;
        const dt = now - prev;
        prev = now;
        if (dt > 0) worst = Math.min(worst, 1000 / dt);
        if (now - start < 2000) requestAnimationFrame(loop);
        else resolve({ avg: Math.round((frames / (now - start)) * 1000), worst: Math.round(worst) });
      };
      requestAnimationFrame(loop);
    }),
);
await mobile.close();
await browser.close();

const saved = video ? await video.path() : "";
const report = {
  loadMs,
  mobileLoad,
  desktopFps,
  mobileFps,
  promptMama,
  before: { x: before.x, z: before.z, dollars: before.dollars, respect: before.respect, mission: before.mission, place: before.place },
  after: { x: after.x, z: after.z, dollars: after.dollars, respect: after.respect, mission: after.mission, place: after.place },
  errors: [...new Set(errors)].slice(0, 80),
  warnings: [...new Set(warnings)].slice(0, 40),
  failed: [...new Set(failed)].slice(0, 80),
  video: saved,
};
fs.writeFileSync(path.join(OUT, "capture-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
