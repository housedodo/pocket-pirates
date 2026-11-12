import { sectorAt, lookFactionAt } from './sectors.js';
import { styleOf, shapeOf, STYLE_DEF, SHAPES, stairs, slopeHouses, flagCloth, ruins, landingFlag, laundry } from './villagestyles.js';
import { pushOut } from './solids.js';
import * as THREE from 'three';
import { Builder, darken } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';
import { hash2, mulberry32, fbm, clamp, angleDiff, smoothstep } from './util.js';
import { dreadAtDistance } from './palette.js';
import { makeName, makePuzzle } from './lore.js';
import { FRUITS, fruitOf } from './fruit.js';
import { arcIdOf, ARCS } from './harbourlife.js';

import { forcedCells, shapeLandmark, cutShore, lmHeight, lmColor, lmDecor, LM_DARK } from './landmarks.js';
export const CELL = 110;
const LOAD_R = 4, UNLOAD_R = 6;

const C = (h) => new THREE.Color(h);
const GC = {};
const COL = {
  sand: C('#ecd48f'), wet: C('#d2b676'), g1: C('#62b64f'), g2: C('#3f9a47'), g3: C('#2f7d3d'),
  rock1: C('#8f8b84'), rock2: C('#a7a095'), dirt: C('#c9a46a'), violet: C('#4a2f66'),
  white: C('#ffffff'), wood: C('#9a6a3a'), bark: C('#8a6238'),
  ash1: C('#4a4246'), ash2: C('#5e5458'), ember: C('#7a3a2a'), mud: C('#6a5a3a'), mire: C('#4a6a34'),
};
const WALLS = ['#f4dfb0', '#f0b3a0', '#a9d6ee', '#f2e48a', '#c9e6a8', '#e8c0e0'];
const ROOFS = ['#d2483c', '#3c78c8', '#2f9a8a', '#c86a2a', '#7a4ab0'];
// a village's custom can repaint every house (whitewash) or keep children indoors; set while a harbour is built
let PAINT = null, NO_CHILD = false, CUR_FLAG = null, FIN = null;   // FIN: Tama's house finish (the garden harbour), see TAMA_FIN

// ---------------------------------------------------------------------------
// Island description (pure function of seed + cell) and terrain height field
// ---------------------------------------------------------------------------
const FORCED = {
  '0,0': null,
  '0,-1': { type: 'harbour', x: 0, z: -118, r: 38 },   // Harbour Tama, the big home island
  '1,-1': { type: 'treasure', x: 182, z: -208 },   // Perrin's isle: far enough from Tama that Mara has said her piece before you are back
  '2,-2': null,                                         // ...and open water beyond it
  '-1,-1': null,                                        // open water around Tama
  '1,0': null,
  '-2,-1': { type: 'harbour', x: -232, z: -128, r: 30 },   // a second harbour inside the first fog radius, so early errands have somewhere to go
  '-1,0': { type: 'sandbar', x: -112, z: 30 },
};
// the hand-made places (landmarks.js) and the open water round them; the starter cells above win
for (const [k, v] of Object.entries(forcedCells())) if (!(k in FORCED)) FORCED[k] = v;
const TYPE_TABLE = [['sandbar', 0.28], ['jungle', 0.28], ['rocky', 0.2], ['treasure', 0.12], ['harbour', 0.12]];

// The sea is mostly open: island chance follows a slow noise field, so there are archipelagos and long
// lonely stretches. ~17% of cells on average, between ~5% and ~30%.
function islandChance(cx, cz, seed) {
  const n = fbm(cx * 0.21 + 3.7, cz * 0.21 - 1.3, seed + 71);
  return 0.05 + 0.25 * smooth01(n);
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

// village customs: things you can see, never explained (see docs/PROGRESS.md, Villages with character)
export const CUSTOMS = ['whitewash', 'lanterns', 'nochildren', 'choir', 'nightboats', 'kites', 'bells', 'laundry', 'statues', 'silent'];
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
  const dread = forced && forced.dread != null ? forced.dread : dreadAtDistance(Math.hypot(x, z));   // a place can be given its stratum on purpose (a distance lie)
  let r = { sandbar: 6 + rng() * 5, jungle: 15 + rng() * 8, rocky: 11 + rng() * 6, treasure: 15 + rng() * 5, harbour: 22 + rng() * 5 }[type];
  if (forced && forced.r) r = forced.r;
  const H = { sandbar: 0.9, jungle: 4 + rng() * 3, rocky: 6 + rng() * 4, treasure: 3 + rng(), harbour: 1.15 }[type];
  const amp = type === 'sandbar' ? 1.6 : 1;
  const lobes = [(0.08 + rng() * 0.1) * amp, (0.05 + rng() * 0.08) * amp, (0.03 + rng() * 0.05) * amp, rng() * 6.28, rng() * 6.28, rng() * 6.28];
  const nameRng = mulberry32(hash2(cx, cz, seed + 5));
  let name = makeName(nameRng, type, dread);
  if (key !== '0,-1' && / Tama$/.test(name)) name = name.replace(/Tama$/, 'Tamar');   // only the home harbour is Tama
  const desc = { id: key, type, x, z, r, H, lobes, seed: hash2(cx, cz, seed + 1) & 0xffff, name, dread };
  // rarer island kinds, rolled with their own generator so the rest of the world stays where it was
  if (!forced && Math.max(Math.abs(cx), Math.abs(cz)) > 1) {
    const vr = mulberry32(hash2(cx, cz, seed + 4242)), v = vr();
    if (type === 'rocky' && v < 0.1) { desc.type = 'volcano'; desc.H = 18 + vr() * 6; desc.r = 30 + vr() * 6; }
    else if (type === 'sandbar' && v < 0.35) { desc.type = 'atoll'; desc.r = 15 + vr() * 6; desc.H = 1.1; }
    else if (type === 'jungle' && v < 0.25) { desc.type = 'mangrove'; desc.H = 1.3 + vr() * 0.6; }
    if (desc.type !== type) desc.name = makeName(mulberry32(hash2(cx, cz, seed + 4343)), desc.type, dread).replace(/ Tama$/, ' Tamar');
  }
  if (type === 'harbour') {
    desc.lively = (hash2(cx, cz, seed + 808) % 1000) / 1000; desc.sleepy = desc.lively < 0.3;
    // every village keeps one custom, and has its own festival day in the week
    desc.custom = key === '0,-1' ? 'bells' : CUSTOMS[hash2(cx, cz, seed + 909) % CUSTOMS.length];
    desc.festival = key === '0,-1' ? 6 : hash2(cx, cz, seed + 910) % 7;
    desc.flag = sectorAt(x, z, seed).faction.color;   // the colours it flies
    desc.style = styleOf(hash2(cx, cz, seed + 777), key, lookFactionAt(x, z, seed, hash2(cx, cz, seed + 778)));   // the region's look (soft borders)
    { const vt = typeof window !== 'undefined' && window.__villageTest; if (vt && key === '-2,-1') desc.style = vt.style; }   // dev: force the look of the second harbour (see docs/PROGRESS.md)   // its own island outline, ground, palette, street plan and landmark (villagestyles.js)
    desc.dockTh = key === '0,-1' ? Math.PI / 2 : (Math.abs(hash2(cx, cz, seed + 123)) % 628) / 100;
    { const sh = shapeOf(desc.style, hash2(cx, cz, seed + 888), (Math.abs(hash2(cx, cz, seed + 889)) % 1000) / 1000), vt = typeof window !== 'undefined' && window.__villageTest;
      if (vt && vt.shape && key === '-2,-1') { const q = SHAPES[vt.shape]; Object.assign(sh, { id: vt.shape, H: (q.H[0] + q.H[1]) / 2, te: q.te, w: q.w, steps: q.steps || 0, rim: q.rim ? (q.rim[0] + q.rim[1]) / 2 : 0 }); }
      desc.sh = sh.id === 'flat' ? null : sh; if (desc.sh) desc.H = sh.H; }
    if (!forced) { const sd = STYLE_DEF[desc.style]; desc.r *= sd.rMul; desc.lobes = desc.lobes.map((v, i) => (i < 3 ? v * sd.lobeMul : v)); }
  }
  if (forced && forced.lm) shapeLandmark(desc, forced.lm);
  { // character, rolled on its own so the rest of the world stays put: a colour shift per island, a cliff on some jungle isles,
    // sea stacks off most rocky ones
    const vr = mulberry32(hash2(cx, cz, seed + 5151));
    desc.hue = (vr() - 0.5) * 0.06; desc.satK = (vr() - 0.5) * 0.2; desc.lumK = (vr() - 0.5) * 0.08;
    if (!forced && desc.type === 'jungle' && vr() < 0.4) { desc.cliffTh = vr() * 6.283; desc.cliffH = 0.7 + vr() * 0.7; }
    if (!forced && desc.type === 'rocky' && vr() < 0.7) desc.stacks = 2 + Math.floor(vr() * 3);
  }
  if (type === 'treasure') {
    desc.puzzle = makePuzzle(mulberry32(hash2(cx, cz, seed + 31)), name, dread);
    // some beaches face so that the arch's noon shadow falls across them: there the chest lies under its tip (digging.js)
    if (key !== '1,-1' && Math.sin(desc.puzzle.angle) > 0.2) { desc.puzzle.shadow = true; desc.puzzle.text += ' At noon, the arch points.'; }
  }
  return desc;
}

/** where a harbour's pier ends, in world space (for the compass, the chart flag and the slip): the island's middle if it has no pier */
export function pierOf(d) { if (!d || d.dockTh === undefined) return d ? { x: d.x, z: d.z } : null; const r = shoreR(d, d.dockTh) + 10; return { x: d.x + Math.cos(d.dockTh) * r, z: d.z + Math.sin(d.dockTh) * r }; }
export function shoreR(d, th) {
  const L = d.lobes;
  const R = d.r * (1 + L[0] * Math.sin(2 * th + L[3]) + L[1] * Math.sin(3 * th + L[4]) + L[2] * Math.sin(5 * th + L[5]));
  return d.cutTh === undefined ? R : cutShore(d, th, R);
}

export function terrainHeight(d, lx, lz) {
  const rho = Math.hypot(lx, lz), th = Math.atan2(lz, lx), t = rho / shoreR(d, th);
  if (t > 1) return -(t - 1) * 9;
  const n = fbm((lx + d.x) * 0.1, (lz + d.z) * 0.1, d.seed);
  if (d.lm) { const v = lmHeight(d, t, th, n); if (v !== null) return v; }
  const p = 1 - Math.pow(t, d.type === 'rocky' ? 1.6 : 2.2);
  switch (d.type) {
    case 'sandbar': return d.H * p * (0.6 + n * 0.8);
    case 'jungle': {
      let jh = d.H * Math.pow(p, 1.35) * (0.55 + n * 0.8);
      if (d.cliffTh !== undefined) { const c = Math.max(0, Math.cos(th - d.cliffTh)); jh += d.H * d.cliffH * c * c * c * (1 - smoothstep(0.86, 0.99, t)) * smoothstep(0.1, 0.6, t); }   // a cliff face on one side
      return jh;
    }
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
    default: { // harbour plateau (flat), or a shaped island: village level, ramp to the pier, dune, hill, cliff, terraces, bowl (villagestyles.js SHAPES)
      const sh = d.sh; if (!sh) return Math.min(d.H, p * d.H * 3.2);
      const dd = Math.abs(angleDiff(th, d.dockTh)), ramp = 1 - smoothstep(0.35, 1.0, dd), te = sh.te + (0.55 - sh.te) * ramp, w = sh.w + (0.45 - sh.w) * ramp;
      let sS = 1 - smoothstep(te, Math.min(1, te + w), t);
      if (sh.steps) { const lv = sS * sh.steps, f = Math.floor(lv); sS = clamp((f + smoothstep(0.72, 1, lv - f)) / sh.steps, 0, 1); }   // flat treads, short risers
      let h = sh.H * sS;
      if (sh.rim) h += sh.rim * smoothstep(1.4, 2.6, dd) * smoothstep(0.6, 0.82, t) * (1 - smoothstep(0.9, 1.0, t));
      return Math.max(h, 0.5 * (1 - smoothstep(0.85, 1.0, t)));
    }
  }
}

// ---------------------------------------------------------------------------
// Terrain mesh: polar grid, one flat colour per cell
// ---------------------------------------------------------------------------
const BLIGHT = { wet: C('#2a2629'), sand: C('#3a3437'), rock1: C('#3e383c'), rock2: C('#4c4549'), grass1: C('#545238'), grass2: C('#454530'), moss: C('#33402e') };
/** the dark-mood ground colour per island kind (docs/ART_SPEC.md 7): the terrain's colorB drifts toward it, so S0-S2 islands tire (greens go yellow-grey,
 *  sand goes dirty) without a single new triangle */
const LM_DARKC = {};
const KIND_DARK = { sandbar: C('#b0a890'), jungle: C('#4a5a40'), rocky: C('#5a5262'), treasure: C('#4a5a40'), harbour: C('#8a8478'), atoll: C('#b8b0a0'), mangrove: C('#2a3028'), volcano: C('#2a1034') };
function faceColor(d, hc, slope, noise) {
  let c;
  if (d.blight) {   // the hut's island: black sand, grey rock, dead grass and sick moss
    if (hc < 0.12) return BLIGHT.wet;
    if (hc < 0.55) return BLIGHT.sand;
    if (slope > 0.5) return noise > 0.5 ? BLIGHT.rock2 : BLIGHT.rock1;
    return noise > 0.62 ? BLIGHT.grass1 : noise > 0.3 ? BLIGHT.grass2 : BLIGHT.moss;
  }
  if (d.lm) { const lc = lmColor(d, hc, slope, noise); if (lc) return lc; }
  if (d.type === 'volcano') return hc < 0.55 ? COL.ash1 : hc > d.H * 0.62 ? (noise > 0.5 ? COL.ember : COL.ash1) : (noise > 0.55 ? COL.ash2 : COL.ash1);
  if (d.type === 'mangrove') return hc < 0.4 ? COL.mud : noise > 0.55 ? COL.mire : COL.mud;
  if (hc < 0.12) c = COL.wet;
  else if (hc < 0.55) c = COL.sand;
  else switch (d.type) {
    case 'rocky': c = slope > 0.45 || hc > d.H * 0.5 ? (noise > 0.5 ? COL.rock2 : COL.rock1) : (hc < 1.8 ? COL.dirt : COL.g3); break;
    case 'jungle': c = slope > 0.55 && hc > 2.5 ? COL.rock1 : hc < 1.6 ? (noise > 0.5 ? COL.g1 : COL.g2) : hc < d.H * 0.65 ? (noise > 0.45 ? COL.g2 : COL.g3) : COL.g3; break;
    case 'treasure': c = noise > 0.55 ? COL.g1 : COL.sand; break;
    case 'harbour': { const g = (TAMA_LOOK && d.id === '0,-1' && TAMA_GROUND[TAMA_LOOK]) || (STYLE_DEF[d.style] && STYLE_DEF[d.style].ground); if (d.sh && slope > 0.3 && hc > 1.2) { c = noise > 0.5 ? COL.rock2 : COL.rock1; break; } c = g ? (noise > 0.55 ? (GC[g[0]] || (GC[g[0]] = C(g[0]))) : (GC[g[1]] || (GC[g[1]] = C(g[1])))) : (noise > 0.62 ? COL.g1 : COL.dirt); break; }
    default: c = COL.sand;
  }
  return c;
}

function buildTerrain(d, rng) {
  const b = new Builder();
  b.uvFn = (p) => [(p.x + d.x) * 0.12, (p.z + d.z) * 0.12];
  const segs = d.lm ? 44 : d.type === 'sandbar' ? 14 : d.sh ? 30 : 22;
  const rings = d.lm ? [0, 0.12, 0.25, 0.4, 0.55, 0.68, 0.8, 0.88, 0.94, 0.975, 1.0, 1.1, 1.3] : d.sh ? [0, 0.14, 0.28, 0.4, 0.5, 0.58, 0.64, 0.7, 0.76, 0.82, 0.88, 0.93, 0.97, 1.0, 1.1, 1.3] : [0, 0.2, 0.4, 0.58, 0.72, 0.84, 0.93, 1.0, 1.1, 1.3];
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
      const tv = (d.hue || d.satK || d.lumK) && !d.lm && !d.blight;   // this island's own slight colour shift
      const k = 0.88 + rng() * 0.22;
      tmp.copy(base).multiplyScalar(k);
      if (tv) tmp.offsetHSL(d.hue, d.satK, d.lumK);
      darken(tmp, dk);
      { const kd = d.lm ? (LM_DARK[d.lm] && (LM_DARKC[d.lm] || (LM_DARKC[d.lm] = C(LM_DARK[d.lm])))) : KIND_DARK[d.type]; if (kd && !d.blight) dk.lerp(kd, d.lm ? 0.55 : 0.35); }
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

export function palm(A, B, D, x, y, z, rng, s = 1) {
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
  let wall = pickCol(rng, WALLS), roof = pickCol(rng, ROOFS);
  if (PAINT) { if (PAINT.walls) wall = pickCol(rng, PAINT.walls); if (PAINT.roofs) roof = pickCol(rng, PAINT.roofs); if (PAINT.wall) wall = PAINT.wall; if (PAINT.roof) roof = PAINT.roof; }
  if (FIN) { wall = finCol(FIN.walls, wall); roof = finCol(FIN.roofs, roof); }
  A.push(x, y, z, ry);
  A.box(0, 0, 0, w, h, dep, wall, TILE.wall, TILE.white);
  const rh = 1.4 + rng() * 0.5;
  A.gable(0, h, 0, w + 0.6, rh, dep + 0.6, roof, TILE.roof, wall);
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
  if (FIN) finishHouse(A, { w, dep, h, rh, roof, door: [-w * 0.2, 0.95, 1.8], wins: [w / 2 - 0.6], winY: 0.75, chim: [w * 0.28, h + 2.0, -dep * 0.2, 0.55], x, z });
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
  if (NO_CHILD && kind === 'child') kind = 'oldsalt';
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
export const HOUSES = ['cottage', 'townhouse', 'stilt', 'round', 'tavern', 'warehouse', 'belltower', 'colonial', 'planter', 'thatch', 'church'];
// the Caribbean palette (colonial towns, as in the old pirate games): warm terracotta, palm thatch, pastel and whitewashed walls, bright shutters
const TERRACOTTA = ['#c8643a', '#b8503a', '#d27a3a', '#a84a32'], THATCH = ['#c8a860', '#b89850', '#d8b868', '#a88a48'], SHUTTERS = ['#3f8a6a', '#3c78c8', '#b83a2e', '#2f9a8a', '#e8c060'];
/** the life in front of a house: a bush or two with flowers, a bench, a hen, a lantern; seeded so no two doors look alike */
function yard(A, rng, w, dep, sx = 1) {
  const fz = dep / 2 + 1.5;
  if (rng() < 0.7) { A.blob(sx * (w / 2 + 0.5), 0.35, fz - 0.6, 0.5, 0.4, 0.5, '#3f8a38', TILE.white, 0.3, 4); for (let i = 0; i < 3; i++) A.blob(sx * (w / 2 + 0.5) + (i - 1) * 0.25, 0.7, fz - 0.6 + (i % 2) * 0.2, 0.13, 0.13, 0.13, pickCol(rng, ['#e8509a', '#f0c030', '#e85a3a', '#ffffff']), TILE.white, 0.05, i); }
  if (rng() < 0.4) { A.box(-sx * (w * 0.25), 0.2, fz + 0.2, 1.3, 0.12, 0.5, '#6b4a2e', TILE.planks); A.box(-sx * (w * 0.25) - 0.5, 0, fz + 0.2, 0.14, 0.2, 0.4, '#5a3e24', TILE.bark); A.box(-sx * (w * 0.25) + 0.5, 0, fz + 0.2, 0.14, 0.2, 0.4, '#5a3e24', TILE.bark); }
  if (rng() < 0.35) { A.blob(sx * 0.2, 0.25, fz + 0.9, 0.22, 0.18, 0.28, '#f4f0e4', TILE.white, 0.2, 2); A.box(sx * 0.2, 0.36, fz + 1.08, 0.1, 0.1, 0.1, '#c83a2a', TILE.white); }   // a hen
  if (rng() < 0.3) { A.box(-sx * (w / 2 + 0.3), 0.0, dep / 2 - 0.1, 0.2, 2.0, 0.2, '#3a3036', TILE.bark); A.box(-sx * (w / 2 + 0.3), 2.0, dep / 2 - 0.1, 0.34, 0.36, 0.34, '#ffffff', TILE.glow); }   // a lantern post
}
export function houseKind(A, B, x, y, z, ry, rng, kind) {
  let wall = pickCol(rng, WALLS), roof = pickCol(rng, ROOFS);
  if (PAINT) { if (PAINT.walls) wall = pickCol(rng, PAINT.walls); if (PAINT.roofs) roof = pickCol(rng, PAINT.roofs); if (PAINT.wall) wall = PAINT.wall; if (PAINT.roof) roof = PAINT.roof; }
  if (kind === 'cottage') return house(A, B, x, y, z, ry, rng);
  if (FIN) { wall = finCol(FIN.walls, wall); roof = finCol(FIN.roofs, roof); }
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
      if (FIN) finishHouse(A, { w, dep, h, rh: 1.5, roof, door: [0.6, 0.9, 1.85], wins: [-0.8], winY: 0.75, chim: [-w * 0.25, h + 2.0, 0, 0.5], x, z });
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
    case 'colonial': { // a low whitewashed house with a hipped terracotta roof and a veranda
      const w = 3.6 + rng() * 1.2, dep = w - 0.4 + rng() * 0.8, h = 2.2 + rng() * 0.5, rf = finCol(FIN && FIN.roofs, PAINT && PAINT.roofs ? roof : pickCol(rng, TERRACOTTA)), sh = pickCol(rng, SHUTTERS);
      A.box(0, 0, 0, w, h, dep, wall, TILE.wall, TILE.white);
      A.push(0, h, 0, Math.PI / 4); A.cyl(0, 0, 0, Math.max(w, dep) * 0.78 + 0.5, 0.2, 1.6 + rng() * 0.5, 4, rf, TILE.roof, false); A.pop();
      A.box(0, 0, dep / 2 + 0.9, w + 0.4, 0.22, 1.7, '#8a6238', TILE.planks);            // the veranda floor
      for (const sx of [-1, 0, 1]) A.box(sx * (w / 2 + 0.1), 0.2, dep / 2 + 1.55, 0.22, 2.0, 0.22, '#f4f0e4', TILE.bark);
      A.box(0, 2.2, dep / 2 + 0.9, w + 0.7, 0.2, 1.9, rf, TILE.roof);                    // its little roof
      A.box(0, 0.22, dep / 2 + 0.01, 0.95, 1.8, 0.1, '#5a3a20', TILE.planks);
      for (const sx of [-1, 1]) { A.box(sx * w * 0.3, 1.0, dep / 2 + 0.03, 0.6, 0.8, 0.08, '#2a2a3a', TILE.white); A.box(sx * w * 0.3 - 0.45, 1.0, dep / 2 + 0.06, 0.2, 0.8, 0.08, sh, TILE.planks); A.box(sx * w * 0.3 + 0.45, 1.0, dep / 2 + 0.06, 0.2, 0.8, 0.08, sh, TILE.planks); }
      A.box(w * 0.28, h + 0.7, -dep * 0.2, 0.5, 1.1, 0.5, '#a89a88', TILE.stone);
      if (FIN) finishHouse(A, { w, dep, h, roof: rf, door: [0, 0.95, 1.8, 0.22], wins: [-w * 0.3, w * 0.3], winY: 0.72, chim: [w * 0.28, h + 1.8, -dep * 0.2, 0.5], porch: dep / 2 + 1.75, x, z });
      yard(A, rng, w, dep, rng() < 0.5 ? 1 : -1);
      break;
    }
    case 'planter': { // a planter's house: stone ground floor, a shuttered upper storey with a balcony, a big hipped roof
      const w = 4.4 + rng() * 1.0, dep = 3.8 + rng() * 0.6, rf = finCol(FIN && FIN.roofs, PAINT && PAINT.roofs ? roof : pickCol(rng, TERRACOTTA)), sh = pickCol(rng, SHUTTERS);
      A.box(0, 0, 0, w, 2.3, dep, '#d8d0c0', TILE.stone, TILE.stone);
      A.box(0, 2.3, 0, w - 0.3, 2.1, dep - 0.3, wall, TILE.wall, TILE.white);
      A.box(0, 2.25, dep / 2 + 0.55, w + 0.2, 0.2, 1.1, '#8a6238', TILE.planks);          // balcony
      for (let i = 0; i < 6; i++) A.box(-w / 2 + 0.2 + i * (w - 0.4) / 5, 2.45, dep / 2 + 1.05, 0.2, 0.9, 0.2, '#f4f0e4', TILE.bark);
      A.box(0, 3.35, dep / 2 + 1.05, w, 0.2, 0.2, '#f4f0e4', TILE.bark);
      A.push(0, 4.4, 0, Math.PI / 4); A.cyl(0, 0, 0, Math.max(w, dep) * 0.76 + 0.5, 0.2, 2.0, 4, rf, TILE.roof, false); A.pop();
      A.box(0, 0, dep / 2 + 0.01, 1.2, 1.9, 0.1, '#5a3a20', TILE.planks);
      for (const sx of [-1, 1]) { A.box(sx * w * 0.32, 0.9, dep / 2 + 0.03, 0.7, 0.9, 0.08, '#2a2a3a', TILE.white); for (const o of [-0.5, 0.5]) A.box(sx * w * 0.32 + o, 3.1, dep / 2 - 0.1, 0.2, 1.0, 0.08, sh, TILE.planks); }
      A.box(-w * 0.28, 5.2, -dep * 0.15, 0.55, 1.3, 0.55, '#a89a88', TILE.stone);
      if (FIN) finishHouse(A, { w: w - 0.3, dep: dep - 0.3, h: 4.4, h0: 2.3, roof: rf, door: [0, 1.2, 1.9], wins: [-w * 0.32, w * 0.32], winY: 0.66, winZ: dep / 2, chim: [-w * 0.28, 6.5, -dep * 0.15, 0.55], noPlinth: true, x, z });
      yard(A, rng, w, dep, rng() < 0.5 ? 1 : -1);
      break;
    }
    case 'thatch': { // a palm-thatch cottage: low walls, a steep overhanging roof, a porch, nets and crabpots
      const w = 3.0 + rng() * 1.0, dep = 3.4 + rng() * 1.2, th = pickCol(rng, THATCH);
      A.box(0, 0, 0, w, 1.7, dep, wall, TILE.wall, TILE.white);
      A.gable(0, 1.7, 0, w + 1.2, 2.2, dep + 1.0, th, TILE.rope, wall);
      A.box(-w * 0.2, 0, dep / 2 + 0.01, 0.9, 1.5, 0.1, '#5a3a20', TILE.planks);
      A.box(w * 0.28, 0.9, dep / 2 + 0.03, 0.6, 0.6, 0.08, '#2a2a3a', TILE.white);
      A.box(0, 0, dep / 2 + 0.7, w * 0.8, 0.18, 1.0, '#8a6238', TILE.planks);
      for (const sx of [-1, 1]) A.box(sx * w * 0.38, 0, dep / 2 + 1.1, 0.2, 1.7, 0.2, '#5a3e24', TILE.bark);
      if (rng() < 0.6) A.cyl(w / 2 + 0.5, 0, 0.2, 0.35, 0.3, 0.6, 6, '#c8a860', TILE.rope, true);   // a crab pot
      if (FIN) finishHouse(A, { w, dep, h: 1.7, rh: 2.2, roof: th, thatch: true, door: [-w * 0.2, 0.9, 1.5], wins: [w * 0.28], winY: 0.66, porch: dep / 2 + 1.25, x, z });
      yard(A, rng, w, dep, rng() < 0.5 ? 1 : -1);
      break;
    }
    case 'church': { // a white church, a terracotta roof, a bell tower with a small spire at the front
      A.box(0, 0, 0, 3.6, 3.0, 6.2, '#f6f2ea', TILE.wall, TILE.white);
      A.gable(0, 3.0, 0, 4.2, 1.8, 6.8, pickCol(rng, TERRACOTTA), TILE.roof, '#f6f2ea');
      A.box(0, 0, 3.6, 2.2, 5.6, 2.2, '#f6f2ea', TILE.wall, TILE.white);
      for (const [sx, sz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) A.box(sx, 5.6, 3.6 + sz, 0.26, 1.3, 0.26, '#e8e0d0', TILE.stone);
      A.cyl(0, 5.8, 3.6, 0.32, 0.2, 0.6, 7, '#c8a040', TILE.glow, true);
      A.cyl(0, 6.9, 3.6, 1.6, 0, 1.9, 4, '#b8503a', TILE.roof, false);
      A.box(0, 8.7, 3.6, 0.2, 0.9, 0.2, '#f4e8c0', TILE.stone); A.box(0, 9.1, 3.6, 0.6, 0.2, 0.2, '#f4e8c0', TILE.stone);
      A.box(0, 0, 4.72, 1.0, 2.0, 0.1, '#5a3a20', TILE.planks);
      if (CUR_FLAG) flagCloth(A, 0, 9.4, 3.6, Math.PI / 2, CUR_FLAG, 0.5);   // the faction's flag over the town
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
      if (FIN) finishHouse(A, { w, dep, h, rh: 1.7, roof: '#8a3a2a', door: [0, 1.2, 1.8], wins: [1.75], winY: 0.75, chim: [-w * 0.3, h + 2.3, -dep * 0.2, 0.6], tavern: true, x, z });
      break;
    }
    case 'warehouse': { // long and low, a wide door, crates stacked outside
      const w = 3.2, dep = 6.2, h = 2.6;
      A.box(0, 0, 0, w, h, dep, '#b89a78', TILE.planks, TILE.planks);
      A.gable(0, h, 0, w + 0.5, 0.9, dep + 0.4, '#6a5a4a', TILE.roof, '#9a7a58');
      A.box(0, 0, dep / 2 + 0.01, 1.9, 2.0, 0.12, '#3a2a1c', TILE.planks);
      crateBox(A, w / 2 + 0.6, 0, dep / 2 - 0.5, 0.3); crateBox(A, w / 2 + 0.6, 0.85, dep / 2 - 0.4, 1.1, 0.8); crateBox(A, w / 2 + 0.7, 0, dep / 2 - 1.6, 0.8);
      if (FIN) finishHouse(A, { w, dep, h, rh: 0.9, roof: '#6a5a4a', door: [0, 1.9, 2.0], wins: [], plank: true, x, z });
      break;
    }
    default: { // belltower: a stone tower, an open belfry and a bell
      A.box(0, 0, 0, 1.8, 5.2, 1.8, '#d8d0c0', TILE.stone, TILE.stone);
      for (const [sx, sz] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) A.box(sx, 5.2, sz, 0.25, 1.4, 0.25, '#c8c0b0', TILE.stone);
      A.cyl(0, 6.6, 0, 1.45, 0, 1.6, 4, roof, TILE.roof, false);
      A.cyl(0, 5.45, 0, 0.42, 0.22, 0.75, 7, '#c8a040', TILE.glow, true);
      A.box(0, 0, 0.91, 0.8, 1.5, 0.1, '#5a3a20', TILE.planks);
      if (FIN) { A.box(0, -0.05, 0, 2.1, 0.5, 2.1, FIN.plinth, TILE.stone); A.box(0, 4.95, 0, 2.05, 0.28, 2.05, FIN.trim, TILE.white); doorFrame(A, 0, 0.8, 1.5, 0, 0.9); }
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
// Six lighthouse designs, picked from the island's seed (Tama always keeps the classic red-and-white one).
// Each sets extra.lamp (the lantern room, radius ~1) and extra.beam (where the light turns).
export const LH_KINDS = ['classic', 'slim', 'brick', 'iron', 'squat', 'pagoda'];
const STRIPES = [['#d8403a', '#f4f0e6'], ['#2a2a30', '#f4f0e6'], ['#3c78c8', '#f4f0e6'], ['#e8a838', '#f4f0e6']];
export const lighthouseKind = (d) => d.id === '0,-1' ? 'classic' : LH_KINDS[hash2(d.seed, 23, 7) % LH_KINDS.length];
// ---------------------------------------------------------------------------
// The deep forms (docs/ART_SPEC.md 5.2-5.4): in the Dim (S4) and the Lid (S5) the wild islands grow bone. Ribs, a spine of vertebrae, a throat
// chimney; in the Lid they all lean towards Tama (the centre), arches stand in rows, and sockets glow magenta. Dark-mood props only (D), so
// the bright game never sees them; their own rng, so no island moves. Budget: <= 200 triangles in S4, <= 420 in S5; <= 4 glow quads.
// ---------------------------------------------------------------------------
const BONE = '#8a7e78', SCAR = '#6a3a40', WETB = '#241014', DUCT = '#4a2f66';
function abyssForms(d, D, extra) {
  if (d.blight || d.type === 'harbour' || d.lm || d.dread < 0.62) return;
  const r = mulberry32(hash2(d.seed, 77, 4)), deep = d.dread >= 0.82;
  const cx = -d.x, cz = -d.z, cl = Math.hypot(cx, cz) || 1, dx = cx / cl, dz = cz / cl;     // the way to the centre, in island-local axes
  const lean = deep ? 0.34 : 0.12;
  const at = (p) => ({ x: p[0], y: p[1], z: p[2] });
  const spine = (p, n, s) => {   // a spine: stacked flattened blobs, bone and scar in turn, leaning at the centre
    D.push(p[0], p[1], p[2], 0, 1, 1, 1, dz * lean, -dx * lean);
    for (let k = 0; k < n; k++) D.blob(0, k * 0.62 * s, 0, 0.62 * s * (1 - k * 0.06), 0.24 * s, 0.62 * s * (1 - k * 0.06), k % 2 ? SCAR : BONE, TILE.bone, 0.12, k + 1);
    D.pop();
  };
  const rib = (p, h, flip) => {   // a rib: a thin 4-sided cylinder, tilted hard, one of a mirrored pair
    D.push(p[0], p[1], p[2], 0, 1, 1, 1, dz * lean + (flip ? 0.6 : -0.6) * (1 - dx * dx), -dx * lean + (flip ? 0.4 : -0.4) * dx);
    D.cyl(0, -0.2, 0, 0.2, 0.08, h, 4, BONE, TILE.bone, false); D.pop();
  };
  const throat = (p, h) => {   // a throat: a fat 6-sided pipe with a dark open lip
    D.cyl(p[0], p[1] - 0.3, p[2], 0.9, 0.7, h, 6, deep ? DUCT : BONE, TILE.stone, false);
    D.cyl(p[0], p[1] + h - 0.35, p[2], 0.95, 0.95, 0.25, 6, WETB, TILE.stone, true);
  };
  const N = deep ? 2 : 1;
  for (let i = 0; i < N; i++) { const p = spot(d, r, 0.25, 0.8, 0.5); if (p) { rib(p, 2.6 + r() * 2, false); rib([p[0] + 0.7, p[1], p[2] + 0.4], 2.4 + r() * 2, true); } }
  { const p = spot(d, r, 0.1, 0.7, 0.5); if (p) spine(p, deep ? 8 : 5, 1.0); }
  { const p = spot(d, r, 0.3, 0.85, 0.5); if (p) throat(p, deep ? 5.5 : 3.2); }
  if (deep) {
    // a ribbed arch: two leaning columns and a lintel, and a socket (a dark slab with a magenta glow in it), never more than two
    const p = spot(d, r, 0.2, 0.7, 0.5);
    if (p) {
      for (const sx of [-1.4, 1.4]) { D.push(p[0] + sx * dz, p[1], p[2] - sx * dx, 0, 1, 1, 1, dz * lean, -dx * lean); D.cyl(0, -0.3, 0, 0.5, 0.35, 5.5, 5, BONE, TILE.bone, false); D.pop(); }
      D.box(p[0], p[1] + 5.0, p[2], 0.9 + Math.abs(dz) * 2.4, 0.5, 0.9 + Math.abs(dx) * 2.4, SCAR, TILE.bone);
      const q = spot(d, r, 0.2, 0.7, 0.5) || p;
      D.box(q[0], q[1] + 0.9, q[2], 0.8, 1.1, 0.14, '#ffffff', TILE.void); D.box(q[0], q[1] + 0.9, q[2] + 0.1, 0.3, 0.5, 0.06, '#ffffff', TILE.spore);
    }
    // one pale pool of light on the water, only in the dark
    const Gp = new Builder(); Gp.cyl(0, 0.35, 0, d.r * 1.5, d.r * 1.5, 0.02, 10, '#3a1030', TILE.white, false);
    (extra.states = extra.states || []).push({ b: Gp, mat: mats.glow, when: (i) => !!i.isDark });
  }
}

export function lighthouse(A, extra, lx, ly, lz, tall = 1, d = null, forceKind = null) {
  const kind = forceKind || (d ? lighthouseKind(d) : 'classic');
  const lamp = (h) => { extra.lamp = { x: lx, y: ly + h, z: lz }; extra.beam = { x: lx, y: ly + h + 0.65, z: lz }; };
  switch (kind) {
    case 'slim': {   // tall, slim and white, one black band under the gallery, a small green door
      A.cyl(lx, ly, lz, 1.5, 1.0, 9 * tall, 8, '#f6f2ea', TILE.white, false);
      A.cyl(lx, ly + 6.2 * tall, lz, 1.17, 1.07, 1.5 * tall, 8, '#2a2a30', TILE.white, false);
      A.cyl(lx, ly + 9 * tall, lz, 1.75, 1.75, 0.3, 8, '#2a2a30', TILE.planks);
      A.box(lx + 1.3, ly, lz, 0.25, 1.4, 0.9, '#2f6a4a', TILE.planks);
      lamp(9.3 * tall);
      A.cyl(lx, ly + 10.6 * tall, lz, 1.3, 0, 1.4, 6, '#2a3a30', TILE.roof);
      break;
    }
    case 'brick': {   // a square stone tower with the keeper's cottage against it
      A.cyl(lx, ly, lz, 2.7, 1.9, 8 * tall, 4, '#c8b8a0', TILE.stone, false);
      A.cyl(lx, ly + 3.4 * tall, lz, 2.25, 2.1, 1.0 * tall, 4, '#a0583c', TILE.wall, false);
      A.box(lx, ly + 8 * tall, lz, 3.4, 0.35, 3.4, '#4a4048', TILE.planks);
      lamp(8.35 * tall);
      A.cyl(lx, ly + 9.65 * tall, lz, 1.9, 0, 1.3, 4, '#4a5a6a', TILE.roof);
      A.box(lx + 3.9, ly, lz, 3.0, 2.2, 3.6, '#e8dcc0', TILE.wall, TILE.white);
      A.gable(lx + 3.9, ly + 2.2, lz, 3.6, 1.4, 4.2, '#a8382c', TILE.roof, '#e8dcc0');
      A.box(lx + 4.7, ly + 3.0, lz - 0.6, 0.55, 1.2, 0.55, '#a89a88', TILE.stone);
      break;
    }
    case 'iron': {   // an open iron frame on four legs, a red lantern room on top, no walls at all
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        A.push(lx + sx * 1.9, ly, lz + sz * 1.9, 0, 1, 1, 1, -sz * 0.13, sx * 0.13);
        A.cyl(0, 0, 0, 0.3, 0.22, 8.4 * tall, 5, '#3a3a44', TILE.white, false);
        A.pop();
      }
      for (const h of [2.4, 5.0]) A.box(lx, ly + h * tall, lz, 3.6 - h * 0.18, 0.3, 3.6 - h * 0.18, '#3a3a44', TILE.white);
      A.cyl(lx, ly, lz, 0.55, 0.5, 8 * tall, 6, '#4a4a54', TILE.white, false);   // the stair column in the middle
      A.box(lx, ly + 8.1 * tall, lz, 3.0, 0.3, 3.0, '#3a3a44', TILE.planks);
      lamp(8.4 * tall);
      A.cyl(lx, ly + 9.7 * tall, lz, 1.5, 0, 1.2, 6, '#c0382f', TILE.roof);
      break;
    }
    case 'squat': {   // short, fat and checkered blue and white, a wide gallery, built to take a storm
      for (let k = 0; k < 3; k++) A.cyl(lx, ly + k * 2.3 * tall, lz, 2.7 - k * 0.2, 2.5 - k * 0.2, 2.3 * tall, 8, k % 2 ? '#f4f0e6' : '#2f5a9a', TILE.white, false);
      A.cyl(lx, ly + 6.9 * tall, lz, 3.1, 3.1, 0.35, 8, '#3a3438', TILE.planks);
      A.box(lx + 2.55, ly, lz, 0.3, 1.7, 1.1, '#5a3a1c', TILE.planks);
      lamp(7.25 * tall);
      A.cyl(lx, ly + 8.55 * tall, lz, 1.6, 0, 1.3, 6, '#2f5a9a', TILE.roof);
      break;
    }
    case 'pagoda': {   // a wooden three-tier lantern tower with glowing windows, the top tier open for the lamp
      for (let k = 0; k < 2; k++) {
        const w = 3.6 - k * 0.7, y = k * 2.9 * tall;
        A.box(lx, ly + y, lz, w, 2.2 * tall, w, '#a8683a', TILE.planks, TILE.white);
        for (const sx of [-1, 1]) A.box(lx + sx * (w / 2 + 0.02), ly + y + 0.9 * tall, lz, 0.1, 0.9, 0.9, '#ffffff', TILE.glow);
        A.cyl(lx, ly + y + 2.2 * tall, lz, w * 0.95, w * 0.36, 0.75 * tall, 4, '#7a3a2a', TILE.roof);
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) A.box(lx + sx * 1.1, ly + 5.8 * tall, lz + sz * 1.1, 0.3, 1.75, 0.3, '#5a2a1a', TILE.planks);
      lamp(5.95 * tall);
      A.cyl(lx, ly + 7.45 * tall, lz, 2.2, 0.6, 1.0 * tall, 4, '#7a3a2a', TILE.roof);
      break;
    }
    default: {   // classic: bands round the tower, a red cap
      const [c1, c2] = d && d.id !== '0,-1' ? STRIPES[hash2(d.seed, 29, 3) % STRIPES.length] : STRIPES[0];
      for (let s = 0; s < 4; s++) A.cyl(lx, ly + s * 2.3 * tall, lz, 1.9 - s * 0.16, 1.9 - (s + 1) * 0.16, 2.3 * tall, 8, s % 2 ? c2 : c1, TILE.white, false);
      A.cyl(lx, ly + 9.2 * tall, lz, 2.2, 2.2, 0.35, 8, '#5a4a40', TILE.planks);
      lamp(9.55 * tall);
      A.cyl(lx, ly + 10.85 * tall, lz, 1.5, 0, 1.2, 6, c1 === '#2a2a30' ? '#2a2a30' : '#c0382f', TILE.roof);
    }
  }
}

// A dead tree: a leaning, tapering trunk and a few crooked bare branches (no leaves), roots clawing at the ground.
function deadTree(A, x, y, z, rng, s = 1) {
  const lean = (rng() - 0.5) * 0.35, ry = rng() * 6.28, h = (3.2 + rng() * 2.6) * s;
  A.push(x, y - 0.2, z, ry, 1, 1, 1, lean, lean * 0.6);
  A.cyl(0, 0, 0, 0.32 * s, 0.07 * s, h, 5, '#2a2226', TILE.bark, false);
  const nb = 3 + Math.floor(rng() * 3);
  for (let k = 0; k < nb; k++) {
    const by = h * (0.45 + 0.45 * (k / nb)), len = (1.2 + rng() * 1.4) * s * (1 - k / (nb + 2));
    A.push(0, by, 0, rng() * 6.28, 1, 1, 1, 0, 0.7 + rng() * 0.7);
    A.cyl(0, 0, 0, 0.09 * s, 0.02, len, 3, '#241c20', TILE.bark, false);
    A.push(0, len * 0.6, 0, rng() * 6.28, 1, 1, 1, 0, 0.8); A.cyl(0, 0, 0, 0.05 * s, 0.01, len * 0.5, 3, '#241c20', TILE.bark, false); A.pop();   // a twig off it
    A.pop();
  }
  A.pop();
  for (let k = 0; k < 3; k++) { const a = ry + k * 2.1; A.push(x + Math.cos(a) * 0.3, y - 0.05, z + Math.sin(a) * 0.3, -a, 1, 1, 1, 0, 1.25); A.cyl(0, 0, 0, 0.12 * s, 0.03, 1.1 * s, 3, '#2a2226', TILE.bark, false); A.pop(); }   // roots
}

// The hut's island: no palms, no flowers, no fruit. Dead trees, grey roots, pale fungus, black stakes in the shallows,
// leaning stones, and crows that do not fly off.
function blightDecor(d, rng, A) {
  const spotB = (t0, t1, hMin) => spot(d, rng, t0, t1, hMin);
  for (let i = 0; i < 11; i++) { const p = spotB(0.15, 0.9, 0.6); if (p) deadTree(A, p[0], p[1], p[2], rng, 0.8 + rng() * 0.6); }
  for (let i = 0; i < 4; i++) { const p = spotB(0.2, 0.85, 0.6); if (p) fallenLog(A, p[0], p[1], p[2], rng() * 3); }
  for (let i = 0; i < 7; i++) {   // pale fungus in clusters
    const p = spotB(0.2, 0.9, 0.5); if (!p) continue;
    for (let k = 0; k < 3; k++) { const fx = p[0] + (rng() - 0.5) * 1.2, fz = p[2] + (rng() - 0.5) * 1.2, fs = 0.35 + rng() * 0.35;
      A.cyl(fx, p[1], fz, 0.07 * fs * 2, 0.05 * fs * 2, 0.5 * fs, 4, '#d8d0c8', TILE.bone, false); A.blob(fx, p[1] + 0.55 * fs, fz, 0.32 * fs, 0.14 * fs, 0.32 * fs, '#c8c0a8', TILE.bone, 0.15, k + i * 3); }
  }
  for (let i = 0; i < 6; i++) { const p = spotB(0.3, 1.0, 0.3); if (p) A.blob(p[0], p[1] + 0.2, p[2], 0.9 + rng() * 0.9, 0.6 + rng() * 0.5, 0.9 + rng() * 0.9, rng() > 0.5 ? '#4c4549' : '#3e383c', TILE.stone, 0.3, i + d.seed); }
  for (let i = 0; i < 16; i++) {   // black stakes and dead roots poking out of the shallows all round
    const th = rng() * 6.28, R = shoreR(d, th) * (0.96 + rng() * 0.16), x = Math.cos(th) * R, z = Math.sin(th) * R;
    A.push(x, -0.6, z, rng() * 6, 1, 1, 1, (rng() - 0.5) * 0.6, (rng() - 0.5) * 0.6); A.cyl(0, 0, 0, 0.14, 0.04, 1.4 + rng() * 1.4, 4, '#1e181b', TILE.bark, false); A.pop();
  }
  for (let i = 0; i < 5; i++) {   // leaning stones, taller than a man
    const p = spotB(0.35, 0.85, 0.6); if (!p) continue;
    A.push(p[0], p[1] - 0.3, p[2], rng() * 6.28, 1, 1, 1, (rng() - 0.5) * 0.4, (rng() - 0.5) * 0.4); A.cyl(0, 0, 0, 0.55, 0.3, 2.4 + rng() * 1.6, 4, '#4a4448', TILE.stone); A.pop();
  }
}

let HUT_SHOWN = false;   // the hut stands on its island only once the story has reached it (World.hutShown)
// The dark hut (a storyline location): a witch's hut in the old sense. Round, low, built of black logs on crooked
// stilts, under a huge steep thatch that sags to the ground on one side; a bent stone chimney, a doorway hung with a
// hide, small windows glowing a sick purple, charms of bone and glass hanging from the eaves, a lantern on a crooked
// post by the path, and a ring of leaning stones round a dark patch of ground. Lives in builder A so it looks the same
// in both moods.
function darkHut(d, rng, A) {
  let th = (hash2(d.seed, 3, 9) % 628) / 100, x = 0, z = 0, h = 0;
  for (let k = 0; k < 12; k++) {
    const t = 0.48, xx = Math.cos(th) * shoreR(d, th) * t, zz = Math.sin(th) * shoreR(d, th) * t, hh = terrainHeight(d, xx, zz);
    if (hh > 0.8) { x = xx; z = zz; h = hh; break; }
    th += 0.5;
  }
  d.hutPos = { x, z, y: h, th };
  const ry = Math.atan2(Math.cos(th), Math.sin(th));   // the door looks out to sea (+z in the hut's frame)
  A.push(x, h - 0.2, z, ry, 1, 1, 1, 0.05, -0.07);       // the whole thing leans
  // crooked stilts and a low mound of stones under it
  for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.28 + 0.3, sx = Math.cos(a) * 1.9, sz = Math.sin(a) * 1.9;
    A.push(sx, -0.8, sz, a, 1, 1, 1, (i % 2 ? 0.12 : -0.1), (i % 3 ? 0.08 : -0.06)); A.cyl(0, 0, 0, 0.17, 0.12, 1.9, 4, '#1c1418', TILE.bark, false); A.pop(); }
  A.blob(0, -0.3, 0, 2.6, 0.5, 2.6, '#3e383c', TILE.stone, 0.3, 11);
  // the body: black logs, round, a little narrower at the top
  A.cyl(0, 0.75, 0, 2.15, 1.95, 2.5, 7, '#4a3934', TILE.bark, true, '#2a2024');
  for (let i = 0; i < 3; i++) A.cyl(0, 1.0 + i * 0.8, 0, 2.2 - i * 0.07, 2.18 - i * 0.07, 0.12, 7, '#221a1c', TILE.bark, false);   // log seams
  // the thatch: a witch's hat, not a tent. A wide low brim of shaggy thatch with ragged flaps hanging off the eaves,
  // then a crooked cone that bends over halfway up, tip off to one side
  A.push(0, 3.15, 0, 0.4, 1, 1, 1, 0.06, 0.1);
  A.cyl(0, 0, 0, 3.0, 1.55, 1.5, 7, '#3e3628', TILE.roof, true, '#2a2418');                 // the brim
  for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.28 + 0.2, fx = Math.cos(a) * 2.75, fz = Math.sin(a) * 2.75;   // ragged flaps
    A.push(fx, -0.15, fz, -a + Math.PI / 2, 1, 1, 1, 0.5 + (i % 3) * 0.12, 0); A.box(0, -0.35 - (i % 2) * 0.2, 0, 0.95, 0.75 + (i % 3) * 0.25, 0.14, i % 2 ? '#342d22' : '#3a3226', TILE.roof); A.pop(); }
  A.push(0, 1.4, 0, 0.9, 1, 1, 1, 0.22, 0.12);
  A.cyl(0, 0, 0, 1.6, 0.85, 1.6, 7, '#3a3226', TILE.roof, false);                            // the cone, first half
  A.push(0, 1.5, 0, 0.5, 1, 1, 1, 0.55, 0.25);
  A.cyl(0, 0, 0, 0.88, 0.05, 1.9, 6, '#342d22', TILE.roof, false);                           // ...bending over
  // a bent stick at the tip with a bird's skull on it
  A.push(0, 1.85, 0, 0, 1, 1, 1, 0.3, -0.4); A.cyl(0, 0, 0, 0.05, 0.03, 0.9, 3, '#1c1418', TILE.bark, false); A.blob(0, 0.95, 0.08, 0.16, 0.13, 0.22, '#e8e0d0', TILE.bone, 0.1, 3); A.box(0, 0.95, 0.3, 0.05, 0.05, 0.18, '#d8d0c0', TILE.bone); A.pop();
  A.pop(); A.pop(); A.pop();
  // a bent stone chimney through the thatch
  A.push(-1.25, 3.6, -0.85, 0, 1, 1, 1, -0.14, 0.24); A.box(0, 0, 0, 0.5, 2.4, 0.5, '#3a3036', TILE.stone); A.box(0.1, 1.35, 0, 0.62, 0.3, 0.62, '#2a2226', TILE.stone); A.pop();
  // the doorway, low, a hide hanging across it, and a plank ramp down to the ground
  A.box(0, 1.05, 2.02, 1.05, 1.75, 0.2, '#0a0608', TILE.white);
  A.box(0.18, 1.2, 2.13, 0.7, 1.35, 0.05, '#4a3a30', TILE.planks);   // the hide, pulled half aside
  A.box(0, 2.05, 2.1, 1.35, 0.18, 0.3, '#1c1418', TILE.bark);        // lintel
  A.push(0, -0.05, 3.15, 0, 1, 1, 1, 0.42, 0); A.box(0, 0, 0, 1.1, 0.14, 2.2, '#2a2024', TILE.planks); A.pop();
  // small windows, glowing (sick purple after the first throw, see TILE.spore)
  A.box(1.35, 1.65, 1.5, 0.5, 0.42, 0.08, '#ffffff', TILE.spore);
  A.box(-1.45, 1.4, 1.35, 0.32, 0.32, 0.08, '#ffffff', TILE.spore);
  A.box(0.4, 1.6, -2.05, 0.42, 0.42, 0.08, '#ffffff', TILE.spore);
  // charms from the eaves: cords with bones, bundles and a glowing jar, turning slowly in no wind
  const charms = [[1.4, 2.0, 'bone'], [-0.9, 2.2, 'bundle'], [2.3, 0.6, 'jar'], [-2.2, 1.1, 'bone'], [0.7, 2.7, 'bundle']];
  for (const [cx, cz, kind] of charms) {
    const len = 0.7 + rng() * 0.5;
    A.box(cx, 2.75 - len / 2, cz, 0.04, len, 0.04, '#1c1418', TILE.rope);
    const y = 2.75 - len - 0.12;
    if (kind === 'bone') { A.box(cx, y, cz, 0.08, 0.3, 0.08, '#e8e0d0', TILE.bone); A.box(cx, y - 0.1, cz, 0.24, 0.06, 0.06, '#e8e0d0', TILE.bone); }
    else if (kind === 'jar') { A.cyl(cx, y - 0.2, cz, 0.13, 0.11, 0.28, 5, '#ffffff', TILE.spore); }
    else A.blob(cx, y, cz, 0.16, 0.22, 0.16, '#4a5a34', TILE.white, 0.25, cx * 7);   // a bundle of dried herbs
  }
  A.pop();
  // a lantern on a crooked post by the path down to the water
  { const a = th + 0.35, px = x + Math.cos(a) * 4.2, pz = z + Math.sin(a) * 4.2, ph = Math.max(0.3, terrainHeight(d, px, pz));
    A.push(px, ph - 0.2, pz, 0, 1, 1, 1, 0.12, -0.1); A.cyl(0, 0, 0, 0.1, 0.07, 2.6, 4, '#1c1418', TILE.bark, false);
    A.box(0.35, 2.45, 0, 0.7, 0.08, 0.08, '#1c1418', TILE.bark); A.box(0.62, 2.1, 0, 0.3, 0.42, 0.3, '#ffffff', TILE.spore); A.pop(); }
  // skulls on poles along the path
  for (let i = 0; i < 3; i++) {
    const a = th + (i - 1) * 0.55, px = x + Math.cos(a) * 5.6, pz = z + Math.sin(a) * 5.6, ph = Math.max(0.3, terrainHeight(d, px, pz));
    A.push(px, ph - 0.2, pz, rng() * 6, 1, 1, 1, (rng() - 0.5) * 0.25, (rng() - 0.5) * 0.25);
    A.box(0, 1.1, 0, 0.12, 2.4, 0.12, '#2a2026', TILE.bark); A.blob(0, 2.45, 0, 0.28, 0.3, 0.28, '#e8e0d0', TILE.bone, 0.08, i + 4); A.box(0, 1.6, 0, 0.7, 0.08, 0.08, '#d8d0c0', TILE.bone);
    A.pop();
  }
  // a ring of leaning stones round a patch of black ground behind the hut
  { const a = th + Math.PI * 0.85, rx = x + Math.cos(a) * 6.5, rz = z + Math.sin(a) * 6.5, rh = Math.max(0.3, terrainHeight(d, rx, rz));
    A.blob(rx, rh - 0.05, rz, 2.3, 0.12, 2.3, '#16121a', TILE.stone, 0.1, 9);
    for (let i = 0; i < 7; i++) { const b = (i / 7) * 6.28, px = rx + Math.cos(b) * 2.6, pz = rz + Math.sin(b) * 2.6, ph = Math.max(0.3, terrainHeight(d, px, pz));
      A.push(px, ph - 0.3, pz, b, 1, 1, 1, (rng() - 0.5) * 0.35, 0.2); A.cyl(0, 0, 0, 0.32, 0.18, 1.4 + rng() * 1.0, 4, '#cfc8d8', TILE.stone); A.pop(); } }
  // a big hollow dead tree beside the hut, with crows that do not fly off
  { const a = th - 1.3, px = x + Math.cos(a) * 4.6, pz = z + Math.sin(a) * 4.6, ph = Math.max(0.3, terrainHeight(d, px, pz));
    deadTree(A, px, ph, pz, rng, 1.6);
    for (let k = 0; k < 3; k++) { const cxw = px + (rng() - 0.5) * 1.6, czw = pz + (rng() - 0.5) * 1.6, cy = ph + 3.2 + k * 0.9;
      A.blob(cxw, cy, czw, 0.2, 0.22, 0.3, '#0e0a0c', TILE.white, 0.1, k); A.blob(cxw, cy + 0.22, czw + 0.18, 0.12, 0.12, 0.12, '#0e0a0c', TILE.white, 0.1, k + 3); A.box(cxw, cy + 0.2, czw + 0.34, 0.05, 0.05, 0.14, '#2a2a2a', TILE.white); } }
}

// ---- the week, the village's custom, and how it grows with your trade: extra layers that are switched on
// by the calendar, the hour or the harbour's growth (see Island: LAYER_RULES)
const BUNT = ['#d24a3e', '#ffd23a', '#3c78c8', '#5ec45a', '#f4f0e6', '#c86a2a'];
function flagLine(b, a, c, k0 = 0) {   // a hanging line of little triangle flags from a to c (no thin rope: the flags are the line)
  const n = Math.max(3, Math.round(Math.hypot(c[0] - a[0], c[2] - a[2]) / 0.9));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, sag = Math.sin(t * Math.PI) * 0.7;
    const x = a[0] + (c[0] - a[0]) * t, y = a[1] + (c[1] - a[1]) * t - sag, z = a[2] + (c[2] - a[2]) * t;
    const dx = (c[0] - a[0]) / n * 0.45, dz = (c[2] - a[2]) / n * 0.45, col = BUNT[(i + k0) % BUNT.length];
    b.tri([x - dx, y, z - dz], [x + dx, y, z + dz], [x, y - 0.6, z], col, TILE.flag); b.tri([x + dx, y, z + dz], [x - dx, y, z - dz], [x, y - 0.6, z], col, TILE.flag);
  }
}

// ---- Tama's look: the garden harbour (chosen 2026-11-12 from three polish options). The houses stand where the plain build puts
// them (same rng, same kinds); only their finish, the ground, paths, the landing, the pier, plants and props are added: lush grass,
// sandy paths, white picket fences, bougainvillea, flowering trees and beds, a plank boardwalk and a roped pier.
const TAMA_LOOK = 'b';
const DOORS = ['#2f8a8a', '#3c6ec8', '#c8402e', '#e8b030', '#3f8a5a', '#f4f0e4'];
const TAMA_FIN = { b: { walls: null, roofs: { '#7a4ab0': '#c8583a' }, trim: '#f2ead6', plinth: '#a89a80', boxes: true, vine: true, doors: DOORS, blooms: ['#e8407a', '#f0c030', '#f4f0e8', '#c078e0'] } };
const TAMA_GROUND = { b: ['#5aac48', '#6cba52'] };
const finCol = (map, col) => (map && map[col]) || col;
const hashXZ = (x, z, k = 0) => { const h = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return h - Math.floor(h); };
function doorFrame(A, dx, dw, dh, dy, zf) {   // jambs and a lintel round a door, in the trim colour
  for (const s of [-1, 1]) A.box(dx + s * (dw / 2 + 0.08), dy, zf + 0.03, 0.18, dh + 0.1, 0.14, FIN.trim, TILE.white);
  A.box(dx, dy + dh, zf + 0.03, dw + 0.36, 0.2, 0.16, FIN.trim, TILE.white);
}
function awning(A, cx, y, zf, wid, cols) {   // a striped canvas awning, sloping down to the front, with a scalloped edge
  A.push(cx, y, zf, 0, 1, 1, 1, 0.42);
  const n = Math.max(3, Math.round(wid / 0.36));
  for (let i = 0; i < n; i++) { const sx = -wid / 2 + (i + 0.5) * wid / n; A.box(sx, 0, 0.55, wid / n, 0.07, 1.1, cols[i % 2], TILE.sail); A.box(sx, -0.2, 1.08, wid / n * 0.8, 0.2, 0.06, cols[i % 2], TILE.sail); }
  A.pop();
}
function finishHouse(A, o) {   // trim, plinth, painted door, flower boxes, ridge and chimney caps (house-local: front is +z)
  const F = FIN, hw = o.w / 2, hd = o.dep / 2, h0 = o.h0 || 0, k = hashXZ(o.x, o.z);
  if (!o.noPlinth && !o.plank) A.box(0, -0.05, 0, o.w + 0.16, 0.45, o.dep + 0.16, F.plinth, TILE.stone);
  if (!o.plank && !o.thatch) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) A.box(sx * hw, h0 + (o.noPlinth ? 0 : 0.4), sz * hd, 0.3, o.h - h0 - (o.noPlinth ? 0 : 0.4), 0.3, F.trim, TILE.white);   // quoins
    A.box(0, o.h - 0.26, 0, o.w + 0.16, 0.26, o.dep + 0.16, F.trim, TILE.white);   // the eave band
  }
  const [dx, dw, dh, dy = 0] = o.door;
  if (!o.plank) {
    doorFrame(A, dx, dw, dh, dy, hd);
    A.box(dx, dy + 0.05, hd + 0.1, dw - 0.14, dh - 0.12, 0.05, F.doors[Math.floor(k * F.doors.length)], TILE.planks);   // a painted door
  }
  if (!o.porch) A.box(dx, -0.06, hd + 0.4, dw + 0.6, 0.2, 0.7, F.plinth, TILE.stone);   // a stone step
  if (F.boxes) for (const wx of o.wins) {
    const zf = (o.winZ == null ? hd : o.winZ) + 0.17;
    A.box(wx, o.winY, zf, 0.86, 0.2, 0.3, '#6b4a2e', TILE.planks);
    A.blob(wx, o.winY + 0.26, zf, 0.42, 0.14, 0.16, '#3f8a38', TILE.white, 0.3, 3);
    for (let i = 0; i < 3; i++) A.blob(wx + (i - 1) * 0.26, o.winY + 0.34, zf + 0.06, 0.12, 0.12, 0.12, F.blooms[Math.floor(hashXZ(o.x + i, o.z, wx) * F.blooms.length)], TILE.white, 0.05, i);
  }
  if (o.rh) A.box(0, o.h + o.rh - (o.thatch ? 0.22 : 0.12), 0, o.thatch ? 0.6 : 0.34, o.thatch ? 0.34 : 0.22, o.dep + (o.thatch ? 1.1 : 0.7), o.thatch ? '#8a7038' : '#7a3a2a', o.thatch ? TILE.rope : TILE.roof);   // ridge
  if (o.chim) { const [cx, cy, cz, cs] = o.chim; A.box(cx, cy, cz, cs + 0.2, 0.16, cs + 0.2, F.trim, TILE.stone); A.cyl(cx, cy + 0.16, cz, 0.13, 0.11, 0.3, 5, '#b8603a', TILE.stone, true); }
  if (F.pots && !o.plank) for (const s of [-1, 1]) { const px = dx + s * (dw / 2 + 0.45); if (o.porch && Math.abs(px) > hw) continue; A.cyl(px, (o.porch ? 0.22 : 0), hd + (o.porch ? 0.5 : 0.35), 0.22, 0.17, 0.36, 6, '#b8603a', TILE.stone, true); A.blob(px, (o.porch ? 0.22 : 0) + 0.55, hd + (o.porch ? 0.5 : 0.35), 0.3, 0.26, 0.3, k > 0.5 ? '#3f8a38' : '#4a9a40', TILE.leaf, 0.3, 2); A.blob(px, (o.porch ? 0.22 : 0) + 0.78, hd + (o.porch ? 0.55 : 0.4), 0.11, 0.11, 0.11, F.blooms ? F.blooms[s > 0 ? 0 : 1] : '#e8407a', TILE.white, 0.05, 1); }
  if (F.vine && k > 0.3) {   // bougainvillea climbing one front corner
    const sx = k > 0.65 ? 1 : -1;
    for (let i = 0; i < 4; i++) A.blob(sx * (hw + 0.1) - sx * i * 0.25, 0.5 + i * (o.h - 0.4) / 4, hd + 0.12, 0.4 - i * 0.04, 0.42, 0.22, i % 2 ? '#d83a8a' : '#e85aa0', TILE.leaf, 0.35, i);
    A.blob(sx * (hw + 0.1), 0.25, hd + 0.12, 0.3, 0.3, 0.25, '#3f7a34', TILE.leaf, 0.3, 7);
  }
  if (F.awn && !o.plank) {
    const cols = F.awn[Math.floor(k * F.awn.length)];
    if (o.porch) for (const wx of o.wins) awning(A, wx, 1.95, hd + 0.05, 1.1, cols);
    else awning(A, dx, (o.door[3] || 0) + o.door[2] + 0.28, hd + 0.05, dw + 0.9, cols);
    if (o.tavern) for (const wx of [-1.75, 1.75]) awning(A, wx, 2.0, hd + 0.05, 1.2, cols);
  }
}
function lampPost(A, x, y, z, ry) {   // a black iron post with an arm and a hanging lantern
  A.push(x, y, z, ry);
  A.box(0, 0, 0, 0.4, 0.3, 0.4, '#5a5a5e', TILE.stone); A.box(0, 0.3, 0, 0.16, 2.7, 0.16, '#2a2a30', TILE.bark);
  A.box(0.32, 2.85, 0, 0.8, 0.12, 0.12, '#2a2a30', TILE.bark);
  A.box(0.62, 2.22, 0, 0.36, 0.44, 0.36, '#ffffff', TILE.glow); A.box(0.62, 2.66, 0, 0.5, 0.12, 0.5, '#2a2a30', TILE.bark);
  A.pop();
}
function hibiscus(A, x, y, z, s, col) { A.blob(x, y + 0.4 * s, z, 0.75 * s, 0.6 * s, 0.75 * s, '#3f8a38', TILE.leaf, 0.3, Math.floor(x * 3 + z)); for (let i = 0; i < 5; i++) { const a = i * 1.26 + x; A.blob(x + Math.cos(a) * 0.55 * s, y + (0.55 + (i % 2) * 0.3) * s, z + Math.sin(a) * 0.55 * s, 0.13, 0.13, 0.13, col, TILE.white, 0.05, i); } }
function tuft(A, x, y, z, col, k) { for (let i = 0; i < 3; i++) { const a = k * 6.28 + i * 2.1; A.tri([x - Math.sin(a) * 0.18, y, z + Math.cos(a) * 0.18], [x + Math.sin(a) * 0.18, y, z - Math.cos(a) * 0.18], [x + Math.cos(a) * 0.3, y + 0.45 + (i % 2) * 0.15, z + Math.sin(a) * 0.3], col, TILE.leaf); A.tri([x + Math.sin(a) * 0.18, y, z - Math.cos(a) * 0.18], [x - Math.sin(a) * 0.18, y, z + Math.cos(a) * 0.18], [x + Math.cos(a) * 0.3, y + 0.45 + (i % 2) * 0.15, z + Math.sin(a) * 0.3], col, TILE.leaf); } }
function bloomTree(S, x, y, z, s, crown, flower) {   // a flowering tree (flamboyant, frangipani); a bare claw in the dark mood
  const { A, B, D } = S;
  A.cyl(x, y - 0.1, z, 0.3 * s, 0.22 * s, 1.7 * s, 5, '#6b4a2e', TILE.bark, false);
  B.blob(x, y + 2.2 * s, z, 1.7 * s, 0.95 * s, 1.7 * s, crown, TILE.leaf, 0.25, Math.floor(x * 7 + z));
  for (let i = 0; i < 8; i++) { const a = i * 0.8 + x, rr = i % 2 ? 1.45 : 0.8; B.blob(x + Math.cos(a) * rr * s, y + (i % 2 ? 2.55 : 3.05) * s, z + Math.sin(a) * rr * s, 0.48 * s, 0.32 * s, 0.48 * s, flower, TILE.white, 0.2, i); }
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + x; D.tri([x, y + 1.2 * s, z], [x + Math.cos(a) * 0.3, y + 2.3 * s, z + Math.sin(a) * 0.3], [x + Math.cos(a) * 1.3 * s, y + 2.6 * s, z + Math.sin(a) * 1.3 * s], '#6a6070', TILE.bone, [[0.5, 0], [0, 0.5], [0.5, 1]]); }
}
function picketFence(A, x0, x1, gap0, gap1) {   // house-local, along x at z = 0
  for (let x = x0; x <= x1 + 0.01; x += 0.42) if (x < gap0 || x > gap1) A.box(x, 0, 0, 0.14, 0.78, 0.1, '#f4f0e4', TILE.white);
  for (const [a, b] of [[x0, gap0], [gap1, x1]]) if (b - a > 0.3) for (const y of [0.22, 0.56]) A.box((a + b) / 2, y, -0.05, b - a, 0.1, 0.06, '#e8e2d2', TILE.white);
}
function tamaPolish(S, look, houses) {
  const { d, dockTh, A, B, D, R, z0, z1 } = S, r = mulberry32(d.seed + 4242), H = d.H;
  const g = (x, z) => Math.min(H, terrainHeight(d, x, z));
  const ax = Math.cos(dockTh), az = Math.sin(dockTh);
  const rP = 6;
  const pal = { path: ['#f0d49c', '#e4c48c'], pt: TILE.sand, sq: '#f0dca8', sq2: '#e4c48c', edge: '#c8a878', quay: '#c89060', cope: '#6b4a2e', wall: '#e0d0b0' };
  const nearHouse = (x, z, rr, skip) => houses.some((h) => h !== skip && Math.hypot(h.x - x, h.z - z) < rr);
  const slab = (x, z, w, l, ry, col) => { A.push(x, g(x, z) - 0.07, z, ry); A.box(0, 0, 0, w, 0.11, l, col, pal.pt); A.pop(); };
  // the square: a green ringed by a path and flower beds
  A.orient([0, -100, 0]);
  for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283; slab(Math.cos(a) * rP, Math.sin(a) * rP, 1.6, 1.3, -a, pal.path[i % 2]); }
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283 + 0.2; if (Math.abs(angleDiff(a, dockTh)) < 0.35) continue; hibiscus(A, Math.cos(a) * (rP - 1.4), H - 0.1, Math.sin(a) * (rP - 1.4), 0.55, ['#e8407a', '#f0c030', '#f4f0e8', '#e85a3a'][i % 4]); }
  A.orient(null);
  // paths from every door to the square
  const DX = { cottage: -0.8, townhouse: 0.6, thatch: -0.7 };
  for (const h of houses) {
    const fx = Math.sin(h.ry), fz = Math.cos(h.ry), lxh = fz, lzh = -fx, ox = DX[h.kind] || 0;
    const sx = h.x + lxh * ox + fx * 2.2, sz = h.z + lzh * ox + fz * 2.2, L = Math.hypot(sx, sz) - rP + 0.2;
    if (L < 0.5) continue;
    const ux = -sx / Math.hypot(sx, sz), uz = -sz / Math.hypot(sx, sz), pry = Math.atan2(ux, uz);
    for (let t = 0; t < L; t += 0.9) {
      const x = sx + ux * t + (r() - 0.5) * 0.2, z = sz + uz * t + (r() - 0.5) * 0.2;
      if (nearHouse(x, z, 2.6, h)) break;
      slab(x, z, 1.4, 0.75, pry + (r() - 0.5) * 0.25, pal.path[Math.floor(r() * 2)]);
    }
  }
  // the street down to the landing
  const tq = 0.875;   // where the quay begins (fraction of the shore radius at the pier)
  for (let s = rP + 0.3; s < R * tq + 0.6; s += 0.9) for (const o of [-0.75, 0.75]) {
    const x = ax * s - az * o + (r() - 0.5) * 0.15, z = az * s + ax * o + (r() - 0.5) * 0.15;
    slab(x, z, 1.5, 0.8, Math.PI / 2 - dockTh + (r() - 0.5) * 0.2, pal.path[Math.floor(r() * 2)]);
  }
  // the landing: a plank boardwalk along the shore either side of the pier, sitting low, close to the beach
  const span = 0.3, yQ = 0.86, steps = Math.round(span * 2 / 0.06), wood = true;
  for (let i = 0; i < steps; i++) {
    const t0 = dockTh - span + i * 0.06, t1 = t0 + 0.06, tm = (t0 + t1) / 2;
    const ri0 = shoreR(d, t0) * 0.82, ri1 = shoreR(d, t1) * 0.82, ro0 = shoreR(d, t0) * 0.93, ro1 = shoreR(d, t1) * 0.93;
    const P = (th, rr, y) => [Math.cos(th) * rr, y, Math.sin(th) * rr];
    A.orient([0, -100, 0]); A.quad(P(t0, ri0, yQ), P(t1, ri1, yQ), P(t1, ro1, yQ), P(t0, ro0, yQ), pal.quay, wood ? TILE.planks : TILE.sand);
    A.orient([0, yQ, 0]); A.quad(P(t0, ro0, -0.6), P(t1, ro1, -0.6), P(t1, ro1, yQ), P(t0, ro0, yQ), wood ? '#5a3e24' : '#f0e4cc', wood ? TILE.planks : TILE.stone);
    if (i === 0 || i === steps - 1) { const te = i === 0 ? t0 : t1, ri = i === 0 ? ri0 : ri1, ro = i === 0 ? ro0 : ro1; A.orient([Math.cos(tm) * ro * 0.9, yQ, Math.sin(tm) * ro * 0.9]); A.quad(P(te, ri, -0.6), P(te, ro, -0.6), P(te, ro, yQ), P(te, ri, yQ), wood ? '#5a3e24' : '#f0e4cc', wood ? TILE.planks : TILE.stone); }
    A.orient(null);
    const rm = shoreR(d, tm) * 0.93, onPier = Math.abs(angleDiff(tm, dockTh)) * rm < 2.0;
    if (onPier) continue;
    A.push(Math.cos(tm) * rm, yQ, Math.sin(tm) * rm, Math.PI / 2 - tm);
    if (wood) { A.cyl(0, -1.7, -0.1, 0.18, 0.16, 2.8, 5, '#4a3524', TILE.bark); if (i % 3 === 0) A.box(0, 0, -0.35, 0.16, 0.9, 0.16, '#6b4a2e', TILE.bark); }
    else { A.box(0, 0, -0.25, 0.06 * rm + 0.04, 0.2, 0.55, pal.cope, TILE.white); if (i % 3 === 1) { A.cyl(0, 0.2, -0.55, 0.2, 0.16, 0.42, 6, '#2e2e34', TILE.stone, true); A.cyl(0, 0.62, -0.55, 0.26, 0.26, 0.1, 6, '#2e2e34', TILE.stone, true); } }
    A.pop();
  }
  if (wood) for (let i = 0; i < steps; i += 3) { const t0 = dockTh - span + i * 0.06, t1 = Math.min(dockTh + span, t0 + 0.18), ro = 0.92;   // a rope rail along the boardwalk's edge
    if (Math.abs(angleDiff((t0 + t1) / 2, dockTh)) * shoreR(d, dockTh) < 2.4) continue;
    const a = [Math.cos(t0) * shoreR(d, t0) * ro, yQ + 0.82, Math.sin(t0) * shoreR(d, t0) * ro], c = [Math.cos(t1) * shoreR(d, t1) * ro, yQ + 0.82, Math.sin(t1) * shoreR(d, t1) * ro];
    A.push((a[0] + c[0]) / 2, yQ + 0.72, (a[2] + c[2]) / 2, Math.atan2(c[0] - a[0], c[2] - a[2])); A.box(0, 0, 0, 0.12, 0.12, Math.hypot(c[0] - a[0], c[2] - a[2]), '#c8b080', TILE.rope); A.pop(); }
  const quayAt = (th, f) => { const rr = shoreR(d, th) * f; return [Math.cos(th) * rr, Math.sin(th) * rr]; };
  // the pier's finish: dark stringers, bollards; a rope rail (b), plank railings and lamps (c)
  A.push(0, 0, 0, Math.PI / 2 - dockTh);
  for (const sx of [-1.45, 1.45]) A.box(sx, 0.4, (R * 0.85 + z1) / 2, 0.2, 0.3, z1 - R * 0.85, '#4a3524', TILE.bark);
  for (let z = R * 0.95 + 2, i = 0; z < z1 - 1; z += 4.4, i++) { const sx = i % 2 ? 1.2 : -1.2; A.cyl(sx, 0.84, z, 0.17, 0.14, 0.42, 6, '#2e2e34', TILE.stone, true); A.cyl(sx, 1.26, z, 0.23, 0.23, 0.09, 6, '#2e2e34', TILE.stone, true); }
  for (const sx of [-1.38, 1.38]) for (let z = R * 1.02; z < z1 - 1; z += 2.6) { A.box(sx, 0.84, z, 0.14, 1.0, 0.14, '#6b4a2e', TILE.bark); if (z + 2.6 < z1 - 1) A.box(sx, 1.66, z + 1.3, 0.11, 0.11, 2.6, '#c8b080', TILE.rope); }
  A.pop();
  // lamps
  const lamps = [[rP + 1.5, 1]];
  for (const [s, side] of lamps) { const o = 1.8, x = ax * s - az * o * side, z = az * s + ax * o * side; lampPost(A, x, g(x, z) - 0.05, z, Math.atan2(-az * side, ax * side) - Math.PI / 2); }
  // free ground: grass tufts and flowers where nothing stands
  const free = (x, z) => Math.hypot(x, z) > rP + 1.2 && !nearHouse(x, z, 3.6) && Math.abs(angleDiff(Math.atan2(z, x), dockTh)) * Math.hypot(x, z) > 2.8;
  const tuftCols = ['#3f8a38', '#5aa844', '#4a9a40'];
  for (let i = 0; i < 90; i++) { const th = r() * 6.283, rr = shoreR(d, th) * (0.2 + r() * 0.62), x = Math.cos(th) * rr, z = Math.sin(th) * rr; if (!free(x, z) || g(x, z) < H - 0.05) continue; tuft(A, x, g(x, z) - 0.05, z, tuftCols[i % 3], r()); if (i % 4 === 0) flowers(A, x + 0.6, g(x, z), z, r); }
  // plants by the houses: a hibiscus or two at the side of each door
  for (const h of houses) { if (h.kind === 'belltower') continue; const fx = Math.sin(h.ry), fz = Math.cos(h.ry), lxh = fz, lzh = -fx; for (const s of [-1, 1]) { const x = h.x + lxh * s * 3.4 + fx * 1.6, z = h.z + lzh * s * 3.4 + fz * 1.6; if (nearHouse(x, z, 2.4, h)) continue; hibiscus(A, x, g(x, z) - 0.1, z, 0.8, ['#e8407a', '#f0c030', '#e85a3a', '#f4f0e8'][Math.floor(r() * 4)]); } }
  // the open ground beyond the houses: kitchen gardens, groves
  const used = [];
  const blocked = (th, t) => (t > 0.7 && Math.abs(angleDiff(th, dockTh)) > 1.0 && Math.abs(angleDiff(th, dockTh)) < 1.85) || (t > 0.5 && Math.abs(angleDiff(th, dockTh + Math.PI)) < 0.5);   // the ruins, the lighthouse
  const pickSpots = (n, t0, t1, rr) => { const out = []; for (let i = 0; i < 200 && out.length < n; i++) { const th = r() * 6.283, t = t0 + r() * (t1 - t0), R0 = shoreR(d, th) * t, x = Math.cos(th) * R0, z = Math.sin(th) * R0; if (blocked(th, t) || !free(x, z) || nearHouse(x, z, rr + 3.2) || Math.abs(angleDiff(th, dockTh)) < 0.6 || used.some((u) => Math.hypot(u[0] - x, u[1] - z) < u[2] + rr)) continue; used.push([x, z, rr]); out.push([x, z, th]); } return out; };
  const plot = (x, z, ry, w, l, inner) => {   // a garden plot inside a low whitewashed wall with a gap for the gate
    A.push(x, g(x, z) - 0.08, z, ry);
    A.box(0, 0, -l / 2, w, 0.6, 0.4, pal.wall, TILE.stone); A.box(-w / 2, 0, 0, 0.4, 0.6, l, pal.wall, TILE.stone); A.box(w / 2, 0, 0, 0.4, 0.6, l, pal.wall, TILE.stone);
    for (const s of [-1, 1]) A.box(s * (w / 4 + 0.4), 0, l / 2, w / 2 - 0.8, 0.6, 0.4, pal.wall, TILE.stone);
    A.box(0, 0.6, -l / 2, w + 0.1, 0.1, 0.5, '#ffffff', TILE.white);
    for (let j = 0; j < Math.floor(l - 1); j++) { const zz = -l / 2 + 1 + j; A.box(0, 0, zz, w - 1.2, 0.18, 0.5, '#7a5a3a', TILE.white); if (inner === 'veg') A.box(0, 0.18, zz, w - 1.4, 0.24, 0.32, j % 2 ? '#5aa844' : '#8ac455', TILE.leaf); else for (let q = 0; q < Math.floor(w - 1.6); q++) A.blob(-w / 2 + 1.2 + q, 0.35, zz, 0.32, 0.28, 0.28, ['#e8407a', '#f0c030', '#f4f0e8', '#e85a3a'][(q + j) % 4], TILE.leaf, 0.2, q + j); }
    A.pop();
  };
  // per look
  {   // the garden harbour
    for (const h of houses) {   // a picket fence across each front yard, open at the path
      if (h.kind === 'belltower') continue;
      const rho = Math.hypot(h.x, h.z), fz = Math.min(4.6, rho - rP - 1.6); if (fz < 3.2) continue;
      A.push(h.x, H - 0.08, h.z, h.ry); A.push(0, 0, fz); const ox = DX[h.kind] || 0; picketFence(A, -3.0, 3.0, ox - 0.8, ox + 0.8); A.pop(); A.pop();
    }
    pickSpots(12, 0.3, 0.84, 2.6).forEach(([x, z], i) => { const k = i % 3; bloomTree(S, x, g(x, z) - 0.1, z, 0.95 + r() * 0.35, k === 0 ? '#4a9a40' : '#3f8a38', k === 0 ? '#f4f0e8' : k === 1 ? '#e8402e' : '#f0a0c0'); });
    pickSpots(3, 0.5, 0.7, 4.2).forEach(([x, z, th]) => { A.push(x, g(x, z) - 0.08, z, Math.PI / 2 - th); for (const [hx, hz, hw, hl] of [[0, -2.4, 6.4, 0.8], [-3.2, 0, 0.8, 5.6], [3.2, 0, 0.8, 5.6]]) A.blob(hx, 0.45, hz, hw / 2, 0.55, hl / 2, '#3f8a38', TILE.leaf, 0.15, Math.floor(hx + hz)); for (let j = 0; j < 4; j++) { A.box(0, 0, -1.4 + j * 0.95, 5.2, 0.18, 0.5, '#7a5a3a', TILE.white); A.box(0, 0.18, -1.4 + j * 0.95, 5.0, 0.26, 0.32, j % 2 ? '#5aa844' : '#d8b848', TILE.leaf); } A.pop(); });   // hedged kitchen gardens
    { // the open ground either side of the street, between the pier and the square: used, not empty (STYLE 8.4). Its own rng (r): the houses do not move
      const nearStreet = (n, rr) => { const out = []; for (let i = 0; i < 240 && out.length < n; i++) { const side = r() < 0.5 ? -1 : 1, th = dockTh + side * (0.2 + r() * 0.45), t = 0.42 + r() * 0.36, R0 = shoreR(d, th) * t, x = Math.cos(th) * R0, z = Math.sin(th) * R0; if (!free(x, z) || nearHouse(x, z, rr + 3) || used.some((u) => Math.hypot(u[0] - x, u[1] - z) < u[2] + rr)) continue; used.push([x, z, rr]); out.push([x, z, th]); } return out; };
      const [wl, nr, kp, st] = nearStreet(4, 2.6);
      if (wl) { const [x, z, th] = wl, len = 4.2, cols = ['#f4f0e4', '#d83a3a', '#3c78c8', '#e8c060', '#f0a0c0', '#5ec45a'];   // a washing line
        A.push(x, g(x, z) - 0.05, z, -th); for (const sx of [-1, 1]) A.box(sx * len / 2, 0, 0, 0.2, 2.6, 0.2, '#5a3e24', TILE.bark);
        for (let i = 0; i < 4; i++) A.box(-len / 2 + 0.85 + i * (len - 1.7) / 3, 1.0 + (i % 2) * 0.15, 0, 0.72, 1.05 - (i % 2) * 0.2, 0.08, cols[Math.floor(r() * cols.length)], TILE.white);
        A.box(0, 2.45, 0, len, 0.14, 0.14, '#8a6a4a', TILE.rope); A.pop(); }
      if (nr) fishRack(A, nr[0], g(nr[0], nr[1]) - 0.05, nr[1], Math.PI / 2 - nr[2]);   // nets drying
      if (kp) { const [x, z, th] = kp; A.push(x, g(x, z) - 0.08, z, Math.PI / 2 - th);   // a kitchen patch, small, hedged on one side
        A.blob(0, 0.45, -1.6, 2.4, 0.5, 0.4, '#3f8a38', TILE.leaf, 0.15, 7);
        for (let j = 0; j < 3; j++) { A.box(0, 0, -0.9 + j * 0.9, 3.6, 0.18, 0.5, '#7a5a3a', TILE.white); A.box(0, 0.18, -0.9 + j * 0.9, 3.4, 0.26, 0.32, j % 2 ? '#d8b848' : '#5aa844', TILE.leaf); }
        A.pop(); }
      if (st) { const [x, z, th] = st, y = g(x, z) - 0.05;   // a little stack by the landing
        barrel(A, x, y, z, 0.95); barrel(A, x + 0.85, y, z + 0.25, 0.85); crateBox(A, x - 0.4, y, z + 1.0, th, 0.9); ropeCoil(A, x + 1.1, y, z - 0.8, 1.0); }
    }
    pickSpots(4, 0.66, 0.86, 2.2).forEach(([x, z]) => palm(A, B, D, x, g(x, z), z, r, 1.0 + r() * 0.4));
    { const [x, z] = quayAt(dockTh + 0.22, 0.86); palm(A, B, D, x, g(x, z), z, r, 1.1 + r() * 0.3); }
    for (let i = 0; i < 5; i++) { const a = dockTh + Math.PI * 0.6 + i * 0.5, x = Math.cos(a) * (rP + 3), z = Math.sin(a) * (rP + 3); if (nearHouse(x, z, 3)) continue; A.push(x, H - 0.08, z, -a); for (let j = 0; j < 4; j++) A.box(0, 0, (j - 1.5) * 0.55, 1.6, 0.2, 0.32, '#6a4a2c', TILE.white), A.box(0, 0.2, (j - 1.5) * 0.55, 1.4, 0.24, 0.2, j % 2 ? '#5aa844' : '#d8402e', TILE.leaf); A.pop(); }   // vegetable rows
  }
}
function floatLantern(b, x, z) { b.box(x, 0.2, z, 0.7, 0.18, 0.7, '#8a5a30', TILE.planks); b.box(x, 0.38, z, 0.36, 0.42, 0.36, '#ffffff', TILE.glow); }
function boatAt(b, x, z, ry, lantern) {
  b.push(x, 0, z, ry); b.box(0, -0.1, 0, 1.4, 0.5, 3.2, '#a06a3a', TILE.planks); b.box(0, 0.4, 0, 1.0, 0.05, 2.6, '#6b4a2e', TILE.planks);
  if (lantern) { b.box(0, 0.4, 1.1, 0.08, 1.6, 0.08, '#3a3036', TILE.bark); b.box(0, 2.0, 1.1, 0.3, 0.34, 0.3, '#ffffff', TILE.glow); }
  b.pop();
}
function weekAndCustoms(d, rng, cr, g) {
  const { yy, R, dockTh, z1, at, dockAt } = g, ry = Math.PI / 2 - dockTh;
  const L = (k) => (cr[k] = cr[k] || new Builder());
  // market day (every harbour, once a week): more stalls, more people
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.4, r = 7 + rng() * 2, x = Math.cos(a) * r, z = Math.sin(a) * r; marketStall(L('market'), x, yy, z, Math.atan2(-x, -z) + Math.PI, rng); villager(L('market'), x * 1.2, yy, z * 1.2, Math.atan2(-x, -z), rng, 'market'); }
  for (let i = 0; i < 8; i++) { const [x, z] = at(0.15, 0.5); villager(L('market'), x, yy, z, rng() * 6.28, rng, pickCol(rng, ['fisher', 'oldsalt', 'child', 'docker'])); }
  // its own festival day: bunting round the square, lanterns on the poles
  { const poles = 6, pts = [];
    for (let i = 0; i < poles; i++) { const a = (i / poles) * Math.PI * 2, x = Math.cos(a) * 10, z = Math.sin(a) * 10; L('festival').box(x, yy, z, 0.22, 5, 0.22, '#6b4a2e', TILE.bark); L('festival').box(x, yy + 5, z, 0.45, 0.45, 0.45, '#ffffff', TILE.glow); pts.push([x, yy + 4.8, z]); }
    L('festival').box(0, yy, 0, 0.26, 6.5, 0.26, '#6b4a2e', TILE.bark);
    for (let i = 0; i < poles; i++) { flagLine(L('festival'), pts[i], pts[(i + 1) % poles], i); flagLine(L('festival'), pts[i], [0, yy + 6.3, 0], i + 2); } }
  // lantern night (every harbour, once a week): little lanterns set afloat round the island
  for (let i = 0; i < 22; i++) { const th = rng() * Math.PI * 2, rho = shoreR(d, th) * (1.12 + rng() * 0.35); floatLantern(L('lantern'), Math.cos(th) * rho, Math.sin(th) * rho); }
  // the village's own custom
  if (d.custom === 'kites') for (let i = 0; i < 4; i++) {
    const [x, z] = at(0.1, 0.6), h = yy + 9 + rng() * 5, c = BUNT[i % BUNT.length], s = 0.9 + rng() * 0.4, k = L('kites');
    k.tri([x - s, h, z], [x, h + s * 1.3, z], [x + s, h, z], c, TILE.flag); k.tri([x + s, h, z], [x, h + s * 1.3, z], [x - s, h, z], c, TILE.flag);
    k.tri([x - s, h, z], [x + s, h, z], [x, h - s * 1.6, z], c, TILE.flag); k.tri([x + s, h, z], [x - s, h, z], [x, h - s * 1.6, z], c, TILE.flag);
    for (let j = 1; j <= 3; j++) k.box(x + j * 0.25, h - s * 1.6 - j * 0.7, z, 0.28, 0.28, 0.28, BUNT[(i + j) % BUNT.length], TILE.flag);
  }
  if (d.custom === 'nightboats') for (let i = 0; i < 4; i++) { const th = dockTh + (i < 2 ? -1 : 1) * (0.95 + (i % 2) * 0.5), rho = shoreR(d, th) * 1.14 + (i % 2) * 5; boatAt(L('nightboats'), Math.cos(th) * rho, Math.sin(th) * rho, th, true); villager(L('nightboats'), Math.cos(th) * rho, 0.3, Math.sin(th) * rho, th, rng, 'fisher'); }
  if (d.custom === 'lanterns') { const k = 10, pts = []; for (let i = 0; i < k; i++) { const th = (i / k) * Math.PI * 2, rho = shoreR(d, th) * 0.5, x = Math.cos(th) * rho, z = Math.sin(th) * rho; L('lamps').box(x, yy, z, 0.16, 2.8, 0.16, '#3a3036', TILE.bark); L('lamps').box(x, yy + 2.8, z, 0.4, 0.44, 0.4, '#ffffff', TILE.glow); pts.push([x, yy + 2.6, z]); }
    for (let i = 0; i < k; i++) { const a = pts[i], c = pts[(i + 1) % k]; for (let j = 1; j < 4; j++) { const t = j / 4; L('lamps').box(a[0] + (c[0] - a[0]) * t, a[1] - Math.sin(t * Math.PI) * 0.6, a[2] + (c[2] - a[2]) * t, 0.26, 0.3, 0.26, '#ffffff', TILE.glow); } } }
  if (d.custom === 'laundry') for (let i = 0; i < 4; i++) {   // washing day, every day: lines of cloth between two poles
    const [x, z] = at(0.2, 0.62), a = rng() * 3.14, dx = Math.cos(a) * 2.4, dz = Math.sin(a) * 2.4, k = L('laundry');
    for (const sg of [-1, 1]) k.box(x + dx * sg, yy, z + dz * sg, 0.14, 2.6, 0.14, '#6b4a2e', TILE.bark);
    for (let j = 0; j < 5; j++) { const t = (j + 0.5) / 5, cx = x + dx * (t * 2 - 1), cz = z + dz * (t * 2 - 1); k.push(cx, yy + 1.2, cz, a); k.box(0, 0, 0, 0.62, 0.95 + (j % 2) * 0.3, 0.05, BUNT[(i + j) % BUNT.length], TILE.white); k.pop(); }
  }
  if (d.custom === 'statues') {   // small carved figures along the pier: by day they face the sea, after dusk they face the village
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1, [x, z] = dockAt(R * 0.3 + Math.floor(i / 2) * 3.4 + 2, side * 2.6);
      for (const [key, ang] of [['statuesDay', -dockTh], ['statuesNight', -dockTh + Math.PI]]) {
        const k = L(key); k.push(x, yy, z, ang); k.box(0, 0, 0, 0.55, 1.3, 0.4, '#8a7a62', TILE.bark); k.blob(0, 1.5, 0, 0.3, 0.32, 0.3, '#9a8a70', TILE.bark, 0.1, i); k.pop();
      }
    }
  }
  // a resident's story has ended: the harbour keeps a mark of it by the pier for good (harbourlife.js)
  { const prop = ARCS[arcIdOf(d)].prop, k = L('resident'), [x, z] = dockAt(R * 0.12, 4.2), [x2, z2] = dockAt(R * 0.12, -4.2), ry0 = -dockTh;
    k.push(x, yy, z, ry0);
    if (prop === 'bunting') { k.box(0, 0, -2.5, 0.2, 4, 0.2, '#6b4a2e', TILE.bark); k.box(0, 0, 2.5, 0.2, 4, 0.2, '#6b4a2e', TILE.bark); flagLine(k, [0, 3.9, -2.5], [0, 3.9, 2.5], 1); k.box(0, 2.2, 0, 0.12, 0.9, 2.2, '#f4f0e6', TILE.planks); }
    if (prop === 'dog') { k.box(0, 0.35, 0, 0.9, 0.45, 0.4, '#8a5a30', TILE.white); k.box(0.55, 0.65, 0, 0.4, 0.38, 0.34, '#8a5a30', TILE.white); k.box(0.62, 0.92, -0.14, 0.12, 0.2, 0.08, '#5a3a1c', TILE.white); k.box(0.62, 0.92, 0.14, 0.12, 0.2, 0.08, '#5a3a1c', TILE.white); for (const sx of [-0.3, 0.3]) for (const sz of [-0.14, 0.14]) k.box(sx, 0, sz, 0.12, 0.36, 0.12, '#6b4a2e', TILE.white); k.box(0.42, 0.62, 0, 0.06, 0.08, 0.38, '#d24a3e', TILE.white); }
    if (prop === 'lamp') { k.box(0, 0, 0, 0.18, 3.4, 0.18, '#3a3036', TILE.bark); k.box(0, 3.4, 0, 0.5, 0.55, 0.5, '#2a2a30', TILE.stone); k.box(0, 3.95, 0, 0.62, 0.12, 0.62, '#3a3036', TILE.bark); }
    if (prop === 'boat') { k.pop(); boatAt(k, ...dockAt(R * 0.35, 5.5), -dockTh + Math.PI / 2, false); const [bx, bz] = dockAt(R * 0.35, 5.5); k.box(bx, 0.4, bz, 0.08, 2.2, 0.08, '#6b4a2e', TILE.bark); k.tri([bx, 2.5, bz], [bx, 0.8, bz], [bx + Math.cos(dockTh) * 1.3, 0.9, bz + Math.sin(dockTh) * 1.3], '#d24a3e', TILE.flag); k.push(x, yy, z, ry0); }
    if (prop === 'chair') { k.box(0, 0, 0, 0.8, 0.5, 0.8, '#6b4a2e', TILE.planks); k.box(-0.36, 0.5, 0, 0.1, 0.9, 0.8, '#6b4a2e', TILE.planks); villager(k, 0, 0.25, 0, Math.PI / 2, mulberry32(d.seed + 5), 'oldsalt'); }
    if (prop === 'candles') for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; k.box(Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6, 0.14, 0.4 + (i % 3) * 0.15, 0.14, '#f4f0e6', TILE.white); k.box(Math.cos(a) * 1.6, 0.5 + (i % 3) * 0.15, Math.sin(a) * 1.6, 0.12, 0.14, 0.12, '#ffffff', TILE.glow); }
    if (prop === 'arch') { k.box(0, 0, -1.6, 0.22, 3.2, 0.22, '#f4f0e6', TILE.planks); k.box(0, 0, 1.6, 0.22, 3.2, 0.22, '#f4f0e6', TILE.planks); k.box(0, 3.2, 0, 0.3, 0.3, 3.6, '#f4f0e6', TILE.planks); for (let i = 0; i < 9; i++) k.box(0, 3.4, -1.6 + i * 0.4, 0.34, 0.3, 0.3, BUNT[i % BUNT.length], TILE.leaf); }
    if (prop === 'wall') { k.box(0, 0, 0, 0.5, 2.4, 4.5, '#e8e4dc', TILE.stone); k.box(0.26, 1.6, -1.2, 0.02, 0.12, 1.4, '#f8f8f8', TILE.white); }
    k.pop(); }
  // growth: the harbour does better the more you trade here
  { const b = L('grow1'); b.push(0, 0, 0, ry); boatAt(b, -3.8, z1 - 9, 0.15, false); boatAt(b, 3.9, z1 - 15, -0.1, false); b.pop(); }
  { const b = L('grow2'); for (let i = 0; i < 4; i++) { const [x, z] = dockAt(R * 0.62 + i * 1.6, 3 + (i % 2)); barrel(b, x, yy, z, 0.9); crateBox(b, x + 1, yy, z + 0.6, rng() * 3); }
    b.push(0, 0, 0, ry); for (let z = z1 - 12; z < z1; z += 5) { b.box(-1.35, 0.84, z, 0.14, 2.2, 0.14, '#6b4a2e', TILE.bark); b.box(-1.35, 3.0, z, 0.36, 0.36, 0.36, '#ffffff', TILE.glow); } b.pop(); }
  { const b = L('grow3'); b.push(0, 0, 0, ry); const zA = R * 0.62, zB = z1 - 1;
    b.box(-1.6, 0.84, zA, 0.2, 4, 0.2, '#6b4a2e', TILE.bark); b.box(1.6, 0.84, zA, 0.2, 4, 0.2, '#6b4a2e', TILE.bark); b.box(0, 4.6, zA, 3.6, 0.6, 0.25, '#d24a3e', TILE.planks);
    flagLine(b, [-1.4, 4.2, zA], [-1.4, 2.6, zB], 0); flagLine(b, [1.4, 4.2, zA], [1.4, 2.6, zB], 3); b.pop(); }
}

function decorate(d, rng, A, B, D, extra) {
  const T = d.type;
  if (d.lm) { lmDecor(d, rng, A, B, D, extra, { terrainHeight, shoreR, spot, palm, fern, flowers, mossRock, houseKind, person, beachedBoat, washing, crateBox, barrel, driftwood, chest, lighthouse }); return; }
  if (d.blight) { blightDecor(d, rng, A); extra.hutB = new Builder(); darkHut(d, rng, extra.hutB); return; }   // the hut in its own mesh: hidden until the story reaches it
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
  if (d.stacks) for (let i = 0; i < d.stacks; i++) {   // sea stacks standing just off the shore, white with spray at the foot
    const th = rng() * 6.283, R = shoreR(d, th) * (1.0 + rng() * 0.08), x = Math.cos(th) * R, z = Math.sin(th) * R, hh = 3 + rng() * 5, w = 0.9 + rng() * 0.8;
    A.cyl(x, -2, z, w, w * 0.55, hh + 2, 6, rng() > 0.5 ? '#8a8478' : '#7a746c', TILE.stone, true, '#6e8a52');
    A.blob(x, 0.1, z, w * 1.5, 0.18, w * 1.5, '#f2f6f6', TILE.white, 0.3, i);
  }
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
      if (hasLighthouse(d)) { const p = spot(d, rng, 0.45, 0.8, 0.9, 60); if (p) { lighthouse(A, extra, p[0], p[1] - 0.3, p[2], 0.8, d); d.lhPos = { x: p[0], z: p[2] }; } }
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
      const dockRoll = rng(), dockTh = d.dockTh;   // Tama's pier faces the start
      const SD = STYLE_DEF[d.style || 'classic'] || STYLE_DEF.classic;
      PAINT = SD.paint ? { walls: SD.paint.walls, roofs: SD.paint.roofs } : null;
      if (d.custom === 'whitewash') PAINT = SD.paint ? { ...PAINT, wall: '#f4f0e8' } : { wall: '#f4f0e8', roof: '#3c78c8' };   // whitewash keeps each style's own roofs NO_CHILD = d.custom === 'nochildren';
      const n = Math.round((6 + Math.floor(rng() * 3)) * Math.max(1, d.r / 25));
      let placed = 0;
      const housesLog = [], hk = (a, b, x, y, z, ry, r, k) => { housesLog.push([x, z]); return houseKind(a, b, x, y, z, ry, r, k); };
      CUR_FLAG = d.flag;
      const VS = { d, rng, dockTh, A, B, D, extra, houseKind: hk, flag: d.flag, spot, palm, barrel, crateBox, fishRack, fence, ropeCoil, beachedBoat, shoreR, terrainHeight, angleDiff, paint: SD.paint };
      if (SD.build) SD.build(VS);
      if (d.sh && d.sh.H > 2.6) stairs(VS);                                                  // steps up the ramp from the pier
      if (d.sh && (d.sh.id === 'terraced' || d.sh.id === 'hill')) slopeHouses(VS, 4 + Math.floor(rng() * 4));   // houses down the slope, on their own levels
      const tamaLook = d.id === '0,-1' ? TAMA_LOOK : null, tamaHouses = [];
      if (tamaLook) FIN = TAMA_FIN[tamaLook];   // the houses' finish (no rng: the layout stays exactly the same)
      for (let i = 0; i < n * 2 && placed < n && !SD.build; i++) {
        const th = (i / (n * 2)) * Math.PI * 2 + rng() * 0.3;
        if (Math.abs(angleDiff(th, dockTh)) < 0.55) continue;
        const rho = shoreR(d, th) * (0.28 + rng() * 0.38);
        const x = Math.cos(th) * rho, z = Math.sin(th) * rho;
        const kind = placed === 0 ? 'tavern' : placed === 1 && (rng() < 0.45 || d.custom === 'bells') ? (d.id === '0,-1' ? 'belltower' : 'church') : pickCol(rng, ['cottage', 'colonial', 'colonial', 'planter', 'thatch', 'thatch', 'townhouse', 'round', 'stilt', 'warehouse']);
        hk(A, B, x, d.H - 0.1, z, Math.atan2(-x, -z), rng, kind);
        tamaHouses.push({ x, z, ry: Math.atan2(-x, -z), kind });
        if (kind === 'tavern') extra.tavern = { x, z, ry: Math.atan2(-x, -z) };
        placed++;
      }
      // the flag at the landing, a few broken walls on the shore (Tama and about half the ports), and washing lines between the houses
      landingFlag(VS);
      if (d.id === '0,-1' || rng() < 0.5) ruins(VS, dockTh + (rng() < 0.5 ? -1 : 1) * (1.2 + rng() * 0.45));
      for (let i = 0, nl = 2 + Math.floor(rng() * 3); i < nl && housesLog.length; i++) {
        const [hx, hz] = housesLog[Math.floor(rng() * housesLog.length)], a = rng() * 6.28, lx = hx + Math.cos(a) * 4.4, lz = hz + Math.sin(a) * 4.4;
        if (Math.hypot(lx, lz) > shoreR(d, Math.atan2(lz, lx)) * 0.75 || Math.abs(angleDiff(Math.atan2(lz, lx), dockTh)) < 0.4) continue;
        laundry(VS, lx, lz, a + Math.PI / 2);
      }
      // lighthouse opposite the dock (not every harbour has one)
      const lth = dockTh + Math.PI + (rng() - 0.5) * 0.6, lr = shoreR(d, lth) * 0.74;
      if (hasLighthouse(d)) { lighthouse(A, extra, Math.cos(lth) * lr, Math.min(d.H, terrainHeight(d, Math.cos(lth) * lr, Math.sin(lth) * lr)) - 0.2, Math.sin(lth) * lr, 1, d); d.lhPos = { x: Math.cos(lth) * lr, z: Math.sin(lth) * lr }; }
      // dock
      const R = shoreR(d, dockTh), z0 = R * 0.55, z1 = R + 14, zc = (z0 + z1) / 2;
      d.dock = { x: Math.cos(dockTh) * (R + 10), z: Math.sin(dockTh) * (R + 10), th: dockTh };   // where you moor (local)
      d.dockGeom = { R, z0, z1 };
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
        let th = dockTh + (rng() - 0.5) * 1.1; const rho = shoreR(d, th) * (0.5 + rng() * 0.3);
        if (tamaLook) { const lat = rho * Math.sin(th - dockTh); if (Math.abs(lat) < 5) th = dockTh + (lat < 0 ? -1 : 1) * Math.asin(Math.min(1, 5 / rho)); }   // off the street
        const x = Math.cos(th) * rho, z = Math.sin(th) * rho, k = i % 3;
        const gy = Math.min(d.H - 0.1, terrainHeight(d, x, z) - 0.05);
        if (k === 0) { barrel(A, x, gy, z, 0.9 + rng() * 0.3); barrel(A, x + 0.8, gy, z + 0.2, 0.8); }
        else if (k === 1) { crateBox(A, x, gy, z, rng() * 3); crateBox(A, x + 0.1, gy + 0.8, z, rng() * 3, 0.8); }
        else ropeCoil(A, x, gy, z, 1.1);
      }
      for (let i = 0; i < 2; i++) { const th = dockTh + Math.PI * 0.5 + i * Math.PI * 0.9 + rng() * 0.4, rho = shoreR(d, th) * 0.62; fishRack(A, Math.cos(th) * rho, Math.min(d.H - 0.1, terrainHeight(d, Math.cos(th) * rho, Math.sin(th) * rho) - 0.05), Math.sin(th) * rho, rng() * 3); }
      { const th = dockTh - 1.4 - rng() * 0.6, rho = shoreR(d, th) * 0.86; fence(A, Math.cos(th) * rho, Math.min(d.H - 0.1, terrainHeight(d, Math.cos(th) * rho, Math.sin(th) * rho) - 0.05), Math.sin(th) * rho, th + 1.57, 5); }
      { const th = dockTh + 0.7 + rng() * 0.5, rho = shoreR(d, th) * 0.97, h = terrainHeight(d, Math.cos(th) * rho, Math.sin(th) * rho); if (h > 0.1) beachedBoat(A, Math.cos(th) * rho, h, Math.sin(th) * rho, th + 1.57); }
      // people, by the hour (see villagePhase): who is out depends on the time of day and on the village's mood
      {
        const lively = d.lively, n = (k) => Math.max(1, Math.round(k * (0.4 + lively)));
        const cr = extra.crowd = { dawn: new Builder(), day: new Builder(), evening: new Builder(), night: new Builder(), siesta: new Builder() };
        const Rp = R * (d.sh ? 1.3 : 1), yy = d.H - 0.1, at = (t0, t1) => { const th = rng() * Math.PI * 2, rho = shoreR(d, th) * (t0 + rng() * (t1 - t0)); return [Math.cos(th) * rho, Math.sin(th) * rho]; };
        const dockAt = (r, side) => [Math.cos(dockTh) * r - Math.sin(dockTh) * side, Math.sin(dockTh) * r + Math.cos(dockTh) * side];
        // dawn: fishers on the dock, smoke from the tavern, one early riser
        for (let i = 0; i < n(3); i++) { const [x, z] = dockAt(Rp * 0.7 + i * 3.2, i % 2 ? 1.0 : -1.0); villager(cr.dawn, x, 0.84, z, -dockTh + (i % 2 ? 0 : Math.PI), rng, 'fisher'); }
        { const [x, z] = at(0.15, 0.4); villager(cr.dawn, x, yy, z, rng() * 6.28, rng, 'market'); }
        // day: market stalls around the square, the full crowd, dockers by the water, laundry out
        for (let i = 0; i < n(3); i++) { const a = rng() * 6.28, r = 3.5 + rng() * 2.5, x = Math.cos(a) * r, z = Math.sin(a) * r; marketStall(cr.day, x, yy, z, Math.atan2(-x, -z) + Math.PI, rng); villager(cr.day, x * 1.25, yy, z * 1.25, Math.atan2(-x, -z), rng, 'market'); }
        for (let i = 0; i < n(11); i++) { const [x, z] = at(0.12, 0.6); villager(cr.day, x, yy, z, rng() * 6.28, rng, pickCol(rng, ['fisher', 'market', 'oldsalt', 'child', 'child', 'docker', 'harbourmaster'])); }
        for (let i = 0; i < n(2); i++) { const [x, z] = dockAt(Rp * 0.6 + i * 2.5, i % 2 ? 0.9 : -0.9); villager(cr.day, x, 0.84, z, -dockTh, rng, 'docker'); }
        { const th = dockTh + 1.6 + rng() * 0.8, rho = shoreR(d, th) * 0.5; washing(cr.day, Math.cos(th) * rho, yy, Math.sin(th) * rho, rng() * 3, rng); }
        // evening: everyone at the tavern, lanterns lit, smoke
        const tv = extra.tavern;
        if (d.custom === 'choir') {   // at dusk the whole village stands in a ring round the pole and sings
          const k = n(12); for (let i = 0; i < k; i++) { const a = (i / k) * Math.PI * 2, x = Math.cos(a) * 4.2, z = Math.sin(a) * 4.2; villager(cr.evening, x, yy, z, Math.atan2(-x, -z), rng, pickCol(rng, ['fisher', 'oldsalt', 'market', 'docker', 'child'])); cr.evening.box(x * 0.9, yy + 1.0, z * 0.9, 0.22, 0.26, 0.22, '#ffffff', TILE.glow); }   // each holds a candle
        }
        if (tv && d.custom !== 'choir') {
          const fx = Math.sin(tv.ry), fz = Math.cos(tv.ry);
          for (let i = 0; i < n(9); i++) { const a = (rng() - 0.5) * 2.4, r = 2.6 + rng() * 3, dx = Math.sin(tv.ry + a) * r, dz = Math.cos(tv.ry + a) * r; villager(cr.evening, tv.x + dx, yy, tv.z + dz, Math.atan2(-dx, -dz), rng, pickCol(rng, ['fisher', 'oldsalt', 'docker', 'market', 'harbourmaster'])); }
          for (const side of [-1, 1]) { const lx = tv.x + fx * 4 + fz * side * 2, lz = tv.z + fz * 4 - fx * side * 2; cr.evening.box(lx, yy, lz, 0.12, 2.0, 0.12, '#3a3036', TILE.bark); cr.evening.box(lx, yy + 2.0, lz, 0.32, 0.36, 0.32, '#ffffff', TILE.glow); }
          cr.evening.push(tv.x, yy, tv.z, tv.ry); smoke(cr.evening, -1.56, 5.2, -0.76, 5); cr.evening.pop();
          cr.dawn.push(tv.x, yy, tv.z, tv.ry); smoke(cr.dawn, -1.56, 5.2, -0.76, 3); cr.dawn.pop();
        }
        // night: empty streets, one watchman with a lantern near the dock (none at all in a sleepy village)
        if (lively > 0.3) { const [x, z] = dockAt(Rp * 0.45, 1.2); lanternMan(cr.night, x, yy, z, -dockTh, rng); }
        // siesta (sleepy villages only, midday): hammocks between the houses, nobody else
        if (d.sleepy) for (let i = 0; i < 2; i++) { const [x, z] = at(0.2, 0.5); hammockSleeper(cr.siesta, x, yy, z, rng() * 6.28, rng); }
        weekAndCustoms(d, rng, cr, { yy, R: Rp, dockTh, z1, n, at, dockAt });
      }
      PAINT = null; NO_CHILD = false; CUR_FLAG = null; FIN = null;
      if (tamaLook) tamaPolish({ ...VS, R, z0, z1 }, tamaLook, tamaHouses);   // its own rng: nothing after it moves
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
      if (!SD.build) palms(4, 0.2, 0.7, 0.9, 0.9);
      // bunting poles in bright mood
      if (!SD.build) {
        B.box(0, d.H - 0.2, 0, 0.14, 3.2, 0.14, '#6b4a2e', TILE.bark);
        B.tri([0, d.H + 3.0, 0], [0, d.H + 2.2, 0], [1.4, d.H + 2.6, 0.6], '#d24a3e', TILE.flag);
      }
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

// extra village layers: when each one shows (the plain phase layers show in their own phase)
const LAYER_RULES = {
  market: (i, ph) => !!(i.week && i.week.market) && (ph === 'day' || ph === 'siesta'),
  festival: (i, ph, d) => !!i.week && i.week.wd === d.festival,
  lantern: (i, ph) => !!(i.week && i.week.lantern) && (ph === 'evening' || ph === 'night'),
  kites: (i, ph) => ph === 'day' || ph === 'siesta',
  nightboats: (i, ph) => ph === 'night',
  lamps: (i, ph) => ph === 'evening' || ph === 'night',
  laundry: (i, ph) => ph === 'day' || ph === 'siesta' || ph === 'dawn',
  statuesDay: (i, ph) => ph === 'dawn' || ph === 'day' || ph === 'siesta',
  statuesNight: (i, ph) => ph === 'evening' || ph === 'night',
  resident: (i) => !!i.lifeDone,
  grow1: (i) => (i.growth || 0) >= 1, grow2: (i) => (i.growth || 0) >= 2, grow3: (i) => (i.growth || 0) >= 3,
};
/** the sea mist's colour: main.js sets it to the fog colour each frame */
export const mistMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
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
    abyssForms(d, D, extra);

    const add = (builder, mat, order = 0) => {
      const m = meshOf(builder, mat);
      if (m) { m.renderOrder = order; this.group.add(m); this.geos.push(m.geometry); }
      return m;
    };
    add(terrain, mats.terrain);
    add(A, mats.props);
    if (extra.hutB) { const hm = add(extra.hutB, mats.props); if (hm) { hm.visible = HUT_SHOWN; this.anim.push(() => { hm.visible = HUT_SHOWN; }); } }
    this.alwaysLit = !!extra.alwaysLit;
    this.bright = add(B, mats.props);
    this.darkMesh = add(D, mats.props);

    const sh = new THREE.Mesh(buildRing(d, 0.9, 1.65, 0.22, 0.8, 0, 30, 3), d.blight ? mats.murkShallow : mats.shallow);
    sh.renderOrder = 1; this.group.add(sh); this.geos.push(sh.geometry);
    if (d.type === 'atoll') { const lg = new THREE.Mesh(buildRing(d, 0.0, 0.56, 0.24, 0.9, 0.9, 30, 3), mats.shallow); lg.renderOrder = 1; this.group.add(lg); this.geos.push(lg.geometry); }
    const fm = new THREE.Mesh(buildRing(d, 0.97, 1.07, 0.3, 0.9, 0.0, 30, 2), d.blight ? mats.murkFoam : mats.foam);
    fm.renderOrder = 2; this.group.add(fm); this.geos.push(fm.geometry);

    if (d.type === 'treasure' && d.marker) {
      const m = d.marker;
      const G = new Builder();
      G.blob(m.x, m.y - 0.05, m.z, 1.4, 0.2, 1.1, '#4a3322', TILE.white, 0.2, 2);
      chest(G, m.x, m.y, m.z, 0.5, true);
      this.dugMesh = add(G, mats.props);
      this.setDug(dug);
    }

    // props that exist only while the sea or the story says so: tide, night, calm, an upgrade, a clue seen (docs/ART_SPEC.md 8).
    // extra.states = [{ b: Builder, mat?, when(isl) }]; isl.tide, isl.tod, isl.gctx are set by World.tick. Geometry is built once.
    for (const st of extra.states || []) {
      const m = add(st.b, st.mat || mats.props, st.order || 0);
      if (m) { m.visible = false; this.anim.push((t, isl) => { m.visible = !!st.when(isl); }); }
    }
    // sea mist round the foot of the deep places: two flat rings in the fog colour (S3+; about 24 triangles each)
    if (d.dread >= 0.45 && (d.lm || d.type === 'rocky' || d.type === 'sandbar' || d.type === 'jungle')) {
      const mist = new THREE.Mesh(buildRing(d, 0.85, 1.9, 0.5, 0.55, 0, 16, 1), mistMat);
      mist.renderOrder = 2; this.group.add(mist); this.geos.push(mist.geometry);
    }

    this.crowd = {};
    for (const [k, cb] of Object.entries(extra.crowd || {})) { const m = add(cb, mats.props); if (m) { m.visible = false; this.crowd[k] = m; } }
    if (extra.crowd) this.anim.push((t, isl) => {
      const phase = isl.tod ? villagePhase(isl.tod.t * 24, d.sleepy) : 'day';
      isl.phase = phase;
      for (const [k, m] of Object.entries(isl.crowd)) { const rule = LAYER_RULES[k]; m.visible = !isl.isDark && (rule ? rule(isl, phase, d) : k === phase); }
    });
    this.walkers = [];
    for (const w of extra.walkers || []) {
      const pb = new Builder();
      { const wr = mulberry32(Math.floor(w.rng * 1e6)); NO_CHILD = d.custom === 'nochildren'; villager(pb, 0, 0, 0, 0, wr, pickCol(wr, ['fisher', 'market', 'docker', 'child'])); NO_CHILD = false; }
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
        } else { beam.rotation.y = extra.beamFixed ? ph : t * 0.9 + ph; beam.rotation.z *= 0.9; beam.scale.set(1, 1, 1); }
      });
    }
  }
  setLit(on) {
    if (this.alwaysLit) on = true;   // the Keepers' Ledger lamp is lit at noon
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
    this.tide = 0;   // -1 low .. +1 high, set by the game from the clock
    // the dark hut: one island 5-7 cells out (well past the fog from where you start), the loneliest one there is: the one
    // whose nearest neighbour is furthest away, so it is not found by accident on the way to somewhere else
    let best = null, bs = -Infinity;
    for (let cz = -7; cz <= 7; cz++) for (let cx = -7; cx <= 7; cx++) {
      const ring = Math.max(Math.abs(cx), Math.abs(cz));
      if (ring < 5) continue;
      const d = this.desc(cx, cz);
      if (!d || d.lm || (d.type !== 'jungle' && d.type !== 'rocky')) continue;
      let near = Infinity;
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { if (!dx && !dz) continue; const o = this.desc(cx + dx, cz + dz); if (o) near = Math.min(near, Math.hypot(o.x - d.x, o.z - d.z) - o.r); }
      const score = Math.min(near, 400) + (hash2(cx, cz, seed + 77) % 1000) / 1000;   // lonely first; the hash only breaks ties
      if (score > bs) { bs = score; best = d; }
    }
    if (best) {
      best.hut = true; this.hutId = best.id;
      // a land of its own: bigger, a ragged outline, dark ground (faceColor) and dead growth (blightDecor) instead of the bright jungle
      const r2 = mulberry32(hash2(best.seed, 66, 6));
      best.blight = true; best.r = 20 + r2() * 3; best.H = 4.5 + r2() * 1.2;   // a little smaller
      best.lobes = [0.15 + r2() * 0.05, 0.1 + r2() * 0.05, 0.07 + r2() * 0.04, best.lobes[3], best.lobes[4], best.lobes[5]];
    }
  }
  set hutShown(v) { HUT_SHOWN = !!v; }
  get hutShown() { return HUT_SHOWN; }
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
  tick(t, tod) { for (const isl of this.islands.values()) { isl.tod = tod; isl.stare = this.stare; isl.week = this.week; isl.growth = this.growthOf ? this.growthOf(isl.desc.id) : 0; isl.lifeDone = this.lifeDoneOf ? this.lifeDoneOf(isl.desc.id) : false; isl.tide = this.tide; isl.gctx = this.gctx || {}; isl.group.position.y = -this.tide * 0.32; for (const f of isl.anim) f(t, isl); } }   // the sea rises over the beach and falls back

  collide(pos, radius) {
    let hit = false;
    for (const isl of this.islands.values()) {
      const d = isl.desc;
      const dx = pos.x - d.x, dz = pos.z - d.z, dist = Math.hypot(dx, dz);
      if (dist > d.r * 1.8 + radius) continue;
      if (d.dockGeom && dist < d.r * 1.8 + radius) {   // the pier and the rowboat moored beside it are solid
        const { z0, z1 } = d.dockGeom, th = d.dock.th, ax = Math.cos(th), az = Math.sin(th), mid = (z0 + z1) / 2;
        const row = z1 - 4, lx = Math.sin(th) * 3.6, lz = -Math.cos(th) * 3.6;
        if (pushOut(pos, radius, [{ x: d.x + ax * mid, z: d.z + az * mid, ax, az, hl: (z1 - z0) / 2, r: 1.6 }, { x: d.x + ax * row + lx, z: d.z + az * row + lz, r: 1.5 }])) hit = true;
      }
      const lim = shoreR(d, Math.atan2(dz, dx)) * 1.03 + radius + (this.tide < -0.45 ? 1.8 : 0);   // at low tide the shallows reach further
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
