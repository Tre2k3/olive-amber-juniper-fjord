# Food truck architecture detail pass

Veli, Brotherz and 901 Catch retain their original body footprints, service anchors, logos, menus and vendor/receiver artwork. A shared static fitting kit adds hatch frames and support rods, lower service-panel seams/handles/vents, rear reflectors, side rub rails, kitchen tile backsplash/grout, extractor slats, equipment and bottles, cab windows/handles/mirrors/steps, roof ventilation, tire shoulders and hub fasteners. Original canonical cast/vehicle PNGs, aliases, ZIP, flagship and supplied source media are unchanged.

Fittings are merged by material into seven meshes per truck, rather than a draw call per bolt. They add no shadow-casting point lights or per-frame work. Material merging limits overhead but hardware-phone performance is unverified. Warm diffuser color was reduced after actual nighttime capture showed excessive bloom.

`scripts/truck-detail-smoke.mjs` records production desktop day/night, side and portrait views and tests a paid mobile Veli order through receiving. Existing food-truck smoke separately exercises the original video and Brotherz server alternation. CI saves the new views as `truck-detail-qa`.

Compared with `01_GAMEPLAY_REFERENCE/09_block_party_event.png`, hatch supports, visible kitchen equipment and ornamental trim improve the modeled detail. The scene still lacks the reference's dense street dressing, textured/worn paint, realistic foliage, reflections and crowds. Four-key handoffs still have abrupt transitions; 901 Catch still lacks its unique cook. These are incremental architectural improvements, not final concept-art fidelity.
