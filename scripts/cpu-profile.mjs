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
await page.evaluate(() =>
  window.__SACK_V2_INPUT__.setShot({ place: "street", x: 24, z: -4, yaw: Math.PI, dialogue: "" }),
);
await page.evaluate(() => window.__SACK_V2_INPUT__.simulate(0.5));
const cdp = await page.context().newCDPSession(page);
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
await cdp.send("Profiler.start");
await page.evaluate(() => window.__SACK_V2_INPUT__.perfStats());
const { profile } = await cdp.send("Profiler.stop");
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const total = profile.samples.length;
for (const id of profile.samples) {
  const n = byId.get(id);
  const f = n.callFrame;
  const key = `${f.functionName || "(anon)"} ${f.url.split("/").slice(-2).join("/").split("?")[0]}:${f.lineNumber + 1}`;
  self.set(key, (self.get(key) || 0) + 1);
}
console.log("samples", total);
for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16))
  console.log(`${((100 * v) / total).toFixed(1).padStart(5)}%  ${k}`);
await closeBrowser(browser);
