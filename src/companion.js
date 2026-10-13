import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';

// A little ship's companion that wanders the deck now and then: a cat or a gull. Purely for company: it does not talk,
// is never needed for anything and never changes with dread (the wrong things stay elsewhere). Prototype for the concept
// sketch (dev hook `__game.companion('cat' | 'gull')`); not part of the demo yet.
const mesh = (b) => new THREE.Mesh(b.geometry(), mats.props);
const part = (build, x, y, z) => { const b = new Builder(); build(b); const m = mesh(b); m.position.set(x, y, z); return m; };

// ---- cat: ginger tabby, cream chest, green eyes. Faces +z, feet at y = 0, about 0.5 long.
function buildCat() {
  const g = new THREE.Group(), fur = '#d98a3c', stripe = '#8f4c22', cream = '#f3e5c6';
  const body = new THREE.Group(); g.add(body);
  body.add(part((b) => { b.blob(0, 0, 0, 0.12, 0.1, 0.27, fur, TILE.white, 0.1, 3); b.blob(0, -0.04, 0.05, 0.09, 0.07, 0.17, cream, TILE.white, 0.1, 5); for (const z of [-0.08, 0.02, 0.12]) b.box(0, 0.08, z, 0.17, 0.035, 0.04, stripe, TILE.white); }, 0, 0.17, 0));
  const head = new THREE.Group(); head.position.set(0, 0.27, 0.27); g.add(head);
  head.add(part((b) => {
    b.blob(0, 0, 0, 0.115, 0.1, 0.1, fur, TILE.white, 0.08, 9);
    for (const sx of [-1, 1]) { b.cyl(sx * 0.07, 0.06, -0.01, 0.045, 0.0, 0.085, 3, fur, TILE.white, false); b.box(sx * 0.04, 0.025, 0.09, 0.034, 0.034, 0.012, '#ffffff', TILE.glow); b.box(sx * 0.04, 0.025, 0.1, 0.02, 0.022, 0.01, '#79d36a', TILE.glow); }
    b.box(0, -0.015, 0.1, 0.03, 0.024, 0.02, '#e88a9a', TILE.white);
    b.box(0, 0.075, 0.07, 0.07, 0.03, 0.04, stripe, TILE.white);
  }, 0, 0, 0));
  const legs = [];
  for (const [sx, z] of [[-1, 0.17], [1, 0.17], [-1, -0.18], [1, -0.18]]) {
    const l = new THREE.Group(); l.position.set(sx * 0.075, 0.15, z); g.add(l);
    l.add(part((b) => { b.box(0, -0.15, 0, 0.055, 0.15, 0.06, fur, TILE.white); b.box(0, -0.15, 0.02, 0.06, 0.03, 0.08, cream, TILE.white); }, 0, 0, 0));
    legs.push(l);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.2, -0.26); g.add(tail);
  tail.add(part((b) => { b.push(0, 0, 0, 0, 1, 1, 1, -0.6); b.cyl(0, 0, 0, 0.03, 0.026, 0.3, 4, fur, TILE.white, true); b.box(0, 0.26, 0, 0.05, 0.06, 0.05, stripe, TILE.white); b.pop(); }, 0, 0, 0));
  return { g, body, head, legs, tail, kind: 'cat' };
}

// ---- gull: white, grey wings with black tips, orange beak and feet. Faces +z, feet at y = 0, about 0.5 long.
function buildGull() {
  const g = new THREE.Group(), white = '#f4f2ea', grey = '#a9b2bf', orange = '#f0a030';
  const body = new THREE.Group(); g.add(body);
  body.add(part((b) => {
    b.blob(0, 0, 0, 0.1, 0.09, 0.22, white, TILE.white, 0.08, 4);
    for (const sx of [-1, 1]) { b.box(sx * 0.09, -0.02, -0.02, 0.025, 0.1, 0.3, grey, TILE.white); b.box(sx * 0.09, -0.02, -0.19, 0.027, 0.08, 0.1, '#1c1c24', TILE.white); }
    b.box(0, -0.03, -0.24, 0.1, 0.05, 0.12, white, TILE.white);
  }, 0, 0.2, 0));
  const head = new THREE.Group(); head.position.set(0, 0.34, 0.14); g.add(head);
  head.add(part((b) => {
    b.blob(0, 0, 0, 0.065, 0.065, 0.07, white, TILE.white, 0.06, 7);
    b.cyl(0, -0.012, 0.06, 0.022, 0.006, 0.12, 4, orange, TILE.white, false); b.box(0, -0.03, 0.15, 0.012, 0.02, 0.012, '#d03a2a', TILE.white);
    for (const sx of [-1, 1]) b.box(sx * 0.045, 0.02, 0.04, 0.018, 0.018, 0.012, '#10101a', TILE.white);
  }, 0, 0, 0));
  const legs = [];
  for (const sx of [-1, 1]) {
    const l = new THREE.Group(); l.position.set(sx * 0.04, 0.2, 0.02); g.add(l);
    l.add(part((b) => { b.box(0, -0.2, 0, 0.018, 0.2, 0.018, orange, TILE.white); b.box(0, -0.2, 0.03, 0.06, 0.012, 0.08, orange, TILE.white); }, 0, 0, 0));
    legs.push(l);
  }
  const wings = [];
  for (const sx of [-1, 1]) {   // unfolded wings for flight (hidden while it walks)
    const w = new THREE.Group(); w.position.set(sx * 0.09, 0.24, 0); w.visible = false; g.add(w);
    w.add(part((b) => { b.box(sx * 0.2, 0, 0, 0.4, 0.02, 0.2, white, TILE.white); b.box(sx * 0.46, 0, 0, 0.14, 0.02, 0.17, '#1c1c24', TILE.white); }, 0, 0, 0));
    wings.push(w);
  }
  return { g, body, head, legs, wings, tail: null, kind: 'gull' };
}

// places on the Merry Gull (ship-local x, floor y, z, facing, pose). The deck floor is about y = 0.5; barrels and the rope coil are seats.
const PI = Math.PI;   // h is the model's yaw: 0 faces the stern (+z), PI faces the bow (-z)
const SPOTS = {
  cat: [
    { x: -0.2, y: 0.5, z: -1.0, h: PI, pose: 'sit' },                  // forward of the mast, looking out over the bow
    { x: -0.2, y: 0.5, z: -2.0, h: PI * 0.8, pose: 'walk' },
    { x: -0.7, y: 1.25, z: 0.4, h: PI * 0.6, pose: 'loaf' },           // on the barrel
    { x: -0.35, y: 0.5, z: 0.6, h: PI, pose: 'sit' },
    { x: 0.35, y: 1.08, z: -2.7, h: PI * 1.3, pose: 'loaf' },          // curled on the rope coil
    { x: 0.3, y: 0.5, z: 0.9, h: 0.4, pose: 'walk' },
  ],
  gull: [
    { x: 0.0, y: 0.5, z: -1.8, h: PI * 0.9, pose: 'stand' },
    { x: -0.7, y: 1.25, z: 0.4, h: PI * 1.2, pose: 'stand' },          // on the barrel
    { x: 0.65, y: 1.25, z: 0.9, h: PI * 0.7, pose: 'preen' },          // on the other barrel
    { x: 0.55, y: 1.25, z: -1.8, h: PI * 0.8, pose: 'stand' },         // on the crate
    { x: 0.8, y: 0.5, z: -0.2, h: PI * 0.5, pose: 'walk' },
  ],
};

export class Companion {
  constructor(ship, kind = 'cat', seed = 1) {
    this.ship = ship; this.kind = kind;
    this.m = kind === 'gull' ? buildGull() : buildCat();
    this.m.g.scale.setScalar(kind === 'gull' ? 1.1 : 1.2);
    ship.root.add(this.m.g);
    this.spots = SPOTS[kind]; this.i = 0; this.t = 0; this.wait = 6; this.pose = this.spots[0].pose;
    this.pos = new THREE.Vector3(this.spots[0].x, this.spots[0].y, this.spots[0].z); this.h = this.spots[0].h;
    this.target = this.spots[0]; this.away = 0; this.fly = 0; this.rs = seed;
    this.apply(0);
  }
  rnd() { this.rs = (this.rs * 16807) % 2147483647; return this.rs / 2147483647; }
  /** set the pose directly (concept shots) */
  setPose(pose, x, y, z, h) { this.pose = pose; this.pos.set(x, y, z); this.h = h; this.target = null; this.wait = 1e9; this.apply(0); }
  update(dt) {
    this.t += dt;
    const g = this.m.g;
    if (this.fly > 0) { this.updateFlight(dt); return; }
    if (this.target) {
      const d = new THREE.Vector3(this.target.x - this.pos.x, 0, this.target.z - this.pos.z), dist = d.length();
      if (dist > 0.05 || Math.abs(this.target.y - this.pos.y) > 0.05) {
        this.pose = 'walk';
        const sp = (this.kind === 'cat' ? 0.55 : 0.4) * dt;
        if (dist > 0.01) { const want = Math.atan2(d.x, d.z); let dh = want - this.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); this.h += dh * Math.min(1, dt * 6); }
        const step = Math.min(dist, sp); if (dist > 0.001) { this.pos.x += d.x / dist * step; this.pos.z += d.z / dist * step; }
        this.pos.y += (this.target.y - this.pos.y) * Math.min(1, dt * 4) + (dist < 0.3 ? 0 : 0);
      } else { this.pose = this.target.pose; this.h += (this.target.h - this.h) * Math.min(1, dt * 2); this.target = null; this.wait = 10 + this.rnd() * 25; }
    } else {
      this.wait -= dt;
      if (this.wait <= 0) {
        if (this.kind === 'gull' && this.rnd() < 0.3) { this.fly = 0.001; this.flyT = 0; this.flyDur = 40 + this.rnd() * 60; this.m.legs.forEach((l) => (l.rotation.x = 0)); return; }   // off to sea for a while
        this.i = (this.i + 1 + Math.floor(this.rnd() * (this.spots.length - 1))) % this.spots.length; this.target = this.spots[this.i];
      }
    }
    this.apply(dt);
  }
  updateFlight(dt) {   // the gull leaves in a wide arc and comes back later
    this.flyT += dt; const T = this.flyT, n = this.m;
    n.wings.forEach((w, k) => { w.visible = true; w.rotation.z = (k ? -1 : 1) * Math.sin(T * 14) * 0.7; });
    n.legs.forEach((l) => (l.visible = false));
    const out = T < 6, back = T > this.flyDur - 6;
    const r = out ? T / 6 : back ? (this.flyDur - T) / 6 : 1;
    this.m.g.position.set(this.pos.x, this.pos.y + 0.5 + r * 6, this.pos.z + Math.sin(T * 0.4) * r * 12 + (r > 0.99 ? 0 : 0));
    this.m.g.rotation.set(-0.2, this.h + T * 0.3, 0);
    if (T > this.flyDur) { n.wings.forEach((w) => (w.visible = false)); n.legs.forEach((l) => (l.visible = true)); this.fly = 0; this.wait = 12; this.pose = 'stand'; this.apply(0); }
  }
  apply(dt) {
    const m = this.m, g = m.g, p = this.pose, t = this.t;
    g.position.copy(this.pos); g.rotation.set(0, this.h, 0);
    const walk = p === 'walk';
    const sw = walk ? Math.sin(t * (m.kind === 'cat' ? 9 : 8)) : 0;
    m.legs.forEach((l, k) => { l.rotation.x = walk ? sw * 0.6 * (k % 2 ? -1 : 1) * (m.kind === 'cat' && k > 1 ? -1 : 1) : 0; });
    if (m.kind === 'cat') {
      const sit = p === 'sit', loaf = p === 'loaf';
      m.body.rotation.x = sit ? -0.95 : 0; m.body.position.y = sit ? 0.0 : loaf ? -0.08 : 0; m.body.position.z = sit ? -0.1 : 0;
      m.legs.forEach((l, k) => { l.visible = loaf ? false : sit ? k < 2 : true; });
      m.head.position.y = sit ? 0.46 : loaf ? 0.22 : 0.27; m.head.position.z = sit ? 0.12 : loaf ? 0.29 : 0.27;
      m.head.rotation.x = loaf ? 0.15 : sit ? -0.15 + Math.sin(t * 0.6) * 0.1 : 0; m.head.rotation.y = sit ? Math.sin(t * 0.4) * 0.5 : 0;
      m.tail.rotation.z = Math.sin(t * (sit ? 1.2 : 3)) * 0.35; m.tail.rotation.x = loaf ? 1.2 : sit ? 0.5 : 0; m.tail.position.y = sit ? 0.06 : 0.2; m.tail.position.z = sit ? -0.3 : -0.26;
    } else {
      const preen = p === 'preen';
      m.head.rotation.x = preen ? 0.9 + Math.sin(t * 5) * 0.2 : 0; m.head.rotation.y = preen ? 1.0 : walk ? 0 : Math.sin(t * 0.7) * 0.7;
      m.head.position.z = 0.14 + (walk ? Math.sin(t * 8) * 0.025 : 0);
    }
  }
}
