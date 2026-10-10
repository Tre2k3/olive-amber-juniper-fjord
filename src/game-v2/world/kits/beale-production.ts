import * as THREE from "three";
import { canvasTex } from "./materials";

/**
 * Beale Street nightlife atmosphere.
 *
 * All geometry is produced from reusable primitives and small original sign
 * canvases. Nothing uses reference-board screenshots as facade textures.
 * No collision alterations: furniture remains outside driving and pedestrian
 * navigation lanes; district sidewalks/roads are still owned by city.ts.
 */
const metal = new THREE.MeshStandardMaterial({ color: 0x171d25, roughness: 0.46, metalness: 0.75 });
const gold = new THREE.MeshStandardMaterial({ color: 0xe5ab53, roughness: 0.39, metalness: 0.62 });
const dark = new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.78 });
const wood = new THREE.MeshStandardMaterial({ color: 0x624332, roughness: 0.83 });
const emerald = new THREE.MeshStandardMaterial({ color: 0x176b52, roughness: 0.78 });
const red = new THREE.MeshStandardMaterial({ color: 0x932f33, roughness: 0.64 });
const glowAmber = new THREE.MeshStandardMaterial({
  color: 0xffe4bb, emissive: 0xffa94e, emissiveIntensity: 0.8, roughness: 0.42,
});
const glowBlue = new THREE.MeshStandardMaterial({
  color: 0x8bc9ff, emissive: 0x238fff, emissiveIntensity: 1.25, roughness: 0.42,
});
const glowRed = new THREE.MeshStandardMaterial({
  color: 0xff9aa1, emissive: 0xff234c, emissiveIntensity: 1.2, roughness: 0.42,
});

function mesh(
  parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material,
  x: number, y: number, z: number, shadow = true,
) {
  const o = new THREE.Mesh(geo, mat);
  o.position.set(x, y, z);
  o.castShadow = shadow;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
function box(parent: THREE.Object3D, w: number, h: number, d: number,
  x: number, y: number, z: number, mat: THREE.Material) {
  return mesh(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
}
function signTexture(text: string, color: string, vertical = false) {
  const w = vertical ? 256 : 1024;
  const h = vertical ? 768 : 256;
  return canvasTex((g, iw, ih) => {
    g.clearRect(0, 0, iw, ih);
    g.fillStyle = "#101521";
    g.fillRect(5, 5, iw - 10, ih - 10);
    g.strokeStyle = color;
    g.shadowBlur = 22;
    g.shadowColor = color;
    g.lineWidth = 12;
    g.strokeRect(16, 16, iw - 32, ih - 32);
    g.fillStyle = color;
    g.textBaseline = "middle";
    g.textAlign = "center";
    if (vertical) {
      const parts = text.split("");
      g.font = "900 78px Arial, sans-serif";
      const top = (ih - parts.length * 99) / 2 + 47;
      for (let i = 0; i < parts.length; i++) g.fillText(parts[i]!, iw / 2, top + i * 99);
    } else {
      g.font = "900 142px Arial, sans-serif";
      g.fillText(text, iw / 2, ih * 0.53, iw * 0.9);
      g.font = "700 42px Arial, sans-serif";
      g.shadowBlur = 0;
      g.fillText("MEMPHIS, TENNESSEE", iw / 2, ih * 0.83, iw * 0.8);
    }
  }, w, h);
}
function bladeSign(
  parent: THREE.Object3D, x: number, z: number, forward: 1 | -1,
  label: string, ink: string, glow: THREE.MeshStandardMaterial[],
) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const outer = box(g, 1.23, 3.15, 0.16, 0, 4.28, 0, metal);
  outer.rotation.y = Math.PI / 2;
  // Plane faces the length of the street, rather than hiding flat against the building.
  const material = new THREE.MeshStandardMaterial({
    map: signTexture(label, ink, true),
    emissive: 0xffe5ca, emissiveMap: signTexture(label, ink, true),
    emissiveIntensity: 0.52, roughness: 0.41,
    side: THREE.DoubleSide,
  });
  glow.push(material);
  const face = mesh(g, new THREE.PlaneGeometry(1.09, 2.92), material, 0, 4.28, 0.108, false);
  face.rotation.y = Math.PI / 2;
  box(g, 0.09, 0.09, 0.83, 0, 5.76, -forward * 0.38, metal);
  box(g, 0.09, 0.09, 0.83, 0, 2.89, -forward * 0.38, metal);
  parent.add(g);
}
function marquee(parent: THREE.Object3D, x: number, z: number, direction: 1 | -1,
  width: number, text: string, glow: THREE.MeshStandardMaterial[]) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const face = direction * 0.07;
  box(group, width, 0.22, 1.18, 0, 3.45, direction * 0.53, dark);
  box(group, width + 0.22, 0.08, 1.29, 0, 3.57, direction * 0.56, gold);
  const sign = new THREE.MeshStandardMaterial({
    map: signTexture(text, "#fbd6a1"), emissive: 0xffffff,
    emissiveMap: signTexture(text, "#fbd6a1"), emissiveIntensity: 0.62,
    roughness: 0.38, side: THREE.DoubleSide,
  });
  glow.push(sign);
  const panel = mesh(group, new THREE.PlaneGeometry(width - 0.35, 0.75),
    sign, 0, 3.13, direction * 1.17 + face, false);
  if (direction < 0) panel.rotation.y = Math.PI;
  for (let i = 0; i < 14; i++) {
    const xx = -width * 0.47 + i * width * 0.94 / 13;
    mesh(group, new THREE.SphereGeometry(0.044, 7, 5), glowAmber,
      xx, 3.42, direction * 1.1, false);
  }
  parent.add(group);
}
function stringLights(parent: THREE.Object3D, x: number) {
  const group = new THREE.Group();
  group.name = "beale-catenary-lights";
  const startZ = -45.7, endZ = -61.4;
  const n = 16;
  const line = new THREE.CatmullRomCurve3(
    Array.from({length: n + 1}, (_, i) => {
      const t = i / n;
      return new THREE.Vector3(x, 6.3 - Math.sin(t * Math.PI) * 0.7, startZ + (endZ - startZ) * t);
    }),
  );
  mesh(group, new THREE.TubeGeometry(line, n, 0.012, 5, false), dark, 0, 0, 0, false);
  const bulbGeometry = new THREE.SphereGeometry(0.075, 8, 6);
  for (let i = 1; i < n; i++) {
    const p = line.getPoint(i / n);
    const lightMat = i % 5 === 0 ? glowBlue : glowAmber;
    mesh(group, bulbGeometry, lightMat, p.x, p.y - 0.11, p.z, false);
    box(group, 0.055, 0.095, 0.055, p.x, p.y - 0.015, p.z, metal).castShadow = false;
  }
  parent.add(group);
}
function sidewalkCafe(parent: THREE.Object3D, x: number, z: number, yaw: number) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  const leg = new THREE.CylinderGeometry(0.035, 0.048, 0.68, 7);
  mesh(group, leg, metal, 0, 0.39, 0);
  mesh(group, new THREE.CylinderGeometry(0.36, 0.36, 0.045, 12), wood, 0, 0.74, 0);
  for (const sx of [-0.58, 0.58]) {
    box(group, 0.34, 0.065, 0.32, sx, 0.45, 0, wood);
    box(group, 0.05, 0.45, 0.05, sx, 0.25, 0, metal);
    box(group, 0.32, 0.32, 0.06, sx + (sx > 0 ? 0.14 : -0.14), 0.69, 0, wood);
  }
  // Cafe furniture stays against the storefront, not in the car lane.
  parent.add(group);
}
function musicAwning(parent: THREE.Object3D, x: number, z: number, face: 1 | -1) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  box(group, 4.2, 0.09, 0.9, 0, 2.65, face * 0.52, emerald);
  for (let i = 0; i <= 5; i++) {
    const xx = -2.08 + 0.83 * i;
    box(group, 0.08, 0.22, 0.08, xx, 2.55, face * 0.99, i % 2 ? red : emerald);
  }
  for (const xx of [-1.9, 1.9]) {
    box(group, 0.075, 1.9, 0.065, xx, 1.57, face * 1.03, gold);
  }
  parent.add(group);
}
function poster(parent: THREE.Object3D, x: number, z: number, face: 1 | -1,
  title: string, glow: THREE.MeshStandardMaterial[]) {
  const tex = signTexture(title, "#d69761");
  const mat = new THREE.MeshStandardMaterial({ map:tex, roughness:0.83,
    emissive:0xffb478, emissiveMap:tex, emissiveIntensity:0.26 });
  glow.push(mat);
  box(parent, 1.86, 1.23, 0.10, x, 1.63, z, metal);
  const panel = mesh(parent, new THREE.PlaneGeometry(1.74, 1.10), mat,
    x, 1.63, z + face * 0.073, false);
  if (face < 0) panel.rotation.y = Math.PI;
}

/** Beale's hero storefronts gain real projected signs, frontage and overhead depth. */
export function dressBealeNightlife(
  parent: THREE.Object3D, glow: THREE.MeshStandardMaterial[],
) {
  const group = new THREE.Group();
  group.name = "beale-production-nightlife";
  // North side building front sits about z=-46; the south side fronts z=-62.
  bladeSign(group, 25.1, -46.8, -1, "BLUES", "#fc3758", glow);
  bladeSign(group, 53.4, -46.8, -1, "BEALE", "#5af2b2", glow);
  bladeSign(group, 65.7, -46.6, -1, "WAX", "#93c6ff", glow);
  bladeSign(group, 33.1, -61.9, 1, "SOUL", "#f6b35a", glow);
  bladeSign(group, 64.8, -61.9, 1, "LIVE", "#d477ff", glow);
  marquee(group, 22, -46.4, -1, 4.9, "BLUES", glow);
  marquee(group, 52.2, -46.4, -1, 5.6, "LIVE", glow);
  marquee(group, 44.1, -62.1, 1, 5.7, "MEMPHIS", glow);
  musicAwning(group, 28.7, -62.0, 1);
  musicAwning(group, 65.1, -62.0, 1);
  poster(group, 18.8, -46.45, -1, "901", glow);
  poster(group, 72.2, -62.15, 1, "BLUES", glow);
  for(const x of [20, 35, 51, 67, 76]) stringLights(group, x);
  // Narrow frontage tables are outside the 2.2m principal sidewalk.
  for (const x of [23.5, 28.2, 49.5, 56.5, 68.5]) {
    sidewalkCafe(group, x, -63.2, (x % 2 > 1 ? 0.12 : -0.1));
  }
  group.userData.productionVersion = 1;
  group.userData.facingStorefrontCount = 5;
  group.userData.catenaryCount = 5;
  parent.add(group);
  return group;
}
