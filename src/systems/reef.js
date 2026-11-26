// The Reef Brotherhood's waters (2026-11-13, owner; regions.js): ships come here and stay.
//   - coral heads (regiondecor.js) are rock: run onto one and the hull takes it, and the ship stops
//   - the shoals move: each dawn the coral of the Reef islands is laid out again (world.refresh rebuilds them)
//   - a storm in Reef waters brings a wreck up near you; it is gone again at the next low water
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { setDecorDay } from '../regiondecor.js';
import { regionAt } from '../regions.js';

import { hurtPlayer } from './storybeats.js';
import { dreadAtDistance } from '../palette.js';
import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { mats } from '../psx.js';
import { Builder } from '../builder.js';
import { TILE } from '../textures.js';

let hitT = 0, stormT = 0;
// P-REEF-2 Before the tide takes it (2026-11-17, kept on purpose): once the tide has come in, the next low water takes a storm wreck,
// but never while the ship lies within STORM_WRECK_WAIT of it. Sit by her as the water falls and salvage at the bottom of the tide
// (interact.js: x1.3 below -0.45, x1.5 in Reef water).
export const STORM_WRECK_WAIT = 60;
export function reefTick(dt) {
  const ship = G.ship;
  // the shoals move at dawn: a new day, the Reef islands are built again from the day's seed
  if (rt.decorDay !== state.dayN) { rt.decorDay = state.dayN; setDecorDay(state.dayN); G.world.refresh((d) => d.region === 'reef' && !d.lm); }
  // coral: the islands near the ship carry their heads in d.coral (world coordinates)
  hitT -= dt;
  if (hitT <= 0 && ship.speed > 1.2) {
    const isl = G.world.nearest(ship.pos.x, ship.pos.z, 90);
    const cor = isl && isl.desc.coral;
    if (cor) for (const c of cor) {
      const dx = ship.pos.x - c.x, dz = ship.pos.z - c.z, d = Math.hypot(dx, dz);
      if (d < c.r + 2.6) {
        hurtPlayer(6 + ship.speed * 1.2); hitT = 1.5;
        ship.speed *= 0.25; ship.pos.x = c.x + (dx / (d || 1)) * (c.r + 2.8); ship.pos.z = c.z + (dz / (d || 1)) * (c.r + 2.8);   // off the rock
        G.objectives.remark('coral', rt.dread);
        break;
      }
    }
  }
  stakeTick(dt);
  // a storm in Reef waters: once a blow, a wreck comes up near you; at the next low water it is gone
  const sw = rt.stormWreck;
  if (sw && sw.stake && !sw.o) { sw.o = G.sea.addWreck(sw.x, sw.z, sw.id, dreadAtDistance(Math.hypot(sw.x, sw.z)), sw.seed); }   // the stake's wreck: its water may load later than the blow
  if (sw && sw.stake) state.story.reefStake.risen = 1;
  if (sw && sw.day == null) sw.day = state.dayN;   // no tides: it lies there until the next day, while you are not by it
  if (sw && state.dayN > sw.day && Math.hypot(ship.pos.x - sw.x, ship.pos.z - sw.z) > STORM_WRECK_WAIT) {
    G.sea.removeWreck(sw.id); rt.stormWreck = null;
    if (sw.stake) { const k = state.story.reefStake; k.w = 0; k.done = 1; }   // the wreck goes; the stake stays
  }   // the next low water takes it
  stormT -= dt;
  if (!rt.stormWreck && stormT <= 0 && (G.weather.storm || 0) > 0.5 && regionAt(ship.pos.x, ship.pos.z, state.seed) === 'reef') {
    stormT = 2;   // try again shortly if the spot is no good
    const k = state.story.reefStake;
    if (k && !k.done && !k.w) {   // P-REEF-4: this blow brings its wreck up beside the stake, wherever the ship is
      k.w = 1; k.risen = 0; rt.stormWreck = stakeWreck(k); stormT = 240; return;
    }
    for (let k = 0; k < 8 && !rt.stormWreck; k++) {   // somewhere round the ship, ahead first, clear of islands
      const a = ship.heading + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.8 + (Math.random() - 0.5) * 0.4, r = 70 + Math.random() * 40;
      const x = ship.pos.x + Math.sin(a) * r, z = ship.pos.z - Math.cos(a) * r;
      if (G.world.nearest(x, z, 25)) continue;
      const id = `ws:${state.dayN}:${Math.round(x)},${Math.round(z)}`, o = G.sea.addWreck(x, z, id, dreadAtDistance(Math.hypot(x, z)), Math.floor(Math.random() * 1e6));
      if (o) { rt.stormWreck = { id, x, z, o }; stormT = 240; }   // one wreck a blow
    }
  }
}

// ---- P-REEF-4 The stake with no wreck (2026-11-17, owner: build the suggested puzzles; L-16 adopted for it). Full game only, after
// the first throw, once a voyage: a stake with a white rag stands alone in open Reef water. E finds nothing there. The next blow in
// Reef water raises its wreck right beside it instead of near the ship; at the next low water the wreck goes, and the stake stays.
// Nothing solid, nothing to pick up (RULES 24c, owner's leave for this one stake). Nobody says who planted it.
// state.story.reefStake = { x, z, w: its wreck is up, risen: the tide has come in since, done: the wreck has gone }
export const STAKE_NEAR = 180, STAKE_FAR = 480;   // placed this far from the ship, so it comes into view on the way
export const STAKE_CLEAR = 300, STAKE_CLEAR_MIN = 150;   // wanted clear of every island (the catalogue's 300); never closer than the floor
export const STAKE_WRECK_OFF = 7;   // its wreck comes up this far from the stake
const STAKE_SEEN = 520;   // drawn within this of the ship
let stake = null, placeT = 0;
const isFull = () => typeof window === 'undefined' || window.__BUILD !== 'demo';
function stakeWreck(k) {
  const a = (Math.abs(Math.round(k.x * 7 + k.z * 13)) % 628) / 100;
  return { id: `stake:${Math.round(k.x)},${Math.round(k.z)}`, x: k.x + Math.cos(a) * STAKE_WRECK_OFF, z: k.z + Math.sin(a) * STAKE_WRECK_OFF, seed: Math.abs(Math.round(k.x * 31 + k.z)) % 1e6, stake: true, risen: !!k.risen };
}
/** where the stake goes: open Reef water round the ship, the most open spot in a ring ahead of her; null if none is clear enough */
function stakeSpot(ship) {
  let best = null;
  for (let i = 0; i < 24; i++) {
    const a = ship.heading + (i / 24 - 0.5) * Math.PI * 1.4, r = STAKE_NEAR + (i % 4) * (STAKE_FAR - STAKE_NEAR) / 3;
    const x = ship.pos.x + Math.sin(a) * r, z = ship.pos.z - Math.cos(a) * r;
    if (regionAt(x, z, state.seed) !== 'reef') continue;
    let clear = Infinity; const cx = Math.round(x / 110), cz = Math.round(z / 110);
    for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) { const d = G.world.desc(cx + dx, cz + dz); if (d) clear = Math.min(clear, Math.hypot(d.x - x, d.z - z) - d.r); }
    if (clear >= STAKE_CLEAR_MIN && (!best || clear > best.clear)) best = { x, z, clear };
    if (best && best.clear >= STAKE_CLEAR) break;
  }
  return best;
}
function stakeMesh() {
  const b = new Builder(); b.ambient = 0.8;
  b.cyl(0, -3, 0, 0.2, 0.14, 9.6, 5, '#5a4630', TILE.bark, false);    // the stake, driven into the bottom, standing clear of the chop
  b.cyl(0, 5.7, 0, 0.22, 0.22, 0.3, 5, '#3a2e22', TILE.rope);           // a lashing
  const r = new Builder(); r.doubleSided = true; r.grime = 0; r.ambient = 1;
  r.box(0.9, 0, 0, 1.8, 1.0, 0.05, '#f4f1e8', TILE.white);             // the white rag
  const g = new THREE.Group(), rag = new THREE.Mesh(r.geometry(), mats.props);
  g.add(new THREE.Mesh(b.geometry(), mats.props)); rag.position.set(0, 5.95, 0); g.add(rag);
  g.userData.rag = rag; return g;
}
function stakeTick(dt) {
  if (!isFull()) return;
  const ship = G.ship;
  let k = state.story.reefStake;
  if (!k) {   // placed once, the first time the ship is out in Reef water after the first throw
    placeT -= dt;
    if (placeT > 0 || !(state.hut && state.hut.rolls && state.hut.rolls.length) || regionAt(ship.pos.x, ship.pos.z, state.seed) !== 'reef') return;
    placeT = 3; const s = stakeSpot(ship); if (!s) return;
    k = state.story.reefStake = { x: Math.round(s.x), z: Math.round(s.z), w: 0, risen: 0, done: 0 };
  }
  if (k.w && !k.done && !rt.stormWreck) rt.stormWreck = stakeWreck(k);   // a saved voyage: its wreck is still up
  const near = Math.hypot(ship.pos.x - k.x, ship.pos.z - k.z) < STAKE_SEEN;
  if (near && !stake) { stake = stakeMesh(); stake.position.set(k.x, 0, k.z); scene.add(stake); }
  if (stake) {
    stake.visible = near;
    const rag = stake.userData.rag, w = G.wind;
    rag.rotation.y = Math.PI / 2 - (w ? w.dir : 0) + Math.sin(rt.tNow * 3.1) * 0.25;   // it streams downwind
    rag.rotation.x = Math.sin(rt.tNow * 4.7) * 0.12;
  }
}
