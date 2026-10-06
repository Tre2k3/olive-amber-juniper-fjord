import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:8080/game/people/k-blanco-hq-cutout.png");
const result = await page.evaluate(async () => {
  const img = new Image();
  img.src = "/game/people/k-blanco-hq-cutout.png?v=2";
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
  const glow = (i) => {
    if (px[i + 3] < 8) return false;
    const r = px[i], gg = px[i + 1], b = px[i + 2];
    const max = Math.max(r, gg, b);
    const min = Math.min(r, gg, b);
    if (max < 28) return false;
    if (r > 150 && gg > 80) return false;
    return max < 145 && max - min < 70 && b < r;
  };
  let peeled = 0;
  for (let pass = 0; pass < 28; pass++) {
    const kill = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const id = y * w + x;
        const i = id * 4;
        if (!glow(i)) continue;
        const n =
          px[((id - 1) * 4) + 3] < 8 ||
          px[((id + 1) * 4) + 3] < 8 ||
          px[((id - w) * 4) + 3] < 8 ||
          px[((id + w) * 4) + 3] < 8;
        if (n) kill.push(i);
      }
    }
    if (!kill.length) break;
    for (const i of kill) {
      px[i + 3] = 0;
      peeled++;
    }
  }
  g.putImageData(image, 0, 0);
  return { peeled, out: c.toDataURL("image/png") };
});
writeFileSync("/workspace/public/game/people/k-blanco-hq-cutout.png", Buffer.from(result.out.split(",")[1], "base64"));
console.log({ peeled: result.peeled });
await browser.close();
