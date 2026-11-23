# The diving bell and the ship's boat (design, 2026-11-23)

**Built 2026-11-23** (`src/systems/gearplay.js`; the owner's answers are in CANON 2026-11-23: bought at any harbour, taken along or left there, the boat a third way in, one bell-or-boat clue per region that gates the region). Differences from this proposal: sold at every shipwright, not only the Reef and the Cays (so no region can lock you out); the bell and the boat cost a little speed while aboard. The original proposal follows. The two models (`src/gear.js`): the bell on a davit at the starboard
quarter, the boat towed astern. Pictures in `docs/proposals/gear/`. Both add a direction the sea did not have: **down** and **in**.
Both obey the rules: no marker, no popup, one short line at most; what is found is found by looking; full game only unless cosy.

## 1. The diving bell (down)

**What it is.** A squat brass bell with three small ports and an iron ring, hung from a davit over the starboard quarter. Stowed it
swings a little with the ship; lowered, the chain pays out to the water. (`1_stowed.png`, `2_bell_down.png`)

**How you get it.** A shipyard upgrade, like the hull or the sails, but sold only at Reef harbours (the salvage water):

| Level | Name | Depth | Air | Opens |
|---|---|---|---|---|
| 1 | Salvage bell | shallow (wrecks on the bar, the Kestrel) | short | wreck holds, the Kestrel's lamp without luck |
| 2 | Deep bell, with a pump | the clue places' "under" | longer | under the Drowned Bell, the Marigold's cabin, the Ribs' sand |
| 3 | Lamp bell (a glass port and a lantern) | the deep and at night | longest | the Sunken Street's doors, the dark under the Edge's water |

**Where you can use it.** Only where the water shows something: a slick, a mast, a ring of bubbles, a dark shape under the surface. E
there: `[E] Lower the bell`. The ship anchors itself first (RULES 18).

**How a dive plays.** It is its own screen, like a cave, but with no choices: a painted pixel view out of the bell's port (`4_dive_view.png`).
- The rope on the left is the air: it pays out while you are down. When it runs short, the bell comes up by itself (never a death).
- Left and right turn the bell slowly; the view pans over the bottom. Things worth a look have a small pale glint.
- E on a glint looks closer: one line, and what is there goes to the sea chest or the Ship's book (a remnant, a keepsake, a clue line).
- E with nothing in view, or the air out: up again.
- The deeper bells see further and stay longer; the lamp bell sees at night and in the deep, where the plain bell sees only black.

**What it opens (progression).**
- a hidden layer under places you already know: each clue place can have an "under" (the Drowned Bell's street, the Marigold's cabin,
  the Name Wall's foot where the oldest names are under water), each a second clue source in that region (helps the thin questions);
- salvage: wreck holds pay better than surface salvage, a reason to go back to the Reef;
- the sea chest's remnants come mostly from here (the clapper, Perrin's slips, a cup, a key with no door);
- one wrong thing, once: on one dive the rope goes out further than the chain is long.

**What keeps it from being a chore.** Dives are short (a minute), only at shown places, and every site gives one thing once, then
just its view. No air meter on the HUD: the rope is the gauge.

## 2. The ship's boat (in)

**What it is.** A small clinker boat with two thwarts and a pair of oars, towed astern on a line. (`1_stowed.png`)

**How you get it.** A shipyard upgrade sold in the Free Cays (they live in small boats), two levels:

| Level | Name | Opens |
|---|---|---|
| 1 | The boat | shallows, lagoons, mangrove channels, river mouths by day |
| 2 | The boat with a lantern | sea caves, and the same at night |

**How it plays.** Anchor the Gull near land. E at the stern: `[E] Take the boat`. You now row the boat (the same keys; G is always oars):
small, slow, and allowed where the Gull is not, over the reef, up a channel, into a lagoon (`3_boat_lagoon.png`). The Gull waits at anchor
and is always in view or on the chart. E at the Gull again to climb back aboard. Far from her (a set distance) the boat turns for home
by itself, like the fog's pull, never a fail state.

**What it opens (progression).**
- the inside of islands: lagoons and coves the Gull can never enter, each with a landing (`[E] Go ashore`): a cove, a spring, a shrine,
  a camp, a stair cut in rock;
- a gentler way past barriers that are about size: Glass Lagoon's reef and the Ribs' breakers can be rowed in the lull (they already allow oars)
  without the rudder or the hull upgrade, but only in the boat, and the Gull stays outside;
- new clue places that only a boat reaches (one per region would give the thin questions their missing source);
- night: with the lantern boat, the caves' painted scenes (`src/caves.js`) become reachable by rowing in, instead of a card.

**What keeps it from being a chore.** It is short (a few hundred units at most), there is always a reason the place is there, and
the boat is only ever for the last stretch, never a second ship to sail the sea in.

## 3. How a voyage might use both (storyboard)

1. **Free Cays, a morning:** the shipwright sells the boat. The Gull now tows it; Mara, once: "We have a little one now, Captain."
2. **Glass Lagoon:** without the broad rudder, the Gull lies outside the reef. Anchor, take the boat, row in over the reef at high water:
   inside, the chest on the bottom, and a stair cut in the inner shore the Gull could never see.
3. **Reef harbour, a week later:** the salvage bell, level 1. A mast showing at low water off the Ribs: lower the bell. The hold is
   full of sand and one sealed jar: into the sea chest.
4. **The Drowned Bell, the deep bell:** under the stack, the street the tower leans over: doors, a well, and in one window a light.
   One line in the Ship's book. (A second Q6 source.)
5. **The Sunken Street at the lowest tide, the lamp bell, night:** the doors in the port's light, one of them blue (`4_dive_view.png`).
   Mara says nothing at all this time. The air runs out; the bell comes up.
6. **A Cays cove by the lantern boat:** a cave mouth the Gull could only pass. Row in: the cave's painted scene, reached by the boat.

## 4. Code touchpoints (when built)
- `src/gear.js` (models, built), `src/upgrades.js` (two new rows: `bell` 3 levels, `boat` 2 levels; shipyard by region),
  `src/systems/dive.js` (new: sites, the dive screen, air), `src/systems/boat.js` (new: the boat as the controlled vessel, the tether),
  `src/cavescene.js` (dive views painted like the caves), `src/places.js` (an `under` entry per place), `src/clues.js` (new rows for
  the under-places and boat-only places), `src/chest.js` (remnants from dives).
- State: `state.upgrades.bell`, `state.upgrades.boat`, `state.story.dived` {site: day}, `state.story.boatSeen` {place: day}.

## 5. For the owner
1. Are the shops right (the bell at Reef harbours, the boat in the Free Cays), or found instead of bought?
2. Should the boat be allowed through Glass Lagoon's reef and the Ribs (a third way in for each), or only to new places?
3. The dive screen: a painted view with a glint to look at (as drawn), or the 3D camera going under the water?
4. One new clue place per region reachable only by boat or bell: yes? (It would solve the thin questions without luck.)
