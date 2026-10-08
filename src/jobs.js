import { hash2, mulberry32, pick, smoothstep } from './util.js';
import { FISH } from './fishing.js';
import { FRUIT_ORDER, FRUITS, fruitOf, fruitName, plural } from './fruit.js';
import { CELL } from './world.js';
import { dreadAtDistance } from './palette.js';
import { pxi } from './pixelui.js';

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

// ---------------------------------------------------------------- commissions (varied errands from harbour boards)

export { FRUIT_ORDER, FRUITS, fruitOf, fruitName, plural };

function freeWater(world, x, z, margin = 14) {
  const cx = Math.round(x / CELL), cz = Math.round(z / CELL);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const d = world.desc(cx + dx, cz + dz);
    if (d && Math.hypot(d.x - x, d.z - z) < d.r * 1.9 + margin) return false;
  }
  return true;
}

export function commissionsFor(world, from, serial) {
  const rng = mulberry32(hash2(from.seed, serial, 515));
  const dread = from.dread;
  const kinds = ['fish', 'fruit', 'crates', 'bounty', 'spot'].filter((k) => !(k === 'spot' && dread > 0.55));
  for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  const out = [];
  for (const k of kinds.slice(0, 2)) {
    const base = { id: `${from.id}#${serial}#${k}`, type: k, giverId: from.id, giverName: from.name };
    if (k === 'fish') {
      const pool = FISH.filter((f) => !f.night && dread >= f.min - 0.1 && dread <= f.max);
      const f = pool[Math.floor(rng() * pool.length) % pool.length], n = f.w < 2 ? 1 : 1 + Math.floor(rng() * 3);
      out.push({ ...base, species: f.id, n, reward: Math.min(220, Math.round(20 + f.price * (f.kg[0] + f.kg[1]) / 2 * n * 1.4 + 8 * n)) });
    } else if (k === 'fruit') {
      const fr = FRUIT_ORDER[Math.floor(rng() * FRUIT_ORDER.length)], n = 4 + Math.floor(rng() * 5);
      out.push({ ...base, fruit: fr, n, reward: 18 + n * 6 });
    } else if (k === 'crates') {
      let center = null;
      for (let t = 0; t < 14 && !center; t++) {
        const a = rng() * Math.PI * 2, dd = 170 + rng() * 260, x = from.x + Math.cos(a) * dd, z = from.z + Math.sin(a) * dd;
        if (freeWater(world, x, z, 60)) center = { x, z, dist: dd };
      }
      if (!center) continue;
      const crates = [];
      for (let i = 0; i < 3; i++) for (let t = 0; t < 12; t++) {
        const a = rng() * Math.PI * 2, dd = 10 + rng() * 48, x = center.x + Math.cos(a) * dd, z = center.z + Math.sin(a) * dd;
        if (freeWater(world, x, z, 8)) { crates.push({ x, z, got: false }); break; }
      }
      if (crates.length < 2) continue;
      out.push({ ...base, crates, center: { x: center.x, z: center.z }, reward: Math.round(55 + center.dist * 0.1 + crates.length * 10) });
    } else if (k === 'bounty') {
      const n = dread > 0.5 ? 1 : 1 + Math.floor(rng() * 2);
      out.push({ ...base, n, reward: 60 * n + 20 });
    } else if (k === 'spot') {
      const what = rng() < 0.7 ? 'dolphins' : 'whales', n = what === 'dolphins' ? 2 : 1;
      out.push({ ...base, what, n, reward: 35 * n + 20 });
    }
  }
  return out;
}

export const questNeed = (q) => (q.type === 'crates' ? q.crates.length : q.n);
export function questProgress(q, state) {
  switch (q.type) {
    case 'fish': return Math.min(q.n, state.catch.filter((f) => f.id === q.species).length);
    case 'fruit': return Math.min(q.n, state.fruit[q.fruit] || 0);
    case 'crates': return q.crates.filter((c) => c.got).length;
    case 'bounty': return Math.min(q.n, state.stats.sunk - q.base);
    case 'spot': return Math.min(q.n, state.stats[q.what] - q.base);
    default: return 0;
  }
}
export function questTitle(q, dread) {
  switch (q.type) {
    case 'fish': { const f = FISH.find((x) => x.id === q.species); return `Catch ${q.n} ${plural(f.name.toLowerCase(), q.n)}`; }
    case 'fruit': return `Bring ${q.n} ${plural(fruitName(q.fruit, dread), q.n)}`;
    case 'crates': return `Recover ${q.crates.length} lost crates`;
    case 'bounty': return `Sink ${q.n} ${plural('raider', q.n)}`;
    case 'spot': return `Spot ${q.n} ${q.n === 1 ? q.what.slice(0, -1) : q.what}`;
    default: return 'Errand';
  }
}
export const QUEST_ICON = { fish: pxi('fish'), fruit: pxi('banana'), crates: pxi('crate'), bounty: pxi('skull'), spot: pxi('dolphin') };
const FRUIT_ICON = { coconut: pxi('coconut'), banana: pxi('banana'), mango: pxi('mango'), pineapple: pxi('pineapple'), papaya: pxi('papaya') };
export const questIcon = (q) => (q.type === 'fruit' ? FRUIT_ICON[q.fruit] : QUEST_ICON[q.type]);
