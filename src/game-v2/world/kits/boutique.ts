import * as THREE from "three";
import type { Solid } from "../../core/types";
import { addGround } from "../ground";
import { canvasTex, surface } from "./materials";

/**
 * SackReligious flagship: a purpose-built, walkable 3D retail interior.
 * No full-scene image planes: architecture, displays, products and lighting
 * are meshes, so the player and camera can move naturally through the space.
 * Local coordinate system: x = -8..8, z = -6..6; entrance at (0, +6).
 */
const shell = new THREE.MeshStandardMaterial({ color: 0x191715, roughness: 0.82 });
const velvet = new THREE.MeshStandardMaterial({ color: 0x1b2923, roughness: 0.95 });
const oak = new THREE.MeshStandardMaterial({ color: 0x634b35, roughness: 0.58 });
const brass = new THREE.MeshStandardMaterial({ color: 0xc49635, roughness: 0.29, metalness: 0.84 });
const softGold = new THREE.MeshBasicMaterial({ color: 0xffc15c, toneMapped: false });
const cream = new THREE.MeshStandardMaterial({ color: 0xf6eee0, roughness: 0.88 });
const green = new THREE.MeshStandardMaterial({ color: 0x236b43, roughness: 0.8 });
const deepGreen = new THREE.MeshStandardMaterial({ color: 0x132e25, roughness: 0.75 });
const blackFabric = new THREE.MeshStandardMaterial({ color: 0x141719, roughness: 0.92 });
const grayFabric = new THREE.MeshStandardMaterial({ color: 0x6b7370, roughness: 0.84 });
const glazed = new THREE.MeshStandardMaterial({ color: 0x192528, metalness: 0.2, roughness: 0.14 });
const foliage = new THREE.MeshStandardMaterial({ color: 0x296c41, roughness: 0.9, side: THREE.DoubleSide });

function piece(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material,
               x: number, y: number, z: number, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(parent: THREE.Object3D, w: number, h: number, d: number,
             x: number, y: number, z: number, mat: THREE.Material, shadow = true) {
  return piece(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z, shadow);
}
function collider(solids: Solid[], x: number, z: number, w: number, d: number) {
  solids.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
}
function warmStrip(group: THREE.Object3D, w: number, x: number, y: number, z: number) {
  box(group, w + 0.08, 0.065, 0.1, x, y, z, brass, false);
  box(group, w, 0.032, 0.12, x, y - 0.046, z + 0.08, softGold, false);
}
function insignia(group: THREE.Object3D, x: number, y: number, z: number, width: number) {
  const crown = new THREE.Group();
  crown.position.set(x, y, z);
  crown.scale.setScalar(width);
  const points = [
    new THREE.Vector2(-0.5, -0.18), new THREE.Vector2(-0.48, 0.28),
    new THREE.Vector2(-0.21, 0.02), new THREE.Vector2(0, 0.43),
    new THREE.Vector2(0.21, 0.02), new THREE.Vector2(0.48, 0.28),
    new THREE.Vector2(0.5, -0.18),
  ];
  const shape = new THREE.Shape(points);
  const plate = new THREE.Mesh(
    new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0xffc45b, side: THREE.DoubleSide, toneMapped: false }),
  );
  crown.add(plate);
  group.add(crown);
}
function emblem(group: THREE.Object3D, text: string, w: number, h: number,
                x: number, y: number, z: number) {
  const tex = canvasTex((ctx, tw, th) => {
    ctx.clearRect(0, 0, tw, th);
    ctx.textAlign = "center";
    ctx.fillStyle = "#f4c66f";
    ctx.shadowColor = "rgba(255,174,36,.75)";
    ctx.shadowBlur = 14;
    ctx.font = "italic 900 72px Georgia, serif";
    ctx.fillText(text, tw / 2, th * 0.58, tw * 0.94);
  }, 1024, 256);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
  piece(group, new THREE.PlaneGeometry(w, h), mat, x, y, z, false);
}

function tee(parent: THREE.Object3D, x: number, y: number, z: number,
             mat: THREE.Material, facing: number) {
  const shirt = new THREE.Group();
  shirt.position.set(x, y, z);
  shirt.rotation.y = facing;
  box(shirt, 0.39, 0.61, 0.09, 0, -0.29, 0, mat, false);
  const left = box(shirt, 0.23, 0.21, 0.085, -0.285, -0.13, 0, mat, false);
  const right = box(shirt, 0.23, 0.21, 0.085, 0.285, -0.13, 0, mat, false);
  left.rotation.z = -0.28;
  right.rotation.z = 0.28;
  box(shirt, 0.15, 0.04, 0.095, 0, 0.01, 0.01, brass, false);
  parent.add(shirt);
  return shirt;
}
function shoe(parent: THREE.Object3D, x: number, y: number, z: number, variant: number) {
  const mat = variant % 3 === 0 ? cream : variant % 3 === 1 ? green : blackFabric;
  box(parent, 0.33, 0.09, 0.15, x, y + 0.06, z, cream, false);
  box(parent, 0.26, 0.14, 0.14, x + 0.02, y + 0.15, z, mat, false);
  box(parent, 0.11, 0.07, 0.15, x - 0.12, y + 0.15, z, brass, false);
}
function wallDisplay(parent: THREE.Object3D, x: number, z: number, facing: number) {
  const rack = new THREE.Group();
  rack.position.set(x, 0, z);
  rack.rotation.y = facing;
  box(rack, 2.45, 2.65, 0.14, 0, 1.47, -0.13, shell);
  box(rack, 2.38, 0.055, 0.12, 0, 2.79, 0.02, brass);
  warmStrip(rack, 2.26, 0, 2.65, 0.02);
  box(rack, 2.2, 0.06, 0.28, 0, 1.92, 0.18, oak);
  box(rack, 2.2, 0.06, 0.26, 0, 0.82, 0.18, oak);
  warmStrip(rack, 2.13, 0, 0.78, 0.23);
  for (let i = 0; i < 4; i++) {
    const px = -0.79 + i * 0.52;
    tee(rack, px, 1.72, 0.2, [green, cream, blackFabric, grayFabric][i]!, 0);
    shoe(rack, px + 0.03, 0.91, 0.21, i);
  }
  parent.add(rack);
}
function storePlant(parent: THREE.Object3D, x: number, z: number, height = 1.2) {
  const pot = new THREE.MeshStandardMaterial({ color: 0x31251d, roughness: 0.78 });
  piece(parent, new THREE.CylinderGeometry(0.25, 0.19, 0.42, 10), pot, x, 0.25, z);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x345337, roughness: 0.9 });
  piece(parent, new THREE.CylinderGeometry(0.025, 0.04, height * 0.78, 7), stemMat, x, height * 0.47, z);
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7;
    const leaf = piece(parent, new THREE.SphereGeometry(0.12, 8, 6), foliage,
      x + Math.sin(a) * 0.29, 0.65 + i % 3 * 0.23, z + Math.cos(a) * 0.29, false);
    leaf.scale.set(0.72, 2.25, 0.32);
    leaf.rotation.z = Math.sin(a) * 0.43;
    leaf.rotation.x = Math.cos(a) * 0.5;
  }
}
function foldedTable(parent: THREE.Object3D, solids: Solid[], x: number, z: number, w = 2.0) {
  box(parent, w, 0.12, 0.97, x, 0.77, z, oak);
  for (const sx of [-w * 0.42, w * 0.42]) {
    box(parent, 0.08, 0.69, 0.08, x + sx, 0.38, z - 0.38, brass);
    box(parent, 0.08, 0.69, 0.08, x + sx, 0.38, z + 0.38, brass);
  }
  for (let row = 0; row < 2; row++) for (let i = 0; i < 3; i++) {
    const xx = x - 0.59 + i * 0.58;
    const zz = z - 0.27 + row * 0.52;
    const fabrics = [green, cream, blackFabric];
    for (let layer = 0; layer < 3; layer++) {
      box(parent, 0.43, 0.045, 0.31, xx, 0.86 + layer * 0.05, zz, fabrics[(i + row + layer) % 3]!, false);
    }
  }
  collider(solids, x, z, w, 0.98);
}
function retailCounter(parent: THREE.Object3D, solids: Solid[]) {
  box(parent, 2.5, 1, 0.74, -4.9, 0.52, 3.05, shell);
  box(parent, 2.55, 0.085, 0.85, -4.9, 1.08, 3.05, oak);
  box(parent, 2.45, 0.025, 0.06, -4.9, 0.21, 3.48, softGold, false);
  for (let i = 0; i < 5; i++) {
    box(parent, 0.015, 0.7, 0.05, -5.85 + i * 0.48, 0.62, 3.46, brass, false);
  }
  box(parent, 0.5, 0.09, 0.45, -4.35, 1.18, 2.97, blackFabric);
  box(parent, 0.43, 0.3, 0.04, -4.35, 1.38, 2.79, glazed);
  collider(solids, -4.9, 3.05, 2.65, 0.95);
}
function sofa(parent: THREE.Object3D, solids: Solid[]) {
  const x = 4.0, z = -3.9;
  box(parent, 3.1, 0.44, 0.9, x, 0.43, z, velvet);
  box(parent, 3.1, 0.82, 0.19, x, 0.76, z - 0.4, velvet);
  box(parent, 0.26, 0.65, 0.89, x - 1.42, 0.61, z, velvet);
  box(parent, 0.26, 0.65, 0.89, x + 1.42, 0.61, z, velvet);
  for (const sx of [-0.8, 0, 0.8]) {
    box(parent, 0.67, 0.15, 0.55, x + sx, 0.72, z + 0.12, blackFabric);
  }
  box(parent, 1.15, 0.26, 0.6, x, 0.22, z + 1.38, oak);
  collider(solids, x, z, 3.32, 1.1);
}
function mezzanine(parent: THREE.Object3D) {
  // A partial back mezzanine makes the boutique feel tall, without
  // placing a low ceiling over the gameplay camera's entry sightline.
  box(parent, 16, 0.16, 2.0, 0, 3.3, -5.0, oak);
  box(parent, 16, 0.12, 0.18, 0, 3.42, -3.98, brass);
  for (let i = -8; i <= 8; i++) {
    const x = i * 0.94;
    box(parent, 0.045, 0.75, 0.055, x, 3.79, -3.96, brass, false);
  }
  box(parent, 15.9, 0.07, 0.06, 0, 4.18, -3.96, brass, false);
  for (const x of [-6.6, 6.6]) {
    storePlant(parent, x, -5.0, 0.9);
  }
}
function lighting(parent: THREE.Object3D, glow: THREE.MeshStandardMaterial[]) {
  const mats = new THREE.MeshStandardMaterial({
    color: 0xffebba, emissive: 0xffc16a, emissiveIntensity: 1.05, roughness: 0.3,
  });
  glow.push(mats);
  for (const x of [-5, -2.5, 0, 2.5, 5]) {
    for (const z of [-3.3, 1.4]) {
      piece(parent, new THREE.CylinderGeometry(0.25, 0.38, 0.22, 12), shell, x, 5.0, z);
      piece(parent, new THREE.CylinderGeometry(0.19, 0.28, 0.065, 12), mats, x, 4.85, z, false);
    }
  }
  const a = new THREE.PointLight(0xffe4b6, 0, 22, 2);
  a.position.set(-4.2, 3.4, 1.6);
  const b = new THREE.PointLight(0xffd19a, 0, 25, 2);
  b.position.set(3.6, 4.2, -2.5);
  parent.add(a, b);
  parent.userData.lights = [a, b];
}

export function buildBoutiqueInterior(
  group: THREE.Group,
  solids: Solid[],
  glow: THREE.MeshStandardMaterial[],
  spawnBlanco: (x: number, z: number) => THREE.Group,
) {
  group.position.set(80, 0, 200);
  const polishedFloor = canvasTex((g, w, h) => {
    g.fillStyle = "#66615b";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 280; i++) {
      const v = 94 + (i * 17) % 36;
      g.strokeStyle = "rgba(" + (v + 22) + "," + (v + 16) + "," + v + ",0.19)";
      g.lineWidth = i % 5 === 0 ? 2 : 0.55;
      g.beginPath();
      const x = (i * 71) % w;
      const y = (i * 41) % h;
      g.moveTo(x, y);
      g.bezierCurveTo(x + 11, y - 8, x + 20, y + 5, x + 33, y + 7);
      g.stroke();
    }
    g.strokeStyle = "rgba(28,24,18,.35)";
    g.lineWidth = 2;
    for (let p = 0; p <= w; p += 128) {
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.stroke();
    }
    for (let p = 0; p <= h; p += 128) {
      g.beginPath(); g.moveTo(0, p); g.lineTo(w, p); g.stroke();
    }
  }, 512, 512, true);
  polishedFloor.repeat.set(2.8, 2);
  const floorMat = new THREE.MeshStandardMaterial({
    map: polishedFloor, roughness: 0.24, metalness: 0.17, envMapIntensity: 0.45,
  });
  const floor = piece(group, new THREE.PlaneGeometry(16, 12), floorMat, 0, 0.015, 0);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  // Architectural shell: open front portal, solid side/back walls, raised ceiling.
  const brick = surface("/game-v2/materials/brick.jpg", 5, 2, 0.85, 0xbca997);
  box(group, 16, 5.25, 0.16, 0, 2.65, -6, brick);
  for (const x of [-8, 8]) box(group, 0.16, 5.25, 12, x, 2.65, 0, brick);
  for (const x of [-5, 5]) box(group, 6, 5.25, 0.16, x, 2.65, 6, shell);
  box(group, 4, 2.1, 0.16, 0, 4.25, 6, shell);
  box(group, 16, 0.13, 12, 0, 5.25, 0, shell);
  for (const x of [-7.83, 7.83]) {
    box(group, 0.11, 5.0, 0.09, x, 2.59, 0, brass);
    warmStrip(group, 9.4, x, 4.75, -0.1);
  }
  // Preserve the full doorway as a walk-through opening.
  collider(solids, 0, -6, 16.4, 0.5);
  collider(solids, -8, 0, 0.5, 12.4);
  collider(solids, 8, 0, 0.5, 12.4);
  collider(solids, -5, 6, 6.05, 0.5);
  collider(solids, 5, 6, 6.05, 0.5);

  // Brand feature wall and mezzanine overlook.
  insignia(group, 0, 4.22, -5.82, 1.45);
  emblem(group, "SackReligious", 7.0, 1.5, 0, 2.25, -5.82);
  mezzanine(group);

  // Sales area: gold-edged display bays along both side walls.
  for (const z of [-3.65, -0.8, 2.05]) {
    wallDisplay(group, -7.38, z, Math.PI / 2);
    wallDisplay(group, 7.38, z, -Math.PI / 2);
  }

  foldedTable(group, solids, -2.5, -0.4, 2.0);
  foldedTable(group, solids, 2.85, -1.0, 2.0);
  retailCounter(group, solids);
  sofa(group, solids);
  const rug = piece(group, new THREE.PlaneGeometry(3.5, 2.3), velvet, 3.9, 0.028, -3.6, false);
  rug.rotation.x = -Math.PI / 2;

  // Front-of-store pedestal for the mission package and merchandise display.
  box(group, 0.95, 0.8, 0.85, 4.65, 0.42, 2.65, blackFabric);
  box(group, 1.05, 0.065, 0.95, 4.65, 0.86, 2.65, brass);
  const counterPack = box(group, 0.28, 0.16, 0.23, 4.65, 0.98, 2.65, softGold);
  collider(solids, 4.65, 2.65, 1.1, 0.98);

  // The interaction aisle around K Blanco (1.15, 1.9) is deliberately clear.
  const k = spawnBlanco(1.15, 1.9);
  k.userData.heading = 0;
  storePlant(group, -7.15, 4.65);
  storePlant(group, 7.0, 4.65);
  storePlant(group, -5.8, -4.1, 1.4);
  lighting(group, glow);

  // World-space coordinates because the HQ group is offset to (80, 200).
  addGround({ minX: 72, maxX: 88, minZ: 194, maxZ: 206, y: 0.015, id: "hq-sales-floor" });
  return { kSprite: k.getObjectByName("sprite")!, counterPack };
}
