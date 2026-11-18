## 2026-11-18: Perrin goes strange; asking around; over the Edge (branch wt-letters)

- **Perrin's five letters rewritten as drafts** (CANON 2026-11-18, the writer's B1): dry and a little smug at the Crown, more
  lost each time, half writing to himself by the Reef and the Drowned; never what to find. Mara's lead-in changes with him
  (underlined, dated tomorrow, the ink has run, no greeting and no name). Goal ids and order unchanged (RULES 30).
- **Asking around** (`src/systems/perrin.js`): Mara's stuck hint now says to tie up at a harbour in the letter's waters and ask
  around. The first dock there while the letter is open, someone on the pier names the nearest place holding that region's clue
  with a bearing, and it goes on the chart as a rumour (red ring, the log's Rumours); it comes off when the letter is done. Once
  a letter (`state.story.letterAsk`). Full game only.
- **Over the Edge** (C1): going over the lip now ends in the white and you wake off Tama as after the waking (`abyss.wake('edge')`);
  Mara says one thing, once (`state.story.edgeWoke`), and never again. `state.story.edgeWay` kept for the Table's drawing.
- **Beating out** (C2): checked: the Edge fades into the mist and is never met again that voyage; the waking clock holds while
  it runs.
- All new lines are drafts: `docs/WRITER_TODO.txt` 4.6.
- Verified headless: each letter's text, lead-in and hint; the rumour in each region names the right place (Governor's Fort,
  Glass Lagoon, the Halved Isle, the Ribs, the Sunken Street), once, not in another region's harbour; a real dock at a Reef
  harbour gives it and marks the chart; the mark clears when the letter is done; over the lip wakes you at Tama with Mara's
  line once; beating out does not bring the Edge back with the dread held at full. Not verified: feel, timing on a real
  machine, smoke (run after the merge).
- Open: the writer's words for every line above; whether "Marked on your chart." stays.
