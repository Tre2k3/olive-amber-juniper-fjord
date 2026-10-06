import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--no-sandbox"],
});
const page = await browser.newPage();
await page.goto("http://127.0.0.1:8080/game/people/k-blanco-hq-cutout.png");
const result = await page.evaluate(async () => {
  const img = new Image();
  img.src = "/game/people/k-blanco-hq-cutout.png";
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const { width: w, height: h } = c;
  const data = g.getImageData(0, 0, w, h);
  const px = data.data;
  let minX = w, minY = h, maxX = 0, maxY = 0, n = 0, alpha = 0;
  for (let y = Math.floor(h * 0.18); y < Math.floor(h * 0.38); y++) {
    for (let x = Math.floor(w * 0.38); x < Math.floor(w * 0.62); x++) {
      const i = (y * w + x) * 4;
      if (px[i + 3] > 10) alpha++;
      const r = px[i], gg = px[i + 1], b = px[i + 2];
      if (r > 170 && gg > 120 && b < 90 && r > gg && gg > b + 20) {
        n++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (n > 40) {
    const pad = 6;
    const x0 = Math.max(0, minX - pad);
    const y0 = Math.max(0, minY - pad);
    const x1 = Math.min(w - 1, maxX + pad);
    const y1 = Math.min(h - 1, maxY + pad);
    let sr = 0, sg = 0, sb = 0, sn = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = (y * w + x) * 4;
        const r = px[i], gg = px[i + 1], b = px[i + 2];
        const gold = r > 170 && gg > 120 && b < 90;
        if (!gold && r > 90 && r < 190 && gg > 50 && b > 30 && r > b) {
          sr += r; sg += gg; sb += b; sn++;
        }
      }
    }
    const skin = sn ? [sr / sn, sg / sn, sb / sn] : [176, 112, 72];
    g.fillStyle = `rgb(${skin[0] | 0},${skin[1] | 0},${skin[2] | 0})`;
    g.beginPath();
    g.ellipse((minX + maxX) / 2, (minY + maxY) / 2, (maxX - minX) / 2 + 4, (maxY - minY) / 2 + 4, 0, 0, Math.PI * 2);
    g.fill();
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2 + 4;
    const size = Math.max(36, Math.min(78, (maxY - minY) * 1.15));
    g.font = `700 ${size}px Georgia, "Times New Roman", serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = Math.max(3, size * 0.08);
    g.strokeStyle = "#3a2a08";
    g.strokeText("K", cx, cy);
    g.fillStyle = "#e6c14a";
    g.fillText("K", cx, cy);
  }
  const out = c.toDataURL("image/png");
  return { w, h, n, minX, minY, maxX, maxY, alpha, out };
});
const b64 = result.out.split(",")[1];
writeFileSync("/workspace/public/game/people/k-blanco-hq-cutout.png", Buffer.from(b64, "base64"));
console.log(JSON.stringify({ ...result, out: undefined }));
await browser.close();
