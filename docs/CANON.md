# HOIST: canon

What is true in this game. One page, so every change pulls the same way. If a decision is made, it is written here with its
date first, and the other documents follow. If this page and another document disagree, this page wins and the other is a bug.
Nothing here is ever said to the player in these words.

## 1. The game in five lines
1. You sail a small ship, the Merry Gull, with your first mate Mara. The captain never speaks.
2. It is played as a cosy Caribbean exploration game: sail, fish, dig, deliver, chat.
3. The further from home, the more the world goes wrong. The horror is never explained.
4. A Lady in a black hut throws a twenty-sided die and writes down the numbers. You throw too.
5. What you understood on the way decides what you can do at the end. The die is still the die.

## 2. The premise (the truth under the game)
- The sea is a closed eyelid. Something under it is asleep. Dread is it stirring.
- The Lady keeps it asleep with the die. Each low throw is a moment it nearly woke; the world pays for it somewhere.
- Tama is home because it is where the sleeper is kept gentle: the bells ring softly.
- Others sat at the table before you. Some did not leave.
- Mara is from a village that is no longer above water.

## 3. Decisions (dated; never reopen one without the owner)
| Date | Decision |
|---|---|
| 2026-11-11 | **Mara remembers her village**, but slowly: it comes back to her during the story in four pieces (the bell, the street that ran down to the water, the blue door, the name). She never says the name aloud and the game never shows it. |
| 2026-11-11 | **Humming the Two Players' tune is the only gentle, happy ending**, and the only one without a throw. No other ending may read as happy. |
| 2026-11-11 | **The demo ends on the first throw at the hut and the diver on the water.** At the next harbour someone speaks your number, then the end card. |
| 2026-11-11 | **Odd jobs, Salvage rights and the raider are optional side goals.** The main chain is 16 goals. |
| 2026-11-11 | **At the Table: Throw, Hum the tune, Sit, Leave.** "Turn the table to the sea" is cut. |
| 2026-11-11 | **The Lady's errands (old Act 3) are cut.** The story after the demo is told by going places. |
| 2026-11-11 | **Four small wrong things happen before the hut** (the third oar, two berths, the hook already in it, the hole that was already there). Each happens once, has an ordinary reading, and is never explained. |
| 2026-11-11 | **The log has three bookmarks** (Chart, Orders, Ship's book) and **one slip** (what, where, which way and how long). |
| 2026-11-11 | **The chart is an inked portolan on vellum. The type is Pirata One (titles) with Jersey 10 (text).** |
| earlier | The title is HOIST. The Lady is never seen and never speaks. Dread follows where you are, never time. The demo has no dread. |

## 4. The seven questions (the whole mystery)
| # | Question | The answer, never stated | Where the world shows it |
|---|---|---|---|
| 1 | Who counts? | Someone has been writing you down since before you arrived | Customs Pier, Governor's Fort, Keepers' Ledger |
| 2 | What is the Eye? | Something is under the sea, and it dreams | Two Players, Glass Lagoon, Oil Press, Dark Tower |
| 3 | Who sat before you? | You are the latest, not the first | The Kestrel, the Cup, Name Wall, the Marigold, the Ribs |
| 4 | What does a throw cost? | Your numbers land on other people | Tama's bells, the archive, Hammock Isle, the Marigold's log |
| 5 | Why is Tama home? | Home is where it is kept soft | Tama's bells, the Drowned Bell |
| 6 | What is Mara? | Someone who survived something | The Drowned Bell, the Sunken Street |
| 7 | Can it end? | You choose what to do with the last throw | The Two Players' tune, the Halved Isle |

A question is understood when sources from two or three different regions agree. The level is derived from what has been seen
(`src/clues.js`), never stored as a number and never shown.

## 5. The shape of a voyage
| Part | Where | What happens |
|---|---|---|
| Chapters I to III, "Fair winds" | Home Sound | Learn the ship; Perrin's riddle; work the waters. The third oar, two berths, the hook. |
| Chapters IV to VI, "Loose talk" | out to 1650 | Perrin's chart, the second riddle (the hole), bottles, gossip, the hut, the first throw, the diver. **The demo ends.** |
| Gather | the Shoals, the Trade Belt | Harbours write things down: bells, ledgers, names. |
| Compare | the Slack, the Dim | Other people's traces. Sources disagree on purpose. |
| Decide | the Lid | The Sunken Street, the Table by the Water, an ending. |

## 6. The endings (all at the Table by the Water)
| Ending | How | Needs | Tone |
|---|---|---|---|
| The Long Sleep | Throw, 20 | nothing | still |
| Good Dreams | Throw, 10 to 19 | nothing | warm, a little uneasy |
| She Rises | Throw, 1 to 9 | nothing | dark; the Eye sequence follows |
| The Tune Is Kept | Hum the tune | the Two Players heard | **the only gentle, happy one** |
| Your Seat | Sit in the other chair | question 3 fully understood | dark |
| The Unseen Throw | Go back to the boat | set the die down once, or never threw after the first | uneasy |

The book weighs the last throw: each earlier high throw lifts, each low one weighs, at most 3 either way; the Kestrel's lamp
halves a bad weight; a natural 1 or 20 stands. A captain who saw nothing still has the die and gets a real ending.
"The Eye awakens" after lingering at full dread is not an ending: you wake off Tama.

## 7. People
- **Mara**: first mate. Warm, quick, a little cheeky; one or two short lines; calls you Captain. Cheerful, then steady, then rattled, then she breaks at full dread. Never explains. Her village returns to her in four pieces.
- **The Lady**: never seen, never speaks. A chair in the dark, a bone die, candles (one more for every low throw), a book.
- **Old Perrin**: the cartographer who never left port. Letters only. Dry, precise, a little smug.
- **The diver**: a rusted deep-sea diver standing upright on the water, once, after the first throw. Nothing explains him.
- **The captain**: never speaks. People speak at the captain; Mara answers for the ship.

## 8. Open (nobody may decide these but the owner)
- What Mara is, beyond where she is from.
- What the Lady writes if asked who counts. Whether Mara may throw in your place.
- Whether the Two Players are the same two who play at night.
- Who the other berth is, whose hook, who dug first, who rowed.
- What the twelve harbour fragments say as a whole. Who sails the Pained Raven.
- The six ending texts in `src/table.js` are drafts awaiting the writer.

## 9. Where the detail lives
| For | Read |
|---|---|
| Rules every change must keep | `docs/RULES.md` |
| Every line in the game, with IDs; cast; atlas; slots | `docs/STORY_MASTER.txt` (generated: `python3 scripts/story_export.py`) |
| The story told by places: seven questions, regions, phases, endings | `docs/STORY_EXPLORATION.txt` |
| World structure: strata, gates, the clue ledger | `docs/WORLD_REDESIGN.md` |
| How systems work | `docs/DESIGN.md` |
| The look | `docs/STYLE.md`, `docs/ART_SPEC.md` |
| The sound | `docs/AUDIO.md`, `docs/SOUNDTRACK_BRIEF.md` |
| What was built, in order | `docs/PROGRESS.md` |
| What comes next | `docs/ROADMAP.md` |
