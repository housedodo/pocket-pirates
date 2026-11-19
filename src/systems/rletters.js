// R.'s letters (owner, 2026-11-19, T7: a first batch of sources for the questions that could not be understood without luck; drafts
// for the owner to refine, docs/LORE_TO_WRITE.txt). R. is the one who threw the hut's bottles (stays an initial, L-36 A). After the
// first throw, a bottle picked up in a water whose letter has not been found yet is that letter, one time in LETTER_P. Any order.
// The letter is the note and the clue at once: one line in the Ship's book, under the water it was found in, nothing else.
//   Reef: Q5 (why is Tama home)  Crown: Q7 (can it end)  Free Cays: Q1 (who counts)  Drowned: Q2 (what is under the sea)
import { state } from '../core/state.js';
import { CLUE, markSeen, hasSeen } from '../clues.js';

export const LETTER_P = 0.35;
const BY_WATER = { reef: 'CL-RL-reef', crown: 'CL-RL-crown', free: 'CL-RL-free', drowned: 'CL-RL-drowned' };

/** a bottle picked up in water `region`: R.'s letter for it (marked seen), or null */
export function rLetter(region) {
  const id = BY_WATER[region];
  if (!id || !(state.hut && state.hut.rolls && state.hut.rolls.length) || hasSeen(state, id) || Math.random() >= LETTER_P) return null;
  return markSeen(state, id) ? CLUE[id].line : null;
}
