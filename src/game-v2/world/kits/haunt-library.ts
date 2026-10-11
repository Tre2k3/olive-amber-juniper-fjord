import * as THREE from "three";
import type { Solid } from "../../core/types";
import { hauntSurface } from "./haunt-architecture";

// Small repeatable textile, drawn once; it never includes room or character art.
function libraryTextile() {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 384;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#54212a"; ctx.fillRect(0, 0, 512, 384);
  ctx.strokeStyle = "#aa8354";
  for (const inset of [12, 19, 42, 48]) {
    ctx.lineWidth = inset === 42 ? 4 : 1.5;
    ctx.strokeRect(inset, inset, 512 - inset * 2, 384 - inset * 2);
  }
  const leaf = (x: number, y: number, size: number) => {
    ctx.beginPath(); ctx.moveTo(x, y - size);
    ctx.quadraticCurveTo(x + size, y, x, y + size);
    ctx.quadraticCurveTo(x - size, y, x, y - size); ctx.stroke();
  };
  ctx.lineWidth = 1.5;
  for (let x = 32; x < 490; x += 22) { leaf(x, 31, 7); leaf(x, 353, 7); }
  for (let y = 62; y < 330; y += 22) { leaf(31, y, 7); leaf(481, y, 7); }
  for (let x = 76; x < 460; x += 40) for (let y = 72; y < 330; y += 40) {
    leaf(x, y, 9); ctx.fillStyle = "#9a6849"; ctx.fillRect(x - 1, y - 1, 2, 2);
  }
  ctx.fillStyle = "#372729";
  ctx.beginPath(); ctx.ellipse(256, 192, 87, 112, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    leaf(256 + Math.cos(a) * 45, 192 + Math.sin(a) * 67, 16);
  }
  leaf(256, 192, 35);
  // Deterministic faded fibers soften the design without per-frame work.
  for (let i = 0; i < 2400; i++) {
    ctx.fillStyle = i % 2 ? "#e3bc8020" : "#160f1428";
    ctx.fillRect((i * 137) % 512, (i * 83) % 384, 1, 2);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.98, color: 0xb4a29b });
}

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
  const panel = (w: number, h: number, d: number, radius: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const shape = new THREE.Shape();
    const l = -w / 2, r = w / 2, b = -h / 2, t = h / 2;
    shape.moveTo(l + radius, b); shape.lineTo(r - radius, b);
    shape.quadraticCurveTo(r, b, r, b + radius); shape.lineTo(r, t - radius);
    shape.quadraticCurveTo(r, t, r - radius, t); shape.lineTo(l + radius, t);
    shape.quadraticCurveTo(l, t, l, t - radius); shape.lineTo(l, b + radius);
    shape.quadraticCurveTo(l, b, l + radius, b);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 4, steps: 1 });
    geometry.translate(0, 0, -d / 2);
    return add(geometry, mat, x, y, z);
  };
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
  const seat = panel(0.82, 0.76, 0.17, 0.12, cx, 0.69, cz, velvet);
  seat.rotation.x = -Math.PI / 2;
  panel(0.92, 1.2, 0.12, 0.2, cx, 1.18, cz + 0.34, wood);
  panel(0.77, 0.99, 0.16, 0.18, cx, 1.22, cz + 0.25, velvet);
  const crown = add(new THREE.TorusGeometry(0.21, 0.025, 6, 24), wood, cx, 1.75, cz + 0.34);
  crown.scale.set(1.55, 0.65, 1);
  add(new THREE.SphereGeometry(0.055, 8, 6), brass, cx, 1.89, cz + 0.34);
  for (const x of [cx - 0.48, cx + 0.48]) {
    block(0.12, 0.54, 0.12, x, 0.77, cz - 0.28);
    block(0.15, 0.13, 0.8, x, 1.05, cz);
  }
  for (const x of [cx - 0.22, cx, cx + 0.22]) for (const y of [0.98, 1.23, 1.48])
    add(new THREE.SphereGeometry(0.025, 6, 4), brass, x, y, cz + 0.16);
  // Upholstery nail trim follows the inset, rather than extending the collider.
  const nails = new THREE.InstancedMesh(new THREE.SphereGeometry(0.012, 4, 3), brass, 20);
  let nailIndex = 0;
  for (const x of [cx - 0.33, cx + 0.33]) for (let i = 0; i < 10; i++)
    nails.setMatrixAt(nailIndex++, new THREE.Matrix4().makeTranslation(x, 0.83 + i * 0.075, cz + 0.16));
  nails.receiveShadow = true; room.add(nails);
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
  block(1.83, 0.055, 0.67, fx, 1.89, fz, wood);
  for (const x of [fx - 0.69, fx + 0.69]) {
    block(0.28, 0.08, 0.48, x, 0.27, fz, stone);
    block(0.29, 0.08, 0.48, x, 1.6, fz, stone);
    for (let i = 0; i < 3; i++) block(0.012, 1.1, 0.015, x - 0.065 + i * 0.065, 0.98, fz - 0.234, brass);
  }
  const mantelRosette = add(new THREE.TorusGeometry(0.065, 0.018, 6, 12), brass, fx, 1.77, fz - 0.317);
  mantelRosette.scale.x = 1.7;
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
  const rug = add(new THREE.PlaneGeometry(3.6, 2.8), libraryTextile(), 28.3, 0.104, 5.4);
  rug.rotation.x = -Math.PI / 2;
  rug.castShadow = false;
  for (const z of [4.08, 6.72]) block(3.45, 0.008, 0.025, 28.3, 0.107, z, brass);
  for (const x of [26.62, 29.98]) block(0.025, 0.008, 2.6, x, 0.107, 5.4, brass);
}
