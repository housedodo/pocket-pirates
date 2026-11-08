import * as THREE from 'three';
import { mulberry32 } from './util.js';

// Wisps of air drifting downwind past the ship: a soft, in-world hint of the wind instead of a number on a gauge. Strength sets how many, how fast and how visible.
// Each wisp is a few short broken dashes (chunky, never a thin straight line) laid along a lazy curve that wanders with the gusts; it fades in, drifts and fades out, then reappears elsewhere
// with new lengths, gaps and curl, so no two look alike and nothing repeats.
const N = 56, K = 8, BOX = 48;   // fewer, longer, smoother wisps (each one a continuous tapered curve)

export class WindFX {
  constructor(scene) {
    const r = this.r = mulberry32(5);
    this.p = Array.from({ length: N }, () => this.spawn({}, true));
    const nv = N * K * 4;
    this.pos = new Float32Array(nv * 3); this.col = new Float32Array(nv * 3);
    const idx = []; for (let i = 0; i < N * K; i++) { const b = i * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setIndex(idx);
    this.mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3, fog: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 4;
    scene.add(this.mesh);
  }
  /** a fresh wisp: place, height, how many dashes, how long each and how far apart, how it curls, how long it lives */
  spawn(q, anywhere = false, ship = null, wx = 0, wz = 0, sx = 0, sz = 0) {
    const r = this.r;
    if (ship && !anywhere) { q.x = ship.x - wx * BOX * 0.9 + (r() - 0.5) * BOX * 1.8 * sx + (r() - 0.5) * 10 * wx; q.z = ship.z - wz * BOX * 0.9 + (r() - 0.5) * BOX * 1.8 * sz + (r() - 0.5) * 10 * wz; }
    else { q.x = (r() - 0.5) * BOX * 2 + (ship ? ship.x : 0); q.z = (r() - 0.5) * BOX * 2 + (ship ? ship.z : 0); }
    q.y = 1.5 + r() * 9; q.sp = 0.55 + r() * 0.8; q.ph = r() * 6.28; q.life = anywhere ? r() : 0; q.span = 4 + r() * 6;
    q.n = 5 + Math.floor(r() * (K - 4)); q.w = 0.08 + r() * 0.07; q.curl = (r() - 0.5) * 0.12; q.tw = 0.35 + r() * 0.9;
    q.dl = Array.from({ length: K }, () => 0.6 + r() * 0.5); q.gap = Array.from({ length: K }, () => 0.02 + r() * 0.06);
    return q;
  }
  update(dt, t, dir, strength, shipPos, night, rain) {
    const wx = Math.sin(dir), wz = -Math.cos(dir), sx = -wz, sz = wx;
    const speed = 3 + strength * 7;
    this.mat.opacity = Math.max(0, (0.16 + 0.24 * Math.min(1, strength)) * (1 - 0.6 * night) * (1 - rain));
    this.mesh.visible = this.mat.opacity > 0.01;
    const P = this.pos, C = this.col;
    for (let i = 0; i < N; i++) {
      const q = this.p[i];
      q.life += dt / q.span;
      const dx = q.x - shipPos.x, dz = q.z - shipPos.z;
      if (q.life >= 1 || Math.abs(dx) > BOX || Math.abs(dz) > BOX) this.spawn(q, false, shipPos, wx, wz, sx, sz);
      // the gusts push each wisp a little off the wind, slowly and differently
      const a0 = dir + 0.5 * Math.sin(t * 0.35 * q.tw + q.ph) + 0.25 * Math.sin(t * 0.9 * q.tw + q.ph * 2.3);
      const ux = Math.sin(a0), uz = -Math.cos(a0);
      q.x += ux * speed * q.sp * dt; q.z += uz * speed * q.sp * dt;
      const fade = Math.sin(Math.PI * Math.min(1, q.life)), L = 0.7 + 0.6 * strength;
      let s = 0;
      for (let k = 0; k < K; k++) {
        const o = (i * K + k) * 12, c = (i * K + k) * 12;
        if (k >= q.n || fade < 0.02) { for (let j = 0; j < 12; j++) { P[o + j] = 0; C[c + j] = 0; } continue; }
        const s0 = s, s1 = s + q.dl[k] * L; s = s1 + q.gap[k];
        const pt = (u) => { const a = q.curl * u; return Math.abs(q.curl) < 1e-3 ? [q.x + ux * u, q.z + uz * u] : [q.x + (Math.cos(a0) - Math.cos(a0 + a)) / q.curl, q.z - (Math.sin(a0 + a) - Math.sin(a0)) / q.curl]; };
        const [ax, az] = pt(s0), [bx, bz] = pt(s1), ya = q.y + 0.25 * Math.sin(t * 0.8 + q.ph + k * 0.4), yb = q.y + 0.25 * Math.sin(t * 0.8 + q.ph + (k + 1) * 0.4);   // one smooth curve, no steps
        const ex = bx - ax, ez = bz - az, el = Math.hypot(ex, ez) || 1, px = -ez / el * q.w, pz = ex / el * q.w;
        const ta = fade * Math.sin(Math.PI * (k / q.n)), tb = fade * Math.sin(Math.PI * Math.min(1, (k + 1) / q.n));   // tapered: thin and faint at both ends
        const wa = Math.sqrt(ta), wb = Math.sqrt(tb);   // width tapers gently, brightness more
        P[o] = ax + px * wa; P[o + 1] = ya; P[o + 2] = az + pz * wa; P[o + 3] = ax - px * wa; P[o + 4] = ya; P[o + 5] = az - pz * wa;
        P[o + 6] = bx - px * wb; P[o + 7] = yb; P[o + 8] = bz - pz * wb; P[o + 9] = bx + px * wb; P[o + 10] = yb; P[o + 11] = bz + pz * wb;
        for (let j = 0; j < 6; j++) C[c + j] = ta; for (let j = 6; j < 12; j++) C[c + j] = tb;
      }
    }
    this.mesh.geometry.attributes.position.needsUpdate = true; this.mesh.geometry.attributes.color.needsUpdate = true;
  }
}
