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
  `image-rendering: pixelated`. Examples: wind meter 36x36 shown at 144px, Mara's anchor 8x8 shown at 32px,
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
  Every harbour gets a tavern first, then a mix.
- Island kinds: sandbar, jungle, rocky, treasure, harbour, plus rarer volcano (ash cone, glowing crater, smoke),
  atoll (sand ring around a lagoon) and mangrove (mud flats, stilt-rooted trees, herons).

## 4. Colour and mood
- Bright stage: turquoise shallows `#4fe0d0`, deep blue `#1b86c6`, warm sand `#ecd69c`, palm greens
  `#4a9a40 / #6aa456`, red/white lighthouses, cream sails `#f4ecd0`.
- UI ink and wood: cream `#f4ead0`, dark ink `#2a1608`, gold `#ffd23a / #c9a85c`, navy panel `#1b1538-#241c4c`.
- Horror stage: near-black purples `#06030e`, magenta `#ff30c8 / #ff70d0`, sickly greens, a black sun with a
  magenta corona. Horror elements glow magenta; the friendly world glows warm yellow.
- Dread is shown by changing colours, not by adding UI. Five stages: Sunny, Off, Wrong, Eerie, Cosmic
  (`src/palette.js`).

## 5. Interface (HUD and menus)
- **One typeface everywhere: Pixelify Sans** (bundled in `public/fonts`), for the HUD, menus, the book, the chart labels and the die. No other fonts, no italics (a global CSS rule enforces both); smallest size 12px. Weight 600 for labels; text shadow is a hard
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
- Wind meter: one pixel-art tick ring with an N at north, a bright double arc where the bow sails well,
  a solid arrow for the wind, a bow tick outside the ring, an orange mission dot.

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
