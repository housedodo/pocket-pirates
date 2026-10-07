# Pocket Pirates

A wholesome little PS1-style pirate sailing game that slowly turns into cosmic horror.
Browser game: Three.js + Vite, no art assets (everything is generated in code).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/
```

## Controls
| Key | Action |
|---|---|
| A / D (or arrows) | steer |
| W / S | set / reef sails |
| E | interact (harbour shipwright / upgrades, dig for treasure) |
| Esc or P | pause menu (resume, controls, log, sound) |
| M | captain's log + sea chart |
| mouse drag / R F | tilt camera (third-person <-> top-down) |
| wheel | zoom |
| H | hide HUD |

Wind matters and shifts over time: sailing downwind is fast, straight into it is slow. A day/night cycle runs (5 min per day). Earn gold from treasure and charting, then buy ship upgrades at any harbour. Touch devices get on-screen buttons.

## Debug / preview
- `1`-`5` force a dread stage, `0` returns to automatic (dread rises with distance from home), `[` `]` shift the hour, `` ` `` shows a debug line.
- URL params: `?seed=42`, `?dread=0.8`, `?fresh=1` (ignore save), `?hud=0`, `?zoom=24&pitch=0.7`, `?x=0&z=-50&h=0`, `?time=0.8` (0 = midnight, 0.5 = noon).

## Docs
- [docs/DESIGN.md](docs/DESIGN.md): design, how it works, tunables, **backlog**
- [docs/AUDIO.md](docs/AUDIO.md): sound ideas, guidelines and the cue list (drop files in `public/audio/`)
- [docs/concept/](docs/concept/): in-engine concept frames (`concept-sheet.png`)
