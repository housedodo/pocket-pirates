import * as THREE from 'three';
import { shipGeos } from './ship.js';
import { mats, psxMaterial, getAtlas } from './psx.js';
import { waveHeight } from './ocean.js';
import { angleDiff, smoothstep, lerp } from './util.js';

// Other vessels on the sea. Cheerful fishing boats and merchants at first,
// drifting derelicts with the lamps still lit at mid dread, pale ghost ships at the end.
const KINDS = {
  fisher: { name: 'fishing boat', scale: 0.72, speed: [4.5, 6.5], sail: [0.55, 0.78, 1.0] },
  merchant: { name: 'merchant brig', scale: 1.15, speed: [5.5, 7.5], sail: [1.0, 0.55, 0.5] },
};

export class Traffic {
  constructor(scene, world) {
    this.scene = scene; this.world = world;
    this.ships = [];
    this.timer = 2;
    this.onGreet = null;
    const atlas = getAtlas();
    const sailMat = (c) => { const m = psxMaterial({ map: atlas, vertexColors: true, dark: true, side: THREE.DoubleSide, key: 'S' }); m.color.setRGB(...c); return m; };
    this.sailMats = { fisher: sailMat(KINDS.fisher.sail), merchant: sailMat(KINDS.merchant.sail) };
    const ghost = { map: atlas, vertexColors: true, dark: true, side: THREE.DoubleSide, transparent: true, opacity: 0.5, depthWrite: false, color: 0x9fe8d8 };
    this.ghostHull = psxMaterial({ ...ghost, key: 'Gh' });
    this.ghostSail = psxMaterial({ ...ghost, key: 'Gs' });
    this.tmp = new THREE.Vector3();
  }

  spawn(ship, dread, wind) {
    const ang = Math.random() * Math.PI * 2, dist = 190 + Math.random() * 70;
    const x = ship.pos.x + Math.cos(ang) * dist, z = ship.pos.z + Math.sin(ang) * dist;
    if (this.world.nearest(x, z, 30)) return;
    const mode = dread < 0.4 ? 'live' : dread < 0.7 ? 'derelict' : 'ghost';
    const kind = Math.random() < 0.55 ? 'fisher' : 'merchant', K = KINDS[kind];
    // aim to pass near the player, then keep going
    const aim = Math.atan2(ship.pos.x - x + (Math.random() - 0.5) * 160, -(ship.pos.z - z + (Math.random() - 0.5) * 160));
    const root = new THREE.Group(); root.rotation.order = 'YXZ'; root.scale.setScalar(K.scale);
    const ghost = mode === 'ghost', g = shipGeos();
    root.add(new THREE.Mesh(g.hull, ghost ? this.ghostHull : mats.props));
    const pivot = new THREE.Group(); pivot.position.set(0, 1.0, -0.3);
    const sail = new THREE.Mesh(g.sail, ghost ? this.ghostSail : this.sailMats[kind]);
    pivot.add(sail); root.add(pivot);
    const jib = new THREE.Mesh(g.jib, ghost ? this.ghostSail : this.sailMats[kind]); root.add(jib);
    this.scene.add(root);
    this.ships.push({
      root, pivot, sail, jib, kind, mode, x, z, heading: aim, speed: mode === 'live' ? K.speed[0] + Math.random() * (K.speed[1] - K.speed[0]) : mode === 'derelict' ? 1.3 : 3.5,
      greeted: false, age: 0, sgn: 1, turn: 0,
    });
  }

  update(dt, t, ctx) {
    const { ship, dread, wave, wind } = ctx;
    this.timer -= dt;
    const want = dread < 0.4 ? 3 : dread < 0.7 ? 3 : 2;
    if (this.timer <= 0) { this.timer = 4; if (this.ships.length < want) this.spawn(ship, dread, wind); }

    for (let i = this.ships.length - 1; i >= 0; i--) {
      const s = this.ships[i];
      s.age += dt;
      if (s.mode === 'derelict') s.heading += Math.sin(s.age * 0.07 + i) * 0.03 * dt;
      s.x += Math.sin(s.heading) * s.speed * dt; s.z -= Math.cos(s.heading) * s.speed * dt;
      if (s.mode !== 'ghost') {
        this.tmp.set(s.x, 0, s.z);
        if (this.world.collide(this.tmp, 3.5)) { s.x = this.tmp.x; s.z = this.tmp.z; s.heading += 0.9 * dt + 0.02; }
      }
      const dx = s.x - ship.pos.x, dz = s.z - ship.pos.z, dist = Math.hypot(dx, dz);
      if (dist > 340) { this.scene.remove(s.root); this.ships.splice(i, 1); continue; }

      if (!s.greeted && dist < 26) {
        s.greeted = true;
        if (this.onGreet) this.onGreet(KINDS[s.kind].name, s.mode, dist);
      }

      // pose
      const fx = Math.sin(s.heading), fz = -Math.cos(s.heading), rx = Math.cos(s.heading), rz = Math.sin(s.heading);
      const wh = (ox, oz) => waveHeight(s.x + rx * ox + fx * -oz, s.z + rz * ox + fz * -oz, t, wave);
      const bow = wh(0, -2.4), stern = wh(0, 2.4), right = wh(1.2, 0), left = wh(-1.2, 0);
      s.root.position.set(s.x, (bow + stern + right + left) / 4 + 0.1, s.z);
      s.root.rotation.set(Math.atan2(bow - stern, 4.8), -s.heading, Math.atan2(right - left, 2.4));
      const rel = angleDiff(s.heading, wind.dir), sgn = rel >= 0 ? 1 : -1;
      const swing = lerp(1.4, 0.1, Math.abs(rel) / Math.PI) * sgn;
      s.pivot.rotation.y += (swing - s.pivot.rotation.y) * Math.min(1, dt * 2);
      s.sgn += (sgn - s.sgn) * Math.min(1, dt * 2);
      s.sail.scale.x = s.sgn; s.jib.scale.x = s.sgn;
      const flat = s.mode === 'derelict' ? 0.45 + Math.sin(t * 1.3 + i) * 0.04 : 1;
      s.pivot.scale.set(1, flat, 1); s.jib.scale.y = flat;
    }
  }
}
