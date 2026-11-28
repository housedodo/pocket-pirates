// Small things on the open sea between the islands (2026-11-15, owner: "more character and variety", and "yes it should change"
// with the dread): floating weed, a drifting log with a seabird resting on it, a bloom of jellyfish just under the surface (faintly
// lit at night; the bells just break the surface). Sparse on purpose: about one in four stretches of open water (one in eight until 2026-11-28) (a cell of 110 units) holds one, never within 35 units
// of a shore, laid out again each day; nothing is solid and nothing can be picked up. Run by fauna.js, the sea's other life.
// As the dread rises they go quietly wrong, never explained:
//   weed:      drifts down the wind; from dread 0.5 it drifts up into it.
//   log, bird: the bird flies off when the ship comes close; from 0.4 it stays and turns its head to follow the ship;
//              from 0.75 there is no bird, and the log slowly swings round to point at the ship.
//   jellyfish: each pulses on its own; from 0.5 they pulse together and their night light turns cold; from 0.7 the bloom keeps
//              pace a little off the ship's side (never touching it, slower than the ship).
// Nothing shows while the Edge runs (the sea is cut off at its lip). The demo has no dread, so it only ever shows the first of each. `?sea=0` (seawater.js) turns them off.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats, psxMaterial } from './psx.js';
import { waveHeight } from './ocean.js';
import { hash2, mulberry32, smoothstep } from './util.js';
import { SEA_ON } from './seawater.js';
import { rt } from './core/runtime.js';

const CELL = 110, RANGE = 280, CHANCE = 0.25;
const MIX = {   // what floats where (the region round the ship); the rest of the sea: home
  home: [0.4, 0.35, 0.25], crown: [0.3, 0.5, 0.2], free: [0.55, 0.15, 0.3], reef: [0.5, 0.3, 0.2], lantern: [0.2, 0.3, 0.5], drowned: [0.2, 0.6, 0.2],
};
const KINDS = ['weed', 'log', 'jelly'];

function weedGeo() {
  const b = new Builder(); b.doubleSided = true;
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4, r = i ? 1.2 + (i % 3) * 0.7 : 0;
    b.blob(Math.cos(a) * r, 0.02, Math.sin(a) * r * 1.4, 1.1 + (i % 2) * 0.5, 0.08, 0.8 + (i % 3) * 0.3, i % 2 ? '#b08a30' : '#8a6a20', TILE.white, 0.3, i);
  }
  for (let i = 0; i < 6; i++) b.box(Math.cos(i * 1.7) * 1.6, 0.06, Math.sin(i * 1.7) * 2.0, 0.22, 0.14, 0.22, '#d0a840', TILE.white);   // the floats
  return b.geometry();
}
function logGeo() {
  const b = new Builder();
  b.push(0, 0, 0, 0, 1, 1, 1, Math.PI / 2); b.cyl(0, -2.2, 0, 0.42, 0.34, 4.4, 6, '#7a5a3a', TILE.bark, true); b.pop();
  b.push(0.9, 0.1, 0.2, 0.7, 1, 1, 1, 0, -1.1); b.cyl(0, 0, 0, 0.12, 0.06, 1.2, 4, '#6a4a2e', TILE.bark, false); b.pop();   // a broken branch
  return b.geometry();
}
function birdGeo() {   // a booby at rest: white body, dark wings folded, yellow bill
  const b = new Builder();
  b.blob(0, 0.32, 0, 0.26, 0.24, 0.42, '#f2f0ea', TILE.white, 0.05, 1);
  for (const s of [-1, 1]) b.box(s * 0.2, 0.18, -0.06, 0.08, 0.26, 0.6, '#4a3e36', TILE.white);
  b.blob(0, 0.6, 0.28, 0.15, 0.15, 0.16, '#f2f0ea', TILE.white, 0.05, 2);
  b.box(0, 0.54, 0.46, 0.06, 0.07, 0.22, '#e0b030', TILE.white);
  b.box(0, 0.2, -0.46, 0.14, 0.05, 0.22, '#3a302a', TILE.white);
  return b.geometry();
}
const JELLY = [[0, 0], [2.4, 1.1], [-2.0, 1.8], [1.2, -2.3], [-1.6, -1.4], [3.4, -1.0], [-3.2, 0.2]];
function jellyGeo() {
  const b = new Builder(); b.doubleSided = true;
  b.blob(0, 0, 0, 0.62, 0.36, 0.62, '#f0b8d0', TILE.white, 0.08, 1);
  for (let k = 0; k < 4; k++) b.box(Math.cos(k * 1.57) * 0.3, -0.55, Math.sin(k * 1.57) * 0.3, 0.06, 0.6, 0.06, '#e8a0c0', TILE.white);
  return b.geometry();
}
function jellyLightGeo(col) {
  const b = new Builder(); b.doubleSided = true; b.grime = 0; b.ambient = 1;
  b.box(0, 0.1, 0, 0.9, 0.3, 0.9, col, TILE.white);   // a faint cap of light over the bell
  return b.geometry();
}

export class SeaLife {
  constructor(scene, world) {
    this.scene = scene; this.world = world; this.items = new Map(); this.scanT = 0; this.t = 0;
    if (!SEA_ON) return;
    this.geo = { weed: weedGeo(), log: logGeo(), bird: birdGeo(), jelly: jellyGeo(), warm: jellyLightGeo('#b05a88'), cold: jellyLightGeo('#6a7890') };
    this.glowMat = psxMaterial({ color: 0xffffff, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, key: 'Jg' });
  }

  build(kind) {
    const g = new THREE.Group(), o = { g, kind };
    if (kind === 'weed') g.add(new THREE.Mesh(this.geo.weed, mats.props));
    else if (kind === 'log') { o.log = new THREE.Mesh(this.geo.log, mats.props); o.bird = new THREE.Mesh(this.geo.bird, mats.props); o.bird.position.set(-0.4, 0.3, 0); o.bird.rotation.order = 'YXZ'; g.add(o.log, o.bird); }
    else {
      o.jel = JELLY.map(([x, z]) => {
        const m = new THREE.Mesh(this.geo.jelly, mats.props); m.scale.setScalar(1.4); const w = new THREE.Mesh(this.geo.warm, this.glowMat), c = new THREE.Mesh(this.geo.cold, this.glowMat);
        m.position.set(x, -0.18, z); w.scale.setScalar(1.4); c.scale.setScalar(1.4); w.position.copy(m.position); c.position.copy(m.position); g.add(m, w, c);   // the bell just breaks the surface (the water is opaque)
        return { m, w, c, x, z, ph: (x * 3.1 + z * 1.7) % 6.28 };
      });
    }
    g.traverse((m) => { m.frustumCulled = true; });
    this.scene.add(g);
    return o;
  }

  /** is this spot open water, well clear of any shore? */
  clear(x, z) {
    const cx = Math.round(x / CELL), cz = Math.round(z / CELL);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const d = this.world.desc(cx + dx, cz + dz);
      if (d && Math.hypot(d.x - x, d.z - z) < d.r * 1.6 + 35) return false;
    }
    return true;
  }

  scan(ctx) {
    const { ship } = ctx, day = (ctx.sched && ctx.sched.dayN) || 0, seed = this.world.seed || 1;
    const mix = MIX[ctx.faction] || MIX.home, want = new Set();
    const c0x = Math.round(ship.pos.x / CELL), c0z = Math.round(ship.pos.z / CELL), n = Math.ceil(RANGE / CELL);
    for (let cz = c0z - n; cz <= c0z + n; cz++) for (let cx = c0x - n; cx <= c0x + n; cx++) {
      const key = `${cx},${cz}`, rng = mulberry32(hash2(cx, cz, seed + 7777 + day * 131));
      if (rng() > CHANCE) continue;
      const x = cx * CELL + (rng() - 0.5) * CELL * 0.8, z = cz * CELL + (rng() - 0.5) * CELL * 0.8;
      if (Math.hypot(x - ship.pos.x, z - ship.pos.z) > RANGE) continue;
      if (!this.items.has(key)) {
        if (!this.clear(x, z)) continue;
        const r = rng(), kind = r < mix[0] ? KINDS[0] : r < mix[0] + mix[1] ? KINDS[1] : KINDS[2];
        const o = this.build(kind); Object.assign(o, { x0: x, z0: z, x, z, t0: this.t, yaw: rng() * 6.28, gone: false, fly: 0 });
        this.items.set(key, o);
      }
      want.add(key);
    }
    for (const [k, o] of this.items) if (!want.has(k)) { this.scene.remove(o.g); this.items.delete(k); }
  }

  update(dt, t, ctx) {
    if (!SEA_ON || !this.geo) return;
    this.t += dt; this.scanT -= dt;
    if (this.scanT <= 0) { this.scanT = 1; this.scan(ctx); }
    const { ship, dread, wave } = ctx, sx = ship.pos.x, sz = ship.pos.z;
    const wd = ctx.wind ? ctx.wind.dir : 0, wx = Math.sin(wd), wz = -Math.cos(wd), night = ctx.tod ? ctx.tod.night : 0;
    const hide = !!rt.edge;   // the Edge cuts the sea off at its lip: nothing may float over the drop
    for (const o of this.items.values()) {
      o.g.visible = !hide;
      const toShip = Math.atan2(sx - o.x, sz - o.z), dShip = Math.hypot(sx - o.x, sz - o.z);
      if (dShip < 30 && !o.spotted && !hide) { o.spotted = true; if (rt.seaSpot) rt.seaSpot(o.kind === 'log' ? (o.gone || dread >= 0.75 ? 'log' : 'logbird') : o.kind, dread); }   // the Ship's book sketches it (systems/sealog.js)
      if (o.kind === 'weed') {
        const dir = dread >= 0.5 ? -1 : 1;   // from dread 0.5 it drifts up into the wind
        o.x += wx * 0.35 * dir * dt; o.z += wz * 0.35 * dir * dt;
        o.yaw += 0.02 * dt;
      } else if (o.kind === 'log') {
        o.x += wx * 0.2 * dt; o.z += wz * 0.2 * dt;
        const eerie = dread >= 0.75, watch = dread >= 0.4 && !eerie;
        if (eerie) o.yaw += Math.atan2(Math.sin(toShip - Math.PI / 2 - o.yaw), Math.cos(toShip - Math.PI / 2 - o.yaw)) * Math.min(1, dt * 0.15);   // the log swings round to point at the ship
        o.bird.visible = !eerie && !o.gone;
        if (o.bird.visible) {
          if (!watch && dShip < 24 && !o.fly) o.fly = 0.001;   // up and away
          if (o.fly) { o.fly += dt; o.bird.position.set(-0.4 - o.fly * 3, 0.3 + o.fly * 2.2, o.fly * 1.5); if (o.fly > 3) o.gone = true; }
          o.bird.rotation.y = watch ? toShip - o.yaw : 0.6;   // turns its head (and body) to follow the ship
        }
      } else {
        const sync = dread >= 0.5, follow = dread >= 0.7 && dShip < 120;
        if (follow) {   // keep pace a little off the ship's side, slower than the ship
          const side = ship.heading + Math.PI / 2, tx = sx + Math.sin(side) * 16, tz = sz - Math.cos(side) * 16, dd = Math.hypot(tx - o.x, tz - o.z);
          if (dd > 1) { const v = Math.min(dd, 2.2 * dt); o.x += ((tx - o.x) / dd) * v; o.z += ((tz - o.z) / dd) * v; }
        } else { o.x += wx * 0.1 * dt; o.z += wz * 0.1 * dt; }
        const lit = night > 0.4;
        for (const j of o.jel) {
          const p = sync ? t * 1.6 : t * 1.6 + j.ph, s = 1 + 0.18 * Math.sin(p);
          j.m.scale.set(1.4 / Math.sqrt(s), 1.4 * s, 1.4 / Math.sqrt(s));
          j.w.visible = lit && !sync; j.c.visible = lit && sync;
        }
      }
      const gy = waveHeight(o.x, o.z, t, wave);
      o.g.position.set(o.x, gy + (o.kind === 'log' ? 0.1 : 0), o.z);
      o.g.rotation.y = o.yaw;
      if (o.jel) {   // each bell rides its own bit of the swell, just breaking the surface (the water is opaque)
        const cs = Math.cos(o.yaw), sn = Math.sin(o.yaw);
        for (const j of o.jel) { const wx2 = o.x + j.x * cs + j.z * sn, wz2 = o.z - j.x * sn + j.z * cs, y = waveHeight(wx2, wz2, t, wave) - gy - 0.12; j.m.position.y = y; j.w.position.y = y; j.c.position.y = y; }
      }
    }
  }
}
