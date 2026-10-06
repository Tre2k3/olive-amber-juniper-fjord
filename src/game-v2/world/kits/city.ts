import * as THREE from "three";
import type { Solid } from "../../core/types";
import { addGround } from "../ground";
import { asphalt, brick, concreteSlab } from "./materials";
import { streetlight } from "./props";
import { streetTree } from "./trees";
import { carBody } from "./vehicles";

const metal = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.42, metalness: 0.55 });
const glass = new THREE.MeshStandardMaterial({
  color: 0xd5e6f2,
  roughness: 0.06,
  metalness: 0.35,
  transparent: true,
  opacity: 0.45,
  emissive: 0xffc98a,
  emissiveIntensity: 0.22,
});
const interior = new THREE.MeshStandardMaterial({
  color: 0xffe0b8,
  emissive: 0xffb15a,
  emissiveIntensity: 0.55,
  roughness: 0.55,
});
const stone = new THREE.MeshStandardMaterial({ color: 0xc4b8a4, roughness: 0.86 });
const recess = new THREE.MeshStandardMaterial({ color: 0x14110e, roughness: 0.92 });
const bulk = new THREE.MeshStandardMaterial({ color: 0x241c18, roughness: 0.8 });
const plasterCache = new Map<string, THREE.MeshStandardMaterial>();

function plaster(hex: string) {
  const hit = plasterCache.get(hex);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = hex;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4200; i++) {
    const v = 255 - ((i * 17) % 40);
    g.fillStyle = `rgba(${v},${v},${v},0.05)`;
    g.fillRect((i * 13) % 256, (i * 29) % 256, 4, 3);
  }
  g.strokeStyle = "rgba(60,40,20,0.12)";
  g.lineWidth = 1;
  for (let y = 42; y < 256; y += 42) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(256, y);
    g.stroke();
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2.4, 3.2);
  const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.9, metalness: 0 });
  plasterCache.set(hex, mat);
  return mat;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, parent: THREE.Object3D) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function signMat(title: string, color: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const g = c.getContext("2d")!;
  g.fillStyle = "#14120f";
  g.fillRect(0, 0, 512, 160);
  g.fillStyle = color;
  g.fillRect(0, 0, 512, 8);
  g.fillRect(0, 152, 512, 8);
  g.font = "700 72px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(title, 256, 84);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map,
    emissive: 0xffe0b0,
    emissiveMap: map,
    emissiveIntensity: 0.45,
    roughness: 0.4,
  });
}

export type Storefront = {
  x: number;
  z: number;
  w: number;
  d: number;
  floors: number;
  /** +1 front faces +Z, -1 front faces -Z. */
  face: 1 | -1;
  wall?: string;
  awning: number;
  name: string;
  ink?: string;
};

function punched(parent: THREE.Object3D, x: number, y: number, z: number, face: 1 | -1, w: number, h: number, lit: boolean) {
  const out = (n: number) => z + face * n;
  box(w + 0.16, 0.08, 0.22, x, y - h / 2 - 0.02, out(0.1), stone, parent);
  box(w + 0.1, 0.07, 0.14, x, y + h / 2 + 0.02, out(0.08), stone, parent);
  box(w + 0.12, h + 0.1, 0.08, x, y, out(0.05), metal, parent);
  box(w, h, 0.18, x, y, out(0.02), recess, parent);
  box(w - 0.1, h - 0.14, 0.04, x, y, out(0.1), lit ? interior : glass, parent);
  box(0.045, h - 0.1, 0.05, x, y, out(0.12), metal, parent);
}

/** Mid-rise storefront. Recessed windows, bulkhead, cornice, and a set-back crown. */
export function storefront(
  parent: THREE.Object3D,
  solids: Solid[],
  glow: THREE.MeshStandardMaterial[],
  spec: Storefront,
) {
  const floors = Math.max(2, Math.min(8, spec.floors));
  const ground = 3.45;
  const story = 2.65;
  const crown = floors >= 5;
  const bodyFloors = crown ? floors - 1 : floors;
  const bodyH = ground + (bodyFloors - 1) * story + 0.45;
  const wall = spec.wall ? plaster(spec.wall) : brick();
  const face = spec.face;
  const front = spec.z + face * (spec.d / 2);
  const out = (n: number) => front + face * n;

  box(spec.w, bodyH, spec.d, spec.x, bodyH / 2, spec.z, wall, parent);
  box(spec.w + 0.08, 0.72, 0.2, spec.x, 0.36, out(0.06), stone, parent);
  for (const px of [-spec.w / 2 + 0.18, spec.w / 2 - 0.18]) {
    box(0.32, bodyH, 0.28, spec.x + px, bodyH / 2, out(0.08), stone, parent);
  }
  box(spec.w + 0.4, 0.1, spec.d + 0.28, spec.x, bodyH - 0.28, spec.z, stone, parent);
  box(spec.w + 0.22, 0.14, spec.d + 0.16, spec.x, bodyH - 0.12, spec.z, metal, parent);
  box(spec.w + 0.06, 0.36, spec.d + 0.06, spec.x, bodyH + 0.12, spec.z, wall, parent);
  for (let i = 0; i < Math.floor(spec.w / 0.55); i++) {
    box(0.08, 0.1, 0.12, spec.x - spec.w / 2 + 0.4 + i * 0.55, bodyH - 0.22, out(0.16), stone, parent);
  }

  const bay = Math.min(spec.w - 1.6, Math.max(3.4, spec.w * 0.62));
  const doorW = 1.15;
  const shopW = bay - doorW - 0.25;
  const shopX = spec.x - doorW * 0.55;
  box(shopW, 0.62, 0.1, shopX, 0.4, out(0.08), bulk, parent);
  box(shopW, 1.7, 0.08, shopX, 1.6, out(0.05), recess, parent);
  box(shopW - 0.12, 1.5, 0.04, shopX, 1.6, out(0.12), interior, parent);
  const mullions = Math.max(2, Math.round(shopW / 1.15));
  for (let i = 0; i <= mullions; i++) {
    box(0.055, 1.55, 0.06, shopX - shopW / 2 + (shopW * i) / mullions, 1.6, out(0.14), metal, parent);
  }
  box(shopW, 0.06, 0.06, shopX, 1.6, out(0.15), metal, parent);
  box(shopW, 0.28, 0.06, shopX, 2.55, out(0.1), glass, parent);
  const doorX = spec.x + bay / 2 - doorW / 2;
  box(doorW, 2.2, 0.1, doorX, 1.18, out(0.08), metal, parent);
  box(doorW - 0.18, 1.05, 0.04, doorX, 1.55, out(0.16), glass, parent);
  box(doorW - 0.18, 0.42, 0.04, doorX, 0.42, out(0.14), bulk, parent);
  box(0.06, 0.14, 0.05, doorX + doorW * 0.28, 1.12, out(0.18), metal, parent);

  const awningMat = new THREE.MeshStandardMaterial({ color: spec.awning, roughness: 0.7 });
  box(bay + 0.4, 0.07, 1.15, spec.x, 2.92, out(0.62), awningMat, parent);
  box(bay + 0.4, 0.32, 0.06, spec.x, 2.7, out(1.12), awningMat, parent);
  for (let i = 0; i < 4; i++) {
    const x = spec.x - bay / 2 + (bay * (i + 0.5)) / 4;
    box(0.04, 0.22, 0.04, x, 2.78, out(0.35), metal, parent);
  }

  const mat = signMat(spec.name, spec.ink ?? "#f4efe4");
  glow.push(mat);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(bay, 4.6), 0.62), mat);
  board.position.set(spec.x, 3.28, out(0.18));
  if (face < 0) board.rotation.y = Math.PI;
  parent.add(board);

  const cols = Math.max(2, Math.floor((spec.w - 1.4) / 1.9));
  for (let f = 1; f < bodyFloors; f++) {
    const y = ground + (f - 1) * story + story * 0.42;
    for (let i = 0; i < cols; i++) {
      const x = spec.x - spec.w / 2 + 1.05 + ((spec.w - 2.1) * (i + 0.5)) / cols;
      const wide = f % 2 === 0 && i % 2 === 0;
      punched(parent, x, y, front, face, wide ? 1.15 : 0.78, 1.25, (f + i) % 3 !== 0);
    }
  }

  for (let f = 1; f < bodyFloors; f += 2) {
    const y = ground + (f - 1) * story + story * 0.42;
    for (const dir of [-1, 1] as const) {
      const x = spec.x + dir * (spec.w / 2);
      const z = spec.z;
      box(0.08, 1.2, 0.9, x + dir * 0.04, y, z, metal, parent);
      box(0.05, 1.0, 0.7, x + dir * 0.08, y, z, f % 4 === 1 ? interior : glass, parent);
    }
  }
  if (floors >= 4 && Math.round(spec.x) % 2 === 0) {
    for (let f = 1; f < Math.min(bodyFloors, 4); f++) {
      const y = ground + (f - 1) * story + 0.15;
      box(spec.w * 0.55, 0.06, 0.7, spec.x, y, out(0.42), metal, parent);
      box(spec.w * 0.55, 0.45, 0.04, spec.x, y + 0.28, out(0.74), metal, parent);
    }
    box(0.08, bodyH * 0.55, 0.08, spec.x - spec.w * 0.22, bodyH * 0.32, out(0.5), metal, parent);
  }
  box(0.07, bodyH * 0.7, 0.07, spec.x + spec.w / 2 - 0.28, bodyH * 0.35, out(0.2), metal, parent);

  if (crown) {
    const sw = spec.w * 0.68;
    const sd = spec.d * 0.72;
    const ch = story + 0.35;
    box(sw, ch, sd, spec.x, bodyH + ch / 2, spec.z - face * 0.3, wall, parent);
    box(sw + 0.16, 0.12, sd + 0.14, spec.x, bodyH + ch - 0.06, spec.z - face * 0.3, metal, parent);
    const crownFront = spec.z - face * 0.3 + face * (sd / 2);
    punched(parent, spec.x - sw * 0.22, bodyH + ch * 0.48, crownFront, face, 0.7, 1.05, true);
    punched(parent, spec.x + sw * 0.22, bodyH + ch * 0.48, crownFront, face, 0.7, 1.05, false);
    box(1.2, 0.55, 0.9, spec.x + sw * 0.15, bodyH + ch + 0.22, spec.z, metal, parent);
  }

  solids.push({
    minX: spec.x - spec.w / 2,
    maxX: spec.x + spec.w / 2,
    minZ: spec.z - spec.d / 2,
    maxZ: spec.z + spec.d / 2,
  });
}

function slabs(parent: THREE.Object3D, z: number, x0: number, x1: number) {
  const depth = 2.2;
  addGround({ minX: x0, maxX: x1, minZ: z - depth / 2, maxZ: z + depth / 2, y: 0.17 });
  for (let x = x0; x < x1; x += 1.55) {
    box(1.45, 0.1, depth, x + 0.72, 0.12, z, concreteSlab(Math.round(x + z)), parent);
  }
}

/** Riverfront street south of the court, plus the east end of 901 Ave. */
export function buildDowntown(
  parent: THREE.Object3D,
  solids: Solid[],
  glow: THREE.MeshStandardMaterial[],
  lamps: THREE.PointLight[],
) {
  const road = asphalt();
  const eastWestZ = -54;
  box(84, 0.06, 8.2, 42, 0.03, eastWestZ, road, parent);
  addGround({ minX: 0, maxX: 84, minZ: eastWestZ - 4.1, maxZ: eastWestZ + 4.1, y: 0.06 });
  slabs(parent, eastWestZ + 6.2, 2, 80);
  box(78, 0.16, 0.28, 42, 0.08, eastWestZ + 4.35, stone, parent);

  box(9.1, 0.06, 30, 8, 0.03, -40, road, parent);
  addGround({ minX: 3.45, maxX: 12.55, minZ: -55, maxZ: -25, y: 0.06 });
  addGround({ minX: 12.7, maxX: 14.8, minZ: -52, maxZ: -28, y: 0.17 });
  for (let z = -52; z < -28; z += 1.55) box(2.1, 0.1, 1.45, 13.7, 0.12, z + 0.7, concreteSlab(Math.round(z)), parent);
  for (let i = 0; i < 6; i++) {
    box(0.85, 0.02, 0.16, 4.6 + i * 1.05, 0.08, eastWestZ + 3.6, metal, parent);
  }

  const row: Storefront[] = [
    { x: 22, z: -42.6, w: 8.4, d: 7.2, floors: 3, face: -1, awning: 0xc4473a, name: "BLUFF", ink: "#f4efe4" },
    { x: 32.2, z: -42.2, w: 10.2, d: 7.6, floors: 6, face: -1, wall: "#e7d7c4", awning: 0x1c1c1c, name: "DELTA", ink: "#e0b33a" },
    { x: 43.4, z: -42.8, w: 9.2, d: 7.2, floors: 2, face: -1, awning: 0x2f6a4a, name: "SOUL", ink: "#f4efe4" },
    { x: 54, z: -42.2, w: 11, d: 8, floors: 8, face: -1, wall: "#d9c3a4", awning: 0xe0b33a, name: "BEALE", ink: "#1a1208" },
    { x: 66.2, z: -42.4, w: 8.6, d: 7.4, floors: 4, face: -1, awning: 0x8e2438, name: "WAX", ink: "#f4efe4" },
    { x: 96, z: 11.7, w: 9.4, d: 7.4, floors: 3, face: -1, wall: "#efe4cf", awning: 0xc4473a, name: "CROWN", ink: "#f4efe4" },
    { x: 107.2, z: 11.9, w: 11.2, d: 7.8, floors: 6, face: -1, awning: 0x1a1a1a, name: "901", ink: "#e0b33a" },
    { x: 118.4, z: 11.6, w: 8.8, d: 7.2, floors: 4, face: -1, wall: "#d5ddd6", awning: 0x2f6a4a, name: "LAMP", ink: "#f4efe4" },
    { x: 112, z: -11.6, w: 10, d: 7.2, floors: 5, face: 1, awning: 0xe0b33a, name: "RIVER", ink: "#1a1208" },
    { x: 123, z: -11.5, w: 8.4, d: 7, floors: 3, face: 1, wall: "#e4d2b8", awning: 0x8e2438, name: "HORN", ink: "#f4efe4" },
  ];
  for (const spec of row) storefront(parent, solids, glow, spec);

  streetTree(16, eastWestZ + 6.35, parent, 0.85);
  streetTree(48, eastWestZ + 6.45, parent, 0.9);
  streetTree(74, eastWestZ + 6.3, parent, 0.8);
  for (const x of [16, 38, 58, 74]) streetlight(x, eastWestZ + 6.5, parent, lamps);
  for (const x of [92, 110, 124]) streetlight(x, 8.4, parent, lamps);
  streetlight(108, -8.6, parent, lamps);

  const parked: [number, number, number, "sedan" | "suv"][] = [
    [18, eastWestZ + 1.7, Math.PI / 2, "sedan"],
    [60, eastWestZ + 1.7, Math.PI / 2, "suv"],
  ];
  for (const [x, z, yaw, kind] of parked) {
    const car = carBody(kind);
    car.position.set(x, 0.02, z);
    car.rotation.y = yaw;
    parent.add(car);
    solids.push({ minX: x - 2.4, maxX: x + 2.4, minZ: z - 1.1, maxZ: z + 1.1 });
  }
}

/** Cornice and awning on a building that is still a plain mass. No second sign. */
export function dressFront(
  parent: THREE.Object3D,
  _glow: THREE.MeshStandardMaterial[],
  x: number,
  frontZ: number,
  face: 1 | -1,
  width: number,
  wallTop: number,
  _name: string,
  awningColor: number,
) {
  const out = (n: number) => frontZ + face * n;
  box(width + 0.3, 0.16, 0.32, x, wallTop + 0.02, out(0.14), stone, parent);
  box(width + 0.12, 0.1, 0.18, x, wallTop + 0.16, out(0.08), metal, parent);
  const awning = new THREE.MeshStandardMaterial({ color: awningColor, roughness: 0.7 });
  const bay = Math.min(width - 1, 6.4);
  box(bay, 0.08, 1.05, x, 2.7, out(0.6), awning, parent);
  box(bay, 0.24, 0.06, x, 2.52, out(1.08), awning, parent);
  if (wallTop > 4.2) {
    punched(parent, x - width * 0.28, wallTop * 0.62, frontZ, face, 1.05, 1.2, true);
    punched(parent, x + width * 0.28, wallTop * 0.62, frontZ, face, 1.05, 1.2, false);
  }
}
