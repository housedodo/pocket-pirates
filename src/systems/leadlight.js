// The Halved Isle by light (owner, 2026-11-19: "build the halved isle by light"; first a trial, kept the same day with T4).
// A second way through the fog bank round the Halved Isle, beside the lens lantern (BARRIERS.broken in landmarks.js). Real pilots
// do this: a leading light marks a safe line, and you keep it on that line behind you.
//   - One Guild light near the bank is the leader (the nearest lit Guild light outside the bank, by the seed). At night its beam does
//     not turn: it lies still across the water and points into the fog, at the isle. That is what the player sees and wonders at.
//   - The leader flashes its own rhythm like every Guild light. Sailed close, the chart inks it (M-LANT-1, systems/lantern.js).
//   - In the fog, a ship on the leader's line (within LEAD_HALF of the bearing from the light to the isle) whose captain has its
//     rhythm on the chart keeps the helm: the fog thins along the line and the beam is seen through it, flashing that rhythm. Without
//     the rhythm the beam stops at the white (leadTick), so the player sees why they are lost.
//     Off the line, or without the rhythm, or by day, or with the light dead (relight it: interact.js), the fog takes the helm as before.
// Harder than the upgrade on purpose: night only, a lit leader, the rhythm learned first, a narrow line to hold under sail, and the
// lane is narrowest at the light's end. No text: nothing says any of this. Full game only.
import { state } from '../core/state.js';
import { G } from '../core/runtime.js';
import { DEMO } from '../core/config.js';
import { LM, BARRIERS } from '../landmarks.js';
import { CELL, hasLighthouse } from '../world.js';
import { lampDead } from '../regions.js';
import { nightKey } from './calendar.js';

export const LEAD_ON = !DEMO;   // was the trial ?leadlight=1; kept (owner, 2026-11-19: T4 "build all of them")
export const LEAD_HALF = 0.06;        // rad (about 3.4 degrees) either side of the line, in the fog: some 25 units wide at the bank
export const LEAD_SEEK = 520;         // the leader is the nearest Guild light within this of the isle, outside the bank

let leader;   // the leader's desc, or null; undefined until looked for (per seed)
let leaderSeed = null;
/** the leading light's island desc for this voyage's sea, or null */
export function leaderDesc() {
  if (leaderSeed === state.seed && leader !== undefined) return leader;
  leaderSeed = state.seed; leader = null;
  const b = LM.broken, R = BARRIERS.broken.R, n = Math.ceil(LEAD_SEEK / CELL), c0x = Math.round(b.x / CELL), c0z = Math.round(b.z / CELL);
  let best = null;
  for (let cz = c0z - n; cz <= c0z + n; cz++) for (let cx = c0x - n; cx <= c0x + n; cx++) {
    const d = G.world.desc(cx, cz);
    if (!d || d.lm || d.region !== 'lantern' || !hasLighthouse(d)) continue;
    const dist = Math.hypot(d.x - b.x, d.z - b.z);
    if (dist < R + 60 || dist > LEAD_SEEK) continue;
    if (!best || dist < best.dist) best = { d, dist };
  }
  leader = best ? best.d : null;
  return leader;
}
/** how far (radians) the point (x, z) lies off the leader's line into the bank; Infinity without a leader */
export function offLine(x, z) {
  const L = leaderDesc(); if (!L) return Infinity;
  const b = LM.broken, a1 = Math.atan2(b.z - L.z, b.x - L.x), a2 = Math.atan2(z - L.z, x - L.x);
  return Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1)));
}
/** is the leader burning now? (built, lit by night, not a dead light tonight) */
function leaderLit() {
  const L = leaderDesc(); if (!L) return false;
  const isl = G.world.islands.get(L.id);
  return !!(isl && isl.lit && !lampDead(state, L, nightKey()));
}
/** Places.tick asks this inside a fog bank the ship is not fitted for: does the ship keep the helm here? */
export function leadPass(lm, ship) {
  if (!LEAD_ON || lm !== 'broken') return false;
  const L = leaderDesc();
  if (!L || !(state.story.rhythm && state.story.rhythm[L.id]) || !leaderLit()) return false;
  if (offLine(ship.pos.x, ship.pos.z) > LEAD_HALF) return false;
  if (!state.story.leadUsed) state.story.leadUsed = state.dayN;   // kept, never read: for the owner's playtest notes
  return true;
}
/** once a frame (main.js): the leader's beam lies still and points at the isle (world.js reads isl.lead) */
export function leadTick() {
  if (!LEAD_ON) return;
  const L = leaderDesc(); if (!L) return;
  const isl = G.world.islands.get(L.id);
  if (!isl) return;
  if (!isl.lead) isl.lead = { x: LM.broken.x, z: LM.broken.z, short: false };
  // the rule is seen, not told: inside the bank, a captain who has not taken down this light's rhythm sees its beam stop at the white;
  // with the rhythm on the chart the beam carries on through the fog, and that is the road
  const p = G.ship.pos, inBank = Math.hypot(p.x - LM.broken.x, p.z - LM.broken.z) < BARRIERS.broken.R + 40;
  isl.lead.short = inBank && !(state.story.rhythm && state.story.rhythm[L.id]);
}
