// Other ways through (owner, 2026-11-19, T4: "add 2 other ways to get to a point beside the upgrade route, but make them elaborate and
// harder so no one can just speedrun through"). Each is a rule of the sea the player can learn and use, with an ordinary reading. None
// is told outright; a pilot's saying at a harbour near it gives the hint, once (pilotSaying). The upgrade route still works.
//
// After the first throw the fog wall stands at 1650 until the lens lantern and a hull or sails of 3 (objectives.js strataGate: the
// Shoals and Belt checks already open by distance sailed, and both the Slack's and the Dim's upgrades stand at this one wall). Four ways through it, and once the ship has come through one, that sea is the captain's
// (state.story.crossed): the way is known.
//   light  At night a Guild light near the wall does not turn: its beam lies still, pointing out through the fog. With its rhythm on the
//          chart, the light lit, and the ship on its line (LINE_HALF), the helm answers in the fog. (The Halved Isle's own leading light
//          is systems/leadlight.js.)
//   tune   With the Two Players' tune known, on a night without storm, the fog wall has gaps the tune knows (TUNE_GAPS, seeded): lost in
//          the wall, the night music and the pennant lean to the nearest gap (fogLost, L9); on the gap's line the helm answers.
//   slick  At the bottom of the tide (tide below SLICK_TIDE) a slick of glass water lies out through the wall at a few places (seeded):
//          on it the helm answers. In the slick's place at any other hour the wall's shoal takes the planks.
//   lamp   At night with the lamp out long enough for the eyes (LAMP_EYES), the harbours beyond the wall show; steering straight for one
//          (LAMP_AIM), the helm answers. The water round the ship stays black.
// Two barriers round the hand-made places get a second way in too (Places.tick asks barrierPass):
//   Glass Lagoon (reef, a broad rudder): at high water (above LAGOON_TIDE), under oars.
//   The Ribs (breakers, an iron-banded hull): the breakers come in sets; in the lull between them (a calm you can see), under oars.
// Full game only. Numbers here; the lines are drafts for the writer (docs/WRITER_TODO.txt 4.10).
import * as THREE from 'three';
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { DEMO } from '../core/config.js';
import { scene } from '../core/engine.js';
import { CELL, hasLighthouse, terrainHeight, shoreR } from '../world.js';
import { BARRIERS } from '../landmarks.js';
import { Builder } from '../builder.js';
import { mats } from '../psx.js';
import { TILE } from '../textures.js';
import { LM } from '../landmarks.js';
import { lampDead } from '../regions.js';
import { isKnown } from '../clues.js';
import { hash2, angleDiff, smoothstep } from '../util.js';
import { tod } from '../daynight.js';
import { nightKey, tideAt } from './calendar.js';
import { leadPass } from './leadlight.js';
import { hurtPlayer } from './storybeats.js';
import { chestHas } from '../chest.js';

export const WALL_R = 1650;           // the wall these ways go through (objectives.js GATES' last, held by the lens lantern)
export const LINE_HALF = 0.05;        // rad either side of a still beam's line
export const LIGHT_IN = [260, 40];    // a Guild light this far inside the wall (at most, at least) can lie still for it
export const TUNE_GAPS = 5, GAP_HALF = 24;     // the tune's gaps in the wall, and their half width in units
export const SLICK_GAPS = 4, SLICK_HALF = 16, SLICK_TIDE = -0.82;   // the slicks at the bottom of the tide
export const SLICK_HURT = 3, SLICK_HURT_EVERY = 2.5;   // the shoal in a slick's place at the wrong hour
export const LAMP_EYES = 6, LAMP_AIM = 0.1, LAMP_SEE = 450;   // s with the lamp out; rad off the harbour's bearing; how far a light is seen
export const LAGOON_TIDE = 0.5;
export const RIBS_SET = 34, RIBS_LULL = 9;     // s: one set of breakers and the lull that ends it

const on = () => !DEMO && !!(state.hut && state.hut.rolls && state.hut.rolls.length);
const night = () => tod.night > 0.4;
let made = null;
/** the wall's still lights, gaps and slicks for this voyage's sea (made once per seed) */
function sea() {
  if (made && made.seed === state.seed) return made;
  const gaps = (n, salt) => Array.from({ length: n }, (_, i) => ((i + (hash2(state.seed, i, salt) % 1000) / 1000 * 0.6 + 0.2) / n) * Math.PI * 2 - Math.PI);
  const lights = [], harbours = [], n = Math.ceil((WALL_R + 400) / CELL);
  for (let cz = -n; cz <= n; cz++) for (let cx = -n; cx <= n; cx++) {
    const r = Math.hypot(cx, cz) * CELL; if (r < WALL_R - LIGHT_IN[0] - CELL || r > WALL_R + 400) continue;
    const d = G.world.desc(cx, cz); if (!d || d.lm) continue;
    const rd = Math.hypot(d.x, d.z);
    if (d.region === 'lantern' && hasLighthouse(d) && rd > WALL_R - LIGHT_IN[0] && rd < WALL_R - LIGHT_IN[1]) lights.push(d);
    if (d.type === 'harbour' && rd > WALL_R + 20) harbours.push(d);
  }
  // keep lights apart: no two within 0.25 rad of each other round Tama
  const keep = [];
  for (const d of lights.sort((a, b) => Math.hypot(b.x, b.z) - Math.hypot(a.x, a.z))) { const a = Math.atan2(d.z, d.x); if (keep.every((k) => Math.abs(angleDiff(a, Math.atan2(k.z, k.x))) > 0.25)) keep.push(d); if (keep.length >= 3) break; }
  made = { seed: state.seed, lights: keep, harbours, tune: gaps(TUNE_GAPS, 41), slick: gaps(SLICK_GAPS, 43) };
  return made;
}
const across = (gapA, x, z) => Math.abs(angleDiff(Math.atan2(z, x), gapA)) * Math.hypot(x, z);   // units from a gap's line, along the wall

/** the way through the 1650 wall the ship is on right now ('light', 'tune', 'slick', 'lamp'), or null */
export function wallPass(R) {
  if (!on() || R !== WALL_R) return null;
  const S = sea(), p = G.ship.pos;
  if (night()) for (const L of S.lights) {   // a still beam, its rhythm known, the light lit, the ship on its line
    if (!(state.story.rhythm && state.story.rhythm[L.id])) continue;
    const isl = G.world.islands.get(L.id); if (!isl || !isl.lit || lampDead(state, L, nightKey())) continue;
    const a1 = Math.atan2(L.z, L.x), a2 = Math.atan2(p.z - L.z, p.x - L.x);
    if (Math.abs(angleDiff(a2, a1)) < LINE_HALF) return 'light';
  }
  if (night() && G.weather.storm < 0.3 && isKnown(state, 'hum') && S.tune.some((g) => across(g, p.x, p.z) < GAP_HALF)) return 'tune';
  if (tideAt() < SLICK_TIDE && S.slick.some((g) => across(g, p.x, p.z) < SLICK_HALF)) return 'slick';
  if (night() && rt.lampOut && lampT >= LAMP_EYES) {
    for (const h of S.harbours) { const dx = h.x - p.x, dz = h.z - p.z, dist = Math.hypot(dx, dz); if (dist < LAMP_SEE && Math.abs(angleDiff(Math.atan2(dx, -dz), G.ship.heading)) < LAMP_AIM) return 'lamp'; }
  }
  return null;
}
/** the bearing (compass, as ship.heading) from the ship to the nearest tune gap, for the pennant and the night stems (L9), or null */
export function tuneGapWay() {
  if (!on() || !night() || G.weather.storm >= 0.3 || !isKnown(state, 'hum')) return null;
  const S = sea(), p = G.ship.pos, a0 = Math.atan2(p.z, p.x);
  let best = null; for (const g of S.tune) { const d = Math.abs(angleDiff(a0, g)); if (best === null || d < Math.abs(angleDiff(a0, best))) best = g; }
  const tx = Math.cos(best) * (WALL_R + 120), tz = Math.sin(best) * (WALL_R + 120);
  return Math.atan2(tx - p.x, -(tz - p.z));
}
/** seaGate (storybeats.js): the ship has come out past the wall by a way through: the sea beyond is the captain's from now on */
export function crossWall(how) { if (!state.story.crossed) state.story.crossed = { s3: state.dayN, how }; }

/** Places.tick: another way in through a hand-made place's barrier. Once in by one, the ship may lie inside until it leaves. */
const inside = {};
export function barrierPass(lm, ship) {
  if (lm === 'broken') return leadPass(lm, ship);
  if (!on() || !LM[lm] || !BARRIERS[lm]) return false;
  const B = BARRIERS[lm], d = Math.hypot(ship.pos.x - LM[lm].x, ship.pos.z - LM[lm].z);
  if (d > B.R + 12) inside[lm] = false;
  let by = false;
  if (lm === 'lagoon') by = (ship.rowing && tideAt() > LAGOON_TIDE) || onTransit(ship);
  if (lm === 'ribs') by = (ship.rowing && ribsLull() > 0.5) || followingPilot(ship);
  if (by && d < B.R) inside[lm] = true;
  return by || (!!inside[lm] && d < B.R - 6);
}

// ---- the Glass Lagoon's transit (owner, 2026-11-19, T4 b: "use natural peaks, but make them recognizable"): a tall natural isle near
// the lagoon and one rock in its reef both wear a white cap, the only two such marks in that water. Keep the peak exactly behind the
// capped rock (within TRANSIT_HALF) and the reef lets the ship through that rock's gap, at any tide, under sail.
export const TRANSIT_HALF = 0.03, TRANSIT_SEEK = [160, 620];
let transit = null;
function transitMarks() {
  if (transit && transit.seed === state.seed) return transit;
  const L = LM.lagoon; transit = { seed: state.seed, peak: null };
  if (!L) return transit;
  let best = null; const n = Math.ceil(TRANSIT_SEEK[1] / CELL), c0x = Math.round(L.x / CELL), c0z = Math.round(L.z / CELL);
  for (let cz = c0z - n; cz <= c0z + n; cz++) for (let cx = c0x - n; cx <= c0x + n; cx++) {
    const d = G.world.desc(cx, cz); if (!d || d.lm || !(d.type === 'rocky' || d.type === 'volcano')) continue;
    const dist = Math.hypot(d.x - L.x, d.z - L.z); if (dist < TRANSIT_SEEK[0] || dist > TRANSIT_SEEK[1]) continue;
    const score = Math.abs(dist - 360) - (d.type === 'volcano' ? 60 : 0); if (!best || score < best.score) best = { d, score };
  }
  if (!best) return transit;
  const P = best.d, ux = (L.x - P.x), uz = (L.z - P.z), len = Math.hypot(ux, uz);
  transit.peak = P; transit.rock = { x: L.x + ux / len * 41, z: L.z + uz / len * 41 };   // on the reef ring, on the far side from the peak
  return transit;
}
function onTransit(ship) {
  const T = transitMarks(); if (!T.peak) return false;
  const P = T.peak, a1 = Math.atan2(T.rock.z - P.z, T.rock.x - P.x), a2 = Math.atan2(ship.pos.z - P.z, ship.pos.x - P.x);
  return Math.abs(angleDiff(a2, a1)) < TRANSIT_HALF;
}
let capsMade = null;
function makeCaps(T) {   // the two white caps: on the peak's top, and on one black knuckle of the reef
  const g = new THREE.Group();
  const P = T.peak; let top = { h: -1, x: 0, z: 0 };
  const R = shoreR(P, 0);
  for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) { const lx = i / 6 * R * 0.8, lz = j / 6 * R * 0.8, h = terrainHeight(P, lx, lz); if (h > top.h) top = { h, x: lx, z: lz }; }
  const b = new Builder(); b.blob(0, 0, 0, 3.6, 1.6, 3.6, '#f6f3ea', TILE.white, 0.25, 7);
  const cap = new THREE.Mesh(b.geometry(), mats.props); cap.position.set(P.x + top.x, top.h - 0.2, P.z + top.z); g.add(cap);
  const r = new Builder(); r.blob(0, 0.2, 0, 2.4, 2.0, 2.1, '#2e2e34', TILE.stone, 0.3, 3); r.blob(0, 2.0, 0, 1.7, 0.9, 1.5, '#f6f3ea', TILE.white, 0.2, 4);   // a knuckle of the reef, standing a little taller, capped white
  const rock = new THREE.Mesh(r.geometry(), mats.props); rock.position.set(T.rock.x, 0, T.rock.z); g.add(rock);
  scene.add(g); return g;
}

// ---- the Ribs' pilot (T4 b): once a day by daylight, when the ship is near, a Reef boat comes in from the open water, lies to just
// outside the breakers until the lull, rows in, waits a while, and rows out again on the next lull. Within PILOT_NEAR of her as she
// goes through, the ship goes through too, under sail or oars.
export const PILOT_NEAR = 22, PILOT_WAIT = 40;
let pilot = null;
function followingPilot(ship) {
  return !!(pilot && pilot.s && (pilot.phase === 'in' || pilot.phase === 'out') && Math.hypot(ship.pos.x - pilot.s.x, ship.pos.z - pilot.s.z) < PILOT_NEAR);
}
function pilotTick(dt) {
  const rb = LM.ribs; if (!rb || !G.traffic) return;
  const p = G.ship.pos, near = Math.hypot(p.x - rb.x, p.z - rb.z) < 280, day = tod.night < 0.3;
  if (!pilot && near && day && state.story.ribsPilot !== state.dayN) {
    state.story.ribsPilot = state.dayN;
    const a = Math.atan2(p.z - rb.z, p.x - rb.x) + 0.6, x = rb.x + Math.cos(a) * 140, z = rb.z + Math.sin(a) * 140;
    const s = G.traffic.spawnAt('canoe', 'reef', x, z, Math.atan2(rb.x - x, -(rb.z - z)), 'live', 0);
    if (s) { s.special = 'pilot'; s.name = 'A Reef boat'; pilot = { s, a, phase: 'come', t: 0 }; }
  }
  if (!pilot) return;
  const s = pilot.s; if (!G.traffic.ships.includes(s)) { pilot = null; return; }
  const to = (r, v) => { const tx = rb.x + Math.cos(pilot.a) * r, tz = rb.z + Math.sin(pilot.a) * r; s.heading = Math.atan2(tx - s.x, -(tz - s.z)); s.speed = Math.hypot(tx - s.x, tz - s.z) < 3 ? 0 : v; return Math.hypot(tx - s.x, tz - s.z) < 3; };
  pilot.t += dt;
  if (pilot.phase === 'come') { if (to(64, 4)) pilot.phase = 'hold'; }
  else if (pilot.phase === 'hold') { to(64, 0); if (ribsLull() > 0.5) pilot.phase = 'in'; }
  else if (pilot.phase === 'in') { if (to(30, 3.2)) { pilot.phase = 'wait'; pilot.t = 0; } }
  else if (pilot.phase === 'wait') { s.speed = 0; if (pilot.t > PILOT_WAIT && ribsLull() > 0.5) pilot.phase = 'out'; }
  else if (pilot.phase === 'out') { if (to(160, 3.6)) { s.special = null; pilot = null; } }
}
/** 0 while the breakers are running, 1 in the lull (sim time, so pausing keeps the count) */
export function ribsLull() { const t = (rt.tNow + (state.seed % 17)) % RIBS_SET; return t > RIBS_SET - RIBS_LULL ? 1 : 0; }

// ---- each frame: the lamp's dark for the eyes, the still beams, the slicks on the water, the breakers' sets; the shoal's bite
let lampT = 0, hurtT = 0, slickMesh = null, ribsMesh = null;
export function passesTick(dt) {
  if (!on()) return;
  lampT = rt.lampOut ? lampT + dt * (chestHas('shutter') ? 2 : 1) : 0;
  const S = sea(), p = G.ship.pos;
  for (const L of S.lights) { const isl = G.world.islands.get(L.id); if (isl && !isl.lead) { const k = (WALL_R + 220) / Math.hypot(L.x, L.z); isl.lead = { x: L.x * k, z: L.z * k, short: false }; } }   // world.js lays the beam still
  for (const L of S.lights) { const isl = G.world.islands.get(L.id); if (isl && isl.lead) isl.lead.short = Math.hypot(p.x, p.z) > WALL_R - 120 && !(state.story.rhythm && state.story.rhythm[L.id]); }   // inside the white, the beam goes only as far as you know the light
  // the slicks: glass strips out through the wall, there only near the bottom of the tide (their silent twin is the rule itself)
  if (!slickMesh) slickMesh = makeSlicks(S.slick);
  const lowK = smoothstep(SLICK_TIDE + 0.12, SLICK_TIDE, tideAt());
  slickMesh.visible = lowK > 0.02; slickMesh.material.opacity = 0.3 * lowK;
  // the shoal in a slick's place at the wrong hour: it takes the planks
  hurtT -= dt;
  const R = Math.hypot(p.x, p.z);
  if (hurtT <= 0 && tideAt() >= SLICK_TIDE && R > WALL_R - 30 && R < WALL_R + 60 && S.slick.some((g) => across(g, p.x, p.z) < SLICK_HALF) && G.ship.speed > 1) {
    if (chestHas('leadline')) { G.ship.speed *= 0.2; hurtT = 1; }   // the lead line: the crew sounds ahead and the ship is held off (the sea chest)
    else {
      hurtT = SLICK_HURT_EVERY; hurtPlayer(SLICK_HURT);
      const k = 'g' + Math.round(Math.atan2(p.z, p.x) * 100), hit = state.story.slickHit || (state.story.slickHit = {});   // owner 2026-11-19: the chart keeps a pencil sign where it bit
      if (!hit[k]) hit[k] = { x: Math.round(p.x), z: Math.round(p.z) };
    }
  }
  pilotTick(dt);
  { const T = transitMarks(); if (T.peak && !capsMade && Math.hypot(p.x - LM.lagoon.x, p.z - LM.lagoon.z) < 900) capsMade = makeCaps(T); }
  // the Ribs: a ring of white water that runs high through a set and lies down in the lull
  const rb = LM.ribs;
  if (rb && Math.hypot(p.x - rb.x, p.z - rb.z) < 320) {
    if (!ribsMesh) ribsMesh = makeRibsRing(rb);
    ribsMesh.visible = true;
    const t = (rt.tNow + (state.seed % 17)) % RIBS_SET, set = t > RIBS_SET - RIBS_LULL ? 0.08 : 0.6 + 0.4 * Math.abs(Math.sin(t * 1.3));
    ribsMesh.scale.y = set; ribsMesh.material.opacity = 0.25 + 0.6 * set;
  } else if (ribsMesh) ribsMesh.visible = false;
}
function makeSlicks(angles) {
  const g = new THREE.BufferGeometry(), pos = [];
  for (const a of angles) {
    const ux = Math.cos(a), uz = Math.sin(a), px = -uz, pz = ux;
    for (let r = WALL_R - 140; r < WALL_R + 220; r += 20) {   // a wandering strip of glass water, a little narrower than the way
      const w0 = SLICK_HALF * 0.9 * (0.8 + 0.2 * Math.sin(r * 0.05)), w1 = SLICK_HALF * 0.9 * (0.8 + 0.2 * Math.sin((r + 20) * 0.05));
      const a0 = [ux * r + px * w0, uz * r + pz * w0], b0 = [ux * r - px * w0, uz * r - pz * w0], a1 = [ux * (r + 20) + px * w1, uz * (r + 20) + pz * w1], b1 = [ux * (r + 20) - px * w1, uz * (r + 20) - pz * w1];
      pos.push(a0[0], 0.06, a0[1], b0[0], 0.06, b0[1], a1[0], 0.06, a1[1], b0[0], 0.06, b0[1], b1[0], 0.06, b1[1], a1[0], 0.06, a1[1]);
    }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#cfe8e4', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  m.renderOrder = 2; scene.add(m); return m;
}
function makeRibsRing(rb) {
  const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: '#f4f8fa', transparent: true, opacity: 0.6, depthWrite: false });
  for (let i = 0; i < 48; i++) { const th = (i / 48) * Math.PI * 2, R = 47 + Math.sin(i * 1.7) * 3; const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 3.2), mat); b.position.set(Math.cos(th) * R, 0.3, Math.sin(th) * R); b.rotation.y = -th; g.add(b); }
  g.position.set(rb.x, 0, rb.z); g.material = mat; scene.add(g); return g;
}

// ---- how the player hears of them: a pilot's saying, once each, at a harbour near the way (drafts, docs/WRITER_TODO.txt 4.10)
export const SAYINGS = {
  light: { speaker: 'lamplighter', text: 'A light that does not turn is pointing at something. The old pilots kept one at their backs.' },
  tune: { speaker: 'oldsalt', text: 'When the fog stands up like a wall, they say there is a tune that knows the way through. I never learned it.' },
  slick: { speaker: 'fisher', text: 'At the bottom of the tide the wall leaves a road of glass water. Miss the hour and it takes your planks.' },
  lamp: { speaker: 'watchman', text: 'Put your lamp out by the wall at night and you see harbours on the other side. Steer for one. Do not look down.' },
  lagoon: { speaker: 'fisher', text: 'Into Glass Lagoon with a narrow rudder? High water, oars out, slow.' },
  transit: { speaker: 'oldsalt', text: 'There is a white cap on the reef at Glass Lagoon, and another on a hill out beyond. Put the one behind the other and sail in.' },
  ribs: { speaker: 'oldsalt', text: 'Breakers come in sets. Count them. In the quiet between, row in.' },
  pilot: { speaker: 'fisher', text: 'The Reef boats go into the Ribs every day. Stay in their wake and you will not touch.' },
};
export const SAYING_P = 0.3;
/** docking at harbour d: one saying not yet heard that belongs near here, or null */
export function pilotSaying(d) {
  if (!on() || Math.random() >= SAYING_P) return null;
  const heard = state.story.sayings || (state.story.sayings = {}), r = Math.hypot(d.x, d.z);
  const near = (lm) => LM[lm] && Math.hypot(LM[lm].x - d.x, LM[lm].z - d.z) < 900;
  const can = { light: r > 1200 && d.region === 'lantern', tune: r > 1200, slick: r > 1200, lamp: r > 1200, lagoon: near('lagoon'), transit: near('lagoon'), ribs: near('ribs'), pilot: near('ribs') };
  const k = Object.keys(SAYINGS).find((key) => can[key] && !heard[key]);
  if (!k) return null;
  heard[k] = state.dayN;
  return { ...SAYINGS[k], story: true };
}
/** for tests: the wall's still lights, gaps and slicks */
export const passesSea = () => { const S = sea(), T = transitMarks(); return { transit: T.peak ? { peak: { x: T.peak.x, z: T.peak.z, name: T.peak.name }, rock: T.rock } : null, pilot: pilot ? pilot.phase : null, lights: S.lights.map((d) => ({ id: d.id, x: d.x, z: d.z })), harbours: S.harbours.length, tune: S.tune, slick: S.slick }; };
