import { freshRoll, tickRoll, type Roll, type RollEvent } from "./bowling";
import { createRace, type Race } from "./racing";
export type Fit = "default" | "court" | "river" | "night";

export type Spot =
  "wardrobe" | "bowl" | "pier" | "bait" | "meet" | "truck" | "mama" | "unc" | "nitro" | "strike";

export type City = {
  bait: number;
  fit: Fit;
  fed: boolean;
  fished: boolean;
  bowled: boolean;
  raced: boolean;
  bestBowl: number;
  bestRace: number;
  boost: number;
  fish: { phase: "wait" | "bite"; left: number; baited: boolean } | null;
  bowl: {
    phase: "aim" | "approach" | "roll" | "show" | "finished";
    power: number;
    aim: number;
    left: number;
    pins: number;
    frame: number;
    standing: number;
    throws: number[][];
    rack: number;
    score: number;
    /** The live roll: approach, release timing, ball and pin physics live in play/bowling.ts. */
    roll: Roll;
    rollSeed: number;
    /** Sim events from the last tick, for sound. */
    lastEvents: RollEvent[];
  } | null;
  race: Race | null;
  menu: number;
};

export type PlayEvent = {
  dialogue?: string;
  dollars?: number;
  respect?: number;
  mission?: string;
  pins?: number;
  teleport?: { x: number; z: number };
};

const FITS: Fit[] = ["default", "court", "river", "night"];
const FIT_LINE: Record<Fit, string> = {
  default: "Wardrobe — Default fit. No perk, just the block.",
  court: "Wardrobe — Court fit. Your shot pulls toward the pocket.",
  river: "Wardrobe — River fit. The bite stays longer.",
  night: "Wardrobe — Night fit. The strip gives you more time and more speed.",
};
const MENU = [
  { name: "901 plate", cost: 12, respect: 3 },
  { name: "Soul bowl", cost: 10, respect: 2 },
];

export function freshCity(): City {
  return {
    bait: 0,
    fit: "default",
    fed: false,
    fished: false,
    bowled: false,
    raced: false,
    bestBowl: 0,
    bestRace: 0,
    boost: 0,
    fish: null,
    bowl: null,
    race: null,
    menu: 0,
  };
}

export function activityPrompt(city: City): string {
  if (city.fish?.phase === "wait") return "Line is out. Wait for BITE. Move to stop.";
  if (city.fish?.phase === "bite") return "BITE — E to catch! Move to stop.";
  if (city.bowl?.phase === "aim")
    return `901 BOWL · Frame ${city.bowl.frame + 1}/10 · ${city.bowl.score} pts · ${city.bowl.standing} standing. A/D aim · hold Space to walk up · let go at the bottom of the swing. E exits.`;
  if (city.bowl?.phase === "approach")
    return city.bowl.roll.approach >= 0.68 && city.bowl.roll.approach <= 0.88 ? "RELEASE" : "";
  if (city.bowl?.phase === "roll")
    return city.bowl.roll.foul
      ? "FOUL — over the line"
      : city.bowl.roll.ball?.gutter
        ? "GUTTER"
        : "";
  if (city.bowl?.phase === "show")
    return `${city.bowl.pins === 10 ? "STRIKE!" : city.bowl.standing === 0 ? "SPARE!" : city.bowl.pins + " pins"} · ${city.bowl.score} pts`;
  if (city.bowl?.phase === "finished") return `901 BOWL · Final ${city.bowl.score} · E to leave`;
  if (city.race) {
    const r = city.race;
    if (r.phase === "countdown")
      return `NITRO CIRCUIT · ${Math.ceil(r.countdown)} · W gas, S brake, A/D steer, Space drift. E exits.`;
    if (r.phase === "finished")
      return `${r.won ? "YOU WIN" : "NITRO WINS"} · ${r.time.toFixed(1)}s · E to return`;
    const cue = r.contact > 0 ? "CONTACT" : r.drafting ? "DRAFT" : r.position === 1 ? "1st" : "2nd";
    return `Lap ${Math.min(3, Math.floor(r.progress / (128 + Math.PI * 36)) + 1)}/3 · ${Math.round(r.speed * 3.6)} km/h · ${cue} · ${r.time.toFixed(1)}s · Space drift · E exit`;
  }
  return "";
}

export function activityCharge(city: City): number {
  if (city.bowl?.phase === "approach") return city.bowl.roll.swing;
  if (city.fish?.phase === "bite")
    return Math.min(
      1,
      city.fish.left / ((city.fish.baited ? 3.5 : 3) + (city.fit === "river" ? 0.75 : 0)),
    );
  return 0;
}

export function cityMission(city: City, delivered: boolean): string | null {
  if (!delivered) return null;
  const left: string[] = [];
  if (!city.fished) left.push("fish the river");
  if (!city.bowled) left.push("roll at 901 Bowl");
  if (!city.fed) left.push("eat at the trucks");
  if (!city.raced) left.push("beat Nitro on the strip");
  if (!left.length) return "Memphis is yours. The block stays open.";
  return `Block's open. Next: ${left[0]}.`;
}

export function tickCity(city: City, dt: number, hold: boolean, steer: number): PlayEvent | null {
  if (city.boost > 0) city.boost = Math.max(0, city.boost - dt);
  if (city.fish) {
    city.fish.left -= dt;
    if (city.fish.phase === "wait" && city.fish.left <= 0) {
      const window = (city.fish.baited ? 3.5 : 3) + (city.fit === "river" ? 0.75 : 0);
      city.fish.phase = "bite";
      city.fish.left = window;
      return { dialogue: "River — Fish on. Hit E." };
    }
    if (city.fish.phase === "bite" && city.fish.left <= 0) {
      continueFishing(city);
      return { dialogue: "River — That one slipped away. Line stays out; wait for the next bite." };
    }
  }
  if (
    city.bowl &&
    (city.bowl.phase === "aim" || city.bowl.phase === "approach" || city.bowl.phase === "roll")
  ) {
    const bowl = city.bowl;
    const rollEvents = tickRoll(bowl.roll, { dt, hold, steer });
    bowl.lastEvents = rollEvents.slice();
    bowl.aim = bowl.roll.aim;
    bowl.power = bowl.roll.swing;
    bowl.phase = bowl.roll.phase === "done" ? "roll" : bowl.roll.phase;
    if (bowl.roll.phase === "done") {
      const pins = bowl.roll.fellThisRoll;
      bowl.pins = pins;
      bowl.standing -= pins;
      bowl.throws[bowl.frame]!.push(pins);
      bowl.score = bowlingScore(bowl.throws);
      bowl.phase = "show";
      bowl.left = 1.35;
      city.bowled = true;
      const pay = pins * 6;
      const respect = pins >= 8 ? 8 : pins >= 5 ? 4 : 1;
      return {
        pins,
        dollars: pay,
        respect,
        dialogue: bowl.roll.foul
          ? "Foul. Over the line — that one's a zero."
          : pins === 10
            ? `STRIKE. $${pay}.`
            : bowl.standing === 0
              ? `SPARE. $${pay}.`
              : pins >= 8
                ? `${pins} in the pocket. $${pay}.`
                : `${pins} pins. $${pay}.`,
        mission: cityMission(city, true) ?? undefined,
      };
    }
  } else if (city.bowl?.phase === "show") {
    city.bowl.left -= dt;
    if (city.bowl.left <= 0) {
      const bowl = city.bowl,
        throws = bowl.throws[bowl.frame]!;
      if (bowl.frame < 9) {
        if (bowl.standing === 0 || throws.length >= 2) {
          bowl.frame++;
          bowl.throws.push([]);
          bowl.standing = 10;
          bowl.rack++;
        }
      } else {
        const bonus = throws[0] === 10 || (throws[0] ?? 0) + (throws[1] ?? 0) === 10;
        if (throws.length >= (bonus ? 3 : 2)) {
          bowl.phase = "finished";
          const best = bowl.score > city.bestBowl;
          city.bestBowl = Math.max(city.bestBowl, bowl.score);
          return {
            dialogue: best
              ? `Game over — ${bowl.score}. New personal best.`
              : `Game over — ${bowl.score}. Best ${city.bestBowl}.`,
            respect: bowl.score >= 150 ? 10 : bowl.score >= 100 ? 5 : 2,
          };
        }
        if (bowl.standing === 0) {
          bowl.standing = 10;
          bowl.rack++;
        }
      }
      bowl.phase = "aim";
      bowl.power = 0;
      bowl.aim = 0;
      const standing =
        bowl.standing === 10 ? Array(10).fill(true) : bowl.roll.fallen.map((f) => !f);
      bowl.rollSeed = (bowl.rollSeed * 1103515245 + 12345) >>> 0 || 1;
      bowl.roll = freshRoll(standing, bowl.rollSeed);
      bowl.roll.aim = bowl.aim;
    }
  }
  return null;
}

export function crossFinish(city: City): PlayEvent | null {
  const race = city.race;
  if (!race || race.phase !== "finished" || race.paid) return null;
  race.paid = true;
  if (!race.won) return { dialogue: "Nitro — Good race. E to return and try again." };
  city.raced = true;
  city.bestRace = city.bestRace === 0 ? race.time : Math.min(city.bestRace, race.time);
  return {
    dollars: 110,
    respect: 8,
    dialogue: `Nitro — ${race.time.toFixed(1)}s. You took the circuit. $110. E to return.`,
    mission: cityMission(city, true) ?? undefined,
  };
}

export function triggerSpot(
  city: City,
  spot: Spot,
  dollars: number,
): PlayEvent & { used: boolean } {
  if (spot === "pier") return cast(city);
  if (spot === "bowl") return approach(city);
  if (spot === "bait") return buyBait(city, dollars);
  if (spot === "meet") return stageRace(city);
  if (spot === "truck") return order(city, dollars);
  if (spot === "wardrobe") return cycleFit(city);
  return { used: true, dialogue: talk(spot) };
}

export function cancelApproach(city: City): PlayEvent {
  city.bowl = null;
  return { dialogue: "" };
}

export function pullEarly(city: City): PlayEvent {
  city.fish = null;
  return { dialogue: "River — Too soon. Line's back in." };
}

export function hookFish(city: City): PlayEvent {
  if (city.fish?.phase !== "bite") return {};
  const baited = city.fish.baited;
  continueFishing(city);
  city.fished = true;
  const pay =
    (baited ? 28 : 16) +
    Math.floor(Math.random() * (baited ? 18 : 10)) +
    (city.fit === "river" ? 8 : 0);
  return {
    dollars: pay,
    respect: baited ? 3 : 2,
    dialogue: `River — In the cooler. ${pay} SackDollars. Keep fishing — the line stays out.`,
    mission: cityMission(city, true) ?? undefined,
  };
}

export function locked(city: City) {
  return Boolean(city.fish || city.bowl || city.race);
}

function continueFishing(city: City) {
  const baited = city.bait > 0;
  if (baited) city.bait -= 1;
  city.fish = { phase: "wait", left: 2.5 + Math.random() * 1.5, baited };
}

function cast(city: City): PlayEvent & { used: boolean } {
  if (city.fish?.phase === "bite") return { used: true, ...hookFish(city) };
  if (city.fish) return { used: true };
  continueFishing(city);
  const baited = city.fish!.baited;
  return {
    used: true,
    dialogue: baited
      ? "River — Bait on. Line's out."
      : "River — Bare hook. It still bites, just meaner.",
  };
}

function approach(city: City): PlayEvent & { used: boolean } {
  if (city.bowl) return { used: true, dialogue: "" };
  const seed = Date.now() & 0xffff || 1;
  city.bowl = {
    phase: "aim",
    power: 0,
    aim: 0,
    left: 0,
    pins: 0,
    frame: 0,
    standing: 10,
    throws: [[]],
    rack: 0,
    score: 0,
    roll: freshRoll(Array(10).fill(true), seed),
    rollSeed: seed,
    lastEvents: [],
  };
  return { used: true, teleport: { x: 92, z: -17.6 }, dialogue: "" };
}

function buyBait(city: City, dollars: number): PlayEvent & { used: boolean } {
  if (dollars < 15) return { used: true, dialogue: "Bait shop — Three for fifteen. You short." };
  city.bait += 3;
  return {
    used: true,
    dollars: -15,
    dialogue: `Bait shop — Three on the counter. You holding ${city.bait}.`,
  };
}

function stageRace(city: City): PlayEvent & { used: boolean } {
  if (city.race) return { used: true };
  city.race = createRace();
  return {
    used: true,
    teleport: { x: city.race.x, z: city.race.z },
    dialogue: "Nitro — Three laps. Coupe keys are yours. W gas, S brake, A/D steer, Space drift.",
  };
}

function order(city: City, dollars: number): PlayEvent & { used: boolean } {
  const item = MENU[city.menu] ?? MENU[0]!;
  if (dollars < item.cost)
    return {
      used: true,
      dialogue: `Food trucks — ${item.name} is $${item.cost}. Come back with it.`,
    };
  city.menu = (city.menu + 1) % MENU.length;
  city.fed = true;
  city.boost = 12;
  return {
    used: true,
    dollars: -item.cost,
    respect: item.respect,
    dialogue: `Food trucks — ${item.name}. Walk it off. You got some speed.`,
    mission: cityMission(city, true) ?? undefined,
  };
}

function cycleFit(city: City): PlayEvent & { used: boolean } {
  const i = FITS.indexOf(city.fit);
  city.fit = FITS[(i + 1) % FITS.length] ?? "default";
  return { used: true, dialogue: FIT_LINE[city.fit] };
}

function talk(spot: Spot) {
  if (spot === "mama")
    return "Mama Dee — Plate's warm if you come by the yard. Don't stay out past the streetlights.";
  if (spot === "unc")
    return "Unc J — River still pays if you wait on the bite. Don't snatch the line.";
  if (spot === "nitro") return "Nitro — Strip's live tonight. Beat my time or buy the next round.";
  return "Strike — 901 Bowl don't care about your name. It cares about the pocket.";
}

/** Ten-pin scoring resolves strike/spare bonuses only when the later rolls exist. */
export function bowlingScore(frames: number[][]) {
  const rolls = frames.flat();
  let i = 0,
    score = 0;
  for (let f = 0; f < Math.min(10, frames.length); f++) {
    const first = rolls[i];
    if (first == null) break;
    if (f === 9) {
      score += frames[f]!.reduce((a, b) => a + b, 0);
      break;
    }
    if (first === 10) {
      if (rolls[i + 1] == null || rolls[i + 2] == null) break;
      score += 10 + rolls[i + 1]! + rolls[i + 2]!;
      i++;
    } else {
      const second = rolls[i + 1];
      if (second == null) break;
      if (first + second === 10) {
        if (rolls[i + 2] == null) break;
        score += 10 + rolls[i + 2]!;
      } else score += first + second;
      i += 2;
    }
  }
  return score;
}

export type FrameBox = { rolls: string[]; total: number | null; current: boolean };

/** The ten-frame strip for the HUD: marks per roll and a running total once a frame can be scored. */
export function frameBoard(bowl: NonNullable<City["bowl"]>): FrameBox[] {
  const out: FrameBox[] = [];
  const all = bowl.throws;
  for (let i = 0; i < 10; i++) {
    const rolls = all[i] ?? [];
    const marks: string[] = [];
    rolls.forEach((p, j) => {
      const prev = j > 0 ? rolls[j - 1]! : 0;
      if (p === 10 && (i === 9 || j === 0)) marks.push("X");
      else if (j > 0 && prev + p === 10 && !(i === 9 && prev === 10)) marks.push("/");
      else marks.push(p === 0 ? "-" : String(p));
    });
    // A frame has a total when its bonus rolls exist (or it needs none).
    let total: number | null = null;
    if (rolls.length) {
      const later = all.slice(i + 1).flat();
      const strike = rolls[0] === 10;
      const spare = !strike && rolls.length >= 2 && rolls[0]! + rolls[1]! === 10;
      const closed =
        i === 9
          ? bowl.phase === "finished"
          : strike
            ? later.length >= 2
            : spare
              ? later.length >= 1
              : rolls.length >= 2;
      if (closed) total = cumulative(all, i);
    }
    out.push({ rolls: marks, total, current: i === bowl.frame && bowl.phase !== "finished" });
  }
  return out;
}

/** Cumulative ten-pin total through frame i, counting bonus rolls from later frames. */
function cumulative(all: number[][], i: number): number {
  const flat: number[] = [];
  all.forEach((f) => f.forEach((p) => flat.push(p)));
  let idx = 0;
  let total = 0;
  for (let f = 0; f <= i && f < 10; f++) {
    const rolls = all[f] ?? [];
    if (!rolls.length) break;
    if (f === 9) {
      total += rolls.reduce((a, b) => a + b, 0);
      break;
    }
    if (rolls[0] === 10) {
      total += 10 + (flat[idx + 1] ?? 0) + (flat[idx + 2] ?? 0);
      idx += 1;
    } else if (rolls.length >= 2 && rolls[0]! + rolls[1]! === 10) {
      total += 10 + (flat[idx + 2] ?? 0);
      idx += 2;
    } else {
      total += (rolls[0] ?? 0) + (rolls[1] ?? 0);
      idx += rolls.length;
    }
  }
  return total;
}
