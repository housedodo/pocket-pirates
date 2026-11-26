# Visual audit: the world as rendered (2026-11-26)

Scope: sky.js, weather.js, ocean.js, seawater.js, psx.js (incl. PostFX), palette.js, daynight.js, fauna.js, systems/shallows.js, regiondecor.js.
No source edited. Screenshots (headless, swiftshader, ship at 200,200, `story.free` on) are in
`/tmp/claude-0/-home-user-pocket-pirates/b534b7f9-56fe-56c2-b270-c63faa4dabed/scratchpad/audit_world/` (names below).
Line numbers are in the files as of this commit.

## Summary

The recent sky work holds together better than expected. Noon clear (01, 11) is the cleanest image in the game: dome, fog, horizon and sea
meet, clouds are dithered in the sky's own colours, rain in a storm (02) takes the haze colour and the storm bank reads as weather.
The problems are the things that were **not** moved into the dome or the PS1 pipeline: the sun and moon discs (drawn over any cloud
cover), the cirrus (smooth-alpha faceted slabs that read as pale lozenges on the horizon), the lighthouse beams and eye constellation
(unfogged, un-depth-tested), and a handful of real bugs (a seam in the storm bank, `cloudSpeed` never read, halo/corona/meteor drawn over
the foreground). Night is the weakest mood: the painted clouds are the brightest thing in the frame, the 15-bit quantise crushes the dark
bands, and rain brightens a dark sea. Birds float above the ground when "sitting" and the whole flock swaps model at once.

Ranked by visual impact (1 = most visible).

---

### 1. The sun (and moon) is a flat disc on top of any cloud cover
`src/sky.js:167-172, 310-321` (sun renderOrder -20 over the dome at -30; `sunHolder.visible` only checks elevation)
Overcast at noon (`05_overcast_sun.png`): a full-strength yellow disc floats in front of a uniformly grey layer; the same at dread 0.6
(`09_dread6_noon.png`) and for the moon behind night cloud (`12_moon_cloud.png`). It breaks the "painted into the dome" rule that the
clouds were built on. Rain and storm are only spared because the sun is below the stage's dark sky by luck of colour.
Fix: in `update` fade the disc and corona with `1 - cover*0.9` (and by the dome's cloud mask if you want holes: sample the same fbm in a
2-line shader on the sun material). Effort S (fade) / M (mask).

### 2. The cirrus is the one smooth, faceted, un-dithered thing in the sky
`src/sky.js:241-250, 378` (nine flattened icosahedra, MeshBasicMaterial, alpha 0.55, no snap, fog:false)
In `01`, `09`, `11` they are crisp white anti-aliased streaks with a gradient: the only smooth-alpha pixels against the dithered dome. Those
near the horizon (d up to 530 at y 150-190, so about 16 degrees up) foreshorten into pale flat lozenges that sit on the horizon like
a lens or a UFO (`11_bank_day.png` at 400,298; `10_night_storm_bank.png` at 400,297). They take no sickly tint at dread (white lines in the
green sky of `09`) and keep 30 percent opacity at night.
Fix: draw the cirrus in the dome shader as a third noise layer stretched along the wind (dithered, in uCLit); delete the meshes.
Effort M. Cheaper S fix: fog:true, `alphaTest` + dither via `onBeforeCompile`, and clamp their elevation above 25 degrees.

### 3. Night: the painted clouds are the brightest object in the frame
`src/sky.js:372-376` (uCLit from `stage.cloud`, shade from horizon/top, never scaled by night or the moon)
`04_night_clear.png`: the cloud body is about #3c4a78 against a sea of about #0f3a3c and an island of #14141c, and nothing in the sky
lights it (the moon is out of frame). `12_moon_cloud.png`: the clouds are paler than the sky between them. By day this is the right
look; at night with the "Pitch dark" default it reads as a lit overcast. The rule in STYLE is that only lamps, windows and the moon stand out.
Fix: multiply `uCLit` by `(0.45 + 0.55*moonUp*moonLight)` where moonLight is `NIGHT_VIEWS[view].light`, and darken uCShade to the sky. Effort S.

### 4. Storm bank has a hard vertical seam when it stands to the west
`src/sky.js:146-152` (`az = atan(vXZ.y, vXZ.x)` then `vn(az*5.0 ...)`, `vn(az*9.0 ...)`)
`atan` jumps from +pi to -pi along the -x direction, and the value noise is not periodic, so the bank's top line and its rain veils step
by a whole noise cell there. Visible whenever the wind makes the bank stand within about 50 degrees of due west (a sixth of the compass).
Not caught in my shots (bank direction was not west), found by reading. Fix: sample noise on a circle, `vn(vec2(cos(az), sin(az))*k + ...)`
or use `vXZ*k` directly; same for the shaft noise. Effort S.

### 5. Halo, corona, eye constellation and meteor draw over the ship and islands
`src/sky.js:195-197 (haloMat), 168-171 (coronaMat), 212 (eyeMat), 255 (meteorMat)`: transparent with `depthTest:false`
Opaque things draw first, then every transparent one with no depth test, so these overlay anything between you and the sky: the moon halo
ring over a mast, the black-sun corona over the rigging at dread 0.78+, the eye and its dotted ring over a headland (`07_night_dread9_eye.png`
has the eye tilted down to the horizon, where it will cross islands), a meteor across the sail. The stars were fixed for exactly this reason
(comment at `sky.js:196`); these four were not. Fix: `depthTest:true` with the sky group at `renderOrder` before the sea but they sit at
radius 900 inside the dome, so just `depthTest:true` (the dome has no depth write). Effort S.

### 6. `stage.cloudSpeed` is set and never read: storm clouds do not scud
`src/weather.js:157` sets `1 + 5*st`; `src/sky.js:285` drifts the painted clouds at a constant `0.006*dt`.
The comment on the weather line promises "scudding clouds"; the painted layer moved at the same crawl in `02_noon_storm`. Free atmosphere.
Fix: `du.uOff.value.x += 0.006 * dt * stage.cloudSpeed` (and a little shear). Effort S.

### 7. Rain at night and rain rings are too bright for a dark sea
`src/weather.js:162` (streak colour = fog lerp horizon lerp 22-32 percent white, no night term); `src/ocean.js:261` (ring `outc*1.25 + 0.06`, the flat 0.06 is not scaled by `uLight`)
By day the streaks match the haze (`02`). At night the haze is near black, but the white lerp is a fixed 22-32 percent so each streak is
about 0.3 grey on 0.03 water: clearly brighter than the moon-lit sea (`10_night_storm_bank.png`: bright needles over black). In a storm
the density plus the 0.85 opacity makes a white sheet in front of a slate scene. Rings add an absolute 0.06 at night, which doubles the
brightness of a 0.03 sea. Fix: scale the white term by `(1 - 0.7*night)` (pass `tod.night` to `apply`, already there) and `outc*1.25 + 0.06*uLight`.
Effort S.

### 8. 15-bit quantise crushes the night's dark bands
`src/psx.js:196` (`floor(c*31+0.5)/31`) with night sky `#04061a` to `#111a3a` (`daynight.js:19`)
The dome's seven dithered bands at night span about 13/255, i.e. 1.6 quantisation steps: they collapse to one or two flat tones with a
hard edge (visible as broad blocks at the horizon in `06_night_rain.png` and `10`). By day the same 7 bands are fine. The dither amplitude
(1/28) is one full step, so it cannot hide it.
Fix: quantise in a gamma-ish space (`c = pow(c, 0.8)` before and `1/0.8` after) or raise the dark end of the sky ramp so it spans three steps. Effort S.

### 9. Lighthouse beams ignore fog, haze, rain and day
`src/psx.js:151` (`mats.beam`: `fog:false`, `diffuseColor.rgb /= max(uLight, 0.05)`), `src/world.js:1906`, opacity set in `main.js:1409`
A 46-unit cone, seen from far, is a flat pale bar above the horizon; it is the same size and brightness at 300 units in thick storm fog as
it is next to you, and shows at noon at 0.1 opacity. In `02` (noon storm), `03`, `04`, `06`, `10` the same two bars sit above the horizon
(left at 160,260 and right at 700,262 in 02/03). Fix: let it take the fog (`fog:true`, keep the `/uLight` so it stays lit) and fade by
distance with the farLight rule; hide by day above a clear sky. Effort S.

### 10. The sea does not carry the sky at dusk (or any time)
`src/ocean.js:112-215` (no sky/horizon term; only `uDeep`, `uShallow`, `uSunColor` glints)
`03_dusk_rain.png`: pink sky, lilac fog, and a sea that is the same dark teal as at noon. Same in `09`: the sky is sick green and the sea
stays inky teal to the horizon line, then a light haze band above it (a hard step). Palette makes the step: `palette.js:18-19` horizon
`#c4d196` vs fog `#a9bb86`, `palette.js:24-25` horizon `#6a7c76` vs fog `#4a5a58`; the dome is lighter than the fog the sea fades to.
Fix: a cheap fresnel term (`pow(1 - dot(n, V), 4)`) mixed to `fogColor` in the sea fragment, and bring `skyHorizon` and `fog` within 10 percent at dread 0.5-0.75. Effort S/M.

### 11. Random pale "banks" in open sea look like the real sandbanks
`src/seawater.js:50-55` (`bankK`, pale sandy green patches with `uSea.y` for Free Cays) vs `src/systems/shallows.js:182` (real banks, negative radius)
The owner just decided shallows exist only where the story needs them (PROGRESS 2026-11-26). The open-sea noise banks are lit exactly
the same: pale sand-green, shallow-water tint, no grounding. A player who learned "pale water = rowboat" will meet false positives
(`11_bank_day.png`, patches at lower left). Fix: tint the decorative patches differently (cooler, no sand yellow, deeper) or remove them
outside Free Cays. Effort S.

### 12. Sitting birds hover and have no legs
`src/fauna.js:211` (`y: gy + 0.55`), `49-60` (body blob at y -0.05, no feet)
A gull sits 1.25x scale, body bottom about 0.33 above the sand/grass with nothing under it: a white lozenge hovering. Crows on the rail the
same. Fix: sit at `gy + 0.2` and add two 0.05-wide dark leg boxes (hidden in flight by scale, or only in a third "perched" mesh). Effort S.

### 13. The whole flock swaps model in one frame
`src/fauna.js:164` (`kind = crow > 0.5 ? 'crow' : 'gull'`)
At dread about 0.4 every bird, including ones sitting or mid-turn, changes from a white gull to a black crow at once, and the old
instances are zeroed. It is a pop, not the "gulls thin out, then crows gather" of the skill's text. Fix: per bird, `isCrow = hash(i) < crow` so the
flock mixes over 0.3-0.55. Effort S/M (two instance sets already exist).

### 14. Wing twitch uses per-frame `Math.random`
`src/fauna.js:228` (`Math.random() < 0.002` on a sitting bird, a single frame of -0.65)
Not seeded and one frame long: a sitting bird's wing flicks for 1/60 s about every 8 s; at 12 fps animation steps it reads as a render glitch. Fix: seeded timer with
0.3 s ease. Effort S.

### 15. Stars fade by alpha, not by dither
`src/sky.js:23-32` (`gl_FragColor = vec4(vC, vA)`, `vA` 0.04-1)
Everything else in the sky is ordered-dither; star fade-in at dusk and the twinkle pass through intermediate greys that blend smoothly. Also
stars are never fogged by the storm bank or the dome's `uFogC` band (only `low` dims them), so a star can sit inside the bank's belly in
the first 0.3 of elevation. Fix: output `vA > bayer ? 1 : 0` with the same `b4`; hide under `uBank` with the same `top` function. Effort S/M.

### 16. The Eye reads as a drawn dotted ellipse
`src/sky.js:182-190, 212` (46 + 10 equally spaced round-the-clock points, `PointsMaterial` 2-3 px)
`07_night_dread9_eye.png`: evenly spaced dots in a clean ellipse with a ring of ten in the middle: the "perfect circle / game sign" the style
bans (STYLE: irregular, never a perfect circle). Also unsnapped square points (no wobble with the rest). Fix: jitter angle and radius by
seed, drop 6-8 points, make the pupil three points off centre. Effort S.

### 17. Fireflies ignore light, fog and the budget
`src/systems/shallows.js:157-158` (`MeshBasicMaterial`, `fog:false`, 40 boxes, `renderOrder 9`, not snapped, not through `psxMaterial`)
Forty yellow-green emissive cubes at once visible from 600 units through any fog; the skill caps glowing sources at 3 on screen in S0-S2.
Fix: `psxMaterial` with glow behaviour (`farLight`), 14 of them, group visible by `tod.night > 0.5` and fog distance. Effort S.

### 18. Two competing greys for overcast
`src/sky.js:7` GREY_TOP `#8a98a6` (cover x 0.55 x day) vs `src/weather.js:8` GREY_TOP `#56626f` (cloud x 0.65) and DRIZZLE/STORM tops
The weather already greys `stage.skyTop`, then `dayUpdate` lerps the result toward a second, lighter grey. In `05` (cloud 0.7, dry)
the zenith is a pale blue-grey and the "holes" are #5e86bb saturated blue, more saturated than the clear-sky zenith, so the holes read as
blue ink rather than sky. Fix: take the holes' colour from the greyed `uTop` (they already do) but cap `moodTop` lerp by `1 - cover`
before the grey, and use one grey constant. Effort S.

### 19. Sandbar Cays and spits stay bright white at full dread
`src/systems/shallows.js:89-92, 149` (`darkSame = true` for the sand, `#f4ead0`)
The sand humps and spits keep their day colour while the palms and the stilt hut darken. At dread 0.8+ they stand as the only
bright thing on a lead sea. Fix: `darkSame = false` for the sand (the builder darkens it) or tint to bone `#cfc8b8`. Effort S.

### 20. Moon never changes: flat full disc, no phase
`src/sky.js:229-233` (8-sided disc, same each night) despite `NIGHT_SET.auto` choosing "new moon or full moon" (`daynight.js:28`)
On a "new moon" night (Pitch dark) the moon is still a full bright disc (`12`). Fix: dim and shrink the disc to a thin crescent
(a second dark disc offset by `phase`) on new-moon nights, hide it behind cloud (see 1). Effort S/M.

### 21. Dusk glow band and fog band disagree in hue at dusk
`src/daynight.js:20` DUSK_HOR `#ff9a5a` vs DUSK_FOG `#d8a080`; `sky.js:105` adds a further `uGlow` `#ff6a7a`
`03_dusk_rain.png`: a salmon band stops at a lilac-grey fog line. It reads as two layers, not one sunset. Fix: pull DUSK_FOG to
`#e0987c` and lower `uGlow` mix from 0.8 to 0.6 when `cover > 0.5`. Effort S.

### 22. Breaker and glass foam use `0.35 + 0.65*uLight` while all other foam uses `uLight`
`src/ocean.js:251, seawater.js:65, 76`
At night shore foam is about 1.4x brighter than open-water foam streaks in `outB` at the same light level; on a dark shore the white
wash stands out more than the lamps. Fix: use one term. Effort S.

### 23. Smooth, un-dithered shapes in the sea shader
`src/ocean.js:242` (fish shadows, `smoothstep` edge), `ocean.js:260` (rain rings, 0.07 smooth edge)
Fine at 270 lines, but they are the only two features in the sea that are not stepped like the rest (everything else floors to 3-16 levels
with `bay4`). Fix: `step(0.5, k + bay4 - 0.5)`. Effort S.

---

## Opportunities (fit the direction, small)

- **A horizon cloud bank at dusk**: reuse `uBank` with a low, warm value at twilight so the sunset has a layer to sit on (S).
- **Wind-aligned cloud shear** (the painted clouds already rotate with the wind; stretch the noise along it for a trade-wind look in the Free Cays) (S).
- **Region sky tint**: the dome horizon already follows `stage`; regionlook could add `uGlow` per region (Crown clean, Lantern amber smoke) (S).
- **Sea fresnel to the horizon colour** (see 10): also gives the "lead sea" of the Drowned a free sheen (S).
- **Gulls follow the ship's stern at low dread** (the code already has `anchor`); they only circle islands (M).

## Not wrong (checked)

Vertex snap is applied by `psxMaterial` everywhere the world uses it; the only unsnapped world geometry is the sky group (intended), the
cirrus, the fireflies and the lines (rain, meteor, rigging). The dome's seven bands, cloud tones and bank are dithered on the same
`gl_FragCoord` grid as `PostFX` (correct). Sky sphere segment count (14 x 8) does not distort the cloud projection (checked the chord error: under 2 percent).
Fog on the sea rim (`ocean.js:288-294`) works from a high camera.
