// What the endings leave behind (owner, 2026-11-18; docs/CANON.md section 3). The Table's own choices and texts are in table.js; this
// file runs what comes before and after them:
//   - the arrival: as the ship nears the Table the candles light one by one, the fog draws back, the sound thins, Mara goes quiet;
//     the voyage is copied aside on arriving (TABLE_KEY) so a closed ending can be gone back to
//   - She Rises, the Unseen Throw and Your Seat close the voyage (state.story.over): the title then offers only "Begin again" and
//     "Go back to the table" (the copy). Back at the table after She Rises, Mara says once that it will not come out above nine,
//     and the throw shows the same face as before (state.story.again)
//   - The Tune Is Kept: a guitar waits on Tama's quay; aboard, it plays at night wherever the ship is, and the night keeps no dread
//   - The Unseen Throw: a few minutes of ordinary sailing (UNSEEN_AFTER), then the world turns wherever the ship is (the one sanctioned
//     exception to "dread follows place"): the sea empties, Tama's bell stops, the blank line in the book is filled, Mara asks where
//     everybody went; then the table stands on the water ahead, a chair pulled out, and the voyage ends
//   - Your Seat: the book, open, once (every voyage before: too dense to read), then a ship you do not know comes in; credits, title
// Nothing here exists in the demo (RULES 29). Never explained.
import * as THREE from 'three';
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { params, store, session, SAVE_KEY } from '../core/config.js';
import { LM } from '../landmarks.js';
import { pierOf, hutSpot } from '../world.js';
import { tableOpen } from '../clues.js';
import { smoothstep } from '../util.js';
import { paintStill } from '../cavescene.js';
import { finalThrow, AGAIN, OVER, GUITAR, UNSEEN, SEAT } from '../table.js';
import { $, toast } from '../ui/dom.js';
import { Builder } from '../builder.js';
import { TILE } from '../textures.js';
import { mats } from '../psx.js';

export const TABLE_KEY = 'pocket-pirates-table-v1';   // the voyage as it was on arriving at the Table (not the save: a copy beside it)
export const UNSEEN_AFTER = 240;   // game seconds of ordinary sailing after the Unseen Throw before the world starts to turn (?unseen=N in tests)
const UNSEEN_RAMP = 150;           // ...and how long it takes to turn
const UNSEEN_CAP = 0.93;           // as deep as it goes: short of the Eye's own clock (abyss.js counts only above ~0.95)
const NEAR = 340, AT = 50;         // the arrival builds from NEAR units out and is whole at AT
const DEMO = typeof window !== 'undefined' && window.__BUILD === 'demo';
const clamp01 = (v) => Math.max(0, Math.min(1, v));

rt.tableK = 0; rt.tableHush = 0; rt.unseenK = 0; rt.guitarK = 0; rt.over = false;

// ---------------------------------------------------------------- arriving
/** each frame (real time: it also eases while the card is open). The approach k is 0 far off, 1 at the table */
export function ritualTick(dt, ship) {
  let k = 0;
  if (!DEMO && !state.story.ending && tableOpen(state)) { const t = LM.table; k = 1 - smoothstep(AT, NEAR, Math.hypot(ship.pos.x - t.x, ship.pos.z - t.z)); }
  rt.tableK += (k - rt.tableK) * Math.min(1, dt * 0.6);
  if (rt.tableK < 0.002) rt.tableK = 0;
  rt.tableHush = rt.tableK * 0.75;   // the music and the sea thin out (main.js hands it to audio.hush)
}
/** the fog draws back as you come (after the stage's own fog is set) */
export function ritualLook(stage) {
  const k = rt.tableK; if (k <= 0) return;
  stage.fogNear += (Math.max(stage.fogNear, 90) - stage.fogNear) * k;
  stage.fogFar += (Math.max(stage.fogFar, 460) - stage.fogFar) * k;
}
/** what the Table's 3D props read (world.gctx.end): candles by k, the drawing by the way the Edge was left, the chair by the ending */
export const tableGctx = () => ({ k: rt.tableK, edge: state.story.edgeWay === 'over' ? 'over' : 'out', sat: state.story.ending ? state.story.ending.id : null });

/** going ashore at the Table: the voyage is copied aside (the save as it is now), so a closed ending can be gone back to */
export function snapshotTable() {
  if (DEMO || !G.saveData) return;
  const data = G.saveData(); if (data) store.set(TABLE_KEY, data);
}
/** the arrival card's extra line and the face the die will show, when this is a return after She Rises; the line is said once */
export function tableAgain() {
  const a = state.story.again; if (!a) return { line: '', n: null };
  const line = state.story.againSaid ? '' : AGAIN; state.story.againSaid = 1;
  return { line, n: a.n };
}
/** the last throw: the same face as before after a return, else the die */
export function tableThrow() { const a = state.story.again; return finalThrow(state, a && a.n ? a.n : 1 + Math.floor(Math.random() * 20)); }

// ---------------------------------------------------------------- the ending card's buttons, and what an ending sets going
const BTN = {};
/** the card's buttons: closed endings have only "Go on"; the game-over screen has only Begin again / Go back to the table */
export function endButtons(mode) {
  const show = (id, on, label) => { const b = BTN[id] || $(id); b.style.display = on ? '' : 'none'; if (label) b.textContent = label; };
  const closed = mode === 'rises' || mode === 'sit', over = mode === 'over';
  show('endGo', !over, closed ? OVER.go : 'Keep sailing'); show('endTitle', !over && !closed);
  show('endAgain', over); show('endBack', over && !!store.get(TABLE_KEY));
}
/** an ending was chosen (main.js showEnding): what it sets going at once, whether the voyage goes on or not */
export function onEnding(id, roll) {
  rt.tableK = 0; rt.tableHush = 0;
  const st = state.story;
  if (roll) st.ending.face = roll.n;
  if (id === 'tune' && !st.guitar) st.guitar = 'waiting';   // a new errand: something waits on Tama's quay
  if (id === 'leave' && !st.unseen) st.unseen = { t: 0 };
  if (id === 'rises' || id === 'sit') st.over = id;          // no going on from here: only the title's two ways
  endButtons(id);
}

// ---------------------------------------------------------------- game over
/** the end of a closed voyage: one still, a few lines (or none), and the two ways back */
export function gameOver(kind) {
  const st = state.story; st.over = st.over || kind; rt.over = true; rt.forced = null;
  if (G.saveNow) G.saveNow();
  const el = $('ending'); el.classList.add('dark');
  el.querySelector('h1').textContent = '';
  el.querySelector('div').innerHTML = (kind === 'unseen' ? UNSEEN.end : []).map((l) => `<p>${l}</p>`).join('');
  $('endArt').src = paintStill('table', kind === 'unseen' ? 'pulled' : kind === 'sit' ? 'seat' : 'gone');
  endButtons('over');
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  $('fade').classList.remove('on');
}
function beginAgain() {   // a new voyage: the save and the copy go
  session.noSave = true;
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(TABLE_KEY); sessionStorage.setItem('hoist-new', '1'); } catch (e) { /* storage blocked */ }
  location.href = location.pathname;
}
function backToTable() {   // the voyage as it was on arriving at the Table; after She Rises the die remembers its face
  const snap = store.get(TABLE_KEY); if (!snap) { beginAgain(); return; }
  const st = state.story, e = st.ending;
  snap.story = snap.story || {};
  if (st.over === 'rises' && e && e.face) snap.story.again = { n: e.face };
  delete snap.story.againSaid;
  session.noSave = true; store.set(SAVE_KEY, snap);
  location.href = location.pathname;
}
/** the title: a closed voyage cannot be sailed on; it offers the two ways back instead (ui/title.js startTitle) */
export function overTitle() {
  const over = !DEMO && !!state.story.over;
  $('tSail').style.display = over ? 'none' : ''; if (over) $('tNew').style.display = 'none';
  BTN.tAgain.style.display = over ? '' : 'none'; BTN.tBack.style.display = over && store.get(TABLE_KEY) ? '' : 'none';
  if (over) setTimeout(() => BTN.tAgain.focus(), 60);
  return over;
}
/** boot (main.js): the extra buttons on the ending card and the title */
export function initEndgame() {
  const mk = (id, label, fn, after) => { const b = document.createElement('button'); b.id = id; b.textContent = label; b.style.display = 'none'; after.after(b); b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); BTN[id] = b; return b; };
  mk('endBack', OVER.back, backToTable, $('endTitle')); mk('endAgain', OVER.again, beginAgain, $('endTitle'));
  mk('tBack', OVER.back, backToTable, $('tSail')); mk('tAgain', OVER.again, beginAgain, $('tSail'));
  if (state.story.over && !DEMO) rt.over = true;   // the demo never has a closed voyage (RULES 29)
}

// ---------------------------------------------------------------- The Tune Is Kept: the guitar
let guitar = null;
/** the guitar on deck, its silent twin (RULES 28): lying by the stern rail; at night, while it plays, a small warm light and a slow sway */
function guitarMesh(ship) {   // built like every other prop (Builder, the props material, lit by the game's own shader: 2026-11-18, it was unlit black)
  const g = new THREE.Group(), B = new Builder(), cbox = (x, y, z, w, h, d, c, t = TILE.planks) => B.box(x, y - h / 2, z, w, h, d, c, t);
  cbox(0, 0, 0.18, 0.42, 0.1, 0.5, '#a0602a'); cbox(0, 0, -0.18, 0.34, 0.1, 0.3, '#a0602a');
  cbox(0, 0.005, -0.02, 0.1, 0.11, 0.1, '#2a1608'); cbox(0, 0.02, -0.65, 0.08, 0.06, 0.7, '#4a2c16'); cbox(0, 0.02, -1.05, 0.12, 0.06, 0.16, '#2a1a0e');
  const body = new THREE.Mesh(B.geometry(), mats.props); g.add(body);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), new THREE.MeshBasicMaterial({ color: '#ffc060' })); lamp.position.set(0.32, 0.12, 0.5); g.add(lamp);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ color: '#ffb050', transparent: true, opacity: 0.22, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0.15, -0.04, 0.2); g.add(pool);
  g.position.set(0.7, 0.9, -0.5); g.rotation.set(0.25, -0.3, 0);   // propped against the starboard rail, amidships
  g.userData = { lamp, pool, body };
  g.visible = false; ship.root.add(g);
  return g;
}
/** each frame at sea: dock at Tama takes it aboard; at night it plays (rt.guitarK: 0..1) */
export function guitarTick(dt, ship, night) {
  const st = state.story;
  if (DEMO || !st.guitar) return;
  if (!guitar) guitar = guitarMesh(ship);
  const aboard = st.guitar === 'aboard';
  guitar.visible = aboard;
  const on = aboard && night > 0.4;
  rt.guitarK += ((on ? 1 : 0) - rt.guitarK) * Math.min(1, dt * 0.25);
  const u = guitar.userData, k = rt.guitarK;
  u.lamp.visible = u.pool.visible = k > 0.3;
  u.pool.material.opacity = 0.22 * k;
  u.body.rotation.z = k > 0.3 ? Math.sin(rt.tNow * 2.1) * 0.03 * k : 0;   // a small sway, as if someone were holding it
}
/** the night keeps no dread while the guitar plays (after the Cays' own quiet) */
export const guitarDread = (target) => target * (1 - rt.guitarK);
/** docking (systems/interact.js): Tama's quay has the bundle */
export function guitarDock(d) {
  const st = state.story;
  if (DEMO || st.guitar !== 'waiting' || d.id !== '0,-1') return;
  st.guitar = 'aboard';
  setTimeout(() => { toast(GUITAR.found, false, 9000); setTimeout(() => G.objectives.mate.say(GUITAR.mara), 3500); }, 1800);
}
/** where the errand points (ui/hud.js trackTarget) while the guitar waits */
export function guitarTarget() {
  if (DEMO || state.story.guitar !== 'waiting') return null;
  const d = G.world.desc(0, -1), p = d && pierOf(d); return p ? { x: p.x, z: p.z, label: GUITAR.where } : null;
}

// ---------------------------------------------------------------- The Unseen Throw
let ahead = null;
function tableOnWater() {   // a table standing on the water, laid for two: a candle, the far chair taken, the near one pulled out (props material: 2026-11-18)
  const g = new THREE.Group(), B = new Builder(), box = (w, h, d, x, y, z, c, t = TILE.planks) => B.box(x, y - h / 2, z, w, h, d, c, t);
  box(3.4, 0.12, 1.6, 0, 1.0, 0, '#e8e2d4', TILE.white);
  for (const [x, z] of [[-1.5, -0.6], [1.5, -0.6], [-1.5, 0.6], [1.5, 0.6]]) box(0.14, 1.5, 0.14, x, 0.25, z, '#4a3a2a');
  box(0.7, 0.08, 0.7, 0, 0.55, -1.3, '#1c1214', TILE.stone); box(0.7, 1.0, 0.08, 0, 1.05, -1.65, '#1c1214', TILE.stone);   // the far chair
  box(0.6, 1.1, 0.5, 0, 1.15, -1.35, '#05040a', TILE.stone); box(0.34, 0.36, 0.34, 0, 1.92, -1.4, '#05040a', TILE.stone);   // and someone in it
  B.push(0.9, 0, 1.6, 0.7);   // the near chair, pulled out and turned to you
  for (const [w, h, d, x, y, z] of [[0.7, 0.08, 0.7, 0, 0.55, 0], [0.7, 1.0, 0.08, 0, 1.05, -0.35], [0.08, 0.6, 0.08, -0.3, 0.25, 0.3], [0.08, 0.6, 0.08, 0.3, 0.25, 0.3]]) box(w, h, d, x, y, z, '#e0d8c8', TILE.white);
  B.pop();
  box(0.12, 0.3, 0.12, 1.1, 1.2, -0.3, '#e8e0c8', TILE.white);
  box(0.5, 0.04, 0.36, -0.4, 1.08, 0, '#e8dcc0', TILE.white);   // the book
  g.add(new THREE.Mesh(B.geometry(), mats.props));
  const flame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), new THREE.MeshBasicMaterial({ color: '#ffe88a' })); flame.position.set(1.1, 1.42, -0.3); g.add(flame);
  return g;
}
/** each frame at sea (game time) */
export function unseenTick(dt, ship) {
  const st = state.story, u = st.unseen;
  if (DEMO || !u || st.over || rt.over) { rt.unseenK = 0; return; }
  u.t += dt;
  const test = params.has('unseen'), after = test ? +params.get('unseen') : UNSEEN_AFTER;   // a test run shortens the wait and the turn
  rt.unseenK = clamp01((u.t - after) / (test ? Math.max(5, after * 3) : UNSEEN_RAMP));
  const k = rt.unseenK; if (k <= 0) return;
  if (G.traffic) G.traffic.none = true;   // nobody new on the sea; those out of sight do not come back (traffic.js)
  if (k > 0.3 && !u.book) {   // the blank line is filled in, not in your hand
    u.book = 1; const n = 1 + Math.floor(Math.random() * 9);
    state.notes.push({ text: UNSEEN.book(n), dark: true }); toast(UNSEEN.bookToast, true, 8000);
  }
  if (k > 0.65 && !u.mara) { u.mara = 1; G.objectives.mate.say(UNSEEN.mara); }
  if (k < 1) return;
  // the table on the water: always ahead, a little nearer each time it is lost sight of
  u.tt = (u.tt || 0) + dt;
  const fx = Math.sin(ship.heading), fz = -Math.cos(ship.heading);
  if (!ahead) { ahead = tableOnWater(); ship.root.parent.add(ahead); u.d = 70; place(ship, fx, fz, u.d); }
  const dx = ahead.position.x - ship.pos.x, dz = ahead.position.z - ship.pos.z, d = Math.hypot(dx, dz);
  if (d > 200 || (dx * fx + dz * fz) / Math.max(1, d) < -0.2 || u.tt > 90) { u.d = Math.max(25, u.d * 0.7); u.tt = 0; place(ship, fx, fz, u.d); }
  ahead.position.y = Math.sin(rt.tNow * 0.7) * 0.05;   // it does not ride the swell
  if (d < 14 && !u.end) {   // there: dark, then the end
    u.end = 1; $('fade').classList.add('on'); ship.speed = 0;
    setTimeout(() => { if (ahead) { ahead.parent.remove(ahead); ahead = null; } gameOver('unseen'); }, 1800);
  }
}
function place(ship, fx, fz, D) { ahead.position.set(ship.pos.x + fx * D, 0, ship.pos.z + fz * D); ahead.rotation.y = Math.atan2(fx, fz); }
/** the dread the Unseen Throw allows: wherever the ship is, at least the turn so far */
export const unseenDread = (target) => (rt.unseenK > 0 ? Math.max(target, rt.unseenK * UNSEEN_CAP) : target);
/** Tama's bell does not ring once the world has turned (main.js noonBells) */
export const bellsStopped = () => rt.unseenK > 0;
/** Mara and the small talk hold their tongue: the arrival, and the turned world */
export const endQuiet = () => rt.tableK > 0.15 || rt.unseenK > 0;

// ---------------------------------------------------------------- Your Seat
let seatGen = 0;   // a newer start (or endgameReset) makes the pages' timers of an older one stop
/** after the ending card: the book, open, once (every voyage before); then a ship you do not know comes in; credits, title.
 *  from: 'newcomer' or 'pan' starts at that step (the Dev Studio, ui/devstudio.js) */
export function startSeat(credits, from = 'book') {
  const gen = ++seatGen, stale = () => gen !== seatGen;
  const st = state.story; st.over = 'sit'; if (G.saveNow) G.saveNow();
  const el = $('ending'), art = $('endArt'), txt = el.querySelector('div'), h1 = el.querySelector('h1');
  el.classList.add('dark'); h1.textContent = ''; txt.innerHTML = '';
  ['endGo', 'endTitle', 'endAgain', 'endBack'].forEach((id) => { (BTN[id] || $(id)).style.display = 'none'; });
  el.classList.add('show');
  let page = 0;
  const turn = () => {   // the pages go by faster and faster; nothing on them can be read
    if (stale()) return;
    art.src = paintStill('book', String(page));
    page++;
    if (page < 26) setTimeout(turn, Math.max(140, 1300 - page * 90));
    else setTimeout(newcomer, 1600);
  };
  const newcomer = () => {
    if (stale()) return;
    art.src = paintStill('table', 'seat');
    let i = 0;
    const next = () => {
      if (stale()) return;
      if (i < SEAT.length) { const p = document.createElement('p'); p.textContent = SEAT[i++]; txt.appendChild(p); setTimeout(next, 3200); return; }
      const b = BTN.endGo || $('endGo'); b.textContent = OVER.go; b.style.display = '';
      b.addEventListener('click', (e) => { if (stale()) return; e.stopImmediatePropagation(); startPan(credits); }, { once: true, capture: true });
    };
    setTimeout(next, 1400);
  };
  if (from === 'pan') startPan(credits); else if (from === 'newcomer') newcomer(); else turn();
}

// ---------------------------------------------------------------- Your Seat: the last look (owner 2026-11-18)
// After the newcomer, the world goes on without you. Since the owner's second note the same day: the view does not circle and does
// not move. It stands where the keeper of the die now sits, at the hut, beside its door, looking out to sea, the hut's own eaves in
// the corner of the frame. Time runs faster and faster (days and nights in seconds); boats cross and come in and go; the weather turns
// through its moods; until Mara says it is time to leave; then the credits.
const PAN = { RAMP: 30, TOP: 30, MARA: 34, END: 44, BOAT: 1.6, SKY: 4.5 };   // seconds (real), top speed (x game time), a boat and a change of sky every so often
export const SEAT_LEAVE = 'Captain, I think it is time to leave.';   // draft (the owner's words)
const SKIES = [   // what the weather turns through (weather.force), one after another
  { cloud: 0, rain: 0, storm: 0, fog: 0 }, { cloud: 0.7, rain: 0, storm: 0, fog: 0.1 }, { cloud: 1, rain: 0.7, storm: 0.2, fog: 0.1 },
  { cloud: 1, rain: 1, storm: 0.8, fog: 0.2 }, { cloud: 0.5, rain: 0.1, storm: 0, fog: 0.8 }, { cloud: 0.2, rain: 0, storm: 0, fog: 0, calm: 1 },
];
const SEAT_KINDS = ['fisher', 'canoe', 'merchant', 'schooner', 'fisher', 'galleon'];
/** where the keeper sits: the hut's place and which way its door looks (world.js darkHut); the Table if the hut is not there */
function keeperSpot() {
  const d = G.world && G.world.hutDesc, hp = d && (d.hutPos || hutSpot(d));
  if (hp) { const o = [Math.cos(hp.th), Math.sin(hp.th)]; return { x: d.x + hp.x, z: d.z + hp.z, y: hp.y, o }; }
  const L = LM.table || { x: 0, z: 0 }; return { x: L.x, z: L.z, y: 1, o: [0, 1] };
}
function startPan(credits) {
  const el = $('ending'); el.classList.remove('show', 'dark');
  const hud = $('hud'); if (hud) hud.classList.add('hidden');
  const K = keeperSpot(), o = K.o, sd = [-o[1], o[0]];
  const ship = G.ship;
  if (ship) {   // the Gull is not in this picture: she waits out of sight, and the world is loaded round the hut
    ship.pos.set(K.x + o[0] * 140, 0, K.z + o[1] * 140); ship.speed = 0; ship.trim = 0; ship.vel = null; ship.root.visible = false;
  }
  if (G.world) G.world.hutShown = true;
  const m = G.objectives.mate; m.queue.length = 0; m.cur = null; m.only = SEAT_LEAVE;   // nothing else is said now
  if (m.el) m.el.classList.remove('show');
  // the view: beside the door, under the eaves, seated height, looking out over the water; it never moves
  const cam = [K.x - o[0] * 2.5 + sd[0] * 6.5, K.y + 3.4, K.z - o[1] * 2.5 + sd[1] * 6.5], look = [K.x + o[0] * 70 - sd[0] * 4, 1.2, K.z + o[1] * 70 - sd[1] * 4];   // the hut's side and eaves in the frame, the sea beyond
  rt.camOverride = { pos: cam, look };
  rt.seatPan = { t: 0, speed: 1, credits, said: false, done: false, K, sd, boats: [], boatT: 0.5, sky: 0, skyT: PAN.SKY };
  if (G.weather) G.weather.force = { ...SKIES[0] };
  rt.over = false;   // the world runs again (the helm stays locked: seatPanTick)
}
/** a boat for the last look: across the bay one way or the other, or in towards the hut and away again */
function seatBoat(P) {
  const T = G.traffic; if (!T) return;
  const { K, sd } = P, o = K.o, n = P.boats.length + Math.floor(P.t * 7), kind = SEAT_KINDS[n % SEAT_KINDS.length];
  const way = n % 3, D = 45 + (n * 37) % 170, side = n % 2 ? 1 : -1;
  let x, z, h;
  if (way < 2) { x = K.x + o[0] * D + sd[0] * 230 * side; z = K.z + o[1] * D + sd[1] * 230 * side; h = Math.atan2(-sd[0] * side, sd[1] * side); }   // across
  else { x = K.x + o[0] * 260 + sd[0] * 40 * side; z = K.z + o[1] * 260 + sd[1] * 40 * side; h = Math.atan2(-o[0], o[1]); }   // in towards the hut
  const s = T.spawnAt(kind, 'free', x, z, h, 'live', KINDS_SPEED(kind));
  s.special = 'seat'; s.state = 'race'; s.seat = { way, turned: false };
  P.boats.push(s);
}
const KINDS_SPEED = (k) => ({ fisher: 5, canoe: 3.6, merchant: 6, schooner: 8, galleon: 4.5 }[k] || 5);
/** each frame (real time), before the simulation step: the speed of the world, the boats, the sky, Mara, the end */
export function seatPanTick(rawDt) {
  const P = rt.seatPan; if (!P || P.done) return;
  P.t += rawDt;
  P.speed = 1 + (PAN.TOP - 1) * smoothstep(0, PAN.RAMP, P.t);
  const { K } = P, o = K.o;
  if (G.ship) { G.ship.speed = 0; G.ship.trim = 0; G.ship.root.visible = false; }
  if ((P.boatT -= rawDt) <= 0) { P.boatT = PAN.BOAT * (0.6 + ((P.t * 13) % 1) * 0.8) / (1 + P.speed * 0.12); if (P.boats.length < 9) seatBoat(P); }   // more often as the world runs faster
  for (const s of P.boats) {   // the ones coming in turn short of the shore and go out again
    if (s.seat.way === 2 && !s.seat.turned && Math.hypot(s.x - K.x, s.z - K.z) < 70) { s.seat.turned = true; s.seat.to = s.heading + Math.PI; }
    if (s.seat.to != null) s.heading += Math.max(-0.02, Math.min(0.02, Math.atan2(Math.sin(s.seat.to - s.heading), Math.cos(s.seat.to - s.heading))));
  }
  P.boats = P.boats.filter((s) => G.traffic && G.traffic.ships.includes(s) && Math.hypot(s.x - K.x, s.z - K.z) < 300 || (s.special = null, dropSeatBoat(s), false));
  if ((P.skyT -= rawDt) <= 0) { P.skyT = PAN.SKY; P.sky = (P.sky + 1) % SKIES.length; if (G.weather) G.weather.force = { ...SKIES[P.sky] }; }
  if (!P.said && P.t > PAN.MARA) { P.said = true; G.objectives.mate.say(SEAT_LEAVE); }
  if (P.t > PAN.END) { P.done = true; endPan(); rt.over = true; P.credits(); }
}
function dropSeatBoat(s) { const T = G.traffic, i = T ? T.ships.indexOf(s) : -1; if (i < 0) return; T.scene.remove(s.root); if (s.wake) s.wake.dispose(T.scene); T.ships.splice(i, 1); }
function endPan() {
  const P = rt.seatPan; if (P) for (const s of P.boats) dropSeatBoat(s);
  rt.seatPan = null; rt.camOverride = null;
  if (G.weather) G.weather.force = null;
  if (G.ship) G.ship.root.visible = true;
}

/** dev (ui/devstudio.js): put back what the endings set going in this session: the table on the water, the last look, the closed
 *  voyage's lock, the empty sea, the cards. The story flags themselves are the Dev Studio's to restore */
export function endgameReset() {
  seatGen++;
  if (ahead) { if (ahead.parent) ahead.parent.remove(ahead); ahead = null; }
  endPan(); rt.over = false; rt.unseenK = 0; rt.tableK = 0; rt.tableHush = 0;
  if (G.traffic) G.traffic.none = false;
  const m = G.objectives && G.objectives.mate; if (m) m.only = null;
  const hud = $('hud'); if (hud) hud.classList.remove('hidden');
  $('ending').classList.remove('show', 'dark'); $('credits').classList.remove('show'); $('fade').classList.remove('on');
}
