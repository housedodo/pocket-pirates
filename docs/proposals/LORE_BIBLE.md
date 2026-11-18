# Master Lore & Continuity Bible (proposal)

Status: **proposal, 2026-11-16; adopted 2026-11-18** (owner: add the lore proposals; how each went in is at its row in section 1, every line a draft; `docs/CANON.md` 2026-11-18). Phase 1 of the owner's three-phase design pipeline (lore, then systems and game feel, then a regional
mechanics and puzzle catalogue). Nothing here is canon until the owner approves it by ID. Nothing in the game, in `docs/CANON.md`,
`docs/RULES.md` or `docs/PROGRESS.md` was changed to write it.

## 0. How to read this

**Two kinds of statement, never mixed.**
- **Established** facts carry a source in brackets: `[CANON 3, 2026-11-12]` (a dated decision), `[CANON 2]` (a section), `[SM PLC-0050]`
  (a line ID in `docs/STORY_MASTER.txt`), `[SE X-F1]` (a block in `docs/STORY_EXPLORATION.txt`), `[code: src/regions.js caysQuiet]`,
  `[REGIONS]` (`docs/proposals/REGIONS.md`), `[WR 5.6]` (`docs/WORLD_REDESIGN.md`), `[GUIDE 4]` (`ARCHITECTURE_AND_LORE_GUIDE.md`),
  `[TODO 2.5]` (`docs/WRITER_TODO.txt`), `[AUDIT 3]` (`docs/AUDIT_2026-11-14.md`). A `[DRAFT]` or `[IDEA]` in a source is not
  established: it is quoted as such.
- **Proposed** items have a stable ID, **L-01 to L-42**. Approve, tweak or cut by ID. Where a proposal would touch a storyline it is
  offered as options (L-35A, L-35B ...), each with what it would close off; the owner may also pick none.

**What this document never does.** It does not draft anything `CANON.md` section 8 or `WRITER_TODO.txt` part 2 keeps for the owner or
writer (the six ending texts, Perrin's five post-hut letters, the six epilogue lines, the seven `CL-T-*` thread clue lines, the credits,
what her book says at the end, whether the hut changes, whether an ending touches what Mara is, the bell counts, the tone list). It does
not fill the `[IDEA]` slots of `STORY_MASTER.txt` (W-C2 to W-D3, the twelve side seeds, the little quests), which the guide lists as
"never fill these in" [GUIDE 1]. It never writes the name of Mara's village; there is none on the page anywhere [RULES 10]. It contradicts
no row of `CANON.md` section 3.

**Plain words behind the scenes, player rules on stage.** This is a backstage document, so it says sleeper, lid and dream where
`CANON.md` section 2 does. Every in-world snippet (section 6) keeps the player-text rules: RULES 1, 2, 6, 7 and 9 (no lid, eye, sleeper,
Lady, "kept soft", "Mara is from"; one idea a line; bright reading first; nobody sees or hears Mara but the captain [CANON 3,
2026-11-12]; the captain and the Lady never speak; no glyphs).

**A lore bridge is not a clue.** A question's level is derived only from clue rows in `src/clues.js` [CANON 4; RULES 32]. Nothing here
raises a level by itself. Where a proposal would need a clue row to count, section 7 says so and leaves it to the next phases and the owner.

**Sources read:** CANON, RULES, AREAS, STORY_EXPLORATION, STORY_MASTER (cast, structure, atlas, threads, endings, writer's log; section J
by source), WORLD_REDESIGN, REGIONS, the guide's sections 1 and 4 and its roadmap, WRITER_TODO, QUOTES (skimmed), PROGRESS (by grep:
open notes, threads, Perrin, bells, earlier dreams), the audit's lore sections; code: `regions.js`, `clues.js`, `threads.js` (regions),
`places.js`, `lore.js`, `harbourlife.js`, `newspaper.js`, `systems/lostsailors.js`, `sectors.js`, `palette.js` (strata, stages),
`objectives.js` (gates, remarks), `landmarks.js` (overrides). **Not read:** the Story Bible in the Claude Docs connector (named in
AREAS.md and PROGRESS.md section 4); `docs/DESIGN.md`; `docs/ROADMAP.md`. Where the Story Bible holds thread detail, this document may be
incomplete.

---

## 1. Executive changelog

Risk is the risk of over-explaining (or of closing a storyline): **low** = an ordinary custom or saying with a second look;
**medium** = it adds a reading to a mechanic or ties two places together; **high** = it narrows a mystery. Gap IDs (C-xx, B-xx) are in
section 2.

| ID | Proposal, one line | Closes gap | Leans on | Risk |
|---|---|---|---|---|
| L-01 | The earlier sailors are never put in order; every source that dates one disagrees with the others **ADOPTED 2026-11-18:** Home fisher (CUST-0004) and a bottle note: sources disagree on who came first; nothing dates anyone. | C-01 | CANON 2 ("Others sat before you"); CANON 3 2026-11-12 (the lost sailors); SE X11 | low |
| L-02 | People measure the past in people (a grandmother, forty years); anything older is measured in things ("older than the lamps") **ADOPTED 2026-11-18:** an old salt, anywhere (CUST-0005). | C-02 | SM SEC-0001, PLC-0026, HLF-0095, GRT-0062, GRT-0074, HLF-0140 | low |
| L-03 | "On the old charts" is how the world speaks of what belonged to an earlier dream; nobody says dream **ADOPTED 2026-11-18:** the apprentice, anywhere (CUST-0006); a Crown harbourmaster (CUST-0013). | C-03 | CANON 2 (2026-11-12); SM NEWS-0019, HLF-0134 | low |
| L-04 | No founding story of the table is ever told; fragments show the game going on, never how it began **ADOPTED 2026-11-18:** as a rule only: no line tells how the table began. | C-04 | CANON 2; SE X1-4; SE X7 suggestion (an [IDEA]) | low |
| L-05 | Velto stays the control harbour: ordinary, no clue, no earlier-dream fragment **ADOPTED 2026-11-18:** Velto greeter (CUST-0002), Mara at Velto (CUST-0057), the plain-harbour sight; Velto keeps no clue or fragment. | C-09 | SE X5-velto [CUT: deliberately]; SM P-velto | low |
| L-06 | Each region has its own idiom for the far water (six sayings), named by what it would lack **ADOPTED 2026-11-18:** one far-water line per region (CUST-0003, 0012, 0020, 0024, 0029, 0033). | C-05 | CANON 3 2026-11-13 (each region plays differently); REGIONS "Implies" | low |
| L-07 | Tama rings its bell gently and is proud of it: "it carries further that way" **ADOPTED 2026-11-18:** a Tama net-mender (CUST-0001). | C-06 | CANON 2 (the bells ring softly); SM HLF-0139 | low |
| L-08 | The Crown talks in lines: a clean line, a black line, the master's line, "his line is closed" **ADOPTED 2026-11-18:** Crown clerk line (CUST-0010), Mara's stamp remark, a paper item and a death notice (full), the customs slip kept in the log (full). | C-07, C-10 | code: regions.js crownLine; SM MAIN-0313, MAIN-0317, PLC-0022 | low |
| L-09 | Buoy-keepers; "Between the buoys you are in the book. Outside them you are weather." **ADOPTED 2026-11-18:** the harbourmaster after coming in by the buoys (CUST-0009); the wet outermost buoy, seen on the quay. | C-10 | code: regions.js inLane, laneArrival; REGIONS (buoyed lanes) | low |
| L-10 | Crown bell-towns ring loud so a coast can count by them, and find Tama's bell too soft to count by **ADOPTED 2026-11-18:** a Crown docker (CUST-0011) and the Crown fog bell (CUST-0014); no clue row, Q5 unchanged. | C-06 | SM GRT-0076, GRT-0077; CANON 2; CANON 4 (Q5) | medium |
| L-11 | Reckoning Day: once a year the Crown's ledgers and the Guild's are compared at the Governor's Fort; they never agree **ADOPTED 2026-11-18:** a paper item in Crown waters, full game only. | C-07 | CANON 4 (Q1 sources); SE X11 (sources disagree) | medium |
| L-12 | The Friday paper is set in the Crown and travels with the Friday floating market **ADOPTED 2026-11-18:** a paper notice (the press line); Friday market as the carrier. | C-19 | SM F2 (floating market, Friday); code: newspaper.js | low |
| L-13 | Cays hours: they say "morning" at dusk and put the children to bed at dawn **ADOPTED 2026-11-18:** night crier and dusk greeter (CUST-0015, 0016); shuttered stalls on the quay. | C-09, C-10 | SM OBJ-0156; code: regions.js marketNote; SM PLC-0037 | low |
| L-14 | Fire-sitters: on still nights a Cays village lights a fire on its sandbar "for the players", a courtesy only **ADOPTED 2026-11-18:** two full-game lines on a still night (CUST-0018, 0019) and a fire on a sand spit by every Cays harbour, lit on still nights only; it does nothing. | C-10 | CANON 3 2026-11-12 (Two Players); REGIONS (beach fires, the silent twin) | medium |
| L-15 | Cays storm nights: "Nobody plays, nobody sleeps." Doors barred, everyone up **ADOPTED 2026-11-18:** a storm-night line (CUST-0017); the fire is out on a storm night. | C-10 | code: regions.js caysQuiet, raiderChance; CANON 3 2026-11-13 (still nights only) | low |
| L-16 | Reef naming right: a wreck is claimed by painting its name on the Wall **ADOPTED 2026-11-17** (the stake with a rag); 2026-11-18 adds the painter (CUST-0022, full) and a CLAIMED chalk board on Reef quays. | C-10, C-11 | SM PLC-0040; SE X-R1 [DRAFT]; code: SALVAGE_MUL | medium |
| L-17 | The Brotherhood keeps accounts both ways: bounty paid at the next Reef harbour, tribute remembered **ADOPTED 2026-11-18:** the bounty toast adds "The Brotherhood remembers a debt both ways, Captain." (CUST-0067). | C-10 | code: BOUNTY; SM MAIN-0318, HLF-0090/0091, NEWS-0011 | low |
| L-18 | Salvagers' rule: "salvage at low water, a grave at high" **ADOPTED 2026-11-18:** a wrecker (CUST-0023). | C-10 | SM MAIN-0123, MAIN-0233, PLC-0049; REGIONS (storm wrecks) | low |
| L-19 | The Guild counts lights, not ships; every light's flash is learned as a children's rhyme; a dead light is "a gap in the rhyme" **ADOPTED 2026-11-18:** a children's rhyme (CUST-0027), a Guild notice (quay and paper), the keeper's log at the first light relit (CUST-0064), Mara there (CUST-0063). | C-07, C-10 | SM PAS-0015, PAS-0013; code: regions.js lampDead | low |
| L-20 | The pressers' grace: "It comes up. We thank it. We do not go down." Guild towns keep no nets; fish is bought in **ADOPTED 2026-11-18:** the innkeeper's grace (CUST-0028); no nets on the quay. | C-10 | SM PLC-0046; code: regions.js sellMul (fish 1.5x) | low to medium |
| L-21 | "Past the last light": Guild charts stop where the lights stop **ADOPTED 2026-11-18:** a lamplighter (CUST-0029). | C-05 | code: lampBurnMul; REGIONS (Lantern) | low |
| L-22 | Drowned fishers call their own names as they row in, every evening, everywhere in the Drowned **ADOPTED 2026-11-18:** a Drowned fisher (CUST-0031); the rowers at dusk, seen on the quay. | C-09 | SM NEWS-0024 | low |
| L-23 | Drowned tide poles: rings painted by every keeper, the oldest at the bottom; the weed line sits above them **ADOPTED 2026-11-18:** a tide pole by every Drowned harbour (rings, weed line above), seen on the quay and in the paper. | C-10 | REGIONS (tide poles, weed line); code: regions.js BELT | low |
| L-24 | In the Drowned nothing is "taken", only "kept", and nobody is thanked **ADOPTED 2026-11-18:** the chalk tally of what was really kept (from `drownedKept`), an innkeeper (CUST-0032), Mara (CUST-0062). | C-10 | CANON 3 2026-11-13 (harbours that take no coin); SM MAIN-0319, MAIN-0320; code: drownedTake, keptBack | low to medium |
| L-25 | The old hitch: a knot nobody ties any more turns up once in each region; it is the earlier sailors' knot **ADOPTED 2026-11-18:** the old hitch seen once in each region outside home (CUST-0050 to 0054, full game); a paper item (full). | C-11 | SM LOST-0004, GRT-0032, LORE-0012, HUT-0011; CANON 3 2026-11-12 | medium |
| L-26 | The place nearest the sea: every region lays one more place, each in its own form **ADOPTED 2026-11-18:** a place laid nearest the sea in each region's form (two cups, a mat, a stool, a lamp in a window, a place already eaten from in the Drowned). | C-11 | SM HLF-0108, PLC-0024, PLC-0034, NEWS-0007, TMOD-0032 | medium |
| L-27 | "Short dice": dice missing a number are a known market curiosity; gamblers will not play with them **ADOPTED 2026-11-18:** a stall sign in market towns on market day (CUST-0055). | C-11 | SM HLF-0100, PLC-0050, NEWS-0048 | low to medium |
| L-28 | Tavern slang: a low throw is "a candle" **ADOPTED 2026-11-18:** once, after the hut, a low haggle roll: "That is a candle." (CUST-0065). | C-11 | CANON 7 (one more candle for every low throw); SM HUT-0022 | medium |
| L-29 | The bell heard where no bell hangs: every region tells its own fog-bell story, and they disagree **ADOPTED 2026-11-18:** fog-bell lines that disagree: Crown, Cays, Reef, Lantern, Drowned (CUST-0014, 0021, 0025, 0030, 0034) and a bottle note. | C-06, C-11 | SM GRT-0098, NEWS-0025, MAIN-0122, TSC-0015 | medium |
| L-30 | "Gulls carry the news": a folk belief everywhere **ADOPTED 2026-11-18:** an old salt (CUST-0007) and a bottle note. | C-09 | SM HLF-0059, HLF-0061, OBJ-0148, GRT-0008 | low |
| L-31 | Lucky twenties: sailors scratch a high number on oars and wrists, each region in its own way **ADOPTED 2026-11-18:** after the hut: a twenty on a hired hand's oar (CUST-0066), on a Crown clerk's stamp and a wrecker's oar (quay). | C-11 | SM HLF-0109; CANON 6 (a natural 20 stands) | low to medium |
| L-32 | "The post": any captain carrying letters is the post; harbours call the captain postman **ADOPTED 2026-11-18:** a stall woman when the hold carries a delivery (CUST-0008). | C-21 | SM HLF-0030, OBJ-0153, PAS-0007 | low |
| L-33 | Ship-chalkers like Corvo are a trade in many harbours; the walls are washed on market day **ADOPTED 2026-11-18:** Corvo's wall is washed on market day (HLF-0141); a wall being washed, seen on market day anywhere. | C-07 | SM HLF-0079 to HLF-0087; SM F5 (Wednesday market) | low |
| L-34 | Mara's silences: in each region there is one thing she stops remarking on as the dread rises (behaviour, no new lines) **ADOPTED 2026-11-18:** one Mara remark per region, each once, only below a dread threshold per region (`HUSH`); her market-day and lantern-night remarks stop past dread 0.45. | C-20 | CANON 7 (her arc); GUIDE 4 (nothing between the stage lines); RULES 7 | medium |
| L-35 | Perrin's port: A Tama / B every harbour thinks he lives there / C left unfixed **ADOPTED 2026-11-18:** **C**: left unfixed; no line names his port. | C-12 | CANON 7; SM LORE-0009, LORE-0015, PAS-0007 | A low, B medium, C low |
| L-36 | R. of the bottles: A an initial only / B one of the three lost sailors / C the Raven's last captain (not recommended) **ADOPTED 2026-11-18:** **A**: an initial only; nothing added. | C-13 | SM MAIN-0206, MAIN-0298; CANON 3 2026-11-12 | A low, B medium, C high |
| L-37 | The drowned streets: A separate streets with one skeleton and one blue door / B one street in many places / C undefined **ADOPTED 2026-11-18:** **C**: undefined; nothing added. | C-14 | SM PLC-0002, PLC-0061, TSC-0018, HLF-0137; CANON 2 | A low, B high, C low |
| L-38 | Who of the Two Players came first: A Teo / B Ilse / C each says the other **ADOPTED 2026-11-18:** **C**: each says the other began (PLC-0070, PLC-0071, a second visit). | C-15 | CANON 3 2026-11-12; SM PLC-0026, PLC-0030 | A, B medium; C low |
| L-39 | Lune's song and the Two Players' tune: A unrelated / B one shared phrase, which does nothing / C learned from the Cays **ADOPTED 2026-11-18:** **A**: unrelated; nothing added. | C-16 | SM HLF-0117, HLF-0138; CANON 3 2026-11-11 | A low, B medium, C high |
| L-40 | "Blue so the sea does not notice you": A a boat-painting custom only / B also doors / C one line, never repeated **ADOPTED 2026-11-18:** **C**: the paper's blue line is printed once a voyage, never again. | C-17 | SM newspaper FACES (cosy band); SM PLC-0061, TBL-0022; CANON 3 2026-11-12 | A low, B high, C low |
| L-41 | Doc-only ship names (the Orchard, the Sparrow, the Lantern Maid): A retire / B keep in reserve for the writer **ADOPTED 2026-11-18:** **B**: kept in reserve for the writer; not in the game. | C-18 | SE X-C1, X-R2, X11 SET-3 | low |
| L-42 | Three readings for the bell counts, offered to the owner's own answer to TODO 2.5 E2 (not a decision) **ADOPTED 2026-11-18:** no reading chosen: the bell count is the owner's, for later (CANON 2026-11-18). | B-12 | SM HLF-0139, GRT-0076, CLUE-0001; PROGRESS (L3) | per option |

---

## 2. Loose-ends audit

### (a) Open on purpose: keep them open

| ID | Loose end | Source | Why it stays open |
|---|---|---|---|
| A-01 | What the diver is | CANON 7; CANON 3 2026-11-11 | The demo's last image. Any reading makes him a creature. |
| A-02 | Who writes the ledgers (beyond the Table's YOU) | SE X-C1 "must NOT be told"; CANON 3 2026-11-12 | Q1's whole force is that nobody is seen writing. |
| A-03 | What the Edge's shapes are | CANON 3 2026-11-12 ("Nothing explains it") | The one place the scale shows; a reading shrinks it. (STORY_MASTER K4 c suggests the statues are "what is left" of earlier dreams; that was an assistant suggestion, not a decision: see section 2(d) D-20.) |
| A-04 | How the Kestrel sank | SM SEC-0001 to SEC-0005; SE X11 SET-1 | Sources disagree by design; the posts are what they share. |
| A-05 | Who K was, and the rubbed-out name | SM PLC-0034, PLC-0035 | The Cup works because the name is gone. |
| A-06 | How Teo and Ilse play one tune without having met | SM PLC-0026; CANON 3 2026-11-12 | A wrong thing with a warm reading; see L-38 for what may be added without closing it. |
| A-07 | How long the Raven has sailed alone | CANON 3 2026-11-12 ("Nobody knows") | Canon says nobody knows. |
| A-08 | Who paints the wet names at the top of the Wall | SM PLC-0040, PLC-0042 | L-16 explains the bottom of the wall, never the top. |
| A-09 | What the Hammock sleepers murmur, and why | SM PLC-0037, PLC-0038 | Q4 is joined by the player, not told. |
| A-10 | What comes up for the Oil Press | SM PLC-0046 ("a fish nobody names") | Naming the fish names what is under the sea. |
| A-11 | Tomas, and Ines's lamp going dark | SM HLF-0040 to HLF-0046, HLF-0115 | A resident's arc that ends in absence; the guide's "laid for two" shape. |
| A-12 | Who drew the hut on the chart | SM MAIN-0214, MAIN-0215 | The first "hand that is not ours". |
| A-13 | What Mara is, in the game | CANON 3 2026-11-12 ("Never said in the game") | Canon. |
| A-14 | The hermit who has been there "since before the lighthouse at Tama" | SM MAIN-0117, MAIN-0288 | A cosy oddity; a reading makes him a sitter. |
| A-15 | The innkeeper's "one more place", the Customs desk's second cup | SM HLF-0108, PLC-0024 | L-26 gives the custom an ordinary reading; who the place is for stays open. |

### (b) Reserved for the owner or the writer (listed, not filled)

| ID | Gap | Source |
|---|---|---|
| B-01 | The six ending texts (TBL drafts) | CANON 8; TODO 1.2 |
| B-02 | Perrin's five letters after the hut (OBJ-0152 to OBJ-0167, drafts) | CANON 8; TODO 1.4 |
| B-03 | The six epilogue lines (TBL-0024 to TBL-0029) | CANON 8; TODO 1.3 |
| B-04 | The seven thread clue lines `CL-T-*` | CANON 8; TODO 1.5 |
| B-05 | The credits | CANON 8; TODO 1.6 |
| B-06 | What her book says at the very end; SM H "What the ledger says at the end: (empty)" | TODO 2.1; SM H |
| B-07 | Whether the hut changes on later visits (candles you can count, a second chair) | TODO 2.2; GUIDE L1 [OWNER] |
| B-08 | Whether any ending touches what Mara is | TODO 2.3; GUIDE 1 |
| B-09 | The writer's general rules | TODO 2.4; SM B-note-1 |
| B-10 | The tone list: "THE EYE" in `abyss.js`, stock horror, glitch glyphs, the hut's gold-slot phrasing | TODO 2.5 A to D; GUIDE P1 |
| B-11 | Counts that disagree: "counting to eleven. We only have nine." (ABY-0014) beside "Eleven. We are ten" (LORE-0047) | TODO 2.5 E1 |
| B-12 | The bell counts: "TWO STROKES, NEVER THREE" (HLF-0139), "Twelve, every day" (GRT-0076), "Tama rang fourteen at noon." (CLUE-0001, a fixed number), while Tama's bell rings one stroke (`noonbell.js`); and whether the strokes should equal the last throw | TODO 2.5 E2; GUIDE L3 [OWNER]; PROGRESS (L3). L-42 offers readings only. |
| B-13 | Whether a low throw lands on one harbour (`?landing=1` trial) and whether greeters keep naming the cause ("Somebody threw a {w}") | GUIDE L2; TODO 2.5 D4 |
| B-14 | The capabilities `forecast` and `bluelamp` | GUIDE G3 |
| B-15 | Every `[IDEA]` slot in STORY_MASTER F3 (W-C1 to W-D3), F6, G2 (twelve seeds), G3 (quests); Perrin's hooks in C-002 ("he once visited the hut") | GUIDE 1 ("never fill these in"); TODO 3.1 to 3.3 |
| B-16 | SE X16 Q-1 (is understanding ever shown), Q-2 (how many places per region), Q-5 (is taking things a choice with a price), Q-7 (should the first look under the sea be the Dark Tower) | SE X16 |
| B-17 | The Drowned "place set" trade, waiting on the Hollow Harbour thread | REGIONS, step 8 |
| B-18 | Which of Mara's tells become things seen beyond the shadow | GUIDE L7 |
| B-19 | Whether the lost sailors become part of the sea rather than cards | GUIDE 4 |
| B-20 | Whether the fog bell, the other bell villages at noon and the title's hourly bell ever sound | PROGRESS (L3 note) |
| B-21 | What the Halved Isle's other half is and where (SE X5-broken, an [IDEA]) | SE X5-broken |

### (c) Gaps that in-between lore can safely bridge

| ID | Gap | Evidence | Bridged by |
|---|---|---|---|
| C-01 | No order or dates for the earlier sailors (Kestrel, Marigold, R., the three lost sailors, Teo and Ilse, the Raven) | No doc orders them; SM SEC-0001 gives a grandmother's lifetime for the Kestrel only | L-01 |
| C-02 | No in-world way to speak of time beyond living memory | Two year counts exist: the egg page's "two hundred years" (HLF-0101) and the draft "a hundred years" (TBL-0002, reserved) | L-02 |
| C-03 | How the world speaks of earlier dreams without saying so | FRAG_EARLIER (HLF-0134 to HLF-0137) shows them; nothing names them | L-03 |
| C-04 | Pressure toward an origin tale for the table | SE X7 suggests a fairy tale ("Everyone, in turn, is asked to sit") as an [IDEA]; SM G4 asks for "the whole story" | L-04 |
| C-05 | How each region talks about the far water | The brief; only scattered lines (PAS-0066, MAIN-0171) | L-06, L-21 |
| C-06 | **Q5 has no fixed source outside home waters.** Its clues are CL-C3-a and CL-BELL-a (both `home`) and CL-T-bell (Lantern, a thread). Three of seven threads wake per voyage (`marks.js pickAwake`), so on about four voyages in seven Q5 cannot pass level 1 | `src/clues.js`; AUDIT 3 ("cannot pass level 1 unless the bell thread wakes") | L-07, L-10, L-29 give the lore; a clue row is the next phases' and the owner's (section 7) |
| C-07 | Q1's sources (Crown and Lantern) have no tie between them in the world | `src/clues.js` (CL-C1-a, CL-C2-a crown; CL-L2-a lantern) | L-08, L-11, L-19, L-33 |
| C-08 | Q7 tops out at level 2 (Free Cays and the Halved Isle only) | AUDIT 3 | Not bridged by lore here: the Halved Isle's other half is reserved (B-21). Hooks in section 7. |
| C-09 | Everyday culture is thin per region: dishes, games and events go by village style, not by region | `src/harbourlife.js` DISHES, GAMES | L-05, L-13, L-22, L-30 and section 4 |
| C-10 | The region rules have no in-world reasons people would give | `src/regions.js` (every rule is a number) | L-09, L-13 to L-20, L-23, L-24 |
| C-11 | Motifs recur without a cross-region pattern: knots, places laid, dice missing a number, bells in fog, high-number charms | Section 5 lists the lines | L-25 to L-31 |
| C-12 | Where Perrin lives. He "never left port" [CANON 7] and his letters wait at Tama [SM OBJ-0009], but any harbour's gossip may mention "Old Perrin's cat" (LORE-0009) or that "Perrin was very calm about it" (LORE-0015); a passenger says he sends maps by bottle (PAS-0007) | `src/lore.js` GOSSIP is drawn in every harbour | L-35 |
| C-13 | R. of the bottles is orphaned: "If you find the black hut, do not sit down. I sat down. - R." (MAIN-0206); "She has a book. My name is in it now. Twice. She let me throw once." (MAIN-0298). (A sunny bottle is signed "-M." (LORE-0034); this document recommends it stays unconnected to anyone.) | SM MAIN HUT_NOTES | L-36 |
| C-14 | Several drowned streets with one skeleton: the Drowned Bell's street (PLC-0002, 325 from the centre), the Sunken Street (PLC-0061), the Bell Below's town (TSC-0018, TSC-0028), the chapel painting (HLF-0137) | SM PLC, TSC, HLF | L-37 |
| C-15 | The Two Players' beginnings. Canon: they sailed and refused to throw [CANON 3 2026-11-12]. A doc draft has Ilse taught by her grandmother [SE X-F1, DRAFT], which reads as a local inheritance instead | SE X-F1; SM PLC-0026, PLC-0030 | L-38 |
| C-16 | Lune's song ("a table by the water, a candle, and a number nobody says", HLF-0138) sits beside the Two Players' tune with no stated relation | SM HLF-0117, HLF-0138 | L-39 |
| C-17 | Blue recurs: the blue door (PLC-0061, TBL-0022, HLF-0137), the customs man's blue coat (PLC-0022), Tomas's blue scarf (HLF-0114), Marisol's blue ribbon and blue house (HLF-0071, HLF-0077), the lamps that burn blue (PLC-0046), and the paper's "blue so the sea does not notice you" (`newspaper.js` FACES, cosy band) | as cited | L-40 |
| C-18 | Ship names used only in docs: the Orchard (SE X-C1, X-R1, X11 SET-3), the Sparrow and the Lantern Maid (SE X-R2 note) | not in the game | L-41 |
| C-19 | Who prints the Friday paper and how it reaches every quay | `src/newspaper.js` (masthead THE HARBOUR TIDINGS) | L-12 |
| C-20 | Mara has nothing between her stage remarks | GUIDE 4 ("Medium: nothing between the stage lines") | L-34 |
| C-21 | "The post": residents call the captain the postman (HLF-0030); Perrin's letters "came in with the post" (OBJ-0153) | SM HLF, OBJ | L-32 |

### (d) Plain inconsistencies (bugs in the docs, or between docs and code)

Each is a doc bug by CANON's own rule unless marked otherwise. "Verified" means checked by reading the code or by a replica of its maths,
never by playing.

| ID | Inconsistency | Where | Note |
|---|---|---|---|
| D-01 | **Clue regions do not match the water the place sits in.** `regionAt` (the chart's waters, Perrin's hints "The chart shows whose waters we are in") takes the region from the 550-unit sector; the clue's region is a fixed tag. By a replica of `sectors.js` over 200 seeds: the Ribs (CL-RIBS-a, `reef`) lie in **Lantern** water on every seed; the Name Wall and the Throwers' Wreck (`reef`) lie in Reef or Free Cays water depending on the seed; the Sunken Street (`drowned`) lies in **Free Cays** water; the Grey Tooth and the Drowned Bell (`home`) lie in Free Cays or Reef water; Hollowgreen in Lantern water | `src/clues.js`; `src/sectors.js` WEDGES; `src/landmarks.js`; `src/regions.js regionAt` | So Perrin's Reef letter (`regionSeen`) can be completed at the Ribs in Lantern waters, and his Drowned letter at about 900 out, in the Cays, without crossing the belt (1740 to 1800). The Sunken Street's place is a deliberate "distance lie" [WR 5.5]; the others look accidental. Owner or gameplay: decide which is wanted. |
| D-02 | Place visit texts say "she", "the hut" or a number about it, and can be read before the hut is known. Before the first throw the reach is `max(strataGate, chapter wall)` (`objectives.js:272`), so Teo (499), the Archive (999) and the Marigold (1150) can be reached in chapters IV to VI: "A 1 at the hut" (PLC-0050), "Never sat at her table" (PLC-0067), "Never above nine" (PLC-0043) | RULES 6; `src/places.js` VISITS; `clueLint` checks clue lines only | Verified by reading, not by play. |
| D-03 | Q6 is written as the older premise in several docs: "a person from a village that is no longer above water" (SE X2), "this was above water before the sea rose" (SE X-D1 clue), seed 3 "above water before the sea rose" (SM G2, PROGRESS section 3). Canon: Mara is an entity the sleeper made; her village came from an earlier dream [CANON 2; CANON 3 2026-11-12] | SE X2, X-D1; SM G2 #3; PROGRESS | The "sea rose" cause is not canon. Later phases must not take it from these docs. |
| D-04 | CANON's own table gives Q6's hidden answer as "Someone who survived something" [CANON 4], while CANON 2 says she is an entity the sleeper made | CANON 4 vs CANON 2 | May be meant as the player's after-belief, not the truth; flagged because the next phases read CANON 4 as the answer. Owner. |
| D-05 | SE X-D1 draft "My name was on the door. Not Mara. The other one." vs "her real name is Mara" [SM B8] | SE X-D1 LN-D1-2 [DRAFT] | Doc draft only. |
| D-06 | SE X11 SET-6: Mara remembers a green door, the street's is blue; WR 6.5 rule 3 relies on it. The built memory says blue (TBL-0022) | SE X11; WR 6.5 | The planned disagreement no longer exists. |
| D-07 | SE drafts use banned words: X9 log lines ("It is a lid", "Tama is where she is kept soft", "Mara is from the street ..."), X-L3 LN-L3-1 ("The sea has a lid"); X-C3 calls the retired inscription "RUNG FOR THE ONE WHO SLEEPS" built (retired HLF-0093); X7 lists the retired inscription and the retired "closed eye" painting (HLF-0097) | SE X3, X7, X9, X-C3, X-L3 | WR 9 says the X9 lines are "not yet cut". |
| D-08 | SE X11 SET-2 "[Rule B2: she is never seen.]" and PROGRESS section 4 "the Lady is never seen" vs CANON 3 2026-11-13 (she may be seen) | SE X11; PROGRESS | Stale. |
| D-09 | SE X16 Q-4 "Still open: are the two players the same two who play at night?" and Q-6 "What does the Lady write?" are decided [CANON 3 2026-11-12] | SE X16 | Stale. |
| D-10 | When the Table appears: SE X-D3 (q1, q3, q4, q6 at level 2); WR 5.7 ("any three at level 2"); CANON 3 2026-11-13 and `tableOpen` (thrown once, or three questions). In code the Table can be gone ashore on after one throw (`places.js:181`, `tableOpen`), but its far label shows only with `d3Open` (`places.js:194`, `main.js:1255`) | SE X-D3; WR 5.7; `src/places.js` | A captain who has only thrown sees no label at the Table. Code inconsistency for gameplay. |
| D-11 | The Sunken Street's distance: SE X-D1 1700 to 2000 and CANON 5 ("Decide: the Lid: the Sunken Street") vs SM P-street "899 from Tama" and `landmarks.js` (516, 737) with a forced dread of 0.74 | SE; CANON 5; SM F4 | On purpose in WR 5.5 (a distance lie); CANON 5's table reads as if it were in the Lid. |
| D-12 | SM F3-DROWNED "Mara cannot be trusted to remember here" vs CANON 3 2026-11-11 (she remembers) | SM F3 | Stale. |
| D-13 | SM G1: every thread's "region it belongs to: (empty)"; SM K1 "Which regions get which threads? Depends ..."; SM G4 "What is the whole story? (empty) ??" All decided [CANON 3 2026-11-12] | SM G1, G4, K1 | Stale notes the writer may read as open. |
| D-14 | CANON 3 2026-11-12 names the Lantern thread "the Drowned Bell"; CANON 3 2026-11-13 renames it "The Bell Below" (the landmark keeps "the Drowned Bell") | CANON 3 | The later row resolves it; the earlier row's wording confuses the thread with the home landmark. |
| D-15 | CANON 3 2026-11-11 "The main chain is 16 goals"; `MAIN_GOALS` has 21 with Perrin's five [AUDIT 3]. PROGRESS's opening summary (line 7) also says 16 goals, 13 places, "17 clues" (there are 30) and "four actions" (the Table has six choices) | CANON 3; PROGRESS line 7 | The audit left CANON's dated rows as decided; a reader still meets the old number. |
| D-16 | **Stage numbering.** CANON 3 2026-11-12 says the lost sailors come "at stage 4 and up" (code: 0.6, the fourth fifth counted from one) and that the Cays' dread "stays below stage 3" (code: `LULL_CAP` 0.45, commented "just under stage 3 (0.5)"). `stageOf` counts fifths from zero (0.4 to 0.6 is stage 2); Mara's remarks use quarters (stage2 0.25, stage3 0.5, stage4 0.75, stage5 0.95); SM "TONE BY DREAD STAGE" counts 0 to 4; QUOTES labels Mara's remarks stages 1 to 4 | CANON 3; `palette.js stageOf`; `systems/lullaby.js`; `systems/lostsailors.js`; `main.js:1284` | Three schemes. With fifths counted from one, a cap of 0.45 is above the start of stage 3 (0.4). The owner kept Mara's quarters [AUDIT 1]; the CANON wording is what is ambiguous. |
| D-17 | RULES numbers 24b and 24c twice (under Look: island variety, sea life; under Sound: "regions differ by their rules", "the main pier is the captain's", neither about sound) | RULES | Numbering bug. |
| D-18 | CANON 3's rows are not in date order (a 2026-11-14 row after 2026-11-15 rows; 2026-11-13 rows after it) | CANON 3 | Cosmetic. |
| D-19 | SM F4 "seen from far" for the Table is cut off: `"a table at the water\"` (code: "a table at the water's edge") | SM F4; `scripts/story_export.py` | The exporter trips on an escaped apostrophe. |
| D-20 | SM K4 c says "The Edge ... is where these earlier dreams stand: the statues are what is left of them", marked as built with the fragments; CANON 3 2026-11-12 says nothing explains the Edge | SM K4 c | Not treated as established here (A-03). |
| D-21 | SM F4 gives every distance "from Tama" measured from the sea's centre (0, 0) (for example the Grey Tooth, 297), while Tama's island and pier lie near (0, -118) (`harbourlife.js` FAR comment) and the player reads distances from the pier [CANON 3 2026-11-13] | SM F4 | Backstage only; worth a note in F4. |
| D-22 | The seed for the Raven in the docs reads "Not the Gull. I left it." (SM C-008); the game says "Not the Gull. Somebody left it." (TMOD-0046) | SM C-008 | Doc behind the game. |
| D-23 | Possible tension (owner): in the Other Captain's ending Mara says "I will take the Gull home, Captain. Somebody should." (TMOD-0045), then "Nobody came back for the Gull." (TMOD-0039). The guide says Mara never acts on the world where others would see [GUIDE 1]. It may be deliberate: a Gull that comes home with nobody seen aboard fits CANON 3 2026-11-12 (nobody sees her) and GRT-0087 ("The boat came home by itself") | SM TMOD | Not changed; flagged. |
| D-24 | Possible tension (owner): "The Lady never speaks" [CANON 3 earlier] beside "You are sure she said your name." (HUT-0007) and "A dry little laugh." (HUT-0002) | SM HUT | Perceived, not spoken; flagged only. |
| D-25 | The Bell Below is the Lantern's thread, but its scene is reef imagery: "a belfry roof stands up out of the reef" (TSC-0015), "every wreck on this coast" (TSC-0023); the Lantern's look has no reefs [REGIONS] | SM TSC; CANON 3 2026-11-12 | Flavour mismatch from before the mapping. |
| D-26 | Is the Music thread's tune (three notes from the House on Four Legs, TSC-0042, TMOD-0037) the Two Players' tune (eight bars, PLC-0026, TBL-0008)? SE X14 says the Music thread answers Q7 "the tune, same as the Free Cays"; CANON 3 2026-11-12 maps "the Music out of the Fog (and the Two Players)" to the Cays; the code keeps them apart (CL-T-music vs CL-F1-a and `hum`) | SE X14; CANON 3; `clues.js` | Unclear; owner. |
| D-27 | SE X-F1 draft has Ilse taught by her grandmother; CANON says she sailed and refused | SE X-F1 [DRAFT] | Doc draft only (see L-38). |
| D-28 | Near-duplicate names (Ines and Ilse; Hollowgreen and the Hollow Harbour; Anselm and Brother Ansel; Mags and Tully as passengers and in the paper's names; "Admiral" the parrot and the gull) | AUDIT 3; `newspaper.js` NAMES | Known; not fixed. |
| D-29 | PROGRESS keeps lines that read as open but are decided: "Open thread for the writer: who is the other berth ..." and "Open threads: what the Lady writes ..." | PROGRESS (Mara and wrong-things entries) | A dated log, so not wrong when written; misleading to a new reader. |
| D-30 | The bottle "If you find the black hut, do not sit down. I sat down. - R." (MAIN-0206) points at the Sit ending, which WR 6.1 removed from a fisher's line for that reason | SM MAIN HUT_NOTES; WR 6.1 | Owner (it is also R.'s only voice: L-36). |

---

## 3. Chronological bridges (behind the scenes)

The order of rows is the order of the dream, as far as anything is known. **E** = established, **P** = proposed (with ID), **open** =
kept open or reserved. Years are never given unless a line gives them (L-02).

| # | Event | Status | Source or proposal |
|---|---|---|---|
| T-01 | There have been dreams before this one; this world is not the first | E | CANON 2; CANON 3 2026-11-12 ("What the fragments tell") |
| T-02 | In earlier dreams: a sea with two moons, one behind the other; a calendar for a year that never was; a chart of islands that are nowhere, its sea drawn exactly the same | E | SM HLF-0134, HLF-0135, HLF-0136 |
| T-03 | Mara's village, in an earlier dream: a street that ran down to the water, a bell that rang two strokes every hour, a blue third door | E | CANON 2; SM TBL-0020, TBL-0021, TBL-0022, OBJ-0099, HLF-0137 |
| T-04 | The village came over into this dream; the sleeper made Mara | E | CANON 3 2026-11-12. Which came first is not stated: open. |
| T-05 | This dream is the longest she has slept, so it stays | E | CANON 2 |
| T-05a | The world speaks of what was before only as "on the old charts" | P | L-03 |
| T-06 | The table, the die and the book are in use "always": a ledger page of throws runs back two hundred years | E | SM HLF-0101; CANON 2 |
| T-06a | No founding story exists anywhere in the world | P | L-04 |
| T-07 | Harbours keep bells; nobody remembers who rang one first; Tama rings softly | E | SM GRT-0077; CANON 2; SM HLF-0139 |
| T-07a | Tama rings gently on purpose; the Crown rings loud and counts by it | P | L-07, L-10 |
| T-08 | The Crown writes down ships; the master's line "has always been blank"; the Fort keeps every bad day "as far back as we have it" | E | SM PLC-0022, PLC-0043 |
| T-08a | Once a year the Crown's and the Guild's books are compared, and do not agree | P | L-11 |
| T-09 | The Guild's lamps; oil that "comes up" | E | SM PLC-0046 |
| T-10 | Sailors sit at the table in turn. An old fisher's grandfather won and the fish came back (HLF-0095); R. sat down (MAIN-0206, MAIN-0298); the Marigold's captain threw a 1 and kept sailing (PLC-0050) | E | as cited |
| T-10a | These are never put in order | P | L-01 |
| T-11 | The Kestrel goes down, within a grandmother's lifetime; two white posts; her name crossed off the Grey Tooth's list; her lamp and bell lie in home water | E | SM SEC-0001, PLC-0069, MAIN-0285 |
| T-12 | Earlier sailors go mad and vanish in the dread: the other berth, the hook, the one who dug first (the one who rowed is cut) | E | CANON 3 2026-11-12 |
| T-12a | Each left a trace near home that the present voyage meets: two berths paid (MAIN-0261), a bronze hook already in the catch (MAIN-0264), a hole dug first (MAIN-0282) | E | CANON 3 2026-11-11 and 2026-11-12 |
| T-12b | Their old hitch is still found in each region | P | L-25 |
| T-13 | The Two Players sail, refuse to throw, and find that their song, played entering the dread, soothes it; they have kept the Cays quiet for forty years without meeting | E | CANON 3 2026-11-12; SM PLC-0026 |
| T-13a | Who came first | P (options) | L-38 |
| T-13b | Cays villages begin lighting fires "for the players" | P | L-14 |
| T-14 | A normal sailor's ship is changed by the dread and sails on empty: the Raven; time does not touch her | E | CANON 3 2026-11-12 |
| T-14a | Whether R. was hers | P (options; C not recommended) | L-36 |
| T-15 | Perrin, who never left port, draws the sea; his riddle island "nobody has ever charted" | E | CANON 7; SM OBJ-0057 |
| T-15a | Which port | P (options) | L-35 |
| T-16 | The harbour present: Ines's Tomas is nineteen days late and has walked inland "away from a lamp"; Corvo chalks ships; the wall is washed every week | E | SM HLF-0040, HLF-0115, HLF-0079 to HLF-0087 |
| T-16a | The wall is washed on market day; chalkers are a trade | P | L-33 |
| T-17 | The present voyage, chapters I to VI: the Merry Gull and Mara; Perrin's riddle; two berths, the hook, the hole; bottles all mention a hut; it appears on the chart; the first throw; the diver; at the next harbour someone speaks the number. The demo ends here | E | CANON 1, 5; CANON 3 2026-11-11 |
| T-18 | After the hut: Perrin's letters send the captain into each region; gather, compare, decide; the lost sailors in deep dread; the Edge, once; Mara's village returns in four pieces; the Table by the Water | E | CANON 3 2026-11-11, 2026-11-12, 2026-11-13; CANON 5 |
| T-19 | An ending; "Keep sailing" or "End the voyage"; a line in the Ship's book | E (texts reserved, B-01, B-03) | CANON 3 2026-11-13 |

**What the bridges add, in one paragraph.** Between the first dreams (T-01 to T-05) and the present voyage (T-17), the established
material gives one long, undated stretch in which the table is always in use, bells are rung, books are kept and sailors come and go.
The proposals do not fill that stretch with events. They give the world a way to talk about it (L-02, L-03), a rule that it has no
beginning (L-04), and a few customs that show the stretch was lived in: books compared every year (L-11), fires lit for the players
(L-14), a knot still found (L-25). The only connective events proposed are customs, never a happening that explains another.

---

## 4. In-between lore

Each item is tied to a question (Q1 to Q7, CANON 4) or to a region rule in `src/regions.js`. Village styles are picked by faction
[SM F3]: the Crown builds classic, market and farm towns; the Free Cays thatch, fishing and farm; the Reef wreckers', thatch and
fishing; the Lantern shrine, terraced and market; the Drowned wreckers', fishing and shrine. Dishes, games and festival days go by
style [code: harbourlife.js]. The week is shared: Wednesday market, a festival day per harbour, Friday paper and floating market,
Saturday lantern night, Sunday regatta, Thursday whales [SM F2, F5].

### 4.1 Home Sound and Tama

**Established.** Tama is home, the Crown's colours and classic look [code: sectors.js, home is `crown`], a red-and-white lighthouse,
the bells, a festival on Sunday ("Bell Sunday" for a classic harbour), Perrin's letters at the harbourmaster [SM F5]. A low throw's dread
is not felt in Home Sound, and the swell lies down at the noon bell [GUIDE L4]. Velto is the second harbour, a fishing village, kept
ordinary [SE X5-velto]. The three small wrong things happen here [CANON 3 2026-11-12]. The Kestrel lies here [SM MAIN-0285].

**Proposed.**
- **L-05 Velto stays the control.** No clue, no earlier-dream fragment (it is under 600 out, so `FRAG_EARLIER` never reaches it), no
  wrongness beyond its Kestrel tale (SEC-0004). Every strange thing elsewhere needs one plain harbour to be strange against. *(low)*
- **L-07 Tama rings gently.** Tama folk are proud of their soft peal, as other towns are proud of a loud one: "We ring it gently here.
  It carries further that way." Ordinary: craft pride. Second look: Q5. Does not touch how many strokes (B-12). *(low)*
- **L-06, home form: "past hearing".** Old salts in Home Sound say a boat has gone "past hearing" when it is beyond the bell's reach.
  Ordinary: a fog-and-distance saying. Second look: the bell is what keeps it gentle (Q5). *(low)*

**Food and trade (established):** harbour fish pie (classic), fisher's stew (Velto, fishing) [code: DISHES]. Tama sells oil at 0.42 a
unit [code: oil.js OIL_PRICE]; the Lantern pays 0.9 [code: OIL_SELL].

### 4.2 The Crown Traders

**Established.** Colonial towns, churches, tidy quays, markets, farms; merchant brigs and galleons; customs; the fewest raiders; steady
weather [SM F3-CROWN]. The rules: timed contracts (on time 1.45x, late 0.55x), a shared record (+5% a clean line up to +25%, -15% a black
line), one clean line a day for coming in between the buoys, customs cutters that stamp papers or take dark cargo; the Crown grows no
fruit (fruit sells at 1.5x) [code: regions.js]. "A black line in the Crown's book." (MAIN-0313); "In by the buoys. The harbourmaster
ticks a line in the book." (MAIN-0317). The paper: "CROWN RAISES HARBOUR DUES" (NEWS-0016). Q1 lives here: Customs Pier, Governor's Fort
[CANON 4]. Threads: the Ferryman's Coin and the Strange High House [CANON 3 2026-11-12].

**Proposed.**
- **L-08 Lines.** The Crown speaks of everything as lines in a book: a clean line, a black line, the master's line, "keep your line
  clean". A death notice reads "His line is closed." Ordinary: a clerkly people's idiom. Second look: Q1 (the master's line is always
  blank, PLC-0022). *(low)*
- **L-09 Buoy-keepers.** The red and green lanes are kept by buoy-keepers who repaint them each spring (as the whitewash custom repaints
  houses, GRT-0060). Their saying: "Between the buoys you are in the book. Outside them you are weather." Ordinary: lane discipline.
  Second look: outside the book, you are not counted. *(low)*
- **L-10 The Crown rings loud.** Crown bell-towns ring "Twelve, every day. We count." (GRT-0076 is already a bells custom) so the whole
  coast can count by them. They find Tama's peal too soft to count by, and say so with a townsman's scorn. Ordinary: rivalry. Second
  look: a second region notices that Tama is different (Q5). This gives the lore for a Q5 source outside home; whether it becomes a clue
  row is the owner's (section 7). *(medium)*
- **L-11 Reckoning Day.** Once a year the Crown's customs ledgers and the Guild's keepers' ledgers are carried to the Governor's Fort and
  compared, line by line. They never agree; the Fort files the disagreement. Ordinary: two bureaucracies. Second look: two books that
  both list ships that have not come in (Q1). A Crown festival day could carry it. *(medium)*
- **L-12 The paper's press.** The Harbour Tidings is set in a Crown town (presses, paperwork) and goes out with the Friday floating market,
  which is why it is a Friday paper on every quay. At high dread "The paper is damp, and warm." (NEWS-0005) reads as a paper that came
  in from the sea. *(low)*
- **L-06, Crown form: "off the book".** Far water is "off the book": no lanes, no lines, no record. *(low)*

**Fear (proposed reading of established lines):** a black line; being late; a page with your name on it before you came (PLC-0022). The
Crown fears disorder, not the dark.

### 4.3 The Free Cays

**Established.** Palm-thatch huts, fishing villages, farms; canoes and fishing boats; flying fish and turtles; calm, bright weather; the
easiest sailing [SM F3-FREE]. The Cays sleep by day and play by night (OBJ-0156). Rules: the night market pays 1.4x for fish and fruit
while somebody plays; the stalls are shuttered by day; no raiders while they play, a raider chance of 0.1 when nobody does; on a still
night the dread there is held at 0.45; storm nights are unprotected [code: regions.js caysQuiet, sellMul, raiderChance;
systems/lullaby.js; CANON 3 2026-11-12, 2026-11-13]. "In the Cays they say the dark keeps quiet while somebody plays." (MAIN-0310).
Food: coconut curry (thatch), fisher's stew, pepper pot (farm); Kite Day [code: harbourlife.js]. The paper: a boat race won by a canoe
with a goat in it; "A CAY IS GONE" (NEWS-0018, NEWS-0019). Q2, Q4, Q7 live here; the Music thread [CANON 3 2026-11-12].

**Proposed.**
- **L-13 Night hours.** Cays people greet you with "Morning" at dusk and put the children to bed at dawn. Ordinary: a hot-country life
  turned round. Second look: they are awake while somebody plays. *(low)*
- **L-14 Fire-sitters.** On a still night each Cays village lights a fire on its nearest sandbar, as Teo's is lit, "for the players". It
  is a courtesy, like a lamp left for a late boat; nobody claims it does anything. The fires are already in the look (beach fires on the
  landing, the low firelight on a sandbar as the Two Players' silent twin [REGIONS]). Must never be a second way to keep the Cays quiet.
  *(medium)*
- **L-15 Storm nights.** "Nobody plays, nobody sleeps." On a storm night Cays households bar the doors and sit up together. Ordinary:
  storm watch. Second look: the rule in `caysQuiet`. *(low)*
- **L-06, Cays form: "where nobody plays".** *(low)*

**What they sing (established):** the thatch rhyme, "One for the gull and two for the bell ... nineteen, twenty, and all of us sleep."
(HLF-0099). What they fear (proposed reading): silence at night.

### 4.4 The Reef Brotherhood

**Established.** Wreckers' coves, rough harbours, thatch, fishing; wrecks everywhere; schooners; the only raiders; squalls and rolling
water [SM F3-REEF]. Rules: salvage 1.5x; a raider chance of 0.22; a bounty of 40 for a raider sunk in Reef waters, paid at the next Reef
harbour; powder and sailcloth at 0.6x "off the wrecks"; shoals that move at dawn; storm wrecks that are gone by the next low tide
[code: regions.js; CANON 3 2026-11-13]. Raiders break off once the water is deep (dread above 0.55) [PROGRESS]. "Make it quick. We have
somewhere to be, and none of it is here." (MAIN-0135). Food: salt pork, eaten standing up (HLF-0015); Strongarm Night. The figurehead
whose die they touch, never her face (HLF-0105). The paper: "BROTHERHOOD SHIPS COME HOME EMPTY. Not robbed. Not wrecked. Empty, and
neatly so." (NEWS-0021). Q3 lives here: the Name Wall, the Marigold, the Ribs; the Other Captain [CANON 4; CANON 3 2026-11-12].

**Proposed.**
- **L-16 The naming right.** By Brotherhood custom a wreck belongs to whoever paints its name on the Wall; salvagers climb to claim.
  Ordinary: salvage law, and why the Wall exists. Second look: the paint at the top is wet (A-08), and some names are claimed before the
  ship is down. Never says who paints the top. *(medium)*
- **L-17 Accounts both ways.** The Brotherhood pays every bounty and remembers every tribute: "The Brotherhood remembers a debt both
  ways." Ordinary: pirate honour. Second look: Q4 (a cost lands somewhere). Does not touch seed 5 (the fisherman's debt, reserved). *(low)*
- **L-18 The tide rule.** "Salvage at low water, a grave at high." Ordinary: wreck work by the tide. Second look: the Marigold's chair
  turned to the door at high water (PLC-0052). *(low)*
- **L-06, Reef form: "the quiet water".** (PAS-0066 already: "The water is so quiet here.") *(low)*

### 4.5 The Lantern Guild

**Established.** Shrine towns with lamps, terraced white towns, guild markets, stone lanterns; fog and evening light [SM F3-LANTERN].
Rules: the Guild buys oil at 0.9; the lamp burns at half while a lit lighthouse is in sight and double in the open dark; half the
lighthouses are dead at night until a captain brings 30 oil (pays 30 and chart marks); fish sells at 1.5x because "the Guild's people
tend lamps, not nets" [code: regions.js]. Lamp-floats line the routes, one burning the wrong colour; after the hut one lamp burns cold
blue [REGIONS]. "Every lighthouse has its own rhythm." (PAS-0015); "We keep the lamps lit so the ships can find the harbours. And so the
harbours can find the ships." (PAS-0012). Food: bitter tea, honey bread [code: DISHES]. The paper: "GUILD ASKS FOR MORE OIL", "GUILD
LAMPS BURN ALL DAY ... nobody put them out. For any reason." (NEWS-0022, NEWS-0023). Q2 lives here (the Oil Press, the Dark Tower), and
Q1 (the Keepers' Ledger); the Bell Below [CANON 4; CANON 3 2026-11-12].

**Proposed.**
- **L-19 The Guild counts lights.** Ships are the Crown's business; lights are the Guild's. Guild children learn every light's flash as a
  rhyme of names; a dead light is "a gap in the rhyme". Ordinary: pilots' lore. Second look: the keepers' ledger counts ships too, and
  dates them ahead (Q1); a dead light is a hole in something kept (Q2). *(low)*
- **L-20 The pressers' grace.** "It comes up. We thank it. We do not go down." Guild towns keep no nets and buy their fish. Ordinary: a
  guild rule and why fish pays well there. Second look: Q2 (they will not go down to what sends up the oil). *(low to medium)*
- **L-21 "Past the last light".** Guild charts stop where the lights stop; beyond is "anyone's water". Ordinary: the edge of a trade's
  map. Second look: the lamp burns double out there (`lampBurnMul`). *(low)*

### 4.6 The Drowned

**Established.** Low, damp, half-abandoned villages; derelicts with lamps lit; fog, glass calm, wrong ocean [SM F3-DROWNED]. Full game
only; a shoal belt (1740 to 1800) crossable only at low water; harbours take no coin, give what you lack, and keep one thing from your
hold, which comes back once out of the deep [code: regions.js BELT, drownedTake, keptBack; CANON 3 2026-11-13]. "They fill the lamp,
fold sailcloth into the locker and mend the hull. They keep [it]. Nobody says thank you." (MAIN-0319); "They ask for nothing. That is
worse." (MAIN-0320). Tide poles with white rings and a weed line above the water even at high tide [REGIONS]. The paper: "Fishers are
asked to call out their names on the way home." (NEWS-0024); "BELLS HEARD UNDER THE WATER" (NEWS-0025). Q6 lives here (the Sunken
Street) [CANON 4]; the Colour and the Hollow Harbour [CANON 3 2026-11-12].

**Proposed.**
- **L-22 Names called home.** Every Drowned fisher calls their own name while rowing in, every evening, in fog or not. Ordinary: a
  safety custom. Second look: as if the harbour needs telling who it is getting back. *(low)*
- **L-23 The tide poles.** Each keeper paints a ring; the oldest rings are at the bottom; the weed line sits above them all. Ordinary:
  harbour upkeep. Second look: the sea is lower than it was, and breathes (REGIONS "Implies"). *(low)*
- **L-24 Kept, not taken.** In the Drowned nothing is "taken", only "kept", and nobody thanks anybody; to thank them back is rude.
  Ordinary: a shy people's manners. Second look: what is kept comes back out of the deep (`keptBack`). *(low to medium)*
- **L-06, Drowned form.** They do not name the far water. Asked, they point down at the pier, politely, the way the silent villages
  point (GRT-0089). *(low)*

### 4.7 Across the sea (motifs)

- **L-25 The old hitch.** A knot nobody ties any more: on a harbour bell rope (LORE-0012), in a mended net (GRT-0032), in a knot of hair
  from the hut (HUT-0011), on the lost sailor's cut line, "the old kind, for a bronze hook" (LOST-0004). Proposal: harbourfolk call it
  "the old hitch", it turns up once in each region, and it is the earlier sailors' knot. Never said; it is just a knot. Q3. *(medium)*
- **L-26 The place nearest the sea.** Every region lays one more place, each in its own form: the Crown a second cup on a desk
  (PLC-0024); the Cays a mat by the fire; the Reef a stool nobody sits on at the sea end of the wreckers' table; the Lantern a lamp in an
  empty window; the Drowned a full place, already eaten from. Ordinary: hospitality for a late traveller (HLF-0108: "For the one who is
  up all night"). Second look: Q3, and the Hollow Harbour's "We kept your place" (TMOD-0032). *(medium)*
- **L-27 Short dice.** Market towns sell dice missing a number as curiosities (HLF-0100; NEWS-0048); gamblers call them "short dice" and
  will not play with one. Ordinary: superstition. Second look: the Marigold's die has no seven (PLC-0050). Does not fill seed 10 (the
  other dice, reserved). *(low to medium)*
- **L-28 "A candle".** Tavern slang for a low throw: "That is a candle." Ordinary: dicers' cant. Second look: one more candle at the hut
  for every low throw [CANON 7]. Heard only after the hut is known (RULES 6). *(medium)*
- **L-29 The bell where none hangs.** Every region has a fog-bell story and they disagree: the home towns hear "the bell from the old
  belfry. We have no belfry." (GRT-0098); the Reef hears a wreck's bell (the Kestrel's "still rings", MAIN-0122); the Lantern hears it
  under the water (the Bell Below); the Drowned's fishers stop rowing to listen (NEWS-0025); the Cays hear nothing while somebody plays.
  Q5 and Q6, by disagreement (SE X11 SET-5). Sound-only stories need a seen twin if ever built (RULES 28). *(medium)*
- **L-30 Gulls carry the news.** A folk belief in every region (Sabe: "The gulls told me", HLF-0059). Does not touch seed 11 (the choir
  of gulls, reserved). *(low)*
- **L-31 Lucky twenties.** Sailors mark a high number for luck: a tattoo (HLF-0109), a twenty scratched on the loom of an oar, a twenty
  stamped in a Crown captain's papers by a superstitious clerk. Q4. After the hut only. *(low to medium)*
- **L-32 The post.** Any captain carrying letters is "the post"; residents thank the postman (HLF-0030). Gives Perrin's letters "came in
  with the post" (OBJ-0153) a plain reading. *(low)*
- **L-33 Ship-chalkers.** Corvo's trade exists in many harbours; the walls are washed on Wednesday, market day. Q1 (HLF-0083: one entry
  dated next week). *(low)*

### 4.8 Environmental storytelling (things seen; ordinary reading, then the second look)

All of these are sight first and say nothing. Each names the region rule or question it serves. Building any of them is design's and
the next phases'; none is approved by being listed.

| Region | What could be seen | Ordinary reading | Second look | Serves |
|---|---|---|---|---|
| Home | A bell rope with an old hitch nobody at Tama ties (LORE-0012) | someone tidy | L-25, the earlier sailors | Q3 |
| Home | Velto's quay: nets, gulls, a pie cart, nothing else | a fishing village | there is nothing to see, on purpose (L-05) | contrast |
| Crown | The signal mast: one pennant per arrival [REGIONS] | the Crown's welcome | after the Customs Pier, one pennant more than your arrivals, faint (the `arrivals` capability already does this on the record) | Q1; the record |
| Crown | Buoys freshly painted, red and green | spring upkeep (L-09) | the paint at the outermost buoy is always wet | Q1 |
| Crown | A desk at the end of the customs pier, two cups (PLC-0024) | a clerk's tea | the second cup is for the place nearest the sea (L-26) | Q3 |
| Cays | Fires on sandbars on still nights | a courtesy (L-14) | the fires stop on a storm night, and so does the music | Q7; `caysQuiet` |
| Cays | Shuttered stalls at noon, lanterns strung at dusk | a night market | the people sleep by day (L-13) | the night market |
| Reef | Wreckers' stakes with white rags [REGIONS] | salvage claims (L-16) | a rag on a stake where there is no wreck yet | Q3 |
| Reef | A mast that shows at low water and not at high [REGIONS] | a tide wreck | L-18 | Q3 |
| Lantern | Lamp-floats along a route, one burning the wrong colour [REGIONS] | a cheap oil | the wrong one is never where the rhyme says a light is (L-19) | Q2 |
| Lantern | A window lit at noon [REGIONS] | a keeper's lamp | the Keepers' Ledger's lamp is lit at noon too (PLC-0053) | Q1 |
| Drowned | Tide poles with rings, the weed line above them [REGIONS] | upkeep (L-23) | the sea used to stand higher | Q2 |
| Drowned | A chalk board at a coinless harbour listing what was kept | barter | your fish is on it, and later on your line again (`keptBack`) | the Drowned rule |
| Any | A place laid nearest the sea, in the region's own form | hospitality (L-26) | always laid, never used | Q3 |

### 4.9 Mara across the regions

- **L-34 Mara's silences.** Not new lines: one thing per region she stops remarking on as the dread rises (her market-day and lantern-night
  remarks already exist, SM I). In the Crown she stops joking about paperwork; in the Cays she stops asking for the music; in the Reef she
  stops counting wrecks; in the Lantern she stops naming the lights; in the Drowned she says almost nothing. Ordinary: she is tired. Second
  look: rattled, then breaking [CANON 7]. Never explains, never confirms (RULES 7). *(medium)*

---

## 5. Regional interconnections

### 5.1 Region by region

E = established, P = proposed. "Disagrees on purpose" is X11's device: two sources, a third proves neither.

| Pair | Trade | People and objects that travel | Shared saying or motif | Disagrees on purpose |
|---|---|---|---|---|
| Home and Crown | Home is a Crown sector with the classic look (E, `sectors.js`); fruit to the Crown at 1.5x (E) | the harbourmaster's book, "sign the book" (E, GRT-0040); Perrin's letters "with the post" (E, OBJ-0153; P L-32) | lines and books (P L-08) | how a bell should ring: gently or loud (P L-10); the Kestrel "never was" (E, SEC-0005) |
| Home and Free Cays | oil from Tama (E); fish and fruit to the night market (E) | the tune carried home (`hum`, E); Teo's Sandbar, 499 out, the nearest Cays place (E) | keeping something quiet: by bell at home, by music in the Cays (E, CANON 2 and 2026-11-12) | which keeping matters; nobody says |
| Home and Reef | salvage and powder (E) | the Kestrel's bell and lamp (E, MAIN-0285); the old hitch (P L-25) | "ships come here and stay" (E, CLUE-0016) | the Kestrel's sinking: calm noon at Tama, squall at Velto (E) |
| Home and Lantern | oil bought at Tama, sold to the Guild (E) | the Bell Below rings Tama's hours (E, CL-T-bell, a draft line) | bells and lights, both kept (P L-19, L-29) | where the bell is heard (P L-29) |
| Home and Drowned | none (no coin there) | Mara's memory: the bell at home (E, TBL-0020, OBJ-0099) | the street that ran down to the water (E) | the drowned streets (P L-37 options) |
| Crown and Free Cays | fruit from the Cays fetches half again in the Crown (E) | the floating market carries the paper (P L-12) | "morning" at dusk vs the Crown's clock (P L-13) | the Crown's day-time deadlines vs the Cays' night market (E rules) |
| Crown and Reef | customs cutters vs raiders (E) | bounty and record (E) | debts and lines (P L-08, L-17) | who keeps the true account |
| Crown and Lantern | oil and paperwork (E) | the Customs ledger and the Keepers' ledger (E clues) | counting: ships vs lights (P L-19) | Reckoning Day (P L-11): the two books never agree |
| Crown and Drowned | none | "a place set" (E, Hollow Harbour) and the Crown's second cup (E, PLC-0024) | the place nearest the sea (P L-26) | the Crown takes dues; the Drowned take no coin (E) |
| Free Cays and Reef | raiders in both by day; none in the Cays while they play (E) | dice with a missing number (E; P L-27) | the rhyme in thatch villages of both (E, HLF-0099) | night is safe in the Cays, never in the Reef (E rules) |
| Free Cays and Lantern | the Cays lack oil; lamp oil at the night market [REGIONS, P] | the Halved Isle (Lantern) and the tune (Cays) both feed Q7 (E clues) | light at night: fires vs lamps (P L-14, L-19) | what keeps the dark back: music or light |
| Free Cays and Drowned | none | the Sunken Street sits in Cays water but is Drowned (E, D-01) | sleep (Hammock Isle) vs names called (P L-22) | sleeping by day vs calling out at dusk |
| Reef and Lantern | wrecks and lights (E) | the Ribs sit in Lantern water (E, D-01); the Bell Below's reef imagery (E, D-25) | "a light that lures ships" (seed W-R1, reserved) | a keeper who lights to save ships vs one who lights to wreck them |
| Reef and Drowned | storm wrecks vs things kept and returned (E) | the Raven (Reef) and the Hollow Harbour (Drowned) both offer the Gull back changed (E threads) | the Brotherhood's empty ships (E, NEWS-0021) | empty and tidy vs full and kind |
| Lantern and Drowned | oil that comes up vs things that come back (E) | bells under the water (E, NEWS-0025; Bell Below) | lights in sunken windows (E, PLC-0004) | where the bell is (P L-29) |

### 5.2 Which bridges serve which question

CANON 4: a question is understood when sources from two or three regions agree. The code counts the heaviest clue per region, summed,
so "home" and "deep" count as regions [code: clues.js level; AUDIT 3]. Region columns below are the clue tags, not the water (D-01).

| Q | Regions with fixed clue rows (code) | Thread rows (seed) | Established cross-region bridge | Proposed bridge (lore only; a level needs a clue row) |
|---|---|---|---|---|
| 1 Who counts | crown (C1, C2), lantern (L2) | crown (coin, house), drowned (hollow) | the Customs ledger and the Keepers' ledger both list ships ahead | L-08, L-11, L-19, L-33 |
| 2 What is under the sea | free (F1, lagoon), lantern (L1, L3) | drowned (colour) | "The sea is drawn exactly the same" on a chart from before (HLF-0134); glass water and a window up through the sea | L-03, L-20, L-23 |
| 3 Who sat before you | home (Kestrel w2, three wrong things), reef (R1, R2, ribs), free (F3), lantern (L2), deep (three lost sailors) | crown (house), reef (captain) | the near-home wrong things answered by the lost sailors [CANON 3 2026-11-12] | L-01, L-16, L-25, L-26, L-27 |
| 4 What a throw costs | home (C3), crown (C2), free (F2), reef (R2) | crown (coin) | the Archive's black days and the Hammock's murmured numbers | L-17, L-28, L-31 |
| 5 Why Tama is home | home (C3, Drowned Bell) | lantern (bell) | the Bell Below rings Tama's hours (draft) | L-07, L-10, L-29 (C-06: a fixed second region is the open design gap) |
| 6 What Mara is | drowned (Sunken Street), home (Drowned Bell) | drowned (hollow) | the chapel painting in a far harbour and Mara's four memories | none proposed beyond L-37: Q6 should stay thin |
| 7 Can it end | free (F1), lantern (Halved Isle) | free (music) | the tune and the half house | L-39 options only; B-21 is reserved |

### 5.3 Characters and threads that cross regions

| Who or what | Where they reach | Source |
|---|---|---|
| Mara | everywhere; the Sunken Street needs her aboard | CANON 7; code: places.js `street` need |
| Perrin | letters into each region after the hut | CANON 3 2026-11-13 |
| Residents | each arc sends you to a partner harbour, any region (Ada and Ode, Tilda and Biscuit, Ines and the old salt who knew Tomas, Lune and the old woman, Marisol and Anselm) | SM HLF ARCS, ADDED 2026-11-11 |
| Gossip | what you did in one harbour is told in the next | SM B6; HLF GOSSIP |
| Passengers | the cartographer's apprentice, the two fish-wives, the captain without a ship, the notary, lighthouse folk, the child with a lantern | SM PAS |
| The lost sailors | deep dread, any region | CANON 3 2026-11-12 |
| The grey passenger (coin) | asks in Crown harbours, lands you anywhere | PROGRESS (threads by region); SM TSC-0033 |
| The Bell Below | Lantern; wants clappers from wrecks (any region), can be rung to "the tune from the fog" (the Cays' thread) or quieted with the worn coin (the Crown's) | SM TMOD-0048, TSC-0019, TSC-0021 |
| The Strange High House | Crown; "Somewhere, a harbour goes a little cooler" | SM TSC-0014 |
| The Raven and the Hollow Harbour | Reef and Drowned; both offer a Gull that is not quite yours | SM TSC-0058, TMOD-0041, TSC-0039 |
| The fisherman who drags you home | any region, after a sinking | SM MAIN-0231 |

---

## 6. Diegetic snippets (samples for the writer, not final text)

Each obeys RULES 1, 2, 6, 7 and 9 as written here; the writer is free to cut any. "Earliest" says when it may be read: **any** (also
the demo, if its region and system exist there), **full** (full game only), **after the hut** (no she, no hut, no number about it before
then, RULES 6). Mara's lines are one or two short lines and never answered by anyone.

| ID | Region | Form | Text | Carries | Ordinary reading | Earliest |
|---|---|---|---|---|---|---|
| S-01 | Home | a bell-ringer at Tama | "We ring it gently here. It carries further that way." | L-07 | a ringer's pride | any |
| S-02 | Home | a greeter at Velto | "Velto. Nets, gulls, pie. Mind the second step." | L-05 | a plain fishing village | any |
| S-03 | Home | an old salt | "In my day you did not go past hearing. Past where the bell carries." | L-06 | an old sailor's caution | any |
| S-04 | Home | Mara, at Velto | "Velto again? Good. I like a place that stays where we left it." | L-05, L-03 | Mara likes routine | any |
| S-05 | Crown | a stamped customs slip | "CROWN CUSTOMS. Vessel: MERRY GULL. Cargo: as declared. Master: ______" | L-08 | paperwork with a blank | full |
| S-06 | Crown | a harbourmaster at the buoys | "Between the buoys you are in the book, Captain. Outside them you are weather." | L-09 | lane rules | any |
| S-07 | Crown | an old clerk | "Clean lines, calm water. My father said it, and his." | L-08 | a trade motto | any |
| S-08 | Crown | a bell-ringer | "Tama? Your bell is too soft to count by. Ours you can count from the next island." | L-10 | town rivalry | any |
| S-09 | Crown | the Friday paper | "CLERK RETIRES AFTER FORTY YEARS. He says he never once reached the bottom of a page." | L-08, L-12 | a joke about paperwork | any |
| S-10 | Crown | the Friday paper | "RECKONING DAY AT THE FORT. The Guild's books and ours were compared. They did not agree. They never have." | L-11 | civic news | full |
| S-11 | Crown | the paper's notices | "{N}, clerk at the Fort. His line is closed. It was a clean one." | L-08 | a death notice | full |
| S-12 | Free Cays | a night-market crier | "Fish after dark, fruit after dark, sleep after breakfast!" | L-13 | market patter | any |
| S-13 | Free Cays | a mother on the landing | "Hush now. Somebody is playing. Sleep while they play." | L-14; CANON 3 2026-11-12 | a lullaby | full |
| S-14 | Free Cays | a greeter at dusk | "Morning, Captain! We are only just up." | L-13 | Cays hours | any |
| S-15 | Free Cays | an old salt, storm night | "Nobody plays, nobody sleeps. Pull up a stool." | L-15 | a storm watch | any |
| S-16 | Free Cays | a fire-sitter on a sandbar | "I keep the fire. They keep the tune. Everyone keeps something." | L-14 | a courtesy | full |
| S-17 | Free Cays | Mara, a still night | "Listen. They are at it again. Even the water has gone quiet for it." | CANON 3 2026-11-12 | Mara enjoys the music | full |
| S-18 | Reef | a painter at the Name Wall | "A name goes up the day a ship does not come in. Nobody sees the day it sinks." | L-16 | a painter's rule | full |
| S-19 | Reef | chalk on a harbour board | "CLAIMED. Named and painted. The Brotherhood." | L-16 | salvage law | any |
| S-20 | Reef | a bounty clerk | "Paid in full. The Brotherhood remembers a debt both ways, Captain." | L-17 | a receipt | any |
| S-21 | Reef | a wrecker | "Salvage at low water. A grave at high. Be quick about the difference." | L-18 | tide work | any |
| S-22 | Reef | the Friday paper | "FIGUREHEAD REPAINTED. Everything but the face. Nobody would." | echoes HLF-0105 (no new proposal) | village upkeep | any |
| S-23 | Lantern | a children's rhyme | "Two long for the Point, one short for the Rock. Count them home." | L-19 | pilots' lore for children | any |
| S-24 | Lantern | a Guild notice | "THE GUILD COUNTS LIGHTS, NOT SHIPS. Report a dark light at any Guild quay." | L-19 | a public notice | any |
| S-25 | Lantern | a presser's grace | "It comes up. We thank it. We do not go down." | L-20 | grace before a meal | any |
| S-26 | Lantern | a keeper's log, at a relit light | "Relit at dusk by a passing captain. Ships seen: all. Ships expected: all but one." | L-19 | a keeper's record | any |
| S-27 | Lantern | an old keeper | "Past the last light the water is anyone's. The Guild does not chart it." | L-21 | the edge of a trade's map | any |
| S-28 | Lantern | Mara, at a relit light | "There. Now the harbour can find us." | L-19; PAS-0012 | Mara pleased | any |
| S-29 | Drowned | a greeter | "We call our names on the way in. So the harbour knows who it is getting." | L-22 | a safety custom | full |
| S-30 | Drowned | a chalk board on the quay | "KEPT: a fish. KEPT: some fruit. KEPT: a brass lens." | L-24 | a barter tally | full |
| S-31 | Drowned | the Friday paper | "TIDE POLE RAISED AGAIN. The weed line is above it again." | L-23 | harbour upkeep | full |
| S-32 | Drowned | Mara, in a coinless harbour | "Everyone is very kind here. I keep checking my pockets." | L-24 | Mara is wary of kindness | full |
| S-33 | Any | the Friday paper | "KNOT CONTEST WON BY A STRANGER. Nobody could name the knot. The rope is on show at the inn." | L-25 | festival news | full |
| S-34 | Any | a tavern dicer | "Ah. That is a candle. Buy the next round and we will say no more." | L-28 | dicers' cant | after the hut |
| S-35 | Any market town | a stall sign | "SHORT DICE. For looking at, not for playing." | L-27 | a curiosity stall | any |
| S-36 | Reef | an innkeeper | "The stool at the sea end is not for sitting. Ask anyone." | L-26 | a house custom | any |
| S-37 | Any | the cartographer's apprentice | "Master says every chart draws the sea the same. It is the coasts that will not sit still." | L-03 | a trade joke | any |
| S-38 | Any | an old salt | "Gulls carry the news. That is why they shout." | L-30 | folk belief | any |
| S-39 | Any | a hired hand's oar (a line on hiring) | "A twenty scratched on the loom of the oar. For luck, the last owner said." | L-31 | a luck charm | after the hut |
| S-40 | Reef | a greeter, in fog | "In fog the old wreck rings. Nobody has ever found the wreck." | L-29 | a fog tale | any |

Checked by reading and by a word search against RULES 6: none of the forty uses lid, eye, sleeper, Lady, "kept soft" or "Mara is from"; S-34 and S-39 are held
until after the hut; S-39 contains a number word ("twenty"), which `story_export.py --warn` would list. None has a glyph. In S-17, "Even
the water has gone quiet for it" is the nearest any snippet comes to stating an effect; the writer may prefer to cut its second sentence.

---

## 7. Handoff for the next phases

Read this section alone if you are the level designer. Rules for every region: a rule must be readable from what is seen and must not
explain the story (RULES 24b, the second one); nothing is marked (RULES 11); a clue is a row in `src/clues.js` and grants a capability,
never a popup (RULES 32); every proposal L-xx is unapproved until the owner says so. **If a mechanic needs a lore fact to work, name the
dated CANON row it embodies; if you cannot, it is new canon: ask** [GUIDE 4].

### Home Sound and Tama (S0, 0 to 450)
- **Identity.** Home: bright, busy, gentle. The bells ring softly. The game's normal, against which everything else is told apart.
- **Established rules.** No gate. A low throw's dread is not felt here; the swell lies down at the noon bell; Tama's bell swings one
  stroke at noon [GUIDE L4, L3; `systems/home.js`, `noonbell.js`]. The three small wrong things fire here once each [CANON 3 2026-11-12].
  The demo lives here.
- **Places and clues.** Tama's bells (CL-C3-a, Q4, Q5), the Drowned Bell (CL-BELL-a, Q5, Q6), the Kestrel (CL-K-a, Q3, weight 2, the
  `lamp`), the Grey Tooth, Hollowgreen, Wick's Rock (no clue), Velto (none, L-05).
- **Hooks.** Q5's missing second region (C-06): L-07, L-10, L-29 give the lore for a Crown or fog-bell source; it would need a new clue row
  and the owner. The bell counts (B-12) are the owner's before any bell puzzle. The old hitch on a bell rope (L-25). "Past hearing" as the
  felt edge of home (L-06).
- **Never reveal.** What the bell is for; that home is where it is kept gentle; who the earlier sailors were; any count of strokes that
  the owner has not decided. Never put a clue or an earlier-dream fragment in Velto.

### The Crown Traders (north wedge; Customs Pier 600, Governor's Fort 999)
- **Identity.** Records, lanes and deadlines. Tidy, proud, a little tired. Someone is writing you down.
- **Established rules.** Timed contracts (1.45x on time, 0.55x late); the shared record (+5% a clean line to +25%, -15% a black line,
  three clean lines wipe a black one); a clean line a day for coming in between the buoys; customs cutters (dark cargo taken: a black
  line; else a stamp and 5 gold); fruit at 1.5x; `arrivals` shows the next line faint once the Customs ledger is seen [code: regions.js;
  GUIDE G3].
- **Places and clues.** Customs Pier (CL-C1-a, Q1, `arrivals`), Governor's Fort (CL-C2-a, Q4 and Q1, `forecast`, not built). Threads: the
  Ferryman's Coin, the Strange High House.
- **Hooks.** Lines as a vocabulary for any record mechanic (L-08); buoy lanes as the line between counted and not (L-09); Reckoning Day as
  a Crown festival where two books disagree (L-11); the loud bells as a Q5 witness (L-10); the paper's press (L-12); chalk walls washed on
  Wednesday (L-33).
- **Never reveal.** Who writes the master's line or the lines ahead; that the record is about anything but trade; never let a clerk say
  why the books are kept ("We never worked out why we keep it", PLC-0043, is the most anyone says).

### The Free Cays (east wedge; Teo 499, the Cup 650, Glass Lagoon 648, Hammock Isle 849, Ilse 900)
- **Identity.** Sleep by day, music by night. Warm, slow, slightly too comfortable. The dark keeps quiet while somebody plays.
- **Established rules.** Everything safe follows the music, not the hour: the night market (1.4x fish and fruit), no raiders while they
  play (0.1 when nobody does), dread held at 0.45 on a still night; storm nights unprotected; Teo and Ilse only on still nights; `hum`
  (the helm half answers in fog; the night stems and the pennant point the way out) [code: regions.js, systems/lullaby.js; CANON 3
  2026-11-12, 2026-11-13]. The demo uses the hour instead.
- **Places and clues.** Teo and Ilse (CL-F1-a, Q2 and Q7, `hum`), the Cup (CL-F3-a, Q3, high tide), the Hammock Isle (CL-F2-a, Q4,
  `rest`), Glass Lagoon (CL-LAG-a, Q2). The Sunken Street also lies in Cays water but is Drowned (D-01). Thread: the Music out of the Fog.
- **Hooks.** Night hours (L-13); fire-sitters as a seen courtesy, never a mechanic that soothes (L-14); storm-night watch (L-15). Q7 tops
  out at 2 (C-08): the Halved Isle's other half is reserved (B-21).
- **Never reveal.** That the music keeps anything asleep; that the Players refused to throw; never a second gentle ending (CANON 3
  2026-11-11); never let any other tune (Lune's, L-39) do what the Players' tune does.

### The Reef Brotherhood (south-west wedge; Name Wall 899, Throwers' Wreck 1150)
- **Identity.** Wrecks, debts and what the sea gives back. Rough, salty, honourable in its own way. Ships come here and stay.
- **Established rules.** Salvage 1.5x; raiders at 0.22 (they break off past dread 0.55); a bounty of 40 at the next Reef harbour; powder
  and sailcloth at 0.6x; shoals that move at dawn; storm wrecks gone by the next low tide [code: regions.js; CANON 3 2026-11-13].
- **Places and clues.** The Name Wall (CL-R1-a, Q3, `wreckticks`), the Marigold (CL-R2-a, Q3 and Q4, `setdown`, low tide), the Ribs
  (CL-RIBS-a, Q3; it lies in Lantern water, D-01). Thread: the Other Captain (the Raven).
- **Hooks.** The naming right as a salvage claim you can make yourself (L-16); accounts both ways (L-17); the tide rule (L-18); stakes with
  rags where no wreck is yet.
- **Never reveal.** Whose names are wet at the top; that the Marigold's captain was like you; who sailed the Raven, or for how long; never
  let a log conclude.

### The Lantern Guild (west wedge; Halved Isle 1249, Oil Press 1049, Keepers' Ledger 1350, Dark Tower 1559)
- **Identity.** Light as currency. Amber, foggy, orderly. The lights must be kept lit.
- **Established rules.** Oil sells at 0.9 (Tama sells at 0.42); the lamp burns half near a lit lighthouse and double in the open dark;
  half the lighthouses are dark at night until relit (30 oil, pays 30 and chart marks); fish at 1.5x; fog piloting by flashes
  [code: regions.js; REGIONS].
- **Places and clues.** The Oil Press (CL-L1-a, Q2, `bluelamp`, not built), the Keepers' Ledger (CL-L2-a, Q1 and Q3, `date`), the Dark
  Tower (CL-L3-a, Q2, `lookup`, calm night), the Halved Isle (CL-HALF-a, Q7, Lantern 2). Hollowgreen and the Ribs also lie in Lantern
  water. Thread: the Bell Below (its scene still reads as a reef, D-25).
- **Hooks.** Lights counted, not ships, and a flash rhyme you can learn and use in fog (L-19); the pressers' grace (L-20); "past the last
  light" as the felt edge of the Guild (L-21); Reckoning Day with the Crown (L-11).
- **Never reveal.** What the oil is or where it comes up from; what the second doors open on; what the tower's window looks up at (never
  the words lid or eye); what the lights are for.

### The Drowned (beyond about 1500 by sector dread; belt 1740 to 1800; full game only)
- **Identity.** The same world, only wrong and quiet. The sea breathes; it stands lower than it should. Answers that are no longer
  reliable.
- **Established rules.** The belt crossable only at low water; harbours take no coin, give what you lack and keep one thing from the hold
  (a fish, then fruit, then the newest treasure); each kept thing comes back once out of the deep [code: regions.js; CANON 3 2026-11-13;
  GUIDE L8].
- **Places and clues.** The Sunken Street (CL-D1-a, Q6, `streetline`; lowest tide, Mara aboard; it lies about 900 out with a forced dread,
  a distance lie, D-01, D-11), the Table by the Water (2400; no clue; open to any captain who has thrown, CANON 3 2026-11-13). Threads: the
  Colour, the Hollow Harbour.
- **Hooks.** Names called home (L-22); tide poles that show the old sea (L-23); kept, not taken, and no thanks (L-24); the chalk tally of
  what was kept. The "place set" trade waits for the owner (B-17).
- **Never reveal.** Who the harbourfolk are; why they take no coin; the name of Mara's village (it has none on the page, RULES 10); that
  the street is hers; anything about what is under the sea.

### Deep dread, any region (dread 0.6 and up)
- **Established.** The three lost sailors, each once [CANON 3 2026-11-12]; the Edge, once [CANON 3 2026-11-12]; the abyss effects and
  Mara breaking; "The Eye awakens" is not an ending: you wake off Tama [CANON 6].
- **Hooks.** The old hitch on the cut line (L-25). Whether the lost sailors become part of the sea rather than cards is the owner's (B-19).
- **Never reveal.** Who the lost sailors were (they are never named); what the Edge's shapes are.

### For the systems phase in particular
- The proposals that carry a region rule (L-09, L-13 to L-20, L-22 to L-24) give a reason a harbourfolk might say aloud; the rule
  itself stays a number in `src/regions.js` and is shown, not told.
- The proposals that are motifs (L-25 to L-31) each want at most one sighting per region and one short line; they are seasoning, not
  quests.
- Before building anything on L-35 to L-42, wait for the owner's pick.
