// The diving bell and the ship's boat, played (owner, 2026-11-23: "you can buy them at the harbours and decide to take them with you or
// leave them on the harbour until next time"; "the boat is a third way to access it"; "make one more clue per region only be reached by
// boat or bell, and if you don't have the clue, you cannot proceed"). The design is docs/proposals/DIVE_AND_BOAT.md; the models src/gear.js.
//   Bought at any harbour's shipwright (GEAR). Aboard, each costs a little speed (GEAR_DRAG); left at a harbour it waits there, and only
//   that harbour gives it back (state.story.gearAt). Full game only: the demo has neither.
//   SITES: one per region, each reached only by the bell (down) or the boat (in). Its clue (clues.js, gear: true) is what reads the region
//   (clues.js regionSeen): without it the region does not count, and the sea past 1950 and that region's letter do not open.
//   The bell: E at a site where the water shows something (a ring of bubbles) lowers it, then its own screen: the view out of the port,
//   panned with left and right, the rope on the left the air. E on the glint looks closer; E otherwise, or the air out, brings it up.
//   The boat: E near a boat site (or outside the Glass Lagoon's reef or the Ribs' breakers) puts it in the water and you row it; the Gull
//   waits at anchor. The reef and the breakers let the boat through (passes.js barrierPass). Too far from her, it turns for home.
import * as THREE from 'three';
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { scene } from '../core/engine.js';
import { LM } from '../landmarks.js';
import { buildBoat } from '../gear.js';
import { Builder } from '../builder.js';
import { mats } from '../psx.js';
import { TILE } from '../textures.js';
import { chestAdd } from '../chest.js';
import { toast } from '../ui/dom.js';
import { regionAt } from '../regions.js';
import { hasSeen } from '../clues.js';
import { angleDiff } from '../util.js';

const DEMO = () => typeof window !== 'undefined' && window.__BUILD === 'demo';

// ---- buying: the two cards at the shipwright (ui/harbour.js)
export const GEAR = [
  { id: 'bell', name: 'Diving bell', icon: 'divebell', stock: 'Nothing to go down in', cost: [150, 320, 600],
    text: ['Salvage bell: shallow water, a short breath', 'Deep bell, with a pump: deeper, and longer down', 'Lamp bell: a glass port and a lantern, for the dark'] },
  { id: 'boat', name: "Ship's boat", icon: 'boat', stock: 'Nothing small enough', cost: [120, 300],
    text: ['A clinker boat and a pair of oars: over reefs, into lagoons', 'The boat with a lantern: into sea caves, and at night'] },
];
// where each level is sold (owner, 2026-11-23): the first level at any harbour; the deep and lamp bells only in Reef yards (salvage water),
// the lantern boat only in Lantern Guild harbours (they light the dark). The Free Cays sell the plain boat cheaper (they live in small boats).
export const SOLD_IN = { bell: [null, 'reef', 'reef'], boat: [null, 'lantern'] };
export const CHEAP_IN = { boat: ['free', 0.7] };
export const SOLD_ELSEWHERE = { reef: 'The deep bells come from the Reef yards. Nobody else will make one.', lantern: 'A boat with a lamp of its own? The Guild fits those. Nobody else.' };
/** can this harbour (its region) sell level lv+1? */
export const soldHere = (id, lv, region) => { const r = (SOLD_IN[id] || [])[lv]; return !r || r === region; };
export const priceHere = (id, region) => (CHEAP_IN[id] && CHEAP_IN[id][0] === region ? CHEAP_IN[id][1] : 1);
export const GEAR_DRAG = { bell: 0.04, boat: 0.06 };   // speed lost while it is aboard (towed or swinging on its davit)
export const TETHER = 260, BOAT_NEAR = 90, BACK_R = 10, LAND_R = 12, BELL_R = 14;
export const AIR = 40;   // s of air on the first bell; each level more
const gearAt = () => state.story.gearAt || (state.story.gearAt = {});
export const owned = (id) => (state.upgrades[id] || 0) > 0;
/** is it on the Gull now? (bought and not left at a harbour) */
export const aboard = (id) => owned(id) && !gearAt()[id];
export const leftAt = (id) => gearAt()[id] || null;
export const leave = (id, harbourId) => { if (aboard(id)) { gearAt()[id] = harbourId; G.refreshMods(); } };
export const takeBack = (id) => { delete gearAt()[id]; G.refreshMods(); };
/** the speed the gear costs (main.js refreshMods multiplies by it) */
export const gearDrag = () => 1 - (aboard('bell') ? GEAR_DRAG.bell : 0) - (aboard('boat') ? GEAR_DRAG.boat : 0);
export const gearOn = () => !DEMO();

// ---- the sites: one per region (the clue rows are in clues.js, `gear: true`). Placed off a landmark of that region's water.
export const SITES = [
  { id: 'home', region: 'home', gear: 'bell', lv: 1, lm: 'bell', dx: 6, dz: 30, clue: 'CL-G-home', view: 'street', chest: 'lampglass',
    look: 'Under the water, roofs, and a doorstep. A diving bell could go down to it.',
    find: 'On a doorstep under the tower, set down neatly, the bell\'s clapper. Beside it a lamp glass, still warm to the hand through the water.' },
  { id: 'reef', region: 'reef', gear: 'bell', lv: 2, lm: 'wreck', dx: -26, dz: 18, clue: 'CL-G-reef', view: 'hold', chest: 'grounddie',
    look: 'The Marigold\'s hold, under the sand and the sea. It would take a deep bell.', short: 'The chain runs out before the bottom. A deeper bell, with a pump.',
    find: 'In the hold, a plank with dice set out in a row. Every one has the same face ground smooth. Somebody did it carefully, one evening after another.' },
  { id: 'drowned', region: 'drowned', gear: 'bell', lv: 3, lm: 'street', dx: 24, dz: -22, clue: 'CL-G-drowned', view: 'door',
    look: 'The street goes on under the water, further than the low tide shows. Down there it is dark.', short: 'Black, all the way down. The bell would need a lamp of its own.',
    find: 'Behind the blue door, a kitchen. The table is laid. The chair is pushed in, the way you leave a chair for someone who is told to wait.' },
  { id: 'free', region: 'free', gear: 'boat', lv: 1, lm: 'lagoon', dx: -6, dz: -6, clue: 'CL-G-free', near: 70,
    look: 'Inside the reef, a stair cut in the inner shore. The Gull will never get in there. A small boat would.',
    find: 'A stair cut into the inner shore of the lagoon, going down into the water. The steps are worn in the middle. None of the wear goes up.' },
  { id: 'crown', region: 'crown', gear: 'boat', lv: 1, lm: 'archive', dx: 0, dz: 24, clue: 'CL-G-crown', chest: 'tomorrowkey',
    look: 'A water gate under the fort, too low for the Gull. A small boat would go in under it.',
    find: 'Under the fort, a boat-shed. The oldest ledgers are kept dry in it, wrapped in oilcloth. The newest bundle is tied with a string, and on the label is tomorrow.' },
  { id: 'lantern', region: 'lantern', gear: 'boat', lv: 2, lm: 'press', dx: -26, dz: -8, clue: 'CL-G-lantern',
    look: 'A cave mouth under the press, low and black. A small boat could go in, with a light.', short: 'Too dark in there to row. The boat needs a lantern.',
    find: 'In the cave under the press the water is warm, and the oil comes up in rings. Something below turns over, slowly, the way you turn over in bed.' },
];
export const siteAt = (s) => ({ x: LM[s.lm].x + s.dx, z: LM[s.lm].z + s.dz });
export const siteDone = (s) => hasSeen(state, s.clue);
export const siteFor = (region) => SITES.find((s) => s.region === region);

// ---- in the world: bubbles over a bell site, a mooring post at a boat site; the bell and the boat on the Gull
let marks = null;
function buildMarks() {
  marks = [];
  for (const s of SITES) {
    const p = siteAt(s), g = new THREE.Group(); g.position.set(p.x, 0, p.z);
    const b = new Builder();
    if (s.gear === 'bell') {   // a ring of pale bubbles, a little slick
      for (let i = 0; i < 9; i++) { const a = i * 0.7, r = 1.2 + (i % 3) * 0.9; b.box(Math.cos(a) * r, 0.08, Math.sin(a) * r, 0.22, 0.12, 0.22, '#e8f4f0', TILE.white); }
      b.box(0, 0.02, 0, 3.2, 0.02, 3.2, '#5a8a8a', TILE.white, false);
    } else {   // a weathered post with a ring of rope at the landing
      b.box(0, 0.9, 0, 0.32, 2.4, 0.32, '#5a3418', TILE.planks); b.box(0, 1.5, 0, 0.5, 0.14, 0.5, '#c8b890', TILE.white);
      b.box(0.9, 0.2, 0.3, 0.9, 0.3, 0.6, '#8a7e6a', TILE.stone);
    }
    const m = new THREE.Mesh(b.geometry(), mats.props); g.add(m);
    g.userData.site = s; g.userData.bob = Math.random() * 6;
    scene.add(g); marks.push(g);
  }
}

// ---- the boat out (rt.boat): the Gull is a copy left at anchor; the ship the player steers is the boat
let boatMesh = null;
export const inBoat = () => !!rt.boat;
function takeBoat() {
  const S = G.ship, ghost = S.root.clone(true);
  if (S.gear) { const gg = ghost.children.find((c) => c.userData && c.userData.gearGroup); if (gg) for (const c of gg.children) if (c.userData && c.userData.towed) c.visible = false; }
  scene.add(ghost);
  rt.boat = { ax: S.pos.x, az: S.pos.z, ah: S.heading, ghost, far: false };
  S.root.visible = false;
  if (!boatMesh) { boatMesh = new THREE.Mesh(buildBoat().geometry(), mats.props); boatMesh.scale.setScalar(1.15); scene.add(boatMesh); }
  boatMesh.visible = true;
  const bx = Math.sin(S.heading), bz = -Math.cos(S.heading);
  S.pos.x -= bx * 9; S.pos.z -= bz * 9; S.speed = 0; S.vel = null; S.heading += Math.PI;   // she lies astern; the boat faces away
  S.rowing = true; S.oarOut = 1; S.rowBoost = 1.55; S.anchored = false; rt.anchorAt = null;
  G.audio.play('ui');
  if (!state.story.boatOnce && G.objectives && G.objectives.mate && !G.objectives.mate.busy) { state.story.boatOnce = 1; G.objectives.mate.say('I will mind her, Captain. Do not row out of sight.'); }
}
function boardGull() {
  const S = G.ship, B = rt.boat; if (!B) return;
  scene.remove(B.ghost);
  S.pos.x = B.ax; S.pos.z = B.az; S.heading = B.ah; S.speed = 0; S.vel = null;
  S.root.visible = true; S.rowing = false; S.rowBoost = 1;
  if (boatMesh) boatMesh.visible = false;
  rt.boat = null;
  G.audio.play('ui');
}
/** the position a save keeps: the Gull's, never the boat's */
export const savePos = () => (rt.boat ? { x: rt.boat.ax, z: rt.boat.az, h: rt.boat.ah } : { x: G.ship.pos.x, z: G.ship.pos.z, h: G.ship.heading });
/** passes.js barrierPass: the boat goes over the reef and through the breakers (the third way in) */
export const boatPass = (lm) => !!rt.boat && (lm === 'lagoon' || lm === 'ribs');

// ---- what E does (systems/interact.js getInteract asks first while the boat is out, and before landmarks otherwise)
const dist = (p) => Math.hypot(G.ship.pos.x - p.x, G.ship.pos.z - p.z);
export function gearInteract(inBoatMode) {
  if (!gearOn()) return null;
  if (inBoatMode) {
    const B = rt.boat;
    if (Math.hypot(G.ship.pos.x - B.ax, G.ship.pos.z - B.az) < BACK_R) return { kind: 'gear', key: 'gear:back', act: 'back', prompt: '[E] Climb back aboard the Gull' };
    const lb = G.world.nearest(G.ship.pos.x, G.ship.pos.z, 16), onLm = lb && lb.desc.lm;   // ashore at the site's own island: its landing first, until it is found
    for (const s of SITES) if (s.gear === 'boat' && (dist(siteAt(s)) < LAND_R || (onLm === s.lm && !siteDone(s)))) return { kind: 'gear', key: 'gear:' + s.id, act: 'land', site: s, prompt: siteDone(s) ? '[E] Go ashore again' : '[E] Go ashore' };
    return null;
  }
  for (const s of SITES) {
    const p = siteAt(s), d = dist(p);
    if (s.gear === 'bell' && d < BELL_R) {
      if (!aboard('bell')) return { kind: 'gear', key: 'gear:' + s.id, act: 'look', site: s, prompt: '[E] Look down into the water' };
      return { kind: 'gear', key: 'gear:' + s.id, act: 'bell', site: s, prompt: '[E] Lower the bell' };
    }
    if (s.gear === 'boat' && d < (s.near || BOAT_NEAR)) {
      if (!aboard('boat')) return d < (s.near || BOAT_NEAR) * 0.6 ? { kind: 'gear', key: 'gear:' + s.id, act: 'look', site: s, prompt: '[E] Look at the shore' } : null;
      return { kind: 'gear', key: 'gear:boat', act: 'boat', prompt: '[E] Take the boat' };
    }
  }
  if (aboard('boat')) for (const lm of ['lagoon', 'ribs']) if (LM[lm] && dist(LM[lm]) < 110 && dist(LM[lm]) > 40) return { kind: 'gear', key: 'gear:boat', act: 'boat', prompt: '[E] Take the boat' };
  return null;
}
export function gearAct(tg) {
  const s = tg.site;
  if (tg.act === 'back') { boardGull(); return; }
  if (tg.act === 'boat') { takeBoat(); return; }
  if (tg.act === 'look') { toast(s.look, false, 6500); (state.story.gearLook = state.story.gearLook || {})[s.id] = state.dayN; return; }
  if (tg.act === 'land') {
    if ((state.upgrades.boat || 0) < s.lv) { toast(s.short, false, 5000); return; }
    if (!rt.dig) rt.dig = { key: tg.key, t: 0, label: 'Going ashore...', need: 2.6, done: () => found(s) };
    return;
  }
  if (tg.act === 'bell') {
    if ((state.upgrades.bell || 0) < s.lv) { toast(s.short, false, 5000); return; }
    if (!rt.dig) rt.dig = { key: tg.key, t: 0, label: 'Lowering the bell...', need: 3, done: () => openDive(s) };
  }
}
/** the find: the clue, a note, a thing for the sea chest (once); again only its view */
function found(s) {
  if (siteDone(s)) { toast(s.again || 'It is as you left it.', false, 5000); return; }
  G.seeClue(s.clue);
  state.notes.push({ text: s.find, dark: false });
  if (rt.modal !== 'dive') toast(s.find, false, 9000);   // in the bell the line is under the view
  if (s.chest) setTimeout(() => chestAdd(s.chest, regionAt(G.ship.pos.x, G.ship.pos.z, state.seed)), 1200);
  if (s.id === 'drowned') state.story.maraQuiet = state.dayN;   // Mara says nothing at all this time (the storyboard, 5)
  G.audio.play('discover', { vol: 0.5 });
}

// ---- the dive screen (its own modal, 'dive'): 320x180 out of a 640-wide painted view
const W = 320, H = 180, PW = 640;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hx = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const hash = (x, y, s = 1) => { let h = Math.imul(x * 374761393 + y * 668265263 + s * 2147483647, 1274126177); h = (h ^ (h >>> 13)) >>> 0; return (Math.imul(h, 1103515245) >>> 8) / 16777216; };
const VIEWS = {   // glint: where the thing worth a look lies in the 640-wide view
  street: { water: ['#041418', '#0a2a30', '#14444a', '#22646a', '#3a8a88'], glint: 430, light: 0.9 },
  hold: { water: ['#06100e', '#0e2420', '#1a3a30', '#2a5444', '#447060'], glint: 300, light: 0.7 },
  door: { water: ['#020406', '#040a10', '#0a1620', '#142834', '#24404a'], glint: 360, light: 0.35, lamp: true },
};
function paintView(kind) {
  const cv = document.createElement('canvas'); cv.width = PW; cv.height = H;
  const ctx = cv.getContext('2d'), V = VIEWS[kind], img = ctx.createImageData(PW, H), d = img.data, ramp = V.water.map(hx), n = ramp.length - 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < PW; x++) {   // water: light from above, falling off with depth; slow shafts
    const shaft = 0.12 * Math.max(0, Math.sin(x * 0.03 + y * 0.012) - 0.6) * (1 - y / H);
    let v = (1 - y / H) * 0.85 * V.light + shaft + (hash(x >> 2, y >> 2, 3) - 0.5) * 0.06;
    if (y > 128 + Math.sin(x * 0.02) * 4) v = 0.25 + 0.2 * hash(x >> 1, y >> 1, 9) + 0.15 * (V.light);   // the bottom
    const t = Math.max(0, Math.min(1, v)) * n, i = Math.min(n - 1, Math.floor(t)), c = ramp[t - i > BAYER[(y & 3) * 4 + (x & 3)] / 16 ? i + 1 : i], k = (y * PW + x) * 4;
    d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); };
  if (kind === 'street') {
    for (let i = 0; i < 7; i++) {   // house fronts down the street, the far ones paler
      const x = 20 + i * 90, w = 64, h = 70 + (i % 3) * 12, y = 132 - h, c = i % 2 ? '#1a3a3c' : '#163234';
      R(c, x, y, w, h); R('#0e2224', x - 4, y - 8, w + 8, 10);
      R('#0a1a1a', x + 24, y + h - 30, 16, 30);   // a door
      R('#081616', x + 22, y + h - 2, 20, 4);       // the doorstep
      R(i === 4 ? '#c8a04a' : '#0c1e20', x + 8, y + 16, 12, 12); R(i === 4 ? '#c8a04a' : '#0c1e20', x + 44, y + 16, 12, 12);   // one window lit
    }
    R('#2a4a44', 300, 112, 26, 20); R('#122a28', 304, 108, 18, 6);   // the well
  } else if (kind === 'hold') {
    for (let i = 0; i < 12; i++) { const x = i * 56 + 10; R('#1a120a', x, 0, 12, 150); R('#241a10', x + 2, 0, 4, 150); }   // the ribs of the hull
    R('#1a120a', 0, 0, PW, 14);
    R('#3a2a18', 250, 118, 110, 6); R('#2a1a10', 256, 124, 6, 12); R('#2a1a10', 348, 124, 6, 12);   // the plank on two trestles
    for (let i = 0; i < 9; i++) { R('#d8d0bc', 258 + i * 11, 110, 7, 7); R('#a89c84', 258 + i * 11, 115, 7, 2); }   // dice in a row
  } else if (kind === 'door') {
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 104, c = '#0a1218';
      R(c, x, 40, 80, 92); R('#060c10', x + 30, 84, 22, 48);
      if (i === 3) { R('#1a3a7a', x + 30, 84, 22, 48); R('#0a1218', x + 34, 84, 6, 48); R('#3a2a10', x + 44, 106, 3, 3); }   // the blue door, ajar
    }
  }
  return cv;
}
let diveEl = null, cv = null, cx = null, views = {}, D = null, keysDown = new Set();
export function initDive() {
  diveEl = document.getElementById('dive'); if (!diveEl) return;
  cv = document.getElementById('diveCv'); cx = cv.getContext('2d');
  window.addEventListener('keydown', (e) => { if (rt.modal !== 'dive') return; keysDown.add(e.code); if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); diveE(); } });
  window.addEventListener('keyup', (e) => keysDown.delete(e.code));
  diveEl.addEventListener('pointerdown', (e) => { if (rt.modal !== 'dive') return; const r = diveEl.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width; if (fx < 0.25) D.pan -= 40; else if (fx > 0.75) D.pan += 40; else diveE(); });
}
export const diveElement = () => diveEl;
export function openDive(s) {
  if (!diveEl) return;
  const lv = state.upgrades.bell || 1;
  D = { s, pan: 80 + (hash(s.id.length, 3, 7) * 140 | 0), air: AIR * (1 + 0.5 * (lv - 1)), max: AIR * (1 + 0.5 * (lv - 1)), looked: false, last: performance.now(), line: '' };
  views[VIEWS[s.view] ? s.view : 'street'] = views[s.view] || paintView(s.view);
  document.getElementById('diveSay').textContent = '';
  G.openModal('dive');
  G.audio.play('ui', { vol: 0.4 });
  requestAnimationFrame(frame);
}
function diveE() {
  if (!D) return;
  const V = VIEWS[D.s.view], near = Math.abs(D.pan + W / 2 - V.glint) < 34;
  if (near && !D.looked) {
    D.looked = true;
    if (siteDone(D.s)) document.getElementById('diveSay').textContent = 'It is as you left it.';
    else { document.getElementById('diveSay').textContent = D.s.find; found(D.s); }
    return;
  }
  G.closeModal();
}
export function diveClosed() { D = null; keysDown.clear(); }
function frame(now) {
  if (!D || rt.modal !== 'dive') return;
  const dt = Math.min(0.1, (now - D.last) / 1000); D.last = now;
  const turn = (keysDown.has('ArrowLeft') || keysDown.has('KeyA') ? -1 : 0) + (keysDown.has('ArrowRight') || keysDown.has('KeyD') ? 1 : 0);
  D.pan = Math.max(0, Math.min(PW - W, D.pan + turn * 60 * dt));
  D.air -= dt;
  if (D.air <= 0) { toast('The air runs short. The bell comes up.', false, 3500); G.closeModal(); return; }
  const V = VIEWS[D.s.view];
  cx.drawImage(views[D.s.view], -Math.round(D.pan), 0);
  if (V.lamp) {   // the lamp bell: one cone of light, the rest black
    const img = cx.getImageData(0, 0, W, H), d = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const r = Math.hypot(x - W / 2, (y - H * 0.55) * 1.3) / 90, k = (y * W + x) * 4, m = r < 1 ? 1 + 0.9 * (1 - r) : (r < 1.25 && BAYER[(y & 3) * 4 + (x & 3)] / 16 > (r - 1) * 4) ? 0.6 : 0.12; d[k] = Math.min(255, d[k] * m); d[k + 1] = Math.min(255, d[k + 1] * m); d[k + 2] = Math.min(255, d[k + 2] * m); }
    cx.putImageData(img, 0, 0);
  }
  if (!D.looked) {   // the glint: a small pale blink
    const gx = V.glint - D.pan, on = Math.floor(now / 380) % 3 !== 0;
    if (gx > 4 && gx < W - 4 && on) { cx.fillStyle = '#f0f4e8'; cx.fillRect(gx - 1, 118, 3, 1); cx.fillRect(gx, 117, 1, 3); }
  }
  // the port's rim: brass round a circle; the rest dark
  cx.fillStyle = '#0a0806';
  for (let y = 0; y < H; y++) { const dy = (y - H / 2) / (H * 0.48), w = dy * dy < 1 ? Math.sqrt(1 - dy * dy) * H * 0.62 : 0; cx.fillRect(0, y, W / 2 - w, 1); cx.fillRect(W / 2 + w, y, W / 2 - w + 1, 1); cx.fillStyle = '#7a5a22'; if (w) { cx.fillRect(W / 2 - w - 3, y, 3, 1); cx.fillRect(W / 2 + w, y, 3, 1); } cx.fillStyle = '#0a0806'; }
  // the air: a rope on the left, paying out from a coil; shorter as the air goes
  const ropeH = Math.round(140 * D.air / D.max);
  cx.fillStyle = '#5a4a2a'; cx.fillRect(20, 16, 6, 148);
  cx.fillStyle = '#c8b890'; for (let y = 0; y < ropeH; y += 4) { cx.fillRect(21, 164 - ropeH + y, 4, 2); cx.fillRect(22, 166 - ropeH + y, 3, 1); }
  requestAnimationFrame(frame);
}

// ---- each frame (main.js, after ship.place): the gear on the Gull, the boat on the water, the marks, the tether
let tick0 = false;
export function gearTick(dt, t) {
  if (!gearOn()) return;
  if (!tick0) { tick0 = true; buildMarks(); }
  const S = G.ship, H = S.gear;
  if (H) {
    H.bell.visible = H.chain.visible = aboard('bell');
    H.boat.visible = H.line.visible = aboard('boat') && !rt.boat;
    const want = (rt.dig && /bell/.test(rt.dig.label || '')) || rt.modal === 'dive' ? 2.4 : 0;
    H.drop += (want - H.drop) * Math.min(1, dt * 1.2); H.place();
  }
  for (const g of marks) { g.position.y = Math.sin(t * 0.9 + g.userData.bob) * 0.12; g.visible = Math.hypot(g.position.x - S.pos.x, g.position.z - S.pos.z) < 500; }
  const B = rt.boat; if (!B) return;
  S.rowing = true; S.oarOut = 1;
  if (boatMesh) { boatMesh.position.set(S.pos.x, (S.float ? S.float.y : 0) - 0.25, S.pos.z); boatMesh.rotation.set(0, -S.heading, S.float ? S.float.r * 0.6 : 0); }
  B.ghost.position.y = Math.sin(t * 0.8) * 0.15;
  const d = Math.hypot(S.pos.x - B.ax, S.pos.z - B.az);
  if (d > TETHER) {   // too far from her: the boat turns for home by itself (never a fail state)
    const want = Math.atan2(B.ax - S.pos.x, -(B.az - S.pos.z));
    S.heading += angleDiff(want, S.heading) * Math.min(1, dt * 1.5);
    if (!B.far) { B.far = true; toast('The Gull is a long way off. The boat turns for her.', false, 4000); }
  } else if (d < TETHER - 40) B.far = false;
}
export const diveState = () => D;   // tests only
