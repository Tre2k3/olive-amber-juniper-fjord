export type GroundPad = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Top of the walkable surface. */
  y: number;
};

const pads: GroundPad[] = [];

/** Just enough to keep soles out of the surface. Not a visible hover. */
export const GROUND_EPSILON = 0.012;

export function clearGround() {
  pads.length = 0;
}

export function addGround(pad: GroundPad) {
  pads.push(pad);
}

/** Highest surface under the point. Open ground is 0. */
export function groundHeightAt(x: number, z: number) {
  let y = 0;
  for (const pad of pads) {
    if (x < pad.minX || x > pad.maxX || z < pad.minZ || z > pad.maxZ) continue;
    if (pad.y > y) y = pad.y;
  }
  return y;
}
