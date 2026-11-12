// The sailors who went mad (CANON 2026-11-12): the other berth, whose hook, who dug first. Previous sailors, gone mad and vanished
// somewhere in the dread, a never-ending nightmare. In deep dread (stage 4 and up) you may meet each of them once, never named:
// a man on a wreck waiting for his stop, a rowboat with a cut line, a man digging on a black sandbar. They come as signs at sea
// (sighting.js shows them; they are never drawn from the random deck). Meeting one is a clue (clues.js, region 'deep', question 3)
// that answers the small wrong thing near home. Nothing explains them.
import { rt } from '../core/runtime.js';
import { state } from '../core/state.js';
import { markSeen } from '../clues.js';

const met = (id, clue) => { (state.story.lost = state.story.lost || {})[id] = state.dayN; markSeen(state, clue); };
export const LOST_CARDS = {
  lost_berth: { id: 'lost_berth', icon: 'talk', title: 'A Wreck, Lying Over', dark: true,
    text: 'A wreck lies over on the swell. On the dry side of the deck a man sits on his trunk, ticket in his hand, watching the water for his harbour. The ticket is for two berths.',
    choices: [
      { label: 'Ask him where he is going', go: () => { met('lost_berth', 'CL-X1-berth'); return 'He looks past you, at the water. "Is this my stop?" He does not wait for an answer. When you look back, the wreck is no further off than before.'; } },
      { label: 'Sail on', go: () => { met('lost_berth', 'CL-X1-berth'); return 'He does not look up. When you look back, the wreck is no further off than before.'; } }] },
  lost_hook: { id: 'lost_hook', icon: 'fish', title: 'A Rowboat, Line Out', dark: true,
    text: 'A rowboat drifts with its oars shipped and nobody in it. Over the side a fishing line hangs straight down into the dark, cut clean a hand above the water. The knot is the old kind, for a bronze hook.',
    choices: [
      { label: 'Haul the line in', go: () => { met('lost_hook', 'CL-X2-hook'); return 'It does not end. You let it go, and it slides back over the side, all of it, as if something below were still taking it in.'; } },
      { label: 'Sail on', go: () => { met('lost_hook', 'CL-X2-hook'); return 'The line twitches once as you pass.'; } }] },
  lost_dig: { id: 'lost_dig', icon: 'pip', title: 'A Black Sandbar', dark: true,
    text: 'A sandbar of black sand, where the chart says deep water. A man is digging. The hole is deeper than he is tall. Every spadeful he lifts out, the sand runs back in.',
    choices: [
      { label: 'Call out to him', go: () => { met('lost_dig', 'CL-X3-hole'); return 'He does not look up. He says, to the hole, "Nearly there." He has been saying it a long time.'; } },
      { label: 'Sail on', go: () => { met('lost_dig', 'CL-X3-hole'); return 'The sound of the spade follows you a long way over the water.'; } }] },
};
const ORDER = ['lost_berth', 'lost_hook', 'lost_dig'];
rt.lostT = 90;   // seconds of deep dread before the next one may show

/** each frame at sea (full game). ctx: { dt, dread, sighting, ship, world, quiet } */
export function lostTick({ dt, dread, sighting, ship, world, quiet }) {
  if (dread < 0.75 || quiet || sighting.cur) return;
  rt.lostT -= dt; if (rt.lostT > 0) return;
  const lost = state.story.lost || {}, next = ORDER.find((id) => lost[id] === undefined);
  if (!next) return;
  rt.lostT = 240 + Math.random() * 180;   // four to seven minutes apart; one left behind may come back later
  sighting.spawn(LOST_CARDS[next], ship, world, 38, 0.35);   // close (deep-dread fog) and off the bow, where its lantern can be seen
}
