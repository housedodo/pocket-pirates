// The fog harbour (owner, 2026-11-26: "Eternal Fog & Harbour Restoration"; a new harbour where the Halved Isle is, the isle part of it;
// the keeper is new and knew Sabe; if she goes, the harbour is lost; full game only). The harbour beside the Halved Isle has lived in
// the fog bank for years. Its people left one by one; only Hesper, who keeps the light, stayed. What you bring her (her list, any
// delivery or sale there) brings people back, and as they come back the fog lifts and the light burns true again. Stay away too long
// before it is well, and one day she is not there: a note under the lamp, the fog for good, a quay nobody comes down to.
// Before it is back, only Hesper is there: nothing is bought, no passengers, no errands (havenOpen). Nothing here is shown as a number: the fog, the light, the houses and Mara say how it is going (RULES: the HUD stays wordless).
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { toast } from '../ui/dom.js';
import { pxi } from '../pixelui.js';
import { clamp, smoothstep, mulberry32, hash2 } from '../util.js';
import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { Builder } from '../builder.js';
import { TILE } from '../textures.js';
import { mats } from '../psx.js';
import { villager, pierOf, shoreR } from '../world.js';
import { cargo, GOODS } from './trade.js';
import { chestAdd } from '../chest.js';
import { waveHeight } from '../ocean.js';

const DEMO = () => typeof window !== 'undefined' && window.__BUILD === 'demo';
export const HAVEN_ID = '-12,-3', LIGHT_ID = '-13,-2';   // the harbour, and Hesper's rock with the light (world.js FORCED)                 // its cell (world.js FORCED); the Halved Isle is next door at -11,-2
export const HAVEN = { x: -1355, z: -300, r: 27, name: 'Haven Hesk' };   // inside the bank (BARRIERS.broken R 210, centre -1231,-217)

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
// What the harbour needs (owner, 2026-11-27: "the only possible thing: deliver food and some workforce, maybe people from the crew stay
// to help out; build Haven Hesk around the idea that it needs to be rebuilt"): food for the ones who come back, and hands. A hand is one
// of your crew who stays behind to rebuild (hired in another harbour's tavern, brought here). Nothing is bought or sold here at first.
export const FOOD_PTS = 2, HAND_PTS = 4;   // restoration points a gift of food, a hand who stays
const FOOD = [['food', 2, 'two days of food from your stores'], ['fish', 2, 'two fish from your hold'], ['fruit', 3, 'three of your fruit']];
// what opens as the harbour comes back (owner: "no option to take passengers or buy goods, since only the lighthouse keeper is there at first")
const OPENS = { abandoned: [], flicker: [], stirring: ['market', 'jobs'], bustling: ['market', 'jobs', 'tavern', 'wright', 'passage', 'life'], forsaken: [] };
/** ui/harbour.js, main.js: is this part of a harbour open (always true for any other harbour) */
export function havenOpen(d, what) {
  if (!havenOn() || !isHaven(d)) return true;
  return OPENS[haven().stage].includes(what);
}
const BEAT = {   // a line once, the first time the harbour is this well (on docking)
  flicker: 'A second lamp is lit on the quay tonight. Somebody came back.',
  stirring: 'There are boats on the hard again, and someone has whitewashed a door.',
  bustling: 'From the quay you can see the Halved Isle, clear across the water. Hesper says nobody has, in years.',
};
export const NOTE = 'Captain. The oil ran out and I lit the lamp anyway, and it burned. They are all down at the water now, the ones who left, in their good clothes, calling me by my name. I am going down to ask them where they have been. Do not light the lamp. H.';

const S = () => { const f = state.story.fogh || (state.story.fogh = { given: 0, food: 0, hands: [], met: false, gone: false, goneAt: null, note: false, beats: {}, warned: false }); if (!f.hands) f.hands = []; return f; };
const now = () => (state.dayN || 0) + (state.time || 0);
export const isHaven = (d) => !!(d && d.id === HAVEN_ID && d.type === 'harbour');
export const havenOn = () => !DEMO();

/** the whole state, derived (cheap; called every frame) */
export function haven() {
  const f = S(), rep = state.rep && state.rep[HAVEN_ID];
  const score = ((f.food || 0) + (f.given || 0)) * FOOD_PTS + f.hands.length * HAND_PTS + (rep ? (rep.deliveries || 0) * 1.5 + (rep.sold || 0) * 0.5 : 0);   // (given: an older save's gifts)
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
  rt.haven = { ...haven(), lifted: fogLifted(), glass: workDone('glass'), home: havenHome() };
  worksTick();   // places.js (the bank), world.js (her chair) read this
  acc += dt; if (acc >= 1) { acc = 0; const f = S(), h = haven(); if (f.met && !f.gone && h.neglect >= 1) { f.gone = true; f.goneAt = now(); } }
  const isl = G.world.islands && [...G.world.islands.values()].find((i) => i.desc.id === LIGHT_ID); if (!isl) return;
  const h = haven(), t = rt.tNow || 0;
  isl.havenGone = !h.keeperPresent;   // world.js heskLight: her boat and her on the chair, or the note
  rowersTick(dt, h);
  if (!isl.beam) return;
  if (!isl.lit) return;
  if (h.keeperPresent) {   // weak: it catches and drops; strong: a steady, long beam
    const k = workDone('glass') ? 1.15 : h.lighthouseIntensity, flick = Math.sin(t * 7.1) * 0.5 + Math.sin(t * 2.3 + 1) * 0.5 > 1.1 - 1.6 * k;
    isl.beam.visible = k > 0.85 || flick; if (isl.lampOn) isl.lampOn.visible = isl.beam.visible || k > 0.5; if (isl.lampOff) isl.lampOff.visible = !isl.lampOn.visible;
    isl.beam.scale.x = isl.beam.scale.y = isl.beam.scale.z = 0.45 + 0.55 * k;
  } else {   // gone: dark; on some nights the lamp burns by itself, low and still, and nobody is up there
    const burns = (state.dayN || 0) % 4 === 1 && Math.sin(t * 0.21) > 0.6;
    isl.beam.visible = false; if (isl.lampOn) isl.lampOn.visible = burns; if (isl.lampOff) isl.lampOff.visible = !burns;
  }
}

// ---- the ones who come back (owner, 2026-11-27, suggestion 5): as the harbour fills, its people row in out of the fog one boat at a
// time, two to a boat, and tie up along the pier; the boats stay there. One boat for every ROW_PER people. Only while the ship is near
// enough to see it (otherwise they are simply moored when you come). Full game only.
export const ROW_PER = 5, ROW_SPEED = 2.2, ROW_FROM = 115, ROW_SEE = 190;
let rowing = null; const moored = [];
function boatMesh(withRowers, seed) {
  const b = new Builder(), r = mulberry32(seed);
  b.box(0, -0.15, 0, 1.2, 0.45, 2.8, '#8a5a34', TILE.planks); b.box(0, 0.3, 0, 0.9, 0.06, 2.3, '#5e4028', TILE.planks);   // hull, thwarts
  b.box(0, 0.3, 1.2, 0.5, 0.2, 0.3, '#8a5a34', TILE.planks);
  if (withRowers) { villager(b, 0, 0.1, -0.5, 0, r, 'fisher'); villager(b, 0, 0.1, 0.6, Math.PI, r); }
  const m = new THREE.Mesh(b.geometry(), mats.props); const g = new THREE.Group(); g.add(m);
  if (withRowers) for (const sx of [-1, 1]) { const o = new Builder(); o.box(0, 0, 0, 2.2, 0.08, 0.12, '#6b4a2e', TILE.bark); const om = new THREE.Mesh(o.geometry(), mats.props); om.position.set(sx * 0.9, 0.5, -0.4); g.add(om); g.userData.oars = (g.userData.oars || []).concat(om); }
  scene.add(g); return g;
}
function berth(d, k) {   // the k-th boat's place along the pier, alternating sides
  const p = pierOf(d), th = d.dockTh, side = k % 2 ? 1 : -1, along = 3 + Math.floor(k / 2) * 3.4;
  return { x: p.x - Math.cos(th) * along + Math.cos(th + Math.PI / 2) * side * 2.6, z: p.z - Math.sin(th) * along + Math.sin(th + Math.PI / 2) * side * 2.6, ry: -th + Math.PI / 2 };
}
function rowersTick(dt, h) {
  const d = G.world.desc(...HAVEN_ID.split(',').map(Number)); if (!d) return;
  const f = S(), want = Math.min(8, Math.floor(h.population / ROW_PER)); f.arrived = Math.min(f.arrived || 0, want);
  const t = rt.tNow || 0, S0 = G.ship.pos, near = Math.hypot(S0.x - d.x, S0.z - d.z) < ROW_SEE;
  while (moored.length < f.arrived) { const k = moored.length, b = berth(d, k), m = boatMesh(false, 900 + k); m.position.set(b.x, 0, b.z); m.rotation.y = b.ry; moored.push(m); }   // those already in
  for (const m of moored) m.position.y = waveHeight(m.position.x, m.position.z, t, 0.3) - 0.05;
  if (!rowing && want > f.arrived) {
    if (!near) { f.arrived++; return; }   // nobody saw them come: they are simply there next time
    const a = hash2(f.arrived, 7, 31) % 628 / 100, from = { x: d.x + Math.cos(a) * ROW_FROM, z: d.z + Math.sin(a) * ROW_FROM }, to = berth(d, f.arrived);
    rowing = { m: boatMesh(true, 500 + f.arrived), from, to, k: 0, len: Math.hypot(to.x - from.x, to.z - from.z) };
  }
  if (rowing) {
    const R = rowing; R.k = Math.min(1, R.k + dt * ROW_SPEED / R.len);
    const x = R.from.x + (R.to.x - R.from.x) * R.k, z = R.from.z + (R.to.z - R.from.z) * R.k;
    R.m.position.set(x, waveHeight(x, z, t, 0.3) - 0.05, z); R.m.rotation.y = Math.atan2(R.to.x - R.from.x, R.to.z - R.from.z);
    for (const o of R.m.userData.oars || []) o.rotation.x = Math.sin(t * 2.4) * 0.5;   // the stroke
    if (R.k >= 1) { scene.remove(R.m); rowing = null; f.arrived = (f.arrived || 0) + 1; }
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

// ---- the harbourmaster's board (systems/harbours.js harbourRows / bindHarbourRows): Hesper, and the two kinds of help
function foodToGive() {
  const st = state.story.stores, fr = Object.values(state.fruit || {}).reduce((a, b) => a + b, 0);
  for (const [k, n, words] of FOOD) {
    if (k === 'food' && st && st.food >= n) return { k, n, words };
    if (k === 'fish' && (state.catch || []).length >= n) return { k, n, words };
    if (k === 'fruit' && fr >= n) return { k, n, words };
  }
  return null;
}
const handToStay = () => (state.crew || [])[0] || null;
function spoken(h) {
  const f = S(), hand = f.hands[0];
  if (h.stage === 'abandoned') return (f.food || f.given || f.hands.length) ? '"Two more chimneys smoked last night. I counted them twice."' : 'Hesper keeps the light, what is left of it. "They went one at a time. They said the fog had their names in it. I trim the wick, and I do not listen."';
  if (h.stage === 'flicker') return hand ? `"${hand} has three roofs back on. Sabe in Galra taught me the wick, when he could still see. Tell him the light is going."` : '"Sabe in Galra taught me the wick, when we were young and he could still see. Tell him the light is going, if you pass."';
  if (h.stage === 'stirring') return '"Children on the quay again. They throw stones at the fog. I let them. There is a stall open, if you need anything."';
  return '"You can see the whole bay from the gallery now. I had forgotten how small it is."';
}
export function havenRows(d) {
  if (!havenOn() || !isHaven(d) || S().gone) return '';
  const h = haven(), food = foodToGive(), hand = handToStay();
  let html = `<div class="sec">HESPER, WHO KEEPS THE LIGHT</div><small>${spoken(h)}</small>`;
  if (h.r >= 0.999) return html + worksRows();   // back: the great works (below)
  html += `<div class="qrow letter"><div><b>${pxi('talk')} Food for the ones who come back</b><br><small>${food ? `"They always come back hungry." · ${food.words}` : 'nothing aboard to spare: stores, fish or fruit'}</small></div><button data-hb="fh_food" ${food ? '' : 'disabled'}>Give</button></div>`;
  html += `<div class="qrow letter"><div><b>${pxi('crew')} Hands to rebuild</b><br><small>${hand ? `${hand.name} could stay and help. "The roofs will not mend themselves."` : 'a hand of your own first: they sign on in other harbours\' taverns'}</small></div><button data-hb="fh_hand" ${hand ? '' : 'disabled'}>${hand ? `${hand.name} stays` : 'Stay'}</button></div>`;
  return html;
}
export function havenAct(d, k) {
  if (k.startsWith('fh_w_') && isHaven(d)) return worksAct(k.slice(5));
  if ((k !== 'fh_food' && k !== 'fh_hand') || !isHaven(d)) return false;
  const f = S(), first = !(f.food || f.given || f.hands.length);
  if (k === 'fh_food') {
    const fd = foodToGive(); if (!fd) return true;
    if (fd.k === 'food') state.story.stores.food -= fd.n;
    else if (fd.k === 'fish') state.catch.splice(0, fd.n);
    else { let n = fd.n; for (const fk of Object.keys(state.fruit)) while (n > 0 && state.fruit[fk] > 0) { state.fruit[fk]--; n--; } }
    f.food = (f.food || 0) + 1;
    toast(first ? 'She takes it without a word, and goes up the steps with it. That night the light turns a little longer before it catches.' : 'She carries it down to the quay. A door that was shut is open in the morning.', false, 6500);
  } else {
    const c = handToStay(); if (!c) return true;
    state.crew = state.crew.filter((x) => x !== c); f.hands.push(c.name);
    toast(`${c.name} takes a hammer off the wall of the boatshed and does not look back. By evening one roof has its tiles again.`, false, 7000);
  }
  if (G.audio) G.audio.play('buy');
  return true;
}

// ---- the great works (owner, 2026-11-28: the late-game goal "rebuild Haven Hesk fully: a big, long project that changes the fog region and
// gives a home port inside the bank"). Once the people are back, three works remain, each paid in gold and in goods brought from other
// waters (systems/trade.js cargo): a stone quay, new glass for the light, a bell for the chapel. Each shows in the harbour and does
// something; with all three Haven Hesk is the Gull's home port in the fog. Nothing here is a number on the HUD.
//   quay    stone along the shore by the pier. A ship that ties up here is made sound again, free.
//   glass   the light burns steady and long; the bank on the horizon is gone (fogbank.js FogWall), the fog inside thin for good.
//   bell    it rings the evening in. A night ashore here does the crew more good than anywhere.
//   all     home port: the Gull is brought here when she goes under nearby, and Hesper gives the captain something of the light's
//           (a sail of the lamp-room's old canvas, into the sea chest).
export const WORKS = {
  quay:  { name: 'A stone quay', cost: 600, good: 'coir', n: 3, ask: '"Stone we have, from the old fort on the isle. Rope we have not, and gold for the masons."', done: 'Masons from the isle lay the last stone at dusk. The quay rings under your boots.' },
  glass: { name: 'New glass for the light', cost: 350, good: 'glass', n: 4, ask: '"The lens is cracked through. The Guild makes glass. I never could afford it."', done: 'That night the light turns once, slowly, and does not stutter. From the gallery Hesper waves the lamp at you, like a girl.' },
  bell:  { name: 'A bell for the chapel', cost: 800, good: 'silver', n: 2, ask: '"Melt down Crown plate and we will cast it here. Sabe always said a harbour without a bell is only a beach."', done: 'They hang it at noon. At dusk it rings the evening in, and the fog goes back a little to listen.' },
};
const W = () => { const f = S(); return f.works || (f.works = {}); };
export const workDone = (id) => W()[id] != null;   // (the day it was done; day 0 counts)
export const havenHome = () => havenOn() && !S().gone && workDone('quay') && workDone('glass') && workDone('bell');
function worksRows() {
  const c = cargo(); let html = '<div class="sec">THE WORKS</div>';
  for (const [id, w] of Object.entries(WORKS)) {
    if (workDone(id)) { html += `<div class="qrow"><div><b>${pxi('anchor')} ${w.name}</b><br><small>done</small></div></div>`; continue; }
    const have = c[w.good] || 0, ok = state.gold >= w.cost && have >= w.n;
    html += `<div class="qrow letter"><div><b>${pxi('anchor')} ${w.name}</b><br><small>${w.ask} · ${w.cost} gold and ${w.n} crates of ${GOODS[w.good].one} (${have} aboard)</small></div><button data-hb="fh_w_${id}" ${ok ? '' : 'disabled'}>Pay</button></div>`;
  }
  if (havenHome()) html += '<div class="qrow"><div><small>Haven Hesk is the Gull\'s home port now. The fog keeps its distance from the quay.</small></div></div>';
  return html;
}
function worksAct(id) {
  const w = WORKS[id], c = cargo(); if (!w || workDone(id) || state.gold < w.cost || (c[w.good] || 0) < w.n) return true;
  state.gold -= w.cost; c[w.good] -= w.n; if (c[w.good] <= 0) delete c[w.good];
  W()[id] = state.dayN || 0; worksBuilt = false;
  toast(w.done, false, 8000); if (G.audio) G.audio.play('treasure');
  if (havenHome()) setTimeout(() => { toast('Hesper comes down the steps with a roll of canvas under her arm. "The old lamp-room hangings. Sails, if you want them. The light does not need them now."', false, 9000); chestAdd('heskcanvas', 'lantern'); }, 8500);
  return true;
}
/** systems/interact.js on docking here: the quay makes her sound; the bell's night does the crew good */
export function worksDock(d) {
  if (!havenOn() || !isHaven(d) || S().gone) return;
  if (workDone('quay') && G.ship && state.hp < G.ship.mods.maxHp) { state.hp = G.ship.mods.maxHp; toast('The masons look her over and caulk what the sea opened. Hesper will not take money for it.', false, 6000); }
  if (workDone('bell') && state.story.mood != null) state.story.mood = Math.min(1, state.story.mood + 0.15);
}
// what the works look like: the stone quay along the shore either side of the pier, and the bell in a frame of new timber on it
let worksBuilt = false, worksMesh = null;
function worksTick() {
  if (worksBuilt) return; const d = G.world && G.world.desc(...HAVEN_ID.split(',').map(Number)); if (!d) return;
  worksBuilt = true; if (worksMesh) { scene.remove(worksMesh); worksMesh.geometry.dispose(); worksMesh = null; }
  const b = new Builder(), th0 = d.dockTh;
  if (workDone('quay')) for (let i = -7; i <= 7; i++) {   // dressed stone, pale and new, a lip of darker coping
    if (Math.abs(i) < 1) continue;
    const th = th0 + i * 0.07, r = shoreR(d, th) * 1.0, x = d.x + Math.cos(th) * r, z = d.z + Math.sin(th) * r;   // at the waterline, in front of the cliff
    b.push(x, 0, z, Math.PI / 2 - th); b.box(0, -1.6, 0, shoreR(d, th) * 0.07 + 0.3, 2.9, 2.4, i % 2 ? '#e0d8c6' : '#d2cab8', TILE.white); b.box(0, 1.3, 0.2, shoreR(d, th) * 0.07 + 0.35, 0.2, 2.6, '#9a9488', TILE.stone); b.pop();
  }
  if (workDone('bell')) {   // a timber frame on the quay with the bell in it
    const th = th0 + 0.32, r = shoreR(d, th) * 0.99, x = d.x + Math.cos(th) * r, z = d.z + Math.sin(th) * r, y = 1.5;   // on the new quay itself
    b.push(x, y, z, Math.PI / 2 - th); for (const sx of [-0.9, 0.9]) b.box(sx, 0, 0, 0.24, 3.2, 0.24, '#6b4a2e', TILE.bark);
    b.box(0, 3.1, 0, 2.2, 0.26, 0.3, '#5a3e24', TILE.bark); b.cyl(0, 2.2, 0, 0.55, 0.3, 0.9, 8, '#c8a040', TILE.glow, true); b.pop();
  }
  if (b.empty) return;
  worksMesh = new THREE.Mesh(b.geometry(), mats.props); scene.add(worksMesh);
}

// ---- tests and dev (never in the playtest build): set the harbour's state without the deliveries
export const havenDebug = {
  state: () => ({ ...S(), ...haven() }),
  rower: () => (rowing ? rowing.m.position.toArray() : null), moored: () => moored.map((m) => m.position.toArray()),
  set(stage) {   // 'abandoned' | 'flicker' | 'stirring' | 'bustling' | 'forsaken'
    const f = S(), r = { abandoned: 0, flicker: 0.3, stirring: 0.6, bustling: 1 }[stage];
    if (stage === 'forsaken') { f.met = true; f.gone = true; f.goneAt = now(); return this.state(); }
    f.gone = false; f.note = false; f.met = true; f.given = 0; f.hands = []; f.food = Math.ceil((r * FULL) / FOOD_PTS); f.arrived = Math.max(0, Math.floor(POP_MAX * r / ROW_PER) - 1);   // one still to row in
    const rep = state.rep[HAVEN_ID]; if (rep) rep.last = now();
    return this.state();
  },
  worksMesh: () => (worksMesh ? worksMesh.geometry.attributes.position.count : 0),
  works(ids = ['quay', 'glass', 'bell']) { this.set('bustling'); for (const id of ids) W()[id] = state.dayN || 0; worksBuilt = false; return { ...W() }; },
  away(days) { const f = S(); f.met = true; const rep = state.rep[HAVEN_ID] || (state.rep[HAVEN_ID] = { visits: 1, deliveries: 0, sold: 0, last: now() }); rep.last = now() - days; return this.state(); },
};
