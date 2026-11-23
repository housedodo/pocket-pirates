// Asking around for Perrin's letters (owner, 2026-11-18, "Perrin goes strange"): when a letter is stuck Mara suggests tying up at a
// harbour in that region and asking around (objectives.js, hints). Here it helps: the first time the captain docks at a harbour in
// the letter's region while that letter is open, somebody on the pier names the nearest place carrying that region's clue, and it
// goes on the chart as a rumour (the red ring and "?", the log's Rumours). Once a letter (`state.story.letterAsk`). Full game only.
// It says where, never what. The rumour comes off the chart when the letter is done (objectives.js letterDone).
import { CLUES } from '../clues.js';
import { CLUE_PLACES } from '../places.js';
import { LM } from '../landmarks.js';
import { bearingName } from '../jobs.js';
import { pierOf } from '../world.js';
import { caysAsleep } from '../regions.js';
import { siteFor } from './gearplay.js';

// drafts for the writer (docs/WRITER_TODO.txt 4.6): ordinary voices; a name and a way, never what is there
const LINES = {
  crown: (n, w) => `Old names? Try ${n}, ${w} of here. They write everything down.`,
  free: (n, w) => `Try ${n}, ${w} of here. Go after dark, and go quiet.`,
  lantern: (n, w) => `Out by ${n}, ${w}. The light there is not like ours.`,
  reef: (n, w) => `Wrecks? Try ${n}, ${w} of here. Take your time. They are not going anywhere.`,
  drowned: (n, w) => `Doors? Try ${n}, ${w}, at low water. Do not knock.`,
};
// who is on the pier at that hour (greetings.js keeps the faces)
const WHO = { dawn: ['fisher', 'netmender'], day: ['fisher', 'netmender', 'docker', 'oldsalt'], evening: ['innkeeper', 'oldsalt', 'lamplighter'], night: ['watchman', 'lamplighter'] };
const phase = (h) => (h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 18 ? 'day' : h >= 18 && h < 22 ? 'evening' : 'night');

/** the nearest place to (x, z) whose clue counts for region r: { name, x, z } or null */
export function letterPlace(r, x, z) {
  const gs = siteFor(r); if (gs && LM[gs.lm]) return { lm: gs.lm, name: LM[gs.lm].name, x: LM[gs.lm].x, z: LM[gs.lm].z, gear: gs.gear };   // the place that reads the region (bell or boat, 2026-11-23)
  const reg = Object.fromEntries(CLUES.map((c) => [c.id, c.region]));
  let best = null;
  for (const p of CLUE_PLACES()) { if (reg[p.clue] !== r) continue; const d = Math.hypot(p.x - x, p.z - z); if (!best || d < best.d) best = { d, p }; }
  return best && best.p;
}

/** docking at harbour d with goal g open (not still being announced): a greeting that names the place, or null. Marks the chart. */
export function letterRumour(state, g, d, hour) {
  if (!g || !g.region || !LINES[g.region] || d.region !== g.region) return null;
  const asked = state.story.letterAsk || (state.story.letterAsk = {});
  if (asked[g.id] !== undefined || caysAsleep(d.region, hour, g.id)) return null;
  const pier = pierOf(d), p = letterPlace(g.region, pier.x, pier.z);
  if (!p) return null;
  asked[g.id] = state.dayN;
  state.rumoured['letter:' + g.id] = { name: p.name, x: Math.round(p.x), z: Math.round(p.z), source: d.name, found: false, letter: g.id };
  const who = WHO[phase(hour)], name = p.name.replace(/^The /, 'the ');   // mid-line: "Try the Governor's Fort"
  return { speaker: who[Math.floor(Math.random() * who.length)], text: LINES[g.region](name, bearingName(p.x - pier.x, p.z - pier.z)) + (GEAR_TAIL[p.gear] || ''), story: true, rumour: true };
}
// how the place is reached, said plainly once (the bell and the boat, 2026-11-23): never what is there
const GEAR_TAIL = { bell: ' The best of it is under the water. You would want a bell.', boat: ' The Gull will not get in. You would want a small boat.' };

// T6 c (owner, 2026-11-19): asking around never runs out. After the first throw, docking at a harbour may get a voice on the pier naming
// a place in that harbour's own water that the captain has not been ashore on yet, in the same voice as the letters' rumours (LINES).
// Once per place; one in PLACE_P docks; never while a letter's own rumour is due. It goes on the chart as a rumour the captain can pin.
export const PLACE_P = 0.4;
export function placeRumour(state, d, hour) {
  if (!LINES[d.region] || !(state.hut && state.hut.rolls && state.hut.rolls.length) || caysAsleep(d.region, hour, null) || Math.random() >= PLACE_P) return null;
  const asked = state.story.placeAsk || (state.story.placeAsk = {}), been = state.story.lm || {}, reg = Object.fromEntries(CLUES.map((c) => [c.id, c.region]));
  const pier = pierOf(d);
  let best = null;
  for (const p of CLUE_PLACES()) {
    if (reg[p.clue] !== d.region || been[p.lm] !== undefined || asked[p.lm] !== undefined || state.rumoured[LM[p.lm].key]) continue;
    const dist = Math.hypot(p.x - pier.x, p.z - pier.z); if (!best || dist < best.dist) best = { p, dist };
  }
  if (!best) return null;
  const p = best.p; asked[p.lm] = state.dayN;
  state.rumoured[LM[p.lm].key] = { name: p.name, x: Math.round(p.x), z: Math.round(p.z), source: d.name, found: false };
  const who = WHO[phase(hour)], name = p.name.replace(/^The /, 'the ');
  return { speaker: who[Math.floor(Math.random() * who.length)], text: LINES[d.region](name, bearingName(p.x - pier.x, p.z - pier.z)), story: true, rumour: true };
}
