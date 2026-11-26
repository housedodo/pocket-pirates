// The HUD that follows the ship: the wind ring and compass, which errand is tracked and where it points, the slip (what, where, how
// long), and the tracker panel. Drawn every frame from main.js.
import * as life from '../harbourlife.js';
import { angleDiff } from '../util.js';
import { bearingName, questProgress, questNeed, questTitle, questIcon } from '../jobs.js';
import { goalCount } from '../objectives.js';
import { drawWind } from '../windmeters.js';
import { pxi } from '../pixelui.js';
import { settings } from '../core/config.js';
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { $, compass, toast } from './dom.js';
import { clockAt } from '../regions.js';

export let trackerEl;   // set by the init function(s) below, at the point in boot where main.js had them

// ---------------------------------------------------------------- compass & HUD
export const windView = { dir: 0, strength: 1, gust: 0, floor: 0.27 };
/** T: follow the next thing in hand (errands, then promises) */
export function followNext() {
  const ids = [...(state.job ? ['job'] : []), ...(state.passenger ? ['passenger'] : []), ...state.quests.map((q) => q.id), ...life.promises(state).map((p) => 'p:' + p.key)];
  if (!ids.length) return; const i = ids.indexOf(state.tracked); state.tracked = ids[(i + 1) % ids.length];
  G.sea.syncQuests(state.quests.filter((q) => q.id === state.tracked)); rt.trackerHtml = null;
}
export function trackedOne() {
  const t = state.tracked;
  if (t === 'job' && state.job) return 'job';
  if (t === 'passenger' && state.passenger) return 'passenger';
  if (t && state.quests.some((q) => q.id === t)) return t;
  if (t && t.startsWith('p:') && life.promises(state).some((p) => 'p:' + p.key === t)) return t;   // a promise (harbourlife.js)
  state.tracked = state.passenger ? 'passenger' : state.job ? 'job' : state.quests.length ? state.quests[0].id : null;
  G.sea.syncQuests(state.quests.filter((q) => q.id === state.tracked));   // only the followed errand's crates float
  return state.tracked;
}
/** where the dot on the wind ring and the slip's "which way" point: only a mark the captain set themselves (owner, 2026-11-19, T5:
 *  "remove the dot completely for now, let the player search for the harbours; players set marks, which would then be for the dot").
 *  A pin put on the chart, or a rumour pinned from the Orders (item 5). The game itself never points: not at a goal, an errand's
 *  harbour, the regatta's line or Tama's quay. */
export function trackTarget() {
  const pins = state.story.pins, pin = pins && pins.find((q) => q.on);
  if (!pin) return null;
  if (Math.hypot(pin.x - G.ship.pos.x, pin.z - G.ship.pos.z) < 22) { pins.splice(pins.indexOf(pin), 1); toast(pin.label ? `${pin.label}: you are there.` : 'You reached your pin.', false, 3000); return null; }
  return { x: pin.x, z: pin.z, label: pin.label || 'Your pin' };
}
/** the name of where the main goal is, when it has one single place (the early story); a name only, never a direction (T5) */
export function goalWhere(g) {
  const toTama = g && (g.id === 'perrin' || (g.id === 'dig' && state.story.letterP1 !== 'taken'));
  const cell = g && (toTama ? [0, -1] : ({ harbour: [0, -1], dig: [1, -1] })[g.id]);
  if (cell) { const d = G.world.desc(cell[0], cell[1]); if (d) return d.name; }
  if (g && g.id === 'job' && state.job) return state.job.toName;
  if (g && g.id === 'passenger' && state.passenger) return state.passenger.toName;
  return (g && g.where) || '';
}
/** a distance as the plain number the harbour board uses (owner, 2026-11-13: minutes made it a fetch game; units feel like sailing) */
export function etaText(dist) {
  return `${Math.round(dist)}`;
}
/** the slip: what to do, where, which way and how long. The same three lines on the HUD, in the log (Orders) and (later) on the chart */
export function slipInfo() {
  const g = G.objectives.pending ? null : G.objectives.current, c = { state, ship: G.ship };
  if (!g) { const t = trackTarget(); return t ? slipTo({ what: t.label, goal: false }, t) : { what: G.objectives.pending ? 'Mara has something to say' : 'Sail where you like', where: '', goal: false }; }
  const s = { what: `${g.title}${goalCount(g, c).replace(/<\/?b>/g, '')}`, goal: true, where: goalWhere(g) }, t = trackTarget();
  if (t) { const dx = t.x - G.ship.pos.x, dz = t.z - G.ship.pos.z; s.way = `${t.label} \u00b7 ${bearingName(dx, dz)} \u00b7 ${etaText(Math.hypot(dx, dz))}`; }   // the third line is the captain's own mark
  return s;
}
export function slipTo(s, t) {
  const dx = t.x - G.ship.pos.x, dz = t.z - G.ship.pos.z, d = Math.hypot(dx, dz);
  s.where = t.label; s.way = `${bearingName(dx, dz)} · ${etaText(d)}`; s.place = true;
  const against = Math.abs(angleDiff(Math.atan2(dx, -dz), G.wind.dir)) > 0.75 * Math.PI && d > 40 && !G.ship.rowing && G.weather.calm < 0.5;
  if (against) s.note = 'The wind is against you: zig-zag.';
  return s;
}
const lastCompass = new Float64Array(7).fill(NaN);
/** store one compass input (rounded to what 36 px can show); true when it moved */
function moved(i, v) { const x = v == null ? -9 : Math.round(v * 200); if (lastCompass[i] === x) return false; lastCompass[i] = x; return true; }
export function drawCompass(w, heading) {
  const jobA = rt.trackNow ? Math.atan2(rt.trackNow.x - G.ship.pos.x, -(rt.trackNow.z - G.ship.pos.z)) : null;
  windView.dir = G.abyss.windDir(w.dir); windView.strength = w.strength; windView.gust = w.gust; windView.floor = G.abyss.windFloor(Math.max(G.ship.mods.floor, G.ship.floorMin || 0)); windView.wedge = G.ship.wedge; windView.wedgeEnd = G.ship.wedgeEnd;
  // the 36 px ring is redrawn only when something it shows has moved (task R6): angles to about a tenth of a pixel at its rim
  const ch = moved(0, windView.dir) | moved(1, windView.strength) | moved(2, windView.floor) | moved(3, windView.wedge) | moved(4, windView.wedgeEnd) | moved(5, heading) | moved(6, jobA);
  if (!ch) return;
  drawWind(compass, windView, heading, 0, jobA);
}
export function updateTracker() {
  rt.trackNow = trackTarget();
  const show = settings.tracker !== false && rt.started && !rt.modal;
  trackerEl.style.display = show ? 'block' : 'none';
  if (!show) return;
  const rows = [];
  const g = G.objectives.pending ? null : G.objectives.current;   // the next goal shows when Mara announces it
  const fresh = performance.now() < rt.trackerNewUntil; trackerEl.classList.toggle('flash', fresh);
  if (g) { const s = slipInfo();   // the slip: what, where, which way and how long (always these three, in this order)
    rows.push(`<div class="trow main"><i class="ico flag"></i>${g.title}${goalCount(g, { state, ship: G.ship })}${fresh ? '<span class="tag">NEW</span>' : ''}</div>${s.where ? `<div class="trow where">${s.where}</div>` : ''}${s.way ? `<div class="trow way">${s.way}</div>` : ''}`); }
  const tr = trackedOne(), P = life.promises(state), nErr = (state.job ? 1 : 0) + (state.passenger ? 1 : 0) + state.quests.length;
  if (tr === 'job') rows.push(`<div class="trow">${pxi('letter')} ${state.job.toName}${state.job.due != null ? ` · ${clockAt(state.job.due)}` : ''}</div>`);
  else if (tr === 'passenger') rows.push(`<div class="trow">${pxi('talk')} ${state.passenger.name} to ${state.passenger.toName}</div>`);
  else if (tr && tr.startsWith('p:')) { const p = P.find((x) => 'p:' + x.key === tr); if (p) { const [cx, cz] = (p.toId || '0,-1').split(',').map(Number), d = G.world.desc(cx, cz); rows.push(`<div class="trow">${pxi('ribbon')} ${p.who} → ${p.to}</div>${d ? `<div class="trow way">${bearingName(d.x - G.ship.pos.x, d.z - G.ship.pos.z)}${p.need ? ' · ' + p.need : ''}</div>` : ''}`); } }
  else { const q = state.quests.find((x) => x.id === tr); if (q) rows.push(`<div class="trow">${questIcon(q)} ${questTitle(q, rt.dread)} <b>${questProgress(q, state)}/${questNeed(q)}</b></div>`); }
  // the regatta and the guitar errand are found by the player, never pointed at (owner, 2026-11-19)
  if (!g) { const t = rt.trackNow; if (t) { const s = slipTo({ what: t.label }, t); rows.push(`<div class="trow">${pxi('flag')} ${t.label}</div><div class="trow way">${s.way}</div>`); } }   // the captain's own mark (T5, item 5)   // (systems/race.js)
  if (nErr + P.length > 1) rows.push(`<div class="tcount">${nErr ? `${pxi('letter')}${nErr}` : ''}${P.length ? ` ${pxi('ribbon')}${P.length}` : ''}<span class="thint"> T</span></div>`);   // how many of each; T follows the next (owner, 2026-11-26)
  const html = rows.length ? G.abyss.hud('track', rows.join('')) + '<div class="thint">[Q] hide</div>' : '';
  if (html !== rt.trackerHtml) { rt.trackerHtml = html; trackerEl.innerHTML = html; }
  trackerEl.style.display = html ? 'block' : 'none';
}

/** boot code that ran at this point in main.js; main.js calls it in the same place */
export function initHud() {
  rt.trackNow = null;
  // mission tracker (Q)
  trackerEl = $('tracker');
  rt.trackerHtml = null;
}

/** the gold on the HUD counts to the real amount in a few hard steps, and flashes twice when it moves (G1) */
export function goldShown(dt) {
  const to = state.gold;
  if (rt.goldShown === undefined || !rt.started) { rt.goldShown = to; return to; }
  if (rt.goldShown !== to) {
    rt.goldStepT = (rt.goldStepT || 0) - dt;
    if (rt.goldStepT <= 0) {
      rt.goldStepT = 0.06;
      const diff = to - rt.goldShown, step = Math.sign(diff) * Math.max(1, Math.ceil(Math.abs(diff) / 6));
      rt.goldShown = Math.abs(step) >= Math.abs(diff) ? to : rt.goldShown + step;
      const g = $('gold'); if (!g.classList.contains('pulse')) { g.classList.add('pulse'); setTimeout(() => g.classList.remove('pulse'), 380); }
    }
  }
  return rt.goldShown;
}

