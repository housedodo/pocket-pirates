import * as THREE from 'three';
import { Builder, darken } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';
import { hash2, mulberry32, fbm, clamp, angleDiff } from './util.js';
import { dreadAtDistance } from './palette.js';
import { makeName } from './lore.js';

export const CELL = 110;
const LOAD_R = 4, UNLOAD_R = 6;

const C = (h) => new THREE.Color(h);
const COL = {
  sand: C('#ecd48f'), wet: C('#d2b676'), g1: C('#62b64f'), g2: C('#3f9a47'), g3: C('#2f7d3d'),
  rock1: C('#8f8b84'), rock2: C('#a7a095'), dirt: C('#c9a46a'), violet: C('#4a2f66'),
  white: C('#ffffff'), wood: C('#9a6a3a'), bark: C('#8a6238'),
};
const WALLS = ['#f4dfb0', '#f0b3a0', '#a9d6ee', '#f2e48a', '#c9e6a8', '#e8c0e0'];
const ROOFS = ['#d2483c', '#3c78c8', '#2f9a8a', '#c86a2a', '#7a4ab0'];

// ---------------------------------------------------------------------------
// Island description (pure function of seed + cell) and terrain height field
// ---------------------------------------------------------------------------
const FORCED = {
  '0,0': null,
  '0,-1': { type: 'harbour', x: 0, z: -100 },
  '1,-1': { type: 'treasure', x: 112, z: -96 },
  '-1,-1': { type: 'jungle', x: -108, z: -112 },
  '-1,0': { type: 'sandbar', x: -92, z: 22 },
};
const TYPE_TABLE = [['sandbar', 0.26], ['jungle', 0.3], ['rocky', 0.18], ['treasure', 0.13], ['harbour', 0.13]];

export function describeCell(cx, cz, seed) {
  const key = `${cx},${cz}`;
  const rng = mulberry32(hash2(cx, cz, seed));
  const forced = Object.prototype.hasOwnProperty.call(FORCED, key) ? FORCED[key] : undefined;
  if (forced === null) return null;
  if (forced === undefined && rng() > 0.62) return null;
  let type = forced ? forced.type : null;
  if (!type) {
    let r = rng();
    for (const [t, w] of TYPE_TABLE) { if (r < w) { type = t; break; } r -= w; }
    type = type || 'jungle';
  }
  const x = forced ? forced.x : cx * CELL + (rng() - 0.5) * 50;
  const z = forced ? forced.z : cz * CELL + (rng() - 0.5) * 50;
  const dread = dreadAtDistance(Math.hypot(x, z));
  const r = { sandbar: 6 + rng() * 5, jungle: 15 + rng() * 8, rocky: 11 + rng() * 6, treasure: 15 + rng() * 5, harbour: 22 + rng() * 5 }[type];
  const H = { sandbar: 0.9, jungle: 4 + rng() * 3, rocky: 6 + rng() * 4, treasure: 3 + rng(), harbour: 1.15 }[type];
  const amp = type === 'sandbar' ? 1.6 : 1;
  const lobes = [(0.08 + rng() * 0.1) * amp, (0.05 + rng() * 0.08) * amp, (0.03 + rng() * 0.05) * amp, rng() * 6.28, rng() * 6.28, rng() * 6.28];
  const nameRng = mulberry32(hash2(cx, cz, seed + 5));
  return { id: key, type, x, z, r, H, lobes, seed: hash2(cx, cz, seed + 1) & 0xffff, name: makeName(nameRng, type, dread), dread };
}

export function shoreR(d, th) {
  const L = d.lobes;
  return d.r * (1 + L[0] * Math.sin(2 * th + L[3]) + L[1] * Math.sin(3 * th + L[4]) + L[2] * Math.sin(5 * th + L[5]));
}

export function terrainHeight(d, lx, lz) {
  const rho = Math.hypot(lx, lz), th = Math.atan2(lz, lx), t = rho / shoreR(d, th);
  if (t > 1) return -(t - 1) * 9;
  const n = fbm((lx + d.x) * 0.1, (lz + d.z) * 0.1, d.seed);
  const p = 1 - Math.pow(t, d.type === 'rocky' ? 1.6 : 2.2);
  switch (d.type) {
    case 'sandbar': return d.H * p * (0.6 + n * 0.8);
    case 'jungle': return d.H * Math.pow(p, 1.35) * (0.55 + n * 0.8);
    case 'rocky': { const ridge = 1 - Math.abs(n * 2 - 1); return d.H * Math.pow(p, 1.1) * (0.35 + ridge * 1.1); }
    case 'treasure': return d.H * Math.pow(p, 1.4) * (0.7 + n * 0.5);
    default: return Math.min(d.H, p * d.H * 3.2); // harbour plateau
  }
}

// ---------------------------------------------------------------------------
// Terrain mesh: polar grid, one flat colour per cell
// ---------------------------------------------------------------------------
function faceColor(d, hc, slope, noise) {
  let c;
  if (hc < 0.12) c = COL.wet;
  else if (hc < 0.55) c = COL.sand;
  else switch (d.type) {
    case 'rocky': c = slope > 0.45 || hc > d.H * 0.5 ? (noise > 0.5 ? COL.rock2 : COL.rock1) : (hc < 1.8 ? COL.dirt : COL.g3); break;
    case 'jungle': c = slope > 0.55 && hc > 2.5 ? COL.rock1 : hc < 1.6 ? (noise > 0.5 ? COL.g1 : COL.g2) : hc < d.H * 0.65 ? (noise > 0.45 ? COL.g2 : COL.g3) : COL.g3; break;
    case 'treasure': c = noise > 0.55 ? COL.g1 : COL.sand; break;
    case 'harbour': c = noise > 0.62 ? COL.g1 : COL.dirt; break;
    default: c = COL.sand;
  }
  return c;
}

function buildTerrain(d, rng) {
  const b = new Builder();
  b.uvFn = (p) => [(p.x + d.x) * 0.12, (p.z + d.z) * 0.12];
  const segs = d.type === 'sandbar' ? 14 : 22;
  const rings = [0, 0.2, 0.4, 0.58, 0.72, 0.84, 0.93, 1.0, 1.1, 1.3];
  const P = rings.map((t) => Array.from({ length: segs }, (_, i) => {
    const th = (i / segs) * Math.PI * 2, R = shoreR(d, th);
    const x = Math.cos(th) * R * t, z = Math.sin(th) * R * t;
    return [x, t === 0 ? terrainHeight(d, 0.001, 0) : terrainHeight(d, x, z), z];
  }));
  const tmp = new THREE.Color(), dk = new THREE.Color();
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % segs;
      const a = P[r][i], bb = P[r][j], c = P[r + 1][j], e = P[r + 1][i];
      const hc = (a[1] + bb[1] + c[1] + e[1]) / 4;
      const dx = c[0] - e[0], dy = c[1] - e[1], dz = c[2] - e[2];
      const slope = clamp(Math.abs(dy) / (Math.hypot(dx, dz) + 0.001) * 0.5, 0, 1);
      const noise = fbm((a[0] + d.x) * 0.25, (a[2] + d.z) * 0.25, d.seed + 9);
      const base = faceColor(d, hc, slope, noise);
      const k = 0.88 + rng() * 0.22;
      tmp.copy(base).multiplyScalar(k);
      darken(tmp, dk);
      if (hc > 0.5 && rng() < 0.12) dk.lerp(COL.violet, 0.8);
      b.tri(a, bb, c, tmp, TILE.white, undefined, dk);
      b.tri(a, c, e, tmp, TILE.white, undefined, dk);
    }
  }
  return b;
}

// ring-shaped, alpha-faded mesh around the shoreline (shallows + foam)
function buildRing(d, t0, t1, y, a0, a1, segs = 28, steps = 3) {
  const pos = [], col = [];
  const vert = (i, s) => {
    const th = (i / segs) * Math.PI * 2, R = shoreR(d, th), t = t0 + (t1 - t0) * (s / steps);
    return [Math.cos(th) * R * t, y, Math.sin(th) * R * t, 1, 1, 1, a0 + (a1 - a0) * (s / steps)];
  };
  const push = (v) => { pos.push(v[0], v[1], v[2]); col.push(v[3], v[4], v[5], v[6]); };
  for (let s = 0; s < steps; s++) for (let i = 0; i < segs; i++) {
    const A = vert(i, s), B = vert(i + 1, s), Cc = vert(i + 1, s + 1), D = vert(i, s + 1);
    push(A); push(B); push(Cc); push(A); push(Cc); push(D);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  return g;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
function spot(d, rng, tMin, tMax, hMin = 0.7, tries = 30) {
  for (let i = 0; i < tries; i++) {
    const th = rng() * Math.PI * 2, t = tMin + rng() * (tMax - tMin);
    const x = Math.cos(th) * shoreR(d, th) * t, z = Math.sin(th) * shoreR(d, th) * t;
    const h = terrainHeight(d, x, z);
    if (h >= hMin) return [x, h, z, th];
  }
  return null;
}

function palm(A, B, D, x, y, z, rng, s = 1) {
  const lean = rng() * Math.PI * 2, lk = 0.18 + rng() * 0.22;
  const segs = 5;
  let px = x, pz = z, py = y - 0.2;
  for (let i = 0; i < segs; i++) {
    const r0 = 0.3 * s * (1 - (i / segs) * 0.45), r1 = 0.3 * s * (1 - ((i + 1) / segs) * 0.45);
    A.cyl(px, py, pz, r0, r1, 0.95 * s, 5, '#ffffff', TILE.bark, false);
    px += Math.cos(lean) * lk * s * (0.4 + i * 0.25);
    pz += Math.sin(lean) * lk * s * (0.4 + i * 0.25);
    py += 0.95 * s;
  }
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.4;
    const dx = Math.cos(a), dz = Math.sin(a), sx = -dz, sz = dx, L = (2.3 + rng() * 0.6) * s;
    const base = [px, py, pz];
    const mid = [px + dx * L * 0.5 + sx * 0.8 * s, py + 0.55 * s, pz + dz * L * 0.5 + sz * 0.8 * s];
    const mid2 = [px + dx * L * 0.5 - sx * 0.8 * s, py + 0.55 * s, pz + dz * L * 0.5 - sz * 0.8 * s];
    const tip = [px + dx * L, py - 0.9 * s, pz + dz * L];
    B.tri(base, mid, tip, '#ffffff', TILE.leaf, [[0.5, 0], [0, 0.45], [0.5, 1]]);
    B.tri(base, tip, mid2, '#ffffff', TILE.leaf, [[0.5, 0], [0.5, 1], [1, 0.45]]);
  }
  // eerie crown: bare, claw-like fronds + a glowing pod
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rng() * 0.6;
    const dx = Math.cos(a), dz = Math.sin(a), L = (1.6 + rng() * 0.8) * s;
    const tip = [px + dx * L, py + 0.3 * s, pz + dz * L], mid = [px + dx * 0.6 * s - dz * 0.12, py + 0.9 * s, pz + dz * 0.6 * s + dx * 0.12];
    D.tri([px, py, pz], mid, tip, '#6a6070', TILE.bone, [[0.5, 0], [0, 0.5], [0.5, 1]]);
  }
  D.blob(px, py - 0.1, pz, 0.28 * s, 0.28 * s, 0.28 * s, '#ffffff', TILE.spore, 0.1, x + z);
}

function house(A, B, x, y, z, ry, rng) {
  const w = 3.2 + rng() * 1.4, dep = 3 + rng() * 1.2, h = 2.1 + rng() * 0.9;
  const wall = pickCol(rng, WALLS), roof = pickCol(rng, ROOFS);
  A.push(x, y, z, ry);
  A.box(0, 0, 0, w, h, dep, wall, TILE.wall, TILE.white);
  A.gable(0, h, 0, w + 0.6, 1.4 + rng() * 0.5, dep + 0.6, roof, TILE.roof, wall);
  A.box(w * 0.28, h + 0.9, -dep * 0.2, 0.55, 1.1, 0.55, '#a89a88', TILE.stone);
  A.box(-w * 0.2, 0, dep / 2 + 0.01, 0.9, 1.5, 0.12, '#7a4e2c', TILE.planks);
  A.pop();
  if (rng() < 0.6) { // flag pole + pennant (only while it is still a happy town)
    B.push(x, y + h + 1.4, z, ry);
    B.box(0, 0, 0, 0.1, 2.2, 0.1, '#6b4a2e', TILE.bark);
    B.tri([0, 2.2, 0], [0, 1.6, 0], [0.9, 1.9, 0.5], pickCol(rng, ROOFS), TILE.flag);
    B.pop();
  }
}
const pickCol = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

function monolith(D, x, y, z, h = 3.2, w = 0.9) {
  D.cyl(x, y - 0.3, z, w, w * 0.62, h, 4, '#ffffff', TILE.void, true);
}

function mushroom(D, x, y, z, s = 1) {
  D.cyl(x, y, z, 0.16 * s, 0.12 * s, 0.8 * s, 5, '#d8d0e0', TILE.bone, false);
  D.blob(x, y + 0.85 * s, z, 0.6 * s, 0.34 * s, 0.6 * s, '#ffffff', TILE.spore, 0.1, x * 3 + z);
}

function chest(b, x, y, z, ry, open) {
  b.push(x, y, z, ry);
  b.box(0, 0, 0, 1.3, 0.6, 0.85, '#9a6a3a', TILE.planks);
  b.box(0, 0.6, 0, 1.36, 0.28, 0.9, '#b27c3c', TILE.planks);
  if (open) b.blob(0, 0.78, 0, 0.55, 0.28, 0.35, '#ffffff', TILE.glow, 0.15, 3);
  else b.box(0.0, 0.34, 0.45, 0.2, 0.22, 0.06, '#ffffff', TILE.glow);
  b.pop();
}

function decorate(d, rng, A, B, D, extra) {
  const T = d.type;
  const palms = (n, t0, t1, hMin = 0.8, s0 = 0.9) => {
    for (let i = 0; i < n; i++) { const p = spot(d, rng, t0, t1, hMin); if (p) palm(A, B, D, p[0], p[1], p[2], rng, s0 + rng() * 0.5); }
  };
  const rocks = (n, t0, t1, r = 1.1) => {
    for (let i = 0; i < n; i++) {
      const p = spot(d, rng, t0, t1, 0.3);
      if (p) A.blob(p[0], p[1] + 0.2, p[2], r * (0.7 + rng() * 0.8), r * (0.6 + rng() * 0.5), r * (0.7 + rng() * 0.8), rng() > 0.5 ? '#cfc9bf' : '#e2dbcc', TILE.stone, 0.25, i + d.seed);
    }
  };
  const cult = (n, tr) => {
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2 + 0.3, x = Math.cos(th) * d.r * tr, z = Math.sin(th) * d.r * tr, h = terrainHeight(d, x, z);
      if (h > 0.4) monolith(D, x, h, z, 2.4 + rng() * 1.6, 0.7);
    }
  };
  const shrooms = (n) => {
    for (let i = 0; i < n; i++) { const p = spot(d, rng, 0.2, 0.9, 0.5); if (p) mushroom(D, p[0], p[1], p[2], 0.8 + rng() * 0.8); }
  };
  const bushes = (n) => {
    for (let i = 0; i < n; i++) { const p = spot(d, rng, 0.2, 0.9, 0.6); if (p) B.blob(p[0], p[1] + 0.35, p[2], 0.9, 0.7, 0.9, rng() > 0.5 ? COL.g2 : COL.g1, TILE.white, 0.2, i); }
  };

  switch (T) {
    case 'sandbar':
      palms(1 + Math.floor(rng() * 3), 0.0, 0.6, 0.45, 0.8);
      rocks(2, 0.2, 0.9, 0.7);
      { const p = spot(d, rng, 0.0, 0.7, 0.3); if (p) { monolith(D, p[0], p[1], p[2], 2.2, 0.6); D.blob(p[0] + 1.5, p[1] + 0.2, p[2], 0.5, 0.3, 0.8, '#ffffff', TILE.bone, 0.2, 1); } }
      break;
    case 'jungle':
      palms(8 + Math.floor(rng() * 5), 0.15, 0.9, 0.9, 1.0);
      bushes(5 + Math.floor(rng() * 4));
      rocks(3, 0.5, 1.0);
      shrooms(5 + Math.floor(rng() * 3));
      cult(5, 0.3);
      break;
    case 'rocky': {
      const n = 3 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const p = spot(d, rng, 0.0, 0.7, 1.5);
        if (p) A.cyl(p[0], p[1] - 0.5, p[2], 1.6 + rng() * 1.6, 0, 3.5 + rng() * 4.5, 5 + (i % 2), rng() > 0.4 ? '#d6d0c6' : '#e8e0d0', TILE.stone);
      }
      rocks(5, 0.3, 1.0, 1.4);
      palms(1, 0.5, 0.9, 0.8, 0.7);
      { const p = spot(d, rng, 0.0, 0.4, 2); if (p) monolith(D, p[0], p[1], p[2], 4.5, 1.1); }
      shrooms(3);
      break;
    }
    case 'treasure': {
      palms(5 + Math.floor(rng() * 3), 0.2, 0.9, 0.7, 0.9);
      bushes(3);
      rocks(3, 0.5, 1.0);
      // ruined arch
      const ap = spot(d, rng, 0.0, 0.25, 1.0, 40) || [0, terrainHeight(d, 0, 0), 0, 0];
      A.push(ap[0], ap[1] - 0.2, ap[2], rng() * 3);
      A.box(-1.5, 0, 0, 0.9, 3.4, 0.9, '#ffffff', TILE.stone);
      A.box(1.5, 0, 0, 0.9, 2.4, 0.9, '#ffffff', TILE.stone);
      A.box(-0.4, 3.2, 0, 3.6, 0.7, 0.9, '#ffffff', TILE.stone);
      A.pop();
      D.push(ap[0], ap[1] - 0.2, ap[2], 0); D.box(0, 0, 0.1, 0.9, 1.2, 0.9, '#ffffff', TILE.void); D.pop();
      // the X
      const mp = spot(d, rng, 0.35, 0.65, 0.7, 60) || [d.r * 0.4, terrainHeight(d, d.r * 0.4, 0), 0, 0];
      d.marker = { x: mp[0], z: mp[2], y: mp[1] };
      shrooms(3);
      cult(4, 0.62);
      for (let i = 0; i < 2; i++) { const p = spot(d, rng, 0.2, 0.9, 0.6); if (p) D.blob(p[0], p[1] + 0.2, p[2], 0.45, 0.28, 0.7, '#ffffff', TILE.bone, 0.25, i); }
      break;
    }
    case 'harbour': {
      const dockTh = rng() * Math.PI * 2;
      const n = 6 + Math.floor(rng() * 3);
      let placed = 0;
      for (let i = 0; i < n * 2 && placed < n; i++) {
        const th = (i / (n * 2)) * Math.PI * 2 + rng() * 0.3;
        if (Math.abs(angleDiff(th, dockTh)) < 0.55) continue;
        const rho = shoreR(d, th) * (0.28 + rng() * 0.38);
        const x = Math.cos(th) * rho, z = Math.sin(th) * rho;
        house(A, B, x, d.H - 0.1, z, Math.atan2(-x, -z), rng);
        placed++;
      }
      // lighthouse opposite the dock
      const lth = dockTh + Math.PI + (rng() - 0.5) * 0.6, lr = shoreR(d, lth) * 0.74;
      const lx = Math.cos(lth) * lr, lz = Math.sin(lth) * lr, ly = d.H - 0.2;
      for (let s = 0; s < 4; s++) A.cyl(lx, ly + s * 2.3, lz, 1.9 - s * 0.16, 1.9 - (s + 1) * 0.16, 2.3, 8, s % 2 ? '#f4f0e6' : '#d8403a', TILE.white, false);
      A.cyl(lx, ly + 9.2, lz, 2.2, 2.2, 0.35, 8, '#5a4a40', TILE.planks);
      A.cyl(lx, ly + 9.55, lz, 1.0, 1.0, 1.3, 6, '#ffffff', TILE.glow, false);
      A.cyl(lx, ly + 10.85, lz, 1.5, 0, 1.2, 6, '#c0382f', TILE.roof);
      extra.beam = { x: lx, y: ly + 10.2, z: lz };
      // dock
      const R = shoreR(d, dockTh), z0 = R * 0.55, z1 = R + 14, zc = (z0 + z1) / 2;
      const ry = Math.PI / 2 - dockTh;
      A.push(0, 0, 0, ry);
      A.box(0, 0.62, zc, 2.8, 0.22, z1 - z0, '#ffffff', TILE.planks);
      for (let z = z0 + 3; z < z1; z += 3.6) for (const sx of [-1.45, 1.45]) A.cyl(sx, -1.8, z, 0.17, 0.15, 2.9, 5, '#ffffff', TILE.bark);
      for (let z = z0 + 6; z < z1 - 2; z += 7) {
        const sx = rng() > 0.5 ? 1 : -1;
        A.cyl(sx * 0.9, 0.84, z, 0.5, 0.5, 0.9, 6, '#ffffff', TILE.planks);
        if (rng() > 0.4) A.box(-sx * 0.8, 0.84, z + 1.4, 1, 0.9, 1, '#ffffff', TILE.planks);
      }
      A.box(1.35, 0.84, z1 - 0.4, 0.14, 1.8, 0.14, '#6b4a2e', TILE.bark);
      A.box(1.35, 2.6, z1 - 0.4, 0.4, 0.4, 0.4, '#ffffff', TILE.glow);
      // moored rowboat
      A.push(3.6, 0, z1 - 4, 0.2);
      A.box(0, -0.15, 0, 1.6, 0.55, 3.6, '#c0763a', TILE.planks);
      A.box(0, 0.38, 0, 1.2, 0.05, 3.0, '#6b4a2e', TILE.planks);
      A.box(0, 0.4, -0.2, 0.1, 2.6, 0.1, '#ffffff', TILE.bark);
      A.pop();
      A.pop();
      // dark mood: a totem in the middle of the square
      D.box(0, d.H - 0.2, 0, 1.4, 1.6, 1.4, '#ffffff', TILE.void);
      D.box(0, d.H + 1.4, 0, 1.1, 1.6, 1.1, '#ffffff', TILE.void);
      D.blob(0, d.H + 3.4, 0, 0.9, 0.9, 0.9, '#ffffff', TILE.spore, 0.1, 5);
      palms(4, 0.2, 0.7, 0.9, 0.9);
      // bunting poles in bright mood
      B.box(0, d.H - 0.2, 0, 0.14, 3.2, 0.14, '#6b4a2e', TILE.bark);
      B.tri([0, d.H + 3.0, 0], [0, d.H + 2.2, 0], [1.4, d.H + 2.6, 0.6], '#d24a3e', TILE.flag);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Island instance
// ---------------------------------------------------------------------------
function meshOf(builder, material) {
  if (builder.empty) return null;
  const m = new THREE.Mesh(builder.geometry(), material);
  m.frustumCulled = true;
  return m;
}

export class Island {
  constructor(d, dug) {
    this.desc = d;
    const rng = mulberry32(d.seed * 7919 + 13);
    this.group = new THREE.Group();
    this.group.position.set(d.x, 0, d.z);
    this.geos = [];
    this.anim = [];

    const A = new Builder(), B = new Builder(), D = new Builder();
    B.doubleSided = true;
    D.darkSame = true;
    const extra = {};
    const terrain = buildTerrain(d, rng);
    decorate(d, rng, A, B, D, extra);

    const add = (builder, mat, order = 0) => {
      const m = meshOf(builder, mat);
      if (m) { m.renderOrder = order; this.group.add(m); this.geos.push(m.geometry); }
      return m;
    };
    add(terrain, mats.terrain);
    add(A, mats.props);
    this.bright = add(B, mats.props);
    this.darkMesh = add(D, mats.props);

    const sh = new THREE.Mesh(buildRing(d, 0.9, 1.65, 0.22, 0.8, 0, 30, 3), mats.shallow);
    sh.renderOrder = 1; this.group.add(sh); this.geos.push(sh.geometry);
    const fm = new THREE.Mesh(buildRing(d, 0.97, 1.07, 0.3, 0.9, 0.0, 30, 2), mats.foam);
    fm.renderOrder = 2; this.group.add(fm); this.geos.push(fm.geometry);

    if (d.type === 'treasure' && d.marker) {
      const m = d.marker;
      const X = new Builder(), Xd = new Builder();
      Xd.darkSame = true;
      for (const rot of [Math.PI / 4, -Math.PI / 4]) {
        X.push(m.x, m.y + 0.05, m.z, rot);
        X.box(0, 0, 0, 0.8, 0.1, 5.6, '#e02820', TILE.white);
        X.pop();
        Xd.push(m.x, m.y + 0.05, m.z, rot);
        Xd.box(0, 0, 0, 0.8, 0.1, 5.6, '#ffffff', TILE.spore);
        Xd.pop();
      }
      X.box(m.x + 2.6, m.y, m.z, 0.14, 4.2, 0.14, '#6b4a2e', TILE.bark);
      X.tri([m.x + 2.6, m.y + 4.2, m.z], [m.x + 2.6, m.y + 3.3, m.z], [m.x + 3.9, m.y + 3.75, m.z], '#e02820', TILE.flag);
      Xd.box(m.x + 2.6, m.y, m.z, 0.14, 4.2, 0.14, '#ffffff', TILE.void);
      this.marker = add(X, mats.props);
      this.markerDark = add(Xd, mats.props);
      const G = new Builder();
      G.blob(m.x, m.y - 0.05, m.z, 1.4, 0.2, 1.1, '#4a3322', TILE.white, 0.2, 2);
      chest(G, m.x, m.y, m.z, 0.5, true);
      this.dugMesh = add(G, mats.props);
      this.setDug(dug);
    }

    if (extra.beam) {
      const g = new THREE.ConeGeometry(2.6, 46, 6, 1, true);
      g.rotateZ(Math.PI / 2); g.translate(23, 0, 0);
      const beam = new THREE.Mesh(g, mats.beam);
      beam.position.set(extra.beam.x, extra.beam.y, extra.beam.z);
      beam.renderOrder = 3;
      this.group.add(beam); this.geos.push(g);
      const ph = rng() * 6;
      this.anim.push((t) => { beam.rotation.y = t * 0.9 + ph; });
    }
  }
  setDug(v) { this.dug = v; this.refresh(); }
  setMood(dark) { this.isDark = dark; this.refresh(); }
  refresh() {
    const dark = !!this.isDark;
    if (this.bright) this.bright.visible = !dark;
    if (this.darkMesh) this.darkMesh.visible = dark;
    if (this.marker) this.marker.visible = !this.dug && !dark;
    if (this.markerDark) this.markerDark.visible = !this.dug && dark;
    if (this.dugMesh) this.dugMesh.visible = !!this.dug;
  }
  dispose() {
    for (const g of this.geos) g.dispose();
  }
}

// ---------------------------------------------------------------------------
// Streaming world
// ---------------------------------------------------------------------------
export class World {
  constructor(scene, seed, dugSet) {
    this.scene = scene;
    this.seed = seed;
    this.dug = dugSet;
    this.descs = new Map();
    this.islands = new Map();
    this.dark = false;
  }
  desc(cx, cz) {
    const k = `${cx},${cz}`;
    if (!this.descs.has(k)) this.descs.set(k, describeCell(cx, cz, this.seed));
    return this.descs.get(k);
  }
  update(px, pz, dark, budget = 2) {
    const ccx = Math.round(px / CELL), ccz = Math.round(pz / CELL);
    let built = 0;
    this.dark = dark;
    for (let dz = -LOAD_R; dz <= LOAD_R && built < budget; dz++) {
      for (let dx = -LOAD_R; dx <= LOAD_R && built < budget; dx++) {
        const cx = ccx + dx, cz = ccz + dz, k = `${cx},${cz}`;
        if (this.islands.has(k)) continue;
        const d = this.desc(cx, cz);
        if (!d) continue;
        const isl = new Island(d, this.dug.has(d.id));
        isl.setMood(dark);
        this.scene.add(isl.group);
        this.islands.set(k, isl);
        built++;
      }
    }
    for (const [k, isl] of this.islands) {
      const [cx, cz] = k.split(',').map(Number);
      if (Math.max(Math.abs(cx - ccx), Math.abs(cz - ccz)) > UNLOAD_R) {
        this.scene.remove(isl.group);
        isl.dispose();
        this.islands.delete(k);
      } else if (isl.mood !== dark) { isl.mood = dark; isl.setMood(dark); }
    }
  }
  tick(t) { for (const isl of this.islands.values()) for (const f of isl.anim) f(t); }

  collide(pos, radius) {
    let hit = false;
    for (const isl of this.islands.values()) {
      const d = isl.desc;
      const dx = pos.x - d.x, dz = pos.z - d.z, dist = Math.hypot(dx, dz);
      if (dist > d.r * 1.8 + radius) continue;
      const lim = shoreR(d, Math.atan2(dz, dx)) * 1.03 + radius;
      if (dist < lim) {
        const k = lim / Math.max(dist, 0.001);
        pos.x = d.x + dx * k; pos.z = d.z + dz * k;
        hit = true;
      }
    }
    return hit;
  }
  /** nearest island whose shore is within `range` of the point */
  nearest(px, pz, range, types) {
    let best = null, bd = Infinity;
    for (const isl of this.islands.values()) {
      const d = isl.desc;
      if (types && !types.includes(d.type)) continue;
      const dx = px - d.x, dz = pz - d.z;
      const edge = Math.hypot(dx, dz) - shoreR(d, Math.atan2(dz, dx));
      if (edge < range && edge < bd) { bd = edge; best = isl; }
    }
    return best;
  }
}
