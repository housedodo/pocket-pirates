import { hash2, mulberry32, clamp } from './util.js';
import { dreadAtDistance } from './palette.js';
import { makeSectorName } from './lore.js';

// The sea is split into 550-unit sectors. Each has a name and belongs to a faction;
// ships spawned in a sector sail under that faction's colours.
export const SECTOR = 550;

export const FACTIONS = {
  crown:   { id: 'crown',   name: 'Crown Traders',    color: '#4a7fd8', tint: [0.72, 0.84, 1.0], mood: 0.0,  weights: { fisher: 0.2, merchant: 0.4, schooner: 0.1, galleon: 0.2, canoe: 0.1 } },
  free:    { id: 'free',    name: 'Free Cays',        color: '#4eb86a', tint: [0.75, 1.0, 0.8],  mood: 0.06, weights: { fisher: 0.35, merchant: 0.15, schooner: 0.15, galleon: 0.05, canoe: 0.3 } },
  reef:    { id: 'reef',    name: 'Reef Brotherhood', color: '#d8484a', tint: [1.0, 0.7, 0.66],  mood: -0.12, weights: { fisher: 0.1, merchant: 0.1, schooner: 0.55, galleon: 0.15, canoe: 0.1 } },
  lantern: { id: 'lantern', name: 'Lantern Guild',    color: '#e8b838', tint: [1.0, 0.92, 0.65], mood: 0.04, weights: { fisher: 0.25, merchant: 0.35, schooner: 0.1, galleon: 0.2, canoe: 0.1 } },
  drowned: { id: 'drowned', name: 'The Drowned',      color: '#a050d0', tint: [0.8, 0.7, 1.0],   mood: 0.0,  weights: { fisher: 0.3, merchant: 0.2, schooner: 0.2, galleon: 0.2, canoe: 0.1 } },
};
const ORDER = ['crown', 'free', 'reef', 'lantern'];
// The regions are real wedges round Tama (docs/WORLD_REDESIGN.md 5.4), angle = atan2(z, x) in degrees (north is -90):
// Crown north, Free Cays east, Reef south-west, Lantern west. Between two wedges the water is mixed: a seeded pick of the two nearest.
export const WEDGES = [
  { id: 'crown',   a: -80, half: 20 },
  { id: 'free',    a: 12,  half: 33 },
  { id: 'reef',    a: 120, half: 20 },
  { id: 'lantern', a: 188, half: 28 },
];
const angDiff = (a, b) => { let d = (a - b) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return Math.abs(d); };
export function wedgeFaction(cx, cz, rng) {
  const ang = Math.atan2(cz, cx) * 180 / Math.PI;
  const ranked = WEDGES.map((w) => ({ id: w.id, d: angDiff(ang, w.a) - w.half })).sort((p, q) => p.d - q.d);
  if (ranked[0].d <= 0) return ranked[0].id;                                                  // inside a wedge
  return rng() < 0.5 ? ranked[0].id : ranked[1].id;                                           // mixed water between two
}

export const sectorCoord = (x, z) => [Math.floor((x + SECTOR / 2) / SECTOR), Math.floor((z + SECTOR / 2) / SECTOR)];
export const sectorCenter = (sx, sz) => [sx * SECTOR, sz * SECTOR];

const cache = new Map();
/** each time the captain comes home from the deep sea, the deep sectors are named again (", again"): the sea does not keep its names */
let epoch = 0;
export function bumpSectors(n) { if (n === epoch) return; epoch = n; cache.clear(); }
export function sectorInfo(sx, sz, seed) {
  const key = `${sx},${sz},${seed}`;
  if (cache.has(key)) return cache.get(key);
  const rng = mulberry32(hash2(sx, sz, seed + 4242));
  const [cx, cz] = sectorCenter(sx, sz);
  const dread = dreadAtDistance(Math.hypot(cx, cz));
  const home = sx === 0 && sz === 0;
  const faction = home ? FACTIONS.crown : dread > 0.72 ? FACTIONS.drowned : FACTIONS[wedgeFaction(cx, cz, rng)];
  const info = { sx, sz, id: `${sx},${sz}`, name: home ? 'Tama Sound' : makeSectorName(rng, dread) + (epoch > 0 && dread >= 0.45 ? ', again' : ''), faction, dread, cx, cz };
  cache.set(key, info);
  return info;
}
export const sectorAt = (x, z, seed) => { const [sx, sz] = sectorCoord(x, z); return sectorInfo(sx, sz, seed); };

/** The faction whose look a village at (x, z) wears. Mostly its own sector's; within 90 units of a sector edge some villages
 *  (up to about 4 in 10 right at the edge) take the neighbour's across it, so regions blend instead of ending on a line. `h` is a hash of the island. */
export function lookFactionAt(x, z, seed, h) {
  const [sx, sz] = sectorCoord(x, z), [cx, cz] = sectorCenter(sx, sz);
  const dx = x - cx, dz = z - cz, ex = SECTOR / 2 - Math.abs(dx), ez = SECTOR / 2 - Math.abs(dz);   // distance to the nearest edge on each axis
  const u = (((h >>> 0) * 2246822519 >>> 0) / 4294967296);
  const own = sectorInfo(sx, sz, seed);
  const e = Math.min(ex, ez), BLEND = 90;
  if (e < BLEND && u < 0.4 * (1 - e / BLEND)) {
    const nb = ex < ez ? sectorInfo(sx + Math.sign(dx || 1), sz, seed) : sectorInfo(sx, sz + Math.sign(dz || 1), seed);
    if (nb.faction.id !== 'drowned' || own.faction.id === 'drowned') return nb.faction.id;
  }
  return own.faction.id;
}
