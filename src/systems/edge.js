// The Edge (owner's sequence, 2026-11-12; played, not watched, since 2026-11-16): once, the first time the ship reaches the
// deepest dread (stage 5) on open water, the sea ahead runs to a straight lip and pours over it into nothing; past it, things far
// too big stand in the dark. The helm answers. The sea pulls: a current towards the lip, weak far out and very strong at it, that
// can be worked against. Sailing along the lip brings each thing out of the dark in turn; a second look is never quite the first.
// Two ways out: over the lip (white mist, then you wake off Tama as after the waking: owner 2026-11-18, "Over the Edge"; Mara says
// one thing, once, and never speaks of it again) or out against the current (the lip goes back into the mist behind you, and the
// Edge is gone for the voyage: `state.story.edge` is set when it starts and never cleared). The waking clock holds while it runs
// (abyss.js). Nothing explains it, nothing marks it. Full game only. The look is systems/edgeworld.js.
import * as THREE from 'three';
import { rt } from '../core/runtime.js';
import { state } from '../core/state.js';
import { renderer, ocean, scene, camera } from '../core/engine.js';
import { buildEdgeWorld, disposeEdgeWorld } from './edgeworld.js';
import { CELL } from '../world.js';
import { waveHeight } from '../ocean.js';
import { U, psxMaterial } from '../psx.js';

// ---- tuning (game seconds and world units; the ship makes about 9 on a beam reach in a fair wind, 2.6 under oars).
// These need the owner's hands: the headless browser cannot judge how hard the pull feels.
export const EDGE = {
  AHEAD: 240,        // how far ahead the lip is met (about 20 s to the lip under full sail)
  LIP_HALF: 560,     // the stretch along the lip that can be sailed, each way from where it was met (the mist closes beyond);
  LIP_MIN: 300,      // shorter where an island stands on the line of the lip (its end is set short of it), never shorter than this
  PULL_R: 340,       // how far out from the lip the sea pulls at all
  EXIT_D: 390,       // past this the lip has gone back into the mist: out
  C_FAR: 2.5,        // the broad part of the pull: (1 - d/PULL_R)^2 of this
  C_EDGE: 8,         // the steep part: (1 - d/PULL_R)^3 of this. In a fair wind a beam reach along the lip holds at ~130 out,
                     // close-hauled at ~90; stock oars (about 1.5 against it) hold at ~175 and get out from where the lip is
                     // met; closer than ~50 nothing holds. With no sail and no oars the drift in takes about two and a half minutes.
  HUNGER: 0.8,       // the steep part grows by this much...
  T_HUNGER: [150, 240],   // ...between these times: after about four minutes nobody can stay close
  END_V: 6,          // at the ends of the stretch the water runs back along the lip towards the middle
  RAMP: 6,           // the pull comes up over the first seconds
  FADE_IN: 8,        // the dark and what stands in it come out of the mist
  REVEAL: [120, 270],// a thing in the dark is clear while the ship is within the first number of it along the lip, gone past the second
  OVER_D: 4,         // this close, the ship is over
  LOOK_T: 4,         // seconds a thing must be looked at before it can be different the next time
  AWAY_T: 2,         // and seconds it must be out of sight before it is
  PILLAR_REF: 140,   // a pillar this far from the ship has the size it was built at; each is scaled with its distance
  HUSH: 0.85,        // how far the sound goes at the lip (none at PULL_R)
  REWIND: 180,       // after the mist, the ship is this far back from where the lip was
};

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const MIST = new THREE.Color('#e8eef0');
rt.edge = null;          // the running sequence (see start)
rt.edgeHush = 0;         // 0..1: how far the sound goes away (main.js hands it to audio.hush)

/** which way a voyage left the Edge: 'over', 'out', or null if it has not met it. Saves from before 2026-11-16 met only the
 *  watched sequence, which always went over. The Table reads it for its drawing (CANON 2026-11-18). */
export const edgeWay = (st = state) => st.story.edgeWay || (st.story.edge !== undefined ? 'over' : null);

/** Mara, once, when you wake off Tama after going over (a draft for the writer, WRITER_TODO 4.6); null after the first time */
export function edgeWokeLine(st = state) {
  if (st.story.edgeWoke) return null;
  st.story.edgeWoke = 1;
  return 'You slept the whole way home, Captain. Kicked like someone falling.';
}

const endOf = (e, a) => (a < 0 ? e.ends[0] : e.ends[1]);
/** the current at local (a, d): { v: pull towards the lip, along: run along the lip } */
export function edgePull(e, a, d) {
  const u = clamp(d / EDGE.PULL_R, 0, 1), h = 1 + EDGE.HUNGER * smooth(EDGE.T_HUNGER[0], EDGE.T_HUNGER[1], e.t);
  const ramp = smooth(0, EDGE.RAMP, e.t), end = Math.abs(a) - (endOf(e, a) - 150);
  const v = d <= 0 ? EDGE.C_EDGE * h + EDGE.C_FAR : (EDGE.C_FAR * (1 - u) ** 2 + EDGE.C_EDGE * h * (1 - u) ** 3);
  const along = end > 0 ? -Math.sign(a) * EDGE.END_V * Math.min(2.5, smooth(0, 200, end) + Math.max(0, end - 200) / 100) : 0;
  return { v: v * ramp, along: along * ramp };
}

/** start it now (dev: __game.edge()); the trigger below calls this once a voyage. run: a saved run to pick up again */
export function startEdge(ship, fadeEl, run = null, ends = null) {
  if (rt.edge || window.__BUILD === 'demo') return false;
  ends = run?.ends || ends || [EDGE.LIP_HALF, EDGE.LIP_HALF];
  const h = run ? run.h : ship.heading, f = [Math.sin(h), -Math.cos(h)], r = [Math.cos(h), Math.sin(h)];
  const lip = run ? run.lip : [ship.pos.x + f[0] * EDGE.AHEAD, ship.pos.z + f[1] * EDGE.AHEAD];
  const W = EDGE.LIP_HALF + 450;
  const w = buildEdgeWorld(scene, lip[0], lip[1], -h, W, ends.map((v) => v / EDGE.LIP_HALF));
  const n = new THREE.Vector3(-f[0], 0, -f[1]);   // the sea stays on the ship's side of the lip
  renderer.localClippingEnabled = true; ocean.material.clippingPlanes = [new THREE.Plane(n, -(n.x * lip[0] + n.z * lip[1]))]; ocean.material.needsUpdate = true;
  const looks = {}; for (const k of Object.keys(w.things)) looks[k] = { seen: 0, away: 0, done: false };
  rt.edge = { t: run ? run.t : 0, lip, h, f, r, w, ends, fadeEl, looks, over: -1, clear: 0, mist: 0, windTo: h, hidden: new Set(), dashes: makeDashes() };
  if (run && run.ch) for (const k of Object.keys(run.ch)) secondLook(rt.edge, k, run.ch[k]);
  state.story.edge = state.story.edge ?? state.dayN;
  state.story.edgeRun = { lip, h, ends, t: rt.edge.t, ch: run?.ch || {} };   // picked up again if the voyage is saved and loaded mid-way
  return true;
}

// ---- the pull on the water: pale dashes racing towards the lip, sparse and slow far out, thick and fast close in
const ND = 70;
function makeDashes() {
  const P = new Float32Array(ND * 12), C = new Float32Array(ND * 16), idx = [];
  for (let i = 0; i < ND; i++) { const b = i * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 4)); g.setIndex(idx);
  const m = new THREE.Mesh(g, psxMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, key: 'Gf' }));
  m.frustumCulled = false; m.renderOrder = 3; scene.add(m);
  return { m, P, C, q: Array.from({ length: ND }, () => ({ life: 0 })), seed: 1 };
}
function dashTick(e, dt, ship) {
  const waveY = (x, z) => waveHeight(x, z, U.uTime.value, rt.seaWave || 1);   // last frame's sea: close enough for foam
  const D = e.dashes, rnd = () => (D.seed = (D.seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < ND; i++) {
    const q = D.q[i];
    if (q.life <= 0) { const ang = rnd() * 6.283, rr = 6 + rnd() * 120; q.x = ship.pos.x + Math.cos(ang) * rr; q.z = ship.pos.z + Math.sin(ang) * rr; q.ttl = q.life = 1.6 + rnd() * 2; q.len = 0.5 + rnd(); }
    const L = local(e, q.x, q.z), p = edgePull(e, L.a, L.d);
    if (L.d < 1 || L.d > EDGE.PULL_R) q.life = 0;
    q.life -= dt; q.x += (e.f[0] * p.v + e.r[0] * p.along) * 1.8 * dt; q.z += (e.f[1] * p.v + e.r[1] * p.along) * 1.8 * dt;
    const sp = Math.hypot(p.v, p.along) || 1, ux = (e.f[0] * p.v + e.r[0] * p.along) / sp, uz = (e.f[1] * p.v + e.r[1] * p.along) / sp;
    const a = q.life > 0 ? clamp(Math.min(q.ttl - q.life, q.life) / 0.6, 0, 1) * clamp(sp / 4, 0.15, 1) * (1 - e.mist) : 0;
    const len = q.len * (0.8 + sp * 0.45), wid = 0.09, sx = -uz * wid, sz = ux * wid, lx = ux * len, lz = uz * len, y = waveY(q.x, q.z) + 0.16;
    const v = [[q.x - lx - sx, q.z - lz - sz], [q.x + lx - sx, q.z + lz - sz], [q.x + lx + sx, q.z + lz + sz], [q.x - lx + sx, q.z - lz + sz]];
    for (let k = 0; k < 4; k++) { D.P.set([v[k][0], a > 0 ? y : -50, v[k][1]], i * 12 + k * 3); D.C.set([0.92, 0.98, 1, 0.42 * a], i * 16 + k * 4); }
  }
  D.m.geometry.attributes.position.needsUpdate = true; D.m.geometry.attributes.color.needsUpdate = true;
}

/** the ship's place in the lip's frame: a along the lip, d out from it (positive on the sea's side) */
function local(e, x, z) { const dx = x - e.lip[0], dz = z - e.lip[1]; return { a: dx * e.r[0] + dz * e.r[1], d: -(dx * e.f[0] + dz * e.f[1]) }; }

// ---- a second look is never quite the first: once each, while it is out of sight
function secondLook(e, k, v) {
  const T = e.w.things[k]; e.looks[k].done = true;
  if (k === 'hood') T.meshes[0].rotation.y = v;                                  // its hood is turned a little towards where the ship was
  if (k === 'head') { T.eyes[0].visible = false; T.eyes[1].visible = true; }     // the other eye is the open one
  if (k === 'tower') { T.spire.visible = false; T.more.visible = true; }         // one storey more
  if (k === 'pillars') T.more.visible = true;                                     // one more in the row
  if (k === 'arches') T.last.visible = false;                                     // one fewer standing
}
const _fr = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sp = new THREE.Sphere(), _v = new THREE.Vector3();
function looksTick(e, dt, L) {
  _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm);
  for (const [k, T] of Object.entries(e.w.things)) {
    const s = e.looks[k]; if (s.done) continue;
    _v.set(T.at[0], 60, T.at[1]); e.w.g.localToWorld(_v); _sp.set(_v, 70);
    const framed = _fr.intersectsSphere(_sp);
    if (s.seen < EDGE.LOOK_T) { if (framed && T.reveal > 0.5) s.seen += dt; continue; }
    s.away = framed && T.reveal > 0.08 ? 0 : s.away + dt;   // truly out of sight: out of frame, or gone into the dark
    if (s.away > EDGE.AWAY_T) {
      let v = 1;
      if (k === 'hood') { const want = Math.atan2(L.a - T.at[0], L.d - T.at[1]); v = 0.25 + clamp(want - 0.25, -0.6, 0.6); }
      secondLook(e, k, v); state.story.edgeRun.ch[k] = v;
    }
  }
}

/** the fog while it runs: the ship's water stays clear enough to see the lip; at the ends of the stretch, white mist */
export function edgeFog(fog) {
  const e = rt.edge; if (!e) return;
  if (e.clear > 0) { fog.near += (Math.max(fog.near, 90) - fog.near) * e.clear; fog.far += (Math.max(fog.far, 420) - fog.far) * e.clear; }
  if (e.mist > 0) { fog.color.lerp(MIST, e.mist); fog.near *= 1 - 0.9 * e.mist; fog.far = Math.max(45, fog.far * (1 - 0.82 * e.mist)); }
}

let tryT = 0;
/** where the stretch ends each way: short of any island standing on the line of the lip; null if that leaves too little,
 *  or an island is in the way to it (islands out in the dark, or on the lip past its ends, are hidden while it runs) */
export function clearFor(ship, world) {
  const h = ship.heading, f = [Math.sin(h), -Math.cos(h)], r = [Math.cos(h), Math.sin(h)];
  const lip = [ship.pos.x + f[0] * EDGE.AHEAD, ship.pos.z + f[1] * EDGE.AHEAD], span = EDGE.LIP_HALF + 120, ends = [EDGE.LIP_HALF, EDGE.LIP_HALF];
  const xs = [lip[0] - span - 300, lip[0] + span + 300].map((v) => Math.round(v / CELL)), cx0 = Math.min(...xs), cx1 = Math.max(...xs);
  const zs = [lip[1] - span - 300, lip[1] + span + 300].map((v) => Math.round(v / CELL)), cz0 = Math.min(...zs), cz1 = Math.max(...zs);
  for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
    const d = world.desc(cx, cz); if (!d) continue;
    const dx = d.x - lip[0], dz = d.z - lip[1], a = dx * r[0] + dz * r[1], dd = -(dx * f[0] + dz * f[1]), R = (d.r || 30) + 15;
    if (Math.abs(a) < 15 + R && dd > -R && dd < EDGE.AHEAD + 10) return null;              // in the ship's way to it
    if (Math.abs(dd) < R + 15) { const end = Math.abs(a) - R - 170; if (a < 0) ends[0] = Math.min(ends[0], end); else ends[1] = Math.min(ends[1], end); }   // on the lip
  }
  return ends[0] >= EDGE.LIP_MIN && ends[1] >= EDGE.LIP_MIN ? ends : null;
}

/** each frame at sea (full game), after the ship has moved. ctx: { dt, dread, ship, quiet, world, fadeEl, onDone(way) } */
export function edgeTick({ dt, dread, ship, quiet, world, fadeEl, onDone }) {
  if (rt.edgeAfter) rt.edgeAfter(dt);   // the mist lifting after 'over'
  if (!rt.edge) {
    if (state.story.edgeRun) { startEdge(ship, fadeEl, state.story.edgeRun); if (state.story.edgeRun.over) { finish(ship, world, 'over', true); onDone('over'); return; } }
    else {
      if (state.story.edge !== undefined || dread < 0.9 || quiet) return;
      if ((tryT -= dt) > 0) return; tryT = 2;
      const ends = clearFor(ship, world); if (!ends) return;
      startEdge(ship, fadeEl, null, ends);
    }
  }
  const e = rt.edge; e.t += dt; const t = e.t;
  state.story.edgeRun.t = t;
  const L = local(e, ship.pos.x, ship.pos.z);

  if (e.over < 0) {
    // the sea does the pulling: towards the lip, and back along it at the ends
    const p = edgePull(e, L.a, L.d);
    ship.pos.x += (e.f[0] * p.v + e.r[0] * p.along) * dt; ship.pos.z += (e.f[1] * p.v + e.r[1] * p.along) * dt;
    const out = smooth(EDGE.PULL_R, EDGE.EXIT_D, L.d);                  // leaving: the lip goes back into the mist behind
    e.mist = smooth(endOf(e, L.a) - 140, endOf(e, L.a) + 90, Math.abs(L.a));
    e.clear = smooth(0, 4, t) * (1 - out);
    const fade = smooth(0, EDGE.FADE_IN, t) * (1 - out) * (1 - e.mist);
    e.w.dark.material.opacity = fade; e.w.dark.visible = fade > 0.005;
    for (const T of Object.values(e.w.things)) {   // a thing's meshes share one material: it comes out of the dark as the ship draws level
      T.reveal = 1 - smooth(EDGE.REVEAL[0], EDGE.REVEAL[1], Math.abs(T.at[0] - L.a));
      const m = T.meshes[0].material; m.opacity = fade * T.reveal; m.visible = m.opacity > 0.005;
    }
    for (const m of e.w.things.pillars.meshes) { const at = m.userData.at; m.scale.setScalar(Math.max(0.6, Math.hypot(at[0] - L.a, at[1] - L.d) / EDGE.PILLAR_REF)); }   // none ever gets smaller
    looksTick(e, dt, L);
    rt.edgeHush = EDGE.HUSH * (1 - smooth(0, EDGE.PULL_R, L.d)) * smooth(0, 6, t);
    // the lamp's flame leans to the lip, more the closer it is (the sound's twin: RULES 28)
    if (ship.flame) { const side = e.f[0] * Math.cos(ship.heading) + e.f[1] * Math.sin(ship.heading), k = 1 - smooth(0, EDGE.PULL_R, L.d); ship.flame = { h: ship.flame.h, lean: ship.flame.lean * (1 - k) - side * 0.9 * k }; }
    dashTick(e, dt, ship);
    hideIslands(e, world);
    e.windTo = e.h;   // the air goes over the lip too: getting out is a beat to windward (main.js turns the wind)
    if (L.d < EDGE.OVER_D) { e.over = 0; state.story.edgeWay = 'over'; state.story.edgeRun.over = true; fadeEl.style.background = '#e8eef0'; fadeEl.style.transition = 'opacity 1.6s steps(8)'; fadeEl.classList.add('on'); }   // the white mist, stepped like the demo's end card
    else if (L.d >= EDGE.EXIT_D) { finish(ship, world, 'out'); onDone('out'); }
    return;
  }
  // over: the ship goes on with the water while the mist comes in; behind it the edge is gone and the ship drifts away, pointing home
  e.over += dt;
  ship.pos.x += e.f[0] * 4 * dt; ship.pos.z += e.f[1] * 4 * dt;
  rt.edgeHush = Math.max(rt.edgeHush, 0.95 * smooth(0, 1.5, e.over));
  if (e.over > 2.2) { finish(ship, world, 'over', true); onDone('over'); }   // main.js then wakes you off Tama (abyss.wake)
}

function hideIslands(e, world) {
  for (const isl of world.islands.values()) {
    const L = local(e, isl.desc.x, isl.desc.z), R = (isl.desc.r || 30), out = L.d < -(R + 5) || (L.d < R + 40 && Math.abs(L.a) > endOf(e, L.a) + 150);   // in the dark, or on the lip inside the end's mist
    if (out && isl.group.visible) { isl.group.visible = false; e.hidden.add(isl); }
  }
}

/** end it: 'out' quietly; 'over' behind the white (the mist then lifts by itself) */
function finish(ship, world, way, behindMist = false) {
  const e = rt.edge; state.story.edgeWay = way;
  disposeEdgeWorld(scene, e.w); scene.remove(e.dashes.m); e.dashes.m.geometry.dispose(); e.dashes.m.material.dispose();
  ocean.material.clippingPlanes = null; ocean.material.needsUpdate = true;
  for (const isl of e.hidden) isl.group.visible = true;
  delete state.story.edgeRun;
  if (way === 'over') {
    const L = local(e, ship.pos.x, ship.pos.z), back = EDGE.REWIND;
    ship.pos.x = e.lip[0] + e.r[0] * L.a - e.f[0] * back; ship.pos.z = e.lip[1] + e.r[1] * L.a - e.f[1] * back;
    const home = world.desc(0, -1) || { x: 0, z: 0 };   // Tama
    ship.heading = Math.atan2(home.x - ship.pos.x, -(home.z - ship.pos.z)); ship.speed = 1.5; ship.vel = null; ship.trim = 0; ship.yaw = 0;
    rt.camHeading = ship.heading; rt.yawT = 0; rt.camYaw = 0;
  }
  rt.edge = null;
  if (behindMist) {   // the mist lifts on the game's clock; nothing waits on it
    const fadeEl = e.fadeEl, hush = { t: 0 };
    rt.edgeAfter = (dt) => {
      hush.t += dt; rt.edgeHush = 0.95 * (1 - smooth(1.5, 9, hush.t));
      if (hush.t > 1.2 && fadeEl.classList.contains('on')) fadeEl.classList.remove('on');
      if (hush.t > 3.2 && fadeEl.style.background) { fadeEl.style.background = ''; fadeEl.style.transition = ''; }
      if (hush.t > 9) { rt.edgeHush = 0; rt.edgeAfter = null; }
    };
  } else rt.edgeHush = 0;
}
