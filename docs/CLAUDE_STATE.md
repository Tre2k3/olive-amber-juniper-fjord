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

## Next (in order)
1. Basketball: read how runtime drives `shotVelocity`/`rimCrossing`; add rim-torus + backboard contact and net response inside the existing match (handoff Pass B/C), not a separate mode. Wire court audio.
2. Haunt: layer staged events/audio onto `haunt-navigation.ts` rooms (no pasted plates); wire haunt audio bed.
3. Bowling/racing feel items from the handoff §8.
