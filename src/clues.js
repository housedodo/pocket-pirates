// The clue ledger (docs/WORLD_REDESIGN.md part 6): every clue is a thing in the world. Seeing it sets one flag, `state.story.seen[id] = dayN`,
// and what it grants is a capability (a button that works, a route that is safe), never a popup. Question levels are DERIVED here, never
// stored or shown. The one table below is the source of truth for code; docs are written from it.
//   region: where it lives (home, crown, free, reef, lantern, drowned; deep = met in deep dread anywhere). q: the questions it feeds (1 Who counts, 2 What is the Eye,
//   3 Who sat before you, 4 What does a throw cost, 5 Why is Tama home, 6 What is Mara, 7 Can it end). w: weight (a rare clue counts double).
//   cap: the capability it grants (read with isKnown). line: the log line, a fact in another hand that never concludes.
// Tone guards (tests/lint in `clueLint`): before the hut is known no clue may say she, the Lady, the hut or a number; never the banned words.
export const CLUES = [
  { id: 'CL-C3-a', region: 'home',    q: [4, 5], w: 1, cap: 'tally',   line: 'Tama rang fourteen at noon.' },
  { id: 'CL-C1-a', region: 'crown',   q: [1],    w: 1, cap: 'arrivals', line: 'The ledger at the pier has our name before we came.' },
  { id: 'CL-K-a',  region: 'home',    q: [3],    w: 2, cap: 'lamp',    line: 'Two white posts. A ship under them.' },
  { id: 'CL-R2-a', region: 'reef',    q: [3, 4], w: 1, cap: 'setdown', line: 'A schooner with a die that has no seven.' },
  { id: 'CL-R1-a', region: 'reef',    q: [3],    w: 1, cap: 'wreckticks', line: 'A cliff of ship names. The top paint is wet.' },
  { id: 'CL-C2-a', region: 'crown',   q: [4, 1], w: 1, cap: 'forecast', line: 'Small numbers beside the black days.' },
  { id: 'CL-F2-a', region: 'free',    q: [4],    w: 1, cap: 'rest',    line: 'An island where everyone sleeps by day.' },
  { id: 'CL-F1-a', region: 'free',    q: [2, 7], w: 1, cap: 'hum',     line: 'Two players, forty years, never met.' },
  { id: 'CL-F3-a', region: 'free',    q: [3],    w: 1, cap: 'cupmark', line: 'A table laid for two. One cup is ours.' },
  { id: 'CL-L1-a', region: 'lantern', q: [2],    w: 1, cap: 'bluelamp', line: 'The lamps burn a little blue.' },
  { id: 'CL-L2-a', region: 'lantern', q: [1, 3], w: 1, cap: 'date',    line: 'A date, in a hand that is not ours.' },
  { id: 'CL-L3-a', region: 'lantern', q: [2],    w: 1, cap: 'lookup',  line: 'A window that looks up through the sea.' },
  { id: 'CL-D1-a', region: 'drowned', q: [6],    w: 1, cap: 'streetline', line: 'A street under the water. A blue door.' },
  // the places already in the game, now feeding the ledger
  { id: 'CL-BELL-a', region: 'home',  q: [6, 5], w: 1, cap: null,      line: 'A light in a window, under the water.' },
  { id: 'CL-LAG-a',  region: 'free',  q: [2],    w: 1, cap: null,      line: 'A chest on the bottom. Somebody expected to come back.' },
  { id: 'CL-RIBS-a', region: 'reef',  q: [3],    w: 1, cap: null,      line: 'Ships come here and stay.' },
  { id: 'CL-HALF-a', region: 'lantern', q: [7],  w: 1, cap: null,      line: 'Half a house. Half a strongbox.' },
  // the small wrong things near home, and the sailors who went mad that answer them (systems/lostsailors.js, CANON 2026-11-12)
  { id: 'CL-H1-berth', region: 'home', q: [3],    w: 1, cap: null,      line: 'The first fare paid for two berths. One stayed empty.' },
  { id: 'CL-H2-hook',  region: 'home', q: [3],    w: 1, cap: null,      line: 'A bronze hook already in the catch. The line cut clean.' },
  { id: 'CL-H3-hole',  region: 'home', q: [3],    w: 1, cap: null,      line: 'A hole dug first, a spade short of the chest.' },
  { id: 'CL-X1-berth', region: 'deep', q: [3],    w: 1, cap: null,      line: 'A man on a wreck, waiting for his stop. The ticket is for two.' },
  { id: 'CL-X2-hook',  region: 'deep', q: [3],    w: 1, cap: null,      line: 'A rowboat with a cut line. The old knot, for a bronze hook.' },
  { id: 'CL-X3-hole',  region: 'deep', q: [3],    w: 1, cap: null,      line: 'Somebody still digging. The sand runs back in.' },
  // the threads, each in its region (THREAD_REGION), seen the first time the captain meets one (storybeats.threadClues; drafts, 2026-11-13).
  // The bell is the second way into Q5 (Why is Tama home), away from home waters.
  { id: 'CL-T-music',   region: 'free',    q: [2, 7], w: 1, cap: null, line: 'A tune that never ends. Nobody near it sleeps without it.' },
  { id: 'CL-T-bell',    region: 'lantern', q: [5, 6], w: 1, cap: null, line: 'A bell under the water rings the hours of Tama, not of this place.' },
  { id: 'CL-T-coin',    region: 'crown',   q: [1, 4], w: 1, cap: null, line: 'A coin that finds its way back to the purse it left.' },
  { id: 'CL-T-house',   region: 'crown',   q: [1, 3], w: 1, cap: null, line: 'A house that keeps a book of who stayed. Our name is in it.' },
  { id: 'CL-T-captain', region: 'reef',    q: [3],    w: 1, cap: null, line: 'A ship like ours in the wrong colours, lower in the water.' },
  { id: 'CL-T-colour',  region: 'drowned', q: [2],    w: 1, cap: null, line: 'A patch of sea the wrong colour. The fish from it taste of nothing.' },
  // R.'s letters, the first batch for the thin questions (owner, 2026-11-19, T7: "create a first batch and i will refine it"; drafts).
  // Each comes in a bottle picked up in its own water after the first throw (systems/rletters.js); the line is the letter itself.
  { id: 'CL-RL-reef',    region: 'reef',    q: [5],    w: 1, cap: null, line: 'The bells out here ring like they mean it. At Tama they hardly touch the rope. I asked the ringer why. He said it is not for us. - R.' },
  { id: 'CL-RL-crown',   region: 'crown',   q: [7],    w: 1, cap: null, line: 'Somebody told me there is a song that ends it gently. Nobody would sing it for me. - R.' },
  { id: 'CL-RL-free',    region: 'free',    q: [1],    w: 1, cap: null, line: 'In the Cays nobody counts anything, not fish, not days. I counted the boats for them anyway. Somebody had already written the number down. - R.' },
  { id: 'CL-RL-drowned', region: 'drowned', q: [2],    w: 1, cap: null, line: 'The water here is clear to the bottom, and the bottom is a long way down. Last night the bottom was closer. - R.' },
  // the bell and the boat (owner, 2026-11-23): one clue per region that only the diving bell or the ship's boat reaches (systems/gearplay.js
  // SITES). `gear: true`: without it its region is not read (regionSeen), so the far sea and that region's letter stay shut. Drafts.
  { id: 'CL-G-home',    region: 'home',    q: [5, 6], w: 1, cap: null, gear: true, line: 'Under the Drowned Bell, the clapper on a doorstep, set down to come back for.' },
  { id: 'CL-G-reef',    region: 'reef',    q: [3, 4], w: 1, cap: null, gear: true, line: 'In the Marigold\'s hold, a row of dice. The same face ground off every one.' },
  { id: 'CL-G-drowned', region: 'drowned', q: [6],    w: 1, cap: null, gear: true, line: 'Behind the blue door the table is laid, and the chair pushed in.' },
  { id: 'CL-G-free',    region: 'free',    q: [2, 7], w: 1, cap: null, gear: true, line: 'A stair in the lagoon goes down into the water. All the wear on it goes down.' },
  { id: 'CL-G-crown',   region: 'crown',   q: [1, 4], w: 1, cap: null, gear: true, line: 'Under the fort the oldest books are kept dry. The newest is tied with tomorrow.' },
  { id: 'CL-G-lantern', region: 'lantern', q: [2],    w: 1, cap: null, gear: true, line: 'In the cave under the press the oil comes up warm. Something turns over below.' },
  { id: 'CL-T-hollow',  region: 'drowned', q: [1, 6], w: 1, cap: null, line: 'A harbour that knew we were coming, and had a place set.' },
];
export const CLUE = Object.fromEntries(CLUES.map((c) => [c.id, c]));

const DEMO_BUILD = () => typeof window !== 'undefined' && window.__BUILD === 'demo';
const seenOf = (state) => (state.story && state.story.seen) || {};
export const hasSeen = (state, id) => seenOf(state)[id] !== undefined;

/** set a clue seen (once). Returns the clue the first time, else null. The caller writes the log line. */
export function markSeen(state, id) {
  const c = CLUE[id]; if (!c || DEMO_BUILD()) return null;   // the demo keeps no ledger (RULES 29)
  const s = (state.story.seen = state.story.seen || {});
  if (s[id] !== undefined) return null;
  s[id] = state.dayN || 0;
  return c;
}

/** question level 0..3, derived: per region the heaviest seen clue counts, summed across regions. One heavy clue (the Kestrel) is enough for 2. */
export function level(state, q) {
  const best = {};
  for (const c of CLUES) if (hasSeen(state, c.id) && c.q.includes(q)) best[c.region] = Math.max(best[c.region] || 0, c.w);
  return Math.min(3, Object.values(best).reduce((a, b) => a + b, 0));
}
export const levels = (state) => [1, 2, 3, 4, 5, 6, 7].map((q) => level(state, q));
/** a region is read once its bell-or-boat clue is seen (owner, 2026-11-23: "if you dont have the clue, you cannot proceed"); the deep
 *  (met anywhere in deep dread) has none and counts with any clue */
const GEAR_OF = Object.fromEntries(CLUES.filter((c) => c.gear).map((c) => [c.region, c.id]));
export const regionRead = (state, r) => (GEAR_OF[r] ? hasSeen(state, GEAR_OF[r]) : CLUES.some((c) => c.region === r && hasSeen(state, c.id)));
/** distinct regions read: the chart is readable once three are */
export function regionsSeen(state) {
  return new Set(CLUES.filter((c) => hasSeen(state, c.id) && regionRead(state, c.region)).map((c) => c.region)).size;
}
/** is a capability known? (gates.js uses this for buttons, routes and chart marks) */
export const isKnown = (state, cap) => !DEMO_BUILD() && CLUES.some((c) => c.cap === cap && hasSeen(state, c.id));   // nothing is known in the demo: no capability acts there
/** the table by the water shows on the chart once ANY three questions have reached level 2 */
export const d3Open = (state) => levels(state).filter((n) => n >= 2).length >= 3;
/** is this region read? (Perrin's letters after the hut): its bell-or-boat clue seen (regionRead) */
export const regionSeen = (state, r) => regionRead(state, r);
/** the Table by the Water stands for every captain who has thrown at the hut once (CANON 6: a captain who saw nothing still gets a real
 *  ending), or who has understood three questions; what can be done there still depends on what was understood (table.js) */
export const tableOpen = (state) => d3Open(state) || !!(state.hut && state.hut.rolls && state.hut.rolls.length);

// ---- tone lint ------------------------------------------------------------------------------------------------
export const BANNED = /\b(lid|eye|sleeper|lady|kept soft)\b|mara is from/i;
export const HUT_WORDS = /\b(she|her|the hut|\d+)\b/i;
/** returns the ids of clue lines that break the tone rules (empty = pass). With `where` ({ places: CLUE_PLACES() from places.js,
 *  regionAt from regions.js }) it also checks each clue's fixed place against its region tag (G-30): a place standing in a sector of
 *  another region is a warning on `.warnings`, never a failure; the owner picks per clue whether the place moves or the tag changes. */
export function clueLint(where) {
  const bad = CLUES.filter((c) => BANNED.test(c.line) || HUT_WORDS.test(c.line)).map((c) => c.id);
  bad.warnings = where ? clueRegionWarnings(where) : [];
  return bad;
}
/** the sector's region is seeded only in the mixed water between two wedges (sectors.js), so every place is read under `seeds` seeds */
export function clueRegionWarnings({ places, regionAt, seeds = 32 }) {
  const out = [];
  for (const p of places) {
    const c = CLUE[p.clue]; if (!c || c.region === 'deep') continue;
    const got = {};
    for (let s = 1; s <= seeds; s++) { const r = regionAt(p.x, p.z, s * 7919); got[r] = (got[r] || 0) + 1; }
    const other = Object.keys(got).filter((r) => r !== c.region);
    if (other.length) out.push(`${c.id} (${c.region}) at ${p.name} (${Math.round(p.x)}, ${Math.round(p.z)}) lies in ${other.map((r) => r + (got[r] < seeds ? ` (${got[r]}/${seeds} seeds)` : '')).join(', ')} water`);
  }
  return out;
}
