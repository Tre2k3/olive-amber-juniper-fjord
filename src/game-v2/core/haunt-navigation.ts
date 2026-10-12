/** Shared dimensions for the modeled foyer staircase and its walking surfaces. */
export const HAUNT_STAIRS = {
  minX: 0.825, maxX: 2.375, startZ: 1.645, run: 0.31,
  steps: 12, floorY: 0.08, rise: 0.2,
  landing: { minX: 0.35, maxX: 4.8, minZ: 5.365, maxZ: 7.1 },
} as const;

export function hauntFloorAt(x: number, localZ: number) {
  const s = HAUNT_STAIRS;
  const l = s.landing;
  if (x >= l.minX && x <= l.maxX && localZ >= l.minZ && localZ <= l.maxZ)
    return s.floorY + s.steps * s.rise;
  if (x >= s.minX && x <= s.maxX && localZ >= s.startZ && localZ < l.minZ) {
    const step = Math.min(s.steps - 1, Math.floor((localZ - s.startZ) / s.run));
    return s.floorY + (step + 1) * s.rise;
  }
  return s.floorY;
}

/** No side teleports onto upper treads or drops through gallery edges. */
export function canWalkHaunt(fromX: number, fromZ: number, toX: number, toZ: number) {
  return Math.abs(hauntFloorAt(toX, toZ) - hauntFloorAt(fromX, fromZ)) <= HAUNT_STAIRS.rise + 0.001;
}
