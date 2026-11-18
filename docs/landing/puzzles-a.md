## Regional mechanics and puzzles, first set: Home, Crown, Free Cays, Deep (2026-11-17, owner: "build the suggested puzzles", REGIONAL_CATALOGUE section 9 and P-HOME-4)
- **Noon slack** (M-HOME-1, demo too; `systems/home.js`): from 11:30 to 12:30 within 260 of Tama the noon hush holds for the hour (it no
  longer rests on the bell's one stroke, so B-12 can be decided freely): the swell lies down, no new gust patch forms, the Sound's
  current lanes run at half strength and their foam fades with them. The seabed showing in the shallows is not built (design's,
  `seawater.js`).
- **Fishers' marks and the empty mark** (M-HOME-2, P-HOME-2, demo too; `systems/homemarks.js`): three marks a seed, each on the line
  through two tall things (Tama's light, Wick's light, the Grey Tooth, the Drowned Bell, Hollowgreen), past the nearer one, at the most
  open water in the Sound, never on the Kestrel's lines and never by a harbour. A Tama or Velto boat lies at anchor on each from 06:00 to
  15:00 (out from 04:30, in by 16:30). Within 12 of a mark the bite wait is x0.7 and snapper, bream and grouper bite as in their own
  water and hour. On this seed all three marks have Tama's light as the near thing (the shuffle per seed decides which pairs fit).
- **Gulls go home** (M-HOME-3, demo too; `secrets.js`): in Home Sound the dusk gulls fly to Tama's harbour, at dawn out from it, and fly
  60 off a shore (120 elsewhere: the Sound is too crowded for the lesson to show otherwise).
- **The Sunday race** (P-HOME-4, demo too; `systems/race.js`): on a Sunday with the ship in Home Sound the passing regatta stays away and
  its five hulls gather off Tama instead: four boats hove-to beside a committee boat with a large flag, on a course that never leaves along
  the main pier (126 from the pier head on this seed). At 14:00 the flag comes down and they make sail together, round a rolled isle 150 to
  220 out and come back. Start by the committee boat, round behind the isle, pass it again ahead of at least one boat: one row on Tama's
  board, "The regatta purse", 30 to 60. The risk is contained by taking the regatta's own hulls (no extra boats), a start offshore, and
  nothing said; AI is a simple polar (x0.5 close to the wind) with four fixed speeds.
- **Pennants come down** (M-CROWN-1, demo too; `systems/crown.js`, `regiondecor.js`): the destination's signal mast flies one pennant per
  game hour left on a timed run (four for a 110 s run) and strikes one each hour.
- **Rowing the lane** (P-CROWN-1, demo too): it already worked (`inLane` is where, not how); the first time, Mara: "Oars, Captain? In front
  of the whole town?"
- **The line already written** (P-CROWN-5, full game only; `systems/crown.js`): once a voyage, after `arrivals`, the first timed Crown run
  of 350 or more offered shows its faint next line black. Taken, no grace: on time, a clean tick and a faint black mark struck through
  kept in the row (`state.story.lineStruck`); late, the usual black line. One flag (`state.story.lineAhead`), never in the log.
- **Turned-round day** (M-FREE-1, demo too; `regions.js caysAsleep`, `ui/harbour.js`): 07:00 to 17:00 a Cays harbour sleeps: no passengers,
  residents, commissions, rumours, old stories or overheard lines; only deliveries out of the Cays; an empty board reads "The quay is
  asleep. Come back after dark." While the main goal in hand needs a harbour's people (Earn your keep, Passage, Meet the locals, Ask
  around, Perrin's Cays letter) the Cays stay awake. The sleeping figures on the quay are not built (design's).
- **Lamp out to see the shore** (P-FREE-3, demo too; `systems/farlights.js`, `psx.js uFarLight`): at night lights further than 150 burn at
  0.55 with the lamp lit; with it out, after 2.5 s and over 1 s more, they burn at x1.8 and carry twice as far as with the lamp lit. First
  time in Cays water at night, Mara: "Lamp out a moment. There. Lights." Fixed on the way: the ship's lantern pool shared `mats.glow`
  with every lantern string and float lamp and dimmed it to 0.05 with the lamp out, so they all went out with your lamp; the pool now
  has `mats.shipGlow` and the shared material keeps the level it had with the lamp lit.
- **Against the gulls** (P-DEEP-1, full game: the demo has no dread): nothing new; checked that past dread 0.55 the dusk gulls fly away
  from land.
- **Numbers:** all in `src/regions.js` (Home Sound, Crown, Cays and far-light blocks) except the marks' placement rules (top of
  `systems/homemarks.js`) and the race's waypoint radius, pier avoidance and line spacing (top of `systems/race.js`). DESIGN.md has the
  table. CANON 2026-11-17. No lore ID adopted.
- **Verified** (headless, the built game through `vite preview`, `window.__game`): slack: homeSlack and homeCalm reach 1 at 11:45 near Tama,
  no gust patch born in the slack, a ship at rest in the Tooth Run drifts 1.52 units/s against 2.98 after 13:00, it lets go beyond the
  bell's reach and after 12:30; marks: three on the seed, all inside the Sound, the boat on its mark at 10:00 and gone at 16:48 with the
  ship away, waitMul 0.7 on the mark and 1 at 20 off, snapper and grouper x33 and x133 fit on the mark at 15:36, tuna unchanged, the same
  in the demo; gulls: home dusk to Tama (0.15 rad), home dawn out from it (0.10), elsewhere to the nearest land, deep dusk away from it
  (3.04); race: five hulls and no passing regatta, none within 126 of the main pier head, flag down at 14:00, all four move, the start,
  the rounding, a finish ahead of all four gives 60, the row on Tama's board pays once, the same in the demo; pennants 4, 3, 0 over a 110 s
  run and 6 elsewhere; rowing in the buoys sets the lane and the oars flag (it waits out the story quiet near the hut, as it should); the
  line already written: black on a 699 run, on time gives a clean tick and the struck mark, never again on 40 later offers, never in the
  demo; Cays boards at 10:00 over 12 serials: no passage, commissions or residents and no Cays-bound delivery, at 21:00 all of them; no
  gossip by day; the Passage goal keeps them awake; same in the demo; far lights 0.55 lit, 1.8 and twice the lit reach out, 1 by day,
  Mara's line once. No console errors in any run. Screenshots in `docs/proposals/puzzles/`.
  **Not verified:** feel (the slack's calm, the race's fairness and pace, the 350 "tight" run, the 3 s eye adjustment: all H, all named
  constants); whether the far lights read at full resolution on a real screen; a race sailed start to finish in real time (the boats were
  watched to start and move; the captain's legs were placed by teleport); the board strings ("The quay is asleep...", "The regatta purse")
  are not picked up by `story_export.py`, like the board line they sit beside.
- **Touches other areas:** design: `psx.js` (one uniform, the far-light lines in the shared shader, `mats.shipGlow`), `ship.js` (the pool's
  material), `regiondecor.js` (each pennant its own state prop), `index.html` (`.ledgerrow .struck`); STYLE.md updated. Story export:
  `scripts/story_export.py` reads `systems/crown.js`, `farlights.js`, `race.js` as main.js text.

### Walkthroughs (for the owner's guide)
- **Noon slack.** Near Tama around noon. The water goes glassy, the cat's paws stop coming and the current streaks fade; the bell swings
  once at twelve. Nothing to do: drift, anchor, fish in the calm. For about half a minute of play you get a breathing space at midday.
- **Fishers' marks.** In Home Sound by day. You keep seeing the same three fishing boats at anchor in the same places. Sail up to one and
  look past it: two tall things (Tama's lighthouse and something behind it) stand in line. Fish there: the bite comes sooner.
- **The empty mark.** After three in the afternoon the boats row home. Sail to where one lay, line up the same two things, anchor and
  fish: a morning snapper bites in the afternoon, a golden grouper bites with no wreck in sight.
- **Gulls go home.** At dusk in Home Sound a loose V of gulls crosses ahead of the bow, always flying toward Tama (at dawn, away from it).
  Follow them and you are home, no dot needed.
- **The Sunday race.** Be in Home Sound on a Sunday after one. Off Tama four small boats sit still beside a boat with a big flag. At two
  the flag drops and they all make sail. Follow them round the isle they head for and back to the flag boat, using gusts and the current
  to pass them. Beat at least one and Tama's board has the regatta purse for you.
- **Pennants come down.** Take a timed delivery to a Crown harbour. As you come in sight, count the pennants on its tall white mast: one
  for each hour you have left. One comes down every hour; none left means you are late.
- **Rowing the lane.** At a Crown harbour with the wind blowing straight out of its lane, furl and row (G) up between the red and green
  buoys. Mara teases you once. Dock: the harbourmaster ticks a clean line in the book, and clean lines raise Crown pay.
- **The line already written.** Full game, after the Customs Pier. One long timed run on a Crown board shows its next line already black
  in the record. Make it in time (use the current and the gusts) and the black turns into a tick, with a faint struck-out black mark left
  beside it for good. Late, the black line stands. It happens once.
- **Turned-round day.** Visit a Free Cays harbour by day: the board is thin, the quay is asleep, the stalls are shuttered. Come back after
  five in the evening: passengers, residents, commissions and the night market are all there.
- **Lamp out to see the shore.** At night in the Cays, looking for a harbour, the far lights are faint inside your own lamp's glow. Press
  L: the near water goes black, and after a moment the far windows and lantern strings come up bright. Steer for them, light up at the
  pier. Mara says so the first time.
- **Against the gulls.** Far out, deep in the wrongness, at dusk: the gulls fly out to sea, away from land. Remember Tama's gulls: turn
  the bow to where they come from, and land is that way.
