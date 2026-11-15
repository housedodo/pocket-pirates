// Home is gentle (task L4; CANON section 2: "Tama is home because it is where the sleeper is kept gentle: the bells ring softly").
// Two things, no text: inside Home Sound the dark a low throw brings is not felt (it comes back as you sail out past the Sound),
// and while Tama's noon bell swings, the swell within the bell's reach lies down. An ordinary reading for both: home waters
// are sheltered, and it is the slack of noon. The first is a full-game rule (the demo has no throw-dread at all); the second is
// only cosy, so the demo has it too.
import { smoothstep } from '../util.js';
import { rt } from '../core/runtime.js';

export const HOME_R = 450, HOME_OUT = 600;   // Home Sound's edge (palette.js STRATA S0), and where a low throw is fully felt again
export const BELL_REACH = 260;               // how far Tama's noon bell carries (main.js noonBells)
const CALM = 0.6;                            // how much of the swell lies down at the height of the stroke

rt.homeCalm = 0;   // 0..1: the noon hush on the water near Tama

/** the dread a throw adds, as felt at this distance from home: a low throw (shift > 0) is not felt inside Home Sound. Composes at
 *  the dread target line in main.js like lullDread: a pure function of the shift. A good throw's ease (shift < 0) is untouched. */
export function homeShift(shift, dist) { return shift > 0 ? shift * smoothstep(HOME_R, HOME_OUT, dist) : shift; }

/** each frame: the hush rises while Tama's bell swings and the ship is within its reach, and lets go slowly after */
export function homeTick({ dt, tamaDist, ringing }) {
  const on = ringing && tamaDist < BELL_REACH;
  rt.homeCalm += ((on ? 1 : 0) - rt.homeCalm) * Math.min(1, dt * (on ? 1.2 : 0.4));
}

/** a look modifier (after the weather): the swell lies down with the hush */
export function homeLook(stage) { if (rt.homeCalm > 0.001) stage.wave *= 1 - CALM * rt.homeCalm; }
