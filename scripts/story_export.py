#!/usr/bin/env python3
"""Builds docs/STORY_MASTER.txt: the story file to edit by hand and upload again.

Parts that come from the code (goals, hand-made places, threads, every in-game line) are read from the repo.
The hand-written parts (premise, cast, world atlas, slots, endings) live in this script (TEXT_* blocks below).
Every in-game line gets a stable ID (OBJ-0001 ...). Edit the text after the "|", never the ID. To add a line,
write NEW-<anything> as the ID. To remove one, write DELETE after the ID. The next session diffs the file against
the version in git by ID and puts the changes into the code.

Usage: python3 scripts/story_export.py
"""
import re, sys, pathlib, datetime, subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'
OUT = ROOT / 'docs' / 'STORY_MASTER.txt'

CODES = {  # source file -> (ID code, what it holds)
    'objectives.js': ('OBJ', 'chapters, Mara, goal text and hints'),
    'passengers.js': ('PAS', 'passenger talk and Mara banter'),
    'lore.js': ('LORE', 'bottle notes, rumours, names, riddles'),
    'greetings.js': ('GRT', 'what harbour folk say when you dock'),
    'places.js': ('PLC', 'the seven hand-made islands: what you find ashore'),
    'secrets.js': ('SEC', 'world hints: the Kestrel, camps, watchers, birds'),
    'threads.js': ('THR', 'dark threads: hub lines'),
    'threadscenes.js': ('TSC', 'dark threads: full-screen scenes'),
    'thread_mods.js': ('TMOD', 'dark threads: modules (bell, coin, colour, hollow, music, house, captain)'),
    'tabletop.js': ('TAB', 'dice, haggling, sea encounter cards, crew'),
    'marks.js': ('MRK', 'marks (what the world says of you)'),
    'caves.js': ('CAV', 'one-time caves'),
    'abyss.js': ('ABY', 'full-dread effects'),
    'digging.js': ('DIG', 'digging for treasure'),
    'fishing.js': ('FSH', 'fishing and the fisherman\'s log'),
    'upgrades.js': ('UPG', 'shipwright'),
    'jobs.js': ('JOB', 'board: deliveries and commissions'),
    'sighting.js': ('SIG', 'signs at sea'),
    'hut.js': ('HUT', 'the dark hut and the Lady'),
    'logbook.js': ('LOG', 'the captain\'s log'),
    'table.js': ('TBL', 'the Table by the Water: the endings, and Mara\'s village coming back to her'),
    'main.js': ('MAIN', 'Mara\'s remarks, HUD messages, everything else'),
    'world.js': ('WRL', 'world text'),
    'harbourlife.js': ('HLF', 'residents, dishes, events, fragments, gossip'),
    'localgames.js': ('LGM', 'tavern games'),
}


# main.js's text also lives in the ui/ modules split out of it (2026-11-12): read together, so the MAIN-xxxx IDs stay the same
MAIN_PARTS = ['main.js', 'ui/title.js', 'ui/pause.js', 'ui/harbour.js', 'ui/shipyard.js', 'ui/shiptrade.js', 'ui/camera.js', 'ui/dom.js']


def read(name):
    if name == 'main.js':
        src = '\n'.join((SRC / f).read_text(encoding='utf-8') for f in MAIN_PARTS if (SRC / f).exists())
        # the split moved main's loose variables into rt (runtime) and its services into G: ${rt.dread} is the old ${dread}
        return re.sub(r'\$\{[^}]*\}', lambda m: re.sub(r'\b(rt|G)\.', '', m.group(0)), src)
    return (SRC / name).read_text(encoding='utf-8')


def git_head():
    try:
        return subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse', '--short', 'HEAD'], text=True).strip()
    except Exception:
        return 'unknown'


# ----------------------------------------------------------------------------------------- from the code
def goals():
    s = read('objectives.js')
    out = []
    for m in re.finditer(r"id: '(\w+)', ch: (\d), title: '([^']+)', reward: (\d+)", s.split('MAIN_GOALS')[1].split('SIDE')[0] if 'SIDE' in s else s):
        out.append((m.group(1), int(m.group(2)), m.group(3), int(m.group(4))))
    return out


def chapters():
    s = read('objectives.js')
    ch = [(a, b, c) for a, _q, b, c in re.findall(r"\{ n: '(\w+)', title: (['\"])(.+?)\2, act: '([^']+)' \}", s)]
    gates = re.search(r"GATES = \[([^\]]+)\]", s).group(1).split(',')
    return ch, [g.strip() for g in gates]


def landmarks():
    s = read('landmarks.js')
    return [(a, b, d, e, f, g, h) for a, b, _q, d, e, f, g, h in re.findall(r"\{ lm: '(\w+)',\s+key: '([-\d,]+)',\s+name: ([\"'])(.+?)\3,\s+type: '(\w+)',\s+x: (-?\d+),\s+z: (-?\d+).*?sight: '([^']+)'", s)]


def threads():
    s = read('marks.js')
    return [(a, c, d, e) for a, _q, c, d, e in re.findall(r"\{ id: '(\w+)', name: ([\"'])(.+?)\2, built: (\w+), note: '([^']+)' \}", s)]


def arcs():
    s = read('harbourlife.js')
    return re.findall(r"^  (\w+): \{ who: '([^']+)', prop: '(\w+)'", s, re.M)


def js_strings(src):
    """Every string literal in a JS source (comments and regex literals skipped), unescaped. Templates keep their ${...}."""
    out, i, n = [], 0, len(src)
    esc = {'n': ' ', 't': ' ', "'": "'", '"': '"', '`': '`', '\\': '\\'}
    def unesc(t):
        t = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), t)
        return re.sub(r'\\(.)', lambda m: esc.get(m.group(1), m.group(1)), t)
    prev = ''
    while i < n:
        c = src[i]
        if c == '/' and src[i + 1:i + 2] == '/':
            i = src.find('\n', i); i = n if i < 0 else i; continue
        if c == '/' and src[i + 1:i + 2] == '*':
            i = src.find('*/', i + 2); i = n if i < 0 else i + 2; continue
        if c == '/' and prev in '(,=:[!&|?{};\n' :      # a regex literal: skip it
            k, cls = i + 1, False
            while k < n and (src[k] != '/' or cls):
                if src[k] == '\\': k += 1
                elif src[k] == '[': cls = True
                elif src[k] == ']': cls = False
                elif src[k] == '\n': break
                k += 1
            i = k + 1; prev = '/'; continue
        if c in '\'"':
            k = i + 1
            while k < n and src[k] != c:
                if src[k] == '\\': k += 1
                if src[k] == '\n': break
                k += 1
            out.append(unesc(src[i + 1:k])); i = k + 1; prev = c; continue
        if c == '`':
            k, depth = i + 1, 0
            while k < n and (src[k] != '`' or depth):
                if src[k] == '\\': k += 1
                elif src[k] == '$' and src[k + 1:k + 2] == '{': depth += 1; k += 1
                elif src[k] == '}' and depth: depth -= 1
                k += 1
            out.append(unesc(src[i + 1:k])); i = k + 1; prev = c; continue
        if not c.isspace(): prev = c
        i += 1
    return out


def norm(t):
    t = t.replace('“', '"').replace('”', '"').replace('’', "'").replace('‘', "'")
    return re.sub(r'\s+', ' ', t).strip()


def is_prose(t):
    """Does this string read as something the player sees (a sentence), not markup, CSS, a selector or a key?"""
    t = t.strip()
    if len(t) < 14 or len(t.split()) < 3: return False
    if re.search(r'<[a-zA-Z/!]|class=|style=|=>|===|rgba?\(|\.js\b|\bpx\b|\d+px|querySelector|function\b|[a-z-]+:\s*[^ ;]+;|^[#.\[/]|^\$\{|&[a-z]+;', t): return False
    if not re.match(r'[A-Za-z"\'(“…\d]', t): return False
    plain = re.sub(r'\$\{[^}]*\}', '', t)
    letters = sum(ch.isalpha() or ch == ' ' for ch in plain)
    if not plain or letters / len(plain) < 0.8: return False
    if not re.search(r'[.!?…:"\')]$', plain.strip()): return False     # ends like a sentence
    return len(re.findall(r'\b[a-z]{3,}\b', plain)) >= 2


def coded_lines():
    """Section J: every line of text in the game, each with a stable ID.
    IDs come from the STORY_MASTER.txt already in the repo (a line keeps its ID as long as its text is still in the code);
    a line whose text has left the code moves to RETIRED and its ID is never used again; text that is new in the code gets the
    next free number under ADDED. (The very first export took its lines from docs/STORY_AND_DIALOGUE.txt, now removed.)"""
    prev = OUT.read_text(encoding='utf-8') if OUT.exists() else ''
    body = prev.split('# J  EVERY LINE IN THE GAME', 1)[1] if '# J  EVERY LINE IN THE GAME' in prev else ''
    body = body.split('\n# K  WRITER', 1)[0]
    by_code = {v[0]: k for k, v in CODES.items()}
    secs, cur = {}, None                      # code -> list of ('h', text) | ('l', id, text) | ('n', text)
    order = []
    for raw in body.splitlines():
        m = re.match(r'^## SOURCE (\S+)\s+\((\S+?)\)', raw)
        if m: cur = m.group(1); secs[cur] = []; order.append(cur); continue
        if cur is None: continue
        m = re.match(r'^### \S+ / (.+)$', raw)
        if m: secs[cur].append(('h', m.group(1))); continue
        m = re.match(r'^  ([A-Z]+)-(\d{4}) \| (.*)$', raw)
        if m: secs[cur].append(('l', int(m.group(2)), m.group(3))); continue
        m = re.match(r'^    was ([A-Z]+)-(\d{4}) \| (.*)$', raw)
        if m: secs[cur].append(('g', int(m.group(2)), m.group(3))); continue
        if raw.strip() and not raw.startswith('#'): secs[cur].append(('n', raw.strip()))
    today = datetime.date.today().isoformat()
    out, total, gone_n, new_n = [], 0, 0, 0
    for code in order + [c for c, _ in CODES.values() if c not in order]:
        f = by_code.get(code)
        if not f or not (SRC / f).exists(): continue
        src = read(f)
        strings = [norm(x) for x in js_strings(src)]
        sset, flat = set(strings), norm(re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), src).replace("\\'", "'").replace('\\"', '"'))
        out += ['', '', '#' * 100, f'## SOURCE {code}   ({f}): {CODES[f][1]}', '#' * 100]
        kept, gone, top, pend = [], [], 0, None
        for it in secs.get(code, []):
            if it[0] == 'h':
                pend = None if it[1].startswith('GONE') or it[1].startswith('RETIRED') else it[1]; continue
            if it[0] == 'g': gone.append((it[1], it[2])); top = max(top, it[1]); continue   # retired earlier: kept on the list so the number is never used again
            if it[0] == 'n': out.append('  ' + it[1]); continue
            _, num, text = it; top = max(top, num)
            bare = norm(re.sub(r'^\[[A-Za-z0-9_ ]+\]\s*', '', text))
            if bare in sset or bare in flat:
                if pend: out += ['', f'### {code} / {pend}']; pend = None
                out.append(f'  {code}-{num:04d} | {text}'); kept.append(bare); total += 1
            else: gone.append((num, text))
        keptset = set(kept); seen = set()
        fresh = [t for t in strings if is_prose(t) and t not in keptset and not (t in seen or seen.add(t))
                 and not any(len(k) >= 20 and (k in t or t in k) for k in kept)]
        if fresh:
            out += ['', f'### {code} / ADDED {today}']
            for t in fresh: top += 1; out.append(f'  {code}-{top:04d} | {t}'); total += 1; new_n += 1
        if gone:
            out += ['', f'### {code} / RETIRED (the text is no longer in the game; these IDs are never used again)']
            for num, text in sorted(gone): out.append(f'    was {code}-{num:04d} | {text}'); gone_n += 1
    print(f'section J: {total} lines with an ID ({new_n} added, {gone_n} retired in all)')
    return '\n'.join(out), total


# ----------------------------------------------------------------------------------------- hand-written
HEAD = r'''HOIST (Pocket Pirates): THE MASTER STORY FILE
================================================================================================
This is the main story file for the full game. Edit it, upload it again, and the next session puts every change
into the game. Built from commit {commit} on {date}. {nlines} in-game lines carry an ID.

CONTENTS
  A   HOW TO USE THIS FILE (IDs, status marks, how to add and remove things)
  B   PREMISE AND RULES (tone, what is never shown)
  C   CAST (everyone who speaks or is spoken of, with voice notes)
  D   STRUCTURE (dread, chapters, acts, the full-game plan)
  E   MAIN QUEST (every goal, in order)
  F   THE WORLD ATLAS (regions, hand-made places, harbours, and SLOTS for new places to explore)
  G   THREADS (the seven dark threads, side-story seeds, small harbour quests)
  H   ENDINGS
  I   SYSTEMS THAT CARRY STORY (where the story hides in the mechanics)
  J   EVERY LINE IN THE GAME (with IDs, by source file)
  K   WRITER'S LOG (open questions, decisions, what to do next)
'''

PART_A = r'''
################################################################################################
# A  HOW TO USE THIS FILE
################################################################################################

IDs
  Every in-game line has an ID: OBJ-0001, PAS-0012 ... (code of the source file + number). The ID never changes.
  Edit only the text after the "|". Format of a line:     CODE-NNNN | [tag] the text the player sees
  [tag] says which field the line sits in ([intro], [outro], [hints], [once], [again] ...). Keep it.
  ${x} or {P} or {H} is a value the game fills in (a number, a harbour name). Keep those exactly as written.

CHANGING THINGS
  Change a line      edit the text after "|".
  Add a line         copy the line below it and give it the ID  NEW-<short name>, for example  NEW-mara-fog-1.
                     Say in a note above it where it belongs (which goal, which place, which dread stage).
  Remove a line      write DELETE after the ID:   OBJ-0004 | DELETE
  Move a line        write MOVE: <where> after the text.
  Not sure           write ?? at the end of the line. Those are the first things the next session asks you about.

HAND-WRITTEN PARTS (B to I) use their own IDs and the same status marks:
  [BUILT]   it is in the game now.            [PLANNED] decided, not built.
  [IDEA]    a suggestion, not decided.         [EMPTY]   a slot waiting for you to write it.
  [CUT]     removed on purpose (kept so it is not suggested again).
  Change the mark when you decide. A slot you fill in becomes [PLANNED]; I turn it into [BUILT] once it is in.

TEMPLATES (copy these to add new things; the full list of fields is in the slots in part F)
  PLACE    id, region, where, how it is found, first sight, on arrival, repeat visits, dialogue, reward, dread version, links
  SCENE    id, where it plays, who is there, what you see, choices (1/2/3), checks (d20 and against what), outcomes
  PERSON   id, name, where they live, voice, what they want, what they know, lines by dread stage
  QUEST    id, given by, steps, what each step needs, what is paid, what changes in the world afterwards

HOW I WILL IMPORT IT
  1. You upload the file. 2. I compare it to docs/STORY_MASTER.txt in git, by ID. 3. I list every change back to you.
  4. Lines go into the right source file (the CODE says which). New places, scenes and persons become code, with the
  look (design) and the sound (audio) briefed separately. 5. I rebuild this file with the new IDs and save it.
  Anything marked ?? is asked, never guessed.
  Section J is pulled from the code on every rebuild: text new in the game appears under "ADDED <date>" with fresh IDs, and
  text that has left the game stays listed under "RETIRED" (its ID is never used again).

WHERE THINGS ARE BUILT (so you know what is cheap and what is not)
  Cheap    changing any line, adding lines to existing lists, adding a bottle note, rumour, gossip, harbour line,
           passenger story, Mara remark, goal hint, cave node, encounter card.
  Medium   a new hand-made place (a landmark island with a visit text and a reward), a new thread scene, a new resident.
  Larger   a new mechanic, a new region look, a new full-screen scene with its own picture, a new ending.
'''

PART_B = r'''
################################################################################################
# B  PREMISE AND RULES
################################################################################################

THE GAME [BUILT]
  Sail a small ship (the Merry Gull) with your first mate Mara across an endless sea. It starts as a cosy Caribbean
  exploration game (fish, dig, deliver, trade, chat) and drifts, with distance from home, into cosmic horror.
  The title is HOIST. The captain (you) never speaks. The demo is the bright game only (no dread).

THE PREMISE [BUILT, never explained]
  The sea is a closed eyelid. Dread is the Eye stirring in its sleep; the worst effects are its dreams leaking.
  A Lady in a black hut keeps it asleep by throwing a twenty-sided die. Each low roll is a moment it nearly woke;
  she writes it in a ledger. The player's throws count too, without them knowing.

THE RULES OF TELLING [BUILT]
  B1  Horror is implied, never explained. No monsters with names; small wrong details (a table laid for two, a boat
      that returns with nobody aboard, a dog that sits facing you).
  B2  The Lady is never seen. The hut text describes only a chair in the dark.
  B3  Never resolve a storyline casually. Every thread is recorded and can be picked up later.
  B4  HUD text stays minimal. Writing is short. A line is one idea.
  B5  No handholding: nothing is marked right or wrong; riddles, rumours and notes are a memory aid.
  B6  The world remembers: what you do in one harbour is gossiped about in the next.
  B7  The bright version and the wrong version of a place share a skeleton; dread swaps the details, not the place.
  B8  Mara is cheerful (her real name is Mara). Her village comes back to her a piece at a time during the voyage; she never
      says its name aloud. [DECIDED 2026-11-11] At full dread she still says things she should not.
  B9  The captain never speaks. Other people may speak AT the captain, and Mara answers for the ship.

TONE BY DREAD STAGE [BUILT]
  0 Sunny   warm, funny, small talk, food, weather.            1 Off    people repeat themselves; one wrong detail.
  2 Wrong   odd names, glowing fungus, standing stones.         3 Eerie  fog, dusk, lit empty windows, black flag.
  4 Cosmic  black sun, an eye in the stars, chromatic split, Mara breaks.
  Dread follows how far out you are, by stratum (Home Sound, the Shoals, the Trade Belt, the Slack, the Dim, the Lid at 1950-2400),
  and the worst you have sailed into lingers. It does not grow with time. The demo has no dread at all.

WRITER'S NOTES FOR THIS FILE
  B-note-1  (empty)   Add rules you want me to keep: words to avoid, running jokes, how long a line may be. ??
'''

PART_C = r'''
################################################################################################
# C  CAST
################################################################################################
Status marks as in part A. "Voice" is a short note to keep every line in character; add yours.

C-001 MARA, first mate [BUILT]
  Role      talks you through the goals, remarks on weather, dusk, tide, ports; answers passengers; unravels at full dread.
  Voice     warm, quick, a little cheeky; one or two short lines at a time; calls you Captain; "She is small, but she is ours."
  Secret    she is from a village that is no longer above water (the Sunken Street). She remembers it slowly: the bell, the street
            that ran down to the water, the blue door, and the name, which she will not say aloud. [DECIDED 2026-11-11, BUILT]
            What that makes her is still not said anywhere. [OPEN]
  Her arc   cheerful -> steady -> rattled (mood from hull, rest and dread) -> breaks (glitching portrait, lines she should not say);
            alongside it, the memory of her village returning in four pieces.
  Lines     OBJ (goals), MAIN (remarks), PAS (banter), THR/TMOD (threads).  Your edits:  (empty)

C-002 OLD PERRIN [BUILT as letters only]
  Role      the cartographer who never left port. His letters give the first riddles; his chart is drawn as if from below the water.
  Voice     dry, precise, a little smug. Never met in person.
  Hooks     he once visited the hut [IDEA]; his riddles describe shores he could not have seen.   Your edits:  (empty)

C-003 THE LADY IN THE HUT [BUILT, never seen, never speaks]
  Role      throws the d20 to keep the Eye asleep, writes every low roll in a ledger.
  Shown     a silent old woman, an old bone die, candles (one more for every low throw), a chair in the dark.
  Never     her face, her voice, an explanation.   Your edits:  (empty)

C-004 THE HARBOURMASTER AT TAMA [BUILT]
  Role      hands you Perrin's letters; gives hints (watch the sky).   Voice: brisk, kind.   Your edits:  (empty)

C-005 THE EIGHT RESIDENTS [BUILT] (one per harbour, a four-visit story that changes the harbour for good)
{residents}
  Each has a "prop" that appears by the pier when their story ends. Lines are in section J under HLF (ARCS).
  Your edits / new residents:  (empty)

C-006 WICK, keeper of Wick's Rock [BUILT]   silent lighthouse keeper; walks you up to the gallery; no speech.
C-007 THE KESTREL [BUILT as absence]   a ship crossed off the list in the tin box on the Grey Tooth; its white posts (daymarks) still stand.
C-008 THE PAINED RAVEN [PLANNED, working name]   the Gull's opposite, a ghost ship. Seed: inside the hull, "Not the Gull. I left it." Never explain who sails her.
C-009 THE FACTIONS [BUILT as names and colours]   Crown Traders, Free Cays, Reef Brotherhood, Lantern Guild, The Drowned (see part F).
C-010 THE HARBOUR FOLK [BUILT]   fishers and dockers at dawn, the fish-stall woman by day, the fiddler and lamplighter in the evening, the night watchman; dark figures with pale eyes from dread stage 2 (they only stare).
C-011 CREW FOR HIRE [BUILT]   two hired hands max, silent, with a trait (Lucky, Old salt, Silver tongue, Strong rower, Sharp-eyed, Superstitious) and a wish.
C-012 PASSENGERS [BUILT]   talk while sailing: stories, gossip, treasure hints, dark lines at high dread; Mara answers.

NEW PEOPLE (copy this block)
  C-NEW-01  [EMPTY]
    name:
    where they live / where met:
    voice (3 words):
    what they want:
    what they know (and what they do not say):
    lines by dread stage:  0 ...   1 ...   2 ...   3 ...   4 ...
'''

PART_D = r'''
################################################################################################
# D  STRUCTURE
################################################################################################

D1 THE SIX CHAPTERS OF THE DEMO [BUILT] (about one hour)
{chapters}
  The fog wall: each chapter allows a radius from Tama; near it the fog closes in, past it the ship is turned back.
  The demo ends on the first throw at the hut and the diver on the water: at the next harbour someone speaks of your number,
  then the end card. [DECIDED 2026-11-11] Odd jobs, Salvage rights and the raider are optional side goals, not part of the chain.

D2 THE FULL GAME [the shape is BUILT; the texts are open]
  Act 1  Fair winds     (bright, the demo)                    chapters I-III      [BUILT]
  Act 2  Loose talk     (rumours of a hut)                    chapters IV-VI      [BUILT]   The demo ends here, on the first throw.
  After the demo there are no more chapters. The sea is open and the story is told by going places (STORY_EXPLORATION.txt):
  Gather   the Shoals and the Trade Belt: harbours write things down (bells, ledgers).                    [BUILT as places and clues]
  Compare  the Slack and the Dim: other people's traces, sources that do not agree.                        [BUILT as places and clues]
  Decide   the Lid: the Sunken Street, the Table by the Water, one of six endings (part H).                [BUILT, ending texts DRAFT]
  Act 3 "The Lady's errands" is CUT.
  D2-note   (empty)

D3 WHAT UNLOCKS WHEN [BUILT]
  fishing from II, oars and passengers from III, crew, tavern dice, haggling and encounter cards from IV; cannons in IV.
  Dolphins, whales, sightings, lighthouse keepers and optional goals wait until the seventh goal.

D4 THE STRATA: DREAD AND WHAT LETS YOU IN [BUILT] (distance from Tama; the list in code is STRATA in src/palette.js)
  0 to 450      Home Sound    dread 0 to 0.12     nothing needed
  450 to 800    The Shoals    0.12 to 0.28        Rudder 2, or any bought chart
  800 to 1150   Trade Belt    0.28 to 0.45        Lantern 1 and Hull 2
  1150 to 1550  The Slack     0.45 to 0.62        Lantern 2 (a current here makes the way home longer)
  1550 to 1950  The Dim       0.62 to 0.82        Hull or Sails 3, on a falling tide
  1950 to 2400  The Lid       0.82 to 1.0         three clues seen in three different regions
  At full dread: about 140 s to the leviathan, about 170 s until the Eye opens and you wake off Tama.
  The demo keeps the chapter fog wall (430 / 820 / 1250 / 1650) and has no dread.   Your notes:  (empty)
'''

PART_E = r'''
################################################################################################
# E  MAIN QUEST
################################################################################################
Goal texts, Mara's intros, outros and hints are in section J under OBJ (same goal order). Fill the "your edit" lines
to change what a goal asks, pays or leads to. Rewards are gold.

{goals}

E-optional  SIDE GOALS [BUILT]: fish (Dinner at sea), hail (Say hello), bottle (Message received), paint (A touch of style),
  fruit (Fresh from the tree), dolphin (Friends of the sea), and others; they complete themselves.
E-new  NEW MAIN GOALS FOR THE FULL GAME (copy this block for each)
  Q-NEW-01  [EMPTY]
    chapter / act:
    title:                      reward:
    how it starts (who says what):
    steps (what the player does, in order):
    where it happens (name a slot from part F):
    Mara's intro / outro / hints:
    what changes afterwards:
'''

PART_F_HEAD = r'''
################################################################################################
# F  THE WORLD ATLAS
################################################################################################
The sea is endless and made of 110-unit cells; every 550 units is a named SECTOR with a faction. Tama is at the
centre. The idea of this part: the world is connected, but each region has its own look, trade, weather and secrets,
so a player who goes somewhere learns the place and starts to recognise it. Story pieces are PLACED in regions so you
have to go there to find them. Everything marked [EMPTY] is a slot for you.

F1 HOW A PLACE CAN BE FOUND (pick one for each slot)
  rumour        bought at a tavern (40g), may be false (about 1 in 3)       [BUILT]
  riddle        carved on a treasure arch; some arches hold only half        [BUILT]
  bottle        message in a bottle that drifts near you                     [BUILT]
  chart note    a local chart bought on a board (30g)                        [BUILT]
  letter        Perrin's letters at Tama                                     [BUILT]
  gossip        a villager, a passenger, a lighthouse keeper's call          [BUILT]
  sighting      a sign at sea (boat, crate, buoy, raft, silver shoal, glass) [BUILT]
  seen from far a landmark shape on the horizon, readable with the spyglass  [BUILT]
  schedule      only at a time: a weekday, a tide, the night, a storm        [BUILT, tides, week, storm fronts]
  condition     needs a lantern, a stronger hull, a shallow keel             [BUILT, three places]
  refusal       you did not do something (stopped throwing, never hired)     [PLANNED]
  just sailing  nothing points at it; only the player who goes there sees it

F2 WHAT A PLACE CAN BE (the building blocks that exist)
  island kinds   harbour, jungle, sandbar, rocky crag, atoll, volcano (rare, big), mangrove; lighthouse on about a third
  at sea         wrecks (salvage, more at low tide), whirlpools, barrels, bottles, glowing shoals, ghost ships, drifting derelicts,
                 floating market (Friday), regatta (Sunday), whale migration (Thursday), storm fronts, tide passages
  scenes         one-time caves (a node graph with d20 checks), thread scenes (full screen), encounter cards (rare, at sea)
  persons        residents, harbour folk, passengers, crew, keepers, a ship you can hail
'''

REGIONS = [
    ('F3-CROWN', 'CROWN TRADERS', 'blue (#4a7fd8)', 'home sector Tama Sound and the sectors that roll out of it',
     'colonial towns, churches, tidy quays, markets, farms (the classic and market looks; terracotta roofs, verandas)',
     'merchant brigs and galleons, order, customs; the fewest raiders',
     'steady weather; fog is average',
     'Where the game starts. It teaches the player what "normal" looks like, so that every other region can be told apart.',
     [('W-C1', 'Customs Pier', 'a pier where every ship is searched; an official who writes down your cargo and your name; at dread the list has your name already'),
      ('W-C2', 'The Governor\'s Dinner', 'a harbour feast you may be invited to; talk and luck checks; a toast to somebody who is not there'),
      ('W-C3', 'The Closed Mint', 'an old fort-ruin with a rusted cannon and coins that are all stamped with the same ship')]),
    ('F3-FREE', 'FREE CAYS', 'green (#4eb86a)', 'sectors that the random roll gives the faction; shallows, lagoons and sandbars',
     'palm-thatch huts, fishing villages, farms; easy living, music on the quay',
     'canoes and fishing boats; flying fish and sea turtles; calmer weather',
     'calm, bright; the easiest sailing',
     'The region where the player relaxes. Its secrets should be small, warm and slightly wrong.',
     [('W-F1', 'The Turtle Road', 'a line of turtles that always swim the same way; follow them and they stop at a place with a table by the water'),
      ('W-F2', 'The Hammock Isle', 'an island where everyone is asleep in the day; they only talk at night, and at night they ask you the date'),
      ('W-F3', 'The Singing Sandbar', 'a sandbar that makes one note when the tide turns; a fiddler waits for it')]),
    ('F3-REEF', 'REEF BROTHERHOOD', 'red (#d8484a)', 'sectors with reefs and rocks; the home of raiders',
     'wreckers\' coves, rough harbours, thatch, fishing; wrecks everywhere',
     'schooners; the only raiders (rare, one at a time); more squalls',
     'squalls, rolling water, rough sea',
     'The region that costs the ship something. Story here is about debts, wrecks and what the sea gives back.',
     [('W-R1', 'The Wreckers\' Light', 'a lamp on the rocks that lures ships; a keeper who swears she only keeps it lit for her husband'),
      ('W-R2', 'The Name Wall', 'a cliff where a name is painted for every ship that sank; the paint is wet; one name is the Merry Gull'),
      ('W-R3', 'The Surrender', 'a raider captain who gives up without a fight and warns the sea further out is eating sectors (side seed 9)')]),
    ('F3-LANTERN', 'LANTERN GUILD', 'amber (#e8b838)', 'sectors with fog and many lighthouses',
     'shrine towns with lamps, terraced white towns, guild markets; stone lanterns',
     'merchants and galleons; Lantern oil; more fog',
     'fog, evening light',
     'Where light is a currency. Story here is about what the lamps are for and what the light shows.',
     [('W-L1', 'The Oil Press', 'a village that presses a deep fish for lamp oil; seen by that oil, a street shows a second set of doors (side seed 8)'),
      ('W-L2', 'The Keepers\' Ledger', 'a lighthouse log that lists ships not yet sailed; one is yours, dated next week (side seed 1)'),
      ('W-L3', 'The Dark Tower', 'the one lighthouse that never lights; its door is open, and the stairs go down')]),
    ('F3-DROWNED', 'THE DROWNED', 'violet (#a050d0)', 'any sector above 72% dread, roughly 1580 units from Tama and beyond',
     'low, damp, half-abandoned; wreckers, fishing and shrine looks; drowned streets (planned: sunken streets biome)',
     'derelicts with lamps lit, ghost ships, nobody on deck',
     'fog, glass calm, wrong ocean, lightning that shows a shape',
     'The far sea. The bright game is over; the world is the same, only wrong. Mara cannot be trusted to remember here.',
     [('W-D1', 'The Hollow Harbour', 'a harbour that is far too friendly (thread, see part G)'),
      ('W-D2', 'The Island That Moves', 'a different place every time it is charted; it is resting on something (side seed 12)'),
      ('W-D3', 'The Table by the Water', 'the table from the Lady\'s story, laid for two; the same table seen in harbours earlier as a fragment')]),
]

PART_F_TAIL = r'''
F5 HARBOURS [BUILT] (every harbour: a resident, a house dish, a named weekly event, a local game, a fragment of the old story)
  Tama     the home harbour: classic look, red-and-white lighthouse, bells, festival on Sunday, pier faces the start.
  Velto    the second harbour, about 265 from Tama (fishing village), the partner of several home stories.
  Others   the village style (thatch, market, terraced, shrine, wreckers, farm, fishing, classic) comes from the faction (see F3).
  Village customs (one per harbour, shown, never explained):  whitewash, lamps lit all night, no children, a dusk choir,
  fishing boats with lanterns, kites, bells, washing day, carved figures, a silent village.
  Week: Wednesday market day (extra stalls, +25% sell), festival day (one weekday per harbour, +50% fish), Saturday lantern night.
  Your notes on harbours:  (empty)

F6 NEW PLACES TO EXPLORE: OPEN SLOTS (fill these in; one per slot, any number of slots)
  A place does not need to be an island. It can be a patch of water, a wreck, a cave mouth, a ship, a person on a pier.
  Fill what you know, leave the rest empty. Use the regions in F3 (their ideas are only suggestions).

  W-NEW-01  [EMPTY]   copy this block for each new place
    name:
    region / sector (or distance from Tama):
    dread stage it belongs to (0-4):
    kind (island / wreck / cave / ship / patch of sea / person):
    how it is found (see F1):
    what you see from far away (spyglass line):
    on arrival, first time (the text the player reads):
    on later visits:
    people here and what they say (use a PERSON block in part C if more than a line):
    choices and checks (1/2/3, d20 vs what):
    reward / what changes in the world:
    the wrong version (what dread 3-4 changes):
    links (other places, threads, endings):
    what the player must NOT be told:
'''

PART_G = r'''
################################################################################################
# G  THREADS
################################################################################################

G1 THE SEVEN DARK THREADS [BUILT in the full game; three of seven are awake per voyage, picked from the seed]
{threads}
  Each is a module with its own site (open water picked from the seed), clues, scenes and ends. Details and how they
  interact are in the Story Bible. Their lines are in section J under THR, TSC, TMOD.
  Marks the threads set (shown only on the Standing page, in the world's words):
    Counted (a natural 1), Called (a natural 20), Salt-marked (sold the bright fish), Owed and Quiet (defined, unused).
  Your notes / changes to a thread:  (empty)

G2 SIDE-STORY SEEDS [IDEA, to be loosely linked; assign each to a region in part F]
   1  The Lighthouse Keepers' Ledger: logs list ships that have not sailed yet, one is yours, dated next week.
   2  Old Perrin, the cartographer who never left port: his maps are drawn as if from below the water; he once visited the hut.
   3  Mara's village: she cannot remember its name; a chain of rumours leads to an island on no map, above water before the sea rose.
   4  The drowned bell: bring the clappers from five wrecks to a sunken belfry; ringing it calls something up for one night.
   5  The fisherman's debt: the fisherman who drags you home after a sinking keeps asking to be paid. He never wants gold.
   6  Letters from a captain on your route: years old, same stops, the handwriting slowly becomes yours.
   7  The twin harbour: two harbours with the same name; the people in one do not blink.
   8  Lantern Guild oil from a deep fish: by its light the world shows what it hides.
   9  The raider who surrenders and warns that the sea further out is eating sectors; later an informant in different harbours.
  10  The other dice: wrecks hold d20s each missing a number; the Lady would very much like them back.
  11  The choir of gulls: a gull follows you for days; at high dread their cries spell out the hut's location; she keeps one old gull.
  12  The island that moves: in a new place each time it is charted. It is resting on something.
  Your picks / new seeds:  (empty)

G3 LITTLE HARBOUR QUESTS [IDEA, for the full game]
  The lost kitten: fetch a child's kitten from a fishing boat off a sandbar. Reward: a shell, standing.
  The birthday cake: deliver a cake to the next island before sunset; storms squash it. Reward: gold, a speed buff, the innkeeper greets you by name.
  The other kitten: the same quest, slightly wrong (dry, calm kitten facing your ship; the child repeats the first child's words; the same shell twice).
    Only from Off water on, once, in another harbour. Never explained.
  New little quests:  (empty)

G4 THE OLD STORY IN FRAGMENTS [BUILT]
  Every harbour holds one fragment of an old story ("the table by the water", "the one who keeps the count"), never explained;
  you see the whole only by visiting them all (12 in all). Lines: section J under HLF (FRAGMENTS).
  What is the whole story?  (empty)  ??
'''

PART_H = r'''
################################################################################################
# H  ENDINGS
################################################################################################

[DECIDED 2026-11-11, BUILT in src/table.js] The voyage ends at the Table by the Water. Four things can be done there; what a captain
may do depends on what the voyage showed them. "Turn the table to the sea" is CUT.
H-1  THE LONG SLEEP   Throw, 20            she sleeps a hundred more years.                 [BUILT, text DRAFT]
H-2  GOOD DREAMS      Throw, 10-19         the world stays bright, Mara stays Mara.          [BUILT, text DRAFT]
H-3  SHE RISES        Throw, 1-9           the Eye opens (the built Eye sequence follows).   [BUILT, text DRAFT]
     The book weighs the last throw: every earlier throw counts a little, never more than 3 either way; the Kestrel's lamp halves a bad weight.
H-4  YOUR SEAT        Sit                  needs "who sat before you" at level 3 (no offerings any more).   [BUILT, text DRAFT]
H-5  THE UNSEEN THROW Leave                for a captain who set the die down once, or never threw after the first.   [BUILT, text DRAFT]
H-7  THE TUNE IS KEPT Hum the tune         needs the Two Players heard. The ONLY gentle, happy ending, and the only one without a throw.   [BUILT, text DRAFT]
H-6  THE EYE AWAKENS  [BUILT] after about 170 s at full dread a huge eye opens, the screen whites out, you wake near Tama.

OFFERINGS (what the player brings) [CUT with the errands]   a gull feather, a bell clapper, Mara's hat, a tooth with a tiny ship carved in it,
  a warm black pearl.   Which of these do you want, and where does each come from (a slot in part F)?   (empty)

THE LADY'S LEDGER [BUILT as a record: state.hut.rolls]   every throw is kept with its day.   What the ledger says at the end:  (empty)
THE HUT CHANGES ON LATER VISITS [IDEA]   more candles, a second chair, a page of the ledger left open with your ship drawn on it,
  a natural 1 leaves the hut empty next time.   Your picks:  (empty)
'''

PART_I = r'''
################################################################################################
# I  SYSTEMS THAT CARRY STORY
################################################################################################
Where the story hides in the mechanics, and where its text lives (section J).

  The die             one bone d20 for hut, haggling, encounter cards and dig quality; it darkens with days at sea and dread.
                      The day after a throw: dread and prices shift (20 pulls it down, 1 pushes it up). Text: HUT, TAB, GRT.
  Rumours             bought at taverns; about 1 in 3 false; some lead somewhere stranger. Text: LORE, MAIN.
  Riddles and arches  treasure arches with sunrise/sunset/pole star/lone palm; half riddles. Text: LORE, DIG.
  Letters and bottles Perrin's letters (picked up at the Tama board); bottle notes drift by; the second hut bottle names your first throw.
  Passengers          pay for passage and talk on the way; text: PAS.
  Crew                hired hands with wishes; castaways join free; they leave after 3-5 days.
  Residents           four-visit stories per harbour; text: HLF.
  Gossip              what you did in one harbour is told in the next; text: HLF.
  Greetings           villagers speak first (rare); depends on hour, weather, dread; text: GRT.
  Customs, week, tides  shown, never explained.
  Caves               three one-time caves (the Hermit's Larder, the Rising Grotto, the Tally Niche); text: CAV.
  Marks               hidden tags the world reads; text: MRK.
  Mara's remarks      weather, dusk, tide, red sky, market day, lantern night, regatta, whales, fog wall; text: MAIN.
  Full dread          ten effects (glass calm, corrupted HUD, mad wind meter, Mara breaks, lighthouses stare, watchers, living map,
                      time loop, wrong ocean, wrong catches) and the leviathan; text: ABY.

  New system ideas:  (empty)
'''

PART_J_HEAD = r'''
################################################################################################
# J  EVERY LINE IN THE GAME
################################################################################################
Pulled from the code. Edit the text after the "|" (see part A). Sources are grouped by file; the CODE in front of every
line says which file it goes back into. {n} lines.
'''

PART_K = r'''


################################################################################################
# K  WRITER'S LOG
################################################################################################
K1 OPEN QUESTIONS [fill in; I will ask about every ?? first]
   - What is Mara (beyond where she is from)?                           (empty)  ??
   - What is the whole old story the fragments tell?                    (empty)  ??
   - What does the Lady write if she is asked who counts?               (empty)  ??
   - May Mara throw in your place at the Table?                         (empty)  ??
   - Are the Two Players the same two who play at night?                (empty)  ??
   - Who is the other berth, whose hook, who dug first, who rowed?      (empty)  ??   (the four small wrong things of the demo)
   - Who sails the Pained Raven?                                        (empty)  ??
   - Which regions get which threads?                                   (empty)  ??
K2 DECISIONS (with the date; the short list is docs/CANON.md)
   - 2026-11-11  Mara remembers her village, slowly; she never says its name.
   - 2026-11-11  Humming the Two Players' tune is the only gentle, happy ending, and it needs no throw.
   - 2026-11-11  The demo ends on the first throw at the hut and the diver on the water. Odd jobs, salvage and the raider are optional.
   - 2026-11-11  At the Table: Throw, Hum the tune, Sit, Leave. "Turn the table to the sea" is cut. The Lady's errands (Act 3) are cut.
   - 2026-11-11  Four small wrong things happen before the hut (the third oar, two berths, the hook, the hole); none is explained.
K3 NEXT TO IMPLEMENT, IN THIS ORDER
   1. The writer rewrites the six ending texts (section J, TBL): they are drafts.
   2. A rumour or a line from Mara that points at the music at night, so the gentle ending can be found.
   3. Something small at the Table for "who counts", "what a throw costs" and "why Tama is home", or the decision that they only colour the story.
   4. The four small wrong things join the clue list as home-water hints.
K4 SUGGESTION FROM THE ASSISTANT (delete if unwanted)
   Fill part F first: three places per region with a different dread stage each (one near, one middle, one far), so each
   region has a story you can only see by going there. Then link at most one thread to each region.
'''


def main():
    ch, gates = chapters()
    gl = goals()
    ts = threads()
    ar = arcs()
    lm = landmarks()
    lines_text, n = coded_lines()

    chap_lines = []
    for i, (num, title, act) in enumerate(ch):
        gate = gates[i] if i < len(gates) else '?'
        gs = ', '.join(g[0] for g in gl if g[1] == i)
        chap_lines.append(f'  {num:<4} {title:<20} act "{act}"   fog radius {gate:>5}   goals: {gs}')

    goal_lines = []
    cur = -1
    for gid, c, title, reward in gl:
        if c != cur:
            cur = c
            name = ch[c][1] if c < len(ch) else ''
            goal_lines.append(f'\n  CHAPTER {ch[c][0] if c < len(ch) else c}: {name}')
        goal_lines.append(f'    Q-{gid:<11} "{title}"   reward {reward}    [BUILT]')
        goal_lines.append(f'                  your edit: (empty)')

    res_lines = [f'  C-005-{k:<8} {who:<26} prop: {prop}      voice/notes: (empty)' for k, who, prop in ar]

    th_lines = []
    for tid, name, built, note in ts:
        th_lines.append(f'  T-{tid:<8} {name:<28} [{"BUILT" if built == "true" else "PLANNED"}] {note}')
        th_lines.append(f'               region it belongs to: (empty)     your notes: (empty)')

    parts = [HEAD.format(commit=git_head(), date=datetime.date.today().isoformat(), nlines=n)]
    parts.append(PART_A)
    parts.append(PART_B)
    parts.append(PART_C.replace('{residents}', '\n'.join(res_lines)))
    parts.append(PART_D.replace('{chapters}', '\n'.join(chap_lines)))
    parts.append(PART_E.replace('{goals}', '\n'.join(goal_lines)))
    parts.append(PART_F_HEAD)

    # F3 regions
    parts.append('\nF3 REGIONS [BUILT as names, colours, village looks and weather; the stories are yours to place]\n'
                 '  A region is a faction sector. Its village look is picked from the faction (the villages line of each region). Sound: each faction will get its own instrument\n'
                 '  (being composed), same key and meter as the main theme.\n')
    for rid, name, color, where, look, traffic, weather, intent, slots in REGIONS:
        parts.append(f'''
  {rid}  {name}   colour {color}
    where:        {where}
    villages:     {look}
    ships/wildlife: {traffic}
    weather:      {weather}
    story intent: {intent}
    instrument:   (empty: you are making one)
    your notes:   (empty)
    SLOTS (ideas, change or replace them):''')
        for sid, sname, sdesc in slots:
            parts.append(f'      {sid}  [IDEA]  {sname}: {sdesc}\n         your text: (empty)')

    # F4 hand-made places
    parts.append('\nF4 THE HAND-MADE PLACES [BUILT] (always at the same spot in every voyage; what is ashore is in section J under PLC)')
    for lmid, key, name, typ, x, z, sight in lm:
        dist = int((int(x) ** 2 + int(z) ** 2) ** 0.5)
        parts.append(f'  P-{lmid:<8} {name:<18} {typ:<8} at ({x}, {z}), {dist} from Tama   seen from far: "{sight}"')
        parts.append('               your edits: (empty)')
    parts.append('''  P-hut      The dark hut (one island 4-6 cells from home, out of sight of the start): crooked black hut on stilts, a purple window,
             bones on poles, a dead tree, a ring of pale stones. Inside: the Lady and the die. One throw per day. Text: HUT, TAB.
  P-tama     Harbour Tama: the home island; Perrin's letters, the harbourmaster, the shipwright, the bells.
  P-velto    Harbour Velto: the second harbour (about 265 from Tama), a fishing village.
  P-caves    three one-time caves on rocky, volcanic or jungle shores (see part I).''')
    parts.append(PART_F_TAIL)
    parts.append(PART_G.replace('{threads}', '\n'.join(th_lines)))
    parts.append(PART_H)
    parts.append(PART_I)
    parts.append(PART_J_HEAD.format(n=n))
    parts.append(lines_text)
    # the writer's log is hand-written: keep it exactly as it stands in the file (PART_K only seeds a file that has none)
    prev = OUT.read_text(encoding='utf-8') if OUT.exists() else ''
    mark = "# K  WRITER'S LOG"
    if mark in prev:
        k = prev[prev.index(mark):]
        bar = prev[:prev.index(mark)].rstrip('\n').rsplit('\n', 1)[-1]          # the ##### line above the heading
        parts.append('\n\n\n' + bar + '\n' + k.rstrip('\n') + '\n')
    else:
        parts.append(PART_K)

    OUT.write_text('\n'.join(parts) + '\n', encoding='utf-8')
    print(f'wrote {OUT.relative_to(ROOT)}: {n} coded lines, {len(gl)} goals, {len(lm)} places, {len(ts)} threads, {len(ar)} residents')


if __name__ == '__main__':
    main()
