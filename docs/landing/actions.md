## Actions, interaction and harbour flow (2026-11-16, owner: "build the changes proposed", SYSTEMS_FEEL package 1)
- **A menu never ends what you were doing** (G-01): Esc, the log, a card, alt-tab: a dig, a fishing line (any stage) and a timed action
  wait under the menu and come back on close (`suspend`/`resume` in `fishing.js`, `digging.js`; the heave survives a menu too).
  A movement key held through a menu steers again from its first key-repeat; actions never repeat (G-12).
- **E forgives** (G-03, G-04, G-13, G-14; numbers at the top of `src/systems/interact.js`): a running action keeps its target until it
  ends (a passing boat or a torn sail no longer cancels a pick); the last thing in reach stays E-able 0.6 s and 6 units; the anchor's
  target holds over 8 more units, so E at the edge of reach at full speed still lands; an E pressed 0.25 s early fires. New order:
  the patch sits above fruit and hails, "sail to the pier" is last. The "bring the ship to a full stop" toasts are gone (six lines
  retired); a plundered isle or a secret under way simply does nothing (the dug-isle bug).
- **C works under way** (G-05): the anchor goes down and the power meter starts at speed 2.5; "Too fast to fish" is retired.
  **The strike forgives 60 ms** either side of a green or gold mark, never a red snag; **C just before the bite hooks it** (0.25 s)
  (G-06). A water's tip is shown twice, then only its name; a beach's rules twice, then nothing (G-21).
- **Space in a raider fight only fires** and never skips Mara; a Space 0.25 s before the reload ends fires when it ends (G-07).
- **Selling keeps what an errand needs** (G-08, `sellable` in `jobs.js`): Sell fish, Sell fruit and the floating market's Sell all.
  One new line, "kept for your errands", when nothing else is aboard.
- **A harbour visit lays her alongside** (G-09): speed 0, sails in. **Hold E 0.8 s on the beach** to pack up (G-10): the prompt bar
  fills; it counts as a failed dig (6 s, the chest moves). **Barrels and crates** are picked up within 6.0 (G-17).
- **Verified** (headless, a throwaway Playwright script on `window.__game` and the runtime modules): each item above in logic: the line
  and the beach survive pause and the log and show again; early hook, both strike-tolerance edges and the snag; C at speed 8 starts
  the meter at 2.2 with the anchor down; a pick survives a torn sail coming in reach and E then patches; E 12.5 off at speed 11
  heading out lands the pick at rest 16.7 off; the 0.25 s buffer fires and runs out; the grace at 15.5 off; hold-E leaves as a fail
  and a tap digs one square; ring and beach tips twice then quiet; W repeats after a menu; Space fires with a raider engaged and Mara
  speaking, and the reload buffer; selling keeps two snapper and three mangoes; docking at speed 8 leaves her at 0. No console errors.
  **Not verified:** feel (60 ms, 0.25 s, 0.6 s, 0.8 s, the docking's tidiness, the 6.0 pick-up: all H, all named constants);
  a held pad direction through a menu (the pad sends one keydown, no repeats: `gamepad.js` belongs to the controller package);
  the touch E button cannot hold to leave a beach.
