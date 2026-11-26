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
import { hash2 } from './util.js';
import { mats } from './psx.js';
import { mulberry32 } from './util.js';
import { customProps } from './customprops.js';
import { REEFS_ON } from './core/config.js';
import { REEF_SLICK_TIDE, REEF_RING_TIDE, drownedOpen } from './regions.js';

const NIGHT = (i) => i.tod && i.tod.night > 0.45;
let DAY = 0;   // the Reef's shoals are laid out again each dawn (main.js sets the day; world.refresh rebuilds the Reef islands)
export const setDecorDay = (n) => { DAY = n; };
let pennantsOf = () => 6;   // M-CROWN-1: how many pennants a Crown harbour's mast flies (systems/crown.js sets it)
export const setPennants = (fn) => { pennantsOf = fn; };
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
  // keep clear of the side jetty and the fishing boat's berth beside it (world.js d.jetty; owner 2026-11-14: nothing may pin the ship)
  const J = d.jetty, clearOf = (x, z) => { if (!J) return true; const jx = Math.cos(J.th), jz = Math.sin(J.th), t = x * jx + z * jz, q = Math.abs(-x * jz + z * jx); return !(t > J.z0 - 4 && t < J.z1 + 10 && q < 14); };

  if (reg === 'crown') {
    if (harbour) {   // the buoyed lane: five pairs out from the pier head, red to one side, green to the other
      const L = mk();
      for (let i = 0; i < 5; i++) {
        const out = 12 + i * 11, [rx, rz] = P(out, 9), [gx, gz] = P(out, -9); if (!clearOf(rx, rz) || !clearOf(gx, gz)) continue;
        A.cyl(rx, -1, rz, 0.6, 0.6, 2.4, 6, '#c8302a'); A.cyl(rx, 0.7, rz, 0.62, 0.62, 0.35, 6, '#f2f2ee', TILE.white, false);   // red can, white band (smaller: owner 2026-11-18)
        A.cyl(gx, -1, gz, 0.75, 0.0, 2.7, 6, '#1f9a48');                                                                          // green cone
        L.box(rx, 1.65, rz, 0.55, 0.55, 0.55, '#ff3a30'); L.box(gx, 1.9, gz, 0.55, 0.55, 0.55, '#30ff70');   // small lamps on the buoys
      }
      st(L, NIGHT, mats.glow);
      // the signal mast at the water's edge beside the lane: tall, white, a yard with a string of pennants
      let [mx, mz] = P(-2, 20); if (!clearOf(mx, mz)) [mx, mz] = P(-2, -20);
      A.cyl(mx, -1, mz, 0.5, 0.4, 27, 6, '#f2f2ee'); A.box(mx, 21.8, mz, 10, 0.4, 0.4, '#f2f2ee');
      const cols = ['#c8302a', '#f2d020', '#2050c8', '#f2f2ee', '#c8302a', '#2050c8'];
      cols.forEach((c, i) => { const o = -4.5 + i * 1.8, px = mx + sx * o, pz = mz + sz * o, Pn = new A.constructor(); Pn.cyl(px, 19.3, pz, 0.0, 0.9, 2.4, 3, c, TILE.flag); st(Pn, (isl) => pennantsOf(isl.desc.id) > i); });   // each its own, struck one by one (M-CROWN-1)
    } else if (rng() < 0.5) {   // a lone daymark off other Crown isles
      const [x, z] = P(14, 0); A.cyl(x, -1, z, 0.9, 0.9, 5, 6, '#c8302a'); A.cyl(x, 1.6, z, 0.92, 0.92, 0.9, 6, '#f2f2ee', TILE.white, false);
    }
  } else if (reg === 'free') {   // houses on stilts either side of the way in, canoes, lantern strings at night
    const spots = harbour ? [[22, -24, 1], [10, 22, 1.2], [34, -40, 0.9], [26, 38, 0.8]] : rng() < 0.6 ? [[14, (rng() < 0.5 ? -1 : 1) * 18, 0.9]] : [];
    const L = mk();
    for (const [out, side0, s] of spots) {
      let side = side0, [x, z] = P(out, side); if (!clearOf(x, z)) { side = -side; [x, z] = P(out, side); if (!clearOf(x, z)) continue; }
      for (const [ox, oz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) A.cyl(x + ox * s, -1.5 * s, z + oz * s, 0.25, 0.25, 6 * s, 4, '#5a3a1c', TILE.bark, false);
      A.box(x, 3 * s, z, 7 * s, 3 * s, 7 * s, '#c89a5a', TILE.wall);
      A.cyl(x, 6 * s, z, 6.5 * s, 0, 4 * s, 4, '#e0c070', TILE.roof);
      for (let k = 0; k < 7; k++) { const o = -6 * s + k * 2 * s, y = 6.6 * s - Math.sin(k / 6 * Math.PI) * 1.2 * s; L.box(x + sx * o - fx * 3.8 * s, y, z + sz * o - fz * 3.8 * s, 0.7, 0.7, 0.7, ['#ffd060', '#ff7040', '#60d0ff', '#ff60c0', '#90ff60', '#ffd060', '#ff7040'][k]); }
    }
    if (spots.length) st(L, NIGHT, mats.glow);
    if (harbour) for (const side of [-12, 14]) { const [x, z] = P(40, side); A.push(x, -0.2, z, way + 0.3); A.box(0, 0, 0, 1.4, 0.6, 7, '#8a4a20', TILE.planks); A.pop(); }   // canoes
  } else if (reg === 'reef') {   // coral heads in white water across the way in, a mast leaning out of the water
    // M-REEF-1 Teeth under the tide (2026-11-17): the heads bite the same at any tide (reef.js), but how they show follows the water:
    // at low and middle tide black teeth in white water; above REEF_SLICK_TIDE only their tips, awash in a pale-green slick; above
    // REEF_RING_TIDE nothing but a faint ripple ring over each head (the floor: there is always a tell)
    const n = REEFS_ON ? Math.round(14 * lane) : 0, F = mk(), S = mk(), R = mk(), T = new A.constructor(), U = new A.constructor(), rd = mulberry32((d.seed || 1) * 31 + DAY * 977 + 5);   // where the heads are today
    d.coral = [];
    for (let i = 0; i < n; i++) {
      const out = 8 + rd() * 60 * lane, side = (rd() < 0.5 ? 1 : -1) * (8 + rd() * 30);
      if (harbour && Math.abs(side) < 10) continue;   // a harbour keeps a channel open
      const [x, z] = P(out, side), r = 1.2 + (i % 3), ht = 2.5 + (i % 4);
      if (!clearOf(x, z)) continue;
      d.coral.push({ x: d.x + x, z: d.z + z, r });   // world position, for grounding (main.js)
      T.cyl(x, 0.6 - ht / 2, z, r, 0, ht, 5, '#14100e', TILE.stone);                                   // the teeth, standing
      U.cyl(x, -ht + 0.75, z, r, 0, ht, 5, '#14100e', TILE.stone);                                      // only the tips, awash
      // the white water breaking on it: a tight collar round the head, then a pale-aqua ring that fades it into the sea (owner 2026-11-18:
      // the wide flat white discs read as plates with a hard edge)
      F.cyl(x, 0.08, z, r + 0.5, r + 0.9, 0.3, 10, '#eef8f2', TILE.white, true);
      F.cyl(x, 0.0, z, r + 0.9, r + 2.2, 0.3, 10, '#9ed8c2', TILE.white, true);
      S.cyl(x, 0.2, z, r + 0.4, r + 1.4, 0.3, 10, '#a6dcc4', TILE.white, true);   // a pale-green slick over the head (raised: the island sinks with the tide)
      R.cyl(x, 0.3, z, r + 1.2, r + 1.2, 0.3, 12, '#cfeadf', TILE.white, false);   // a faint ripple ring (an open band: a line seen from above)
    }
    const tide = (i) => i.tide || 0;
    st(T, (i) => tide(i) <= REEF_SLICK_TIDE); st(F, (i) => tide(i) <= REEF_SLICK_TIDE);
    st(U, (i) => tide(i) > REEF_SLICK_TIDE && tide(i) <= REEF_RING_TIDE); st(S, (i) => tide(i) > REEF_SLICK_TIDE && tide(i) <= REEF_RING_TIDE);
    st(R, (i) => tide(i) > REEF_RING_TIDE);
    if (rng() < 0.8) { const [x, z] = P(48 * lane, 20); A.push(x, -3, z, way, 1, 1, 1, 0, 0.45); A.cyl(0, 0, 0, 0.45, 0.35, 14, 5, '#4a3020', TILE.bark); A.box(0, 11.5, 0, 7, 0.3, 0.3, '#4a3020', TILE.bark); A.pop(); }
  } else if (reg === 'lantern') {   // two rows of lamps on floats lining the way in, lit day and night; a tall dark tower
    const G = mk(), pairs = harbour ? 5 : 3;
    for (let i = 0; i < pairs; i++) for (const side of [-11, 11]) {
      const [x, z] = P(8 + i * 16, side); if (!clearOf(x, z)) continue;
      A.cyl(x, -0.2, z, 0.9, 1.0, 0.6, 6, '#2a2018', TILE.planks); A.cyl(x, 0.2, z, 0.14, 0.14, 3.4, 4, '#1a1410', TILE.white, false);   // smaller floats (owner 2026-11-18)
      G.box(x, 3.4, z, 0.8, 0.8, 0.8, '#ffb040'); A.box(x, 4.0, z, 1.0, 0.2, 1.0, '#1a1410');
    }
    st(G, ALWAYS, mats.glow);
    if (towerHere(d, h)) {   // spaced out (owner, 2026-11-19): never two within TOWER_GAP; which of the three is this island's own
      const [tx, tz] = P(-6, -(h.shoreR(d, way + Math.PI / 2) + 30));
      const T = mk();
      guildTower(TOWER_KINDS[(d.seed >>> 0) % TOWER_KINDS.length], A, T, tx, tz, way);
      st(T, ALWAYS, mats.glow);
    }
  } else if (reg === 'drowned') {   // roofs to the ridge and chimneys along the way in, a leaning belfry
    for (let i = 0; i < (harbour ? 6 : 4); i++) {
      const [x, z] = P(14 + Math.floor(i / 2) * 18, (i % 2 ? 1 : -1) * 16); if (!clearOf(x, z)) continue;
      A.push(x, 0, z, way + (rng() - 0.5) * 0.3);
      A.gable(0, -1.6, 0, 7, 3.6, 11, '#6a6064', TILE.roof, '#5a5256');
      A.box(2.2, -0.5, -2, 1.4, 3.8, 1.4, '#8a6a5a', TILE.stone);
      A.pop();
    }
    if (harbour && d.dockGeom) {   // M-DROWN-4: above DROWNED_OPEN_TIDE a film of water lies over the pier's planks, broken white at its edges
      const { z0, z1 } = d.dockGeom, W = mk(), ry = Math.PI / 2 - d.dockTh, zc = (z0 + z1) / 2;
      W.push(0, 0, 0, ry); W.box(0, 0.86, zc, 3.4, 0.03, z1 - z0 + 0.6, '#6a8088', TILE.white);
      for (let k = 0; k < 6; k++) W.box((k % 2 ? 1 : -1) * 1.6, 0.88, z0 + (k + 0.5) * (z1 - z0) / 6, 0.4, 0.07, 1.6, '#c8d4d4', TILE.white);
      W.pop(); st(W, (i) => !drownedOpen(i.tide || 0));
    }
    if (harbour || rng() < 0.4) { const [x, z] = P(50, -26); A.push(x, -3, z, way, 1, 1, 1, 0, 0.18); A.box(0, 0, 0, 5, 18, 5, '#7a7476', TILE.stone); A.cyl(0, 18, 0, 4, 0, 6, 4, '#4a4446', TILE.roof); A.pop(); }
  }
  customProps(d, A, { P, clearOf, st, mk, harbour });   // a fire for the players, a tide pole (customprops.js, the lore bible)
}

// ---- the Guild's towers, half fortress and half lighthouse (owner, 2026-11-19). Of four designs the owner kept A, the bastion light,
// without its drum, and then all three of its versions, spread out so the water does not feel crowded: a Guild harbour or (TOWER_P) an
// isle in Lantern water may have one, but never within TOWER_GAP of another; the harbour, then the higher roll, wins. The old dark
// column and the trial flag are gone. Each stands on a few rocks at the waterline.
//   a1  the plain light: a tall banded tower, a crenellated parapet under the lamp, a cone roof
//   a2  the battlemented light: a tapering banded tower, a corbelled ring (machicolations) carrying battlements, a square lamp turret, a pyramid
//   a3  the watch light: a slim tower with arrow slits and a small corbelled turret hung on one side near the top, a crenellated gallery, a cone
export const TOWER_KINDS = ['a1', 'a2', 'a3'], TOWER_P = 0.3, TOWER_GAP = 420;
const towerRoll = (d) => (hash2(d.seed | 0, 41, 7) % 1000) / 1000;
const towerCandidate = (d) => !!d && d.region === 'lantern' && !d.lm && (d.type === 'harbour' || towerRoll(d) < TOWER_P);
const towerRank = (d) => (d.type === 'harbour' ? 2 : 0) + towerRoll(d);
const towerMemo = new Map();
/** does this island carry a tower? Its candidates within TOWER_GAP are compared, so the answer is the same whichever is built first */
export function towerHere(d, h) {
  if (!towerCandidate(d)) return false;
  const key = `${h.seed}:${d.id}`; if (towerMemo.has(key)) return towerMemo.get(key);
  const n = Math.ceil(TOWER_GAP / CELL_W), [cx, cz] = d.id.split(',').map(Number), me = towerRank(d);
  let ok = true;
  for (let dz = -n; dz <= n && ok; dz++) for (let dx = -n; dx <= n && ok; dx++) {
    if (!dx && !dz) continue;
    const o = h.desc(cx + dx, cz + dz);
    if (towerCandidate(o) && Math.hypot(o.x - d.x, o.z - d.z) < TOWER_GAP && towerRank(o) > me) ok = false;
  }
  towerMemo.set(key, ok); return ok;
}
const CELL_W = 110;   // world.js CELL (not imported: world.js imports this file)
function guildTower(kind, A, T, x, z, way) {
  const STONE = '#5a5248', DARK = '#2a2420', LIME = '#e8e2d2', LAMP = '#ffc060';
  const rocks = (r) => { for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2 + 0.4; A.blob(x + Math.cos(t) * r, -0.6, z + Math.sin(t) * r, 1.8, 1.2, 1.5, '#3a3634', TILE.stone, 0.3, i); } };
  const merlons = (y, r, n, w = 1.0) => { for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; A.push(x + Math.cos(t) * r, y, z + Math.sin(t) * r, -t); A.box(0, 0, 0, w, 1.1, 1.2, STONE, TILE.stone); A.pop(); } };
  if (kind === 'a1') {
    rocks(3.4);
    A.cyl(x, -1, z, 3.4, 2.7, 24, 8, LIME, TILE.stone);
    for (const y of [6, 13, 19]) A.cyl(x, y, z, 3.15, 2.95, 0.9, 8, DARK, TILE.white, false);   // black bands
    A.cyl(x, 23, z, 3.6, 3.6, 0.6, 8, STONE, TILE.stone); merlons(23.6, 3.2, 8);   // the parapet
    T.box(x, 24.6, z, 2.6, 2.4, 2.6, LAMP);
    A.cyl(x, 27, z, 2.2, 0.2, 2.2, 8, DARK, TILE.roof);
  } else if (kind === 'a2') {
    rocks(3.8);
    for (let k = 0; k < 4; k++) { const r0 = 3.8 - k * 0.25, r1 = 3.8 - (k + 1) * 0.25; A.cyl(x, -1 + k * 5.5, z, r0, r1, 5.5, 8, k % 2 ? STONE : LIME, TILE.stone, false); }   // banded, tapering
    A.cyl(x, 21, z, 2.8, 3.9, 1.4, 8, DARK, TILE.stone);   // the corbelled ring
    A.cyl(x, 22.4, z, 3.9, 3.9, 0.5, 8, STONE, TILE.stone); merlons(22.9, 3.5, 10, 1.1);   // battlements
    A.box(x, 22.9, z, 2.8, 1.2, 2.8, DARK, TILE.white); T.box(x, 24.1, z, 2.4, 2.2, 2.4, LAMP);   // the square lamp turret
    A.cyl(x, 26.3, z, 2.4, 0.1, 2.4, 4, DARK, TILE.roof);   // a pyramid
  } else {
    rocks(3.0);
    A.cyl(x, -1, z, 3.0, 2.5, 25, 8, LIME, TILE.stone);
    for (const y of [5, 10, 15]) for (const t of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) A.box(x + Math.cos(t + way) * 2.75, y, z + Math.sin(t + way) * 2.75, 0.3, 1.3, 0.3, '#100c0a');   // arrow slits
    { const bx = x + Math.cos(way) * 3.1, bz = z + Math.sin(way) * 3.1;   // the turret hung on one side near the top
      A.cyl(bx, 16.5, bz, 0.4, 1.3, 1.6, 6, STONE, TILE.stone); A.cyl(bx, 18.1, bz, 1.3, 1.3, 3, 6, STONE, TILE.stone); A.cyl(bx, 21.1, bz, 1.5, 0.1, 1.8, 6, DARK, TILE.roof); }
    A.cyl(x, 24, z, 2.6, 3.4, 0.9, 8, DARK, TILE.stone); merlons(24.9, 3.0, 8, 0.9);   // a crenellated gallery
    T.box(x, 25.4, z, 2.3, 2.3, 2.3, LAMP);
    A.cyl(x, 27.7, z, 2.0, 0.2, 2.2, 8, DARK, TILE.roof);
  }
}
