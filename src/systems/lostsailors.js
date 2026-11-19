// The sailors who went mad (CANON 2026-11-12): the other berth, whose hook, who dug first. Previous sailors, gone mad and vanished
// somewhere in the dread, a never-ending nightmare. In deep dread (stage 4 and up) you may meet each of them once, never named:
// a man on a wreck waiting for his stop, a rowboat with a cut line, a man digging on a black sandbar. They come as signs at sea
// (sighting.js shows them; they are never drawn from the random deck). Meeting one is a clue (clues.js, region 'deep', question 3)
// that answers the small wrong thing near home. Nothing explains them.
import { rt } from '../core/runtime.js';
import { state } from '../core/state.js';
import { markSeen } from '../clues.js';

const met = (id, clue) => { (state.story.lost = state.story.lost || {})[id] = state.dayN; markSeen(state, clue); };
// Since 2026-11-19 (owner: "lost sailors should become a thing, remove the choice cards") they are things on the water, not cards:
// no [E], no choice. Sailing within SEEN_R is meeting them: one line, once, and the clue. Each keeps one small behaviour of its own,
// shown, never told (sighting.js): the wreck stays no further off as you sail away; the line slides back over the side as you pass;
// the sand runs back into the hole. Drafts for the writer (docs/LORE_TO_WRITE.txt).
export const SEEN_R = 30;
export const LOST_CARDS = {
  lost_berth: { id: 'lost_berth', lost: true, clue: 'CL-X1-berth',
    line: 'A wreck lies over on the swell. On the dry side of the deck a man sits on his trunk, a ticket in his hand, watching the water for his harbour. The ticket is for two berths.',
    after: 'When you look back, the wreck is no further off than before.' },
  lost_hook: { id: 'lost_hook', lost: true, clue: 'CL-X2-hook',
    line: 'A rowboat with nobody in it. Over the side a fishing line hangs straight down, cut clean a hand above the water. The knot is the old kind, for a bronze hook.',
    after: 'The line twitches once as you pass.' },
  lost_dig: { id: 'lost_dig', lost: true, clue: 'CL-X3-hole',
    line: 'A sandbar of black sand, where the chart says deep water. A man is digging. Every spadeful he lifts out, the sand runs back in. "Nearly there," he tells the hole.',
    after: 'The sound of the spade follows you a long way over the water.' },
};
/** sighting.js: the ship has come within SEEN_R of one */
export function lostSeen(card) { met(card.id, card.clue); }
const ORDER = ['lost_berth', 'lost_hook', 'lost_dig'];
const LOST_FROM = 0.6;   // "stage 4 and up" (CANON 2026-11-12): the fourth stage starts at 0.6 (palette.js stageOf); it was 0.75 until 2026-11-15
rt.lostT = 90;   // seconds of deep dread before the next one may show

/** each frame at sea (full game). ctx: { dt, dread, sighting, ship, world, quiet } */
export function lostTick({ dt, dread, sighting, ship, world, quiet }) {
  if (dread < LOST_FROM || quiet || sighting.cur) return;
  rt.lostT -= dt; if (rt.lostT > 0) return;
  const lost = state.story.lost || {}, next = ORDER.find((id) => lost[id] === undefined);
  if (!next) return;
  rt.lostT = 240 + Math.random() * 180;   // four to seven minutes apart; one left behind may come back later
  sighting.spawn(LOST_CARDS[next], ship, world, 38, 0.35);   // close (deep-dread fog) and off the bow, where its lantern can be seen
}
