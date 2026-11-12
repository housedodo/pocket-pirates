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
  // the sailors who went mad (systems/lostsailors.js spawns these; the random deck never does)
  lost_berth: { model: 'wreckman', label: 'A wreck, someone aboard' },
  lost_hook: { model: 'lineboat', label: 'A rowboat, line out' },
  lost_dig: { model: 'digbar', label: 'A black sandbar' },
};

const GEO = {};
// a figure: legs, body, arms down, head (no face), in dull clothes
function figure(b, x, y, z, ry, col, sit = false) {
  b.push(x, y, z, ry);
  if (sit) { b.box(0, 0.45, 0.25, 0.42, 0.18, 0.55, '#2a2420', TILE.white); b.box(0, 0, 0.5, 0.4, 0.5, 0.16, '#2a2420', TILE.white); }
  else b.box(0, 0, 0, 0.42, 0.8, 0.22, '#2a2420', TILE.white);
  const by = sit ? 0.5 : 0.8;
  b.box(0, by, 0, 0.52, 0.75, 0.3, col, TILE.white);
  for (const s of [-1, 1]) b.box(s * 0.33, by + 0.05, 0, 0.13, 0.65, 0.15, col, TILE.white);
  b.blob(0, by + 0.95, 0, 0.2, 0.24, 0.2, '#b8a890', TILE.white, 0.1, 3);
  b.pop();
}
// a boat's hull: a box with a pointed bow (and a pointed stern unless `cut`, the broken stern of a wreck); local +z is the bow
function hull(b, w, h, len, col, cut) {
  const bl = w * 0.9, mid = len - bl * (cut ? 1 : 2), z0 = cut ? -len / 2 : -len / 2 + bl, z1 = z0 + mid;
  b.box(0, 0, (z0 + z1) / 2, w, h, mid, col, TILE.planks);
  const wedge = (zb, dir) => {
    const lt = [-w / 2, h, zb], rt = [w / 2, h, zb], lb = [-w / 2, 0, zb], rb = [w / 2, 0, zb], tt = [0, h * 1.1, zb + dir * bl], tb = [0, h * 0.45, zb + dir * bl];
    b.quad(lt, lb, tb, tt, col, TILE.planks); b.quad(rt, tt, tb, rb, col, TILE.planks); b.tri(lt, tt, rt, col, TILE.planks); b.tri(lb, rb, tb, col, TILE.planks);
  };
  wedge(z1, 1); if (!cut) wedge(z0, -1);
}
function geos() {
  if (GEO.boat) return;
  let b = new Builder(); b.doubleSided = true;
  b.box(0, 0, 0, 1.5, 0.6, 3.4, '#ffffff', TILE.planks);
  b.box(0, 0.45, 1.5, 0.2, 0.5, 0.2, '#3a2210', TILE.planks);
  b.cyl(0, 1.4, -0.2, 0.08, 0.1, 2.2, 5, '#4a2a12', TILE.bark, false);
  b.box(0.08, 1.7, -0.2, 0.06, 1.3, 1.1, '#e8dcc0', TILE.sail);
  b.box(0.4, 0.55, 0.6, 0.28, 0.28, 0.28, '#ffd23a', TILE.glow);   // a lamp, lit
  GEO.boat = b.geometry();
  b = new Builder(); b.doubleSided = true;   // a wreck lying over: a pointed bow, a ragged gunwale, ribs where the stern broke; a man on his trunk
  b.push(0, -0.7, 0, 0, 1, 1, 1, 0, 0.42);
  hull(b, 2.8, 1.4, 7.6, '#4a3424', true);
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) b.box(s * 1.3, 1.4, -2.6 + i * 1.0, 0.18, 0.15 + ((i * 7 + (s + 1) * 3) % 5) * 0.12, 0.7, '#5a4430', TILE.planks);   // ragged gunwale
  for (let i = 0; i < 4; i++) b.box(-0.9 + i * 0.6, 0.9, -3.7, 0.16, 0.9 + (i % 2) * 0.6, 0.16, '#3a2a1c', TILE.bark);   // ribs where the stern broke off
  b.cyl(0, 0.9, 0.8, 0.12, 0.14, 3.0, 5, '#3a2a1c', TILE.bark, false);   // the stump of the mast
  b.pop();
  b.box(-0.9, 0.95, -1.2, 0.8, 0.5, 0.55, '#6a4a2a', TILE.planks);       // the trunk
  figure(b, -0.9, 0.95, -1.2, 0.6, '#5a6a7a', true);
  b.box(-0.55, 1.75, -0.9, 0.22, 0.16, 0.02, '#e8dcc0', TILE.white);     // the ticket
  b.box(1.35, 3.1, 0.8, 0.5, 0.55, 0.5, '#ffd23a', TILE.glow);         // a lantern on the stump of the mast, lit: it is what you see first
  GEO.wreckman = b.geometry();
  b = new Builder(); b.doubleSided = true;   // a rowboat, oars shipped across it, nobody in it; a short rod, the line cut above the water
  hull(b, 1.5, 0.6, 3.8, '#9a6a3a', false);
  b.box(0, 0.32, 0, 1.2, 0.06, 2.2, '#5a3a1c', TILE.planks); b.box(0, 0.36, -0.2, 1.3, 0.08, 0.4, '#6b4a2e', TILE.planks);   // floor and thwart
  for (const z of [-0.5, 0.2]) b.box(0, 0.46, z, 3.0, 0.08, 0.14, '#c8a870', TILE.bark);   // the oars, across, sticking out both sides
  b.push(0.45, 0.6, 1.3, 0, 1, 1, 1, 0.5, 0.35); b.cyl(0, 0, 0, 0.05, 0.04, 1.6, 4, '#4a3020', TILE.bark, false); b.pop();   // the rod
  b.box(1.0, 0.35, 2.1, 0.1, 1.15, 0.1, '#efe4c8', TILE.rope);           // the line, hanging, cut clean above the water
  b.box(-0.35, 0.4, -0.9, 0.08, 1.5, 0.08, '#3a2a1c', TILE.bark); b.box(-0.35, 1.9, -0.9, 0.45, 0.5, 0.45, '#ffd23a', TILE.glow);   // a lantern on a pole, still lit
  GEO.lineboat = b.geometry();
  b = new Builder(); b.doubleSided = true;   // a black sandbar sunk in the sea, a dull scum ring, a hole with a paler rim, a mound, a man with a spade
  b.cyl(0, -1.6, 0, 6.6, 4.4, 2.0, 9, '#1a1820', TILE.sand);
  b.cyl(0, 0.02, 0, 7.8, 7.8, 0.04, 12, '#6a7068', TILE.white);          // the scum on the water round it, pale enough to show at night
  b.cyl(1.2, 0.4, 0.3, 1.45, 1.45, 0.03, 8, '#4a4652', TILE.sand); b.cyl(1.2, 0.42, 0.3, 1.1, 1.1, 0.03, 8, '#050407', TILE.white);   // rim, hole
  b.blob(-1.2, 0.45, 0.6, 1.1, 0.45, 0.9, '#24222c', TILE.sand, 0.3, 4);
  figure(b, 0.2, 0.4, -0.2, 2.2, '#4a4a3a');
  b.push(0.75, 0.75, 0.1, 0, 1, 1, 1, 0.5, 0); b.box(0, 0.6, 0, 0.07, 1.4, 0.07, '#6a4a2a', TILE.bark); b.box(0, -0.1, 0, 0.32, 0.36, 0.05, '#5a5a62', TILE.white); b.pop();
  GEO.digbar = b.geometry();
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
  spawn(card, ship, world, near = 70, off = 0) {   // near: how far ahead (deep-dread fog is close: the lost sailors come nearer); off: set off to one side of the bow, out from behind the mast
    const def = SIGHTS[card.id]; if (!def || this.cur) return false;
    geos();
    for (let k = 0; k < 8; k++) {
      const ang = ship.heading + (off ? (Math.random() < 0.5 ? -1 : 1) * (off + Math.random() * 0.35) : (Math.random() - 0.5) * 0.8), dist = near + Math.random() * 25;
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
    const still = c.card.id === 'lost_dig';   // the black sandbar does not ride the swell; the sea laps round it
    c.age += dt; if (!still) { c.x += Math.sin(t * 0.05) * 0.15 * dt; c.mesh.rotation.y += c.spin * dt; }
    const y = still ? 0 : waveHeight(c.x, c.z, t) * 0.8;
    if (c.sink) { c.sink += dt; c.mesh.position.set(c.x, y - c.sink * 0.9, c.z); if (c.sink > 3) this.clear(); return; }
    c.mesh.position.set(c.x, y + (still ? 0 : 0.1), c.z);
    if (!still) c.mesh.rotation.z = Math.sin(t * 1.2 + c.x) * 0.06;
    if (Math.hypot(ship.pos.x - c.x, ship.pos.z - c.z) > 260 || c.age > 300) this.dismiss();
  }
  solids(out) { const c = this.cur; if (c && !c.sink) out.push({ x: c.x, z: c.z, r: 1.3 }); return out; }
  clear() { if (!this.cur) return; this.scene.remove(this.cur.mesh); this.cur = null; }
}
