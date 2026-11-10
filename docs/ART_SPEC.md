# Environmental art and visual specification: the islands

Status: specification (no `src/` change yet). Area: design. Builds on `docs/STYLE.md` (the look), `docs/WORLD_REDESIGN.md` (strata, gates, clue ledger, tide/night rules: **nothing here may change them**). Authors: an aesthetics pass and an independent readability/rules audit, reconciled in section 8.

Medium (fixed): everything procedural, the same chunky kit (Builder primitives, 4x4 atlas, vertex colours with a dark set `colorB`, glow texels, Bayer dither, vertex snap). "Biomechanical, Beksinski, Giger" is translated into that kit: silhouette, repetition, bone/rib/pipe forms, erosion, wet black lower thirds. It is never a different art style.

Zones: **Surface** = S0-S2 (r<1150, dread 0-0.45), **Sub-Stratum** = S3-S4 (1150-1950, 0.45-0.82), **Abyssal Core** = S5 (1950+, 0.82-1).

---

## 1. Expert visual baseline

What a premier art director would do beyond "make it look nicer":
1. **Silhouette before surface.** Beksinski's dread is a horizon shape you read in half a second; colour and detail are secondary. Each stratum owns a shape family.
2. **Wrongness by repetition and absence**, not by monsters: forms spaced too evenly, everything leaning one way, no birds, no foam, no weed. Giger's trick is the human form half-recognised in a machine; here: ribs, vertebrae, ducts, sockets, never faces or bodies.
3. **A scale contrast anchor.** One small human-scale object (a table, a lamp, a pier hut) against a large leaning form, so scale is felt.
4. **Light as the only narrator.** One light source per place, with a behaviour (steady, flicker, pulse, lit by day) that tells you what kind of place it is.
5. **Controlled palette collapse.** Colour fatigue (greens to yellow-grey, whitewash to bone, shadows to violet) before any new hue; magenta reserved for the deep.
6. **Bright reading first.** By day at low dread every strange place is a pleasant landmark; the strange reading arrives by night, dread or tide.
7. **Tell the world rules visually**: a gated place shows its blocker before it blocks; a tide-only place looks different when the tide is wrong.

## 2. Raw visual material

| Element | Source in the kit | Use |
|---|---|---|
| Organic mineral | icosahedron blobs, 6-sided columns, tapered stacks | eroded stacks, vertebra spines, rib pairs |
| Erosion | wet-black lower 0.7 units (grime shader), white barnacle blobs at the waterline | the sea level is "wrong": roofs, piers, chimneys too low |
| Dynamic lighting decay | glow texels (ignore light level), additive `mats.glow` quads, `mats.beam` cone, fog colour | one lamp per place; light weakens as dread rises |
| Volumetric refraction (faked) | open additive cones from a window or gap; flat additive pool discs on the water; mist-band ring quads | god rays, spore pools, sea mist round the foot |
| Material fatigue | `colorB` pairs, tinted bone/stone/white/void tiles | greens to `#4a5a40`, sand to `#b0a890`, whitewash to `#e4dcc4` |

Hard facts that shape all of it: islands swap to the dark builder **D** only above dread 0.5, so S0-S2 never show D. Wrongness there lives in `colorB` recolours inside builder A, glow texels, or tide/night-gated visibility. Real D props start at S3. The atlas is full: **zero new tiles**.

## 3. Methodology and toolkit

- **Value-first review:** every place is judged in greyscale and as a pure silhouette (no colour) before colour is approved.
- **Scale-contrast matrix:** per place, the tall feature height H and the human-scale anchor; a feature reads at 4 px when `D <= 37 * H` (camera 62 deg, 180 rows, `px = 150 * H / D`).
- **Frequency layering:** large form (silhouette), medium form (ribs, bands), small form (marks, barnacles). Nothing under 1 px beyond 150 units.
- **Colour theory for dread:** warm-saturated (S0) to cold-desaturated (S3) to bruised teal (S4) to bone on violet-black (S5); one hue family per stratum, magenta only S4+.
- **Light budget:** steady vs flicker vs blue vs magenta are four distinct light classes; each place owns at most one steady and one flicker.
- **Redundancy rule:** no clue is carried by colour alone.
- **Tooling:** headless Chromium screenshots at fixed positions/times/dread (`window.__game`, URL flags `autostart=1&fresh=1&shot=1&nomate=1&dread=&time=&x=&z=`), pixel/luminance analysis in Python.

## 4. Validation criteria (definitive)

| # | Criterion | Pass |
|---|---|---|
| A1 | Gate before block: lagoon reef, Ribs breakers, Halved fog dome visible from 1.5x their barrier radius, day and night | blocker >=0.15 L and >=4 px wide in all shots |
| A2 | Open vs shut gate differs without text | pixel diff of the ring region >=8% |
| A3 | Tide/night-only place: condition off vs on | >=3 px blob difference or >=0.15 mean L, also in greyscale |
| A4 | Contrast at 60% of the stratum's fog distance | place vs fog >=0.08 L (day S0-S2), >=0.04 (S3-S4), >=0.02 (S5/night) |
| A5 | Pixel size | >=4 px high and >=5 px wide at 170 units (spyglass 0); >=2 px at 330 |
| A6 | Night set (new moon, lantern 2, 60 units) | lighthouse, window, surf and fire each >=3x3 px at L>=0.2 |
| A7 | Lamp out (`oil = 0`) | glow sources still >=3x3 px; nothing else lighter than fog +0.02 |
| A8 | Clutter in a 90 degree arc at night | <=3 bright blobs (S0-S2), <=2 (S3+) |
| A9 | Far labels | <=2 visible; none beyond 85% of fog distance; none for the Table before `d3Open` |
| A10 | Seam stays masked | no place pixels in the seam frames; `lostK` >=0.9 by 2 s |
| A11 | Sunken Street reads as shallow roofs | ridges visible at low tide, hidden at high tide; never magenta |
| A12 | Strata distinct at a glance | in a blind 6-image test (one per stratum, no HUD) reviewers sort them correctly >=5 of 6 |
| A13 | Region distinct at a glance | blind test of five region silhouettes >=4 of 5 |
| A14 | Progression cues add geometry/light only | no new DOM element (toast, badge); pixel diff >=2% |
| A15 | Budgets | see section 7; scene >=30 fps in swiftshader at the place |
| A16 | Tone lint | 0 readable text/numerals/glyphs on models; 0 eyes, lids, sleeper or seated-figure shapes |

A12 and A13 are the human tests; the rest are automatable (checklist in section 9).

## 5. Zone specifications

### 5.1 Surface (S0-S2): "the bright lie"
- **Theme:** used, salt-bitten Caribbean. Wrongness leaks in as colour fatigue only.
- **Palette:** sky `#3a86e0`/`#bfeaff` easing to `#5490d0`/`#d6e8e0`; fog `#bfeaff` to `#d2e4dc` to `#c9d8c0`; sand `#ecd69c`; S2 accents bone-whitewash `#e4dcc4`, tide-line stain `#8a7a58`, violet shadow `#4a2f66` (as `colorB` of any grey).
- **Fog:** existing curve (about 330 to 250 far). No change.
- **Light:** the sun; night is warm lamp pools and lit windows `#ffd23a`/`#ffc060`. **No magenta.**
- **Silhouette:** round, friendly, palms in clumps; "too straight" lines only at the far end of S2 (a row of identical posts).
- **Materials:** grime, barnacles, rope; `colorB` pairs push to violet-grey (greens `#3c7a32` to `#4a5a40`, sand `#ecd48f` to `#b0a890`).
- **Shape/colour/light tell by stratum:** S0 rounded cottages and blob palms, warm steady windows; S1 long low horizontals, posts, piers, bleached wood, orange fire flicker, lamps in pairs; S2 blocky official masses with square windows, cream stone and brass, steady yellow rows, first blue lamp.

### 5.2 Sub-Stratum (S3-S4): "the Slack and the Dim"
- **Theme:** things that were once human, set slightly wrong. Bone-pale limestone eroded into rib and pipe forms; the sea level is wrong (roofs, piers, chimneys too low, wet-black lower thirds). S3 sallow and windless, S4 bruised teal with fog, lit empty windows and the magenta beam.
- **Palette:** S3 sky `#5a5f9c`/`#c4d196`, fog `#a9bb86`, ground bone `#c8c0a0`, ribbed stone `#9c9684`, wet-black `#2a2e2c`, mildew `#5a6a3c`, rust `#7a4a30`. S4 sky `#24243e`/`#6a7c76`, fog `#4a5a58`, ground `#6e7468`, wet-black `#1c2224`, bruise `#4a3a5a`, sick lamp `#c8e070`; magenta `#ff30c8` only for the beam and one glow per place.
- **Fog:** existing far values hold (about 250 to 190 across S3, 190 to 150 across S4). Only the **shape** changes: flat through S3 (the Slack is still), then a steeper ramp across 0.58-0.66 so entering S4 feels like a ceiling coming down. Never below the existing keys (readability budgets were computed on them).
- **Volumetrics:** god rays are open additive cones (reuse the beam cone, 6 sided): S3 pale green `#d0e890`, opacity about 0.08, hung from a window or sky-gap, steeply down; S4 the existing beam in magenta plus at most one fixed shaft. **Max 2 cones and 2 mist rings per island**; mist ring = flat vertex-coloured quad ring at y 0.5, fog colour, about 24 triangles, swallowing the foot of the silhouette.
- **Silhouette:** ribs, spines and columns in rows; blind-slit towers; roofs at the waterline; chimneys like throats; islands longer and lower with one tall thing. Tell by stratum: S3 leaning and tilted forms, single masts, half-things, very slow light pulse, a lamp lit by day; S4 tall thin dark towers, drowned roofs, rails, lit windows with nobody, single steady white, no warm light.
- **Materials:** `TILE.bone` and `TILE.stone` heavily; wet sheen = dark vertex band on the lower 0.7 units plus a 1-2 px pale highlight row above; white barnacle band at the waterline.

### 5.3 Abyssal Core (S5): "the Lid"
- **Theme:** biomechanical bone cathedral. Everything leans the same way (towards the centre, towards the table), repeats too evenly, and is the colour of old teeth, scar and rust. Pipes, ribs, vertebrae, sockets, ducts: not gore.
- **Palette:** sky `#06030e`/`#5a1a50`, fog `#2a1034`, bone-grey `#8a7e78`, scar `#6a3a40`, rust-black `#241014`, duct violet `#4a2f66`, wet `#12080e`, glow magenta `#ff30c8`/`#ff70d0`, a tiny pale `#e8d8f0`.
- **Fog:** existing 25/150 (not below 22).
- **Light:** no sun. Magenta glow texels in sockets, vents and slits; one flat additive pool disc on the water per place; the beam. **At most 4 glow quads per place.** Steady only, no flicker.
- **Silhouette:** flat, horizontal, near-featureless with leaning spines (4-5 sided cylinders tilted 0.2-0.4 rad towards the centre), ribbed arches, throat chimneys, a fused-ring ridge on the horizon. Table-height.
- **Materials:** colour pairs bone to scar, white to rust-black; `TILE.void` only as small sockets; `TILE.skull` never on terrain.

### 5.4 Formation vocabulary (all existing Builder calls)
| Form | Build | Tris |
|---|---|---|
| Rib pair | `cyl` r 0.16-0.25, 4 sides, h 2-5, tilted 0.4-0.8 rad, mirrored | ~16 |
| Vertebra spine | 5-8 `blob` stacked, y squashed 0.4, alternating bone / scar | ~20 each |
| Throat / pipe | `cyl` 6 sides, r 0.6-1.2, h 3-8, dark cap | ~12 |
| Eroded stack | 3 stacked 6-sided `cyl`, tapering, offset 0.2, banded bone / wet-black | ~36 |
| Socket | `box` 0.8x1.1x0.1 `TILE.void` + glow quad 0.3x0.5 | ~24 |
| Barnacle band | 8-12 white `blob` 0.2 at the waterline | ~200 total |
| Limestone arch | 2 columns + lintel, leaning | ~40 |
| Mist ring | flat ring quads | ~24 |

## 6. Per-place specification (all 20)

Columns: far silhouette (the top-line a player sees first) / near detail / variants / **L** the one light / **W** the wrongness (appears only at its stratum's dread, implied) / progression cue after the clue is seen (geometry or light only).

| Place (stratum, region) | Far silhouette | Near detail | Variants (day / night / dread) | L | W | After clue seen |
|---|---|---|---|---|---|---|
| **crag** Grey Tooth (S0, home) | tall grey tooth with a notched arch, H15 | basalt columns, guano, cairn | day grey-white; night black cut-out plus a pale guano band at the top; dread stone `colorB` `#5a5262` | none | gannets in a perfect row on the arch lintel, all facing the water; at dread none | a third post stub on the transit line at low water |
| **bell** Drowned Bell (S0) | thin leaning tower (lean >=10 deg) on a stack | belfry, roofs at the waterline | ochre / black / roofs to wet-black `#2a2e2c` | tiny gold bell texel | roof ridges evenly spaced (step 0.42), exact in dread tone | a second lit window under the water |
| **grove** Hollowgreen (S0) | dark green lump with a white fall; pale canopy top-line row | layered blob canopies, pool, clearing | greens / one pale fall streak / greens to `#4a5a40` | none | the rope swing hangs still while the canopy bobs | clearing table's cloth lightens |
| **keeper** Wick's Rock (S0) | **red/white** lighthouse | cottage, boat, washing | beam; beam magenta at dread (exists) | the beam | one more cloth on the line than houses have people | none (home anchor) |
| **ribs** (S1, reef) | masts in a ring of white surf; mast extended for distance | rib rows, figurehead | sand/ribs; surf streaks; ribs to bone `#d8d0c0` | none (surf is the light) | surf streaks all the same length (even) | surf thins when Hull>=2 (open gate) |
| **lagoon** Glass Lagoon (S1, free) | flat reef ring, palms 5 | coral, chest, black knuckles | pink/teal; dark ring + faint cyan; coral bleached `#a89aa8` | chest gold texel | coral in a fixed 4-colour cycle | gaps widen when Rudder>=2 |
| **broken** Halved Isle (S3, lantern) | white fog dome round a cut cliff (cut faces Tama) | banded cliff, half house, table | ochre bands; dome takes fog colour plus a faint pale edge 2 px above the horizon; bands to `#8a7e78`/`#6a3a40` | table lamp (gold) | slabs of the missing half tilt towards the house table (3 spines, D builder) | dome opacity lower at Lantern 2 (exists) |
| **customs** Customs Pier (S1, crown) | long grey pier, hut roof white-grey, flag pole 5 | flag, ledger desk, two cups | grey boards; hut window plus one steady lamp at the pier end; flag `#4a6ac0` to `#3a3a48` | hut window / pier-end lamp | flag points into the wind from the wrong side | second cup on the desk becomes sand-coloured |
| **teo** Teo's Sandbar (S1, free) | thin line of firelight; fire built 1.6 high from 3 stacked blobs | person, fire | sandbar; **fire only on calm night**; person to grey | the fire (flicker, orange) | no smoke; sand round the fire dry while the beach is wet | the 12-15 unit gap to Ilse's matching light becomes visible from the lane |
| **ilse** Ilse's Rock (S2, free) | rock with a lamp pole 3.5 tall | stool, person, fire | as teo, **mirrored** distance from her rock | the matching fire/lamp | same distance to her rock as Teo's to his bar | as teo |
| **cup** The Cup (S1, free) | table plus cloth on a 3.5 pole | table, lamp, two cups | **high tide: pale beach bar and clear path; low tide: reef knuckles between** (R4); cloth cream `#e4dcc4` | lamp (gold) | both cups the same height; at dread one cup recolours to sand and vanishes | one cup greyed to ground tone |
| **hammock** Hammock Isle (S2, free) | palms with colour slashes (coral, gold, blue) | hammocks, sleepers | bright cloth; dark; cloth to grey-violet | none (night = audio) | every hammock at the same height and tilt | hammocks sway slowly (~0.15 Hz) |
| **namewall** Name Wall (S2, reef) | pale mass, top edge stepped in 3 ledges, tilted | marks <=2x1 px (never rows implying text) | white; pale rectangle; bone `#e4dcc4`, top row `#7a2a2a` | dusk sliver on the top row | the top row is a glossier black than the rest | wet rows creep one row up per question level |
| **archive** Governor's Fort (S2, crown) | pale box, flag pole 5, window 1.6x1.8 | parapet, slit windows | pale; one lit window; window `#f0d070` to `#c8e070` | the window | every other slit is dark, counted to match the lit row | a second window lit when Q4 rises |
| **press** Oil Press (S2, lantern) | **fat, shorter** chimney (not the lighthouse silhouette), one steady smoke plume | brick, seaward doors | brick; blue pool; lip to rust-black | blue lamp as an additive `mats.glow` quad, 1.6 high, **steady** (see 8) | chimney leans 0.04 rad against the slope; seaward door an unlit dark box | the doors read as two dark boxes on the water side |
| **wreck** Throwers' Wreck (S2/S3, reef) | broken hull, mast with a rag to 7 | hull box, mast | **high water: hull awash (1.2 to 0.3); low water: deck exposed** (R4); hull to wet-black | none | the rag points against the current (flipped quad at dread) | the cabin chair turned to the door |
| **ledger** Keepers' Ledger (S3, lantern) | **white/black banded** lighthouse (not brick) | window, ledger | lamp lit **by day and night, steady**; beam magenta at dread | the lamp | the beam never rotates; a pale smear under the window | none |
| **tower** Dark Tower (S3/S4, lantern) | black tapered 8-sided tower >=12 tall, >=4 wide; **2 rows of horizon silhouette** | door box, slit | black on fog; slit glows `#c8e070` **only when open (calm night)**; door slightly lighter once seen | slit glow | a second slit above the first at S4 (D builder), looking up | door lighter on calm nights |
| **street** Sunken Street (S4 lie 0.74, drowned) | **gabled** roofs (pitched ridges 0.3-1.0 above the waterline at low tide) | 9 roofs, 2 with window quads | roofs plain; low tide shows more, high tide hides 60%; never magenta | window quads on two roofs (yellow) | ridges all aligned radially; one chimney per three roofs | the blue door visible within 40 units, still at lowest tide only |
| **table** Table by the Water (S5 lie 1.0, drowned) | table top 3.5 wide, white, the brightest object on the map | two chairs leaning towards each other | black sun; chairs pale; table `#e8e2d4` | pale glow pool (additive disc) | the far chair's seat wet-black | none |

**Silhouette collision pairs resolved:** thin verticals (keeper red/white brick, ledger white/black banded, press fat chimney with smoke, bell leaning, tower black tapered); pale masses (namewall stepped, archive with flag pole, crag arch, halved dome); flats (ribs mast + surf ring, wreck mast 7, customs pier flag, cup pole, teo fire stack, street gables, table plane); palm blobs (grove dark, hammock coloured slashes, lagoon flat ring).

## 7. Rolled (generic) islands: zone behaviour and budgets

Rule: change `colorB` per kind (a `KIND_DARK` table in `world.js`), never add meshes in S0-S2.

| Kind | S0-S2 (`colorB` only) | S3-S4 (D visible) | S5 |
|---|---|---|---|
| sandbar | sand `#ecd48f` to `#b0a890` | monolith + bone blob reads as a vertebra; mist ring | leaning monolith, sand `#2a2e2c` |
| jungle | greens to `#4a5a40` | mushroom props, hanging moss | canopy to scar `#6a3a40`, few survive |
| rocky | `#8f8b84` to violet-grey `#5a5262` | monolith 4.5 tall | bone-grey `#8a7e78`, columns dominate |
| volcano | smoke stays | lava to magenta (exists) | smoke to `#2a1034` ("breath") |
| atoll | sand ring | void column in the lagoon (exists) | ring to bone, lagoon to violet |
| mangrove | mud, herons | moss + spore dots (exists) | near-black canopy, no herons |
| harbour | full village life | villagers hidden, totem (exists) | colour pairs to scar; windows keep glow |

Budgets (the **stricter** of the two source figures wins):
- Hand-made place: at most **+600 triangles** and at most **+30% of its present triangle count**, whichever is smaller; each new prop group <=120 triangles; <=3 groups per place; <=4 draw calls (<=7 with beam/glow/mist).
- Rolled island: <=2,000 triangles, <=4 calls; D props <=15% of A; **zero new triangles in S0-S2**.
- Screen: islands <=120k triangles and <=90 calls; god-ray cones and mist rings <=4 per island, culled beyond fog far.
- Textures: **zero new tiles**. Shaders: no new materials.
- Style gate for every place: 2-3 colours per mass, no thin lines (<2 world pixels), no smooth alpha ramps on quads, crooked on purpose.

## 8. Design rule guard: the rules and how conflicts were resolved

### 8.1 Hard rules (testable)
- **R1 Gate before block:** a gated place shows its blocker from >=1.5x its barrier radius, in the kit the gate uses (reef knuckles, white surf, fog dome). Art adds no blocker that does not block and hides none.
- **R2 Open reads differently from shut,** not by colour alone (wider gaps, thinner surf, lower dome opacity).
- **R3 Strata walls are fog, never geometry.** No wall, buoy line, sign or popup; fog visible >=160 units before the lost state.
- **R4 Tide/night-only places change when the condition is off** (geometry or light, >=3 px or >=0.15 L), and the `no:` lines in `places.js` stay true to what is seen.
- **R5 D1 reads as shallow roofs** (gables, not slabs; darker than the sea, never magenta, never obviously wrong from far).
- **R6 The seam stays masked:** no landmark seen on both sides of the seam; nothing taller than 6 units where line of sight crosses it.
- **R7 No visual states lore:** no readable text, numerals, runes, eyes, lids, sleeper shapes, a seated woman, or a figure in the water.
- **R8 No popups from art;** seen clues change geometry/light only.
- **R9 No clue is colour-only** (shape, size, position or light behaviour too; greyscale contrast >=0.15).
- **R10 Bright reading first:** pleasant by day at dread <0.3.
- **R11 Kit and grid:** Builder primitives only; yellow glow friendly, magenta glow only for horror.
- **R12 No magenta before S4** on a hand-made place (exceptions: the Sunken Street never; the Table, S5).
- **R13 No beacons on loot or visit points.**
- **R14 The Table only exists once `d3Open`:** model and far label hidden before.
- **R15 The Halved Isle's cut faces Tama;** the sunken half stays dark and below the surface.

### 8.2 Readability (numbers)
Luminance gaps and fog distances as in A4; pixel sizes as in A5 (`px = 150*H/D`; every place needs a vertical feature >=3.5 high or a lit source); night legibility is lit sources, white surf and fires (new moon in S3: about 50 units of sight, 16 with the lamp out; lantern adds 15% per level); at most 3 glowing sources on screen in S0-S2 and 2 in S3+; at most 2 far labels, fading by fog (alpha x (1 - smoothstep(fogNear, fogFar, d))); the lantern's pool (a flat warm ellipse on the water) must never be mimicked by a place's lamp (a rectangle above the waterline); the chart glyph stays one icon <=11 px in the place's region colour family.

### 8.3 Conflicts and resolutions
| Conflict | Resolution |
|---|---|
| Ribs: aesthetics proposed a gap in the surf ring facing home | **Dropped:** a gap reads as a way in and breaks R1/R2. Wrongness is even streak length instead. |
| Keepers' Ledger lamp "lit by day, dark by night" (needs a gameplay-adjacent `setLit` change) | **Lit by day and by night, steady.** Wrongness is the beam that never rotates. Keeps night readability and the bright reading (R10); no gameplay code. |
| Oil Press blue lamp as a glow texel fails the glow test in `psx.js` (would dim at night) | Additive `mats.glow` quad, 1.6 high, steady; yellow lamps elsewhere flicker or are rectangular, so the class differs by behaviour and shape too (R9). |
| Palette: aesthetics wanted a new key at dread 0.62 | **No new `KEYS` entry** (keys are equally spaced: adding one shifts every stage and gameplay's dread keys). A per-stratum tint and the S3/S4 fog ramp are applied after `sampleStage`. |
| Budgets: 3,500 triangles per place vs +30% / 120 per group | The stricter applies (section 7). |
| Teo/Ilse glow present by day | Glow only on calm night (R4); fires are taller (1.6) and a matching pair. |
| Tower "second slit at S4" and slit glow | Glow only when open (calm night); the second slit is D-builder only. |
| Table magenta pool vs "no magenta before S4" | The Table is S5; allowed (R12). It is hidden until `d3Open` (R14), done by toggling its prop group, not by rebuilding the island. |
| Gate widening on lagoon/ribs when the upgrade is met | Two prop sets (shut, open) toggled by visibility from `state.upgrades`; no rebuild. |

### 8.4 Crossing areas (each owner edits their slice)
- **Gameplay:** `places.js` `labelsTick` (labels fade by fog; the Table label hidden before `d3Open`) and the seen-clue/question-level hooks that toggle the progression cues. Cues read `state.story.seen` only; they add nothing to the ledger.
- **Design:** `landmarks.js` (`lmDecor`, `lmColor` dread variants), `world.js` (`KIND_DARK`, mist rings, D-builder spines), `palette.js` (post-sample zone tint and fog ramp, **shared with gameplay: do not add keys**), `daynight.js` (night lamp classes).
- **Audio:** a light class that changes (the blue steady lamp, the fire pair) should keep its sound in step; the Hammock Isle sway and the Two Players gap are audio's, not art's.

## 9. Validation checklist (headless Playwright)

Setup: Chromium `/opt/pw-browsers/chromium`, swiftshader, URL `autostart=1&fresh=1&shot=1&nomate=1&dread=&time=&x=&z=`. Place the ship by setting `__game.ship.pos` and `heading` 120 units from a place on its approach bearing. Use `__game.setDread`, `setTime`, `setCam`, `weather`, `places.fog`, `oilState()`, `tideAt()` (to force a tide, choose the `state.time` that gives it). Image checks: a small Python/PIL script on the screenshots (relative luminance of pixel blocks).

| # | Check | Method | Pass |
|---|---|---|---|
| V1 | Gate before block (A1) | lagoon, ribs, halved at 1.5xR, day D0.1 and night | blocker >=0.15 L, >=4 px wide; ship still free beyond R |
| V2 | Open vs shut (A2) | same spot with rudder/hull/lantern 2 vs 0 | region diff >=8% |
| V3 | Condition off vs on (A3) | teo, ilse, tower, cup, wreck, street at 100 units, time 0.5 vs 0.0, calm, tide high vs low; also greyscale | >=3 px blob or >=0.15 L |
| V4 | Contrast (A4) | shot at 60% of the stratum's `fogFar`; median L of the place box vs fog | thresholds in A4 |
| V5 | Pixel size (A5) | 170 and 330 units, spyglass 0, day; bbox of non-sky/non-sea pixels | >=4x5 at 170; >=2 at 330 |
| V6 | Night set (A6) | time 0, dread 0.5, lantern 2, 60 units | lighthouse, window, surf, fire each >=3x3 px at L>=0.2 |
| V7 | Lamp out (A7) | `state.oil = 0`, night | glow sources hold; nothing else above fog +0.02 |
| V8 | Clutter (A8) | label bright blobs >=3 px (scipy) in a 90 degree arc at night | <=3 / <=2 |
| V9 | Labels (A9) | `.farlabel` count and opacity at spyglass 1 and 2 | <=2; none beyond 85% fog; none for the Table before `d3Open` |
| V10 | Seam (A10) | ship at r 1960, angle 40 deg, heading east, 6 s, frame every 0.5 s | `lostK` >=0.9 by 2 s; no place pixels |
| V11 | Street (A11) | tide -0.6, -0.2, +0.4; shots at 40 and 80 units | ridges at low tide, hidden at high, blue door only within 40 |
| V12 | Tone lint (A16) | grep `landmarks.js` for new strings; scan for `TILE.skull`/`TILE.void` outside the tower door and D>=0.75 | 0 banned words, 0 stray tiles |
| V13 | Palette lint (R12) | parse hex per place | magenta (R>0.8, B>0.6, G<0.4) only in S4+ places and the Table |
| V14 | Progression (A14) | set `state.story.seen[...]`, reload at the same position, diff | >=2% diff; no new DOM node (no toast, no badge) |
| V15 | Budgets (A15) | count `A.box/cyl/blob` per place; read vertex count from `world.islands`; frame rate in swiftshader | within section 7; >=30 fps |
| V16 | Chart | open the Map tab, screenshot | glyph present for discovered places; fog dither at gate radius unchanged |
| V17 | Blind tests (A12, A13) | six per-stratum images, five region silhouettes, no HUD | >=5/6 and >=4/5 sorted correctly |

## 10. Build order (for the design owner)
1. `world.js`: `KIND_DARK` table; `palette.js`: post-sample zone tint and S3/S4 fog ramp (no new keys).
2. `landmarks.js`: silhouette fixes (height >=3.5 features, collision pairs), then per-place `colorB` wrongness for S0-S2, then D-builder forms for S3+ using the vocabulary in 5.4.
3. Gate states (two prop sets for lagoon/ribs), tide/night states (cup, wreck, teo, ilse, tower, street gables), press additive lamp.
4. Progression cues (hooked by gameplay to `state.story.seen`), Table visible only after `d3Open`, far-label fog fade.
5. Mist rings and god-ray cones for S3+, S5 pool discs.
6. Run V1-V17; then add a short "Biomechanical zones" pointer in `docs/STYLE.md` (done now) and move the section into STYLE.md proper when built.
