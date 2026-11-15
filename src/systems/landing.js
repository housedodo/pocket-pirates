// A low throw lands somewhere (task L2, a trial behind ?landing=1; CANON section 2: "Each low throw is a moment it nearly woke; the world
// pays for it somewhere"; question 4). On a low throw one harbour the ship is not at is chosen and written on the throw (rolls[i].where).
// For two days that harbour's fishing boat goes out and does not come back, its quay is empty, and only its prices rise; the cost no
// longer lands on the player everywhere. Nobody says why. Full game only. Home (Tama) is never chosen: home is where it is kept gentle.
import { params, DEMO } from '../core/config.js';
import { hash2 } from '../util.js';

export const LANDING = !DEMO && params.has('landing');
const DAYS = 1;   // the day of the throw and the next

/** on a low throw (hut.js onFail, after the roll is recorded): choose where it lands and write it on the throw */
export function landThrow(state, shipPos) {
  if (!LANDING || !state.hut || !state.hut.rolls.length) return null;
  const roll = state.hut.rolls[state.hut.rolls.length - 1];
  const ids = Object.entries(state.discovered || {}).filter(([id, o]) => o && o.type === 'harbour' && id !== '0,-1' && Math.hypot(o.x - shipPos.x, o.z - shipPos.z) > 150).map(([id]) => id).sort();
  if (!ids.length) return null;
  roll.where = ids[Math.abs(hash2(state.seed, state.dayN, state.hut.rolls.length)) % ids.length];
  return roll.where;
}

/** is this harbour where a low throw landed, today or yesterday? */
export function landedAt(state, id) {
  if (!LANDING || !state.hut) return false;
  return state.hut.rolls.some((r) => r.where === id && r.n < 10 && state.dayN - r.day <= DAYS);
}
