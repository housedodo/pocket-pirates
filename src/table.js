// The Table by the Water: where the voyage can end (docs/STORY_EXPLORATION.txt X13, docs/WORLD_REDESIGN.md 6.6).
// One table, one die, and up to four things to do. What the captain may do depends on what the voyage has shown them;
// a captain who saw nothing still has the die and gets a real ending. Only "Hum the tune" is gentle, and it needs no throw.
// Also here: Mara's village coming back to her, a piece at a time (the writer's decision: she remembers, slowly).
import { isKnown, hasSeen, level, regionsSeen, d3Open } from './clues.js';

/** the book's thumb on the scale: every earlier throw counts a little (high ones lift, low ones weigh), never more than 3 either way;
 *  the Kestrel's lamp keeps half of the weight off */
export function bookWeight(state) {
  const rolls = (state.hut && state.hut.rolls) || [];
  let w = 0; for (const r of rolls) w += r.n >= 11 ? 1 : r.n <= 9 ? -1 : 0;
  w = Math.max(-3, Math.min(3, Math.round(w / 2)));
  return w < 0 && isKnown(state, 'lamp') ? Math.ceil(w / 2) : w;
}
/** the last throw: the face that came up, what the book makes of it, and which ending that is */
export function finalThrow(state, n) {
  const w = n === 20 || n === 1 ? 0 : bookWeight(state), total = Math.max(1, Math.min(20, n + w));
  return { n, w, total, end: total >= 20 ? 'sleep' : total >= 10 ? 'dreams' : 'rises' };
}
/** what can be done at the table, in the order it is offered */
export function tableOptions(state) {
  const st = state.story || {}, rolls = (state.hut && state.hut.rolls) || [], out = [];
  out.push({ id: 'throw', label: 'Throw the die' });
  if (isKnown(state, 'hum')) out.push({ id: 'tune', label: 'Hum the tune the two of them play' });
  if (!st.maraTried) out.push({ id: 'mara', label: 'Let Mara throw' });   // once: she cannot pick it up (CANON 2026-11-12); then the choices come back
  if (!st.asked && level(state, 1) >= 2) out.push({ id: 'ask', label: 'Ask her who counts' });   // once, when 'who counts' is understood: she writes YOU
  if (level(state, 3) >= 3) out.push({ id: 'sit', label: 'Walk round and sit in the other chair' });
  if (st.kept || rolls.length <= 1) out.push({ id: 'leave', label: 'Push your chair in and go back to the boat' });
  return out;
}
/** what goes into the Ship's book when the voyage ends, in another hand (drafts, 2026-11-13: the owner's to rewrite) */
export const EPILOGUE = {
  sleep: 'Logged: a twenty, at the table by the water. The sea has been quiet since.',
  dreams: 'Logged: a middling throw. That night the two of them were heard playing together, for one bar.',
  rises: 'Logged: a low throw. The next page is wet through.',
  tune: 'Logged: no throw. Somebody hummed. A violin answered.',
  leave: 'Logged: a blank line, left blank.',
  sit: 'Logged, in our own hand: the other chair is warm.',
};
// each ending is its card (endcards.js: the game's own scene at the Table, as pixel art) and one short line (owner 2026-11-18: "the end cards
// and then just a short ending description"; drafts for the writer)
export const ENDINGS = {
  sleep: { title: 'THE LONG SLEEP', lines: ['Twenty. She closes the book, and the sea breathes out. It will be a hundred years.'] },
  dreams: { title: 'GOOD DREAMS', lines: ['She writes the number and blots it. The sea stays blue.'] },
  rises: { title: 'SHE RISES', dark: true, lines: ['She puts the pen down. Under the sea, something that was lying still is not.'] },
  tune: { title: 'THE TUNE IS KEPT', lines: ['You hum the eight bars. Far off, a violin answers. Nobody throws tonight.'], mara: 'I suppose one of us ought to learn the guitar.' },
  leave: { title: 'THE UNSEEN THROW', lines: ['You push the chair in. There is a blank in the book where your number would be.'] },
  sit: { title: 'YOUR SEAT', dark: true, lines: ['You sit in the other chair. It is warm. The pen is in your hand.'] },
};

// ---- what the endings leave behind (owner, 2026-11-18; systems/endgame.js runs them). Every line here is a draft for the writer.
/** arriving at the table: the ritual's card (the old draft: "A table at the water's edge. One chair on this side, one on the other. A die, waiting.") */
export const ARRIVAL = 'Every candle on the table is lit. In the far chair someone sits very still, and waits. Your chair has been pulled out for you. The book lies open at a clean line, and the die waits on the wood beside a drawing in red. Whatever you do here will be written down.';
/** the drawing of the Edge on the wood (if the Edge was not gone over): its three questions are said, once, never written on it (owner 2026-11-18) */
export const EDGE_ASK = 'Mara looks at the drawing a long while, then says it under her breath, as if reading: "What is down there? Who is there? Why is it there?"';
/** back at the table after She Rises, once: Mara knows how it comes out (the throw then gives the same face as before) */
export const AGAIN = 'Mara, very quietly: "I am afraid it will not come out above nine."';
/** the game-over screen (She Rises, the Unseen Throw, Your Seat): no going on, only these two */
export const OVER = { again: 'Begin again', back: 'Go back to the table', go: 'Go on' };
/** The Tune Is Kept: the guitar waits on Tama's quay, wrapped, no note */
export const GUITAR = {
  what: 'Something left for you',
  where: "Tama's quay",
  found: 'On the quay, a long bundle in old sailcloth, tied with fishing line. No note. Nobody saw it come.',
  mara: 'Well, Captain. I did say one of us ought to learn.',
};
/** the Unseen Throw, a few minutes on: the world turns, wherever the ship is. Horror by taking away */
export const UNSEEN = {
  book: (n) => `Logged, on the blank line, in a small neat hand: ${n}.`,
  bookToast: 'The ship\'s book has fallen open at the blank line. It is not blank any more.',
  mara: 'Captain. Where has everybody gone?',
  end: ['The table is waiting on the water, a candle lit.', 'Your chair has been pulled out for you.', 'You sit down. Somebody has already thrown.'],
};
/** Your Seat: after the book, a ship you do not know comes in. The hut's first words (hut.js), from the other side of the table */
export const SEAT = [
  'A ship you have never seen comes in on the evening tide. Green sails, new paint.',
  'Someone ducks in at the door and stops. A table too big for the hut, one candle.',
  'They look a long while at the chair on your side, deep in the dark. You breathe, slow and patient.',
  '"Is it one throw a day?" they ask, too brightly. "I only heard about it at the last harbour."',
  'A yellowed twenty-sided die waits on the wood. You push it across.',
];

// ---- Mara's village: it comes back to her in four pieces, each some time after the thing that stirred it (never at once)
export const MARA_MEMORY = [
  { when: (s) => hasSeen(s, 'CL-C3-a') || hasSeen(s, 'CL-BELL-a'), line: 'We had a bell at home, Captain. Two strokes, every hour. I had forgotten the bell.' },
  { when: (s) => regionsSeen(s) >= 2, line: 'Our street ran down to the water. Down, not along. Odd thing to remember.' },
  { when: (s) => hasSeen(s, 'CL-D1-a'), line: 'The third house. The door was blue.' },
  { when: (s) => d3Open(s), line: 'I have the name of it now. I am not going to say it out loud. Not out here.' },
];
/** the next piece, if its time has come: returns the line (and moves her on), else null. `quiet`: she is free to speak; wait: seconds since the last piece */
export function maraRemembers(state, dt, quiet) {
  const st = state.story, i = st.maraMem || 0, m = MARA_MEMORY[i];
  if (!m || !m.when(state)) return null;
  st.maraWait = (st.maraWait || 0) + dt;
  if (st.maraWait < 90 || !quiet) return null;   // a minute and a half at sea after whatever stirred it
  st.maraMem = i + 1; st.maraWait = 0;
  return m.line;
}
