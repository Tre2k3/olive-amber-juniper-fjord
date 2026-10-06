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

const sidingCache = new Map<string, THREE.MeshStandardMaterial>();
const shingleCache = new Map<string, THREE.MeshStandardMaterial>();
const concreteCache = new Map<number, THREE.MeshStandardMaterial>();

let roughTex: THREE.Texture | null = null;

function roughnessTex() {
  if (roughTex) return roughTex;
  roughTex = canvasTex((g, w, h) => {
    g.fillStyle = "#b4b4b4";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 180; i++) {
      const v = 96 + ((i * 17) % 70);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect((i * 29) % w, (i * 13) % h, 10, 4);
    }
  }, 128, 128, true);
  return roughTex;
}

export function siding(hex: string) {
  const hit = sidingCache.get(hex);
  if (hit) return hit;
  const map = canvasTex((g, w, h) => {
    g.fillStyle = hex;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 14) {
      g.fillStyle = "rgba(0,0,0,0.22)";
      g.fillRect(0, y, w, 2);
      g.fillStyle = "rgba(255,255,255,0.12)";
      g.fillRect(0, y + 2, w, 1);
    }
    g.fillStyle = "rgba(80,50,30,0.06)";
    for (let i = 0; i < 28; i++) g.fillRect((i * 37) % w, (i * 19) % h, 22, 2);
  }, 256, 256, true);
  map.repeat.set(2.2, 2.4);
  const rough = roughnessTex();
  const mat = new THREE.MeshStandardMaterial({ map, roughnessMap: rough, roughness: 0.84, metalness: 0 });
  sidingCache.set(hex, mat);
  return mat;
}

export function shingle(hex: string) {
  const hit = shingleCache.get(hex);
  if (hit) return hit;
  const map = canvasTex((g, w, h) => {
    g.fillStyle = hex;
    g.fillRect(0, 0, w, h);
    const rowH = 22;
    for (let y = 0; y < h; y += rowH) {
      const off = (y / rowH) % 2 ? 18 : 0;
      for (let x = -40 + off; x < w; x += 36) {
        const n = Math.abs((x + y) % 18);
        g.fillStyle = `rgba(${40 + n},${28 + (n % 8)},${18},0.28)`;
        g.fillRect(x + 1, y + 1, 33, rowH - 3);
        g.strokeStyle = "rgba(20,12,8,0.55)";
        g.strokeRect(x, y, 36, rowH);
      }
    }
  }, 256, 256, true);
  map.repeat.set(3.4, 2.6);
  const rough = roughnessTex();
  const mat = new THREE.MeshStandardMaterial({ map, roughnessMap: rough, roughness: 0.92, metalness: 0.02 });
  shingleCache.set(hex, mat);
  return mat;
}

let brickMat: THREE.MeshStandardMaterial | null = null;

export function brick() {
  if (brickMat) return brickMat;
  const map = canvasTex((g, w, h) => {
    g.fillStyle = "#cbb8aa";
    g.fillRect(0, 0, w, h);
    const bw = 40;
    const bh = 16;
    const gap = 4;
    for (let row = 0; row * (bh + gap) < h; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let x = -bw + off; x < w; x += bw + gap) {
        const n = Math.abs((row * 5 + x) % 22);
        g.fillStyle = `rgb(${132 + n},${58 + (n % 8)},${42 + (n % 6)})`;
        g.fillRect(x, row * (bh + gap), bw, bh);
      }
    }
  }, 256, 256, true);
  map.repeat.set(2.4, 1.6);
  const rough = roughnessTex();
  brickMat = new THREE.MeshStandardMaterial({ map, roughnessMap: rough, roughness: 0.88, metalness: 0.02 });
  return brickMat;
}

let asphaltMat: THREE.MeshStandardMaterial | null = null;

export function asphalt() {
  if (asphaltMat) return asphaltMat;
  const map = canvasTex((g, w, h) => {
    g.fillStyle = "#3a3e44";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) {
      const s = 42 + ((i * 13) % 26);
      g.fillStyle = `rgb(${s},${s + 2},${s + 4})`;
      g.fillRect((i * 47) % w, (i * 29) % h, i % 7 === 0 ? 5 : 2, 2);
    }
    g.fillStyle = "rgba(28,30,34,0.4)";
    g.fillRect(40, 300, 90, 22);
    g.strokeStyle = "rgba(20,20,22,0.4)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(20, 220);
    g.lineTo(140, 200);
    g.stroke();
  }, 256, 256, true);
  map.repeat.set(6, 3);
  asphaltMat = new THREE.MeshStandardMaterial({ map, roughness: 0.94, metalness: 0.02 });
  return asphaltMat;
}

export function concreteSlab(seed: number) {
  const key = Math.abs(seed) % 6;
  const hit = concreteCache.get(key);
  if (hit) return hit;
  const map = canvasTex((g, w, h) => {
    const n = key * 3;
    g.fillStyle = `rgb(${178 + n},${174 + n},${166 + n})`;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(90,80,70,0.4)";
    g.strokeRect(2, 2, w - 4, h - 4);
    if (key % 3 === 0) {
      g.strokeStyle = "rgba(60,50,40,0.4)";
      g.beginPath();
      g.moveTo(16, 24);
      g.lineTo(w * 0.62, h * 0.78);
      g.stroke();
    }
    g.fillStyle = "rgba(80,70,60,0.18)";
    for (let i = 0; i < 16; i++) g.fillRect((i * 19 + key) % w, (i * 11) % h, 6, 2);
  }, 128, 128);
  const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.96 });
  concreteCache.set(key, mat);
  return mat;
}

let grassMat: THREE.MeshStandardMaterial | null = null;
let mulchMat: THREE.MeshStandardMaterial | null = null;
let barkMat: THREE.MeshStandardMaterial | null = null;

export function grass() {
  if (grassMat) return grassMat;
  const map = canvasTex((g, w, h) => {
    g.fillStyle = "#3d7438";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#356432";
    g.fillRect(0, h * 0.42, w, h * 0.16);
    for (let i = 0; i < 2200; i++) {
      g.fillStyle = i % 3 === 0 ? "#2c5a2a" : i % 3 === 1 ? "#4c8642" : "#356832";
      g.fillRect((i * 53) % w, (i * 29) % h, 2, 3);
    }
    g.fillStyle = "rgba(90,70,30,0.18)";
    g.fillRect(18, 40, 28, 14);
    g.fillRect(80, 90, 22, 10);
  }, 128, 128, true);
  map.repeat.set(14, 10);
  grassMat = new THREE.MeshStandardMaterial({ map, roughness: 1 });
  return grassMat;
}

export function mulch() {
  if (mulchMat) return mulchMat;
  const map = canvasTex((g, w, h) => {
    g.fillStyle = "#5a3a28";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      g.fillStyle = i % 2 ? "#3e2618" : "#7a5136";
      g.fillRect((i * 17) % w, (i * 13) % h, 8, 3);
    }
  }, 128, 128, true);
  map.repeat.set(2, 1);
  mulchMat = new THREE.MeshStandardMaterial({ map, roughness: 1 });
  return mulchMat;
}

export function bark() {
  if (barkMat) return barkMat;
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
  barkMat = new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
  return barkMat;
}

export const trim = new THREE.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.6 });
export const soil = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 1 });
export const curb = new THREE.MeshStandardMaterial({ color: 0x8d8880, roughness: 0.92 });
export const gutter = new THREE.MeshStandardMaterial({ color: 0x2a2e32, roughness: 0.9 });
