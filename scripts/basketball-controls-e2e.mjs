// Basketball controls: hoop-facing while dribbling; shoot/dunk/layup from keyboard, gamepad
// and touch; on-screen controls ignore the mouse unless mouse controls are explicitly enabled.
import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8080";
let failed = 0;
const out = (ok, name, d = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${d ? "  — " + d : ""}`);
};
const browser = await launchBrowser(true);
const taken = async (page) =>
  Number((await page.evaluate(() => document.body.innerText)).match(/(\d+)\s*TAKEN/)?.[1] ?? NaN);
async function open(page) {
  await page.goto(`${BASE}/?qa=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => window.__SACK_V2_INPUT__?.simulate, { timeout: 150000 });
}
const sim = (page, s) => page.evaluate((v) => window.__SACK_V2_INPUT__.simulate(v), s);
const court = (page, x, z) =>
  page.evaluate(
    (o) =>
      window.__SACK_V2_INPUT__.setShot({
        place: "court",
        x: o.x,
        z: o.z,
        yaw: Math.PI,
        ballHeld: true,
        dialogue: "",
      }),
    { x, z },
  );
{
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
  await open(page);
  // find the rim distance from the free-shot spot by walking: use the known free-shot spot, then step toward the hoop
  await court(page, 64, -26);
  await sim(page, 0.5);
  const hoop = await page.evaluate(() => window.__SACK_V2_INPUT__.courtHoop?.() ?? null);
  const near = hoop ? { x: hoop.x, z: hoop.z + (hoop.z < -26 ? 1.2 : -1.2) } : { x: 64, z: -26 };
  // keyboard dunk near the rim
  await court(page, near.x, near.z);
  await sim(page, 0.4);
  let t0 = await taken(page);
  await page.keyboard.press("KeyV");
  await sim(page, 1.5);
  out(
    (await taken(page)) === t0 + 1,
    "keyboard V dunks near the rim",
    `taken ${t0} → ${await taken(page)} · rim ${JSON.stringify(hoop)}`,
  );
  // keyboard layup
  await court(page, near.x, near.z + (near.z > (hoop?.z ?? 0) ? 2 : -2));
  await sim(page, 0.4);
  t0 = await taken(page);
  await page.keyboard.press("KeyL");
  await sim(page, 1.5);
  out(
    (await taken(page)) === t0 + 1,
    "keyboard L lays it up",
    `taken ${t0} → ${await taken(page)}`,
  );
  // too far for a dunk
  await court(page, 64, -26);
  await sim(page, 0.4);
  t0 = await taken(page);
  await page.keyboard.press("KeyV");
  await sim(page, 0.3);
  const shown = await page
    .waitForFunction(() => /Get under the rim/.test(document.body.innerText), null, {
      timeout: 4000,
    })
    .then(() => true)
    .catch(() => false);
  const after = await taken(page);
  out(
    after === t0 && shown,
    "V from too far: no shot, 'get under the rim'",
    `taken ${t0} → ${after} · message shown ${shown} · dialogue "${(await page.evaluate(() => window.__SACK_V2__?.dialogue ?? "")).slice(0, 60)}"`,
  );
  // gamepad RB dunk
  await court(page, near.x, near.z);
  await sim(page, 0.4);
  t0 = await taken(page);
  await page.evaluate(() => {
    window.__pad.buttons[5] = { pressed: true, value: 1 };
  });
  await sim(page, 0.1);
  await page.evaluate(() => {
    window.__pad.buttons[5] = { pressed: false, value: 0 };
  });
  await sim(page, 1.5);
  out((await taken(page)) === t0 + 1, "gamepad RB dunks", `taken ${t0} → ${await taken(page)}`);
  // facing while dribbling is independent of movement direction
  const faceAfter = async (key, ball) => {
    await page.evaluate(
      (b) =>
        window.__SACK_V2_INPUT__.setShot({
          place: "court",
          x: 64,
          z: -26,
          yaw: Math.PI,
          ballHeld: b,
          dialogue: "",
        }),
      ball,
    );
    await sim(page, 0.3);
    await page.keyboard.down(key);
    await sim(page, 0.4);
    await page.keyboard.up(key);
    return page.evaluate(() => window.__SACK_V2__?.facing);
  };
  const dl = await faceAfter("KeyA", true),
    dr = await faceAfter("KeyD", true),
    nl = await faceAfter("KeyA", false),
    nr = await faceAfter("KeyD", false);
  out(
    dl === dr && nl !== nr,
    "dribbling faces the hoop whichever way he moves",
    `with ball: left ${dl} / right ${dr} · without: left ${nl} / right ${nr}`,
  );
  await page.close();
}
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  await preparePage(page, { mouseControls: false });
  await open(page);
  await court(page, 64, -26);
  await sim(page, 0.5);
  const hoop = await page.evaluate(() => window.__SACK_V2_INPUT__.courtHoop?.() ?? null);
  const near = hoop ? { x: hoop.x, z: hoop.z + (hoop.z < -26 ? 1.2 : -1.2) } : { x: 64, z: -26 };
  await court(page, near.x, near.z);
  await sim(page, 0.4);
  const dunk = page.getByRole("button", { name: "DUNK" });
  let t0 = await taken(page);
  await dunk.click({ timeout: 5000 }).catch(() => {});
  await sim(page, 1.5);
  out(
    (await taken(page)) === t0,
    "touch device: a MOUSE click on DUNK does nothing (mouse controls off)",
    `taken ${t0} → ${await taken(page)}`,
  );
  await court(page, near.x, near.z);
  await sim(page, 0.4);
  t0 = await taken(page);
  await dunk
    .tap({ timeout: 5000 })
    .catch((e) => console.log("   tap failed", String(e).slice(0, 100)));
  await sim(page, 1.5);
  out(
    (await taken(page)) === t0 + 1,
    "touch device: tapping DUNK dunks",
    `taken ${t0} → ${await taken(page)}`,
  );
  await ctx.close();
}
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await preparePage(page, { mouseControls: false });
  await open(page);
  await court(page, 64, -26);
  await sim(page, 0.5);
  out(
    (await page.getByRole("button", { name: "DUNK" }).count()) === 0,
    "desktop with mouse controls off: no on-screen DUNK button",
  );
  await page.close();
}
await closeBrowser(browser);
process.exit(failed ? 1 : 0);
