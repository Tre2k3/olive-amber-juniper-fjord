/**
 * Riverfront fishing. Pure module, no `three`.
 *
 * Cast (hold for distance) → the lure flies and splashes → wait with nibbles
 * → a bite window to set the hook → a reel fight on a tension line → land it
 * or snap off. Catches go in a cooler and sell at Mama Dee's truck.
 *
 * The fight is the game: hold to reel (line comes in, tension climbs), let go
 * to give line (tension falls, the fish runs). Keep tension in the working
 * band and the fish tires. Peg it and the line snaps. Leave it slack too long
 * and the fish throws the hook.
 */

export type V3 = { x: number; y: number; z: number };

export type BaitKind = "bare" | "worm" | "shad";

export type SpeciesId =
  "bluegill" | "crappie" | "bass" | "channel" | "drum" | "buffalo" | "blue" | "flathead" | "gar";

export type Species = {
  id: SpeciesId;
  name: string;
  minKg: number;
  maxKg: number;
  /** 0..1 how hard it runs. */
  fight: number;
  base: number;
  perKg: number;
  weight: number;
  trophyKg: number;
};

export const SPECIES: Species[] = [
  {
    id: "bluegill",
    name: "Bluegill",
    minKg: 0.1,
    maxKg: 0.45,
    fight: 0.25,
    base: 6,
    perKg: 8,
    weight: 30,
    trophyKg: 0.4,
  },
  {
    id: "crappie",
    name: "Crappie",
    minKg: 0.3,
    maxKg: 1.3,
    fight: 0.35,
    base: 10,
    perKg: 10,
    weight: 20,
    trophyKg: 1.1,
  },
  {
    id: "bass",
    name: "Largemouth bass",
    minKg: 0.8,
    maxKg: 3.8,
    fight: 0.65,
    base: 18,
    perKg: 12,
    weight: 14,
    trophyKg: 3.2,
  },
  {
    id: "channel",
    name: "Channel catfish",
    minKg: 1,
    maxKg: 6.5,
    fight: 0.55,
    base: 14,
    perKg: 9,
    weight: 14,
    trophyKg: 5.5,
  },
  {
    id: "drum",
    name: "Freshwater drum",
    minKg: 1,
    maxKg: 8,
    fight: 0.5,
    base: 8,
    perKg: 6,
    weight: 10,
    trophyKg: 6.5,
  },
  {
    id: "buffalo",
    name: "Smallmouth buffalo",
    minKg: 3,
    maxKg: 12,
    fight: 0.6,
    base: 10,
    perKg: 5,
    weight: 6,
    trophyKg: 10,
  },
  {
    id: "blue",
    name: "Blue catfish",
    minKg: 4,
    maxKg: 30,
    fight: 0.82,
    base: 30,
    perKg: 6,
    weight: 3,
    trophyKg: 22,
  },
  {
    id: "flathead",
    name: "Flathead catfish",
    minKg: 5,
    maxKg: 25,
    fight: 0.9,
    base: 34,
    perKg: 7,
    weight: 2,
    trophyKg: 18,
  },
  {
    id: "gar",
    name: "Alligator gar",
    minKg: 10,
    maxKg: 60,
    fight: 1,
    base: 80,
    perKg: 5,
    weight: 0.5,
    trophyKg: 40,
  },
];

export type Catch = { species: SpeciesId; kg: number; trophy: boolean };

export type Fish = {
  species: Species;
  kg: number;
  stamina: number;
  run: number;
  runTarget: number;
  runT: number;
};

export type Phase =
  "idle" | "casting" | "flying" | "wait" | "bite" | "fight" | "landed" | "snapped" | "lost";

export type Fishing = {
  phase: Phase;
  power: number;
  meterUp: boolean;
  lure: V3;
  lureVel: V3;
  /** Where the line is anchored (the pier spot the cast was made from). */
  origin: V3;
  castDir: { x: number; z: number };
  castDist: number;
  bait: BaitKind;
  left: number;
  nibbleT: number;
  nibbling: number;
  tension: number;
  lineOut: number;
  slackT: number;
  fish: Fish | null;
  cooler: Catch[];
  records: Partial<Record<SpeciesId, number>>;
  worms: number;
  shad: number;
  totalCaught: number;
  flash: { text: string; t: number; good: boolean } | null;
  lastCatch: Catch | null;
};

export type FishEvent =
  "cast" | "splash" | "nibble" | "bite" | "reel" | "strain" | "snap" | "landed" | "lost";

export type FishInput = {
  dt: number;
  hold: boolean;
  interact: boolean;
  player: V3;
  faceX: number;
  faceZ: number;
  night: boolean;
  riverFit: boolean;
};

export const COOLER_MAX = 6;
const G = 9.8;

export function freshFishing(): Fishing {
  return {
    phase: "idle",
    power: 0,
    meterUp: true,
    lure: { x: 0, y: 0, z: 0 },
    lureVel: { x: 0, y: 0, z: 0 },
    origin: { x: 0, y: 0, z: 0 },
    castDir: { x: 0, z: -1 },
    castDist: 0,
    bait: "bare",
    left: 0,
    nibbleT: 0,
    nibbling: 0,
    tension: 0,
    lineOut: 0,
    slackT: 0,
    fish: null,
    cooler: [],
    records: {},
    worms: 0,
    shad: 0,
    totalCaught: 0,
    flash: null,
    lastCatch: null,
  };
}

export function fishingActive(f: Fishing) {
  return f.phase !== "idle" && f.phase !== "landed" && f.phase !== "snapped" && f.phase !== "lost";
}

/** The player is rooted while a line is out or a fish is on. */
export function fishingLocks(f: Fishing) {
  return (
    f.phase === "casting" ||
    f.phase === "flying" ||
    f.phase === "wait" ||
    f.phase === "bite" ||
    f.phase === "fight"
  );
}

function pickBait(f: Fishing): BaitKind {
  if (f.shad > 0) return "shad";
  if (f.worms > 0) return "worm";
  return "bare";
}

export function baitLabel(f: Fishing) {
  const b = pickBait(f);
  return b === "shad" ? `cut shad ×${f.shad}` : b === "worm" ? `worms ×${f.worms}` : "bare hook";
}

/** Start charging a cast from the current spot. */
export function beginCast(
  f: Fishing,
  player: V3,
  faceX: number,
  faceZ: number,
  waterDir: { x: number; z: number },
) {
  if (f.phase !== "idle" && f.phase !== "landed" && f.phase !== "snapped" && f.phase !== "lost")
    return false;
  f.phase = "casting";
  f.power = 0;
  f.meterUp = true;
  f.origin = { ...player };
  // Cast where the player is looking if that points at water, else straight out.
  const dot = faceX * waterDir.x + faceZ * waterDir.z;
  f.castDir = dot > 0.35 ? { x: faceX, z: faceZ } : waterDir;
  f.bait = pickBait(f);
  f.flash = null;
  return true;
}

function flash(f: Fishing, text: string, good: boolean, t = 2.6) {
  f.flash = { text, t, good };
}

export function tickFishing(f: Fishing, input: FishInput): FishEvent[] {
  const ev: FishEvent[] = [];
  const { dt } = input;
  if (f.flash && (f.flash.t -= dt) <= 0) f.flash = null;

  switch (f.phase) {
    case "casting": {
      if (input.hold) {
        const rate = 0.95;
        if (f.meterUp) {
          f.power += dt * rate;
          if (f.power >= 1) {
            f.power = 1;
            f.meterUp = false;
          }
        } else {
          f.power -= dt * rate;
          if (f.power <= 0) {
            f.power = 0;
            f.meterUp = true;
          }
        }
      } else {
        // Release: launch the lure.
        if (f.bait === "shad") f.shad = Math.max(0, f.shad - 1);
        else if (f.bait === "worm") f.worms = Math.max(0, f.worms - 1);
        const dist = 4 + f.power * 15;
        const speed = Math.sqrt((dist * G) / Math.sin(2 * 0.72));
        f.lure = {
          x: f.origin.x + f.castDir.x * 0.5,
          y: f.origin.y + 1.4,
          z: f.origin.z + f.castDir.z * 0.5,
        };
        f.lureVel = {
          x: f.castDir.x * speed * Math.cos(0.72),
          y: speed * Math.sin(0.72),
          z: f.castDir.z * speed * Math.cos(0.72),
        };
        f.castDist = dist;
        f.phase = "flying";
        f.power = 0;
        ev.push("cast");
      }
      break;
    }
    case "flying": {
      f.lureVel.y -= G * dt;
      f.lure.x += f.lureVel.x * dt;
      f.lure.y += f.lureVel.y * dt;
      f.lure.z += f.lureVel.z * dt;
      if (f.lure.y <= 0.04) {
        f.lure.y = 0.04;
        f.lureVel = { x: 0, y: 0, z: 0 };
        f.castDist = Math.hypot(f.lure.x - f.origin.x, f.lure.z - f.origin.z);
        f.phase = "wait";
        const baitBonus = f.bait === "shad" ? 0.55 : f.bait === "worm" ? 0.7 : 1;
        f.left = (4.5 + Math.random() * 9) * baitBonus * (input.riverFit ? 0.8 : 1);
        f.nibbleT = 1.6 + Math.random() * 2;
        f.nibbling = 0;
        ev.push("splash");
      }
      break;
    }
    case "wait": {
      f.left -= dt;
      f.nibbleT -= dt;
      if (f.nibbling > 0) f.nibbling -= dt;
      if (f.nibbleT <= 0) {
        f.nibbleT = 1.4 + Math.random() * 2.4;
        f.nibbling = 0.45;
        ev.push("nibble");
      }
      // Pulling early reels in an empty hook.
      if (input.interact) {
        f.phase = "idle";
        flash(f, "Too soon — line's back in.", false, 2);
        break;
      }
      if (f.left <= 0) {
        f.phase = "bite";
        f.left = 1.35 + (input.riverFit ? 0.45 : 0) + (f.bait !== "bare" ? 0.25 : 0);
        f.fish = spawnFish(f.bait, input.night, input.riverFit);
        f.nibbling = 0.6;
        ev.push("bite");
      }
      break;
    }
    case "bite": {
      f.left -= dt;
      if (input.interact || input.hold) {
        // Hookset.
        f.phase = "fight";
        f.tension = 0.25;
        f.lineOut = f.castDist;
        f.slackT = 0;
        const fish = f.fish!;
        fish.stamina = 1;
        fish.run = 0.8;
        fish.runTarget = 0.8;
        fish.runT = 0.8;
        flash(f, "Fish on! Hold to reel — ease off when it runs.", true, 3);
        break;
      }
      if (f.left <= 0) {
        f.phase = "lost";
        f.fish = null;
        flash(f, "Missed the bite. It took the bait.", false);
        ev.push("lost");
      }
      break;
    }
    case "fight": {
      const fish = f.fish!;
      // The fish decides to run in bursts; tired fish run softer.
      fish.runT -= dt;
      if (fish.runT <= 0) {
        const cap = 0.25 + fish.species.fight * 0.75 * (0.35 + fish.stamina * 0.65);
        fish.runTarget =
          Math.random() < 0.55 ? cap * (0.6 + Math.random() * 0.4) : cap * Math.random() * 0.35;
        fish.runT = 0.5 + Math.random() * 1.4;
      }
      fish.run += (fish.runTarget - fish.run) * (1 - Math.exp(-4.5 * dt));

      const heavy = Math.min(1, fish.kg / 12);
      if (input.hold) {
        const reel = 2.1 * (1 - fish.run * 0.85) * (1 - heavy * 0.35);
        f.lineOut -= reel * dt;
        // Capped so even a 60 kg gar gives a human about half a second from the green band to a snap.
        f.tension += (0.4 + fish.run * 0.85 + heavy * 0.25) * dt;
        f.slackT = 0;
        ev.push("reel");
      } else {
        f.tension -= 1.4 * dt;
        f.lineOut += fish.run * 1.7 * dt;
        if (f.tension <= 0.02) f.slackT += dt;
      }
      f.tension = Math.max(0, f.tension);

      // Work band: the fish tires when the line is loaded but not pegged.
      if (f.tension > 0.3 && f.tension < 0.82)
        fish.stamina = Math.max(0, fish.stamina - dt * (0.16 + fish.run * 0.12));
      if (f.tension > 0.72) ev.push("strain");

      if (f.tension >= 1) {
        f.phase = "snapped";
        f.fish = null;
        flash(f, "Line snapped. Ease off when it runs.", false, 3.2);
        ev.push("snap");
        break;
      }
      if (f.slackT > 2.6) {
        f.phase = "lost";
        f.fish = null;
        flash(f, "Threw the hook — keep some tension on it.", false, 3.2);
        ev.push("lost");
        break;
      }
      // Lure drifts along the line toward the player as it comes in.
      const dx = f.origin.x - f.lure.x;
      const dz = f.origin.z - f.lure.z;
      const d = Math.hypot(dx, dz) || 1;
      const want = Math.max(0.6, f.lineOut);
      const nx = f.origin.x - (dx / d) * want;
      const nz = f.origin.z - (dz / d) * want;
      f.lure.x +=
        (nx - f.lure.x) * (1 - Math.exp(-6 * dt)) +
        Math.sin(performance.now() / 90) * fish.run * 0.02;
      f.lure.z += (nz - f.lure.z) * (1 - Math.exp(-6 * dt));
      f.lure.y = 0.04 - fish.run * 0.03 + Math.sin(performance.now() / 70) * 0.015;

      if (f.lineOut <= 0.9) {
        const trophy = fish.kg >= fish.species.trophyKg;
        const landed: Catch = {
          species: fish.species.id,
          kg: Math.round(fish.kg * 100) / 100,
          trophy,
        };
        f.phase = "landed";
        f.lastCatch = landed;
        f.fish = null;
        f.totalCaught += 1;
        const rec = f.records[landed.species] ?? 0;
        if (landed.kg > rec) f.records[landed.species] = landed.kg;
        if (f.cooler.length < COOLER_MAX) {
          f.cooler.push(landed);
          flash(
            f,
            `${fish.species.name} — ${landed.kg} kg${trophy ? " — TROPHY" : ""}. In the cooler.`,
            true,
            3.4,
          );
        } else {
          flash(
            f,
            `${fish.species.name} — ${landed.kg} kg. Cooler's full — sell at Mama Dee's.`,
            true,
            3.6,
          );
        }
        ev.push("landed");
      }
      break;
    }
    case "landed":
    case "snapped":
    case "lost":
      // Resolved; the next E on the pier starts a new cast.
      break;
    case "idle":
      break;
  }
  return ev;
}

function spawnFish(bait: BaitKind, night: boolean, riverFit: boolean): Fish {
  const weights = SPECIES.map((s) => {
    let w = s.weight;
    const cat = s.id === "channel" || s.id === "blue" || s.id === "flathead";
    if (bait === "worm") {
      if (s.id === "bluegill" || s.id === "crappie" || s.id === "bass") w *= 1.5;
    } else if (bait === "shad") {
      if (cat || s.id === "gar") w *= 2.6;
      if (s.id === "bluegill") w *= 0.3;
    } else {
      if (s.id === "bluegill") w *= 2;
      else w *= 0.6;
    }
    if (night) {
      if (cat) w *= 2;
      if (s.id === "gar") w *= 3;
    }
    if (riverFit && (s.id === "blue" || s.id === "flathead" || s.id === "gar")) w *= 1.5;
    // The gar is a hunt: cut shad or darkness, never a bare day hook.
    if (s.id === "gar" && bait !== "shad" && !night) w = 0;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  let species = SPECIES[0]!;
  for (let i = 0; i < SPECIES.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) {
      species = SPECIES[i]!;
      break;
    }
  }
  // Skew toward the small end so trophies are rare.
  const t = Math.pow(Math.random(), 1.8);
  const kg = species.minKg + (species.maxKg - species.minKg) * t;
  return { species, kg, stamina: 1, run: 0, runTarget: 0, runT: 0 };
}

export function catchValue(c: Catch) {
  const s = SPECIES.find((x) => x.id === c.species)!;
  return Math.round((s.base + s.perKg * c.kg) * (c.trophy ? 1.5 : 1));
}

/** Sell everything in the cooler. Returns dollars, respect, and a line to say. */
export function sellCooler(f: Fishing): { dollars: number; respect: number; line: string } {
  if (!f.cooler.length)
    return {
      dollars: 0,
      respect: 0,
      line: "Mama Dee — Cooler's empty, baby. Go sit on that pier.",
    };
  const dollars = f.cooler.reduce((a, c) => a + catchValue(c), 0);
  const trophies = f.cooler.filter((c) => c.trophy).length;
  const n = f.cooler.length;
  f.cooler = [];
  return {
    dollars,
    respect: n + trophies * 5,
    line: `Mama Dee — ${n} fish for the kitchen. $${dollars}${trophies ? ` and that trophy goes on the wall` : ""}.`,
  };
}

export function buyBait(
  f: Fishing,
  kind: "worm" | "shad",
  dollars: number,
): { dollars: number; line: string } {
  const cost = kind === "worm" ? 15 : 25;
  if (dollars < cost)
    return {
      dollars: 0,
      line: `Bait shop — ${kind === "worm" ? "Worms are" : "Cut shad is"} $${cost}. You short.`,
    };
  if (kind === "worm") f.worms += 3;
  else f.shad += 3;
  return {
    dollars: -cost,
    line:
      kind === "worm"
        ? `Bait shop — Three worms. Holding ${f.worms}.`
        : `Bait shop — Three cut shad. Cats love it after dark. Holding ${f.shad}.`,
  };
}

export type FishHud = {
  phase: Phase;
  prompt: string;
  power: number;
  tension: number;
  lineOut: number;
  fishName: string;
  stamina: number;
  cooler: number;
  coolerMax: number;
  bait: string;
  flash: { text: string; good: boolean } | null;
};

export function fishingHud(f: Fishing): FishHud {
  const prompt =
    f.phase === "casting"
      ? "E  Cast"
      : f.phase === "flying"
        ? ""
        : f.phase === "wait"
          ? f.nibbling > 0
            ? "Something's nosing it…"
            : "Line's out. Wait on the bite."
          : f.phase === "bite"
            ? "BITE — E to set the hook"
            : f.phase === "fight"
              ? "Hold to reel · let go when it runs"
              : "";
  return {
    phase: f.phase,
    prompt,
    power: f.power,
    tension: f.tension,
    lineOut: f.lineOut,
    fishName: f.fish?.species.name ?? "",
    stamina: f.fish?.stamina ?? 0,
    cooler: f.cooler.length,
    coolerMax: COOLER_MAX,
    bait: baitLabel(f),
    flash: f.flash ? { text: f.flash.text, good: f.flash.good } : null,
  };
}
