import * as THREE from "three";
import { GROUND_EPSILON, walkableSurfaceAt } from "./ground";

/**
 * Plane whose local origin is the visible sole, centered on the visible body.
 * footPad is measured transparent rows under the shoe, not a guess.
 */
export function solePlane(w: number, h: number, footPad: number, pxH: number, centerPx = 0, pxW = 0) {
  const geo = new THREE.PlaneGeometry(w, h);
  const pad = pxH > 0 ? (h * footPad) / pxH : 0;
  const center = pxW > 0 ? (w * centerPx) / pxW : 0;
  geo.translate(-center, h / 2 - pad, 0);
  return geo;
}

/** Cutout cards. Mipmaps average hair alpha with the transparent background and punch holes. */
export function solidCutout(tex: THREE.Texture) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function characterMaterial() {
  const mat = new THREE.MeshBasicMaterial({
    transparent: true,
    alphaTest: 0.02,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -4;
  mat.polygonOffsetUnits = -4;
  return mat;
}

const worldPos = new THREE.Vector3();
const parentPos = new THREE.Vector3();

/** Group origin is the foot contact. Stays on the surface it is already standing on. */
export function plantFeet(host: THREE.Object3D) {
  host.updateWorldMatrix(true, false);
  host.getWorldPosition(worldPos);
  const current = host.userData.surfaceId as string | undefined;
  const surface = walkableSurfaceAt(worldPos.x, worldPos.z, current);
  host.userData.surfaceId = surface.id;
  const parent = host.parent;
  const parentY = parent ? parent.getWorldPosition(parentPos).y : 0;
  host.position.y = surface.y + GROUND_EPSILON - parentY;
}

/** The card stays on the physical root. Sidewalk overlap is not solved by sliding the body. */
export function seatOnGround(sprite: THREE.Object3D) {
  sprite.position.set(0, 0, 0);
}

export function footMarker() {
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffcc33, depthTest: false }),
  );
  marker.name = "foot-debug";
  marker.position.y = 0.02;
  marker.visible = false;
  marker.renderOrder = 20;
  return marker;
}
