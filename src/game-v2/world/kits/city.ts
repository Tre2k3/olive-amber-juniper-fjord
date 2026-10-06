import * as THREE from "three";
import type { Solid } from "../../core/types";
import { addGround } from "../ground";
import { asphalt, brick, concreteSlab, siding } from "./materials";
import { streetlight } from "./props";
import { carBody } from "./vehicles";

const metal = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.42, metalness: 0.55 });
const glass = new THREE.MeshStandardMaterial({
  color: 0xc5d5e2,
  roughness: 0.08,
  metalness: 0.2,
  transparent: true,
  opacity: 0.38,
  emissive: 0xffc98a,
  emissiveIntensity: 0.18,
});
const interior = new THREE.MeshStandardMaterial({
  color: 0xffd7a4,
  emissive: 0xffb15a,
  emissiveIntensity: 0.42,
  roughness: 0.6,
});
const stone = new THREE.MeshStandardMaterial({ color: 0x8a847a, roughness: 0.9 });

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

/** Mid-rise storefront. Mass, cornice, awning, glass, and punched windows. Not a textured box. */
export function storefront(
  parent: THREE.Object3D,
  solids: Solid[],
  glow: THREE.MeshStandardMaterial[],
  spec: Storefront,
) {
  const floors = Math.max(2, Math.min(6, spec.floors));
  const ground = 3.35;
  const story = 2.7;
  const h = ground + (floors - 1) * story + 0.7;
  const wall = spec.wall ? siding(spec.wall) : brick();
  const face = spec.face;
  const front = spec.z + face * (spec.d / 2);
  const out = (n: number) => front + face * n;

  box(spec.w, h, spec.d, spec.x, h / 2, spec.z, wall, parent);
  box(spec.w + 0.28, 0.28, spec.d + 0.22, spec.x, h - 0.18, spec.z, metal, parent);
  box(spec.w + 0.08, 0.16, 0.22, spec.x, ground, out(0.02), stone, parent);
  box(spec.w, 0.42, 0.18, spec.x, 0.21, out(0.02), stone, parent);
  for (const px of [-spec.w / 2 + 0.16, spec.w / 2 - 0.16]) {
    box(0.28, h, 0.22, spec.x + px, h / 2, out(0.06), stone, parent);
  }

  const bay = Math.min(spec.w - 1.4, Math.max(3.2, spec.w * 0.62));
  const doorW = 1.15;
  const shopW = bay - doorW - 0.2;
  const shopX = spec.x - doorW / 2 - 0.08;
  box(shopW, 2.35, 0.06, shopX, 1.55, out(0.04), interior, parent);
  box(shopW - 0.08, 2.2, 0.04, shopX, 1.55, out(0.1), glass, parent);
  const mullions = Math.max(1, Math.round(shopW / 1.3));
  for (let i = 1; i < mullions; i++) {
    box(0.05, 2.2, 0.06, shopX - shopW / 2 + (shopW * i) / mullions, 1.55, out(0.12), metal, parent);
  }
  const doorX = spec.x + bay / 2 - doorW / 2;
  box(doorW, 2.25, 0.08, doorX, 1.2, out(0.08), metal, parent);
  box(doorW - 0.16, 1.15, 0.04, doorX, 1.55, out(0.14), glass, parent);
  box(0.08, 0.16, 0.06, doorX + doorW * 0.28, 1.15, out(0.16), metal, parent);

  const awning = new THREE.MeshStandardMaterial({ color: spec.awning, roughness: 0.72 });
  box(bay + 0.3, 0.08, 1.05, spec.x, 2.72, out(0.58), awning, parent);
  box(bay + 0.3, 0.28, 0.06, spec.x, 2.52, out(1.05), awning, parent);

  const mat = signMat(spec.name, spec.ink ?? "#f4efe4");
  glow.push(mat);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(bay, 4.4), 0.7), mat);
  board.position.set(spec.x, 3.15, out(0.16));
  if (face < 0) board.rotation.y = Math.PI;
  parent.add(board);

  const cols = Math.max(2, Math.floor((spec.w - 1.2) / 2.15));
  for (let f = 1; f < floors; f++) {
    const y = ground + (f - 1) * story + story * 0.55;
    box(spec.w - 0.8, 0.08, 0.12, spec.x, y - 0.55, out(0.08), stone, parent);
    for (let i = 0; i < cols; i++) {
      const x = spec.x - spec.w / 2 + 0.9 + ((spec.w - 1.8) * (i + 0.5)) / cols;
      box(0.85, 1.15, 0.06, x, y, out(0.05), metal, parent);
      box(0.7, 0.95, 0.04, x, y, out(0.1), f % 2 ? glass : interior, parent);
    }
  }
  if (floors >= 4) box(1.4, 0.7, 1.1, spec.x + spec.w * 0.22, h + 0.28, spec.z, metal, parent);
  box(0.08, h * 0.72, 0.08, spec.x + spec.w / 2 - 0.22, h * 0.36, out(0.18), metal, parent);

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
    { x: 32.2, z: -42.2, w: 10.2, d: 7.6, floors: 5, face: -1, wall: "#e7d7c4", awning: 0x1c1c1c, name: "DELTA", ink: "#e0b33a" },
    { x: 43.4, z: -42.8, w: 9.2, d: 7.2, floors: 2, face: -1, awning: 0x2f6a4a, name: "SOUL", ink: "#f4efe4" },
    { x: 54, z: -42.2, w: 11, d: 8, floors: 6, face: -1, wall: "#d9c3a4", awning: 0xe0b33a, name: "BEALE", ink: "#1a1208" },
    { x: 66.2, z: -42.4, w: 8.6, d: 7.4, floors: 4, face: -1, awning: 0x8e2438, name: "WAX", ink: "#f4efe4" },
    { x: 96, z: 11.7, w: 9.4, d: 7.4, floors: 3, face: -1, wall: "#efe4cf", awning: 0xc4473a, name: "CROWN", ink: "#f4efe4" },
    { x: 107.2, z: 11.9, w: 11.2, d: 7.8, floors: 5, face: -1, awning: 0x1a1a1a, name: "901", ink: "#e0b33a" },
    { x: 118.4, z: 11.6, w: 8.8, d: 7.2, floors: 4, face: -1, wall: "#d5ddd6", awning: 0x2f6a4a, name: "LAMP", ink: "#f4efe4" },
    { x: 112, z: -11.6, w: 10, d: 7.2, floors: 4, face: 1, awning: 0xe0b33a, name: "RIVER", ink: "#1a1208" },
    { x: 123, z: -11.5, w: 8.4, d: 7, floors: 3, face: 1, wall: "#e4d2b8", awning: 0x8e2438, name: "HORN", ink: "#f4efe4" },
  ];
  for (const spec of row) storefront(parent, solids, glow, spec);

  for (const x of [16, 38, 58, 74]) streetlight(x, eastWestZ + 7.4, parent, lamps);
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

/** Awning, cornice, and a window row on a building that is still a plain mass. */
export function dressFront(
  parent: THREE.Object3D,
  glow: THREE.MeshStandardMaterial[],
  x: number,
  frontZ: number,
  face: 1 | -1,
  width: number,
  wallTop: number,
  name: string,
  awningColor: number,
) {
  const out = (n: number) => frontZ + face * n;
  box(width + 0.2, 0.22, 0.28, x, wallTop + 0.06, out(0.12), metal, parent);
  const awning = new THREE.MeshStandardMaterial({ color: awningColor, roughness: 0.7 });
  const bay = Math.min(width - 1, 6.4);
  box(bay, 0.08, 1.05, x, 2.7, out(0.6), awning, parent);
  box(bay, 0.24, 0.06, x, 2.52, out(1.08), awning, parent);
  const mat = signMat(name, "#f4efe4");
  glow.push(mat);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(bay, 4.2), 0.62), mat);
  board.position.set(x, 3.15, out(0.16));
  if (face < 0) board.rotation.y = Math.PI;
  parent.add(board);
  if (wallTop > 4.2) {
    for (const ox of [-width * 0.28, width * 0.28]) {
      box(1.15, 1.35, 0.06, x + ox, wallTop * 0.68, out(0.08), metal, parent);
      box(0.95, 1.1, 0.04, x + ox, wallTop * 0.68, out(0.12), glass, parent);
    }
  }
}
