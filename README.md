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
| C | fish: cast, hook the bite, pull in (hold Space to reel) |
| Space | fire cannons at an attacking raider (auto-aimed) |
| Y | ask Mara (first mate) for a hint |
| E | interact: harbour (shipwright, job board, rumours), dig for treasure, salvage wrecks, hail passing ships |
| Esc or P | pause menu (resume, controls, log, sound) |
| M | captain's log, tabs are bookmark ribbons: Map, Goals, Quests, Riddles, Rumours, Journal, Ship, Standing (tabs 1-8 or arrows; Up/Down turn pages; J opens Quests) |
| mouse drag | tilt (up/down) and orbit around the boat (sideways); Z / X also orbit, V resets, R / F tilt |
| wheel | zoom |
| H | hide HUD |
| Q | show / hide the mission tracker and the orange target arrow |

Wind matters and shifts over time: sailing downwind is fast, straight into it is slow. A day/night cycle runs (5 min per day). Earn gold from treasure, wrecks, salvage, charting and delivery jobs, then buy ship upgrades at any harbour. Weather, wildlife and other ships roam the sea, and lighthouses only light at night. The game synthesises its own sound; drop files in `public/audio/` to replace it. Touch devices get on-screen buttons.

## Full dread (testing the effects)
The worst water (far from home, or forced with key `5`) has ten extra effects. Pause (Esc) → **Full-dread effects (test)** lists them all:
- **ON/OFF** switches each effect (saved), **All on / off** flips them all.
- **Try** jumps straight to full dread with only that effect running (press `0` in game to stop).
- **Go to full dread now** runs every effect that is ON together.
- Leviathan has an extra **Ending** button that plays the "Eye awakens" sequence (it also triggers on its own after ~2.5 minutes at full dread).

Glass calm · Corrupted HUD · Mad wind meter · Mara breaks · Lighthouses stare · Watchers (4 styles: distant shapes, pale villagers, tall thin ones, waders) · Living map · Time loop · Wrong ocean · Wrong catches · Leviathan & the Eye

Dread only depends on distance from home; it does not build up over time (only the leviathan ending is time-based).

## Debug / preview
- `1`-`5` force a dread stage, `0` returns to automatic (dread rises with distance from home), `[` `]` shift the hour, `` ` `` shows a debug line.
- URL params: `?seed=42`, `?dread=0.8`, `?fresh=1` (ignore save), `?hud=0`, `?zoom=24&pitch=0.7`, `?x=0&z=-50&h=0`, `?time=0.8` (0 = midnight, 0.5 = noon).

## Docs
- [docs/DESIGN.md](docs/DESIGN.md): design, how it works, tunables, **backlog**
- [docs/AUDIO.md](docs/AUDIO.md): sound ideas, guidelines and the cue list (drop files in `public/audio/`)
- [docs/concept/](docs/concept/): in-engine concept frames (`concept-sheet.png`)
