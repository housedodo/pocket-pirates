// R.'s letters (owner, 2026-11-19, T7: a first batch of sources for the questions that could not be understood without luck; drafts
// for the owner to refine, docs/LORE_TO_WRITE.txt). R. is the one who threw the hut's bottles (stays an initial, L-36 A). After the
// first throw, a bottle picked up in a water whose letter has not been found yet is that letter, one time in LETTER_P. Any order.
// The letter is the note and the clue at once: one line in the Ship's book, under the water it was found in, nothing else.
//   Reef: Q5 (why is Tama home)  Crown: Q7 (can it end)  Free Cays: Q1 (who counts)  Drowned: Q2 (what is under the sea)
import { state } from '../core/state.js';
import { CLUE, markSeen, hasSeen } from '../clues.js';

export const LETTER_P = 0.35;
const BY_WATER = { reef: 'CL-RL-reef', crown: 'CL-RL-crown', free: 'CL-RL-free', drowned: 'CL-RL-drowned' };

// Lore connection C (2026-11-19, docs/proposals/LORE_CONNECTIONS.md): R. may be the sailor before you, or you. Shown two ways, never said:
//   - the hand drifts: each letter found is signed less like R. (whichever water it is found in), and the last is not signed at all;
//   - two harbourmasters disagree about when R. came through (rGreeting), once each, after a letter has been found.
const SIGN = [' - R.', ' - R', ' R', ''];
const found = () => Object.values(BY_WATER).filter((id) => hasSeen(state, id)).length;
/** a bottle picked up in water `region`: R.'s letter for it (marked seen), or null */
export function rLetter(region) {
  const id = BY_WATER[region];
  if (!id || !(state.hut && state.hut.rolls && state.hut.rolls.length) || hasSeen(state, id) || Math.random() >= LETTER_P) return null;
  const n = found();
  if (!markSeen(state, id)) return null;
  return CLUE[id].line.replace(/ - R\.$/, SIGN[Math.min(n, SIGN.length - 1)]);
}
export const R_SAID = [
  { speaker: 'harbourmaster', text: 'R.? Came through last week. Asked after you, I think.' },
  { speaker: 'harbourmaster', text: 'R.? That was before my grandmother. Before the lamps, even.' },
];
/** docking: one of the two harbourmasters, once each, at different harbours, after R.'s first letter; or null */
export function rGreeting(d) {
  if (!found() || Math.random() >= 0.3) return null;
  const st = state.story, said = st.rSaid || (st.rSaid = {});
  const i = said[0] === undefined ? 0 : said[1] === undefined && said[0] !== d.id ? 1 : -1;
  if (i < 0) return null;
  said[i] = d.id;
  return { ...R_SAID[i], story: true };
}
