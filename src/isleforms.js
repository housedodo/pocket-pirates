// Island looks (2026-11-15, owner: "do it all but make sure the map is not overcrowded"; docs/ART_SPEC.md 5.1, 7, A12, A13 and
// docs/proposals/REGIONS.md "Bolder looks"). Rolled islands only: the starter cells, the hand-made places and Tama's own waters keep
// exactly what they had. Nothing here adds an island, moves one or makes one bigger on the map:
//   1. Lean: each region leans to its own kinds. Only a plain sandbar, jungle or rocky isle can change, and only into a kind that is
//      the same size or smaller (an atoll from the lean is kept small). Harbours, treasure isles and the rarer kinds never change.
//   2. Form: each kind has three outlines, made from the same island mesh (the terrain grid has the same triangles whatever its
//      shape) and the same or fewer props: sandbar (bar, dune, spit), jungle (hill, twin peaks, low canopy), rocky (spires, mesa, arch).
//   3. Band: distance from Tama sets the shape family of the loose stone (ART_SPEC 5.1): rounded near home (S0), long and low in the
//      Shoals (S1), blocky in the Trade Belt and beyond (S2+); and a slight ground tint per band (warm, bleached, cream).
//      Same count of rocks, same rng draws, no new tiles: the rest of the island stays where it was.
// `?isles=0` turns all three off, to compare on the same seed.
import { hash2, mulberry32, smoothstep } from './util.js';
import { STRATA } from './palette.js';
import { TILE } from './textures.js';
import { params } from './core/config.js';

export const ISLES = params.get('isles') !== '0';

/** which band of distance an island sits in: 0 (S0, near home), 1 (the Shoals), 2 (the Trade Belt and beyond) */
export function isleBand(d) {
  if (!ISLES || d.lm || d.forced) return 0;
  const r = Math.hypot(d.x, d.z);
  return r < STRATA[1].r0 ? 0 : r < STRATA[2].r0 ? 1 : 2;
}

// the region's lean: [from kind] -> [into kind, chance]. The rest stay as they rolled.
const LEAN = {
  crown: { jungle: ['sandbar', 0.3], rocky: ['sandbar', 0.2] },                                 // cobalt water, long clean views: open sand
  free: { sandbar: ['atoll', 0.45], jungle: ['mangrove', 0.35], rocky: ['sandbar', 0.35] },   // lagoons and shallows, little hard rock
  reef: { jungle: ['rocky', 0.45], sandbar: ['rocky', 0.3] },                                   // hard black rock in the breakers
  lantern: { jungle: ['rocky', 0.3], sandbar: ['rocky', 0.2] },                                 // dark rock for the Guild's lights
  drowned: { jungle: ['mangrove', 0.45], rocky: ['sandbar', 0.3] },                             // drowned ground: mud and low sand
};

const open = (desc, cx, cz) => ISLES && !desc.forced && Math.max(Math.abs(cx), Math.abs(cz)) > 1;

/** after the rarer kinds: lean a plain island toward its region's kinds. rolled: the kind it first rolled; makeName: lore.js */
export function lean(desc, cx, cz, seed, rolled, makeName) {
  if (!open(desc, cx, cz)) return;
  const L = LEAN[desc.region], from = desc.type;
  if (L && L[from] && desc.type === rolled) {
    const vr = mulberry32(hash2(cx, cz, seed + 6262)), [to, p] = L[from];
    if (vr() < p) {
      desc.type = to;
      if (to === 'sandbar') { desc.r = 6 + vr() * 5; desc.H = 0.9; desc.lobes = desc.lobes.map((v, i) => (i < 3 ? v * 1.6 : v)); }
      else if (to === 'rocky') { desc.r = Math.min(desc.r, 11 + vr() * 6); desc.H = 6 + vr() * 4; if (from === 'sandbar') desc.lobes = desc.lobes.map((v, i) => (i < 3 ? v / 1.6 : v)); }
      else if (to === 'atoll') { desc.r = 12 + vr() * 3; desc.H = 1.1; }   // kept small (a rolled atoll is 15 to 21)
      else if (to === 'mangrove') { desc.H = 1.3 + vr() * 0.6; }
      desc.name = makeName(mulberry32(hash2(cx, cz, seed + 4343)), desc.type, desc.dread).replace(/ Tama$/, ' Tamar');
      desc.lean = from;
    }
  }
}

/** after the island's character (cliffs, stacks): pick its form */
export function form(desc, cx, cz, seed) {
  if (!open(desc, cx, cz)) return;
  const fr = mulberry32(hash2(cx, cz, seed + 6363)), f = fr(), th = fr() * Math.PI * 2;
  if (desc.type === 'sandbar') {
    if (f < 0.3) { desc.form = 'dune'; desc.elong = 0.4; desc.elongTh = th; desc.H = 2.6 + fr() * 0.8; }
    else if (f < 0.6) { desc.form = 'spit'; desc.elong = 0.6; desc.elongTh = th; desc.hook = 0.3; }
  } else if (desc.type === 'jungle') {
    if (f < 0.3) { desc.form = 'twin'; desc.twinTh = th; desc.H += 3; }
    else if (f < 0.6) { desc.form = 'canopy'; desc.H = 2.4 + fr() * 0.8; desc.cliffTh = undefined; }
  } else if (desc.type === 'rocky') {
    if (f < 0.3) { desc.form = 'mesa'; desc.H = 5 + fr() * 3; }
    else if (f < 0.6) { desc.form = 'arch'; desc.archTh = th; if (desc.stacks) desc.stacks = 1; }   // the arch stands in for the stacks
  }
}

/** the ground tint per band (ART_SPEC 5.1: warm saturated near home, bleached in the Shoals, cream stone in the Trade Belt) */
export function bandTint(desc) {
  const b = isleBand(desc);
  if (b === 0) desc.satK += 0.04;
  else if (b === 1) { desc.satK -= 0.08; desc.lumK += 0.03; }
  else { desc.satK -= 0.14; desc.lumK += 0.02; }
}

/** the outline: a long island (dune, spit) is the round one squeezed; it covers less sea than the round one (about 0.7 of its area) */
export function shoreK(d, th) {
  if (!d.elong) return 1;
  const c = Math.cos(2 * (th - d.elongTh)), k = 1 - d.elong * 0.55 + d.elong * c * 0.9;
  return d.hook ? k * (1 + d.hook * Math.max(0, Math.cos(th - d.elongTh)) * (c > 0 ? 1 : 0.3)) : k;   // the spit is longer at one end
}

/** the height for a form, or null for the kind's own. t: 0 centre to 1 shore; p: the kind's falloff; n: noise 0..1 */
export function formHeight(d, t, th, n, p, lx, lz) {
  switch (d.form) {
    case 'dune': { // one ridge down the long axis
      const q = Math.abs(-lx * Math.sin(d.elongTh) + lz * Math.cos(d.elongTh)) / d.r;
      return d.H * Math.pow(p, 0.8) * (0.25 + 0.75 * (1 - smoothstep(0.0, 0.45, q))) * (0.8 + n * 0.4);
    }
    case 'spit': return 0.9 * p * (0.6 + n * 0.6);
    case 'twin': { // two peaks across the island
      const ax = Math.cos(d.twinTh), az = Math.sin(d.twinTh), o = d.r * 0.4, w = d.r * 0.28;
      const g = (sx) => Math.exp(-((lx - ax * o * sx) ** 2 + (lz - az * o * sx) ** 2) / (w * w));
      return d.H * (0.18 * Math.pow(p, 1.2) + 0.95 * Math.max(g(1), g(-1) * 0.85)) * (0.75 + n * 0.5) * (1 - smoothstep(0.85, 1.0, t));
    }
    case 'canopy': return Math.min(d.H, d.H * 1.6 * Math.pow(p, 0.7)) * (0.85 + n * 0.3);   // low and flat-topped
    case 'mesa': { // a table on two treads with steep sides
      const s = 1 - smoothstep(0.42, 0.72, t), lv = s * 2, f = Math.floor(lv), st = Math.min(1, (f + smoothstep(0.7, 1, lv - f)) / 2);
      return Math.max(d.H * st * (0.94 + n * 0.12), 0.5 * (1 - smoothstep(0.85, 1.0, t)));
    }
    default: return null;
  }
}

/** a loose rock in the band's shape family; sx/sy/sz/col are drawn by the caller in the old order */
export function bandRock(A, band, x, y, z, sx, sy, sz, col, tile, k) {
  if (band === 0) { A.blob(x, y + 0.2, z, sx, sy, sz, col, tile, 0.25, k); return; }
  if (band === 1) { A.blob(x, y + 0.05, z, sx * 1.5, sy * 0.55, sz * 0.75, col, tile, 0.2, k); return; }   // long and low
  A.push(x, y - 0.25, z, (k * 1.37) % 3.14); A.box(0, 0, 0, sx * 1.4, sy * 1.5, sz * 1.3, col, tile); A.pop();   // a cut block
}

/** a rocky spire in the band's shape family: [radius, height, sides, top radius] */
export function bandSpire(band, r, h, i) {
  if (band === 0) return [r, h, 5 + (i % 2), 0];
  if (band === 1) return [r * 1.25, Math.max(3.5, h * 0.75), 5 + (i % 2), 0];
  return [r * 0.9, h, 4, r * 0.3];   // squared off
}

/** a broad-leaf tree for the low canopy (in place of a palm, never as well): a short trunk under flat crowns */
export function broadleaf(A, B, x, y, z, s, k) {
  A.cyl(x, y - 0.2, z, 0.32 * s, 0.24 * s, 2.4 * s, 5, '#5a4a36', TILE.bark, false);
  B.blob(x, y + 2.6 * s, z, 2.2 * s, 0.9 * s, 2.0 * s, k % 2 ? '#3c7a32' : '#5a8a2a', TILE.white, 0.25, k);
  B.blob(x + 0.9 * s, y + 3.2 * s, z - 0.5 * s, 1.4 * s, 0.7 * s, 1.3 * s, k % 2 ? '#5a8a2a' : '#3c7a32', TILE.white, 0.25, k + 1);
}

/** the sea arch: one foot on the shore, one in the water, a lintel across. Placed where the island's outline says */
export function seaArch(A, d, R, hAt) {
  const tile = TILE.stone;
  const th = d.archTh, cx = Math.cos(th), cz = Math.sin(th), r0 = R * 0.86, r1 = R + 5;
  const y0 = Math.max(0, hAt(cx * r0, cz * r0)), top = Math.max(7, y0 + 4.5);
  A.cyl(cx * r0, y0 - 0.5, cz * r0, 1.5, 1.1, top - y0 + 0.5, 6, '#d6d0c6', tile);
  A.cyl(cx * r1, -2, cz * r1, 1.3, 1.0, top + 2, 6, '#cfc9bf', tile, true, '#6e8a52');
  A.push((r0 + r1) / 2 * cx, top - 0.4, (r0 + r1) / 2 * cz, Math.atan2(cx, cz)); A.box(0, 0, 0, 2.2, 1.6, r1 - r0 + 3, '#e2dbcc', tile); A.pop();
  A.blob(cx * r1, 0.1, cz * r1, 2, 0.18, 2, '#f2f6f6', TILE.white, 0.3, 3);   // spray at its foot
}
