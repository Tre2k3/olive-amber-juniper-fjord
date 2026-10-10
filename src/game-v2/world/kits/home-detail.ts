import * as THREE from "three";
import { brick, concreteSlab, trim } from "./materials";

/**
 * Finishing details for Benji's hero bungalow.
 * The underlying residence module owns the floor, steps and collisions.
 * These meshes are decorative and intentionally stay out of the centered
 * 1.56m door / path opening, so they cannot create invisible barriers.
 */
const eaveWhite = new THREE.MeshStandardMaterial({ color: 0xf2eadb, roughness: 0.72 });
const oak = new THREE.MeshStandardMaterial({ color: 0x765036, roughness: 0.83 });
const darkOak = new THREE.MeshStandardMaterial({ color: 0x352a22, roughness: 0.76 });
const warmWindow = new THREE.MeshStandardMaterial({
  color: 0xffd49d, emissive: 0xffaf61, emissiveIntensity: 0.38, roughness: 0.2,
});
const brass = new THREE.MeshStandardMaterial({ color: 0xb79c52, metalness: 0.65, roughness: 0.36 });
const iron = new THREE.MeshStandardMaterial({ color: 0x292c2b, metalness: 0.64, roughness: 0.48 });
const foliage = new THREE.MeshStandardMaterial({ color: 0x305f36, roughness: 0.93, side: THREE.DoubleSide });
const foliageLight = new THREE.MeshStandardMaterial({ color: 0x588547, roughness: 0.98, side: THREE.DoubleSide });
const flowers = [
  new THREE.MeshStandardMaterial({ color: 0xe08ba0, roughness: 0.84, side: THREE.DoubleSide }),
  new THREE.MeshStandardMaterial({ color: 0xf8ead0, roughness: 0.84, side: THREE.DoubleSide }),
  new THREE.MeshStandardMaterial({ color: 0xe3b660, roughness: 0.84, side: THREE.DoubleSide }),
];
const wicker = new THREE.MeshStandardMaterial({ color: 0x9b7750, roughness: 0.95 });

function part(
  group: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material,
  x: number, y: number, z: number, shadow = true,
) {
  const o = new THREE.Mesh(geometry, material);
  o.position.set(x, y, z);
  o.castShadow = shadow;
  o.receiveShadow = true;
  group.add(o);
  return o;
}
function beam(group: THREE.Object3D, x: number, y: number, z: number,
  w: number, h: number, d: number, mat: THREE.Material = eaveWhite) {
  return part(group, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
}
const leafShape = new THREE.Shape();
leafShape.moveTo(0, -0.12);
leafShape.quadraticCurveTo(-0.12, 0.02, 0, 0.22);
leafShape.quadraticCurveTo(0.12, 0.02, 0, -0.12);
const leafGeo = new THREE.ShapeGeometry(leafShape);

function floweringBed(group: THREE.Object3D, x: number, z: number, length: number, seed: number) {
  // Leaves and blossoms are authored individual billowy shapes on two crossed
  // depths. Instancing keeps the flowers cheap even at dozens of placements.
  const count = Math.round(length * 17);
  const leaves = new THREE.InstancedMesh(leafGeo, foliage, count * 2);
  const light = new THREE.InstancedMesh(leafGeo, foliageLight, count);
  const blooms = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.105, 0.09), flowers[seed % flowers.length]!, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const n = (i * 57 + seed * 17) % 97;
    const spread = (n / 96 - 0.5) * 0.38;
    const xx = x - length / 2 + ((i + 0.5) / count) * length;
    for (let layer = 0; layer < 2; layer++) {
      dummy.position.set(xx + (layer ? 0.08 : -0.08), 0.26 + (i % 3) * 0.055, z + spread);
      dummy.rotation.set((layer ? -0.2 : 0.2), (i % 4) * 0.87, (i % 2 ? 1 : -1) * 0.25);
      dummy.scale.setScalar(0.65 + (i % 4) * 0.11);
      dummy.updateMatrix();
      leaves.setMatrixAt(i * 2 + layer, dummy.matrix);
    }
    dummy.position.set(xx, 0.34 + i % 4 * 0.035, z - spread * 0.65);
    dummy.rotation.set(0, Math.PI / 2 + (i % 3) * 0.4, 0);
    dummy.scale.setScalar(0.5 + (i % 3) * 0.13);
    dummy.updateMatrix();
    light.setMatrixAt(i, dummy.matrix);
    dummy.position.set(xx, 0.46 + (i % 2) * 0.05, z + spread * 0.5);
    dummy.rotation.set(0, (i % 5) * 0.4, 0.15);
    dummy.scale.setScalar(0.75);
    dummy.updateMatrix();
    blooms.setMatrixAt(i, dummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
  light.instanceMatrix.needsUpdate = true;
  blooms.instanceMatrix.needsUpdate = true;
  leaves.frustumCulled = false;
  light.frustumCulled = false;
  blooms.frustumCulled = false;
  group.add(leaves, light, blooms);
}

function chair(group: THREE.Object3D, x: number, z: number, yaw: number) {
  const g = new THREE.Group();
  g.position.set(x, 0.48, z);
  g.rotation.y = yaw;
  beam(g, 0, 0.22, 0, 0.52, 0.08, 0.45, wicker);
  for (const xx of [-0.23, 0.23]) {
    beam(g, xx, 0.3, -0.16, 0.07, 0.56, 0.08, darkOak);
    beam(g, xx, 0.3, 0.17, 0.07, 0.56, 0.08, darkOak);
    beam(g, xx, 0.5, 0.04, 0.08, 0.08, 0.54, oak);
  }
  beam(g, 0, 0.75, -0.17, 0.51, 0.56, 0.07, wicker);
  for (const xx of [-0.3, 0.3]) {
    beam(g, xx, 0.055, 0, 0.7, 0.055, 0.09, darkOak);
  }
  group.add(g);
}

function hangingPot(group: THREE.Object3D, x: number, ceiling: number, z: number) {
  part(group, new THREE.CylinderGeometry(0.18, 0.12, 0.2, 10), wicker, x, ceiling - 0.61, z);
  const stem = part(group, new THREE.CylinderGeometry(0.01, 0.01, 0.44, 6),
    iron, x, ceiling - 0.27, z);
  stem.castShadow = false;
  for (let i = 0; i < 11; i++) {
    const theta = i * 2.39996;
    const radius = 0.14 + (i % 3) * 0.055;
    const y = ceiling - 0.58 - (i % 4) * 0.06;
    const leaf = part(group, leafGeo, i % 4 ? foliage : foliageLight,
      x + Math.cos(theta) * radius, y, z + Math.sin(theta) * radius, false);
    leaf.rotation.set(0.28, theta, (i % 2 ? 1 : -1) * 0.35);
  }
}

function chimney(group: THREE.Object3D, x: number, y: number, z: number) {
  // Dark fire-brick cap and recessed flue. The residence already builds a
  // chimney core; this small element makes its upper silhouette convincing.
  beam(group, x, y, z, 0.86, 0.11, 0.83, brick());
  beam(group, x, y + 0.07, z, 0.51, 0.035, 0.44, iron);
}

function entrance(group: THREE.Object3D, x: number, z: number, deckZ: number, porchW: number) {
  // No new collision here: these are thin visual trims on the existing geometry.
  beam(group, x, 0.50, deckZ - 1.16, porchW, 0.07, 0.12, oak);
  beam(group, x, 2.56, deckZ - 1.14, porchW + 0.2, 0.12, 0.12, eaveWhite);
  for (const sx of [-1, 1]) {
    const cx = x + sx * porchW * 0.42;
    beam(group, cx, 1.53, deckZ - 1.04, 0.24, 1.48, 0.24, eaveWhite);
    beam(group, cx, 2.19, deckZ - 1.05, 0.37, 0.15, 0.34, eaveWhite);
    beam(group, cx, 0.86, deckZ - 1.05, 0.44, 0.11, 0.38, brick());
  }
  const rug = beam(group, x, 0.494, deckZ + 0.37, 0.91, 0.01, 0.45, darkOak);
  rug.receiveShadow = true;
  // Planters and seating occupy the side bays; keep the 1.56m center aisle open.
  chair(group, x - porchW * 0.31, deckZ + 0.37, Math.PI * 0.06);
  chair(group, x + porchW * 0.3, deckZ + 0.33, -Math.PI * 0.09);
  for (const xx of [-porchW * 0.31, porchW * 0.31]) {
    hangingPot(group, x + xx, 2.38, deckZ - 0.7);
  }
}

export function finishHeroBungalow(
  group: THREE.Object3D, x: number, z: number, w: number, d: number,
  wallH: number, foundationHeight: number, roofRise: number, porchW: number,
) {
  const front = z - d / 2;
  const deckZ = front - 1.35;
  const gableY = foundationHeight + wallH;
  // A visible rear roofline, decorative timber frame and center gable vent.
  for (const sx of [-1, 1]) {
    beam(group, x + sx * (w / 2 + 0.25), gableY - 0.08, z, 0.07, 0.23, d + 1.2, eaveWhite);
  }
  beam(group, x, gableY + roofRise - 0.04, z, w + 1.55, 0.10, 0.16, eaveWhite);
  const vent = beam(group, x, 2.96, front - 0.115, 0.62, 0.43, 0.04, darkOak);
  vent.castShadow = false;
  for (let i = 0; i < 4; i++) {
    beam(group, x - 0.21 + i * 0.14, 2.96, front - 0.15, 0.035, 0.29, 0.025, iron);
  }

  entrance(group, x, front, deckZ, porchW);
  // Main walkway joints read at gameplay scale and meet the current concrete,
  // but don't alter the registered walkable surface at all.
  for (let i = 0; i < 4; i++) {
    const zz = front - 2.55 - i * 0.36;
    beam(group, x, 0.12, zz, 1.12, 0.012, 0.018, darkOak).castShadow = false;
  }
  for (const side of [-1, 1]) {
    const cx = x + side * (w * 0.33);
    floweringBed(group, cx, front - 0.65, w * 0.24, side === -1 ? 1 : 0);
    floweringBed(group, cx, front - 2.12, w * 0.21, side === -1 ? 2 : 1);
    beam(group, x + side * (w * 0.42), 0.07, front - 0.85,
      0.08, 0.07, 1.4, brick()).castShadow = false;
    const pipe = part(group, new THREE.CylinderGeometry(0.035, 0.037, 2.9, 8),
      iron, x + side * (w / 2 + 0.31), 1.52, front + 0.27);
    pipe.castShadow = false;
    beam(group, x + side * (w / 2 + 0.3), 0.24, front + 0.05,
      0.38, 0.08, 0.34, concreteSlab(2));
  }
  chimney(group, x + w * 0.24, foundationHeight + wallH + roofRise * 0.35 + 0.74, z - 0.45);
  // Two warm window-backed reflection panels convey occupied rooms at dusk.
  // They sit behind the existing window layers, never across a doorway.
  for (const sx of [-w * 0.28, w * 0.28]) {
    const glass = beam(group, x + sx, foundationHeight + 1.75,
      front - 0.035, 0.76, 0.87, 0.025, warmWindow);
    glass.castShadow = false;
  }
}
