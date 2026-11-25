// News goes stale (owner, 2026-11-25: "do 3 and 5"; Pirates! 1987: after an event a town reads "no information available" until you
// visit or a traveller in the tavern sells you news). What the chart says of a harbour (smoke over the roofs, a yellow flag, busy,
// thinning) is what you last knew: seen from the sea, found on docking, or heard from a ship you hailed, with how long ago. It is never
// updated by itself. In deep water a hailed ship's news is dated tomorrow.
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { plentyLevel, eventOf } from './harbours.js';

const DEMO = () => typeof window !== 'undefined' && window.__BUILD === 'demo';
export const SEE_R = 260;   // a harbour's smoke, flags and quay can be made out from this far (world units, from its middle)
const book = () => state.story.news || (state.story.news = {});
const now = () => (state.dayN || 0) + (state.time || 0);
/** write down what harbour d is like now: how = 'seen' | 'docked' | 'heard'; at = when it was so (defaults to now) */
export function learn(d, how, at = now()) {
  if (DEMO() || !d || d.type !== 'harbour') return;
  book()[d.id] = { at, plenty: plentyLevel(d), event: eventOf(d), how };
}
/** every second or so (main.js): harbours in sight are seen as they are */
let acc = 0;
export function newsTick(dt) {
  if (DEMO() || !G.world || !G.ship || rt.boat) return;
  acc += dt; if (acc < 1) return; acc = 0;
  const S = G.ship.pos, B = book();
  for (const isl of G.world.islands.values()) {
    const d = isl.desc; if (d.type !== 'harbour' || !state.discovered[d.id]) continue;
    if (Math.hypot(d.x - S.x, d.z - S.z) > SEE_R) continue;
    const b = B[d.id]; if (b && b.how === 'docked' && now() - b.at < 0.05) continue;   // keep "docked" for the moment you were there
    learn(d, 'seen');
  }
}
const EVENT = { fire: 'smoke over the roofs', fever: 'a yellow flag at the pier', blockade: 'a boom across the mouth', feast: 'bunting out' };
const PLENTY = { 3: 'thriving', 2: 'busy', 1: 'doing well enough', 0: 'nothing out of the way', [-1]: 'thinning', [-2]: 'half empty' };
function ago(at) {
  const d = Math.floor(now()) - Math.floor(at);
  if (d < 0) return 'dated tomorrow';
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : d < 7 ? `${d} days ago` : d < 14 ? 'last week' : 'weeks ago';
}
/** the chart card's line for harbour d, or null if you know nothing of it */
export function newsLine(d) {
  const b = !DEMO() && d && book()[d.id]; if (!b) return null;
  const what = b.event ? EVENT[b.event] : PLENTY[b.plenty] || PLENTY[0];
  const how = b.how === 'heard' ? 'Heard' : b.how === 'docked' ? 'Ashore' : 'Seen';
  const when = ago(b.at);
  return when === 'dated tomorrow' ? `${how}, dated tomorrow: ${what}` : `${how} ${when}: ${what}`;
}
/** a hailed ship's harbour news (ui/shiptrade.js): up to two known harbours near her, as they were when she left them; a line, or null */
export function hailNews(sh, rng) {
  if (DEMO()) return null;
  const B = book(), deep = (rt.dread || 0) >= 0.55;
  const near = Object.keys(state.discovered).map((id) => { const [cx, cz] = id.split(',').map(Number); return G.world.desc(cx, cz); })
    .filter((d) => d && d.type === 'harbour' && !(B[d.id] && now() - B[d.id].at < 0.5))
    .sort((a, b) => Math.hypot(a.x - sh.x, a.z - sh.z) - Math.hypot(b.x - sh.x, b.z - sh.z)).slice(0, 2);
  if (!near.length) return null;
  const parts = near.map((d) => {
    const days = deep ? -1 : 1 + Math.floor(rng() * 3);
    learn(d, 'heard', now() - days);
    const b = B[d.id], what = b.event ? EVENT[b.event] : PLENTY[b.plenty] || PLENTY[0];
    return deep ? `${d.name}, tomorrow: ${what}` : `${d.name}, ${days === 1 ? 'yesterday' : days + ' days back'}: ${what}`;
  });
  return parts.join('. ') + '.';
}
