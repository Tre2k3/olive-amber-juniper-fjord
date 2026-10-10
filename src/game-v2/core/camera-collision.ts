import type { Solid } from "./types";

/** Clip the lens-to-player segment before the first expanded wall. */
export function pullCamera(px: number, pz: number, destX: number, destZ: number, solids: Solid[], ox: number, oz: number) {
  const dx = destX - px;
  const dz = destZ - pz;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.0001) return { x: px, z: pz };
  let keep = 1;
  for (const solid of solids) {
    let entry = 0;
    let exit = 1;
    for (const [origin, delta, min, max] of [
      [px, dx, solid.minX + ox - 0.2, solid.maxX + ox + 0.2],
      [pz, dz, solid.minZ + oz - 0.2, solid.maxZ + oz + 0.2],
    ] as const) {
      if (Math.abs(delta) < 0.000001) {
        if (origin < min || origin > max) { entry = 2; break; }
      } else {
        const a = (min - origin) / delta;
        const b = (max - origin) / delta;
        entry = Math.max(entry, Math.min(a, b));
        exit = Math.min(exit, Math.max(a, b));
      }
    }
    if (entry <= exit) keep = Math.min(keep, Math.max(0, entry - 0.05 / distance));
  }
  return { x: px + dx * keep, z: pz + dz * keep };
}
