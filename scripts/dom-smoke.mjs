#!/usr/bin/env node
/** Actual game-v2 responsive HUD and WebGL page QA. */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.GAME_URL || "http://127.0.0.1:8080/";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const failures = [];
const check = (ok, name, details) => {
  assert.ok(ok, name + ": " + JSON.stringify(details));
  console.log("PASS: " + name);
};
try {
  await mkdir("artifacts", { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => failures.push(String(e.message)));
  const response = await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
  check((response?.status() ?? 500) < 400, "Memphis desktop page loads", { status: response?.status() });
  await page.waitForFunction(() => window.__SACK_V2__ && window.__SACK_V2_INPUT__, null, { timeout: 90000 });
  const desktop = await page.evaluate(() => ({
    title: document.title,
    canvas: document.querySelector("canvas")?.getBoundingClientRect()?.toJSON(),
    hud: document.body.innerText.slice(0, 1200),
  }));
  check(Boolean(desktop.title), "game has a page title", desktop.title);
  check(desktop.canvas && desktop.canvas.width > 250 && desktop.canvas.height > 250,
    "desktop WebGL fills the gameplay view", desktop.canvas);
  check(/MEMPHIS|SACK|RESPECT|901/i.test(desktop.hud.toUpperCase()),
    "desktop HUD shows Memphis progression", { sample: desktop.hud.slice(0, 180) });
  await page.screenshot({ path: "artifacts/dom-desktop.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  const mobile = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    canvas: document.querySelector("canvas")?.getBoundingClientRect()?.toJSON(),
    hud: document.body.innerText.slice(0, 1200),
  }));
  check(mobile.overflow < 8, "mobile viewport has no horizontal overflow", mobile);
  check(mobile.canvas && mobile.canvas.width > 100 && mobile.canvas.height > 100,
    "mobile WebGL canvas remains visible", mobile.canvas);
  check(/MEMPHIS|RESPECT|901/i.test(mobile.hud.toUpperCase()),
    "mobile HUD retains game progression", { sample: mobile.hud.slice(0, 180) });
  await page.screenshot({ path: "artifacts/dom-mobile.png" });
  check(failures.length === 0, "mobile/desktop boot without runtime errors", failures);
  console.log("Live Memphis responsive smoke passed");
} finally {
  await browser.close();
}
