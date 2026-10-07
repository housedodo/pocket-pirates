import * as THREE from 'three';
import { mats } from './psx.js';
import { CELL } from './world.js';
import { hash2, mulberry32, smoothstep, clamp } from './util.js';

// Things that live between the islands once dread is high enough.

const SEG_N = 10, SEG_H = 3.0, TAPER = 0.85;
let segGeo = null;
function getSegGeo() {
  if (segGeo) return segGeo;
  const g = new THREE.CylinderGeometry(TAPER, 1, 1, 6, 1, true).toNonIndexed();
  g.translate(0, 0.5, 0);
  const pos = g.attributes.position, cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), face = Math.floor(i / 3);
    const s = 0.78 + 0.22 * (face % 2) + (y > 0.5 ? 0.1 : 0);
    cols.set([0.62 * s, 0.4 * s, 0.85 * s], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  segGeo = g;
  return g;
}

class Tentacle {
  constructor(x, z, rng) {
    this.root = new THREE.Group();
    this.root.position.set(x, -40, z);
    this.phase = rng() * 10;
    this.scale = 0.7 + rng() * 0.7;
    this.root.scale.setScalar(this.scale);
    this.segs = [];
    let parent = this.root, r = 2.0;
    for (let i = 0; i < SEG_N; i++) {
      const g = new THREE.Group();
      g.position.y = i === 0 ? 0 : SEG_H;
      const m = new THREE.Mesh(getSegGeo(), mats.tentacle);
      m.scale.set(r, SEG_H, r);
      g.add(m);
      parent.add(g);
      this.segs.push(g);
      parent = g;
      r *= TAPER;
    }
  }
  update(t, rise) {
    this.root.position.y = -(1 - rise) * 34 * this.scale - 3;
    for (let i = 0; i < SEG_N; i++) {
      const g = this.segs[i], k = i / SEG_N;
      g.rotation.x = Math.sin(t * 0.55 + i * 0.5 + this.phase) * 0.16 + (i > 3 ? 0.13 : 0);
      g.rotation.z = Math.cos(t * 0.42 + i * 0.45 + this.phase * 1.3) * 0.16;
    }
  }
}

export class Horror {
  constructor(scene, world, seed) {
    this.scene = scene; this.world = world; this.seed = seed;
    this.tents = new Map();
  }
  site(cx, cz) {
    if (this.world.desc(cx, cz)) return null;
    const rng = mulberry32(hash2(cx, cz, this.seed + 99));
    if (rng() > 0.3) return null;
    const x = cx * CELL + (rng() - 0.5) * 60, z = cz * CELL + (rng() - 0.5) * 60;
    if (Math.hypot(x, z) < 60) return null;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const d = this.world.desc(cx + dx, cz + dz);
      if (d && Math.hypot(d.x - x, d.z - z) < d.r * 1.8 + 14) return null;
    }
    return { x, z, rng };
  }
  update(t, dread, px, pz) {
    const active = dread > 0.55;
    const ccx = Math.round(px / CELL), ccz = Math.round(pz / CELL);
    if (active) {
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        const cx = ccx + dx, cz = ccz + dz, k = `${cx},${cz}`;
        if (this.tents.has(k)) continue;
        const s = this.site(cx, cz);
        this.tents.set(k, s ? new Tentacle(s.x, s.z, s.rng) : null);
        if (s) this.scene.add(this.tents.get(k).root);
      }
    }
    const rise = smoothstep(0.58, 0.88, dread);
    for (const [k, tn] of this.tents) {
      const [cx, cz] = k.split(',').map(Number);
      if (Math.max(Math.abs(cx - ccx), Math.abs(cz - ccz)) > 5) {
        if (tn) this.scene.remove(tn.root);
        this.tents.delete(k);
        continue;
      }
      if (tn) { tn.root.visible = rise > 0.01; tn.update(t, rise); }
    }
  }
}
