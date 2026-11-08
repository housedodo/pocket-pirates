# Teaser (53 s)
Twelve shots cut to the bar (99 BPM), captions, a black card and the end card.
1. Vite dev server on 5173, then `node shots.mjs a1 a2 ... a12` (frames to `OUT` in lib.mjs, 1280x720, 30 fps).
2. `python3 sound.py` -> teaser_audio.wav; `node ov.mjs` -> caption PNGs.
3. `python3 build.py` -> Hoist_teaser.mp4 (not committed: too large).
Paths in lib.mjs / ov.mjs point at a scratch folder: change them before rerunning.
