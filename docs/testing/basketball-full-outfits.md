# Complete basketball outfit sprites

The previous green/gold modeled practice jerseys were rejected because they covered streetwear and looked like patches. This pass removes that renderer and its skin/color-mask layer entirely.

## Supplied designs

The archived individualized outfit references show three sleeveless designs: black Fresh (yellow trim/red mascot, FRESH 38127 back), blue Fresh (yellow trim/gold mascot, navy FRESH 38127 back), and white/red 224 (NCO front, BIG DRE LIVING / 224 / NEVER CLOCK OUT back). Some legacy preview filenames describe a different outfit from their actual pixels; the new registry follows the inspected art.

Benji has a complete separate set for each design: four true directional views plus four keys each for dribble, profile shot, rear shot, profile dunk, rear dunk, front crossover, rear crossover and rear layup. Court OG has a blue Fresh turnaround; Nitro and Strike have white/red 224 turnarounds. All preserve their own identities and existing lower-body/accessory designs. These are streetball jersey outfits, not a shorts-only competitive wardrobe.

120 full-body illustrated frames are stored in 48 runtime files. Generated using built-in image generation, edited from canonical poses and the supplied outfit references. No canonical character PNG, vehicle, ZIP, original action sheet or flagship master is changed. Prompts, raw-source hashes and derived-file hashes are in `public/game-v2/basketball/ASSET_PROVENANCE.json`.

## Runtime and preparation

J or KIT cycles Fresh Black → Fresh Blue → 224 → Street. Court NPCs retain their own complete jersey outfits while jersey mode is enabled; Street restores original court art. Leaving the match restores canonical street rendering. The physical ball remains separate and uses the tested palm/rim registration. No runtime garment/logo/skin overlay is used.

Only the selected action bank loads. Changing kits disposes previous atlas/cloned frame textures, and rejects stale loader callbacks. At most eight active action atlases remain resident. Complete standing outfit textures are preloaded.

Deterministic processing removes edge-connected registration-colored flecks without removing enclosed garment prints, retains the principal character component, and splits at safe inter-pose gaps. Directional cutouts use a measured 480px body/16px sole padding on a 512px RGBA canvas. Action cutouts register to the existing tested pose boxes and palm coordinates and encode losslessly. Four initial rear sheets had front graphics on a back pose; targeted edits corrected those before final integration.

## Verification and remaining limits

Run `python3 scripts/verify-court-uniforms.py` and the unchanged canonical integrity suite. Browser tests verify all three kit banks, four jersey players, zero garment overlays, charge/release contact, rear dunks/layups/crossovers, kit restoration and atlas memory. Inspect actual production captures in `screenshots/basketball-uniforms/` against the provided outfit designs.

Generated fine lettering still needs print-level typography proofing. Limb motion remains four keys per action; NPCs still lack dedicated shooting/rebounding action sheets. Human multiplayer and hardware-phone performance remain unverified. This pass does not claim finished concept-art world fidelity.
