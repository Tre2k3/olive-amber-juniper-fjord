# Runtime reliability follow-up

This pass edits the active `src/game-v2` runtime. The canonical PNGs and ZIP are unchanged.

- Clear touch, keyboard, pulse, interaction and orbit state on focus loss; clear input when the document becomes hidden. Mobile controls capture pointers and release held shots/stick on cancellation or capture loss.
- Ignore keyboard repeat for one-shot light/menu toggles while retaining browser scroll prevention.
- Resize render targets only when viewport size or device pixel ratio changes. Dispose postprocessing resources on teardown.
- Save only changed progress snapshots; blocked/full browser storage cannot throw into the game loop. A console warning identifies the save limitation.
- Automatically release basketball at maximum charge, preserving tap and hold-release behavior.
- Resolve camera segments analytically, including walls closer than the previous 0.7-meter sampling start. Recheck the smoothed lens position to prevent crossing walls during orbit. Present cutouts after the camera moves so view selection uses the rendered camera.
- Keep directional vehicle art stable around view thresholds without editing, mirroring, blending or replacing source artwork. Four-view snapping remains at larger angle changes.
- Correct forward traffic gaps across different completed route laps.

Local validation: TypeScript passed; production build passed; lint passed with zero errors and the same 14 existing warnings; canonical integrity passed all 85 supplied PNGs and 16 runtime views. Runtime core regression tests cover camera clipping, vehicle view hysteresis, denied/unchanged saves and multi-lap traffic gaps.

The CI workflow now runs `scripts/runtime-reliability-smoke.mjs` against a production build in Chromium. It exercises focus interruption, touch and keyboard movement, interrupted and maximum-charge shots, key repeat, viewport resizing, pointer cancellation and storage denial. Fresh screenshots are saved in the workflow's `sackreligious-qa` artifact under `runtime/`.

CI results and screenshot inspection must be reported separately. This note does not certify visual completion. Named-cast walk cycles, pedestrian side/back strides, architecture, riverfront detail, night exposure and hardware GPU testing remain outstanding. The PR remains draft and unmerged.
