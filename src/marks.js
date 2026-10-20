import { hash2 } from './util.js';

// MULTIPLE PATHS (Story Bible): the seven threads, the Tide that wakes some of them, and the Marks they leave on the captain.
// Pure data and two tiny functions, so the log, the title screen and the game can all use it.
export const THREAD_DEFS = [
  { id: 'bell', name: 'The Drowned Bell', built: false, note: 'listening for a bell under a wreck' },
  { id: 'coin', name: "The Ferryman's Coin", built: false, note: 'a passenger who pays with a worn coin' },
  { id: 'colour', name: 'The Colour', built: true, note: 'a stain on the water, bright fish, a spring to seal' },
  { id: 'hollow', name: 'The Hollow Harbour', built: false, note: 'a harbour that is far too friendly' },
  { id: 'music', name: 'The Music out of the Fog', built: false, note: 'three notes from a house that is not there' },
  { id: 'house', name: 'The Strange High House', built: false, note: 'a lamp that never goes out, and bargains' },
  { id: 'captain', name: 'The Other Captain', built: false, note: 'a ship like yours with the wrong colours' },
];
export const THREAD_IDS = THREAD_DEFS.map((t) => t.id);

/** The Tide of Threads: the voyage's seed wakes 3 of the 7. The same seed always wakes the same three. */
export function pickAwake(seed, n = 3) {
  return THREAD_IDS.map((id, i) => ({ id, k: hash2(seed, i + 3, 77) })).sort((a, b) => a.k - b.k || (a.id < b.id ? -1 : 1)).slice(0, n).map((o) => o.id);
}

/** Marks: hidden tags the world reads. Shown only as a line on the Standing page, in the world's own words. */
export const MARK_DEFS = {
  counted: { name: 'Counted', line: 'Somebody keeps count of you.' },
  called: { name: 'Called', line: 'Something has learned your name, and does not say it.' },
  owed: { name: 'Owed', line: 'You owe, and they know exactly what.' },
  salt: { name: 'Salt-marked', line: 'There is salt in your coat that no washing takes out.' },
  quiet: { name: 'Quiet', line: 'You are quieter than you were.' },
};
export const markLines = (marks) => Object.keys(MARK_DEFS).filter((k) => marks && marks[k]).map((k) => MARK_DEFS[k].line);
