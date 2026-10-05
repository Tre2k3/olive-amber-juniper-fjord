import * as THREE from "three";
import { concreteSlab, curb, gutter } from "./materials";
import { addGround } from "../ground";

function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, parent: THREE.Object3D) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  m.castShadow = false;
  parent.add(m);
  return m;
}

/** Segmented sidewalk. `gaps` are driveway cuts in world X. */
export function sidewalkRun(parent: THREE.Object3D, z: number, x0: number, x1: number, gaps: [number, number][] = []) {
  const slab = 1.45;
  const depth = 2.35;
  for (let x = x0; x < x1; x += slab + 0.08) {
    const mid = x + slab / 2;
    if (gaps.some(([a, b]) => mid > a && mid < b)) continue;
    const top = 0.17;
    box(slab, 0.1, depth, mid, 0.12, z, concreteSlab(Math.round(x + z)), parent);
    addGround({ minX: mid - slab / 2, maxX: mid + slab / 2, minZ: z - depth / 2, maxZ: z + depth / 2, y: top });
  }
  box(x1 - x0, 0.16, 0.28, (x0 + x1) / 2, 0.08, z > 0 ? z - depth / 2 - 0.12 : z + depth / 2 + 0.12, curb, parent);
  box(x1 - x0, 0.04, 0.35, (x0 + x1) / 2, 0.05, z > 0 ? z - depth / 2 - 0.4 : z + depth / 2 + 0.4, gutter, parent);
}
