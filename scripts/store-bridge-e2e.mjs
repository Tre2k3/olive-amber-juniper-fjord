import { closeBrowser, launchBrowser } from "./smoke-lib.mjs";
const browser = await launchBrowser(true);
const page = await browser.newPage({ viewport: { width: 1300, height: 800 } });
const out = (ok, name, d = "") =>
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${d ? "  — " + d : ""}`);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://127.0.0.1:8090/parent.html", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForFunction(() => window.__ready === true, null, { timeout: 170000 });
out(true, "game sent GG_READY to the store page");
const game = page.frames().find((f) => f.url().startsWith("http://127.0.0.1:8080"));
await game.waitForFunction(() => window.__SACK_V2_INPUT__?.simulate, null, { timeout: 60000 });
await game.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) =>
    /enter memphis/i.test(x.textContent || ""),
  );
  b?.click();
});
const I = (fn, a) => game.evaluate(fn, a);
await I(() =>
  window.__SACK_V2_INPUT__.setShot({ place: "hq", x: 75.1, z: 204.15, yaw: Math.PI, dialogue: "" }),
);
await I(() => window.__SACK_V2_INPUT__.simulate(0.3));
await I(() => window.__SACK_V2_INPUT__.press("KeyE"));
await I(() => window.__SACK_V2_INPUT__.simulate(0.2));
await game.waitForSelector('[data-testid="shop-panel"]', { timeout: 30000 });
out(true, "E at the HQ counter opens the shop");
const live = await game.locator('[data-testid="shop-add"]').count();
out(live === 1, "embedded shop is live (Add to Kart, not link-out)", `add buttons ${live}`);
const click = (sel) => I((s) => document.querySelector(s)?.click(), sel);
await click('[data-testid="shop-item-jersey-blue"]');
const disabled = await I(() => document.querySelector('[data-testid="shop-add"]').disabled);
out(disabled === true, "Add to Kart stays disabled until a size is picked");
await click('[data-testid="shop-size-L"]');
await click('[data-testid="shop-add"]');
await game.waitForFunction(
  () =>
    /Added to your kart/.test(
      document.querySelector('[data-testid="shop-status"]')?.textContent || "",
    ),
  null,
  { timeout: 30000 },
);
const kart = await page.evaluate(() => window.__kart);
out(
  kart.length === 1 &&
    kart[0].productId === "jersey-blue" &&
    kart[0].size === "L" &&
    kart[0].qty === 1 &&
    kart[0].gameSentPrice === false &&
    kart[0].priceFromStore === 165,
  "Blue Jersey, size L, qty 1 reached the store's kart at the store's $165 — no price sent by the game",
  JSON.stringify(kart),
);
await click('[data-testid="shop-visit"]');
await click('[data-testid="shop-visit"]');
await page.waitForTimeout(800);
const entered = await page.evaluate(() => window.__entered);
out(entered === 1, "Visit the real store sends GG_ENTER_HQ once per deliberate tap", `${entered}`);
await click('[data-testid="shop-close"]');
await page.waitForTimeout(800);
out((await game.locator('[data-testid="shop-panel"]').count()) === 0, "Close shuts the shop");
const log = await page.evaluate(() => window.__log);
out(
  errors.length === 0,
  "no page errors",
  errors.slice(0, 1).join(" | ") + " log=" + log.join(","),
);
await closeBrowser(browser);
