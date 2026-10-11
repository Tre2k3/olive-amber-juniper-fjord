# Food trucks and Veli TV

## Implementation

- Veli's modeled truck mounts a 16:9 video screen beside its service hatch. `public/game-v2/vendors/veli/yung-veli.mp4` is the exact source from `Tre2k3/blue-delta-palm-craft`, branch `feat/halloween-after-dark`, source blob `3613b5a1a2469dd72b310b3f8dbf5412cf9a80a7`. H.264/AAC, 854x480, approximately 68 seconds.
- E or the mobile E control at Veli invokes playback synchronously in the input handler. No autoplay. Play/pause and mute are available near the truck; leaving eight meters or hiding the document pauses playback. The video loops at the truck. Unmount pauses, detaches and disposes its texture. Failures expose a retry message.
- Original Brotherz Wingz N Things (`b74cd68f9f4226c58f967bbaa10632f8b35ac388`) and 901 Catch (`ac55b74236993d8d945506e5e9c096b6070ef019`) logos are copied unchanged. Brand signs retain their aspect ratio and are dimmed below the bloom threshold without modifying source files.
- Two additional trucks have modeled open hatches, counters, kitchen equipment, cabs and wheels. Each has its own menu, wallet checks and food/Respect rewards. Sample menu prices are part of the game economy; no real Brotherz or 901 restaurant menu was provided. The obsolete shared ordering spot is removed.
- Brotherz's two supplemental front sprites derive from the two faces on the logo. Veli/approved cast/vehicles and flagship source assets remain unchanged.

## New art generation

Built-in imagegen used the original Brotherz logo for identity and existing Veli vendor art for clean HD cel-shaded style. First prompt: left logo man, close-cropped hair/goatee/crown, red polo, gold-trimmed black apron, black trousers/red-white shoes, full-body front idle. Second prompt edit-chained the outfit/style from the first while adopting the right logo man's longer dark hair, slender face, thin mustache and beard. Transparent alpha preserved; repository generate2dsprite processor standardized both to 512 cells, 460px body height, feet at y485. Prompts do not replace canonical artwork.

## Verification

`node scripts/food-truck-smoke.mjs` exercises real production-browser video playback/clock advancement/VideoTexture mapping, pause/resume/mute/departure stop, both vendors loaded, separate paid menus and mobile controls. It captures seven screenshots under `artifacts/food-court/`. Production preview supports byte ranges for media. Core tests verify source checksums and invalid/duplicate orders.

Limitations: browser checks confirm decoding/playback and mute state, not acoustic quality on speakers or physical phones. Brotherz currently has front idle sprites and an animated counter tray; dedicated arm handoff poses and customer receiving animation remain. 901 Catch has a modeled kitchen/order window but no unique cook sprite. Truck surfaces, vegetation and busy-city ambience still need concept-art polish.
