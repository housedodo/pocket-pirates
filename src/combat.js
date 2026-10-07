import * as THREE from 'three';
import { mats, psxMaterial } from './psx.js';
import { waveHeight } from './ocean.js';
import { KINDS } from './traffic.js';

// Simple, strictly optional ship combat. Only raiders (some Reef Brotherhood ships) attack,
// and you can outrun them, pay tribute, or fight. Space auto-aims a broadside at the nearest raider.
const G = 16, SPEED = 38;
const rnd = (a, b) => a + Math.random() * (b - a);

export class Combat {
  constructor(scene, fauna) {
    this.scene = scene; this.fauna = fauna;
    this.reload = 0;
    const geo = new THREE.IcosahedronGeometry(0.32, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0x24242c, fog: false });
    this.balls = Array.from({ length: 18 }, () => { const m = new THREE.Mesh(geo, mat); m.visible = false; scene.add(m); return { m, on: false, vx: 0, vy: 0, vz: 0, owner: 0, dmg: 0, life: 0 }; });
    const pg = new THREE.IcosahedronGeometry(1, 0);
    this.puffMat = psxMaterial({ color: 0xe8e4dc, transparent: true, opacity: 0.8, depthWrite: false, key: 'Pf' });
    this.puffs = Array.from({ length: 14 }, () => { const m = new THREE.Mesh(pg, this.puffMat); m.visible = false; scene.add(m); return { m, life: 0 }; });
  }

  puff(x, y, z, size = 1) {
    const p = this.puffs.find((q) => q.life <= 0);
    if (!p) return;
    p.life = 0.9; p.size = size; p.m.position.set(x, y, z); p.m.visible = true; p.vy = rnd(0.8, 1.6);
  }

  launch(owner, fx, fz, tx, tz, tvx, tvz, dmg, spread) {
    const b = this.balls.find((q) => !q.on);
    if (!b) return;
    const y0 = 1.6, yT = 1.2;
    let dx = tx - fx, dz = tz - fz, d = Math.hypot(dx, dz), T = d / SPEED;
    dx = tx + tvx * T - fx; dz = tz + tvz * T - fz; d = Math.hypot(dx, dz); T = Math.max(0.25, d / SPEED);
    const a = Math.atan2(dx, dz) + (Math.random() - 0.5) * spread, dd = d * (1 + (Math.random() - 0.5) * spread * 0.6);
    b.m.position.set(fx, y0, fz);
    b.vx = Math.sin(a) * dd / T; b.vz = Math.cos(a) * dd / T; b.vy = (yT - y0 + 0.5 * G * T * T) / T;
    b.on = true; b.owner = owner; b.dmg = dmg; b.life = T + 1.5; b.m.visible = true;
    this.puff(fx, 2, fz, 1.1); this.puff(fx + Math.sin(a) * 1.5, 2.2, fz + Math.cos(a) * 1.5, 0.8);
  }

  /** nearest living raider within range */
  target(ship, traffic, range = 85) {
    let best = null, bd = range;
    for (const s of traffic.ships) {
      if (!s.hostile || s.hp <= 0 || s.sinking) continue;
      const d = Math.hypot(s.x - ship.pos.x, s.z - ship.pos.z);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  playerFire(ship, traffic, state, mods) {
    if (this.reload > 0) return 'reload';
    if (state.ammo <= 0) return 'ammo';
    const tg = this.target(ship, traffic);
    if (!tg) return 'target';
    const rx = Math.cos(ship.heading), rz = Math.sin(ship.heading);
    const side = ((tg.x - ship.pos.x) * rx + (tg.z - ship.pos.z) * rz) >= 0 ? 1 : -1;
    for (let i = 0; i < 2; i++) {
      const off = (i - 0.5) * 1.8;
      this.launch(0, ship.pos.x + rx * side * 1.4 + Math.sin(ship.heading) * off, ship.pos.z + rz * side * 1.4 - Math.cos(ship.heading) * off,
        tg.x, tg.z, Math.sin(tg.heading) * tg.speed, -Math.cos(tg.heading) * tg.speed, mods.dmg, 0.09);
    }
    state.ammo--; this.reload = mods.reload;
    return 'ok';
  }

  update(dt, t, ctx) {
    const { ship, traffic, wave, onHitEnemy, onHitPlayer } = ctx;
    this.reload = Math.max(0, this.reload - dt);

    // raiders shoot back
    for (const s of traffic.ships) {
      if (!s.hostile || s.hp <= 0 || s.sinking || !s.engaged) continue;
      s.fireCd -= dt;
      if (s.fireCd <= 0) {
        s.fireCd = rnd(3.4, 5.2);
        const rx = Math.cos(s.heading), rz = Math.sin(s.heading);
        const side = ((ship.pos.x - s.x) * rx + (ship.pos.z - s.z) * rz) >= 0 ? 1 : -1;
        this.launch(1, s.x + rx * side * 1.5, s.z + rz * side * 1.5, ship.pos.x, ship.pos.z, Math.sin(ship.heading) * ship.speed, -Math.cos(ship.heading) * ship.speed, 7 + Math.random() * 3, 0.16);
      }
    }

    for (const b of this.balls) {
      if (!b.on) continue;
      b.life -= dt;
      const p = b.m.position;
      b.vy -= G * dt;
      p.x += b.vx * dt; p.y += b.vy * dt; p.z += b.vz * dt;
      let done = b.life <= 0;
      if (b.owner === 0) {
        for (const s of traffic.ships) {
          if (!s.hostile || s.hp <= 0 || s.sinking) continue;
          if (Math.hypot(s.x - p.x, s.z - p.z) < 3.4 * KINDS[s.kind].scale && p.y < 4.5) { onHitEnemy(s, b.dmg); this.puff(p.x, p.y, p.z, 1.4); done = true; break; }
        }
      } else if (Math.hypot(ship.pos.x - p.x, ship.pos.z - p.z) < 3.3 && p.y < 4.5) { onHitPlayer(b.dmg); this.puff(p.x, p.y, p.z, 1.4); done = true; }
      if (!done && p.y < waveHeight(p.x, p.z, t, wave) + 0.1) { this.fauna.splash(p.x, p.z, wave, t, 1.2); done = true; }
      if (done) { b.on = false; b.m.visible = false; }
    }

    for (const q of this.puffs) {
      if (q.life <= 0) continue;
      q.life -= dt;
      const k = 1 - q.life / 0.9;
      q.m.position.y += q.vy * dt;
      q.m.scale.setScalar(q.size * (0.4 + k * 1.6));
      if (q.life <= 0) q.m.visible = false;
    }
  }
}
