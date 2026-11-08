# 90-second demo video (Hoist_demo_90s.mp4)
Gameplay from the current build, 37 bars at 99 BPM (89.7 s), no cave footage. It ends at the hut on the stage 4 theme.
- 0:00-0:41 stage 1 band: dawn, Tama, the harbour board (Ada the baker), sailing, a gust, fishing, digging, the new
  sea chart, four 3D tavern games (Kite Day, Ring the Peal, Coconut Shy, Strongarm Night), Skip a Stone, sunset.
- 0:41-0:48 night stems: the lantern at night, Lantern Vigil.
- 0:48-0:58 stage 2: the storm (rain, two thunder rolls), the sea going grey.
- 0:58-1:30 stage 4: sailing in to the hut, the purple window, the d20 inside the hut, "Somebody left a light on.", end card.

How to rebuild (dev server on 127.0.0.1:5173):
- `node shots2.mjs` (or `node shots2.mjs b9 a10`) renders every shot to `OUT` in `lib.mjs` with a virtual clock.
- `python3 sound2.py` mixes the music from `public/audio` stems (stage 1, night, stage 2, stage 4), sea, gulls, rain,
  thunder and the d20 roll, cut on the bar.
- `python3 build2.py` cuts the shots on the bar, adds the black card and the end card (`ov-*.png`, made by `ov.mjs` from
  `overlays.html`) and writes the MP4.
The copy in git is re-encoded smaller (crf 27); the scripts use scratchpad paths, change `OUT` in `lib.mjs` for another machine.
