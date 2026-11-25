---
name: hoist-artstyle
description: The art style of HOIST (Pocket Pirates) and how to build in it. Use for any new or changed visual in this game, such as a model, prop, ship, island decor, effect, UI piece or icon, before writing the code and again when judging the screenshot. Covers the look in numbers, the procedural kit (Builder, atlas, materials), the dread versions, the "no game signs" rule, and the traps found while building.
---

# HOIST art style

A PS1-era, low-poly, **pixelated and slightly dirty** Caribbean world: chunky dithered pixels everywhere (3D and UI alike),
flat-shaded faceted shapes, cheerful saturated colours that slide into sickly purple and magenta cosmic horror as the dread rises.
**Everything is procedural: no image or model files** (the one exception is the six painted ending cards).

The law is `docs/STYLE.md` (the look) and `docs/ART_SPEC.md` (islands and strata). This skill condenses them and adds how-to. If the
look changes on purpose, update `docs/STYLE.md` in the same commit. Design's area is listed in `docs/AREAS.md`; the `design` agent
(`.claude/agents/design.md`) owns it.

## 1. Before you build: five questions
1. **Silhouette first.** Can it be told from its neighbours as a black shape at 150 units? Shape is read before colour: change
   proportions (long and low, tall and boxy, squat, too tall and narrow), rake and lean before you reach for paint.
2. **Does it belong in the world?** No circles, rings, markers, floating icons or "game signs" (owner, 2026-11-23). An obstruction is a
   natural thing: shallows (pale water, waves lying down, foam at the edge), a sunken hulk, a rockfall, mangrove roots. A place to
   notice is noticed by what is there (a mast with a rag, a slick, gulls), never by a ring. Irregular, never a perfect circle.
3. **Does it look used?** Patches, stains, crooked poles, a tilt, rope, barnacles, laundry, one thing missing.
4. **What is its dread version?** Every visible thing needs a darker, quieter one (see section 4). Horror is implied, never explained:
   repetition and absence, not monsters; no text, numerals, eyes, lids or figures on models.
5. **Is its light budget kept?** Glowing texels ignore the light level. At most 3 glowing sources on screen in S0-S2 and 2 in S3+; each
   place owns at most one steady and one flicker light. Warm yellow is the friendly world, magenta is the deep.

## 2. The kit (how things are made)
- **`Builder`** (`src/builder.js`): `box(x,y,z,w,h,d,col,tile)` (base-centre), `cyl(x,y,z,r0,r1,h,segs,col,tile,cap)` (4-8 sides),
  `blob(x,y,z,rx,ry,rz,col,tile,jitter,seed)` (icosahedron rocks, bushes, heads), `gable`, `quad`/`tri` for lofted shapes,
  `push(x,y,z,ry,sx,sy,sz,rx,rz)`/`pop()` for a transform. `orient([x,y,z])` winds faces away from a point (outside of a hull);
  `orient(null)` turns it off. `doubleSided = true` for thin things (wings, sails). `darkSame = true` keeps a colour in the dark mood.
  `grime` (per-face dirt) defaults on; set `grime = 0` for clean shapes (birds). Lighting is **baked into vertex colours**; flat shaded.
- **Lofted hulls** (see `buildBoat` in `src/gear.js`): stations along z (bow at -z) with [z, half-beam, sheer height, chine], quads
  between stations, two strakes in two colours, a dark inside wound inward, ribs, transom, stem, keel. Sheer rises to the bow.
- **Atlas tiles** (`TILE` in `src/textures.js`): planks, wall, roof, stone, leaf, bark, glow, white, sail, skull, bone, void, flag,
  rope, spore, sand. No new tiles: build the look from these. `TILE.white` takes the vertex colour as it is.
- **Materials** (`src/psx.js`): `mats.props` for vertex-coloured props, `mats.glow` (additive lamps), `mats.foam`;
  `psxMaterial({...})` for anything new (it snaps vertices, takes the fog and the light, `vertexColors: true` reads Builder colours;
  instanced meshes work). Every world mesh goes through it, so nothing is brighter than the light allows.
- **Pixel grid**: the world renders to ~270 lines and scales up nearest-neighbour; UI canvases are drawn small and shown with
  `image-rendering: pixelated`. Shading on UI uses the 4x4 Bayer dither `[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5]` between 3-4
  palette colours. No smooth gradients, no thin lines (1 grid pixel minimum), no rounded corners, no blur.
- **Icons**: 7x7 or 8x8 string rows in `src/pixelui.js` (`ICONS`, `ICON_COLS`), used as `pxi('name')`.

## 3. Palette (bright)
- Sea: turquoise shallows `#4fe0d0`, deep `#1b86c6`; sand `#ecd69c`; palms `#4a9a40` / `#6aa456`; cream sails `#f4ecd0`.
- Wood: oak `#8a5428` / `#a0662e`, dark `#5a3418`, rail `#c8a878` / `#d8b888`; iron `#2a2622`; brass `#b08a3a`.
- UI: cream `#f4ead0`, ink `#2a1608`, gold `#ffd23a` / `#c9a85c`, navy panel `#1b1538`-`#241c4c`.
- Each region has its own light and water (table in `docs/STYLE.md` 4): Crown clean cobalt, Free Cays golden and emerald, Reef salt-grey
  and jade, Lantern smoke and amber, the Drowned lead-grey.

## 4. The dread versions
- The game blends to a dark colour set with dread (`colorB`); islands swap to a dark builder `D` above dread 0.5.
- Dark islands have a **ruin style** by their dread, seeded so neighbours differ (`darkStyle` in `src/world.js`):
  *abandoned* (dead palms with hanging brown fronds, a fallen lean-to, a holed boat, rags on a line, nets, driftwood markers, pale
  fungus), *picked* (snapped palms, crows sitting, a bleached ribcage, a ring of stakes, cairns, burnt stumps), *wrong* (claw fronds,
  glowing pods and caps, black monoliths; the only style where anything glows). Never only purple orbs.
- Birds: gulls thin out, then crows gather (5 to 28). Strata: warm-saturated (S0) to cold (S3) to bruised teal (S4) to bone on
  violet-black (S5); magenta only S4+.
- The demo build has no dread at all.

## 5. Traps (learned the hard way)
- **Texture multiplies colour.** A light paint on `TILE.planks` comes out brown. For a painted hull use `map: null` on its material, or
  remap the vertex colours dark-to-light by brightness (`recolour` in `src/systems/raiders.js`).
- **Many-mesh models**: change every piece (a galleon's castle and spare masts share the hull's material) or half stays brown.
- **`angleDiff(a, b)` is `b - a`.** To turn toward a target: `heading += angleDiff(heading, target) * k`. Reversed, things steer away
  (a towed boat went stern-first, raiders sailed off).
- **One wave height for everything.** Change `stage.wave` itself, never only the shader uniform, or hulls float on a different sea
  and sink into the drawn one.
- **Per-frame overrides**: `traffic.js` resets sail scale and rotation every frame; adjust after it (`crewTick` runs after
  `traffic.update`) and never multiply a value that is not reset.
- **Floating-point zero**: `1 - 0.2 * 5` is not 0. Snap small values (`if (x < 0.01) x = 0`).
- **Scale**: a buoy lamp is a 0.55-0.8 cube, never bigger than what it sits on. The Gull is about 8 long; her boat about 3.6.

## 6. Check it (always with a picture)
- Dev server `npx vite --port 5175 --host 127.0.0.1`; restart it after editing a file a running page has loaded (else two copies of
  the module exist). Headless Chromium with swiftshader; `window.__game` (state, ship, teleport, fauna), dynamic
  `import('/src/...')` inside `page.evaluate` for anything else; `rt.camOverride = { pos, look }` for a fixed camera; hide `#hud`.
- `tools/visualqa/capture.cjs` (plan JSON: positions, time, weather, dread, camera) and `tools/visualqa/sheet.py` (contact sheets).
- The headless run is about a tenth of real speed: wait on state, not time, and never judge motion or sound from it.
- Look at it: in greyscale (is the silhouette clear?), at 150 units (does it read?), by day and night, and at the dread it lives in.
  `deviceScaleFactor: 2` for pictures the owner sees.
- Then: `npx vite build`, `npm run smoke`, record the change in `docs/PROGRESS.md` (and `docs/STYLE.md` if the look changed on purpose).
