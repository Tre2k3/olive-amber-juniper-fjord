import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Static batching: merge never-moving meshes that share a material into one
 * mesh per material per 40 m cell, under their original parent. The city had
 * ~8,400 meshes (one draw call each, most drawn twice for shadows) — the main
 * cause of the sluggish feel. Looks identical; far fewer draw calls.
 *
 * Left alone (may be animated, looked up, or sorted): named meshes, anything
 * with userData (or under an ancestor with userData or a name), transparent or
 * multi-material meshes, instanced/skinned meshes, morph targets.
 */
export const batchReasons: Record<string, number> = {};
const why = (k: string) => (batchReasons[k] = (batchReasons[k] ?? 0) + 1);
export function batchStatic(root: THREE.Object3D, cell = 40): { before: number; after: number } {
  root.updateMatrixWorld(true);
  // A merged mesh stays under its original parent, so named groups (looked up,
  // shown/hidden, moved) keep working. Only the mesh itself being named, or any
  // ancestor carrying game data (people, cars, props), keeps it separate.
  const blocked = (o: THREE.Object3D) => {
    if (o.name) return true;
    for (let p: THREE.Object3D | null = o; p && p !== root; p = p.parent) {
      if (Object.keys(p.userData).length) return true;
    }
    return false;
  };
  // Normalise to plain non-indexed Float32 position/normal(/uv) so any mix of
  // primitives merges (BufferGeometryUtils rejects differing formats).
  const plain = (src: THREE.BufferGeometry, withUv: boolean) => {
    const g = src.index ? src.toNonIndexed() : src.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    const out = new THREE.BufferGeometry();
    const copy = (name: string, size: number) => {
      const a = g.attributes[name]!;
      const arr = new Float32Array(a.count * size);
      for (let i = 0; i < a.count; i++)
        for (let k = 0; k < size; k++) arr[i * size + k] = a.getComponent(i, k);
      out.setAttribute(name, new THREE.BufferAttribute(arr, size));
    };
    copy("position", 3);
    copy("normal", 3);
    if (withUv) copy("uv", 2);
    g.dispose();
    return out;
  };
  type Bucket = {
    parent: THREE.Object3D;
    mat: THREE.Material;
    cast: boolean;
    receive: boolean;
    order: number;
    meshes: THREE.Mesh[];
  };
  const buckets = new Map<string, Bucket>();
  let before = 0;
  const center = new THREE.Vector3();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    before++;
    if ((m as THREE.InstancedMesh).isInstancedMesh || (m as THREE.SkinnedMesh).isSkinnedMesh)
      return void why("instanced/skinned");
    if (Array.isArray(m.material)) return void why("multi-material");
    if (m.material.transparent) return void why("transparent");
    if (!m.visible || !m.parent) return void why("hidden");
    if (blocked(m))
      return void why(
        m.name
          ? "named mesh"
          : Object.keys(m.userData).length
            ? "mesh userData"
            : "under named/userData group",
      );
    const g = m.geometry;
    // (Box/Cylinder geometries carry draw groups even with one material; with a
    // single material they're irrelevant, and plain() drops them.)
    if (!g.attributes.position || Object.keys(g.morphAttributes).length)
      return void why("no position/morph");
    const sig = g.attributes.uv ? "uv" : "no-uv";
    m.getWorldPosition(center);
    const key = [
      m.parent.uuid,
      m.material.uuid,
      sig,
      Math.floor(center.x / cell),
      Math.floor(center.z / cell),
      m.castShadow,
      m.receiveShadow,
      m.renderOrder,
    ].join("/");
    let b = buckets.get(key);
    if (!b)
      buckets.set(
        key,
        (b = {
          parent: m.parent,
          mat: m.material,
          cast: m.castShadow,
          receive: m.receiveShadow,
          order: m.renderOrder,
          meshes: [],
        }),
      );
    b.meshes.push(m);
  });
  const inv = new THREE.Matrix4();
  const rel = new THREE.Matrix4();
  for (const b of buckets.values()) {
    if (b.meshes.length < 2) {
      why("unique material/cell");
      continue;
    }
    why("merged-bucket");
    inv.copy(b.parent.matrixWorld).invert();
    const withUv = !!b.meshes[0]!.geometry.attributes.uv;
    const geos = b.meshes.map((m) => {
      rel.multiplyMatrices(inv, m.matrixWorld);
      const g = plain(m.geometry, withUv);
      g.applyMatrix4(rel);
      return g;
    });
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) {
      why("merge-failed");
      continue;
    }
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    mesh.renderOrder = b.order;
    for (const m of b.meshes) m.parent!.remove(m);
    b.parent.add(mesh);
  }
  let after = 0;
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) after++;
  });
  return { before, after };
}
