import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * Generated 3D props (public/game-v2/places/<place>/props/*.glb). Each is
 * scaled to a real height, floored at `y`, and replaces its primitive
 * placeholders when it arrives. Props register with a trigger radius and load
 * only when the player first comes near, so nothing heavy lands at boot.
 */
export type PropOptions = {
  x: number;
  y?: number;
  z: number;
  height: number;
  ry?: number;
  hide?: THREE.Object3D[];
  radius?: number;
};

const loader = new GLTFLoader();
const pending: { x: number; z: number; r: number; load: () => void }[] = [];

export function placeGltf(parent: THREE.Object3D, url: string, o: PropOptions) {
  loader.load(
    url,
    (gltf) => {
      const model = gltf.scene;
      const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
      model.scale.setScalar(o.height / Math.max(size.y, 0.001));
      model.rotation.y = o.ry ?? 0;
      const box = new THREE.Box3().setFromObject(model);
      model.position.set(
        o.x - (box.min.x + box.max.x) / 2,
        (o.y ?? 0) - box.min.y,
        o.z - (box.min.z + box.max.z) / 2,
      );
      model.traverse((n) => {
        const m = n as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
      model.name = `prop-${url
        .split("/")
        .pop()
        ?.replace(/\.glb$/, "")}`;
      parent.add(model);
      for (const h of o.hide ?? []) h.visible = false;
    },
    undefined,
    () => {
      /* keep the placeholders */
    },
  );
}

/** Register a prop to load the first time the player is within `radius` (default 30 m). */
export function propNear(parent: THREE.Object3D, url: string, o: PropOptions) {
  pending.push({ x: o.x, z: o.z, r: o.radius ?? 30, load: () => placeGltf(parent, url, o) });
}

/** Called each frame on the street: a handful of distance checks, nothing else. */
export function updateProps(px: number, pz: number) {
  for (let i = pending.length - 1; i >= 0; i--) {
    const p = pending[i]!;
    if (Math.hypot(px - p.x, pz - p.z) < p.r) {
      pending.splice(i, 1);
      p.load();
    }
  }
}

const rooms = new Map<string, (() => void)[]>();
/** Register a prop that loads the first time the player enters `room` (e.g. "hq"). */
export function propOnEnter(room: string, parent: THREE.Object3D, url: string, o: PropOptions) {
  const list = rooms.get(room) ?? [];
  list.push(() => placeGltf(parent, url, o));
  rooms.set(room, list);
}
/** Call when the player is in `room`; loads its props once, then does nothing. */
export function loadRoomProps(room: string) {
  const list = rooms.get(room);
  if (!list) return;
  rooms.delete(room);
  for (const load of list) load();
}
