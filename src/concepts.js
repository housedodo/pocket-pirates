import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats, psxMaterial } from './psx.js';
import { houseKind, villager, palm } from './world.js';
import { mulberry32 } from './util.js';

// Concept scenes for new biomes, built from the game's own parts so they look like the game.
// Dev only: __game.biome(kind, x, z) from a test. The one exception is the Edge: systems/edge.js builds it in the game (buildEdge).

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


// ---- the Edge (concept for a ~45 s sequence in the deep dread stages): the sea runs to a straight lip and pours over it into
// nothing. Out in the dark stand things far too big: a hooded figure, a head on its side, a tower built at the wrong angles, a row
// of pillars that do not get smaller as they go away. The lip runs along local z = 0; the void is towards -z.
const VOID = '#07050c', STONE = ['#5a5266', '#4a4458', '#6a6070', '#3c3848'], EYE = '#ff70d0';
function sinkTo(b, x, z, w, top, col) {   // a column of the dark: whatever stands out there has no bottom, it fades into black
  const C = [col, col, '#3a3442', '#2a2632', '#1c1824', '#120f18', '#0b0910', VOID];
  for (let i = 0; i < 16; i++) { const y = top - i * 15; b.box(x, y - 15, z, w * (1 + i * 0.04), 15, w * (1 + i * 0.04), C[Math.min(C.length - 1, i >> 1)], TILE.stone); }
}
function edge(b, rng) {
  const W = 420, near = b; b = new Builder();   // near: the lip, foam and streaks (in the fog like the sea); b: the dark and what stands in it, drawn past the fog
  // the drop: the sea (cut off at z = 0, __game.clipSea) turns over the lip and falls, pale at the crest, into the black
  const prof = [[0, 0.25, '#eef8f4'], [-1.6, -0.6, '#d6ece8'], [-3, -3, '#a8d6ce'], [-4.2, -9, '#5fa0a0'], [-5, -22, '#2e6470'], [-5.6, -50, '#163640'], [-6, -95, '#0b1a22'], [-6.3, -170, VOID]];
  for (let i = 0; i < prof.length - 1; i++) {
    const [z0, y0, c0] = prof[i], [z1, y1] = prof[i + 1];
    (i < 4 ? near : b).quad([-W, y0, z0], [W, y0, z0], [W, y1, z1], [-W, y1, z1], c0, TILE.white);
    (i < 4 ? near : b).quad([W, y0, z0], [-W, y0, z0], [-W, y1, z1], [W, y1, z1], c0, TILE.white);
  }
  for (let x = -W; x < W; x += 1.2 + rng() * 2.2) {   // white ropes of water down the face
    const l = 8 + rng() * 40, y = -1 - rng() * 6;
    near.box(x, y - l, -4.6 - (l / 40), 0.35 + rng() * 0.3, l, 0.25, rng() < 0.6 ? '#f4fbf8' : '#bfe0dc', TILE.white);
  }
  const WV = 2200, ZF = -1450;   // the dark: wide enough that its ends never show; the far wall's top sits just under the horizon
  b.quad([-WV, -400, 0], [WV, -400, 0], [WV, -400, ZF], [-WV, -400, ZF], VOID, TILE.void);     // the floor of the dark, far below
  b.quad([-WV, -400, ZF], [WV, -400, ZF], [WV, -12, ZF], [-WV, -12, ZF], VOID, TILE.void);
  for (const s of [-1, 1]) b.quad([s * WV, -400, 0], [s * WV, -400, ZF], [s * WV, -12, ZF], [s * WV, -12, 0], VOID, TILE.void);   // and its sides
  b.quad([-W, -400, 0], [W, -400, 0], [W, -175, -6.4], [-W, -175, -6.4], VOID, TILE.void);   // under the falls
  for (let x = -W; x < W; x += 6 + rng() * 8) near.blob(x, 0.3, -0.8, 1.2 + rng() * 1.0, 0.22, 0.8, rng() < 0.5 ? '#f4fbf8' : '#d8eeea', TILE.white, 0.3, Math.floor(x));   // foam on the crest
  for (let x = -W + 10; x < W; x += 9 + rng() * 12) for (let k = 0; k < 3; k++) b.box(x + (rng() - 0.5) * 6, -24 - k * 26 - rng() * 8, -9 - k * 3, 1.2 + rng(), 22 + rng() * 10, 0.6, ['#d8eeea', '#7f9a9e', '#2a3a40'][k], TILE.white);   // spray: pale streaks falling into the dark
  // streaks on the water running to the lip: the current takes everything over
  for (let i = 0; i < 90; i++) { const x = (rng() - 0.5) * W * 1.6, z = 4 + rng() * 120, l = 6 + rng() * 14; near.box(x, 0.18, z, 0.35, 0.05, l, '#d8efe8', TILE.white); }
  // 1) the hooded one: hands folded, no face under the hood, taller than any mast by twenty
  b.push(-70, 0, -260, 0.25);
  sinkTo(b, 0, 0, 34, 0, STONE[1]);
  b.cyl(0, 0, 0, 27, 13, 92, 7, STONE[1], TILE.stone);                      // the robe, wide at the foot
  b.box(0, 60, 11, 26, 11, 12, STONE[0], TILE.stone);                        // the sleeves, over the folded hands
  b.cyl(0, 90, 0, 13, 8, 12, 7, STONE[2], TILE.stone);                       // narrow shoulders
  b.blob(0, 112, 3, 12, 19, 15, STONE[3], TILE.stone, 0.12, 5);              // the hood, peaked forward
  b.push(0, 124, 9, 0, 1, 1, 1, -0.6, 0); b.box(0, 0, 0, 14, 10, 12, STONE[3], TILE.stone); b.pop();
  b.blob(0, 107, 12, 7, 11, 6, VOID, TILE.void, 0.05, 6);                    // and nothing in it
  b.pop();
  // 2) a head on its side, half in the dark, one eye open
  b.push(150, 0, -330, -0.6, 1, 1, 1, 0, 1.2);
  b.blob(0, 0, 0, 40, 52, 38, STONE[2], TILE.stone, 0.1, 9);
  b.box(0, 8, 36, 44, 5, 6, STONE[3], TILE.stone);                           // brow
  b.box(-14, -2, 37, 14, 9, 3, VOID, TILE.void); b.box(-14, -2, 38.5, 9, 7, 1, EYE, TILE.glow);   // the open eye, large enough to see from the lip
  b.box(14, -2, 37, 10, 1.5, 3, STONE[3], TILE.stone);                       // the closed one
  b.box(0, -24, 36, 18, 3, 4, VOID, TILE.void);                              // the mouth, a line
  b.pop();
  // 3) a tower built at the wrong angles: every storey turned and leaning, tiny windows far too small for it
  b.push(40, 0, -420, 0);
  sinkTo(b, 0, 0, 30, 0, STONE[3]);
  let y = 0, lean = 0, w = 30;
  for (let i = 0; i < 9; i++) {
    const h = 18 + rng() * 10; lean += (rng() - 0.35) * 0.12;
    b.push(Math.sin(lean) * y * 0.4, y, 0, i * 0.37, 1, 1, 1, 0, lean);
    b.box(0, 0, 0, w, h, w * 0.8, STONE[i % 4], TILE.stone);
    for (let k = 0; k < 6; k++) b.box(-w / 2 + 3 + rng() * (w - 6), 3 + rng() * (h - 6), w * 0.4 + 0.3, 0.9, 1.3, 0.3, rng() < 0.25 ? EYE : VOID, rng() < 0.25 ? TILE.glow : TILE.void);
    b.pop();
    y += h; w *= 0.86;
  }
  b.cyl(Math.sin(lean) * y * 0.4, y, 0, 3, 0.1, 30, 4, STONE[0], TILE.stone);
  b.pop();
  // 4) a row of pillars into the dark that never gets smaller: each one further off is built bigger, so they all look the same
  for (let i = 0; i < 6; i++) { const d = 140 + i * 70, s = d / 140, x = -230 - i * 30; b.push(x, 0, -d, 0); sinkTo(b, 0, 0, 7 * s, 0, STONE[2]); b.cyl(0, 0, 0, 6 * s, 6 * s, 60 * s, 6, STONE[(i + 2) % 4], TILE.stone); b.box(0, 60 * s, 0, 16 * s, 4 * s, 16 * s, STONE[3], TILE.stone); b.pop(); }
  // 5) arches standing out of the void in a line, half sunk
  for (let i = 0; i < 4; i++) { b.push(260 + i * 25, -10, -170 - i * 60, 0.9); b.box(-16, 0, 0, 6, 60, 6, STONE[1], TILE.stone); b.box(16, 0, 0, 6, 60, 6, STONE[1], TILE.stone); b.box(0, 58, 0, 40, 8, 7, STONE[0], TILE.stone); b.pop(); }
  const far = psxMaterial({ map: mats.props.map, vertexColors: true, fog: false, side: THREE.DoubleSide, key: 'Edge' });
  return [new THREE.Mesh(b.geometry(), far)];
}

/** build a concept scene at (x, z); returns the group so a test can remove it */
/** the Edge, turned so its void lies along `ry` (the group's rotation.y): systems/edge.js. The far part (the dark and what stands in it)
 *  is returned as g.userData.far so it can fade in. */
export function buildEdge(scene, x, z, ry) {
  const g = buildBiome(scene, 'edge', x, z); g.rotation.y = ry;
  g.userData.far = g.children[1]; return g;
}
export function buildBiome(scene, kind, x, z) {
  const b = new Builder(), rng = mulberry32(kind.length * 97 + 5);
  const extra = { coral, rain, sunken, edge }[kind](b, rng);
  const g = new THREE.Group(); g.position.set(x, 0, z);
  g.add(new THREE.Mesh(b.geometry(), mats.props)); for (const m of extra) { m.renderOrder = 1; g.add(m); }
  scene.add(g); return g;
}
