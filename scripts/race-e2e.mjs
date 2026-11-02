// Racing exists and is playable: E at the car meet starts a race against Nitro, the
// countdown runs, W accelerates, the car makes progress along the circuit.
import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8080";
let failed = 0;
const out = (ok, name, d = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${d ? "  — " + d : ""}`);
};
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await preparePage(page);
await page.goto(`${BASE}/?qa=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => window.__SACK_V2_INPUT__?.simulate, { timeout: 150000 });
await page
  .waitForFunction(() => (window.__SACK_LOAD_DIAG__?.().frames ?? 0) > 2, null, { timeout: 150000 })
  .catch(() => {});
const I = (fn, a) => page.evaluate(fn, a);
const sim = (s) => I((v) => window.__SACK_V2_INPUT__.simulate(v), s);
const race = () =>
  I(() => {
    const r = window.__SACK_V2_INPUT__.raceState();
    return (
      r && {
        phase: r.phase,
        speed: r.speed,
        progress: r.progress,
        nextGate: r.nextGate,
        length: r.length,
        visible: r.visible,
      }
    );
  });
await I(() =>
  window.__SACK_V2_INPUT__.setShot({ place: "street", x: -40, z: -36, yaw: 0, dialogue: "" }),
);
await sim(0.4);
const prompt = await I(() => document.body.innerText.includes("Race Nitro"));
out(prompt, 'the car meet offers the race ("E Race Nitro · three-lap circuit")');
await page.keyboard.press("KeyE");
await sim(0.3);
const started = await race();
out(!!started && started.visible, "E starts a race against Nitro", JSON.stringify(started));
await sim(4);
const running = await race();
out(
  running?.phase === "running",
  "the countdown hands over to the race",
  `phase ${running?.phase}`,
);
// No steering here, so the car meets the first bend: judge top speed and distance, not end speed.
await page.keyboard.down("KeyW");
let top = 0;
for (let i = 0; i < 12; i++) {
  await sim(0.5);
  top = Math.max(top, (await race())?.speed ?? 0);
}
const moving = await race();
await page.keyboard.up("KeyW");
out(
  top > 10 && (moving?.progress ?? 0) > (running?.progress ?? 0) + 10,
  "W accelerates the car along the circuit",
  `top speed ${top.toFixed(1)} · progress ${running?.progress?.toFixed(1)} → ${moving?.progress?.toFixed(1)} of ${moving?.length}`,
);
out(errors.length === 0, "no page errors", errors.slice(0, 1).join(" | "));
await closeBrowser(browser);
process.exit(failed ? 1 : 0);
