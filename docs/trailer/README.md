# Trailer (30 s)
The trailer is rendered headlessly, frame by frame, from the real game with a virtual clock (so it is smooth at 30 fps no matter how slow the machine is).
- `lib.mjs`: Playwright helper (virtual `performance.now`, `requestAnimationFrame` and timers; `capture` writes one JPEG per frame).
- `segs.mjs`: the seven shots (intro, sailing, Tama, cave + d20, night, storm, dusk). Run `node segs.mjs` (or `node segs.mjs s3`) with the dev server up; set `TW`/`TH` for the size (default 1920x1080).
- `overlays.html` + `ov.mjs`: the captions and end card as transparent PNGs, using the game's own logo.
- The final cut is made with ffmpeg: segments encoded with x264, 0.3 s cross-fades, caption overlays, and a quiet sea/wind/gull bed from `public/audio`.
These scripts were written with paths in the session scratchpad; change `OUT` in `lib.mjs` and `D` in `ov.mjs` for another machine. The MP4s are not kept in git (about 20 MB each).
