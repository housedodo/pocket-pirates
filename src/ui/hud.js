// The HUD that follows the ship: the wind ring and compass, which errand is tracked and where it points, the slip (what, where, how
// long), and the tracker panel. Drawn every frame from main.js.
import { angleDiff } from '../util.js';
import { bearingName, questProgress, questNeed, questTitle, questIcon } from '../jobs.js';
import { goalCount } from '../objectives.js';
import { drawWind } from '../windmeters.js';
import { pxi } from '../pixelui.js';
import { settings } from '../core/config.js';
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { $, compass, toast } from './dom.js';
import { pierOf } from '../world.js';
import { LM } from '../landmarks.js';
import { clockAt } from '../regions.js';
import { sectorAt } from '../sectors.js';

export let trackerEl;   // set by the init function(s) below, at the point in boot where main.js had them

// ---------------------------------------------------------------- compass & HUD
export const windView = { dir: 0, strength: 1, gust: 0, floor: 0.27 };
export function trackedOne() {
  const t = state.tracked;
  if (t === 'job' && state.job) return 'job';
  if (t === 'passenger' && state.passenger) return 'passenger';
  if (t && state.quests.some((q) => q.id === t)) return t;
  state.tracked = state.passenger ? 'passenger' : state.job ? 'job' : state.quests.length ? state.quests[0].id : null;
  G.sea.syncQuests(state.quests.filter((q) => q.id === state.tracked));   // only the followed errand's crates float
  return state.tracked;
}
export function trackTarget() {
  { const pin = state.story.pins && state.story.pins.find((q) => q.on);   // a pin you put on the chart: the compass follows it until you get there
    if (pin) { if (Math.hypot(pin.x - G.ship.pos.x, pin.z - G.ship.pos.z) < 22) { state.story.pins.splice(state.story.pins.indexOf(pin), 1); toast('You reached your pin.', false, 3000); } else return { x: pin.x, z: pin.z, label: 'Your pin' }; } }
  const tr = trackedOne();
  if (tr === 'job') return { x: state.job.x, z: state.job.z, label: state.job.toName };
  if (tr === 'passenger') return { x: state.passenger.x, z: state.passenger.z, label: state.passenger.toName };
  for (const q of state.quests) {
    if (q.id !== tr) continue;
    if (questProgress(q, state) >= questNeed(q)) { const [cx, cz] = q.giverId.split(',').map(Number), gd = G.world.desc(cx, cz); if (gd) return { ...pierOf(gd), label: q.giverName }; }
    if (q.type !== 'crates') continue;
    const open = q.crates.filter((c) => !c.got);
    if (!open.length) continue;
    if (Math.hypot(q.center.x - G.ship.pos.x, q.center.z - G.ship.pos.z) > 75) return { x: q.center.x, z: q.center.z, label: 'Lost crates' };
    let best = open[0];
    for (const c of open) if (Math.hypot(c.x - G.ship.pos.x, c.z - G.ship.pos.z) < Math.hypot(best.x - G.ship.pos.x, best.z - G.ship.pos.z)) best = c;
    return { x: best.x, z: best.z, label: 'Crate' };
  }
  return goalTarget();
}
/** where the main goal is, when it has one single place (the early story only: later goals are found, never marked) */
export function goalTarget() {
  // Tama while a letter from Perrin waits there (or is about to), then the riddle's isle
  const g = G.objectives.current, toTama = g && (g.id === 'perrin' || (g.id === 'dig' && state.story.letterP1 !== 'taken'));
  const cell = g && (toTama ? [0, -1] : ({ harbour: [0, -1], dig: [1, -1] })[g.id]);
  if (cell) { const d = G.world.desc(cell[0], cell[1]); if (d) return { ...(d.type === 'harbour' ? pierOf(d) : { x: d.x, z: d.z }), label: d.name }; }
  if (g && g.region) {   // Perrin's letter: the nearest landmark in that region's waters (where to look, never what)
    let best = null; for (const l of Object.values(LM)) { if (sectorAt(l.x, l.z, state.seed).faction.id !== g.region) continue; const d = Math.hypot(l.x - G.ship.pos.x, l.z - G.ship.pos.z); if (!best || d < best.d) best = { d, l }; }
    if (best) return { x: best.l.x, z: best.l.z, label: g.where };
  }
  if (g && g.id === 'job' && state.job) return { x: state.job.x, z: state.job.z, label: state.job.toName };
  if (g && g.id === 'passenger' && state.passenger) return { x: state.passenger.x, z: state.passenger.z, label: state.passenger.toName };
  return null;
}
/** a distance as the plain number the harbour board uses (owner, 2026-11-13: minutes made it a fetch game; units feel like sailing) */
export function etaText(dist) {
  return `${Math.round(dist)}`;
}
/** the slip: what to do, where, which way and how long. The same three lines on the HUD, in the log (Orders) and (later) on the chart */
export function slipInfo() {
  const g = G.objectives.pending ? null : G.objectives.current, c = { state, ship: G.ship };
  if (!g) { const t = trackTarget(); return t ? slipTo({ what: t.label, goal: false }, t) : { what: G.objectives.pending ? 'Mara has something to say' : 'Sail where you like', where: G.objectives.pending ? '' : 'Everything inside the fog is yours', goal: false }; }
  const s = { what: `${g.title}${goalCount(g, c).replace(/<\/?b>/g, '')}`, goal: true }, t = goalTarget();
  if (t) return slipTo(s, t);
  s.where = g.where || ''; return s;
}
export function slipTo(s, t) {
  const dx = t.x - G.ship.pos.x, dz = t.z - G.ship.pos.z, d = Math.hypot(dx, dz);
  s.where = t.label; s.way = `${bearingName(dx, dz)} · ${etaText(d)}`; s.place = true;
  const against = Math.abs(angleDiff(Math.atan2(dx, -dz), G.wind.dir)) > 0.75 * Math.PI && d > 40 && !G.ship.rowing && G.weather.calm < 0.5;
  if (against) s.note = 'The wind is against you: zig-zag.';
  return s;
}
export function drawCompass(w, heading) {
  const jobA = rt.trackNow ? Math.atan2(rt.trackNow.x - G.ship.pos.x, -(rt.trackNow.z - G.ship.pos.z)) : null;
  windView.dir = G.abyss.windDir(w.dir); windView.strength = w.strength; windView.gust = w.gust; windView.floor = G.abyss.windFloor(Math.max(G.ship.mods.floor, G.ship.floorMin || 0)); windView.wedge = G.ship.wedge; windView.wedgeEnd = G.ship.wedgeEnd;
  drawWind(compass, windView, heading, performance.now() / 1000, jobA);
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
  const tr = trackedOne(), others = (state.job ? 1 : 0) + (state.passenger ? 1 : 0) + state.quests.length - (tr ? 1 : 0);
  if (tr === 'job') rows.push(`<div class="trow">${pxi('letter')} ${state.job.toName}${state.job.due != null ? ` · ${clockAt(state.job.due)}` : ''}</div>`);
  else if (tr === 'passenger') rows.push(`<div class="trow">${pxi('talk')} ${state.passenger.name} to ${state.passenger.toName}</div>`);
  else { const q = state.quests.find((x) => x.id === tr); if (q) rows.push(`<div class="trow">${questIcon(q)} ${questTitle(q, rt.dread)} <b>${questProgress(q, state)}/${questNeed(q)}</b></div>`); }
  if (others > 0) rows.push(`<div class="thint">+${others} more in your orders (J)</div>`);
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
