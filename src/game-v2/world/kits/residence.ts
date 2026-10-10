import * as THREE from "three";
import type { Solid } from "../../core/types";
import { brick, canvasTex, concreteSlab, mulch, shingle, siding, soil, trim } from "./materials";
import { mailbox, picketFence } from "./props";
import { crepeMyrtle, matureTree, ornamental, shrub } from "./trees";
import { addGround } from "../ground";
import { finishHeroBungalow } from "./home-detail";

function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, parent: THREE.Object3D) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function gable(width: number, depth: number, rise: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

const foundationMat = new THREE.MeshStandardMaterial({ color: 0x8a847a, roughness: 0.9 });
const sconceMat = new THREE.MeshStandardMaterial({ color: 0xffe1a8, emissive: 0xffb45a, emissiveIntensity: 0.35 });
const doorCache = new Map<string, THREE.MeshStandardMaterial>();

function doorMat(color: string) {
  const hit = doorCache.get(color);
  if (hit) return hit;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
  doorCache.set(color, mat);
  return mat;
}
const glassMat = new THREE.MeshStandardMaterial({
  color: 0x9ec4d4,
  roughness: 0.08,
  metalness: 0.15,
  emissive: 0xffe0b0,
  emissiveIntensity: 0.08,
});
const frameMat = new THREE.MeshStandardMaterial({ color: 0xf7f3ea, roughness: 0.45 });
const knobMat = new THREE.MeshStandardMaterial({ color: 0xe0b33a, metalness: 0.6, roughness: 0.35 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x2c3034, roughness: 0.4, metalness: 0.55 });
const fasciaMat = new THREE.MeshStandardMaterial({ color: 0xf7f3ea, roughness: 0.55 });
const deckMat = new THREE.MeshStandardMaterial({ color: 0x8a623d, roughness: 0.8 });
const potMat = new THREE.MeshStandardMaterial({ color: 0x8a4030, roughness: 0.8 });
const bloomMats = [
  new THREE.MeshStandardMaterial({ color: 0xd45078, roughness: 0.55, side: THREE.DoubleSide }),
  new THREE.MeshStandardMaterial({ color: 0xf2e2a0, roughness: 0.55, side: THREE.DoubleSide }),
  new THREE.MeshStandardMaterial({ color: 0xe07a32, roughness: 0.55, side: THREE.DoubleSide }),
];
const shutterMats = new Map<number, THREE.MeshStandardMaterial>();
const plateTex = new Map<string, THREE.Texture>();

function shutterMat(color: number) {
  const hit = shutterMats.get(color);
  if (hit) return hit;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  shutterMats.set(color, mat);
  return mat;
}

function numberTex(label: string) {
  const hit = plateTex.get(label);
  if (hit) return hit;
  const tex = canvasTex((g, w, h) => {
    g.fillStyle = "#1c1a18";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#f4efe4";
    g.font = "bold 64px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(label, w / 2, h / 2);
  }, 256, 96);
  plateTex.set(label, tex);
  return tex;
}

function windowUnit(parent: THREE.Object3D, glow: THREE.MeshStandardMaterial[], x: number, y: number, z: number, yaw: number) {
  const g = new THREE.Group();
  if (!glow.includes(glassMat)) glow.push(glassMat);
  const frameM = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.35, 0.08), frameMat);
  const glassM = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.12, 0.04), glassMat);
  glassM.position.z = 0.03;
  const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.12, 0.05), frameMat);
  mullion.position.z = 0.05;
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.04, 0.05), frameMat);
  rail.position.z = 0.05;
  const sill = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.08, 0.18), frameMat);
  sill.position.set(0, -0.7, 0.05);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.08, 0.12), frameMat);
  head.position.set(0, 0.7, 0.02);
  g.add(frameM, glassM, mullion, rail, sill, head);
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  parent.add(g);
}

export type HouseStyle = 0 | 1 | 2;

/** One bungalow. Style 0/1/2 changes roof, porch, brick, shutters, and yard. Collision stays on the same footprint. */
export function residence(
  parent: THREE.Object3D,
  solids: Solid[],
  glow: THREE.MeshStandardMaterial[],
  x: number,
  z: number,
  w: number,
  d: number,
  wall: string,
  roofColor: number,
  doorColor: string,
  openDoor: boolean,
  style: HouseStyle = 0,
  hero = false,
  plate = "",
) {
  const wallH = 3.05;
  const base = 0.42;
  const foundation = foundationMat;
  box(w + 0.55, base, d + 0.55, x, base / 2, z, foundation, parent);
  box(w, wallH, d, x, base + wallH / 2, z, siding(wall), parent);
  box(0.12, wallH, d + 0.08, x - w / 2, base + wallH / 2, z, trim, parent);
  box(0.12, wallH, d + 0.08, x + w / 2, base + wallH / 2, z, trim, parent);

  const roofMat = shingle("#" + roofColor.toString(16).padStart(6, "0"));
  const brickMat = brick();
  const rise = style === 2 ? 1.7 : 1.35;
  const run = d / 2 + 0.65;
  const len = Math.hypot(run, rise);
  const pitch = Math.atan2(rise, run);
  const south = new THREE.Mesh(new THREE.BoxGeometry(w + 1.7, 0.16, len), roofMat);
  south.rotation.x = -pitch;
  south.position.set(x, base + wallH + rise * 0.46, z - run * 0.38);
  south.castShadow = true;
  south.receiveShadow = true;
  parent.add(south);
  const north = new THREE.Mesh(new THREE.BoxGeometry(w + 1.7, 0.16, len), roofMat);
  north.rotation.x = pitch;
  north.position.set(x, base + wallH + rise * 0.46, z + run * 0.38);
  north.castShadow = true;
  parent.add(north);
  const gutterSouth = new THREE.Mesh(new THREE.BoxGeometry(w + 1.55, 0.08, 0.12), metalMat);
  gutterSouth.position.set(0, -0.12, -len / 2 + 0.04);
  south.add(gutterSouth);
  const gutterNorth = new THREE.Mesh(new THREE.BoxGeometry(w + 1.55, 0.08, 0.12), metalMat);
  gutterNorth.position.set(0, -0.12, len / 2 - 0.04);
  north.add(gutterNorth);
  box(w + 0.9, 0.12, 0.22, x, base + wallH + rise - 0.04, z, metalMat, parent);
  const gableEnd = new THREE.Mesh(gable(d + 0.3, 0.1, rise), siding(wall));
  gableEnd.rotation.y = Math.PI / 2;
  gableEnd.position.set(x - w / 2 - 0.02, base + wallH, z);
  parent.add(gableEnd);
  const gableEast = gableEnd.clone();
  gableEast.position.x = x + w / 2 + 0.02;
  parent.add(gableEast);
  const metal = metalMat;
  box(w + 1.6, 0.08, 0.1, x, base + wallH + 0.06, z - d / 2 - 0.62, metal, parent);
  box(0.08, wallH * 0.92, 0.08, x - w / 2 + 0.15, base + wallH * 0.46, z - d / 2 - 0.2, metal, parent);
  box(0.08, wallH * 0.92, 0.08, x + w / 2 - 0.2, base + wallH * 0.46, z - d / 2 - 0.2, metal, parent);
  box(0.12, 0.1, 0.18, x - w / 2 + 0.15, base + 0.18, z - d / 2 - 0.28, metal, parent);
  box(0.12, 0.1, 0.18, x + w / 2 - 0.2, base + 0.18, z - d / 2 - 0.28, metal, parent);
  const fascia = fasciaMat;
  box(w + 1.85, 0.18, 0.08, x, base + wallH + 0.04, z - d / 2 - 0.72, fascia, parent);
  box(w + 1.85, 0.18, 0.08, x, base + wallH + 0.04, z + d / 2 + 0.72, fascia, parent);
  box(0.1, 0.14, d + 1.35, x - w / 2 - 0.88, base + wallH + 0.1, z, fascia, parent);
  box(0.1, 0.14, d + 1.35, x + w / 2 + 0.88, base + wallH + 0.1, z, fascia, parent);
  box(w + 1.4, 0.05, 0.48, x, base + wallH - 0.02, z - d / 2 - 0.42, fascia, parent);
  box(w + 1.4, 0.05, 0.48, x, base + wallH - 0.02, z + d / 2 + 0.42, fascia, parent);
  const vent = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.42), metal);
  vent.position.set(x - w / 2 - 0.06, base + wallH + rise * 0.45, z);
  parent.add(vent);
  if (hero || style === 1) {
    const chimY = base + wallH + rise * 0.35;
    box(0.62, 1.35, 0.62, x + w * 0.24, chimY, z - 0.45, brickMat, parent);
    box(0.76, 0.1, 0.76, x + w * 0.24, chimY + 0.7, z - 0.45, metal, parent);
  }

  const front = z - d / 2;
  const faceZ = front - 0.08;
  windowUnit(parent, glow, x - w * 0.28, base + 1.75, faceZ, Math.PI);
  windowUnit(parent, glow, x + w * 0.28, base + 1.75, faceZ, Math.PI);
  windowUnit(parent, glow, x - w / 2 - 0.08, base + 1.7, z, -Math.PI / 2);
  const shutter = shutterMat(hero ? 0x6b2a22 : style === 1 ? 0x1e3348 : style === 2 ? 0x6a3030 : 0x1f3d32);
  for (const sx of [-w * 0.28, w * 0.28]) {
    box(0.1, 1.22, 0.05, x + sx - 0.68, base + 1.75, faceZ - 0.04, shutter, parent);
    box(0.1, 1.22, 0.05, x + sx + 0.68, base + 1.75, faceZ - 0.04, shutter, parent);
  }
  box(w + 0.08, 1.05, 0.1, x, base + 0.52, faceZ - 0.06, brickMat, parent);
  box(w + 0.2, 0.08, 0.16, x, base + 1.08, faceZ - 0.1, trim, parent);
  box(0.1, 1.05, d * 0.92, x - w / 2 - 0.02, base + 0.52, z + 0.15, brickMat, parent);
  box(0.1, 1.05, d * 0.92, x + w / 2 + 0.02, base + 0.52, z + 0.15, brickMat, parent);
  if (style === 1) box(w, 0.95, 0.1, x, base + 0.5, z + d / 2 + 0.04, brickMat, parent);

  const door = doorMat(doorColor);
  box(1.15, 2.25, 0.1, x, base + 1.15, faceZ - 0.02, trim, parent);
  box(0.92, 2.05, 0.08, x, base + 1.08, faceZ - 0.1, door, parent);
  box(0.7, 0.04, 0.02, x, base + 1.45, faceZ - 0.16, trim, parent);
  box(0.32, 0.62, 0.02, x - 0.18, base + 1.38, faceZ - 0.15, trim, parent);
  box(0.32, 0.62, 0.02, x + 0.18, base + 1.38, faceZ - 0.15, trim, parent);
  box(0.32, 0.38, 0.02, x - 0.18, base + 0.78, faceZ - 0.15, trim, parent);
  box(0.32, 0.38, 0.02, x + 0.18, base + 0.78, faceZ - 0.15, trim, parent);
  box(0.06, 0.08, 0.06, x + 0.32, base + 1.05, faceZ - 0.16, knobMat, parent);
  if (plate) {
    const number = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.18), new THREE.MeshBasicMaterial({ map: numberTex(plate) }));
    number.position.set(x + 0.78, base + 1.62, faceZ - 0.14);
    number.rotation.y = Math.PI;
    parent.add(number);
  }

  const porchZ = front - 1.35;
  const porchW = style === 1 ? w * 0.72 : w * 0.55;
  const deck = deckMat;
  box(porchW, 0.12, 2.4, x, 0.42, porchZ, deck, parent);
  addGround({
    minX: x - porchW / 2,
    maxX: x + porchW / 2,
    minZ: porchZ - 1.2,
    maxZ: porchZ + 1.2,
    y: 0.48,
  });
  // Real two-pitch porch roof. The old solid roof-colored triangular
  // extrusion read as a black wedge from the gameplay camera.
  const canopyWidth = porchW + 0.5;
  const canopyHalf = canopyWidth / 2;
  const canopyRise = style === 2 ? 0.46 : 0.75;
  const canopyEdgeY = 2.5;
  const canopySlope = Math.atan2(canopyRise, canopyHalf);
  const roofPanelWidth = Math.hypot(canopyHalf, canopyRise) + 0.18;
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(roofPanelWidth, 0.12, 2.85), roofMat);
    panel.position.set(x + side * canopyHalf / 2, canopyEdgeY + canopyRise / 2, porchZ);
    panel.rotation.z = -side * canopySlope;
    panel.castShadow = true;
    panel.receiveShadow = true;
    parent.add(panel);
    const rake = new THREE.Mesh(new THREE.BoxGeometry(roofPanelWidth + 0.1, 0.10, 0.10), fascia);
    rake.position.set(x + side * canopyHalf / 2, canopyEdgeY + canopyRise / 2, porchZ - 1.46);
    rake.rotation.z = -side * canopySlope;
    parent.add(rake);
  }
  // The gable face is painted siding, not shingle material across a wedge.
  const porchGable = new THREE.Mesh(gable(canopyWidth - 0.16, 0.08, canopyRise - 0.07), siding(wall));
  porchGable.position.set(x, canopyEdgeY + 0.025, porchZ - 1.41);
  porchGable.castShadow = true;
  parent.add(porchGable);
  box(porchW + 0.05, 0.05, 2.25, x, 2.4, porchZ, fascia, parent);
  for (const sx of [-porchW * 0.42, porchW * 0.42]) {
    box(0.38, 0.7, 0.38, x + sx, 0.55, porchZ - 1.05, brickMat, parent);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.22, 10), trim);
    col.position.set(x + sx, 1.52, porchZ - 1.05);
    col.castShadow = true;
    parent.add(col);
  }
  box(porchW * 0.92, 0.14, 0.16, x, 2.16, porchZ - 1.05, trim, parent);
  box(porchW * 0.9, 0.05, 0.05, x, 0.98, porchZ - 1.05, trim, parent);
  box(porchW * 0.9, 0.05, 0.05, x, 0.42, porchZ - 1.05, trim, parent);
  for (let i = 0; i < 5; i++) {
    box(0.04, 0.52, 0.04, x - porchW * 0.38 + i * (porchW * 0.19), 0.7, porchZ - 1.05, trim, parent);
  }
  box(1.4, 0.1, 0.42, x, 0.16, porchZ - 1.7, concreteSlab(1), parent);
  box(1.2, 0.1, 0.38, x, 0.26, porchZ - 1.28, concreteSlab(2), parent);
  box(1.05, 0.08, 0.34, x, 0.36, porchZ - 0.95, concreteSlab(3), parent);
  addGround({ minX: x - 0.7, maxX: x + 0.7, minZ: porchZ - 1.91, maxZ: porchZ - 1.49, y: 0.21 });
  addGround({ minX: x - 0.6, maxX: x + 0.6, minZ: porchZ - 1.47, maxZ: porchZ - 1.09, y: 0.31 });
  addGround({ minX: x - 0.52, maxX: x + 0.52, minZ: porchZ - 1.12, maxZ: porchZ - 0.78, y: 0.4 });

  if (!glow.includes(sconceMat)) glow.push(sconceMat);
  box(0.08, 0.22, 0.08, x + 0.72, base + 2.22, faceZ - 0.06, metalMat, parent);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), sconceMat);
  lamp.position.set(x + 0.72, base + 2.05, faceZ - 0.12);
  parent.add(lamp);

  const bed = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.06, 0.7), mulch());
  bed.position.set(x, 0.06, front - 0.45);
  parent.add(bed);
  shrub(x - w * 0.32, front - 0.45, parent, hero ? 1.15 : 1);
  shrub(x + w * 0.34, front - 0.4, parent, hero ? 1.05 : 0.85);
  shrub(x - w * 0.46, front - 0.2, parent, 0.7);
  shrub(x + w * 0.46, front - 0.22, parent, 0.75);
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    shrub(x + i * (w * 0.15), front - 2.45, parent, i % 2 === 0 ? 0.75 : 0.55);
  }
  const flower = bloomMats[style]!;
  for (const sx of [-w * 0.28, w * 0.22, w * 0.4]) {
    for (const yaw of [0, Math.PI / 2]) {
      const bloom = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.24), flower);
      bloom.position.set(x + sx, 0.28, front - 0.55);
      bloom.rotation.y = yaw;
      parent.add(bloom);
    }
  }
  if (style !== 1) picketFence(x + (style === 0 ? -1 : 1) * w * 0.42, front - 2.15, 2.4, parent);
  if (hero) {
    matureTree(x - w / 2 - 2.3, z + 0.2, parent);
    crepeMyrtle(x + w / 2 + 1.25, z - 0.4, parent);
    for (const sx of [-porchW * 0.34, porchW * 0.34]) {
      box(0.26, 0.28, 0.26, x + sx, 0.66, porchZ - 0.15, potMat, parent);
      for (const yaw of [0, Math.PI / 2]) {
        const flower = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.28), bloomMats[0]!);
        flower.position.set(x + sx, 0.92, porchZ - 0.15);
        flower.rotation.y = yaw;
        parent.add(flower);
      }
    }
    box(0.46, 0.06, 0.42, x + porchW * 0.22, 0.62, porchZ + 0.15, deck, parent);
    box(0.46, 0.38, 0.06, x + porchW * 0.22, 0.86, porchZ + 0.32, trim, parent);
    box(0.42, 0.06, 0.42, x - porchW * 0.28, 0.58, porchZ + 0.05, deck, parent);
    box(0.42, 0.42, 0.06, x - porchW * 0.28, 0.82, porchZ + 0.24, deck, parent);
    const bedWide = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.08, 1.15), mulch());
    bedWide.position.set(x, 0.05, front - 0.7);
    parent.add(bedWide);
    finishHeroBungalow(parent, x, z, w, d, wallH, base, rise, porchW);
  }
  if (style === 2) ornamental(x + w * 0.15, front - 2.4, parent);

  const walk0 = front - 4.2;
  const walkFar = porchZ - 1.5;
  const walkLen = Math.abs(walk0 - walkFar);
  const walkMid = (walk0 + walkFar) / 2;
  box(1.05, 0.06, walkLen, x, 0.08, walkMid, concreteSlab(4), parent);
  box(0.16, 0.04, walkLen, x - 0.64, 0.05, walkMid, soil, parent);
  box(0.16, 0.04, walkLen, x + 0.64, 0.05, walkMid, soil, parent);
  addGround({ minX: x - 0.52, maxX: x + 0.52, minZ: walkMid - walkLen / 2, maxZ: walkMid + walkLen / 2, y: 0.11 });

  if (style === 1) {
    box(2.8, 0.05, 5.6, x + w * 0.55, 0.05, front - 3.2, concreteSlab(6), parent);
  }
  mailbox(x - w * 0.46, front - 2.15, parent, style === 2);

  if (openDoor) {
    // Opening matches the door frame (~1.16m). resolve() expands solids by the
    // body radius, so a wider hole lets the player walk the siding.
    const mouth = 0.58;
    solids.push({ minX: x - w / 2, maxX: x - mouth, minZ: front, maxZ: z + d / 2 });
    solids.push({ minX: x + mouth, maxX: x + w / 2, minZ: front, maxZ: z + d / 2 });
    solids.push({ minX: x - w / 2, maxX: x + w / 2, minZ: front + 1.15, maxZ: z + d / 2 });
  } else {
    solids.push({ minX: x - w / 2, maxX: x + w / 2, minZ: front, maxZ: z + d / 2 });
  }
  const railZ = porchZ - 1.05;
  const colR = 0.2;
  for (const sx of [-porchW * 0.42, porchW * 0.42]) {
    solids.push({
      minX: x + sx - colR,
      maxX: x + sx + colR,
      minZ: railZ - colR,
      maxZ: railZ + colR,
    });
  }
  const gap = 0.78;
  solids.push({ minX: x - porchW * 0.46, maxX: x - gap, minZ: railZ - 0.06, maxZ: railZ + 0.08 });
  solids.push({ minX: x + gap, maxX: x + porchW * 0.46, minZ: railZ - 0.06, maxZ: railZ + 0.08 });
}
