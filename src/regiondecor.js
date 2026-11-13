// What each region puts on the water round its islands (2026-11-13, owner; docs/proposals/REGIONS.md, the bolder prototype sheet
// region_looks_bold.png: sizes and placement follow it). It goes with the region's own light (systems/regionlook.js): from a distance
// you can tell whose waters these are, and what they are like, without a word.
//   Crown:    a buoyed lane into every harbour (red to port, green to starboard, lit at night) and a tall signal mast with a pennant string
//   Free:     houses on stilts over the shallows by the way in, canoes, coloured lantern strings at night
//   Reef:     black coral heads in white breakers across the way in, a mast leaning out of the water
//   Lantern:  two rows of lamps on floats lining the way in, lit day and night; a tall dark tower with a light on top
//   Drowned:  roofs to the ridge and chimneys along the way in, a leaning belfry: a street under the water
// "The way in" is the harbour's approach (its pier direction) or, for other islands, one side picked from the island's seed.
// Built once with the island (world.js Island), in the island's own frame. Home Sound and the hand-made places are left alone.
// Lamps are drawn with the game's glow material (additive, never fogged), so they read at night.
import { TILE } from './textures.js';
import { mats } from './psx.js';
import { mulberry32 } from './util.js';

const NIGHT = (i) => i.tod && i.tod.night > 0.45;
const ALWAYS = () => true;

/** d: the island; A: its prop builder; extra: its state props; h: { shoreR, terrainHeight } from world.js */
export function regionDecor(d, A, extra, h) {
  const reg = d.region;
  if (!reg || d.lm || d.blight || Math.hypot(d.x, d.z) < 480) return;
  if (reg === 'drowned' && typeof window !== 'undefined' && window.__BUILD === 'demo') return;   // the demo has no deep
  const rng = mulberry32((d.seed || 1) * 7919 + 13);
  const st = (b, when, mat) => (extra.states = extra.states || []).push({ b, when, mat });
  const mk = () => { const b = new A.constructor(); b.grime = 0; b.ambient = 1; return b; };   // lamps: flat, full colour
  const harbour = d.type === 'harbour';
  const way = harbour ? d.dockTh : rng() * Math.PI * 2;                     // the way in
  const fx = Math.cos(way), fz = Math.sin(way), sx = -fz, sz = fx;          // out along it, and across it
  const base = h.shoreR(d, way);
  const P = (out, side) => [fx * (base + out) + sx * side, fz * (base + out) + sz * side];   // a point on the water by the way in
  const lane = harbour ? 1 : 0.6;   // other islands get a smaller version

  if (reg === 'crown') {
    if (harbour) {   // the buoyed lane: five pairs out from the pier head, red to one side, green to the other
      const L = mk();
      for (let i = 0; i < 5; i++) {
        const out = 12 + i * 11, [rx, rz] = P(out, 9), [gx, gz] = P(out, -9);
        A.cyl(rx, -1, rz, 1.1, 1.1, 3.2, 6, '#c8302a'); A.cyl(rx, 1.3, rz, 1.12, 1.12, 0.5, 6, '#f2f2ee', TILE.white, false);   // red can, white band
        A.cyl(gx, -1, gz, 1.3, 0.0, 3.6, 6, '#1f9a48');                                                                          // green cone
        L.box(rx, 2.6, rz, 1.5, 1.5, 1.5, '#ff3a30'); L.box(gx, 2.8, gz, 1.5, 1.5, 1.5, '#30ff70');
      }
      st(L, NIGHT, mats.glow);
      // the signal mast at the water's edge beside the lane: tall, white, a yard with a string of pennants
      const [mx, mz] = P(-2, 20);
      A.cyl(mx, -1, mz, 0.5, 0.4, 27, 6, '#f2f2ee'); A.box(mx, 21.8, mz, 10, 0.4, 0.4, '#f2f2ee');
      const cols = ['#c8302a', '#f2d020', '#2050c8', '#f2f2ee', '#c8302a', '#2050c8'];
      cols.forEach((c, i) => { const o = -4.5 + i * 1.8, px = mx + sx * o, pz = mz + sz * o; A.cyl(px, 19.3, pz, 0.0, 0.9, 2.4, 3, c, TILE.flag); });
    } else if (rng() < 0.5) {   // a lone daymark off other Crown isles
      const [x, z] = P(14, 0); A.cyl(x, -1, z, 0.9, 0.9, 5, 6, '#c8302a'); A.cyl(x, 1.6, z, 0.92, 0.92, 0.9, 6, '#f2f2ee', TILE.white, false);
    }
  } else if (reg === 'free') {   // houses on stilts either side of the way in, canoes, lantern strings at night
    const spots = harbour ? [[22, -24, 1], [10, 22, 1.2], [34, -40, 0.9], [26, 38, 0.8]] : rng() < 0.6 ? [[14, (rng() < 0.5 ? -1 : 1) * 18, 0.9]] : [];
    const L = mk();
    for (const [out, side, s] of spots) {
      const [x, z] = P(out, side);
      for (const [ox, oz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) A.cyl(x + ox * s, -1.5 * s, z + oz * s, 0.25, 0.25, 6 * s, 4, '#5a3a1c', TILE.bark, false);
      A.box(x, 3 * s, z, 7 * s, 3 * s, 7 * s, '#c89a5a', TILE.wall);
      A.cyl(x, 6 * s, z, 6.5 * s, 0, 4 * s, 4, '#e0c070', TILE.roof);
      for (let k = 0; k < 7; k++) { const o = -6 * s + k * 2 * s, y = 6.6 * s - Math.sin(k / 6 * Math.PI) * 1.2 * s; L.box(x + sx * o - fx * 3.8 * s, y, z + sz * o - fz * 3.8 * s, 1.8, 1.8, 1.8, ['#ffd060', '#ff7040', '#60d0ff', '#ff60c0', '#90ff60', '#ffd060', '#ff7040'][k]); }
    }
    if (spots.length) st(L, NIGHT, mats.glow);
    if (harbour) for (const side of [-12, 14]) { const [x, z] = P(40, side); A.push(x, -0.2, z, way + 0.3); A.box(0, 0, 0, 1.4, 0.6, 7, '#8a4a20', TILE.planks); A.pop(); }   // canoes
  } else if (reg === 'reef') {   // coral heads in white water across the way in, a mast leaning out of the water
    const n = Math.round(14 * lane), F = mk();
    for (let i = 0; i < n; i++) {
      const out = 8 + ((i * 53) % 60) * lane, side = (i % 2 ? 1 : -1) * (8 + ((i * 37) % 30));
      if (harbour && Math.abs(side) < 10) continue;   // a harbour keeps a channel open
      const [x, z] = P(out, side), r = 1.2 + (i % 3), ht = 2.5 + (i % 4);
      A.cyl(x, 0.6 - ht / 2, z, r, 0, ht, 5, '#14100e', TILE.stone);
      F.cyl(x, 0.05, z, 3 + (i % 3), 3.6 + (i % 3), 0.3, 10, '#ffffff', TILE.white, true);   // the white water breaking on it (flat white, above the swell)
    }
    st(F, ALWAYS);
    if (rng() < 0.8) { const [x, z] = P(48 * lane, 20); A.push(x, -3, z, way, 1, 1, 1, 0, 0.45); A.cyl(0, 0, 0, 0.45, 0.35, 14, 5, '#4a3020', TILE.bark); A.box(0, 11.5, 0, 7, 0.3, 0.3, '#4a3020', TILE.bark); A.pop(); }
  } else if (reg === 'lantern') {   // two rows of lamps on floats lining the way in, lit day and night; a tall dark tower
    const G = mk(), pairs = harbour ? 5 : 3;
    for (let i = 0; i < pairs; i++) for (const side of [-11, 11]) {
      const [x, z] = P(8 + i * 16, side);
      A.cyl(x, -0.2, z, 1.4, 1.6, 0.8, 6, '#2a2018', TILE.planks); A.cyl(x, 0.2, z, 0.2, 0.2, 6, 4, '#1a1410', TILE.white, false);
      G.box(x, 5.6, z, 2.0, 2.0, 2.0, '#ffb040'); A.box(x, 7.7, z, 2.2, 0.3, 2.2, '#1a1410');
    }
    st(G, ALWAYS, mats.glow);
    if (harbour || rng() < 0.3) {
      const [tx, tz] = P(-6, -(h.shoreR(d, way + Math.PI / 2) + 30));
      A.cyl(tx, -1, tz, 4.5, 3, 41, 8, '#2a2420', TILE.stone);
      const T = mk(); T.box(tx, 40, tz, 5, 5, 5, '#ffc060'); st(T, ALWAYS, mats.glow);
    }
  } else if (reg === 'drowned') {   // roofs to the ridge and chimneys along the way in, a leaning belfry
    for (let i = 0; i < (harbour ? 6 : 4); i++) {
      const [x, z] = P(14 + Math.floor(i / 2) * 18, (i % 2 ? 1 : -1) * 16);
      A.push(x, 0, z, way + (rng() - 0.5) * 0.3);
      A.gable(0, -1.6, 0, 7, 3.6, 11, '#6a6064', TILE.roof, '#5a5256');
      A.box(2.2, -0.5, -2, 1.4, 3.8, 1.4, '#8a6a5a', TILE.stone);
      A.pop();
    }
    if (harbour || rng() < 0.4) { const [x, z] = P(50, -26); A.push(x, -3, z, way, 1, 1, 1, 0, 0.18); A.box(0, 0, 0, 5, 18, 5, '#7a7476', TILE.stone); A.cyl(0, 18, 0, 4, 0, 6, 4, '#4a4446', TILE.roof); A.pop(); }
  }
}
