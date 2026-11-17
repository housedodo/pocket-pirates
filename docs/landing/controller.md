## Controller, camera and accessibility (2026-11-16, owner: "build the changes proposed", SYSTEMS_FEEL package: controller)
- **A pad reaches every screen** (G-02, `src/gamepad.js`): in the title, pause (every panel), harbour, log, shipyard, cards, caves,
  the hut, the tavern dice and the end cards the d-pad or stick moves a focus between the screen's buttons (spatially; a volume slider
  takes left / right), A presses, B backs out one level then closes, LB / RB change the tab or bookmark. At sea B does nothing and Start
  pauses. A button or stick still held from the screen before waits to be let go, so the Start that opened the pause does not close it.
  The tavern games read the pad as keys (A / RT play, X / Y bid, B leaves).
- **The stick steers by its angle** (G-11): dead zone 0.15, power 1.5, keys win (`rt.padSteer`; `PAD_TUNE` in `gamepad.js`).
- **Prompts follow the device** (G-18, `src/input.js`): "[E]", "press C / Space", "(S)", "Esc" read "[A]", "X / RT", "(stick down)",
  "Start" once the pad was last used, and the player's own key after a remap. One pass over the shown text; the code keeps one line.
- **Rumble** (G-19): Pause > Settings > Display > Rumble, off under reduced motion; bite, catch, hit, coral, the anchor biting, the
  sail-strain warning (`RUMBLE` in `input.js`); never for a horror beat, never at the Edge.
- **Keys** (G-20): Pause > Settings > Keys, one row per action, press-to-set, swaps on conflict, Reset all keys; the Controls page and the
  F1 line name the keys as they are. Saved in `settings.keys` (only the moved actions; an old settings file loads as before).
- **Zoom without a wheel** (G-15): - / = and the right stick, x1.6 a second. **F** no longer snaps a low tilt up to 0.3.
- **Look-ahead** (G-16): 0.2 x zoom at rest to 0.32 at full speed, eased 1/s, at rest when anchored.
- **The ship behind a hill** (G-27): real, measured: in a sweep of 37 harbours (16 headings x 3 zooms x 2 tilts) the ground stood
  between lens and deck in 32 of 3552 views, all at tilt 0.3, none at the default 0.72. While the player's tilt is blocked the tilt
  rises up to 0.25 over 0.5 s and settles back after (`OCC_*` in `ui/camera.js`).
- Docs: DESIGN (Camera, Input with the pad table; the hint is "Y, pad: hold View"), STYLE (Comfort), DEMO_CHECKLIST (the controller row:
  B does not close at sea).
- **Verified** (headless, fake `navigator.getGamepads`, full game and demo): title focus and Set sail by pad; Start opens the pause and
  the same press does not close it; d-pad and A through Settings > Display (Rumble toggles and pulses) and Keys; press-to-set gives
  Interact K, then E does nothing, K opens the harbour and the prompt reads [K] (keyboard) or [A] (pad); A presses a harbour button
  without closing it, B closes; Y opens the log, RB turns the bookmark, B closes; a card chosen and closed by d-pad and A; the shipyard's
  Done by A; stick 0.1 -> 0, 0.5 -> 0.264, 1 -> 1, rudder follows; right stick and = zoom; F from tilt 0.1 rises smoothly; look-ahead 0.31
  at speed 11; View tap Q, hold Y; the bite cue rumbles once; no console errors. The occlusion lift starts at a blocked pier.
- **Not verified:** feel of the stick curve, the look-ahead, the lift and rumble strength (RULES 40); a real pad in Chrome and Firefox;
  RB in a harbour with more than the Board open (a fresh voyage has only the Board); how the pad focus looks on buttons outside
  `.menu` (the log's bookmarks and page arrows, the harbour's signposts, the shipyard's turn buttons) may need design's eye.
