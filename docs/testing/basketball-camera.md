# Basketball gameplay cameras

Practice and half/full AI 2v2 use Behind (default), Sideline or Baseline. B or the court CAM button cycles the selected angle, including on mobile. Shooting does not switch presets; framing pans and zooms smoothly to include the human, live ball and active rim. Behind keeps a slight shoulder offset at 3.3m; Baseline sits opposite at 3.8m; Sideline stays on a consistent television side at 5.2m. High arcs increase horizontal distance instead of camera altitude. Transitions retain a framing margin and avoid the previous aerial shot offset and instant action-camera cut.

Movement follows the current basketball camera's horizontal basis, while leaving the court retains the ordinary world orbit. Selected camera remains in effect through shots and between matches within the session. Supplemental rear shooting/dunk/layup art and all canonical character/vehicle/ZIP/flagship files remain unchanged. This is gameplay camera framing, not a replay or NBA-level presentation system.

Core regression covers both hoops, high arcs, all modes, portrait/desktop projection and small-movement continuity. Production browser smoke captures charging/flight, all three views, rear dunk/layup, mobile camera buttons and tests A/D against the actual view direction. CI retains the screenshots in `basketball-camera-qa`.

Limits: baseline backboard/support visibility, background/crowd detail, custom-outfit animations and hardware-phone performance still need work. Portrait framing backs away further; players appear smaller. These views are checked in Chromium/software WebGL.
