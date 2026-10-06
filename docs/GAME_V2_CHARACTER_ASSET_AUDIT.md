# game-v2 character asset audit

The previous game-v2 people were illustrated redraws. They are not the Character Bible.
Every person rendered by `src/game-v2` now comes from `public/game-v2/characters/`, and those files are cut from the bible photographs (or, for pedestrians, new photographs in that same production style).

Legacy files under `public/game/people/` and `public/game/benji*` are not loaded.

Direction contract: A = screen-left, D = screen-right, W = back, S = front.
`benji_three_quarter_CANONICAL.png` faces screen-left, so it is the A pose.
`benji_left_CANONICAL.png` faces screen-right, so it is the D pose.

The bible does not include walk-cycle sheets. Benji uses the four canonical direction photos with a grounded bob. He does not use `/game/benji/walk-*.webp`.

Pedestrians are not in the bible zip. `CHARACTER_BIBLE_FOR_AI.txt` says the support cast must be created separately and must not reuse Benji or the named cast. The eight block pedestrians are new full-body photographs in that studio style. They are not recolors, wardrobe edits, or redraws of the old cutouts.

| Name | Previous runtime file | Status before | Character Bible / production source | Action |
|---|---|---|---|---|
| Benji front | `/game-v2/characters/benji/front.png` (illustrated redraw) | LEGACY VISUAL | `01_Benji/00_Canonical_Identity/benji_front_smile_CANONICAL.png` | REPLACE with the canonical photo cutout |
| Benji back | `/game-v2/characters/benji/back.png` (illustrated redraw) | LEGACY VISUAL | `01_Benji/00_Canonical_Identity/benji_back_CANONICAL.png` | REPLACE |
| Benji left (A) | `/game-v2/characters/benji/left.png` (illustrated redraw) | LEGACY VISUAL | `01_Benji/00_Canonical_Identity/benji_three_quarter_CANONICAL.png` | REPLACE |
| Benji right (D) | `/game-v2/characters/benji/right.png` (illustrated redraw) | LEGACY VISUAL | `01_Benji/00_Canonical_Identity/benji_left_CANONICAL.png` | REPLACE |
| K Blanco | `/game-v2/characters/k-blanco/front.png` (illustrated redraw) | LEGACY VISUAL | `02_Core_NPCs/01_K_Blanco_CANONICAL/k_blanco_CANONICAL_reference.png` | REPLACE front/back/left/right/portrait from that sheet |
| Court OG | `/game-v2/characters/court-og/front.png` (illustrated redraw) | LEGACY VISUAL | `02_Core_NPCs/02_Court_OG/court_og_reference_sheet.png` | REPLACE four views from that sheet |
| Mama Dee | `/game-v2/characters/mama-dee/front.png` (illustrated redraw) | LEGACY VISUAL | `02_Core_NPCs/03_Mama_Dee/mama_dee_reference_sheet.png` | REPLACE four views from that sheet |
| Unc J | `/game-v2/characters/unc-j/front.png` (illustrated redraw) | LEGACY VISUAL | `02_Core_NPCs/04_Unc_J/unc_j_reference_sheet.png` | REPLACE four views from that sheet |
| Nitro | `/game-v2/characters/nitro/front.png` (illustrated redraw) | LEGACY VISUAL | `02_Core_NPCs/05_Nitro/nitro_reference_sheet.png` | REPLACE four views from that sheet |
| Strike | `/game-v2/characters/strike/front.png` (illustrated redraw) | LEGACY VISUAL | `02_Core_NPCs/06_Strike/strike_reference_sheet.png` | REPLACE four views from that sheet |
| ped male-01 | `/game-v2/characters/pedestrians/male-01.png` (illustrated) | LEGACY VISUAL | no pedestrian sheet in the bible; new adult streetwear photo | REPLACE |
| ped female-01 | `pedestrians/female-01.png` (illustrated) | LEGACY VISUAL | new adult streetwear photo | REPLACE |
| ped male-02 | `pedestrians/male-02.png` (illustrated) | LEGACY VISUAL | new young-adult photo | REPLACE |
| ped female-02 | `pedestrians/female-02.png` (illustrated) | LEGACY VISUAL | new young-adult photo | REPLACE |
| ped male-03 | `pedestrians/male-03.png` (illustrated) | LEGACY VISUAL | new older-man photo | REPLACE |
| ped female-03 | `pedestrians/female-03.png` (illustrated) | LEGACY VISUAL | new older-woman photo | REPLACE |
| ped male-04 | `pedestrians/male-04.png` (illustrated) | LEGACY VISUAL | new shop-customer photo | REPLACE |
| ped female-04 | `pedestrians/female-04.png` (illustrated) | LEGACY VISUAL | new basketball-spectator photo | REPLACE |

Runtime registry: `src/game-v2/assets/characters.ts`.
NPC ids, dialogue, routes, and interaction radii are unchanged. Only the rendered people changed.
