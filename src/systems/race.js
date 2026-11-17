// The Sunday race (P-HOME-4; docs/proposals/REGIONAL_CATALOGUE.md, owner 2026-11-17). On a Sunday afternoon with the ship in Home Sound,
// the regatta gathers off Tama instead of sailing past: four boats hove-to beside a committee boat with a big flag, offshore and away
// from the main pier. At 14:00 the flag comes down and all four make sail at once (seen, never said). They round a rolled isle about
// 175 out and come back to the committee boat. Sail the same course (start by the committee boat, round behind the isle, back past it)
// and finish ahead of at least one of them, and Tama's harbourmaster has the purse for you (one row on the board): 30 for beating one,
// 10 more for each other. Last in: nothing. Weekly.
// Contained risk (the catalogue's "Risky-to-build"): no new boats (it takes the regatta's five hulls, and the passing regatta stays
// away that day), nothing at the main pier, nothing said. Race boats sail by a simple polar: slower close to the wind.
import { state } from '../core/state.js';
import { angleDiff, clamp, smoothstep } from '../util.js';
import { CELL, shoreR } from '../world.js';
import { KINDS } from '../traffic.js';
import { sectorAt } from '../sectors.js';
import { HOME_SOUND_R, TAMA_ID, RACE_DAY, RACE_GATHER, RACE_START, RACE_END, RACE_MARK, RACE_START_OFF, RACE_SPEEDS, RACE_START_R, RACE_ROUND_R,
  RACE_FINISH_R, RACE_PURSE, RACE_PURSE_EACH } from '../regions.js';

const WP_R = 12;          // a race boat takes its next mark within this
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
  const S = { x: t.x + ux * so, z: t.z + uz * so }, ir = shoreR(d, th) + 25;
  return { isle: d, S, side: { x: d.x + px * ir, z: d.z + pz * ir }, behind: { x: d.x + ux * ir, z: d.z + uz * ir }, px, pz, ux, uz, tama: t };
}

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
    const s = traffic.spawnAt(kind, 'free', C.S.x + C.px * o, C.S.z + C.pz * o, hd, 'live', 0);
    s.special = 'race'; s.state = 'race'; s.name = `Regatta boat ${i + 1}`; s.v = v; s.wp = 0; s.done = false;
    ships.push(s);
  });
  R = { day: dayN, C, cm, ships, phase: 'gather', finished: 0, me: { racing: false, rounded: false, done: false } };
  if (traffic.onEvent) traffic.onEvent('regatta');
}

/** each frame, after traffic.update. ctx: { world, traffic, ship, sched: { wd, hour, dayN, dread }, ok (the tutorial is over), wind } */
export function raceTick(dt, ctx) {
  const { world, traffic, ship, sched, wind } = ctx; if (!sched) return;
  if (!R && sched.wd === RACE_DAY && sched.hour >= RACE_GATHER && sched.hour < RACE_START && sched.dread < 0.4 && ctx.ok && state.story.raceDay !== sched.dayN && inSound(world, ship)) {
    const C = course(world); state.story.raceDay = sched.dayN;
    if (C) lineUp(traffic, C, sched.dayN);
  }
  if (!R) return;
  const C = R.C, live = R.ships.filter((s) => traffic.ships.includes(s));
  if (!traffic.ships.includes(R.cm) || sched.dayN !== R.day) { end(traffic); return; }   // sailed away from it, or the day is gone
  if (R.phase === 'gather' && sched.hour >= RACE_START) { R.phase = 'run'; R.cm.flag.visible = false; }   // the flag comes down
  if (R.phase !== 'gather' && sched.hour >= RACE_END) R.phase = 'home';
  for (const s of live) {
    if (R.phase === 'gather' || (s.done && R.phase === 'run')) { s.speed = 0; furl(s, 0.22); continue; }
    if (R.phase === 'home') { s.heading += clamp(angleDiff(s.heading, Math.atan2(C.ux, -C.uz)), -0.6 * dt, 0.6 * dt); s.speed = KINDS[s.kind].speed[0]; continue; }
    const wp = [C.side, C.behind, C.S][s.wp], want = Math.atan2(wp.x - s.x, -(wp.z - s.z));
    s.heading += clamp(angleDiff(s.heading, want), -0.9 * dt, 0.9 * dt);
    const rel = Math.abs(angleDiff(s.heading, wind.dir));   // 0: running before the wind, pi: straight into it
    s.speed = s.v * (0.6 + 0.4 * wind.strength) * (0.95 - 0.45 * smoothstep(0.55 * Math.PI, Math.PI, rel));
    if (Math.hypot(wp.x - s.x, wp.z - s.z) < WP_R) { if (s.wp < 2) s.wp++; else { s.done = true; R.finished++; } }
  }
  R.cm.speed = 0; furl(R.cm, 0.22);
  if (R.phase === 'run' && R.finished >= live.length && live.length) R.phase = 'home';
  // the captain: start by the committee boat (late is allowed until the first boat is in), round behind the isle, finish past it
  const me = R.me, at = (p, r) => Math.hypot(ship.pos.x - p.x, ship.pos.z - p.z) < r;
  if (R.phase === 'run' && !me.racing && R.finished === 0 && at(C.S, RACE_START_R)) me.racing = true;
  if (me.racing && !me.rounded && at(C.behind, RACE_ROUND_R)) me.rounded = true;
  if (me.rounded && !me.done && at(C.S, RACE_FINISH_R)) {
    me.done = true; const beaten = live.filter((s) => !s.done).length;
    if (beaten > 0) state.story.racePurse = RACE_PURSE + RACE_PURSE_EACH * (beaten - 1);
  }
  if (R.phase === 'home') for (const s of [...live, R.cm]) if (Math.hypot(s.x - C.tama.x, s.z - C.tama.z) > HOME_SOUND_R) drop(traffic, s);
  if (R.phase === 'home' && R.cm && sched.hour >= RACE_END + 0.5) { R.cm.heading = Math.atan2(C.ux, -C.uz); R.cm.speed = 4; }
}
function furl(s, k) { for (const sl of s.sails) { sl.pivot.scale.y = k * sl.s; if (sl.jib) sl.jib.scale.y = k; } }
function drop(traffic, s) { const i = traffic.ships.indexOf(s); if (i < 0) return; traffic.scene.remove(s.root); if (s.wake) s.wake.dispose(traffic.scene); traffic.ships.splice(i, 1); }
function end(traffic) { for (const s of [...R.ships, R.cm]) if (traffic.ships.includes(s)) { s.special = null; s.state = 'none'; s.speed = KINDS[s.kind].speed[0]; s.flag.visible = true; s.flag.scale.setScalar(1); } R = null; }

/** the purse waiting at Tama's board (gold), or 0 */
export const purseAt = (d) => (d.id === TAMA_ID && state.story.racePurse) || 0;
export function takePurse() { const g = state.story.racePurse || 0; state.story.racePurse = 0; state.gold += g; return g; }
/** for tests */
export const raceNow = () => R;
