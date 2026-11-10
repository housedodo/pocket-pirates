// Hand-made places: a few islands that are designed, not rolled. Each has its own outline, ground, props, a silhouette you can
// pick out from far off, and something to find when you stop there (main.js, `landmarkVisit`). Three of them sit behind
// something the ship has to be fitted for (an upgrade opens a place, not a percentage):
//   the Glass Lagoon behind a reef        -> Rudder 2 (a broad rudder threads the gaps)
//   the Ribs behind the breakers          -> Hull 2   (an iron-banded hull takes the pounding)
//   the Halved Isle inside a fog bank     -> Lantern 2 (a lens lantern cuts the fog)
// The world (world.js) asks this file for the height, colour and props of a landmark; everything else (charting, landfall,
// collisions) treats it as its base type.
import * as THREE from 'three';
import { TILE } from './textures.js';
import { smoothstep } from './util.js';
import { mats } from './psx.js';

export const LANDMARKS = [
  { lm: 'crag',    key: '3,1',   name: 'The Grey Tooth',   type: 'rocky',   x: 280,  z: 100,  r: 15, H: 15, sight: 'a bare grey rock' },
  { lm: 'bell',    key: '1,3',   name: 'The Drowned Bell', type: 'rocky',   x: 60,   z: 320,  r: 8,  H: 7,  sight: 'a leaning tower' },
  { lm: 'grove',   key: '-3,2',  name: 'Hollowgreen',      type: 'jungle',  x: -300, z: 180,  r: 17, H: 5.5, sight: 'a dark green wood' },
  { lm: 'keeper',  key: '4,-3',  name: "Wick's Rock",      type: 'rocky',   x: 430,  z: -320, r: 10, H: 3.5, sight: 'a lighthouse alone' },
  { lm: 'ribs',    key: '-5,1',  name: 'The Ribs',         type: 'sandbar', x: -560, z: 70,   r: 15, H: 0.9, sight: 'masts in the surf' },
  { lm: 'lagoon',  key: '5,3',   name: 'Glass Lagoon',     type: 'atoll',   x: 540,  z: 360,  r: 22, H: 1.1, sight: 'a reef ring' },
  { lm: 'broken', key: '-11,-2', name: 'The Halved Isle', type: 'rocky', x: -1231, z: -217, r: 26, H: 13, sight: 'a white fog bank' },
  { lm: 'customs', key: '1,-5', name: 'Customs Pier', type: 'sandbar', x: 155, z: -580, r: 12, H: 1.5, sight: 'a long grey pier' },
  { lm: 'teo', key: '4,1', name: "Teo's Sandbar", type: 'sandbar', x: 495, z: 70, r: 11, H: 1.0, sight: 'a thin line of firelight' },
  { lm: 'ilse', key: '8,2', name: "Ilse's Rock", type: 'rocky', x: 880, z: 190, r: 9, H: 4, sight: 'a second light across the water' },
  { lm: 'cup', key: '6,2', name: 'The Cup', type: 'sandbar', x: 611, z: 222, r: 9, H: 0.9, sight: 'a lone table on a beach' },
  { lm: 'hammock', key: '7,-2', name: 'The Hammock Isle', type: 'jungle', x: 808, z: -263, r: 16, H: 4, sight: 'hammocks between the palms' },
  { lm: 'namewall', key: '-2,8', name: 'The Name Wall', type: 'rocky', x: -233, z: 869, r: 14, H: 14, sight: 'a white cliff of tiny marks' },
  { lm: 'archive', key: '-1,-9', name: "The Governor's Fort", type: 'rocky', x: -139, z: -990, r: 16, H: 10, sight: 'a pale fort with one lit window' },
  { lm: 'press', key: '-9,2', name: 'The Oil Press', type: 'rocky', x: -1014, z: 272, r: 14, H: 6, sight: 'a fat chimney and a steady glow' },
  { lm: 'wreck', key: '2,10', name: "The Throwers' Wreck", type: 'sandbar', x: 200, z: 1133, r: 10, H: 0.5, sight: 'a broken hull and a mast with a rag' },
  { lm: 'ledger', key: '-12,-4', name: "The Keepers' Ledger", type: 'rocky', x: -1284, z: -417, r: 10, H: 4, sight: 'a lighthouse lit at noon' },
  { lm: 'tower', key: '-13,-7', name: 'The Dark Tower', type: 'rocky', x: -1377, z: -732, r: 8, H: 12, sight: 'a black tower' },
  { lm: 'street', key: '5,7', name: 'The Sunken Street', type: 'sandbar', x: 516, z: 737, r: 14, H: 0.4, sight: 'roof peaks', dread: 0.74 },
  { lm: 'table', key: '13,-18', name: 'The Table by the Water', type: 'sandbar', x: 1377, z: -1966, r: 12, H: 0.8, sight: 'a table at the water\'s edge', dread: 1 },
];
export const LM = Object.fromEntries(LANDMARKS.map((l) => [l.lm, l]));

/** what keeps the ship out, and which upgrade lets it in (main.js landmarkBarriers) */
export const BARRIERS = {
  lagoon: { R: 44, up: 'rudder', lv: 2, kind: 'reef', no: 'The reef is too tight to thread. A broader rudder could do it.', yes: 'The broad rudder threads the reef.' },
  ribs:   { R: 50, up: 'hull', lv: 2, kind: 'breakers', no: 'The breakers would smash the planks. An iron-banded hull could take them.', yes: 'The iron bands take the breakers.' },
  broken: { R: 110, up: 'lantern', lv: 2, kind: 'fog', no: 'The fog swallows everything. The ship wanders, and drifts back out the way it came. A lens lantern might cut it.', yes: 'The lens lantern cuts a road through the fog.' },
};

// the forced cells: the landmark itself, and open water in the eight cells round it so it stands alone on the horizon
export function forcedCells() {
  const out = {};
  for (const l of LANDMARKS) {
    const [cx, cz] = l.key.split(',').map(Number);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const k = `${cx + dx},${cz + dz}`; if (!(k in out)) out[k] = null; }
  }
  for (const l of LANDMARKS) out[l.key] = { type: l.type, x: l.x, z: l.z, r: l.r, lm: l.lm, dread: l.dread };
  return out;
}

/** fill in a landmark's descriptor (called by describeCell) */
export function shapeLandmark(d, lm) {
  const l = LM[lm];
  d.lm = lm; d.name = l.name; d.r = l.r; d.H = l.H; d.landmark = true;
  const L = { crag: [0.1, 0.06, 0.08], bell: [0.06, 0.05, 0.03], grove: [0.07, 0.05, 0.03], keeper: [0.08, 0.04, 0.05], ribs: [0.35, 0.08, 0.04], lagoon: [0.05, 0.04, 0.02], broken: [0.08, 0.06, 0.04] }[lm] || [0.07, 0.05, 0.03];
  d.lobes = [L[0], L[1], L[2], 0.4, 1.7, 2.9];
  if (lm === 'broken') { d.cutTh = 0.85; d.cutC = 0.04; }   // the missing half faces home (Tama), so the cliff is what you see first
}

/** the shore radius of a cut island: the half towards cutTh ends in a straight line */
export function cutShore(d, th, R) {
  if (d.cutTh === undefined) return R;
  const c = Math.cos(th - d.cutTh);
  return c > 0.02 ? Math.min(R, (d.cutC * d.r + 0.5) / c) : R;
}

/** height of a landmark at polar t (0 centre, 1 shore) and angle th, n = fbm noise 0..1; null = use the base type */
export function lmHeight(d, t, th, n) {
  const p = Math.max(0, 1 - t);
  switch (d.lm) {
    case 'crag': { const ridge = 1 - Math.abs(n * 2 - 1); return d.H * Math.pow(p, 0.75) * (0.45 + ridge * 0.9) * (t < 0.3 ? 1.1 : 1); }
    case 'bell': return t < 0.7 ? d.H * (0.9 + n * 0.2) : d.H * (1 - smoothstep(0.7, 1, t)) * (0.9 + n * 0.2);   // a stack: flat top, steep sides
    case 'grove': return d.H * Math.pow(p, 1.1) * (0.6 + n * 0.7);
    case 'keeper': return d.H * Math.pow(p, 0.9) * (0.7 + n * 0.5);
    case 'broken': {
      if (t >= 0.995) return -0.6;
      const k = smoothstep(-0.1, 0.3, Math.cos(th - d.cutTh));
      const soft = d.H * 0.55 * (1 - smoothstep(0.3, 1, t)) * (0.75 + n * 0.4);
      const cliff = d.H * (0.9 + n * 0.2) * (1 - 0.15 * t);
      return soft + (cliff - soft) * k;
    }
    default: return null;
  }
}

const CC = {};
const col = (h) => CC[h] || (CC[h] = new THREE.Color(h));
/** ground colour of a landmark face; null = use the base type */
export function lmColor(d, hc, slope, noise) {
  switch (d.lm) {
    case 'crag': return hc < 0.15 ? col('#4a4a4e') : slope > 0.35 || noise > 0.4 ? (noise > 0.6 ? col('#7a7a7e') : col('#6a6a70')) : col('#8a8884');   // bare basalt, nothing grows
    case 'bell': return hc < 0.15 ? col('#4a4a4e') : hc > d.H * 0.8 ? (noise > 0.55 ? col('#6e8a52') : col('#8a8678')) : col('#77746c');
    case 'grove': return hc < 0.12 ? col('#6e5a3a') : hc < 0.45 ? col('#8a7a4a') : noise > 0.6 ? col('#2f6a2c') : noise > 0.35 ? col('#3c7a32') : col('#285a28');
    case 'keeper': return hc < 0.15 ? col('#4a4a4e') : noise > 0.5 ? col('#8a8a86') : col('#9a8a70');
    case 'broken': {
      if (hc < 0.12) return col('#6a6258');
      if (hc < 0.5) return col('#cbb488');
      if (slope > 0.6) { const band = Math.floor(hc * 1.4) % 3; return col(['#9a6a48', '#b8a078', '#7a5a4a'][band]); }   // strata where the island was cut
      return noise > 0.55 ? col('#6a9a48') : noise > 0.3 ? col('#7aa858') : col('#a89a62');
    }
    default: return null;
  }
}

const GREENS = ['#2f6a2c', '#3c7a32', '#286028', '#4a8a3a', '#1f5a2a'];
/** props of a landmark. A = always, B = bright mood, D = dark mood (only used sparingly), h = world.js helpers */
/** the dark-mood ground colour of each hand-made place (docs/ART_SPEC.md 6): stone goes violet-grey, greens go yellow-grey, bone and bleach */
export const LM_DARK = { crag: '#5a5262', bell: '#4a4a52', grove: '#4a5a40', keeper: '#8a8478', ribs: '#d8d0c0', lagoon: '#a89aa8', broken: '#8a7e78', namewall: '#e4dcc4', archive: '#c8c2b4', tower: '#0e0c12' };
export function lmDecor(d, rng, A, B, D, extra, h) {
  const mk = () => new A.constructor(), st = (b, when, mat) => (extra.states = extra.states || []).push({ b, when, mat });   // state props (world.js Island)
  const at = (x, z) => h.terrainHeight(d, x, z);
  const P = (th, t) => { const R = h.shoreR(d, th) * t, x = Math.cos(th) * R, z = Math.sin(th) * R; return [x, at(x, z), z]; };
  switch (d.lm) {
    case 'crag': {   // basalt columns crowding up to a tooth, guano on the ledges, gannets, a cairn on top, an arch in the sea
      for (let i = 0; i < 46; i++) {
        const th = rng() * 6.28, t = Math.pow(rng(), 0.7) * 0.92, [x, y, z] = P(th, t), hh = (1 - t) * (6 + rng() * 9) + 1.5;
        const c = ['#5e5e64', '#6a6a70', '#55555c', '#74747a'][Math.floor(rng() * 4)];
        A.cyl(x, y - 1.2, z, 1.0 + rng() * 0.7, 0.9 + rng() * 0.5, hh + 1.2, 6, c, TILE.stone, true, '#8a8a8e');
        if (rng() < 0.45) A.box(x + (rng() - 0.5), y + hh + 0.02, z + (rng() - 0.5), 0.9, 0.08, 0.7, '#f2efe6');   // guano
        if (rng() < 0.3) B.blob(x + 0.3, y + hh + 0.35, z, 0.22, 0.26, 0.4, '#f8f6f0', TILE.white, 0.05, i);   // a gannet
      }
      const top = P(0.5, 0.05);
      for (let k = 0; k < 5; k++) A.blob(top[0] + (rng() - 0.5) * 0.3, top[1] + 1.2 + k * 0.55 + 15 * 0.0, top[2], 0.7 - k * 0.1, 0.35, 0.6 - k * 0.08, k % 2 ? '#a8a49a' : '#8e8a82', TILE.stone, 0.2, k);
      d.cairn = { x: top[0], z: top[2] };
      // the arch, standing in the sea off the north shore
      const ath = -1.2, ax = Math.cos(ath) * d.r * 1.55, az = Math.sin(ath) * d.r * 1.55;
      A.push(ax, 0, az, ath);
      A.cyl(-3, -3, 0, 1.6, 1.2, 10.5, 6, '#5e5e64', TILE.stone); A.cyl(3, -3, 0, 1.6, 1.2, 10.5, 6, '#6a6a70', TILE.stone);
      A.box(0, 7.4, 0, 8.6, 2.0, 2.6, '#626268', TILE.stone); A.box(0, 8.5, 0, 6, 0.1, 1.6, '#f2efe6');
      A.pop();
      for (let i = 0; i < 8; i++) { const th = rng() * 6.28, R = d.r * (1.05 + rng() * 0.3); A.cyl(Math.cos(th) * R, -1.5, Math.sin(th) * R, 0.8 + rng() * 0.6, 0.6, 2.2 + rng() * 2, 6, '#55555c', TILE.stone); }
      break;
    }
    case 'bell': {   // a sea stack with a leaning bell tower; the roofs of a drowned street just under the water round it
      const [x, y, z] = P(0, 0);
      A.push(x, y - 0.3, z, 0.5, 1, 1, 1, 0.16, 0.05);
      A.box(0, 0, 0, 3.2, 9, 3.2, '#a89c88', TILE.wall, TILE.stone, '#8a7e6a');
      for (const [sx, sz] of [[1.62, 0], [-1.62, 0], [0, 1.62], [0, -1.62]]) A.box(sx * 1.001, 6.8, sz * 1.001, sx ? 0.06 : 1.4, 1.8, sz ? 0.06 : 1.4, '#2a2622');   // the open belfry
      A.cyl(0, 9.05, 0, 0.8, 0.45, 1.2, 7, '#b08a3a', TILE.white, true);   // hung up in the open lantern   // the bell
      for (const [px, pz] of [[1.3, 1.3], [-1.3, 1.3], [1.3, -1.3], [-1.3, -1.3]]) A.box(px, 9, pz, 0.4, 1.8, 0.4, '#a89c88', TILE.wall);
      A.box(0, 10.8, 0, 3.4, 0.3, 3.4, '#8a7e6a', TILE.stone); A.cyl(0, 11.1, 0, 2.3, 0.1, 2.4, 4, '#5a4a3e', TILE.roof, false);
      A.pop();
      for (let i = 0; i < 6; i++) {   // the drowned street: roof ridges and a chimney at the waterline, a quay wall
        const th = 2.4 + i * 0.42 + rng() * 0.2, R = d.r * (1.5 + (i % 2) * 0.5), hx = Math.cos(th) * R, hz = Math.sin(th) * R;
        A.push(hx, -1.0 + rng() * 0.4, hz, th + 1.57);
        A.gable(0, 0, 0, 3.4, 1.5, 3, i % 2 ? '#7a5a4a' : '#6a5a52', TILE.roof, '#8a7a6a');
        if (i % 3 === 0) A.box(1.0, 1.2, 0, 0.5, 1.4, 0.5, '#8a7e6a', TILE.stone);
        A.pop();
      }
      for (let i = 0; i < 10; i++) { const th = rng() * 6.28, R = d.r * (0.95 + rng() * 0.2); A.blob(Math.cos(th) * R, 0, Math.sin(th) * R, 1 + rng(), 0.7, 1 + rng(), '#5a5a5c', TILE.stone, 0.3, i); }
      break;
    }
    case 'grove': {   // a small, very lush wood: broadleaf trees in layers, ferns, flowers, a spring falling into a pool, a clearing
      for (let i = 0; i < 26; i++) {
        const p = h.spot(d, rng, 0.08, 0.86, 0.6); if (!p) continue;
        const s = 0.8 + rng() * 0.7, th = 2.2 + rng() * 2.4;
        A.cyl(p[0], p[1] - 0.2, p[2], 0.32 * s, 0.2 * s, th * s + 0.4, 5, '#6a4a34', TILE.bark, false);
        for (let k = 0; k < 3; k++) B.blob(p[0] + (rng() - 0.5) * 1.2 * s, p[1] + th * s + k * 0.9 * s, p[2] + (rng() - 0.5) * 1.2 * s, (2.2 - k * 0.5) * s, (1.0 - k * 0.15) * s, (2.0 - k * 0.5) * s, GREENS[Math.floor(rng() * GREENS.length)], TILE.white, 0.25, i * 3 + k);
      }
      for (let i = 0; i < 18; i++) { const p = h.spot(d, rng, 0.2, 0.95, 0.4); if (p) h.fern(B, p[0], p[1], p[2], rng); }
      for (let i = 0; i < 10; i++) { const p = h.spot(d, rng, 0.3, 0.9, 0.5); if (p) h.flowers(B, p[0], p[1], p[2], rng); }
      for (let i = 0; i < 5; i++) { const p = h.spot(d, rng, 0.2, 0.9, 0.4); if (p) h.mossRock(A, p[0], p[1], p[2], 0.7 + rng() * 0.6, rng); }
      // the spring: a mossy rock, a white fall, a still pool and a run down to the shore
      const sp = P(1.2, 0.3), pool = P(1.2, 0.62), mouth = P(1.2, 1.0);
      A.blob(sp[0], sp[1] + 0.6, sp[2], 1.8, 1.6, 1.6, '#55684a', TILE.stone, 0.25, 7);
      A.box(sp[0] + 0.5, sp[1] - 0.2, sp[2] + 1.2, 0.8, 2.2, 0.25, '#e8f4ff', TILE.white);
      A.blob(pool[0], pool[1] + 0.05, pool[2], 2.2, 0.12, 1.8, '#3a8aa8', TILE.white, 0.1, 8);
      for (let k = 0; k <= 6; k++) { const f = k / 6, x = pool[0] + (mouth[0] - pool[0]) * f, z = pool[2] + (mouth[2] - pool[2]) * f; A.blob(x, at(x, z) + 0.06, z, 0.7, 0.08, 0.7, '#4a9ab8', TILE.white, 0.1, k); }
      // the clearing: a stone table, two stools and a rope swing on the biggest tree
      const cl = P(4.2, 0.35);
      A.box(cl[0], cl[1] + 0.5, cl[2], 1.6, 0.18, 1.0, '#8a8478', TILE.stone); A.box(cl[0], cl[1] - 0.1, cl[2], 0.4, 0.6, 0.4, '#7a746a', TILE.stone);
      A.cyl(cl[0] + 1.3, cl[1], cl[2], 0.3, 0.3, 0.45, 5, '#6a5a48', TILE.bark); A.cyl(cl[0] - 1.3, cl[1], cl[2], 0.3, 0.3, 0.45, 5, '#6a5a48', TILE.bark);
      A.box(cl[0] + 2.4, cl[1] + 1.8, cl[2] + 1.2, 0.05, 2.6, 0.05, '#c8b890'); A.box(cl[0] + 2.4, cl[1] + 0.5, cl[2] + 1.2, 0.7, 0.08, 0.3, '#8a6a48', TILE.planks);
      d.forest = true;
      break;
    }
    case 'keeper': {   // a lone lighthouse on a knuckle of rock, the keeper's cottage, his boat and his washing
      const lp = P(0.9, 0.15);
      h.lighthouse(A, extra, lp[0], lp[1] - 0.2, lp[2], 1.1, d, 'brick');
      d.lhPos = { x: lp[0], z: lp[2] };
      const hp = P(3.6, 0.45);
      h.houseKind(A, B, hp[0], hp[1] - 0.1, hp[2], 3.6 + 1.57, rng, 'cottage');
      h.person(A, hp[0] + 1.6, hp[1], hp[2] - 1.2, rng, '#3a4a6a');
      const bp = P(2.2, 1.05); h.beachedBoat(A, bp[0], 0.1, bp[2], 2.2);
      const wp = P(4.6, 0.6); h.washing(A, wp[0], wp[1], wp[2], 1.0, rng);
      for (let i = 0; i < 4; i++) { const p = P(5.2 + i * 0.15, 0.55); h.crateBox(A, p[0], p[1], p[2], i, 0.7); }
      for (let i = 0; i < 9; i++) { const th = rng() * 6.28, R = d.r * (0.95 + rng() * 0.25); A.blob(Math.cos(th) * R, 0, Math.sin(th) * R, 0.9 + rng(), 0.6, 0.9 + rng(), '#5a5a5c', TILE.stone, 0.3, i); }
      break;
    }
    case 'ribs': {   // a long sandbar where ships come to die: ribs in rows, a snapped mast, a half-buried figurehead, the surf ring
      for (let w = 0; w < 4; w++) {
        const th = w * 1.6 + 0.3, t = 0.15 + (w % 2) * 0.35, cx = Math.cos(th) * d.r * t, cz = Math.sin(th) * d.r * t, ry = rng() * 6.28, len = 5 + rng() * 4;
        A.push(cx, at(cx, cz) - 0.3, cz, ry, 1, 1, 1, 0, (rng() - 0.5) * 0.3);
        A.box(0, 0.15, 0, 0.35, 0.3, len, '#3a2a20', TILE.planks);   // the keel
        for (let k = 0; k < 7; k++) {
          const zz = -len / 2 + (k + 0.5) * len / 7, hh = 2.2 + Math.sin((k / 6) * Math.PI) * 1.4;
          for (const s of [-1, 1]) { A.push(s * 0.3, 0, zz, 0, 1, 1, 1, 0, s * -0.42); A.cyl(0, 0, 0, 0.16, 0.08, hh, 4, '#4a3828', TILE.bark, false); A.pop(); }
        }
        A.pop();
      }
      const mp = P(2.6, 0.3); A.push(mp[0], mp[1] - 0.3, mp[2], 0, 1, 1, 1, 0.3, 0.1); A.cyl(0, 0, 0, 0.3, 0.2, 9, 5, '#5a4030', TILE.bark, false); A.box(0, 6.5, 0, 4, 0.2, 0.2, '#5a4030', TILE.bark); A.box(1.2, 4.5, 0, 0.05, 3.5, 1.6, '#c8b898', TILE.sail); A.pop();
      const fp = P(4.4, 0.55); A.push(fp[0], fp[1] - 0.4, fp[2], 1.2, 1, 1, 1, 0.5, 0); A.cyl(0, 0, 0, 0.45, 0.35, 1.6, 6, '#b8a080', TILE.wall); A.blob(0, 1.9, 0, 0.45, 0.5, 0.45, '#d8c8a8', TILE.white, 0.1, 3); A.pop();
      for (let i = 0; i < 9; i++) { const p = h.spot(d, rng, 0.1, 0.95, 0.1); if (p) (i % 3 ? h.barrel(A, p[0], p[1], p[2], 0.8) : h.driftwood(A, p[0], p[1], p[2], rng() * 3)); }
      for (let i = 0; i < 70; i++) {   // the breakers: white water and black rocks in a ring well off the sand
        const th = (i / 70) * 6.28 + rng() * 0.05, R = 46 + Math.sin(i * 1.7) * 3 + rng() * 3, x = Math.cos(th) * R, z = Math.sin(th) * R;
        if (i % 4 === 0) A.blob(x, -0.3, z, 1.4 + rng(), 0.9, 1.2 + rng(), '#2e2e34', TILE.stone, 0.3, i);
        A.push(x, 0.12, z, -th); A.box(0, 0, 0, 0.5 + rng() * 0.4, 0.14, 2.4 + rng() * 2.2, '#f4f8fa', TILE.white); A.pop();
        if (i % 2) { A.push(x * 0.96, 0.1, z * 0.96, -th + 0.2); A.box(0, 0, 0, 0.35, 0.1, 1.4 + rng() * 1.2, '#e4f0f4', TILE.white); A.pop(); }
      }
      break;
    }
    case 'lagoon': {   // an atoll in water like glass: coral in the lagoon, a chest gleaming on the bottom, a ring of reef rocks round it all
      for (let i = 0; i < 26; i++) {
        const th = rng() * 6.28, R = d.r * rng() * 0.45, x = Math.cos(th) * R, z = Math.sin(th) * R;
        A.blob(x, -0.6, z, 0.6 + rng() * 0.7, 0.4 + rng() * 0.6, 0.6 + rng() * 0.6, ['#e86a8a', '#f0a050', '#4ad0c0', '#c86ad8'][i % 4], TILE.white, 0.3, i);
      }
      h.chest(A, 1.5, -0.55, -1.2, 0.6, true);
      for (let i = 0; i < 8; i++) { const p = h.spot(d, rng, 0.62, 0.95, 0.4); if (p) h.palm(A, B, D, p[0], p[1], p[2], rng, 0.9 + rng() * 0.4); }
      for (let i = 0; i < 90; i++) {   // the reef: knuckles of black coral just breaking the surface, in a broken ring
        const th = (i / 90) * 6.28, R = 40 + Math.sin(i * 0.9) * 2.5 + rng() * 2.5, x = Math.cos(th) * R, z = Math.sin(th) * R;
        if (i % 18 < 2) continue;   // the gaps a good rudder can thread
        A.blob(x, -0.1, z, 0.9 + rng() * 0.8, 0.45 + rng() * 0.3, 0.9 + rng() * 0.7, i % 3 ? '#3a3236' : '#6a4a4a', TILE.stone, 0.35, i);
        if (i % 2) A.blob(x + 0.8, 0.16, z, 1.2, 0.12, 0.7, '#e8f6f8', TILE.white, 0.2, i + 7);
      }
      break;
    }
    case 'broken': {   // half an island: a clean cliff with the layers showing, half a house at the edge, the other half under the sea
      const nx = Math.cos(d.cutTh), nz = Math.sin(d.cutTh), tx = -nz, tz = nx, c = d.cutC * d.r + 0.5;
      // the cliff face, in bands of rock from the grass edge to the seabed
      const L = d.r * 0.95, steps = 18;
      for (let i = 0; i < steps; i++) {
        const s0 = -L + (2 * L * i) / steps, s1 = s0 + (2 * L) / steps;
        const a = [nx * (c - 0.6) + tx * s0, nz * (c - 0.6) + tz * s0], b = [nx * (c - 0.6) + tx * s1, nz * (c - 0.6) + tz * s1];
        const ha = at(a[0], a[1]), hb = at(b[0], b[1]);
        if (ha < 0.5 && hb < 0.5) continue;
        const top = Math.min(ha, hb), bands = [['#9a6a48', 0.3], ['#c8b088', 0.22], ['#7a5a4a', 0.2], ['#b89870', 0.28]];
        let y = -3;
        for (let k = 0; y < top; k++) {
          const [cc, f] = bands[k % bands.length], y1 = Math.min(top, y + Math.max(0.6, top * f));
          const q = [[a[0] + nx * 0.62, y, a[1] + nz * 0.62], [b[0] + nx * 0.62, y, b[1] + nz * 0.62], [b[0] + nx * 0.62, y1, b[1] + nz * 0.62], [a[0] + nx * 0.62, y1, a[1] + nz * 0.62]];
          A.quad(q[0], q[1], q[2], q[3], col(cc), TILE.stone); A.quad(q[1], q[0], q[3], q[2], col(cc), TILE.stone);
          y = y1;
        }
        if (rng() < 0.5) { const rx = (a[0] + b[0]) / 2 + nx * 0.7, rz = (a[1] + b[1]) / 2 + nz * 0.7; A.cyl(rx, top - 1.6 - rng(), rz, 0.06, 0.02, 1.6 + rng(), 3, '#3a2a20', TILE.bark, false); }   // roots hanging out of the cut
      }
      // half a house right on the edge: three walls, half a roof, a table laid for two
      const hx = nx * (c - 3.2) + tx * 2, hz = nz * (c - 3.2) + tz * 2, hy = at(hx, hz);
      A.push(hx, hy, hz, -d.cutTh + 1.57);
      A.box(0, 0, -1.6, 4.2, 2.6, 0.25, '#e8d8b8', TILE.wall); A.box(-2.0, 0, 0, 0.25, 2.6, 3.2, '#e8d8b8', TILE.wall); A.box(2.0, 0, 0, 0.25, 2.6, 3.2, '#e8d8b8', TILE.wall);
      A.push(0, 2.6, -0.8, 0, 1, 1, 1, 0.55, 0); A.box(0, 0, 0, 4.6, 0.15, 2.0, '#b8503a', TILE.roof); A.pop();
      A.box(0, 0.75, 0.2, 1.4, 0.1, 0.9, '#8a6a48', TILE.planks); A.box(0, 0, 0.2, 0.15, 0.75, 0.15, '#6a4a30');
      A.cyl(-0.4, 0.8, 0.2, 0.18, 0.18, 0.04, 6, '#f0ece4', TILE.white); A.cyl(0.4, 0.8, 0.2, 0.18, 0.18, 0.04, 6, '#f0ece4', TILE.white);
      A.pop();
      d.halfHouse = { x: hx, z: hz };
      // the rest of the island: trees, a well, a path that stops at the edge
      for (let i = 0; i < 10; i++) { const p = h.spot(d, rng, 0.15, 0.85, 0.9); if (p) h.palm(A, B, D, p[0], p[1], p[2], rng, 0.9 + rng() * 0.4); }
      for (let i = 0; i < 8; i++) { const p = h.spot(d, rng, 0.2, 0.9, 0.9); if (p) h.flowers(B, p[0], p[1], p[2], rng); }
      for (let k = 0; k < 10; k++) { const f = k / 9, px = hx * f - nx * 8 * (1 - f), pz = hz * f - nz * 8 * (1 - f); A.box(px, at(px, pz) + 0.03, pz, 1.1, 0.06, 1.1, '#c8b088'); }
      // the missing half, under the water: tilted slabs and one chunk still sticking out, a palm on it leaning away
      for (let i = 0; i < 9; i++) {
        const s = (rng() - 0.5) * 2 * L, o = c + 4 + rng() * d.r * 0.9, x = nx * o + tx * s, z = nz * o + tz * s;
        A.push(x, -4.2 - rng() * 1.5, z, rng() * 6.28, 1, 1, 1, (rng() - 0.5) * 0.5, (rng() - 0.5) * 0.5);
        A.box(0, 0, 0, 5 + rng() * 5, 2 + rng() * 1.5, 4 + rng() * 4, i % 2 ? '#4a3a32' : '#5a4a3a', TILE.stone, TILE.stone, '#3a5a32');
        A.pop();
      }
      const chx = nx * (c + 12) + tx * -5, chz = nz * (c + 12) + tz * -5;
      A.push(chx, -1.5, chz, d.cutTh, 1, 1, 1, 0.5, 0.3); A.box(0, 1.6, 0, 6, 5, 5, '#9a6a48', TILE.stone, TILE.stone, '#6a9a48'); A.pop();
      h.palm(A, B, D, chx + 0.5, 3.4, chz, rng, 1.0);
      // three bone spines on the sunken slabs, all pointing at the table in the half house (dark mood only)
      for (let k = 0; k < 3; k++) {
        const sx = nx * (c + 7 + k * 3.2) + tx * (-4 + k * 4), sz = nz * (c + 7 + k * 3.2) + tz * (-4 + k * 4), ax = d.halfHouse.x - sx, az = d.halfHouse.z - sz, al = Math.hypot(ax, az);
        D.push(sx, -1.0, sz, 0, 1, 1, 1, (az / al) * 0.5, -(ax / al) * 0.5);
        for (let j = 0; j < 5; j++) D.blob(0, j * 0.6, 0, 0.55 - j * 0.05, 0.22, 0.55 - j * 0.05, j % 2 ? '#6a3a40' : '#8a7e78', TILE.bone, 0.12, j + k);
        D.pop();
      }
      break;
    }
    // ---- the places of the exploration story (docs/WORLD_REDESIGN.md 5.6) in their art (docs/ART_SPEC.md 6).
    // Props that depend on the sea or the story are `states` (built once, shown when `when(isl)` says so).
    case 'customs': {   // a long grey pier, a white-grey hut roof, a flag on a 5-high pole, a ledger desk; one steady lamp at the pier end by night
      for (let i = 0; i < 12; i++) A.box(-8 + i * 1.6, 0.5, 0, 1.5, 0.18, 1.8, '#7a7a78', TILE.planks);
      A.box(9, 0.6, 0, 2.2, 1.8, 2.0, '#9a9a96', TILE.wall); A.box(9, 2.4, 0, 2.6, 0.25, 2.4, '#d8d8d4', TILE.roof);
      A.cyl(-8.5, 0.4, 0.9, 0.09, 0.09, 5, 6, '#6a4a30', TILE.bark); A.box(-8.1, 4.8, 0.9, 1.4, 0.8, 0.05, '#4a6ac0', TILE.flag, TILE.flag, '#3a3a48');
      A.box(6, 0.7, 1.1, 1.2, 0.5, 0.7, '#8a6a48', TILE.planks); A.cyl(5.8, 1.2, 1.1, 0.14, 0.12, 0.14, 6, '#f0ece4', TILE.white); A.cyl(6.3, 1.2, 1.1, 0.14, 0.12, 0.14, 6, '#f0ece4', TILE.white);
      A.cyl(-9.4, 0.4, 0, 0.07, 0.07, 2.6, 4, '#4a4a50', TILE.stone);
      const L = mk(); L.cyl(-9.4, 3.0, 0, 0.35, 0.35, 0.5, 6, '#ffd060', TILE.glow, false); st(L, (i) => i.tod && i.tod.night > 0.45);
      break;
    }
    case 'teo': case 'ilse': {   // a person and a fire each; the fire (1.6 high, flickering) burns only on a calm night, and the two mirror each other
      const teo = d.lm === 'teo', p = P(1.0, 0.3);
      h.person(A, p[0], p[1], p[2], rng, teo ? '#8a4a2a' : '#3a4a6a');
      A.blob(p[0] + 1.4, p[1], p[2], 0.5, 0.18, 0.5, '#3a3430', TILE.stone, 0.2, 3);   // cold logs by day
      if (!teo) { A.cyl(p[0] - 1.6, p[1], p[2], 0.07, 0.07, 3.5, 4, '#5a4636', TILE.bark); A.box(p[0] - 1.6, p[1] + 0.5, p[2] + 0.5, 0.7, 0.08, 0.5, '#6a4a30', TILE.planks); }   // her lamp pole and stool
      const F = mk();
      for (let k = 0; k < 3; k++) F.blob(p[0] + 1.4, p[1] + 0.35 + k * 0.5, p[2], 0.55 - k * 0.12, 0.4, 0.55 - k * 0.12, k ? '#ffd060' : '#ff9a30', TILE.glow, 0.15, k + 1);
      if (!teo) F.cyl(p[0] - 1.6, p[1] + 3.5, p[2], 0.3, 0.3, 0.4, 6, '#ffd060', TILE.glow, false);
      st(F, (i) => i.tod && i.tod.night > 0.45 && i.gctx.calm);
      break;
    }
    case 'cup': {   // a table laid for two, a cloth on a 3.5 pole to find it by; at high water a pale bar leads in, at low water black reef lies between
      const p = P(0.4, 0.2);
      A.box(p[0], p[1] + 0.8, p[2], 1.6, 0.08, 1.0, '#f4efe4', TILE.white); A.box(p[0], p[1], p[2], 0.12, 0.8, 0.12, '#6a4a30');
      A.cyl(p[0] - 0.4, p[1] + 0.88, p[2], 0.14, 0.12, 0.14, 6, '#f0ece4', TILE.white); A.cyl(p[0] + 0.4, p[1] + 0.88, p[2], 0.14, 0.12, 0.14, 6, '#f0ece4', TILE.white);
      A.cyl(p[0] + 1.3, p[1], p[2], 0.07, 0.07, 3.5, 4, '#6a4a30', TILE.bark); A.box(p[0] + 1.3, p[1] + 3.2, p[2], 1.1, 0.6, 0.05, '#f4efe4', TILE.sail);
      const hi = mk(); hi.box(-8, 0.1, 0, 10, 0.25, 3.2, '#f0e4c0', TILE.sand); st(hi, (i) => i.tide > 0.25);
      const lo = mk(); for (let k = 0; k < 6; k++) lo.blob(-6 - k * 1.6, 0.0, (k % 2 ? 1 : -1) * 1.8, 1.0, 0.45, 0.8, '#3a3236', TILE.stone, 0.3, k); st(lo, (i) => i.tide <= 0.25);
      const lamp = mk(); lamp.cyl(p[0], p[1] + 0.88, p[2] + 0.3, 0.07, 0.09, 0.3, 6, '#ffd060', TILE.glow); st(lamp, (i) => i.tod && i.tod.night > 0.45);
      const grey = mk(); grey.cyl(p[0] + 0.4, p[1] + 0.9, p[2], 0.17, 0.14, 0.16, 6, '#c8b890', TILE.sand); st(grey, (i) => i.gctx.seen && i.gctx.seen['CL-F3-a'] !== undefined);   // the second cup goes the colour of the sand
      break;
    }
    case 'hammock': {   // palms with hammocks strung between them, every one at the same height and tilt: only the cloth differs
      for (let i = 0; i < 6; i++) { const q = h.spot(d, rng, 0.2, 0.8, 0.9); if (!q) continue; h.palm(A, B, D, q[0], q[1], q[2], rng, 1.0);
        A.push(q[0] + 1.6, q[1] + 1.4, q[2], 0, 1, 1, 1, 0, 0.12); A.box(0, 0, 0, 3, 0.1, 0.7, ['#c85a4a', '#d8b050', '#5a8ac0'][i % 3], TILE.sail); A.pop(); }
      break;
    }
    case 'namewall': {   // a white cliff, its top edge stepped in three ledges, the marks too small to read; the top row is a glossier black
      A.box(0, 0, 0, 14, d.H - 2, 3, '#e8e4dc', TILE.white);
      A.box(0, d.H - 2, 0, 12, 0.7, 2.6, '#e8e4dc', TILE.white); A.box(0.5, d.H - 1.3, 0, 9, 0.7, 2.2, '#e8e4dc', TILE.white); A.box(1, d.H - 0.6, 0, 6, 0.6, 1.8, '#e8e4dc', TILE.white);
      for (let i = 0; i < 60; i++) { const row = Math.floor(i / 15); A.box(-6.5 + (i % 15) * 0.9, 1 + row * 2.6, 1.55, 0.45, 0.18, 0.04, row === 3 ? '#050508' : '#26262c', TILE.stone); }
      for (let n = 1; n <= 3; n++) { const W = mk(); for (let k = 0; k < 15; k += 2) W.box(-6.5 + k * 0.9, 1 + (3 - n) * 2.6 - 1.3, 1.56, 0.5, 0.2, 0.04, '#0a0a0e', TILE.stone); st(W, (i) => i.gctx.lvl && i.gctx.lvl[2] >= n); }   // the wet rows creep as the question rises
      break;
    }
    case 'archive': {   // a pale fort with a flag pole, one lit window (1.6 x 1.8) among dark slits; a second window lights as the question rises
      A.box(0, 0, 0, 9, 7, 7, '#d8d2c4', TILE.wall); A.box(0, 7, 0, 10, 0.5, 8, '#8a8680', TILE.stone);
      A.box(-2.2, 3.4, 3.55, 1.6, 1.8, 0.1, '#f0d070', TILE.glow);
      for (let k = 0; k < 3; k++) A.box(0.4 + k * 1.9, 3.4, 3.55, 0.7, 1.4, 0.1, '#2a2630', TILE.stone);
      A.cyl(3.2, 7.5, 0, 0.1, 0.1, 5, 6, '#6a4a30', TILE.bark); A.box(3.9, 11.6, 0, 1.4, 0.8, 0.05, '#4a6ac0', TILE.flag);
      const W2 = mk(); W2.box(2.3, 3.4, 3.56, 1.6, 1.8, 0.1, '#f0d070', TILE.glow); st(W2, (i) => i.gctx.lvl && i.gctx.lvl[3] >= 2);
      break;
    }
    case 'press': {   // a fat, short brick chimney (not a lighthouse), one steady plume, a steady blue lamp 1.6 high, two seaward doors once the clue is seen
      A.cyl(0, 0, 0, 2.6, 1.9, 7, 8, '#a0583c', TILE.wall, false); A.cyl(0, 7, 0, 2.2, 2.2, 0.5, 8, '#3a2a26', TILE.stone);
      for (let k = 0; k < 3; k++) A.blob(0.3 * k, 8.4 + k * 1.3, 0, 1.0 + k * 0.3, 0.7, 1.0 + k * 0.3, '#b8b4b0', TILE.white, 0.2, k);
      A.box(3.6, 0, 1, 3.4, 2.2, 3.0, '#d8c8a8', TILE.wall); A.gable(3.6, 2.2, 1, 3.8, 1.2, 3.4, '#a8382c', TILE.roof, '#d8c8a8');
      A.box(0, 0.2, 2.3, 0.9, 1.4, 0.15, '#241c20', TILE.stone);
      const Lm = mk(); Lm.box(-3.4, 0.3, 0.5, 0.9, 1.6, 0.9, '#2a5a9a', TILE.white); st(Lm, () => true, mats.glow);   // additive, so the night does not dim it
      const Dr = mk(); Dr.box(-1.2, 0, 2.5, 0.9, 1.5, 0.12, '#241c20', TILE.stone); Dr.box(1.4, 0, 2.5, 0.9, 1.5, 0.12, '#241c20', TILE.stone); st(Dr, (i) => i.gctx.seen && i.gctx.seen['CL-L1-a'] !== undefined);
      break;
    }
    case 'wreck': {   // a broken hull: at low water the deck stands bare, at high water it is awash; a mast with a rag to 7
      A.cyl(1.5, 0, 0, 0.12, 0.16, 7, 6, '#4a3626', TILE.bark); A.box(2.2, 6, 0, 1.3, 0.8, 0.05, '#b04a4a', TILE.sail);
      const lo = mk(); lo.push(0, -0.2, 0, 0.5, 1, 1, 1, 0.3, 0.1); lo.box(0, 0.9, 0, 7, 1.7, 2.4, '#5a4636', TILE.planks); lo.pop(); st(lo, (i) => i.tide < -0.3);
      const hi = mk(); hi.push(0, -0.9, 0, 0.5, 1, 1, 1, 0.3, 0.1); hi.box(0, 0.9, 0, 7, 1.7, 2.4, '#2a2e2c', TILE.planks); hi.pop(); st(hi, (i) => i.tide >= -0.3);
      break;
    }
    case 'ledger': {   // a white and black banded lighthouse, lit by day as well as night, its beam fixed: it never turns
      h.lighthouse(A, extra, 0, 0, 0, 1.0, d, 'slim'); extra.alwaysLit = true; extra.beamFixed = true;
      break;
    }
    case 'tower': {   // a black tapered tower, a slit that glows only when the door is open (calm night), a second slit above it in the dark, one pale shaft
      A.cyl(0, 0, 0, 3.0, 1.5, d.H, 8, '#18161c', TILE.stone, true, '#2a2830');
      A.box(0, d.H * 0.55, 1.9, 0.5, 1.2, 0.1, '#0a0a0e', TILE.void); A.box(0, 0.2, 3.1, 1.0, 1.6, 0.2, '#0a0a0e', TILE.void);
      D.box(0, d.H * 0.8, 1.6, 0.4, 1.0, 0.1, '#0a0a0e', TILE.void);
      const G = mk(); G.box(0, d.H * 0.55, 1.95, 0.5, 1.2, 0.1, '#e8f060', TILE.glow); st(G, (i) => i.tod && i.tod.night > 0.45 && i.gctx.calm);
      const R = mk(); R.push(0, d.H * 0.55, 2.2, 0, 1, 1, 1, -1.25, 0); R.cyl(0, 0, 0, 0.15, 1.7, 14, 6, '#1c2810', TILE.white, false); R.pop(); st(R, (i) => i.tod && i.tod.night > 0.45 && i.gctx.calm, mats.glow);   // a pale shaft down into the sea
      const Dl = mk(); Dl.box(0, 0.2, 3.15, 1.0, 1.6, 0.2, '#3a3a42', TILE.stone); st(Dl, (i) => i.gctx.seen && i.gctx.seen['CL-L3-a'] !== undefined && i.tod && i.tod.night > 0.45);
      break;
    }
    case 'street': {   // gabled roofs aligned radially at and just under the water; at high water most are gone, a blue door shows only at the lowest water
      for (let i = 0; i < 9; i++) {
        const th = i * 0.7, R = 4 + (i % 3) * 3.5, x = Math.cos(th) * R, z = Math.sin(th) * R, hold = i % 5 < 2;
        const B2 = hold ? A : mk();
        B2.push(x, -0.3 + (i % 2) * 0.5, z, -th + 1.57); B2.gable(0, 0, 0, 3, 1.1, 2, '#7a3a2a', TILE.roof, '#5a2a20');
        if (i % 3 === 0) B2.box(0.8, 0.8, 0.3, 0.4, 0.8, 0.4, '#6a5a50', TILE.stone);
        if (i === 1 || i === 5) B2.box(0, 0.2, 1.05, 0.5, 0.5, 0.06, '#ffd060', TILE.glow);
        B2.pop();
        if (!hold) st(B2, (isl) => isl.tide < 0.0);
      }
      const Dr = mk(); Dr.box(5.2, 0.2, 0.1, 0.5, 0.9, 0.08, '#2a4a9a', TILE.planks);
      st(Dr, (i) => i.gctx.seen && i.gctx.seen['CL-D1-a'] !== undefined && i.tide < -0.55 && Math.hypot(i.gctx.ship.x - d.x, i.gctx.ship.z - d.z) < 40);
      break;
    }
    case 'table': {   // the table at the water's edge: it exists only once three questions have reached a second look. Chairs lean towards each other; the far seat is wet-black
      const p = P(0.0, 0.7), T = mk();
      T.box(p[0], p[1] + 0.9, p[2], 3.5, 0.1, 1.6, '#e8e2d4', TILE.white); T.box(p[0], p[1], p[2], 0.14, 0.9, 0.14, '#4a3a2a');
      T.push(p[0] - 2.1, p[1], p[2], 0, 1, 1, 1, 0, -0.1); T.box(0, 0.5, 0, 0.7, 0.08, 0.7, '#e0d8c8', TILE.white); T.box(-0.3, 0.5, 0, 0.08, 0.9, 0.7, '#e0d8c8', TILE.white); T.pop();
      T.push(p[0] + 2.1, p[1], p[2], 0, 1, 1, 1, 0, 0.1); T.box(0, 0.5, 0, 0.7, 0.08, 0.7, '#1c1214', TILE.stone); T.box(0.3, 0.5, 0, 0.08, 0.9, 0.7, '#e0d8c8', TILE.white); T.pop();
      st(T, (i) => !!i.gctx.d3);
      const Gp = mk(); Gp.cyl(p[0], p[1] + 0.05, p[2], 4.5, 4.5, 0.02, 10, '#3a1030', TILE.white, false); st(Gp, (i) => !!i.gctx.d3, mats.glow);   // a pale pool of light on the water
      break;
    }
    // ---- the gates read as blockers before they block, and differently once open (R1, R2)
  }
  if (d.lm === 'ribs') { const S = mk(); for (let k = 0; k < 16; k++) { const th = (k / 16) * 6.28, R = 19 + (k % 3); S.box(Math.cos(th) * R, 0.15, Math.sin(th) * R, 2.4, 0.12, 0.5, '#f4f8fa', TILE.white); } st(S, (i) => ((i.gctx.up && i.gctx.up.hull) || 0) < 2); }   // more surf while the hull cannot take it
  if (d.lm === 'lagoon') { const S = mk(); for (const k of [0, 1, 18, 19, 36, 37, 54, 55, 72, 73]) { const th = (k / 90) * 6.28, R = 40 + Math.sin(k * 0.9) * 2.5; S.blob(Math.cos(th) * R, -0.1, Math.sin(th) * R, 1.3, 0.55, 1.1, '#3a3236', TILE.stone, 0.3, k); } st(S, (i) => ((i.gctx.up && i.gctx.up.rudder) || 0) < 2); }   // the gaps close while the rudder cannot thread them
}
