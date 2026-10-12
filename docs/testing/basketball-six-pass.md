# Basketball six-priority improvement pass

## Scope

1. Confirmed prior head `418cdc0` had successful full CI before editing.
2. Pose silhouettes settle over a short interval around their feet; charge releases retain the last rendered palm origin. Dribble tops and crossover catches follow the illustrated hand while the bounce still reaches the floor. Dunk insertion/grip and layup release are retained.
3. Defenders have separate man-to-man targets and basket-side gaps. The off-ball teammate spaces to a wing and sometimes cuts; loose-ball AI pursues predicted landing positions. Separation increases to 1.05m, including coincident bodies. Core half/full matches still finish at 21/win by two.
4. Reversible modeled practice jerseys use the exact flagship silhouette, green/gold team colors and numbers 0/23/9/1. Original illustrated faces, arms, footwear and underlying street outfits are retained. J or KIT toggles the jerseys. These are 3D layers over original outfits, not newly painted full character sprite sets. A skin-only layer preserves the original illustrated arms above the garment. There is no new generated character artwork.
5. Static scenery fades out/in rather than popping, and restores its original material on leaving court. Canonical cast/traffic/floors are excluded; cloned fade materials are disposed. Portrait Behind/Baseline omits distant off-ball framing anchors and uses a pose-appropriate height envelope. Sideline retains the team overview.
6. Six approved pedestrian spectators stand outside the play area and react with a small bounce to scores. Added benches, bags, bottles/towels, scorer's table, drooping string lights, concrete paving and worn brick material. No new point lights, no center-floor overlay, no canonical artwork changes.

## Validation and limits

Core regressions cover man-to-man separation, chasing a descending rebound, retaining a palm release, completed AI matches and safe faded cutaways. Production browser smoke verifies four jerseys/toggle, six spectators, charging palm contact, release, dunk/layup, court dressing and portrait views. Camera and runtime reliability checks cover all angles, screen-correct controls and HUD/input recovery. CI uploads `basketball-polish-qa`.

Compare actual captures with `01_GAMEPLAY_REFERENCE/05_901_court_sunset_gameplay.png` and `09_block_party_event.png`: court amenities, material variation and crowds move toward the reference, but environment/foliage quality is still lower. Existing four-key artwork remains; brief silhouette settling is not a complete in-between animation set. AI still lacks dedicated shooting/rebounding limb sheets, and practice jerseys retain the original pants and sleeves. Full fitted athletic costume sprites, human multiplayer, advanced blocks/rim/backboard logic and hardware-phone performance remain unfinished.
