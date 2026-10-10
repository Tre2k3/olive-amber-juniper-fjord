import * as THREE from "three";
import { canvasTex, trim } from "./materials";

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

const black = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.55, metalness: 0.2 });
const red = new THREE.MeshStandardMaterial({ color: 0xb43322, roughness: 0.5 });
const silver = new THREE.MeshStandardMaterial({ color: 0xc5c8ce, roughness: 0.35, metalness: 0.7 });

export function mailbox(x: number, z: number, parent: THREE.Object3D, blue = false) {
  const boxMat = new THREE.MeshStandardMaterial({ color: blue ? 0x1f4d8a : 0xb43322, roughness: 0.5 });
  mesh(new THREE.BoxGeometry(0.08, 1.05, 0.08), black, x, 0.52, z, parent);
  mesh(new THREE.BoxGeometry(0.42, 0.28, 0.28), boxMat, x, 1.05, z, parent);
  mesh(new THREE.BoxGeometry(0.46, 0.06, 0.32), black, x, 1.2, z, parent);
  const flag = mesh(new THREE.BoxGeometry(0.04, 0.16, 0.1), red, x + 0.24, 1.12, z, parent);
  flag.castShadow = false;
}

export function hydrant(x: number, z: number, parent: THREE.Object3D) {
  mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.55, 10), red, x, 0.32, z, parent);
  mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 10), silver, x, 0.62, z, parent);
  mesh(new THREE.BoxGeometry(0.28, 0.08, 0.08), silver, x, 0.4, z, parent);
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8), black, x, 0.7, z, parent);
}

export function trashBin(x: number, z: number, parent: THREE.Object3D) {
  const body = new THREE.MeshStandardMaterial({ color: 0x2f4a38, roughness: 0.62, metalness: 0.08 });
  mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.86, 14), body, x, 0.46, z, parent);
  mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.07, 14), black, x, 0.9, z, parent);
  mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 12, Math.PI), silver, x, 0.72, z + 0.3, parent);
}

let streetlightPool: THREE.Texture | null = null;

function poolTexture() {
  if (streetlightPool) return streetlightPool;
  streetlightPool = canvasTex((g, w, h) => {
    g.clearRect(0, 0, w, h);
    const glow = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w * 0.49);
    glow.addColorStop(0, "rgba(255,210,123,0.95)");
    glow.addColorStop(0.22, "rgba(255,191,97,0.55)");
    glow.addColorStop(0.64, "rgba(255,166,69,0.12)");
    glow.addColorStop(1, "rgba(255,160,64,0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);
  }, 128, 128);
  return streetlightPool;
}

/** Streetlight uses one physical point light + a cheap dynamic floor halo. */
export function streetlight(x: number, z: number, parent: THREE.Object3D, lights: THREE.PointLight[]) {
  mesh(new THREE.CylinderGeometry(0.075, 0.105, 4.75, 9), black, x, 2.38, z, parent);
  const arm = mesh(new THREE.BoxGeometry(0.98, 0.09, 0.13), black, x + 0.45, 4.68, z, parent);
  arm.rotation.z = -0.055;
  mesh(new THREE.BoxGeometry(0.09, 0.19, 0.13), black, x + 0.89, 4.59, z, parent);
  mesh(new THREE.BoxGeometry(0.75, 0.10, 0.39), silver, x + 0.91, 4.45, z, parent);
  // The yellow light now comes from a modeled luminaire rather than a floating box.
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xffebcd, emissive: 0xffb659, emissiveIntensity: 0.2,
    roughness: 0.33, metalness: 0.04,
  });
  const diffuser = mesh(new THREE.BoxGeometry(0.60, 0.055, 0.30), bulbMat,
    x + 0.91, 4.375, z, parent);
  diffuser.castShadow = false;

  const haloMat = new THREE.MeshBasicMaterial({
    map: poolTexture(), transparent: true, depthWrite: false,
    opacity: 0, color: 0xffe8b6,
    side: THREE.DoubleSide, polygonOffset: true,
    polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 5.4), haloMat);
  halo.name = "street-lamp-light-pool";
  halo.rotation.x = -Math.PI / 2;
  halo.position.set(x + 0.94, 0.183, z);
  halo.renderOrder = 1;
  parent.add(halo);

  const light = new THREE.PointLight(0xffc27a, 0, 14, 2);
  light.position.set(x + 0.9, 4.35, z);
  light.userData.bulbMaterial = bulbMat;
  light.userData.haloMaterial = haloMat;
  parent.add(light);
  lights.push(light);
}

export function picketFence(x: number, z: number, len: number, parent: THREE.Object3D) {
  const wood = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.75 });
  const posts = Math.max(2, Math.round(len / 1.2));
  for (let i = 0; i < posts; i++) {
    const px = x - len / 2 + (i / (posts - 1)) * len;
    mesh(new THREE.BoxGeometry(0.06, 0.85, 0.06), wood, px, 0.42, z, parent);
  }
  mesh(new THREE.BoxGeometry(len, 0.05, 0.04), wood, x, 0.62, z, parent);
  mesh(new THREE.BoxGeometry(len, 0.05, 0.04), wood, x, 0.28, z, parent);
}

export function bench(x: number, z: number, yaw: number, parent: THREE.Object3D) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a32, roughness: 0.8 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.42), wood);
  seat.position.y = 0.46;
  g.add(seat);
  for (const sx of [-0.68, 0.68]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 0.36), black);
    leg.position.set(sx, 0.23, 0);
    g.add(leg);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.36, 0.06), wood);
  back.position.set(0, 0.72, -0.18);
  g.add(back);
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  parent.add(g);
}

export function utilityPole(x: number, z: number, parent: THREE.Object3D) {
  mesh(new THREE.CylinderGeometry(0.08, 0.11, 6.4, 6), new THREE.MeshStandardMaterial({ color: 0x3a342c, roughness: 0.9 }), x, 3.2, z, parent);
  mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), trim, x, 6.15, z, parent);
}

export function stormDrain(x: number, z: number, parent: THREE.Object3D) {
  mesh(new THREE.BoxGeometry(0.72, 0.04, 0.42), black, x, 0.07, z, parent);
  mesh(new THREE.BoxGeometry(0.56, 0.02, 0.06), silver, x, 0.09, z, parent);
  mesh(new THREE.BoxGeometry(0.56, 0.02, 0.06), silver, x, 0.09, z + 0.12, parent);
  mesh(new THREE.BoxGeometry(0.56, 0.02, 0.06), silver, x, 0.09, z - 0.12, parent);
}

export function planter(x: number, z: number, parent: THREE.Object3D) {
  mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.55, 12), black, x, 0.3, z, parent);
  mesh(new THREE.SphereGeometry(0.34, 10, 8), new THREE.MeshStandardMaterial({ color: 0x2f6a34, roughness: 0.9 }), x, 0.62, z, parent);
}
