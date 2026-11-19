// Two small things a region keeps by its harbours (lore bible, adopted 2026-11-18): seen, never explained, never crowding (RULES 24b, 24c:
// harbours only, one each, nothing on the open sea, nothing to pick up). Called from regiondecor.js with its helpers.
//   Free Cays (L-14, L-15): a fire on a little sand spit off the way in, lit on a still night "for the players"; on a storm night it is out,
//     like the music. A courtesy only: it does nothing (never a second way to keep the Cays quiet).
//   Drowned (L-23): a tide pole by the pier, ringed white by every keeper, the oldest at the bottom; the weed line stands above them all.
import { TILE } from './textures.js';
import { mats } from './psx.js';

/** h: { P, clearOf, st, mk, harbour } from regionDecor */
export function customProps(d, A, h) {
  if (!h.harbour) return;
  const spot = (out, side) => { let [x, z] = h.P(out, side); if (!h.clearOf(x, z)) [x, z] = h.P(out, -side); return h.clearOf(x, z) ? [x, z] : null; };
  if (d.region === 'free') {
    const p = spot(56, -34); if (!p) return;
    const [x, z] = p;
    A.cyl(x, -0.9, z, 5.5, 4, 1.2, 9, '#e6d6a6', TILE.white, false);   // the spit, barely above the water
    A.box(x - 0.6, 0.45, z, 2.2, 0.35, 0.4, '#4a3020', TILE.bark); A.box(x + 0.4, 0.45, z + 0.3, 0.4, 0.35, 2.0, '#4a3020', TILE.bark);   // the laid sticks
    const F = h.mk(); F.box(x, 0.9, z, 0.9, 0.9, 0.9, '#ff9030'); F.box(x + 0.2, 1.6, z - 0.1, 0.5, 0.6, 0.5, '#ffd060');
    h.st(F, (i) => i.tod && i.tod.night > 0.45 && !!(i.gctx && i.gctx.still), mats.glow);
  } else if (d.region === 'drowned') {
    const p = spot(5, -9); if (!p) return;
    const [x, z] = p;
    A.cyl(x, -4, z, 0.35, 0.3, 10, 6, '#2e2826', TILE.bark);
    for (let k = 0; k < 5; k++) A.cyl(x, -1.6 + k * 0.7, z, 0.4, 0.4, 0.22, 6, k ? '#e8e6dc' : '#b8b4a8', TILE.white, false);   // the keepers' rings, the oldest at the bottom
    A.cyl(x, 2.4, z, 0.44, 0.44, 0.7, 6, '#3c5a30', TILE.white, false);   // the weed line, above them all
    for (let k = 0; k < 6; k++) A.box(x + 0.36, 3.4 + k * 0.42, z, 0.18, 0.07, 0.3, '#d8d4c4', TILE.white);   // a second scale, no units, its lowest notch above any water remembered (lore micro 3, 2026-11-19); nobody says
  }
}
