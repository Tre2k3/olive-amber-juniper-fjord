import * as THREE from "three";
import { bark, canvasTex, mulch } from "./materials";

const yawCards: THREE.Object3D[] = [];
const crownMats = new Map<string, THREE.MeshStandardMaterial>();
const aim = new THREE.Vector3();

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

/** Drop crowns from a previous world build so a remount does not yaw dead meshes. */
export function resetFoliage() {
  yawCards.length = 0;
}

function rgba(hex: string, a: number) {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** One rounded crown. Corners stay clear so the quad never reads as a card. */
function canopy(seed: number, dark: string, mid: string, lite: string) {
  return canvasTex((g, w, h) => {
    g.clearRect(0, 0, w, h);
    const spots: [number, number, number, number][] = [
      [0.5, 0.46, 0.26, 0.28],
      [0.32, 0.52, 0.16, 0.16],
      [0.68, 0.5, 0.16, 0.17],
      [0.5, 0.28, 0.14, 0.13],
      [0.4, 0.34, 0.12, 0.12],
      [0.62, 0.34, 0.12, 0.13],
      [0.48, 0.62, 0.15, 0.12],
    ];
    const colors = [dark, mid, lite, mid, dark];
    for (let i = 0; i < spots.length; i++) {
      const spot = spots[i]!;
      const jitter = ((seed * 13 + i * 7) % 5) / 100;
      const cx = w * (spot[0] + (i % 2 ? jitter : -jitter));
      const cy = h * (spot[1] + jitter * 0.3);
      const rx = w * spot[2];
      const ry = h * spot[3];
      const color = colors[i % colors.length]!;
      const grd = g.createRadialGradient(cx, cy, Math.min(rx, ry) * 0.12, cx, cy, Math.max(rx, ry));
      grd.addColorStop(0, rgba(color, 1));
      grd.addColorStop(0.7, rgba(color, 0.92));
      grd.addColorStop(1, rgba(color, 0));
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
    }
  }, 256, 256);
}

function leafMat(key: string, seed: number, dark: string, mid: string, lite: string) {
  const hit = crownMats.get(key);
  if (hit) return hit;
  const mat = new THREE.MeshStandardMaterial({
    map: canopy(seed, dark, mid, lite),
    transparent: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 1,
    depthWrite: true,
  });
  crownMats.set(key, mat);
  return mat;
}

function billboard(w: number, h: number, x: number, y: number, z: number, mat: THREE.Material, parent: THREE.Object3D) {
  const card = mesh(new THREE.PlaneGeometry(w, h), mat, x, y, z, parent);
  card.castShadow = false;
  card.userData.yawBillboard = 1;
  yawCards.push(card);
  return card;
}

/**
 * Camera-facing canopy. One or two upright planes, never a tilted card that
 * turns edge-on. Cheaper than the old six-plane crown.
 */
function crown(x: number, z: number, y: number, w: number, h: number, mat: THREE.Material, parent: THREE.Object3D, layers = 1) {
  billboard(w, h, x, y, z, mat, parent);
  if (layers > 1) billboard(w * 0.72, h * 0.64, x + w * 0.04, y + h * 0.1, z + 0.18, mat, parent);
}

/** Yaw every crown so the flat side never faces the camera. */
export function faceFoliage(cam: THREE.Vector3) {
  for (const card of yawCards) {
    card.getWorldPosition(aim);
    card.lookAt(cam.x, aim.y, cam.z);
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

let leafCard: THREE.MeshStandardMaterial | null = null;

function streetLeaves() {
  if (leafCard) return leafCard;
  const map = new THREE.TextureLoader().load("/game-v2/materials/leaves.png");
  map.colorSpace = THREE.SRGBColorSpace;
  leafCard = new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    alphaTest: 0.2,
    side: THREE.DoubleSide,
    roughness: 0.86,
    depthWrite: true,
  });
  return leafCard;
}

export function streetTree(x: number, z: number, parent: THREE.Object3D, scale = 1) {
  trunk(x, z, 2.8 * scale, 0.11 * scale, parent);
  crown(x, z, 3.3 * scale, 2.15 * scale, 2.35 * scale, streetLeaves(), parent);
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
  crown(x, z, 4.5, 3.2, 2.4, mat, parent, 1);
}

export function shrub(x: number, z: number, parent: THREE.Object3D, s = 1) {
  const mat = leafMat("shrub", 6, "#1e4e28", "#347238", "#5a9450");
  billboard(0.95 * s, 0.7 * s, x, 0.34 * s, z, mat, parent);
}

export function crepeMyrtle(x: number, z: number, parent: THREE.Object3D) {
  for (const [ox, oz] of [[0, 0], [0.22, 0.08], [-0.16, 0.12]] as const) {
    const t = mesh(new THREE.CylinderGeometry(0.04, 0.07, 1.7, 6), bark(), x + ox, 0.85, z + oz, parent);
    t.rotation.z = ox * 0.8;
  }
  const mat = leafMat("crepe", 5, "#8a3058", "#d06088", "#f0a0b8");
  crown(x, z, 1.85, 1.5, 1.15, mat, parent);
}
