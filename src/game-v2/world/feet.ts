import * as THREE from "three";
import { GROUND_EPSILON, standHeight } from "./ground";

/**
 * Plane whose local origin is the visible sole, not the PNG center.
 * footPad is transparent rows under the shoe. Scale then grows upward only.
 */
export function solePlane(w: number, h: number, footPad: number, pxH: number) {
  const geo = new THREE.PlaneGeometry(w, h);
  const pad = pxH > 0 ? (h * footPad) / pxH : 0;
  geo.translate(0, h / 2 - pad, 0);
  return geo;
}

const worldPos = new THREE.Vector3();
const parentPos = new THREE.Vector3();

/** Group origin is the foot contact. Drops that point onto the surface under it. */
export function plantFeet(host: THREE.Object3D) {
  host.updateWorldMatrix(true, false);
  host.getWorldPosition(worldPos);
  const surface = standHeight(worldPos.x, worldPos.z) + GROUND_EPSILON;
  const parent = host.parent;
  const parentY = parent ? parent.getWorldPosition(parentPos).y : 0;
  host.position.y = surface - parentY;
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
