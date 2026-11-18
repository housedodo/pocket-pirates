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
/** where each thing stands: along the lip (x) and out in the dark (z). The hooded one is straight ahead where the lip is met.
 *  Since 2026-11-18 (owner: more ominous, much taller, and you cannot see where they start) they stand much further out and are
 *  built at a much larger scale (SIZE); each one goes black from the bottom up (sinkFade), so its foot is lost in the dark */
export const PLACES = { hood: [0, -560], head: [330, -700], tower: [-340, -820], arches: [520, -520] };
export const pillarAt = (i) => [-380 - i * 40, -(300 + i * 120)];
export const PILLARS = 6;   // a seventh stands further on, for the second look
export const SIZE = { hood: 3.2, head: 3.4, tower: 3.0, pillars: 2.6, arches: 3.2 };   // times the size they were built at
const SINK = { hood: [-60, 70], head: [-90, 10], tower: [-40, 150], pillars: [-30, 40], arches: [-40, 45] };   // black below the first, whole above the second (built units)
const LIFT = { hood: -40, head: -30, tower: -60, pillars: -40, arches: -50 };   // and set this far down into the dark (built units)

function sinkTo(b, x, z, w, top, col) {   // a column of the dark: whatever stands out there has no bottom, it fades into black
  const C = [col, col, '#3a3442', '#2a2632', '#1c1824', '#120f18', '#0b0910', VOID];
  for (let i = 0; i < 16; i++) { const y = top - i * 15; b.box(x, y - 15, z, w * (1 + i * 0.04), 15, w * (1 + i * 0.04), C[Math.min(C.length - 1, i >> 1)], TILE.stone); }
}

/** the lip, the falls and the falling water (fogged like the sea), and the dark (unfogged): w is the lip's half length.
 *  Since 2026-11-18 (owner: smoother, no big blobs) the face is a long smooth curve in many bands, the water on it thin threads,
 *  and nothing big falls off it: the spray is a fine haze of short streaks that goes dark as it drops */
function lip(near, dark, rng, W) {
  const N = 22, prof = [];
  for (let i = 0; i <= N; i++) {   // a smooth roll over: flat, then curving down, steeper and steeper
    const t = i / N, z = -6.6 * Math.sin(t * Math.PI / 2) ** 0.8, y = 0.25 - 175 * t ** 2.3;
    const c = ['#eef8f4', '#dcefea', '#bfe2dc', '#96cbc4', '#6aa7a6', '#467f86', '#2e5e68', '#1e4450', '#14303a', '#0d2028', '#09141a', VOID][Math.min(11, Math.floor(t * 12))];
    prof.push([z, y, c]);
  }
  for (let i = 0; i < N; i++) {
    const [z0, y0, c0] = prof[i], [z1, y1] = prof[i + 1], b = y1 > -12 ? near : dark;
    b.quad([-W, y0, z0], [W, y0, z0], [W, y1, z1], [-W, y1, z1], c0, TILE.white);
    b.quad([W, y0, z0], [-W, y0, z0], [-W, y1, z1], [W, y1, z1], c0, TILE.white);
  }
  const face = (y) => { let i = 0; while (i < N - 1 && prof[i + 1][1] > y) i++; const [z0, y0] = prof[i], [z1, y1] = prof[i + 1]; return z0 + (z1 - z0) * ((y - y0) / (y1 - y0 || 1)); };
  for (let x = -W; x < W; x += 2.6 + rng() * 3.2) {   // thin threads of white water riding down the face
    const top = -0.5 - rng() * 3, l = 6 + rng() * 26, y = top - l;
    near.box(x, y, face(top - l / 2) - 0.12, 0.12 + rng() * 0.12, l, 0.06, rng() < 0.5 ? '#f4fbf8' : '#cfe8e2', TILE.white);
  }
  for (let x = -W + 6; x < W; x += 5 + rng() * 7) {   // a fine haze of spray, darker as it goes down
    const y = -16 - rng() * 70, k = Math.min(2, Math.floor((-y - 16) / 26));
    dark.box(x + (rng() - 0.5) * 4, y, face(y) - 1.5 - rng() * 2.5, 0.18, 3 + rng() * 5, 0.1, ['#9fb8b6', '#4a6266', '#1e2a2e'][k], TILE.white);
  }
  // the dark: a curved wall round the whole void side, its top just under the horizon, so it has no ends to see from anywhere
  // along the lip (the camera's far plane is pushed out while the Edge runs: systems/edge.js); a floor under it
  const RV = 2400, SEG = 40;
  for (let i = 0; i < SEG; i++) {
    const a0 = Math.PI + (i / SEG) * Math.PI, a1 = Math.PI + ((i + 1) / SEG) * Math.PI;
    const p0 = [Math.cos(a0) * RV, Math.sin(a0) * RV], p1 = [Math.cos(a1) * RV, Math.sin(a1) * RV];
    dark.quad([p0[0], -400, p0[1]], [p1[0], -400, p1[1]], [p1[0], -10, p1[1]], [p0[0], -10, p0[1]], VOID, TILE.void);
    dark.quad([p1[0], -400, p1[1]], [p0[0], -400, p0[1]], [p0[0], -10, p0[1]], [p1[0], -10, p1[1]], VOID, TILE.void);
    dark.tri([0, -400, 0], [p0[0], -400, p0[1]], [p1[0], -400, p1[1]], VOID, TILE.void);
  }
  dark.quad([-W, -400, 0], [W, -400, 0], [W, -175, -6.6], [-W, -175, -6.6], VOID, TILE.void);   // under the falls
}

/** each thing goes black from the bottom up: below y0 it is the dark itself, above y1 its own colour (built units) */
const VOID_RGB = [0x07 / 255, 0x05 / 255, 0x0c / 255];
function sinkFade(geo, y0, y1) {
  const P = geo.attributes.position;
  for (const name of ['color', 'colorB']) {
    const C = geo.attributes[name]; if (!C) continue;
    for (let i = 0; i < P.count; i++) {
      const t = Math.min(1, Math.max(0, (P.getY(i) - y0) / (y1 - y0))), k = t * t * (3 - 2 * t);
      C.setXYZ(i, VOID_RGB[0] + (C.getX(i) - VOID_RGB[0]) * k, VOID_RGB[1] + (C.getY(i) - VOID_RGB[1]) * k, VOID_RGB[2] + (C.getZ(i) - VOID_RGB[2]) * k);
    }
    C.needsUpdate = true;
  }
  return geo;
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
    b.pop(); y += h; w *= 0.9;
  };
  for (let i = 0; i < 13; i++) storey(base, i);
  spire.cyl(Math.sin(lean) * y * 0.4, y, 0, 3, 0.1, 30, 4, STONE[0], TILE.stone);
  storey(more, 13);
  more.cyl(Math.sin(lean) * y * 0.4, y, 0, 3, 0.1, 30, 4, STONE[0], TILE.stone);
}
function pillar(b, i) {   // built at the size the first one has; the sequence scales each with its distance, so none gets smaller
  sinkTo(b, 0, 0, 7, 0, STONE[2]);
  b.cyl(0, 0, 0, 5, 4.4, 110, 6, STONE[(i + 2) % 4], TILE.stone);
  b.box(0, 110, 0, 14, 4, 14, STONE[3], TILE.stone);
}
function arch(b, i) {   // arches standing half sunk out of the void, in a line
  b.push(i * 28 - 42, -10, 90 - i * 60, 0.9);
  b.box(-16, -40, 0, 6, 120, 6, STONE[1], TILE.stone); b.box(16, -40, 0, 6, 120, 6, STONE[1], TILE.stone); b.box(0, 78, 0, 40, 8, 7, STONE[0], TILE.stone);
  b.pop();
}

/** build it at the lip's middle (x, z), turned so the void lies along ry (the group's rotation.y). W: the lip's half length.
 *  Returns { g, near, dark, things: { name: { mesh(es), at:[x,z] } } }; every far material starts invisible (opacity 0). */
export function buildEdgeWorld(scene, x, z, ry, W, k = [1, 1]) {
  // k: how far each way (left, right) the stretch runs against the full length: what stands out there is spaced to fit it
  const fit = (at) => [at[0] * (at[0] < 0 ? k[0] : k[1]), at[1]];
  const rng = mulberry32(4 * 97 + 5), g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const farMat = () => { const m = psxMaterial({ map: mats.props.map, vertexColors: true, fog: false, side: THREE.DoubleSide, key: 'Edge', transparent: true }); m.opacity = 0; return m; };
  const mesh = (b, mat, at, order = 2, kind = null) => {
    const geo = b.geometry(); if (kind) sinkFade(geo, SINK[kind][0], SINK[kind][1]);
    const m = new THREE.Mesh(geo, mat); if (at) { at = fit(at); m.position.set(at[0], kind ? LIFT[kind] * SIZE[kind] : 0, at[1]); }
    if (kind) { m.scale.setScalar(SIZE[kind]); m.userData.size = SIZE[kind]; }
    m.renderOrder = order; g.add(m); return m;
  };
  const nb = new Builder(), db = new Builder(); lip(nb, db, rng, W);
  const near = mesh(nb, mats.props, null, 1), dark = mesh(db, farMat(), null, 1);
  const things = {};
  { const b = new Builder(); hood(b); const m = mesh(b, farMat(), PLACES.hood, 2, 'hood'); m.rotation.y = 0.25; things.hood = { meshes: [m], at: fit(PLACES.hood) }; }
  { const b = new Builder(), a = new Builder(), c = new Builder(); head(b); eyes(a, -1); eyes(c, 1); const mat = farMat();
    const m = mesh(b, mat, PLACES.head, 2, 'head'), e1 = mesh(a, mat, PLACES.head, 2, 'head'), e2 = mesh(c, mat, PLACES.head, 2, 'head'); e2.visible = false;
    things.head = { meshes: [m, e1, e2], at: fit(PLACES.head), eyes: [e1, e2] }; }
  { const b = new Builder(), s = new Builder(), mo = new Builder(); tower(b, s, mo, rng); const mat = farMat();
    const m = mesh(b, mat, PLACES.tower, 2, 'tower'), sp = mesh(s, mat, PLACES.tower, 2, 'tower'), more = mesh(mo, mat, PLACES.tower, 2, 'tower'); more.visible = false;
    things.tower = { meshes: [m, sp, more], at: fit(PLACES.tower), spire: sp, more }; }
  { const mat = farMat(), ps = [];
    for (let i = 0; i <= PILLARS; i++) { const b = new Builder(); pillar(b, i); const m = mesh(b, mat, pillarAt(i), 2, 'pillars'); m.userData.at = fit(pillarAt(i)); ps.push(m); }
    ps[PILLARS].visible = false;
    things.pillars = { meshes: ps, at: fit(pillarAt(2)), more: ps[PILLARS] }; }
  { const mat = farMat(), b = new Builder(), l = new Builder(); for (let i = 0; i < 3; i++) arch(b, i); arch(l, 3);
    const m = mesh(b, mat, PLACES.arches, 2, 'arches'), last = mesh(l, mat, PLACES.arches, 2, 'arches'); things.arches = { meshes: [m, last], at: fit(PLACES.arches), last }; }
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
