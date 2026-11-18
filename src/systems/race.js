// The Sunday race (P-HOME-4; docs/proposals/REGIONAL_CATALOGUE.md, owner 2026-11-17). On a Sunday afternoon with the ship in Home Sound,
// the regatta gathers off Tama instead of sailing past: four boats hove-to beside a committee boat with a big flag, offshore and away
// from the main pier, on a line buoyed out to a pin (red and white floats, a chequered flag: the start and the finish).
// Since 2026-11-18 (owner: more instructions, an automatic stop, a GO, faster boats, an obvious line) they wait for the captain:
// Mara says they are waiting and the slip points at the line; coming up to the line stops the ship by itself (the anchor, as for E),
// a count of three, GO, and all make sail at once. If the captain does not come by RACE_WAIT they go without you (late is still allowed
// until the first boat is in). The course: up the line's side of the rolled isle about 175 out, round behind it, down its other side
// (so nobody cuts back across it) and back over the line. Finish ahead of at least one of them and Tama's harbourmaster has the purse
// for you (one row on the board): 30 for beating one, 10 more for each other. Last in: nothing. Weekly.
// Contained risk (the catalogue's "Risky-to-build"): no new boats (it takes the regatta's five hulls, and the passing regatta stays
// away that day), nothing at the main pier. Race boats sail by a simple polar: slower close to the wind, and they keep off the isle.
import * as THREE from 'three';
import { state } from '../core/state.js';
import { G, rt } from '../core/runtime.js';
import { U } from '../psx.js';
import { waveHeight } from '../ocean.js';
import { angleDiff, clamp, smoothstep } from '../util.js';
import { CELL, shoreR } from '../world.js';
import { KINDS } from '../traffic.js';
import { sectorAt } from '../sectors.js';
import { HOME_SOUND_R, TAMA_ID, RACE_DAY, RACE_GATHER, RACE_START, RACE_END, RACE_MARK, RACE_START_OFF, RACE_SPEEDS, RACE_START_R, RACE_ROUND_R,
  RACE_FINISH_R, RACE_PURSE, RACE_PURSE_EACH, RACE_WAIT, RACE_LINE } from '../regions.js';

/** what is said (drafts for the writer): Mara calls the captain over, then the count, then the result */
export const RACE_SAY = {
  waiting: 'Captain, the regatta is waiting for us off Tama. Bring us up to the line by the committee boat.',
  here: 'Here we are. Sails in, wait for the flag.',
  count: ['3', '2', '1', 'GO'],
  place: (n, of) => (n === 1 ? 'First over the line, Captain! The purse is at the harbourmaster\'s.' : n <= of ? `In ahead of ${of + 1 - n} of them. There is a purse for that at the harbourmaster's.` : 'Last in. Next Sunday, Captain.'),
  late: 'They went without us, Captain. We can still go round, if we hurry.',
};

const WP_R = 14;          // a race boat takes its next mark within this
const KEEP_OFF = 16;      // ...and keeps this far off the isle's shore
const PIER_AVOID = 0.8;   // radians: the course never leaves Tama along its main pier
const LINE_GAP = 9;       // the boats' spacing on the start line
let R = null;             // the race on the water today (not saved: a reload mid-race simply ends it)

/** where the course goes: the rolled isle to round and the start line, or null if Tama has no fitting isle */
function course(world) {
  const t = world.desc(0, -1); if (!t) return null;
  let best = null;
  for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
    const d = world.desc(Math.round(t.x / CELL) + dx, Math.round(t.z / CELL) + dz);
    if (!d || d.type === 'harbour' || d.lm) continue;
    const dist = Math.hypot(d.x - t.x, d.z - t.z), th = Math.atan2(d.z - t.z, d.x - t.x);
    if (dist < RACE_MARK[0] || dist > RACE_MARK[1] || Math.abs(angleDiff(th, t.dockTh)) < PIER_AVOID) continue;
    const score = Math.abs(dist - (RACE_MARK[0] + RACE_MARK[1]) / 2);
    if (!best || score < best.score) best = { d, th, score };
  }
  if (!best) return null;
  const { d, th } = best, ux = Math.cos(th), uz = Math.sin(th), px = -uz, pz = ux, so = shoreR(t, th) + RACE_START_OFF;
  const S = { x: t.x + ux * so, z: t.z + uz * so }, ir = (a) => shoreR(d, a) + 34;
  const at = (a, r = ir(a)) => ({ x: d.x + Math.cos(a) * r, z: d.z + Math.sin(a) * r });
  const mid = { x: S.x + px * RACE_LINE / 2, z: S.z + pz * RACE_LINE / 2 };   // the line runs from the committee boat out to the pin
  const pa = Math.atan2(pz, px), ua = th;
  return { isle: d, S, mid, pin: { x: S.x + px * RACE_LINE, z: S.z + pz * RACE_LINE },
    side: at(pa), behind: at(ua), other: at(pa + Math.PI), home: { x: mid.x - ux * 18, z: mid.z - uz * 18 },   // round it the long way, then over the line
    px, pz, ux, uz, tama: t };
}
/** where a point is against the line: a along it from the committee boat, b up the course (positive on the isle's side) */
const lineLocal = (C, x, z) => { const dx = x - C.S.x, dz = z - C.S.z; return { a: dx * C.px + dz * C.pz, b: dx * C.ux + dz * C.uz }; };
const onLine = (C, a) => a > -6 && a < RACE_LINE + 6;

// ---- the line on the water: a pin buoy with a chequered flag, red and white floats between it and the committee boat
function buildLine(scene, C) {
  const g = new THREE.Group(), m = (c) => new THREE.MeshBasicMaterial({ color: c }), floats = [];   // flat colours: they must read from far off, as buoys do
  const red = m('#c8402c'), white = m('#e8e2d4'), dark = m('#1a1a22'), orange = m('#e8782a');
  const n = Math.round(RACE_LINE / 3);
  for (let i = 1; i < n; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 1.0), i % 2 ? red : white); f.userData.a = i * RACE_LINE / n; g.add(f); floats.push(f); }
  const pin = new THREE.Group(); pin.userData.a = RACE_LINE;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.3, 2.2, 6), orange); body.position.y = 0.6; pin.add(body);
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5, 0.15), dark); pole.position.y = 3.6; pin.add(pole);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const q = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.06), (r + c) % 2 ? dark : white); q.position.set(0.38 + c * 0.55, 5.6 - r * 0.55, 0); pin.add(q); }   // the chequered flag
  pin.scale.setScalar(1.6); g.add(pin); floats.push(pin);
  scene.add(g);
  return { g, floats };
}
function lineTick(L, C) {
  const t = U.uTime.value, amp = rt.seaWave || 1;
  for (const f of L.floats) { const x = C.S.x + C.px * f.userData.a, z = C.S.z + C.pz * f.userData.a; f.position.set(x, waveHeight(x, z, t, amp) + 0.1, z); }
}

// ---- the count: three, two, one, GO, big in the middle of the screen (owner 2026-11-18). Its silent twin is the flag coming down.
let countEl = null;
function showCount(txt) {
  if (!countEl) { countEl = document.createElement('div'); countEl.id = 'raceCount'; document.body.appendChild(countEl); }
  countEl.textContent = txt || ''; countEl.classList.toggle('on', !!txt); countEl.classList.toggle('go', txt === RACE_SAY.count[3]);
}
const say = (l) => { const m = G.objectives && G.objectives.mate; if (m) m.say(l); };

/** is the ship in Home Sound? */
const inSound = (world, ship) => { const t = world.desc(0, -1); return !!t && Math.hypot(ship.pos.x - t.x, ship.pos.z - t.z) < HOME_SOUND_R; };
/** the passing regatta stays away while the ship is in the Sound on a Sunday (traffic.js schedule asks) */
export const holdRegatta = (world, ship) => inSound(world, ship);

function lineUp(traffic, C, dayN) {
  const ships = [], hd = Math.atan2(C.ux, -C.uz);   // all face up the course
  const cm = traffic.spawnAt('fisher', sectorAt(C.S.x, C.S.z, state.seed).faction.id, C.S.x, C.S.z, hd, 'live', 0);   // Tama's own colours; the racers' sails are the Cays' bright ones, as the regatta's always were
  cm.special = 'race'; cm.state = 'race'; cm.name = 'Committee boat'; cm.flag.scale.setScalar(2.2);
  RACE_SPEEDS.forEach((v, i) => {
    const o = (i + 1.5) * LINE_GAP, kind = i % 2 ? 'fisher' : 'canoe';
    const s = traffic.spawnAt(kind, 'free', C.S.x + C.px * o - C.ux * 6, C.S.z + C.pz * o - C.uz * 6, hd, 'live', 0);   // just behind the line
    s.special = 'race'; s.state = 'race'; s.name = `Regatta boat ${i + 1}`; s.v = v; s.wp = 0; s.done = false; s.b = -6;
    ships.push(s);
  });
  R = { day: dayN, C, cm, ships, phase: 'gather', finished: 0, count: 0, line: buildLine(traffic.scene, C), me: { racing: false, rounded: false, done: false, b: null } };
  if (traffic.onEvent) traffic.onEvent('regatta');
}
/** the start: the flag comes down and everybody goes */
function go() { R.phase = 'run'; R.cm.flag.visible = false; rt.raceHold = false; }

/** each frame, after traffic.update. ctx: { world, traffic, ship, sched: { wd, hour, dayN, dread }, ok (the tutorial is over), wind } */
export function raceTick(dt, ctx) {
  const { world, traffic, ship, sched, wind } = ctx; if (!sched) return;
  if (!R && sched.wd === RACE_DAY && sched.hour >= RACE_GATHER && sched.hour < RACE_WAIT && sched.dread < 0.4 && ctx.ok && state.story.raceDay !== sched.dayN && inSound(world, ship)) {
    const C = course(world); state.story.raceDay = sched.dayN;
    if (C) lineUp(traffic, C, sched.dayN);
  }
  if (!R) return;
  const C = R.C, live = R.ships.filter((s) => traffic.ships.includes(s)), me = R.me;
  if (!traffic.ships.includes(R.cm) || sched.dayN !== R.day) { end(traffic); return; }   // sailed away from it, or the day is gone
  lineTick(R.line, C);
  const mine = lineLocal(C, ship.pos.x, ship.pos.z), atLine = onLine(C, mine.a) && Math.abs(mine.b) < RACE_START_R;
  if (R.phase === 'gather') {   // they wait for the captain: Mara says so, the slip points at the line; there, the ship stops by itself
    if (!me.called && sched.hour >= RACE_START - 0.75 && !atLine) { me.called = true; say(RACE_SAY.waiting); }
    if (atLine && !rt.modal) { R.phase = 'count'; R.count = 0; rt.raceHold = true; me.racing = true; say(RACE_SAY.here); }
    else if (sched.hour >= RACE_WAIT) { go(); if (me.called) say(RACE_SAY.late); }
  }
  if (R.phase === 'count') {   // wait for the ship to settle, then three, two, one, GO
    if (ship.speed < 0.4) R.count += dt;
    const i = Math.floor(R.count / 1.4) - 1;
    showCount(i >= 0 && i < 3 ? RACE_SAY.count[i] : '');
    if (i >= 3) { go(); showCount(RACE_SAY.count[3]); R.goT = 2.2; }
  }
  if (R.goT > 0 && (R.goT -= dt) <= 0) showCount('');
  if (R.phase !== 'gather' && R.phase !== 'count' && sched.hour >= RACE_END) R.phase = 'home';
  const isle = C.isle;
  for (const s of live) {
    if (R.phase === 'gather' || R.phase === 'count' || (s.done && R.phase === 'run')) { s.speed = 0; furl(s, 0.22); continue; }
    if (R.phase === 'home') { s.heading += clamp(angleDiff(s.heading, Math.atan2(C.ux, -C.uz)), -0.6 * dt, 0.6 * dt); s.speed = KINDS[s.kind].speed[0]; continue; }
    const wp = [C.side, C.behind, C.other, C.home][s.wp];
    let want = Math.atan2(wp.x - s.x, -(wp.z - s.z));
    { // keep off the isle: inside KEEP_OFF of its shore, steer along it (the way round that is nearer the mark), harder the closer
      const ia = Math.atan2(s.z - isle.z, s.x - isle.x), gap = Math.hypot(s.x - isle.x, s.z - isle.z) - shoreR(isle, ia);
      if (gap < KEEP_OFF) {
        const out = Math.atan2(Math.cos(ia), -Math.sin(ia)), tA = out + Math.PI / 2, tB = out - Math.PI / 2;
        const tang = Math.abs(angleDiff(tA, want)) < Math.abs(angleDiff(tB, want)) ? tA : tB, k = clamp(1 - gap / KEEP_OFF, 0, 1);
        want = gap < 4 ? out : tang + clamp(angleDiff(tang, out), -k, k);   // the tangent, turned out from the shore the closer it is
      }
    }
    s.heading += clamp(angleDiff(s.heading, want), -1.1 * dt, 1.1 * dt);
    const rel = Math.abs(angleDiff(s.heading, wind.dir));   // 0: running before the wind, pi: straight into it
    s.speed = s.v * (0.6 + 0.4 * wind.strength) * (0.95 - 0.45 * smoothstep(0.55 * Math.PI, Math.PI, rel));
    if (s.wp < 3) { if (Math.hypot(wp.x - s.x, wp.z - s.z) < WP_R) s.wp++; }
    else { const L = lineLocal(C, s.x, s.z); if (s.b > 0 && L.b <= 0 && onLine(C, L.a)) { s.done = true; R.finished++; } s.b = L.b; }   // over the line
    if (s.wp < 3) s.b = lineLocal(C, s.x, s.z).b;
  }
  R.cm.speed = 0; furl(R.cm, 0.22);
  if (R.phase === 'run' && R.finished >= live.length && live.length && (me.done || !me.racing)) R.phase = 'home';
  // the captain: start at the line (late is allowed until the first boat is in), round behind the isle, back over the line
  const at = (p, r) => Math.hypot(ship.pos.x - p.x, ship.pos.z - p.z) < r;
  if (R.phase === 'run' && !me.racing && R.finished === 0 && atLine) me.racing = true;
  if (me.racing && !me.rounded && at(C.behind, RACE_ROUND_R)) me.rounded = true;
  if (me.rounded && !me.done && me.b > 0 && mine.b <= 0 && onLine(C, mine.a)) {
    me.done = true; const beaten = live.filter((s) => !s.done).length;
    if (beaten > 0) state.story.racePurse = RACE_PURSE + RACE_PURSE_EACH * (beaten - 1);
    say(RACE_SAY.place(live.length - beaten + 1, live.length));
  }
  me.b = mine.b;
  if (R.phase === 'home') for (const s of [...live, R.cm]) if (Math.hypot(s.x - C.tama.x, s.z - C.tama.z) > HOME_SOUND_R) drop(traffic, s);
  if (R.phase === 'home' && R.cm && sched.hour >= RACE_END + 0.5) { R.cm.heading = Math.atan2(C.ux, -C.uz); R.cm.speed = 4; }
}
/** where the slip points while the regatta waits for the captain (ui/hud.js trackTarget) */
export function raceTarget() {
  if (!R || R.phase !== 'gather') return null;
  return { x: R.C.mid.x - R.C.ux * 4, z: R.C.mid.z - R.C.uz * 4, label: 'The regatta' };
}
function furl(s, k) { for (const sl of s.sails) { sl.pivot.scale.y = k * sl.s; if (sl.jib) sl.jib.scale.y = k; } }
function drop(traffic, s) { const i = traffic.ships.indexOf(s); if (i < 0) return; traffic.scene.remove(s.root); if (s.wake) s.wake.dispose(traffic.scene); traffic.ships.splice(i, 1); }
function end(traffic) { rt.raceHold = false; showCount(''); if (R.line) traffic.scene.remove(R.line.g); for (const s of [...R.ships, R.cm]) if (traffic.ships.includes(s)) { s.special = null; s.state = 'none'; s.speed = KINDS[s.kind].speed[0]; s.flag.visible = true; s.flag.scale.setScalar(1); } R = null; }

/** the purse waiting at Tama's board (gold), or 0 */
export const purseAt = (d) => (d.id === TAMA_ID && state.story.racePurse) || 0;
export function takePurse() { const g = state.story.racePurse || 0; state.story.racePurse = 0; state.gold += g; return g; }
/** for tests */
export const raceNow = () => R;
