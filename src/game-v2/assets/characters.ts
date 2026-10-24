/**
 * Runtime character registry for the production rebuild.
 * Every path is a transparent cutout under public/game-v2/characters/.
 * Named cast and pedestrians use the user-approved illustrated Claude atlases.
 * Never substitute photo-human or generic legacy character art.

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
 * Walk art is PARTIAL. Only pedestrians have an approved front stride.
 * Benji and named cast have standing turnarounds only. Those views
 * translate. They do not bob, hop, or scale.
 * Pose geometry retains one pixels-to-world scale and a measured sole anchor.
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
  return { src: `${src}?v=12`, footPad: bounds.bottomPadding, ...bounds };
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
    },
    bible: "01_Benji/00_Canonical_Identity/",
  },
  kBlanco: {
    id: "k-blanco",
    height: 1.94,
    views: turnaround("k-blanco"),
    portrait: "/game-v2/characters/k-blanco/front.png",
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
    male01: { id: "ped-green-jacket-man", height: 1.78, views: { ...turnaround("pedestrians/green_jacket_man"), walk: cut("/game-v2/characters/pedestrians/green_jacket_man/walk.png") } },
    female01: { id: "ped-orange-woman", height: 1.72, views: { ...turnaround("pedestrians/orange_woman"), walk: cut("/game-v2/characters/pedestrians/orange_woman/walk.png") } },
    male02: { id: "ped-blue-hoodie-boy", height: 1.62, views: { ...turnaround("pedestrians/blue_hoodie_boy"), walk: cut("/game-v2/characters/pedestrians/blue_hoodie_boy/walk.png") } },
    female02: { id: "ped-denim-girl", height: 1.68, views: { ...turnaround("pedestrians/denim_girl"), walk: cut("/game-v2/characters/pedestrians/denim_girl/walk.png") } },
    male03: { id: "ped-black-hoodie-man", height: 1.79, views: { ...turnaround("pedestrians/black_hoodie_man"), walk: cut("/game-v2/characters/pedestrians/black_hoodie_man/walk.png") } },
    female03: { id: "ped-pink-jacket-girl", height: 1.64, views: { ...turnaround("pedestrians/pink_jacket_girl"), walk: cut("/game-v2/characters/pedestrians/pink_jacket_girl/walk.png") } },
    male04: { id: "ped-bucket-hat-oldman", height: 1.71, views: { ...turnaround("pedestrians/bucket_hat_oldman"), walk: cut("/game-v2/characters/pedestrians/bucket_hat_oldman/walk.png") } },
    female04: { id: "ped-purple-tracksuit-kid", height: 1.55, views: { ...turnaround("pedestrians/purple_tracksuit_kid"), walk: cut("/game-v2/characters/pedestrians/purple_tracksuit_kid/walk.png") } },
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

/** One scale per identity. Approved frames share a canvas and sole baseline.
 * Never shrink a wide stride/side pose to fit the front silhouette.
 */
export function frameSize(
  asset: { height: number; views: { front: Cutout; walk?: Cutout } & Partial<Record<Facing, Cutout>> },
  facing: Facing | "walk" = "front",
): FittedFrame {
  const front = asset.views.front;
  const view = (facing === "walk" ? asset.views.walk : asset.views[facing]) ?? front;
  const frontH = front.visibleBottom - front.visibleTop + 1;
  const metersPerPixel = asset.height / frontH;
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
