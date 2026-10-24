# Benji receiving food

Supplemental action sprites live in `public/game-v2/actions/food-receive/`. Canonical character PNGs, Claude ZIP, vehicle artwork and flagship master are not changed. Built-in imagegen references the canonical Benji left view: same face, locs, white/green cap, green shirt, chains, jeans and sneakers. Four left-facing empty-hand poses raise/reach/cup/carry; 2x2 layout uses magenta key and shared-scale feet-aligned processing. Lettering is omitted in these supplemental frames to avoid generated misspellings; normal branded canonical views stay intact.

A side camera exposes the exchange. The original vendor parcel moves to a per-key palm anchor, then follows that anchor while Benji carries it briefly. No second carton is spawned. Vendor alternation and wallet logic stay unchanged. Supplemental reception currently applies to the default green outfit; custom fits retain their existing artwork and transfer behavior. Dedicated action art for custom outfits and smoother in-between limb motion remain.

Production browser smoke captures `benji-receiving.png` after grip ownership changes, plus the two vendor turns and normal mobile TV/menu views. Hardware-phone performance and acoustic output are not verified by software-WebGL tests.
