// Shallow water (owner, 2026-11-23: "make it look more natural... no drawn circles or game signs, only natural obstruction"; "have 3
// smaller islands on very shallow water so you can just sail between them with the rowboat"; "do all your suggestions how you recommended").
//   shelves  patches of sand or coral just under the water, in front of the boat's landings and round the three island groups. The sea
//            draws them like the water by any shore (ocean.js: uIsl): pale sand showing through, the swell lying down, foam washing at
//            the edge. Each is a loose chain of overlapping discs, never one ring. The Gull grounds on them (a creak, she stops dead and
//            is set back off); the ship's boat rows over.
//   groups   three clusters of small islands in water too shallow for the Gull, placed by the seed in open water of their region:
//            the Sandbar Cays (Free Cays): three low sand cays and a stilt hut between them, empty, the kettle warm;
//            the Mangroves (Reef waters): three dark tangles on their roots, channels between, fireflies at night, a camp in the middle;
//            the Tide Rocks (Crown waters): three rocks the low tide joins with sand spits; in the middle a stone only the low water shows.
//   Full game only; the demo has neither the boat nor these.
import * as THREE from 'three';
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { scene } from '../core/engine.js';
import { Builder } from '../builder.js';
import { mats } from '../psx.js';
import { TILE } from '../textures.js';
import { toast } from '../ui/dom.js';
import { CELL } from '../world.js';
import { hash2, mulberry32 } from '../util.js';
import { tod } from '../daynight.js';
import { lowWater, waterAt } from './calendar.js';
import { handOn } from './hands.js';
import { SANDBANKS_ON } from '../core/config.js';

const DEMO = () => typeof window !== 'undefined' && window.__BUILD === 'demo';
export const GROUND_PAD = 1.5;   // the Gull's keel finds the shelf this far inside its edge
const shelves = [];              // [x, z, r]: every disc, in the world
let built = false, groups = [];

/** a loose chain of discs along a line (local to a frame: origin, +z seaward, the x axis along the shore), with jitter from the seed */
function chain(ox, oz, ang, pts, rng) {
  if (!SANDBANKS_ON) return;
  const c = Math.cos(ang), s = Math.sin(ang), discs = [];
  for (const [lx, lz, r] of pts) {
    const jx = lx + (rng() - 0.5) * 2.4, jz = lz + (rng() - 0.5) * 2.4, jr = r * (0.75 + rng() * 0.5);
    discs.push([ox + jx * c + jz * s, oz - jx * s + jz * c, jr]);
  }
  addBank(discs);
}
// ---- sandbanks (owner, 2026-11-26: "below the islands, or where the reefs were, so the water is too shallow for the big ship... only at
// specific positions where it matters for the story or progression... like real islands, where the ship lies further out and the
// approach is by rowboat"): only in front of the boat landings and round the three island groups. Nothing stands out of the water:
// the sea paints the pale shallows over each bank, from one fixed entry per bank (its middle and reach), never one per disc (those
// came and went as you sailed). The Gull grounds on the discs; the boat rows over.
const banks = [];   // { x, z, r }
function addBank(discs) {
  for (const d of discs) shelves.push(d);
  if (DEMO() || !discs.length) return;
  let cx = 0, cz = 0; for (const [x, z] of discs) { cx += x; cz += z; } cx /= discs.length; cz /= discs.length;
  let R = 0; for (const [x, z, r] of discs) R = Math.max(R, Math.hypot(x - cx, z - cz) + r);
  banks.push({ x: cx, z: cz, r: R });
}

// ---- the three groups: where (a region's bearing and distance from Tama; the seed finds open water near it)
export const GROUPS = [
  { id: 'cays', name: 'the Sandbar Cays', a: 18, r: 760 },
  { id: 'mangrove', name: 'the Mangroves', a: 128, r: 820 },
  { id: 'tide', name: 'the Tide Rocks', a: -76, r: 700 },
];
function openAt(cx, cz) {   // nine cells of open water round (cx, cz), on this seed
  if (!G.world) return false;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (G.world.desc(cx + dx, cz + dz)) return false;
  return true;
}
/** where the three groups lie on this seed (pure: wrecks.js keeps clear of them) */
export const groupSpots = () => GROUPS.map((g) => ({ id: g.id, ...(placeGroup(g) || { x: 1e9, z: 1e9 }) }));
function placeGroup(g) {
  const a = g.a * Math.PI / 180, bx = Math.cos(a) * g.r, bz = Math.sin(a) * g.r;
  const c0x = Math.round(bx / CELL), c0z = Math.round(bz / CELL);
  for (let ring = 0; ring <= 4; ring++) for (let dz = -ring; dz <= ring; dz++) for (let dx = -ring; dx <= ring; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
    if (openAt(c0x + dx, c0z + dz)) return { x: (c0x + dx) * CELL, z: (c0z + dz) * CELL };
  }
  return null;
}
const SAND = '#e8dcb0', SAND2 = '#d8c890', PALM = '#3a7a30', TRUNK = '#7a5a30', ROCK = '#7e766a', ROCK2 = '#948c7e', MANG = '#2a4a24', MANG2 = '#36582c', ROOT = '#3a2a1a';
function palm(b, x, y, z, h, lean) { for (let i = 0; i < 5; i++) b.box(x + lean * i * 0.18, y + i * h / 5, z, 0.22, h / 5 + 0.02, 0.22, TRUNK, TILE.bark); const tx = x + lean * 0.9, ty = y + h; for (let i = 0; i < 5; i++) { const t = i * 1.26; b.box(tx + Math.cos(t) * 0.9, ty - 0.1, z + Math.sin(t) * 0.9, 1.8, 0.1, 0.5, PALM, TILE.leaf); } }
function buildGroup(g, at) {
  const rng = mulberry32(hash2(Math.round(at.x), Math.round(at.z), (state.seed || 1) + 311));
  const root = new THREE.Group(); root.position.set(at.x, 0, at.z);
  const b = new Builder(), isl = [];   // isl: [x, z, r] solid islets (world)
  const spots = [0, 1, 2].map((i) => { const t = i * 2.094 + rng() * 0.6, d = 16 + rng() * 6; return [Math.cos(t) * d, Math.sin(t) * d]; });
  if (g.id === 'cays') {
    for (const [x, z] of spots) {
      const r = 5 + rng() * 2.5;
      b.darkSame = true;
      b.blob(x, -0.7, z, r * 1.15, 2.1, r * (0.8 + rng() * 0.3), '#f4ead0', TILE.white, 0.12, Math.floor(rng() * 1e6));   // a low hump of white sand
      b.blob(x + 1, -0.2, z - 0.5, r * 0.65, 1.7, r * 0.55, '#fff4dc', TILE.white, 0.15, Math.floor(rng() * 1e6));
      b.blob(x - r * 0.3, -0.2, z + r * 0.4, r * 0.4, 0.8, r * 0.35, '#7a9a48', TILE.leaf, 0.3, Math.floor(rng() * 1e6));   // a scrub of beach grass
      b.darkSame = false;
      for (let k = 0; k < 1 + Math.floor(rng() * 2); k++) palm(b, x + (rng() - 0.5) * r * 0.8, 0.3, z + (rng() - 0.5) * r * 0.6, 4 + rng() * 2, rng() - 0.5);
      isl.push([at.x + x, at.z + z, r * 0.9]);
    }
    // the stilt hut in the middle, over the water
    for (const [px, pz] of [[-1.4, -1.2], [1.4, -1.2], [-1.4, 1.2], [1.4, 1.2]]) b.box(px, -1, pz, 0.22, 3.2, 0.22, '#6a4a28', TILE.planks);
    b.box(0, 2.1, 0, 3.4, 0.16, 3.0, '#8a6a40', TILE.planks); b.box(0, 2.25, 0, 3.0, 1.9, 2.6, '#a08058', TILE.planks);
    b.gable(0, 4.15, 0, 3.6, 1.2, 3.2, '#c8b070', TILE.roof, '#a08058'); b.box(0, 2.25, 1.32, 0.8, 1.3, 0.06, '#3a2a18');
    for (let i = 0; i < 5; i++) b.box(0, -0.6 + i * 0.55, 2.0 + i * 0.05, 0.9, 0.06, 0.12, '#6a4a28', TILE.planks);   // a ladder down to the water
    isl.push([at.x, at.z, 2.4]);
  } else if (g.id === 'mangrove') {
    for (const [x, z] of spots) {
      const r = 5 + rng() * 2;
      for (let k = 0; k < 14; k++) {   // roots arching down into the water
        const t = k * 0.45 + rng() * 0.3, rr = r * (0.55 + rng() * 0.45), rx = x + Math.cos(t) * rr, rz = z + Math.sin(t) * rr;
        b.push(rx, 0, rz, -t, 1, 1, 1, 0, 0.5); b.box(0, -0.4, 0, 0.18, 1.7, 0.18, ROOT, TILE.bark); b.pop();
      }
      b.blob(x, 2.6, z, r * 0.95, 1.8, r * 0.85, MANG, TILE.leaf, 0.3, Math.floor(rng() * 1e6));
      b.blob(x + 1.2, 3.4, z - 0.8, r * 0.6, 1.3, r * 0.6, MANG2, TILE.leaf, 0.3, Math.floor(rng() * 1e6));
      isl.push([at.x + x, at.z + z, r * 0.9]);
    }
    // the camp in the middle, on a hummock: a cold fire, a hammock between two stakes
    b.blob(0, -0.5, 0, 3, 0.9, 2.6, '#6a5a3a', TILE.sand, 0.2, 7);
    for (const [px, pz] of [[-1.3, -0.4], [1.3, 0.4]]) b.box(px, 0, pz, 0.14, 1.6, 0.14, ROOT, TILE.bark);
    b.box(0, 1.1, 0, 2.4, 0.06, 0.6, '#c8b890');
    for (let i = 0; i < 5; i++) { const t = i * 1.25; b.box(Math.cos(t) * 0.45 - 0.8, 0.25, Math.sin(t) * 0.45 + 1, 0.3, 0.18, 0.3, '#4a4440', TILE.stone); }
    b.box(-0.8, 0.25, 1, 0.5, 0.06, 0.5, '#1a1410');
    isl.push([at.x, at.z, 2.2]);
  } else {
    // three different rocks (owner, 2026-11-26: "more varieties"): a sea stack, a flat table rock with a tide pool, a split boulder;
    // each with a dark band of weed and barnacles at the waterline, and loose stones round its foot
    const RK = ['#7e766a', '#948c7e', '#6e675c', '#8a8274', '#a29a8a'], WEED = '#3e4a32', GUANO = '#e8e4d8', sd = () => Math.floor(rng() * 1e6);
    spots.forEach(([x, z], k) => {
      let r;
      if (k === 0) {   // the stack: blocks stepping in as it rises, each turned a little, white on top where the birds sit
        r = 3.6; let y = -1, w = 5.2;
        for (let i = 0; i < 5; i++) { const h = 1.5 + rng() * 1.1; b.blob(x + (rng() - 0.5) * 0.9, y + h * 0.5, z + (rng() - 0.5) * 0.9, w * 0.55, h * 0.75, w * (0.42 + rng() * 0.12), RK[i % 5], TILE.stone, 0.3, sd()); y += h * 0.85; w *= 0.8; }   // weathered blocks, each a little off the one below
        b.blob(x, y + 0.1, z, w * 0.5, 0.3, w * 0.42, GUANO, TILE.white, 0.3, sd()); b.box(x, -0.4, z, 5.8, 0.6, 4.8, WEED, TILE.leaf);
      } else if (k === 1) {   // the table: a wide low slab, a little tilted, a pool of still water on it
        r = 5.2; b.push(x, -0.9, z, rng() * 3, 1, 1, 1, 0.06, -0.05); b.box(0, 0, 0, 10, 2.0, 7.5, RK[3], TILE.stone); b.box(0.8, 0.4, -0.6, 7.4, 1.8, 5.2, RK[1], TILE.stone); b.box(-1.2, 2.21, 0.4, 2.6, 0.02, 1.8, '#3a6a7a', TILE.white); b.box(0, -0.2, 0, 10.4, 0.5, 7.9, WEED, TILE.leaf); b.pop();
      } else {   // the split boulder: two halves leaning apart, a wedge of sky between them
        r = 4.6; for (const sd2 of [-1, 1]) { b.push(x + sd2 * 1.9, 0.2, z, 0, 1, 1, 1, 0, sd2 * 0.2); b.blob(0, 0, 0, 2.6, 3.4, 3.2, sd2 < 0 ? RK[0] : RK[4], TILE.stone, 0.25, sd()); b.pop(); }
        b.blob(x, -0.5, z, 5.2, 0.7, 4.0, WEED, TILE.leaf, 0.2, sd());
      }
      for (let i = 0; i < 4 + Math.floor(rng() * 3); i++) { const t = rng() * 6.28, d = r + 1 + rng() * 3; b.blob(x + Math.cos(t) * d, -0.4, z + Math.sin(t) * d, 0.6 + rng() * 0.9, 0.4 + rng() * 0.6, 0.6 + rng() * 0.8, RK[Math.floor(rng() * 5)], TILE.stone, 0.35, sd()); }   // loose stones
      isl.push([at.x + x, at.z + z, r * 0.9]);
    });
    // the stone in the middle: an old mooring stone with an iron ring, under the water but at the bottom of the tide
    b.box(0, -1.6, 0, 1.1, 1.5, 1.1, '#5a5448', TILE.stone); b.box(0, -0.18, 0.58, 0.6, 0.6, 0.08, '#3a2a22');
  }
  const mesh = new THREE.Mesh(b.geometry(), mats.props); root.add(mesh);
  // the sand spits the tide uncovers (the Tide Rocks): two of the three gaps; the third stays a channel
  let spits = null;
  if (g.id === 'tide') {
    const sb = new Builder();
    for (const [i, j] of [[0, 1], [1, 2]]) {
      const [ax, az] = spots[i], [bx, bz] = spots[j], L = Math.hypot(bx - ax, bz - az);
      sb.push((ax + bx) / 2, 0, (az + bz) / 2, -Math.atan2(bz - az, bx - ax)); sb.darkSame = true; sb.blob(0, -0.5, 0, L * 0.55, 0.8, 4.2, '#f0e4c4', TILE.white, 0.12, i * 7 + 3); sb.darkSame = false; sb.pop();
    }
    spits = new THREE.Mesh(sb.geometry(), mats.props); root.add(spits);
  }
  // fireflies (the Mangroves, at night)
  let flies = null;
  if (g.id === 'mangrove') {
    flies = new THREE.Group();
    const fm = new THREE.MeshBasicMaterial({ color: 0xe8ff9a, transparent: true, opacity: 1, fog: false, depthWrite: false }), fg = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(fg, fm); m.renderOrder = 9; m.userData.p = [(rng() - 0.5) * 34, 0.6 + rng() * 2.5, (rng() - 0.5) * 34, rng() * 6]; flies.add(m); }
    root.add(flies);
  }
  scene.add(root);
  // the shelf: a broad, broken patch over the whole group (and its middle)
  const before = shelves.length;
  if (SANDBANKS_ON) { const discs = []; for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2 + rng() * 0.3, d = 14 + rng() * 14; discs.push([at.x + Math.cos(t) * d, at.z + Math.sin(t) * d, 9 + rng() * 7]); } discs.push([at.x, at.z, 14]); addBank(discs); }   // one broad shallow over the whole group: the Gull stays outside
  return { ...g, x: at.x, z: at.z, root, mesh, spits, flies, isl, spots: spots.map(([x, z]) => [at.x + x, at.z + z]), shelf: [before, shelves.length] };
}

/** the shelves in front of the boat's landings (gearplay.js calls it with each site's frame) */
export function siteShelf(id, ox, oz, ang) {
  const rng = mulberry32(hash2(Math.round(ox), Math.round(oz), 97));
  chain(ox, oz, ang, [[-11, 4, 4], [-7, 7, 5], [-2, 6, 4.5], [3, 7.5, 5], [8, 5, 4], [12, 3, 3.5], [-4, 2, 3.5], [5, 2.5, 3.5], [0, 10, 3]], rng);
}

function build() {
  built = true;
  if (DEMO()) return;
  for (const g of GROUPS) { const at = placeGroup(g); if (at) groups.push(buildGroup(g, at)); }
}
/** main.js: the shelves near (x, z) for the sea's shallow water, as [x, z, r, dist] */
export function shelvesNear(x, z, R = 500) {
  const out = [];
  for (const b of banks) { const d = Math.hypot(b.x - x, b.z - z); if (d < R) out.push([b.x, b.z, -b.r * 0.75, d]); }   // negative: a sandbank (ocean.js isd)   // one entry a bank: the swell lies down over it (never one per disc: they came and went)
  return out;
}
const lowTide = () => lowWater();   // the sea drawn back: a new or full moon night (no tides)
let lastFloat = null, groundT = -99;
/** each frame (gearplay.js): the Gull grounds on a shelf; the boat goes over shelves but not through islets (or the spits at low tide) */
export function shallowsTick(dt, t) {
  if (!built) build();
  if (DEMO()) return;
  const S = G.ship, boat = !!rt.boat;
  if (!boat) {
    let hit = null, best = 0;
    const pad = GROUND_PAD + (handOn('pilot') ? 4 : 0);   // the pilot at the bow: she edges further in (systems/hands.js)
    for (const s of shelves) { const d = Math.hypot(S.pos.x - s[0], S.pos.z - s[1]), inside = s[2] - pad - d; if (inside > best) { best = inside; hit = s; } }
    if (hit && rt.tNow - groundT > 8) state.story.grounded = (state.story.grounded || 0) + 1;   // counted once per grounding, not per frame of it (the pilot is earned by two)
    if (hit) groundT = rt.tNow;
    if (hit) {   // aground: she stops dead where her keel first touched (the last place she floated), never pushed further in
      if (lastFloat && Math.hypot(S.pos.x - lastFloat.x, S.pos.z - lastFloat.z) < 30) { S.pos.x = lastFloat.x; S.pos.z = lastFloat.z; }   // (after a jump, the old place is too far: pushed off instead)
      else { const dx = S.pos.x - hit[0], dz = S.pos.z - hit[1], d = Math.hypot(dx, dz) || 1; S.pos.x += dx / d * best; S.pos.z += dz / d * best; }
      if (S.speed > 1.2) { G.audio.play('bump', { vol: Math.min(1, S.speed / 8) }); if (S.float) { S.float.vp = (S.float.vp || 0) + 0.25; S.float.vr = (S.float.vr || 0) + 0.15; } }
      S.speed = 0; if (S.vel) { S.vel.x = 0; S.vel.z = 0; } S.blockT = 0.8;
    } else lastFloat = { x: S.pos.x, z: S.pos.z };
    if (hit) {
      const told = state.story.shoalTold || (state.story.shoalTold = {});
      if (!told.any) { told.any = state.dayN; toast('She grounds with a long creak. The water here is too shallow for the Gull.', false, 5000); }
    }
  }
  for (const g of groups) {
    const near = Math.hypot(S.pos.x - g.x, S.pos.z - g.z) < 600;
    g.root.visible = near;
    if (!near) continue;
    for (const [x, z, r] of g.isl) {   // the islets are solid to both
      const dx = S.pos.x - x, dz = S.pos.z - z, d = Math.hypot(dx, dz), R = r + (boat ? 1.2 : 2.2);
      if (d < R && d > 0.01) { S.pos.x = x + dx / d * R; S.pos.z = z + dz / d * R; S.speed *= 0.5; }
    }
    if (g.spits) {   // the Tide Rocks: the spits rise with the low water
      const tide = waterAt(); g.spits.position.y = Math.max(-0.9, Math.min(0.1, -0.35 - tide * 0.9));
      if (boat && lowTide()) for (const [i, j] of [[0, 1], [1, 2]]) {
        const [ax, az] = g.spots[i], [bx, bz] = g.spots[j], ux = bx - ax, uz = bz - az, L2 = ux * ux + uz * uz;
        const k = Math.max(0.15, Math.min(0.85, ((S.pos.x - ax) * ux + (S.pos.z - az) * uz) / L2)), px = ax + ux * k, pz = az + uz * k;
        const dx = S.pos.x - px, dz = S.pos.z - pz, d = Math.hypot(dx, dz);
        if (d < 2.6 && d > 0.01) { S.pos.x = px + dx / d * 2.6; S.pos.z = pz + dz / d * 2.6; S.speed *= 0.3; }
      }
    }
    if (g.flies) {
      const on = tod.night > 0.5; g.flies.visible = on;
      if (on) for (const m of g.flies.children) { const [x, y, z, ph] = m.userData.p; m.position.set(x + Math.sin(t * 0.4 + ph) * 1.5, y + Math.sin(t * 1.3 + ph * 2) * 0.4, z + Math.cos(t * 0.33 + ph) * 1.5); m.visible = Math.sin(t * 2.1 + ph * 3) > -0.3; }
    }
  }
}
// ---- what the boat finds in the middle of each group (E, from the boat)
const FIND = {
  cays: { prompt: '[E] Climb the ladder', once: 'Nobody. A kettle on the stove, still warm. Two cups on the table, one turned down. The bunk is made, tight, the way you make a bunk for someone else.', again: 'The kettle is still warm.' },
  mangrove: { prompt: '[E] Go ashore at the camp', once: 'A cold fire, a hammock, a tin of biscuit with the lid on. Somebody counted the days on the stake: a long row, then the marks stop in the middle of a mark.', again: 'The fire is cold. The marks on the stake have not gone on.' },
  tide: { prompt: '[E] Look at the stone', once: 'An old mooring stone with an iron ring, worn bright on one side. Somebody has tied up here at the bottom of the tide, often, for a long time. The knot is still on the ring.', again: 'The knot is still on the ring.', low: true },
};
export function shallowsInteract() {
  if (!rt.boat) return null;
  for (const g of groups) {
    const d = Math.hypot(G.ship.pos.x - g.x, G.ship.pos.z - g.z), F = FIND[g.id];
    if (d > 6) continue;
    if (F.low && !lowTide()) return null;   // the stone is under the water but at the bottom of the tide
    return { kind: 'gear', key: 'shallows:' + g.id, act: 'shallows', g, prompt: F.prompt };
  }
  return null;
}
export function shallowsFind(g) {
  const F = FIND[g.id], seen = state.story.shallows || (state.story.shallows = {});
  if (g.id === 'cays' && state.story.patienceHome != null) {   // the Patience's family live here now (systems/raiders.js, beggars)
    const first = !seen.patience; seen.patience = state.dayN;
    toast(first ? 'The Patience is moored under the hut, her patched sail furled. The kettle is on. The woman pours you a cup and says nothing about who was here before.' : 'The children are fishing off the ladder. The goat is on the roof.', false, 8000);
    if (first) state.notes.push({ text: 'The Patience\'s family live in the stilt hut on the Sandbar Cays now.', dark: false });
    return;
  }
  if (seen[g.id] == null) { seen[g.id] = state.dayN; state.notes.push({ text: F.once, dark: false }); toast(F.once, false, 9000); }
  else toast(F.again, false, 4000);
}
/** tests */
export const shallowsState = () => ({ groups: groups.map((g) => ({ id: g.id, x: g.x, z: g.z })), shelves: shelves.length, banks: banks.map((b) => ({ x: b.x, z: b.z, r: b.r })) });
