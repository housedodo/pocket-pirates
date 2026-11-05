# Audio guide

**Sound is on.** `public/audio/` holds a **placeholder `.ogg` for every cue below**, rendered from the game's own
synthesiser (`src/synth.js`). To use your own sound, overwrite the file with the same name: it plays in the game
at once, no code change. Delete a file and the game falls back to the synthesised version of that cue.
`python3 scripts/single.py` builds two single-file games: `pocket-pirates-dev.html` carries every file in `public/audio/`
and `volumes.json` inside it (plus the mixer on F8); `pocket-pirates-demo.html` carries the same sounds without the dread-stage cues (`music_3..5`, `amb_3..5`, see `DEMO_SKIP` in `audio.js` and `scripts/single.py`) and has no mixer; it has the pause menu Sound and Music toggles. Names must match exactly; `.ogg` preferred (`.mp3`/`.wav` also work).
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
| `music_harbour` | harbour tune (16 bars, 38.8 s, F minor leaning on Ab major, 99 BPM): plays ashore (greeting, harbour board, shipyard) instead of the stage music |
| `music_tavern` | tavern tune (16 bars, a squeezebox jig over Fm-Eb-Db-C, claps and stomps): the Tavern tab and the dice table |

**One-shots** (only these thirteen are kept: menus, dice, fishing, digging. Every other `audio.play` call in the code is silent on purpose: the cue is not in `CUES.oneShots`, so neither a file nor the synthesiser plays it. To bring one back, add its name to `CUES.oneShots` and drop a file in.)
| File | When |
|---|---|
| `dig` | crew starts digging |
| `ui` | opening the chart |
| `buy` | buying a ship upgrade (coin + hammer) |
| `pause` | opening the pause menu |
| `cast` | casting a fishing line (C) |
| `bite` | a fish bites |
| `catch` | a fish landed |
| `roll_d20` | a d20 tumbling: skill checks, haggling, and (pitched down) the Lady's die at the hut |
| `roll_d6` | the d6 at the tavern dice game, every throw |
| `success` | a skill check passes (after the d20 settles) |
| `fail` | a skill check fails |
| `card` | an encounter card turns over at sea |
| `chapter` | a new chapter begins (the CHAPTER card) |

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
- **Harbour and tavern tunes:** `music_harbour` and `music_tavern` (Chaos_Grain `HoistSoundtrack - <dir> tunes`, the same instruments through HOIST at its fair-weather setting with a slow tide drift). `AudioBus.setScene` (called from `openModal` / `closeModal` / `renderHarbour` via `musicScene()` in main.js) cross-fades from the stage music in about 2 s. Both start on the same sample as the stage loops (16 bars = four stage loops), so the cross-fade stays on the beat. They belong to the calm sea: at dread 0.25 they play at half strength, by 0.5 they are gone and the stage music stays on its own ashore. Ashore the world beds step back (sea, surf, coast, wind and the rest at 55%); in the tavern they drop to 25% and the ambience bus is low-passed at 700 Hz (`ambTone`), so the sea is a murmur through the walls.
- **A new or longer main melody:** `python3 scripts/hoist_soundtrack.py my_melody.wav [--vary] [--chords ...]` rebuilds `music_1..5` through the generator (Chaos_Grain `HoistSoundtrack`, set `HOIST_BIN`). The clip must be F minor at 99 BPM and a whole number of bars (4, 8, 12, 16 ...); a short ring-out after the last bar wraps into the loop's head; other sample rates are converted. The added parts (pluck, bass, squeezebox, drums, bell) follow the clip block by block. They assume Fm Fm Db Db per 4 bars unless `--chords` gives one chord per bar (or `auto`: the generator's guess, printed every run). The bass low-pass in stages 1-2 is always on. With the original clip the result is exact (no splice).
- **`--vary` (HOIST automation):** tide, dread and mix drift slowly across the loop (tide ±0.12, dread ±0.06, mix ±0.05, whole periods so the loop stays seamless), and the added parts change from pass to pass, mostly by leaving things out: the squeezebox skips half a pass, the pluck thins out, the wrong note (Gb) comes only every other pass, the bell bends further each time, the heartbeat misses a beat, the abyss fragments drift. The loop becomes at least 16 bars (38.8 s at 99 BPM), all five the same length, so the game's cross-fades still line up. Without `--vary` the generator gives exactly the kit's loops.
