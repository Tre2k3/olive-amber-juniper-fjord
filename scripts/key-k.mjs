import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:8080/");
const result = await page.evaluate(async () => {
  const img = new Image();
  img.src = "/game/people/k-src.jpg";
  await img.decode();
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const image = g.getImageData(0, 0, w, h);
  const px = image.data;
  const seen = new Uint8Array(w * h);
  const q = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const id = y * w + x;
    if (seen[id]) return;
    seen[id] = 1;
    q.push(id);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  const bg = (i) => {
    const r = px[i], gg = px[i + 1], b = px[i + 2];
    const max = Math.max(r, gg, b);
    const min = Math.min(r, gg, b);
    // Dark, low-chroma backdrop. Stop at skin, hair, gold, and the inked outline's inner edge
    // by refusing pixels that sit next to saturated color — handled by threshold only.
    return max < 48 && max - min < 28;
  };
  let cleared = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const id = q[qi];
    const i = id * 4;
    if (!bg(i)) continue;
    px[i + 3] = 0;
    cleared++;
    const x = id % w;
    const y = (id / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  g.putImageData(image, 0, 0);
  return { w, h, cleared, out: c.toDataURL("image/png") };
});
writeFileSync("/workspace/public/game/people/k-blanco-hq-cutout.png", Buffer.from(result.out.split(",")[1], "base64"));
console.log({ w: result.w, h: result.h, cleared: result.cleared });
await browser.close();
