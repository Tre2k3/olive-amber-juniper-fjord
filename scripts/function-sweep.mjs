import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const glb = new Set();
page.on("request", (r) => {
  const m = r.url().match(/props\/([a-z-]+\.glb)/);
  if (m) glb.add(m[1]);
});
await preparePage(page);
await page.goto("http://127.0.0.1:8080/?qa=1" + (process.env.URL_EXTRA || ""), {
  waitUntil: "domcontentloaded",
  timeout: 120000,
});
await page.waitForFunction(() => window.__SACK_V2_INPUT__?.simulate, { timeout: 150000 });
const enter = page.getByRole("button", { name: /enter memphis/i });
if (await enter.count())
  await enter
    .first()
    .click()
    .catch(() => {});
const I = (fn, arg) => page.evaluate(fn, arg);
const sim = (s) => I((v) => window.__SACK_V2_INPUT__.simulate(v), s);
const report = (name, ok, detail = "") =>
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
const step = async (name, fn) => {
  try {
    const [ok, d] = await fn();
    report(name, ok, d);
  } catch (e) {
    report(name, false, String(e).slice(0, 100));
  }
};
await step("boot: world, HUD, crowds", async () => {
  const ids = await I(() => window.__SACK_V2_INPUT__.peds().map((p) => p.id));
  const n = ids.length;
  const unique = new Set(ids).size === n;
  const hud = await page.locator("text=SACKDOLLARS").count();
  return [n >= 18 && unique && hud > 0, `${n} pedestrians, all different: ${unique}`];
});
await step("basketball: a timed shot fires and is counted", async () => {
  await I(() =>
    window.__SACK_V2_INPUT__.setShot({
      x: 66,
      z: -22,
      yaw: -Math.PI / 2,
      ballHeld: true,
      dialogue: "",
    }),
  );
  await sim(0.4);
  const before = await I(() => window.__SACK_V2_INPUT__.ballState().taken);
  await I(() => window.__SACK_V2_INPUT__.setCharge(true));
  await sim(0.55);
  await I(() => window.__SACK_V2_INPUT__.setCharge(false));
  await sim(2.5);
  const after = await I(() => window.__SACK_V2_INPUT__.ballState().taken);
  return [after === before + 1, `taken ${before} → ${after}`];
});
await step("bowling: the lane opens for aiming", async () => {
  await I(() =>
    window.__SACK_V2_INPUT__.setShot({ x: 92, z: -16, yaw: Math.PI, dollars: 200, dialogue: "" }),
  );
  await sim(0.3);
  await I(() => window.__SACK_V2_INPUT__.press("KeyE"));
  await sim(0.4);
  const ph = await I(() => window.__SACK_V2_INPUT__.activityState().bowl?.phase);
  await I(() => window.__SACK_V2_INPUT__.press("KeyE"));
  await sim(0.3);
  return [ph === "aim", `phase ${ph}`];
});
await step("riverfront: pier props load on approach", async () => {
  await I(() =>
    window.__SACK_V2_INPUT__.setShot({
      place: "street",
      x: -15.8,
      z: -75.2,
      yaw: Math.PI,
      dialogue: "",
    }),
  );
  await sim(0.5);
  await page.waitForTimeout(5000);
  const ok = ["cooler.glb", "tackle-box.glb", "folding-chair.glb"].every((f) => glb.has(f));
  return [ok, [...glb].join(",")];
});
await step("HQ: interior opens and its sofa loads", async () => {
  await I(() => window.__SACK_V2_INPUT__.setShot({ place: "hq", dialogue: "" }));
  await sim(0.6);
  await page.waitForTimeout(4000);
  const place = await I(() => window.__SACK_V2__.place);
  return [place === "hq" && glb.has("lounge-sofa.glb"), `place ${place}`];
});
await step("haunted house: entry loads all five room props", async () => {
  await I(() =>
    window.__SACK_V2_INPUT__.setShot({ place: "haunt", x: 4.4, z: 503.5, yaw: 0, dialogue: "" }),
  );
  await sim(0.6);
  await page.waitForTimeout(6000);
  const want = [
    "rocking-horse.glb",
    "grandfather-clock.glb",
    "covered-statue.glb",
    "chandelier.glb",
    "seance-table.glb",
  ];
  const got = want.filter((f) => glb.has(f));
  return [got.length === 5, `${got.length}/5`];
});
await step("pause menu opens and closes", async () => {
  await I(() =>
    window.__SACK_V2_INPUT__.setShot({ place: "street", x: -30, z: 6, yaw: Math.PI, dialogue: "" }),
  );
  await sim(0.3);
  await I(() => document.querySelector('button[aria-label="Pause"]')?.click());
  await page.waitForTimeout(500);
  const open = await page.locator('[data-testid="pause-menu"]').count();
  await I(() =>
    [...document.querySelectorAll('[data-testid="pause-menu"] button')]
      .find((b) => b.textContent.includes("Resume"))
      ?.click(),
  );
  await page.waitForTimeout(500);
  const closed = await page.locator('[data-testid="pause-menu"]').count();
  return [open === 1 && closed === 0, `open ${open}, after resume ${closed}`];
});
report("no page errors across the sweep", errors.length === 0, errors.slice(0, 2).join(" | "));
await closeBrowser(browser);
