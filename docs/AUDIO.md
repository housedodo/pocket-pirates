# Audio guide

**Sound is on.** The game loads only the cues listed in `CUES` (`src/audio.js`): the stage-1 band and battle layer, the tavern,
`music_3`, the recorded sea, rain, storm, thunder and forest, the coast and gulls, and thirteen interface effects (still the
synthesised placeholders). Everything else the game asks for is silent on purpose (see "One-shots" below). To use your own sound,
overwrite the file with the same name; to bring a sound back, add its name to `CUES` and its file to `public/audio/`.
`python3 scripts/single.py` builds the single-file games: `pocket-pirates-dev.html` carries every file in `public/audio/` and `volumes.json` (plus the mixer on F8, the sound studio on F9, the dev bar at the top for the hour and the quest, and the test keys 1-4 dawn/noon/dusk/night, , . quest back/forward, F6 weather, F7 finish the quest); `pocket-pirates-demo.html` carries the same sounds without `music_3` (no dread in the demo, see `DEMO_SKIP` in `audio.js` and `scripts/single.py`) and has no mixer; `pocket-pirates-demo-silent.html` has no sound at all. Names must match exactly; `.ogg` preferred (`.mp3`/`.wav` also work).
and `volumes.json` inside it (plus the mixer on F8); `pocket-pirates-demo.html` carries the same sounds without the dread-stage cues (`music_3..5`, `amb_3..5`, `whisper`, `stage_up`, see `DEMO_SKIP` in `audio.js` and `scripts/single.py`) and has no mixer; it has the pause menu Sound and Music toggles. Names must match exactly; `.ogg` preferred (`.mp3`/`.wav` also work).
The pause menu has Sound and Music toggles.

## Music map (what plays where)
| Where / when | Music |
|---|---|
| Before the first quest | nothing (sea, weather, gulls, coast) |
| Stage 1 (dread < ~0.2, within ~440 units of Tama), open sea, day | the stage-1 band `s1_*`, one instrument more per quest, in changing line-ups, silences and solos |
| Same, dusk to daybreak | the night version `n1_*` |
| Stage 2 (dread ~0.25-0.5), open sea | `s2_*` |
| Dread ~0.5-0.8 | `music_3` ("Dread") |
| A raider fight (cannons out) | the battle layer `s1_raiders` on top, the whole band |
| By any shore | the sea music eases down to 40% |
| In a harbour / in the tavern | the tavern tune `tav_*`, muffled (fainter elsewhere in the harbour); the sea music steps aside |
| Near and in the hut, first visit only | the hut's theme `s4_*`, nothing else |
The dev build's dev bar (top) sets the quest, the hour and the dread, so every row can be heard on purpose.

## Player volume sliders (pause menu)
The pause menu stays short (Resume, Ask Mara, Controls, Fullscreen, Captain's log, Sound and music, New voyage). **Sound and music** opens its own panel with the Sound and Music on/off toggles and three sliders: **Music**, **Sea, rain, gulls** (every loop that is not music: sea, rain, gulls, coast, forest) and **Effects** (one-shot sounds). They are 0-100%, saved in the player's settings, and multiply the mix made in the dev mixer (`AudioBus.userVol`, `ambBus`, `sfxBus`, `musicBus`). The sound plays for a moment while a slider is dragged so the level can be heard even though the game is paused.

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
- **Home key: D (D minor / D Dorian).** Bass note D, home chord Dm = D F A. The core motif is D - G - B (the B natural is the Dorian lift). Sailor-music feel: a held or repeated D bass, 6/8 or 2/4, accordion, fiddle, tin whistle, ukulele.
- **Every stage loop is written in D** so the cross-fades stay musical: bright stages in D major / D Mixolydian or the same melody over Dm, dark stages stay on the D drone with the third dropped (D - A), a flat 2nd (E flat) or a tritone (A flat) added.
- Chords (D Dorian): Dm, C, G, Am, F, Bb. Shanty: Dm - C - Dm - C. Dorian: Dm - G - Dm - Am. Longing: Dm - Bb - C - Dm.
- Tempo is not fixed yet (suggest about 90-100 bpm; if 6/8, about 60-66 dotted-quarter beats). Set it once, then use it for all five loops and note it here.

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
(Composer brief from before the stage-1 stems; kept for the later stages.) The game now plays the stage-1 band for the bright sea and `music_3` for the middle; the placeholder `music_1/2/4/5` are gone. New loops for the deep stages would go in as `music_4` / `music_5` (one loop per dread stage, same tempo, cross-faded). Build the dark loops from the **same instruments** as the bright one, detuned and degraded, so the world sounds like it is forgetting the tune.

### By stage
| Stage | Instruments |
|---|---|
| 1 Home (cosy) | **Steel drum** (main melody), ukulele or nylon guitar, marimba/kalimba, accordion or concertina, tin whistle or low flute, upright bass or soft pizzicato cello, light percussion (shaker, bongos, woodblock, cajon) |
| 2 Off | The same, a little slower: drop one instrument, one note slightly flat |
| 3 Wrong | Detuned **music box or toy piano**, bowed vibraphone/crotales, tremolo strings, reversed marimba or steel-drum hits as risers |
| 4 Eerie | Waterphone, singing bowls, glass harmonica, cello/bass drone, filtered "ah" choir pad, a rare distant bell or gong, lots of silence |
| 5 Cosmic | Sub bass drone (30-50 Hz), the shanty pitched down and bitcrushed, granular pad made from waves or gulls, dissonant string clusters (minor 2nd, tritone), pitch-drifting choir, metallic scrapes, low heartbeat drum near the Eye |

### Other moods (cues for later)
- **Night:** celesta, music box, glockenspiel, felt piano, warm pad, long gaps between notes (no night bed in the game at the moment; a night music variant is optional).
- **Dawn / dusk:** solo flute or tin whistle over a soft pad / slower accordion or low strings.
- **Harbours:** one signature instrument per village (mandolin, fiddle, hand pan, banjo, small bells). Tavern: fiddle, accordion, claps, stomped bass drum. Shipyard: woodblock and hammer taps in a gentle waltz.
- **The hut and the Lady:** waterphone, singing bowls, one detuned music-box note, whispered pad.

### FL Studio tips
- Free sound sources: Spitfire LABS (steel drum, music box, celesta, pianos, strings), Vital (pads and drones), FLEX presets.
- Built-in: Sytrus or Harmless (pads), Pitcher / Fruity Pitch Shifter (detune), Gross Beat (stutters, tape stops, slowdown), Fruity Granulizer (textures), Hyper-Reverb or Fruity Reeverb 2, Distructor or Fruity Love Philter for the dark versions.
- Look: PS1 style, so a little lo-fi (bitcrush, 22-32 kHz, faint tape noise) suits it.
- Workflow: one core theme of 4-8 notes, five seamless loops of 1-2 min in the same key, export stems (melody, pad, bass, percussion) if possible so layers can fade later.
- Export: `.ogg` (or mp3/wav), loop-tested with no click, about -14 LUFS for music; then balance in the F8 mixer and save `volumes.json`.
- New music now goes in as stems (16 bars at 99 BPM, F minor, the same length as the rest), rendered through HOIST with `HoistLayers` in the Chaos_Grain repo and encoded to `.ogg` in `public/audio/` (see the sections below for the cue names).

## Stage 1 on open sea: one instrument per quest (`src/layers.js`)
Six stems from one 16-bar loop at **99 BPM, 4/4 (38.79 s)**: `s1_bass`, `s1_shaperbox`, `s1_pluck`, `s1_drums`, `s1_bell`, `s1_guitar`.
They are stage 1's music (the old placeholder `music_1` is gone).
- **Rendered through HOIST** at FAIR WEATHER, one stem at a time, as seamless loops of exactly the same length (Chaos_Grain repo:
  `Tests/HoistLayers.cpp`, `HoistLayers game_audio <outdir>`; less sway on bass and drums, more space on the bell). WAV masters stay in Chaos_Grain `game_audio/`.
- **The game starts silent.** The first main quest brings in bass and shaperbox; every quest after that one more instrument
  (the order of the last four is shuffled once per voyage). A new one fades in over about 30 s. The band grows a little louder as it fills
  (about 12 dB under the sea with two, about 7 dB under with all six) but stays in the background.
- **Never the same twice: scenes.** Once three or more instruments are in, the band plays in scenes that change on a 4-bar phrase
  (9.7 s): the full band (3-5 phrases), then one or two line-ups of only two or three (2-4 phrases each), then the full band again.
  A line-up is never one of the last four and shares at most one player with the one before, so it goes e.g. bass + pluck, then
  guitar arp + drums + bell, then shaperbox + bell. A small line-up plays a little louder than the same voices in the full band.
  A newcomer always arrives in a full-band scene (its fade-in plus three phrases). On top, each stem swells gently (75-100%) and
  wanders slowly around its own place in the stereo field (bass and drums near the middle, the rest spread out).
- **Quiet stretches:** now and then the band stops altogether for 1-3 phrases (only the sea), or one instrument plays alone for 2-3 phrases (never the drums on their own); never two quiet stretches in a row.
- **Two guitar arps:** `s1_guitar2` is a second take of the arp (4 bars, played four times to the loop length, through HOIST with
  the same settings, F minor like the band). One of the two plays in the guitar's place; they swap after 2-7 phrases (chosen at
  random every time, so no pattern), starting just before a phrase so the new take comes in on the downbeat. They never sound
  together: the leaving take fades out in 0.3 s and only then does the other fade in (0.5 s).
- **Three plucks:** `s1_pluck3` ("off the beat", `Pluck_off_the_beat.wav`, +4.5 dB to match before HOIST, -26.6 LUFS) joins the
  rotation: after 3-8 phrases the melody moves to another of the three takes at random, never the same twice in a row, never
  two at once. 20-minute simulation: 302 / 289 / 239 s heard, 22 changes, no overlap.
- **Two plucks:** `s1_pluck2` is the composer's variation of the main melody (`Pluck_variation.wav`, raised 6.3 dB to match the
  original before HOIST, same settings, -26.9 LUFS like `s1_pluck`). It swaps with the pluck exactly like the arps (holds 3-8
  phrases, swaps just before a phrase, never both at once).
- **The counter melody** (`s1_counter`, from `Counter_melody.wav`, 16 bars, through HOIST at FAIR WEATHER with a little more space:
  TIDE 0.24, MIX 0.52; -27 LUFS like the other stems). Not part of the scenes: it rests for 2.5-5 minutes, then (once four or more
  instruments are in, by day, not in a fight, while at least two instruments play) it fades in slowly over ~12 s on a phrase,
  stays 3-5 phrases and fades out over ~14 s. In a 20-minute simulation it came in four times, about a minute each (~18% of the
  time). Its own place in the stereo field: a little right of centre, wandering slowly.
- **Heard over the waves:** all six share one soft low-pass (about 1.5-3 kHz) that moves with a slow swell, together with a small level
  lift on the crest, and closes further in strong wind.
- **Open sea:** right by a shore (within about 60 units) they ease down to 40%, slowly. They carry the whole bright half of the
  sea: full up to dread 0.3 (about 660 units from Tama), then they fade out by 0.5 while `music_3` comes in.
- All stems start on the same sample (they wait silently until all six have loaded), so they stay locked together; the Music of the Fog
  playback rate applies to them too. The F8 mixer has its own group for them.
- Test: `?dev=1&musicpace=5` makes the fades and swells five times faster.

## Stage 2 (`s2_*`, in `src/layers.js`)
Dread stage 2 (GREY SKIES): `s2_bass`, `s2_drums`, `s2_guitar`, `s2_pluck` (16 bars at 99 BPM, F minor, the band's length; through
HOIST with more swell and a little tape wow: `HoistLayers game_audio/stage2 <outdir> stage2`). Like the band it plays on open sea
only (falls back by the shore, steps aside in harbours and the tavern). All four together, each swelling gently; now and then one of
drums / guitar / pluck rests for 15-35 s (never two, never the bass). The order through the dread: stage-1 band (and its night
version) up to dread ~0.2, stage 2 from 0.2-0.32 to 0.45-0.58, then `music_3` until ~0.8. F8 mixer: group "Stage 2".

## The hut, first visit (`s4_*`, `HutMusic` in `src/layers.js`)
Dread stage 4 (THE DEEP): `s4_pluck`, `s4_drone` (sub drone), `s4_drums`, through HOIST with sub octave, ghost tails and whispers
(`HoistLayers game_audio/stage4 <outdir> stage4`; the drone's own loop point clicked, so its rendered loop has a 15 ms fade at each
end). The first time only: it rises over the last ~280 units as you sail up to the hut, plays inside, and nothing else plays meanwhile
(the sea's music and the tavern step aside). Once you have been inside and sailed ~260 units off, the normal music comes back and
the theme is never heard there again (`state.story.hutMusicDone`, `hutMusicTarget` in main.js). F8 mixer: group "The hut".

## Night (`n1_*`, in `src/layers.js`)
A calmer version of the song: `n1_pluck`, `n1_shaperbox`, `n1_strings`, `n1_bell` (16 bars at 99 BPM, same length as the band, F minor,
through HOIST with more space: `HoistLayers game_audio/night <outdir> night`; masters in Chaos_Grain `game_audio/night/`). From dusk
to daybreak it takes over from the stage-1 band (about 15 s cross-fade, all four together, breathing gently, as loud as the day band); the band comes back at
dawn. Only once the first quest has brought music. They start on the same sample as the band, so the hand-over stays in time. The
night is 4 minutes now (the day 11.5), about six times through the song. F8 mixer: group "Night".
- **The night pad** (`n1_pad`, from `Night_pad.wav`, through HOIST night: TIDE 0.26, MIX 0.62; about as loud as the four-part night
  band together). The night switches between the **band** (it carries the melody) and the **pad** (calm, long, peaceful), crossing
  over in ~12 s on a phrase, never both for long. A night always opens with the band. On a **calm sea** (wind under 0.45) the pad
  holds 5-9 phrases and the band only 2-4; in **wind** it is the other way round (pad 2-4, band 4-8). In an 8-minute simulation:
  calm, pad 65% of the time; windy, band 70%.

## Battle (`s1_raiders`, in `src/layers.js`)
`Raiders.wav` (4 bars at 99 BPM, **F minor** like the band) is played four times to the band's 16-bar length and rendered through HOIST like the other stems (`Raiders_x4.wav` in Chaos_Grain `game_audio/`; it replaced an earlier take that had to be shifted up from E minor). It joins the main theme while a fight is on: cannons unlocked and a raider engaged
or within ~110 units (`inBattle()` in main.js). It comes in within a few seconds, the whole band plays for the fight (no small
line-ups), the low-pass opens a little, and after the fight it lingers and fades over 10-15 s. Same panning, swell and filter as the band.

## Voice blips (`AudioBus.blip`)
Very soft blips while words type out: every third letter of Mara's lines and of villagers' greetings, a 70 ms rounded,
low-passed tone (dark lines lower and duller), a little pitch wobble, never closer than 60 ms.
A little higher and brighter than the sea's rumble (Mara ~470 Hz, villagers ~360 Hz) so they are heard without being loud; peaks about -28 dBFS. Synthesised live (no file); follows the Effects slider; `blip` in volumes.json scales it.

## The tavern (`tav_*`, `Tavern` in `src/layers.js`)
Four stems from the same session (99 BPM, 38.79 s): `tav_bass`, `tav_shaperbox`, `tav_pluck` (pluck stab), `tav_drums`, rendered
through HOIST gently (`HoistLayers game_audio/tavern <outdir> tavern` in Chaos_Grain; WAV masters in `game_audio/tavern/`).
- Quiet and **muffled, as if heard through the tavern wall**: two low-passes in a row (24 dB/oct). Inside the tavern (its tab
  in the harbour, or the dice table) about 1.2 kHz; anywhere else in the harbour (other tabs, greeting, shipyard) about 400 Hz
  and fainter, music from down the street. Silent at sea.
- While it plays, the sea's music (stage loops and stage-1 layers, `seaMusic` gain) steps aside; it comes back as you sail off.
- All four start on the same sample and keep running, so the song carries on while you are away. F8 mixer: group "Tavern".

## Cue list (`public/audio/<name>.ogg`)
**Loops** (seamless; all music loops the **same length and tempo** so cross-fades stay musical)
| File | Notes |
|---|---|
| `sea` | constant water bed under everything; louder as the ship speeds up. Now light ocean waves (Cymatics LIFE Waves Light 3, 19 s seamless loop, about -30 LUFS) |
| `rain`, `rain_2` | **light rain**: two recordings (Cymatics LIFE Rain Light 12 and 2, 39 s / 48 s loops, about -26 LUFS) that cross-fade slowly every 25-65 s so the rain never repeats. Follow rain intensity; they give way to `rain_storm` as it gets heavy |
| `rain_storm` | **a proper storm**: heavy rain drumming on the deck (Cymatics LIFE Rain on Roof 1, 30 s loop, about -20 LUFS). Fades in with storm 0.25-0.6 or rain above 0.75 |
| `forest` | forest bed (Cymatics LIFE Forest 2, 28 s loop), very quiet (30%) while you are ashore on a big forest island (`desc.forest`), and now near **Hollowgreen** (the hand-made forest isle): up to 80% of that level within ~40 of its shore (`forestLevel` in main.js) |
| `music_3` | the user's own "Dread" piece (moved from B minor down a tritone to **F minor**, the band's key, tempo and length unchanged; masters in Chaos_Grain `game_audio/dread/`): the middle of the dread range (dread 0.25-0.75, full at 0.5), after the stage-1 band fades. The placeholder `music_1`, `music_2`, `music_4`, `music_5`, `surf`, `wind`, the stage ambience `amb_1`..`amb_5`, `amb_night` and `oars` were removed: no music below dread 0.3 except the stage-1 layers, and none in the deep stages yet |
| `gulls` | recorded gull colony (53 s, mono), **not constant**: it calls for about 5-20 s, then goes quiet for roughly 20-65 s (closer to the gulls: longer calls, shorter gaps), with slow fades (`driftGulls` in audio.js). Silent far off, fades up within ~120 units of the nearest circling gull and gets clearer (low-pass opens) as you close in; quieter at night, in rain and storms, gone by dread 0.35. |
| `coast` | soft coastal breeze, small waves and far-off gulls (32 s). Rises over the last ~110 units before any island shore, full while moored or ashore (harbour, greeting, shipyard). Quieter at night, gone in storms and by dread ~0.4 |

**One-shots**
Only these effects play. Everything else the game asks for (splash, treasure, discover, harbour, cannon, hit, horn, gull, dolphin, whale, bell, bottle, creak, bump, whisper, stage_up, knock, ending) is **silent on purpose**: not in `CUES.oneShots`, so never loaded and never synthesised. To bring one back, add its name to `CUES.oneShots` in `src/audio.js` and put its file in `public/audio/`.

| File | When |
|---|---|
| `dig` | crew starts digging |
| `ui` | opening the chart |
| `buy` | buying a ship upgrade (coin + hammer) |
| `pause` | opening the pause menu |
| `thunder` | a long distant roll (Cymatics LIFE Thunder Distant 9, the rumble and its tail, 18.5 s): after lightning (delayed 0.3-2.5 s) and, on its own, every 30-80 s in strong rain; never closer than 25 s to the last one, random pan and pitch (`AudioBus.thunder`) |
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

### Custom tracks in
All the music is now the user's own, from one session (F minor, 99 BPM, 16-bar loops of 38.79 s), rendered through HOIST in the
Chaos_Grain repo (`HoistLayers`, masters in `game_audio/`): the stage-1 band and its night version, stage 2, the hut's theme, the
battle layer, the tavern, and `music_3` ("Dread", the one piece not from that session, moved to F minor). See the music map above.

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

## Mix defaults (`public/audio/volumes.json`)
`chapter` and `dig` at 40% (they were too loud). Change them in the F8 mixer and save a new volumes.json.

## The glimpse: silence
`AudioBus.hush(k)` scales the master gain (0 = normal, 1 = silent) on top of mute and the master level. The glimpse
(`glimpse.js`) uses it to take every sound away for about nine seconds, once. No new sound was added for it: the
silence is the effect.

## Quest and chapter cues (quieter)
The quest-complete and new-quest cards play `discover` at half volume (charting an island keeps it at full); `chapter` is at 0.25
in `public/audio/volumes.json` (was 0.4).
- `buy` is at 0.3 in volumes.json; the `coast` bed drops to 30% while you are docked (was 85%).
