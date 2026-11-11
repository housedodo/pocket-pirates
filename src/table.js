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
  if (level(state, 3) >= 3) out.push({ id: 'sit', label: 'Walk round and sit in the other chair' });
  if (st.kept || rolls.length <= 1) out.push({ id: 'leave', label: 'Push your chair in and go back to the boat' });
  return out;
}
export const ENDINGS = {
  sleep: { title: 'THE LONG SLEEP', lines: ['Twenty.', 'She closes the book. For the first time she looks up, and it is only an old woman, very tired.', 'The sea breathes out. It will be a hundred years.'] },
  dreams: { title: 'GOOD DREAMS', lines: ['She writes the number and blots it.', 'Far across the water two instruments find each other for a bar.', 'The sea stays blue. Mara is already talking about supper.'] },
  rises: { title: 'SHE RISES', dark: true, lines: ['She writes the number. Then she puts the pen down.', 'Under the table, under the sand, under the sea, something that was lying still is not.'] },
  tune: { title: 'THE TUNE IS KEPT', lines: ['You hum the eight bars. Your voice is not good. It does not matter.', 'The die stays where it is. The pen stops.', 'Far off, a violin answers. It always did need two.', 'Nobody throws tonight.'], mara: 'I suppose one of us ought to learn the guitar.' },
  leave: { title: 'THE UNSEEN THROW', lines: ['You push the chair in and walk back down the sand.', 'Nobody calls after you. Behind you a pen starts again, on a new line.', 'There is a blank in the book where your number would be. It will stay there.'] },
  sit: { title: 'YOUR SEAT', dark: true, lines: ['You walk round the table and sit in the other chair. It is warm.', 'The book is in front of you. The pen is in your hand. You know every name in it.', 'Across the table Mara sits down, slowly. She does not ask.', 'A die waits on the wood.'] },
};

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
