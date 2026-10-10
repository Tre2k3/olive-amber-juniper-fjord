# Approved Claude sprite import inbox

**This is only for the user-approved Claude/Higgsfield image set.**

Upload the exact file `Claude_Canonical_Sprites_Integration.zip` into this `imports/` directory on branch `feat/production-hq-world-pass` using GitHub's **Add file → Upload files**.

The repository's `Install approved Claude sprites` Action will automatically:
1. Confirm the pack's SHA-256 matches the vetted 2026-10-10 upload.
2. Extract the eight five-pose illustrated pedestrians, approved main cast, and four vehicle turnarounds.
3. Register all pedestrian directions and map canonical vehicle sides.
4. Recalculate measured foot bounds; preserve gameplay, missions, camera and physics.
5. Run TypeScript, lint and production build; **only then commit** the artwork on this unmerged branch.

Do not commit on `main`. Keep the source atlas ZIP unchanged. Review the GitHub Actions result and resulting in-game screenshots before merge. The Action does not publish Claude's playtest page.
