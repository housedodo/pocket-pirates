# HOIST in the game's repository

HOIST is the owner's audio plugin (a VST3/AU effect: sway, space, tape and, with dread, darker colours). It came from the Chaos_Grain
repository on 2026-11-15; only HOIST is kept here, nothing else from Chaos_Grain. `Tools/HoistLayers.cpp` is the offline renderer the
game's music goes through.

## What it does
`HoistLayers <stemdir> <outdir> <set>` takes a folder of dry stems (16 bars, 99 BPM, 4/4, F minor, 38.79 s, all the same length), runs
each through HOIST with that set's settings (TIDE, DREAD, MIX per stem), and cuts it to a seamless loop of exactly the same length, so
every stem stays locked to the band. Output: `<outdir>/<cue>.wav`, 24-bit, 44.1 kHz, stereo.

| Set | Cues | Mood |
|---|---|---|
| stage1 | `s1_*` | FAIR WEATHER: the open-sea band, the second arp, the plucks, the counter melody, the battle layer |
| night | `n1_*` | calm, more space |
| night2 | `n2_*` | the second night band (waiting on three of its files) |
| stage2 | `s2_*` | GREY SKIES |
| stage3 | `s3_*` | between GREY SKIES and THE DEEP |
| stage4 | `s4_*` | THE DEEP (the hut's theme) |
| tavern | `tav_*` | gentle; the game muffles it |

The stem file names each set expects, and every setting, are in the tables at the top of `Tools/HoistLayers.cpp`. To add a stem,
add a row there.

## Build and render
```
cmake -S tools/hoist -B tools/hoist/build -DCMAKE_BUILD_TYPE=Release
cmake --build tools/hoist/build --target HoistLayers -j
tools/hoist/build/HoistLayers_artefacts/Release/HoistLayers <stemdir> <outdir> stage3
```
Then encode each `<cue>.wav` to `public/audio/<cue>.ogg` (`ffmpeg -i x.wav -c:a libvorbis -q:a 5 x.ogg`, as `scripts/studio_ogg.py`
does), list the cue in `src/audio.js` / `src/layers.js`, set its level in `public/audio/volumes.json`, and note it in `docs/AUDIO.md`.

Linux needs the JUCE headers: libx11-dev libxrandr-dev libxinerama-dev libxcursor-dev libxext-dev libxcomposite-dev libfreetype-dev
libasound2-dev libgl1-mesa-dev. JUCE 8.0.4 is downloaded at configure time. The `Hoist` target also builds the plugin itself
(VST3 on Windows and Linux, VST3 and AU on macOS) for use in a DAW.

The WAV masters (the dry stems) stay with the composer (RULES 27); the game ships the rendered `.ogg` files in `public/audio/`.
Checked 2026-11-15: this copy renders byte for byte the same as the Chaos_Grain build.
