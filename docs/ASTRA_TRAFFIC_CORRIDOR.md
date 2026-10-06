# Union corridor traffic — motion checkpoint

Branch base already had the production audit, foundation safety, and the functional home → HQ → K Blanco → delivery → court route. This pass does not rebuild those systems.

## What changed

Civilian cars were sliding because a turn blended position toward the next lane while velocity (and therefore heading) eased toward the destination on its own. Pairwise collision then shoved cars sideways off the lane, into curbs and building footprints.

Turns now follow one quadratic from the entry point, through the crossing of the two lane centerlines, to the exit point. Speed and yaw both come from that curve's tangent. If the next sample is inside a blocker, the turn is cancelled instead of tunneling. Straight traffic is pinned to the lane center. Car-to-car spacing pushes along the lane only.

Green lane centerlines draw only with `?traffic=1`. Normal play stays clean. `window.__SACK_TRAFFIC_DEBUG__` is unchanged and still gated to dev or `?qa=1`.

## Still open

This is not the full street production pass. Parked-car density, reference materials, intersection stop-line polish, and a human playthrough of every curve are still ahead. The connected slice's sidewalk route is still the safe on-foot path while live traffic occupies the asphalt.
