# Supplementary basketball poses

Created with the built-in Image Generation tool on 2026-10-11 after the user explicitly requested action animations. Canonical input: approved `benji/right.png`. These are supplementary generated derivatives, not approved canonical replacements. Original Claude PNGs and ZIP remain unchanged.

Three body-only four-frame sequences: dribble, jump shot, dunk. Actual alpha PNGs are used directly. `frames.json` records alpha bounds and SHA256; the renderer selects measured UV regions without rewriting image pixels. Fixed scale within each action family; sole anchor measured per frame. The dunk sheet has an uneven row gutter, handled with explicit regions. The low-detail first eight-pose attempt was discarded because silhouettes crossed cells and it invented shirt lettering.

Prompts: preserve Benji's face, dreadlocks, white/green cap, plain green shirt, gold pendant, blue jeans and green/white sneakers; transparent 2x2 sheet, same profile facing right, four successive frames, same body scale, generous cell gutters, no drawn ball/hoop/shadow/text. Dribble: downward push, low follow-through, rising return, waist catch. Shot: chest gather, forehead set, airborne release, wrist follow-through. Dunk: gather, takeoff, extended reach, landing.

Runtime: dribble loops through four keys at ball cadence; charge selects gather/set; release selects two follow-through keys; dunk selects four keys through its duration. The moving ball remains separate 3D geometry. The generated sheets are right-profile only; leftward attacks mirror the supplementary card. More directional art, in-betweens, clothing accuracy and motion polish remain necessary. These are stylized keyframes rather than motion-captured or NBA2K-quality animation. NPC basketball players still use canonical standing turnarounds.

## Rear actions and crossover pass — 2026-10-11

Added four-key `shoot-back`, `dunk-back`, `cross-back` and frontal `cross` sequences using the approved back/front Benji references. Rear shirts remain plain green; caps have rear openings and dreadlocks. The frontal crossover cap wording was corrected in Image Generation against the exact flagship master after the first attempt invented unrelated branding; that rejected attempt is not shipped. Generated typography is an approximation, not a pixel-exact replacement for the canonical cap or master logo.

Rear cards retain anatomical handedness without mirroring. Activity camera frames shooter, ball and rim from behind for gathers, releases, dunks and crossover/left-hand possession. Crossover keys run forward for right-to-left and backward for left-to-right. Ball ownership records the receiving hand after the move. Left-hand dribbling currently reuses the two low/high rear crossover keys; a dedicated rear dribble loop and smoother blends remain necessary. The frontal crossover is available for front camera angles; the automatic action camera normally selects the rear sequence.

Shot-camera transitions pull back if the interpolated view crops a gameplay subject. Dunk ball leaves the hand after scoring and drops through the net. Frame bounds and source hashes are recorded in `frames.json`. All action sheets are separate derivatives; the canonical pack and ZIP remain byte-identical.


## Grip and layup pass — 2026-10-11

Separate supplementary `layup-back.png` generated with the built-in Image Generation tool from the approved rear Benji reference. Prompt: preserve identity/clothing/style; four successive rear-view gather, one-foot takeoff with right knee raised, soft right-palm layup release, landing; body-only transparent sheet, no drawn ball/hoop/shadow/labels. Explicit connected-silhouette rectangles handle the release fingertips extending into the central gutter. All original pixels are retained; no canonical asset is changed.

Held finish ball centers sit above the supporting palm. A small UV crop of the actual SAME illustrated hand renders fingers over the near ball edge; no new finger art is drawn. Rear dunk reach aligns the held ball with the rim before release, then the fingers stop overlapping it after scoring. Layup uses its own keys and lower jump, releases from the last displayed grip into a ballistic flight, and awards points only on descending rim crossing. Contest, close range, half-court clearance, possession and reactive nets apply. Human controls: L / LAYUP; AI uses the close-range layup mechanic but still has canonical standing art. Smoother keyframe transitions, more angles and NPC action art remain necessary.
