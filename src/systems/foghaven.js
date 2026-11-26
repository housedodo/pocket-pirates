// The fog harbour (owner, 2026-11-26: "Eternal Fog & Harbour Restoration"; a new harbour where the Halved Isle is, the isle part of it;
// the keeper is new and knew Sabe; if she goes, the harbour is lost; full game only). The harbour beside the Halved Isle has lived in
// the fog bank for years. Its people left one by one; only Hesper, who keeps the light, stayed. What you bring her (her list, any
// delivery or sale there) brings people back, and as they come back the fog lifts and the light burns true again. Stay away too long
// before it is well, and one day she is not there: a note under the lamp, the fog for good, a quay nobody comes down to.
// Nothing here is shown as a number: the fog, the light, the houses and Mara say how it is going (RULES: the HUD stays wordless).
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { toast } from '../ui/dom.js';
import { pxi } from '../pixelui.js';
import { clamp, smoothstep } from '../util.js';

const DEMO = () => typeof window !== 'undefined' && window.__BUILD === 'demo';
export const HAVEN_ID = '-12,-2';                 // its cell (world.js FORCED); the Halved Isle is next door at -11,-2
export const HAVEN = { x: -1296, z: -190, r: 27, name: 'Haven Hesk' };   // inside the bank (BARRIERS.broken R 110, centre -1231,-217)

// ---- tunables
export const FULL = 24;           // restoration points for a harbour fully back (her list gives 2 a time; a delivery there 1.5, a sale 0.5)
export const GRACE = 8;           // days away (after you have met her) before the neglect starts to count
export const SPAN = 8;            // days of neglect after the grace until she is gone (so: 16 days away)
export const SAFE_AT = 0.8;       // restored this far, the town keeps the light itself: she is safe
export const LIFT_AT = 0.12;      // fog density under this: the bank no longer stops a ship (places.js)
export const POP_MAX = 40;        // people in the harbour when it is full again
export const STAGES = [           // r (restoration with neglect taken off) from .. : name, the harbour's plenty (harbours.js)
  { at: 0, id: 'abandoned', plenty: -2 },
  { at: 0.2, id: 'flicker', plenty: -1 },
  { at: 0.5, id: 'stirring', plenty: 0 },
  { at: 0.65, id: 'stirring', plenty: 1 },
  { at: 0.8, id: 'bustling', plenty: 2 },
  { at: 0.95, id: 'bustling', plenty: 3 },
];
// what she asks for, in turn (then round again): kind, what, how many, the row's words
const LIST = [
  { kind: 'oil', n: 10, label: 'Oil for the lamp', say: '"The lamp drinks more in the fog. Ten measures, if you can spare them."' },
  { kind: 'cargo', good: 'salt', n: 1, label: 'A crate of salt', say: '"Salt. If there is salt, the boats can put up fish, and if there is fish, people stay."' },
  { kind: 'cargo', good: 'cloth', n: 1, label: 'Bolts of cloth', say: '"Sailcloth for the boats on the hard. Three of them only want a sail."' },
  { kind: 'food', n: 2, label: 'Food from your stores', say: '"Bread, or anything. For the ones who come back. They always come back hungry."' },
  { kind: 'cargo', good: 'glass', n: 1, label: 'Lamp glass', say: '"The lens is cracked right through. Glass, and I can make it whole."' },
  { kind: 'cargo', good: 'coir', n: 1, label: 'Coir rope', say: '"Rope for the moorings. Nothing has been tied up properly here in years."' },
];
const BEAT = {   // a line once, the first time the harbour is this well (on docking)
  flicker: 'A second lamp is lit on the quay tonight. Somebody came back.',
  stirring: 'There are boats on the hard again, and someone has whitewashed a door.',
  bustling: 'From the quay you can see the Halved Isle, clear across the water. Hesper says nobody has, in years.',
};
export const NOTE = 'Captain. The oil ran out and I lit the lamp anyway, and it burned. They are all down at the water now, the ones who left, in their good clothes, calling me by my name. I am going down to ask them where they have been. Do not light the lamp. H.';

const S = () => { const f = state.story.fogh || (state.story.fogh = { given: 0, ask: 0, met: false, gone: false, goneAt: null, note: false, beats: {}, warned: false }); return f; };
const now = () => (state.dayN || 0) + (state.time || 0);
export const isHaven = (d) => !!(d && d.id === HAVEN_ID && d.type === 'harbour');
export const havenOn = () => !DEMO();

/** the whole state, derived (cheap; called every frame) */
export function haven() {
  const f = S(), rep = state.rep && state.rep[HAVEN_ID];
  const score = f.given * 2 + (rep ? (rep.deliveries || 0) * 1.5 + (rep.sold || 0) * 0.5 : 0);
  const restoration = clamp(score / FULL, 0, 1);
  const away = f.met && rep && rep.last < 1e6 ? Math.max(0, now() - rep.last) : 0;
  const neglect = f.gone ? 1 : restoration >= SAFE_AT ? 0 : clamp((away - GRACE) / SPAN, 0, 1);
  const r = f.gone ? 0 : restoration * (1 - 0.5 * neglect);   // people drift off again while nobody comes
  let st = STAGES[0]; for (const s of STAGES) if (r >= s.at) st = s;
  return {
    restoration, neglect, away, r,
    population: f.gone ? 0 : Math.round(POP_MAX * r),
    fogDensity: f.gone ? 1 : 1 - smoothstep(0.15, 1, r),
    lighthouseIntensity: f.gone ? 0 : 0.2 + 0.8 * r,
    keeperPresent: !f.gone, omenNote: f.gone, noteFound: f.note,
    stage: f.gone ? 'forsaken' : st.id, plenty: f.gone ? -2 : st.plenty,
  };
}
/** harbours.js plentyLevel: the haven's plenty is its stage, not the usual sum */
export const havenPlenty = () => haven().plenty;
/** places.js: the bank is gone (a ship sails in without the lantern) */
export const fogLifted = () => havenOn() && haven().fogDensity < LIFT_AT;

/** each frame (main.js, after world.setLit): neglect may take her; the light dims and stutters with the harbour */
let acc = 0, urlDone = false;
function urlFlag() {   // tests: ?foghaven=abandoned|flicker|stirring|bustling|forsaken (ignored in the playtest build)
  if (typeof window === 'undefined' || window.__BUILD === 'full') return;
  let q = null; try { q = new URLSearchParams(location.search).get('foghaven'); } catch (e) { /* none */ }
  if (q) havenDebug.set(q);
}
export function havenTick(dt) {
  if (!havenOn() || !G.world) return;
  if (!urlDone) { urlDone = true; urlFlag(); }
  rt.haven = { ...haven(), lifted: fogLifted() };   // places.js (the bank), world.js (her chair) read this
  acc += dt; if (acc >= 1) { acc = 0; const f = S(), h = haven(); if (f.met && !f.gone && h.neglect >= 1) { f.gone = true; f.goneAt = now(); } }
  const isl = G.world.islands && [...G.world.islands.values()].find((i) => i.desc.id === HAVEN_ID); if (!isl || !isl.beam) return;
  const h = haven(), t = rt.tNow || 0;
  if (!isl.lit) return;
  if (h.keeperPresent) {   // weak: it catches and drops; strong: a steady, long beam
    const k = h.lighthouseIntensity, flick = Math.sin(t * 7.1) * 0.5 + Math.sin(t * 2.3 + 1) * 0.5 > 1.1 - 1.6 * k;
    isl.beam.visible = k > 0.85 || flick; if (isl.lampOn) isl.lampOn.visible = isl.beam.visible || k > 0.5; if (isl.lampOff) isl.lampOff.visible = !isl.lampOn.visible;
    isl.beam.scale.x = isl.beam.scale.y = isl.beam.scale.z = 0.45 + 0.55 * k;
  } else {   // gone: dark; on some nights the lamp burns by itself, low and still, and nobody is up there
    const burns = (state.dayN || 0) % 4 === 1 && Math.sin(t * 0.21) > 0.6;
    isl.beam.visible = false; if (isl.lampOn) isl.lampOn.visible = burns; if (isl.lampOff) isl.lampOff.visible = !burns;
  }
}

/** docking (systems/interact.js): returns true when nobody takes your line (the lost harbour); first time there, her note */
export function havenDock(d) {
  if (!havenOn() || !isHaven(d)) return false;
  const f = S();
  if (f.gone) {
    if (!f.note) {
      f.note = true; state.notes.push({ text: NOTE, dark: true });
      toast('Nobody comes down to take your line. On the lighthouse steps her chair stands empty, a note under the lamp.', true, 7000);
      setTimeout(() => toast(NOTE, true, 12000), 7200);
    } else toast('Nobody comes down to take your line. The fog stands in the doorways.', true, 5000);
    if (state.job && state.job.toId === d.id) { toast(`Nobody here to take ${state.job.item}. You keep it.`, false, 5000); state.job = null; }
    if (state.passenger && state.passenger.toId === d.id) { toast(`${state.passenger.name} looks at the empty quay and will not go ashore. Later they slip off at a fishing stage and pay nothing.`, false, 7000); state.passenger = null; }
    return true;
  }
  const h = haven();
  if (!f.met) { f.met = true; }
  else {
    for (const k of ['flicker', 'stirring', 'bustling']) if (h.stage === k && !f.beats[k]) { f.beats[k] = true; setTimeout(() => toast(BEAT[k], false, 7000), 2600); }
    if (h.neglect > 0.4 && !f.warned) { f.warned = true; setTimeout(() => toast('Hesper does not get up when you tie up. "You were a long time. It was louder, while you were gone."', true, 7000), 2600); }
    if (h.neglect < 0.1) f.warned = false;
  }
  return false;
}

// ---- the harbourmaster's board (systems/harbours.js harbourRows / bindHarbourRows)
const want = () => LIST[S().ask % LIST.length];
function have(w) {
  if (w.kind === 'oil') return (state.oil || 0) >= w.n;
  if (w.kind === 'food') { const st = state.story.stores; return !!st && st.food >= w.n; }
  const cg = state.story.cargo || {}; return (cg[w.good] || 0) >= w.n;
}
function spoken(h) {
  if (h.stage === 'abandoned') return S().given ? '"Two more chimneys smoked last night. I counted them twice."' : 'Hesper keeps the light, what is left of it. "They went one at a time. They said the fog had their names in it. I trim the wick, and I do not listen."';
  if (h.stage === 'flicker') return '"Sabe in Galra taught me the wick, when we were young and he could still see. Tell him the light is going, if you pass."';
  if (h.stage === 'stirring') return '"Children on the quay again. They throw stones at the fog. I let them."';
  return '"You can see the whole bay from the gallery now. I had forgotten how small it is."';
}
export function havenRows(d) {
  if (!havenOn() || !isHaven(d) || S().gone) return '';
  const h = haven(), w = want(), ok = have(w);
  let html = `<div class="sec">HESPER, WHO KEEPS THE LIGHT</div><small>${spoken(h)}</small>`;
  if (h.r < 0.999) html += `<div class="qrow letter"><div><b>${pxi('talk')} ${w.label}</b><br><small>${ok ? w.say : (w.kind === 'cargo' ? 'a crate in your hold' : w.kind === 'oil' ? `${w.n} lamp oil` : `${w.n} food from your stores`)}</small></div><button data-hb="fh_give" ${ok ? '' : 'disabled'}>Give</button></div>`;
  return html;
}
export function havenAct(d, k) {
  if (k !== 'fh_give' || !isHaven(d)) return false;
  const f = S(), w = want(); if (!have(w)) return true;
  if (w.kind === 'oil') state.oil -= w.n;
  else if (w.kind === 'food') state.story.stores.food -= w.n;
  else { const cg = state.story.cargo; cg[w.good] -= w.n; if (!cg[w.good]) delete cg[w.good]; }
  f.given++; f.ask++;
  toast(f.given === 1 ? 'She takes it without a word, and goes up the steps with it. That night the light turns a little longer before it catches.' : 'She takes it up the steps. Down on the quay somebody opens a shutter.', false, 6500);
  if (G.audio) G.audio.play('buy');
  return true;
}

// ---- tests and dev (never in the playtest build): set the harbour's state without the deliveries
export const havenDebug = {
  state: () => ({ ...S(), ...haven() }),
  set(stage) {   // 'abandoned' | 'flicker' | 'stirring' | 'bustling' | 'forsaken'
    const f = S(), r = { abandoned: 0, flicker: 0.3, stirring: 0.6, bustling: 1 }[stage];
    if (stage === 'forsaken') { f.met = true; f.gone = true; f.goneAt = now(); return this.state(); }
    f.gone = false; f.note = false; f.met = true; f.given = Math.ceil((r * FULL) / 2);
    const rep = state.rep[HAVEN_ID]; if (rep) rep.last = now();
    return this.state();
  },
  away(days) { const f = S(); f.met = true; const rep = state.rep[HAVEN_ID] || (state.rep[HAVEN_ID] = { visits: 1, deliveries: 0, sold: 0, last: now() }); rep.last = now() - days; return this.state(); },
};
