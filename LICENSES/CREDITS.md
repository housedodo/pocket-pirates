# HOIST: credits and licences

Ship this folder with every build (the desktop app copies it in; put it in the itch.io zip too).

## Code and art
Everything in the game (models, textures, sky, water, UI) is generated in code by the HOIST team.

## Third-party
| What | Licence | File |
|---|---|---|
| three.js (3D engine) | MIT | `three.js-MIT.txt` |
| Pirata One font (Rodrigo Fuenzalida, Nicolas Massi) | SIL Open Font License 1.1 | `font-pirataone-OFL.txt` |
| DotGothic16 font (The DotGothic16 Project Authors) | SIL Open Font License 1.1 | `font-dotgothic16-OFL.txt` |
| Electron (desktop build only; its own licences ship next to the app) | MIT + Chromium licences | in the app folder |

## Sound
Most cues are rendered by the game's own synthesiser (`src/synth.js`).

**To check before selling:** two cues are outside recordings. Note the source and licence here, or replace them.
| Cue | Source | Licence |
|---|---|---|
| `gulls.ogg` (gull colony) | supplied `seagulls.mp3` | ? |
| `coast.ogg` (coastal breeze, distant gulls) | supplied recording | ? |
