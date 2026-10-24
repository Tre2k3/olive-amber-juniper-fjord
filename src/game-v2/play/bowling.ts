/**
 * 901 Bowl — the roll itself. Pure module, no `three`.
 *
 * Lane coordinates: `u` is lateral in metres (0 = centre, ±0.53 is the gutter
 * edge), `s` is distance down the lane from the foul line (pins start at
 * LANE_LENGTH). Pins are the real ten-pin triangle; the ball is a real circle
 * that hits pins, pins knock their neighbours, and the count is whatever is
 * on the deck when the ball is gone. Nothing is decided before the ball moves.
 *
 * Shot shape:
 *   aim (A/D)  → where you stand on the approach and the line you throw
 *   hold Space → the approach: four steps to the foul line while the swing
 *                loads; the meter is the swing
 *   release    → on the way down is a smooth roll; too early is a lofted,
 *                weak ball; past the foul line is a foul (zero, like real bowling)
 *   hook       → a timed release puts revs on the ball and it curves into the
 *                pocket; a late or flat release skids straight
 */

export const LANE_LENGTH = 11.15;
export const LANE_HALF = 0.53;
export const BALL_R = 0.109;
export const PIN_R = 0.06;
export const APPROACH_SECONDS = 1.15;
/** Fraction of the approach where the swing is at the bottom: the sweet release. */
export const RELEASE_SWEET = 0.78;
export const RELEASE_WINDOW = 0.1;

/** Ten-pin rack in lane coords, matching the runtime's pin meshes (rows 0.34 apart, 0.26 across). */
export const RACK: { u: number; s: number }[] = [
  { u: 0, s: 0 },
  { u: -0.26, s: 0.34 },
  { u: 0.26, s: 0.34 },
  { u: -0.52, s: 0.68 },
  { u: 0, s: 0.68 },
  { u: 0.52, s: 0.68 },
  { u: -0.78, s: 1.02 },
  { u: -0.26, s: 1.02 },
  { u: 0.26, s: 1.02 },
  { u: 0.78, s: 1.02 },
];

export type Ball = {
  u: number;
  s: number;
  vu: number;
  vs: number;
  revs: number;
  t: number;
  gutter: boolean;
  launch: number;
};

export type Roll = {
  phase: "aim" | "approach" | "roll" | "done";
  aim: number;
  approach: number;
  swing: number;
  foul: boolean;
  loft: number;
  ball: Ball | null;
  fallen: boolean[];
  fellThisRoll: number;
  /** Deterministic chain reactions per roll so tests are reproducible. */
  seed: number;
  events: RollEvent[];
};

export type RollEvent = "release" | "foul" | "gutter" | "pinhit" | "settled";

export function freshRoll(standing: boolean[], seed = 1): Roll {
  return {
    phase: "aim",
    aim: 0,
    approach: 0,
    swing: 0,
    foul: false,
    loft: 0,
    ball: null,
    fallen: standing.map((up) => !up),
    fellThisRoll: 0,
    seed,
    events: [],
  };
}

function rng(roll: Roll) {
  roll.seed = (roll.seed * 1664525 + 1013904223) >>> 0;
  return roll.seed / 4294967296;
}

/** Launch the ball from the current approach state. */
function release(roll: Roll) {
  const p = roll.approach;
  roll.events.push("release");
  if (p >= 1) {
    roll.foul = true;
    roll.events.push("foul");
  }
  // How close to the bottom of the swing you let go.
  const off = p - RELEASE_SWEET;
  const timing = Math.max(0, 1 - Math.abs(off) / 0.32);
  roll.loft = off < -RELEASE_WINDOW ? Math.min(1, -off * 2.2) : 0;
  const speed = 5.2 + roll.swing * 3.6 - roll.loft * 2.6;
  // Revs come from a clean release; a late release skids.
  const revs = (off <= RELEASE_WINDOW ? timing : timing * 0.35) * (0.6 + roll.swing * 0.4);
  // You throw straight down the boards from where you stand; the hook does the turning.
  roll.ball = {
    u: roll.aim * 0.46,
    s: 0,
    vu: 0,
    vs: speed,
    revs,
    t: 0,
    gutter: false,
    launch: speed,
  };
  roll.phase = "roll";
}

export type RollInput = { dt: number; hold: boolean; steer: number };

export function tickRoll(roll: Roll, input: RollInput): RollEvent[] {
  roll.events.length = 0;
  const { dt } = input;
  if (roll.phase === "aim") {
    roll.aim = Math.max(-1, Math.min(1, roll.aim + input.steer * dt * 1.6));
    if (input.hold) {
      roll.phase = "approach";
      roll.approach = 0;
      roll.swing = 0;
    }
    return roll.events;
  }
  if (roll.phase === "approach") {
    roll.approach += dt / APPROACH_SECONDS;
    // The swing loads through the walk; it is the power meter.
    roll.swing = Math.min(1, roll.approach / RELEASE_SWEET);
    if (!input.hold || roll.approach >= 1.12) release(roll);
    return roll.events;
  }
  if (roll.phase === "roll" && roll.ball) stepBall(roll, roll.ball, dt);
  return roll.events;
}

function stepBall(roll: Roll, b: Ball, dt: number) {
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    b.t += h;
    // Lane friction, stronger once the oil runs out two thirds of the way down.
    const dry = b.s > LANE_LENGTH * 0.62 ? 1 : 0.35;
    b.vs = Math.max(0, b.vs - (0.32 + roll.loft * 0.5) * dry * h);
    // Hook: a right-hander's revs bite on the dry boards and bend the ball to
    // the right, about 0.3 m of total drift on a full-rev release.
    const hook = b.revs * 0.55 * (dry - 0.2);
    b.vu += hook * h;
    b.u += b.vu * h;
    b.s += b.vs * h;
    if (!b.gutter && Math.abs(b.u) > LANE_HALF) {
      b.gutter = true;
      b.vu = 0;
      b.u = Math.sign(b.u) * (LANE_HALF + 0.06);
      roll.events.push("gutter");
    }
    if (!b.gutter && b.s >= LANE_LENGTH - 0.4) hitPins(roll, b);
    if (b.s > LANE_LENGTH + 1.6 || b.vs < 0.25) {
      if (roll.foul) {
        // A foul resets whatever fell: the frame counts zero, like the real rule.
        roll.fellThisRoll = 0;
      }
      roll.phase = "done";
      roll.events.push("settled");
      return;
    }
  }
}

function hitPins(roll: Roll, b: Ball) {
  for (let i = 0; i < RACK.length; i++) {
    if (roll.fallen[i]) continue;
    const p = RACK[i]!;
    const du = b.u - p.u;
    const ds = b.s - (LANE_LENGTH + p.s);
    if (Math.hypot(du, ds) >= BALL_R + PIN_R) continue;
    // Entry angle is what makes pins mix: a hooking ball carries, a flat one deflects.
    knock(roll, i, b.vs * (1 + Math.min(0.7, Math.abs(b.vu) * 1.6)), du);
    // The ball sheds speed on each pin and deflects a little away from it.
    b.vs *= 0.86;
    // Real deflection (~10°): the ball weaves 1-3-5-9 through a pocket hit.
    b.vu += Math.sign(du || 1) * 1.2;
    roll.events.push("pinhit");
  }
}

/**
 * A pin goes down and flies along the line it was struck: hit on its right
 * side it goes left-forward, and only pins in that direction can be taken
 * with it. This is what makes the pocket a strike and a head-on ball a split.
 */
function knock(roll: Roll, index: number, impulse: number, offset: number) {
  if (roll.fallen[index]) return;
  roll.fallen[index] = true;
  roll.fellThisRoll += 1;
  const p = RACK[index]!;
  const energy = Math.min(1, impulse / 8.6);
  let fu = (-offset / (BALL_R + PIN_R)) * 0.9;
  let fs = 1;
  const fl = Math.hypot(fu, fs);
  fu /= fl;
  fs /= fl;
  for (let j = 0; j < RACK.length; j++) {
    if (roll.fallen[j]) continue;
    const q = RACK[j]!;
    const du = q.u - p.u;
    const ds = q.s - p.s;
    const dist = Math.hypot(du, ds);
    if (ds < -0.05 || dist > 0.62) continue;
    const align = (du * fu + ds * fs) / dist;
    if (align <= 0.15) continue;
    // Cubed: a square hit sends the pin almost straight back, not into its neighbours.
    const chance = (0.18 + energy * 0.72) * Math.pow(align, 3);
    if (rng(roll) < chance) knock(roll, j, impulse * 0.68, -du * 0.45);
  }
}

/** Convenience for the HUD: aim bar, swing meter, and the moment to let go. */
export function rollHud(roll: Roll) {
  const inWindow =
    roll.phase === "approach" && Math.abs(roll.approach - RELEASE_SWEET) <= RELEASE_WINDOW;
  return {
    phase: roll.phase,
    aim: roll.aim,
    swing: roll.swing,
    approach: Math.min(1, roll.approach),
    releaseLo: RELEASE_SWEET - RELEASE_WINDOW,
    releaseHi: RELEASE_SWEET + RELEASE_WINDOW,
    inWindow,
    foul: roll.foul,
    fell: roll.fellThisRoll,
  };
}
