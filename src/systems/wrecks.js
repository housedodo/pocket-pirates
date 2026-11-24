// Fixed wrecks (owner, 2026-11-24: "sunken ships should appear more specialized, concrete spots, and not random"). The random half-sunk
// wrecks are gone (seafeatures.js); six named ones lie where the seed puts them, in open water near their region's bearing, each with
// its own find and its own line. Seen on the water the same way (a hull and a mast with a rag); heard of on the pier in their water
// (`wreckRumour`, marked on the chart as a rumour); one is shown by the Patience's chart (raiders.js); the last only far out.
import { state } from '../core/state.js';
import { CELL } from '../world.js';
import { bearingName } from '../jobs.js';
import { pierOf } from '../world.js';
import { groupSpots } from './shallows.js';

export const WRECKS = [
  { id: 'payship', name: 'a Crown payship', region: 'crown', a: -64, r: 820, gold: 140, text: 'A Crown payship on her side, her strongboxes split. The coins left in them are all of one year, and the year has not come yet.' },
  { id: 'tender', name: 'a Guild oil tender', region: 'lantern', a: 196, r: 760, gold: 90, oil: true, text: 'A Guild oil tender, low and broad. Her barrels are still sealed. One of them is warm to the hand.' },
  { id: 'hulk', name: 'an old hulk', region: 'reef', a: 112, r: 940, gold: 70, dark: true, text: 'An old hulk with chains along her hold, every one of them open. The keys hang on a nail by the hatch, neatly, in a row.' },
  { id: 'husband', name: 'a small boat on its side', region: 'free', a: 2, r: 1000, gold: 30, text: 'A small boat on its side, the Patience\'s colours under the weed. Inside the hatch a name is carved, and under it, smaller, the Merry Gull.' },
  { id: 'brig', name: 'a merchant brig', region: 'home', a: 150, r: 330, gold: 60, text: 'A merchant brig run hard aground on nothing. Her chart is open on the table: it shows a reef here. There has never been a reef here.' },
  { id: 'gull', name: 'a ship like the Gull', region: 'drowned', a: 40, r: 1760, gold: 0, dark: true, text: 'A ship in the Gull\'s colours, lower in the water than she ought to be. Her name on the stern is your ship\'s name, and the paint is older than yours.' },
];
let placed = null;
/** where each wreck lies on this seed: the first cell, spiralling out from its bearing, whose nine cells are open water */
export function fixedWrecks(world) {
  if (placed && placed.seed === world.seed) return placed.list;
  const list = [], groups = groupSpots(), taken = [];
  // its own cell open, nothing within 60 of it in the cells around, clear of the island groups and of each other; within three cells of its bearing
  const fits = (cx, cz) => {
    if (world.desc(cx, cz)) return false;
    const x = cx * CELL, z = cz * CELL;
    for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) { const d = world.desc(cx + j, cz + k); if (d && Math.hypot(d.x - x, d.z - z) - d.r < 60) return false; }
    return !groups.some((g) => Math.hypot(g.x - x, g.z - z) < 220) && !taken.some((t) => Math.hypot(t.x - x, t.z - z) < 300);
  };
  for (const w of WRECKS) {
    const a = w.a * Math.PI / 180, c0x = Math.round(Math.cos(a) * w.r / CELL), c0z = Math.round(Math.sin(a) * w.r / CELL);
    let at = null;
    for (let ring = 0; ring <= 3 && !at; ring++) for (let dz = -ring; dz <= ring && !at; dz++) for (let dx = -ring; dx <= ring && !at; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
      if (fits(c0x + dx, c0z + dz)) at = { cx: c0x + dx, cz: c0z + dz };
    }
    if (at) { const o = { ...w, cx: at.cx, cz: at.cz, x: at.cx * CELL + 18, z: at.cz * CELL - 12 }; list.push(o); taken.push(o); }
  }
  placed = { seed: world.seed, list };
  return list;
}
export const wreckInCell = (world, cx, cz) => fixedWrecks(world).find((w) => w.cx === cx && w.cz === cz) || null;
/** put a wreck on the chart as a rumour (the Patience's chart, a voice on the pier) */
export function revealWreck(world, id, source) {
  const w = fixedWrecks(world).find((x) => x.id === id); if (!w) return null;
  const key = 'wreck:' + id; if (state.rumoured[key] || (state.collected && state.collected.has && state.collected.has('fw:' + id))) return null;
  state.rumoured[key] = { name: w.name.charAt(0).toUpperCase() + w.name.slice(1), x: Math.round(w.x), z: Math.round(w.z), source, found: false };
  return w;
}
export const WRECK_RUMOUR_P = 0.25;
/** a voice on the pier at harbour d about a wreck in its own water, or null */
export function wreckRumour(world, d) {
  if (Math.random() >= WRECK_RUMOUR_P) return null;
  const pier = pierOf(d);
  const w = fixedWrecks(world).filter((x) => x.region === d.region && x.id !== 'gull' && x.id !== 'husband' && !state.rumoured['wreck:' + x.id] && !(state.collected && state.collected.has('fw:' + x.id)))
    .sort((p, q) => Math.hypot(p.x - pier.x, p.z - pier.z) - Math.hypot(q.x - pier.x, q.z - pier.z))[0];
  if (!w) return null;
  revealWreck(world, w.id, d.name);
  return { speaker: 'oldsalt', text: `There is ${w.name} gone down ${bearingName(w.x - pier.x, w.z - pier.z)} of here. Nobody goes out to her. You might.`, story: true, rumour: true };
}
