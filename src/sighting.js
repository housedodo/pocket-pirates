import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';
import { waveHeight } from './ocean.js';

// A rare sign at sea: something small drifts near the ship. Press E to answer it; sail past and nothing happens.
// Only cards that have a thing to look at appear this way (the model and the words on the [E] tag are set here).
export const SIGHTS = {
  chest: { model: 'crate', label: 'Floating chest' },
  dinghy: { model: 'boat', label: 'A peddler in a dinghy' },
  castaway: { model: 'raft', label: 'A raft, someone waving' },
  rowboat: { model: 'boat', label: 'An empty rowboat' },
  buoy: { model: 'buoy', label: 'A ringing buoy' },
  stowaway: { model: 'crate', label: 'A crate that moves' },
  shoal: { model: 'shoal', label: 'A silver shoal' },
  calm: { model: 'glass', label: 'A patch of glass' },
};

const GEO = {};
function geos() {
  if (GEO.boat) return;
  let b = new Builder(); b.doubleSided = true;
  b.box(0, 0, 0, 1.5, 0.6, 3.4, '#ffffff', TILE.planks);
  b.box(0, 0.45, 1.5, 0.2, 0.5, 0.2, '#3a2210', TILE.planks);
  b.cyl(0, 1.4, -0.2, 0.08, 0.1, 2.2, 5, '#4a2a12', TILE.bark, false);
  b.box(0.08, 1.7, -0.2, 0.06, 1.3, 1.1, '#e8dcc0', TILE.sail);
  b.box(0.4, 0.55, 0.6, 0.28, 0.28, 0.28, '#ffd23a', TILE.glow);   // a lamp, lit
  GEO.boat = b.geometry();
  b = new Builder(); b.doubleSided = true;
  b.box(0, 0, 0, 1.1, 0.9, 1.1, '#ffffff', TILE.planks);
  b.box(0, 0.5, 0, 1.2, 0.12, 1.2, '#8a5a30', TILE.planks);
  GEO.crate = b.geometry();
  b = new Builder(); b.doubleSided = true;
  b.cyl(0, 0, 0, 0.6, 0.8, 0.9, 6, '#c8402a', TILE.white);
  b.cyl(0, 0.9, 0, 0.08, 0.08, 1.4, 5, '#3a2210', TILE.bark, false);
  b.box(0, 2.3, 0, 0.3, 0.3, 0.3, '#ffd23a', TILE.glow);
  GEO.buoy = b.geometry();
  b = new Builder(); b.doubleSided = true;
  b.box(0, 0, 0, 2.6, 0.2, 2.2, '#ffffff', TILE.planks);
  b.cyl(0.6, 0.6, 0.4, 0.05, 0.05, 1.8, 5, '#3a2210', TILE.bark, false);
  b.box(0.9, 1.4, 0.4, 0.8, 0.5, 0.05, '#e8dcc0', TILE.sail);   // a shirt on a stick
  GEO.raft = b.geometry();
  b = new Builder(); b.doubleSided = true;
  for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.6 + (i % 3) * 0.7; b.box(Math.cos(a) * r, 0.1, Math.sin(a) * r, 0.5, 0.15, 0.2, '#d8e8f0', TILE.white); }
  GEO.shoal = b.geometry();
  b = new Builder(); b.doubleSided = true;
  b.cyl(0, 0, 0, 3, 3, 0.05, 10, '#bff0ff', TILE.white, false);
  GEO.glass = b.geometry();
}

export class Sighting {
  constructor(scene) { this.scene = scene; this.cur = null; }
  get active() { return !!this.cur; }
  /** put the card's sign on the water ahead of the ship, or return false if there is no clear spot */
  spawn(card, ship, world) {
    const def = SIGHTS[card.id]; if (!def || this.cur) return false;
    geos();
    for (let k = 0; k < 8; k++) {
      const ang = ship.heading + (Math.random() - 0.5) * 0.8, dist = 70 + Math.random() * 25;
      const x = ship.pos.x + Math.sin(ang) * dist, z = ship.pos.z - Math.cos(ang) * dist;
      if (world.nearest(x, z, 40)) continue;
      const mesh = new THREE.Mesh(GEO[def.model], mats.props);
      mesh.position.set(x, 0, z); mesh.rotation.y = Math.random() * 6.28;
      this.scene.add(mesh);
      this.cur = { card, label: def.label, mesh, x, z, age: 0, sink: 0, spin: (Math.random() - 0.5) * 0.12 };
      return true;
    }
    return false;
  }
  /** the sign within reach (it can only be answered up close) */
  near(px, pz, r = 15) { const c = this.cur; return c && !c.sink && Math.hypot(px - c.x, pz - c.z) < r ? c : null; }
  /** it slips under the water once answered or left behind */
  dismiss() { if (this.cur) this.cur.sink = 0.001; }
  update(dt, t, ship) {
    const c = this.cur; if (!c) return;
    c.age += dt; c.x += Math.sin(t * 0.05) * 0.15 * dt; c.mesh.rotation.y += c.spin * dt;
    const y = waveHeight(c.x, c.z, t) * 0.8;
    if (c.sink) { c.sink += dt; c.mesh.position.set(c.x, y - c.sink * 0.9, c.z); if (c.sink > 3) this.clear(); return; }
    c.mesh.position.set(c.x, y + 0.1, c.z);
    c.mesh.rotation.z = Math.sin(t * 1.2 + c.x) * 0.06;
    if (Math.hypot(ship.pos.x - c.x, ship.pos.z - c.z) > 260 || c.age > 300) this.dismiss();
  }
  solids(out) { const c = this.cur; if (c && !c.sink) out.push({ x: c.x, z: c.z, r: 1.3 }); return out; }
  clear() { if (!this.cur) return; this.scene.remove(this.cur.mesh); this.cur = null; }
}
