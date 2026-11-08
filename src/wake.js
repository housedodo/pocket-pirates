// A ship's wake and bow wave. The hull leaves a trail of points; from them two foam arms open out behind the stern in a V
// (wider and fainter as they age), with a churned strip down the middle, and at the bow a curl of white water that grows with
// speed. One Wake per ship (the player's and the traffic's). Flat quads riding the waves (the same waveHeight as the water).
import * as THREE from 'three';
import { waveHeight } from './ocean.js';

const N = 48;          // trail points kept
const LIFE = 4.2;      // seconds a point lives
const STEP = 0.09;     // seconds between points
const SEG = N - 1;
const QUADS = SEG * 3 + 4;   // two arms + the middle strip, plus four bow-wave quads

export class Wake {
  constructor(scene, { len = 5.2, beam = 1.4 } = {}) {
    this.len = len; this.beam = beam;
    this.pts = []; this.acc = 0;
    this.pos = new Float32Array(QUADS * 4 * 3); this.col = new Float32Array(QUADS * 4 * 4);
    const idx = []; for (let i = 0; i < QUADS; i++) { const b = i * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 4));
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 3;
    scene.add(this.mesh);
  }
  dispose(scene) { scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }

  quad(i, a, b, c, d, ca, cb) {   // a,b at the start (alpha ca), c,d at the end (alpha cb)
    const P = this.pos, C = this.col, o = i * 12, k = i * 16;
    const v = [a, b, c, d], al = [ca, ca, cb, cb];
    for (let j = 0; j < 4; j++) { P[o + j * 3] = v[j][0]; P[o + j * 3 + 1] = v[j][1]; P[o + j * 3 + 2] = v[j][2]; C[k + j * 4] = 0.93; C[k + j * 4 + 1] = 0.97; C[k + j * 4 + 2] = 1; C[k + j * 4 + 3] = al[j]; }
  }
  hide(i) { for (let j = 0; j < 4; j++) this.col[i * 16 + j * 4 + 3] = 0; }

  /** s: { pos: {x,z}, heading, speed, max (top speed) }, light: 0..1 (night dims the foam) */
  update(dt, t, wave, s, light = 1) {
    const fx = Math.sin(s.heading), fz = -Math.cos(s.heading), rx = -fz, rz = fx;
    const sp = Math.max(0, s.speed), k = Math.min(1, sp / (s.max || 11));
    // drop a trail point at the stern now and then while moving
    this.acc += dt;
    if (this.acc >= STEP) {
      this.acc = 0;
      if (sp > 0.6) this.pts.unshift({ x: s.pos.x - fx * this.len * 0.5, z: s.pos.z - fz * this.len * 0.5, rx, rz, k, age: 0, n: 0.45 + 0.55 * Math.random(), m: Math.random() });
      if (this.pts.length > N) this.pts.length = N;
    }
    for (const p of this.pts) p.age += dt;
    while (this.pts.length && this.pts[this.pts.length - 1].age > LIFE) this.pts.pop();
    const y = (x, z) => waveHeight(x, z, t, wave) + 0.14;
    let q = 0;
    const pts = this.pts;
    for (let i = 0; i < SEG; i++) {
      const a = pts[i], b = pts[i + 1];
      if (!a || !b) { this.hide(q++); this.hide(q++); this.hide(q++); continue; }
      // the arms open out at about 19 degrees as the point ages (the Kelvin wedge), and thin and fade as they go
      const arm = (p, sgn, w) => { const spread = this.beam * 0.5 + p.age * 3.4 * (0.35 + p.k) + Math.sin(p.age * 3 + p.m * 6) * 0.15; const cx = p.x + p.rx * spread * sgn, cz = p.z + p.rz * spread * sgn; return [[cx - p.rx * w * sgn * 0.5, cz - p.rz * w * sgn * 0.5], [cx + p.rx * w * sgn * 0.5, cz + p.rz * w * sgn * 0.5]]; };
      const fa = (p) => Math.max(0, 1 - p.age / LIFE) ** 1.3 * (0.35 + 0.65 * p.k) * 0.75 * light * p.n;   // broken foam: each stretch its own strength
      const wa = 0.35 + a.age * 0.25, wb = 0.35 + b.age * 0.25;
      for (const sgn of [-1, 1]) {
        const [a0, a1] = arm(a, sgn, wa), [b0, b1] = arm(b, sgn, wb);
        this.quad(q++, [a0[0], y(a0[0], a0[1]), a0[1]], [a1[0], y(a1[0], a1[1]), a1[1]], [b1[0], y(b1[0], b1[1]), b1[1]], [b0[0], y(b0[0], b0[1]), b0[1]], fa(a), fa(b));
      }
      // the churned strip right behind the stern: wide and bright at first, gone after a second or two
      const ma = Math.max(0, 1 - a.age / 1.2) ** 1.5 * (0.3 + 0.7 * a.k) * 0.5 * light * a.n, mb = Math.max(0, 1 - b.age / 1.2) ** 1.5 * (0.3 + 0.7 * b.k) * 0.5 * light * b.n;
      const sw = (p) => this.beam * 0.35 + p.age * 0.5;
      this.quad(q++, [a.x - a.rx * sw(a), y(a.x, a.z), a.z - a.rz * sw(a)], [a.x + a.rx * sw(a), y(a.x, a.z), a.z + a.rz * sw(a)], [b.x + b.rx * sw(b), y(b.x, b.z), b.z + b.rz * sw(b)], [b.x - b.rx * sw(b), y(b.x, b.z), b.z - b.rz * sw(b)], ma, mb);
    }
    // the bow wave: white water peeling off both sides of the bow, longer and brighter with speed
    const bx = s.pos.x + fx * this.len * 0.5, bz = s.pos.z + fz * this.len * 0.5, L = 0.6 + 2.6 * k, al = Math.min(0.85, k * 1.1) * light;
    for (const sgn of [-1, 1]) {
      const p0 = [bx, bz], p1 = [bx - fx * L * 0.9 + rx * sgn * (this.beam * 0.5 + L * 0.35), bz - fz * L * 0.9 + rz * sgn * (this.beam * 0.5 + L * 0.35)];
      const w = 0.25 + 0.3 * k, flick = 0.85 + 0.15 * Math.sin(t * 13 + sgn);
      this.quad(q++, [p0[0], y(p0[0], p0[1]) + 0.05, p0[1]], [p0[0] + rx * sgn * w, y(p0[0], p0[1]) + 0.05, p0[1] + rz * sgn * w], [p1[0] + rx * sgn * w * 1.6, y(p1[0], p1[1]), p1[1] + rz * sgn * w * 1.6], [p1[0], y(p1[0], p1[1]), p1[1]], al * flick, al * 0.15);
      const p2 = [bx - fx * L * 1.7 + rx * sgn * (this.beam * 0.5 + L * 0.65), bz - fz * L * 1.7 + rz * sgn * (this.beam * 0.5 + L * 0.65)];
      this.quad(q++, [p1[0], y(p1[0], p1[1]), p1[1]], [p1[0] + rx * sgn * w * 1.6, y(p1[0], p1[1]), p1[1] + rz * sgn * w * 1.6], [p2[0] + rx * sgn * w * 2, y(p2[0], p2[1]), p2[1] + rz * sgn * w * 2], [p2[0], y(p2[0], p2[1]), p2[1]], al * 0.4, 0);
    }
    this.mesh.geometry.attributes.position.needsUpdate = true; this.mesh.geometry.attributes.color.needsUpdate = true;
  }
}
