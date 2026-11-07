# Pocket Pirates: progress and open story threads

A living document. It records what is built, which storylines are started but not resolved yet,
and ideas waiting to be connected. Update it whenever a feature or story beat lands.
For how things must look, see `STYLE.md`; for how systems work, see `DESIGN.md`.

## 1. Where the game is now

**Title:** the game is now called **HOIST** (repo and file names still say pocket-pirates). The title screen is live:
the ship alone on open sea, one of six random scenes (morning, day, misty gold dawn, dusk, night, rain). Only
Set sail (or New voyage) leaves it, with a fade to black; arrows/W S move the pennant, Enter chooses.
New voyage goes straight into the game (no title). A new voyage starts moored alongside Tama's pier, sails furled.
`?title=night` forces a scene, `?notitle=1` skips the live scene.

### Chapters (the main thread, `objectives.js`)
- The story runs in chapters, each a few steps with nudges from Mara (no markers). A chapter card (CHAPTER IV,
  title, act) shows when one begins; Mara gives a gentle hint after ~4 minutes without progress.
  - I Sea legs (sail, dock at Tama) · II Perrin's riddle (dig, shipwright) · III Earn your keep (delivery, chart 8)
  - IV Check my chart (Perrin's note at Tama names a far island and a detail; sail there and look)
  - V Strange notes (two bottles that speak of a black hut; a tavern gossip elsewhere reveals it)
  - VI The table (first throw at the hut) -> demo end card "TO BE CONTINUED", then "Keep sailing" lifts the fog.
- **Unlocks:** fishing from II; oars and passengers from III; crew, tavern dice, haggling and encounter cards from IV.
- **The fog wall:** each chapter allows a radius from Tama (430, 430, 820, 1250, 1650, 1650). Near it the fog closes
  in; past it the ship is turned back. The chart greys out everything beyond.
- **The hut:** physically there all along, but the door does not open and it is not on the chart until chapter V's
  gossip. Then it appears on the chart by itself; the next time the chart opens, Mara asks who drew it.
  The Lady is never seen (the hut text describes only a chair in the dark).

### Core
- Endless procedural Caribbean (Three.js + Vite), deterministic from a seed: islands in 110-unit cells,
  550-unit sectors with factions (Crown Traders, Free Cays, Reef Brotherhood, Lantern Guild, The Drowned).
- PS1 renderer: low-res target, Bayer dither, 15-bit colour, vertex wobble; dirty, low-poly, grimy look.
- **Dread** depends only on distance from home (0 at Tama, full at about 2200 units). Five stages:
  Sunny, Off, Wrong, Eerie, Cosmic. It does not grow with time.
- Sailing with a shifting wind (gusts, efficiency by heading), day/night (10 minutes: 7.5 min of daylight 06-19,
  2.5 min of night; rest at a harbour tavern from 17:00 to sleep until 06:00 and mend the hull), weather
  (rain, storms, fog, lightning, dead calms), lighthouses lit only at night.

### Things to do
- Main goals with Mara (first mate, typewriter dialogue, hints with Y) and side goals.
- Harbours: job board (deliveries), commissions (fish, fruit, lost crates, bounties, spotting animals),
  market (sell fish, fruit), shipwright (upgrades), shipyard (paint, sails, flags, figureheads).
- Treasure islands with riddles on arches; dig on the right shore.
- Fishing minigame (species change with dread), fruit picking, wrecks, barrels, bottles with notes.
- Other ships (5 kinds, factions), hailing (reputation-based), trading, optional combat with raiders.
- Captain's log (M / J): pixel tome with bookmarks (Map, Goals, Quests, Riddles, Rumours, Journal,
  Ship, Standing); rough pixel chart (island names only when zoomed in; the ship has a red "you are here" ring). Mission tracker toggled with Q.

### Horror layer
- No tentacles any more (removed on purpose): the dread should be subtle and slowly horrifying, built from small wrong details (people, boats, tides, wildlife), not monsters. The leviathan arches at the very end remain.
- Islands swap to "wrong" decor above half dread, crows, ghost ships,
  black sun, star-eye constellation.
- **Full dread effects** come one at a time: one creeps in (3-12 s), holds (15-90 s), fades (5-19 s), then nothing
  for 8-120 s before a different one starts; every length is random. Calm, wind, HUD and ocean fade by strength.
  After ~140 s in the worst water the leviathan comes regardless, and the Eye opens at ~170 s. (always on for players; with `?dev=1` the pause menu has a test list to switch or try each one):
  glass calm, corrupted HUD, mad wind meter, Mara breaks, lighthouses stare, watchers (4 looks),
  living map, time loop, wrong ocean, wrong catches, leviathan + "the Eye awakens" ending.

### World layout and feel
- The sea is mostly open: island chance follows a slow noise field (about 5-30% of cells, ~17% on average), so
  there are archipelagos and long lonely stretches. Villages never sit within two cells of each other (median
  ~430 units apart); Tama's waters stay clear. Harbour Tama is the big home island (radius 38) with its pier facing the start.
- "LAND HO!" title card the first time an uncharted island comes within ~150 units (Mara comments on new kinds).
- Harbours are entered only at the end of their pier ("Sail to the pier to go ashore" elsewhere along the shore).
- Villagers stroll slowly between random spots with pauses instead of pacing the dock.

### Errands and passengers
- Only one errand is followed at a time (delivery, passenger or a commission); pick it with "Follow" in the log's
  Quests tab. Only the followed commission's crates float in the sea; the tracker shows "+N more in the log".
- Nothing completes on arrival: dock at the pier and use the top "FINISH HERE" section of the harbour board
  (deliver goods, drop off a passenger, hand in a finished commission).
- Passengers (`src/passengers.js`) sometimes offer to pay for passage to another harbour. While sailing they talk:
  little stories, gossip, treasure hints (added to rumours), dark lines at high dread, and banter where Mara answers.
  The captain never speaks.
- Digging, picking fruit and searching wrecks need the ship completely stopped (S).
- Dolphins never jump across islands.

### Economy (slower on purpose)
- Income roughly halved: treasure pays half its table value, charting +5, goals x0.6, deliveries, passengers,
  commissions, fish and fruit all lower. The first treasure (Hollow Cay Galen) always pays 120 so the
  "Spend your loot" step affords one starter upgrade.
- Shipwright prices x1.3 / x1.6 / x1.9 for levels 1 / 2 / 3 (e.g. sails 156 / 480 / 1235).

### Small things
- Sail and hull upgrades are visible on the ship (patches, seams, flying jib; strake, iron bands, bow cap).
- Cannons and raiders are switched off until after the demo (UNLOCK.cannons = 6): no ammo on the HUD, no cannonballs
  for sale, no hostile raiders. The code is all still there.
- Space or Enter moves Mara's text on / closes it. Fishing casts with a rod animation (back, flick, bobber arcs out).
  The rod is a slim bamboo cane (~1.75 long, a third of the hull) with a cord-wrapped grip.
- The wind never snaps: the felt wind eases toward its new direction over a few seconds.
- Fullscreen: a Fullscreen item on the title menu and in the pause menu (Esc or F11 leave it too); hidden where the browser cannot do it.
- Log: pale paper bookmarks with a bent corner, the open one pulled out flat; legend and page keys on readable strips.

### Sailing into the wind
- Close-hauled (about 45° off the wind) keeps ~65% speed, dead upwind ~20%: zig-zagging (tacking) pays.
- Chapters I-II are gentler: dead upwind ~45%, and around Tama the wind leans across the route to Hollow Cay Galen.
- Mara's one-time tip when you point into the wind; side goal "Beat to windward" for making headway upwind.

### Weather that matters
- Storms shove the ship downwind (more with the sail up); waves hitting the side wear the hull. Turn into them or reef.
- Dead calm: no wind for a while. G puts the oars out (animated: they swing out from the rail and stroke); W rows
  forward slowly, S backs water, wind does not matter. G again stows them and the sail goes back up.
- Thick fog (from day 3 or further out): the compass and tracker blur, Mara rings the bell; trust the lighthouses.
- Deliveries made in a storm pay 60% extra; passengers get seasick in storms.
- Signs instead of HUD text: a red evening sky means a storm is coming; the harbourmaster only says to watch the sky.
- Later: rain makes fruit regrow and rare fish bite, wet decks steer slower.

### Lines
- Every line in the game is collected in `docs/QUOTES.md` (with the odd demo lines in section 2).

### Tabletop (src/tabletop.js)
- **d20 checks:** a low-poly 3D d20 (same build as the Lady's, `src/dice3d.js`, paler bone) tumbles on screen against a number (Seamanship, Talk, Luck); crew traits and standing add
  bonuses, natural 20 always wins, natural 1 always fails. Used by haggling (Market tab, once a day per harbour:
  +30% / +50% on a 20, or -10%) and by encounter cards.
- **Encounter cards:** every 3-6 minutes on open water a card turns over (floating chest, stowaway, peddler, squall,
  castaway, shoal, sails on the horizon, an empty rowboat, a singing buoy, the same gull, and at high dread a patch of glass). Two choices, many with a roll. Keys 1/2.
- **Crew:** up to two hired hands (taverns, Market tab), each silent, with a trait (Lucky, Old salt, Silver tongue,
  Strong rower, Sharp-eyed, Superstitious) and a wish (see a volcano/atoll/mangrove, visit family in a harbour).
  A fulfilled wish adds +1 to their bonus. Castaways can join for free. Listed in the log's Ship tab.
- **Dice at the tavern:** Pig against a local, first to 30, 10g stake (win 20g, sometimes a rumour). Space roll, H hold. A 3D pixel d6 tumbles for every throw, the local's too.
- Not yet: the Lady's die and these checks are deliberately separate; inspiration tokens could link them later.

### Tutorial additions
- **New starting goals:** *Dead calm* (chapter III opens with it: the wind dies until you have rowed about 50 units with the
  oars (G, then W) and caught a fish (stop, C); Mara explains both) and *Meet the locals* (hire a hand, or sit down for a
  game of dice). Goal order is now sail, harbour, dig, upgrade, calm, job, chart, tavern, perrin, checkchart, bottles, gossip,
  hut; saves from older builds may repeat or skip a goal.
- **Tutorial marks:** the harbour sign the current goal needs gets a bobbing gold arrow, and the button inside gets a
  pulsing gold outline (Shipwright's buy button, the Board's accept / deliver buttons, the Tavern's hire / dice buttons).
  Only goals with `tab` / `mark` in `objectives.js` have them (the early ones); later goals carry none.
- **Riddles:** only the first one (Perrin's, `giveMap(..., true)`) names the island and marks it on the chart. Any later riddle
  handed to the player is words only: no island name, no marker, no bearing in the Riddles tab until the island is charted.
- **Fullscreen:** New voyage reloads the page, which always leaves fullscreen; now the first key press or click after the
  reload takes you back in.

### Quest cues (design A, built)
- Finishing a main quest shows a big gold QUEST COMPLETE banner (title and reward), then about 2.7 s later a NEW QUEST card
  with the next quest's title and one line of text. The tracker flashes with a red NEW tag and the wind ring pulses for
  about 8 s. Side goals keep the small toast. The chapter card replaces the banner when a new chapter starts.
- Mara now starts talking at once when a quest completes (it no longer waits for her to finish a line, and the next
  quest's intro follows 0.8 s after she is done instead of 7 s); her lines also hold a little shorter.
- Concepts for the other designs: `docs/concept/quest-cues.html`.

### Lighthouses (six designs)
- Picked from the island's seed (`lighthouseKind` in world.js); Tama always keeps the classic red-and-white one.
  - **classic:** banded tower, red cap; stripes can be red, black, blue or amber on white.
  - **slim:** tall and white, one black band, a green door.
  - **brick:** a square stone tower with the keeper's cottage against it.
  - **iron:** an open iron frame on four legs, a red lantern room.
  - **squat:** short and fat, checkered blue and white, a wide gallery.
  - **pagoda:** a wooden three-tier lantern tower with glowing windows.
- All six light up at night and swing their beam onto the ship at full dread. `__game.lighthouses()` shows them on a raft.
  Picture: `docs/concept/lighthouses.png`.

### World variety
- Six villager designs, seven house kinds (taverns, bell towers, stilt houses...), three new island kinds:
  volcano (rare and big, ~1 in 250 cells), atoll, mangrove (each with a dark-mood detail). All emoji replaced by pixel glyphs.
- **Village life by the hour** (`villagePhase`): dawn 5-8 fishers on the dock and chimney smoke; day 8-18 market
  stalls, full crowd, dockers, laundry; evening 18-22 crowd and lanterns at the tavern; night 22-5 empty streets and
  one watchman with a lantern. Each harbour has a liveliness from its seed; sleepy villages (about 30%) have a
  siesta from 12-15 (hammocks, nobody else) and no night watchman. Atolls have a fisher family by day.
- `__game.scaleShot()` shows villagers next to houses and the ship. `__game.showcase('villagers' | 'houses')` puts a lineup on a raft for screenshots.

### Harbour greetings
- Docking now shows the harbour name across the top of the screen and keeps the menu low and compact.
- Sometimes a villager speaks first, in a typewriter box with an 8x8 portrait (`src/greetings.js`). Space, E,
  Enter or a click finishes the line, then the menu comes up. The line stays under the harbour name while you
  are ashore.
- **Rare on purpose:** always on the first visit to a harbour, then about 1 in 3 dockings, at most once per
  harbour per day and never within 4 minutes of the last one. Story beats (the hut directions) always speak.
- Who speaks depends on the hour (fishers and dockers at dawn, the fish-stall woman by day, the fiddler and
  lamplighter in the evening, the night watchman at night). Each villager has lines of their own; lines also
  come from the hour, the weather (rain, storm, fog, overcast, calm) and the dread stage.
- From stage 2 on, sometimes nobody says anything: a dark figure with pale eyes, and three big pixel dots, one every 1.3 s,
  as if they are just staring. More often the worse it gets.
- The shipwright's line moved to the top of the Shipwright tab.

### Newest: the dark hut
- One island 4-6 cells from home (out of sight of the start) has a crooked black hut on stilts,
  a purple window, bones on poles, a dead tree and a ring of pale stones. On the chart it is a black hut icon.
- Inside: an old woman who never speaks, and an old twenty-sided bone die (rendered low-poly and pixelated).
- One throw per in-game day:
  - **11-20:** a small prize (gold, 10 + 2x the roll, +40 on a 20); 17+ also gives a trinket for the journal.
  - **10:** nothing happens. "She almost smiles."
  - **1-9:** the screen flips to the full-dread look for a moment and back; she says nothing and writes something down.
- Mara comments after the first visit and after the third bad throw.

### After the first demo playtest
- Dice: the d6 now shows the rolled face straight on (the old tilt made you read the top face, which was a different
  number); the d20 leans in on the face that came up, in the checks and at the hut.
- Bottles are bigger and flash a gold glint every couple of seconds (bigger with distance); pickup range 6.5.
- In fullscreen, Esc pauses instead of leaving fullscreen (keyboard lock, Chrome/Edge; hold Esc to leave). P also pauses.
- Messages (quest done, rumours) sit above every menu.
- One villager line per day in total, wherever you dock (story beats excepted).
- The progress bar names the activity: reading the inscription, digging, picking fruit, salvaging the wreck.
- Gulls: about 10 instead of 22, smaller, faster, with wandering circles, swoops and glides.
- **Docking redesign (layout A, signposts on the pier):** the village stays in view and alive while you choose
  (people, gulls, waves keep moving; time stands still). Four places: Board (errands, passage, rumours), Market
  (standing, haggle, sell, shipyard), Tavern (rooms, hands for hire, dice), Shipwright. Red numbers on the signs:
  errands to finish here, goods to sell; "!" when an upgrade is affordable. Messages sit on the left, never covered.
- Later: more biome
  variety, deliberately not close to Dredge's look or structure.

### The die (one die, and her throws change the world)
- **One die:** the haggling and encounter-card checks roll the same bone d20 as hers. It darkens in four steps
  (`setDieWear`: days at sea / 12 + dread x 0.6) to old stained bone with a blood-dark 1. Checks do not touch the
  story yet. Haggling: a fail pays 10% less for your catch; a natural 1 pays 20% less and makes everything else at
  that harbour 10% dearer that day.
- **The day after a throw** (her last throw, that day and the next, `lastThrow()` in main.js): 20 pulls dread down
  0.3, 11-19 down 0.18, 10 nothing, 2-9 up 0.1, 1 up 0.15 (home only a shade darker; the real dark comes late). Prices: 15% up after 1-9, 10% down
  after 17-20; the harbour menus say only "Prices are up today. Nobody says why."
- **Candles:** one more in the hut for every low throw.
- **The world knows:** after the first throw the next pier greeting is about the number; later throws about half
  the time (`rollGreeting` in greetings.js). After a 1, a dark figure says only "One."
- **The bottle knew:** the second hut bottle in chapter V names the first throw (`state.story.fate`, 3-9, fixed per voyage),
  and the throw comes up that number. Mara notices. Then she reacts to the result (thicker water, a good mood, a sigh,
  or silence after a 1). The demo ends on this throw, so every voyage ends differently.
- Days without a throw (once she knows you) are written down too (`state.hut.skips`), never shown.
- The hut's bad-throw flash no longer sets off Mara's deep-water remarks.
- Possible paths (kind sea, stirring, empty table, fated thrower, refuser, tens) are in the story bible, "The die".

### Villages and the week (built: first examples)
- **The week:** Monday to Sunday (`state.dayN % 7`); the weekday shows under the harbour name, nowhere else.
  - **Market day (Wednesday), every harbour:** extra stalls and people; everything sells for a quarter more.
  - **Festival day, one weekday per harbour (Tama: Sunday):** bunting and lamps round the square; fish fetch +50%.
  - **Lantern night (Saturday), every harbour:** little lanterns float on the water round each island after dusk.
  - Mara mentions market day and lantern night in the morning, the first two times only.
- **Village customs** (one per harbour, from the seed; `CUSTOMS` in world.js), shown, never explained:
  whitewash (white walls, blue roofs), lamps lit all night, no children, a dusk choir (a ring of villagers with
  candles round the pole), fishing boats with lanterns out at night, kites every afternoon, bells (a bell tower,
  and the bells ring at noon when you are near; Tama keeps the bells). Villagers have lines about their custom
  and about the day.
- **Harbours grow with your trade** (deliveries x2 + visits): level 1 more boats at the pier, level 2 a busier quay
  and lamps along the pier, level 3 a gate and bunting the length of the pier.
- **Local charts:** the board sells a hand-drawn chart of a harbour's waters (30g, once): every island within three
  cells goes on your map.
- Screenshots: `docs/concept/village-*.png`.

### World on a schedule, life at sea, false rumours (built)
- **Tides:** two a day, a little later each day. Islands rise and sink about a third of a unit with the water, so the
  beach widens at low tide and drowns at high tide. Low tide: wrecks pay 30% more, the shallows reach further (bigger
  collision radius). The harbour banner shows the tide; Mara mentions the first low tide.
- **Scheduled arrivals:** the floating market (Friday daytime, a hailable ship that buys your hold for a third more,
  sells a hand-drawn chart and oddments), the regatta (Sunday 13-16h, five boats racing past; they wave but do not stop),
  the whale migration (Thursday 7-18h, whales pass often and all head east).
- **Storm front:** every sixth afternoon (after chapter III) a front builds from noon; the evening before, a red sky
  warns of it (Mara says so once). Scaled by dread.
- **Harbour fishing boats:** every harbour has one: out at dawn (6:30-8:00), at its spot all day, home 15:30-17:30. About
  1 day in 11 it does not go out; in wrong water (dread 0.4+) about 1 in 11 it stays out all night and is back by
  itself before dawn, nobody aboard. Villagers mention it.
- **Regional wildlife and weather by faction sector:** flying fish are common in Reef and Free Cays waters and rare in
  Crown; sea turtles drift by in Free Cays, Lantern and a few Crown waters by day; Reef waters have more squalls,
  Lantern and Drowned waters more fog, Free Cays calmer.
- **False rumours:** about one bought harbour rumour in three is false and looks the same. Most lead to nothing (four
  lines); about a third of those lead somewhere stranger (a table laid for two with your ship's name on a cup; a bottle
  with a drawing of the island and a cross where you stand; a cairn of shells with a thank-you note and a warm shell).
- **More customs:** washing day every day (lines of cloth), carved figures along the pier that face the sea by day
  and the village after dusk, and a silent village (nobody speaks; a nod, a shell). Each custom also writes a note in
  the journal when you buy that village's chart (in its own voice).
- Screenshots: `docs/concept/world-schedule.png`, `docs/concept/life-at-sea-customs.png`.

### Biomes and world variety (planned, not built yet)
Concepts: `docs/concept/biome-*.png`, built in-engine with `__game.biome('coral' | 'rain' | 'sunken', x, z)` (dev only,
`src/concepts.js`). Keep clear of Dredge: biomes change how the sea sails and who lives there, not "a zone with a monster".
- **Coral shallows:** turquoise water over coral, sandbars, stilt villages. Read the water (paler = shallower); speed
  scrapes the hull; low tide opens shortcuts. Wrong: the coral rings look like writing from the crow's nest.
- **Rain belt:** steep green islands, waterfalls into the sea, drizzle and rainbows, villages under leaf roofs. Fruit
  regrows, rare fish bite in rain, gusty wind. Wrong: the rain falls upward for a moment; nobody mentions it.
- **Sunken streets:** roofs, chimneys, a bell tower and lamp posts out of shallow water; at low tide the streets show
  and boats pass between houses; salvage from windows. Seeds Mara's village. Wrong: the bell rings with no wind.
- Placement idea: a flavour per compass quarter from Tama, tied to the faction living there; dread still grows with
  distance, so each biome has a bright near version and a wrong far one.

**World on a schedule**
- (Built: the week, tides, floating market, regatta, whale migration, storm fronts.) Later: low-tide-only passages.

**Villages with character**
- (Built: customs, growth with trade, local charts.) Later: more customs, charts drawn in each village's own style.

**Life at sea**
- (Built: harbour fishing boats with routines, regional flying fish and turtles, regional weather by sector.) Later: pelicans and more species per biome, ships with routines between harbours.

**False rumours**
- Not every bought rumour is true. Most lead to nothing ("only sand, and someone else's footprints"); a few lead somewhere
  stranger than treasure.

### Story plan for version one (design, in the Story Bible)
- Version one = the six chapters paced to about an hour (targets, to be timed in playtests): Sea legs 0:00, Perrin's
  riddle 0:08, Earn your keep 0:18, Check my chart 0:30, Strange notes 0:42, The table 0:52, end card about 1:00.
- Five endings: The Long Sleep (final 20), Good Dreams (10-19), She Rises (1-9), Take Her Seat (sit; needs 3 offerings and
  3 strange rumours followed), The Unseen Throw (leave; only for those who stopped throwing after the first).
- The new features carry the story as small odd details (customs as clues, the harbour boat, strange rumours as
  invitations, whales and boats heading east). Their story roles are design only so far; see the Story Bible sections
  "The new features, and what each does for the story", "The first version", "Dread: the hints" and "Forks and endings".

## 2. Open storylines (started, resolved later)

### The Lady in the Hut (main thread)
- **What the player sees:** a silent woman, a die, a ledger she writes in after every low roll.
- **What is recorded:** `state.hut = { rolls: [{n, day}], wins, fails, visits, lastDay }`. Every throw is kept.
- **What it should lead to:**
  - The number of low rolls (her "entries") decides how the ending plays out (see brainstorm below).
  - Later visits: the hut changes (more candles, a second chair, the die gets darker, a page of the
    ledger left open with the player's ship drawn on it).
  - A natural 1 (not yet special) could be the trigger for a one-off event: the hut is empty next time.
  - The trinkets from high rolls (a tooth with a tiny ship carved in it, a warm black pearl...)
    are meant to come back as keys or offerings.
- **Never explained directly.** She never speaks; things are implied through Mara, notes in bottles, the map.

### The Eye
- The star-eye in the sky at full dread; the leviathan arches; the "Eye awakens" ending
  (after ~2.5 minutes at full dread). The ending currently loops you back to Tama with a wake-up line.
- To be linked with the hut: the lady's ledger and the Eye are connected (see brainstorm).

### The ship and her opposite
- Your ship is **the Merry Gull** (small, cheerful, ours).
- Far into the story a ghost ship may appear, or only be mentioned: **the Pained Raven** (working name; maybe the
  Mournful Raven), the Gull's exact opposite. Not in the game yet. Possible seeds already there: the shipwright finds
  another name scratched inside the hull ("Not the Gull. I left it."), and a bottle captain on your exact route.
  Never explain who sails her.

### Mara
- At full dread she forgets her village, says things she should not, stops answering hints.
- Not resolved: what Mara is, and whether she remembers any of it when you are back home.

### Old Perrin's riddles
- The first treasure riddle comes from Old Perrin via the harbourmaster. Perrin himself is never met.

## 3. Side stories (ideas, to be loosely linked)
1. **The Lighthouse Keepers' Ledger:** keepers log passing ships. Some entries are ships that have not
   sailed yet, one of them is yours, dated next week. Collect pages from several lighthouses.
2. **Old Perrin, the cartographer who never left port:** his riddles describe shores he could not have
   seen. His maps are drawn as if from below the water. He once visited the hut.
3. **Mara's village:** she cannot remember its name. A chain of rumours leads to an island that is on no map,
   because it was above water before the sea rose.
4. **The drowned bell:** a bell rings under the water near wrecks. Bring the clappers from five wrecks
   to a sunken belfry. Ringing it calls something up for one night.
5. **The fisherman's debt:** the fisherman who drags you home after a sinking keeps asking to be paid.
   He never wants gold.
6. **Letters in bottles from a captain on your route:** years old, same course, same stops, and the
   handwriting slowly becomes yours.
7. **The twin harbour:** two harbours with the same name on the chart. One of them is wrong, and the
   people there do not blink.
8. **Lantern Guild oil:** the guild's lamp oil comes from a deep fish. Oil deliveries; seen by that light,
   the world shows things it normally hides.
9. **The raider who surrenders:** a raider captain gives up without a fight and warns that the sea
   further out is eating sectors. Becomes an informant who can be found in different harbours.
10. **The other dice:** wrecks sometimes hold other twenty-sided dice, each missing a different number.
    The lady would very much like them back.
11. **The choir of gulls:** a gull follows the ship for days. At high dread the gulls cry in a rhythm
    that spells out the hut's location. The lady keeps one gull, very old.
12. **The island that moves:** one island is in a different place every time it is charted. It is resting
    on something.

### Little harbour quests (for the full game, not built yet)
Random errands offered on arrival. Details in the story bible, "Little harbour quests".
- **The lost kitten:** fetch a child's kitten from a fishing boat off a sandbar. Reward: a shell, standing.
- **The birthday cake:** deliver a cake to the next island before sunset; storms squash it. Reward: gold, a cake
  speed buff, the innkeeper greets you by name.
- **The other kitten:** the same quest, slightly wrong (dry, calm kitten facing your ship, the child repeats the
  first child's words, the same shell twice). Only from Off water on, once, in another harbour. Never explained.

## 4. Main story
The worked-out story (main story, Old Perrin, Mara's village, the island that moves, how they connect and
the build plan in six parts) lives in the shared story doc, which the user edits:
https://claude.ai/code/artifact/577e89fb-db92-4c7b-8108-25b3f56573e4
Read it before building any story part. Decided so far: the final throw of the Lady's d20 decides the ending (20 = she sleeps 100 more years, 10-19 = good dreams, 1-9 = she rises), the hidden ledger adds a bonus or punishment to that roll and is only revealed at the end, the Lady is never seen, Mara is a cheerful survivor (her real name is Mara), no handholding. The seeds below were the starting point.

### Original seeds
- The sea is a closed eyelid. Dread is the Eye stirring in its sleep; the full-dread effects are
  its dreams leaking.
- The lady keeps it asleep by throwing the die. Each low roll is a moment it nearly woke, and she writes it
  down. The player's throws count too: they have been helping her or hurting her without knowing.
- Possible endings driven by the ledger and the trinkets:
  - **Keep it asleep:** enough high rolls and the offerings; the world stays bright, Mara stays Mara.
  - **Wake it:** too many low rolls; the Eye opens and the Caribbean is remembered as something else.
  - **Take her seat:** the player becomes the next one at the table; the hut is now on Tama.
- Act structure idea: (1) sunny sailing and goals, (2) rumours of The Drowned, (3) the lady's errands
  (bring her a gull feather, a bell clapper, Mara's hat), (4) the descent through the Eerie and Cosmic waters,
  (5) the ending at the eye.

## 5. How to test quickly
- Sound mixer: `?dev=1`, then F8. Per-sound volume sliders, play/solo, live meters, Save volumes.json (see docs/AUDIO.md).
- Pause menu > New voyage (erase save), clicked twice, wipes the save and restarts. `?fresh=1` plays without loading or saving.
- Camera: R / drag up lowers it to deck level, where the view tilts up to the sky (it never goes below the waterline).
- `npm run dev`, then use URL flags: `?autostart=1&fresh=1&nomate=1`, `&dread=1`, `&time=0.9`, `&x=..&z=..`.
- Dev keys (only with `?dev=1`): 1-5 force a dread stage, 0 back to automatic, [ ] change the hour, ` shows debug info.
- `window.__game` exposes the game (e.g. `__game.world.hutDesc` for the hut island, `__game.hut`).
- Single-file builds (`python3 scripts/single.py`): `pocket-pirates-demo.html` (silent, no test tools) and
  `pocket-pirates-dev.html` (all sounds, volumes, mixer on F8, test keys and the full-dread menu).

## Autosave cue
- A small, compact (120x52) pixel ship sails across a wave strip (bottom right, "Voyage saved") when the game saves at a quest completion or on docking at a harbour. It appears only when a save really happens (not in `?fresh=1`); the silent periodic save every 4 s continues. Drawn in `main.js` (`SS_ART`), styled in `index.html` (`#saveship`).

## Concepts: log board and encounter scenes (not built)
- `docs/concept/log-board.html` (+ `log-board-a/b.png`): the captain's log as a deduction board. Clue cards on cork, red string for sure and dashed for doubt, pencil notes, "On the map" pencil circles. Nothing is ever marked right or wrong.
- `docs/concept/encounter.html` (+ `encounter-a/b/c.png`): one-time dice scenes at sea (Talk, Sail, Look, Offer, Leave). Once per voyage, remembered by the world, never required.
- Encounters redesigned (smaller, in the game's own box and buttons, not a separate scene) and made rare: about one every 3-4 days at sea, never in harbours, never part of any story. Log-board map guesses are a free memory aid. See `encounter-a..d.png`.

## Log board, sea encounters, treasure die (built)
- The captain's log tabs now sit along the top edge as paper slips: Map, Goals, Quests, Board, Journal, Ship, Standing (keys 1-7). The old Riddles and Rumours tabs are folded into the **Board**: every riddle, rumour, bottle and chart note is a pinned card; drag them, tie two with red string (sure), tie again for a dashed string (doubt), cut strings, pencil a note. "On the map" opens the chart in pencil mode: click an island to circle it (dashed, a second guess fainter). All of it is a free memory aid and never checked. Saved in `state.board`.
- **Sea encounters** reuse the existing cards, redesigned: a rare sign drifts near the ship (`src/sighting.js`: boat, crate, buoy, raft, silver shoal, glass), the usual [E] tag appears, and answering opens the villager-style box at the bottom with the world still visible. Only cards with something to see appear this way (chest, peddler, castaway, rowboat, buoy, stowaway crate, shoal, dark glass). One about every 25-40 minutes of sailing, never near islands, in fog or storms, or while fishing; never part of any story. Sail past and the sign sinks.
- **Treasure die:** a correct dig now throws the d20 for the quality of the find: 1 mostly rot (x0.4), 2-6 thin (x0.7), 7-14 fair, 15-19 rich (x1.4), 20 a king's ransom (x2), plus luck bonuses. Perrin's first chest stays fixed.
- **Advantage and disadvantage** on the d20 (`setAdvProvider` in `tabletop.js`): the die is thrown twice and the better (or worse) stands; they cancel. In now: digging the right shore on the first try and rum rations give advantage on the treasure throw; storms (sea rolls) and the dark without a lantern (sea and luck rolls) give disadvantage.

## Solid sea, a clear start, crew that leave
- **Solids** (`src/solids.js`): other ships, the harbour fishing boats, whales (while their back is out of the water), turtles, half-sunk wrecks, the encounter sign, and now **piers and the rowboat moored beside them** push the ship out instead of letting it sail through. Capsules for long things, circles for small ones.
- **Start:** the voyage begins on the open side of Tama's pier, clear of the fishing boat's berth (it used to spawn on top of it) and the moored rowboat.
- **Crew stay a while:** a hired hand stays 3-5 days (shown in the tavern and in the log), a rescued castaway or a passenger who asks to sail along stays 3 days, and a fulfilled wish adds 2 days. Then they go ashore. Ways to get a hand: the tavern (a different face on different days), a castaway at sea, now and then a passenger you delivered (30%).
- **Advantage sources added:** Mara's mood (`maraMood()` in main.js: cheerful if rested at a tavern within two days, hull at 60% or more and dread under 0.5; rattled if hull under 30% or dread 0.6 or more; else steady) gives advantage or disadvantage on sea and luck rolls, and shows in the log's Ship tab. Standing: talk rolls (haggling, bluffing) have advantage once you are a regular (standing 2 or more) at that harbour, and disadvantage when you are a stranger at its own counter (standing 0).
- **Hull as five planks** (HUD and log): the bar is replaced by five red planks, each a fifth of the hull's strength, so damage reads at a glance. Hull upgrades make every plank stronger. The whirlpool warning fires once per whirlpool (it used to repeat because the "told" flag was shared and reset by any far whirlpool).

## The demo is the whole bright game inside the fog
- **Demo build has no dread** (`dreadAtDistance` returns 0 when `window.__BUILD === 'demo'`; dream shifts too). The dev build keeps dread for testing. Nothing named after the full game shows: chapter acts now read "Fair winds" and "Loose talk" (no "Drowned"), and the Drowned faction/water only exist with dread.
- **New main goals** so every part is touched inside the radius: Passage (carry a passenger), Odd jobs (a board commission), Salvage rights (a wreck), Riddle me this (a second treasure riddle), A bed for the night (tavern sleep), Teach a raider a lesson (cannons now unlock in chapter IV; Mara's raider goal spawns a Reef raider if none is near). The four side goals that duplicated these were removed from the optional list.
- **After the hut and the end card nothing new unlocks:** "Keep sailing" in the demo no longer lifts the fog (the dev build still does); the fog stays at 1650 from Tama, and deliveries, passengers, commissions, treasure, fishing, crew, dice and the side goals all stay available. Cannons used to open after the demo; they now open in chapter IV.
- **The wind returns after the oars goal:** finishing "Dead calm" (or skipping it) cancels the forced calm and bans natural calms for ten minutes (`weather.noCalm`), so the delivery goal starts in a proper breeze. Mara says so.
- **No errands beyond the fog:** deliveries, passengers, commissions and rumours only point at places inside the current fog radius (`setReach` in `jobs.js`, set from `gateRadius` every frame). A delivery or passenger that already points beyond it (old save, or taken earlier) is released with a message, and the Quests tab has a "Give it up" button for both.
- **A second harbour inside the first radius:** Harbour Velto at cell -2,-1 (about 265 from Tama, formerly a jungle isle), so the first deliveries and passengers have somewhere to go. The Passage goal now always offers a passenger (the random "no one wants to travel" roll is skipped while it is the current goal), and the minimum passenger distance dropped from 250 to 150.
- **Goal counters:** a counting goal shows its progress next to its name in the tracker and the log, e.g. "Chart the sea (4/8)", "What the sea says (1/2)" (`count` on a goal, `goalCount` in objectives.js).
- **The demo ends ominously, ashore:** after the first hut throw the end card no longer appears at the hut. It comes at the next harbour you dock at: someone on the pier speaks of your number (always, even if another voice already spoke that day), and when that line is dismissed the end card follows after a beat. Mara's "was that hut always on our chart?" is a deliberate beat (the hut appears on the chart by itself), but it now fires at the next chart opening or within a minute of sailing, and never after the first throw.

## Combat, salvage, riddles, yard (this round)
- **Raiders:** rarer (22% of Reef traffic, one at a time), fire every 4.6-7 s and miss a lot: the faster you sail the more they miss (running well before the wind makes you hard to hit), and now and then a wild shot. They give up the chase past 210 units and never sit idle. You start with 8 cannonballs and **cannonballs are only bought** (sinking a raider pays gold, not ammo).
- **Floating barrels and crates are about three times rarer.**
- **Riddles tab is simple again** (the Board is gone): open riddles only, each with the island and bearing when known, rumours below, and a "Pencil on the map" button. A solved riddle leaves the tab and is listed in the Journal under "Solved riddles". **Half riddles:** some arches (a third of them, never Perrin's first) only hold half a riddle; the card says so and gives the direction of the other arch. Reading the twin arch (its back also carries the end of the other riddle) completes it; digging on half a riddle is refused.
- **Tutorial marks clear** once the goal is done, the moment you press a marked button, and the Board sign is no longer marked once a delivery is accepted.
- **Shipyard:** four new pennant colours (orange, teal, pink, black), four pennant shapes (pennant, swallowtail, banner, long streamer), and smaller figureheads. A 360 preview is designed in `docs/concept/shipyard-preview.html` (three options) and waits for a choice.

## Shipyard turntable, half-riddle icon, tacking goal, lighthouse tidbits
- **Shipyard is now the turntable (option A):** the ship turns slowly on its own in the middle (drag to turn, arrows turn a quarter, wheel zooms), a short panel on the right has tabs (Hull, Sails, Colour, Shape, Figure) and a swatch grid. Anything can be tried on first, owned or not; the line under it says "Trying: X, 30 gold", and Buy or Wear commits just that choice, Put back reverts it. Closing the yard puts back anything only tried on.
- **Half riddles** carry a small "1/2" mark on their card (and a "+" on an arch that holds another riddle's end).
- **New main goal "Beat to windward"** right after the oars goal (zig-zag until you have made 60 units upwind, with a counter); the optional side goal of the same name was removed.
- **Lighthouse tidbits:** the first time you pass within about 40 units of a lighthouse, the keeper calls something across the water: a line about the tower (three per design, six designs), where the nearest harbour lies, or something about the week (market day, floating market, regatta, whales, low tide, red sky, lantern night). Cosy, no spoilers.
- **Fishing variety is designed, not built:** `docs/concept/fishing-where.html` (A fisherman's log by water type, B spots at sea, C harbour talk).

## Fishing: where things bite (designs A and C, no markers)
- **Ten bright species** (four new: cuttlefish, barracuda, sea bream, moonfish) each have a habitat: water type (shallows, harbour, rocky edge, open, deep, over a wreck, atoll lagoon), hour and, for the golden grouper, low tide. The water around the line sets the odds (`fishEnv` in main.js, `habitatFit` in fishing.js); a poor fit is never impossible, so luck still counts. Nothing at sea points at any of it: no spots, no glints.
- **Fisherman's log** (Journal): only what the player has learned. Caught species show where and when they were caught; species a fisher has described show "Told: ..."; the rest stay as one "? ? ? (n more)" line.
- **Ask the fishers** (Tavern tab, "At the quay"): once a day per harbour a fisher describes where one unheard species bites, in their own words. It is the only way to be told.
- **Letters at the harbour:** Perrin's first riddle and his later note no longer arrive by themselves. At Harbour Tama a little letter icon sits on the Board sign (and a toast says a letter waits); inside, a "A letter" row has a "Take it" button. The riddle or note is only handed over when it is taken. The first one is marked for the tutorial (the dig goal), later ones are not.

## A quiet start (from playtest feedback: too much at once)
- The opening is now one thing at a time. The first minute shows only the ship, the goal tracker, one short Mara line and one control hint ("W let the sails out"). Pressing W reveals the sail gauge and Mara says what A and D do (the hint changes to "A / D steer"); once she has turned or sailed a little, the wind ring appears with its one-line explanation and the hint fades.
- The other HUD pieces arrive with what they belong to: gold with the first reward or coin, the place name after the first goal, the clock from the third goal, the hull planks at the first damage or when cannons unlock. Each new piece gets a short gold pulse.
- No "Charted", "Entering ... waters" toasts or "land ho" banner until two goals are done, and no chapter card for the very first goal.
- Mara's goal lines are cut to one or two short lines each. F1 shows the full control list. Old saves past the third goal, and test runs with `nomate`, see everything at once.
- **Slower, gentler opening (playtest round 2):** Mara's charming first line is back (first mate, the Merry Gull). The tide remark no longer comes first (all of Mara's remarks wait until two goals are done; the tide one until the fifth). Her lines stay on screen about twice as long and there is a breath between lines; if the sails stay furled for a while she says so once, kindly. The A/D line comes at least six seconds in, the wind ring ten seconds after that. A finished goal waits six seconds before the next one is announced (early goals), then 2.5.
- **Perrin's letter is quiet:** taking it no longer throws text. Mara asks "What have you got there, Captain?", tells the player to open the log (M) and look under Riddles, the Riddles tab is marked, and when it is opened she answers once. She stays on screen (bottom left) in the harbour and the log while this happens. The second letter works the same way with the Journal tab.
- **Dolphins, whales, sightings and the optional goals (Friends of the sea etc.) wait** until the seventh goal (or old saves and test runs), so the first goals only teach sailing, docking, digging and shopping.
- **No "[E] Visit Harbour Tama" at the very start** (it appears once the first goal is done and Mara sends the player back), and **villagers' arrival lines wait until the seventh goal** (story beats such as the hut gossip, and the line that ends the demo, still come when due).
- **Mara explains first, then sends you back:** the first goal ("Find your sea legs") can only complete once she has explained the steering and the wind ring and has finished speaking; only then does the "return to Tama" goal come. Every later goal waits 8 seconds (early ones) or 5 seconds after Mara's last line before the next is announced.
- **Mara only speaks about the quest in hand early on:** until the seventh goal her unprompted remarks (weather, dusk, tide, red sky, market day, lantern night, regatta, whales, sightings) are held back; only the ones tied to a mechanic the player is using (arch riddles, hiring crew, raiders, ammunition, low hull, storms, the fog wall) come through, and none is ever added on top of a line she is still saying.
- **No redundant letter lines:** goal intros can depend on state. If Perrin's letter is already taken and read when the dig goal is announced (or his second note when the chart goal is), Mara skips "take the letter" and goes straight to what to do next.
- **Opening cinematic:** a brand-new voyage (not a continued one, not test runs) opens with a 9-second shot: letterbox bars, the camera high over Tama easing down and in until it sits behind the ship, then the HUD returns and Mara's first line begins. Any key or click skips it ("any key to skip" fades in after a moment); `?intro=1` forces it for testing.
- **The NEW QUEST card follows Mara:** "QUEST COMPLETE" still shows at once, but the NEW QUEST card, the tracker's new goal and the wind-ring ping now arrive when Mara announces the goal ("Nicely done. Now bring her back to Tama's pier..."), after her outro and the pause. While the next goal is pending the tracker stays empty.
- **Lighthouse keepers wait for the tutorial:** their tidbits no longer fire during the opening goals (same gate as dolphins and sightings, `laterOK()`). Feature Overview now describes the delayed NEW QUEST card too.
- **Start audit:** a fresh headless voyage logged every toast and Mara line. Market and regatta notices and the "wind is shifting" toast now wait for the tutorial too (`laterOK()` / `onbAll()`). Still allowed early: the fog-wall line at the edge of the allowed radius, and bottle/barrel pickups if you sail into them.
- **Gull colony recording:** `public/audio/gulls.ogg` (from the supplied seagulls.mp3) loops as ambience. Its level follows the distance to the nearest circling gull (`fauna.nearBird`, `gullLevel()` in main.js, squared fall-off from ~120 units); a low-pass on the loop opens as it gets louder so distant gulls sound dull and close ones clear. Quieter at night, in rain/storm, off by dread 0.35. Dev build only (the demo is silent).
- **Coast bed:** `public/audio/coast.ogg` (supplied coastal breeze and distant gulls) loops softly near island shores and while moored or in a harbour/greeting/shipyard (`coastLevel()` in main.js, runs every frame so it also plays with a menu open). Fades with night, storms and dread. Dev build only (the demo is silent).
- **Wind recording:** `public/audio/wind.ogg` is now the supplied wind (mono). `AudioBus.driftWind` slowly varies its volume, stereo pan and pitch, so repeats of the 43 s loop don't sound alike. Dev build only.
- **Mixer:** new "All to 0%" button (every cue to silence, MASTER/MUSIC kept) for building the mix from scratch; solo/play audition a sound even at 0%.
- **First custom music:** `music_3.ogg` replaced by the supplied D - G - B "Dread" piece (1:42, melancholic). Plays in the Wrong stage band; dev build only (the demo has no dread and no sound).
- **Soundtrack key decided:** D (Dm / D Dorian), bass D, home chord D F A, motif D - G - B. Written up in `docs/AUDIO.md` ("Key and theme"); tempo still open.
- **Gulls come and go:** the gull loop now fades in for 5-20 s and out for 20-65 s (`AudioBus.driftGulls`), so it is no longer constant even at a gull island; closer means longer calls and shorter gaps.
- **Ship companion sketch (not in the game yet):** `src/companion.js` builds a low-poly ginger cat and a gull that wander between a few deck spots (barrel, crate, rope coil, forward of the mast); the gull also flies off for 40-100 s and returns. Dev hook only: `__game.companion('cat' | 'gull')` (second slot `'_pet2'`). Picture: `docs/concept/ship-companion.png`. Finding: at normal sailing distance both are tiny and the sail hides the deck, so the gull reads best against the sky (bowsprit, mast top) and the cat when docked or zoomed in. Decisions open: cat, gull or both; how it is acquired; sounds (soft mew); behaviour in dread.
- **Companions are in (optional harbour events):** an "On the pier" row at the bottom of the harbour board offers a ginger cat (Tama) and a gull (Velto in the demo; other harbours about two in seven, `petOffer` in main.js). It only appears once `laterOK()` (tutorial well under way); a toast at docking hints at it; ignoring it costs nothing. Taking one saves `state.story.pets`, the `Companion` (src/companion.js) wanders the deck, the gull flies off 40-100 s and returns, and both are hidden from dread 0.6. Not yet: sounds (soft mew), names, a log line.
- **One-time sea caves (new, `src/caves.js`):** a dark cave mouth on a rocky, volcanic or jungle shore (about one such isle in nine; the demo guarantees three near Tama, one of each kind). Press E close to the mouth with the ship stopped. It is a short scene in the sea-encounter card box: each room has 2-3 choices, most with a d20 check (crew bonuses and advantage apply), results can lead to another room or end the visit. Ending, won or lost, makes the tide close over the mouth and it never returns (`state.story.caves`). "Not yet" at the doorway keeps it. Never marked on the chart, never part of any story, appears only once `laterOK()` and below dread 0.5.
  - **The Hermit's Larder** (comic): washing line, a hermit, tea, pickles; talk and luck checks; coin, a note about where big fish wait.
  - **The Rising Grotto** (tense): a chest on a ledge as the tide rises; seamanship and luck; gold, or a bruise.
  - **The Tally Niche** (quiet): marks on a wall, a compass, a tin box; luck; gold, a treasure rumour, or just leaving it alone.
  - Add more by writing a node graph in `CAVES` (format in the file header). Picture: `docs/concept/caves.png`.
- **Cave screen concepts (not built):** the cave becomes its own full screen, the ship waiting at the mouth. Four layouts in `docs/concept/cave-screen.html` (+ `cave-screen-a..d.png`): A the passage (first-person tunnel, tide gauge), B the lantern circle (black screen, one lit circle, greeting-box dialogue with a portrait), C the cutaway (cross-section of the rock, rooms lit one by one), D the gamebook page (framed picture plus parchment with paragraph numbers and a d20 readout). Waiting on a pick.
- **Caves are now their own full screen (built):** `src/cavescene.js` draws the 320x180 dithered picture and `#cave` in index.html holds the title and the blue-and-gold text box. Two looks, as chosen from the concepts: B "lantern circle" for the Hermit's Larder and the Tally Niche (black screen, one lit circle, flickering lamp, the hermit has a portrait in the box), A "passage" for the Rising Grotto (first-person tunnel, shimmering water that rises room by room, a tide gauge on the right). Each room has its own picture (`SCENES` in cavescene.js). After a choice resolves the options fold away so the picture stays visible. Keys: 1-3 choose, E continues. Picture: `docs/concept/cave-screens-built.png`.

## Implemented in the full game only (not in the demo build)
Built and working in the dev build; switched off when `window.__BUILD === 'demo'`.
- **One-time sea caves** (`src/caves.js`, `src/cavescene.js`): three small dice-and-choices side quests on rocky, volcanic and jungle shores, each its own full screen (the Hermit's Larder, the Rising Grotto, the Tally Niche). They appear from the fourth goal on (once `laterOK()` is true) and below half dread, are never marked on the chart, and sink for good after one visit. The demo build never shows them (`caves.update` is disabled there).
- **The demo ships with sound:** `AUDIO_ENABLED` is now always true. The demo file carries every sound except the dread-stage cues (`DEMO_SKIP`: music_3..5, amb_3..5, whisper, stage_up), has the pause menu Sound and Music toggles, and still has no mixer or test tools. Demo 4.6 MB, dev 5.9 MB.
- **Cover images for itch.io:** `docs/concept/cover.html` renders four 630x500 designs (shown at 2x) from in-game shots (`cover-bg-*.jpg`) with the game's own logo: `cover-a-open-sea.png`, `cover-b-harbour.png`, `cover-c-dusk.png`, `cover-d-night.png`.
- **Player volume sliders:** the pause menu now has Music, "Sea, wind, gulls" and Effects sliders (0-100%, saved in settings) on top of the Sound/Music toggles; in the demo and dev build. Audio now routes through `musicBus`, `ambBus` and `sfxBus`.
- **Short pause menu:** the sound toggles and volume sliders moved into their own "Sound and music" panel (Back or Esc returns). The main pause menu is now Resume, Ask Mara, Controls, Fullscreen, Captain's log, Sound and music, New voyage (dev builds add the full-dread test and mixer).
- **30 s trailer:** gameplay rendered frame by frame from the real game (virtual clock, 1920x1080 at 30 fps): intro shot over Tama, sailing, the harbour approach, a cave with the d20 roll, night, a storm, dusk end card with "Play the free demo". Captions: Set sail / Make landfall / Roll the dice / Keep the lantern lit / Weather the storm. Two files (with a quiet sea, wind and gull bed, and fully silent). Scripts in `docs/trailer/`. The cave and d20 shot uses a full-game feature.
- **"Multiple paths" (story bible, design only):** seven optional dark threads built on horror tales and sea myths, three of seven awake per voyage: the Drowned Bell, the Ferryman's Coin, the Colour, the Hollow Harbour, the Music out of the Fog, the Strange High House, the Other Captain. Ways in (rumours, objects, places and times, people, dice, calendar, dreams, refusal, caves), new mechanics (marks, listening, the Spread, pact cards, ship swap, Welcome meter, tune playing, unreliable log, lantern oil), repeatability, two possible new endings and a build order. Full game only, nothing built yet. See the Story Bible, section "Multiple paths".
- **The Colour (thread prototype, `src/threads.js`; full game only):** a hidden source atoll (picked from the seed, 450-1300 from Tama, in practice about 950-1100 so it shows once the fog has opened) with a violet dithered patch on the water that grows 4 units a day and jumps toward harbours (max 4 patches). In a patch 70% of bites are the "bright fish" (8-20 kg, worth a lot, unnamed row in the fisherman's log; each catch fades one crew wish). Touched harbours sell fish 15% higher and say the stalls are full of bright ones. Entry: a fisher at a quay may mention it (once, `askFish`), Mara says one line at first sight. Ends: seal the spring (press E at the source: full-screen scene `colourspring` in caves.js / cavescene.js with three checks, costs a little gold and hull; the patches then shrink 7 a day), sell the last of it to a quiet buyer at a market (x2.2 price, Salt mark in `story.marks`), or let it spread (the sea gains a violet tint up to 0.3). Dev hook: `__game.threads`. Not built: the Tide of Threads (always awake in this prototype), Marks on the Standing page, fruit ripening overnight, crew cost, links to other threads. Needs `story.free` or a chapter-3 fog gate (1250) to be reached.
- **Tide of Threads and Marks (built, `src/marks.js`):** the seven threads are listed in `THREAD_DEFS` (only the Colour is built). `threads.setup()` decides which are awake for a voyage: by the seed, 3 of 7 (`pickAwake`, same seed = same three), stored in `state.story.threads`; a voyage from before this had only the Colour. Dev build: the title screen has a **Threads (dev)** panel (By the seed / Choose, with a checkbox per thread, or None; remembered in this browser, applied at Set sail), and `?threads=colour,bell`, `?threads=all`, `none`, `seeded` override it. **Marks** (`story.marks`): Counted (natural 1 on a cave, spring or encounter roll), Called (natural 20), Salt-marked (selling the bright fish); Owed and Quiet are defined for later threads. They show only on the Standing page, under "What is said of you", in the world's words; nothing else reads them yet. Marks and threads are off in the demo build. Hooks: `__game.threads`, `__game.addMark(key)`.
- **All seven threads are built (full game only; `src/thread_mods.js`, `src/threadscenes.js`, hub in `src/threads.js`):** each awake thread is a module the `Threads` hub drives every frame (`update`, `interact`, `harbourRow`, `onDock`, `onRest`, `onSalvage`, `modAdjust`, `clue`, `flag`, `event`). Sites are open water picked from the seed (`threads.pick`, saved in `story.tp.<id>.site`). New in `openCave`: node text/choices as functions, `choice.if: 'thread:flag'`, `node.enter`, `fx.event`. Scenes: `house`, `bellreef`, `ferry`, `hollow`, `musichouse`, `raven` (painters in cavescene.js). Keepsakes (`story.keeps`) show on the Standing page; the tavern has an "Overheard" line per awake thread. Details and how they interact: Story Bible, "Multiple paths: as built".
  - Bug fixed on the way: far-off natural caves could get an undefined kind (negative hash) and stop the frame loop; `AudioBus.tone` was a name clash, the new method is `playTone`.
  - Not built: Take Her Seat (the Hollow only reserves it), lantern-oil and unreliable-log mechanics, Mara going silent on the Raven (she says one line), fruit overnight, Hollow's fishing bonus is a catch-value x1.25.
- **Village styles (new, `src/villagestyles.js`):** harbours were all one ring of cottages on a flat plateau. Now every harbour has a style picked from the seed (Tama stays classic, the second harbour is a fishing village): fishing, terraced white town, thatch huts, market town, fortress, farm with windmill, shrine village, wreckers' cove. Each changes the island outline and size, the ground colours, the house palette and shapes, the street plan, a landmark and the plants (see STYLE.md). Cottages, the tavern and all the crowds, the dock, customs and week layers work as before. Dev: `window.__villageTest = {style}` forces the second harbour's style, `__game.setAshoreCam(pos, look)` aims the harbour camera. Picture: `docs/concept/village-styles.png`. Not done: style-specific villagers and market goods, harbour names that fit the style, hills or cliffs (all villages are still flat plateaus).
- **Village terrain shapes (`SHAPES` in villagestyles.js, `terrainHeight` in world.js):** harbours are no longer flat. Dune, hill, cliff, terraced hillside and bowl (hollow with a ridge); each style draws from two or three of them (fortress mostly cliff, terraced white town on terraces, wreckers' cove in a bowl or on a cliff...). The village keeps one level so crowds, layers and customs work unchanged; the ground falls to the sea around it with a ramp to the pier, finer terrain mesh (30 segments) and rock colour on steep faces. Dock angle is now `desc.dockTh` (fixed per island, so the terrain can ramp toward it). Dev: `__villageTest = {style, shape}` forces the second harbour. Not done: stairs on the ramp, houses on several levels, villagers walking the ramp.
- **Steps and slope houses:** every hill, cliff and terraced harbour now has a stair up the ramp from the pier (lanterns on posts) and the terraced and hill ones have houses on several levels down the slope; terraces are flat treads with short risers. Still not done: villagers walking the ramp, a market or well on a lower terrace.
- **Caribbean houses (inspired by Sid Meier's Pirates!):** four new house kinds, colonial, planter, thatch and church, with hipped terracotta or palm-thatch roofs, verandas, balconies, shutters and a lived-in front yard; every village style now mixes them (classic gets a church in place of a second bell tower). The white town no longer uses tall flat boxes: it is colonial and planter houses with terracotta roofs, a church and a dome chapel, and palms instead of cypresses. Dev: `__game.showcase('houses')` shows all kinds on a raft.
- **Fort, faction flag, washing lines:** every port flies its sector's faction colours from the church tower and from a small stone fort on the shore (Tama and about half of the other ports; fortress towns keep their own walls), and has 2-4 laundry lines between the houses. Bug fixed on the way: the white town's houses had turned into tall towers (a search-and-replace had stretched them). Picture of four finished villages: `docs/concept/village-four.png`.
- **Fortress style and stone fort removed (too medieval):** the fort-town style is gone (eight village styles remain), and the shore fort is replaced by `ruins()`: a few low broken walls of weathered coral stone with ragged tops, rubble, moss, an arch stump and a rusted cannon lying in the sand (Tama and about half the ports). Every port now has the faction flag on a pole at the landing instead of on the fort.
- **Four water styles as 5 s loops (dev tests, not in the game's own sea):** toon facets, retro bands, clear shallows with caustics, dark rollers. They sit in the ocean shader behind `uWStyle` (0 = the current water, unchanged); each repeats exactly every 5 s. Stills and notes: `docs/concept/water/`. Dev hook: `window.__waterLock = {style, t}`. Not done: a CPU twin of the new wave shapes (so the ship would ride them), a setting to pick one, per-region use (shallows near atolls, rollers in the far sea).
- **The sea, decided:** toon facets are the base water, dark rollers blend in with distance, dread, storms and rain (eased over about 25 s, never a switch), and water near any island is lighter, shallower and calmer. Ship, fauna and fishing use the same wave formulas as the shader (`waveHeight`, `WATER` in ocean.js). The two other loop-test styles (retro bands, clear shallows) were dropped. See `docs/concept/water/README.md`.
- **Silent demo:** `python3 scripts/single.py` now also writes `pocket-pirates-demo-silent.html` (the demo with no sound at all: `window.__SILENT` turns `AUDIO_ENABLED` off, nothing embedded, about 1 MB smaller than the demo with sound).
- **Irregular rough water:** the rollers were too regular (a few waves on fixed rows, foam on a grid). Now seven waves of unrelated directions and speeds, a slow envelope that makes sets of bigger and smaller waves, a warp that bends the crests, and foam that is torn into ragged patches by drifting noise instead of grid blocks (calm foam caps too). Same formulas on CPU and GPU. No demo rebuilt this round.
- **Wind wisps broken up:** the drifting wind lines (`src/windfx.js`) were thin, straight and parallel. Now each wisp is two to five short chunky dashes of different lengths, gaps, widths and brightness along a lazy curve that wanders with the gusts, fading in and out over 4-10 s and respawning with new random shapes (flat ribbons, additive, no thin GL lines). No demo rebuilt.

- Sound studio (dev, F9): load own music/sounds, trim on a waveform, place by situation + dread + state (loop/once, fades, hush game music), force situations to test, export soundtrack.json + WAVs. See docs/AUDIO.md.
- **Stage 1 music builds with the quests:** six instrument stems (99 BPM, run through HOIST) replace `music_1` on open sea. Silent until the first quest, then bass + shaperbox, then one more instrument per quest; they swell, drop out and come back, wander in the stereo field and sit under a moving low-pass as if heard over the waves. See docs/AUDIO.md and `src/layers.js`.
- **Recorded ambience in:** light ocean waves as the sea bed; light rain from two recordings that cross-fade slowly, and a separate heavy storm bed (rain drumming on the deck) blended by rain and storm strength; a long distant thunder roll that comes now and then in strong rain (and after lightning, never piling up). A quiet `forest` bed waits for the big forest islands (ROADMAP).
- **Light rain and storms look different:** drizzle is a pale grey, misty day on a milky, quieter sea with thin upright rain; a storm turns the sky slate-black, the water dark and heaving (whipped up within seconds), the light cold, the clouds scudding, the rain a dense sideways sheet. See STYLE.md.
- **Tavern music:** four stems through HOIST play in every harbour's tavern, quiet and muffled as if through the wall (fainter and duller elsewhere in the harbour); the sea's music steps aside while it plays.
- **Sound trimmed to the chosen set:** only ui, dig, buy, pause, chapter, fail, success, card, roll_d6, roll_d20, cast, bite, catch and the recorded thunder remain as effects; all other effects, `surf` and the placeholder music (`music_1/2/4/5`) are gone and no longer synthesised. The stage-1 band now lasts longer: full to dread 0.3, only eases to 40% by a shore, and drops instruments out less often.
- **More placeholders out:** the stage ambience beds (`amb_1`..`amb_5`), the night bed (`amb_night`) and the rowing loop (`oars`) are removed and no longer synthesised.
- **Wind loop removed** (it was a synthesised placeholder): storms are now heard through the storm rain and the distant thunder.
- **Stage-1 music in scenes:** the full band alternates with line-ups of two or three instruments (always a different combination), changing on 4-bar phrases (`SeaLayers.nextScene`).
- **Always-marked buttons at the board:** a waiting letter (Perrin's "Take it", from the very first visit to Tama) and "Take aboard" for a passenger are marked every time, along with the Board sign: later there is no other help.
- **Oars in the water:** the blades now dip well under the surface on the pull and lift clear on the return (they used to hover at the waterline).
- **Compass dot to Tama for Perrin's letters:** while a letter from Perrin waits at Tama (the riddle before you have taken it, and "A note from Perrin"), the compass dot points to Harbour Tama.
- **The hut on the chart can be seen:** the first time you open the chart after the hut appears, it opens framed on the ship and the hut, and the hut is drawn bigger, on top of the trees (it was a speck under the palms). If Mara notices before you have looked, she sends you to the chart instead of asking about something you have not seen.
- **Fewer wrecks:** half-sunk wrecks are a rare find now (8% of open sea cells, was 20%).
- **The dark hut is a witch's hut on a blighted island:** the hut's island is bigger and ragged, with black sand, dead grass, bare dead trees, pale fungus, stakes in the shallows and crows; the hut is round, on crooked stilts, under a bent witch's-hat thatch with charms hanging from the eaves (STYLE.md). The chart icon matches.
- **Murky water round the hut:** the sea round the hut's island is olive-black with drifting scum instead of turquoise shallows, fading out over about 90 units (`uMurk`, `mats.murkShallow` / `murkFoam`).
- **Battle music:** the Raiders theme (moved up a semitone to F minor to fit the band, through HOIST) joins the main theme while a fight with raiders is on; the whole band plays and the filter opens a little.
- **Voice blips:** very soft blips while Mara and villagers talk.
- **Villager portraits at 16x16:** every speaker has a detailed face of their own (`src/faces.js`).
- **The interface opens with the story:** at the start only what the current quest needs can be clicked (harbour signs, board buttons, log tabs); the rest is greyed out and opens quest by quest (`src/gates.js`, table in DESIGN.md).
- **"A bed for the night" is no longer a main goal:** it made you wait for 17:00. Beds at the tavern are still there (open with the tavern sign). Old saves past it move back one goal.
- **A second guitar arp:** two takes of the arp swap at irregular times in stage 1, never overlapping (`s1_guitar2`).
- **Feedback round:** fishing has a cast-power meter and line tension (it can snap); digging is a shovel timing game (stones, cave-ins); the band sometimes falls silent or plays one instrument alone; Mara only talks about the quest until the tavern chapter (no tide line, no cat at the start); no "good haul" after you have bought; no repeat of "Perrin left something" once the letter is taken; gulls quieter when docked; the passenger mark only until your first passenger; chapter and dig sounds at 40%, voice blips audible; Perrin's isle a little further from Tama; the hut is not on its island until the story reaches it.
- **Minigames chosen:** fishing is the bite ring (after Dredge), digging is probing the shore (hot and cold with stones and the tide). The Raiders battle layer is a new take (F minor, no pitch shift needed).
- **Playtest fixes:** shipwright Hull/Cannons rows (were "undefined"/NaN on a new save); M opens the log from the harbour; Perrin's notes at the top of the Journal ("Letters and bottles"); the bite ring's misses no longer drain the meter (three misses means three); the right prompt after a tide fail; Mara's side remarks never cut in before a new quest; no villager greeting while Mara is talking, and the greeting line sits in the board panel; your delivery is not listed twice; early deliveries stay within ~420 units; clearer damp shades and a legend on the dig grid; shorter dead-calm line; chapter III renamed "Working waters"; no island named Mara or Tama.
- **Storms hurt:** a gale with the sails out tears at the rigging (6 hull per hit, a warning the first time: reef with S or take the oars), broadsides hurt more (7), and the hull does not mend during a storm.
- **Night music:** a calmer version of the song plays from dusk to daybreak instead of the stage-1 band; the night is longer (4 minutes, the day 11.5).
- **"Dread" (music_3) in the band's key:** shifted from B minor down six semitones to F minor (tempo, length and loudness unchanged), so the cross-fade from the stage-1 band stays in key.
- **Stage 2 music:** four stems through HOIST (grey skies) play on open sea between the stage-1 band and "Dread"; the night version is louder (it was easy to miss under the sea).
- **The hut's theme:** on the first visit only, a dread-stage-4 theme (pluck, sub drone, drums through HOIST) rises as you near the hut and plays inside, alone; sailing away brings the normal music back. The hut's island is smaller and the loneliest one out there, harder to stumble on.
- **Dev bar (dev build only):** a bar at the top sets the hour (dawn, noon, dusk, night; keys 1-4) and jumps to any main quest, back and forth (dropdown, < >, keys , and .); going back rewinds the story flags later quests set. The dread keys are gone (dread follows distance).
- **Dread slider on the dev bar** (`auto` returns to dread by distance); docs brought up to date (README dev tools, AUDIO music map and custom tracks, DESIGN dev tools, checklist).

## Hand-made places, wind play, upgrades that open places, one glimpse, controller, pins (after the critique pass)
From the critique "what goes stale on a long voyage" (compared with Wind Waker, Dredge, Sunless Sea, Sea of Thieves):
- **Seven hand-made islands** (`src/landmarks.js` for the look, `src/places.js` for play). Forced cells with open water in
  the eight cells round them, so each stands alone on the horizon. Each has its own outline, ground colours and props, a
  silhouette you can pick out from far off, and something to find ashore (stop, E, "Go ashore"):
  - **The Grey Tooth** (crag, 280, 100): a bare rock of basalt columns, guano, gannets, a sea arch; a cairn on top with a
    tin box of ship names. Charts the Ribs and the Drowned Bell.
  - **Hollowgreen** (grove, -300, 180): a small, very lush wood, broadleaf trees in layers, a spring falling into a pool,
    a clearing with a stone table and a rope swing. Mends the hull and gives fruit once a day; the forest bed plays near it.
  - **The Halved Isle** (broken, -380, -500): half the island is missing. A clean cliff with the rock layers showing faces
    Tama, half a house on the edge, the missing half lies tilted under the water with one chunk still sticking out.
    Inside a fog bank (a white dome visible from far off). Half a strongbox: 60 gold.
  - Smaller ones: **The Drowned Bell** (60, 320: a sea stack with a leaning bell tower, the roofs of a drowned street at
    the waterline; charts Wick's Rock), **Wick's Rock** (430, -320: a lone brick lighthouse, the keeper's cottage, his
    boat and washing; from his gallery you chart all seven places, the isles round you and every current),
    **The Ribs** (-560, 70: a sandbar of wrecked ships' ribs, a snapped mast, a buried figurehead, behind a ring of
    breakers; salvage every three days) and **Glass Lagoon** (540, 360: an atoll with coral and a chest on the bottom,
    behind a broken reef ring; 150 gold once).
  - Each place is a chain: the Tooth points to the Bell and the Ribs, the Bell to Wick's Rock, Wick charts the rest.
  - Not a storyline: the strange touches stay small (the bell has no clapper; nobody came back for the other half).
- **Upgrades open places** (Dredge-style): Rudder 2 threads the reef round Glass Lagoon, Hull 2 takes the breakers round
  the Ribs (and halves storm damage), Lantern 2 cuts the fog bank round the Halved Isle. Without them the reef stops you,
  the breakers throw you back (a little damage), the fog turns the bow round; each says which upgrade would do it.
  Spyglass: far shapes get a label over them (`?` by eye, "a leaning tower" with a spyglass, the name once charted).
- **Wind play** (`src/seaplay.js`): **gusts** are dark ruffled patches (cat's paws) that come down the wind from upwind
  every 5-11 s; steer into one with the sails up for ~4 s of +32% speed. **Currents**: six lanes and a ring round Tama
  ("the Round") marked by foam streaks drifting along them; they carry the ship (~3 units/s). They link home waters to
  the hand-made places. The first time you meet each, a short toast names it; ridden currents (or all of them, after
  Wick's gallery) are drawn on the chart as dashed arrows.
- **The glimpse** (`src/glimpse.js`): once, about 12 s after you sail more than 150 away from your first throw at the
  hut: for nine seconds the wind drops, the sea goes flat, all sound goes away, the gulls stop and turn to look, any
  lighthouse in sight swings its beam onto the deck, and a tall dark figure with a pale blank face stands on the water
  off the bow (there, then not there). Then everything is normal. Mara: "Captain? You went quiet." It is in the demo too
  (it uses no dread), so the demo ends on one unexplained moment. Never explained, never referred to again.
- **Controller** (`src/gamepad.js`): standard-mapping pads become key presses (see README), so every menu works.
- **Pins on the chart:** click the map (not in pencil mode) to drop a pin, click it again to remove it; up to six. The
  compass dot follows the newest pin until you are within 22 of it, then it is removed ("You reached your pin").

## Lamp oil and minigame varieties (after the critique pass, part 2)
- **Lamp oil** (`src/oil.js`): the one thing a voyage uses up. The lantern burns oil whenever it is lit (night, thick fog,
  a storm): about 0.26 a second, so a full lamp (100, +30 per Lantern level) lasts about a night and a half. The dark is
  hungrier with dread (up to +80%). It counts from main goal 4 ("Dead calm", when the Market opens); before that the lamp
  stays full. HUD: a flame and an amber bar under the cannonballs (red and blinking below a quarter). Mara warns at a
  quarter, once per dark spell. **Empty while lit:** the lantern is out, the fog closes in to a third and goes darker, and
  you cannot fish ("Too dark to see the line"). Never a game over. **Refill:** the Market sells it ("Fill the lantern",
  0.42 g a unit, with harbour discounts); Wick at Wick's Rock fills it for nothing. Saved as `state.oil`.
- **Five ways the fishing ring plays** (`RING_KINDS`, `ringKind` in fishing.js), picked by the water when the fish is
  hooked; the ring's colour and the first line say which:
  - *Wreck water* (by a wreck): red snag marks among the green; a snag costs two strikes and the snags move after each hit.
  - *Night water* (after dark): the marks are invisible except near the needle and in a slow pulse.
  - *Heavy swell* (rain or storm): the needle surges and slows with the waves.
  - *Deep water* (far from land): two long marks, a slow heavy needle; **hold** C / Space while on green to pull, let go
    off it; holding off the mark strains the line (a red ring) and costs a strike.
  - *Reef water* (by rocks, reefs, a lagoon): the marks dart to a new place every 1-1.6 s, flickering just before.
  - *Calm* anywhere else: the ring as before.
- **Three new beaches for digging** (`BEACHES` in digging.js; each treasure isle has one, from its seed; Perrin's first
  chest is always plain sand):
  - *Shingle*: grey ground, three more stones, the shovel takes three cracks, and every hole shows how many stones lie
    next to it (grey dots).
  - *Dunes*: pale sand; every third dig the wind fills your oldest open hole and its colour is lost.
  - *Mud shore*: brown ground, no tide (the light fades instead) and three more digs, but after each dig the mud swallows
    a square beside your holes (never the chest).

## Counter melody, torn sails
- **Counter melody** in stage 1 (`s1_counter`, layers.js `COUNTER`): rare, slow fade in and out over the band (see AUDIO.md).
- **Torn sails:** too much canvas in a strong wind (wind strength over 1.05 or a storm over 0.45, sails over 55%) builds strain;
  the sail bar blinks orange and a toast says to reef (S). Keep going (about 8 s at full sail in a full storm, longer in a plain
  gale, less with better sails) and the mainsail tears: holes, long rips, the clew gone and three rags flapping
  (`Ship.setTorn`), the sail bar turns red, and the ship sails at **66%** speed until mended. **Patch kit:** one aboard at the
  start, room for three, 35 g at any Market (SAILCLOTH); stop anywhere at sea and press E ("Patch the torn sail", 4.5 s).
  **No kit:** any harbour's sailmaker mends it free when you dock. Mara says which. Counts from the Market chapter (like
  oil). Saved as `state.sailsTorn`, `state.patchKits`. The old gale hull damage with the sails out still applies in storms.
- **Night pad and second pluck:** the night switches between the night band and a big calm pad (`n1_pad`; calm seas favour the
  pad), and the main melody swaps between the pluck and the composer's variation (`s1_pluck2`), never together. Quest and chapter
  sounds are quieter. See AUDIO.md.
- **Torn sails only in real storms** (playtest: too sensitive): strain builds only when the storm is over 0.6 and the wind over
  1.0; everyday wind and squalls never tear the sail. In a full storm at full sail: warning after ~4 s, tear after ~12 s.
- **Darker nights** (playtest: too bright). Found the cause: since 21 Oct the line that passes the light level and wave height
  to the shaders sat inside a comment, so the world kept daylight brightness at night (and the waves did not follow the
  weather). Fixed; on top: night light floor 0.17 (was 0.3), darker night sky and fog, the view closes in (fog at 45%), and the
  lantern throws a wider, warmer pool on the water so it matters; with the lamp out it is darker still. The ship's wake no
  longer glows cyan at night.
- **Lantern switch:** L (or click the oil flame, or press the left stick) puts the lantern out or lights it again
  (`state.story.lampOff`). Out, it burns no oil, but the night is as dark as with an empty lamp (short view, no fishing). It
  will not light with no oil.
- **Lost in fog** (playtest: a current carried the ship to the fog bank, which pushed back, and it was stuck): fog no longer
  pushes. Past the chapter fog wall, or inside the fog bank round the Halved Isle without Lantern 2, you are *lost*: the view
  closes to a white-out (about 10 units), the helm and sail keys do not answer, and the ship wanders (a slow weave) while it
  is always drawn back out the way it came (`fogLost` in main.js, `places.lost`, `gateLost`). Control returns as you leave.
- **Fewer, fainter currents:** three lanes now (the Tooth Run, the Green Drift, the Reef Road), all well inside the fog; the
  ring round Tama and the lanes that ran toward fog are gone. Foam streaks are fewer (46), thinner and half as bright. Every
  current fades out near any fog (`fogEdge`), so none can carry the ship into it.
- **Waves by distance from land:** one shared factor (`seaScale` / GLSL `landNear`) for the water and everything that floats:
  0.35 by islands and harbours, about 1 some 120 out, up to 1.7 in open sea 260+ from land. Measured swell at the Tama pier
  0.32, ~120 out 0.78, open sea 1.44.
- **Four ocean designs** (pause menu "Ocean", remembered, or `?ocean=0..4`; `docs/concept/ocean_designs.jpg`): 0 Toon facets
  (the original), 1 Soft swell (smooth light in five dithered tones, lace foam on crests), 2 Painted bands (height bands like a
  sea chart with pale contour lines riding the waves), 3 Wind chop (a small fast chop over the swell, stronger out at sea, sun
  sparkles and whitecap flecks), 4 Deep sheen (dark clear water, the sky's sheen at a slant, long wind-drawn foam streaks).
  Styles 1-4 use smooth normals from the wave function itself (no flat triangles) and an ordered dither so they stay pixel art.
- **Night view and lamp settings** (pause menu "Night view" / "Lamp", or `?nightview=0..3&lamp=0..3`): view distance and
  moonlight together: Pitch dark (28% of day view, light 0.11), Dark (45%, 0.17, default), Moonlit (65%, 0.26), Bright moon
  (85%, 0.36); lamp pool: Candle, Lantern (default), Bright, Beacon. Comparison images in docs/concept.
- **Night = moon phases** (default "Night: Moon phases" in the pause menu; fixed views still selectable): each night (19:00 to
  06:00) is either a new moon (Pitch dark: 20% of the day's view, light 0.065, no moon, dark clouds) or a full moon (Moonlit:
  65%, 0.26), chosen per night from the seed. Fixed a weather floor that kept every clear night at 0.28 light.
- **Lamp default: Candle.** **Ocean default: Chop facets** (new design 5: 70% wind chop over 30% toon facets); the dark rollers
  of a rough sea get the same chop, so storms match. New settings keys (v2) so the new defaults apply.
- **No text over islands while sailing:** the far labels are gone (the spyglass is just view distance and zoom again).
- **Storms easier to read:** less darkening (light x0.82 and x0.7 instead of x0.65 and x0.58), the sea keeps more of its colour,
  the horizon stays lighter, the view shrinks less, the lantern shows in a storm like at night, and lighthouses already burn.
- **Gusts drawn by the water itself** (playtest: the dark scratch lines looked odd): a gust is now a soft, ragged patch of
  darker, finely rippled water in the ocean shader (`uGust`, four patches from seaplay.js), dithered like the rest of the sea.
- **Smoother wind streaks:** wisps are continuous, gently curving lines that taper at both ends (thin and faint, no dashes),
  56 of them, thinner and fainter than before.
- **Every hit shows on the hull:** planks drain partly (a damaged plank fills from the bottom to what is left of it) and the
  row shakes on a hit; before, a storm's 6-7 point hits only removed a plank every third hit, so the red flash looked like
  nothing happened.
- **Wave sets in any weather:** a slow travelling pattern makes the swell bigger and smaller (about 0.5x to 1.45x) with a longer
  roller in the big sets, on the GPU and the CPU alike. Measured in calm water ~60 from Tama: 6-second ranges 0.41 to 0.98.
- **The ship floats with weight and meets resistance** (ship.js): height, pitch and roll follow the water through damped springs
  (a heavy hull that lags the waves and settles with a little overshoot) instead of copying the surface; the bow rides up with
  speed, nods when the ship speeds up or slows down, it heels with the wind in the sails and leans out in a turn, and squats a
  little at speed. Climbing a wave face costs up to 28% speed, running down one gives up to 18%; a hard turn drags; the hull
  keeps its momentum and only slowly follows the bow (turns slide), with a touch of leeway from the wind. When the bow drops
  into a trough at speed it throws spray. `docs/concept/boat_motion.mp4`.
- **Handling like a boat** (playtest: turns too floaty and too easy): the rudder needs water flowing past it (at a standstill
  it barely turns: ~11 deg in 3 s), the swing builds up and dies away (yaw inertia), and very fast it is a little stiffer.
  Sideways the keel bites hard (lateral speed decays at 5.5/s), so a turn slides only briefly. Measured: half sail 95 deg in 3 s
  (+24 after letting go), full sail 71 deg (+19); sideways slide 0.06-0.11. Rowing keeps its own easy turning for docking.

## Look pass: wake, shores, sails, islands, sky, rain, other ships
- **Wake and bow wave** (`src/wake.js`): a trail of points behind the stern opens into a V of broken foam (the arms spread with
  age, thin and fade over ~4 s), a churned strip right behind the stern, and white water peeling off both sides of the bow,
  longer and brighter with speed. The round wake puffs are fewer. Traffic ships within 220 have their own.
- **Shores, seabed, fish, rain** (ocean shader): broken lines of foam roll in and break near every shore (uneven spacing, only
  stretches of each line), a wash at the edge; in the shallows the seabed shows through (sand ripples, darker rock and weed,
  dithered), small fish shadows drift in loops over it by day; rain leaves rings spreading on the surface near the camera.
- **Sails and rigging:** pointed too close to the wind the mainsail and jib go slack and flutter (luff); a gust fills the sail
  fuller; a forestay, two backstays and four shrouds as thin dark lines.
- **Islands vary** (rolled separately, so the world stays put): a slight colour shift per island, a cliff face on one side of
  ~40% of jungle isles, two to four sea stacks off ~70% of rocky ones.
- **Sky:** clouds take the sunrise and sunset colour; a high layer of thin cirrus streaks; a storm wall (a dark cloud bank with
  grey rain curtains under it) rises over the horizon upwind as a storm or a front comes near (`fx.stormWall`).
- **Other ships** float like yours (springs, heel with the wind, squat at speed) and leave wakes.

## World hints: what the sea tells you without words (src/secrets.js, rare and irregular on purpose)
- **The Kestrel (transits).** Two pilot's daymarks (a tarred pole on a black rock, white top with a black band) stand at sea
  south-east of Hollowgreen's waters. From one spot only, the near post sits exactly in front of the Grey Tooth and the far
  post in front of the Drowned Bell's tower; that is where the Kestrel lies. The lines come from the world: the Tooth's cairn
  lid has a scratched drawing of a white post in front of the rock (and KESTREL crossed off the ship list); two pier tales
  (Tama, Velto; rare, once each, after the tavern chapter) disagree about everything (calm noon / night squall) except the
  line each one saw; a third harbour may say there never was a Kestrel. Stopped over the spot a dark shape shows under the
  water and bubbles rise: send someone down (+180 gold, a note). Tama's dusk watcher looks toward it.
- **Low-tide wrecks:** off ~7% of islands far from Tama a wreck's ribs and mast come up only at low tide; salvage once.
- **Smoke:** ~5% of lonely jungle/rocky isles have a man living there; a thin smoke column rises about one day in three. The
  first visit he scratches a treasure isle into your chart; later visits vary (sometimes only a warm fire).
- **The dusk watcher:** Tama and ~40% of harbours have one figure who stands at the water's edge at dusk, on the side that
  faces the nearest secret (smoke isle or low-tide wreck; Tama's faces the Kestrel). Gone once the sea goes wrong.
- **Birds:** at dusk in open water a small V of gulls flies home toward the nearest land; at dawn they fly out from it. With
  dread over 0.55 they fly the wrong way.
- **Cross-swell: cut** after the playtest (the sea here is so full of islands that every point was inside the band: it could not
  hint at anything, and it doubled the water's cost).
- **Dig beach redesign + noon shadow:** the dig is now a little beach seen from above (dithered sand, shells, pebbles, weed,
  waves lapping, the island's edge), with the treasure arch at the top throwing its real sun shadow (long and slanting in the
  morning, short at noon, none at night). On "noon-shadow" isles (riddle ends "At noon, the arch points.") the chest lies
  under the noon tip of the shadow of the arch's top.
- **Playtest fixes (gameplay agent's strict review):** noon-shadow riddles had no eligible isle (the dread limit excluded all
  but Perrin's): the limit is gone, so they are a later-game riddle (12 isles within 25 cells), and the arch is made shorter on
  beaches where a low sun would throw the tip off the sand or sideways off the beach (chest under the noon tip in 100% of 1200
  test starts, sun 0.45-1.0). The dig view was mirrored (fixed). The cross-swell was cut (see above). Smoke is unfogged, darker
  and lies in a low wind-laid trail where the default camera looks. Camp visits: one per day, and the note only says he drew
  an island when he did. No "Stop the ship" prompt gives the Kestrel away while you sail over it; its shape reads from 45 and
  stronger. Birds fly lower (8) and cross the view ahead of the bow. Low-tide salvage goes through the normal wreck path
  (wrong loot, threads, stats). Unloaded secret meshes are disposed. The watcher stands at the water's edge, never above 1.5,
  with a lit lantern. The dig shadow fades under cloud and rain.

