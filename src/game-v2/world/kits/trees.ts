import * as THREE from "three";
import { bark, canvasTex, mulch } from "./materials";

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function canopy(seed: number, dark: string, mid: string, lite: string) {
  return canvasTex((g, w, h) => {
    g.clearRect(0, 0, w, h);
    const colors = [dark, mid, mid, lite, dark];
    for (let i = 0; i < 26; i++) {
      const cx = 28 + ((i * 41 + seed * 17) % 200);
      const cy = 24 + ((i * 33 + seed * 11) % 190);
      const rx = 46 + ((i * 13 + seed) % 28);
      const ry = 36 + ((i * 9 + seed) % 22);
      g.fillStyle = colors[i % colors.length]!;
      g.beginPath();
      g.ellipse(cx, cy, rx, ry, (seed + i) * 0.55, 0, Math.PI * 2);
      g.fill();
    }
  }, 256, 256);
}

const crownMats = new Map<string, THREE.MeshStandardMaterial>();

function leafMat(key: string, seed: number, dark: string, mid: string, lite: string) {
  const hit = crownMats.get(key);
  if (hit) return hit;
  const mat = new THREE.MeshStandardMaterial({
    map: canopy(seed, dark, mid, lite),
    transparent: true,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  crownMats.set(key, mat);
  return mat;
}

/** Irregular tilted clumps. Not three vertical cards crossed into an X. */
function crown(x: number, z: number, y: number, w: number, h: number, mat: THREE.Material, parent: THREE.Object3D) {
  const cards: [number, number, number, number, number][] = [
    [0.35, 0.72, 0, 0.06, 0.88],
    [1.25, -0.48, w * 0.18, -0.14, 0.6],
    [2.15, 0.55, -w * 0.16, -0.04, 0.56],
    [0.8, 1.12, 0.04, 0.16, 0.48],
    [2.55, 0.82, -0.06, -0.22, 0.42],
    [1.7, -0.7, w * 0.08, 0.02, 0.38],
  ];
  for (const [yaw, tilt, ox, oy, s] of cards) {
    const card = mesh(new THREE.PlaneGeometry(w * s, h * s), mat, x + ox, y + oy * h, z, parent);
    card.rotation.order = "YXZ";
    card.rotation.y = yaw;
    card.rotation.x = tilt;
    card.castShadow = false;
  }
}

function trunk(x: number, z: number, h: number, r: number, parent: THREE.Object3D) {
  mesh(new THREE.CylinderGeometry(r * 0.72, r, h, 8), bark(), x, h / 2, z, parent);
  mesh(new THREE.CylinderGeometry(r * 1.35, r * 1.55, h * 0.18, 8), bark(), x, h * 0.08, z, parent);
  const bed = mesh(new THREE.CircleGeometry(Math.max(0.45, r * 3.4), 8), mulch(), x, 0.015, z, parent);
  bed.rotation.x = -Math.PI / 2;
  bed.castShadow = false;
}

export function shadeTree(x: number, z: number, parent: THREE.Object3D, scale = 1) {
  trunk(x, z, 2.4 * scale, 0.16 * scale, parent);
  const mat = leafMat("shade", 2, "#1b4a26", "#2f6b34", "#4e8a46");
  crown(x, z, 2.85 * scale, 2.8 * scale, 2.2 * scale, mat, parent);
}

export function streetTree(x: number, z: number, parent: THREE.Object3D, scale = 1) {
  trunk(x, z, 2.8 * scale, 0.11 * scale, parent);
  const mat = leafMat("street", 4, "#24562c", "#3d7a38", "#6aa45a");
  crown(x, z, 3.3 * scale, 1.8 * scale, 2.0 * scale, mat, parent);
}

export function ornamental(x: number, z: number, parent: THREE.Object3D) {
  trunk(x, z, 1.5, 0.08, parent);
  const mat = leafMat("ornamental", 3, "#6a3048", "#8a4060", "#c46a58");
  crown(x, z, 1.85, 1.15, 1.05, mat, parent);
}

export function matureTree(x: number, z: number, parent: THREE.Object3D) {
  trunk(x, z, 3.1, 0.26, parent);
  const mat = leafMat("mature", 9, "#163e22", "#2a6230", "#3f7a38");
  crown(x, z, 3.8, 3.4, 2.6, mat, parent);
}

export function palmTree(x: number, z: number, parent: THREE.Object3D) {
  const t = mesh(new THREE.CylinderGeometry(0.09, 0.15, 4.4, 8), bark(), x, 2.2, z, parent);
  t.rotation.z = 0.05;
  const tex = canvasTex((g, w, h) => {
    g.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h * 0.78;
    for (let i = 0; i < 9; i++) {
      g.save();
      g.translate(cx, cy);
      g.rotate(-2.5 + (i / 8) * 5);
      const grd = g.createLinearGradient(0, 0, 0, -h * 0.7);
      grd.addColorStop(0, "#1d5430");
      grd.addColorStop(0.55, "#3d8a48");
      grd.addColorStop(1, "rgba(61,138,72,0)");
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(22, -h * 0.3, 8, -h * 0.68);
      g.quadraticCurveTo(0, -h * 0.42, -8, -h * 0.68);
      g.quadraticCurveTo(-22, -h * 0.3, 0, 0);
      g.fill();
      g.restore();
    }
  }, 256, 256);
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide });
  crown(x, z, 4.5, 3.2, 2.4, mat, parent);
}

export function shrub(x: number, z: number, parent: THREE.Object3D, s = 1) {
  const mat = leafMat("shrub", 6, "#1e4e28", "#347238", "#5a9450");
  const h = 0.62 * s;
  const w = 0.9 * s;
  const poses: [number, number, number][] = [
    [0.4, 0.35, 0],
    [1.5, -0.4, 0.04],
    [2.4, 0.55, -0.05],
  ];
  for (const [yaw, tilt, oy] of poses) {
    const card = mesh(new THREE.PlaneGeometry(w, h), mat, x, 0.28 * s + oy, z, parent);
    card.rotation.order = "YXZ";
    card.rotation.y = yaw;
    card.rotation.x = tilt;
    card.castShadow = false;
  }
}

export function crepeMyrtle(x: number, z: number, parent: THREE.Object3D) {
  for (const [ox, oz] of [[0, 0], [0.22, 0.08], [-0.16, 0.12]] as const) {
    const t = mesh(new THREE.CylinderGeometry(0.04, 0.07, 1.7, 6), bark(), x + ox, 0.85, z + oz, parent);
    t.rotation.z = ox * 0.8;
  }
  const mat = leafMat("crepe", 5, "#8a3058", "#d06088", "#f0a0b8");
  crown(x, z, 1.85, 1.5, 1.15, mat, parent);
}
