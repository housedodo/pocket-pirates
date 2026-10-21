# Water styles (loop tests)

Four alternatives to the game's current sea, each a 5 s seamless loop (`water_1..4.mp4`, `water_grid.mp4` shows all four side by side).
They live in the ocean shader (`src/ocean.js`) behind the shared uniform `uWStyle` (0 = the game's own water, unchanged). Each style's waves only use whole multiples of 2π/5 per second, so it repeats exactly every 5 seconds.

1. **Toon facets.** The current faceted look, calmer and cleaner: three flat tones per facet by how it faces the sun, small white foam caps on the highest crests, sun glints. A swell of three slow rolling waves plus a fine ripple.
2. **Retro bands.** Dithered stripes of four tones scroll toward the camera (four bands in five seconds), with chunky pixel dashes riding the lines. Almost flat water: the movement is in the colour, like a Saturn/PS1 sea.
3. **Clear shallows.** Turquoise water over sand with moving caustic light, a soft sparkle, small gentle waves. For lagoons, atolls, the cosy start.
4. **Dark rollers.** Long steep swells with sharp crests and flat troughs, inky blue-green water, foam streaks blown along the crests. For the far sea, when the game turns.

Dev hook to try one in the game, in the browser console: `window.__waterLock = { style: 1, t: 0 }` (style 1-4; `t` is the time in seconds, drive it yourself or let a script set it per frame); delete `window.__waterLock` to go back. Making a style the real water means giving it a CPU twin in `waveHeight()` so the ship rides the same waves (the loop tests hide the ship).
Frames were rendered headlessly with the trailer tooling (`docs/trailer/lib.mjs`), 960x540, stepped at 12 fps like the game's water.

`water-styles.png` is a still of all four. The loop videos (about 1-2 MB each) are not kept in git; render them again with the capture script described above (`__waterLock` per frame, `t = frame / 30`, 150 frames, ship and islands hidden).
