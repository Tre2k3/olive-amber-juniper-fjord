import * as THREE from "three";
import { canvasTex } from "./kits/materials";

/**
 * Memphis riverfront world-art kit.
 *
 * Local fishing gameplay, walkable surfaces, pier collision and bait location
 * are still owned by districts.ts. This module only adds a coherent
 * riverfront composition: an original detailed steel-arch bridge, trusswork,
 * paving furniture, edge railings, fishing props and water highlights.
 *
 * All items are actual 3D meshes or small procedural materials, never
 * pasted full-scene concept art. No new raycast/collision surfaces.
 */
const iron = new THREE.MeshStandardMaterial({ color: 0x454e52, metalness: 0.68, roughness: 0.43 });
const bridgeRed = new THREE.MeshStandardMaterial({ color: 0x966a49, metalness: 0.47, roughness: 0.5 });
const stone = new THREE.MeshStandardMaterial({ color: 0xb4a394, metalness: 0.08, roughness: 0.9 });
const pierWood = new THREE.MeshStandardMaterial({ color: 0x6a5037, metalness: 0, roughness: 0.87 });
const blue = new THREE.MeshStandardMaterial({ color: 0x244a61, roughness: 0.55, metalness: 0.12 });
const orange = new THREE.MeshStandardMaterial({ color: 0xd98039, metalness: 0.04, roughness: 0.66 });
const golden = new THREE.MeshStandardMaterial({ color: 0xf1c47b, emissive: 0xfbbf68, emissiveIntensity: 0.55, roughness: 0.37 });
const lanternGlass = new THREE.MeshStandardMaterial({ color: 0xffe4b5, emissive: 0xffca86, emissiveIntensity: 0.6 });
const foliage = new THREE.MeshStandardMaterial({ color: 0x315d3c, roughness: 0.95, side: THREE.DoubleSide });

function mesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) {
  return mesh(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
}
function cable(parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, radius: number, mat: THREE.Material) {
  const direction = to.clone().sub(from);
  const center = from.clone().add(to).multiplyScalar(0.5);
  const cylinder = mesh(parent, new THREE.CylinderGeometry(radius, radius, direction.length(), 7), mat, center.x, center.y, center.z);
  cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return cylinder;
}
function bridgeArch(group: THREE.Object3D, start: number, end: number, z: number) {
  const deckY = 6.5, archStart = 7.2, rise = 7.2, count = 20;
  const arch = (t: number) => archStart + rise * Math.sin(t * Math.PI);
  const span = end - start;
  const points = Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count;
    return new THREE.Vector3(start + span * t, arch(t), z);
  });
  mesh(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 56, 0.13, 7, false), bridgeRed, 0, 0, 0);
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = start + span * t;
    cable(group, new THREE.Vector3(x, deckY + 0.3, z), new THREE.Vector3(x, arch(t) - 0.12, z), 0.038, iron);
    if (i < 12) {
      const t2 = (i + 1) / 12;
      cable(group,
        new THREE.Vector3(x, deckY + 0.3, z),
        new THREE.Vector3(start + span * t2, arch(t2) - 0.15, z),
        0.02, iron);
    }
  }
}
function bridge(group: THREE.Object3D) {
  // Two recognizable arches crossing the Mississippi far behind the pier.
  // Each arch spans 18m in a 36m original design, with bracing and roadway.
  const x0 = -12, mid = 6, end = 24, z = -91;
  box(group, end - x0 + 2.4, 0.35, 2.55, (x0 + end) / 2, 6.44, z, iron);
  box(group, end - x0 + 2.4, 0.16, 0.24, (x0 + end) / 2, 6.73, z - 1.42, bridgeRed);
  box(group, end - x0 + 2.4, 0.16, 0.24, (x0 + end) / 2, 6.73, z + 1.42, bridgeRed);
  for (const zz of [z - 1.25, z + 1.25]) {
    bridgeArch(group, x0, mid, zz);
    bridgeArch(group, mid, end, zz);
    for (let x = x0; x <= end; x += 2.25) {
      box(group, 0.07, 0.82, 0.10, x, 7.05, zz, iron);
    }
  }
  for (const x of [x0, mid, end]) {
    box(group, 1.24, 6.25, 1.9, x, 3.15, z, stone);
    box(group, 1.38, 0.32, 2.0, x, 6.38, z, bridgeRed);
  }
  for (const x of [x0, mid, end]) {
    cable(group, new THREE.Vector3(x, 7.1, z - 1.25), new THREE.Vector3(x, 7.1, z + 1.25), 0.055, iron);
  }
  group.userData.archSpanCount = 2;
}
function railSegment(parent: THREE.Object3D, left: number, right: number, z: number) {
  if (right <= left) return;
  const length = right - left, cx = (left + right) / 2;
  box(parent, length, 0.10, 0.095, cx, 1.12, z, iron);
  box(parent, length, 0.07, 0.10, cx, 0.30, z, iron);
  for (let x = left; x <= right + 0.1; x += 1.3) {
    box(parent, 0.055, 1.13, 0.07, Math.min(x, right), 0.61, z, iron);
  }
  for (let x = left; x <= right + 0.1; x += 4.0) {
    const px = Math.min(x, right);
    box(parent, 0.16, 1.25, 0.16, px, 0.64, z, bridgeRed);
  }
}
function bench(parent: THREE.Object3D, x: number, z: number, yaw: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  for (const sx of [-0.7, 0.7]) {
    box(g, 0.055, 0.45, 0.43, sx, 0.25, 0, iron);
  }
  for (const dz of [-0.12, 0.04, 0.20]) {
    box(g, 1.55, 0.055, 0.125, 0, 0.47, dz, pierWood);
  }
  for (const yy of [0.74, 0.91]) {
    box(g, 1.55, 0.12, 0.065, 0, yy, -0.23, pierWood);
  }
  parent.add(g);
}
function lamp(parent: THREE.Object3D, x: number, z: number) {
  box(parent, 0.12, 3.0, 0.12, x, 1.55, z, iron);
  box(parent, 0.29, 0.12, 0.29, x, 3.1, z, bridgeRed);
  box(parent, 0.24, 0.27, 0.24, x, 3.35, z, lanternGlass);
  box(parent, 0.36, 0.09, 0.36, x, 3.52, z, iron);
  const light = box(parent, 0.18, 0.06, 0.18, x, 3.44, z, golden);
  light.castShadow = false;
}
function flowerPlanter(parent: THREE.Object3D, x: number, z: number, variant: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  mesh(g, new THREE.CylinderGeometry(0.33, 0.25, 0.46, 10), stone, 0, 0.29, 0);
  const blade = new THREE.PlaneGeometry(0.20, 0.53);
  const leaves = new THREE.InstancedMesh(blade, foliage, 14);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 14; i++) {
    const theta = i * Math.PI * 2 / 14 + variant * 0.6;
    dummy.position.set(Math.sin(theta) * 0.22, 0.8 + (i % 3) * 0.13, Math.cos(theta) * 0.22);
    dummy.rotation.set(0, theta, Math.sin(theta) * 0.1);
    dummy.scale.setScalar(0.65 + (i % 3) * 0.15);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
  leaves.frustumCulled = false;
  g.add(leaves);
  parent.add(g);
}
function pierProps(parent: THREE.Object3D) {
  // Rails, bollards and tackle display stay at the sides to leave the center
  // line of the fishing jetty open for walking and the existing cast prompt.
  const dockX = -16;
  for (const z of [-66, -69.5, -73, -77.5]) {
    for (const dx of [-2.05, 2.05]) {
      box(parent, 0.26, 1.08, 0.26, dockX + dx, 0.79, z, pierWood);
      box(parent, 0.31, 0.10, 0.31, dockX + dx, 1.33, z, bridgeRed);
    }
  }
  for (let z = -65; z >= -79; z -= 0.66) {
    box(parent, 4.11, 0.025, 0.045, dockX, 0.524, z, iron).castShadow = false;
  }
  // A few prepared fishing rods leaning out over the river.
  for (const [x,z,theta] of [[-17.86,-73,0.16],[-14.12,-76,-0.19]] as const) {
    cable(parent, new THREE.Vector3(x, 0.62, z), new THREE.Vector3(x + Math.sin(theta) * 1.35, 2.35, z - 1.4), 0.017, iron);
    box(parent, 0.28, 0.27, 0.39, x, 0.54, z + 0.31, blue);
  }
  const cooler = box(parent, 0.7, 0.4, 0.42, -15.2, 0.76, -78.9, blue);
  cooler.name = "river-fishing-cooler";
  box(parent, 0.78, 0.07, 0.46, -15.2, 1.0, -78.9, golden);
  const baitBox = box(parent, 0.8, 0.23, 0.47, -17.05, 0.67, -78.8, orange);
  baitBox.name = "river-tackle-box";
}
function baitStore(parent: THREE.Object3D) {
  // Existing bait shack remains untouched; dress its existing front wall.
  const g = new THREE.Group();
  g.name = "river-bait-shop-front";
  box(g, 5.65, 0.15, 1.05, -30, 2.75, -57.35, orange);
  for (const dx of [-2.5, -1.25, 0, 1.25, 2.5]) {
    box(g, 0.05, 0.21, 0.05, -30 + dx, 2.54, -56.91, iron);
  }
  box(g, 1.8, 1.25, 0.09, -31.4, 1.55, -57.7, iron);
  box(g, 1.65, 1.04, 0.04, -31.4, 1.55, -57.62, blue);
  box(g, 0.08, 1.05, 0.05, -31.4, 1.55, -57.58, golden);
  const barrel = mesh(g, new THREE.CylinderGeometry(0.27, 0.27, 0.8, 11), blue, -27.45, 0.41, -57.05);
  barrel.name = "bait-livewell";
  for (const dx of [-1.9, -1.1]) {
    box(g, 0.06, 1.7, 0.06, -30 + dx, 1.05, -57.1, iron);
  }
  parent.add(g);
}
function waterHighlights(parent: THREE.Object3D) {
  // Narrow instanced ripples, not a flat screenshot or a giant second water plane.
  const ripples = new THREE.MeshBasicMaterial({ color: 0xcac6b1, transparent: true, opacity: 0.16, depthWrite: false });
  const geom = new THREE.PlaneGeometry(0.95, 0.025);
  const group = new THREE.InstancedMesh(geom, ripples, 150);
  const transform = new THREE.Object3D();
  for (let i = 0; i < 150; i++) {
    const x = -52 + (i * 47) % 106;
    const z = -69 - (i * 23) % 31;
    transform.position.set(x, 0.049, z);
    transform.rotation.set(-Math.PI / 2, 0, 0);
    transform.scale.set(0.25 + (i % 7) * 0.2, 1, 1);
    transform.updateMatrix();
    group.setMatrixAt(i, transform.matrix);
  }
  group.instanceMatrix.needsUpdate = true;
  group.frustumCulled = false;
  group.name = "river-water-highlights";
  parent.add(group);
}
let riverWater: THREE.MeshStandardMaterial | null = null;
/** Small generated tiling texture with layered blue/amber wave lines. */
export function riverWaterMaterial() {
  if (riverWater) return riverWater;
  const tex = canvasTex((g, w, h) => {
    const gradient = g.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#2b5269");
    gradient.addColorStop(0.55, "#2b596b");
    gradient.addColorStop(1, "#18384f");
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 210; i++) {
      const px = (i * 57) % w;
      const py = (i * 79) % h;
      g.beginPath();
      g.moveTo(px, py);
      g.quadraticCurveTo(px + 18, py - 3, px + 45 + i % 19, py + 1);
      g.lineWidth = i % 5 === 0 ? 2 : 0.9;
      g.strokeStyle = i % 7 === 0 ? "rgba(242,179,105,.15)" : "rgba(206,226,222,.14)";
      g.stroke();
    }
  }, 512, 512, true);
  tex.repeat.set(6, 2);
  riverWater = new THREE.MeshStandardMaterial({
    map: tex, color: 0x91aab1, roughness: 0.36, metalness: 0.18,
    emissive: 0x12364e, emissiveIntensity: 0.12,
  });
  return riverWater;
}
export function dressRiverfront(parent: THREE.Object3D) {
  const scene = new THREE.Group();
  scene.name = "memphis-riverfront-production";
  bridge(scene);
  // Existing promenade runs from x=-43 to 27 at z=-64. A deliberately open
  // center segment leads to the fishing pier without crossing new railings.
  railSegment(scene, -42.5, -18.8, -66.25);
  railSegment(scene, -13.2, 26.5, -66.25);
  for (const x of [-37, -26, -4, 8, 21]) {
    lamp(scene, x, -62.15);
  }
  for (const x of [-34, -25, -6, 13, 23]) {
    flowerPlanter(scene, x, -64.25, Math.floor(x));
  }
  for (const [x, z, yaw] of [[-36,-63.55,Math.PI],[1,-63.55,Math.PI],[17,-63.55,Math.PI]] as const) {
    bench(scene, x, z, yaw);
  }
  pierProps(scene);
  baitStore(scene);
  waterHighlights(scene);
  scene.userData.productionVersion = 1;
  scene.userData.bridgeSpanCount = 2;
  scene.userData.pierLocation = { x: -16, z: -70 };
  parent.add(scene);
  return scene;
}
