# Production visual checks

Normal push/PR CI runs TypeScript, runtime-core tests, original-art integrity, lint/build, runtime/mobile reliability, focused Veli/race captures, foundation/HQ route, boot, traffic, missions/save and DOM smoke.

The complete house, stairs/gallery, bowling, basketball/action cameras, fishing and reference-view capture suite remains in scripts/haunt-3d-smoke.mjs. Run SackReligious CI through workflow_dispatch with capture_qa=true after changes to those systems and before claiming their visual behavior is complete.

The broad gameplay suite passed commit 621085e in run 38171006078 before the later presentation-only menu/backer/HUD/gantry/fog corrections. Those corrections use the focused production capture suite to avoid repeating hundreds of unrelated software-rendered animation frames.

Review actual PNGs, not just test assertions. This pass caught incorrect plane facing, an incomplete image upload, coplanar menu/backer flicker, HUD-over-logo overlap and a gantry blocking the chase camera. Veli's original menu is SHA256 checked; canonical Claude art and ZIP are checked independently.
