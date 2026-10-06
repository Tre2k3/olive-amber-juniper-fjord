# $ACKRELIGIOUS: MEMPHIS — current game state

Audit date: 2026-10-06. This describes the **running game-v2 slice** in this workspace, not the older commit currently on GitHub (`e419412`). No features were added for this audit.

Live route: `src/routes/index.tsx` lazy-loads `src/game-v2/GameV2.tsx`. Legacy `src/game/` is not the live route.

Status words: **DONE**, **PARTIAL**, **PLACEHOLDER**, **BROKEN**, **NOT STARTED**.

## PLAYER

| System | Status | Why |
|---|---|---|
| WASD | DONE | Direct screen movement in `src/game-v2/runtime.ts`. A and D move left and right. W moves away. S moves toward the camera. |
| Arrow keys | DONE | `ArrowUp/Down/Left/Right` mapped to the same axes as WASD. |
| Walking | PARTIAL | Moves and eases at 6.4 m/s. Front stride swaps inside the standing box. Back and sides stay on the standing frame, with no hop. |
| Running | DONE | Shift uses 10.2 m/s. Night fit multiplies by 1.12. Fed boost multiplies by 1.22. Race overrides speed. |
| Directional facing | DONE | Facing follows the movement vector. The card still faces the camera. |
| Grounding | DONE | Sole plane and `walkableSurfaceAt()`. Foot contact is measured from the cutout alpha. No camera ground nudge. |
| Collision | PARTIAL | Building AABBs only (`resolve()`, radius 0.34, 3 passes). No world bounds. NPCs are not solid. Cars push Benji out. |
| Camera | PARTIAL | Yaw stays put so left remains screen-left. Street camera is a little farther and lower. Bowling still uses a locked lane camera. |
| Outfit system | PLACEHOLDER | Four fits (`default`, `court`, `river`, `night`) are numeric perks only. Benji's pictures do not change. Wardrobe is an E prompt inside the home. |

## NPC

| System | Status | Why |
|---|---|---|
| Canonical named NPCs | PARTIAL | K Blanco, Court OG, Mama Dee, Unc J, Nitro, Strike use Character Bible cutouts (front/back/left/right). They are cards, not acted characters. |
| Ambient pedestrians | PARTIAL | Eight illustrated variants. Walkers swap a stride sheet inside the standing box. Idle people stay on the standing frame. No photo-humans in game-v2. |
| Walking | PARTIAL | A few sidewalk routes ease speed, brake into a stop, pause ~1.1–2.2s, then reverse. Most named people stand. |
| Directional facing | PARTIAL | Named cast pick a view from heading vs camera. Front-only pedestrians yaw the card toward their heading, clamped so they do not go edge-on. Partners face each other. |
| Grounding | PARTIAL | Same sole/ground system as Benji. |
| Interactions | PARTIAL | E near Mama, Unc, Nitro, Strike, Court OG, K Blanco shows one line. No conversation tree. |
| Schedules/routes | PLACEHOLDER | Ping-pong polylines and idle pairs. No clock, no jobs, no day schedule. |

## WORLD

| System | Status | Why |
|---|---|---|
| Benji home | PARTIAL | Hero bungalow at x=-32 (number 2416): brick skirt, lap siding, pitched roof, ridge, eaves, fascia, soffit, gutters, chimney, porch, rails at 0.98 m, door about 2.05 m. Still built from modular boxes, not the concept board. |
| Neighborhood | PARTIAL | Six bungalows with three structural styles (roof rise, porch roof, brick wrap, shutters, driveway, fence). Yards have mulch, shrubs, flowers, and side-yard trees. Not concept density. |
| Streets | PARTIAL | Avenue asphalt is 8.2 m wide (z -4.1 to 4.1). Lane centers are z = ±1.85. Sidewalks stay at z = ±6.35, walk height 0.17 m, about 2.35 m deep. Parkway sits between the curb and the walk. Live code is `src/game-v2`. `src/game` is the legacy donor. |
| HQ exterior | PARTIAL | Black/gold boutique massing at x=24, z=-16.4. Playable door. Not a match for the reference boards. |
| HQ interior | PARTIAL | Separate room offset to z≈200. K Blanco stands inside. Showroom is a furnished box, not the reference interior. |
| 901 Court | PARTIAL | Painted court, two goals, fence, lights, OG, ball. Custom-looking but still simple. |
| Downtown | NOT STARTED | No district. A few skyline boxes sit at z≈-46. You cannot enter a downtown. |
| Riverfront | PARTIAL | Pier, water, bait shop, cast/hook minigame. Not a full river district. |
| Bowling | PARTIAL | 901 Bowl building, four lane strips, pins as boxes. E locks Benji into one lane and a first-person roll. Not a real alley. |
| Racing | PARTIAL | Night strip. E teleports to the start and you sprint east on foot. No cars driven. |
| Food trucks | PARTIAL | Truck row and a paid menu of three items. No sit-down, no visuals per item. |
| Park | NOT STARTED | No park. |
| Haunted House | PARTIAL | Exterior at x=-78 plus an interior room graph (foyer through final court) using photo plates. Ticket is $10. A goal exists in the last room. It is a side attraction, not a finished haunt. |
| 901 Day | NOT STARTED | No seasonal calendar or festival state. |

## VEHICLES

| System | Status | Why |
|---|---|---|
| Traffic | PARTIAL | Several card-vehicles loop two lanes at a fixed 7 m/s. |
| Lane following | DONE | `sampleLane()` keeps them on the avenue loop and the cross loop. |
| Intersections | PLACEHOLDER | Cross-street cars pause if an avenue car is within 6 m of (8, 0). No signals, no real junction graph. |
| Collision | PARTIAL | Player is pushed out of a car radius. Cars do not hit each other, NPCs, or buildings. |
| Benji vehicle | PLACEHOLDER | A green coupe is parked in the driveway. It is scenery. |
| Entering / driving | NOT STARTED | No drive state, no enter prompt. |

## ACTIVITIES

| System | Status | Why |
|---|---|---|
| Basketball | PARTIAL | See Basketball audit below. |
| Fishing | PARTIAL | Cast, wait, bite window, E to hook. Bait shop sells 3 for $15. Miss if you wait too long. |
| Bowling | PARTIAL | Aim with A/D, hold Space for power, ball moves down the center lane, pins scored by formula. First-person camera. Result line expires. Not a full alley sim. |
| Racing | PARTIAL | On-foot sprint to x>-19.5. Timer. Night fit gets more time and pay. |
| Shopping | PLACEHOLDER | Bait purchase and food purchase only. No SackReligious apparel shop, no inventory. |
| Food | PARTIAL | Three menu items, cash, a 12s speed boost, a fed flag. |
| Wardrobe | PLACEHOLDER | Cycles a perk name. No visual change. |

## GAME SYSTEMS

| System | Status | Why |
|---|---|---|
| Missions | PARTIAL | One delivery (K → Court OG) then a four-item checklist (fish, bowl, eat, race). No chapters. |
| Dialogue | PARTIAL | Single lines, 2.6–5.5s, then they clear. No choices. Bowl result no longer sticks on the street. |
| SackDollars | DONE | HUD counter. Starts at 240. Earned and spent. Saved. |
| Respect | DONE | HUD counter. Starts at 12. Saved. |
| Inventory | NOT STARTED | A boolean "carrying the drop" and a bait count. No item list. |
| Save | PARTIAL | `localStorage` key `sack-v2`. See Save audit. |
| Load | PARTIAL | Same blob on boot. Position and time of day are not restored. |
| Seasonal state | NOT STARTED | Haunt is always in the world. |
| Day / night | PARTIAL | N cycles day → golden → night → day. Lights and fog change. Not a clock. |

## UI

| System | Status | Why |
|---|---|---|
| HUD | DONE | SackDollars, Respect, place, time-of-day chip, mission line, activity marks. |
| Minimap | PLACEHOLDER | A schematic SVG, not the real street layout. |
| Objectives | PARTIAL | One mission string. |
| Dialogue | PARTIAL | Bottom card plus portrait. Expires. |
| Interaction prompts | DONE | Context E prompts. |
| Mobile controls | PARTIAL | Stick plus N / E / SHOT under `sm:hidden`. Not tuned on a device in this audit beyond a 390×844 screenshot. |
| Menus | PLACEHOLDER | M opens a block card (fit, bait, bests). No pause, settings, inventory, or save UI. |

---

## 7. Character renderer

People are **not** `THREE.Sprite`. Each person is a `THREE.Group` with a `THREE.Mesh` named `sprite` using `PlaneGeometry` (`solePlane` in `src/game-v2/world/feet.ts`).

- **Pivot:** geometry is translated so the local origin is the visible sole, not the PNG center. `footPad` is transparent rows under the shoe. Current cutouts use `footPad` 0 or 1.
- **Foot position:** `plantFeet()` sets the group Y to `standHeight(x,z) + GROUND_EPSILON` (0.03) minus parent Y.
- **Ground sampling:** `groundHeightAt` returns the highest registered pad under the point, else 0. `standHeight` also samples ±0.18 m so a curb edge does not drop the sole.
- **Alpha:** PNGs are pre-cut. Runtime does not chroma-key. `solidCutout()` disables mipmaps and uses linear filters. Material is `MeshBasicMaterial`, `transparent: true`, `alphaTest: 0.02`, depth write on, polygon offset -4, render order 6. The black comic outline is the drawn stroke, not a runtime halo.
- **Scale:** `presentScale()` returns 1. Height is the asset's meter height. Width is `height * pxW/pxH`. A stride swaps the texture only. The mesh stays the standing size for that facing, so the body box does not pop.
- **Shadow:** a flat dark ellipse on the group (`shadow` mesh). Characters also cast a shadow from the card.
- **Facing:** named cast with back/left/right textures pick a view from the angle between `userData.heading` and the camera, then billboard the plane at the camera. Front-only pedestrians yaw the plane toward their heading, clamped to 1.25 rad off the camera.
- **Walk:** Benji's front sheet and each pedestrian's front sheet alternate with the standing frame on distance (`travel / 1.9` for Benji, route phase for pedestrians). Back, left, and right have no stride sheet, so those views stay still. `rock()` forces `rotation.z` to 0. There is no hop and no scale pop.
- **Files:** `src/game-v2/world/feet.ts`, `src/game-v2/world/ground.ts`, `src/game-v2/assets/characters.ts`, `src/game-v2/runtime.ts` (`applyBenji`, `applyCard`, `updatePeds`, `faceCompany`), `src/game-v2/world/slice.ts` (`actor`, `spawn`). Legacy `src/game/` is donor code and is not this renderer.

Why someone can still look wrong:

- **Sink:** a pad missing under that surface, or a porch rail drawn in front of the legs.
- **Float:** a ground pad higher than the visual mesh. `seatOnGround` only zeros the card's local position. It does not nudge the camera.
- **Transparent:** a hole left in the source PNG. `alphaTest` is 0.02, so it no longer punches out dark cloth.
- **Over-cropped:** the source PNG was cropped that way. Runtime does not crop further.
- **Jagged outline:** the ink stroke is one pixel of feather. Thickening it smears the drawing.
- **No full turnaround cycle:** back, left, and right still have no stride sheet. Walking away or sideways keeps the standing card.

## 8. Input and movement

All motion uses `dt` capped at 0.033 s (`step()`). It is frame-rate independent within that cap. A stall longer than 33 ms drops time instead of tunneling.

Diagonal input is normalized: the wish velocity is divided by `hypot(sx, sy)`.

| Value | Number | Where |
|---|---|---|
| Walk speed | 6.4 m/s | `runtime.ts` `walkSpeed` |
| Sprint speed | 10.2 m/s | `sprintSpeed`, ShiftLeft/ShiftRight |
| Race speed | 9.4 m/s, or 11.4 if night fit | `city.race` branch |
| Night-fit multiplier | ×1.12 | when not racing |
| Food boost | ×1.22 for 12 s | `city.boost` |
| Accel blend | `1 - exp(-7.5 * dt)` toward wish | while input held |
| Decel blend | `1 - exp(-9 * dt)` toward 0 | when input released |
| Stop snap | velocity cleared under 0.06 m/s | |
| "Moving" threshold | horizontal speed > 0.32 m/s | gates the stride |
| Pedestrian cruise | about 0.8–1.15 m/s per route | `slice.ts` / `districts.ts` |
| Pedestrian brake | want speed scales down inside 1.4 m of the waypoint | `updatePeds` |
| Pedestrian step length | 0.78 m | phase += step/0.78 |

Mappings:

- W / ArrowUp: camera forward
- S / ArrowDown: camera back
- A / ArrowLeft: camera left
- D / ArrowRight: camera right
- Shift: sprint
- E: interact (edge triggered)
- Space: charge / shoot / bowl power
- N: day → golden → night
- M: block card
- Mobile stick: `touchX` / `touchY` added to the same axes (`Hud.tsx`)
- Mobile buttons: N, E, SHOT (pointer down/up = Space)

## 9. World and collision

- **Walkable surfaces:** anything not blocked by a solid. Open ground height is 0. Raised pads are registered with `addGround()` (sidewalks, porches, interiors, lanes).
- **Building collision:** axis-aligned boxes, push out on the smallest overlap, 3 iterations. Player radius 0.34.
- **NPC collision:** none. Benji walks through people.
- **Vehicle collision:** if the player is inside a car's userData radius, they are pushed out. Cars do not stop.
- **Road / sidewalk boundaries:** none. You can walk into the road, off the map, and through the skyline.
- **Door triggers:** distance checks, not volumes. Home, HQ, haunt gate, bowl, pier, bait, race, trucks, wardrobe, NPCs.
- **Interior transitions:** `place` becomes `home`, `hq`, or `haunt` and the player is teleported into a copy of the room that sits at a large Z offset (home/HQ ~200, haunt ~500). Street collision is not used inside.

Known bad space:

- No outer bounds. Benji can leave the block and fall off the content.
- Interiors can stick him if a solid resolves poorly in a doorway (narrow haunt halls).
- Car push plus building resolve can shove him through a curb or into a wall for a frame.
- NPCs and the parked coupe do not block, so he occupies the same space as people and the driveway car.
- Street camera does not avoid walls. He can stand where a house fills the view.

## 10. Basketball

Code: `updateBall()` in `src/game-v2/runtime.ts`. Court place is the rectangle x 55.2–76.8, z -28.9–-15.1.

| Piece | Status | Behavior |
|---|---|---|
| Ball object | DONE | Separate mesh. |
| Pickup | PARTIAL | E within 1.6 m while the ball is loose. |
| Possession | DONE | Ball sticks to (player.x, 1.05, player.z). |
| Tap shot | PARTIAL | A very short press that never exceeds charge 0.02 is ignored. |
| Hold / release | DONE | Charge rises at `dt/0.85`, caps at 1. Release fires. |
| Max-charge release | DONE | Power uses the capped charge. |
| Trajectory | PLACEHOLDER | Always aimed at `world.hoop` (the west goal), not where Benji faces. Gravity 12. |
| Rim collision | PLACEHOLDER | A downward pass through a 0.42 m cylinder at rim height counts as a make. The ball does not touch a rim mesh. |
| Backboard | PARTIAL | X-plane bounce if the ball is inside the board's YZ rect and moving into `board.nx`. |
| Make | PARTIAL | +1 made, +5 Respect, +$25, ball snaps back into the hands. No swish. |
| Miss | PARTIAL | Ball falls if it misses the cylinder. |
| Bounce | PARTIAL | Below y=0.16, vertical speed flips at -0.45 and horizontal at 0.7, until the bounce is small. |
| Rebound | NOT STARTED | No rebound actor. Make auto-returns the ball. A miss sits until E. |
| Reset | NOT STARTED | No reset button. Leaving the court freezes the sim (`place !== "court"` returns immediately). |
| Leave / re-enter | PARTIAL | Physics pause off the court and resume on re-entry. The ball stays where it was. |

Court fit adds a 1.4 m/s nudge toward the hoop. It does not change Benji's clothes.

## 11. Save and mission

Saved in `localStorage["sack-v2"]` every ~0.12 s:

- dollars, respect, carrying, delivered, mission
- bait, fit, fed, fished, bowled, raced, bestBowl, bestRace
- hauntTicket, hauntCleared

Not saved:

- position, facing, place
- day / golden / night
- active fish, bowl, or race
- dialogue (removed on purpose; a stuck "901 Bowl" line was being restored)
- ball position
- any season

Story that actually exists, from a new game:

1. Mission: "Walk the block to SackReligious HQ".
2. Enter HQ. Mission becomes "Talk to K Blanco" if you have not met her.
3. E on K: you carry the drop. Mission: deliver it to Court OG outside 901.
4. E on Court OG while carrying: +$80, +10 Respect. Mission becomes the next unfinished block task.
5. Block tasks, in order: fish the river, roll at 901 Bowl, eat at the trucks, beat Nitro on the strip.
6. When all four are done: "Memphis is yours. The block stays open."
7. Haunt ticket and the final room are optional and do not gate that line.

There is no further chapter.

## 12. Code tree

Full file list: `docs/GAME_V2_TREE.txt`.

| Concern | Files |
|---|---|
| Runtime / loop | `src/game-v2/runtime.ts`, `src/game-v2/GameV2.tsx` |
| Rendering / characters | `runtime.ts` (`applyBenji`, `applyCard`), `world/feet.ts`, `assets/characters.ts` |
| Input / movement | `runtime.ts` `step()`, `onKey`, `ui/Hud.tsx` stick |
| World | `world/slice.ts`, `world/districts.ts`, `world/haunt.ts`, `world/ground.ts` |
| Roads / traffic | `roads/lanes.ts`, `runtime.ts` `updateTraffic` |
| Vehicles | `world/kits/vehicles.ts` |
| Camera / collision | `runtime.ts` `placeCamera`, `resolve`, `pullCamera` |
| HQ | `world/slice.ts` HQ exterior + `buildHqInterior` |
| Court | `world/slice.ts` court block, `world/kits/hoop.ts` |
| Activities | `play/city.ts`, `runtime.ts` `updateBall`, `presentBowl` |
| UI | `ui/Hud.tsx` |
| Save | `runtime.ts` `SAVE_KEY` block |
| Unused facade kit | `world/kits/art.ts` (`mountStreetKit` is never called) |

## 14. Performance

Measured in headless Chromium with SwiftShader (software WebGL). This machine has no GPU. The numbers are not a laptop or phone framerate. The live preview is playable in a normal browser; this host stalls.

| Viewport | Result |
|---|---|
| 1280×720, just after the game API exists | about 6 fps average over 2s. Worst frame gap about 2400 ms. |
| 1920×1080, after an 8s wait | frame loop did not sustain. Worst gap about 4.5s. Average not meaningful. |
| 390×844 | about 3 fps average. Worst frame gap about 767 ms. |
| Time until `window.__SACK_V2__` | about 1.4s desktop, about 1.2s at the phone size. |

Largest runtime art: `public/game-v2` is 54 MB. Pedestrian PNGs are about 15 MB. The unused facade kit is about 21 MB. Vehicles about 5.4 MB. No separate memory sampler was available.

Console on load: no page errors, no HTTP 404s, no failed textures reported as network failures. One warning: `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.`

A `page.reload` in the audit browser did not reach `domcontentloaded` within 20s. Save-after-reload was not rechecked in the browser this run. The write path is still the `localStorage` block in `runtime.ts`.

Stutter: the software renderer hitches for seconds. On a real GPU that hitch is not proven. It is still a risk because shadows, many transparent cards, and per-frame resize are all on.

## 13. Build and lint

Commands run this audit, against the workspace that contains the unpushed game:

- `npx tsc --noEmit` — **pass** (exit 0). Log: `docs/audit/audit-tsc.txt`.
- `npm run build` — **pass** (exit 0, Vite/Nitro build about 13 s). Log: `docs/audit/audit-build.txt`. Migrate skipped because `DATABASE_URL` is unset. The game does not need that database.
- `npm run lint` — **fail** (exit 1). 10 errors, 16 warnings. Log: `docs/audit/audit-lint.txt`.
  - `src/game-v2/runtime.ts`: `useSpot` is a game function. ESLint treats it as a React hook. It is not a runtime bug. Seven errors.
  - `src/game/trafficMotion.ts`: `prefer-const` (legacy game, not the live route).
  - `src/lib/app-data/client.server.ts`: empty block.
  - Warnings include unused locals in `slice.ts` / `haunt.ts` and a constant hook dependency in `GameV2.tsx` (the `[5]` is intentional so the canvas loop remounts).

Browser console, 404s, and FPS are filled from the capture report when that run finishes. See `artifacts/audit/capture-report.json` after the capture, copied into the audit zip.

## 16. Completion estimate

These are judgments against a production game that matches the reference packs. Placeholder geometry is not counted as done.

| Category | % | Evidence |
|---|---|---|
| Core gameplay | 50 | Move, collide with buildings, interact, camera. No driving. Activities are toys. |
| World | 30 | One block plus shells for bowl, river, trucks, strip, haunt. No downtown, no park. Facade kit not mounted. |
| Characters | 55 | Bible cutouts are in. Motion, alpha, and integration are still prototype. |
| Vehicles | 25 | Looping cards and a parked coupe. No driving. One fake intersection yield. |
| Activities | 40 | Ball, fish, bowl, foot-race, food, and perk wardrobe all start and pay. None are deep. |
| Missions | 20 | One delivery and a four-line checklist. |
| UI | 40 | HUD works. Minimap is a sketch. No real menus. |
| Save / persistence | 45 | Money, flags, and mission survive. Position, time of day, and in-progress activities do not. |
| Mobile | 35 | Controls exist in the DOM. Not device-verified beyond a 390×844 frame. |
| Visual quality | 25 | Illustrated people on a lightweight 3D block. Does not yet look like the production boards. |
| Performance | 35 | Playable in a normal browser. Software WebGL on the audit host drops to single-digit fps and stalls at 1920×1080. Unbudgeted shadows and card overdraw. |
| **Overall** | **35** | Playable vertical slice. Not a production city. |
