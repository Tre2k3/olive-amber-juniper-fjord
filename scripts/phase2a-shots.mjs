import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const out = "artifacts/phase2a";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => window.__SACK_V2_INPUT__ && window.__SACK_V2__, { timeout: 60000 });
await page.waitForTimeout(1200);

async function shot(name, opts) {
  if (opts.viewport) await page.setViewportSize(opts.viewport);
  else await page.setViewportSize({ width: 1280, height: 800 });
  const data = await page.evaluate(async (o) => {
    window.__SACK_V2_INPUT__.setShot(o);
    const frames = o.frames ?? 2;
    for (let i = 0; i < frames; i++) {
      await new Promise((r) => requestAnimationFrame(r));
    }
    const canvas = document.querySelector("canvas");
    return canvas ? canvas.toDataURL("image/jpeg", 0.86) : "";
  }, opts);
  if (!data.startsWith("data:image")) throw new Error("no canvas frame for " + name);
  await writeFile(`${out}/${name}.jpg`, Buffer.from(data.split(",")[1], "base64"));
  const state = await page.evaluate(() => {
    const s = window.__SACK_V2__;
    return { x: s.x, y: s.y, z: s.z, place: s.place, facing: s.facing, cars: s.cars };
  });
  console.log(name, JSON.stringify({ x: state.x, y: +state.y.toFixed(3), z: state.z, place: state.place, facing: state.facing, cars: state.cars?.length }));
  return state;
}

const hero = { x: -32, z: 6.15, yaw: 0, facing: "back", dist: 6.2, height: 2.15, lookY: 2.35 };
await shot("01-benji-home-day", hero);
await shot("02-benji-home-golden", { ...hero, golden: true });
await shot("03-benji-home-night", { ...hero, night: true });
await shot("04-porch", { x: -32, z: 8.2, yaw: 0, facing: "back", dist: 8.4, height: 2.05, lookY: 1.9 });
await shot("05-roof-eaves", { x: -32, z: 7.5, yaw: 0, facing: "back", dist: 6.8, height: 1.55, lookY: 3.55 });
await shot("06-landscaping", { x: -34.2, z: 6.4, yaw: 0.35, facing: "back", dist: 5.6, height: 1.7, lookY: 1.15 });
await shot("07-driveway-coupe", { x: -33.2, z: 7.15, yaw: -0.91, facing: "left", dist: 6.4, height: 1.75, lookY: 1.05 });
await shot("08-sidewalk-curb", { x: -24, z: 4.6, yaw: Math.PI / 2, facing: "right", dist: 4.2, height: 1.35, lookY: 0.55 });
await shot("09-street-east", { x: -48, z: 4.4, yaw: Math.PI / 2, facing: "right", dist: 5.5, height: 1.7, lookY: 1.15 });
await shot("10-street-west", { x: 18, z: 4.5, yaw: -Math.PI / 2, facing: "left", dist: 5.8, height: 1.75, lookY: 1.15 });
await shot("11-pedestrians", { x: -18.5, z: 4.3, yaw: 0.25, facing: "back", dist: 7.2, height: 2.1, lookY: 1.35 });
await shot("12-traffic", { x: -8, z: 3.2, yaw: Math.PI / 2, facing: "right", dist: 7.5, height: 2.4, lookY: 0.85, frames: 8 });
await shot("13-golden-wide", { x: -30, z: 2.6, yaw: 0.2, facing: "back", golden: true, dist: 11, height: 3.6, lookY: 1.7 });
await shot("14-mobile", { ...hero, viewport: { width: 390, height: 844 } });
console.log("ERRORS", errors.slice(0, 8));
await browser.close();
