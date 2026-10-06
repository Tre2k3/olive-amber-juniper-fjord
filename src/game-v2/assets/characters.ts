/**
 * Runtime character registry for the production rebuild.
 * Every path is a transparent cutout under public/game-v2/characters/.
 * Named cast is cut from the Character Bible photographs
 * (SackReligious_Character_Bible_AI_Reference_Pack). Not the old
 * illustrated public/game people.
 *
 * Foot padding and visible bounds come from scripts/analyze-character-alpha.py.
 * They are not guessed.
 *
 * Direction contract, stable camera, keyboard and arrows identical:
 * A / Left moves screen-left and shows left.
 * D / Right moves screen-right and shows right.
 * W / Up moves away from the camera and shows back.
 * S / Down moves toward the camera and shows front.
 *
 * Walk art is PARTIAL. Front has standing + one stride frame.
 * Back, left, and right are standing frames only.
 */
import { characterBounds, type AlphaBounds } from "./character-bounds";

export type Facing = "front" | "back" | "left" | "right";

export type Cutout = AlphaBounds & {
  src: string;
  /** Measured transparent rows under the sole. */
  footPad: number;
};

export type CharacterAsset = {
  id: string;
  height: number;
  views: { front: Cutout; walk?: Cutout } & Partial<Record<Facing, Cutout>>;
  portrait?: string;
  /** Production-pack file this runtime art was cut from, when one exists. */
  bible?: string;
};

const cut = (src: string): Cutout => {
  const bounds = characterBounds[src];
  if (!bounds) throw new Error(`No alpha bounds for ${src}`);
  return { src: `${src}?v=7`, footPad: bounds.bottomPadding, ...bounds };
};

const turnaround = (folder: string) => ({
  front: cut(`/game-v2/characters/${folder}/front.png`),
  back: cut(`/game-v2/characters/${folder}/back.png`),
  left: cut(`/game-v2/characters/${folder}/left.png`),
  right: cut(`/game-v2/characters/${folder}/right.png`),
});

export const characters = {
  benji: {
    id: "benji",
    height: 1.68,
    views: {
      ...turnaround("benji"),
      walk: cut("/game-v2/characters/benji/walk.png"),
    },
    bible: "01_Benji/00_Canonical_Identity/",
  },
  kBlanco: {
    id: "k-blanco",
    height: 1.94,
    views: turnaround("k-blanco"),
    portrait: "/game-v2/characters/k-blanco/portrait.png",
    bible: "02_Core_NPCs/01_K_Blanco_CANONICAL/k_blanco_CANONICAL_reference.png",
  },
  courtOg: {
    id: "court-og",
    height: 2.04,
    views: turnaround("court-og"),
    bible: "02_Core_NPCs/02_Court_OG/court_og_reference_sheet.png",
  },
  mamaDee: {
    id: "mama-dee",
    height: 1.84,
    views: turnaround("mama-dee"),
    bible: "02_Core_NPCs/03_Mama_Dee/mama_dee_reference_sheet.png",
  },
  uncJ: {
    id: "unc-j",
    height: 1.9,
    views: turnaround("unc-j"),
    bible: "02_Core_NPCs/04_Unc_J/unc_j_reference_sheet.png",
  },
  nitro: {
    id: "nitro",
    height: 1.86,
    views: turnaround("nitro"),
    bible: "02_Core_NPCs/05_Nitro/nitro_reference_sheet.png",
  },
  strike: {
    id: "strike",
    height: 1.8,
    views: turnaround("strike"),
    bible: "02_Core_NPCs/06_Strike/strike_reference_sheet.png",
  },
  pedestrian: {
    male01: { id: "ped-male-01", height: 1.78, views: { front: cut("/game-v2/characters/pedestrians/male-01.png"), walk: cut("/game-v2/characters/pedestrians/male-01-walk.png") } },
    female01: { id: "ped-female-01", height: 1.72, views: { front: cut("/game-v2/characters/pedestrians/female-01.png"), walk: cut("/game-v2/characters/pedestrians/female-01-walk.png") } },
    male02: { id: "ped-male-02", height: 1.7, views: { front: cut("/game-v2/characters/pedestrians/male-02.png"), walk: cut("/game-v2/characters/pedestrians/male-02-walk.png") } },
    female02: { id: "ped-female-02", height: 1.68, views: { front: cut("/game-v2/characters/pedestrians/female-02.png"), walk: cut("/game-v2/characters/pedestrians/female-02-walk.png") } },
    male03: { id: "ped-male-03", height: 1.8, views: { front: cut("/game-v2/characters/pedestrians/male-03.png"), walk: cut("/game-v2/characters/pedestrians/male-03-walk.png") } },
    female03: { id: "ped-female-03", height: 1.66, views: { front: cut("/game-v2/characters/pedestrians/female-03.png"), walk: cut("/game-v2/characters/pedestrians/female-03-walk.png") } },
    male04: { id: "ped-male-04", height: 1.76, views: { front: cut("/game-v2/characters/pedestrians/male-04.png"), walk: cut("/game-v2/characters/pedestrians/male-04-walk.png") } },
    female04: { id: "ped-female-04", height: 1.64, views: { front: cut("/game-v2/characters/pedestrians/female-04.png"), walk: cut("/game-v2/characters/pedestrians/female-04-walk.png") } },
  },
} as const satisfies Record<string, CharacterAsset | Record<string, CharacterAsset>>;

export type Spawnable = CharacterAsset;

export type FittedFrame = {
  w: number;
  h: number;
  src: string;
  footPad: number;
  pxH: number;
  pxW: number;
  centerPx: number;
};

/** Fit a frame in the standing-front body box. Sole stays at y=0. Width cannot exceed that box. */
export function frameSize(
  asset: { height: number; views: { front: Cutout; walk?: Cutout } & Partial<Record<Facing, Cutout>> },
  facing: Facing | "walk" = "front",
): FittedFrame {
  const front = asset.views.front;
  const view = (facing === "walk" ? asset.views.walk : asset.views[facing]) ?? front;
  const frontH = front.visibleBottom - front.visibleTop + 1;
  const frontW = front.visibleRight - front.visibleLeft + 1;
  const boxH = asset.height;
  const boxW = boxH * (frontW / frontH);
  const visH = view.visibleBottom - view.visibleTop + 1;
  const visW = view.visibleRight - view.visibleLeft + 1;
  let metersPerPixel = boxH / visH;
  if (visW * metersPerPixel > boxW) metersPerPixel = boxW / visW;
  const centerPx = (view.visibleLeft + view.visibleRight) / 2 - (view.pxWidth - 1) / 2;
  return {
    w: view.pxWidth * metersPerPixel,
    h: view.pxHeight * metersPerPixel,
    src: view.src,
    footPad: view.footPad,
    pxH: view.pxHeight,
    pxW: view.pxWidth,
    centerPx,
  };
}
