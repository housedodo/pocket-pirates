import { hash2, mulberry32, pick, smoothstep } from './util.js';
import { CELL } from './world.js';
import { dreadAtDistance } from './palette.js';

// Reasons to sail: delivery jobs, rumours of treasure, and harbour reputation.
const ITEMS_BRIGHT = ['a crate of oranges', 'a letter for the harbourmaster', 'a sack of ship biscuits', 'a parcel of fine tea', 'a cage of canaries', 'a barrel of lamp oil'];
const ITEMS_DARK = ['a sealed jar (do not open)', 'a letter in a language nobody speaks', 'a crate that is slightly too warm', 'a bell with no clapper', 'a box that has stopped ticking', 'a lantern, unlit, heavy'];
const DIRS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

export const bearingName = (dx, dz) => DIRS[Math.round(((Math.atan2(dx, -dz) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];

export function nearby(world, x, z, minD, maxD, type) {
  const R = Math.ceil(maxD / CELL) + 1, cx = Math.round(x / CELL), cz = Math.round(z / CELL), out = [];
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const d = world.desc(cx + dx, cz + dz);
    if (!d || d.type !== type) continue;
    const dist = Math.hypot(d.x - x, d.z - z);
    if (dist >= minD && dist <= maxD) out.push({ d, dist });
  }
  return out;
}

export function makeJob(world, from, serial) {
  const rng = mulberry32(hash2(from.seed, serial, 99));
  const list = nearby(world, from.x, from.z, 120, 750, 'harbour').filter((o) => o.d.id !== from.id);
  if (!list.length) return null;
  const { d: to, dist } = list[Math.floor(rng() * list.length) % list.length];
  const dark = rng() < smoothstep(0.35, 0.8, dreadAtDistance(Math.hypot(from.x, from.z)));
  return {
    fromId: from.id, fromName: from.name, toId: to.id, toName: to.name, x: to.x, z: to.z,
    reward: Math.round(40 + dist * 0.22 + to.dread * 60), item: pick(rng, dark ? ITEMS_DARK : ITEMS_BRIGHT), dark, dist: Math.round(dist),
  };
}

export function findRumour(world, from, state) {
  const list = nearby(world, from.x, from.z, 30, 520, 'treasure')
    .filter((o) => !state.discovered[o.d.id] && !state.rumoured[o.d.id] && !state.dug.has(o.d.id));
  list.sort((a, b) => a.dist - b.dist);
  return list.length ? list[0] : null;
}

export const repOf = (state, id) => state.rep[id] || (state.rep[id] = { visits: 0, deliveries: 0 });
export const friendLevel = (r) => Math.min(3, Math.floor((r.visits + 2 * r.deliveries) / 3));
export const discount = (r) => 1 - 0.05 * friendLevel(r);
export const RUMOUR_COST = 40;
