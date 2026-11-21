# Lore expansion: modular drafts (2026-11-21)

Every item is **draft**. Nothing here is canon until the owner picks it. Built on CANON 1-7 only; nothing touches section 8
(ending texts, Perrin's letters, epilogue lines, thread clue lines, what Mara is). Gates follow `customs.js`: any / full / hut.
No banned word, no village name, no "she" or "the hut" before the hut is known.

## 1. Island histories (draft; each carries one detail another region tells differently)

**LX-01** home, Q5, customs SAY (any). "Tama was the first lamp lit, so we ring it low. Seven bells, one for each boat that came home that night. The rest of the sound was fishing grounds, then."
**LX-02** crown, Q1, harbour fragment (full). "The Crown was a toll before it was a town. A rope across the channel, a clerk on a stool. The stool is in the Fort. We have kept it in good order. Six bells, they say at Tama. That is sentiment."
**LX-03** free, Q2, passenger line (full). "The Cays are what was left when the others chose a side. Somebody played, and the weather agreed. Nobody wrote the first night down. That is how you know it was good."
**LX-04** reef, Q3, second-visit line (full). "The Reef is wreck on wreck on wreck. The first one is still down there. Ask the Guild; they say the Reef was always a harbour. We say it was always a grave. Same coral."
**LX-05** lantern, Q4, harbourmaster's board (full). "The Guild lit the dark so ships could find home. Home moved a little each time. The lights did not. That is why there are so many."
**LX-06** drowned, Q6, sea-chest remnant slip (full). "We were above water once, the way you are. The street still runs to the pier. We walk it at low tide and call out the names. Somebody always answers. Not always one of us."

(Disagreements: bell count seven at home against six in the Crown; Reef grave against Guild harbour; the Drowned's "somebody answers". None is settled.)

## 2. Nautical superstitions (draft; pilot's sayings or SAY, any)

**LX-07** home, Q5. "Never whistle below. The wind has enough to hum already."
**LX-08** crown, Q1. "Sign the log before you leave. Sign it again if the ink is already dry."
**LX-09** free, Q2. "Sleep on the port side. Starboard hears the deep too well."
**LX-10** reef, Q3. "Leave a hook on every wreck you pass. The old ones keep count."
**LX-11** lantern, Q4. "Never trim a wick in a falling tide. Somebody pays for the length."
**LX-12** drowned, Q6. "Pay the ferryman in even coin. Odd ones come back."
**LX-13** any, Q7. "A ship is lucky until it counts its crew aloud. After that, ask the cook."
**LX-14** free, Q2. "Draw a line at the foot of the bunk. The tide will not step over it, but the dark likes to try."

## 3. Entity myths (draft; rhyme or saying; none names or shows the thing; reading one: something there, reading two: a tale to quiet a child)

**LX-15** home, Q5, children's skipping rhyme (any). "Hush the water, hush the sand, / Nobody wakes who holds your hand. / One for the tide and two for the town, / Three in the dark, and don't look down."
**LX-16** free, Q2, old salt's saying (full). "Big water, slow breath. You can count it, if you wait. Nobody has waited long."
**LX-17** crown, Q4, harbour fragment (full). "The tide goes out the way a person goes out of a room. Politely. Then it is somebody else's turn to come in."
**LX-18** reef, Q3, a wreck-diver's rhyme (full). "Down where the cold lives, down where it stays, / Somebody turned over. Nobody says."
**LX-19** drowned, Q6, tide-pole rhyme (full). "Do not step loud on the sea at night. / It is sleeping, or it is polite."

## 4. NPC logs (draft; "day N", fragments, no conclusions)

**LX-20** crown, Q1, harbour fragment (full): harbourmaster's arrivals.
- day 411: Merry Gull in, one aboard. Wrote one.
- day 412: Fog bell, three rings. We did not ring it.
- day 413: Merry Gull in again, from the east. Wrote one.
- day 414: Dock count came to one more than the book. Corrected the book.
- day 415: The book was right the first time.

**LX-21** lantern, Q2, sea-chest remnant (full): lighthouse keeper's log.
- day 88: Lit at dusk. Wick burned long.
- day 89: Lit at dusk. It burned longer.
- day 90: Did not light. It was already lit.
- day 91: Oil is up again by itself. Did not ask.
- day 92: Light.

**LX-22** free, Q4, Teo's harbour board (full): fisher's tally.
- day 3: eleven. day 4: eleven.
- day 5: twelve. Threw one back.
- day 6: eleven. day 7: eleven.
- day 8: nineteen. Threw eight back. Counted again.
- day 9: eleven.

**LX-23** drowned, Q3, R.'s letter enclosure (full): ship's log of the Plover.
- day 40: Fair wind. Crew of four.
- day 41: Fair wind. Crew of five.
- day 42: Table in sight. Did not steer for it.
- day 43: Did not steer for it.
- day 44: Crew of four. Nobody remarks on it.
- day 45: Steering.

## 5. A corrupted shanty (draft; Free Cays night, the Players' set, event at sea, any)

"Heave Her Home, Boys"

Verse 1
Five went out on the evening tide,
Five at the oars and none to guide,
Five came back with the morning bell,
Five and a place at the rail as well.

Verse 2
Six at the capstan, six at the sail,
Six sat down to a supper of ale,
Six came back and the table was bare,
Six and a place and a hand in the chair.

Verse 3
Seven by the lantern, seven by the line,
Seven at the helm and the helm was fine,
Seven came back to the quay in the sun,
Seven and a place for the one who is one,
And heave her, heave her home.

Chorus (sung twice; the second answers the first)
Heave, and heave, and heave her home,
Who is it counts? The ones who roam.
Heave, and heave, and heave her home,
Who is it counts? The ones who roam.

(Each verse adds one head to the count it began with; verse 3 runs a line long. The chorus answers its own question.)

## 6. Where each would live

| Items | Vehicle | File |
|---|---|---|
| LX-01, LX-07, LX-08, LX-09, LX-13, LX-15 | one villager line on docking | `src/customs.js` SAY |
| LX-02, LX-17 | harbour fragment | `src/harbourlife.js` FRAGMENTS |
| LX-06, LX-21 | chest remnant slip | `src/chest.js` CHEST |
| LX-23 | enclosure with R.'s letter | `src/systems/rletters.js` |
| LX-04 | second visit | `src/places.js` VISITS second |
| LX-03, LX-16 | passenger line | `src/passengers.js` |
| LX-10, LX-11, LX-12, LX-14, LX-19, LX-18 | pilot's saying | `src/systems/passes.js` SAYINGS |
| LX-05, LX-20, LX-22 | harbourmaster's board | `src/harbourlife.js` FRAGMENTS |
| Shanty | event at sea (night, Cays only) | `src/systems/seaevents.js` |

Nothing here needs a new system.
