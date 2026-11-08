The game's sounds. Most are recorded files (the stage-1 band `s1_*`, the tavern `tav_*`, `music_3`, the sea, rain, storm,
thunder, forest); the kept interface effects (ui, dig, buy, pause, chapter, fail, success, card, roll_d6, roll_d20, cast, bite, catch)
are still the synthesised placeholders. Replace a file with your own using the same name and it plays in the game.
Only cues listed in `CUES` in `src/audio.js` are loaded: anything else the game asks for is silent on purpose, and a missing
listed loop or effect is not synthesised any more except the placeholders above. See docs/AUDIO.md.
`.ogg` preferred; `.mp3` and `.wav` also work (if both exist, `.ogg` wins, so delete the old `.ogg` when you switch format).
