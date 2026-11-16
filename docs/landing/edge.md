## The Edge, sailed (2026-11-16)
- Owner: "a playable sequence instead of a short non playable sequence" (CANON 2026-11-16). `src/systems/edge.js` is rewritten;
  its look moved from `concepts.js` (buildEdge, removed there) to `src/systems/edgeworld.js`. Same place, same things.
- The helm answers throughout: no camera override, no letterbox, no locked keys (`rt.edgeLock` and `body.edge` are gone). The
  sea pulls: `edgePull` moves the ship towards the lip (broad and gentle far out, steep close in, growing after about two and
  a half minutes) and back along it at the ends of the stretch; the wind turns to blow over the lip, so getting out is a beat.
  Read on the water, not told: foam dashes racing to the lip, the wind ring, the lamp's flame leaning to the lip, the sound
  going as the lip nears and coming back as you leave.
- Along the lip each thing comes out of the dark as the ship draws level (the hooded one where the lip is met; the head and
  the arches one way, the tower and the pillars the other). The pillars are scaled with their distance from the ship, so none
  ever gets smaller. Each thing, once looked at and then out of sight, is changed once: the hood turned a little to where the
  ship was, the other eye open, a storey more, a pillar more, an arch fewer. The ends of the stretch close in white mist.
- Two ways out: over the lip (stepped white mist as before, the ship 180 back, heading for Tama, sail slack) or out past 390
  from the lip (the lip goes back into the mist; nothing marks it). `state.story.edgeWay` = 'over' | 'out'; `edgeWay()` reads
  saves without it as 'over' (the watched sequence always went over). Nothing reads it yet.
- Still once a voyage (`story.edge`). `story.edgeRun` (lip, heading, ends, time, changes) picks the Edge up again after a
  reload mid-way. The trigger now looks at the cell descriptors: the stretch ends short of any island on the line of the lip
  (at least 300 each way), and needs the ship's way to the lip clear; islands out in the dark are hidden while it runs.
- Fixes on the way: the trigger's `rt.lostK > 0` (which held the Edge off for a very long time after any spell lost in fog,
  since lostK only decays) is now `> 0.01`; the full-dread clock in `abyss.js` (the Eye awakening) holds while the Edge runs.
- Tuning in `EDGE` at the top of `edge.js`: AHEAD 240, LIP_HALF 560 (LIP_MIN 300), PULL_R 340, EXIT_D 390, C_FAR 2.5,
  C_EDGE 8, HUNGER 0.8 over 150-240 s, END_V 6, FADE_IN 8, REVEAL 120-270, OVER_D 4, LOOK_T 4, AWAY_T 2, HUSH 0.85, REWIND 180.
- Verified headless (scripted runs, dread 0.92, no console errors in any): hands off (carried over in about 12 game seconds at
  full sail, white mist, then 180 back pointing at Tama); along the lip both ways (each thing revealed in turn, second looks
  fire, the end mist and the water running back hold the ship near the end); out under sail (beating, about 55 s) and under
  oars (about 70 s); pause menu and log freeze it and hand it back; save mid-way and reload (picked up at the same lip and
  time, then carried over; a second reload does not start it again); an old save; the demo (nothing starts, the dev hook
  refuses). Screenshots in `docs/proposals/edge/`.
- Not verified: feel, how hard the pull is, the pacing in real time and the sound (headless runs at a tenth of speed); how
  often the trigger finds a clear stretch in real deep-dread sailing (islands are dense out there; it retries every 2 s).
- Open (owner): whether the Eye may awaken during the Edge (now: its clock holds); whether 'over' and 'out' should ever mean
  anything (the flag is kept, unused); the tuning numbers above.
