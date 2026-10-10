import * as THREE from "three";
import { canvasTex } from "./materials";

/**
 * Architectural dressing for the LIVE two-hoop 901 court.
 *
 * All additions stay outside the existing playable 22 x 14m surface
 * (centered on the supplied x/z). buildGoal() and gameplay scoring are
 * owned by slice.ts, not duplicated here.
 *
 * Each graphic below is original court-specific signage, NOT a giant
 * pasted production reference image or a billboard building.
 */
const steel = new THREE.MeshStandardMaterial({ color: 0x202b2d, roughness: 0.46, metalness: 0.63 });
const bronze = new THREE.MeshStandardMaterial({ color: 0xb57d35, roughness: 0.38, metalness: 0.59 });
const charcoal = new THREE.MeshStandardMaterial({ color: 0x141a1c, roughness: 0.78 });
const paving = new THREE.MeshStandardMaterial({ color: 0x454f51, roughness: 0.88 });
const tile = new THREE.MeshStandardMaterial({ color: 0x222d2d, roughness: 0.86 });
const warmLight = new THREE.MeshStandardMaterial({
  color: 0xffd0a0, emissive: 0xffb25c, emissiveIntensity: 0.55, roughness: 0.45,
});
const lightsOff = new THREE.MeshStandardMaterial({
  color: 0x5b6462, roughness: 0.43, metalness: 0.42,
});
const basketball = new THREE.MeshStandardMaterial({ color: 0xcc6637, roughness: 0.82 });
const ballStripe = new THREE.MeshStandardMaterial({ color: 0x2e241d, roughness: 0.92 });
const plant = new THREE.MeshStandardMaterial({ color: 0x346a47, roughness: 0.91, side: THREE.DoubleSide });

function part(
  parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material,
  x: number, y: number, z: number, castShadow = true,
) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function box(
  parent: THREE.Object3D, w: number, h: number, d: number,
  x: number, y: number, z: number, mat: THREE.Material,
) {
  return part(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
}
function labelTexture(title: string, subtitle: string, background: string, ink: string) {
  return canvasTex((g, w, h) => {
    g.fillStyle = background;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,.075)";
    for (let i = 0; i < 25; i++) {
      g.fillRect((i * 77) % w, (i * 37) % h, 28, 12);
    }
    g.strokeStyle = "#bc8d48";
    g.lineWidth = 9;
    g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = ink;
    g.textBaseline = "middle";
    g.textAlign = "center";
    g.font = "900 112px Impact, sans-serif";
    g.fillText(title, w / 2, h * 0.43, w * 0.92);
    g.font = "700 37px Arial, sans-serif";
    g.fillText(subtitle, w / 2, h * 0.76, w * 0.85);
  }, 1024, 512);
}
function sign(parent: THREE.Object3D, x: number, y: number, z: number,
  w: number, h: number, title: string, subtitle: string) {
  const mat = new THREE.MeshStandardMaterial({
    map: labelTexture(title, subtitle, "#141f20", "#f6c47d"),
    roughness: 0.63, emissive: 0xffdeaf, emissiveIntensity: 0.08,
    side: THREE.DoubleSide,
  });
  const board = part(parent, new THREE.PlaneGeometry(w, h), mat, x, y, z, false);
  board.name = "court-branded-sign";
  return board;
}
function floodTower(parent: THREE.Object3D, x: number, z: number, yaw: number) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  box(group, 0.2, 7.3, 0.2, 0, 3.65, 0, steel);
  box(group, 1.9, 0.11, 0.22, 0, 7.23, -0.08, steel);
  for (const offset of [-0.63, 0, 0.63]) {
    const shade = box(group, 0.53, 0.29, 0.2, offset, 7.02, 0.05, bronze);
    shade.rotation.x = 0.16;
    const bulb = box(group, 0.41, 0.11, 0.06, offset, 6.94, 0.17, warmLight);
    bulb.castShadow = false;
    box(group, 0.44, 0.035, 0.09, offset, 6.86, 0.16, lightsOff);
  }
  box(group, 0.45, 0.16, 0.45, 0, 0.09, 0, paving);
  parent.add(group);
}
function ballRack(parent: THREE.Object3D, x: number, z: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  // Sideline three-tier racks. Decorative, no new collision in the lane.
  for (const xx of [-0.86, 0.86]) {
    box(g, 0.065, 1.2, 0.065, xx, 0.65, 0, steel);
    box(g, 0.065, 0.065, 0.75, xx, 0.18, 0, steel);
  }
  for (let level = 0; level < 3; level++) {
    const h = 0.31 + level * 0.38;
    box(g, 1.85, 0.04, 0.055, 0, h, -0.23, bronze);
    box(g, 1.85, 0.04, 0.055, 0, h, 0.23, bronze);
    for (let i = 0; i < (level === 2 ? 3 : 2); i++) {
      const xx = (i - (level === 2 ? 1 : 0.5)) * 0.55;
      const ball = part(g, new THREE.SphereGeometry(0.15, 16, 12), basketball, xx, h + 0.17, 0);
      const seam = new THREE.Mesh(new THREE.TorusGeometry(0.147, 0.007, 6, 22), ballStripe);
      seam.rotation.y = Math.PI / 2;
      ball.add(seam);
    }
  }
  g.name = "901-court-ball-rack";
  parent.add(g);
}
function courtGate(parent: THREE.Object3D, cx: number, z: number) {
  const g = new THREE.Group();
  g.position.set(cx, 0, z);
  // Decorative posts at the existing gate edges. The center remains wide
  // open and collision / Court OG positioning stay owned by slice.ts.
  for (const side of [-1, 1]) {
    const x = side * 1.36;
    box(g, 0.15, 3.25, 0.18, x, 1.63, 0, steel);
    box(g, 0.48, 0.18, 0.4, x, 3.35, 0, bronze);
    box(g, 0.28, 0.38, 0.26, x, 3.66, 0, warmLight);
    box(g, 0.2, 0.10, 0.2, x, 3.88, 0, bronze);
  }
  const lintel = box(g, 3.06, 0.24, 0.25, 0, 3.27, 0, charcoal);
  lintel.castShadow = false;
  const banner = sign(g, 0, 3.27, 0.16, 2.64, 0.24, "901 COURT", "");
  banner.name = "901-gate-banner";
  parent.add(g);
}
function mural(parent: THREE.Object3D, x: number, z: number) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  // The wall is dimensional brick/block with separate murals/signage, not a
  // full-screen concept image wrapped around a wall.
  const block = new THREE.MeshStandardMaterial({ color: 0x574a42, roughness: 0.95 });
  box(group, 23.6, 4.25, 0.45, 0, 2.13, 0, block);
  box(group, 24.05, 0.15, 0.65, 0, 4.28, 0, bronze);
  box(group, 24.05, 0.23, 0.74, 0, 0.15, 0, charcoal);
  for (let i = 0; i < 26; i++) {
    const col = -11.4 + i * 0.9;
    box(group, 0.018, 4.1, 0.018, col, 2.15, 0.236, charcoal);
  }
  const art = labelTexture("901", "MEMPHIS · STREETBALL · SACKRELIGIOUS", "#1b2b29", "#efb94b");
  const artMat = new THREE.MeshStandardMaterial({ map: art, roughness: 0.84 });
  const panel = part(group, new THREE.PlaneGeometry(12.4, 3.28), artMat, 0, 2.12, 0.24, false);
  panel.name = "901-mural-panel";
  sign(group, -8.7, 2.3, 0.24, 4.1, 2.25, "COURT", "THE HOME OF 901");
  sign(group, 8.7, 2.3, 0.24, 4.1, 2.25, "MEMPHIS", "RESPECT THE GAME");
  parent.add(group);
}
function shadePlanter(parent: THREE.Object3D, x: number, z: number, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  part(g, new THREE.CylinderGeometry(0.33, 0.27, 0.42, 12), charcoal, 0, 0.26, 0);
  part(g, new THREE.CylinderGeometry(0.022, 0.035, 1.0, 8), steel, 0, 0.89, 0);
  const leaf = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 6, 5), plant, 11);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 11; i++) {
    const a = i * 2.39996;
    const r = 0.23 + 0.1 * (i % 3);
    dummy.position.set(Math.cos(a) * r, 1.15 + (i % 4) * 0.1, Math.sin(a) * r);
    dummy.scale.set(0.63, 1.85, 0.39);
    dummy.rotation.set(Math.sin(a) * 0.35, a, Math.cos(a) * 0.38);
    dummy.updateMatrix();
    leaf.setMatrixAt(i, dummy.matrix);
  }
  leaf.instanceMatrix.needsUpdate = true;
  leaf.frustumCulled = false;
  g.add(leaf);
  parent.add(g);
}
function spectatorZone(parent: THREE.Object3D, x: number, z: number) {
  const rail = new THREE.Group();
  rail.position.set(x, 0, z);
  box(rail, 4.1, 0.12, 0.13, 0, 0.96, 0, steel);
  for (const xx of [-1.95, -0.95, 0, 0.95, 1.95]) {
    box(rail, 0.06, 1.05, 0.1, xx, 0.5, 0, steel);
  }
  box(rail, 4.1, 0.10, 0.17, 0, 0.2, 0, bronze);
  parent.add(rail);
}

/** Does not alter the court floor, goals, physic collision or gate opening. */
export function dress901Court(parent: THREE.Object3D, cx: number, cz: number) {
  const court = new THREE.Group();
  court.name = "901-production-environment";
  // The walkway apron runs OUTSIDE the playable floor, preserving z fighting
  // and the court paint / sole-contact under Benji's feet.
  for (const side of [-1, 1]) {
    box(court, 2.3, 0.07, 16.6, cx + side * 12.45, 0.045, cz, paving);
    box(court, 2.3, 0.08, 0.11, cx + side * 12.45, 0.11, cz + 7.8, bronze);
  }
  for (const side of [-1, 1]) {
    const zz = cz + side * 8.05;
    box(court, 26.7, 0.065, 1.22, cx, 0.04, zz, tile);
    box(court, 26.7, 0.065, 0.08, cx, 0.08, zz + side * 0.58, bronze);
  }
  // Existing scoreboard, stands, hoops and chain link stay intact.
  courtGate(court, cx, cz + 7.25);
  mural(court, cx, cz - 17.55);
  for (const x of [cx - 12.65, cx + 12.65]) {
    for (const z of [cz - 9.35, cz + 9.4]) {
      floodTower(court, x, z, z > cz ? Math.PI : 0);
    }
  }
  ballRack(court, cx + 12.25, cz + 4.9);
  ballRack(court, cx - 12.25, cz - 4.7);
  spectatorZone(court, cx - 5.0, cz + 9.0);
  spectatorZone(court, cx + 5.2, cz + 9.0);
  for (const [x, z, scale] of [
    [cx - 13, cz + 9.0, 1.3],
    [cx + 13, cz + 9.0, 1.3],
    [cx - 13.2, cz - 13.0, 1.1],
    [cx + 13.2, cz - 13.0, 1.1],
  ] as const) shadePlanter(court, x, z, scale);
  court.userData.productionVersion = 1;
  court.userData.gateClearWidth = 2.72;
  court.userData.rimLocationsUnmodified = true;
  parent.add(court);
  return court;
}
