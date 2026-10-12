import * as THREE from 'three';
import { shipGeos } from './ship.js';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats, psxMaterial, getAtlas } from './psx.js';
import { waveHeight } from './ocean.js';
import { angleDiff, lerp, clamp, hash2 } from './util.js';
import { sectorAt, FACTIONS } from './sectors.js';

// Other vessels on the sea. A handful of different designs, each sailing under the colours of
// the sector it spawned in. Cheerful at first, drifting derelicts at mid dread, pale ghost ships at the end.
// Few on purpose: the sea should feel big, and every sail you see is worth a look.
export const KINDS = {
  fisher:   { label: 'fishing boat',    scale: 0.75, speed: [4, 6],     hull: [1, 1, 1],         masts: [{ z: null, s: 0.95 }], jib: true },
  merchant: { label: 'merchant brig',   scale: 1.1,  speed: [5, 6.5],   hull: [1.05, 1.05, 1.2], masts: [{ z: null, s: 1.1 }], jib: true },
  schooner: { label: 'schooner',        scale: 0.95, speed: [7, 9],     hull: [0.82, 0.9, 1.5],  masts: [{ z: null, s: 0.85 }, { z: 1.8, s: 0.75, extra: true }], jib: true },
  galleon:  { label: 'galleon',         scale: 1.3,  speed: [3.5, 5],   hull: [1.35, 1.3, 1.5],  masts: [{ z: null, s: 1.2 }, { z: 1.9, s: 0.95, extra: true }, { z: -2.7, s: 0.8, extra: true }], jib: false, castle: true },
  canoe:    { label: 'outrigger canoe', scale: 0.8,  speed: [2.8, 4],   hull: [1, 1, 1],         masts: [], jib: false, canoe: true },
};

const HP = { fisher: 30, merchant: 55, schooner: 50, galleon: 95, canoe: 20 };
const armed = (s, hostile) => Object.assign(s, { hostile, hp: HP[s.kind], maxHp: HP[s.kind], engaged: false, fireCd: 2 + Math.random() * 2, circle: Math.random() < 0.5 ? -1 : 1, sinking: false, sinkT: 0 });

// ---- every harbour has a fishing boat with a routine: out at dawn, back at dusk. Some days it does not go out;
// in wrong water, now and then it stays out all night and is back before dawn with nobody aboard.
export function boatStatus(d, dayN, dread, seed) {
  const kind = (n) => { const v = hash2(Math.round(d.x), Math.round(d.z), seed + n * 977) % 11; return v === 0 ? 'stayed' : dread >= 0.4 && v === 5 ? 'lost' : 'normal'; };
  return { today: kind(dayN), yesterday: kind(dayN - 1) };
}
let flagGeo = null;
function getFlagGeo() {
  if (flagGeo) return flagGeo;
  const b = new Builder(); b.doubleSided = true;
  b.tri([0, 0.5, 0], [0, 0, 0], [0, 0.25, 1.5], '#ffffff', TILE.flag, [[0, 1], [0, 0], [1, 0.5]]);
  return (flagGeo = b.geometry());
}

export class Traffic {
  constructor(scene, world, seed) {
    this.scene = scene; this.world = world; this.seed = seed;
    this.ships = [];
    this.timer = 8;
    this.nextId = 1;
    this.tmp = new THREE.Vector3();
    const atlas = getAtlas();
    this.hullMats = {}; this.sailMats = {}; this.flagMats = {};
    for (const f of Object.values(FACTIONS)) {
      const hm = psxMaterial({ map: atlas, vertexColors: true, dark: true, alphaTest: 0.5, side: THREE.DoubleSide });
      hm.color.setRGB(1, 1, 1).lerp(new THREE.Color(...f.tint), 0.3);
      const sm = psxMaterial({ map: atlas, vertexColors: true, dark: true, side: THREE.DoubleSide, key: 'S' });
      sm.color.setRGB(...f.tint);
      const fm = psxMaterial({ map: atlas, vertexColors: true, dark: true, side: THREE.DoubleSide, key: 'S' });
      fm.color.set(f.color);
      this.hullMats[f.id] = hm; this.sailMats[f.id] = sm; this.flagMats[f.id] = fm;
    }
    const ghost = { map: atlas, vertexColors: true, dark: true, side: THREE.DoubleSide, transparent: true, opacity: 0.5, depthWrite: false, color: 0x9fe8d8 };
    this.ghostHull = psxMaterial({ ...ghost, key: 'Gh' });
    this.ghostSail = psxMaterial({ ...ghost, key: 'Gs' });
  }

  pickKind(faction) {
    let r = Math.random();
    for (const [k, w] of Object.entries(faction.weights)) { if (r < w) return k; r -= w; }
    return 'fisher';
  }

  build(kindKey, faction, ghost) {
    const K = KINDS[kindKey], g = shipGeos(), [hx, hy, hz] = K.hull;
    const root = new THREE.Group(); root.rotation.order = 'YXZ'; root.scale.setScalar(K.scale);
    const hullMat = ghost ? this.ghostHull : this.hullMats[faction.id];
    const sailMat = ghost ? this.ghostSail : this.sailMats[faction.id];
    const hull = new THREE.Mesh(K.canoe ? g.canoe : g.hull, hullMat);
    hull.scale.set(hx, hy, hz); root.add(hull);
    if (K.castle) { const c = new THREE.Mesh(g.castle, hullMat); c.scale.set(hx, hy, hz); root.add(c); }
    const sails = [];
    K.masts.forEach((m, i) => {
      const mz = m.z === null ? -0.3 * hz : m.z;
      if (m.extra) { const mm = new THREE.Mesh(g.mast, hullMat); mm.position.set(0, 0.3, mz); mm.scale.setScalar(m.s); root.add(mm); }
      const pivot = new THREE.Group(); pivot.position.set(0, 1.0 * hy, mz);
      const sail = new THREE.Mesh(g.sail, sailMat); pivot.add(sail); root.add(pivot);
      sails.push({ pivot, sail, s: m.s, jib: null });
    });
    if (K.jib && sails.length) {
      const jib = new THREE.Mesh(g.jib, sailMat); jib.scale.z = hz; root.add(jib);
      sails[0].jib = jib;
    }
    if (K.canoe) { // triangular sail on the dugout
      const pivot = new THREE.Group(); pivot.position.set(0, -0.5, -0.2);
      const sail = new THREE.Mesh(g.jib, sailMat); sail.scale.set(1, 0.8, 0.9); pivot.add(sail); root.add(pivot);
      sails.push({ pivot, sail, s: 1, jib: null, canoe: true });
    }
    const flag = new THREE.Mesh(getFlagGeo(), ghost ? this.ghostSail : this.flagMats[faction.id]);
    flag.position.set(0, K.canoe ? 3.4 : 6.95 * hy * (K.masts[0] ? K.masts[0].s * 0.93 : 1), K.canoe ? -0.2 : -0.3 * hz);
    root.add(flag);
    return { root, sails, flag };
  }

  spawn(ship, dread) {
    const ang = Math.random() * Math.PI * 2, dist = 230 + Math.random() * 70;
    const x = ship.pos.x + Math.cos(ang) * dist, z = ship.pos.z + Math.sin(ang) * dist;
    if (this.world.nearest(x, z, 30)) return;
    const mode = dread < 0.4 ? 'live' : dread < 0.7 ? 'derelict' : 'ghost';
    const sector = sectorAt(x, z, this.seed), faction = mode === 'ghost' ? FACTIONS.drowned : sector.faction;
    const kind = this.pickKind(faction), K = KINDS[kind];
    const aim = Math.atan2(ship.pos.x - x + (Math.random() - 0.5) * 200, -(ship.pos.z - z + (Math.random() - 0.5) * 200));
    const parts = this.build(kind, faction, mode === 'ghost');
    this.scene.add(parts.root);
    const hostile = !this.noRaiders && mode === 'live' && faction.id === 'reef' && Math.random() < 0.22 && !this.ships.some((q) => q.hostile && !q.sinking);   // raiders are rare: one at a time, now and then   // no raiders until you have cannons
    this.ships.push(armed({
      ...parts, id: this.nextId++, kind, mode, faction, sector, x, z, heading: aim,
      speed: mode === 'live' ? K.speed[0] + Math.random() * (K.speed[1] - K.speed[0]) : mode === 'derelict' ? 1.2 : 3.2,
      age: 0, sgn: 1, roll: Math.random(), state: 'none', seed: Math.floor(Math.random() * 1e9),
      name: `${faction.name} ${hostile ? 'raider' : K.label}`,
    }, hostile));
  }

  /** place a specific ship (also used by tests) */
  spawnAt(kind, factionId, x, z, heading, mode = 'live', speed = null, hostile = false) {
    const K = KINDS[kind], faction = FACTIONS[factionId], parts = this.build(kind, faction, mode === 'ghost');
    this.scene.add(parts.root);
    const s = armed({
      ...parts, id: this.nextId++, kind, mode, faction, sector: sectorAt(x, z, this.seed), x, z, heading,
      speed: speed === null ? (mode === 'live' ? K.speed[0] : 1.2) : speed, age: 0, sgn: 1, roll: Math.random(), state: 'none', seed: Math.floor(Math.random() * 1e9), name: `${faction.name} ${hostile ? 'raider' : K.label}`,
    }, hostile);
    this.ships.push(s);
    return s;
  }

  /** hulls the player's ship cannot sail through: other vessels and the harbour fishing boats */
  solids(out) {
    for (const s of this.ships) {
      if (s.sinking || s.sinkT > 0) continue;
      const K = KINDS[s.kind], hd = s.heading;
      out.push({ x: s.x, z: s.z, ax: Math.sin(hd), az: -Math.cos(hd), hl: 1.7 * K.scale, r: 1.1 * K.scale });
    }
    if (this.rboats) for (const b of this.rboats.values()) { const hd = -b.root.rotation.y; out.push({ x: b.root.position.x, z: b.root.position.z, ax: Math.sin(hd), az: -Math.cos(hd), hl: 1.3, r: 0.9 }); }
    return out;
  }

  /** closest ship that can still be hailed */
  nearestHail(x, z, range = 24) {
    let best = null, bd = range;
    for (const s of this.ships) {
      if (s.state !== 'none' || s.sinking) continue;
      const d = Math.hypot(s.x - x, s.z - z) - 2 * KINDS[s.kind].scale;
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  /** things that come on a schedule: the floating market on Friday daytimes, the regatta on Sunday afternoons */
  schedule(dt, ship, sc) {
    const h = sc.hour, bright = sc.dread < 0.4;
    const mk = this.ships.find((s) => s.special === 'market');
    const marketTime = sc.wd === 4 && h >= 8.5 && h < 17.5 && bright;
    if (marketTime && !mk && this.mkDay !== sc.dayN) {
      const a = Math.random() * 6.28, d = 150 + Math.random() * 50, x = ship.pos.x + Math.cos(a) * d, z = ship.pos.z + Math.sin(a) * d;
      if (!this.world.nearest(x, z, 35)) {
        this.mkDay = sc.dayN;
        const s = this.spawnAt('merchant', 'free', x, z, Math.random() * 6.28, 'live', 0.55);
        s.special = 'market'; s.name = 'The Floating Market'; s.roll = 0; s.hostile = false;
        if (this.onEvent) this.onEvent('market', s);
      }
    }
    if (mk && !marketTime && !mk.leaving) { mk.leaving = true; mk.speed = 4.5; mk.heading += Math.PI * 0.6; }   // the market packs up at dusk and sails on
    if (sc.wd === 6 && h >= 13 && h < 16 && bright && this.regDay !== sc.dayN) {
      const a = Math.random() * 6.28, x0 = ship.pos.x + Math.cos(a) * 240, z0 = ship.pos.z + Math.sin(a) * 240;
      const px = -Math.sin(a), pz = Math.cos(a);   // pass the player's position at a lateral offset
      const tx = ship.pos.x + px * 55, tz = ship.pos.z + pz * 55, hd = Math.atan2(tx - x0, -(tz - z0));
      if (!this.world.nearest(x0, z0, 40)) {
        this.regDay = sc.dayN;
        ['canoe', 'fisher', 'canoe', 'fisher', 'canoe'].forEach((k, i) => {
          const back = i * 22, lat = (i % 2 ? 1 : -1) * 7, x = x0 - Math.sin(hd) * back + Math.cos(hd) * lat, z = z0 + Math.cos(hd) * back + Math.sin(hd) * lat;
          const s = this.spawnAt(k, 'free', x, z, hd, 'live', KINDS[k].speed[1] * (0.95 + Math.random() * 0.1));
          s.special = 'regatta'; s.name = `Regatta boat ${i + 1}`;
        });
        if (this.onEvent) this.onEvent('regatta');
      }
    }
  }

  /** the harbour fishing boats, placed from the clock alone (so they are always where the hour says) */
  routines(dt, t, ctx) {
    const { ship, wave, dread } = ctx, sc = ctx.sched; if (!sc) return;
    this.rboats = this.rboats || new Map();
    for (const [id, b] of this.rboats) {
      const isl = this.world.islands.get(id);
      if (!isl || Math.hypot(isl.desc.x - ship.pos.x, isl.desc.z - ship.pos.z) > 430) { this.scene.remove(b.root); this.rboats.delete(id); }
    }
    for (const [id, isl] of this.world.islands) {
      const d = isl.desc;
      if (d.type !== 'harbour' || !d.dock || this.rboats.has(id) || Math.hypot(d.x - ship.pos.x, d.z - ship.pos.z) > 380) continue;
      const parts = this.build('fisher', sectorAt(d.x, d.z, this.seed).faction, false); this.scene.add(parts.root);
      const th = d.dock.th, dx = Math.cos(th), dz = Math.sin(th), px = -dz, pz = dx, R = Math.hypot(d.dock.x, d.dock.z) - 10;
      this.rboats.set(id, { ...parts, d, th, berth: [d.x + d.dock.x + px * 6, d.z + d.dock.z + pz * 6], spot: [d.x + dx * (R + 85) - px * 28, d.z + dz * (R + 85) - pz * 28], name: `${d.name}'s fishing boat` });
    }
    const h = sc.hour;
    for (const b of this.rboats.values()) {
      const st = boatStatus(b.d, sc.dayN, dread, this.seed);
      let k = 0;   // 0 at the berth, 1 at the fishing spot
      if (st.today === 'stayed') k = 0;
      else if (st.yesterday === 'lost' && h < 6.5) k = 1;                     // still out where it spent the night
      else if (st.yesterday === 'lost' && h < 8) k = 1 - (h - 6.5) / 1.5;      // and home again by itself
      else if (st.today === 'lost') k = h < 6.5 ? 0 : h < 8 ? (h - 6.5) / 1.5 : 1;   // goes out and does not come back
      else k = h < 6.5 ? 0 : h < 8 ? (h - 6.5) / 1.5 : h < 15.5 ? 1 : h < 17.5 ? 1 - (h - 15.5) / 2 : 0;
      k = k * k * (3 - 2 * k);
      b.k = k;
      const x = lerp(b.berth[0], b.spot[0], k), z = lerp(b.berth[1], b.spot[1], k);
      const away = Math.atan2(b.spot[0] - b.berth[0], -(b.spot[1] - b.berth[1]));
      const moving = k > 0.02 && k < 0.98, back = h >= 15.5 && st.today !== 'lost' || (st.yesterday === 'lost' && h >= 6.5 && h < 8);
      let hd = moving ? (back ? away + Math.PI : away) : k >= 0.98 ? away + 1.2 + Math.sin(t * 0.07) * 0.5 : b.th + Math.PI / 2;
      const wh = waveHeight(x, z, t, wave);
      b.root.position.set(x, wh + 0.1, z);
      b.root.rotation.set(Math.sin(t * 0.9 + x) * 0.04, -hd, Math.cos(t * 0.7 + z) * 0.05);
      const furl = moving || k >= 0.98 ? 1 : 0.22;
      for (const sl of b.sails) { sl.pivot.rotation.y = 0.5; sl.sail.scale.x = 1; sl.pivot.scale.set(sl.s, furl * sl.s, sl.s); if (sl.jib) { sl.jib.scale.x = 1; sl.jib.scale.y = furl; } }
      b.flag.rotation.y = Math.PI + Math.sin(t * 8) * 0.2;
      b.root.visible = !(b.d.type === 'harbour' && st.today === 'lost' && false);
    }
  }

  update(dt, t, ctx) {
    const { ship, dread, wave, wind } = ctx;
    this.routines(dt, t, ctx);
    this.timer -= dt;
    const want = dread < 0.7 ? 2 : 1;
    if (this.timer <= 0) {
      this.timer = 10;
      if (this.ships.filter((q) => !q.special).length < want && Math.random() < 0.6) this.spawn(ship, dread);
    }
    if (ctx.sched) this.schedule(dt, ship, ctx.sched);

    for (let i = this.ships.length - 1; i >= 0; i--) {
      const s = this.ships[i], K = KINDS[s.kind];
      s.age += dt;
      if (s.sinking) { s.sinkT += dt; s.speed *= Math.max(0, 1 - dt); if (s.sinkT > 5) { this.scene.remove(s.root); this.ships.splice(i, 1); continue; } }
      else if (s.hostile) {
        const dx = ship.pos.x - s.x, dz = ship.pos.z - s.z, dd = Math.hypot(dx, dz);
        s.engaged = dd < 85;
        if (dd > 210 && s.age > 20) s.hostile = false;   // they give up the chase when you pull away
        if (dd < 170) {
          let want = Math.atan2(dx, -dz);
          if (dd < 50) want += s.circle * 1.45;
          s.heading += clamp(angleDiff(s.heading, want), -0.7 * dt, 0.7 * dt);
          s.speed = K.speed[1] * 0.95;
        } else s.speed = Math.max(s.speed, K.speed[0]);   // never idle in the water
      }
      if (s.mode === 'derelict') s.heading += Math.sin(s.age * 0.07 + i) * 0.03 * dt;
      s.x += Math.sin(s.heading) * s.speed * dt; s.z -= Math.cos(s.heading) * s.speed * dt;
      if (s.mode !== 'ghost') {
        this.tmp.set(s.x, 0, s.z);
        if (this.world.collide(this.tmp, 3.5 * K.scale)) { s.x = this.tmp.x; s.z = this.tmp.z; s.heading += 0.9 * dt + 0.02; }
      }
      const dist = Math.hypot(s.x - ship.pos.x, s.z - ship.pos.z);
      if (dist > 390) { this.scene.remove(s.root); this.ships.splice(i, 1); continue; }

      const fx = Math.sin(s.heading), fz = -Math.cos(s.heading), rx = Math.cos(s.heading), rz = Math.sin(s.heading);
      const wh = (ox, oz) => waveHeight(s.x + rx * ox + fx * -oz, s.z + rz * ox + fz * -oz, t, wave);
      const bow = wh(0, -2.4), stern = wh(0, 2.4), right = wh(1.2, 0), left = wh(-1.2, 0);
      s.root.position.set(s.x, (bow + stern + right + left) / 4 + 0.1, s.z);
      s.root.rotation.set(Math.atan2(bow - stern, 4.8), -s.heading, Math.atan2(right - left, 2.4));
      const rel = angleDiff(s.heading, wind.dir), sgn = rel >= 0 ? 1 : -1;
      const swing = lerp(1.4, 0.1, Math.abs(rel) / Math.PI) * sgn;
      s.sgn += (sgn - s.sgn) * Math.min(1, dt * 2);
      const flat = s.mode === 'derelict' ? 0.45 + Math.sin(t * 1.3 + i) * 0.04 : 1;
      for (const sl of s.sails) {
        sl.pivot.rotation.y += (swing - sl.pivot.rotation.y) * Math.min(1, dt * 2);
        sl.sail.scale.x = s.sgn * (sl.canoe ? 1 : 1);
        sl.pivot.scale.set(sl.s, flat * sl.s, sl.s);
        if (sl.jib) { sl.jib.scale.x = s.sgn; sl.jib.scale.y = flat; }
      }
      s.flag.rotation.y = Math.PI - rel + Math.sin(t * 8 + i) * 0.2;
      if (s.sinking) { s.root.position.y -= s.sinkT * 0.9; s.root.rotation.z += s.sinkT * 0.25; s.root.rotation.x += s.sinkT * 0.1; }
    }
  }
}
