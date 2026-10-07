import * as THREE from 'three';
import { mulberry32 } from './util.js';

// Faint wisps of air drifting downwind past the ship: a soft, in-world hint of the wind
// instead of a number on a gauge. Strength sets how many, how fast and how visible.
const N = 54, BOX = 46;

export class WindFX {
  constructor(scene) {
    const r = this.r = mulberry32(5);
    this.p = Array.from({ length: N }, () => ({ x: (r() - 0.5) * BOX * 2, z: (r() - 0.5) * BOX * 2, y: 2 + r() * 8, len: 3 + r() * 5, ph: r() * 6, sp: 0.7 + r() * 0.6 }));
    this.verts = new Float32Array(N * 12);   // 2 segments per wisp (a gentle bend)
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.verts, 3));
    this.mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, fog: false, depthWrite: false });
    this.lines = new THREE.LineSegments(g, this.mat);
    this.lines.frustumCulled = false; this.lines.renderOrder = 4;
    scene.add(this.lines);
  }
  update(dt, t, dir, strength, shipPos, night, rain) {
    const wx = Math.sin(dir), wz = -Math.cos(dir), sx = -wz, sz = wx;
    const speed = 3 + strength * 7;
    this.mat.opacity = Math.max(0, (0.1 + 0.2 * Math.min(1, strength)) * (1 - 0.6 * night) * (1 - rain));
    this.lines.visible = this.mat.opacity > 0.01;
    const v = this.verts;
    for (let i = 0; i < N; i++) {
      const q = this.p[i];
      q.x += wx * speed * q.sp * dt; q.z += wz * speed * q.sp * dt;
      const dx = q.x - shipPos.x, dz = q.z - shipPos.z;
      if (Math.abs(dx) > BOX || Math.abs(dz) > BOX) { q.x = shipPos.x - wx * BOX * 0.9 + (this.r() - 0.5) * BOX * 1.6 * sx; q.z = shipPos.z - wz * BOX * 0.9 + (this.r() - 0.5) * BOX * 1.6 * sz; q.y = 2 + this.r() * 8; }
      const L = q.len * (0.6 + 0.5 * strength), bend = Math.sin(t * 1.3 + q.ph) * 0.9, o = i * 12;
      v[o] = q.x; v[o + 1] = q.y; v[o + 2] = q.z;
      v[o + 3] = q.x + wx * L * 0.5 + sx * bend; v[o + 4] = q.y + 0.1; v[o + 5] = q.z + wz * L * 0.5 + sz * bend;
      v[o + 6] = v[o + 3]; v[o + 7] = v[o + 4]; v[o + 8] = v[o + 5];
      v[o + 9] = q.x + wx * L; v[o + 10] = q.y; v[o + 11] = q.z + wz * L;
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
  }
}
