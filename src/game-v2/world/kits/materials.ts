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

export function surface(url: string, sx: number, sy: number, roughness: number, color = 0xffffff, ox = 0, oy = 0) {
  const map = new THREE.TextureLoader().load(url);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(sx, sy);
  map.offset.set(ox, oy);
  map.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map, color, roughness, metalness: 0.02 });
}

export function brick() {
  if (brickMat) return brickMat;
  brickMat = surface("/game-v2/materials/brick.jpg", 2.4, 1.8, 0.86, 0xffc8b0);
  return brickMat;
}

let asphaltMat: THREE.MeshStandardMaterial | null = null;

export function asphalt() {
  if (asphaltMat) return asphaltMat;
  asphaltMat = surface("/game-v2/materials/asphalt.jpg", 8, 4, 0.95);
  return asphaltMat;
}

export function concreteSlab(seed: number) {
  const key = Math.abs(seed) % 4;
  const hit = concreteCache.get(key);
  if (hit) return hit;
  const mat = surface("/game-v2/materials/sidewalk.jpg", 0.5, 0.5, 0.94, 0xffffff, (key % 2) * 0.5, Math.floor(key / 2) * 0.5);
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
