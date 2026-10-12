export type Facing = "front" | "back" | "left" | "right";

export type Place = "street" | "home" | "hq" | "court" | "haunt";

export type Solid = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Optional vertical limits for gallery guards and upstairs furnishings. */
  minY?: number;
  maxY?: number;
  cameraBlock?: boolean;
};

export type HudState = {
  place: Place;
  dollars: number;
  respect: number;
  mission: string;
  prompt: string;
  charge: number;
  night: boolean;
  golden: boolean;
  made: number;
  taken: number;
  activity?: "race" | "bowl" | "fish";
  veli?: { near: boolean; open: boolean; serving: number; order: string; price: number };
  foodCourt?: { open: "brothers" | "catch901" | null; serving: "brothers" | "catch901" | null; left: number; order: string; near: boolean; activeBrother: number; nextBrother: number };
  veliTv?: { near: boolean; playing: boolean; muted: boolean; ready: boolean; error: string };
  basketball?: { mode: "half" | "full"; score: number[]; clock: number; feedback: string; phase: string };
  basketballCamera?: "behind" | "sideline" | "baseline";
  dialogue: string;
  carrying: boolean;
  x: number;
  z: number;
  fit: string;
  bait: number;
  boost: boolean;
  log: boolean;
  marks: { fish: boolean; bowl: boolean; food: boolean; race: boolean };
  bestBowl: number;
  bestRace: number;
};

export type V2Public = {
  x: number;
  y: number;
  z: number;
  facing: Facing;
  place: Place;
  cars: { x: number; z: number; yaw: number; speed: number }[];
  dollars: number;
  respect: number;
  mission: string;
  carrying: boolean;
  dialogue: string;
  /** Standing view, or `${facing}-walk` while a stride sheet is showing. */
  pose: string;
};

