import { closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";
const browser = await launchBrowser(true);
const out = (ok, name, d = "") =>
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${d ? "  — " + d : ""}`);
// 1) Standalone (not embedded): real catalog, link out + contact draft, no Add to Kart.
let page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await preparePage(page);
await page.goto("http://127.0.0.1:8080/?qa=1", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForFunction(() => window.__SACK_V2_INPUT__?.simulate, null, { timeout: 150000 });
const I = (fn, a) => page.evaluate(fn, a);
await I(() => {
  const b = [...document.querySelectorAll("button")].find((x) =>
    /enter memphis/i.test(x.textContent || ""),
  );
  b?.click();
});
await I(() =>
  window.__SACK_V2_INPUT__.setShot({ place: "hq", x: 75.1, z: 204.15, yaw: Math.PI, dialogue: "" }),
);
await I(() => window.__SACK_V2_INPUT__.simulate(0.3));
const prompt = await I(() => document.body.innerText.includes("Shop the $ackReligious store"));
out(prompt, "the counter shows the shop prompt");
await I(() => window.__SACK_V2_INPUT__.press("KeyE"));
await I(() => window.__SACK_V2_INPUT__.simulate(0.2));
await page.waitForSelector('[data-testid="shop-panel"]', { timeout: 30000 });
const ui = await I(() => ({
  add: document.querySelectorAll('[data-testid="shop-add"]').length,
  online: document.querySelector('[data-testid="shop-online"]')?.getAttribute("href"),
  items: document.querySelectorAll('[data-testid^="shop-item-"]').length,
  basketball: !!document.querySelector('[data-testid="shop-item-jersey-basketball"]'),
}));
out(
  ui.add === 0 && ui.online === "https://10letters.store/shop",
  "standalone links to the real shop instead of a kart",
  JSON.stringify(ui),
);
out(
  ui.items === 23 && !ui.basketball,
  "23 items listed; the draft basketball jersey is hidden",
  `${ui.items}`,
);
await I(() => document.querySelector('[data-testid="shop-item-jersey-nco"]').click());
await I(() => document.querySelector('[data-testid="shop-size-XL"]').click());
const mail = await I(() =>
  decodeURIComponent(document.querySelector('[data-testid="shop-contact"]').getAttribute("href")),
);
out(
  mail.startsWith("mailto:SackReligiousKlothingKompany@gmail.com") &&
    mail.includes("NCO Authentic Jersey") &&
    mail.includes("Size: XL"),
  "Contact to Purchase drafts an email with the item and size",
);
const img = await I(() => {
  const el = document.querySelector('[data-testid="shop-panel"] img');
  return el ? { src: el.getAttribute("src"), ok: el.complete && el.naturalWidth > 0 } : null;
});
await page.waitForTimeout(1500);
const img2 = await I(() => {
  const el = document.querySelector('[data-testid="shop-panel"] img');
  return el ? { src: el.getAttribute("src"), ok: el.complete && el.naturalWidth > 0 } : null;
});
out(
  !!img2 && img2.ok && img2.src.endsWith("jersey-nco-front.webp"),
  "the NCO jersey shows its real photo",
  JSON.stringify(img2 || img),
);
await page.keyboard.press("Escape");
await page.waitForTimeout(500);
out((await page.locator('[data-testid="shop-panel"]').count()) === 0, "Escape closes the shop");
await page.close();
// 2) Back from the store: ?spawn=hq-door puts Benji outside the HQ door, once.
page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => errors.push(String(e)));
await preparePage(page);
await page.goto("http://127.0.0.1:8080/?qa=1&spawn=hq-door", {
  waitUntil: "domcontentloaded",
  timeout: 120000,
});
await page.waitForFunction(
  () => window.__SACK_V2__?.place !== undefined && window.__SACK_V2_INPUT__?.simulate,
  null,
  { timeout: 150000 },
);
const st = await page.evaluate(() => ({
  place: window.__SACK_V2__.place,
  x: Math.round(window.__SACK_V2__.x * 10) / 10,
  z: Math.round(window.__SACK_V2__.z * 10) / 10,
  url: location.search,
}));
out(
  st.place === "street" &&
    Math.abs(st.x - 24) < 0.6 &&
    Math.abs(st.z + 7.9) < 0.8 &&
    !st.url.includes("spawn"),
  "?spawn=hq-door lands on the sidewalk outside HQ and clears itself",
  JSON.stringify(st),
);
const prompt2 = await page.evaluate(() => document.body.innerText.includes("Enter $ackReligious"));
out(!prompt2, "it spawns outside the entrance trigger (no immediate re-entry)");
out(errors.length === 0, "no page errors", errors.slice(0, 1).join(" | "));
await closeBrowser(browser);
