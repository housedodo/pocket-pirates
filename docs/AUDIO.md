# Audio guide

**Sound is on.** `public/audio/` holds a **placeholder `.ogg` for every cue below**, rendered from the game's own
synthesiser (`src/synth.js`). To use your own sound, overwrite the file with the same name: it plays in the game
at once, no code change. Delete a file and the game falls back to the synthesised version of that cue.
`python3 scripts/single.py` builds two single-file games: `pocket-pirates-dev.html` carries every file in `public/audio/`
and `volumes.json` inside it (plus the mixer on F8); `pocket-pirates-demo.html` is silent, with no way to turn sound on. Names must match exactly; `.ogg` preferred (`.mp3`/`.wav` also work).
The pause menu has Sound and Music toggles.

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
| `amb_1` .. `amb_5` | ambience per stage, 30-60 s, cross-faded by dread |
| `music_1` .. `music_5` | music per stage, e.g. 32 bars at 90-100 bpm, cross-faded by dread |
| `gulls` | recorded gull colony (53 s, mono). Silent far off, fades up within ~120 units of the nearest circling gull and gets clearer (low-pass opens) as you close in; quieter at night, in rain and storms, gone by dread 0.35. While this file exists the synthesised one-shot `gull` cries are skipped |
| `coast` | soft coastal breeze, small waves and far-off gulls (32 s). Rises over the last ~110 units before any island shore, full while moored or ashore (harbour, greeting, shipyard). Quieter at night, gone in storms and by dread ~0.4 |
| `oars` | rowing strokes (dip, pull, drip); plays while you row with the oars out (G, then W) |

**One-shots**
| File | When |
|---|---|
| `creak` | ship timber (loaded, not triggered yet) |
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
