import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await preparePage(page);
await page.goto("http://127.0.0.1:8080/?qa=1", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForFunction(() => window.__SACK_V2_INPUT__?.simulate, { timeout: 150000 });
const enter = page.getByRole("button", { name: /enter memphis/i });
if (await enter.count())
  await enter
    .first()
    .click()
    .catch(() => {});
const I = (fn, a) => page.evaluate(fn, a);
const sim = (s) => I((v) => window.__SACK_V2_INPUT__.simulate(v), s);
await sim(1.0);
for (const [label, o] of [
  ["home block", { x: -26, z: 4.6, yaw: 0 }],
  ["HQ front", { x: 24, z: -4, yaw: Math.PI }],
  ["Beale", { x: 30, z: -57.8, yaw: Math.PI / 2 }],
  ["riverfront", { x: -20, z: -70, yaw: Math.PI }],
]) {
  await I((v) => window.__SACK_V2_INPUT__.setShot({ place: "street", ...v, dialogue: "" }), o);
  await sim(1.0);
  await I(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const s = await I(() => window.__SACK_V2_INPUT__.perfStats());
  console.log(
    `${label.padEnd(11)} draw calls ${s.calls} | triangles ${s.triangles} | visible meshes ${s.meshes} (shadow casters ${s.casters}) | game code ${s.stepMs} ms/frame | far ${s.far}`,
  );
}
const m = await I(() => window.__SACK_V2_INPUT__.perfStats());
console.log(
  `memory: geometries ${m.geometries} | textures ${m.textures} | shader programs ${m.programs}`,
);
await closeBrowser(browser);
