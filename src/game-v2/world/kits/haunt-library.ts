import * as THREE from "three";
import type { Solid } from "../../core/types";
import { hauntSurface } from "./haunt-architecture";

/** Furnishings inspired by the library reference, built from actual geometry. */
export function buildHauntLibrary(parent: THREE.Object3D, solids: Solid[], lights: THREE.PointLight[]) {
  const room = new THREE.Group();
  room.name = "haunt-3d-library";
  parent.add(room);
  const wood = hauntSurface("wood");
  const brass = new THREE.MeshStandardMaterial({ color: 0xa58246, metalness: 0.55, roughness: 0.46 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x211c19, metalness: 0.5, roughness: 0.62 });
  const velvet = new THREE.MeshStandardMaterial({ color: 0x62232b, roughness: 0.95 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xc9b68c, roughness: 0.98 });
  const stone = hauntSurface("stone");
  const flame = new THREE.MeshBasicMaterial({ color: 0xffa23c, transparent: true, opacity: 0.7, depthWrite: false });
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    room.add(mesh);
    return mesh;
  };
  const block = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material = wood) =>
    add(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  const candle = (x: number, y: number, z: number, height: number) => {
    add(new THREE.CylinderGeometry(0.085, 0.13, 0.055, 10), brass, x, y + 0.025, z);
    add(new THREE.CylinderGeometry(0.035, 0.065, 0.13, 8), brass, x, y + 0.115, z);
    add(new THREE.CylinderGeometry(0.055, 0.065, height, 10), paper, x, y + 0.18 + height / 2, z);
    const light = add(new THREE.SphereGeometry(0.035, 8, 6), flame, x, y + 0.2 + height, z);
    light.scale.set(0.7, 2, 0.7); light.castShadow = false;
  };

  // Carved desk panels and separate legs retain the previous collision footprint.
  block(1.8, 0.13, 0.8, 27.2, 0.9, 4.6);
  for (const x of [26.45, 27.95]) for (const z of [4.32, 4.88]) block(0.12, 0.72, 0.12, x, 0.46, z);
  block(1.48, 0.32, 0.12, 27.2, 0.69, 4.25);
  for (const x of [26.72, 27.2, 27.68]) {
    block(0.4, 0.23, 0.035, x, 0.69, 4.17);
    block(0.13, 0.035, 0.06, x, 0.69, 4.14, brass);
  }
  // Open book: angled page blocks, spine and ink lines, never a room photograph.
  for (const side of [-1, 1]) {
    const pages = block(0.22, 0.045, 0.3, 27.28 + side * 0.11, 1.01, 4.48, paper);
    pages.rotation.z = side * 0.12;
    for (let line = 0; line < 5; line++) block(0.16, 0.006, 0.008,
      27.28 + side * 0.11, 1.045, 4.38 + line * 0.042, iron);
  }
  candle(26.7, 0.98, 4.62, 0.24);
  candle(26.92, 0.98, 4.74, 0.16);
  const globe = add(new THREE.SphereGeometry(0.18, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x435862, roughness: 0.72 }), 27.78, 1.24, 4.63);
  globe.rotation.z = 0.2;
  const globeRing = add(new THREE.TorusGeometry(0.205, 0.013, 6, 24), brass, 27.78, 1.24, 4.63);
  globeRing.rotation.y = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.1, 0.13, 0.075, 12), iron, 27.78, 1.005, 4.63);

  // Tufted armchair sits outside the east-west doorway corridor.
  const cx = 28.65, cz = 6;
  for (const x of [cx - 0.38, cx + 0.38]) for (const z of [cz - 0.33, cz + 0.33]) block(0.095, 0.42, 0.095, x, 0.28, z);
  block(0.98, 0.15, 0.9, cx, 0.55, cz);
  block(0.82, 0.17, 0.76, cx, 0.69, cz, velvet);
  block(0.92, 1.2, 0.12, cx, 1.18, cz + 0.34);
  block(0.77, 0.99, 0.16, cx, 1.22, cz + 0.25, velvet);
  for (const x of [cx - 0.48, cx + 0.48]) {
    block(0.12, 0.54, 0.12, x, 0.77, cz - 0.28);
    block(0.15, 0.13, 0.8, x, 1.05, cz);
  }
  for (const x of [cx - 0.22, cx, cx + 0.22]) for (const y of [1.03, 1.38])
    add(new THREE.SphereGeometry(0.025, 6, 4), brass, x, y, cz + 0.16);
  solids.push({ minX: cx - 0.56, maxX: cx + 0.56, minZ: cz - 0.5, maxZ: cz + 0.48 });

  // Shelf ladder and brass rail create depth against the existing bookcases.
  block(0.055, 0.055, 5.7, 25.12, 2.66, 3.45, brass);
  for (const z of [1.32, 1.94]) {
    const side = block(0.065, 2.7, 0.065, 25.45, 1.43, z);
    side.rotation.z = 0.23;
  }
  for (let i = 0; i < 8; i++) block(0.085, 0.06, 0.7, 25.75 - i * 0.075, 0.3 + i * 0.3, 1.63);
  solids.push({ minX: 25.05, maxX: 25.9, minZ: 1.17, maxZ: 2.1 });

  // Shallow fireplace leaves the north doorway at x=28 clear.
  const fx = 30.55, fz = 7.45;
  block(1.65, 0.13, 0.85, fx, 0.16, fz - 0.1, stone);
  block(1.45, 1.42, 0.13, fx, 0.86, fz + 0.21, iron);
  for (const x of [fx - 0.69, fx + 0.69]) block(0.25, 1.5, 0.45, x, 0.97, fz, stone);
  block(1.76, 0.2, 0.62, fx, 1.76, fz, wood);
  block(1.43, 0.16, 0.35, fx, 1.52, fz, stone);
  for (const x of [fx - 0.33, fx + 0.23]) {
    const log = add(new THREE.CylinderGeometry(0.065, 0.065, 0.65, 8), iron, x, 0.36, fz - 0.04);
    log.rotation.z = Math.PI / 2;
  }
  for (let i = 0; i < 5; i++) {
    const fire = add(new THREE.SphereGeometry(0.09, 10, 8), flame,
      fx - 0.32 + i * 0.16, 0.47 + i % 2 * 0.05, fz - 0.14);
    fire.scale.set(0.85, 1.8 + i % 2 * 0.55, 0.65);
    fire.rotation.z = (i - 2) * 0.13;
    fire.castShadow = false;
  }
  candle(fx - 0.6, 1.87, fz, 0.22);
  candle(fx + 0.55, 1.87, fz, 0.3);
  const hearthLight = new THREE.PointLight(0xff8c3b, 0, 7, 2);
  hearthLight.position.set(fx, 0.8, fz - 0.6);
  room.add(hearthLight);
  lights.push(hearthLight);
  solids.push({ minX: fx - 0.88, maxX: fx + 0.88, minZ: fz - 0.58, maxZ: 7.9 });
  // Physical rug border stays flush with the existing floor.
  block(3.6, 0.015, 2.8, 28.3, 0.095, 5.4, velvet);
  for (const z of [4.08, 6.72]) block(3.45, 0.008, 0.025, 28.3, 0.107, z, brass);
  for (const x of [26.62, 29.98]) block(0.025, 0.008, 2.6, x, 0.107, 5.4, brass);
}
