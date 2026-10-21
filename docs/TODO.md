# To do: review follow-ups

What is left from the October 2026 design and gameplay review. Phases and the bigger plan live in `docs/ROADMAP.md`; what exists lives in `docs/PROGRESS.md`. Tick items off here as they land, and note them in PROGRESS.md.

**Legend:** **Must** = broken or contradicting. **Should** = recommended. **Idea** = optional. Area tags: (design) (gameplay) (story) (shared).

## Already done in this review
- [x] Light and wave uniforms restored; no-children villages (shared)
- [x] Shallows follow island outlines; wisps, beam, kites, grass, wall faces, ruins, jetties, wake (design)
- [x] Interface font sizes, blurs and gradients; harbour line uncovered; Hermit's Larder (design)
- [x] STYLE.md matches the code (design)
- [x] Hull and Cannons upgrades buyable; salvage toast; faction pennants (gameplay)
- [x] Story text: unseen Lady, Raven deadline, Hollow line, Mara's village at 0.65, pier, Riddles tab, last hint, three short lines (story)
- [x] Five balance numbers: fishing wait, delivery pay, dread curve, wind swing, hull regen (gameplay)

## Fallout from the new dread curve (commit c32b71c)
In chapters I-VI dread now tops out at about 0.28 (it used to be 0.75 at the 1650 wall).
- [ ] **Must**: thread and story sites now sit in bright water, against the Bible:

  | Site | Dread now | Bible wants |
  |---|---|---|
  | Raven | 0.22-0.31 | Eerie to Cosmic |
  | Music | 0.14-0.24 | Wrong to Eerie |
  | Hollow | 0.12-0.24 | Off to Eerie |
  | Colour | 0.03-0.2 | Off to Wrong |

  Move them (table under Balance) together with the act-gate decision.
- [ ] **Must**: boards can ask for fish that can't be caught yet (glass eels beyond about 1525). Tighten the 0.1 margin. (`jobs.js:76`)
- [ ] **Should**: the first hour lost its creep. Mara's musings start at about 1280 units; remarks at 0.5, 0.65 and 0.75, the dark fish, empty boats, derelicts, the stare greeting and Wrong decor are all post-chapter-VI now. Decide what should still hint in the first hour (story + design).
- [ ] **Should**: raiders (dread under 0.4) now roam out to about 2260 units, and caves (under 0.5) out to about 2750. Check that's wanted.
- [ ] **Should** (design): rough water now starts at about 1670 and gull/coast sounds fade from about 1280; the magenta beam is post-game only. Review the first-hour look.
- [ ] **Should**: full dread is about 4710 units, still only 9-10 min of straight sailing after "Keep sailing". The act walls fix this.

## Decisions needed (story, for the owner)
- [ ] **Must**: the Raven "stay" ending. Mara says she will take the Gull home, then stays first mate. Either cut her line until the Second Raven ending is designed, or make her really leave. (`thread_mods.js:322`)
- [ ] **Must**: Perrin's detail (red rock, three palms, bell or tooth stone) is never placed on his island, so "He was right" points at nothing. Place the prop, and maybe one wrong extra detail. (design + story; `main.js:1845`, `world.js`)
- [ ] **Should**: the third hut bottle can never be found. Give it after the goal, or cut it from QUOTES.md. (`main.js:239`, `:1843`)
- [ ] **Should**: the harbour gossip list (`lore.js:28-66`) is never used. Wire it in or delete it. "Perrin was very calm about it" clashes with "Perrin is never met".
- [ ] **Should**: the Ferryman refuse ending pushes the crew past the cap of 2. Is that intended? (`thread_mods.js:192`)
- [ ] **Should**: add story gates (fog walls) after chapter VI as acts? Walls at 2700, 3700 and 4700 are the only way to control *when* the dread stages arrive.
- [ ] **Should**: move the hut and thread sites outward to match the new dread curve (the table in Balance below). This changes the Bible's note on which wall opens which thread.

## Story ideas (optional, none resolve a thread)
- [ ] Idea: Perrin's compass. If the Tally Niche compass was found, his next letter says only "Not that one."
- [ ] Idea: seeds of Mara's village in bright water: the well with blue tiles, the green lighthouse, "a green light that went out".
- [ ] Idea: the Eye ending leaves one more candle in the hut, and the chair is warm on the next visit.
- [ ] Idea: count strange rumours and keepsakes as offerings. This is groundwork for "Take Her Seat"; no ending yet.
- [ ] Idea: "the other kitten" (crate commissions, Off stage).
- [ ] Idea: with the Owed mark, the hut gains "A second cup has been set out."
- [ ] Idea: the grey passenger gets one line in Off water that echoes the Ferryman's bearing.
- [ ] Idea: the Tama cat will not look at the sea from dread 0.25.

## Balance (gameplay), rest of the plan
The five headline numbers are done. The rest of the plan is still open; the full tables are in the review report.

**Pacing**
- [ ] **Should**: chapter IV holds 8 goals for 12 minutes. Make `rest` and `raider` optional. (`objectives.js:113-176`)
- [ ] **Should**: tavern rooms open from 15:00 instead of 17:00. (`main.js:959`)
- [ ] **Should**: move these sites outward for the new curve:

  | Site | Now | Proposed |
  |---|---|---|
  | Perrin's island | 720-1080 | 950-1200 |
  | Colour | 450-1300 | 1300-2100 |
  | Hollow | 900-1500 | 1800-3000 |
  | Music | 1000-1500 | 2500-3300 |
  | Raven | 1400-1800 | 3300-4300 |
  | Hut | rings 4-6 | rings 7-10, max 1600 |

  The hut move is a story decision. Hold all of these until the act-gate decision above.

**Fishing** (still the best repeatable income after the slower bite: about 85-95 g/min in deep water)
- [ ] **Should**: a hold of 8 fish, plus 3 per Crew level. (new check in `onCatch`)
- [ ] **Should**: fishing the same spot gets slower: +35% wait per catch within 60 units; resets each day.
- [ ] **Should**: big-fish prices: tuna 2, swordfish 3, mahi 5, moonfish 8, glass eel 12, key fish 40, barracuda 5. (`fishing.js:15-27`)
- [ ] **Should**: the fish commission cap drops from 130 to 90. (`jobs.js:78`)

**Other income**
- [ ] **Should**: passenger pay becomes `8 + 0.04·dist + 30·dread`. (`passengers.js:67`)
- [ ] **Should**: the delivery dread bonus goes from 40 to 60; the base from 20 to 12. (`jobs.js:38`)
- [ ] **Should**: wrecks drop from 20% of empty cells to 12%; loot multiplier from ×1.3 to ×0.9. Treasure goes from ×0.5 to ×0.7. (`seafeatures.js:145`, `main.js:1421`, `lore.js:80`)
- [ ] **Should**: raider bounty drops to 25-60, and raiders appear on 15% of Reef ships instead of 22%. (`main.js:1919`, `traffic.js:108`)
- [ ] **Should**: the quiet buyer pays ×1.5 instead of ×2.2, for at most 5 fish. Bright fish drop from 10 to 5 g/kg. (`main.js:938`, `:947`, `fishing.js:53`)
- [ ] **Should**: stacked fish-price bonuses are capped at ×1.6. (`main.js:927`)
- [ ] Idea: charting pays `+5 + 10·dread`. (`main.js:1602`)

**Sinks**
- [ ] **Should**: harbour repair costs 1 g per HP; the tavern bed stays a full mend. (`main.js:1349`)
- [ ] **Should**: hired crew costs 5 g per day.
- [ ] Idea: rumours cost 30 g in bright water and 60 g beyond.
- [ ] Idea: offerings at the floating market (60-150 g), late shipyard items (120-300 g), lantern oil "as sight" (10 g).
- [ ] **Should**: Lantern levels 2 and 3 do nothing. Make level 3 lower dread by 0.05 at night. (`upgrades.js:5`, `main.js:1722`)

**Wind**
- [ ] **Should**: a second wobble that grows with dread, using phase accumulators (`p1`, `p2`, saved with `windT`). After the main-swing change, upwind legs last about 1.5 min (target about 4); the remaining jitter is the `0.5·sin(t·0.031)` term.
- [ ] **Should**: the "wind is shifting" toast fires at 1.4 rad, at most every 420 s; it still shows about 14 times an hour. (`wind.js:29`, `main.js:2000`)
- [ ] Idea: from Eerie, gusts rise from 0.22 to 0.3. (`wind.js:23`)

**Encounters**
- [ ] **Should**: the first encounter comes after 240-420 s instead of 900-1500 s. (`main.js:1678`)
- [ ] **Should**: the interval is 1200-1800 s in bright and Off water and 900-1500 s in Wrong and Eerie. (`main.js:1808`)
- [ ] Idea: card difficulty +1 at dread 0.4 and +2 at 0.6; gold and damage × (1 + dread). (`tabletop.js`)

## Design, remaining
- [ ] **Must** (after the dread curve settles): the fog colour does not match the sky horizon, so distant islands look like cut-outs. Blend fog into the dome's bottom band. (`palette.js` KEYS, `daynight.js`, `weather.js`, `sky.js`)
- [ ] **Should**: check ruins on hill and terraced islands for overlap with slope houses.
- [ ] **Should**: chart labels overlap in the log ("a notM…thouse"). (`logbook.js`, gameplay file)
- [ ] Suspected, unconfirmed: the shore ring flickering through waves; the pier drifting with the tide (±0.32); a black strip under the cave screen; the help bar staying on screen; the Eye always framing the black sun at noon (may be intended).

## Loose ends in code
- [ ] `hut.skips` and `stats.awakened` are written but never read.
- [ ] `story.strangeRumour` is a yes/no flag; "Take Her Seat" needs a count.
- [ ] The Raven swap: check it can land on seeds other than 1337.
- [ ] Check whether `noteSkip` double-counts a day when a tavern rest crosses midnight.
- [ ] Playtest the chapter timings. The current numbers are estimates.
