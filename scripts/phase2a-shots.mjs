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

await shot("04-porch", { x: -32, z: 8.2, yaw: 0, facing: "back", dist: 8.4, height: 2.05, lookY: 1.9 });
await shot("05-roof-eaves", { x: -32, z: 7.5, yaw: 0, facing: "back", dist: 6.8, height: 1.55, lookY: 3.55 });
await shot("07-driveway-coupe", { x: -33.2, z: 7.15, yaw: -0.91, facing: "left", dist: 6.4, height: 1.75, lookY: 1.05 });
console.log("ERRORS", errors.slice(0, 8));
await browser.close();
