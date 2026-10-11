export type CourtPoint = { x: number; y: number; z: number };
export const BALL_GRAVITY = 12;

/** Timing changes accuracy, not whether a long shot can physically reach the rim. */
export function shotVelocity(start: CourtPoint, rim: CourtPoint, charge: number, contest = 0) {
  const distance = Math.hypot(rim.x - start.x, rim.z - start.z);
  const time = 0.72 + Math.min(1, distance / 15) * 0.72;
  const error = Math.max(0, Math.abs(charge - 0.7) - 0.065) * 1.8 + Math.max(0, contest) * 0.55;
  const dx = rim.x - start.x, dz = rim.z - start.z;
  const length = Math.hypot(dx, dz) || 1;
  // Early releases miss short; late releases miss long. No random auto-makes.
  const sign = charge < 0.7 ? -1 : 1;
  const offset = error * (0.7 + distance * 0.2) * sign;
  return { x: (dx + dx / length * offset) / time,
    y: (rim.y - start.y + BALL_GRAVITY * time * time / 2) / time,
    z: (dz + dz / length * offset) / time, time, quality: error < 0.03 ? "PERFECT" : charge < 0.635 ? "EARLY" : "LATE" };
}

/** Score only a downward crossing through the actual inner rim aperture. */
export function rimCrossing(previous: CourtPoint, next: CourtPoint, rim: CourtPoint) {
  if (previous.y < rim.y || next.y >= rim.y || next.y >= previous.y) return false;
  const t = (previous.y - rim.y) / (previous.y - next.y);
  const x = previous.x + (next.x - previous.x) * t;
  const z = previous.z + (next.z - previous.z) * t;
  return Math.hypot(x - rim.x, z - rim.z) <= 0.19;
}

export function shotPoints(start: Pick<CourtPoint, "x" | "z">, rim: CourtPoint) {
  return Math.hypot(start.x - rim.x, start.z - rim.z) >= 6.25 ? 3 : 2;
}
