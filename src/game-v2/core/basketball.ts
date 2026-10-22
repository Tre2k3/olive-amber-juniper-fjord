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
  return Math.hypot(x - rim.x, z - rim.z) <= SCORE_APERTURE;
}

export function shotPoints(start: Pick<CourtPoint, "x" | "z">, rim: CourtPoint) {
  return Math.hypot(start.x - rim.x, start.z - rim.z) >= 6.25 ? 3 : 2;
}

/** Inner scoring aperture: a crossing inside this is a make and the iron never touches it. */
export const SCORE_APERTURE = 0.19;
export const RIM_RADIUS = 0.33;
export const RIM_TUBE = 0.052;
export const BALL_RADIUS = 0.16;

export type BallContact = "rim" | "backboard" | null;

/**
 * Ball versus the ring itself, treated as a torus. Applied only while the ball
 * is descending: in this side-on projection a close shot climbs past the ring
 * from underneath, and colliding on the way up would clang every clean shot.
 * Returns "rim" when iron was touched. Mutates `ball` and `velocity` in place.
 */
export function rimContact(ball: CourtPoint, velocity: CourtPoint, rim: CourtPoint): BallContact {
  if (velocity.y >= 0) return null;
  const dx = ball.x - rim.x, dz = ball.z - rim.z;
  const r = Math.hypot(dx, dz) || 0.0001;
  // Arcs here are deliberately shallow, so a ball headed for a clean crossing
  // would graze the front tube of a true torus on the way over it. Project the
  // flight to rim height: if it lands inside the scoring aperture the iron
  // stays out of its way; otherwise it is a real miss and gets real iron.
  if (ball.y > rim.y) {
    const disc = velocity.y * velocity.y + 2 * BALL_GRAVITY * (ball.y - rim.y);
    const t = (velocity.y + Math.sqrt(disc)) / BALL_GRAVITY;
    const px = ball.x + velocity.x * t, pz = ball.z + velocity.z * t;
    if (Math.hypot(px - rim.x, pz - rim.z) <= SCORE_APERTURE) return null;
  } else if (r <= SCORE_APERTURE) return null;
  // Closest point on the ring circle to the ball centre.
  const qx = rim.x + dx / r * RIM_RADIUS, qz = rim.z + dz / r * RIM_RADIUS;
  const nx = ball.x - qx, ny = ball.y - rim.y, nz = ball.z - qz;
  const d = Math.hypot(nx, ny, nz) || 0.0001;
  if (d >= BALL_RADIUS + RIM_TUBE) return null;
  const ux = nx / d, uy = ny / d, uz = nz / d;
  const vn = velocity.x * ux + velocity.y * uy + velocity.z * uz;
  if (vn < 0) {
    const restitution = 0.52;
    velocity.x -= (1 + restitution) * vn * ux;
    velocity.y -= (1 + restitution) * vn * uy;
    velocity.z -= (1 + restitution) * vn * uz;
    velocity.x *= 0.9; velocity.z *= 0.9;
  }
  const push = BALL_RADIUS + RIM_TUBE + 0.004;
  ball.x = qx + ux * push; ball.y = rim.y + uy * push; ball.z = qz + uz * push;
  return "rim";
}

export type Backboard = { x: number; minY: number; maxY: number; minZ: number; maxZ: number; nx: number };

/**
 * Ball versus the board as a bounded plane, using a crossing test with the
 * previous position so a fast ball can't tunnel through. Mutates in place.
 */
export function backboardContact(previous: CourtPoint, ball: CourtPoint, velocity: CourtPoint, board: Backboard): BallContact {
  const inRect = ball.y > board.minY - BALL_RADIUS && ball.y < board.maxY + BALL_RADIUS && ball.z > board.minZ - BALL_RADIUS && ball.z < board.maxZ + BALL_RADIUS;
  if (!inRect) return null;
  const face = board.x + board.nx * BALL_RADIUS;
  const before = (previous.x - face) * board.nx, after = (ball.x - face) * board.nx;
  if (!(before >= 0 && after < 0)) return null;
  ball.x = face;
  velocity.x = -velocity.x * 0.6;
  velocity.y *= 0.92; velocity.z *= 0.92;
  return "backboard";
}
