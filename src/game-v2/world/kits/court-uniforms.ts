import * as THREE from "three";
import type { Facing } from "../../assets/characters";
import { solidCutout, solePlane } from "../feet";

export const COURT_KITS = ["black-fresh", "blue-fresh", "white-224"] as const;
export type CourtKit = typeof COURT_KITS[number];
export const COURT_KIT_NAMES = ["FRESH BLACK", "FRESH BLUE", "224", "STREET"];
const outfits = { benji: COURT_KITS, "court-og": ["blue-fresh"], nitro: ["white-224"], strike: ["white-224"] } as const;
const heights: Record<string, number> = { benji: 1.68, "court-og": 2.04, nitro: 1.86, strike: 1.8 };
const defaultKits: Record<string, CourtKit> = { "court-og": "blue-fresh", nitro: "white-224", strike: "white-224" };

/** Complete outfit cutouts. No garment, text, skin or logo overlays. */
export function createCourtUniforms() {
  const maps = new Map<string, THREE.Texture>();
  let disposed = false;
  for (const [id, kits] of Object.entries(outfits)) for (const kit of kits) for (const face of ["front", "back", "left", "right"] as const) {
    const key = `${id}/${kit}/${face}`;
    new THREE.TextureLoader().load(`/game-v2/basketball/outfits/${key}.png`, texture => {
      if (disposed) { texture.dispose(); return; }
      maps.set(key, solidCutout(texture));
    });
  }
  return {
    apply(mesh: THREE.Mesh, id: string, enabled: boolean, face: Facing, heroKit: CourtKit) {
      const kit = id === "benji" ? heroKit : defaultKits[id];
      const key = `${id}/${kit}/${face}`, texture = enabled ? maps.get(key) : undefined;
      if (!texture) { mesh.userData.uniformKit = null; return false; }
      const pose = `uniform-${key}`;
      if (mesh.userData.pose !== pose) {
        mesh.geometry.dispose();
        const unit = heights[id]! / 480;
        mesh.geometry = solePlane(512 * unit, 512 * unit, 16, 512);
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.map = texture; material.needsUpdate = true;
        mesh.userData.pose = pose; mesh.userData.box = pose; mesh.userData.face = face;
      }
      mesh.userData.uniformKit = kit;
      return true;
    },
    get loaded() { return maps.size; },
    dispose() { disposed = true; maps.forEach(texture => texture.dispose()); maps.clear(); },
  };
}
