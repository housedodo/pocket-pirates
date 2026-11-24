// Spice (owner, 2026-11-24: "crew specializing (finding special spices)", "spices are only available in specific spots"). Found ashore,
// never bought, and only with the herbalist aboard (systems/hands.js, Old Tansy), who knows them from the water as you pass:
//   pepper    jungle isles in the Free Cays' water
//   saffron   the Mangroves (systems/shallows.js), from the boat
//   clove     the Tide Rocks, at the bottom of the tide, from the boat
//   blue salt any shore of the Drowned water (it sells for a fortune, and nobody asks where it came from)
// E near the place: a short search; a crate or two into the hold (trade.js, it takes hold room), and the place grows back in SPICE_REGROW
// days (state.story.spiceAt[key] = day). Full game only.
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { toast } from '../ui/dom.js';
import { handOn } from './hands.js';
import { cargo, carried, room, GOODS } from './trade.js';
import { shallowsState } from './shallows.js';
import { tideAt } from './calendar.js';

export const SPICE_REGROW = 3, SPICE_NOSE = 70, SPICE_NEAR = 16;
const at = () => state.story.spiceAt || (state.story.spiceAt = {});
const ready = (key) => at()[key] == null || state.dayN - at()[key] >= SPICE_REGROW;
const TANSY = { pepper: 'Pepper. On that one. You can smell it from here.', saffron: 'In the roots. Saffron, the wild kind. Take the boat in.', clove: 'Cloves on the rocks, when the water goes down. Wait for the bottom of the tide.', bluesalt: 'Blue salt on that shore. I would not ask where it comes from.' };
/** what spice is to be had near (x, z) and where: { key, spice, x, z } or null */
function spiceNear(x, z, R) {
  const isl = G.world && G.world.nearest(x, z, R);
  if (isl && !isl.desc.lm && isl.desc.type !== 'harbour') {
    const d = isl.desc;
    if (d.region === 'free' && d.type === 'jungle') return { key: 'isl:' + d.id, spice: 'pepper', x: d.x, z: d.z, isl: true };
    if (d.region === 'drowned') return { key: 'isl:' + d.id, spice: 'bluesalt', x: d.x, z: d.z, isl: true };
  }
  for (const g of shallowsState().groups) {
    const dd = Math.hypot(x - g.x, z - g.z);
    if (g.id === 'mangrove' && dd < R + 20) return { key: 'grp:mangrove', spice: 'saffron', x: g.x, z: g.z, boat: true };
    if (g.id === 'tide' && dd < R + 20) return { key: 'grp:tide', spice: 'clove', x: g.x, z: g.z, boat: true, low: true };
  }
  return null;
}
/** each frame: the herbalist names a spice place as it comes into view, once a day per place */
const noted = {};
export function spiceTick() {
  if (!handOn('spicer') || !G.ship) return;
  const s = spiceNear(G.ship.pos.x, G.ship.pos.z, SPICE_NOSE);
  if (!s || !ready(s.key) || noted[s.key] === state.dayN) return;
  noted[s.key] = state.dayN;
  toast(`Tansy, at the rail: "${TANSY[s.spice]}"`, false, 6000);
}
/** interact.js: the E target, or null */
export function spiceInteract() {
  if (!handOn('spicer') || !G.ship) return null;
  const s = spiceNear(G.ship.pos.x, G.ship.pos.z, s0());
  if (!s || !ready(s.key)) return null;
  if (s.boat && !rt.boat) return null;
  if (s.low && tideAt() > -0.35) return null;
  return { kind: 'spice', key: 'spice:' + s.key, sp: s, prompt: `[E] Look for ${GOODS[s.spice].one}` };
}
const s0 = () => (rt.boat ? 30 : SPICE_NEAR);
export function spiceAct(tg) {
  if (rt.dig) return;
  rt.dig = { key: tg.key, t: 0, label: 'Tansy goes looking...', need: 4, done: () => {
    const s = tg.sp, n = 1 + (Math.random() < 0.5 ? 1 : 0), free = room() - carried();
    at()[s.key] = state.dayN;
    if (free <= 0) { toast('Tansy comes back with her arms full, and there is no room in the hold for any of it.', false, 5000); return; }
    const got = Math.min(n, free); cargo()[s.spice] = (cargo()[s.spice] || 0) + got;
    state.stats.spice = (state.stats.spice || 0) + got;
    toast(`Tansy comes back with ${got === 1 ? 'a crate' : 'two crates'} of ${GOODS[s.spice].one}. (${carried()} of ${room()} in the hold)`, false, 5000);
    G.audio.play('treasure');
  } };
}
