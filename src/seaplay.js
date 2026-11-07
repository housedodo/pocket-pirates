// Things to do while sailing, so a long passage is never just one key held down:
//  - Gusts: dark ruffled patches (cat's paws) come down the wind over the water. Steer into one and the sails fill:
//    a few seconds of extra speed. They come from upwind, so you see them coming and can line up.
//  - Currents: lanes of moving water, marked by foam streaks drifting along them and drawn on the chart. Ride one and it
//    carries you; fight one and it slows you down. The first ones link home waters to the hand-made places.
import * as THREE from 'three';
import { mulberry32, clamp, smoothstep } from './util.js';
import { waveHeight } from './ocean.js';

// lanes: [ax, az, bx, bz, half-width, speed]. 'round' is a ring round Tama, clockwise.
export const LANES = [
  { id: 'tooth', a: [60, -40], b: [240, 70], w: 22, v: 3.2, name: 'the Tooth Run' },
  { id: 'west', a: [30, 330], b: [-500, 110], w: 26, v: 3.0, name: 'the Long West' },
  { id: 'green', a: [-210, -90], b: [-280, 140], w: 20, v: 2.8, name: 'the Green Drift' },
  { id: 'south', a: [300, -120], b: [420, -280], w: 22, v: 3.0, name: 'Wick\'s Stream' },
  { id: 'reef', a: [450, -260], b: [520, 300], w: 24, v: 3.2, name: 'the Reef Road' },
  { id: 'fog', a: [-240, -230], b: [-350, -420], w: 20, v: 2.6, name: 'the Pale Drift' },
];
export const ROUND = { x: 0, z: -118, R: 230, w: 22, v: 2.6, name: 'the Round' };

/** the current at a point: { x, z } velocity in world units/s, plus the lane it belongs to */
export function currentAt(x, z) {
  let vx = 0, vz = 0, lane = null, best = 0;
  for (const L of LANES) {
    const [ax, az] = L.a, [bx, bz] = L.b, dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    const ux = dx / len, uz = dz / len, s = (x - ax) * ux + (z - az) * uz;
    if (s < -10 || s > len + 10) continue;
    const off = Math.abs((x - ax) * -uz + (z - az) * ux), k = (1 - smoothstep(L.w * 0.5, L.w, off)) * smoothstep(-10, 30, s) * (1 - smoothstep(len - 30, len + 10, s));
    if (k > 0) { vx += ux * L.v * k; vz += uz * L.v * k; if (k > best) { best = k; lane = L; } }
  }
  { const dx = x - ROUND.x, dz = z - ROUND.z, r = Math.hypot(dx, dz), k = 1 - smoothstep(ROUND.w * 0.5, ROUND.w, Math.abs(r - ROUND.R));
    if (k > 0) { const ux = -dz / r, uz = dx / r; vx += ux * ROUND.v * k; vz += uz * ROUND.v * k; if (k > best) { best = k; lane = ROUND; } } }
  return { x: vx, z: vz, lane, k: best };
}

const NG = 4, GD = 60;            // gust patches alive at once, dashes per patch
const NC = 120;                   // current foam dashes
export class SeaPlay {
  constructor(scene) {
    this.r = mulberry32(31);
    this.gusts = Array.from({ length: NG }, () => ({ life: 0, ttl: 0 }));
    this.gustT = 3; this.boost = 0; this.caught = 0;
    // the patches: dark flat flecks with a few bright crests (one quad per fleck)
    this.gp = new Float32Array(NG * GD * 4 * 3); this.gc = new Float32Array(NG * GD * 4 * 4);
    this.gmesh = this.makeMesh(this.gp, this.gc, NG * GD, THREE.NormalBlending);
    this.goff = Array.from({ length: NG * GD }, () => [this.r() * 2 - 1, this.r() * 2 - 1, 0.5 + this.r() * 1.2, this.r()]);
    // the currents: foam streaks drifting along the lanes near the ship
    this.cp = new Float32Array(NC * 4 * 3); this.cc = new Float32Array(NC * 4 * 4);
    this.cmesh = this.makeMesh(this.cp, this.cc, NC, THREE.NormalBlending);
    this.cd = Array.from({ length: NC }, () => ({ life: 0, x: 0, z: 0 }));
    scene.add(this.gmesh); scene.add(this.cmesh);
  }
  makeMesh(pos, col, n, blending) {
    const idx = []; for (let i = 0; i < n; i++) { const b = i * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 4)); g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending, side: THREE.DoubleSide }));
    m.frustumCulled = false; m.renderOrder = 3;
    return m;
  }
  quad(P, C, i, x, z, y, ux, uz, len, wid, rgba) {
    const sx = -uz * wid, sz = ux * wid, lx = ux * len, lz = uz * len, b = i * 12, c = i * 16;
    const v = [[x - lx - sx, z - lz - sz], [x + lx - sx, z + lz - sz], [x + lx + sx, z + lz + sz], [x - lx + sx, z - lz + sz]];
    for (let k = 0; k < 4; k++) { P[b + k * 3] = v[k][0]; P[b + k * 3 + 1] = y; P[b + k * 3 + 2] = v[k][1]; C[c + k * 4] = rgba[0]; C[c + k * 4 + 1] = rgba[1]; C[c + k * 4 + 2] = rgba[2]; C[c + k * 4 + 3] = rgba[3]; }
  }

  /** dev/test: drop a gust patch at a point */
  spawnAt(x, z) { const g = this.gusts.find((q) => q.life <= 0) || this.gusts[0]; Object.assign(g, { x, z, ttl: 16, life: 16, R: 9, taken: false }); }
  /**
   * ctx: { ship, wind: {dir, strength}, t (wave time), wave, night, calm, on (gusts allowed) }
   * returns events: { gust: true } the moment a gust is caught, { lane } the lane the ship is in (or null)
   */
  update(dt, ctx) {
    const { ship, wind, t, wave, night } = ctx, r = this.r, ev = {};
    const wx = Math.sin(wind.dir), wz = -Math.cos(wind.dir);   // where the wind blows to
    const strong = wind.strength > 0.35 && !ctx.calm;
    // ---- gusts
    this.gustT -= dt;
    if (this.gustT <= 0 && strong && ctx.on) {
      this.gustT = 5 + r() * 6;
      const g = this.gusts.find((q) => q.life <= 0);
      if (g) {   // upwind of the ship and a little to one side: drifting down towards where the ship will be
        const side = (r() - 0.5) * 70, up = 55 + r() * 40, sx = -wz, sz = wx;
        g.x = ship.pos.x - wx * up + sx * side + Math.sin(ship.heading) * ship.speed * 4;
        g.z = ship.pos.z - wz * up + sz * side - Math.cos(ship.heading) * ship.speed * 4;
        g.ttl = g.life = 14 + r() * 5; g.R = 7 + r() * 4; g.taken = false;
      }
    }
    const nightK = 1 - 0.55 * night;
    for (let gi = 0; gi < NG; gi++) {
      const g = this.gusts[gi];
      if (g.life > 0) {
        g.life -= dt; g.x += wx * 6.5 * dt; g.z += wz * 6.5 * dt;
        if (!g.taken && Math.hypot(ship.pos.x - g.x, ship.pos.z - g.z) < g.R + 2 && ship.trim > 0.3) { g.taken = true; this.boost = 4.5; ev.gust = true; this.caught++; }
      }
      const fade = g.life > 0 ? clamp(Math.min(g.ttl - g.life, g.life) / 2.5, 0, 1) * (g.taken ? 0.35 : 1) : 0;
      for (let k = 0; k < GD; k++) {
        const o = this.goff[gi * GD + k], i = gi * GD + k;
        if (fade <= 0) { this.quad(this.gp, this.gc, i, 0, 0, -50, 1, 0, 0, 0, [0, 0, 0, 0]); continue; }
        const x = g.x + (o[0] * 1.6 * wx + o[1] * -wz) * g.R * 0.75, z = g.z + (o[0] * 1.6 * wz + o[1] * wx) * g.R * 0.75;
        // ruffled water: short dark scratches across the wind, with bright flecks that wink on and off
        const y = waveHeight(x, z, t, wave) + 0.12, crest = o[3] > 0.72, flick = Math.max(0, Math.sin(t * 9 + o[3] * 40));
        if (crest) this.quad(this.gp, this.gc, i, x, z, y + 0.32, wx, wz, 0.7 * o[2], 0.2, [0.95, 0.99, 1, fade * (0.3 + 0.7 * flick) * nightK]);
        else this.quad(this.gp, this.gc, i, x, z, y + 0.3, -wz, wx, 1.5 * o[2], 0.5, [0.01, 0.07, 0.16, 0.7 * fade * nightK]);
      }
    }
    this.gmesh.geometry.attributes.position.needsUpdate = true; this.gmesh.geometry.attributes.color.needsUpdate = true;
    this.boost = Math.max(0, this.boost - dt);
    ship.gust = 1 + 0.32 * clamp(this.boost / 1.5, 0, 1);

    // ---- currents: drift the ship, show the foam
    const cur = currentAt(ship.pos.x, ship.pos.z);
    ship.pos.x += cur.x * dt; ship.pos.z += cur.z * dt;
    ev.lane = cur.k > 0.5 ? cur.lane : null;
    for (let i = 0; i < NC; i++) {
      const q = this.cd[i];
      if (q.life <= 0) {   // try a spot near the ship that is in a current
        const a = r() * 6.28, d = 8 + r() * 110, x = ship.pos.x + Math.cos(a) * d, z = ship.pos.z + Math.sin(a) * d, c = currentAt(x, z);
        if (c.k > 0.3) { q.x = x; q.z = z; q.ttl = q.life = 2.5 + r() * 3; q.len = 0.8 + r() * 1.6; } else q.life = 0;
      }
      if (q.life > 0) {
        const c = currentAt(q.x, q.z), sp = Math.hypot(c.x, c.z) || 1;
        q.x += c.x * 2.2 * dt; q.z += c.z * 2.2 * dt; q.life -= dt;
        const a = clamp(Math.min(q.ttl - q.life, q.life) / 0.8, 0, 1) * clamp(c.k * 1.5, 0, 1) * nightK;
        this.quad(this.cp, this.cc, i, q.x, q.z, waveHeight(q.x, q.z, t, wave) + 0.16, c.x / sp, c.z / sp, q.len, 0.13, [0.9, 0.97, 1, 0.7 * a]);
      } else this.quad(this.cp, this.cc, i, 0, 0, -50, 1, 0, 0, 0, [0, 0, 0, 0]);
    }
    this.cmesh.geometry.attributes.position.needsUpdate = true; this.cmesh.geometry.attributes.color.needsUpdate = true;
    return ev;
  }
}
