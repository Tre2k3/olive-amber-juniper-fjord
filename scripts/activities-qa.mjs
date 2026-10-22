/**
 * Drives the live game-v2 route through the three rebuilt activities —
 * court shootaround, riverfront fishing fight, haunted-house run — using
 * window.__SACK_V2__ / __SACK_V2_INPUT__ only.
 *
 * Gameplay is advanced with `simulate(seconds)` (fixed 60 Hz, no draw) so the
 * run is deterministic on a host that renders at 1 fps; screenshots wait for
 * one real frame. Images land in artifacts/activities/.
 *
 *   STAGE=court|fish|haunt|mobile|all node scripts/activities-qa.mjs
 */
import { mkdir } from "node:fs/promises";
import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";

const url = process.env.GAME_URL || "http://127.0.0.1:8080/?qa=1";
const STAGE = process.env.STAGE || "fish";
const want = (name) => STAGE === "all" || STAGE === name;
const OUT = "artifacts/activities";
const failures = [];
const ok = (name, cond, detail = "") => {
  console.log(`  ${cond ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures.push(name);
};

const browser = await launchBrowser(true);
await mkdir(OUT, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(30000);
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e?.message || e)));
page.on("console", (m) => {
  if (m.type() === "error" && !/ERR_NAME_NOT_RESOLVED|fonts/.test(m.text()))
    pageErrors.push(`console: ${m.text()}`);
});
await preparePage(page);

const api = () => page.evaluate(() => window.__SACK_V2__);
const shot = (opts) => page.evaluate((o) => window.__SACK_V2_INPUT__.setShot(o), opts);
const pressE = () => page.evaluate(() => window.__SACK_V2_INPUT__.press("KeyE"));
const hold = (on) => page.evaluate((v) => window.__SACK_V2_INPUT__.setCharge(v), on);
const stick = (x, y) => page.evaluate(([a, b]) => window.__SACK_V2_INPUT__.setStick(a, b), [x, y]);
const sim = (s) => page.evaluate((v) => window.__SACK_V2_INPUT__.simulate(v), s);
const text = () => page.evaluate(() => document.body.innerText);
/** Wait for one rendered frame, then screenshot. */
const snap = async (name) => {
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  shot ${name}`);
};
/** Hold the shot/cast/reel button for `s` game-seconds, then release. */
const holdFor = async (s) => {
  await hold(true);
  await sim(s);
  await hold(false);
  await sim(0.1);
};

try {
  console.log("== boot");
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForFunction(() => window.__SACK_V2__ && window.__SACK_V2_INPUT__?.simulate, {
    timeout: 120000,
  });
  const enter = page.getByRole("button", { name: /enter memphis/i });
  if (await enter.count())
    await enter
      .first()
      .click()
      .catch(() => {});
  await sim(0.5);
  let a = await api();
  ok("game api with fishing summary", !!a.fishing);
  await snap("00-street");

  if (want("court")) {
    console.log("== court");
    await shot({ x: 61.9, z: -22, yaw: -Math.PI / 2, dollars: 500 });
    await sim(0.6);
    a = await api();
    ok(
      "standing on the court, ball auto-picked by walking into it",
      a.place === "court" && a.court.held,
      `held=${a.court.held}`,
    );
    await snap("01-court-holding");
    await hold(true);
    await sim(0.38); // meter at ~0.5
    await snap("02-court-charging-meter");
    await hold(false);
    await sim(0.1);
    a = await api();
    ok("release fires a real shot", a.court.taken === 1 && !a.court.held, `taken=${a.court.taken}`);
    await sim(0.45);
    await snap("03-court-ball-in-flight");
    await sim(2.5);
    a = await api();
    const madeFirst = a.court.made;
    ok(
      "shot resolved (made or loose on the floor), nothing teleported",
      a.court.made === 1 || !a.court.held,
      `made=${a.court.made} held=${a.court.held}`,
    );
    await snap("04-court-after-shot");
    if (!a.court.held) {
      await pressE();
      await sim(0.3);
    }
    if (!(await api()).court.held) {
      await shot({ x: 61.9, z: -22, yaw: -Math.PI / 2 });
      await sim(0.6);
    }
    await holdFor(0.08);
    await sim(3.5);
    a = await api();
    ok(
      "a badly timed release misses",
      a.court.made === madeFirst,
      `made=${a.court.made} taken=${a.court.taken}`,
    );

    await shot({ x: 72.2, z: -16.4, yaw: -Math.PI / 2 });
    await sim(0.3);
    ok("scoreboard offers the shootaround prompt", /Start a 901 shootaround/i.test(await text()));
    await pressE();
    await sim(0.3);
    a = await api();
    ok(
      "shootaround started: moved to a spot with the ball",
      a.court.shootaround !== null && a.court.held && Math.abs(a.x - 72.2) > 0.5,
      `at (${a.x.toFixed(1)}, ${a.z.toFixed(1)})`,
    );
    await snap("05-shootaround-hud");
    const taken0 = a.court.taken;
    const xs = new Set();
    for (const s of [0.38, 0.2, 0.38, 0.6, 0.38]) {
      await holdFor(s);
      await sim(3.2);
      xs.add(Math.round((await api()).x * 10));
    }
    a = await api();
    ok(
      "five shots taken, spots rotated, ball always returned",
      a.court.taken - taken0 === 5 && a.court.held && xs.size >= 3,
      `taken=${a.court.taken - taken0} spots=${xs.size} score=${a.court.shootaround}`,
    );
    ok(
      "timed releases score in the shootaround",
      a.court.shootaround > 0,
      `score=${a.court.shootaround}`,
    );
    await snap("06-shootaround-playing");
    const d0 = a.dollars;
    await sim(61);
    a = await api();
    ok(
      "buzzer ends it and pays out",
      a.court.shootaround === null && a.dollars > d0 && a.court.best > 0,
      `$${d0} -> $${a.dollars}, best=${a.court.best}`,
    );
    ok("no page errors (court)", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  }

  if (want("fish")) {
    console.log("== fishing");
    await shot({ x: -16, z: -70.6, yaw: Math.PI, dollars: 500 });
    await sim(0.3);
    ok("pier shows the cast prompt", /E\s+Cast/i.test(await text()));
    await pressE();
    await sim(0.5);
    a = await api();
    ok("E arms the cast meter", a.fishing.phase === "casting", a.fishing.phase);
    await snap("07-fishing-cast-meter");
    await pressE();
    await sim(0.1);
    a = await api();
    ok("second E releases", a.fishing.phase === "flying", a.fishing.phase);
    for (let i = 0; i < 12 && (await api()).fishing.phase === "flying"; i++) await sim(0.25);
    a = await api();
    ok("lure splashed down and the line is out", a.fishing.phase === "wait", a.fishing.phase);
    await snap("08-fishing-line-out");
    for (let i = 0; i < 40 && (await api()).fishing.phase === "wait"; i++) await sim(0.5);
    a = await api();
    ok("a bite arrives", a.fishing.phase === "bite", a.fishing.phase);
    await snap("09-fishing-bite");
    await pressE();
    await sim(0.1);
    a = await api();
    ok("E sets the hook — fight on", a.fishing.phase === "fight", a.fishing.phase);
    let fightShot = false;
    for (let i = 0; i < 1500; i++) {
      const f = (await api()).fishing;
      if (f.phase !== "fight") break;
      await hold(f.tension < 0.55);
      await sim(0.05);
      if (!fightShot && f.tension > 0.4) {
        await snap("10-fishing-fight-tension");
        fightShot = true;
      }
    }
    await hold(false);
    a = await api();
    ok(
      "managed tension lands the fish",
      a.fishing.phase === "landed" && a.fishing.cooler === 1,
      `${a.fishing.phase} cooler=${a.fishing.cooler}`,
    );
    await snap("11-fishing-landed");
    await shot({ x: 78, z: 24.2, yaw: 0 });
    await sim(0.3);
    const d0 = (await api()).dollars;
    await pressE();
    await sim(0.3);
    a = await api();
    ok(
      "selling pays and empties the cooler",
      a.dollars > d0 && a.fishing.cooler === 0,
      `$${d0} -> $${a.dollars}`,
    );
    await snap("12-fishing-sold");
    ok("no page errors (fishing)", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  }

  if (want("haunt")) {
    console.log("== haunted house");
    a = await api();
    const { ticket, gate } = a.anchors;
    await shot({ x: ticket.x, z: ticket.z + 1.2, yaw: 0, dollars: 500, night: true });
    await sim(0.2);
    await pressE();
    await sim(0.2);
    await shot({ x: gate.x, z: gate.z + 1.2, yaw: 0 });
    await sim(0.2);
    await pressE();
    await sim(0.3);
    a = await api();
    ok(
      "ticket + gate start a run in the foyer",
      a.place === "haunt" && a.haunt.active,
      JSON.stringify(a.haunt),
    );
    await snap("13-haunt-foyer");
    await shot({ place: "haunt", x: 20, z: 504, yaw: 0 });
    await sim(0.4);
    a = await api();
    ok(
      "portrait-hall sting costs nerve",
      a.haunt.nerve < 1 && a.haunt.nerve > 0.7,
      `nerve=${a.haunt.nerve.toFixed(2)}`,
    );
    await snap("14-haunt-sting");
    for (const [x, z] of [
      [13.4, 501.6],
      [22.4, 506.6],
      [29.6, 501.7],
    ]) {
      await shot({ place: "haunt", x, z, yaw: 0 });
      await sim(0.2);
    }
    a = await api();
    ok("three jerseys collected", a.haunt.jerseys === 3, `jerseys=${a.haunt.jerseys}`);
    await snap("15-haunt-jerseys");
    await shot({ place: "haunt", x: 36, z: 512, yaw: 0 });
    await sim(0.4);
    a = await api();
    ok("boiler-room blackout", a.haunt.blackout === true);
    await snap("16-haunt-blackout-flashlight");
    await shot({ place: "haunt", x: 38.6, z: 511.9, yaw: Math.PI / 2 });
    await sim(0.1);
    await stick(0, 1);
    await sim(1.4);
    await stick(0, 0);
    await sim(0.2);
    a = await api();
    ok(
      "walked through the unlocked door into the final court",
      a.x > 40.5 && !a.haunt.blackout,
      `x=${a.x.toFixed(1)}`,
    );
    await snap("17-haunt-final-court");
    await shot({ x: gate.x, z: gate.z + 1.2, yaw: 0 });
    await sim(0.1);
    await pressE();
    await sim(0.2);
    await shot({ place: "haunt", x: 38.6, z: 511.9, yaw: Math.PI / 2 });
    await stick(0, 1);
    await sim(1.4);
    await stick(0, 0);
    await sim(0.3);
    await page.waitForTimeout(300);
    a = await api();
    ok(
      "with no jerseys the final-court door blocks the player",
      a.x < 40 && a.haunt.jerseys === 0,
      `x=${a.x.toFixed(1)}`,
    );
    ok("barred door explains itself", /Barred/i.test(await text()));
    for (const [x, z] of [
      [13.4, 501.6],
      [22.4, 506.6],
      [29.6, 501.7],
    ]) {
      await shot({ place: "haunt", x, z, yaw: 0 });
      await sim(0.15);
    }
    await shot({ place: "haunt", x: 43.6, z: 512.2, yaw: Math.PI / 2 });
    await sim(0.5);
    a = await api();
    const d0 = a.dollars;
    let makes = 0;
    for (let i = 0; i < 14 && !(await api()).haunt.cleared; i++) {
      if (!(await api()).court?.held) {
        await pressE();
        await sim(0.4);
      }
      await holdFor(0.38);
      await sim(3.2);
      makes = (await api()).haunt.finalMakes;
      if (i === 0) await snap("18-haunt-cursed-hoop-shot");
    }
    a = await api();
    ok(
      "cursed hoop registers makes and clears the house",
      a.haunt.cleared && a.dollars > d0,
      `makes=${makes} $${d0} -> $${a.dollars}`,
    );
    await snap("19-haunt-cleared");
    ok("no page errors (haunt)", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  }

  if (want("mobile")) {
    await page.setViewportSize({ width: 390, height: 844 });
    await shot({ x: 61.9, z: -22, yaw: -Math.PI / 2 });
    await sim(0.5);
    await snap("20-mobile-court");
  }
} catch (err) {
  failures.push(`crash: ${err?.message || err}`);
  console.log("CRASH", err);
  await page.screenshot({ path: `${OUT}/99-crash.png` }).catch(() => {});
} finally {
  await closeBrowser(browser);
}
console.log(
  failures.length ? `\nFAILURES: ${failures.length}\n - ${failures.join("\n - ")}` : "\nALL PASSED",
);
process.exit(failures.length ? 1 : 0);
