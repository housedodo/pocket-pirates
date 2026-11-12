// The Two Players keep the Free Cays asleep (CANON 2026-11-12: they sailed, refused to throw, and found that their song soothes the
// sleeper). In the Free Cays on a night without storm the dread there cannot climb past stage 2 (LULL_CAP). Near Teo's sandbar or
// Ilse's rock their music carries over the water: the somber guitar is Teo's, the violin Ilse's (the Free Cays night recordings,
// fc_night and fc_violin in src/layers.js): placed where each of them sits, and nearer, they play more often, he starts and she finishes.
// Never explained.
import { rt } from '../core/runtime.js';

export const LULL_CAP = 0.45;                    // just under stage 3 (0.5)
const TEO = [495, 70], ILSE = [880, 190];        // landmarks.js: Teo's Sandbar (4,1), Ilse's Rock (8,2)
const HEAR = 600;                                // how far their playing carries over still water

rt.lullK = 0;          // 0..1: how far the Cays' night quiet holds the dread down

/** the dread the Cays allow tonight: the target pulled down to the cap as lullK rises */
export function lullDread(target) { return target - Math.max(0, target - LULL_CAP) * rt.lullK; }

/** each frame at sea (full game). ctx: { dt, free (in the Free Cays), night (0..1), storm (0..1) } */
export function lullabyTick({ dt, free, night, storm }) {
  const on = free && night > 0.4 && storm < 0.3;
  rt.lullK += ((on ? 1 : 0) - rt.lullK) * Math.min(1, dt * 0.2);
}

/** where the two of them are, for the music (src/layers.js): near 0..1, and the pan of Teo's guitar and Ilse's violin from the ship */
export function playersEar(ship) {
  const at = (p) => { const d = Math.hypot(p[0] - ship.pos.x, p[1] - ship.pos.z), rel = Math.atan2(p[0] - ship.pos.x, -(p[1] - ship.pos.z)) - ship.heading; return { d, pan: Math.sin(rel) * 0.8 }; };
  const t = at(TEO), i = at(ILSE), d = Math.min(t.d, i.d);
  return { near: Math.max(0, Math.min(1, (HEAR - d) / (HEAR * 0.5))), gPan: t.pan, vPan: i.pan };
}
