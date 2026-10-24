import * as THREE from "three";
import { vehicleBounds } from "../../assets/vehicle-bounds";
import { solePlane } from "../feet";
import { vehicleFace } from "../../core/vehicle-facing";

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
    map = loader.load(`/game-v2/vehicles/${key}.png?v=12`);
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
  geometry: Record<Face, THREE.BufferGeometry>;
};

export const vehicleCards: VehicleCard[] = [];

// The approved turnarounds contain their own body, wheels and lamps. Do not
// cover them with a second procedural car silhouette. Collision remains 3D.
export function resetVehicleCards() {
  vehicleCards.length = 0;
}

/** Production turnaround card. Group yaw is the lane heading. The card billboards. */
export function carBody(kind: VehicleKind) {
  const spec = SIZE[kind];
  const g = new THREE.Group();
  g.userData.radius = Math.max(spec.length, spec.width) * 0.48;
  g.userData.kind = kind;
  g.userData.visualVersion = 3;
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
  const geometry = {} as Record<Face, THREE.BufferGeometry>;
  for (const face of ["front", "back", "left", "right"] as const) {
    const bounds = vehicleBounds[`/game-v2/vehicles/${kind}-${face}.png`];
    if (!bounds) throw new Error(`Missing vehicle alpha bounds: ${kind}-${face}`);
    const visibleWidth = bounds.visibleRight - bounds.visibleLeft + 1;
    const scale = (face === "left" || face === "right" ? spec.length : spec.width) / visibleWidth;
    const center = (bounds.visibleLeft + bounds.visibleRight - bounds.pxWidth + 1) / 2;
    geometry[face] = solePlane(bounds.pxWidth * scale, bounds.pxHeight * scale,
      bounds.bottomPadding, bounds.pxHeight, center, bounds.pxWidth);
  }
  const card = new THREE.Mesh(geometry.left, mat);
  card.name = "body";
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
  const rec: VehicleCard = { group: g, card, mat, kind, views, geometry, face: "left" };
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
    const face: Face = vehicleFace(rel, rec.card.userData.viewInitialized ? rec.face : undefined);
    rec.card.userData.viewInitialized = true;
    const side = face === "left" || face === "right";
    if (rec.face !== face) {
      rec.face = face;
      rec.mat.map = rec.views[face];
      rec.card.geometry = rec.geometry[face];
      rec.mat.needsUpdate = true;
    }
    // Lock the card to the car's face. A free billboard turns the 5 m side
    // into a wall that cuts through the sidewalk and anyone standing there.
    const base = side ? (face === "left" ? Math.PI / 2 : -Math.PI / 2) : face === "back" ? Math.PI : 0;
    let bias = rel - base;
    while (bias > Math.PI) bias -= Math.PI * 2;
    while (bias < -Math.PI) bias += Math.PI * 2;
    bias = Math.max(-0.28, Math.min(0.28, bias));
    rec.card.rotation.y = base + bias;
  }
}
