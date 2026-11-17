// The Edge's look (systems/edge.js plays it): the sea runs to a straight lip and pours over it into nothing; out in the dark
// stand things far too big. Built from the game's own parts (moved here from concepts.js, 2026-11-16, when the Edge became
// sailable). Local frame: the lip runs along x (the ship sails along it), the void is towards -z, the sea towards +z.
// Each thing out there is its own mesh, so the sequence can let it come out of the dark as the ship draws level with it.
import * as THREE from 'three';
import { Builder } from '../builder.js';
import { TILE } from '../textures.js';
import { mats, psxMaterial } from '../psx.js';
import { mulberry32 } from '../util.js';

const VOID = '#07050c', STONE = ['#5a5266', '#4a4458', '#6a6070', '#3c3848'], EYE = '#ff70d0';
/** where each thing stands: along the lip (x) and out in the dark (z). The hooded one is straight ahead where the lip is met. */
export const PLACES = { hood: [0, -260], head: [235, -330], tower: [-225, -420], arches: [400, -260] };
export const pillarAt = (i) => [-320 - i * 30, -(150 + i * 80)];
export const PILLARS = 6;   // a seventh stands further on, for the second look

function sinkTo(b, x, z, w, top, col) {   // a column of the dark: whatever stands out there has no bottom, it fades into black
  const C = [col, col, '#3a3442', '#2a2632', '#1c1824', '#120f18', '#0b0910', VOID];
  for (let i = 0; i < 16; i++) { const y = top - i * 15; b.box(x, y - 15, z, w * (1 + i * 0.04), 15, w * (1 + i * 0.04), C[Math.min(C.length - 1, i >> 1)], TILE.stone); }
}

/** the lip, the falls, the crest foam and spray (fogged like the sea), and the dark (unfogged): w is the lip's half length */
function lip(near, dark, rng, W) {
  const prof = [[0, 0.25, '#eef8f4'], [-1.6, -0.6, '#d6ece8'], [-3, -3, '#a8d6ce'], [-4.2, -9, '#5fa0a0'], [-5, -22, '#2e6470'], [-5.6, -50, '#163640'], [-6, -95, '#0b1a22'], [-6.3, -170, VOID]];
  for (let i = 0; i < prof.length - 1; i++) {
    const [z0, y0, c0] = prof[i], [z1, y1] = prof[i + 1], b = i < 4 ? near : dark;
    b.quad([-W, y0, z0], [W, y0, z0], [W, y1, z1], [-W, y1, z1], c0, TILE.white);
    b.quad([W, y0, z0], [-W, y0, z0], [-W, y1, z1], [W, y1, z1], c0, TILE.white);
  }
  for (let x = -W; x < W; x += 1.2 + rng() * 2.2) {   // white ropes of water down the face
    const l = 8 + rng() * 40, y = -1 - rng() * 6;
    near.box(x, y - l, -4.6 - (l / 40), 0.35 + rng() * 0.3, l, 0.25, rng() < 0.6 ? '#f4fbf8' : '#bfe0dc', TILE.white);
  }
  for (let x = -W; x < W; x += 6 + rng() * 8) near.blob(x, 0.3, -0.8, 1.2 + rng() * 1.0, 0.22, 0.8, rng() < 0.5 ? '#f4fbf8' : '#d8eeea', TILE.white, 0.3, Math.floor(x));   // foam on the crest
  for (let x = -W + 10; x < W; x += 9 + rng() * 12) for (let k = 0; k < 3; k++) dark.box(x + (rng() - 0.5) * 6, -24 - k * 26 - rng() * 8, -9 - k * 3, 1.2 + rng(), 22 + rng() * 10, 0.6, ['#d8eeea', '#7f9a9e', '#2a3a40'][k], TILE.white);   // spray falling into the dark
  // the dark: wide enough that its ends never show from anywhere along the lip; the far wall's top sits just under the horizon,
  // and near enough that the camera's far plane never cuts it from the furthest a ship stays in the pull
  const WV = 2400, ZF = -1100;
  dark.quad([-WV, -400, 0], [WV, -400, 0], [WV, -400, ZF], [-WV, -400, ZF], VOID, TILE.void);
  dark.quad([-WV, -400, ZF], [WV, -400, ZF], [WV, -12, ZF], [-WV, -12, ZF], VOID, TILE.void);
  for (const s of [-1, 1]) dark.quad([s * WV, -400, 0], [s * WV, -400, ZF], [s * WV, -12, ZF], [s * WV, -12, 0], VOID, TILE.void);
  dark.quad([-W, -400, 0], [W, -400, 0], [W, -175, -6.4], [-W, -175, -6.4], VOID, TILE.void);   // under the falls
}

function hood(b) {   // the hooded one: hands folded, no face under the hood, taller than any mast by twenty
  sinkTo(b, 0, 0, 34, 0, STONE[1]);
  b.cyl(0, 0, 0, 27, 13, 92, 7, STONE[1], TILE.stone);
  b.box(0, 60, 11, 26, 11, 12, STONE[0], TILE.stone);
  b.cyl(0, 90, 0, 13, 8, 12, 7, STONE[2], TILE.stone);
  b.blob(0, 112, 3, 12, 19, 15, STONE[3], TILE.stone, 0.12, 5);
  b.push(0, 124, 9, 0, 1, 1, 1, -0.6, 0); b.box(0, 0, 0, 14, 10, 12, STONE[3], TILE.stone); b.pop();
  b.blob(0, 107, 12, 7, 11, 6, VOID, TILE.void, 0.05, 6);   // and nothing in it
}
const headFrame = (b) => b.push(0, 0, 0, -0.6, 1, 1, 1, 0, 1.2);   // on its side
function head(b) {
  headFrame(b);
  b.blob(0, 0, 0, 40, 52, 38, STONE[2], TILE.stone, 0.1, 9);
  b.box(0, 8, 36, 44, 5, 6, STONE[3], TILE.stone);    // brow
  b.box(0, -24, 36, 18, 3, 4, VOID, TILE.void);       // the mouth, a line
  b.pop();
}
function eyes(b, open) {   // one eye open (large enough to see from the lip), the other a closed line; open: -1 or 1
  headFrame(b);
  b.box(open * 14, -2, 37, 14, 9, 3, VOID, TILE.void); b.box(open * 14, -2, 38.5, 9, 7, 1, EYE, TILE.glow);
  b.box(-open * 14, -2, 37, 12, 1.5, 3, STONE[3], TILE.stone);
  b.pop();
}
/** the tower built at the wrong angles: storeys turned and leaning, windows far too small. Returns the storeys, the spire on
 *  them, and one more storey with its spire (shown only on a second look) */
function tower(base, spire, more, rng) {
  sinkTo(base, 0, 0, 30, 0, STONE[3]);
  let y = 0, lean = 0, w = 30;
  const storey = (b, i) => {
    const h = 18 + rng() * 10; lean += (rng() - 0.35) * 0.12;
    b.push(Math.sin(lean) * y * 0.4, y, 0, i * 0.37, 1, 1, 1, 0, lean);
    b.box(0, 0, 0, w, h, w * 0.8, STONE[i % 4], TILE.stone);
    for (let k = 0; k < 6; k++) b.box(-w / 2 + 3 + rng() * (w - 6), 3 + rng() * (h - 6), w * 0.4 + 0.3, 0.9, 1.3, 0.3, rng() < 0.25 ? EYE : VOID, rng() < 0.25 ? TILE.glow : TILE.void);
    b.pop(); y += h; w *= 0.86;
  };
  for (let i = 0; i < 9; i++) storey(base, i);
  spire.cyl(Math.sin(lean) * y * 0.4, y, 0, 3, 0.1, 30, 4, STONE[0], TILE.stone);
  storey(more, 9);
  more.cyl(Math.sin(lean) * y * 0.4, y, 0, 3, 0.1, 30, 4, STONE[0], TILE.stone);
}
function pillar(b, i) {   // built at the size the first one has; the sequence scales each with its distance, so none gets smaller
  sinkTo(b, 0, 0, 7, 0, STONE[2]);
  b.cyl(0, 0, 0, 6, 6, 60, 6, STONE[(i + 2) % 4], TILE.stone);
  b.box(0, 60, 0, 16, 4, 16, STONE[3], TILE.stone);
}
function arch(b, i) {   // arches standing half sunk out of the void, in a line
  b.push(i * 28 - 42, -10, 90 - i * 60, 0.9);
  b.box(-16, 0, 0, 6, 60, 6, STONE[1], TILE.stone); b.box(16, 0, 0, 6, 60, 6, STONE[1], TILE.stone); b.box(0, 58, 0, 40, 8, 7, STONE[0], TILE.stone);
  b.pop();
}

/** build it at the lip's middle (x, z), turned so the void lies along ry (the group's rotation.y). W: the lip's half length.
 *  Returns { g, near, dark, things: { name: { mesh(es), at:[x,z] } } }; every far material starts invisible (opacity 0). */
export function buildEdgeWorld(scene, x, z, ry, W, k = [1, 1]) {
  // k: how far each way (left, right) the stretch runs against the full length: what stands out there is spaced to fit it
  const fit = (at) => [at[0] * (at[0] < 0 ? k[0] : k[1]), at[1]];
  const rng = mulberry32(4 * 97 + 5), g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const farMat = () => { const m = psxMaterial({ map: mats.props.map, vertexColors: true, fog: false, side: THREE.DoubleSide, key: 'Edge', transparent: true }); m.opacity = 0; return m; };
  const mesh = (b, mat, at, order = 2) => { const m = new THREE.Mesh(b.geometry(), mat); if (at) { at = fit(at); m.position.set(at[0], 0, at[1]); } m.renderOrder = order; g.add(m); return m; };
  const nb = new Builder(), db = new Builder(); lip(nb, db, rng, W);
  const near = mesh(nb, mats.props, null, 1), dark = mesh(db, farMat(), null, 1);
  const things = {};
  { const b = new Builder(); hood(b); const m = mesh(b, farMat(), PLACES.hood); m.rotation.y = 0.25; things.hood = { meshes: [m], at: fit(PLACES.hood) }; }
  { const b = new Builder(), a = new Builder(), c = new Builder(); head(b); eyes(a, -1); eyes(c, 1); const mat = farMat();
    const m = mesh(b, mat, PLACES.head), e1 = mesh(a, mat, PLACES.head), e2 = mesh(c, mat, PLACES.head); e2.visible = false;
    things.head = { meshes: [m, e1, e2], at: fit(PLACES.head), eyes: [e1, e2] }; }
  { const b = new Builder(), s = new Builder(), mo = new Builder(); tower(b, s, mo, rng); const mat = farMat();
    const m = mesh(b, mat, PLACES.tower), sp = mesh(s, mat, PLACES.tower), more = mesh(mo, mat, PLACES.tower); more.visible = false;
    things.tower = { meshes: [m, sp, more], at: fit(PLACES.tower), spire: sp, more }; }
  { const mat = farMat(), ps = [];
    for (let i = 0; i <= PILLARS; i++) { const b = new Builder(); pillar(b, i); const m = mesh(b, mat, pillarAt(i)); m.userData.at = fit(pillarAt(i)); ps.push(m); }
    ps[PILLARS].visible = false;
    things.pillars = { meshes: ps, at: fit(pillarAt(2)), more: ps[PILLARS] }; }
  { const mat = farMat(), b = new Builder(), l = new Builder(); for (let i = 0; i < 3; i++) arch(b, i); arch(l, 3);
    const m = mesh(b, mat, PLACES.arches), last = mesh(l, mat, PLACES.arches); things.arches = { meshes: [m, last], at: fit(PLACES.arches), last }; }
  scene.add(g);
  return { g, near, dark, things };
}

/** free what buildEdgeWorld made (the near part shares the props material, which stays) */
export function disposeEdgeWorld(scene, w) {
  scene.remove(w.g);
  const mats_ = new Set();
  w.g.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); if (o.material !== mats.props) mats_.add(o.material); } });
  for (const m of mats_) m.dispose();
}
