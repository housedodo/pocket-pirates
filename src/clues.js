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
];
export const CLUE = Object.fromEntries(CLUES.map((c) => [c.id, c]));

const seenOf = (state) => (state.story && state.story.seen) || {};
export const hasSeen = (state, id) => seenOf(state)[id] !== undefined;

/** set a clue seen (once). Returns the clue the first time, else null. The caller writes the log line. */
export function markSeen(state, id) {
  const c = CLUE[id]; if (!c) return null;
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
/** distinct regions with at least one clue seen: the chart is readable once three are */
export function regionsSeen(state) {
  return new Set(CLUES.filter((c) => hasSeen(state, c.id)).map((c) => c.region)).size;
}
/** is a capability known? (gates.js uses this for buttons, routes and chart marks) */
export const isKnown = (state, cap) => CLUES.some((c) => c.cap === cap && hasSeen(state, c.id));
/** the table by the water shows on the chart once ANY three questions have reached level 2 */
export const d3Open = (state) => levels(state).filter((n) => n >= 2).length >= 3;
/** has any clue of this region been seen? (Perrin's letters after the hut) */
export const regionSeen = (state, r) => CLUES.some((c) => c.region === r && hasSeen(state, c.id));
/** the Table by the Water stands for every captain who has thrown at the hut once (CANON 6: a captain who saw nothing still gets a real
 *  ending), or who has understood three questions; what can be done there still depends on what was understood (table.js) */
export const tableOpen = (state) => d3Open(state) || !!(state.hut && state.hut.rolls && state.hut.rolls.length);

// ---- tone lint ------------------------------------------------------------------------------------------------
export const BANNED = /\b(lid|eye|sleeper|lady|kept soft)\b|mara is from/i;
export const HUT_WORDS = /\b(she|her|the hut|\d+)\b/i;
/** returns the ids of clue lines that break the tone rules (empty = pass) */
export function clueLint() {
  return CLUES.filter((c) => BANNED.test(c.line) || HUT_WORDS.test(c.line)).map((c) => c.id);
}
