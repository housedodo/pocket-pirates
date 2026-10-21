import { TILE } from './textures.js';

// VILLAGE STYLES: every harbour (except Tama, which stays the classic) gets one of nine looks, so villages can be told apart at a glance:
// its own island outline, ground, palette, house shapes, street plan, landmark and plants. Picked from the seed (`styleOf`).
// A style's build(S) places the houses and extras; S carries the builders (A always, B bright mood, D dark mood) and the world's helpers.
/** Terrain shapes of a village island: H = height of the village level, te/w = where the ground starts to fall and how long the fall is (cliffs are short),
 *  steps = terraces, rim = a ridge behind the village. Near the pier the ground always ramps down to the water. */
export const SHAPES = {
  flat: { H: [1.15, 1.15], te: 0.9, w: 0.1 },
  dune: { H: [2.4, 3.2], te: 0.5, w: 0.5 },
  hill: { H: [7, 10], te: 0.6, w: 0.4 },
  cliff: { H: [9, 12], te: 0.78, w: 0.14 },
  terraced: { H: [8, 11], te: 0.5, w: 0.5, steps: 3 },
  bowl: { H: [2.4, 3.2], te: 0.6, w: 0.4, rim: [9, 13] },
};
export function shapeOf(style, h, r01) {
  const list = (STYLE_DEF[style] && STYLE_DEF[style].shapes) || ['flat'], id = list[(h >>> 0) % list.length], sh = SHAPES[id];
  const lerp = (a) => a[0] + (a[1] - a[0]) * r01;
  return { id, H: lerp(sh.H), te: sh.te, w: sh.w, steps: sh.steps || 0, rim: sh.rim ? lerp(sh.rim) : 0 };
}
export const STYLE_IDS = ['classic', 'fishing', 'terraced', 'thatch', 'market', 'fortress', 'farm', 'shrine', 'wreckers'];
const WEIGHTS = [['fishing', 2], ['terraced', 2], ['thatch', 2], ['market', 2], ['fortress', 1.5], ['farm', 2], ['shrine', 1.5], ['wreckers', 1.5], ['classic', 1]];
const rnd = (rng, a, b) => a + rng() * (b - a);
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

export function styleOf(h, key) {
  if (key === '0,-1') return 'classic';
  if (key === '-2,-1') return 'fishing';   // the second harbour, seen early: not like Tama
  const tot = WEIGHTS.reduce((a, w) => a + w[1], 0); let k = (((h >>> 0) * 2654435761 >>> 0) / 4294967296) * tot;   // mix the bits: a plain modulo of the hash clumps
  for (const [id, w] of WEIGHTS) { if ((k -= w) < 0) return id; }
  return 'classic';
}

// ---- trees and plants: trunk on A, leaves on B (bright), a bare claw version on D (the dark mood)
function tree(S, x, y, z, s, kind, col, rng) {
  const { A, B, D } = S;
  if (kind === 'cypress') {
    A.cyl(x, y - 0.1, z, 0.28 * s, 0.22 * s, 0.9 * s, 5, '#6b4a2e', TILE.bark, false);
    B.cyl(x, y + 0.7 * s, z, 0.95 * s, 0.05, 4.2 * s, 6, col || '#2f6a3a', TILE.leaf, false);
  } else if (kind === 'bamboo') {
    for (let i = 0; i < 4; i++) { const ox = Math.cos(i * 1.7) * 0.5 * s, oz = Math.sin(i * 1.7) * 0.5 * s; A.cyl(x + ox, y, z + oz, 0.17 * s, 0.14 * s, (3.2 + (i % 2)) * s, 5, '#9ab050', TILE.bark, false); B.blob(x + ox, y + (3.3 + (i % 2)) * s, z + oz, 0.55 * s, 0.4 * s, 0.55 * s, '#6aa84a', TILE.leaf, 0.2, i); }
  } else {   // a round crown: apple, blossom
    A.cyl(x, y - 0.1, z, 0.3 * s, 0.24 * s, 1.5 * s, 5, '#6b4a2e', TILE.bark, false);
    B.blob(x, y + 2.0 * s, z, 1.5 * s, 1.2 * s, 1.5 * s, col || '#4a9a40', TILE.leaf, 0.22, Math.floor(x * 7 + z));
    if (kind === 'apple') for (let i = 0; i < 4; i++) B.blob(x + Math.cos(i * 1.6) * 1.1 * s, y + 1.8 * s + (i % 2) * 0.6, z + Math.sin(i * 1.6) * 1.1 * s, 0.22, 0.22, 0.22, '#d8402e', TILE.white, 0.05, i);
  }
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + rng() * 0.5; D.tri([x, y + 1.2 * s, z], [x + Math.cos(a) * 0.3, y + 2.3 * s, z + Math.sin(a) * 0.3], [x + Math.cos(a) * 1.3 * s, y + 2.6 * s, z + Math.sin(a) * 1.3 * s], '#6a6070', TILE.bone, [[0.5, 0], [0, 0.5], [0.5, 1]]); }
}
const bush = (S, x, y, z, col, s = 1) => S.B.blob(x, y + 0.35 * s, z, 0.8 * s, 0.6 * s, 0.8 * s, col, TILE.white, 0.25, Math.floor(x + z * 3));

// ---- buildings (local +z is the front; they stand on y)
function cube(S, x, y, z, ry, rng, wall, deck, floors = 1) {
  const A = S.A; A.push(x, y, z, ry);
  const w = rnd(rng, 3.0, 3.8), dep = rnd(rng, 3.0, 3.6), h = 2.4 * floors;
  A.box(0, 0, 0, w, y0(S, w, dep), dep, wall, TILE.wall, TILE.white);
  A.box(0, h, 0, w + 0.3, 0.3, dep + 0.3, deck, TILE.stone);                 // a flat roof slab
  A.box(-w * 0.28, 0, dep / 2 + 0.01, 0.95, 1.8, 0.1, '#3c78c8', TILE.planks);   // blue door
  for (let f = 0; f < floors; f++) for (const sx of [-0.9, 0.9]) A.box(w * 0.2 + sx * 0.45, 0.95 + f * 2.5, dep / 2 + 0.01, 0.55, 0.7, 0.08, '#3c78c8', TILE.planks);
  if (floors > 1) A.box(w / 2 + 0.5, 0, 0.2, 0.9, 1.4, 1.8, wall, TILE.stone);   // outside stair
  A.blob(w * 0.3, h + 0.5, -dep * 0.2, 0.55, 0.3, 0.5, '#d83a8a', TILE.white, 0.3, 2);   // bougainvillea on the roof
  A.pop();
}
function dome(S, x, y, z, ry) {
  const A = S.A; A.push(x, y, z, ry);
  A.box(0, 0, 0, 3.8, 3.0, 3.8, '#f6f2ea', TILE.wall, TILE.white);
  A.cyl(0, 3.0, 0, 1.8, 1.7, 0.4, 8, '#f6f2ea', TILE.wall, false);
  A.blob(0, 3.4, 0, 1.8, 1.4, 1.8, '#3c78c8', TILE.roof, 0.08, 4);
  A.box(0, 4.7, 0, 0.3, 0.9, 0.3, '#f4e8c0', TILE.stone); A.box(0, 5.0, 0, 0.8, 0.28, 0.3, '#f4e8c0', TILE.stone);
  A.box(0, 0, 1.91, 1.0, 2.0, 0.1, '#5a3a20', TILE.planks);
  A.pop();
}
function longhouse(S, x, y, z, ry, rng) {
  const A = S.A; A.push(x, y, z, ry);
  A.box(0, 0, 0, 3.0, 1.7, 6.4, '#c89868', TILE.wall, TILE.white);
  A.gable(0, 1.7, 0, 3.8, 1.9, 7.0, '#c8a860', TILE.rope, '#c89868');
  A.box(0, 0, 3.21, 0.9, 1.4, 0.1, '#3a2a1c', TILE.planks);
  for (let i = 0; i < 3; i++) A.box(-1.65, 0, -2.2 + i * 2.2, 0.3, 2.2, 0.3, '#5a3e24', TILE.bark);
  A.pop();
}
function keepTower(S, x, y, z, ry, tall = 1) {
  const A = S.A; A.push(x, y, z, ry);
  A.cyl(0, 0, 0, 2.0, 1.8, 5.2 * tall, 8, '#b8b2a6', TILE.stone, false);
  A.cyl(0, 5.2 * tall, 0, 2.3, 2.0, 0.5, 8, '#a8a296', TILE.stone, true);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; A.box(Math.cos(a) * 2.1, 5.7 * tall, Math.sin(a) * 2.1, 0.7, 0.8, 0.7, '#a8a296', TILE.stone); }
  A.box(0, 0, 1.95, 1.0, 1.8, 0.12, '#3a2a1c', TILE.planks);
  S.B.box(0, 5.5 * tall, 0, 0.14, 3.4, 0.14, '#6b4a2e', TILE.bark);
  S.B.tri([0, 8.9 * tall + 0.4 * (1 - tall), 0], [0, 8.1 * tall + 0.4 * (1 - tall), 0], [1.4, 8.5 * tall + 0.4 * (1 - tall), 0.5], '#b02a2a', TILE.flag);
  A.pop();
}
function wallSeg(S, x, y, z, ry, len) {
  const A = S.A; A.push(x, y, z, ry);
  A.box(0, 0, 0, len, 2.8, 1.1, '#a8a296', TILE.stone, TILE.stone);
  for (let i = 0; i < Math.floor(len / 1.6); i++) A.box(-len / 2 + 0.8 + i * 1.6, 2.8, 0, 0.8, 0.7, 1.1, '#a8a296', TILE.stone);
  A.pop();
}
function cannon(S, x, y, z, ry) { const A = S.A; A.push(x, y, z, ry); A.box(0, 0, 0, 0.8, 0.5, 1.4, '#6b4a2e', TILE.planks); A.cyl(0, 0.5, 0, 0.28, 0.24, 1.2, 6, '#2a2a30', TILE.stone, true); A.pop(); }
function windmill(S, x, y, z, ry) {
  const A = S.A; A.push(x, y, z, ry);
  A.cyl(0, 0, 0, 2.2, 1.4, 5.4, 8, '#e8dcc0', TILE.wall, false);
  A.cyl(0, 5.4, 0, 1.7, 0, 1.8, 8, '#8a4a2e', TILE.roof, false);
  A.box(0, 0, 2.0, 0.9, 1.7, 0.1, '#5a3a20', TILE.planks);
  A.push(0, 4.6, 1.6, 0, 1, 1, 1, 0, 0.5);   // the sails, a cross turned a little
  A.box(0, 0, 0, 0.5, 0.5, 0.9, '#5a3a20', TILE.bark);
  for (const [w, h] of [[5.6, 0.5], [0.5, 5.6]]) { A.box(0, 0, 0.5, w, h, 0.2, '#6b4a2e', TILE.bark); }
  for (const [ox, oy] of [[1.9, 1.1], [-1.9, -1.1], [1.1, -1.9], [-1.1, 1.9]]) A.box(ox, oy, 0.62, 1.5, 1.2, 0.1, '#f2ead0', TILE.sail);
  A.pop(); A.pop();
}
function pagoda(S, x, y, z, ry) {
  const A = S.A; A.push(x, y, z, ry);
  for (let i = 0; i < 3; i++) {
    const s = 1 - i * 0.2, y0 = i * 2.5;
    A.box(0, y0, 0, 3.0 * s, 1.7, 3.0 * s, '#8a3a2a', TILE.wall, TILE.white);
    A.cyl(0, y0 + 1.7, 0, 3.4 * s, 0.1, 1.0, 4, '#3a3a4a', TILE.roof, false);
  }
  A.box(0, 7.4, 0, 0.3, 1.6, 0.3, '#c8a040', TILE.glow);
  A.box(0, 0, 1.51, 0.9, 1.5, 0.1, '#3a2a1c', TILE.planks);
  A.pop();
}
function torii(S, x, y, z, ry) {
  const A = S.A; A.push(x, y, z, ry);
  for (const sx of [-1.6, 1.6]) A.cyl(sx, 0, 0, 0.3, 0.26, 3.8, 6, '#c8382a', TILE.planks, false);
  A.box(0, 3.1, 0, 4.4, 0.4, 0.5, '#c8382a', TILE.planks); A.box(0, 3.9, 0, 5.2, 0.35, 0.6, '#2a2a30', TILE.planks);
  A.pop();
}
function stoneLantern(S, x, y, z) { const A = S.A; A.cyl(x, y, z, 0.3, 0.3, 0.7, 6, '#a8a49c', TILE.stone, true); A.box(x, y + 0.7, z, 0.6, 0.5, 0.6, '#ffffff', TILE.glow); A.box(x, y + 1.2, z, 0.9, 0.22, 0.9, '#8a867c', TILE.stone); }
function well(S, x, y, z) { const A = S.A; A.cyl(x, y, z, 0.9, 0.9, 0.8, 8, '#b8b2a6', TILE.stone, false); for (const sx of [-0.8, 0.8]) A.box(x + sx, y, z, 0.18, 2.0, 0.18, '#5a3e24', TILE.bark); A.gable(x, y + 2.0, z, 2.0, 0.6, 1.4, '#8a4a2e', TILE.roof, '#5a3e24'); }
function fountain(S, x, y, z) { const A = S.A; A.cyl(x, y, z, 2.0, 1.9, 0.6, 8, '#a8a49c', TILE.stone, true); A.cyl(x, y + 0.5, z, 1.7, 1.7, 0.2, 8, '#58a8d8', TILE.white, true); A.cyl(x, y, z, 0.4, 0.3, 1.8, 6, '#a8a49c', TILE.stone, true); A.box(x, y + 1.8, z, 0.5, 0.3, 0.5, '#ffffff', TILE.glow); }
function firePit(S, x, y, z) {
  const A = S.A; for (let i = 0; i < 8; i++) A.blob(x + Math.cos(i * 0.785) * 1.1, y + 0.2, z + Math.sin(i * 0.785) * 1.1, 0.4, 0.3, 0.4, '#8f8b84', TILE.stone, 0.25, i);
  A.box(x, y, z, 0.9, 0.5, 0.9, '#ffb050', TILE.glow); A.box(x - 0.5, y, z + 0.3, 1.2, 0.3, 0.3, '#5a3e24', TILE.bark); A.box(x + 0.2, y, z - 0.5, 0.3, 0.3, 1.2, '#5a3e24', TILE.bark);
}
function totem(S, x, y, z, s = 1) { const A = S.A, cols = ['#c8382a', '#e8c060', '#3c78c8', '#2f9a8a']; for (let i = 0; i < 4; i++) A.box(x, y + i * 0.9 * s, z, 0.9 * s, 0.9 * s, 0.9 * s, cols[i], TILE.bone); A.box(x, y + 3.6 * s, z, 1.7 * s, 0.3 * s, 0.4 * s, '#5a3e24', TILE.bark); }
function hayBale(S, x, y, z, ry) { const A = S.A; A.push(x, y, z, ry); A.box(0, 0, 0, 1.2, 0.9, 0.9, '#d8b848', TILE.rope); A.pop(); }
function field(S, x, y, z, ry, w, dep, col) { const A = S.A; A.push(x, y, z, ry); A.box(0, 0, 0, w, 0.12, dep, '#8a6a3a', TILE.white); for (let i = 0; i < Math.floor(w / 1.2); i++) A.box(-w / 2 + 0.7 + i * 1.2, 0.1, 0, 0.55, 0.28, dep - 0.4, col, TILE.leaf); A.pop(); }
function sheep(S, x, y, z, ry) { const A = S.A; A.push(x, y, z, ry); A.blob(0, 0.55, 0, 0.55, 0.42, 0.45, '#f2eee4', TILE.white, 0.25, 3); A.box(0.55, 0.55, 0, 0.3, 0.3, 0.28, '#3a3430', TILE.white); for (const sx of [-0.3, 0.3]) for (const sz of [-0.2, 0.2]) A.box(sx, 0, sz, 0.14, 0.4, 0.14, '#3a3430', TILE.white); A.pop(); }
function hullHall(S, x, y, z, ry) {   // an upturned ship, lived in
  const A = S.A; A.push(x, y, z, ry);
  A.blob(0, 1.1, 0, 2.4, 1.9, 5.6, '#6a4a30', TILE.planks, 0.12, 5);
  for (let i = -2; i <= 2; i++) A.box(0, 0.2, i * 1.8, 4.6, 0.3, 0.35, '#4a3220', TILE.bark);
  A.box(0, 0, 5.2, 1.2, 1.5, 0.12, '#2a1c12', TILE.planks);
  A.box(0, 2.5, -1.0, 0.3, 3.2, 0.3, '#4a3220', TILE.bark); A.box(0, 4.2, -1.0, 1.8, 0.8, 0.12, '#c8b890', TILE.sail);
  A.pop();
}
const ragPole = (S, x, y, z, col) => { S.B.box(x, y, z, 0.2, 4.2, 0.2, '#4a3a2a', TILE.bark); S.B.tri([x, y + 4.2, z], [x, y + 3.2, z], [x + 1.3, y + 3.7, z + 0.4], col, TILE.flag); };

// ---- layout helpers
function Pn(S, th, rho) { const R = S.shoreR(S.d, th) * rho; return [Math.cos(th) * R, Math.sin(th) * R]; }
const faceIn = (x, z) => Math.atan2(-x, -z);
const outsideDock = (S, th, gap = 0.55) => Math.abs(S.angleDiff(th, S.dockTh)) >= gap;
/** n points with at least `gap` between them, in the ring t0..t1, never across the pier */
function scatter(S, n, t0, t1, gap, tries = 400) {
  const out = [];
  for (let i = 0; i < tries && out.length < n; i++) {
    const th = S.rng() * Math.PI * 2; if (!outsideDock(S, th)) continue;
    const [x, z] = Pn(S, th, t0 + S.rng() * (t1 - t0));
    if (out.some((o) => Math.hypot(o[0] - x, o[1] - z) < gap)) continue;
    out.push([x, z, th]);
  }
  return out;
}
const y0 = (S, x, z) => (x == null ? S.d.H - 0.1 : Math.min(S.d.H - 0.1, S.terrainHeight(S.d, x, z) - 0.1));
function tavernAt(S, x, z, ry) { S.houseKind(S.A, S.B, x, y0(S, x, z), z, ry, S.rng, 'tavern'); S.extra.tavern = { x, z, ry }; }
function palms(S, n, t0, t1, s0 = 0.9) { for (let i = 0; i < n; i++) { const p = S.spot(S.d, S.rng, t0, t1, 0.8); if (p) S.palm(S.A, S.B, S.D, p[0], p[1], p[2], S.rng, s0 + S.rng() * 0.5); } }
function ring(S, kinds, n, t0, t1, gap = 5.2, out = false) {
  const pts = scatter(S, n, t0, t1, gap);
  pts.forEach(([x, z], i) => { const ry = faceIn(x, z) + (out ? Math.PI : 0); if (i === 0) tavernAt(S, x, z, ry); else S.houseKind(S.A, S.B, x, y0(S, x, z), z, ry, S.rng, pick(S.rng, kinds)); });
  return pts;
}

export const STYLE_DEF = {
  classic: { name: 'Painted town', shapes: ['flat'], ground: null, rMul: 1, lobeMul: 1 },

  fishing: {
    name: 'Fishing village', shapes: ['dune', 'dune', 'bowl'], ground: ['#e2cc8c', '#d2b676'], rMul: 0.85, lobeMul: 1.8, paint: { walls: ['#9aa8a0', '#8a98a0', '#b8a890', '#a89878'], roofs: ['#5a6a70', '#6a5a4a', '#3c6a78'] },
    build(S) {
      const { A, rng, d } = S;
      ring(S, ['stilt', 'stilt', 'thatch', 'thatch', 'stilt'], 9, 0.5, 0.82, 5.6, true);
      for (let i = 0; i < 3; i++) { const th = S.dockTh + 1.2 + i * 1.7 + rng() * 0.3, R = S.shoreR(d, th); A.push(Math.cos(th) * R * 0.8, 0, Math.sin(th) * R * 0.8, Math.PI / 2 - th); A.box(0, 0.62, 5, 1.4, 0.2, 10, '#6b4a2e', TILE.planks); A.pop(); }   // little side jetties
      for (let i = 0; i < 6; i++) { const th = rng() * 6.28; if (!outsideDock(S, th, 0.4)) continue; const [x, z] = Pn(S, th, 0.7 + rng() * 0.2); S.fishRack(A, x, y0(S), z, rng() * 3); }
      for (let i = 0; i < 4; i++) { const th = rng() * 6.28; const [x, z] = Pn(S, th, 0.9); const h = S.terrainHeight(d, x, z); if (h > 0.1) S.beachedBoat(A, x, y0(S, x, z), z, th + 1.57); }
      for (let i = 0; i < 5; i++) { const [x, z] = Pn(S, rng() * 6.28, 0.35 + rng() * 0.3); A.box(x, y0(S), z, 0.3, 2.6, 0.3, '#5a3e24', TILE.bark); A.box(x + 1.4, y0(S), z, 0.3, 2.6, 0.3, '#5a3e24', TILE.bark); A.quad([x, y0(S) + 2.5, z], [x + 1.4, y0(S) + 2.5, z], [x + 1.4, y0(S) + 0.9, z], [x, y0(S) + 0.9, z], '#c8c0a0', TILE.rope); }   // nets hung out
      palms(S, 3, 0.55, 0.85);
    },
  },

  terraced: {
    name: 'White town', shapes: ['terraced', 'terraced', 'hill'], ground: ['#e8e0cc', '#d6ccb4'], rMul: 0.95, lobeMul: 0.8, paint: { walls: ['#f6f2ea', '#f2e0b0', '#f0b8a0', '#b8dcd0', '#f6f2ea'], roofs: ['#c8643a', '#b8503a', '#d27a3a'] },
    build(S) {
      const { rng, d } = S, h = y0(S);
      const pts = scatter(S, 13, 0.1, 0.72, 4.6);
      pts.forEach(([x, z], i) => {
        const ry = Math.round(faceIn(x, z) / (Math.PI / 2)) * (Math.PI / 2);
        const y = y0(S, x, z);
        if (i === 0) { S.houseKind(S.A, S.B, x, y, z, ry, rng, 'tavern'); S.extra.tavern = { x, z, ry }; }
        else if (i === 1) S.houseKind(S.A, S.B, x, y, z, ry, rng, 'church');
        else if (i === 2) dome(S, x, y, z, ry);
        else { const k = rng(); if (k < 0.3) cube(S, x, y, z, ry, rng, pick(rng, S.paint.walls), pick(rng, ['#f2ead8', '#d8c8a8']), 1); else S.houseKind(S.A, S.B, x, y, z, ry, rng, k < 0.55 ? 'colonial' : k < 0.8 ? 'planter' : 'thatch'); }
      });
      palms(S, 8, 0.2, 0.85, 0.9);
      for (let i = 0; i < 8; i++) { const p = S.spot(d, rng, 0.15, 0.8, 0.8); if (p) bush(S, p[0], p[1], p[2], i % 2 ? '#d83a8a' : '#e8509a', 0.8); }
      well(S, 0, h, 0);
    },
  },

  thatch: {
    name: 'Hut village', shapes: ['dune', 'hill', 'bowl'], ground: ['#c9a46a', '#b08a52'], rMul: 1, lobeMul: 1.1, paint: { walls: ['#d8b888', '#c89868', '#e0c898'], roofs: ['#c8a860', '#b89850'] },
    build(S) {
      const { rng, d } = S, h = y0(S);
      firePit(S, 0, h, 0); totem(S, 2.6, h, -1.6); totem(S, -2.4, h, 1.8, 0.8);
      const pts = scatter(S, 9, 0.42, 0.7, 5.2);
      pts.forEach(([x, z], i) => { const ry = faceIn(x, z); if (i === 0) tavernAt(S, x, z, ry); else if (i === 1) longhouse(S, x, y0(S, x, z), z, ry, rng); else S.houseKind(S.A, S.B, x, y0(S, x, z), z, ry, rng, 'round'); });
      for (let i = 0; i < 3; i++) { const th = rng() * 6.28; if (!outsideDock(S, th, 0.5)) continue; const [x, z] = Pn(S, th, 0.78); S.fishRack(S.A, x, y0(S, x, z), z, rng() * 3); }
      for (let i = 0; i < 5; i++) { const [x, z] = Pn(S, rng() * 6.28, 0.2 + rng() * 0.25); S.A.blob(x, h + 0.25, z, 0.45, 0.3, 0.45, '#b8955a', TILE.rope, 0.2, i); }   // baskets
      palms(S, 9, 0.3, 0.88, 1.0);
    },
  },

  market: {
    name: 'Market town', shapes: ['hill', 'dune', 'terraced'], ground: ['#a8a49c', '#8f8b84'], rMul: 1.12, lobeMul: 0.7, paint: { walls: ['#f0b3a0', '#f4dfb0', '#a9d6ee', '#e8c0e0'], roofs: ['#d2483c', '#8a3a2a', '#3c78c8'] },
    build(S) {
      const { rng, d, dockTh } = S, h = y0(S), ax = Math.cos(dockTh), az = Math.sin(dockTh), lx = -az, lz = ax;   // the street runs from the pier to the far side
      const R = S.shoreR(d, dockTh);
      let first = true;
      for (let s = -R * 0.55; s <= R * 0.48; s += 5.4) {
        if (Math.abs(s - R * 0.05) < 4.5) continue;   // the square
        for (const side of [-1, 1]) {
          const lat = side * 5.3, x = ax * s + lx * lat, z = az * s + lz * lat;
          if (Math.hypot(x, z) > S.shoreR(d, Math.atan2(z, x)) * 0.82) continue;
          const ry = Math.atan2(-lx * side, -lz * side);   // front to the street
          if (first) { tavernAt(S, x, z, ry); first = false; continue; }
          const k = rng(); S.houseKind(S.A, S.B, x, y0(S, x, z), z, ry, rng, k < 0.4 ? 'planter' : k < 0.55 ? 'townhouse' : k < 0.75 ? 'warehouse' : 'colonial');
        }
      }
      { const bx = ax * -R * 0.62, bz = az * -R * 0.62; S.houseKind(S.A, S.B, bx, y0(S, bx, bz), bz, Math.atan2(-ax, -az), rng, 'belltower'); }
      fountain(S, ax * R * 0.05, h, az * R * 0.05);
      for (let i = -2; i <= 2; i++) if (i) { const x = ax * (R * 0.05 + i * 2.8) + lx * 0, z = az * (R * 0.05 + i * 2.8); S.B.box(x + lx * 3.2, h, z + lz * 3.2, 0.2, 4.6, 0.2, '#6b4a2e', TILE.bark); S.B.tri([x + lx * 3.2, h + 4.6, z + lz * 3.2], [x + lx * 3.2, h + 3.7, z + lz * 3.2], [x + lx * 3.2 + ax * 1.3, h + 4.1, z + lz * 3.2 + az * 1.3], pick(rng, ['#d24a3e', '#e8c060', '#3c78c8']), TILE.flag); }
      palms(S, 2, 0.8, 0.9);
    },
  },

  fortress: {
    name: 'Fort town', shapes: ['cliff', 'cliff', 'hill'], ground: ['#9a968c', '#8a867c'], rMul: 1.05, lobeMul: 0.3, paint: { walls: ['#c8c2b4', '#b8b2a6', '#d8d0c0'], roofs: ['#8a3a2a', '#7a4a3a', '#5a5a6a'] },
    build(S) {
      const { rng, d, dockTh } = S, h = y0(S);
      const a0 = dockTh + Math.PI - 1.35, a1 = dockTh + Math.PI + 1.35, N = 9;
      for (let i = 0; i <= N; i++) {
        const th = a0 + (a1 - a0) * i / N, [x, z] = Pn(S, th, 0.74);
        if (i === 0 || i === N) keepTower(S, x, y0(S, x, z), z, faceIn(x, z), 0.9);
        if (i < N) {
          const [x2, z2] = Pn(S, a0 + (a1 - a0) * (i + 1) / N, 0.74), mx = (x + x2) / 2, mz = (z + z2) / 2;
          wallSeg(S, mx, y0(S, mx, mz), mz, faceIn(mx, mz), Math.hypot(x2 - x, z2 - z) + 0.4);
          if (i % 3 === 1) cannon(S, mx * 0.95, y0(S, mx, mz) + 2.9, mz * 0.95, faceIn(mx, mz) + Math.PI);
        }
      }
      { const [x, z] = Pn(S, dockTh + Math.PI, 0.5); keepTower(S, x, y0(S, x, z), z, faceIn(x, z), 1.5); }   // the keep
      const pts = scatter(S, 8, 0.2, 0.7, 5.4);
      pts.forEach(([x, z], i) => { const ry = faceIn(x, z); if (i === 0) tavernAt(S, x, z, ry); else S.houseKind(S.A, S.B, x, y0(S, x, z), z, ry, rng, pick(rng, ['colonial', 'townhouse', 'warehouse', 'planter'])); });
      for (let i = 0; i < 4; i++) { const [x, z] = Pn(S, S.dockTh + (rng() - 0.5) * 1.2, 0.58 + rng() * 0.15); S.A.cyl(x, y0(S, x, z), z, 0.45, 0.4, 0.5, 6, '#2a2a30', TILE.stone, true); S.A.cyl(x + 0.9, h, z, 0.45, 0.4, 0.5, 6, '#2a2a30', TILE.stone, true); }   // cannonballs by the pier
      for (let i = 0; i < 4; i++) { const p = S.spot(d, rng, 0.2, 0.8, 0.8); if (p) bush(S, p[0], p[1], p[2], '#6a8a4a', 0.7); }
    },
  },

  farm: {
    name: 'Farm village', shapes: ['hill', 'dune', 'terraced'], ground: ['#62b64f', '#8ac455'], rMul: 1.15, lobeMul: 1.2, paint: { walls: ['#e8d4a8', '#d8b888', '#c8a070', '#f0e0b8'], roofs: ['#c8a860', '#b89850', '#8a5a3a'] },
    build(S) {
      const { rng, d } = S, h = y0(S);
      const [wx, wz] = Pn(S, S.dockTh + Math.PI * 0.8, 0.5); windmill(S, wx, y0(S, wx, wz), wz, faceIn(wx, wz));
      const pts = scatter(S, 6, 0.3, 0.55, 6);
      pts.filter(([x, z]) => Math.hypot(x - wx, z - wz) > 6).forEach(([x, z], i) => { const ry = faceIn(x, z); if (i === 0) tavernAt(S, x, z, ry); else S.houseKind(S.A, S.B, x, y0(S, x, z), z, ry, rng, pick(rng, ['thatch', 'thatch', 'colonial', 'warehouse'])); });
      if (!S.extra.tavern) { const [x, z] = Pn(S, S.dockTh + 1.4, 0.42); tavernAt(S, x, z, faceIn(x, z)); }
      for (let i = 0; i < 4; i++) { const th = S.dockTh + 0.9 + i * 1.3, [x, z] = Pn(S, th, 0.7); if (!outsideDock(S, th, 0.5) || Math.hypot(x - wx, z - wz) < 7) continue; field(S, x, y0(S, x, z), z, faceIn(x, z), 6.4, 4.2, pick(rng, ['#8ac455', '#d8b848', '#6aa84a', '#c8782a'])); }
      for (let i = 0; i < 6; i++) { const [x, z] = Pn(S, rng() * 6.28, 0.2 + rng() * 0.5); hayBale(S, x, y0(S, x, z), z, rng() * 3); }
      for (let i = 0; i < 6; i++) { const p = S.spot(d, rng, 0.2, 0.85, 0.8); if (p) tree(S, p[0], p[1], p[2], 0.9 + rng() * 0.3, 'apple', '#4a9a40', rng); }
      for (let i = 0; i < 5; i++) { const [x, z] = Pn(S, S.dockTh - 1.0 + rng() * 0.5, 0.55 + rng() * 0.2); sheep(S, x, y0(S, x, z), z, rng() * 6.28); }
      { const th = S.dockTh - 1.7, [x, z] = Pn(S, th, 0.7); S.fence(S.A, x, y0(S, x, z), z, th + 1.57, 6); }
    },
  },

  shrine: {
    name: 'Shrine village', shapes: ['hill', 'terraced', 'cliff'], ground: ['#7aa860', '#a8a48c'], rMul: 1, lobeMul: 0.9, paint: { walls: ['#b89868', '#a88858', '#c8a878'], roofs: ['#3a3a4a', '#4a4a5a', '#2a2a38'] },
    build(S) {
      const { rng, d, dockTh } = S, h = y0(S), ax = Math.cos(dockTh), az = Math.sin(dockTh), R = S.shoreR(d, dockTh);
      torii(S, ax * R * 0.5, h, az * R * 0.5, Math.PI / 2 - dockTh + Math.PI);
      for (let i = 0; i < 4; i++) { const t = R * (0.12 + i * 0.1); stoneLantern(S, ax * t - az * 1.9, h, az * t + ax * 1.9); stoneLantern(S, ax * t + az * 1.9, h, az * t - ax * 1.9); }
      { const [x, z] = Pn(S, dockTh + Math.PI, 0.32); pagoda(S, x, y0(S, x, z), z, faceIn(x, z)); }
      const pts = scatter(S, 7, 0.4, 0.72, 5.4).filter(([x, z]) => Math.abs(S.angleDiff(Math.atan2(z, x), dockTh)) > 0.45);
      pts.forEach(([x, z], i) => { const ry = faceIn(x, z); if (i === 0) tavernAt(S, x, z, ry); else S.houseKind(S.A, S.B, x, y0(S, x, z), z, ry, rng, pick(rng, ['cottage', 'cottage', 'townhouse', 'thatch'])); });
      for (let i = 0; i < 6; i++) { const p = S.spot(d, rng, 0.2, 0.85, 0.8); if (p) tree(S, p[0], p[1], p[2], 0.9 + rng() * 0.4, 'round', pick(rng, ['#f0a0c0', '#f4b8d0', '#e888b0']), rng); }
      for (let i = 0; i < 4; i++) { const p = S.spot(d, rng, 0.25, 0.9, 0.8); if (p) tree(S, p[0], p[1], p[2], 0.9, 'bamboo', null, rng); }
    },
  },

  wreckers: {
    name: 'Wreckers\' cove', shapes: ['bowl', 'cliff', 'dune'], ground: ['#8a7a58', '#6a5a3a'], rMul: 0.95, lobeMul: 1.5, paint: { walls: ['#7a6a58', '#6a5a4a', '#8a7860', '#5a5a58'], roofs: ['#8a4a3a', '#c8b890', '#5a6a6a', '#7a5a3a'] },
    build(S) {
      const { rng, d, dockTh } = S, h = y0(S);
      { const [x, z] = Pn(S, dockTh + Math.PI * 0.9, 0.42); hullHall(S, x, y0(S, x, z), z, faceIn(x, z)); }
      const pts = scatter(S, 10, 0.25, 0.75, 4.2);
      pts.forEach(([x, z, th], i) => { const ry = faceIn(x, z) + (rng() - 0.5) * 0.9; if (i === 0) tavernAt(S, x, z, ry); else S.houseKind(S.A, S.B, x, y0(S, x, z), z, ry, rng, pick(rng, ['thatch', 'cottage', 'stilt', 'warehouse'])); });
      for (let i = 0; i < 9; i++) { const [x, z] = Pn(S, rng() * 6.28, 0.2 + rng() * 0.65); ragPole(S, x, y0(S, x, z), z, pick(rng, ['#8a2a2a', '#c8b890', '#3a3a48', '#6a4a7a'])); }
      for (let i = 0; i < 6; i++) { const [x, z] = Pn(S, rng() * 6.28, 0.3 + rng() * 0.5); if (i % 2) S.barrel(S.A, x, y0(S, x, z), z, 1); else S.crateBox(S.A, x, y0(S, x, z), z, rng() * 3); S.ropeCoil(S.A, x + 1, h, z + 0.6, 1); }
      for (let i = 0; i < 4; i++) { const th = rng() * 6.28; if (!outsideDock(S, th, 0.4)) continue; const [x, z] = Pn(S, th, 0.92), hh = S.terrainHeight(d, x, z); if (hh > 0.1) S.beachedBoat(S.A, x, hh, z, th + 1.57); }
      for (let i = 0; i < 3; i++) { const p = S.spot(d, rng, 0.3, 0.9, 0.6); if (p) S.A.blob(p[0], p[1] + 0.3, p[2], 1.2, 0.6, 0.8, '#6a5a4a', TILE.planks, 0.3, i); }   // wreck timbers
    },
  },
};

// ---- shaped islands: steps up the ramp from the pier, and houses on the slope (several levels)
const STONE_STYLES = ['fortress', 'terraced', 'market', 'shrine'];
export function stairs(S) {
  const { A, d, dockTh } = S, R = S.shoreR(d, dockTh), ax = Math.cos(dockTh), az = Math.sin(dockTh), stone = STONE_STYLES.includes(d.style);
  const col = stone ? '#a8a49c' : '#8a6238', tile = stone ? TILE.stone : TILE.planks, dstep = 1.5;
  const H = (t) => S.terrainHeight(d, ax * R * t, az * R * t);
  let n = 0;
  for (let t = 0.3; t < 0.98; t += dstep / R) {
    const hA = H(t), hB = H(t + dstep / R), top = Math.max(hA, hB);
    if (hA - hB < 0.12 || top < 0.9) continue;   // only where the ground really falls
    const x = ax * R * (t + dstep / (2 * R)), z = az * R * (t + dstep / (2 * R));
    A.push(x, 0, z, Math.PI / 2 - dockTh);
    A.box(0, top - 1.4, 0, 3.4, 1.4, dstep + 0.1, col, tile, tile);
    for (const sx of [-1.9, 1.9]) A.box(sx, top - 1.4, 0, 0.4, 1.9, dstep + 0.1, stone ? '#8a867c' : '#5a3e24', stone ? TILE.stone : TILE.bark);   // low cheek walls
    if (n % 4 === 2) for (const sx of [-1.9, 1.9]) { A.box(sx, top + 0.4, 0, 0.18, 1.5, 0.18, '#3a3036', TILE.bark); A.box(sx, top + 1.9, 0, 0.34, 0.38, 0.34, '#ffffff', TILE.glow); }   // lanterns on the way up
    A.pop(); n++;
  }
}
export function slopeHouses(S, n) {
  const { d, rng } = S, sh = d.sh, kinds = ['cottage', 'cottage', 'townhouse', 'stilt'];
  const pts = [];
  for (let i = 0; i < 160 && pts.length < n; i++) {
    const th = rng() * Math.PI * 2; if (Math.abs(S.angleDiff(th, S.dockTh)) < 0.8) continue;
    const t = sh.te + (0.08 + rng() * 0.6) * sh.w, R = S.shoreR(d, th) * t, x = Math.cos(th) * R, z = Math.sin(th) * R, y = S.terrainHeight(d, x, z);
    if (y < 1.2 || pts.some((o) => Math.hypot(o[0] - x, o[1] - z) < 5.4)) continue;
    pts.push([x, z, y, th]);
  }
  for (const [x, z, y, th] of pts) {
    const ry = Math.atan2(Math.cos(th), Math.sin(th)) ;   // front to the sea
    S.A.push(x, y - 0.1, z, ry); S.A.box(0, -2.2, 0, 4.6, 2.3, 4.2, '#9a968c', TILE.stone, TILE.stone); S.A.pop();   // a stone footing that hides the slope
    S.houseKind(S.A, S.B, x, y - 0.1, z, ry, rng, pick(rng, kinds));
  }
}
