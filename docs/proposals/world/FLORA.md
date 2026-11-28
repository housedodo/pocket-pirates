# Flora: what grows where (kept by the owner 2026-11-28: "keep the suggestions you made"; built in `flora.js plantIsland`)

Owner: "Are there variations in the flora in the game? If not, create multiple different vegetations and suggest how they should be
distributed and which parts should stay bare."

## What the game has now
One coconut palm model is used everywhere (only its lean and size change), with round green blob bushes, ferns, flower clumps, mossy
rocks and dark mushrooms. A few island kinds have their own: the canopy jungle has broadleaf trees, the mangrove islands have mangroves
and the volcano has dead trunks. Tama has hibiscus, flowering trees and grass tufts. Some village styles have apple, blossom, cypress and
bamboo trees. The regions do not change the plants: a Crown island and a Reef island grow the same palms.

## The eleven new plants (`src/flora.js`, trial; `__game.flora(x, z)` lays them out, picture `flora_trial.png`)
| Plant | Look | Real reference |
|---|---|---|
| Fan palm | straight trunk with crossed leaf bases, a round spiky crown of fans, a skirt of dead fans | sabal / thatch palm |
| Royal palm | tall, smooth pale grey trunk, green crownshaft, long arching fronds | the palms planted along colonial avenues |
| Young palm clump | three short coconut palms from one foot, leaning apart, coconuts | beach regrowth |
| Sea grape | low sprawling shrub, round leaves (one red), purple grapes, fallen leaves | the shrub of every Caribbean beach line |
| Agave | blue-green rosette of spikes; sometimes the tall flowering stalk | century plant of the dry islands |
| Kadushi cactus | ribbed green columns from one foot, a prickly pear with red fruit beside it | Curacao, Aruba, Bonaire |
| Divi-divi | short twisted trunk, flat crown blown all to one side | the wind-bent tree of Aruba and Curacao |
| Banana | clump of soft stems, big paddle leaves, a bunch and its purple flower | the wet hills and village gardens |
| Heliconia | upright paddle leaves, red and yellow lobster-claw flowers | rainforest understorey |
| Kapok | buttress roots like walls, tall pale trunk, wide flat layers of crown | the ceiba, the village meeting tree |
| Dune | sea oats with seed heads, beach morning glory with pink flowers | the dunes above the tide line |

Each plant has a dark version: the trunks, stems and dry leaves stay, and the green and the flowers go when an island goes dark. The
dead fans, hanging banana leaf and the kapok's pale web of bare branches are what remain.

## Suggested distribution
**By zone of an island (inside out)**
1. **Wet sand and the swash line** (outer 0-6 % of the radius): bare. Driftwood and shells only.
2. **Beach line** (6-15 %): sea grape, dune grass with morning glory, young palm clumps and coconut palms leaning out to the sea.
3. **Lowland** (15-60 %): each region's own mix (below).
4. **Slopes** (steep ground, slope > 0.45): bare rock, with a single agave or cactus in a crack on the dry islands.
5. **Summits** (above ~70 % of the island's height): bare, or low grass only. Hills read better with a clean top.

**By region**
- **Home (Tama's waters):** lush and gentle. Coconut palms, banana, heliconia by the houses, flowering trees, one kapok on the square
  of Tama or on the hill. The most green, the most flowers.
- **Free Cays:** the fruit islands. Coconut palms and young clumps, banana groves, sea grape thick on the beaches, heliconia in the
  shade. Few bare spots.
- **Crown:** dry, windswept and orderly. Divi-divi on the windward side, kadushi and agave on the rocky ground, royal palms in rows
  along the harbour streets, few coconut palms. Large bare patches of pale limestone.
- **Lantern Guild:** kept and planted. Fan palms and royal palms by the lights and the shrines, clipped hedges (the existing bushes),
  bamboo. Bare stone paved courts round the lights.
- **Reef:** scrub. Sea grape, agave, cactus on the rocks, a few battered palms; bleached rubble and bare grey ground between.
- **The Drowned:** almost bare. Mangroves at the water's edge, dead fan palms (the dark version), a few dune grasses on the
  sandbars. Grey mud flats left empty on purpose.
- **Haven Hesk and the fog bank:** bare: only dead grass and a few dead palms. Nothing green grows in the fog.

**By island kind**
- **Sandbars and small cays:** dune grass and at most one palm or clump. Most stay bare sand.
- **Jungle:** the canopy (broadleaf), banana and heliconia underneath, fan palms at the edges, one kapok on the biggest.
- **Rocky:** agave and cactus in the dry regions, nothing elsewhere; spires and tops bare.
- **Volcano:** a green band low down (banana, heliconia), bare ash cone above, dead trunks near the crater.
- **Atoll:** coconut palms and sea grape on the ring; the lagoon shore bare.

**Always bare**
- Harbour streets, the square, the quay and the strip in front of every pier, so docking and walking stay clear.
- Paths to the door of every house and around landmarks (the Table, the hut, the Bell Below), so they keep their silhouette.
- Clue places and hand-made landmarks keep their own planting; nothing is added to them.

**Rules of thumb**
- At most two big tree types on one island, so each island reads at a glance; small plants can mix.
- One kapok per island at most, and only on a few islands, so it stays special.
- Plants get fewer as dread rises: the green thins out before the island turns dark.

## Built (2026-11-28)
- `flora.js plantIsland(d, ...)`, called at the end of `world.js decorate` on its own rng (nothing else on an island moves): the beach
  line, the region's one or two low kinds per island, heliconia under the jungle, a kapok on about a third of the big jungle islands
  outside the dry regions, agave and cactus on dry rocky islands, the volcano's low band, sea grape on atolls, dune grass on sandbars.
  Harbours get only the beach line (away from the pier, jetty and back stair) and, in the Crown and Lantern, a few royal or fan palms.
- Skipped: slopes over 0.45, ground above 70 % of the island's height, landmarks, mangrove islands, Hesk, the hut; inside the fog bank
  only a dead fan palm or two. Counts thin with dread (to 40 % at full dread); the green and flowers go with the bright mood.
- Coconut palms thin by region (`palmK`: Crown 45 %, Reef 70 %, Lantern 80 %, Drowned 25 %), spending the same rng so nothing moves.
- Tama: one kapok, placed first among its trees (it stands by the lighthouse with seed 1337).
- The kapok's roots (owner: "the wall-like roots look too flat and uncanny"): a flared foot and seven buttresses of different lengths,
  thick and high at the trunk, thinning and dropping in a curve, snaking sideways, with a surface root running on past each.
