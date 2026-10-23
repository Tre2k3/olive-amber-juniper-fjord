# Claude working state — feat/production-hq-world-pass

Running account for Claude passes on the real working branch (PR #2, head 8d29c60 on 2026-10-22). Read before continuing. The earlier `feat/claude-activities-rebuild` branch was built on `main` by mistake and is retired; only its pure modules were ported.

## Established
- Working branch: `feat/production-hq-world-pass`. Keep PR #2 draft; never merge to main or deploy. Canonical art, vehicles, source ZIPs and logos are byte-for-byte protected. QA hooks need `?qa=1`.
- Branch already has: 2v2 AI match (`core/basketball-match.ts`, score = downward crossing within 0.19 m of rim centre, no rim/board collision), full outfits (`kits/court-uniforms.ts`), 3D haunt navigation (`core/haunt-navigation.ts`), racing, bowling, food court (Brotherz + 901 Catch Kitchen at (78, 22.4)), Veli's truck, a proper rod/reel/sagging-line rig and side fishing camera. No v2 audio.
- This host renders at ~0.5 fps under SwiftShader: use `__SACK_V2_INPUT__.simulate(seconds)` for timing QA.

## Done 2026-10-22 (this pass)
- `src/game-v2/play/fishing.ts` (pure, node-tested): E arms the cast meter, E releases → lure arc → splash → wait with nibbles (moving reels in) → bite window → tension fight (hold = reel; rise capped at 1.5/s) → land / snap / thrown hook. 9 river species, bait and night odds, gar only on shad or after dark. Cooler (6) sells at **901 Catch Kitchen** (E there sells before it opens the menu). Worms $15 (E) / cut shad $25 (Shift+E) at the bait shop. Save: worms (legacy `bait`), shad, cooler, records, totalCaught.
- `src/game-v2/audio.ts`: zero-asset synth (34 SFX + street/haunt beds), unlock on first key/pointer, X mutes, suspends on tab hide. Only fishing events are wired so far.
- `runtime.ts`: `pollInput()` + `simulate()`; renders gated by `renderOff`. `api.fishing` summary. `Hud.tsx`: FishPanel + cooler chip.
- Verified: typecheck clean, eslint 0 errors (no new warnings), `npm run build` passes, `STAGE=fish node scripts/activities-qa.mjs` passes in Chromium with zero page errors; screenshot `artifacts/activities/10-fishing-fight-tension.png`.

## Done 2026-10-22 (pass 2 — iron)
- `core/basketball.ts`: `rimContact` (torus 0.33/0.052 vs ball 0.16, descending only, trajectory-aware: a ball whose projected crossing lands inside the 0.19 m `SCORE_APERTURE` is never touched, so their scoring is unchanged; everything else clangs/rattles) and `backboardContact` (bounded plane, crossing test, replaces the 0.28 m x-band hack). Shared by the free-shoot path and `tickCourtMatch` (new optional `boards` arg; `match.touchedRim`/`match.contact`). Court audio wired: release, rim, backboard, swish vs net, bounce.
- Their `runtime-core-test.mjs` passes (23 PASS incl. AI games reaching 21) plus new contact assertions. Browser (`scripts/iron-qa.mjs`): 7/7 shots fire, 4/4 perfect-timing makes, 0 errors. Pre-existing, not touched: a very late (0.95) release can bank in off the board — identical on the original code.

## Done 2026-10-22 (pass 3 — racing rival)
- `play/racing.ts`: Nitro now has a lane, a speed model (lifts for turns, gentle rubber-band ±2 m/s beyond 24 m gaps), and intent: pulls out of your lane to pass or tucks in when close; otherwise drives the racing line (inside lane through both turns). Human lane tracked from the track normal. **Drafting** (2–9 m behind in his lane at speed: +3.2 m/s² to a 27.5 cap) and **contact** (side-by-side within 1.55 m: shove apart along the normal, both cars scrub speed, 0.6 s cooldown). `race.position`, `race.feedback`, `race.events` (contact/overtake/overtaken/draft/lap/finish) → audio + the race HUD line shows 1st/2nd/DRAFT/CONTACT. `rivalPose()` places the car in the lane.
- Verified: core suite 24 PASS (new rival test: laps alone, changes lanes, contact scrubs + shoves, draft registers, full race ends). Browser: race starts from meetStart, HUD cue renders, no errors. Not verified: the human car driving through QA hooks in my script (stick/W didn't throttle in the sim) — use `scripts/vendor-race-visual-smoke.mjs`.

## Done 2026-10-23 (pass 4 — rendering quality, no assets)
- `core/render-quality.ts`: MSAA composer target (4× desktop / 2× coarse pointer; the renderer's own AA was discarded by bloom's targets), procedural gradient-sky environment maps per mode (day/golden/night/interior) with `scene.environmentIntensity`, sun shadow box that follows the player snapped to texels (±34 m, 4K map desktop / 2K mobile, normalBias 0.02), and a ShaderPass film grade (vignette, saturation, contrast, night/golden tint) placed before OutputPass. `applyNight` stores `sun.userData.dir`; `followShadows` runs each frame before render.
- Measured on the same 2v2 view: hard-edge fraction 0.0289 → 0.0243 (smoother edges), backboard/building pick up sky specular. Honest size of the change: polish, not transformation — the remaining gap to the concept boards is art (materials, models, per-location dressing).
- Perf note: heavier under SwiftShader (two of six tour captures timed out at 200 s); on a GPU this is normal cost. If mobile stutters, lower `samples` or the 2K map in render-quality.ts.

## Next (in order)
1. Visual pass per location against its board, court first (handoff §8), using the 901 production kit assets in `assets/sackreligious_game_asset_pack/` — art-led, needs Trey's eye.
2. Basketball presentation (handoff Pass C): net response on actual passage is there; next is camera stability and team readability. Then Pass A animation continuity.
2. Haunt: layer staged events/audio onto `haunt-navigation.ts` rooms (no pasted plates); wire haunt audio bed.
3. Bowling/racing feel items from the handoff §8.
