/** Lane-follow motion. Heading is the path tangent, never a separate fake rotation. */

export type Axis = "x" | "y";

export type TurnLane = {
  axis: Axis;
  fixed: number;
  speed: number;
};

export type TurnCar = {
  x: number;
  y: number;
  turnT: number;
  turn0x: number;
  turn0y: number;
  turnX: number;
  turnY: number;
};

export type TurnStep = {
  blocked: boolean;
  done: boolean;
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  yaw: number;
};

type Pt = { x: number; y: number };

export function laneHeading(vx: number, vy: number) {
  return Math.atan2(-vy, vx);
}

/** Crossing of the two lane centerlines — the corner the car actually drives. */
export function turnControl(from: TurnLane, dest: TurnLane): Pt {
  return from.axis === "x" ? { x: dest.fixed, y: from.fixed } : { x: from.fixed, y: dest.fixed };
}

function quad(t: number, p0: Pt, p1: Pt, p2: Pt): Pt {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function quadTan(t: number, p0: Pt, p1: Pt, p2: Pt): Pt {
  const u = 1 - t;
  return {
    x: 2 * u * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * u * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  };
}

/**
 * Advance a turn along a quadratic from the entry point, through the lane
 * corner, to the exit point. Velocity and yaw both come from that tangent.
 */
export function advanceLaneTurn(
  car: TurnCar,
  from: TurnLane,
  dest: TurnLane,
  dt: number,
  blocked: (x: number, y: number, rad: number) => boolean,
): TurnStep {
  const p0 = { x: car.turn0x, y: car.turn0y };
  const p2 = { x: car.turnX, y: car.turnY };
  const p1 = turnControl(from, dest);
  const speed = Math.max(42, (from.speed + dest.speed) * 0.42);
  const chord = Math.hypot(p2.x - p0.x, p2.y - p0.y);
  const arc = Math.max(36, chord * 1.2);
  const t = Math.min(1, car.turnT + (speed * dt) / arc);
  const pos = quad(t, p0, p1, p2);
  if (blocked(pos.x, pos.y, 16)) {
    return {
      blocked: true,
      done: false,
      t: car.turnT,
      x: car.x,
      y: car.y,
      vx: 0,
      vy: 0,
      yaw: laneHeading(p2.x - p0.x, p2.y - p0.y),
    };
  }
  const tan = quadTan(Math.min(t, 0.98), p0, p1, p2);
  const mag = Math.hypot(tan.x, tan.y) || 1;
  const vx = (tan.x / mag) * speed * (t >= 1 ? 0.85 : 1);
  const vy = (tan.y / mag) * speed * (t >= 1 ? 0.85 : 1);
  return { blocked: false, done: t >= 1, t, x: pos.x, y: pos.y, vx, vy, yaw: laneHeading(vx, vy) };
}
