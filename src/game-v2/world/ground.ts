export type WalkSurface = {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Top of the walkable surface. */
  y: number;
  /** Higher priority wins only when the foot has left its current surface. */
  priority: number;
};

const pads: WalkSurface[] = [];
let nextId = 1;

/** Soles sit just above the visual floor so the court cannot cover the shoes. */
export const GROUND_EPSILON = 0.03;

export function clearGround() {
  pads.length = 0;
  nextId = 1;
}

export function addGround(pad: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
  id?: string;
  priority?: number;
}) {
  pads.push({
    id: pad.id ?? `surface-${nextId++}`,
    minX: pad.minX,
    maxX: pad.maxX,
    minZ: pad.minZ,
    maxZ: pad.maxZ,
    y: pad.y,
    priority: pad.priority ?? Math.round(pad.y * 1000),
  });
}

function contains(pad: WalkSurface, x: number, z: number) {
  return x >= pad.minX && x <= pad.maxX && z >= pad.minZ && z <= pad.maxZ;
}

/** Exact surface under the foot. Stays on the current surface until the foot leaves it. */
export function walkableSurfaceAt(x: number, z: number, currentId?: string) {
  let stay: WalkSurface | undefined;
  let best: WalkSurface | undefined;
  for (const pad of pads) {
    if (!contains(pad, x, z)) continue;
    if (currentId && pad.id === currentId) stay = pad;
    if (!best || pad.priority > best.priority || (pad.priority === best.priority && pad.y > best.y)) best = pad;
  }
  if (stay) return { id: stay.id, y: stay.y };
  if (best) return { id: best.id, y: best.y };
  return { id: "ground", y: 0 };
}

/** Height of the surface the point is inside. Open ground is 0. No neighbor sampling. */
export function groundHeightAt(x: number, z: number) {
  return walkableSurfaceAt(x, z).y;
}
