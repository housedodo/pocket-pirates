# Pocket Pirates: style bible

These are the rules for how everything in Pocket Pirates looks. Anything new (models, UI, icons,
menus, effects) must follow them, and they are the reference when the look gets changed. If a rule
is changed on purpose, update this file in the same commit.

## 1. The one-sentence version
A PS1-era, low-poly, **pixelated and slightly dirty** Caribbean world: chunky dithered pixels everywhere
(3D and UI alike), flat-shaded faceted shapes, cheerful saturated colours that slide into sickly
purple and magenta cosmic horror as dread rises.

## 2. Pixel grid
- The 3D world is rendered to a low-res target (about 320x180) and scaled up with nearest-neighbour
  filtering. **One world pixel is about 4 CSS pixels at 1280x720.** UI pixel art should use the same size.
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
- **Village styles** (`src/villagestyles.js`, `STYLE_DEF`): eight looks so no two villages read alike: *classic* (Tama's painted town), *fishing* (sand, stilt houses, side jetties, nets), *terraced* (white flat-roofed cubes, a blue dome, cypresses, a well), *thatch* (round huts and a longhouse round a fire pit and totems), *market* (a street of townhouses from the pier to a fountain square, cobbles), *farm* (windmill, fields, hay, apple trees, sheep), *shrine* (torii at the pier, stone lanterns, a pagoda, blossom and bamboo), *wreckers* (mud, an upturned hull as a hall, rag poles, timbers). Each has its own island outline (`rMul`, `lobeMul`), ground pair, wall and roof palette (`paint`) and plants; a village custom (whitewash etc.) only repaints walls. **Colonial port landmarks** (`flagCloth`, `fort`, `laundry` in villagestyles.js): every church flies a big flag in the colours of the sector's faction (a cross on the faction colour, `desc.flag`), Tama and about half the other ports have a few broken, weathered walls on the shore (`ruins()`: sun-bleached coral stone, crumbled tops, rubble, moss, an arch stump and a rusted cannon in the sand; nothing medieval, no towers or battlements), and every port has a flagpole with the faction flag at the landing (`landingFlag()`), and every village has two to four washing lines of bright cloths beside its houses. **Terrain shapes** (`SHAPES`, `desc.sh`): villages are no longer flat plateaus. Each style picks from *dune* (low, soft slope), *hill* (a raised village, 4-6 up), *cliff* (a mesa with sheer sides, 6-8 up, rock-coloured), *terraced* (stepped hillside) and *bowl* (a low village in a hollow with a ridge behind); Tama stays flat. The village stands on one level (`d.H`) so houses, crowds and layers still sit right; around it the ground falls to the sea, and a ramp always runs down to the pier (`desc.dockTh`, now fixed per island). On hills, cliffs and terraces a flight of steps (stone or plank, with lantern posts) climbs the ramp from the pier (`stairs()`); terraced and hill villages also put 4-7 houses down the slope on stone footings (`slopeHouses()`), and terraces are flat treads with short risers. Pier crowds are placed with `Rp` (further out on shaped islands) and the harbour camera lifts over the lip (`frameVillage`). New style = one entry in `STYLE_DEF` plus its weight in `WEIGHTS`. Tama is always classic, the second harbour always fishing.
  Every harbour gets a tavern first, then a mix.
- Island kinds: sandbar, jungle, rocky, treasure, harbour, plus rarer volcano (ash cone, glowing crater, smoke),
  atoll (sand ring around a lagoon) and mangrove (mud flats, stilt-rooted trees, herons).
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
- **Night is dark:** light floor 0.17 of day, near-black navy sky and fog, a short view; what you see by is the lantern's warm
  pool on the water, lit windows, lighthouses and the moon. With the lamp out the dark comes right up to the hull.
- **Torn sail:** dark holes you can see through, long thin rips, the clew corner gone, three loose rags flapping; the sail
  bar blinks orange while the canvas strains, red while torn.
- **Lamp oil HUD:** a small pixel flame and an amber bar in the hull panel; below a quarter the bar turns red and the
  flame blinks. With the lamp out the night closes in (short, dark fog), no new effect.
- **Minigame variants** keep the same pixel ring and grid; only colours change: ring tint per water (wreck brown, night
  near-black, swell slate, deep navy, reef teal), red snag arcs; beach ground per kind (sand, grey shingle with grey
  stone dots, pale dunes, brown mud with dark sunk squares).
- **The glimpse figure:** one tall thin dark shape with a pale featureless head blob, standing in the water. No eyes,
  no glow, no fade: it is there, then it is not.

## 4. Colour and mood
- The sea is low-poly and faceted: a fine wave mesh with small chop, light banded in ~6 steps by facing to the sun,
  deeper troughs and chunky foam flecks on the crests. It should never read as a flat plane.
- **Title screen** (the one exception to the single UI font): the game is called **HOIST**. The logo is "Hoist" in
  Pirata One, bone white (`#f4ead0` to `#b8a47c`, dithered) with a dried-blood block shadow (`#5a1612` / `#1a0606`),
  drawn at low resolution and worn. The menu is the game font (DotGothic16, 32px) with a red pennant pointer. Behind it the Merry Gull bobs alone on open
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

## 5. Interface (HUD and menus)
- **One typeface everywhere: DotGothic16** (bundled in `public/fonts`, OFL). It is drawn on a 16px pixel grid, so it is only used at 16px (body, small text, labels) and 32/48px (titles); never in between, never bold or italic, no blur filters on text. This keeps C/O, S/5 and B/8 distinct. Map labels go on a separate full-resolution layer above the pixelated chart.
  2px offset, never a blur. Text without a background behind it gets `filter: url(#crisp)`.
- Panels (`.panel`): an 8x8 dithered navy tile (`--pxpanel`, shown at 32px), **no CSS border**. The frame is
  four hard box-shadows of 4px in `--pxedge` (gives notched pixel corners), a 4px pixel drop shadow,
  and 4px inset highlight/shade. Danger/horror panels set `--pxedge: #ff70d0`.
- Menus (`.menu`): the same idea with a gold inner ring and a dark outer ring. Buttons have dithered
  tiles, stepped borders and a gold border on hover/focus.
- Bars: hard fills with a 4px stripe pattern, stepped dark border.
- **No emoji or symbol glyphs anywhere.** Icons in text use `pxi('name')` (7x7 pixel glyphs in `src/pixelui.js`: fish, fruits, crate, skull, letter, stars, checks, arrows...). Icons are pixel sprites written as character grids in `src/pixelui.js` (coin, sun, moon, flag, heart, sail,
  Mara's anchor and her "eye" when she breaks). New icons go there in the same format.
- The HUD shows as little text as possible: gold, time, place. Everything else is in the log or the Q tracker.
- **Mara's box sits bottom left while sailing** (above the key hint), never across the ship or the water ahead of the bow. In the log it sits under the book, in the middle, clear of the page arrows and the chart's compass rose.
- **A gauge names itself once:** the first time the sail bar, the wind ring, the hull panel, the cannonball count or the lamp-oil bar appears, a small gold tag with its name (one or two words) points at it for 7 seconds. After that the HUD is wordless again.
- **The log's bookmarks never move:** the book hangs from the same top edge on every tab and the wide chart page shifts the row in, so a tab is always where it was. A click beside the book does not close it (Close, M or Esc do).
- **A letter is shown where it is taken:** a cream paper card on the board with the words and who wrote it; the same text is kept in the log.
- **Locked controls are grey but readable** (never invisible) and answer a click with one line.
- Autosave cue: a 20x11 pixel ship sailing over a dashed wave strip with "Voyage saved", bottom right, on the pixel grid like the other icons.
- The captain's log: paper-slip tabs along the top edge (DotGothic16 labels on cream), the Board is a cork field with pixel paper cards, a red pixel pin each and 4 px strings (red sure, dashed navy doubt). Encounters use the same navy box as villagers, at the bottom.
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

## 6. The captain's log (book)
- A battered **pixel tome**: dithered, scratched and stained leather cover with missing stitches and dented
  brass corners; dithered pages with foxing, ink blots in the margins, a coffee ring, a crease and a
  dog-ear. **Edges are torn** (transparent pixels), and the pages sit on a stack of hard pixel shadows.
- Bookmarks are cloth ribbons sticking out of the right side, with frayed pixel ends, uneven lengths and
  labels in the pixel font. Page text gets the `#roughpx` filter (small displacement + alpha threshold).
- The chart is rendered at half resolution and posterised with an ordered dither. Islands are
  **low-poly fans** (~8 rough corners, flat shaded facets). Only thick, rough strokes; labels in the pixel font;
  folds, stains and pencil notes on the parchment.

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
