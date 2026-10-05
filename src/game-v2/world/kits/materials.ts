import * as THREE from "three";

export function canvasTex(
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  w: number,
  h: number,
  repeat = false,
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  return tex;
}

function std(map: THREE.Texture, roughness: number, metalness = 0) {
  return new THREE.MeshStandardMaterial({ map, roughness, metalness });
}

export function siding(hex: string) {
  const map = canvasTex((g, w, h) => {
    g.fillStyle = hex;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 10) {
      g.fillStyle = "rgba(0,0,0,0.14)";
      g.fillRect(0, y, w, 2);
      g.fillStyle = "rgba(255,255,255,0.08)";
      g.fillRect(0, y + 2, w, 1);
    }
    g.fillStyle = "rgba(80,50,30,0.08)";
    for (let i = 0; i < 40; i++) g.fillRect((i * 37) % w, (i * 19) % h, 18, 3);
  }, 256, 256, true);
  map.repeat.set(2.2, 1.4);
  return std(map, 0.86);
}

export function shingle(hex: string) {
  const map = canvasTex((g, w, h) => {
    g.fillStyle = hex;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(0,0,0,0.35)";
    g.lineWidth = 2;
    const rowH = 18;
    for (let y = 0; y < h; y += rowH) {
      const off = (y / rowH) % 2 ? 16 : 0;
      for (let x = -32 + off; x < w; x += 32) {
        g.strokeRect(x, y, 32, rowH);
        g.fillStyle = y % 36 === 0 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
        g.fillRect(x + 2, y + 2, 28, rowH - 4);
      }
    }
  }, 256, 256, true);
  map.repeat.set(3, 2);
  return std(map, 0.92);
}

export function asphalt() {
  const map = canvasTex((g, w, h) => {
    g.fillStyle = "#3a3e44";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const s = 42 + ((i * 13) % 30);
      g.fillStyle = `rgb(${s},${s + 2},${s + 4})`;
      g.fillRect((i * 47) % w, (i * 29) % h, i % 7 === 0 ? 6 : 2, 2);
    }
    g.fillStyle = "rgba(70,74,80,0.55)";
    g.beginPath();
    g.ellipse(180, 140, 90, 40, 0.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(28,30,34,0.45)";
    g.fillRect(40, 300, 120, 36);
    g.strokeStyle = "rgba(20,20,22,0.55)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(20, 220);
    g.lineTo(140, 200);
    g.lineTo(210, 250);
    g.stroke();
  }, 512, 512, true);
  map.repeat.set(8, 3);
  return std(map, 0.94, 0.04);
}

export function concreteSlab(seed: number) {
  const map = canvasTex((g, w, h) => {
    const n = (seed % 5) * 4;
    g.fillStyle = `rgb(${186 + n},${181 + n},${170 + n})`;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(90,80,70,0.35)";
    g.strokeRect(3, 3, w - 6, h - 6);
    if (seed % 4 === 0) {
      g.strokeStyle = "rgba(60,50,40,0.45)";
      g.beginPath();
      g.moveTo(20, 30);
      g.lineTo(w * 0.7, h * 0.8);
      g.stroke();
    }
    g.fillStyle = "rgba(255,255,255,0.15)";
    for (let i = 0; i < 30; i++) g.fillRect((i * 19 + seed) % w, (i * 11) % h, 4, 2);
  }, 128, 128);
  return std(map, 0.95);
}

export function grass() {
  const map = canvasTex((g, w, h) => {
    g.fillStyle = "#3c7436";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = i % 3 === 0 ? "#2d5c2c" : i % 3 === 1 ? "#4d8744" : "#356b32";
      g.fillRect((i * 53) % w, (i * 29) % h, 2, 3);
    }
  }, 256, 256, true);
  map.repeat.set(18, 12);
  return std(map, 1);
}

export function mulch() {
  const map = canvasTex((g, w, h) => {
    g.fillStyle = "#5a3a28";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) {
      g.fillStyle = i % 2 ? "#3e2618" : "#7a5136";
      g.fillRect((i * 17) % w, (i * 13) % h, 8, 3);
    }
  }, 128, 128, true);
  map.repeat.set(2, 1);
  return std(map, 1);
}

export function bark() {
  const map = canvasTex((g, w, h) => {
    g.fillStyle = "#5c4030";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(30,18,10,0.55)";
    g.lineWidth = 3;
    for (let x = 4; x < w; x += 14) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + 4, h);
      g.stroke();
    }
  }, 64, 128, true);
  return std(map, 0.95);
}

export const trim = new THREE.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.6 });
export const soil = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 1 });
export const curb = new THREE.MeshStandardMaterial({ color: 0x8d8880, roughness: 0.92 });
export const gutter = new THREE.MeshStandardMaterial({ color: 0x2a2e32, roughness: 0.9 });
