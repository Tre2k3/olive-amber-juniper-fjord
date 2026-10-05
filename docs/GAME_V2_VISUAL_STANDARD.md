# Game v2 visual standard

Style lock: polished 2.5D. Illustrated character cutouts stay. The world is stylized-real, not a primitive prototype and not photoreal AAA.

A surface is not done because it has a color. It is done when it has material, structure, and a job in the block.

## House

Not done if it is only a box, a roof, and a texture.

Required: lap or brick wall material, corner trim, foundation skirt, roof with overhang, fascia, eaves, window frames and sills, a real door, porch deck, columns, railing, steps, a walk, yard treatment, at least two landscape pieces, and one of mailbox / bin / hydrant. Driveway only where a car parks. Scale stays residential: wall about 3 m, door about 2 m.

The first house (`residence`, style 0 at the home lot) is the template. Other lots reuse that module with siding, roof, and porch variation. Do not invent a weaker house beside it.

## Road

Lane logic stays. The visible street does not.

Required: asphalt with grain and a worn patch, gutter darker than the lane, curb with height, painted center dashes, edge lines, a crosswalk made of separate bars, and driveway cuts that actually interrupt the sidewalk.

## Sidewalk

Not one continuous pale strip.

Required: separate slabs, expansion joints, small tone shifts, a grass seam, and a curb. Driveways break the run.

## Tree

Not a sphere, gem, or stick burst.

Required: a trunk and a layered canopy card. Four types live in the kit: shade, street, ornamental, mature. Palms only as a crown card, and only a few.

## Car

Traffic routing stays. The visible car is a production turnaround (front, back, left, right), not an extrusion.

Required: readable body, cabin, lamps, wheels, and a ground shadow. The card faces the camera. The texture follows heading. First finished car is the Memphis sedan. SUV, delivery van, and Benji coupe use the same pipeline.

Source sheets:

- `02_Vehicle_Turnarounds/02_memphis_sedan_turnaround.png`
- `03_black_suv_turnaround.png`
- `04_sackreligious_delivery_van_turnaround.png`
- `01_benji_primary_car_turnaround.png`

## Streetlight, fence, mailbox, bench, bin

Each is a small assembly: post plus head, rails plus pickets, box plus flag, slats plus legs, body plus lid. A single colored box is collision or debug only.

## Store (HQ)

The quality benchmark. Black metal center, brick side bays, gold `$ACKRELIGIOUS` sign, crown, storefront glass with warm interior behind it, planters, and a night emissive pass. If it still reads as one rectangular mass, it is not done.

## Interior

Warm ceiling light, dark floor, racks, a showroom wall, register, lounge seat, fitting partition, and a stock mass in the back. Not a black void with one sprite.

## Court

Playable rules stay. The place needs a marked surface, chain fence and gate, bleachers, a bench, a scoreboard, a mural, and night lights. No new court gameplay.

## Characters in the world

Identity art is locked. Do not redraw people to fix the block.

- Scale clamp: object scale is `distance / 6.6`, limited to 0.82–1.16, so a close NPC does not fill the frame and a far one stays readable.
- Named cast uses front/back/left/right from the Character Bible based on body heading versus camera. The card stays readable. It does not stay on the front drawing.
- Pedestrians only have a front plate. Do not invent side art for them.
- Tint is runtime-only: warm day, cooler night, warmer HQ. Do not rebake the PNGs.

## Explicitly not final art

Boxes, cones, icosahedrons, and flat color materials may be collision, shadows, or hidden structure. If the player can see it, it is not finished while it is still an untextured primitive.
