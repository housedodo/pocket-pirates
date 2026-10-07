# Audio guide

You are making the sounds. The game loads whatever it finds in `public/audio/` and silently skips anything
missing, so you can add files one at a time. Names must match exactly; `.ogg` preferred (`.mp3`/`.wav` also work).

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

## Cue list (`public/audio/<name>.ogg`)
**Loops** (seamless; all music loops the **same length and tempo** so cross-fades stay musical)
| File | Notes |
|---|---|
| `sea` | constant water bed under everything; louder as the ship speeds up |
| `amb_1` .. `amb_5` | ambience per stage, 30-60 s, cross-faded by dread |
| `music_1` .. `music_5` | music per stage, e.g. 32 bars at 90-100 bpm, cross-faded by dread |

**One-shots**
| File | When |
|---|---|
| `creak` | ship timber (reserved; trigger hooks easy to add) |
| `splash` | reserved for waves/wake |
| `bump` | hitting an island (volume follows speed) |
| `dig` | crew starts digging |
| `treasure` | loot found (stinger; mid-game gets stranger) |
| `discover` | a new island is charted (short jingle) |
| `harbour` | visiting a harbour (bell/door/crowd) |
| `ui` | opening the chart |
| `whisper` | random, from stage 3 on (pitch is randomised +-15%) |
| `stage_up` | crossing into a new dread stage (a low sting) |

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
