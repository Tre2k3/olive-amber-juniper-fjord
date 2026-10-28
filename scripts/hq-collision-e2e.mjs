// Regression (Trey's playtest): Benji could walk 1.5 m into the HQ doorway and the
// lens followed him inside. Walk into the HQ from every side: player and camera
// must stay outside, and E at the door must still enter.
import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
let failed = 0;
const out = (ok, name, d = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${d ? "  — " + d : ""}`);
};
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => {
  window.__pad = {
    connected: true,
    id: "Test Controller",
    mapping: "standard",
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
  };
  navigator.getGamepads = () => [window.__pad, null, null, null];
});
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
const HX = 24,
  HZ = -16.4,
  FZ = HZ + 5.48;
const inside = (x, z) => Math.abs(x - HX) < 9 && z > HZ - 5.5 && z < HZ + 5.5;
// [label, startX, startZ, yaw toward the building]
const probes = [
  ["door", 24, -6.5, Math.PI],
  ["planter L", 21.9, -7, Math.PI],
  ["planter R", 26.1, -7, Math.PI],
  ["rope R", 29, -6.5, Math.PI],
  ["east wall", 37, -16.4, -Math.PI / 2],
  ["west wall", 11, -16.4, Math.PI / 2],
  ["back wall", 24, -26, 0],
  ["corner NE", 35, -8, -2.36],
  ["corner NW", 13, -8, 2.36],
];
for (const [label, x, z, yaw] of probes) {
  await I(
    (o) =>
      window.__SACK_V2_INPUT__.setShot({
        place: "street",
        x: o.x,
        z: o.z,
        yaw: o.yaw,
        dialogue: "",
      }),
    { x, z, yaw },
  );
  await sim(0.4);
  await I(() => {
    window.__pad.axes = [0, -1, 0, 0];
  });
  await sim(1.6);
  await I(() => {
    window.__pad.axes = [0, 0, 0, 0];
  });
  await sim(0.3);
  const c = await I(() => window.__SACK_V2_INPUT__.cameraState());
  const p = c.player,
    cam = c.cam;
  out(
    !inside(p.x, p.z) && !inside(cam.x, cam.z) && c.place === "street",
    `${label}: Benji and the camera stay outside the HQ`,
    `player (${p.x}, ${p.z}) camera (${cam.x}, ${cam.z})`,
  );
}
// E still enters from in front of the closed doorway.
await I(() =>
  window.__SACK_V2_INPUT__.setShot({ place: "street", x: 24, z: -6.5, yaw: Math.PI, dialogue: "" }),
);
await sim(0.4);
await I(() => {
  window.__pad.axes = [0, -1, 0, 0];
});
await sim(1.6);
await I(() => {
  window.__pad.axes = [0, 0, 0, 0];
});
await sim(0.2);
await I(() => {
  window.__pad.buttons[0] = { pressed: true, value: 1 };
});
await sim(0.1);
await I(() => {
  window.__pad.buttons[0] = { pressed: false, value: 0 };
});
await sim(1.2);
out(
  (await I(() => window.__SACK_V2_INPUT__.cameraState())).place === "hq",
  "E at the closed door still enters the HQ",
);
await closeBrowser(browser);
if (failed) process.exit(1);
