// Hearing of the hut (owner, 2026-11-19, T2: "add more gossips, bottles etc so there are multiple sources to hear about it").
// Before, only one fisher on a pier, and only while the "Ask around" goal was open, could tell the captain where the hut is. Now,
// once the bottles have started talking (the `bottles` goal reached; the chapter fog still decides how far the ship can go, T1),
// the word can come from any of these, whichever the captain meets first:
//   - a voice on the pier of any harbour but Tama: certain while "Ask around" is open, now and then before it (PIER_P);
//   - a bottle at sea, once the bottles goal is done and the hut is still unknown;
//   - a passenger, now and then (PASSENGER_P).
// Each tells the way (a bearing, never a number), and the hut goes on the chart as before (revealHut). Told once: the first source
// wins and the others fall silent. The lines are drafts for the writer (docs/WRITER_TODO.txt 4.7). RULES 6: they make the hut known,
// so they may name it; none says "she" or a number.
import { state } from '../core/state.js';
import { G } from '../core/runtime.js';
import { bearingName } from '../jobs.js';
import { goalReached } from '../objectives.js';
import { revealHut } from './storybeats.js';

export const PIER_P = 0.35;       // a voice on the pier says it before "Ask around" is open
export const PASSENGER_P = 0.12;  // a passenger's line is this one

const PIER = [
  { speaker: 'fisher', text: (w) => `The black hut? Out past the ${w} water. There is a table, they say.` },
  { speaker: 'netmender', text: (w) => `Everybody asks about the black hut, sooner or later. It is ${w} of here.` },
  { speaker: 'oldsalt', text: (w) => `There is a hut out ${w}. Black boards. Somebody always home. We row round it.` },
  { speaker: 'innkeeper', text: (w) => `Out ${w} there is a hut with a light in it. Nobody built it, that I know of.` },
];

/** may the word be heard now? */
export const hutHearable = () => !!G.world.hutDesc && !state.story.hutKnown && goalReached(state, 'bottles');
const wayFrom = (x, z) => bearingName(G.world.hutDesc.x - x, G.world.hutDesc.z - z);
function told(how) { state.story.hutKnown = true; state.story.hutHeard = how; revealHut(); }

/** docking at harbour d (not Tama): a pier voice that tells the way, or null. `sure` while "Ask around" is the goal. */
export function pierWord(d, sure) {
  if (d.id === '0,-1' || !hutHearable() || (!sure && Math.random() >= PIER_P)) return null;
  const p = PIER[Math.abs((d.seed | 0) + state.dayN) % PIER.length];
  told('pier');
  return { speaker: p.speaker, text: p.text(wayFrom(d.x, d.z)), dark: true, story: true };
}
/** a bottle picked up at sea: its note when it carries the way, or null (the bottles goal itself keeps its own three notes) */
export function bottleWord() {
  if (!hutHearable() || !goalReached(state, 'gossip')) return null;
  told('bottle');
  return `The hut is ${wayFrom(0, 0)} of Tama, past where the water goes dark. Black boards, one window lit. Do not knock twice. - R.`;
}
/** a passenger's line that tells the way, or null */
export function passengerWord(x, z) {
  if (!hutHearable() || Math.random() >= PASSENGER_P) return null;
  told('passenger');
  return `I will not go near the black hut, before you ask. It is ${wayFrom(x, z)} of here. I am only saying so you do not go by accident.`;
}
