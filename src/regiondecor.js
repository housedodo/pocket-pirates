// What each region puts on the water round its islands (2026-11-13, owner; docs/proposals/REGIONS.md). It goes with the region's own
// light (systems/regionlook.js): from a distance you can tell whose waters these are, and what they are like, without a word.
//   Crown:    a buoyed lane into every harbour (red to port, green to starboard, lit at night) and a signal mast with a pennant string
//   Free:     houses on stilts over the shallows, coloured lantern strings at night
//   Reef:     black coral heads in white breakers, a mast leaning out of the water
//   Lantern:  lamps on floats round the island, lit day and night
//   Drowned:  roofs to the ridge and chimneys, now and then a leaning belfry: a street under the water
// Built once with the island (world.js Island), in the island's own frame. Home Sound and the hand-made places are left alone.
import { TILE } from './textures.js';
import { mulberry32 } from './util.js';

const NIGHT = (i) => i.tod && i.tod.night > 0.45;

/** d: the island; A: its prop builder; extra: its state props; h: { shoreR, terrainHeight } from world.js */
export function regionDecor(d, A, extra, h) {
  const reg = d.region;
  if (!reg || d.lm || d.blight || Math.hypot(d.x, d.z) < 480) return;
  if (reg === 'drowned' && typeof window !== 'undefined' && window.__BUILD === 'demo') return;   // the demo has no deep
  const rng = mulberry32((d.seed || 1) * 7919 + 13);
  const st = (b, when) => (extra.states = extra.states || []).push({ b, when });
  const mk = () => new A.constructor();
  const dock = d.type === 'harbour' ? d.dockTh : null;
  const clear = (th) => dock == null || Math.abs(Math.atan2(Math.sin(th - dock), Math.cos(th - dock))) > 0.75;   // keep the approach to the pier free
  const at = (th, off) => { const R = h.shoreR(d, th) + off; return [Math.cos(th) * R, Math.sin(th) * R]; };
  const freeAngle = () => { for (let k = 0; k < 12; k++) { const th = rng() * Math.PI * 2; if (clear(th)) return th; } return null; };

  if (reg === 'crown') {
    if (dock != null) {   // the lane: pairs of buoys out from the pier head
      const L = mk(), cx = Math.cos(dock), cz = Math.sin(dock), px = -cz, pz = cx, base = h.shoreR(d, dock);
      for (let i = 0; i < 4; i++) {
        const r = base + 34 + i * 16, x = cx * r, z = cz * r;
        const [rx, rz] = [x + px * 8, z + pz * 8], [gx, gz] = [x - px * 8, z - pz * 8];
        A.cyl(rx, -1, rz, 0.9, 0.9, 3.2, 6, '#c8302a'); A.cyl(rx, 1.4, rz, 0.92, 0.92, 0.4, 6, '#f2f2ee', TILE.white, false);   // red can, white band
        A.cyl(gx, -1, gz, 1.2, 0.0, 3.8, 6, '#1f9a48');                                                                        // green cone
        L.box(rx, 2.3, rz, 0.5, 0.5, 0.5, '#ff4a40', TILE.glow); L.box(gx, 2.9, gz, 0.5, 0.5, 0.5, '#50ff80', TILE.glow);
      }
      st(L, NIGHT);
      // the signal mast on the point beside the pier, a string of pennants from the yard
      const th = dock + 0.55, R = h.shoreR(d, th) - 5, mx = Math.cos(th) * R, mz = Math.sin(th) * R, y = Math.max(0, h.terrainHeight(d, mx, mz));
      A.cyl(mx, y, mz, 0.3, 0.22, 14, 6, '#f0f0ea'); A.box(mx, y + 11.5, mz, 6, 0.25, 0.25, '#f0f0ea');
      const cols = ['#c8302a', '#f2d020', '#2050c8', '#f0f0ea', '#c8302a', '#2050c8'];
      cols.forEach((c, i) => { const ox = -2.6 + i * 1.05; A.tri([mx + ox - 0.45, y + 11.4, mz], [mx + ox + 0.45, y + 11.4, mz], [mx + ox, y + 9.9, mz], c, TILE.flag); });
    } else if (rng() < 0.45) {   // a lone daymark off other Crown isles
      const th = freeAngle(); if (th != null) { const [x, z] = at(th, 14); A.cyl(x, -1, z, 0.7, 0.7, 4.6, 6, '#c8302a'); A.cyl(x, 1.2, z, 0.72, 0.72, 0.8, 6, '#f2f2ee', TILE.white, false); }
    }
  } else if (reg === 'free') {
    const n = d.type === 'harbour' ? 3 : rng() < 0.6 ? 1 : 0;
    const L = mk();
    for (let i = 0; i < n; i++) {
      const th = dock != null ? dock + (i % 2 ? 1 : -1) * (0.95 + rng() * 0.6) : freeAngle(); if (th == null) continue;   // at a harbour: beside the approach, where you sail past them
      const [x, z] = at(th, 5 + rng() * 6), s = 0.8 + rng() * 0.35;
      for (const [ox, oz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) A.cyl(x + ox * s, -1.5, z + oz * s, 0.16, 0.16, 4.2 * s, 4, '#5a3a1c', TILE.bark, false);
      A.box(x, 2.4 * s, z, 5.2 * s, 0.35, 5.2 * s, '#8a6a3a', TILE.planks);
      A.box(x, 2.75 * s, z, 4 * s, 2.2 * s, 4 * s, '#c89a5a', TILE.wall);
      A.cyl(x, 4.9 * s, z, 3.9 * s, 0, 2.8 * s, 4, '#d8b860', TILE.roof);
      for (let k = 0; k < 5; k++) L.box(x - 2.6 * s + k * 1.3 * s, 4.7 * s - Math.sin(k / 4 * Math.PI) * 0.5, z + 2.3 * s, 0.4, 0.4, 0.4, ['#ffd060', '#ff7040', '#60d0ff', '#ff60c0', '#90ff60'][k], TILE.glow);
    }
    if (n) st(L, NIGHT);
  } else if (reg === 'reef') {
    const n = 5 + Math.floor(rng() * 5);
    for (let i = 0; i < n; i++) {
      const th = freeAngle(); if (th == null) continue;
      const [x, z] = at(th, 6 + rng() * 26), r = 1 + rng() * 1.6;
      A.blob(x, 0.2, z, r, 0.9 + rng() * 1.4, r, '#18120e', TILE.stone, 0.35, i + 1);
      A.cyl(x, -0.15, z, r * 2.3, r * 2.0, 0.35, 9, '#f4f8f4', TILE.white, true);   // the white water breaking on it
    }
    if (rng() < 0.5) { const th = freeAngle(); if (th != null) { const [x, z] = at(th, 18 + rng() * 10);
      A.push(x, -1, z, rng() * 6, 1, 1, 1, 0, 0.42); A.cyl(0, 0, 0, 0.32, 0.22, 11, 5, '#4a3020', TILE.bark); A.box(0, 7.5, 0, 5, 0.25, 0.25, '#4a3020', TILE.bark); A.pop(); } }
  } else if (reg === 'lantern') {
    const n = 4 + Math.floor(rng() * 3), th0 = rng() * Math.PI * 2, G = mk();
    for (let i = 0; i < n; i++) {
      const th = th0 + i / n * Math.PI * 2; if (!clear(th)) continue;
      const [x, z] = at(th, 15);
      A.cyl(x, -0.4, z, 1.3, 1.5, 0.8, 6, '#2a2018', TILE.planks); A.cyl(x, 0.3, z, 0.18, 0.18, 6.5, 4, '#1a1410', TILE.white, false);
      G.box(x, 6.6, z, 1.5, 1.5, 1.5, '#ffb040', TILE.glow); A.box(x, 8.1, z, 1.8, 0.3, 1.8, '#1a1410');
    }
    st(G, () => true);   // lit day and night (a glow piece lights only as its own layer)
  } else if (reg === 'drowned') {
    const n = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const th = freeAngle(); if (th == null) continue;
      const [x, z] = at(th, 10 + rng() * 26), w = 4 + rng() * 2;
      A.push(x, 0, z, th, 1, 1, 1, 0, 0);
      A.gable(0, -1.1, 0, w, 3.2, 6 + rng() * 3, '#3a3036', TILE.roof, '#4a4046');
      if (rng() < 0.7) A.box(w * 0.25, 0.4, 1.2, 0.9, 1.8, 0.9, '#7a6458', TILE.stone);
      A.pop();
    }
    if (rng() < 0.3) { const th = freeAngle(); if (th != null) { const [x, z] = at(th, 30);
      A.push(x, -2, z, rng() * 6, 1, 1, 1, 0.1, 0.16); A.box(0, 0, 0, 4.5, 16, 4.5, '#6e686a', TILE.stone); A.cyl(0, 16, 0, 3.6, 0, 5, 4, '#3e383a', TILE.roof); A.pop(); } }
  }
}
