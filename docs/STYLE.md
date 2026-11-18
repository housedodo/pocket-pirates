# Pocket Pirates: style bible

These are the rules for how everything in Pocket Pirates looks. Anything new (models, UI, icons,
menus, effects) must follow them, and they are the reference when the look gets changed. If a rule
is changed on purpose, update this file in the same commit.

## 1. The one-sentence version
A PS1-era, low-poly, **pixelated and slightly dirty** Caribbean world: chunky dithered pixels everywhere
(3D and UI alike), flat-shaded faceted shapes, cheerful saturated colours that slide into sickly
purple and magenta cosmic horror as dread rises.

## 2. Pixel grid
- The 3D world is rendered to a low-res target about 270 lines tall (`scale = max(2, round(cssHeight / 270))` in `src/psx.js`:
  427x240 at 1280x720) and scaled up with nearest-neighbour filtering. **One world pixel is about 3 CSS pixels at 1280x720.**
  UI pixel art should use the same size. (Corrected 2026-11-14: this said 320x180 and 4 CSS pixels.)
- Any canvas made for the UI (wind meter, icons, book cover, pages, die) is drawn **small** and shown with
  `image-rendering: pixelated`. Examples: wind meter 36x36 shown at 144px, Mara's anchor 8x8 shown at 32px, villager portraits 16x16 shown at 64px,
  HUD icons 7x7 shown at 21px, book cover 150x90, pages 160x90, the die rendered at 72x72 and shown at 216px.
- No smooth gradients on UI pieces. Shading uses an **ordered 4x4 Bayer dither** between 3-4 palette
  colours (`BAYER = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5]`).
- No thin lines. Lines are at least one pixel of the pixel grid (2 map pixels / 3-4 CSS px). Hairlines and
  anti-aliased edges are removed with the `#crisp` SVG filter (alpha threshold) or by posterising.

## 3. 3D models
- Built in code with `Builder` (`src/builder.js`): triangle soup, **flat shaded, lighting baked into vertex
  colours**, plus a second "dark mood" colour set (`colorB`) that the shader blends to with dread.
- Low poly: cylinders with 4-8 sides, icosahedron blobs for rocks/bushes/heads, boxes and gables for houses.
  Things are a little crooked on purpose (tilted roofs, leaning poles).
- Textures come from the procedural 4x4 atlas (`src/textures.js`), 64px tiles of 2px blocks: planks, plaster
  with windows, roof, stone, leaves, bark, glow, sail, skull, bone, void eye, flag, rope, spore, sand.
- **Grime is part of the look:** stained/mossy atlas tiles, per-face dirt in `Builder` (`grime`), and the
  `USE_GRIME` shader option (world-space speckle + damp darkening near the waterline). Things look used:
  patches, barnacles, rope coils, crates, barrels, nets, laundry.
- Glowing texels (yellow windows/lanterns, magenta spores/eyes) ignore the light level, so they shine at night.
- Vertex snapping (PS1 wobble) gets coarser as dread rises.

### People, houses, island kinds
- **Scale:** an adult villager is about 1.4 units (`VSCALE` 0.74), a door 1.8, a cottage wall 2-3, the ship's
  cabin about 1.3 above the deck and its mast about 7. People never tower over buildings; roughly toy-like is fine.
- Villagers (`villager()` in `world.js`): fisher, market woman, old salt, child, docker, harbourmaster. Boxy limbs,
  6-sided torsos, blob heads, one strong prop each (hat, basket, cane, crate, ledger) so they read at a distance.
- Houses (`houseKind()`): cottage, townhouse, stilt house, round thatched hut, tavern, warehouse, bell tower.
  Colonial Caribbean kinds (as in the old pirate games): **colonial** (low whitewashed or pastel house, hipped terracotta roof, veranda, shutters), **planter** (stone ground floor, shuttered upper storey with a balcony, big hipped roof), **thatch** (palm-thatch cottage with an overhanging roof and a porch), **church** (white nave, bell tower with spire and cross). Every door gets a bit of life (`yard()`: bushes with flowers, a bench, a hen, a lantern post). Roofs are terracotta or thatch, walls whitewash or pastel, shutters bright; no tall bare boxes.
- **Village styles** (`src/villagestyles.js`, `STYLE_DEF`): eight looks so no two villages read alike: *classic* (other classic ports; Tama itself is the *garden harbour*: lush grass, sandy paths, picket fences, bougainvillea, flowering trees, a plank boardwalk and a roped pier, `world.js` `tamaPolish`), *fishing* (sand, stilt houses, side jetties, nets), *terraced* (white flat-roofed cubes, a blue dome, cypresses, a well), *thatch* (round huts and a longhouse round a fire pit and totems), *market* (a street of townhouses from the pier to a fountain square, cobbles), *farm* (windmill, fields, hay, apple trees, sheep), *shrine* (torii at the pier, stone lanterns, a pagoda, blossom and bamboo), *wreckers* (mud, an upturned hull as a hall, rag poles, timbers). Each has its own island outline (`rMul`, `lobeMul`), ground pair, wall and roof palette (`paint`) and plants; a village custom (whitewash etc.) only repaints walls. **Colonial port landmarks** (`flagCloth`, `fort`, `laundry` in villagestyles.js): every church flies a big flag in the colours of the sector's faction (a cross on the faction colour, `desc.flag`), Tama and about half the other ports have a few broken, weathered walls on the shore (`ruins()`: sun-bleached coral stone, crumbled tops, rubble, moss, an arch stump and a rusted cannon in the sand; nothing medieval, no towers or battlements), and every port has a flagpole with the faction flag at the landing (`landingFlag()`), and every village has two to four washing lines of bright cloths beside its houses. **Terrain shapes** (`SHAPES`, `desc.sh`): villages are no longer flat plateaus. Each style picks from *dune* (low, soft slope), *hill* (a raised village, 4-6 up), *cliff* (a mesa with sheer sides, 6-8 up, rock-coloured), *terraced* (stepped hillside) and *bowl* (a low village in a hollow with a ridge behind); Tama stays flat. The village stands on one level (`d.H`) so houses, crowds and layers still sit right; around it the ground falls to the sea, and a ramp always runs down to the pier (`desc.dockTh`, now fixed per island). On hills, cliffs and terraces a flight of steps (stone or plank, with lantern posts) climbs the ramp from the pier (`stairs()`); terraced and hill villages also put 4-7 houses down the slope on stone footings (`slopeHouses()`), and terraces are flat treads with short risers. Pier crowds are placed with `Rp` (further out on shaped islands) and the harbour camera lifts over the lip (`frameVillage`). New style = one entry in `STYLE_DEF` plus its weight in `WEIGHTS`. Tama is always classic, the second harbour always fishing.
  Every harbour gets a tavern first, then a mix.
- Island kinds: sandbar, jungle, rocky, treasure, harbour, plus rarer volcano (ash cone, glowing crater, smoke),
  atoll (sand ring around a lagoon) and mangrove (mud flats, stilt-rooted trees, herons).
- **Island looks** (`src/isleforms.js`, 2026-11-15; rolled islands only, never Tama's waters, the starter cells or the hand-made places):
  - *Lean by region:* Crown open sand; Free Cays atolls and mangroves, little rock; Reef and Lantern hard rock; Drowned mud and low sand.
    Only a plain sandbar, jungle or rocky isle changes, and only into a kind no bigger (an atoll from the lean is kept to r 12-15).
  - *Three forms per kind,* same parts and the same or fewer props: sandbar (round bar, **dune** with one long ridge, **spit** long and
    thin with a hooked end); jungle (hill, **twin peaks**, **low canopy** of broad flat-crowned trees in place of the palms); rocky (spires,
    **mesa** a flat table on two treads with no spires, **sea arch** with one foot on the shore and one in the water, in place of most spires and the stacks).
  - *Shape by distance* (ART_SPEC 5.1): loose stone is rounded near home (S0), long and low in the Shoals (S1), cut blocks from the Trade
    Belt out (S2+); spires lower and wider in S1, four-sided and blunt from S2; sea stacks four-sided from S2. Ground tint: warm and a little
    more saturated in S0, bleached in S1, cream and greyer from S2.
  - `?isles=0` shows the old islands on the same seed. `node scripts/isle_checks.cjs` checks crowding and budgets; `--blind DIR` writes the
    A12/A13 blind-test pictures (answers in `DIR/key.txt`).
- **Hand-made places** (`landmarks.js`): each must read from far off as one strong silhouette, and stay in the same
  chunky low-poly kit (6-sided basalt columns, blob canopies, boxes, gables), never a different art style:
  the Grey Tooth (grey basalt, no plants, white guano on ledges, a sea arch), Hollowgreen (dark greens in layered blob
  canopies, a white fall, a blue pool), the Halved Isle (a sheer cut face in pale ochre / sand / rust bands; the sunken
  half dark and only just under the water; a white fog dome round it that takes the scene's fog colour), the Drowned Bell
  (a leaning grey tower on a stack, roofs at the waterline), Wick's Rock (brick lighthouse, one cottage), the Ribs (dark
  rib pairs on pale sand, a ring of white surf streaks and black rocks), Glass Lagoon (pink / orange / teal coral blobs,
  a broken ring of black reef knuckles with white wash).
- **Gusts and currents** (`seaplay.js`, `ocean.js` uGust): a gust is a soft ragged patch of darker, finely rippled water
  drawn by the water shader, never a UI marker; current foam is thin white streaks drifting along the lane. Both fade at night.
- **Ocean designs** (ocean.js `OCEAN_STYLES`, uOcean): the original toon facets stay the default until one is chosen; every
  design keeps the palette (uDeep, uShallow), the shallows tint, the murk and the rough-sea blend, and dithers its light.
- **Waves:** low and gentle by land, bigger in the open sea (`seaScale`).
- **Wake:** a V of broken foam behind the stern (Kelvin-like spread), a churned strip, bow white water by speed; flat quads on
  the waves, never particles in the air.
- **Shores:** foam lines rolling in and breaking in stretches, seabed (sand, rock, weed) dithered through the shallows, fish
  shadows; rain rings on the surface.
- **Storm wall:** a cloud bank in the sky with rain curtains under it, never a dark mass sitting on the sea (it read as land).
- **Daymarks:** a black rock, a tarred pole, a white top with a black band; tall enough to stand clear of the horizon.
- **Dig beach:** top-down pixel beach (two sand tones dithered, shells, pebbles, weed at the tideline, grass edge), the stone
  arch with its translucent shadow, holes with thrown-up sand rims, corner-bracket cursor, foam edge lapping.
- **Shop cards:** dark plum card, 2px edge, pixel icon in a recessed square, gold level pips, teal tag for what an upgrade
  opens, coin price button; a purchase flashes gold. Keep shop text short: one effect line, one tag.
- **Glints:** sun and moon sparkle only in a soft path toward the light, single cells twinkling in place; never a pattern that
  slides with the camera.
- **The night sky** (2026-11-18, `sky.js`): a thin field of stars in tiers (size 2, 3, and a pixel-cross at 9), a tilted milky way with a dark dust
  lane, an eight-sided ring round the moon. Four colour moods (Calm, Amber, Teal, Violet), one a night in turn, only slightly different;
  and a richness chosen by the night, apart from the colour (`RICHNESS`): from about a tenth of the stars and no band to a full band, so the sky is
  never always full. Stars flicker in three stepped levels, never a smooth fade. No drawn constellations. The eye of the full dread stays. **The Eye** (`abyss.js`, the very bottom; redrawn 2026-11-18, owner: part of the sky, not on it): coloured each frame from the sky that is up (the horizon's colour, darker for lid and pupil, paler for the white, the iris leaning a little to `#7a2a5a`), half see-through, standing 1350 out so the sea's horizon cuts its lower edge, with six bands of the same sky drifting across it.
  Flags: `?sky=0..4`, `?rich=0..9`. **The day** (same date): four day moods, one a day (Clear, Hazy, Bright, Towering: they tint only the zenith,
  the horizon keeps the fog's colour, and set how many and how tall the clouds are); a pink dithered glow up the horizon at dawn and dusk,
  strongest toward the sun; clouds drift with the wind and wrap round the ship; a few small black birds by day (not at night, in a storm or
  at high dread). Flags: `?day=0` (the old day), `?daymood=0..3`. Cloud shadows on the sea were tried and dropped: at deck height they are
  a degree under the horizon and cannot be seen. Birds were tried and dropped too (they clashed with the built gulls). When it rains or clouds over (weather cover), the day mood steps back: the zenith greys and the sky fills with a low, flat, wide cloud layer.
- **Other ships carry a lantern at night** (2026-11-18, `traffic.js`): a small warm halo (two crossed discs) at the stern, a smaller one at the bow, and a pool on the
  water, made of the world's lamp material (`mats.glow`: additive, carries through the dark, dimmed by your own lamp's glare, brighter with it
  out). Lit at night and in a storm; derelicts and ghost ships carry none. **Lit things carry further at night** (`farlights.js NIGHT_REACH` 2.4):
  windows, lanterns and lamps are seen through about two and a half times the fog an unlit thing is, lamp lit or not; with the lamp out the old
  far reach still applies.
- **Base haze** (2026-11-18, `psx.js uHaze`, `?haze=0` off): things low to the water (below about 9 units) and further than 40 fog sooner than high ones,
  so far islands, buoys and hulls sink into the sea's own colour instead of floating on it. The foam ring round every island is wider and brighter
  (0.95 to 1.12 of the shore) with a pale wash outside it (to 1.42). Shallows, foam and mist do not haze (`haze: false`).
- **Night is dark:** light floor 0.17 of day, near-black navy sky and fog, a short view; what you see by is the lantern's warm
  pool on the water, lit windows, lighthouses and the moon. With the lamp out the dark comes right up to the hull.
  Far lights (2026-11-17, P-FREE-3): with the lamp lit, glowing things further than 150 burn at 0.55; with it out, after about 3 s,
  they burn at 1.8 and carry twice as far through the fog. Only the ship's own pool goes out with the lamp (`mats.shipGlow`); the
  world's lamps keep their level (`psx.js uFarLight`, `systems/farlights.js`).
- **Torn sail:** dark holes you can see through, long thin rips, the clew corner gone, three loose rags flapping; the sail
  bar blinks orange while the canvas strains, red while torn.
- **Lamp oil HUD:** a small pixel flame and an amber bar in the hull panel; below a quarter the bar turns red and the
  flame blinks. With the lamp out the night closes in (short, dark fog), no new effect.
- **Minigame variants** keep the same pixel ring and grid; only colours change: ring tint per water (wreck brown, night
  near-black, swell slate, deep navy, reef teal), red snag arcs; beach ground per kind (sand, grey shingle with grey
  stone dots, pale dunes, brown mud with dark sunk squares).
- **The glimpse figure (the diver):** a rusted deep-sea diver standing upright on the water, once (`src/glimpse.js`, look `a`, 2026-11-12): a dented copper helmet with a cracked front glass and one side pane gone, rust running down a swollen canvas suit, lead boots, both arms hanging limp, the air hose in one run from the back of the helmet down into a loop on the water, cut and open. Scale 0.95 at about 48 off the bow; in view about 11 seconds. Nothing glows on him.
- **The Edge** (`src/systems/edgeworld.js`, sailed since 2026-11-16; reworked 2026-11-18, owner): the sea rolls over a straight
  lip in one long smooth curve (22 bands, pale foam to flat black `#07050c`), thin threads of white water riding down the face and a fine
  haze of short spray streaks going dark as they fall; nothing big falls off it. Past it a curved wall of the dark stands 2400 out round the
  whole void side, its top just under the horizon, so the dark has no ends (the camera's far plane is pushed to 3200 while the Edge runs).
  Out in the dark, unfogged and built from the same stone boxes, cylinders and blobs in four greys (`#3c3848`..`#6a6070`): the hooded
  one with nothing in the hood, a head on its side with one magenta eye (`#ff70d0`, the glow tile), the tower at wrong angles (13
  storeys) with pin-prick windows, the pillars and the sunk arches. They are far too big (`SIZE` 2.6 to 3.4 times their build, 520 to
  820 out) and each goes black from the bottom up (`sinkFade`, `SINK`, `LIFT`): where it starts is never seen. Each stands apart along the
  lip and comes out of the dark (opacity, never a fog colour) only as the ship draws level; the pillars keep one apparent size from
  anywhere. The pull is pale thin dashes on the water racing to the lip (thicker and faster close in, the current foam's material).
  The ends of the stretch close in white sea mist (`#e8eef0`), the same white as the mist that takes the ship over.

## 4. Colour and mood
- The sea is low-poly and faceted: a fine wave mesh with small chop, light banded in ~6 steps by facing to the sun,
  deeper troughs and chunky foam flecks on the crests. It should never read as a flat plane.
- **The sea's character** (`src/seawater.js`, 2026-11-15; `?sea=0` the old sea, `?sea=debug` the features in flat colours):
  by the islands the water lies smooth (half the swell within 40 units of a shore, smooth light out to ~110, the shallows a fine
  dithered gradient; the flat pale sheet round each shore is gone, the swell cut it into jagged shapes). Out at sea: still patches
  of darker deep water and pale sandy banks (looks only, they never ground the ship), long thin broken current lines with a glassy
  band beside them. Each region's water: Crown clean, Free Cays glassy over sand, Reef white water over hidden heads, Lantern oil
  slicks with a dull rainbow edge, the Drowned flat lead-grey (the deep's palette still wins in the deep).
- **Small life** (`src/sealife.js`): golden floating weed, a drifting log with a resting booby (it flies off when you come close),
  a bloom of pink jellyfish breaking the surface (faintly lit at night). As the dread rises: the weed drifts into the wind, the bird
  stays and turns to watch you, then is gone and the log swings to point at you; the jellyfish pulse together, their light turns cold,
  and they keep pace off your side. About two within sight; never by a shore.
- **Everything obeys the light** (2026-11-14, task G2). Every mesh in the world uses `psxMaterial` (it snaps and darkens with `uLight`):
  the wind wisps, the wake and the gust foam too, so at night they are never brighter than the foam. Additive things (the wisps) cannot
  take the fog's colour, so they fade out as the fog closes in (`windfx.js`). Mist, the fog bank and the clouds already take their
  colour from the fog or the sky of the hour; they snap and do not take the light twice. The sky dome is seven flat bands with an
  ordered-dither seam between them, never a smooth gradient. The sun, its corona and the moon have eight sides.
- **Title screen** (the one exception to the single UI font): the game is called **HOIST**. The logo is "Hoist" in
  Pirata One, bone white (`#f4ead0` to `#b8a47c`, dithered) with a dried-blood block shadow (`#5a1612` / `#1a0606`),
  drawn at low resolution and worn. The menu is the game's text face with a red pennant pointer. Behind it the Merry Gull bobs alone on open
  sea at a random hour: morning, day, dawn, dusk, night or rain (`src/title.js`).
- **Ship upgrades show on the ship**: sails: stock = mended patches, 1 = clean canvas, 2 = stitched seams,
  3 = gold-bound storm silk plus a flying jib to the bowsprit. Hull: 1 = dark oak rubbing strake, 2 = iron bands,
  3 = darker ironwood strake, iron bow cap and cheek plates.
- **Log bookmarks**: pale paper slips (`#efe6cf`, ink text), tucked and slightly bent with a folded corner; the
  open tab is pulled out flat and whiter.
- **Wind ring** (top right): a thick gold arc where the ship sails fast, cream where slower, a dark red wedge straight
  into the wind. Arrow = wind, triangle = bow.
- Bright stage: turquoise shallows `#4fe0d0`, deep blue `#1b86c6`, warm sand `#ecd69c`, palm greens
  `#4a9a40 / #6aa456`, red/white lighthouses, cream sails `#f4ecd0`.
- UI ink and wood: cream `#f4ead0`, dark ink `#2a1608`, gold `#ffd23a / #c9a85c`, navy panel `#1b1538-#241c4c`.
- Horror stage: near-black purples `#06030e`, magenta `#ff30c8 / #ff70d0`, sickly greens, a black sun with a
  magenta corona. Horror elements glow magenta; the friendly world glows warm yellow.
- **Weather reads at a glance** (`src/weather.js`, `heavy` / `drizzle`): *light rain* is a pale grey sky (`#8e9aa6` /
  `#c3cbd0`), a milky, quieter sea (`#4c7d92` / `#86b8b6`, smaller swell, less colour), a soft mist that swallows the far
  islands and a thin, slow, nearly upright drizzle. A *storm* is a slate-black sky (`#161c26` / `#3a4450`), dark heaving water
  (`#132630` / `#2f4c52`, rough sea whipped up within seconds, bigger waves), cold flat light with a heavier vignette, dark
  clouds scudding past, a dense fast sheet of rain driven sideways by the wind, and lightning.
- **The dark hut and its island** (`darkHut`, `blightDecor` in `src/world.js`, `desc.blight`): the one place that is unpleasant
  in broad daylight. The island is the loneliest one 5-7 cells out (the most open water round it), a little smaller (r 20-23), with a ragged outline, black sand (`#3a3437`), grey rock
  and dead grass and sick moss (`#545238` / `#454530` / `#33402e`): no palms, flowers or fruit. Bare dead trees with clawing roots,
  pale fungus, black stakes in the shallows, leaning stones, crows that do not fly off. The hut is a witch's hut, not a house: round,
  black logs on crooked stilts, a ragged thatch brim and a crooked hat that bends over with a bird skull on the tip, a bent stone
  chimney, a low doorway hung with a hide, small sick-purple windows, charms of bone, herbs and a glowing jar from the eaves, a
  lantern on a crooked post, skulls on poles along the path, a ring of leaning stones round black ground behind it. The chart
  draws it the same: a black hut under a bent hat, one purple window.
  The water round it is dark and murky (`uMurk` in ocean.js): no turquoise shallows, olive-black water with drifting scum that
  thickens towards the shore and fades back to the open sea over about 90 units; its shallows ring is black-green and its foam a dull grey scum.
- **Villager portraits** (`src/faces.js`): 16x16, hand-drawn per speaker: a dark outline, skin with a shaded and a lit side,
  cheeks, eyes with whites, brows, a nose shadow, a mouth, and their own hair, hat, beard and clothes (the fisher's knit cap and
  pipe, the net-mender's bun and spectacles, the fish-stall woman's headscarf and gold earrings, the harbourmaster's peaked cap and
  badge, the docker's bandana, the old salt's white beard and eye patch, the lamplighter's hood and lantern, the watchman's hat and
  lantern). "Someone on the pier" is a black shape with two pale eyes, one a pixel lower than the other.
- **Locked interface** (gates.js): a sign, button or log tab the story has not reached is grey, dark and half transparent (`.locked`), with no hover; a sign that has just opened pulses teal (`.fresh`) until first opened; the sign/button the current quest needs pulses gold (`.next` / `.hl`).
- Dread is shown by changing colours, not by adding UI. Five stages: Sunny, Off, Wrong, Eerie, Cosmic
  (`src/palette.js`).
- **Each region has its own light** (`src/systems/regionlook.js`, 2026-11-13), laid over the dread palette before the time of day:
  | Region | Sky / haze | Water (deep / shallow) | Light, view | Sea (x the normal swell) |
  |---|---|---|---|---|
  | Crown Traders | `#1e5ad0` / `#eaf2ff`, clean white | cobalt `#0a2f8a` / `#3d8fe8` | bright (1.05), saturated, sees far (fog 120-460) | 0.85 |
  | Free Cays | `#39a6d8` / golden `#ffd890` | emerald `#009a84` / `#8af5c0` | warm, most saturated (1.35) | 0.6, a lagoon |
  | Reef Brotherhood | salt-grey `#5c6c7e` / `#dde6e0` | jade `#0f6656` / `#b4f6d8` | cool, a little flat | 1.25, the roughest |
  | Lantern Guild | smoke `#4a3a30` / amber `#f0a860` | near-black `#142424` / `#3e5e48` | dim (0.85), short view (fog 35-200) | 0.9 |
  | The Drowned | lead `#3e4450` / `#a0a6ac` | `#262e34` / `#56646a` | dull, grey (sat 0.4), low fog | 0.45, flat |
  Home Sound (within ~400-620 of Tama) keeps the plain bright sea. Crossing is never a line: the nearby sectors blend by distance
  (a gradient a few hundred units wide) and the blend eases in over ~half a minute. The four bright regions give way to the dread
  palette between dread 0.5 and 0.85; the Drowned's grey is the deep's own and stays. The waves are a multiplier on the sea's own
  swell, so wind and storms still move them (a fixed height made the Reef look like the deep).
- **Fish portraits** (`src/fishart.js`, the catch book in the Ship's book): 72x36 per species, painted in code: a body profile, a dark
  back dithered to a pale belly with a band of reflected light underneath, scales (offset crescents, a dark edge and a lit one) behind
  the gill, a dotted lateral line, a shaded gill cover with a lit rim, fins with rays and lighter see-through tips, an outline taken from
  the fish's own colours (darker), a short mouth turning down and a nostril. Eyes are small and real, placed by hand (owner, 2026-11-13:
  no big cartoon eyes): a dark rim, the iris behind, the pupil looking forward, a dot of light; only the deep lanternfish has a big one. The dark fish are the wrong side of the sea: a ring inside the glass eel, the pike's
  row of yellow eyes, the key that is a key, the barnacled angler with its lure; the Colour's catch is neon with no pupils. Heard-of
  fish show as a brown shadow, unknown ones as a faint shadow. Sheet: `docs/proposals/fish_portraits.png`.
- **Harbours have a side jetty** (2026-11-14) for their own boats (the rowboat, the fishing boat), about 40 degrees round the shore from
  the main pier: the main pier is kept clear for the captain.
- **Each region's things on the water** (`src/regiondecor.js`), along the way in to its islands (a harbour's pier direction):
  Crown: a lane of red cans and green cones into every harbour, lit red and green at night, and a tall white signal mast with a
  pennant string; carrying a timed delivery to that harbour, the mast flies one pennant per game hour left and strikes one an hour
  (M-CROWN-1, 2026-11-17). Free Cays: thatched houses on stilts beside the approach, canoes, coloured lantern strings at night. Reef: black
  coral heads in flat white breakers (a channel kept open at harbours), a mast leaning out of the water. Lantern: two rows of lamps
  on floats lining the way in, amber day and night, a tall dark tower with a light on top. Drowned: slate roofs to the ridge with
  chimneys, a leaning belfry (full game only). Lamps use the glow material (additive, never fogged). Home Sound and the hand-made
  places have none. **Scale (owner 2026-11-18, "too big, does not fit the realism"):** a lamp on a buoy, a float or a lantern
  string is a 0.55 to 0.8 cube, never bigger than the thing it sits on; buoys about 0.6 across and 2.5 high; a coral head's white
  water is a tight collar (head + 0.9) fading through a pale-aqua ring (`#9ed8c2`, head + 2.2) into the sea, never a wide flat disc.
- **What the tide and the dusk change** (2026-11-17, regional puzzles; numbers in `src/regions.js`): Reef coral shows by the tide:
  black teeth in white water up to tide 0.4, then only their tips awash in a pale-green slick (`#a6dcc4`, head + 1.4), above 0.7 nothing but a
  faint pale ripple ring (`#cfeadf`, head + 1.2) over each head, always some tell. A Drowned harbour's pier lies under a film of grey water
  (`#6a8088`, broken white at the edges) while the tide is above 0. Guild lighthouses at night flash their own rhythm (lamp room and
  beam on only during a flash); the chart inks it beside the light in dots and dashes. At dusk a lone Guild rock's keeper stands on
  the gallery (dark coat, cap, an amber lantern) and lowers a plank basket on a pale line. Once a voyage after the first throw, a lone
  stake with a white rag stands in open Reef water (full game only).

## 5. Interface (HUD and menus)
- **Typefaces** (2026-11-12, the owner reverted the 2026-11-11 pairing for now: Jersey 10 overlapped in the HUD and the log): **DotGothic16** for all interface text and headings (16 px grid: 16, 32, 48 px), HUD included. **Pirata One** stays for the title logo, the harbour name banner, the chart's harbour labels and the paper's masthead. The Pirata One + Jersey 10 pairing is kept switched off in `src/chartstyles.js` (`UI_FONT = null`, CSS block in index.html) to bring back later.
- Panels (`.panel`): an 8x8 dithered navy tile (`--pxpanel`, shown at 32px), **no CSS border**. The frame is
  four hard box-shadows of 4px in `--pxedge` (gives notched pixel corners), a 4px pixel drop shadow,
  and 4px inset highlight/shade. Danger/horror panels set `--pxedge: #ff70d0`.
- Menus (`.menu`): the same idea with a gold inner ring and a dark outer ring. Buttons have dithered
  tiles, stepped borders and a gold border on hover/focus.
- Bars: hard fills with a 4px stripe pattern, stepped dark border.
- **The Crown's record row** (`.ledgerrow`): green ticks, black squares for black lines, the next line faint at 0.4. The line already
  written (P-CROWN-5, 2026-11-17) is a faint black square in that place; beaten, it stays as a faint black square struck through by a
  2px pale horizontal bar (`.struck`), never a diagonal (no anti-aliased strokes).
- **No emoji or symbol glyphs anywhere.** Icons in text use `pxi('name')` (7x7 pixel glyphs in `src/pixelui.js`: fish, fruits, crate, skull, letter, stars, checks, arrows...). Icons are pixel sprites written as character grids in `src/pixelui.js` (coin, sun, moon, flag, heart, sail,
  Mara's anchor and her "eye" when she breaks). New icons go there in the same format.
- The HUD shows as little text as possible: gold, the clock (with the weekday), place. Everything else is in the log or the Q tracker.
- **Mara's box sits bottom left while sailing** (above the key hint), never across the ship or the water ahead of the bow. In the log it sits under the book, in the middle, clear of the page arrows and the chart's compass rose.
- **A gauge names itself once:** the first time the sail bar, the wind ring, the hull panel, the cannonball count or the lamp-oil bar appears, a small gold tag with its name (one or two words) points at it for 7 seconds. After that the HUD is wordless again.
- **The sea chart is an inked portolan on vellum** (`src/chartstyles.js`). Painted means sailed: water within sight of a charted isle or of the ship is a sea-green wash, everything else is bare vellum with the rhumb lines a chartmaker rules from the compass rose, so the fog wall is simply where the paint stops. Coasts are ink, markers are small ink sprites (anchor, cross, question mark, flag, pin), harbours are lettered in red Pirata One (a name that would sit under the ship's marker steps just clear of its ring), and a cartouche top left names the waters over a scale bar in units. Set pixel by pixel at half resolution, no anti-aliased strokes. The bare vellum is kept quiet on purpose: it is where a drawing in another hand can appear later.
- **The log has three bookmarks:** Chart (where things are), Orders (what to do), Ship's book (what you have). A section the story has not reached is simply not printed; a bookmark with nothing behind it is not there. No locked tabs.
- **The slip:** what, where, which way and how far (in units), always those three lines in that order. It is the HUD tracker at sea and the first thing on Orders (cream-gold paper, a red edge, a "Show on chart" button). Distances are units, the plain number from Tama's pier ("west · 232"), never minutes of sailing (RULES 15, CANON 2026-11-13).
- **The log's bookmarks never move:** the book hangs from the same top edge on every tab and the wide chart page shifts the row in, so a tab is always where it was. A click beside the book does not close it (Close, M or Esc do).
- **A letter is shown where it is taken:** a cream paper card on the board with the words and who wrote it; the same text is kept in the log.
- **Comfort** (2026-11-14, task G4): Pause > Settings has Shake (camera shake, the deep tremor and roll), Wobble (the picture's wobble and
  red/blue split at high dread) and Flashes (lightning, the hut's bad-throw burst, the hit frame becomes one faint ring). All three start
  off when the system asks for reduced motion. A new shake, wobble or flash must honour its switch (`settings.comfort`).
  Rumble (2026-11-16, G-19) sits under Shake in Display, the same kind of row, and starts off with reduced motion too. Pause > Settings >
  Keys lists one row per action ("Interact: E"), the same buttons as every other row; a row being set reads "press a key". With a pad the
  focus is the existing gold ring of `.menu button:focus`; no new look.
- **Locked controls are grey but readable** (never invisible) and answer a click with one line.
- Autosave cue: a 20x11 pixel ship sailing over a dashed wave strip with "Voyage saved", bottom right, on the pixel grid like the other icons.
- The captain's log: three paper-slip bookmarks along the top edge (labels on cream), the Board is a cork field with pixel paper cards, a red pixel pin each and 4 px strings (red sure, dashed navy doubt). Encounters use the same navy box as villagers, at the bottom.
- Wind meter: one pixel-art tick ring with an N at north, a bright double arc where the bow sails well,
  a solid arrow for the wind, a bow tick outside the ring, an orange mission dot.

- Harbour (layout A, "signposts on the pier"): no dark overlay; the camera rests on the village (a little to the left)
  and the village keeps living (people walk, gulls fly, waves move; the clock stands still). Name in Pirata One across
  the top with the last villager line under it in pale rose. Five wooden signposts along the bottom: Board, Market,
  Tavern, Shipwright, Set sail (keys 1-4, E; arrows step). A red number on a sign = something waits there. The chosen
  place opens as one panel on the right; messages stack on the left under the name, never covered. The sailing HUD
  fades out ashore. A villager's line (Mara-style box, 16x16 portrait) still comes first when there is one.

- Dice: the Lady's d20 is yellowed bone with a dark red 1. The check die starts pale bone and darkens in four steps to
  stained bone with a blood-dark 1; same carved numbers, same pixel texture. Never a new colour, only age.

- Things worth finding at sea (bottles) flash a small gold glint, never white (white reads as foam).
- The night the shadow tell fires (once a voyage, after the first throw), the stern lantern lights the main deck warm and one long
  figure's shadow runs forward across it, until dawn. Nobody is drawn on the deck; the shadow is all (task L7).
- The stern lantern has a flame while it burns (a four-sided glow cone, 0.6 tall): upright and still in home waters, down to 0.45 of its height and leaning up to 0.75 rad at full dread, wavering only once it leans (task L6). It never changes in the demo.

- **Feedback stays on the pixel grid** (2026-11-14, task G1). A hit is a hard red frame in three 8 px steps (`#c8402a`, then the
  same at half and at a fifth), on for 140 ms, no blur and no fade; the world holds still for 60 to 80 ms and the camera shakes by
  the damage (0.25 + 0.03 per point, at most 1). Gold counts to the new amount in hard steps (one every 60 ms) and its number flashes
  cream twice (`steps(2)`), never scales. The anchor biting dips the bow and throws a ring of foam at it. Sheeting in fills the sail
  with a brief bulge (a quarter wider for 0.4 s). A bite or a struck stone gives a small shake (0.15, 0.12). The first sight of an
  island eases the camera out about 15% and back over two seconds. Effects on 3D may ease; nothing made of pixels is eased or
  scaled. No new sound comes with any of them (RULES 25).

- **The Friday paper** (`src/newspaper.js`, `.paper` in index.html): newsprint cream with a faint 4 px grain, ink rules, a Pirata One masthead and headlines (24 / 34 / 48 px, headline case), the pixel text font for the body, a lead story with a drop cap, boxed weather and a dashed box for notices. It yellows, stains and the ink runs with dread (stages 2 to 4); it never shows anything but the paper.

- **The clock panel** opens with a weather sign (7x7 pixel sprites, owner 2026-11-18): storm, rain, fog, cloud by day or night, dawn and
  dusk as the sun on the horizon (gold, red), else sun or moon. It holds the time, the weekday (three letters at 0.75, always shown: owner
  2026-11-18) and the tide clock (owner 2026-11-18, replacing the upright gauge that read as a battery): a 16-pixel dial like a
  harbour tide clock, blue mark at the top for high water, sand mark at the bottom for low, one hand going round clockwise once a
  tide (twice a day), drawn in `ui/hud.js drawTideClock`.

## 6. The captain's log (book)
- The Ship's book opens with a faint centred dateline, "Sunday · day 14" (owner 2026-11-18).
- A battered **pixel tome**: dithered, scratched and stained leather cover with missing stitches and dented
  brass corners; dithered pages with foxing, ink blots in the margins, a coffee ring, a crease and a
  dog-ear. **Edges are torn** (transparent pixels), and the pages sit on a stack of hard pixel shadows.
- Bookmarks are paper slips (section 5; three of them, RULES 12), with frayed pixel ends and
  labels in the pixel font. Page text gets the `#roughpx` filter (small displacement + alpha threshold).
- The chart is an inked portolan on vellum (section 5), rendered at half resolution and posterised with an ordered dither.
  Only thick, rough strokes; labels in the pixel font; folds and stains on the parchment.

## 7. Writing
- Short, warm, a little funny when it is sunny ("She is small, but she is ours"). As dread rises,
  the same voices get quieter, repetitive, wrong. Horror is implied, never explained.
- Mara talks with a typewriter effect and a bobbing portrait. Nobody ever says "Lovecraft" or "cosmic".

## 8. Checklist for anything new
1. Is it drawn small and shown pixelated (or rendered by the low-res 3D pipeline)?
2. Any smooth gradients, blurred shadows, thin lines or rounded corners? Replace with dither, hard shadows,
   thick strokes, stepped corners.
3. Does it use the palette above, and does it have a dread version (darker, purple/magenta, quieter)?
4. Does it look used (stains, wear, crooked)?
5. Pixel font, as little text as possible.

## 9. Biomechanical zones (built; full spec in `docs/ART_SPEC.md`)
- **Zones:** Surface S0-S2 (bright lie: colour fatigue only, no magenta), Sub-Stratum S3-S4 (bone-pale limestone, wet-black lower thirds, sallow to bruised teal, sea mist round the foot of places, fixed pale shafts), Abyssal Core S5 (bone on violet-black, everything leans at Tama, magenta only in sockets and one pool, steady light only).
- **Wrongness is repetition and absence**, never a new monster: evenly spaced forms, one more cloth than people, no birds, one chair wet-black. No text, numerals, eyes, lids or figures on models; no clue by colour alone.
- **Kit:** Builder primitives and the existing 16 atlas tiles only (zero new tiles); the dark set (`colorB`, `KIND_DARK`, `LM_DARK`) tires S0-S2 islands, the D builder holds S3+ forms (ribs, vertebra spines, throats, arches, sockets: `abyssForms` in `world.js`).
- **State props:** things that depend on tide, night, calm, an upgrade or a clue seen are separate meshes shown by `extra.states` (`world.js`), never rebuilt.
- **Readability:** every place needs a vertical feature >= 3.5 units or a lit source; light classes (steady yellow, flicker orange, steady blue, magenta) are distinct; at most 3 glowing sources on screen in S0-S2 and 2 in S3+. Check with `scripts/art_checks.cjs`.

## The Pained Raven (2026-11-18)
`src/ravenship.js`: the Gull's own hull table scaled 2.3x, three masts of full sail, built with `Builder` and the atlas like every ship. Palette: pale
violet-grey hull and sails with a bone trim, the one place the game uses that hull colour (it is the Gull's opposite; owner: clean, empty, untouched by time).
It stands a hand above the water, never bobs and has no wake. Lights: the stern and bow lanterns and one transom light over the cabin door, glow tile; no
two windows beside a door (that reads as a face). Inside the cabin the walls and floor are self-lit amber so a lit room reads at night.
