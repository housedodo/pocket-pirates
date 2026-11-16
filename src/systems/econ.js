// The economy meter (G-25, docs/proposals/SYSTEMS_FEEL.md): behind ?econ=1 only. Never in the demo, never in the full playtest
// build (its URL flags are ignored, core/config.js). It watches the voyage's gold and books every gain to a source, read off what
// else changed in the same frame, so no system needs a call: a delivery (the job is gone), a passenger, a commission, salvage,
// a bounty, treasure, a place ashore, a relit light, fish, fruit, oil sold, a main or side goal's reward. Spending is booked as spent.
// Read it on the debug line (`) and as window.__game.econ; per hour means per hour of game time played (the clock stops in menus).
import { params, DEMO } from '../core/config.js';

export const ECON_ON = !DEMO && !!params.get('econ');
const SOURCES = ['delivery', 'passenger', 'commission', 'salvage', 'bounty', 'treasure', 'places', 'relight', 'fish', 'fruit', 'oil', 'goal', 'other'];
export const econ = { on: ECON_ON, secs: 0, earned: Object.fromEntries(SOURCES.map((k) => [k, 0])), spent: 0, perHour: {}, total: 0 };
let last = null;

const fruitN = (f) => Object.values(f || {}).reduce((a, b) => a + (+b || 0), 0);
function snap(s) {
  const st = s.stats || {}, sy = s.story || {};
  return {
    gold: s.gold || 0, job: s.job, pas: s.passenger, quests: (s.quests || []).length, comm: st.commissions || 0,
    wrecks: st.wrecks || 0, sunk: st.sunk || 0, bounty: sy.bounty || 0, loot: (s.loot || []).length,
    lm: JSON.stringify(sy.lm || {}), relit: JSON.stringify(sy.relit || {}), fish: (s.catch || []).length, fruit: fruitN(s.fruit),
    oil: s.oil || 0, goal: (s.goals && s.goals.i) || 0, side: Object.keys((s.goals && s.goals.side) || {}).length,
  };
}
function source(a, b) {   // what else changed with the gold, most telling first
  if (a.job && a.job !== b.job) return 'delivery';
  if (a.pas && a.pas !== b.pas) return 'passenger';
  if (b.comm > a.comm || b.quests < a.quests) return 'commission';
  if (b.wrecks > a.wrecks) return 'salvage';
  if (b.sunk > a.sunk || b.bounty < a.bounty) return 'bounty';
  if (b.loot > a.loot) return 'treasure';
  if (b.relit !== a.relit) return 'relight';
  if (b.lm !== a.lm) return 'places';
  if (b.goal > a.goal || b.side > a.side) return 'goal';   // a main or a side goal's reward
  if (b.fish < a.fish) return 'fish';
  if (b.fruit < a.fruit) return 'fruit';
  if (b.oil < a.oil - 1) return 'oil';
  return 'other';
}
/** once a frame, after everything that pays has run; dt in game seconds (0 in menus) */
export function econTick(state, dt) {
  if (!ECON_ON) return;
  const now = snap(state);
  econ.secs += dt;
  if (last) {
    const d = now.gold - last.gold;
    if (d > 0) econ.earned[source(last, now)] += d;
    else if (d < 0) econ.spent -= d;
  }
  last = now;
  const h = Math.max(1e-6, econ.secs / 3600);
  econ.total = Object.values(econ.earned).reduce((a, b) => a + b, 0);
  for (const k of SOURCES) econ.perHour[k] = Math.round(econ.earned[k] / h);
  econ.perHour.all = Math.round(econ.total / h);
}
/** one line for the debug readout */
export const econLine = () => (ECON_ON ? `  econ ${econ.perHour.all || 0}g/h (${Math.round(econ.secs / 60)} min) ` + SOURCES.filter((k) => econ.earned[k]).map((k) => `${k} ${econ.perHour[k]}`).join(' ') + `  spent ${econ.spent}` : '');
