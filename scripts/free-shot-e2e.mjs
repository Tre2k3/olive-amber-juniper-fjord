// Free shootaround: Benji uses his shooting frames while charging and after release.
import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const out = (ok, name, d = "") =>
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${d ? "  — " + d : ""}`);
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
await I(() =>
  window.__SACK_V2_INPUT__.setShot({
    place: "court",
    x: 64,
    z: -26,
    yaw: Math.PI,
    ballHeld: true,
    dialogue: "",
  }),
);
await I(() => window.__SACK_V2_INPUT__.simulate(1.5));
await I(() => window.__SACK_V2_INPUT__.setCharge(true));
await I(() => window.__SACK_V2_INPUT__.simulate(0.5));
const charging = await I(() => window.__SACK_V2_INPUT__.avatarPose());
await I(() => window.__SACK_V2_INPUT__.setCharge(false));
await I(() => window.__SACK_V2_INPUT__.simulate(0.1));
const released = await I(() => window.__SACK_V2_INPUT__.avatarPose());
await I(() => window.__SACK_V2_INPUT__.simulate(1.0));
const after = await I(() => window.__SACK_V2_INPUT__.avatarPose());
const a = (x) => `${x?.action ?? "none"}#${x?.frame ?? "-"}`;
out(
  /shoot/.test(charging?.action ?? ""),
  "charging a free shot shows the shooting pose",
  a(charging),
);
out(
  /shoot/.test(released?.action ?? "") && (released?.frame ?? 0) >= 2,
  "release shows the follow-through",
  a(released),
);
out(!/shoot/.test(after?.action ?? ""), "then he returns to normal", a(after));
out(errors.length === 0, "no page errors", errors.slice(0, 1).join(" | "));
await closeBrowser(browser);
