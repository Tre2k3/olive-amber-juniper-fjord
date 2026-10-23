export const RACE_RADIUS = 18;
export const RACE_HALF_WIDTH = 3.5;
export const RACE_LENGTH = 128 + Math.PI * 36;
export const RACE_LAPS = 3;
export type Race = {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  phase: "countdown" | "running" | "finished";
  countdown: number;
  time: number;
  progress: number;
  lastS: number;
  nextGate: number;
  opponent: number;
  drift: number;
  boost: number;
  wasDrifting: boolean;
  won: boolean;
  paid: boolean;
  /** Nitro: progress along the track, lane across it (−1 inside … +1 outside), speed, and intent. */
  rival: { lane: number; speed: number; laneTarget: number; cooldown: number };
  /** Human lateral position relative to the racing line, for contact and drafting. */
  lane: number;
  drafting: boolean;
  contact: number;
  position: 1 | 2;
  feedback: string;
  events: RaceEvent[];
};
export type RaceEvent = "contact" | "overtake" | "overtaken" | "draft" | "lap" | "finish";

/** Track-space lateral offset for a lane value, in metres. Lanes keep clear of the wall. */
export const LANE_SPAN = RACE_HALF_WIDTH - 1.25;

/** Direction of travel and the outward normal at a track distance. */
export function raceFrame(distance: number) {
  const a = sampleRace(distance),
    b = sampleRace(distance + 0.5);
  let tx = b.x - a.x,
    tz = b.z - a.z;
  const len = Math.hypot(tx, tz) || 1;
  tx /= len;
  tz /= len;
  // Outward normal is to the right of travel; on this circuit right is the outside of both turns.
  return { ...a, tx, tz, nx: -tz, nz: tx };
}

/** Where to draw the rival this frame. */
export function rivalPose(race: Race) {
  const f = raceFrame(Math.min(race.opponent, RACE_LAPS * RACE_LENGTH - 0.5));
  const off = race.rival.lane * LANE_SPAN;
  return { x: f.x + f.nx * off, z: f.z + f.nz * off, yaw: f.yaw };
}

/** Inside-of-the-turn lane for the racing line at a distance; straights drift back to centre. */
function racingLineLane(distance: number) {
  const s = ((distance % RACE_LENGTH) + RACE_LENGTH) % RACE_LENGTH;
  const inTurn = (s > 64 && s < 64 + Math.PI * 18) || s > 128 + Math.PI * 18;
  return inTurn ? -0.55 : 0;
}
export function sampleRace(distance: number) {
  let s = ((distance % RACE_LENGTH) + RACE_LENGTH) % RACE_LENGTH;
  if (s < 64) return { x: -32 + s, z: -168, yaw: -Math.PI / 2 };
  s -= 64;
  if (s < Math.PI * 18) {
    const a = -Math.PI / 2 + s / 18;
    return { x: 32 + Math.cos(a) * 18, z: -150 + Math.sin(a) * 18, yaw: -Math.PI - a };
  }
  s -= Math.PI * 18;
  if (s < 64) return { x: 32 - s, z: -132, yaw: Math.PI / 2 };
  s -= 64;
  const a = Math.PI / 2 + s / 18;
  return { x: -32 + Math.cos(a) * 18, z: -150 + Math.sin(a) * 18, yaw: -Math.PI - a };
}
export function nearestRace(x: number, z: number) {
  const candidates = [
    { s: Math.max(0, Math.min(64, x + 32)), x: Math.max(-32, Math.min(32, x)), z: -168 },
    {
      s: 64 + Math.PI * 18 + Math.max(0, Math.min(64, 32 - x)),
      x: Math.max(-32, Math.min(32, x)),
      z: -132,
    },
  ];
  for (const side of [1, -1]) {
    let a = Math.atan2(z + 150, x - side * 32);
    if (side === 1) a = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, a));
    else {
      if (a < 0) a += Math.PI * 2;
      a = Math.max(Math.PI / 2, Math.min(Math.PI * 1.5, a));
    }
    candidates.push({
      s: side === 1 ? 64 + (a + Math.PI / 2) * 18 : 128 + Math.PI * 18 + (a - Math.PI / 2) * 18,
      x: side * 32 + Math.cos(a) * 18,
      z: -150 + Math.sin(a) * 18,
    });
  }
  return candidates.reduce((a, b) =>
    Math.hypot(x - a.x, z - a.z) < Math.hypot(x - b.x, z - b.z) ? a : b,
  );
}
export function createRace(): Race {
  const start = sampleRace(0);
  return {
    ...start,
    speed: 0,
    phase: "countdown",
    countdown: 3,
    time: 0,
    progress: 0,
    lastS: 0,
    nextGate: 1,
    opponent: -5,
    drift: 0,
    boost: 0,
    wasDrifting: false,
    won: false,
    paid: false,
    rival: { lane: 0.45, speed: 0, laneTarget: 0.45, cooldown: 0 },
    lane: -0.45,
    drafting: false,
    contact: 0,
    position: 2,
    feedback: "",
    events: [],
  };
}
export function tickRace(
  race: Race,
  dt: number,
  throttle: number,
  steer: number,
  drifting: boolean,
) {
  if (race.phase === "finished") return;
  if (race.phase === "countdown") {
    race.countdown = Math.max(0, race.countdown - dt);
    if (race.countdown === 0) race.phase = "running";
    return;
  }
  // Small substeps retain walls and progress gates even at boost speed.
  const steps = Math.max(1, Math.ceil(dt / (1 / 120))),
    h = dt / steps;
  race.events.length = 0;
  for (let i = 0; i < steps; i++) {
    race.time += h;
    tickRival(race, h);
    const driftActive = drifting && Math.abs(steer) > 0.15 && race.speed > 5;
    if (driftActive) race.drift = Math.min(1.5, race.drift + h);
    else if (race.wasDrifting) {
      if (race.drift > 0.45) race.boost = Math.min(1.8, race.drift);
      race.drift = 0;
    }
    race.wasDrifting = driftActive;
    race.boost = Math.max(0, race.boost - h);
    race.speed += (throttle > 0 ? throttle * 12 : throttle < 0 ? throttle * 23 : -5) * h;
    race.speed = Math.max(0, Math.min(race.boost > 0 ? 30 : 25, race.speed));
    race.yaw += steer * (driftActive ? 1.8 : 1.35) * Math.min(1, race.speed / 6) * h;
    race.x -= Math.sin(race.yaw) * race.speed * h;
    race.z -= Math.cos(race.yaw) * race.speed * h;
    const near = nearestRace(race.x, race.z);
    const dx = race.x - near.x,
      dz = race.z - near.z,
      distance = Math.hypot(dx, dz);
    if (distance > RACE_HALF_WIDTH - 0.95) {
      race.x = near.x + (dx / distance) * (RACE_HALF_WIDTH - 0.95);
      race.z = near.z + (dz / distance) * (RACE_HALF_WIDTH - 0.95);
      race.speed *= Math.exp(-8 * h);
    }
    // Human lane relative to the racing line, from the track normal at this point.
    {
      const f = raceFrame(near.s);
      race.lane = Math.max(
        -1,
        Math.min(1, ((race.x - f.x) * f.nx + (race.z - f.z) * f.nz) / LANE_SPAN),
      );
    }
    interact(race, h);
    let ds = near.s - race.lastS;
    if (ds > RACE_LENGTH / 2) ds -= RACE_LENGTH;
    if (ds < -RACE_LENGTH / 2) ds += RACE_LENGTH;
    // No infield shortcuts or projection jumps can skip a gate.
    if (Math.abs(ds) < 36 * h + 0.15) race.progress = Math.max(0, race.progress + ds);
    race.lastS = near.s;
    if (race.progress >= (race.nextGate * RACE_LENGTH) / 4) {
      race.nextGate++;
      if ((race.nextGate - 1) % 4 === 0 && race.nextGate > 1) race.events.push("lap");
    }
    const ahead: 1 | 2 = race.progress >= race.opponent ? 1 : 2;
    if (ahead !== race.position) {
      race.events.push(ahead === 1 ? "overtake" : "overtaken");
      race.position = ahead;
      race.feedback = ahead === 1 ? "P1 — YOU'RE AHEAD" : "P2 — NITRO BY YOU";
    }
    if (race.progress >= RACE_LAPS * RACE_LENGTH && race.nextGate > RACE_LAPS * 4) {
      race.phase = "finished";
      race.won = race.opponent < RACE_LAPS * RACE_LENGTH;
      race.events.push("finish");
      break;
    }
    if (race.time > 180) {
      race.phase = "finished";
      race.won = false;
      break;
    }
  }
}
export function validateRaceTrack() {
  const points = Array.from({ length: 160 }, (_, i) => sampleRace((i * RACE_LENGTH) / 160));
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      const along = (Math.min(j - i, points.length - (j - i)) * RACE_LENGTH) / 160;
      if (
        along > 6 * RACE_HALF_WIDTH &&
        Math.hypot(points[i]!.x - points[j]!.x, points[i]!.z - points[j]!.z) < 2 * RACE_HALF_WIDTH
      )
        throw new Error("Race corridor self-overlap");
    }
  if (RACE_RADIUS < RACE_HALF_WIDTH * 2) throw new Error("Race turn radius too tight");
  return true;
}

/**
 * Nitro drives the racing line, lifts for the turns, and reacts to you: he
 * pulls out of your lane to pass when he's faster, tucks in when he's slower,
 * and rubber-bands gently so a stumble isn't a lost race. Deterministic.
 */
function tickRival(race: Race, h: number) {
  const r = race.rival;
  const s = ((race.opponent % RACE_LENGTH) + RACE_LENGTH) % RACE_LENGTH;
  const inTurn = (s > 64 && s < 64 + Math.PI * 18) || s > 128 + Math.PI * 18;
  const gap = race.progress - race.opponent; // + means the human is ahead
  let target = inTurn ? 19.5 : 24.5;
  if (gap > 24)
    target += 2.4; // catch up a little when well behind
  else if (gap < -24) target -= 2.0; // never runs away out of sight
  r.speed += (target > r.speed ? 9 : -14) * h;
  r.speed = Math.max(0, Math.min(27, r.speed));
  race.opponent += r.speed * h;

  r.cooldown = Math.max(0, r.cooldown - h);
  const close = Math.abs(gap) < 7;
  const sameLane = Math.abs(race.lane - r.lane) < 0.55;
  if (close && sameLane && r.cooldown <= 0) {
    // Pick the side with more room to pass or to tuck in behind.
    r.laneTarget = race.lane > 0 ? -0.7 : 0.7;
    r.cooldown = 1.6;
  } else if (!close && r.cooldown <= 0) r.laneTarget = racingLineLane(race.opponent);
  r.lane += Math.max(-1, Math.min(1, r.laneTarget - r.lane)) * 1.6 * h;
  r.lane = Math.max(-1, Math.min(1, r.lane));
}

/** Drafting and door-to-door contact between the two cars. */
function interact(race: Race, h: number) {
  let gap = race.progress - race.opponent;
  if (gap > RACE_LENGTH / 2) gap -= RACE_LENGTH;
  if (gap < -RACE_LENGTH / 2) gap += RACE_LENGTH;
  const lateral = (race.lane - race.rival.lane) * LANE_SPAN;
  race.contact = Math.max(0, race.contact - h);
  // Slipstream: tucked in 2–9 m behind Nitro in his lane.
  const wasDrafting = race.drafting;
  race.drafting = gap < -2 && gap > -9 && Math.abs(lateral) < 1.3 && race.speed > 12;
  if (race.drafting) {
    race.speed = Math.min(race.speed + 3.2 * h, 27.5);
    if (!wasDrafting) {
      race.events.push("draft");
      race.feedback = "DRAFT — slipstream";
    }
  }
  // Door-to-door: shove apart, scrub speed from both, don't repeat every substep.
  if (Math.abs(gap) < 3.2 && Math.abs(lateral) < 1.55 && race.contact <= 0) {
    const push = lateral >= 0 ? 1 : -1;
    const f = raceFrame(race.progress);
    race.x += f.nx * push * 0.55;
    race.z += f.nz * push * 0.55;
    race.rival.lane = Math.max(-1, Math.min(1, race.rival.lane - push * 0.35));
    race.rival.laneTarget = race.rival.lane;
    race.speed *= 0.93;
    race.rival.speed *= 0.95;
    race.contact = 0.6;
    race.events.push("contact");
    race.feedback = "CONTACT";
  }
}
