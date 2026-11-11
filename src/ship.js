import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';
import { waveHeight } from './ocean.js';
import { hullWater, rideWaves } from './float.js';
import { clamp, lerp, smoothstep, angleDiff } from './util.js';
import { computeMods } from './upgrades.js';
import { HULLS, SAILS, FLAGS, byId, DEFAULT_CUSTOM } from './customize.js';

export const MAX_SPEED = 11;
const SECTIONS = [
  { z: 3.0, w: 0.95, deck: 1.0, keel: -0.05 },
  { z: 2.0, w: 1.25, deck: 0.95, keel: -0.3 },
  { z: 0.5, w: 1.4, deck: 0.85, keel: -0.45 },
  { z: -1.0, w: 1.3, deck: 0.85, keel: -0.45 },
  { z: -2.2, w: 0.95, deck: 1.0, keel: -0.3 },
  { z: -3.2, w: 0.45, deck: 1.35, keel: -0.05 },
  { z: -3.9, w: 0.05, deck: 1.75, keel: 0.25 },
];

const mulHex = (hex, k) => '#' + [1, 3, 5].map((i) => Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k)).toString(16).padStart(2, '0')).join('');
function buildHull(colors = {}) {
  const b = new Builder();
  b.doubleSided = true;
  const P = SECTIONS.map((s) => {
    const mid = (s.deck + s.keel) / 2;
    return {
      tr: [s.w, s.deck, s.z], tl: [-s.w, s.deck, s.z],
      mr: [s.w * 0.92, mid, s.z], ml: [-s.w * 0.92, mid, s.z],
      br: [s.w * 0.35, s.keel, s.z], bl: [-s.w * 0.35, s.keel, s.z],
      ir: [s.w * 0.86, s.deck, s.z], il: [-s.w * 0.86, s.deck, s.z],
      fr: [s.w * 0.84, s.deck - 0.38, s.z], fl: [-s.w * 0.84, s.deck - 0.38, s.z],
    };
  });
  const upper = colors.upper || '#c4733a', lower = colors.lower || '#8a5028', deckC = '#ffffff';
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], c = P[i + 1];
    b.quad(a.tr, a.mr, c.mr, c.tr, upper, TILE.planks);
    b.quad(a.mr, a.br, c.br, c.mr, lower, TILE.planks);
    b.quad(a.tl, c.tl, c.ml, a.ml, upper, TILE.planks);
    b.quad(a.ml, c.ml, c.bl, a.bl, lower, TILE.planks);
    b.quad(a.bl, c.bl, c.br, a.br, lower, TILE.planks);
    // rim, inner wall, deck
    b.quad(a.tr, c.tr, c.ir, a.ir, colors.upper ? mulHex(upper, 0.6) : '#7a4222', TILE.planks);
    b.quad(a.tl, a.il, c.il, c.tl, colors.upper ? mulHex(upper, 0.6) : '#7a4222', TILE.planks);
    b.quad(a.ir, c.ir, c.fr, a.fr, colors.upper ? mulHex(upper, 0.78) : '#8a5a30', TILE.planks);
    b.quad(a.il, a.fl, c.fl, c.il, colors.upper ? mulHex(upper, 0.78) : '#8a5a30', TILE.planks);
    b.quad(a.fl, a.fr, c.fr, c.fl, deckC, TILE.planks);
  }
  const s = SECTIONS[0], p0 = P[0];
  b.quad(p0.tl, p0.tr, p0.mr, p0.ml, upper, TILE.planks); // transom
  b.quad(p0.ml, p0.mr, p0.br, p0.bl, lower, TILE.planks);
  // stern cabin
  b.box(0, 0.5, 1.9, 1.7, 1.25, 1.7, '#ffffff', TILE.wall, TILE.planks, '#7a4222');
  b.box(0, 1.75, 1.9, 2.0, 0.16, 2.0, '#6b3a1e', TILE.planks);
  // lanterns
  b.box(0.0, 1.9, 2.9, 0.18, 0.7, 0.18, '#6b4a2e', TILE.bark);
  b.box(0.0, 2.55, 2.9, 0.4, 0.4, 0.4, '#ffffff', TILE.glow);
  b.box(0.0, 1.55, -3.2, 0.4, 0.4, 0.4, '#ffffff', TILE.glow);
  // mast, crow's nest, bowsprit, barrels
  b.cyl(0, 0.5, -0.3, 0.16, 0.1, 6.9, 5, '#ffffff', TILE.bark, false);
  b.cyl(0, 5.5, -0.3, 0.6, 0.5, 0.35, 6, '#ffffff', TILE.planks);
  b.push(0, 1.4, -3.6, 0, 1, 1, 1, 0.28);
  b.box(0, 0, -1.2, 0.15, 0.15, 2.6, '#ffffff', TILE.bark);
  b.pop();
  b.cyl(-0.7, 0.55, 0.4, 0.34, 0.34, 0.7, 6, '#ffffff', TILE.planks);
  b.cyl(0.65, 0.55, 0.9, 0.34, 0.34, 0.7, 6, '#ffffff', TILE.planks);
  b.box(0.55, 0.55, -1.8, 0.8, 0.7, 0.8, '#ffffff', TILE.planks);
  // worn details: cannons, anchor, rope coil, ratlines, patched planks
  for (const sd of [-1, 1]) {
    for (const cz of [-0.7, 0.5]) {
      b.push(sd * 1.2, 0.72, cz, 0, 1, 1, 1, 0, -sd * Math.PI / 2);
      b.cyl(0, -0.2, 0, 0.17, 0.12, 0.7, 5, '#2c2a30', TILE.stone, true);
      b.pop();
      b.cyl(sd * 0.9, 0.5, cz, 0.2, 0.2, 0.2, 5, '#4a3020', TILE.planks);
    }
    b.box(sd * 1.12, 0.55, -2.0, 0.08, 0.5, 0.5, '#5a3a22', TILE.planks);       // patch
    b.blob(sd * 0.78, -0.3, 0.3, 0.12, 0.08, 0.2, '#b8c0a8', TILE.stone, 0.4, sd + 2); // barnacles
    b.blob(sd * 0.7, -0.35, -1.3, 0.14, 0.08, 0.16, '#a0b098', TILE.stone, 0.4, sd + 4);
    for (const ry of [1.4, 2.3, 3.2]) { // ratlines up to the mast
      const k = (ry - 1.0) / 4.2;
      b.quad([sd * (1.0 - k * 0.85), ry, -0.35], [sd * (1.0 - k * 0.85), ry + 0.06, -0.35], [sd * (1.0 - (k + 0.28) * 0.85), ry + 0.9, -0.35], [sd * (1.0 - (k + 0.28) * 0.85), ry + 0.84, -0.35], '#c8b078', TILE.rope);
    }
    b.quad([sd * 1.0, 0.95, -0.3], [sd * 1.0, 0.95, -0.4], [sd * 0.14, 5.5, -0.4], [sd * 0.14, 5.5, -0.3], '#a89060', TILE.rope);
  }
  b.cyl(0.35, 0.8, -2.7, 0.4, 0.36, 0.14, 7, '#b8955a', TILE.rope, true);
  b.cyl(0.35, 0.94, -2.7, 0.3, 0.26, 0.14, 7, '#a88548', TILE.rope, true);
  b.push(-0.95, 1.1, -2.6, 0.4);                                              // anchor
  b.box(0, 0, 0, 0.1, 0.8, 0.1, '#2c2a30', TILE.stone);
  b.box(0, 0.7, 0, 0.5, 0.08, 0.08, '#2c2a30', TILE.stone);
  b.box(0, 0, 0, 0.5, 0.08, 0.08, '#2c2a30', TILE.stone);
  b.pop();
  return b;
}

function buildMainsail() {
  const b = new Builder();
  b.doubleSided = true;
  b.ambient = 0.8;
  const GU = 4, GV = 5;
  const pt = (u, v) => {
    const len = lerp(3.5, 1.5, v);
    return [0.75 * Math.sin(Math.PI * u) * Math.sin(Math.PI * (0.12 + 0.76 * v)), 0.2 + v * 5.0, 0.12 + u * len];
  };
  for (let i = 0; i < GU; i++) for (let j = 0; j < GV; j++) {
    const a = pt(i / GU, j / GV), bb = pt((i + 1) / GU, j / GV), c = pt((i + 1) / GU, (j + 1) / GV), d = pt(i / GU, (j + 1) / GV);
    b.quad(a, bb, c, d, '#fff4d8', TILE.sail);
  }
  b.box(0, 0.05, 1.85, 0.13, 0.13, 3.7, '#ffffff', TILE.bark);
  return b;
}

// ---- upgrade looks: what the sails and hull show at each shipwright level (0..3)
const sailPt = (u, v) => { const len = lerp(3.5, 1.5, v); return [0.75 * Math.sin(Math.PI * u) * Math.sin(Math.PI * (0.12 + 0.76 * v)), 0.2 + v * 5.0, 0.12 + u * len]; };
function sailStrip(b, v0, v1, col, tile, push = 0.03) {   // a band across the mainsail following its belly, both faces
  for (let i = 0; i < 6; i++) for (const sd of [1, -1]) {
    const q = (u, v) => { const p = sailPt(u, v); return [p[0] + sd * push, p[1], p[2]]; };
    b.quad(q(i / 6, v0), q((i + 1) / 6, v0), q((i + 1) / 6, v1), q(i / 6, v1), col, tile);
  }
}
function sailPatch(b, u, v, du, dv, col) {
  for (const sd of [1, -1]) { const q = (a, c) => { const p = sailPt(a, c); return [p[0] + sd * 0.035, p[1], p[2]]; }; b.quad(q(u, v), q(u + du, v), q(u + du, v + dv), q(u, v + dv), col, TILE.sail); }
}
// torn sails (a gale with too much canvas out): holes you can see through, long rips, a corner gone (main.js sailTick)
function buildTorn() {
  const b = new Builder(); b.doubleSided = true; b.ambient = 0.8;
  const hole = '#1a120c', rip = '#3a2818';
  sailPatch(b, 0.14, 0.34, 0.17, 0.12, hole); sailPatch(b, 0.58, 0.6, 0.13, 0.15, hole); sailPatch(b, 0.42, 0.16, 0.11, 0.08, hole);
  sailPatch(b, 0.7, 0.3, 0.1, 0.07, hole); sailPatch(b, 0.28, 0.78, 0.09, 0.07, hole);
  for (const [u, v, du] of [[0.3, 0.46, 0.34], [0.12, 0.66, 0.26], [0.5, 0.86, 0.22], [0.6, 0.12, 0.3]]) sailPatch(b, u, v, du, 0.014, rip);   // long rips
  sailPatch(b, 0.86, 0.0, 0.14, 0.12, hole);   // the clew torn away
  return b.geometry();
}
function buildRag() {   // a loose strip of canvas that flaps in the wind
  const b = new Builder(); b.doubleSided = true; b.ambient = 0.8;
  b.quad([0, 0, 0], [0, 0, 0.32], [0, -1.1, 0.22], [0, -1.2, 0.05], '#e8dcc0', TILE.sail);
  return b.geometry();
}
function buildSailLook(level) {
  const b = new Builder(); b.doubleSided = true; b.ambient = 0.8;
  if (level === 0) {                                     // stock: mended, stained, a patch or three
    sailPatch(b, 0.18, 0.22, 0.22, 0.13, '#9a8458'); sailPatch(b, 0.55, 0.52, 0.18, 0.11, '#a8946a'); sailPatch(b, 0.3, 0.72, 0.16, 0.09, '#8a7650');
  }
  if (level >= 2) for (const v of [0.24, 0.48, 0.72]) sailStrip(b, v, v + 0.025, level >= 3 ? '#c9a85c' : '#a89060', TILE.rope);   // stitched seams
  if (level >= 3) { sailStrip(b, 0.0, 0.03, '#c9a85c', TILE.rope); sailStrip(b, 0.97, 1.0, '#c9a85c', TILE.rope); }                // bound edges
  return b.geometry();
}
function buildTopsail() {                                // storm silk: a flying jib from the masthead out to the bowsprit tip
  const b = new Builder(); b.doubleSided = true; b.ambient = 0.85;
  const tip = [0, 6.9, -0.35], tack = [0, 2.05, -4.55], clew = [0, 2.0, -3.55], mid = [0.35, 4.1, -2.9];
  b.tri(tip, tack, mid, '#fff8e4', TILE.sail, [[0.5, 1], [0, 0], [0.5, 0.5]]);
  b.tri(tack, clew, mid, '#fff8e4', TILE.sail, [[0, 0], [1, 0], [0.5, 0.5]]);
  b.tri(clew, tip, mid, '#fff8e4', TILE.sail, [[1, 0], [0.5, 1], [0.5, 0.5]]);
  return b.geometry();
}
function buildHullLook(level) {
  const b = new Builder();
  const W = (z) => { for (let i = 0; i < SECTIONS.length - 1; i++) { const a = SECTIONS[i], c = SECTIONS[i + 1]; if (z <= a.z && z >= c.z) { const t = (a.z - z) / (a.z - c.z); return { w: lerp(a.w, c.w, t), deck: lerp(a.deck, c.deck, t), keel: lerp(a.keel, c.keel, t) }; } } return SECTIONS[2]; };
  if (level >= 1) for (let z = 2.6; z > -3.0; z -= 0.4) { const s = W(z); for (const sd of [1, -1]) b.box(sd * (s.w + 0.02), s.deck - 0.18, z - 0.2, 0.1, 0.14, 0.42, level >= 3 ? '#3a2416' : '#5a3418', TILE.planks); }   // oak rubbing strake
  if (level >= 2) for (const z of [1.6, 0.2, -1.4]) { const s = W(z); for (const sd of [1, -1]) b.box(sd * (s.w * 0.95 + 0.05), (s.deck + s.keel) / 2 + 0.05, z, 0.1, s.deck - s.keel, 0.24, '#6a6a74', TILE.stone); }   // iron bands
  if (level >= 3) { b.box(0, 1.3, -3.55, 0.36, 0.5, 0.36, '#5a5a62', TILE.stone); for (const sd of [1, -1]) b.box(sd * 0.55, 0.85, -2.9, 0.08, 0.55, 0.5, '#4a4a52', TILE.stone); }   // iron bow cap and cheek plates
  return b.geometry();
}

function buildJib() {
  const b = new Builder();
  b.doubleSided = true;
  b.ambient = 0.8;
  const tip = [0, 6.2, -0.35], tack = [0, 1.9, -3.5], clew = [0, 1.9, -0.7], mid = [0.5, 3.4, -1.5];
  b.tri(tip, tack, mid, '#fff0cc', TILE.sail, [[0.5, 1], [0, 0], [0.5, 0.5]]);
  b.tri(tack, clew, mid, '#fff0cc', TILE.sail, [[0, 0], [1, 0], [0.5, 0.5]]);
  b.tri(clew, tip, mid, '#fff0cc', TILE.sail, [[1, 0], [0.5, 1], [0.5, 0.5]]);
  return b;
}

const meshOf = (b, mat) => new THREE.Mesh(b.geometry(), mat);

// geometry is built once and shared with NPC ships
function buildMast() {
  const b = new Builder(); b.doubleSided = true;
  b.cyl(0, 0.5, 0, 0.16, 0.1, 6.4, 5, '#ffffff', TILE.bark, false);
  b.cyl(0, 5.2, 0, 0.55, 0.45, 0.32, 6, '#ffffff', TILE.planks);
  return b;
}
function buildCastle() { // stern castle for galleons
  const b = new Builder(); b.doubleSided = true;
  b.box(0, 0.9, 2.4, 2.3, 1.4, 1.9, '#ffffff', TILE.wall, TILE.planks, '#7a4222');
  b.box(0, 2.3, 2.5, 2.5, 0.2, 2.1, '#6b3a1e', TILE.planks);
  b.box(0, 0.9, -3.0, 1.6, 0.9, 1.4, '#ffffff', TILE.planks, TILE.planks, '#7a4222');
  return b;
}
function buildCanoe() { // narrow dugout with an outrigger and a tiny mast
  const b = new Builder(); b.doubleSided = true;
  b.push(0, 0.2, 0, 0, 1, 1, 1, Math.PI / 2);
  b.cyl(0, -2.0, 0, 0.1, 0.38, 4.0, 5, '#c28a52', TILE.planks, true);
  b.pop();
  b.tri([0, 0.6, -2], [0.3, 0.4, -1.4], [-0.3, 0.4, -1.4], '#a06a3a', TILE.planks);
  b.push(1.5, 0.35, 0, 0, 1, 1, 1, Math.PI / 2);
  b.cyl(0, -1.4, 0, 0.1, 0.16, 2.8, 5, '#e8d8b0', TILE.planks, true);
  b.pop();
  b.box(0.75, 0.55, -0.7, 1.5, 0.08, 0.1, '#6b4a2e', TILE.bark);
  b.box(0.75, 0.55, 0.7, 1.5, 0.08, 0.1, '#6b4a2e', TILE.bark);
  b.cyl(0, 0.3, -0.2, 0.08, 0.06, 3.0, 5, '#ffffff', TILE.bark, false);
  return b;
}
const HULL_CACHE = {};
export function hullGeo(id) {
  if (id === 'oak') return shipGeos().hull;
  if (!HULL_CACHE[id]) { const h = byId(HULLS, id); HULL_CACHE[id] = buildHull({ upper: h.upper, lower: h.lower }).geometry(); }
  return HULL_CACHE[id];
}

/** the cloth of the pennant, in a few shapes (the pole is separate) */
function flagShape(b, shape) {
  const uv = [[0, 1], [0, 0], [1, 0.5]], T = TILE.flag;
  if (shape === 'swallow') { b.tri([0, 0.4, 0], [0, -0.1, 0], [0, 0.15, 1.2], '#ffffff', T, uv); b.tri([0, 0.4, 0], [0, 0.15, 1.2], [0, 0.4, 1.8], '#ffffff', T, uv); b.tri([0, -0.1, 0], [0, -0.1, 1.8], [0, 0.15, 1.2], '#ffffff', T, uv); }
  else if (shape === 'banner') b.quad([0, 0.45, 0], [0, -0.15, 0], [0, -0.15, 1.3], [0, 0.45, 1.3], '#ffffff', T);
  else if (shape === 'streamer') b.tri([0, 0.22, 0], [0, 0, 0], [0, 0.11, 3.2], '#ffffff', T, uv);
  else b.tri([0, 0.35, 0], [0, -0.05, 0], [0, 0.15, 1.7], '#ffffff', T, uv);
}
function flagGeo(shape) { const b = new Builder(); b.doubleSided = true; b.box(0, -0.1, 0, 0.08, 0.5, 0.08, '#ffffff', TILE.bark); flagShape(b, shape); return b.geometry(); }
// small figureheads, built on demand
function buildFigure(id) {
  if (id === 'none') return null;
  const b = new Builder(); b.doubleSided = true;
  if (id === 'parrot') {
    b.blob(0, 0.1, 0.1, 0.34, 0.5, 0.34, '#e03a30', TILE.white, 0.1, 1);
    b.blob(0, 0.65, -0.1, 0.22, 0.22, 0.22, '#e8a020', TILE.white, 0.1, 2);
    b.tri([0, 0.65, -0.3], [0.07, 0.6, -0.08], [-0.07, 0.6, -0.08], '#ffd23a');
    b.tri([0.3, 0.2, 0.1], [0.75, 0.05, 0.4], [0.3, -0.15, 0.2], '#3c78c8'); b.tri([-0.3, 0.2, 0.1], [-0.75, 0.05, 0.4], [-0.3, -0.15, 0.2], '#3c78c8');
  } else if (id === 'mermaid') {
    b.blob(0, -0.1, 0.1, 0.22, 0.22, 0.75, '#3fa89a', TILE.white, 0.1, 3);
    b.cyl(0, 0.0, -0.45, 0.2, 0.15, 0.6, 6, '#e8b88a', TILE.white);
    b.blob(0, 0.78, -0.45, 0.18, 0.2, 0.18, '#e8b88a', TILE.white, 0.05, 4);
    b.blob(0, 0.78, -0.25, 0.3, 0.32, 0.22, '#e8a020', TILE.white, 0.1, 5);
    b.tri([0, -0.1, 0.8], [0.45, 0.15, 1.2], [0.05, 0.0, 0.95], '#3fa89a'); b.tri([0, -0.1, 0.8], [-0.45, 0.15, 1.2], [-0.05, 0.0, 0.95], '#3fa89a');
  } else if (id === 'dolphin') {
    b.push(0, 0.2, 0, 0, 1, 1, 1, Math.PI / 2 - 0.5);
    b.cyl(0, -0.8, 0, 0.08, 0.28, 1.7, 5, '#7f9db6', TILE.white, true);
    b.cyl(0, 0.9, 0, 0.2, 0.06, 0.6, 5, '#9fb8cc', TILE.white, true);
    b.pop();
    b.tri([0, 0.4, 0.2], [0, 0.4, 0.55], [0, 0.85, 0.5], '#5f7d96');
  } else if (id === 'lion') {
    for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28; b.blob(Math.cos(a) * 0.4, 0.4 + Math.sin(a) * 0.4, 0.05, 0.22, 0.22, 0.2, '#b8741c', TILE.white, 0.15, i); }
    b.blob(0, 0.4, -0.2, 0.36, 0.36, 0.3, '#e0aa3a', TILE.white, 0.08, 9);
    b.blob(0, 0.28, -0.5, 0.14, 0.1, 0.14, '#6b3a1e', TILE.white, 0.05, 10);
  } else if (id === 'skull') {
    b.blob(0, 0.4, -0.2, 0.38, 0.4, 0.38, '#ffffff', TILE.bone, 0.06, 11);
    b.box(-0.14, 0.42, -0.5, 0.14, 0.16, 0.08, '#1a1420', TILE.white); b.box(0.14, 0.42, -0.5, 0.14, 0.16, 0.08, '#1a1420', TILE.white);
    b.blob(0, 0.02, -0.3, 0.26, 0.15, 0.22, '#ffffff', TILE.bone, 0.06, 12);
  }
  return b.geometry();
}

let GEOS = null;
export function shipGeos() {
  return GEOS || (GEOS = { hull: buildHull().geometry(), sail: buildMainsail().geometry(), jib: buildJib().geometry(), mast: buildMast().geometry(), castle: buildCastle().geometry(), canoe: buildCanoe().geometry() });
}

export class Ship {
  constructor(scene) {
    this.root = new THREE.Group();
    this.root.rotation.order = 'YXZ';
    scene.add(this.root);
    this.hullMesh = new THREE.Mesh(shipGeos().hull, mats.props);
    this.hullLook = new THREE.Mesh(new THREE.BufferGeometry(), mats.props); this.hullMesh.add(this.hullLook);
    this.root.add(this.hullMesh);
    this.figureGroup = new THREE.Group(); this.figureGroup.position.set(0, 1.7, -3.9); this.figureGroup.scale.setScalar(1.05); this.root.add(this.figureGroup);
    this.custom = { ...DEFAULT_CUSTOM };

    this.sailPivot = new THREE.Group();
    this.sailPivot.position.set(0, 1.0, -0.3);
    this.sail = new THREE.Mesh(shipGeos().sail, mats.sail);
    this.sailLook = new THREE.Mesh(new THREE.BufferGeometry(), mats.sail); this.sail.add(this.sailLook);
    this.tornLook = new THREE.Mesh(buildTorn(), mats.sail); this.tornLook.visible = false; this.sail.add(this.tornLook);
    this.rags = [[0.35, 0.2], [0.62, 0.5], [0.2, 0.62]].map(([u, v]) => { const m = new THREE.Mesh(buildRag(), mats.sail); m.position.set(...sailPt(u, v)); m.visible = false; this.sail.add(m); return m; });
    this.torn = false;
    this.topsail = new THREE.Mesh(buildTopsail(), mats.sail); this.topsail.visible = false;
    this.sailPivot.add(this.sail);
    this.root.add(this.sailPivot);

    this.jib = new THREE.Mesh(shipGeos().jib, mats.sail);
    this.root.add(this.jib);
    this.root.add(this.topsail);
    // rigging: a forestay to the bowsprit tip, backstays to the stern, shrouds to the rails (thin dark lines, like everything else)
    { const top = [0, 7.2, -0.3], mid = [0, 5.4, -0.3], R = [];
      const add = (a, b) => R.push(...a, ...b);
      add(top, [0, 2.0, -4.5]); add(top, [0.95, 1.3, 2.7]); add(top, [-0.95, 1.3, 2.7]);
      for (const sd of [-1, 1]) { add(mid, [sd * 1.22, 1.0, -0.75]); add(mid, [sd * 1.22, 1.0, 0.25]); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(R, 3));
      this.rigging = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x2a1c14 }));
      this.root.add(this.rigging); }

    // pennant (bright: red, dark: black skull)
    this.flag = new THREE.Group();
    this.flag.position.set(0, 7.35, -0.3);
    const fb = new Builder(); fb.doubleSided = true;
    fb.box(0, -0.1, 0, 0.08, 0.5, 0.08, '#ffffff', TILE.bark);
    flagShape(fb, 'pennant');
    const db = new Builder(); db.doubleSided = true;
    db.box(0, -0.1, 0, 0.08, 0.5, 0.08, '#ffffff', TILE.bark);
    db.quad([0, 0.55, 0], [0, -0.2, 0], [0, -0.2, 1.4], [0, 0.55, 1.4], '#ffffff', TILE.skull);
    this.flagBright = meshOf(fb, mats.flagP);
    this.flagDark = meshOf(db, mats.props);
    this.flagDark.visible = false;
    this.flag.add(this.flagBright, this.flagDark);
    this.root.add(this.flag);

    // oars: two a side, stowed along the rail until rowing (G). Chunky, no thin lines.
    this.oarArms = [];
    const ob = new Builder();
    ob.box(0, 0, 1.6, 0.18, 0.18, 3.2, '#ffffff', TILE.bark);    // loom, pivot at the rail
    ob.box(0, 0, 3.35, 0.1, 0.42, 0.7, '#ffffff', TILE.planks);   // blade
    const og = ob.geometry();
    for (const side of [-1, 1]) for (const z of [-0.7, 1.1]) {
      const arm = new THREE.Group(); arm.position.set(side * 1.15, 1.25, z);
      const m = new THREE.Mesh(og, mats.props); arm.add(m); arm.visible = false;
      arm.userData = { side, ph: z * 0.25 };
      this.root.add(arm); this.oarArms.push(arm);
    }
    this.rowing = false; this.oarOut = 0; this.stroke = 0;

    // wake puffs
    this.puffGeo = new THREE.CircleGeometry(1, 6).rotateX(-Math.PI / 2);
    this.puffGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(7 * 4).fill(1), 4));
    this.puffs = [];
    for (let i = 0; i < 30; i++) {
      const m = new THREE.Mesh(this.puffGeo, mats.wake);
      m.visible = false; m.renderOrder = 2;
      scene.add(m);
      this.puffs.push({ m, life: 0, max: 1, size: 1 });
    }
    this.puffTimer = 0;

    // lantern glow on the water (visible at night)
    const pos = [], col = [], segs = 20, rings = 4;
    const v = (i, r) => { const a = (i / segs) * Math.PI * 2; return [Math.cos(a) * r / rings, 0, Math.sin(a) * r / rings, 1, 1, 1, Math.pow(1 - r / rings, 1.5)]; };
    const pv = (q) => { pos.push(q[0], q[1], q[2]); col.push(q[3], q[4], q[5], q[6]); };
    for (let r = 0; r < rings; r++) for (let i = 0; i < segs; i++) {
      const a = v(i, r), b = v(i + 1, r), c = v(i + 1, r + 1), d = v(i, r + 1);
      pv(a); pv(c); pv(b); pv(a); pv(d); pv(c);
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    this.glow = new THREE.Mesh(gg, mats.glow);
    this.glow.renderOrder = 3;
    this.glow.frustumCulled = false;
    scene.add(this.glow);
    this.mods = computeMods({});
    this.buff = 1;      // temporary speed bonus (bought supplies)

    this.pos = new THREE.Vector3();
    this.heading = 0;
    this.speed = 0;
    this.trim = 0.75;
    this.rudder = 0;
    this.eff = 1;
    this.rel = 0;
  }

  /** show the shipwright upgrades on the ship itself: lv = state.upgrades */
  setUpgradeLook(lv = {}) {
    const sl = lv.sails || 0, hl = lv.hull || 0;
    if (this.lookKey === `${sl}/${hl}`) return; this.lookKey = `${sl}/${hl}`;
    this.sailLook.geometry.dispose(); this.sailLook.geometry = buildSailLook(sl);
    this.hullLook.geometry.dispose(); this.hullLook.geometry = buildHullLook(hl);
    this.topsail.visible = sl >= 3;
  }

  /** the mainsail is torn (holes, rips, flapping rags) and the ship sails at two thirds speed until it is patched */
  setTorn(on) { this.torn = !!on; this.tornLook.visible = this.torn; for (const m of this.rags) m.visible = this.torn; }

  setCustom(c) {
    this.custom = { ...DEFAULT_CUSTOM, ...c };
    this.hullMesh.geometry = hullGeo(this.custom.hull);
    const sl = byId(SAILS, this.custom.sail);
    mats.sail.color.setRGB(...sl.tint);
    mats.flagP.color.set(byId(FLAGS, this.custom.flag).color);
    if (this.flagShapeNow !== this.custom.flagshape) { this.flagShapeNow = this.custom.flagshape; this.flagBright.geometry = flagGeo(this.custom.flagshape); }
    for (const ch of [...this.figureGroup.children]) { this.figureGroup.remove(ch); ch.geometry.dispose(); }
    const g = buildFigure(this.custom.figure);
    if (g) this.figureGroup.add(new THREE.Mesh(g, mats.props));
  }

  update(dt, input, wind, t) {
    if (this._px !== undefined && Math.hypot(this.pos.x - this._px, this.pos.z - this._pz) > 20) this.vel = null;   // moved by the game (moor, respawn): no leftover momentum
    this.rudder += (input.steer - this.rudder) * Math.min(1, dt * 4);
    this.oarOut = clamp(this.oarOut + (this.rowing ? 1 : -1) * dt * 0.7, 0, 1);
    if (this.anchored) {
      // the anchor is down (going ashore, digging, a line in the water): the sail comes in and the hull stops within a couple of lengths
      this.trim = Math.max(0, this.trim - dt * 1.6); this.rowIn = 0;
      const k = Math.exp(-dt * 2.6); this.speed *= k; this.yaw = (this.yaw || 0) * k;
      if (this.vel) { this.vel.x *= k; this.vel.z *= k; }
      this.heading += (this.yaw || 0) * dt;
      this.pos.x += Math.sin(this.heading) * this.speed * dt; this.pos.z -= Math.cos(this.heading) * this.speed * dt;
      this._px = this.pos.x; this._pz = this.pos.z;
      return;
    }
    if (this.rowing || this.oarOut > 0) {
      // rowing: sail furled, W pulls forward, S backs water; slow but independent of the wind
      this.trim = Math.max(0, this.trim - dt * 0.8);
      this.rowIn = this.oarOut >= 1 && this.rowing ? input.sail : 0;
      this.eff = 1; this.rel = angleDiff(this.heading, wind.dir);
      const target = this.rowIn > 0 ? 2.6 * this.mods.speed * (this.rowBoost || 1) : this.rowIn < 0 ? -0.9 : 0;
      this.speed += (target - this.speed) * Math.min(1, (this.rowIn ? 0.45 : 0.25) * dt);
      if (this.rowIn) this.stroke += dt * 3.4 * Math.sign(this.rowIn);
      this.heading += this.rudder * this.mods.turn * 0.55 * dt;
      this.pos.x += Math.sin(this.heading) * this.speed * dt;
      this.pos.z -= Math.cos(this.heading) * this.speed * dt;
      return;
    }
    this.rowIn = 0;
    this.trim = clamp(this.trim + input.sail * 0.6 * (this.trimMul || 1) * dt, 0, 1);

    // wind
    const a = Math.abs(angleDiff(this.heading, wind.dir));
    // the slow wedge into the wind; early in the voyage it is narrower and less punishing (floorMin, wedge)
    this.eff = 1 - (1 - Math.max(this.mods.floor, this.floorMin || 0)) * smoothstep(this.wedge || 0.6 * Math.PI, this.wedgeEnd || 0.95 * Math.PI, a);   // close-hauled (45° off the wind) still sails well
    this.rel = angleDiff(this.heading, wind.dir);
    // the water pushes back: climbing a wave face costs speed, running down one gives a little (surfing)
    const slopeK = 1 - clamp((this.slope || 0) * 2.2, -0.18, 0.28);
    const target = MAX_SPEED * this.mods.speed * this.buff * (this.gust || 1) * (this.torn ? 0.66 : 1) * this.eff * this.trim * wind.strength * slopeK;   // gust: a caught cat's paw (seaplay.js)
    const rate = target > this.speed ? 0.5 : 0.7;
    this.speed += (target - this.speed) * Math.min(1, rate * dt);
    this.speed *= 1 - Math.abs(this.rudder) * clamp(this.speed / MAX_SPEED, 0, 1) * 0.22 * dt;   // a hard turn drags the hull

    // turning: a rudder only works with water flowing past it (almost nothing at a standstill), and the hull has weight,
    // so the swing builds up and dies away over about a second instead of snapping round
    const flow = clamp(this.speed / 5, 0, 1);
    const wantYaw = this.rudder * this.mods.turn * (0.08 + 0.62 * flow) * (1 - 0.25 * clamp((this.speed - 7) / 5, 0, 1));   // very fast: a little stiffer
    this.yaw = (this.yaw || 0) + (wantYaw - (this.yaw || 0)) * Math.min(1, dt * 2.2);
    this.heading += this.yaw * dt;
    // momentum: forward the hull carries on; sideways the keel bites hard, so a turn slides only briefly; the wind on the
    // sails pushes it a touch sideways (leeway)
    const v = this.vel || (this.vel = { x: 0, z: 0 });
    const fx = Math.sin(this.heading), fz = -Math.cos(this.heading);
    const fwd = v.x * fx + v.z * fz, side = v.x * -fz + v.z * fx;
    const fwd2 = fwd + (this.speed - fwd) * Math.min(1, dt * 2.2), side2 = side * Math.exp(-dt * 5.5);
    v.x = fx * fwd2 - fz * side2; v.z = fz * fwd2 + fx * side2;
    const lee = Math.sin(this.rel) * this.trim * wind.strength * 0.35, rx = Math.cos(this.heading), rz = Math.sin(this.heading);
    this.pos.x += (v.x - rx * lee) * dt;
    this.pos.z += (v.z - rz * lee) * dt;
    this._px = this.pos.x; this._pz = this.pos.z;
  }

  // call after collision resolution
  place(dt, t, wave, dark, night = 0) {
    const h = this.heading;
    const fx = Math.sin(h), fz = -Math.cos(h), rx = Math.cos(h), rz = Math.sin(h);
    const p = this.pos;
    // the water under the hull: mean height, slope along and across (see float.js); the hull floats on it with a stiff buoyant spring
    const w = hullWater(p.x, p.z, h, t, wave);
    const sp = clamp(this.speed / MAX_SPEED, 0, 1.3), dtc = Math.min(dt, 0.05);
    this.slope = w.along;   // + = the bow is uphill: the ship slows going up a face and speeds up going down it (ship.js speed)
    const acc = dtc > 0 ? (this.speed - (this.lastSpeed ?? this.speed)) / dtc : 0; this.lastSpeed = this.speed;
    this.accS = (this.accS || 0) + (acc - (this.accS || 0)) * Math.min(1, dtc * 4);
    // on top of the water's shape: the bow rides up with speed and nods when the ship speeds up or slows down; the wind in the sails
    // heels it over; a turn leans it out; at speed it sits a little lower (squat)
    const F = this.float || (this.float = {});
    rideWaves(F, w, dt, {
      lift: 0.52 - 0.1 * sp,   // rides higher on the water (was 0.12): the hull's lower planks stay clear of it
      pitch: 0.05 * sp + clamp(this.accS * 0.03, -0.06, 0.06),
      roll: -Math.sin(this.rel || 0) * 0.16 * (this.eff ?? 1) * this.trim - this.rudder * 0.18 * sp,
    });
    this.root.position.set(p.x, F.y, p.z);
    this.root.rotation.set(F.p, -h, F.r);
    // the bow slams into a trough at speed: spray thrown up at the bow
    this.slamT = Math.max(0, (this.slamT || 0) - dt);
    if (F.vp < -0.09 && sp > 0.35 && this.slamT <= 0) {
      this.slamT = 0.6;
      for (let n = 0; n < 3; n++) { const pf = this.puffs.find((q) => q.life <= 0); if (!pf) break; const sd = n - 1, bx = p.x + fx * 2.9 + rx * sd * 0.7, bz = p.z + fz * 2.9 + rz * sd * 0.7; pf.m.position.set(bx, waveHeight(bx, bz, t, wave) + 0.5, bz); pf.life = pf.max = 0.9; pf.size = 0.7 + Math.random() * 0.5 * sp; pf.m.visible = true; }
    }

    // sails follow the wind
    let sgn = this.rel >= 0 ? 1 : -1;
    let swing = lerp(1.4, 0.1, Math.abs(this.rel) / Math.PI) * sgn;
    if (this.wrongSails) { sgn = -sgn; swing = -swing + Math.sin(t * 0.6) * 0.9; } // full dread: the sails fight the wind
    this.sailPivot.rotation.y += (swing - this.sailPivot.rotation.y) * Math.min(1, dt * 2.5);
    const flat = 0.14 + 0.86 * this.trim;
    const k = this.mods.sailScale;
    this.sailPivot.scale.set(k, flat * k, k);
    // the sail's belly: full with the wind behind or across, fuller in a gust; pointed too close to the wind it goes slack and
    // flutters (luffs), the canvas shaking
    const luff = clamp((1 - (this.eff ?? 1)) * 1.5, 0, 1) * Math.min(1, this.trim * 3);
    const fill = (1 - 0.65 * luff) * (1 + 1.4 * ((this.gust || 1) - 1));
    this.sailBase = (this.sailBase ?? sgn) + (sgn * fill - (this.sailBase ?? sgn)) * Math.min(1, dt * 2.5);
    const flutter = luff * (Math.sin(t * 19) * 0.22 + Math.sin(t * 31 + 1.3) * 0.12);
    this.sail.scale.x = this.sailBase + flutter;
    this.luff = luff;
    this.jib.scale.x += (sgn * (1 - 0.6 * (this.luff || 0)) - this.jib.scale.x) * Math.min(1, dt * 2.5); this.jib.scale.x += (this.luff || 0) * Math.sin(t * 23) * 0.18;
    this.jib.scale.y = flat;
    this.topsail.scale.set(this.jib.scale.x, flat, 1);
    this.jib.position.y = (1 - flat) * 0;
    if (this.torn) this.rags.forEach((m, i) => { m.rotation.x = Math.sin(t * (11 + i * 3) + i * 2) * 0.5 * (0.3 + this.trim); m.rotation.z = Math.sin(t * 7 + i) * 0.25; });
    this.flag.rotation.y = Math.PI - this.rel + Math.sin(t * 9) * 0.18 + (this.wrongSails ? Math.PI : 0);
    this.flagBright.visible = !dark;
    this.flagDark.visible = dark;

    // oars: swing out from the rail, then stroke (blade dips, pulls back, lifts, swings forward)
    const o = this.oarOut, ease = o * o * (3 - 2 * o);
    for (const arm of this.oarArms) {
      arm.visible = o > 0.01;
      const sd = arm.userData.side, st = this.stroke + arm.userData.ph * 0;
      const sw = this.rowIn ? Math.sin(st) * 0.5 : 0, lift = this.rowIn ? Math.max(0, Math.cos(st)) * 0.24 : 0;
      arm.rotation.set(0, 0, 0);
      arm.rotation.order = 'YXZ';
      arm.rotation.y = sd * lerp(0, Math.PI / 2, ease) + sd * sw - (1 - ease) * 0;      // stowed pointing aft, out to the side
      arm.rotation.x = lerp(0, 0.62, ease) - lift;   // blades well down in the water for the pull (tip ~0.6 under the surface), lifted clear on the way back
    }

    // lantern glow
    const L = this.mods.lantern;
    this.glow.position.set(p.x, 0.8, p.z);
    const lk = (this.lampK || 1) * (this.lampBoost || 1);   // lamp strength setting (daynight.js LAMPS)
    night = Math.max(night, 0.7 * (this.stormLight || 0));   // in a storm the lantern is lit and shows like at night
    this.glow.scale.setScalar((5 + 3 * L + 4 * night) * (0.55 + 0.45 * lk));   // at night the lantern is the light you sail by: a wide warm pool on the water
    mats.glow.opacity = Math.min(0.95, (0.12 + 0.6 * night * (0.7 + 0.15 * L)) * (L === 0 ? 0.75 : 1) * (0.6 + 0.4 * lk)) * (this.lampOut ? 0.05 : 1);   // no oil: the lantern is out

    // wake
    this.puffTimer -= dt;
    if (this.puffTimer <= 0 && this.speed > 1.2) {
      this.puffTimer = 0.3;   // a few churned puffs; the V wake (wake.js) carries the rest
      const pf = this.puffs.find((q) => q.life <= 0);
      if (pf) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const bx = p.x - fx * 3.2 + rx * side * 0.9, bz = p.z - fz * 3.2 + rz * side * 0.9;
        pf.m.position.set(bx, waveHeight(bx, bz, t, wave) + 0.18, bz);
        pf.life = pf.max = 1.6; pf.size = 0.5 + Math.random() * 0.5;
        pf.m.visible = true;
      }
    }
    for (const q of this.puffs) {
      if (q.life <= 0) continue;
      q.life -= dt;
      const k = 1 - q.life / q.max;
      q.m.scale.setScalar(q.size * Math.sin(Math.min(1, k * 1.0) * Math.PI) * (1 + k));
      if (q.life <= 0) q.m.visible = false;
    }
  }
}
