import * as THREE from "three";

export type VehicleKind = "coupe" | "sedan" | "suv" | "van";
type Face = "front" | "back" | "left" | "right";

const SIZE: Record<VehicleKind, { length: number; width: number; height: number }> = {
  sedan: { length: 4.7, width: 1.9, height: 1.45 },
  suv: { length: 5.05, width: 2.05, height: 1.85 },
  van: { length: 5.7, width: 2.15, height: 2.45 },
  coupe: { length: 4.9, width: 1.9, height: 1.4 },
};

const loader = new THREE.TextureLoader();
const cache = new Map<string, THREE.Texture>();

function tex(kind: VehicleKind, face: Face) {
  const key = `${kind}-${face}`;
  let map = cache.get(key);
  if (!map) {
    map = loader.load(`/game-v2/vehicles/${key}.png?v=4`);
    map.colorSpace = THREE.SRGBColorSpace;
    map.generateMipmaps = false;
    map.minFilter = THREE.LinearFilter;
    map.magFilter = THREE.LinearFilter;
    cache.set(key, map);
  }
  return map;
}

export type VehicleCard = {
  group: THREE.Group;
  card: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  kind: VehicleKind;
  views: Record<Face, THREE.Texture>;
  face: Face;
};

export const vehicleCards: VehicleCard[] = [];

// Build a shallow structural rig behind each original illustrated vehicle
// turnaround. This gives grounded wheels, glass, bumpers and functional
// lamps without replacing the approved stylized PNG silhouette.
const carPalette: Record<VehicleKind, number> = {
  coupe: 0x175033, sedan: 0x9a9fa6, suv: 0x171e24, van: 0x173655,
};
const rubber = new THREE.MeshStandardMaterial({ color: 0x121719, roughness: 0.97 });
const alloy = new THREE.MeshStandardMaterial({ color: 0xbac1c3, metalness: 0.76, roughness: 0.31 });
const gold = new THREE.MeshStandardMaterial({ color: 0xb68b35, metalness: 0.76, roughness: 0.3 });
const tint = new THREE.MeshStandardMaterial({ color: 0x172632, roughness: 0.18, metalness: 0.2 });
const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 16);
const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.23, 12);

function detailBox(g: THREE.Group, name: string, w: number, h: number, d: number,
  x: number, y: number, z: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.name = name;
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function dimensionalVehicle(g: THREE.Group, kind: VehicleKind, spec: { length: number; width: number; height: number }) {
  const w = spec.width, l = spec.length, h = spec.height;
  const paint = new THREE.MeshStandardMaterial({
    color: carPalette[kind], metalness: 0.39, roughness: kind === "coupe" ? 0.32 : 0.41,
  });
  const details = kind === "coupe" ? gold : alloy;
  const cabinH = kind === "van" ? 1.44 : kind === "suv" ? 0.86 : 0.62;
  const cabinL = kind === "van" ? l * 0.72 : l * 0.50;
  detailBox(g, "vehicle-chassis", w * 0.89, 0.29, l * 0.76, 0, 0.47, 0, paint);
  detailBox(g, "vehicle-undercarriage", w * 0.81, 0.13, l * 0.82, 0, 0.31, 0, rubber);
  detailBox(g, "vehicle-front-bumper", w * 0.89, 0.13, 0.14, 0, 0.42, l * 0.41, details);
  detailBox(g, "vehicle-rear-bumper", w * 0.89, 0.13, 0.14, 0, 0.42, -l * 0.41, details);
  detailBox(g, "vehicle-cabin", w * 0.73, cabinH, cabinL, 0, 0.66 + cabinH / 2, -0.1, paint);
  for (const sign of [-1, 1]) {
    detailBox(g, "vehicle-side-glass", 0.035, cabinH * 0.5, cabinL * 0.68,
      sign * w * 0.38, 0.76 + cabinH * 0.48, -0.1, tint);
  }
  detailBox(g, "vehicle-windshield", w * 0.68, cabinH * 0.53, 0.04,
    0, 0.76 + cabinH * 0.47, cabinL * 0.5 - 0.1, tint);
  detailBox(g, "vehicle-rear-glass", w * 0.68, cabinH * 0.49, 0.04,
    0, 0.76 + cabinH * 0.47, -cabinL * 0.5 - 0.1, tint);

  for (const z of [-l * 0.31, l * 0.31]) {
    for (const side of [-1, 1]) {
      const x = side * w * 0.455;
      const tire = new THREE.Mesh(wheelGeo, rubber);
      tire.name = "vehicle-wheel";
      tire.position.set(x, 0.34, z);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      g.add(tire);
      const hub = new THREE.Mesh(hubGeo, details);
      hub.name = "vehicle-wheel-hub";
      hub.position.set(x + side * 0.01, 0.34, z);
      hub.rotation.z = Math.PI / 2;
      g.add(hub);
    }
  }
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfff1d7, emissive: 0xffcd80, emissiveIntensity: 0.35, roughness: 0.36,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xdb4640, emissive: 0xfb241d, emissiveIntensity: 0.35, roughness: 0.38,
  });
  for (const side of [-1, 1]) {
    detailBox(g, "vehicle-headlamp", w * 0.22, 0.14, 0.045,
      side * w * 0.31, 0.63, l * 0.409, headMat);
    detailBox(g, "vehicle-taillamp", w * 0.21, 0.13, 0.045,
      side * w * 0.31, 0.62, -l * 0.409, tailMat);
  }
  g.userData.headlights = [headMat, tailMat];
  g.userData.visualVersion = 2;
  g.userData.wheelCount = 4;
}

export function resetVehicleCards() {
  vehicleCards.length = 0;
}

/** Production turnaround card. Group yaw is the lane heading. The card billboards. */
export function carBody(kind: VehicleKind) {
  const spec = SIZE[kind];
  const g = new THREE.Group();
  g.userData.radius = Math.max(spec.length, spec.width) * 0.48;
  g.userData.kind = kind;
  dimensionalVehicle(g, kind, spec);
  const views: Record<Face, THREE.Texture> = {
    front: tex(kind, "front"),
    back: tex(kind, "back"),
    left: tex(kind, "left"),
    right: tex(kind, "right"),
  };
  const mat = new THREE.MeshBasicMaterial({
    map: views.left,
    transparent: false,
    alphaTest: 0.09,
    side: THREE.DoubleSide,
  });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(spec.length, spec.height), mat);
  card.name = "body";
  card.position.y = spec.height * 0.5;
  g.add(card);
  // Soft penumbra instead of a rectangular black contact patch.
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 64;
  const ctx = shadowCanvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  gradient.addColorStop(0, "rgba(0,0,0,0.50)");
  gradient.addColorStop(0.5, "rgba(0,0,0,0.20)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(spec.width * 1.25, spec.length * 1.08),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(shadowCanvas), transparent: true,
      depthWrite: false, opacity: 0.70,
    }),
  );
  shadow.name = "vehicle-contact-shadow";
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  g.add(shadow);
  const rec: VehicleCard = { group: g, card, mat, kind, views, face: "left" };
  g.userData.card = rec;
  vehicleCards.push(rec);
  return g;
}

const _pos = new THREE.Vector3();

export function presentVehicles(camera: THREE.Vector3) {
  for (const rec of vehicleCards) {
    const g = rec.group;
    g.getWorldPosition(_pos);
    const toCam = Math.atan2(camera.x - _pos.x, camera.z - _pos.z);
    let rel = toCam - g.rotation.y;
    while (rel > Math.PI) rel -= Math.PI * 2;
    while (rel < -Math.PI) rel += Math.PI * 2;
    const abs = Math.abs(rel);
    const face: Face = abs < 0.85 ? "front" : abs > 2.15 ? "back" : rel > 0 ? "right" : "left";
    const spec = SIZE[rec.kind];
    const side = face === "left" || face === "right";
    const w = side ? spec.length : spec.width * 1.15;
    rec.card.scale.set(w / spec.length, 1, 1);
    if (rec.face !== face) {
      rec.face = face;
      rec.mat.map = rec.views[face];
      rec.mat.needsUpdate = true;
    }
    // Lock the card to the car's face. A free billboard turns the 5 m side
    // into a wall that cuts through the sidewalk and anyone standing there.
    const base = side ? (rel > 0 ? -Math.PI / 2 : Math.PI / 2) : abs > 2.15 ? Math.PI : 0;
    let bias = rel - base;
    while (bias > Math.PI) bias -= Math.PI * 2;
    while (bias < -Math.PI) bias += Math.PI * 2;
    bias = Math.max(-0.28, Math.min(0.28, bias));
    rec.card.rotation.y = base + bias;
  }
}
