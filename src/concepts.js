import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';
import { houseKind, villager, palm } from './world.js';
import { mulberry32 } from './util.js';

// Concept scenes for new biomes, built from the game's own parts so they look like the game.
// Dev only: __game.biome(kind, x, z) from a test. Nothing in the real world uses this yet.

const CORAL = ['#f06aa0', '#ffd23a', '#ff8a50', '#b070e0', '#ff5a6a', '#f4ead0'];

function flat(b, x, z, r, y, col, segs = 14, seed = 1) {   // a low, ragged disc (sandbar, shallows patch)
  const rng = mulberry32(seed), pts = [];
  for (let i = 0; i < segs; i++) { const a = (i / segs) * Math.PI * 2, rr = r * (0.75 + rng() * 0.35); pts.push([x + Math.cos(a) * rr, y, z + Math.sin(a) * rr]); }
  for (let i = 0; i < segs; i++) b.tri([x, y, z], pts[(i + 1) % segs], pts[i], col, TILE.sand);
}
function coralHead(b, x, z, rng) {
  const col = CORAL[Math.floor(rng() * CORAL.length)], k = rng();
  if (k < 0.4) b.blob(x, 0.55, z, 0.8 + rng() * 0.9, 0.45 + rng() * 0.4, 0.7 + rng() * 0.8, col, TILE.stone, 0.35, x * 3 + z);   // brain coral
  else if (k < 0.75) { for (let i = 0; i < 4; i++) { const a = rng() * 6.28, l = 0.5 + rng() * 0.6; b.cyl(x + Math.cos(a) * 0.3, 0.2, z + Math.sin(a) * 0.3, 0.2, 0.12, 1.1 + l, 4, col, TILE.white, true); } }   // staghorn
  else { const a = rng() * 6.28, dx = Math.cos(a) * 0.9, dz = Math.sin(a) * 0.9; b.tri([x - dx, 0.3, z - dz], [x + dx, 0.3, z + dz], [x, 2, z], col, TILE.leaf); b.tri([x + dx, 0.3, z + dz], [x - dx, 0.3, z - dz], [x, 2, z], col, TILE.leaf); }   // sea fan
}
function rowboat(b, x, z, ry, col = '#8a5a30') {
  b.push(x, 0.15, z, ry); b.box(0, 0, 0, 1.3, 0.45, 3.2, col, TILE.planks); b.box(0, 0.25, 0, 0.9, 0.1, 2.6, '#5a3a1c', TILE.planks); b.pop();
}
function lampPost(b, x, y, z, h) {
  b.cyl(x, y, z, 0.13, 0.13, h, 5, '#3a3a40', TILE.white);
  b.box(x, y + h + 0.25, z, 0.5, 0.55, 0.5, '#ffd060', TILE.glow);
  b.box(x, y + h + 0.6, z, 0.65, 0.12, 0.65, '#2a2a30', TILE.white);
}

function coral(b, rng) {
  const sh = new Builder();
  flat(sh, 0, 0, 46, 0.35, '#ffffff', 18, 3);
  flat(b, 6, -4, 13, 0.95, '#ecd69c', 12, 4); flat(b, -18, 12, 7, 0.9, '#ecd69c', 10, 5); flat(b, 22, 16, 5, 0.85, '#f2dfa8', 9, 6);
  for (let i = 0; i < 110; i++) { const a = rng() * 6.28, r = 5 + rng() * 38; coralHead(b, Math.cos(a) * r, Math.sin(a) * r, rng); }
  // a little stilt village on the sandbar
  houseKind(b, b, 2, 0.95, -8, 0.3, rng, 'stilt'); houseKind(b, b, 10, 0.95, -6, -0.4, rng, 'stilt'); houseKind(b, b, 7, 0.95, 2, 0.1, rng, 'round');
  for (let i = 0; i < 6; i++) b.box(-2 - i * 1.6, 1.0, 3 + i * 0.4, 1.6, 0.18, 1.4, '#a07848', TILE.planks);   // a plank walk out to the boats
  palm(b, b, new Builder(), 13, 0.95, 0, rng, 1.1); palm(b, b, new Builder(), -1, 0.95, -3, rng, 0.9);
  for (const [x, z, k] of [[4, -1, 'fisher'], [9, 3, 'child'], [-6, 4.6, 'fisher']]) villager(b, x, 1.0, z, rng() * 6, rng, k);
  rowboat(b, -12, 7, 0.6); rowboat(b, 16, 9, -0.9, '#3c78c8');
  return [new THREE.Mesh(sh.geometry(), mats.shallow)];
}

function rain(b, rng) {
  // one tall, steep green island: cliffs in tiers, waterfalls straight into the sea
  b.blob(0, 0, 0, 30, 4, 27, '#d8c48a', TILE.sand, 0.25, 11);
  b.blob(0, 8, -2, 24, 12, 20, '#3f8a3a', TILE.white, 0.35, 12);
  b.blob(-4, 20, -4, 15, 11, 13, '#4a9a40', TILE.white, 0.35, 13);
  b.blob(-6, 30, -6, 8, 8, 7, '#5aa448', TILE.white, 0.4, 14);
  for (let i = 0; i < 26; i++) { const a = rng() * 6.28, h = 6 + rng() * 22, rr = (1 - h / 34) * 20; b.blob(Math.cos(a) * rr - 3, h, Math.sin(a) * rr - 3, 2.2, 1.6, 2.2, i % 2 ? '#2f7a34' : '#5ab048', TILE.leaf, 0.3, i); }   // tree crowns on the slopes
  for (const [x, top, z] of [[9, 24, 16], [-14, 17, 15], [18, 13, 9]]) {   // falls: pale stepped water, foam at the foot
    for (let y = 0; y < top; y += 2) b.box(x + Math.sin(y) * 0.2, y + 1, z + y * 0.05, 1.8 - y * 0.02, 2.05, 0.6, y % 4 ? '#e8f8ff' : '#8fd0ee', TILE.white);
    b.blob(x, 0.6, z + 1.2, 2.4, 0.8, 1.6, '#ffffff', TILE.white, 0.4, x);
  }
  for (let i = 0; i < 9; i++) { const a = -0.3 + i * 0.32, r = 26 + rng() * 3; palm(b, b, new Builder(), Math.cos(a) * r, 2, Math.sin(a) * r + 4, rng, 0.9 + rng() * 0.4); }
  // the village under leaf roofs, on the lower ledge
  for (const [x, z, ry] of [[-6, 22, 0.2], [2, 25, -0.1], [10, 23, -0.4], [-13, 19, 0.5]]) {
    b.push(x, 2, z, ry); b.box(0, 0, 0, 3, 2.2, 3, '#c8a878', TILE.wall);
    b.gable(0, 2.2, 0, 4.6, 2.2, 4.4, '#5aa040', TILE.leaf, '#c8a878'); b.pop();
  }
  for (const [x, z, k] of [[-2, 27, 'market'], [5, 28, 'child'], [-9, 25, 'fisher']]) villager(b, x, 2.1, z, 3.1, rng, k);
  // a rainbow: hard bands, no gradient
  const bands = ['#d24a3e', '#e8873a', '#ffd23a', '#5ec45a', '#3c78c8', '#7a4ab0'];
  bands.forEach((c, i) => { const R = 70 - i * 2.4; for (let s = 0; s < 18; s++) { const a0 = (s / 18) * Math.PI, a1 = ((s + 1) / 18) * Math.PI;
    b.quad([Math.cos(a0) * R, Math.sin(a0) * R, -60], [Math.cos(a1) * R, Math.sin(a1) * R, -60], [Math.cos(a1) * (R - 2.4), Math.sin(a1) * (R - 2.4), -60], [Math.cos(a0) * (R - 2.4), Math.sin(a0) * (R - 2.4), -60], c, TILE.white); } });
  return [];
}

function sunken(b, rng) {
  const sh = new Builder();
  flat(sh, 0, 0, 44, 0.35, '#ffffff', 16, 7);
  // streets of a town the sea took: the upper floors and roofs stand out of the water
  const kinds = ['townhouse', 'cottage', 'townhouse', 'warehouse', 'townhouse', 'cottage'];
  for (let i = 0; i < 6; i++) { const row = i < 3 ? -1 : 1, x = -14 + (i % 3) * 13, z = row * 9; houseKind(b, b, x, row > 0 ? -3.4 : -3.0, z, row > 0 ? Math.PI : 0, rng, kinds[i]); }
  houseKind(b, b, 26, -2.8, 0, -Math.PI / 2, rng, 'belltower');
  for (const [x, z, ry, k] of [[-30, -18, 0.3, 'cottage'], [16, -20, 1.2, 'townhouse'], [-8, 20, 2.8, 'cottage'], [30, 16, 2.0, 'round']]) houseKind(b, b, x, -3.3, z, ry, rng, k);   // more of the town, further out
  for (const [x, z] of [[-22, -8], [4, 14], [22, -12]]) { b.box(x, 0, z, 1.6, 1.1, 1.6, '#a89a88', TILE.stone); b.box(x, 1.1, z, 0.7, 1.4, 0.7, '#8a3a2a', TILE.stone); }   // chimneys with nothing under them
  for (let i = 0; i < 8; i++) b.box(-18 + i * 5.6, 0.3, 0, 4.8, 0.25, 3.6, i % 2 ? '#8a8478' : '#9a9488', TILE.stone);   // the old street, just awash
  for (const x of [-16, -4, 8, 20]) lampPost(b, x, -1, 2.6, 3.4);
  b.box(-26, -1, 0, 1.4, 6, 1.4, '#a89a88', TILE.stone); b.box(-26, -1, 7, 1.4, 6, 1.4, '#a89a88', TILE.stone); b.box(-26, 5.2, 3.5, 1.6, 1.2, 8.4, '#a89a88', TILE.stone);   // the town gate
  rowboat(b, -6, 4.4, 1.5); rowboat(b, 12, -4.5, 1.7, '#2f9a8a');
  villager(b, -6, 0.6, 4.4, 2.2, rng, 'fisher'); villager(b, 1, 1.5, -8, 0.4, rng, 'oldsalt');
  for (let i = 0; i < 14; i++) b.blob(-30 + rng() * 60, 0.45, -16 + rng() * 32, 0.6, 0.3, 0.6, '#5a7a5a', TILE.stone, 0.4, i);   // weed on the stones
  return [new THREE.Mesh(sh.geometry(), mats.shallow)];
}

/** build a concept scene at (x, z); returns the group so a test can remove it */
export function buildBiome(scene, kind, x, z) {
  const b = new Builder(), rng = mulberry32(kind.length * 97 + 5);
  const extra = { coral, rain, sunken }[kind](b, rng);
  const g = new THREE.Group(); g.position.set(x, 0, z);
  g.add(new THREE.Mesh(b.geometry(), mats.props)); for (const m of extra) { m.renderOrder = 1; g.add(m); }
  scene.add(g); return g;
}
