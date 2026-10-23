/**
 * Haunted-house staging. Pure module, no `three`.
 *
 * The house is a 6×2 grid of 8 m rooms in haunt-local coordinates (x 0–48,
 * z 0–16; the runtime adds 500 to z). Each beat is tied to a room and fires
 * once per visit when its condition is met: entering, dwelling, or standing
 * still. A beat returns what the runtime needs to stage it — a sound, a
 * dialogue line, how far the room lights drop and for how long, and a
 * blackout. Nothing here blocks movement or hides the route: the handoff
 * rule is effects on top of real architecture, never in the way of it.
 */

export type BeatKind = "whisper" | "creak" | "sting" | "flicker" | "blackout" | "heartbeat";

export type Beat = {
  id: string;
  room: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Centre the sound comes from, for distance volume. */
  at: { x: number; z: number };
  trigger: "enter" | "dwell" | "still";
  /** Seconds in the room (dwell) or standing still (still) before it fires. */
  after: number;
  kind: BeatKind;
  line: string;
  /** Light multiplier at the bottom of the dip, and how long the dip lasts. */
  dim: number;
  seconds: number;
};

const room = (col: number, row: number) => ({
  minX: col * 8,
  maxX: col * 8 + 8,
  minZ: row * 8,
  maxZ: row * 8 + 8,
});
const centre = (col: number, row: number) => ({ x: col * 8 + 4, z: row * 8 + 4 });

export const BEATS: Beat[] = [
  {
    id: "foyer-lock",
    room: room(0, 0),
    at: { x: 4, z: 0.6 },
    trigger: "dwell",
    after: 2.2,
    kind: "sting",
    line: "The front door locks behind you.",
    dim: 0.35,
    seconds: 0.5,
  },
  {
    id: "stair-creak",
    room: room(1, 0),
    at: centre(1, 0),
    trigger: "enter",
    after: 0,
    kind: "creak",
    line: "Something shifts its weight on the stairs.",
    dim: 0.8,
    seconds: 0.4,
  },
  {
    id: "portraits",
    room: room(2, 0),
    at: centre(2, 0),
    trigger: "still",
    after: 1.4,
    kind: "sting",
    line: "The portraits are looking at you. All of them.",
    dim: 0.2,
    seconds: 0.7,
  },
  {
    id: "library-gust",
    room: room(3, 0),
    at: { x: 29, z: 5.2 },
    trigger: "dwell",
    after: 1.6,
    kind: "whisper",
    line: "A gust puts out half the candles.",
    dim: 0.3,
    seconds: 2.4,
  },
  {
    id: "attic-wind",
    room: room(4, 0),
    at: centre(4, 0),
    trigger: "enter",
    after: 0,
    kind: "creak",
    line: "Wind in the rafters, and no window open.",
    dim: 0.6,
    seconds: 1.2,
  },
  {
    id: "toy-room",
    room: room(0, 1),
    at: centre(0, 1),
    trigger: "dwell",
    after: 1.2,
    kind: "whisper",
    line: "A music box winds itself up.",
    dim: 0.55,
    seconds: 1.6,
  },
  {
    id: "dining-chairs",
    room: room(1, 1),
    at: centre(1, 1),
    trigger: "still",
    after: 1.0,
    kind: "sting",
    line: "Every chair pulls out from the table at once.",
    dim: 0.25,
    seconds: 0.6,
  },
  {
    id: "seance",
    room: room(2, 1),
    at: centre(2, 1),
    trigger: "dwell",
    after: 1.8,
    kind: "whisper",
    line: "The planchette spells your name.",
    dim: 0.1,
    seconds: 2.8,
  },
  {
    id: "kitchen-knives",
    room: room(3, 1),
    at: centre(3, 1),
    trigger: "enter",
    after: 0,
    kind: "sting",
    line: "Knives on the rack rattle in time with your steps.",
    dim: 0.4,
    seconds: 0.5,
  },
  {
    id: "boiler-blackout",
    room: room(4, 1),
    at: centre(4, 1),
    trigger: "dwell",
    after: 0.9,
    kind: "blackout",
    line: "Lights out.",
    dim: 0.07,
    seconds: 2.6,
  },
  {
    id: "final-approach",
    room: { minX: 38, maxX: 48, minZ: 8, maxZ: 16 },
    at: { x: 44, z: 12 },
    trigger: "enter",
    after: 0,
    kind: "heartbeat",
    line: "",
    dim: 1,
    seconds: 0,
  },
];

export type HauntStage = {
  fired: Set<string>;
  inRoom: string | null;
  roomTime: number;
  stillTime: number;
  /** Active light dip: multiplier and remaining seconds. */
  dip: { scale: number; left: number; total: number } | null;
  heartbeat: number;
  /** Set by the runtime for the HUD; 0..1. */
  blackout: number;
  events: StageEvent[];
};

export type StageEvent = { kind: BeatKind; line: string; volume: number };

export function freshStage(): HauntStage {
  return {
    fired: new Set(),
    inRoom: null,
    roomTime: 0,
    stillTime: 0,
    dip: null,
    heartbeat: 0,
    blackout: 0,
    events: [],
  };
}

/** Everything fires again on the next visit. */
export function enterHaunt(stage: HauntStage) {
  stage.fired.clear();
  stage.inRoom = null;
  stage.roomTime = 0;
  stage.stillTime = 0;
  stage.dip = null;
  stage.heartbeat = 0;
  stage.blackout = 0;
}

const inside = (b: Beat["room"], x: number, z: number) =>
  x >= b.minX && x < b.maxX && z >= b.minZ && z < b.maxZ;

export function tickHauntStage(
  stage: HauntStage,
  input: { dt: number; x: number; z: number; moving: boolean },
): StageEvent[] {
  stage.events.length = 0;
  const { dt, x, z } = input;
  const current = BEATS.find((b) => inside(b.room, x, z));
  const id = current?.id ?? null;
  if (id !== stage.inRoom) {
    stage.inRoom = id;
    stage.roomTime = 0;
    stage.stillTime = 0;
  } else stage.roomTime += dt;
  stage.stillTime = input.moving ? 0 : stage.stillTime + dt;

  for (const beat of BEATS) {
    if (stage.fired.has(beat.id) || !inside(beat.room, x, z)) continue;
    const ready =
      beat.trigger === "enter"
        ? true
        : beat.trigger === "dwell"
          ? stage.roomTime >= beat.after
          : stage.stillTime >= beat.after;
    if (!ready) continue;
    stage.fired.add(beat.id);
    const dist = Math.hypot(x - beat.at.x, z - beat.at.z);
    const volume = Math.max(0.25, 1 - dist / 9);
    if (beat.kind === "heartbeat") {
      stage.events.push({ kind: "heartbeat", line: "", volume: 1 });
      continue;
    }
    stage.events.push({ kind: beat.kind, line: beat.line, volume });
    if (beat.seconds > 0) stage.dip = { scale: beat.dim, left: beat.seconds, total: beat.seconds };
  }

  // Light dip decays back to full over its last third; a blackout is a dip to zero.
  if (stage.dip) {
    stage.dip.left -= dt;
    if (stage.dip.left <= 0) stage.dip = null;
  }
  const dip = stage.dip;
  const recovering = dip ? Math.min(1, dip.left / (dip.total / 3)) : 0;
  const scale = dip ? dip.scale + (1 - dip.scale) * (1 - recovering) : 1;
  stage.blackout = dip && dip.scale <= 0.1 ? recovering : 0;

  // Heartbeat climbs through the last two rooms toward the final court and settles inside it.
  const target = x >= 38 && z >= 8 ? 1 : x >= 30 && z >= 8 ? (x - 30) / 8 : 0;
  stage.heartbeat += (target - stage.heartbeat) * Math.min(1, dt * 1.5);
  return stage.events;
}

/** Multiplier for the room lights this frame. */
export function hauntLightScale(stage: HauntStage) {
  const dip = stage.dip;
  if (!dip) return 1;
  const recovering = Math.min(1, dip.left / (dip.total / 3));
  return dip.scale + (1 - dip.scale) * (1 - recovering);
}
