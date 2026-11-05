# Audio guide

**Sound is on.** `public/audio/` holds a **placeholder `.ogg` for every cue below**, rendered from the game's own
synthesiser (`src/synth.js`). To use your own sound, overwrite the file with the same name: it plays in the game
at once, no code change. Delete a file and the game falls back to the synthesised version of that cue.
`python3 scripts/single.py` builds two single-file games: `pocket-pirates-dev.html` carries every file in `public/audio/`
and `volumes.json` inside it (plus the mixer on F8); `pocket-pirates-demo.html` carries the same sounds without the dread-stage cues (`music_3..5`, `amb_3..5`, `whisper`, `stage_up`, see `DEMO_SKIP` in `audio.js` and `scripts/single.py`) and has no mixer; it has the pause menu Sound and Music toggles. Names must match exactly; `.ogg` preferred (`.mp3`/`.wav` also work).
The pause menu has Sound and Music toggles.

## Player volume sliders (pause menu)
The pause menu stays short (Resume, Ask Mara, Controls, Fullscreen, Captain's log, Sound and music, New voyage). **Sound and music** opens its own panel with the Sound and Music on/off toggles and three sliders: **Music**, **Sea, wind, gulls** (every loop that is not music: sea, surf, wind, rain, gulls, coast, night, oars, stage ambience) and **Effects** (one-shot sounds). They are 0-100%, saved in the player's settings, and multiply the mix made in the dev mixer (`AudioBus.userVol`, `ambBus`, `sfxBus`, `musicBus`). The sound plays for a moment while a slider is dragged so the level can be heard even though the game is paused.

## The sound mixer (testing volumes in the game)
Open the game with `?dev=1` (e.g. `http://localhost:5173/?dev=1`), then press **F8** (or Pause > Sound mixer).
A panel opens on the right while the game keeps running:
- a slider (0-200%) for every sound, plus MASTER and MUSIC for everything at once;
- **play** fires a one-shot; **solo** plays one loop on its own (everything else goes quiet) until you press it again;
- rows turn green and get a bar when the game is playing that loop right now, so you can sail around and hear the mix in context;
- **All to 0%** sets every sound to 0% (MASTER and MUSIC stay) so you can build the mix up one sound at a time; solo and play still let you hear a sound at 0%. **Reset all** puts everything back to 100%;
- slider changes are kept in your browser; **Save volumes.json** downloads them. Put that file in `public/audio/` and they
  become the game's volumes for everyone (100% = the file as it is, so only changed sounds are listed). Rebuild
  the single files afterwards and `pocket-pirates-dev.html` carries your mix.

## Key and theme (decided)
- **Main key: F minor, 99 BPM, 4/4.** Set by the HOIST soundtrack kit (Chaos_Grain `Tests/HoistSoundtrack.cpp`, made from the user's clip). Harmony of the loop: bars 1-2 Fm, bars 3-4 Db. Bass F / Db, home chord Fm = F Ab C. Every new piece is written in F minor at 99 BPM so it can cross-fade with the stage loops.
- **Every stage loop is one 4-bar loop of 9.70 s** (`music_1..5`, same length to the sample). The game starts all five on the same sample, so a cross-fade between stages stays on the beat.
- Dark stages keep F and bend the rest: the counter-melody halves, one wrong note (Gb) and a detuned bell in stage 3, an F2 / Db2 sub drone and heartbeat drum in stage 4, fragments and a low wrong bell in stage 5.
- The old key (D / D Dorian, 6/8, 125 BPM) is retired; the D "Dread" piece that used to be `music_3` is in git history.

## Tone: "shanty that slowly forgets how to be a shanty"
Pick one short, simple melody (8-16 bars). Play it five ways, one per dread stage. The *same* tune
getting stranger is scarier than new horror music.

| Stage | Music | Ambience | SFX flavour |
|---|---|---|---|
| 1 Home | Major key, ~100 bpm, accordion/fiddle/tin whistle, steel drum, light percussion | gulls, bright surf, rigging, distant harbour chatter | wooden, crisp, friendly |
| 2 Off | Same tune, a little slower, one instrument drops out, a note is slightly flat | gulls stop; just surf and a creak | same, a bit too quiet |
| 3 Wrong | Detuned, minor 2nd/tritone creeping in, music-box or toy piano | wind with a faint hum, distant wood knocks | wet, muffled |
| 4 Eerie | Fragments only: slow drone, sparse notes, lots of silence, reverb tails | low foghorn, dripping, breathing-like surf | hollow, long reverb |
| 5 Cosmic | Sub bass (30-45 Hz), reversed/pitched-down shanty, endless descending glissando | deep "whale-like" tones, static, whispers | distorted, pitch-dropped |

## Instruments and FL Studio (soundtrack plan)
The game expects `music_1`..`music_5` (one loop per dread stage, same length and tempo, cross-faded). Build the dark loops from the **same instruments** as the bright one, detuned and degraded, so the world sounds like it is forgetting the tune.

### By stage
| Stage | Instruments |
|---|---|
| 1 Home (cosy) | **Steel drum** (main melody), ukulele or nylon guitar, marimba/kalimba, accordion or concertina, tin whistle or low flute, upright bass or soft pizzicato cello, light percussion (shaker, bongos, woodblock, cajon) |
| 2 Off | The same, a little slower: drop one instrument, one note slightly flat |
| 3 Wrong | Detuned **music box or toy piano**, bowed vibraphone/crotales, tremolo strings, reversed marimba or steel-drum hits as risers |
| 4 Eerie | Waterphone, singing bowls, glass harmonica, cello/bass drone, filtered "ah" choir pad, a rare distant bell or gong, lots of silence |
| 5 Cosmic | Sub bass drone (30-50 Hz), the shanty pitched down and bitcrushed, granular pad made from waves or gulls, dissonant string clusters (minor 2nd, tritone), pitch-drifting choir, metallic scrapes, low heartbeat drum near the Eye |

### Other moods (cues for later)
- **Night:** celesta, music box, glockenspiel, felt piano, warm pad, long gaps between notes (`amb_night` is the ambience bed; a night music variant is optional).
- **Dawn / dusk:** solo flute or tin whistle over a soft pad / slower accordion or low strings.
- **Harbours:** one signature instrument per village (mandolin, fiddle, hand pan, banjo, small bells). Tavern: fiddle, accordion, claps, stomped bass drum. Shipyard: woodblock and hammer taps in a gentle waltz.
- **The hut and the Lady:** waterphone, singing bowls, one detuned music-box note, whispered pad.

### FL Studio tips
- Free sound sources: Spitfire LABS (steel drum, music box, celesta, pianos, strings), Vital (pads and drones), FLEX presets.
- Built-in: Sytrus or Harmless (pads), Pitcher / Fruity Pitch Shifter (detune), Gross Beat (stutters, tape stops, slowdown), Fruity Granulizer (textures), Hyper-Reverb or Fruity Reeverb 2, Distructor or Fruity Love Philter for the dark versions.
- Look: PS1 style, so a little lo-fi (bitcrush, 22-32 kHz, faint tape noise) suits it.
- Workflow: one core theme of 4-8 notes, five seamless loops of 1-2 min in the same key, export stems (melody, pad, bass, percussion) if possible so layers can fade later.
- Export: `.ogg` (or mp3/wav), loop-tested with no click, about -14 LUFS for music; then balance in the F8 mixer and save `volumes.json`.
- Name files exactly `music_1.ogg` ... `music_5.ogg` and drop them in `public/audio/`.

## Cue list (`public/audio/<name>.ogg`)
**Loops** (seamless; all music loops the **same length and tempo** so cross-fades stay musical)
| File | Notes |
|---|---|
| `sea` | constant water bed under everything; louder as the ship speeds up |
| `surf` | breaking waves; fades in when you are close to an island shore |
| `wind` | wind bed; louder with wind strength and storms. The loop also drifts on its own: a slow volume swell (about 45% to 120%, new gust target every 4 to 13 s), a stereo pan wandering left and right, and a tiny pitch drift, so it never repeats the same way (`driftWind` in audio.js). Keep the file mono |
| `rain` | rain bed; follows rain intensity |
| `amb_night` | night bed (crickets-on-water, creaks), fades in after sunset on top of the stage ambience |
| `amb_1` .. `amb_5` | ambience per stage (38.8 s: deep rumble from stage 3, howling wind in 4-5; 1-2 silent), cross-faded by dread |
| `music_1` .. `music_5` | music per stage, 4 bars at 99 bpm in F minor (9.70 s, same length to the sample, started together), cross-faded by dread |
| `gulls` | recorded gull colony (53 s, mono), **not constant**: it calls for about 5-20 s, then goes quiet for roughly 20-65 s (closer to the gulls: longer calls, shorter gaps), with slow fades (`driftGulls` in audio.js). Silent far off, fades up within ~120 units of the nearest circling gull and gets clearer (low-pass opens) as you close in; quieter at night, in rain and storms, gone by dread 0.35. While this file exists the synthesised one-shot `gull` cries are skipped |
| `coast` | soft coastal breeze, small waves and far-off gulls (32 s). Rises over the last ~110 units before any island shore, full while moored or ashore (harbour, greeting, shipyard). Quieter at night, gone in storms and by dread ~0.4 |
| `oars` | rowing strokes (dip, pull, drip); plays while you row with the oars out (G, then W) |

**One-shots**
| File | When |
|---|---|
| `creak` | ship timber: every 11-25 s while sailing (and always from dread 0.3), pitched down above dread 0.6, every 22-36 s above dread 0.85 |
| `splash` | salvaging a barrel, whirlpools |
| `bump` | hitting an island (volume follows speed) |
| `dig` | crew starts digging |
| `treasure` | loot found (stinger; mid-game gets stranger) |
| `discover` | a new island is charted (short jingle) |
| `harbour` | visiting a harbour (bell/door/crowd) |
| `ui` | opening the chart |
| `whisper` | random, from stage 3 on (pitch is randomised +-15%) |
| `stage_up` | crossing into a new dread stage (a low sting) |
| `buy` | buying a ship upgrade (coin + hammer) |
| `pause` | opening the pause menu |
| `thunder` | after lightning (delayed 0.3-2.5 s) |
| `horn` | a passing ship greets you |
| `gull` | gulls near an island (only while they still sound like gulls) |
| `dolphin` | dolphins leaping |
| `whale` | a whale surfaces (and, pitched down, the shadow under the keel) |
| `bell` | harbour clock on the hour, when you are close to a harbour |
| `bottle` | picking up a message in a bottle |
| `cannon` | firing your cannons (Space) |
| `hit` | your hull takes damage (cannon shot, storm waves, a bad encounter) |
| `cast` | casting a fishing line (C) |
| `bite` | a fish bites |
| `catch` | a fish landed |
| `roll_d20` | a d20 tumbling: skill checks, haggling, and (pitched down) the Lady's die at the hut |
| `roll_d6` | the d6 at the tavern dice game, every throw |
| `success` | a skill check passes (after the d20 settles) |
| `fail` | a skill check fails |
| `card` | an encounter card turns over at sea |
| `chapter` | a new chapter begins (the CHAPTER card) |
| `knock` | knocking on the dark hut before it opens (chapter V) |
| `ending` | the demo end card, TO BE CONTINUED (about 5 s) |

## Format guidelines
- 44.1 kHz, OGG Vorbis ~96-128 kbps; mono for SFX, stereo for music/ambience.
- Loudness: music about -16 LUFS, ambience -20, SFX peak around -6 dBFS. The game cross-fades loops, so keep stems similar in level.
- Loop points: render loops with the tail wrapped into the head (no click, no reverb cut-off).
- Budget: keep the whole folder under ~10 MB (it ships with the page).
- Check loops with headphones; low-end (< 60 Hz) is a feature in stage 5, but leave headroom.

## PS1 flavour
- Low-fi on purpose: 22 kHz or 16 kHz sample rate, 8-12 bit crunch, short spring/plate reverb (the PS1 SPU reverb sound).
- General-MIDI/soundfont-style instruments (SC-55-ish brass, harp, pan flute) sound right. Tracker/chip feel is fine.
- Don't over-polish stage 1-2; let the production get *worse* in a controlled way as dread rises.

## Horror toolbox
- **Pitch your friendly sounds down**: gull -> something huge; the harbour bell at 50% speed.
- **Reverse + reverb** on a bell or a voice.
- **Silence is a cue**: drop the sea bed for a second before a stage change.
- **Detune over time**: slow wow/flutter on the shanty (tape-stop feel).
- **Shepard-Risset glissando**: an endless falling tone for stage 5.
- **Whispers**: 2-3 layered voices, one reversed, one pitched down; keep them under -24 dB so they are "maybe" heard.
- **Wholesome tells**: a music box playing the shanty, getting slower.

## Free tools
Audacity, Reaper (free trial), LMMS, BeepBox / Bosca Ceoil (quick chip tunes), jsfxr/sfxr (SFX), Vital/Surge XT (drones), a phone mic for foley (rope, wood, water in a bucket).

### The HOIST soundtrack (in)
`music_1..5` and `amb_1..5` come from the HOIST soundtrack kit (F minor, 99 BPM, the clip through the HOIST effect on the music bus; MIDI of the added parts stays with the composer).
| Stage | Music (HOIST tide / dread / mix) |
|---|---|
| 1 Fair weather | clip + pluck counter-melody, upright bass, squeezebox off-beats, frame drum + shaker, ship's bell (20 / 8 / 45) |
| 2 Grey skies | squeezebox gone, melody halved, bass on the one, clip low-passed at 3 kHz (42 / 30 / 55) |
| 3 Something's wrong | the tune bends, one wrong note (Gb), detuned bell, clip at 2 kHz (35 / 50 / 65) |
| 4 The deep | sub drone, heartbeat drum, clip below 700 Hz (45 / 72 / 75) |
| 5 Abyss | clip fragments only, a low wrong bell (30 / 95 / 85) |

- **Bass low-pass in stages 1-2:** the bass runs through a gentle 12 dB/oct low-pass at 450 Hz so it stays under the tune. The original clip was not in the kit, so the filtered bass was rendered on its own and swapped in (the kit's bass removed, the filtered one added, both through the same HOIST settings).
- **Loudness:** the loops get quieter by design as dread grows (stage 1 about -17 LUFS, stage 5 about -29); horror by removing.
- **Mix:** `volumes.json` sets `amb_4` 55% and `amb_5` 50% so the rumble and howl sit back near the kit's own balance and do not bury the stage 4-5 music (the game's bus gains already favour ambience by about 5 dB).
- **Ambience, one owner per sound.** The kit's ambience baked sea, gulls, creaks, rain, wind, rumble and whispers into each stage loop. The game already plays most of these as their own loops driven by the world, so `amb_1..5` were re-rendered (Chaos_Grain `HoistSoundtrack - <dir> gameamb`, 38.8 s each, so they do not repeat every 9.7 s) with only what nothing else plays. `amb_1` and `amb_2` are silent on purpose (the world beds carry the calm stages); keep the files, or the synthesised fallback would play:

| Sound in the kit's clip | Who plays it in the game |
|---|---|
| Sea bed, darker and quieter by stage | `sea` loop; a low-pass and level by dread (`SEA_LEVEL` / `SEA_DARK` in audio.js, the kit's values) |
| Gulls (stage 1-2) | `gulls` recording near gull islands, gone by dread 0.35 (left out of amb) |
| Rain (stage 2-4) | `rain` loop, follows the weather (left out of amb, or it would rain under a clear sky) |
| Plain wind | `wind` loop, follows wind and storms (left out of amb) |
| Howling wind (stage 4-5) | `amb_4`, `amb_5` |
| Ship creaks (high in 1-3, low and slow in 4-5) | the game's `creak` one-shot (every 11-25 s, rate 0.55-0.65 above dread 0.6); the kit's creaks were almost inaudible |
| Deep rumble (stage 3-5) | `amb_3..5` |
| Whispers (stage 4-5) | `whisper` one-shots from dread 0.45 (now a little rarer and softer) plus HOIST's own on the music bus; left out of amb |
| Ship's bell, drums | inside the music loops |

## Sound studio (dev, F9)
Load your own music and sounds, cut them, and say where each plays. Open the game with `?dev=1`, press **F9** (or pause menu, "Sound studio").
- **Load sounds**: wav / ogg / mp3 / flac, by button or drag and drop. They are kept in this browser (IndexedDB), so they survive a reload.
- **Cut**: drag on the waveform to pick the part you keep, drag an edge to trim, or type start / end. Fade in / out and gain per sound. Preview once or as a loop; "Save trimmed .wav" writes the cut file.
- **Placements**: each one links a sound to *where* (situations that must be on / off: title screen, sailing, in harbour, shipyard, hut, cave, chart, log, talking, paused, fishing, raider near, demo end, day, dawn/dusk, night, rain, storm, fog, strong wind, near land, open sea, plus a dread range) and *how* (music / ambience / effects bus, loop or once, volume, fade in / out, how much it hushes the game's own music and ambience). Several can play together; a green row is playing right now.
- **Test a situation**: the chip bar shows the live situation. Click a chip to force a situation (and the dread slider) without moving the ship; "Back to live" returns. "hear" on a placement plays it whatever the situation.
- **Keep it**: "Export soundtrack" downloads `soundtrack.json` (the placements) and the trimmed WAVs. Put them in `public/audio/studio/` and the studio loads them at start-up when nothing is saved in the browser. "Import soundtrack.json" restores placements.
- The studio is dev only: it does not exist in the demo build. Shipping a placement for real means turning it into a cue (or moving the loader out of dev) once the placements are final.

- Final placements to ogg: put the exported soundtrack.json + WAVs in public/audio/studio/, run `python3 scripts/studio_ogg.py` (needs ffmpeg); it writes .ogg files and updates soundtrack.json.
- Pop out: the studio header has "Pop out", which moves the panel into its own window (second screen). The game keeps playing and keeps focus behaviour (no auto-pause while it is open); "Dock back" or closing the window returns it. Allow pop-ups for the page.
- "preview in game" on a placement sets the forced situation to that placement's conditions (and the middle of its dread range), so it plays the way it will in the game; press again for live.
