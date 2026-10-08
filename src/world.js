import * as THREE from 'three';
import { Builder, darken } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';
import { hash2, mulberry32, fbm, clamp, angleDiff } from './util.js';
import { dreadAtDistance } from './palette.js';
import { makeName, makePuzzle } from './lore.js';
import { FRUITS, fruitOf } from './fruit.js';

export const CELL = 110;
const LOAD_R = 4, UNLOAD_R = 6;

const C = (h) => new THREE.Color(h);
const COL = {
  sand: C('#ecd48f'), wet: C('#d2b676'), g1: C('#62b64f'), g2: C('#3f9a47'), g3: C('#2f7d3d'),
  rock1: C('#8f8b84'), rock2: C('#a7a095'), dirt: C('#c9a46a'), violet: C('#4a2f66'),
  white: C('#ffffff'), wood: C('#9a6a3a'), bark: C('#8a6238'),
  ash1: C('#4a4246'), ash2: C('#5e5458'), ember: C('#7a3a2a'), mud: C('#6a5a3a'), mire: C('#4a6a34'),
};
const WALLS = ['#f4dfb0', '#f0b3a0', '#a9d6ee', '#f2e48a', '#c9e6a8', '#e8c0e0'];
const ROOFS = ['#d2483c', '#3c78c8', '#2f9a8a', '#c86a2a', '#7a4ab0'];

// ---------------------------------------------------------------------------
// Island description (pure function of seed + cell) and terrain height field
// ---------------------------------------------------------------------------
const FORCED = {
  '0,0': null,
  '0,-1': { type: 'harbour', x: 0, z: -118, r: 38 },   // Harbour Tama, the big home island
  '1,-1': { type: 'treasure', x: 140, z: -172 },
  '-1,-1': null,                                        // open water around Tama
  '1,0': null,
  '-2,-1': { type: 'jungle', x: -232, z: -128 },
  '-1,0': { type: 'sandbar', x: -112, z: 30 },
};
const TYPE_TABLE = [['sandbar', 0.28], ['jungle', 0.28], ['rocky', 0.2], ['treasure', 0.12], ['harbour', 0.12]];

// The sea is mostly open: island chance follows a slow noise field, so there are archipelagos and long
// lonely stretches. ~30% of cells on average (was 62%), between ~12% and ~52%.
function islandChance(cx, cz, seed) {
  const n = fbm(cx * 0.21 + 3.7, cz * 0.21 - 1.3, seed + 71);
  return 0.12 + 0.4 * smooth01(n);
}
const smooth01 = (x) => { const t = Math.max(0, Math.min(1, (x - 0.25) / 0.5)); return t * t * (3 - 2 * t); };
function rawType(rng) {
  let r = rng();
  for (const [t, w] of TYPE_TABLE) { if (r < w) return t; r -= w; }
  return 'jungle';
}
/** the cell's type before village spacing (same rolls as describeCell) */
function rawCellType(cx, cz, seed) {
  const key = `${cx},${cz}`;
  if (Object.prototype.hasOwnProperty.call(FORCED, key)) return FORCED[key] ? FORCED[key].type : null;
  const rng = mulberry32(hash2(cx, cz, seed));
  if (rng() > islandChance(cx, cz, seed)) return null;
  return rawType(rng);
}
function harbourWins(cx, cz, seed) {
  if (Math.max(Math.abs(cx), Math.abs(cz + 1)) <= 2) return false;           // Tama's waters
  const me = hash2(cx, cz, seed + 616);
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    if (!dx && !dz) continue;
    const t = rawCellType(cx + dx, cz + dz, seed);
    if (t === 'harbour' && hash2(cx + dx, cz + dz, seed + 616) > me) return false;
  }
  return true;
}

export function describeCell(cx, cz, seed) {
  const key = `${cx},${cz}`;
  const rng = mulberry32(hash2(cx, cz, seed));
  const forced = Object.prototype.hasOwnProperty.call(FORCED, key) ? FORCED[key] : undefined;
  if (forced === null) return null;
  const roll = rng();
  if (forced === undefined && roll > islandChance(cx, cz, seed)) return null;
  let type = forced ? forced.type : rawType(rng);
  // villages are rare and never crowd each other: a harbour only stands if it is the strongest claim
  // within two cells (and never right next to Tama); otherwise the island stays wild
  if (!forced && type === 'harbour' && !harbourWins(cx, cz, seed)) type = 'jungle';
  const x = forced ? forced.x : cx * CELL + (rng() - 0.5) * 50;
  const z = forced ? forced.z : cz * CELL + (rng() - 0.5) * 50;
  const dread = dreadAtDistance(Math.hypot(x, z));
  let r = { sandbar: 6 + rng() * 5, jungle: 15 + rng() * 8, rocky: 11 + rng() * 6, treasure: 15 + rng() * 5, harbour: 22 + rng() * 5 }[type];
  if (forced && forced.r) r = forced.r;
  const H = { sandbar: 0.9, jungle: 4 + rng() * 3, rocky: 6 + rng() * 4, treasure: 3 + rng(), harbour: 1.15 }[type];
  const amp = type === 'sandbar' ? 1.6 : 1;
  const lobes = [(0.08 + rng() * 0.1) * amp, (0.05 + rng() * 0.08) * amp, (0.03 + rng() * 0.05) * amp, rng() * 6.28, rng() * 6.28, rng() * 6.28];
  const nameRng = mulberry32(hash2(cx, cz, seed + 5));
  const name = makeName(nameRng, type, dread);
  const desc = { id: key, type, x, z, r, H, lobes, seed: hash2(cx, cz, seed + 1) & 0xffff, name, dread };
  // rarer island kinds, rolled with their own generator so the rest of the world stays where it was
  if (!forced && Math.max(Math.abs(cx), Math.abs(cz)) > 1) {
    const vr = mulberry32(hash2(cx, cz, seed + 4242)), v = vr();
    if (type === 'rocky' && v < 0.3) { desc.type = 'volcano'; desc.H = 9 + vr() * 4; desc.r *= 1.15; }
    else if (type === 'sandbar' && v < 0.35) { desc.type = 'atoll'; desc.r = 15 + vr() * 6; desc.H = 1.1; }
    else if (type === 'jungle' && v < 0.25) { desc.type = 'mangrove'; desc.H = 1.3 + vr() * 0.6; }
    if (desc.type !== type) desc.name = makeName(mulberry32(hash2(cx, cz, seed + 4343)), desc.type, dread);
  }
  if (type === 'harbour') { desc.lively = (hash2(cx, cz, seed + 808) % 1000) / 1000; desc.sleepy = desc.lively < 0.3; }
  if (type === 'treasure') desc.puzzle = makePuzzle(mulberry32(hash2(cx, cz, seed + 31)), name, dread);
  return desc;
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
    case 'volcano': { // a cone with a crater
      const cone = (tt) => d.H * Math.pow(1 - tt, 1.15) * (0.92 + n * 0.16);
      return t < 0.22 ? cone(0.22) - (0.22 - t) / 0.22 * d.H * 0.42 : cone(t);
    }
    case 'atoll': { // a ring of sand around a lagoon
      if (t < 0.55) return -0.9 + t * 0.6;
      return d.H * Math.sin(((t - 0.55) / 0.45) * Math.PI) * (0.7 + n * 0.6);
    }
    case 'mangrove': return d.H * Math.pow(p, 0.6) * (0.6 + n * 0.6);
    default: return Math.min(d.H, p * d.H * 3.2); // harbour plateau
  }
}

// ---------------------------------------------------------------------------
// Terrain mesh: polar grid, one flat colour per cell
// ---------------------------------------------------------------------------
function faceColor(d, hc, slope, noise) {
  let c;
  if (d.type === 'volcano') return hc < 0.55 ? COL.ash1 : hc > d.H * 0.62 ? (noise > 0.5 ? COL.ember : COL.ash1) : (noise > 0.55 ? COL.ash2 : COL.ash1);
  if (d.type === 'mangrove') return hc < 0.4 ? COL.mud : noise > 0.55 ? COL.mire : COL.mud;
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
  A.box(-w * 0.2, 0, dep / 2 + 0.01, 0.95, 1.8, 0.12, '#7a4e2c', TILE.planks);
  A.box(-w * 0.2, -0.05, dep / 2 + 0.35, 1.2, 0.18, 0.7, '#8a8070', TILE.stone);            // doorstep
  for (const sx of [-1, 1]) A.box(sx * (w / 2 - 0.35), 0.95, dep / 2 + 0.03, 0.5, 0.78, 0.05, '#4a7a6a', TILE.planks); // shutters
  A.box(-w / 2 + 0.3, 0.9, dep / 2 + 0.12, 0.9, 0.18, 0.28, '#6b4a2e', TILE.planks);          // window box
  A.blob(-w / 2 + 0.3, 1.12, dep / 2 + 0.12, 0.38, 0.14, 0.12, '#4a8a38', TILE.white, 0.3, 3);
  if (rng() < 0.7) barrel(A, w * 0.42, 0, dep / 2 + 0.55, 0.9);
  if (rng() < 0.5) crateBox(A, -w * 0.46, 0, dep / 2 + 0.6, rng() * 3, 0.8);
  A.box(w / 2 + 0.02, 0.2, -dep * 0.25, 0.05, h - 0.2, 0.18, '#5a6a6a', TILE.stone);            // drainpipe
  A.blob(w * 0.12, h + 1.15, dep * 0.1, 0.45, 0.05, 0.4, '#8a5a3a', TILE.roof, 0.25, 6);       // patched tiles
  A.blob(-w * 0.3, h + 0.7, -dep * 0.12, 0.5, 0.06, 0.4, '#6a8a4a', TILE.white, 0.3, 8);       // moss
  A.pop();
  if (rng() < 0.6) { // flag pole + pennant (only while it is still a happy town)
    B.push(x, y + h + 1.4, z, ry);
    B.box(0, 0, 0, 0.1, 2.2, 0.1, '#6b4a2e', TILE.bark);
    B.tri([0, 2.2, 0], [0, 1.6, 0], [0.9, 1.9, 0.5], pickCol(rng, ROOFS), TILE.flag);
    B.pop();
  }
}
const pickCol = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

// ---- villagers: six low-poly looks. Feet at y, facing +z (local), about 1.6 tall.
// people are a bit smaller than real life next to the chunky houses: an adult is ~1.4 units, a door ~1.8
export const VSCALE = 0.74;
export const VILLAGERS = ['fisher', 'market', 'oldsalt', 'child', 'docker', 'harbourmaster'];
export function villager(b, x, y, z, ry, rng, kind = pickCol(rng, VILLAGERS)) {
  const skin = pickCol(rng, SKINS), shirt = pickCol(rng, SHIRTS);
  b.push(x, y, z, ry, (kind === 'child' ? 0.68 : 1) * VSCALE);
  const legs = (col) => { for (const sx of [-0.12, 0.12]) b.box(sx, 0, 0, 0.16, 0.55, 0.18, col, TILE.white); };
  const arms = (col, lift = 0) => { for (const sx of [-1, 1]) { b.push(sx * 0.32, 1.12, 0, 0, 1, 1, 1, lift, sx * 0.18); b.box(0, -0.5, 0, 0.13, 0.5, 0.14, col, TILE.white); b.pop(); } };
  const head = (r = 0.2) => b.blob(0, 1.38, 0, r, r * 1.1, r, skin, TILE.white, 0.05, x * 7 + z);
  switch (kind) {
    case 'fisher': // striped shirt, rolled trousers, a wide straw hat and a rod
      legs('#4a5a7a');
      b.cyl(0, 0.55, 0, 0.27, 0.24, 0.3, 6, '#f4f0e6', TILE.white, false);
      b.cyl(0, 0.85, 0, 0.24, 0.22, 0.3, 6, '#3c78c8', TILE.white, true);
      arms(skin); head();
      b.cyl(0, 1.5, 0, 0.5, 0.48, 0.05, 7, '#e8d08a', TILE.rope, true);
      b.cyl(0, 1.55, 0, 0.22, 0.12, 0.18, 6, '#d8c078', TILE.rope, true);
      b.push(0.34, 0.75, 0.15, 0, 1, 1, 1, -0.9, -0.15); b.cyl(0, 0, 0, 0.03, 0.02, 2.2, 3, '#6b4a2e', TILE.bark, false); b.pop();
      break;
    case 'market': // long skirt, headscarf, a basket of fruit on her head
      b.cyl(0, 0, 0, 0.42, 0.24, 0.8, 7, shirt, TILE.white, false);
      b.cyl(0, 0.8, 0, 0.24, 0.2, 0.42, 6, '#f4ecd8', TILE.white, true);
      arms(skin, -0.3); head();
      b.blob(0, 1.46, -0.04, 0.23, 0.19, 0.24, pickCol(rng, ROOFS), TILE.white, 0.06, 2);
      b.cyl(0, 1.62, 0, 0.32, 0.36, 0.22, 7, '#a8783c', TILE.rope, true);
      for (let i = 0; i < 3; i++) b.blob(-0.12 + i * 0.12, 1.88, (i % 2) * 0.08 - 0.04, 0.1, 0.1, 0.1, pickCol(rng, ['#f0c030', '#e85a3a', '#5ec45a']), TILE.white, 0.05, i);
      break;
    case 'oldsalt': // long dark coat, white beard, tricorn hat, a cane, a little stooped
      legs('#3a3036');
      b.push(0, 0, 0, 0, 1, 1, 1, 0.12);
      b.cyl(0, 0.35, 0, 0.3, 0.25, 0.9, 6, '#2c3448', TILE.white, true);
      for (const yy of [0.75, 0.95]) b.box(0.08, yy, 0.27, 0.05, 0.05, 0.03, '#ffffff', TILE.glow);
      arms('#2c3448'); head(0.19);
      b.blob(0, 1.24, 0.12, 0.15, 0.16, 0.08, '#e8e4dc', TILE.white, 0.1, 5);
      b.cyl(0, 1.52, 0, 0.36, 0.3, 0.16, 3, '#1e1a1e', TILE.white, true);
      b.pop();
      b.cyl(0.42, 0, 0.12, 0.03, 0.03, 1.0, 3, '#6b4a2e', TILE.bark, false);
      break;
    case 'child': // big head, bright shirt, messy hair (drawn at 0.68 scale)
      legs('#8a6a4a');
      b.cyl(0, 0.55, 0, 0.26, 0.22, 0.6, 6, shirt, TILE.white, true);
      arms(skin, -0.5);
      b.blob(0, 1.42, 0, 0.27, 0.29, 0.27, skin, TILE.white, 0.05, 9);
      b.blob(0, 1.6, -0.05, 0.26, 0.14, 0.25, pickCol(rng, ['#3a2210', '#8a5a2a', '#e0c070']), TILE.white, 0.35, 10);
      break;
    case 'docker': // broad, sleeves rolled, red bandana, a crate on the shoulder
      legs('#5a4a3a');
      b.cyl(0, 0.55, 0, 0.34, 0.28, 0.62, 6, '#c8b090', TILE.white, true);
      arms(skin, -1.2); head();
      b.blob(0, 1.5, 0, 0.21, 0.1, 0.21, '#c83a2a', TILE.white, 0.05, 3);
      b.push(0.36, 1.2, 0, 0.3); b.box(0, 0, 0, 0.55, 0.45, 0.5, '#a07040', TILE.planks); b.pop();
      break;
    default: // harbourmaster: blue coat with brass buttons, peaked cap, the harbour ledger under one arm
      legs('#2a2a3a');
      b.cyl(0, 0.5, 0, 0.3, 0.26, 0.75, 6, '#2a4a7a', TILE.white, true);
      for (const yy of [0.7, 0.9, 1.1]) b.box(0, yy, 0.27, 0.06, 0.06, 0.03, '#ffffff', TILE.glow);
      arms('#2a4a7a'); head();
      b.cyl(0, 1.52, 0, 0.22, 0.24, 0.14, 7, '#1e2a3e', TILE.white, true);
      b.box(0, 1.52, 0.2, 0.36, 0.04, 0.16, '#141a26', TILE.white);
      b.box(-0.38, 0.85, 0.06, 0.08, 0.36, 0.28, '#7a2a20', TILE.planks);
  }
  b.pop();
}


// ---- village life by the hour. Each harbour has crowds for dawn, day, evening, night (and siesta for sleepy
// villages); only the current one is shown. `lively` (0..1, from the seed) scales how many people there are.
export function villagePhase(hour, sleepy) {
  if (hour >= 22 || hour < 5) return 'night';
  if (hour < 8) return 'dawn';
  if (hour < 18) return sleepy && hour >= 12 && hour < 15 ? 'siesta' : 'day';
  return 'evening';
}
function marketStall(b, x, y, z, ry, rng) {
  b.push(x, y, z, ry);
  for (const [sx, sz] of [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]]) b.box(sx, 0, sz, 0.1, 1.8, 0.1, '#6b4a2e', TILE.bark);
  b.box(0, 0, 0.45, 1.9, 0.75, 0.5, '#9a6a3a', TILE.planks);
  const awn = pickCol(rng, ROOFS);
  b.push(0, 1.85, 0, 0, 1, 1, 1, 0.25); b.box(0, 0, 0, 2.1, 0.08, 1.5, awn, TILE.flag); b.pop();
  for (let i = 0; i < 5; i++) b.blob(-0.7 + i * 0.35, 0.86, 0.45 + (i % 2) * 0.1, 0.13, 0.11, 0.13, pickCol(rng, ['#f0c030', '#e85a3a', '#5ec45a', '#8a5a30', '#f4a040']), TILE.white, 0.05, i);
  b.pop();
}
function hammockSleeper(b, x, y, z, ry, rng) {
  b.push(x, y, z, ry);
  for (const sx of [-1.4, 1.4]) b.cyl(sx, 0, 0, 0.12, 0.1, 1.6, 4, '#6b4a2e', TILE.bark);
  b.quad([-1.3, 1.1, -0.35], [1.3, 1.1, -0.35], [1.0, 0.75, 0.35], [-1.0, 0.75, 0.35], '#d8b878', TILE.rope);
  b.push(0, 0.95, 0, Math.PI / 2, 1, 1, 1, 0, Math.PI / 2 - 0.1); villager(b, 0, -0.75, 0, 0, rng, pickCol(rng, ['fisher', 'oldsalt', 'docker'])); b.pop();
  b.pop();
}
function lanternMan(b, x, y, z, ry, rng) {
  villager(b, x, y, z, ry, rng, 'oldsalt');
  b.push(x, y, z, ry); b.box(0.36, 0.55, 0.12, 0.05, 0.3, 0.05, '#3a3036', TILE.stone); b.box(0.36, 0.36, 0.12, 0.2, 0.24, 0.2, '#ffffff', TILE.glow); b.pop();
}
function smoke(b, x, y, z, n = 4) { for (let i = 0; i < n; i++) b.blob(x + i * 0.3, y + i * 0.8, z + Math.sin(i) * 0.3, 0.3 + i * 0.16, 0.25 + i * 0.12, 0.3 + i * 0.16, i < 2 ? '#a8a4a6' : '#d0ccce', TILE.white, 0.35, i + x); }

// ---- house kinds (all face +z local, base at y)
export const HOUSES = ['cottage', 'townhouse', 'stilt', 'round', 'tavern', 'warehouse', 'belltower'];
export function houseKind(A, B, x, y, z, ry, rng, kind) {
  const wall = pickCol(rng, WALLS), roof = pickCol(rng, ROOFS);
  if (kind === 'cottage') return house(A, B, x, y, z, ry, rng);
  A.push(x, y, z, ry);
  switch (kind) {
    case 'townhouse': { // two storeys, a trim band, a balcony with railings
      const w = 3.2, dep = 3, h = 4.3;
      A.box(0, 0, 0, w, h, dep, wall, TILE.wall, TILE.white);
      A.box(0, 2.1, 0, w + 0.1, 0.18, dep + 0.1, '#7a5a3a', TILE.planks);
      A.gable(0, h, 0, w + 0.5, 1.5, dep + 0.5, roof, TILE.roof, wall);
      A.box(0, 2.15, dep / 2 + 0.45, w * 0.7, 0.12, 0.9, '#6b4a2e', TILE.planks);
      for (let i = 0; i < 5; i++) A.box(-w * 0.33 + i * w * 0.165, 2.27, dep / 2 + 0.86, 0.07, 0.55, 0.07, '#5a3a20', TILE.bark);
      A.box(0, 2.78, dep / 2 + 0.86, w * 0.7, 0.07, 0.07, '#5a3a20', TILE.bark);
      A.box(0.6, 0, dep / 2 + 0.01, 0.9, 1.85, 0.1, '#5a3a20', TILE.planks);
      A.box(-w * 0.25, h + 0.8, 0, 0.5, 1.2, 0.5, '#a89a88', TILE.stone);
      break;
    }
    case 'stilt': { // a fisher's house up on posts, with a ladder and a net
      for (const [sx, sz] of [[-1.3, -1.1], [1.3, -1.1], [-1.3, 1.1], [1.3, 1.1]]) A.cyl(sx, -1.0, sz, 0.12, 0.1, 2.3, 4, '#6b4a2e', TILE.bark);
      A.box(0, 1.2, 0.3, 3.2, 0.16, 3.4, '#8a6238', TILE.planks);
      A.box(0, 1.36, 0, 2.6, 1.8, 2.4, wall, TILE.wall, TILE.white);
      A.gable(0, 3.16, 0, 3.0, 1.2, 2.8, roof, TILE.roof, wall);
      for (const sx of [-0.3, 0.3]) A.box(sx, -0.1, 1.95, 0.08, 1.45, 0.08, '#5a3a20', TILE.bark);
      for (let i = 0; i < 4; i++) A.box(0, 0.1 + i * 0.33, 1.95, 0.66, 0.06, 0.06, '#5a3a20', TILE.bark);
      A.quad([1.6, 1.36, 0.8], [1.6, 1.36, -0.8], [1.6, 0.2, -0.6], [1.6, 0.3, 0.7], '#c8c0a0', TILE.rope);
      break;
    }
    case 'round': { // a round hut with a thatched cone roof
      A.cyl(0, 0, 0, 1.7, 1.6, 1.8, 8, '#d8b888', TILE.wall, false);
      A.cyl(0, 1.75, 0, 2.2, 0, 1.9, 8, '#c8a860', TILE.rope, false);
      A.cyl(0, 3.5, 0, 0.18, 0.06, 0.5, 4, '#6b4a2e', TILE.bark, false);
      A.box(0, 0, 1.58, 0.8, 1.35, 0.12, '#5a3a20', TILE.planks);
      break;
    }
    case 'tavern': { // big, warm, a hanging sign, barrels and lanterns by the door
      const w = 5.2, dep = 3.8, h = 2.7;
      A.box(0, 0, 0, w, h, dep, wall, TILE.wall, TILE.white);
      A.gable(0, h, 0, w + 0.6, 1.7, dep + 0.6, '#8a3a2a', TILE.roof, wall);
      A.box(0, 0, dep / 2 + 0.01, 1.2, 1.8, 0.12, '#5a3a20', TILE.planks);
      A.box(w / 2 + 0.2, 1.4, dep / 2 - 0.2, 0.1, 1.6, 0.1, '#5a3a20', TILE.bark);
      A.box(w / 2 + 0.7, 2.6, dep / 2 - 0.2, 1.0, 0.08, 0.08, '#5a3a20', TILE.bark);
      A.box(w / 2 + 0.75, 1.95, dep / 2 - 0.2, 0.8, 0.6, 0.08, '#e8c060', TILE.flag);
      for (const sx of [-0.9, 0.9]) A.box(sx, 1.9, dep / 2 + 0.1, 0.25, 0.3, 0.25, '#ffffff', TILE.glow);
      barrel(A, -w / 2 + 0.6, 0, dep / 2 + 0.6, 1); barrel(A, -w / 2 + 1.4, 0, dep / 2 + 0.7, 0.9); barrel(A, -w / 2 + 1.0, 0.85, dep / 2 + 0.65, 0.8);
      A.box(w * 0.2, 0, dep / 2 + 0.8, 1.6, 0.45, 0.4, '#6b4a2e', TILE.planks);
      A.box(-w * 0.3, h + 1.0, -dep * 0.2, 0.6, 1.3, 0.6, '#a89a88', TILE.stone);
      break;
    }
    case 'warehouse': { // long and low, a wide door, crates stacked outside
      const w = 3.2, dep = 6.2, h = 2.6;
      A.box(0, 0, 0, w, h, dep, '#b89a78', TILE.planks, TILE.planks);
      A.gable(0, h, 0, w + 0.5, 0.9, dep + 0.4, '#6a5a4a', TILE.roof, '#9a7a58');
      A.box(0, 0, dep / 2 + 0.01, 1.9, 2.0, 0.12, '#3a2a1c', TILE.planks);
      crateBox(A, w / 2 + 0.6, 0, dep / 2 - 0.5, 0.3); crateBox(A, w / 2 + 0.6, 0.85, dep / 2 - 0.4, 1.1, 0.8); crateBox(A, w / 2 + 0.7, 0, dep / 2 - 1.6, 0.8);
      break;
    }
    default: { // belltower: a stone tower, an open belfry and a bell
      A.box(0, 0, 0, 1.8, 5.2, 1.8, '#d8d0c0', TILE.stone, TILE.stone);
      for (const [sx, sz] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) A.box(sx, 5.2, sz, 0.25, 1.4, 0.25, '#c8c0b0', TILE.stone);
      A.cyl(0, 6.6, 0, 1.45, 0, 1.6, 4, roof, TILE.roof, false);
      A.cyl(0, 5.45, 0, 0.42, 0.22, 0.75, 7, '#c8a040', TILE.glow, true);
      A.box(0, 0, 0.91, 0.8, 1.5, 0.1, '#5a3a20', TILE.planks);
    }
  }
  A.pop();
}



// ---- grubby little clutter: the stuff that makes a place look lived-in (and a bit dirty)
function barrel(b, x, y, z, s = 1, col = '#8a5a30') {
  b.cyl(x, y, z, 0.42 * s, 0.34 * s, 0.9 * s, 6, col, TILE.planks, true);
  b.cyl(x, y + 0.2 * s, z, 0.45 * s, 0.45 * s, 0.07 * s, 6, '#3a2a1c', TILE.stone, false);
  b.cyl(x, y + 0.62 * s, z, 0.44 * s, 0.44 * s, 0.07 * s, 6, '#3a2a1c', TILE.stone, false);
}
function crateBox(b, x, y, z, ry, s = 1, col = '#a07040') {
  b.push(x, y, z, ry);
  b.box(0, 0, 0, 0.9 * s, 0.8 * s, 0.9 * s, col, TILE.planks);
  b.box(0, 0.8 * s, 0, 0.96 * s, 0.07 * s, 0.96 * s, '#5a3a20', TILE.planks);
  b.pop();
}
function ropeCoil(b, x, y, z, s = 1) {
  b.cyl(x, y, z, 0.5 * s, 0.46 * s, 0.14 * s, 7, '#b8955a', TILE.rope, true);
  b.cyl(x, y + 0.14 * s, z, 0.38 * s, 0.34 * s, 0.14 * s, 7, '#a88548', TILE.rope, true);
}
function fishRack(b, x, y, z, ry) {
  b.push(x, y, z, ry);
  for (const sx of [-1.1, 1.1]) b.box(sx, 0, 0, 0.12, 1.6, 0.12, '#5a3e24', TILE.bark);
  b.box(0, 1.5, 0, 2.5, 0.08, 0.1, '#6b4a2e', TILE.bark);
  for (let i = 0; i < 4; i++) b.box(-0.8 + i * 0.52, 0.85, 0, 0.14, 0.62, 0.05, i % 2 ? '#8a9aa8' : '#a8b4bc', TILE.bone);
  b.pop();
}
function washing(b, x, y, z, ry, rng) {
  b.push(x, y, z, ry);
  for (const sx of [-1.5, 1.5]) b.box(sx, 0, 0, 0.1, 1.9, 0.1, '#5a3e24', TILE.bark);
  b.box(0, 1.75, 0, 3.1, 0.04, 0.04, '#d8d0b0', TILE.rope);
  for (let i = 0; i < 3; i++) b.quad([-1.1 + i, 1.74, 0], [-0.6 + i, 1.74, 0], [-0.6 + i, 1.05, 0.02], [-1.1 + i, 1.05 - rng() * 0.15, 0.02], pickCol(rng, SHIRTS), TILE.flag);
  b.pop();
}
function fence(b, x, y, z, ry, n = 4) {
  b.push(x, y, z, ry);
  for (let i = 0; i < n; i++) b.box(i * 0.9, 0, 0, 0.14, 0.8 - (i % 2) * 0.12, 0.14, '#7a5a3a', TILE.planks);
  b.box((n - 1) * 0.45, 0.5, 0, (n - 1) * 0.9 + 0.2, 0.08, 0.06, '#6a4a2c', TILE.planks);
  b.pop();
}
function beachedBoat(b, x, y, z, ry) {
  b.push(x, y, z, ry, 1, 1, 1, 0, 0.18);
  b.box(0, 0, 0, 1.5, 0.5, 3.6, '#c8d0c4', TILE.planks);
  b.box(0, 0.45, 0, 1.15, 0.05, 3.1, '#4a3a2a', TILE.planks);
  b.box(0.2, 0.2, 0.6, 0.1, 0.5, 1.2, '#c8c0a0', TILE.bone);
  b.pop();
}
function driftwood(b, x, y, z, ry, len = 2.2) {
  b.push(x, y + 0.15, z, ry, 1, 1, 1, 0, Math.PI / 2);
  b.cyl(0, -len / 2, 0, 0.16, 0.12, len, 4, '#c8b894', TILE.bark, true);
  b.pop();
}
function shell(b, x, y, z, rng) {
  b.blob(x, y + 0.08, z, 0.17, 0.1, 0.17, rng() > 0.5 ? '#ffd8c4' : '#f4ecd8', TILE.white, 0.15, x);
}
function fern(b, x, y, z, rng) {
  for (let i = 0; i < 4; i++) {
    const a = i * 1.57 + rng() * 0.5;
    b.tri([x, y + 0.05, z], [x + Math.cos(a + 0.35) * 0.9, y + 0.5, z + Math.sin(a + 0.35) * 0.9], [x + Math.cos(a - 0.35) * 0.9, y + 0.5, z + Math.sin(a - 0.35) * 0.9], '#4a8a38', TILE.white);
  }
}
function flowers(b, x, y, z, rng) {
  const col = pickCol(rng, ['#f0d040', '#e85a8a', '#f4f0e0', '#c078e0']);
  for (let i = 0; i < 4; i++) {
    const px = x + (rng() - 0.5) * 1.3, pz = z + (rng() - 0.5) * 1.3;
    b.cyl(px, y, pz, 0.025, 0.025, 0.3, 3, '#3a7a2c', TILE.white, false);
    b.blob(px, y + 0.34, pz, 0.1, 0.07, 0.1, col, TILE.white, 0.1, i);
  }
}
function stump(b, x, y, z) {
  b.cyl(x, y - 0.05, z, 0.38, 0.32, 0.5, 5, '#6a4a30', TILE.bark, true, '#c8a070');
}
function fallenLog(b, x, y, z, ry) {
  b.push(x, y + 0.28, z, ry, 1, 1, 1, 0, Math.PI / 2);
  b.cyl(0, -1.4, 0, 0.3, 0.26, 2.8, 5, '#6a4a30', TILE.bark, true, '#c8a070');
  b.pop();
  b.blob(x + Math.cos(ry) * 0.2, y + 0.42, z + 0.3, 0.45, 0.14, 0.3, '#5a8a3a', TILE.white, 0.2, 2); // moss
}
function mossRock(b, x, y, z, r, rng) {
  b.blob(x, y + 0.2, z, r, r * 0.7, r, '#cfc9bf', TILE.stone, 0.25, x + z);
  b.blob(x, y + r * 0.62, z, r * 0.65, r * 0.2, r * 0.65, '#6a9a4a', TILE.white, 0.3, 4);
}

function monolith(D, x, y, z, h = 3.2, w = 0.9) {
  D.cyl(x, y - 0.3, z, w, w * 0.62, h, 4, '#ffffff', TILE.void, true);
}

function mushroom(D, x, y, z, s = 1) {
  D.cyl(x, y, z, 0.16 * s, 0.12 * s, 0.8 * s, 5, '#d8d0e0', TILE.bone, false);
  D.blob(x, y + 0.85 * s, z, 0.6 * s, 0.34 * s, 0.6 * s, '#ffffff', TILE.spore, 0.1, x * 3 + z);
}

const SHIRTS = ['#d24a3e', '#3c78c8', '#e8c040', '#2f9a8a', '#c86a2a', '#9a6ad0', '#f0f0e8'];
const SKINS = ['#e8b88a', '#c98e64', '#8a5a3a', '#f2cfa8'];
function person(b, x, y, z, rng, col, hat = true) {
  b.push(x, y, z, 0, VSCALE); x = 0; y = 0; z = 0;
  b.cyl(x, y, z, 0.3, 0.2, 0.95, 5, col || pickCol(rng, SHIRTS), TILE.white, true);
  b.blob(x, y + 1.15, z, 0.2, 0.22, 0.2, pickCol(rng, SKINS), TILE.white, 0.05, x + z);
  if (hat) b.cyl(x, y + 1.3, z, 0.34, 0.1, 0.2, 5, rng() > 0.5 ? '#6b4a2e' : '#f0e4c0', TILE.white, true);
  b.pop();
}

function chest(b, x, y, z, ry, open) {
  b.push(x, y, z, ry);
  b.box(0, 0, 0, 1.3, 0.6, 0.85, '#9a6a3a', TILE.planks);
  b.box(0, 0.6, 0, 1.36, 0.28, 0.9, '#b27c3c', TILE.planks);
  if (open) b.blob(0, 0.78, 0, 0.55, 0.28, 0.35, '#ffffff', TILE.glow, 0.15, 3);
  else b.box(0.0, 0.34, 0.45, 0.2, 0.22, 0.06, '#ffffff', TILE.glow);
  b.pop();
}

// Only some islands get a lighthouse: the home harbour, ~1 in 3 other harbours, the odd lonely rock.
export function hasLighthouse(d) {
  if (d.id === '0,-1') return true;
  const r = (hash2(d.seed, 17, 5) % 1000) / 1000;
  return d.type === 'harbour' ? r < 0.33 : d.type === 'rocky' ? r < 0.22 : false;
}
function lighthouse(A, extra, lx, ly, lz, tall = 1) {
  for (let s = 0; s < 4; s++) A.cyl(lx, ly + s * 2.3 * tall, lz, 1.9 - s * 0.16, 1.9 - (s + 1) * 0.16, 2.3 * tall, 8, s % 2 ? '#f4f0e6' : '#d8403a', TILE.white, false);
  A.cyl(lx, ly + 9.2 * tall, lz, 2.2, 2.2, 0.35, 8, '#5a4a40', TILE.planks);
  extra.lamp = { x: lx, y: ly + 9.55 * tall, z: lz };
  A.cyl(lx, ly + 10.85 * tall, lz, 1.5, 0, 1.2, 6, '#c0382f', TILE.roof);
  extra.beam = { x: lx, y: ly + 10.2 * tall, z: lz };
}

// The dark hut (a storyline location): crooked, black-tarred, one sick purple window, bones on poles.
// Lives in builder A so it looks the same in both moods.
function darkHut(d, rng, A) {
  let th = (hash2(d.seed, 3, 9) % 628) / 100, x = 0, z = 0, h = 0;
  for (let k = 0; k < 12; k++) {
    const t = 0.55, xx = Math.cos(th) * shoreR(d, th) * t, zz = Math.sin(th) * shoreR(d, th) * t, hh = terrainHeight(d, xx, zz);
    if (hh > 0.6) { x = xx; z = zz; h = hh; break; }
    th += 0.5;
  }
  d.hutPos = { x, z, y: h, th };
  const ry = Math.atan2(Math.cos(th), Math.sin(th));   // door looks out to sea
  A.push(x, h - 0.2, z, ry, 1, 1, 1, 0.04, -0.06);      // a little crooked
  for (const [sx, sz] of [[-1.4, -1.2], [1.4, -1.2], [-1.4, 1.2], [1.4, 1.2]]) A.cyl(sx, -0.6, sz, 0.14, 0.12, 1.4, 4, '#1c1418', TILE.bark); // stilts
  A.box(0, 0.6, 0, 3.4, 2.4, 3.0, '#4a3c42', TILE.planks, TILE.planks, '#2a2026');
  A.box(0, 0.6, 1.55, 3.6, 0.2, 0.3, '#1a1216', TILE.planks);                                       // porch board
  A.push(0, 3.0, 0, 0, 1, 1, 1, 0, 0.08); A.gable(0, 0, 0, 4.0, 1.9, 3.6, '#2c2228', TILE.roof, '#3a2e34'); A.pop();
  A.box(-0.5, 0.65, 1.52, 0.85, 1.6, 0.08, '#0c080a', TILE.white);                                  // door, open a crack
  A.box(0.95, 1.5, 1.52, 0.55, 0.5, 0.06, '#ffffff', TILE.spore);                                   // the window glows
  A.box(0.95, 1.5, -1.52, 0.4, 0.4, 0.06, '#ffffff', TILE.spore);
  A.box(-1.0, 3.7, -0.5, 0.35, 1.4, 0.35, '#3a3036', TILE.stone);                                   // bent chimney
  A.pop();
  // bones and a skull on poles, a dead tree, a ring of pale stones
  for (let i = 0; i < 3; i++) {
    const a = th + (i - 1) * 0.6, px = x + Math.cos(a) * 4.5, pz = z + Math.sin(a) * 4.5, ph = Math.max(0.3, terrainHeight(d, px, pz));
    A.box(px, ph - 0.2, pz, 0.12, 2.2, 0.12, '#2a2026', TILE.bark);
    A.blob(px, ph + 2.15, pz, 0.28, 0.3, 0.28, '#e8e0d0', TILE.bone, 0.08, i + 4);
    A.box(px, ph + 1.4, pz, 0.7, 0.08, 0.08, '#d8d0c0', TILE.bone);
  }
  { const a = th + 2.2, px = x + Math.cos(a) * 5, pz = z + Math.sin(a) * 5, ph = Math.max(0.3, terrainHeight(d, px, pz));
    A.cyl(px, ph - 0.2, pz, 0.3, 0.12, 4.2, 5, '#2a2024', TILE.bark, false);
    for (let k = 0; k < 4; k++) { A.push(px, ph + 2.5 + k * 0.4, pz, k * 1.7, 1, 1, 1, 0, 1.0); A.cyl(0, 0, 0, 0.08, 0.02, 1.6, 3, '#2a2024', TILE.bark, false); A.pop(); } }
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, px = x + Math.cos(a) * 3.2 + Math.cos(th) * 1.8, pz = z + Math.sin(a) * 3.2 + Math.sin(th) * 1.8; A.blob(px, Math.max(0.2, terrainHeight(d, px, pz)) + 0.1, pz, 0.3, 0.22, 0.3, '#cfc8d8', TILE.stone, 0.2, i); }
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

  // a few bright fruit on the ground/in the bushes, so you can tell what an island grows
  if (T === 'jungle' || T === 'sandbar') {
    const fc = FRUITS[fruitOf(d)].color, nf = T === 'jungle' ? 7 : 3;
    for (let i = 0; i < nf; i++) { const p = spot(d, rng, 0.15, 0.85, 0.5); if (p) B.blob(p[0], p[1] + 0.4, p[2], 0.34, 0.34, 0.34, fc, TILE.white, 0.05, i); }
  }
  const scatter = (n, t0, t1, hMin, fn) => { for (let i = 0; i < n; i++) { const p = spot(d, rng, t0, t1, hMin); if (p) fn(p); } };
  if (T === 'jungle') {
    scatter(7, 0.2, 0.85, 0.7, (p) => fern(A, p[0], p[1], p[2], rng));
    scatter(4, 0.25, 0.85, 0.7, (p) => flowers(B, p[0], p[1], p[2], rng));
    scatter(2, 0.3, 0.8, 0.7, (p) => fallenLog(A, p[0], p[1], p[2], rng() * 3));
    scatter(2, 0.3, 0.8, 0.7, (p) => stump(A, p[0], p[1], p[2]));
    scatter(2, 0.4, 0.9, 0.5, (p) => mossRock(A, p[0], p[1], p[2], 0.7 + rng() * 0.5, rng));
  }
  if (T === 'sandbar' || T === 'treasure') {
    scatter(5, 0.55, 1.0, 0.15, (p) => shell(A, p[0], p[1], p[2], rng));
    scatter(2, 0.6, 1.0, 0.15, (p) => driftwood(A, p[0], p[1], p[2], rng() * 3));
    if (T === 'treasure') scatter(2, 0.3, 0.8, 0.6, (p) => stump(A, p[0], p[1], p[2]));
  }
  if (T === 'rocky') scatter(4, 0.2, 0.9, 0.3, (p) => mossRock(A, p[0], p[1], p[2], 0.9 + rng() * 0.8, rng));
  if (d.hut) darkHut(d, rng, A);
  switch (T) {
    case 'volcano': {
      const rim = terrainHeight(d, shoreR(d, 0) * 0.22, 0);
      A.blob(0, rim - d.H * 0.1, 0, d.r * 0.2, 0.3, d.r * 0.2, '#ffffff', TILE.glow, 0.15, 7);              // lava in the crater
      D.blob(0, rim - d.H * 0.08, 0, d.r * 0.19, 0.28, d.r * 0.19, '#ffffff', TILE.spore, 0.15, 8);          // ...sick magenta when it is dark
      for (let i = 0; i < 3; i++) { const a = rng() * 6.28; A.box(Math.cos(a) * d.r * 0.3, rim - d.H * 0.25, Math.sin(a) * d.r * 0.3, 0.4, d.H * 0.2, 0.4, '#ffffff', TILE.glow); } // lava trickles
      for (let i = 0; i < 6; i++) A.blob(Math.sin(i * 1.7) * 0.6 + i * 0.5, rim + 1.2 + i * 1.3, Math.cos(i * 2.3) * 0.6, 0.6 + i * 0.3, 0.45 + i * 0.2, 0.6 + i * 0.3, i < 2 ? '#8a8486' : '#c8c4c6', TILE.white, 0.35, i + 30); // smoke
      for (let i = 0; i < 4; i++) { const p = spot(d, rng, 0.45, 0.8, 0.5); if (p) { A.cyl(p[0], p[1] - 0.2, p[2], 0.14, 0.06, 2.4, 4, '#2a2224', TILE.bark, false); A.push(p[0], p[1] + 1.5, p[2], rng() * 6, 1, 1, 1, 0, 0.9); A.cyl(0, 0, 0, 0.05, 0.02, 0.9, 3, '#2a2224', TILE.bark, false); A.pop(); } }
      for (let i = 0; i < 6; i++) { const p = spot(d, rng, 0.5, 1.0, 0.2); if (p) A.blob(p[0], p[1] + 0.2, p[2], 0.8 + rng() * 0.7, 0.5 + rng() * 0.4, 0.8 + rng() * 0.7, '#3a3236', TILE.stone, 0.3, i); }
      palms(2, 0.82, 0.95, 0.2, 0.7);
      break;
    }
    case 'atoll': {
      for (let i = 0; i < 9; i++) { const th = rng() * Math.PI * 2, t = 0.7 + rng() * 0.15, x = Math.cos(th) * shoreR(d, th) * t, z = Math.sin(th) * shoreR(d, th) * t, h = terrainHeight(d, x, z); if (h > 0.4) palm(A, B, D, x, h, z, rng, 0.8 + rng() * 0.4); }
      { const th = rng() * Math.PI * 2, t = 0.76, x = Math.cos(th) * shoreR(d, th) * t, z = Math.sin(th) * shoreR(d, th) * t, h = Math.max(0.3, terrainHeight(d, x, z)); houseKind(A, B, x, h, z, th + Math.PI / 2, rng, 'stilt');
        const cr = extra.crowd = { dawn: new Builder(), day: new Builder() };
        villager(cr.dawn, x * 0.8, Math.max(0.3, terrainHeight(d, x * 0.8, z * 0.8)), z * 0.8, th + Math.PI, rng, 'fisher');
        villager(cr.day, x * 0.85, Math.max(0.3, terrainHeight(d, x * 0.85, z * 0.85)), z * 0.85, th + Math.PI, rng, 'fisher'); villager(cr.day, x * 0.9 + 1, Math.max(0.3, terrainHeight(d, x * 0.9 + 1, z * 0.9)), z * 0.9, th, rng, 'child'); }
      D.cyl(0, -1.5, 0, 0.6, 0.35, 4.5, 4, '#ffffff', TILE.void, true);   // something stands up in the lagoon at night
      break;
    }
    case 'mangrove': {
      const tree = (x, z, s) => {   // a mangrove: a trunk on arching stilt roots, a dark low canopy
        const h = Math.max(0.1, terrainHeight(d, x, z));
        A.cyl(x, h + 0.6 * s, z, 0.2 * s, 0.14 * s, 2.6 * s, 5, '#5a4a36', TILE.bark, false);
        for (let k = 0; k < 5; k++) {
          const a = k * 1.26 + rng() * 0.4, ox = Math.cos(a) * 1.3 * s, oz = Math.sin(a) * 1.3 * s;
          A.push(x, h + 0.9 * s, z, -a + Math.PI / 2, 1, 1, 1, 0, -0.75); A.cyl(0, -0.9 * s, 0, 0.06 * s, 0.08 * s, 0.95 * s, 4, '#6a5a44', TILE.bark, false); A.pop();
          A.cyl(x + ox, h - 0.7, z + oz, 0.07 * s, 0.07 * s, 0.9 * s, 4, '#5a4a36', TILE.bark, false);
        }
        for (let k = 0; k < 4; k++) A.blob(x + (k - 1.5) * 0.9 * s, h + 3.2 * s + (k % 2) * 0.4, z + (k % 2 ? 0.6 : -0.5) * s, 1.6 * s, 0.75 * s, 1.4 * s, k % 2 ? '#2e5e34' : '#5a8a2a', TILE.white, 0.25, k + x);
        for (let k = 0; k < 3; k++) D.box(x + (k - 1) * 0.7 * s, h + 1.4 * s, z, 0.06, 1.1 * s, 0.06, '#7a8a6a', TILE.rope);   // hanging moss
        D.box(x + 0.2, h + 0.5, z + 0.5, 0.08, 0.06, 0.06, '#ffffff', TILE.spore); D.box(x + 0.4, h + 0.5, z + 0.5, 0.08, 0.06, 0.06, '#ffffff', TILE.spore);
      };
      for (let i = 0; i < 9; i++) { const th = rng() * Math.PI * 2, t = 0.25 + rng() * 0.8; tree(Math.cos(th) * shoreR(d, th) * t, Math.sin(th) * shoreR(d, th) * t, 0.8 + rng() * 0.5); }
      for (let i = 0; i < 2; i++) { const th = rng() * Math.PI * 2, x = Math.cos(th) * shoreR(d, th) * 1.05, z = Math.sin(th) * shoreR(d, th) * 1.05; // herons in the shallows
        B.cyl(x, -0.2, z, 0.03, 0.03, 0.9, 3, '#e0d8c0', TILE.white, false); B.blob(x, 0.85, z, 0.25, 0.18, 0.4, '#f4f0e8', TILE.white, 0.05, i); B.box(x, 1.0, z + 0.3, 0.05, 0.4, 0.05, '#f4f0e8', TILE.white); B.box(x, 1.4, z + 0.42, 0.06, 0.05, 0.25, '#e0a030', TILE.white); }
      break;
    }
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
      if (hasLighthouse(d)) { const p = spot(d, rng, 0.45, 0.8, 0.9, 60); if (p) lighthouse(A, extra, p[0], p[1] - 0.3, p[2], 0.8); }
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
      // the chest's hiding place is decided by the island's riddle (see lore.makePuzzle)
      {
        const pz = d.puzzle;
        let place = null;
        if (pz.kind === 'palm') {
          for (const t of [0.82, 0.74, 0.66]) {
            const px = Math.cos(pz.angle) * shoreR(d, pz.angle) * t, pzz = Math.sin(pz.angle) * shoreR(d, pz.angle) * t, ph = terrainHeight(d, px, pzz);
            if (ph > 0.5) { palm(A, B, D, px, ph, pzz, rng, 1.7); place = [px - Math.cos(pz.angle) * 3, pzz - Math.sin(pz.angle) * 3]; break; }
          }
        }
        if (!place) {
          for (let k = 0; k < 40 && !place; k++) {
            const th = pz.angle + (rng() - 0.5) * 0.7, t = 0.4 + rng() * 0.3, x = Math.cos(th) * shoreR(d, th) * t, zz = Math.sin(th) * shoreR(d, th) * t;
            if (terrainHeight(d, x, zz) > 0.7) place = [x, zz];
          }
        }
        if (!place) place = [Math.cos(pz.angle) * d.r * 0.4, Math.sin(pz.angle) * d.r * 0.4];
        d.marker = { x: place[0], z: place[1], y: terrainHeight(d, place[0], place[1]) };
      }
      shrooms(3);
      cult(4, 0.62);
      for (let i = 0; i < 2; i++) { const p = spot(d, rng, 0.2, 0.9, 0.6); if (p) D.blob(p[0], p[1] + 0.2, p[2], 0.45, 0.28, 0.7, '#ffffff', TILE.bone, 0.25, i); }
      break;
    }
    case 'harbour': {
      const dockRoll = rng(), dockTh = d.id === '0,-1' ? Math.PI / 2 : dockRoll * Math.PI * 2;   // Tama's pier faces the start
      const n = Math.round((6 + Math.floor(rng() * 3)) * Math.max(1, d.r / 25));
      let placed = 0;
      for (let i = 0; i < n * 2 && placed < n; i++) {
        const th = (i / (n * 2)) * Math.PI * 2 + rng() * 0.3;
        if (Math.abs(angleDiff(th, dockTh)) < 0.55) continue;
        const rho = shoreR(d, th) * (0.28 + rng() * 0.38);
        const x = Math.cos(th) * rho, z = Math.sin(th) * rho;
        const kind = placed === 0 ? 'tavern' : placed === 1 && rng() < 0.45 ? 'belltower' : pickCol(rng, ['cottage', 'cottage', 'townhouse', 'townhouse', 'round', 'stilt', 'warehouse']);
        houseKind(A, B, x, d.H - 0.1, z, Math.atan2(-x, -z), rng, kind);
        if (kind === 'tavern') extra.tavern = { x, z, ry: Math.atan2(-x, -z) };
        placed++;
      }
      // lighthouse opposite the dock (not every harbour has one)
      const lth = dockTh + Math.PI + (rng() - 0.5) * 0.6, lr = shoreR(d, lth) * 0.74;
      if (hasLighthouse(d)) lighthouse(A, extra, Math.cos(lth) * lr, d.H - 0.2, Math.sin(lth) * lr);
      // dock
      const R = shoreR(d, dockTh), z0 = R * 0.55, z1 = R + 14, zc = (z0 + z1) / 2;
      d.dock = { x: Math.cos(dockTh) * (R + 10), z: Math.sin(dockTh) * (R + 10), th: dockTh };   // where you moor (local)
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
      // quayside clutter
      for (let i = 0; i < 6; i++) {
        const th = dockTh + (rng() - 0.5) * 1.1, rho = shoreR(d, th) * (0.5 + rng() * 0.3), x = Math.cos(th) * rho, z = Math.sin(th) * rho;
        const k = i % 3;
        if (k === 0) { barrel(A, x, d.H - 0.1, z, 0.9 + rng() * 0.3); barrel(A, x + 0.8, d.H - 0.1, z + 0.2, 0.8); }
        else if (k === 1) { crateBox(A, x, d.H - 0.1, z, rng() * 3); crateBox(A, x + 0.1, d.H + 0.7, z, rng() * 3, 0.8); }
        else ropeCoil(A, x, d.H - 0.1, z, 1.1);
      }
      for (let i = 0; i < 2; i++) { const th = dockTh + Math.PI * 0.5 + i * Math.PI * 0.9 + rng() * 0.4, rho = shoreR(d, th) * 0.62; fishRack(A, Math.cos(th) * rho, d.H - 0.1, Math.sin(th) * rho, rng() * 3); }
      { const th = dockTh - 1.4 - rng() * 0.6, rho = shoreR(d, th) * 0.86; fence(A, Math.cos(th) * rho, d.H - 0.1, Math.sin(th) * rho, th + 1.57, 5); }
      { const th = dockTh + 0.7 + rng() * 0.5, rho = shoreR(d, th) * 0.97, h = terrainHeight(d, Math.cos(th) * rho, Math.sin(th) * rho); if (h > 0.1) beachedBoat(A, Math.cos(th) * rho, h, Math.sin(th) * rho, th + 1.57); }
      // people, by the hour (see villagePhase): who is out depends on the time of day and on the village's mood
      {
        const lively = d.lively, n = (k) => Math.max(1, Math.round(k * (0.4 + lively)));
        const cr = extra.crowd = { dawn: new Builder(), day: new Builder(), evening: new Builder(), night: new Builder(), siesta: new Builder() };
        const yy = d.H - 0.1, at = (t0, t1) => { const th = rng() * Math.PI * 2, rho = shoreR(d, th) * (t0 + rng() * (t1 - t0)); return [Math.cos(th) * rho, Math.sin(th) * rho]; };
        const dockAt = (r, side) => [Math.cos(dockTh) * r - Math.sin(dockTh) * side, Math.sin(dockTh) * r + Math.cos(dockTh) * side];
        // dawn: fishers on the dock, smoke from the tavern, one early riser
        for (let i = 0; i < n(3); i++) { const [x, z] = dockAt(R * 0.7 + i * 3.2, i % 2 ? 1.0 : -1.0); villager(cr.dawn, x, 0.84, z, -dockTh + (i % 2 ? 0 : Math.PI), rng, 'fisher'); }
        { const [x, z] = at(0.15, 0.4); villager(cr.dawn, x, yy, z, rng() * 6.28, rng, 'market'); }
        // day: market stalls around the square, the full crowd, dockers by the water, laundry out
        for (let i = 0; i < n(3); i++) { const a = rng() * 6.28, r = 3.5 + rng() * 2.5, x = Math.cos(a) * r, z = Math.sin(a) * r; marketStall(cr.day, x, yy, z, Math.atan2(-x, -z) + Math.PI, rng); villager(cr.day, x * 1.25, yy, z * 1.25, Math.atan2(-x, -z), rng, 'market'); }
        for (let i = 0; i < n(11); i++) { const [x, z] = at(0.12, 0.6); villager(cr.day, x, yy, z, rng() * 6.28, rng, pickCol(rng, ['fisher', 'market', 'oldsalt', 'child', 'child', 'docker', 'harbourmaster'])); }
        for (let i = 0; i < n(2); i++) { const [x, z] = dockAt(R * 0.6 + i * 2.5, i % 2 ? 0.9 : -0.9); villager(cr.day, x, 0.84, z, -dockTh, rng, 'docker'); }
        { const th = dockTh + 1.6 + rng() * 0.8, rho = shoreR(d, th) * 0.5; washing(cr.day, Math.cos(th) * rho, yy, Math.sin(th) * rho, rng() * 3, rng); }
        // evening: everyone at the tavern, lanterns lit, smoke
        const tv = extra.tavern;
        if (tv) {
          const fx = Math.sin(tv.ry), fz = Math.cos(tv.ry);
          for (let i = 0; i < n(9); i++) { const a = (rng() - 0.5) * 2.4, r = 2.6 + rng() * 3, dx = Math.sin(tv.ry + a) * r, dz = Math.cos(tv.ry + a) * r; villager(cr.evening, tv.x + dx, yy, tv.z + dz, Math.atan2(-dx, -dz), rng, pickCol(rng, ['fisher', 'oldsalt', 'docker', 'market', 'harbourmaster'])); }
          for (const side of [-1, 1]) { const lx = tv.x + fx * 4 + fz * side * 2, lz = tv.z + fz * 4 - fx * side * 2; cr.evening.box(lx, yy, lz, 0.12, 2.0, 0.12, '#3a3036', TILE.bark); cr.evening.box(lx, yy + 2.0, lz, 0.32, 0.36, 0.32, '#ffffff', TILE.glow); }
          cr.evening.push(tv.x, yy, tv.z, tv.ry); smoke(cr.evening, -1.56, 5.2, -0.76, 5); cr.evening.pop();
          cr.dawn.push(tv.x, yy, tv.z, tv.ry); smoke(cr.dawn, -1.56, 5.2, -0.76, 3); cr.dawn.pop();
        }
        // night: empty streets, one watchman with a lantern near the dock (none at all in a sleepy village)
        if (lively > 0.3) { const [x, z] = dockAt(R * 0.45, 1.2); lanternMan(cr.night, x, yy, z, -dockTh, rng); }
        // siesta (sleepy villages only, midday): hammocks between the houses, nobody else
        if (d.sleepy) for (let i = 0; i < 2; i++) { const [x, z] = at(0.2, 0.5); hammockSleeper(cr.siesta, x, yy, z, rng() * 6.28, rng); }
      }
      const nW = 11;
      for (let i = 0; i < nW; i++) {
        const th = (i / nW) * Math.PI * 2 + rng() * 0.2, rho = shoreR(d, th) * 0.8;
        if (Math.abs(angleDiff(th, dockTh)) < 0.25) continue;
        const x = Math.cos(th) * rho, z = Math.sin(th) * rho;
        person(D, x, d.H - 0.1, z, rng, '#c8c8e8', false);
      }
      extra.walkers = [0, 1, 2].map((i) => ({ th: dockTh, z0: R * 0.5, z1: R + 10, off: (i - 1) * 0.55, phase: rng() * 40, speed: 0.55 + rng() * 0.3, col: pickCol(rng, SHIRTS), rng: rng() }));
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
    if (d.type === 'atoll') { const lg = new THREE.Mesh(buildRing(d, 0.0, 0.56, 0.24, 0.9, 0.9, 30, 3), mats.shallow); lg.renderOrder = 1; this.group.add(lg); this.geos.push(lg.geometry); }
    const fm = new THREE.Mesh(buildRing(d, 0.97, 1.07, 0.3, 0.9, 0.0, 30, 2), mats.foam);
    fm.renderOrder = 2; this.group.add(fm); this.geos.push(fm.geometry);

    if (d.type === 'treasure' && d.marker) {
      const m = d.marker;
      const G = new Builder();
      G.blob(m.x, m.y - 0.05, m.z, 1.4, 0.2, 1.1, '#4a3322', TILE.white, 0.2, 2);
      chest(G, m.x, m.y, m.z, 0.5, true);
      this.dugMesh = add(G, mats.props);
      this.setDug(dug);
    }

    this.crowd = {};
    for (const [k, cb] of Object.entries(extra.crowd || {})) { const m = add(cb, mats.props); if (m) { m.visible = false; this.crowd[k] = m; } }
    if (extra.crowd) this.anim.push((t, isl) => {
      const phase = isl.tod ? villagePhase(isl.tod.t * 24, d.sleepy) : 'day';
      isl.phase = phase;
      for (const [k, m] of Object.entries(isl.crowd)) m.visible = !isl.isDark && k === phase;
    });
    this.walkers = [];
    for (const w of extra.walkers || []) {
      const pb = new Builder();
      { const wr = mulberry32(Math.floor(w.rng * 1e6)); villager(pb, 0, 0, 0, 0, wr, pickCol(wr, ['fisher', 'market', 'docker', 'child'])); }
      const mesh = new THREE.Mesh(pb.geometry(), mats.props);
      this.group.add(mesh); this.geos.push(mesh.geometry);
      this.walkers.push({ mesh, w });
    }
    if (this.walkers.length) {
      // villagers stroll: pick a spot in the village, amble there, stand around a while, pick another
      const spot = (w) => {
        const th = w.r() * Math.PI * 2, rho = shoreR(d, th) * (0.12 + w.r() * 0.5), x = Math.cos(th) * rho, z = Math.sin(th) * rho;
        return { x, z };
      };
      for (const wk of this.walkers) {
        const w = wk.w; w.r = mulberry32(Math.floor(w.rng * 1e6) + 3);
        w.p = spot(w); w.tgt = spot(w); w.wait = w.r() * 4; w.last = null;
        w.speed = 0.45 + w.r() * 0.5;            // units per second: a stroll
      }
      this.anim.push((t, isl) => {
        const show = !isl.isDark && (isl.phase === 'dawn' || isl.phase === 'day' || isl.phase === 'evening' || !isl.phase);
        for (const { mesh, w } of isl.walkers) {
          mesh.visible = show;
          const dt = w.last == null ? 0 : Math.min(0.1, Math.max(0, t - w.last)); w.last = t;
          if (!show) continue;
          let moving = false;
          if (w.wait > 0) w.wait -= dt;
          else {
            const dx = w.tgt.x - w.p.x, dz = w.tgt.z - w.p.z, L = Math.hypot(dx, dz);
            if (L < 0.3) { w.tgt = spot(w); w.wait = 2 + w.r() * 6; }
            else { const k = Math.min(L, w.speed * dt) / L; w.p.x += dx * k; w.p.z += dz * k; mesh.rotation.y = Math.atan2(dx, dz); moving = true; }
          }
          const h = Math.max(terrainHeight(d, w.p.x, w.p.z), 0.2);
          mesh.position.set(w.p.x, h - 0.1 + (moving ? Math.abs(Math.sin(t * 6 + w.phase)) * 0.04 : 0), w.p.z);
        }
      });
    }

    if (extra.lamp) {
      const L = extra.lamp, on = new Builder(), off = new Builder();
      on.cyl(L.x, L.y, L.z, 1.0, 1.0, 1.3, 6, '#ffffff', TILE.glow, false);
      off.cyl(L.x, L.y, L.z, 1.0, 1.0, 1.3, 6, '#4a4450', TILE.stone, false);
      this.lampOn = add(on, mats.props);
      this.lampOff = add(off, mats.props);
    }

    if (extra.beam) {
      const g = new THREE.ConeGeometry(2.6, 46, 6, 1, true);
      g.rotateZ(Math.PI / 2); g.translate(23, 0, 0);
      const beam = new THREE.Mesh(g, mats.beam);
      beam.position.set(extra.beam.x, extra.beam.y, extra.beam.z);
      beam.renderOrder = 3;
      this.group.add(beam); this.geos.push(g);
      this.beam = beam;
      const ph = rng() * 6;
      const bx = d.x + extra.beam.x, bz = d.z + extra.beam.z;
      this.anim.push((t, isl) => {
        if (isl.stare) { // full dread: every beam swings round to point at the ship
          const want = Math.atan2(-(isl.stare.z - bz), isl.stare.x - bx);
          beam.rotation.y += Math.atan2(Math.sin(want - beam.rotation.y), Math.cos(want - beam.rotation.y)) * 0.08;
          const dist = Math.hypot(isl.stare.x - bx, isl.stare.z - bz), drop = extra.beam.y - 1.2;
          beam.rotation.z += (-Math.atan2(drop, dist) - beam.rotation.z) * 0.08;           // tipped down onto the deck
          beam.scale.x = Math.min(7, Math.max(1, Math.hypot(dist, drop) / 44));          // long enough to reach you
          beam.scale.y = beam.scale.z = 0.6;
        } else { beam.rotation.y = t * 0.9 + ph; beam.rotation.z *= 0.9; beam.scale.set(1, 1, 1); }
      });
    }
  }
  setLit(on) {
    this.lit = on;
    if (this.lampOn) this.lampOn.visible = on;
    if (this.lampOff) this.lampOff.visible = !on;
    if (this.beam) this.beam.visible = on;
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
    this.lit = false;
    // the dark hut: one island, 4-6 cells out (well past the fog from where you start)
    let best = null, bh = Infinity;
    for (let cz = -6; cz <= 6; cz++) for (let cx = -6; cx <= 6; cx++) {
      const ring = Math.max(Math.abs(cx), Math.abs(cz));
      if (ring < 4) continue;
      const d = this.desc(cx, cz);
      if (!d || (d.type !== 'jungle' && d.type !== 'rocky')) continue;
      const h = hash2(cx, cz, seed + 77);
      if (h < bh) { bh = h; best = d; }
    }
    if (best) { best.hut = true; this.hutId = best.id; }
  }
  get hutDesc() { if (!this.hutId) return null; const [cx, cz] = this.hutId.split(',').map(Number); return this.desc(cx, cz); }
  setLit(on) {
    if (on === this.lit) return;
    this.lit = on;
    for (const isl of this.islands.values()) isl.setLit(on);
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
        isl.setLit(this.lit);
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
  tick(t, tod) { for (const isl of this.islands.values()) { isl.tod = tod; isl.stare = this.stare; for (const f of isl.anim) f(t, isl); } }

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
    this.lastEdge = bd;
    return best;
  }
}
