# The sea (decided)

The game's water is now the **toon facets** look (style 1 of the four loop tests) with **dark rollers** (style 4) blended in, and lighter, shallower water near islands. All of it lives in `src/ocean.js` (shader and CPU waves share the same formulas, so the ship, fauna and fishing ride exactly what you see) and is driven from `main.js` (look for "the sea:" in the frame loop).

- **Calm (base):** three flat tones per facet by how it faces the sun, small white foam caps on the highest crests, sun glints; a swell of four slow sine waves.
- **No two waves alike:** the swell and rollers are sums of seven waves of unrelated directions and speeds, travelling in sets (a slow envelope makes groups of bigger and smaller waves), and their crests are bent by a slow warp of the surface, more so as the sea gets rough. Foam is not a grid: it follows the crests and is torn into ragged patches by two scales of drifting noise, so it differs everywhere and keeps changing. The CPU and GPU formulas match, so the ship rides the same irregular waves.
- **Unruly:** long steep swells with sharp crests and flat troughs, darker inky water, foam streaks along the crests. `WATER.rough` (0..1) mixes the two shapes and the two looks continuously, never a switch.
- **What makes the sea unruly:** distance from home (dread, from about 0.3 up to 0.8), storms and, a little, rain: `target = 0.85*smoothstep(0.28, 0.82, dread) + 0.95*storm + 0.3*rain`. The sea follows that target slowly (time constant 25 s), so a squall builds and a calm returns over a minute or so, like real water.
- **Near land:** the twelve nearest islands go to the shader (`uIsl`, plus `WATER.isl` on the CPU). Within about 40 units of a shore the water gets lighter, more turquoise and banded (four steps), loses its dark facets, the swell flattens by up to 45 % and the rollers fade out.

Dev: `window.__waterLock = { rough: 0..1 }` fixes the roughness (and `t` fixes the water clock); delete it to go back. The old loop tests (styles 2 retro bands and 3 clear shallows) were dropped; their stills are in `water-styles.png`.
