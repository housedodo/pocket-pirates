// How a harbour is doing, and what is happening there (owner, 2026-11-25: "do 1, 2, 3 and 10"; docs/proposals/GAMES_RESEARCH.md).
//   plenty   -2..3 per harbour, seen in the village (world.js harbourState): your deliveries, visits, cargo sold there and help given
//            raise it; staying away lowers it (from 10 days, a little a day), trouble left unanswered scars it; in deep water it runs
//            backwards. Never a number: the quay, the market and the houses show it. The old growth layers follow it too.
//   events   now and then (a three-day window, seeded) a harbour has a fire, fever, a blockade or a feast, seen from the sea before
//            you dock (smoke, a yellow flag, ships across the mouth, bunting). Fire: lend the crew a morning. Fever: bring fruit.
//            Blockade: nobody comes out; a raider lies off the mouth, and when she is gone the harbour pays. Feast: better prices,
//            a glad crew. Help raises plenty and standing; Tama has only fires and feasts. Full game only.
//   reports  (Crown harbours) what you have found since your last report: isles charted, wrecks found, sketches in the Ship's book,
//            paid once, and written in their book. After the first throw, once, the clerk shows you they were there already.
//   lifeline any harbour, when the purse is nearly empty: a morning's plain work for a few coins, once a day there.
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { toast } from '../ui/dom.js';
import { hash2 } from '../util.js';
import { mark } from './standing.js';
import { pxi } from '../pixelui.js';
import { goalReached } from '../objectives.js';

const DEMO = () => typeof window !== 'undefined' && window.__BUILD === 'demo';
export const EVENT_DAYS = 3, EVENT_P = 18, NEGLECT_FROM = 21, NEGLECT_PER_DAY = 0.25, STEP_DAYS = 3;   // slow on purpose (owner, 2026-11-25: "make sure it does not change that fast, otherwise it would be a chore"): three weeks away before it starts, and the level moves one step every three days at most
export const PAY = { fire: 20, fever: 35, blockade: 45, island: 5, wreck: 25, sketch: 10, lifeline: 12 };
const idHash = (id) => { let h = 7; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0; return h; };

/** -2..3: how the harbour is doing */
let OVR = null;
/** tests and previews: force every harbour's plenty and event ({ plenty, event }), or null */
export const harbourOverride = (o) => { OVR = o; };
export function plentyLevel(d) {
  if (OVR) return OVR.plenty;
  const r = state.rep[d.id];
  let lv = 0;
  if (r) {
    const away = (state.dayN || 0) + (state.time || 0) - (r.last < 1e6 ? r.last : (state.dayN || 0));
    const sc = (r.deliveries || 0) * 2 + (r.visits || 0) + (r.sold || 0) * 0.5 + (r.helped || 0) * 4 - (r.scar || 0) * 2 - Math.max(0, away - NEGLECT_FROM) * NEGLECT_PER_DAY;
    const target = sc >= 20 ? 3 : sc >= 10 ? 2 : sc >= 4 ? 1 : sc >= -3 ? 0 : sc >= -8 ? -1 : -2;
    const P = state.story.plenty || (state.story.plenty = {}), m = P[d.id] || (P[d.id] = { lv: target, day: state.dayN || 0 });
    if (target !== m.lv && (state.dayN || 0) - m.day >= STEP_DAYS) { m.lv += Math.sign(target - m.lv); m.day = state.dayN || 0; }   // a step at a time
    lv = m.lv;
  }
  if (DEMO()) return Math.max(0, lv);
  const k = d.dread || 0;   // in deep water the growth runs backwards
  if (k >= 0.7) lv = Math.min(lv, 0) - 2; else if (k >= 0.55) lv = Math.min(lv, 0) - 1;
  return Math.max(-2, Math.min(3, lv));
}
const hev = () => state.story.hev || (state.story.hev = {});
/** the event at harbour d now ('fire' | 'fever' | 'blockade' | 'feast') or null */
export function eventOf(d) {
  if (OVR) return OVR.event;
  if (DEMO() || !d || !goalReached(state, 'harbour')) return null;
  const w = Math.floor((state.dayN || 0) / EVENT_DAYS), E = hev()[d.id];
  if (E && E.w === w) return E.done ? null : E.kind;
  if (E && !E.done && E.seen && state.rep[d.id]) state.rep[d.id].scar = (state.rep[d.id].scar || 0) + 1;   // trouble you saw and left: it marks the place
  const h = Math.abs(hash2(w, idHash(d.id), (state.seed || 1) + 313)) % 100;
  let kind = h < EVENT_P ? ['fire', 'fever', 'blockade', 'feast'][h % 4] : null;
  if (d.id === '0,-1' && (kind === 'fever' || kind === 'blockade')) kind = null;   // home has only fires and feasts
  hev()[d.id] = { w, kind, done: !kind };
  return kind;
}
const resolve = (d, kind, line, pay) => {
  const E = hev()[d.id]; if (!E) return; E.done = true;
  const r = state.rep[d.id]; if (r) r.helped = (r.helped || 0) + 1;
  mark(d.region, 2); if (pay) state.gold += pay;
  if (line) toast(line + (pay ? ` (+${pay} gold)` : ''), false, 7000);
  if (G.audio) G.audio.play('buy');
};
export const feastAt = (d) => eventOf(d) === 'feast';
/** docking (systems/interact.js): a blockade keeps you out (returns a line, and the harbour stays shut); otherwise null */
export function dockBlocked(d) {
  if (eventOf(d) !== 'blockade') return null;
  hev()[d.id].seen = true;
  spawnBlockader(d);
  return 'A boom of logs lies across the harbour mouth, and nobody comes out to lift it. Out past it a dark ship rides at anchor.';
}
/** the raider who holds the mouth: one at a time; when she is gone (sunk, struck, or fled) the blockade lifts */
function spawnBlockader(d) {
  if (!G.traffic) return;
  if (G.traffic.ships.some((s) => s.blockFor === d.id && !s.sinking)) return;
  const th = d.dockTh || 0, x = d.x + Math.cos(th) * ((d.r || 20) * 1.1 + 45), z = d.z + Math.sin(th) * ((d.r || 20) * 1.1 + 45);
  const s = G.traffic.spawnAt('schooner', 'reef', x, z, th + Math.PI / 2, 'live', 0.5, true);
  s.blockFor = d.id; s.name = 'Reef Brotherhood blockader';
}
/** each frame (main.js): a blockade lifts when her raider is gone */
export function harboursTick() {
  if (DEMO() || !G.traffic || !G.world) return;
  for (const [id, E] of Object.entries(hev())) {
    if (E.kind !== 'blockade' || E.done) continue;
    const s = G.traffic.ships.find((q) => q.blockFor === id);
    if (E.spawned && (!s || s.sinking || s.struck || !s.hostile)) {
      const [cx, cz] = id.split(',').map(Number), d = G.world.desc(cx, cz);
      if (d) resolve(d, 'blockade', `The boom at ${d.name} comes up. Boats are already putting out.`, 0), (E.owed = PAY.blockade);
    }
    if (s) E.spawned = true;
  }
}
// ---- the board (ui/harbour.js): the harbour's trouble, the customs house, a morning's work
const fruitCount = () => Object.values(state.fruit || {}).reduce((a, b) => a + b, 0);
export function harbourRows(d) {
  if (DEMO()) return '';
  let html = '';
  const ev = eventOf(d), E = hev()[d.id];
  if (ev && E) E.seen = true;
  if (E && E.owed) html += `<div class="sec">THE HARBOUR</div><div class="qrow"><div><b>${pxi('coin')} They remember who lifted the boom</b><br><small>the harbourmaster pays what was promised</small></div><button data-hb="owed">+${E.owed}g</button></div>`;
  if (ev === 'fire') html += `<div class="sec">FIRE</div><div class="qrow"><div><b>${pxi('crew')} Lend them your crew</b><br><small>a morning carrying water from the quay</small></div><button data-hb="fire">Go</button></div>`;
  if (ev === 'fever') html += `<div class="sec">FEVER</div><div class="qrow"><div><b>${pxi('mango')} Fruit for the sick</b><br><small>${fruitCount() >= 3 ? 'three of yours, left at the end of the pier' : 'they need three; you have ' + fruitCount()}</small></div><button data-hb="fever" ${fruitCount() >= 3 ? '' : 'disabled'}>Leave it</button></div>`;
  if (ev === 'feast') html += `<div class="sec">A FEAST</div><small>Somebody is getting married. Everything sells for a fifth more today, and the crew are ashore dancing.</small>`;
  if (d.region === 'crown') {   // the customs house
    const R = reportDue();
    if (R.pay > 0) html += `<div class="sec">THE CUSTOMS HOUSE</div><div class="qrow"><div><b>${pxi('letter')} Report what you have found</b><br><small>${R.text}</small></div><button data-hb="report">+${R.pay}g</button></div>`;
  }
  const L = state.story.lifeline || (state.story.lifeline = {});
  if (state.gold < 20 && L[d.id] !== state.dayN) html += `<div class="sec">WORK</div><div class="qrow"><div><b>${pxi('crate')} A morning's work</b><br><small>unloading a hull for the harbourmaster</small></div><button data-hb="work">+${PAY.lifeline}g</button></div>`;
  return html;
}
function reportDue() {
  const R = state.story.reported || { isl: 0, wrk: 0, sk: 0 };
  const isl = Object.keys(state.discovered || {}).length, wrk = [...(state.collected || [])].filter((k) => String(k).startsWith('fw:')).length, sk = Object.keys(state.story.sealog || {}).length;
  const n = { isl: Math.max(0, isl - R.isl), wrk: Math.max(0, wrk - R.wrk), sk: Math.max(0, sk - R.sk) };
  const parts = []; if (n.isl) parts.push(`${n.isl} ${n.isl === 1 ? 'isle' : 'isles'} charted`); if (n.wrk) parts.push(`${n.wrk} ${n.wrk === 1 ? 'wreck' : 'wrecks'}`); if (n.sk) parts.push(`${n.sk} ${n.sk === 1 ? 'sketch' : 'sketches'}`);
  return { pay: n.isl * PAY.island + n.wrk * PAY.wreck + n.sk * PAY.sketch, text: parts.join(', ') + ', for their book', now: { isl, wrk, sk } };
}
export function bindHarbourRows(pane, d, rerender) {
  pane.querySelectorAll('[data-hb]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.hb, E = hev()[d.id];
    if (k === 'owed' && E) { state.gold += E.owed; toast(`The harbourmaster counts out ${E.owed} gold. "For the boom."`, false, 5000); E.owed = 0; G.audio.play('treasure'); }
    if (k === 'fire') { state.time = Math.min(0.999, state.time + 2 / 24); resolve(d, 'fire', 'By noon the fire is out. Somebody brings the crew bread and does not let them pay for it.', PAY.fire); }
    if (k === 'fever' && fruitCount() >= 3) { let n = 3; for (const f of Object.keys(state.fruit)) while (n > 0 && state.fruit[f] > 0) { state.fruit[f]--; n--; } resolve(d, 'fever', 'You leave the fruit at the end of the pier. Later a lamp in a window is lit, then another.', PAY.fever); }
    if (k === 'report') {
      const R = reportDue(); state.gold += R.pay; state.story.reported = R.now; mark('crown', 1); G.audio.play('buy');
      const late = state.hut && state.hut.rolls && state.hut.rolls.length && !state.story.reportSeen;
      toast(late ? (state.story.reportSeen = state.dayN, `The clerk pays you ${R.pay} gold, then turns back a page to show you something: the same finds, already entered, in your own hand, dated next week.`) : `The clerk writes it all down in a tall book and pays you ${R.pay} gold.`, !!late, 8000);
    }
    if (k === 'work') { const L = state.story.lifeline; L[d.id] = state.dayN; state.time = Math.min(0.999, state.time + 3 / 24); state.gold += PAY.lifeline; toast(`A morning unloading salt. Your back says so. (+${PAY.lifeline} gold)`, false, 5000); G.audio.play('buy'); }
    rerender();
  }));
}

// ---- what the harbour's state means ashore (owner, 2026-11-25: "the status can be felt when going to the tavern, shipwright or market...
// consequences of not taking care of a harbour"). One table, read by ui/harbour.js and main.js (the tavern's music).
export const FEEL = {
  [-2]: { buy: 1.3, sell: 0.75, music: 0, hire: false, dice: false, game: false, yardTop: false, yardShut: true, stores: 2, ammo: false, made: false, luxury: false, jobs: 0,
    board: 'Most of the notices on the board are old and curling. Nobody is sending anything anywhere.',
    tavern: 'Chairs up on the tables. The fire is out. A man behind the bar wipes the same cup and does not look up.',
    market: 'Half the stalls are boarded. What there is, they sell dear and they buy cheap.',
    wright: 'The yard is shut. One old man mends what he can; nothing new is built here now.' },
  [-1]: { buy: 1.15, sell: 0.9, music: 0.4, hire: false, dice: true, game: true, yardTop: false, yardShut: false, stores: 4, ammo: true, made: true, luxury: false, jobs: 1,
    board: 'Fewer notices than there used to be.', tavern: 'A few men at one table, talking low. Nobody is looking for a berth.',
    market: 'The stalls are thin. Prices are up.', wright: 'No ironwood or storm silk has come in for weeks. The best work cannot be had here.' },
  0: { buy: 1, sell: 1, music: 1, hire: true, dice: true, game: true, yardTop: true, yardShut: false, stores: 6, ammo: true, made: true, luxury: false, jobs: 2, board: '', tavern: '', market: '', wright: '' },
  1: { buy: 1, sell: 1, music: 1, hire: true, dice: true, game: true, yardTop: true, yardShut: false, stores: 6, ammo: true, made: true, luxury: false, jobs: 2, board: '', tavern: '', market: '', wright: '' },
  2: { buy: 0.95, sell: 1.05, music: 1.15, hire: true, dice: true, game: true, yardTop: true, yardShut: false, stores: 6, ammo: true, made: true, luxury: true, jobs: 3,
    board: 'The board is crowded. Everybody wants something carried.', tavern: 'Every table taken, and somebody playing in the corner.',
    market: 'The stalls are full, and a merchant has something fine for sale.', wright: 'The yard is busy; good timber is stacked to the roof.' },
  3: { buy: 0.9, sell: 1.1, music: 1.3, hire: true, dice: true, game: true, yardTop: true, yardShut: false, stores: 6, ammo: true, made: true, luxury: true, jobs: 3,
    board: 'The board is crowded. Everybody wants something carried, and they pay well.', tavern: 'Loud, warm, full. A fiddler and a drum. Somebody buys your crew a round.',
    market: 'Everything is to be had, and they are glad to see you.', wright: 'The best yard on this coast, and they know your ship by name.' },
};
/** what this harbour is like ashore today (the demo and harbours before the story reach them: as ordinary) */
export const feelOf = (d) => (DEMO() || !d ? FEEL[0] : FEEL[plentyLevel(d)] || FEEL[0]);
