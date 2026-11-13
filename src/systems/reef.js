// The Reef Brotherhood's waters (2026-11-13, owner; regions.js): ships come here and stay.
//   - coral heads (regiondecor.js) are rock: run onto one and the hull takes it, and the ship stops
//   - the shoals move: each dawn the coral of the Reef islands is laid out again (world.refresh rebuilds them)
//   - a storm in Reef waters brings a wreck up near you; it is gone again at the next low water
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { setDecorDay } from '../regiondecor.js';
import { regionAt } from '../regions.js';
import { tideAt } from './calendar.js';
import { hurtPlayer } from './storybeats.js';
import { dreadAtDistance } from '../palette.js';

let hitT = 0, stormT = 0;
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
  // a storm in Reef waters: once a blow, a wreck comes up near you; at the next low water it is gone
  const sw = rt.stormWreck;
  if (sw && tideAt() > 0) sw.risen = true;   // the tide has come in since it surfaced
  if (sw && sw.risen && tideAt() < -0.5 && Math.hypot(ship.pos.x - sw.x, ship.pos.z - sw.z) > 60) { G.sea.removeWreck(sw.id); rt.stormWreck = null; }   // the next low water takes it
  stormT -= dt;
  if (!rt.stormWreck && stormT <= 0 && (G.weather.storm || 0) > 0.5 && regionAt(ship.pos.x, ship.pos.z, state.seed) === 'reef') {
    stormT = 2;   // try again shortly if the spot is no good
    for (let k = 0; k < 8 && !rt.stormWreck; k++) {   // somewhere round the ship, ahead first, clear of islands
      const a = ship.heading + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.8 + (Math.random() - 0.5) * 0.4, r = 70 + Math.random() * 40;
      const x = ship.pos.x + Math.sin(a) * r, z = ship.pos.z - Math.cos(a) * r;
      if (G.world.nearest(x, z, 25)) continue;
      const id = `ws:${state.dayN}:${Math.round(x)},${Math.round(z)}`, o = G.sea.addWreck(x, z, id, dreadAtDistance(Math.hypot(x, z)), Math.floor(Math.random() * 1e6));
      if (o) { rt.stormWreck = { id, x, z }; stormT = 240; }   // one wreck a blow
    }
  }
}
