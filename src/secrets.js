// Things the world hints at without anyone saying so. All rare, all irregular, all tied together so they feel like one sea:
//  - THE KESTREL: two white daymarks (a pole on a rock, as pilots used) stand out at sea. From one spot only, each one sits exactly
//    in front of a landmark: the near post on the Grey Tooth, the far post on the Drowned Bell's tower. Where both line up the
//    Kestrel lies on the bottom. The lines come from the world: a scratch on the Tooth's cairn lid, and two harbour tales that
//    disagree on everything (calm noon or black squall) except the one line each of them saw.
//  - LOW-TIDE WRECKS: off a few islands a wreck's ribs and mast come up out of the water at low tide, and only then.
//  - SMOKE: a few lonely islands have someone on them. Some days a thin column of smoke rises, most days nothing.
//  - THE WATCHER: in some harbours, at dusk, one person stands at the water's edge, always at the same place, looking out
//    toward one of these secrets.
//  - BIRDS: at dusk a few gulls in open water fly home toward the nearest land; at dawn they fly out from it.
// main.js asks near() for something to interact with and visit() for what happens; nothing here shows text by itself.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';
import { waveHeight } from './ocean.js';
import { villager, terrainHeight, shoreR, CELL } from './world.js';
import { hash2, mulberry32, clamp, smoothstep } from './util.js';
import { LM } from './landmarks.js';

const h01 = (a, b, s) => (Math.abs(hash2(a, b, s)) % 10000) / 10000;

// ---- the tales: told now and then on the pier, once each (state.story.tales). They disagree, except for the line each saw.
export const TALES = {
  calm: { harbour: '0,-1', speaker: 'oldsalt', text: 'The Kestrel? Went down on a still, bright noon. My grandmother watched from the cliff. The white post stood right on the Grey Tooth, she said, and the sea just opened.', note: 'A tale at Tama: the Kestrel sank on a calm noon. "The white post stood right on the Grey Tooth."' },
  squall: { harbour: '-2,-1', speaker: 'fisher', text: 'Kestrel went down in a black squall, middle of the night. Nobody saw. Only old Juno, and she swears the white post was dead on the Drowned Bell\'s tower when the lantern went under.', note: 'A tale at Velto: the Kestrel sank in a night squall. "The white post was dead on the Drowned Bell\'s tower."' },
  never: { harbour: null, speaker: 'docker', text: 'The Kestrel? There was never any Kestrel. Ships don\'t sink in sight of two white posts.', note: null },
};

function daymark(b, h) {   // a pilot's mark: a black rock, a tarred pole, a white-painted top with a black band
  b.blob(0, -0.4, 0, 2.6, 1.3, 2.2, '#3a3a40', TILE.stone, 0.3, h);
  b.blob(0, 0.2, 0, 1.3, 0.25, 1.3, '#f2f6f6', TILE.white, 0.3, h + 3);   // surf at its foot
  b.cyl(0, 0.3, 0, 0.36, 0.26, 11, 6, '#2a2420', TILE.bark, false);
  b.cyl(0, 8.8, 0, 0.78, 0.6, 2.6, 6, '#f4f2ea', TILE.white, true);     // white top, seen from far
  b.cyl(0, 9.7, 0, 0.82, 0.78, 0.5, 6, '#1a1a1e', TILE.white, false);
}

export class Secrets {
  constructor(scene, world, seed) {
    this.scene = scene; this.world = world; this.seed = seed;
    this.tideW = new Map(); this.camps = new Map(); this.watchers = new Map();
    this.kestrel = this.placeKestrel();
    // the daymarks and the sunken shape
    const K = this.kestrel;
    for (const m of [K.m1, K.m2]) { const b = new Builder(); daymark(b, m.x | 0); const mesh = new THREE.Mesh(b.geometry(), mats.props); mesh.position.set(m.x, 0, m.z); scene.add(mesh); m.mesh = mesh; }
    const wb = new Builder();   // a hull outline lying on the bottom: seen as a dark shape through the water when you are right over it
    wb.blob(0, 0, 0, 2.2, 0.05, 6, '#000000', TILE.white, 0.25, 7); wb.blob(0, 0, -4.5, 1.2, 0.05, 2, '#000000', TILE.white, 0.25, 8);
    this.shadowMat = new THREE.MeshBasicMaterial({ color: 0x041018, transparent: true, opacity: 0, depthWrite: false });
    this.wreckShade = new THREE.Mesh(wb.geometry(), this.shadowMat); this.wreckShade.rotation.y = 0.6; this.wreckShade.renderOrder = 2;
    scene.add(this.wreckShade);
    this.bub = [];   // a few bubbles now and then
    const bg = new Builder(); bg.blob(0, 0, 0, 0.25, 0.25, 0.25, '#e8f4f8', TILE.white, 0.1, 1); const bgeo = bg.geometry();
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(bgeo, mats.props); m.visible = false; scene.add(m); this.bub.push({ m, life: 0 }); }
    // birds: a small reusable flock
    this.flock = null; this.flockT = 20; this.birdGeo = this.makeBird();
    this.birds = Array.from({ length: 6 }, () => { const g = new THREE.Group(); const body = new THREE.Mesh(this.birdGeo.body, mats.props); const wl = new THREE.Mesh(this.birdGeo.wing, mats.props), wr = new THREE.Mesh(this.birdGeo.wing, mats.props); wr.scale.x = -1; g.add(body, wl, wr); g.visible = false; scene.add(g); return { g, wl, wr }; });
    // smoke: one column of soft puffs, moved to whichever camp is smoking
    this.smoke = Array.from({ length: 14 }, (_, i) => { const b = new Builder(); b.blob(0, 0, 0, 1, 1, 1, '#c8c4c0', TILE.white, 0.3, i); const m = new THREE.Mesh(b.geometry(), new THREE.MeshBasicMaterial({ color: 0xbfbab4, transparent: true, opacity: 0.6, depthWrite: false })); m.visible = false; scene.add(m); return { m, age: i / 14 }; });
  }

  /** the Kestrel lies in clear water ~200 from both the Grey Tooth and the Drowned Bell; each post stands 55 toward its landmark */
  placeKestrel() {
    const T = LM.crag, B = LM.bell, w = this.world;
    const clearOf = (x, z, need) => { const cx = Math.round(x / CELL), cz = Math.round(z / CELL); for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const d = w.desc(cx + dx, cz + dz); if (d && Math.hypot(d.x - x, d.z - z) - d.r * 1.4 < need) return false; } return true; };
    let best = null;
    for (let r = 0; r <= 90 && !best; r += 10) for (let a = 0; a < 6.28 && !best; a += 0.5) {
      const x = 100 + Math.cos(a) * r, z = 120 + Math.sin(a) * r;
      const u1 = [T.x - x, T.z - z], u2 = [B.x - x, B.z - z], l1 = Math.hypot(...u1), l2 = Math.hypot(...u2);
      const m1 = { x: x + u1[0] / l1 * 55, z: z + u1[1] / l1 * 55 }, m2 = { x: x + u2[0] / l2 * 55, z: z + u2[1] / l2 * 55 };
      if (clearOf(x, z, 45) && clearOf(m1.x, m1.z, 20) && clearOf(m2.x, m2.z, 20)) best = { x, z, m1, m2 };
    }
    return best || { x: 100, z: 120, m1: { x: 150, z: 100 }, m2: { x: 85, z: 172 } };
  }

  makeBird() {
    const body = new Builder(); body.blob(0, 0, 0, 0.18, 0.16, 0.5, '#f4f2ee', TILE.white, 0.05, 1); body.blob(0, 0.05, -0.45, 0.1, 0.1, 0.12, '#f4f2ee', TILE.white, 0.05, 2);
    const wing = new Builder(); wing.doubleSided = true; wing.tri([0, 0, -0.15], [1.1, 0.05, 0.1], [0, 0, 0.25], '#e8e6e2', TILE.white); wing.tri([0.7, 0.02, -0.02], [1.1, 0.05, 0.1], [1.25, 0.04, 0.2], '#3a3a3e', TILE.white);
    return { body: body.geometry(), wing: wing.geometry() };
  }

  /** the island secrets: rolled per island (low-tide wreck ~7%, a hermit's camp ~5% of lonely isles), never on hand-made places */
  roll(d) {
    if (d.cache) return d.cache;
    const far = Math.hypot(d.x, d.z) > 260, c = {};
    if (!d.lm && !d.hut && d.type !== 'harbour' && far && h01(Math.round(d.x), Math.round(d.z), 8181) < 0.07) c.tide = { th: h01(d.seed, 1, 8182) * 6.283 };
    if (!d.lm && !d.hut && (d.type === 'jungle' || d.type === 'rocky') && far && !c.tide && h01(Math.round(d.x), Math.round(d.z), 9191) < 0.055) c.camp = { th: h01(d.seed, 2, 9192) * 6.283 };
    if (d.type === 'harbour' && d.id !== '0,-1' && h01(Math.round(d.x), Math.round(d.z), 7171) < 0.4) c.watch = true;
    if (d.id === '0,-1') c.watch = true;   // home always has one, so the habit can be learned where it is safe
    d.cache = c; return c;
  }
  smoking(d, dayN) { return h01(dayN, Math.round(d.x), 9393) < 0.35; }   // about one day in three, never on a pattern

  update(dt, t, c) {   // c: { ship, tod, time, dayN, tide, wave, light, dread, collected }
    const { ship } = c, lowK = smoothstep(-0.25, -0.62, c.tide);
    // ---- the Kestrel: a dark shape on the bottom only when you are right over it, and a few bubbles
    const K = this.kestrel, dk = Math.hypot(ship.pos.x - K.x, ship.pos.z - K.z), got = c.collected.has('kestrel');
    this.wreckShade.position.set(K.x, waveHeight(K.x, K.z, t, c.wave) + 0.08, K.z);
    this.shadowMat.opacity = got ? 0 : (1 - smoothstep(10, 34, dk)) * 0.42 * c.light;
    for (const q of this.bub) {
      if (q.life <= 0 && !got && dk < 60 && Math.random() < dt * 0.35) { q.life = 2.2; q.x = K.x + (Math.random() - 0.5) * 6; q.z = K.z + (Math.random() - 0.5) * 8; }
      if (q.life > 0) { q.life -= dt; q.m.visible = true; q.m.position.set(q.x, waveHeight(q.x, q.z, t, c.wave) + 0.1, q.z); q.m.scale.setScalar(Math.max(0.01, Math.sin((q.life / 2.2) * Math.PI))); } else q.m.visible = false;
    }
    // ---- island secrets for the islands that are loaded
    const seen = new Set();
    let smokeAt = null;
    for (const isl of this.world.islands.values()) {
      const d = isl.desc, s = this.roll(d); if (!s.tide && !s.camp && !s.watch) continue;
      seen.add(d.id);
      if (s.tide) {
        let m = this.tideW.get(d.id);
        if (!m) { m = this.buildTideWreck(d, s.tide.th); this.tideW.set(d.id, m); }
        const taken = c.collected.has('tide:' + d.id);
        m.mesh.position.y = -3.6 + 3.5 * (taken ? Math.min(lowK, 0.4) : lowK);   // it comes up as the water goes out
        m.mesh.visible = m.mesh.position.y > -3.4;
        m.low = lowK > 0.75 && !taken;
      }
      if (s.camp) {
        let m = this.camps.get(d.id);
        if (!m) { m = this.buildCamp(d, s.camp.th); this.camps.set(d.id, m); }
        m.on = this.smoking(d, c.dayN);
        m.fire.visible = m.on;
        if (m.on && (!smokeAt || Math.hypot(m.x - ship.pos.x, m.z - ship.pos.z) < Math.hypot(smokeAt.x - ship.pos.x, smokeAt.z - ship.pos.z))) smokeAt = m;
      }
      if (s.watch) {
        let w = this.watchers.get(d.id);
        if (!w) { w = this.buildWatcher(d); this.watchers.set(d.id, w); }
        const h = c.time * 24;
        w.mesh.visible = h > 17.6 && h < 19.6 && c.dread < 0.6;   // at dusk only, and not once the sea has gone wrong
      }
    }
    for (const [map, key] of [[this.tideW, 'mesh'], [this.camps, 'group'], [this.watchers, 'mesh']]) for (const [id, m] of map) if (!seen.has(id)) { this.scene.remove(m[key]); map.delete(id); }
    // ---- the smoke column over the nearest smoking camp, leaning with the wind
    for (const p of this.smoke) {
      if (!smokeAt) { p.m.visible = false; continue; }
      p.age = (p.age + dt * 0.07) % 1;
      const a = p.age, rise = a * 34, lean = a * a * 10;
      p.m.visible = true;
      p.m.position.set(smokeAt.x + c.windX * lean + Math.sin(t * 0.7 + a * 9) * 0.6, smokeAt.y + 1 + rise, smokeAt.z + c.windZ * lean);
      p.m.scale.setScalar(0.5 + a * 2.6);
      p.m.material.opacity = 0.55 * Math.sin(Math.min(1, a * 1.15) * Math.PI) * (0.4 + 0.6 * c.light);
    }
    this.updateBirds(dt, t, c);
  }

  buildTideWreck(d, th) {
    const R = shoreR(d, th) * 1.18, x = d.x + Math.cos(th) * R, z = d.z + Math.sin(th) * R;
    const b = new Builder();
    b.push(0, 0, 0, th + 1.2, 1, 1, 1, 0, 0.18);
    b.box(0, 0.1, 0, 0.4, 0.3, 7, '#3a2a20', TILE.planks);
    for (let k = 0; k < 6; k++) for (const s of [-1, 1]) { b.push(s * 0.3, 0.1, -3 + k * 1.2, 0, 1, 1, 1, 0, s * -0.45); b.cyl(0, 0, 0, 0.15, 0.08, 2.4 + Math.sin(k) * 0.6, 4, '#4a3828', TILE.bark, false); b.pop(); }
    b.push(0, 0, 1.2, 0, 1, 1, 1, 0.35, 0); b.cyl(0, 0, 0, 0.25, 0.18, 6, 5, '#5a4030', TILE.bark, false); b.pop();
    b.pop();
    b.blob(0, 0.3, 0, 3.5, 0.15, 4.5, '#cbb488', TILE.white, 0.4, 3);   // a patch of sand that only shows at low water
    const mesh = new THREE.Mesh(b.geometry(), mats.props); mesh.position.set(x, -3.6, z); mesh.visible = false; this.scene.add(mesh);
    return { mesh, x, z, d };
  }
  buildCamp(d, th) {
    const r = shoreR(d, th) * 0.5, lx = Math.cos(th) * r, lz = Math.sin(th) * r, y = terrainHeight(d, lx, lz), x = d.x + lx, z = d.z + lz;
    const b = new Builder();
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; b.blob(Math.cos(a) * 0.7, 0.1, Math.sin(a) * 0.7, 0.25, 0.18, 0.25, '#5a5a5c', TILE.stone, 0.2, k); }   // fire ring
    b.push(1.8, 0, -0.6, th); b.box(0, 0, 0, 0.12, 1.6, 0.12, '#5a4030', TILE.bark); b.box(1.6, 0, 0, 0.12, 1.6, 0.12, '#5a4030', TILE.bark);
    b.push(0.8, 1.5, 0.6, 0, 1, 1, 1, -0.7, 0); b.box(0, 0, 0, 2, 0.08, 1.6, '#8a7a4a', TILE.rope); b.pop(); b.pop();   // a lean-to of thatch
    const group = new THREE.Group(); group.add(new THREE.Mesh(b.geometry(), mats.props));
    const fb = new Builder(); fb.blob(0, 0.25, 0, 0.35, 0.35, 0.35, '#ffffff', TILE.glow, 0.2, 4); const fire = new THREE.Mesh(fb.geometry(), mats.props);
    group.add(fire); group.position.set(x, y, z); this.scene.add(group);
    return { group, fire, x, y, z, d, on: false };
  }
  /** a figure at the water's edge on the side nearest the secret it watches */
  buildWatcher(d) {
    const tg = this.watchTarget(d), th = Math.atan2(tg.z - d.z, tg.x - d.x), R = shoreR(d, th) * 0.94, lx = Math.cos(th) * R, lz = Math.sin(th) * R;
    const b = new Builder(); villager(b, 0, 0, 0, -th + Math.PI / 2, mulberry32(d.seed + 5), 'oldsalt');
    const mesh = new THREE.Mesh(b.geometry(), mats.props); mesh.position.set(d.x + lx, Math.max(0.3, terrainHeight(d, lx, lz)), d.z + lz); mesh.visible = false; this.scene.add(mesh);
    return { mesh, tg };
  }
  /** what a harbour's watcher looks toward: the nearest smoke island or low-tide wreck within reach, else the Kestrel */
  watchTarget(d) {
    let best = { x: this.kestrel.x, z: this.kestrel.z }, bd = 900;
    const cx = Math.round(d.x / CELL), cz = Math.round(d.z / CELL);
    for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) {
      const o = this.world.desc(cx + dx, cz + dz); if (!o) continue; const s = this.roll(o);
      if (!s.tide && !s.camp) continue;
      const dd = Math.hypot(o.x - d.x, o.z - d.z); if (dd < bd) { bd = dd; best = { x: o.x, z: o.z }; }
    }
    if (d.id === '0,-1') best = { x: this.kestrel.x, z: this.kestrel.z };   // Tama's watcher looks toward the Kestrel
    return best;
  }

  updateBirds(dt, t, c) {
    const { ship } = c, h = c.time * 24;
    const dusk = h > 17.3 && h < 19.6, dawn = h > 5.6 && h < 7.8;
    if (!this.flock) {
      this.flockT -= dt;
      if (this.flockT <= 0) {
        this.flockT = 35 + Math.random() * 70;
        const near = this.world.nearest(ship.pos.x, ship.pos.z, 2000), edge = this.world.lastEdge;
        if ((dusk || dawn) && near && edge > 120 && edge < 650 && Math.random() < 0.7) {
          const d = near.desc, toLand = Math.atan2(d.x - ship.pos.x, -(d.z - ship.pos.z));
          let dir = dusk ? toLand : toLand + Math.PI;            // home at dusk, out to the fish at dawn
          if (c.dread > 0.55) dir += Math.PI;                    // further out, they fly the wrong way
          dir += (Math.random() - 0.5) * 0.15;
          const side = (Math.random() < 0.5 ? -1 : 1) * (25 + Math.random() * 25), back = 45;
          const sx = ship.pos.x - Math.sin(dir) * back + Math.cos(dir) * side, sz = ship.pos.z + Math.cos(dir) * back + Math.sin(dir) * side;
          this.flock = { x: sx, z: sz, dir, life: 26, n: 4 + Math.floor(Math.random() * 3) };
        }
      }
    }
    const F = this.flock;
    this.birds.forEach((b, i) => {
      if (!F || i >= F.n) { b.g.visible = false; return; }
      const row = Math.ceil(i / 2), sd = i === 0 ? 0 : i % 2 ? -1 : 1;   // a loose V
      const bx = F.x - Math.sin(F.dir) * row * 2.2 + Math.cos(F.dir) * sd * row * 1.8, bz = F.z + Math.cos(F.dir) * row * 2.2 + Math.sin(F.dir) * sd * row * 1.8;
      b.g.visible = true; b.g.position.set(bx, 16 + Math.sin(t * 0.8 + i) * 0.6, bz); b.g.rotation.set(0, -F.dir, 0);
      const flap = Math.sin(t * 7 + i * 1.3) * 0.5; b.wl.rotation.z = flap; b.wr.rotation.z = -flap;
      b.g.scale.setScalar(1.3);
    });
    if (F) { F.x += Math.sin(F.dir) * 11 * dt; F.z -= Math.cos(F.dir) * 11 * dt; F.life -= dt; if (F.life <= 0) this.flock = null; }
  }

  /** the daymark rocks are solid */
  solids(out) { for (const m of [this.kestrel.m1, this.kestrel.m2]) out.push({ x: m.x, z: m.z, r: 2.6 }); }

  /** something to interact with here: the Kestrel (stopped over it), a wreck uncovered by the tide, a smoking camp */
  near(x, z, collected) {
    const K = this.kestrel;
    if (!collected.has('kestrel') && Math.hypot(x - K.x, z - K.z) < 14) return { kind: 'kestrel', key: 'kestrel', label: 'Send someone down to the dark shape below' };
    for (const [id, m] of this.tideW) if (m.low && Math.hypot(x - m.x, z - m.z) < 16) return { kind: 'tidewreck', key: 'tide:' + id, label: 'Salvage what the tide uncovered', m };
    for (const [id, m] of this.camps) if (m.on) { const d = m.d; if (Math.hypot(x - d.x, z - d.z) - d.r < 18) return { kind: 'camp', key: 'camp:' + id, label: 'Go ashore by the smoke', m }; }
    return null;
  }
}
