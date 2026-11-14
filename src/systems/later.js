// Story delays on the game's own clock (task R7). `after(seconds, fn)` runs fn once that many seconds of sailing have passed:
// rt.tNow stands still while a menu is open, so pausing for a minute delays a pending line by a minute. Nothing fires while a
// menu is open, and by default nothing fires inside the quiet window round the hut and the diver (eventQuiet): it waits.
// For delays that belong to an open screen (a harbour's own lines, a letter, an animation) keep the wall clock: they are
// shown where they happen (RULES 19). Pending delays are not saved; a reload drops them, as it always did.
import { rt, G } from '../core/runtime.js';

const Q = [];

/** run fn after `seconds` of game time. opts.quiet === false: it may land inside the quiet window (a line that answers the quiet itself) */
export function after(seconds, fn, opts = {}) {
  Q.push({ at: rt.tNow + seconds, fn, quiet: opts.quiet !== false });
}

/** each frame, after the clock: whatever is due, and allowed now, runs; the rest waits */
export function laterTick() {
  if (!Q.length || rt.modal) return;
  const quiet = G.eventQuiet();
  for (let i = 0; i < Q.length; i++) {
    const e = Q[i];
    if (rt.tNow < e.at || (e.quiet && quiet)) continue;
    Q.splice(i--, 1);
    e.fn();
    if (rt.modal) return;   // the line opened a menu: the rest wait until it is closed
  }
}

/** for tests: how many delays are waiting */
export const laterPending = () => Q.length;
