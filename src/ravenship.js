import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';
import { SECTIONS as GULL } from './ship.js';

// The Pained Raven (CANON 2026-11-18; built live by ravenhulk.js, and by __game.raven(x, z, ry) for tests).
// An ordinary sailor's ship, clean and empty: full sail, lanterns lit, the cabin door open on a desk with one page. It sits a hand
// above the water and never moves (no wake, no wobble). Built from the game's own parts so it looks like the game.

const S = 2.3;   // the Gull's hull sections, scaled up so a person can walk the deck
const SECTIONS = GULL.map((s) => ({ z: s.z * S, w: s.w * S, deck: s.deck * S, keel: s.keel * S }));   // the Gull's own hull table, scaled

const UP = '#9490c0', LOW = '#6a6698', RIM = '#58547e', DECK = '#b8a28c', TRIM = '#f4ead0', WALL = '#8480b0', ROOF = '#5c5684';
const FLOOR_Y = 1.35;   // the deck at the cabin

function hull(b) {
  b.doubleSided = true;
  const P = SECTIONS.map((s) => {
    const mid = (s.deck + s.keel) / 2;
    return { tr: [s.w, s.deck, s.z], tl: [-s.w, s.deck, s.z], mr: [s.w * 0.92, mid, s.z], ml: [-s.w * 0.92, mid, s.z], br: [s.w * 0.35, s.keel, s.z], bl: [-s.w * 0.35, s.keel, s.z],
      ir: [s.w * 0.86, s.deck, s.z], il: [-s.w * 0.86, s.deck, s.z], fr: [s.w * 0.84, s.deck - 0.38 * S, s.z], fl: [-s.w * 0.84, s.deck - 0.38 * S, s.z] };
  });
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], c = P[i + 1];
    b.quad(a.tr, a.mr, c.mr, c.tr, UP, TILE.planks); b.quad(a.mr, a.br, c.br, c.mr, LOW, TILE.planks);
    b.quad(a.tl, c.tl, c.ml, a.ml, UP, TILE.planks); b.quad(a.ml, c.ml, c.bl, a.bl, LOW, TILE.planks);
    b.quad(a.bl, c.bl, c.br, a.br, LOW, TILE.planks);
    b.quad(a.tr, c.tr, c.ir, a.ir, RIM, TILE.planks); b.quad(a.tl, a.il, c.il, c.tl, RIM, TILE.planks);
    b.quad(a.ir, c.ir, c.fr, a.fr, '#2a2236', TILE.planks); b.quad(a.il, a.fl, c.fl, c.il, '#2a2236', TILE.planks);
    b.quad(a.fl, a.fr, c.fr, c.fl, DECK, TILE.planks);
  }
  const p0 = P[0];
  b.quad(p0.tl, p0.tr, p0.mr, p0.ml, UP, TILE.planks); b.quad(p0.ml, p0.mr, p0.br, p0.bl, LOW, TILE.planks);
  // a pale line along each side: the only bright thing on the hull
  for (let i = 0; i < P.length - 1; i++) { const a = P[i], c = P[i + 1]; const y0 = (a.tr[1] + a.mr[1]) / 2, y1 = (c.tr[1] + c.mr[1]) / 2;
    b.quad([a.mr[0] + 0.02, y0, a.tr[2]], [a.mr[0] + 0.02, y0 - 0.14, a.tr[2]], [c.mr[0] + 0.02, y1 - 0.14, c.tr[2]], [c.mr[0] + 0.02, y1, c.tr[2]], TRIM, TILE.planks);
    b.quad([-a.mr[0] - 0.02, y0, a.tr[2]], [-c.mr[0] - 0.02, y1, c.tr[2]], [-c.mr[0] - 0.02, y1 - 0.14, c.tr[2]], [-a.mr[0] - 0.02, y0 - 0.14, a.tr[2]], TRIM, TILE.planks); }
  // bowsprit
  b.cyl(0, 3.4, -9.4, 0.12, 0.09, 4.2, 5, '#2a1e2a', TILE.bark);
}

function cabin(b) {
  const x0 = -1.9, x1 = 1.9, zf = 2.7, zb = 6.1, h = 2.7, t = 0.25;   // zf: the door side, toward the bow
  b.box(0, FLOOR_Y, (zf + zb) / 2, x1 - x0, 0.08, zb - zf, '#8a6a38', TILE.glow);   // lit rooms read at night: the inside is self-lit, dim amber
  b.box(0, FLOOR_Y, zb - t / 2, x1 - x0, h, t, WALL, TILE.planks);           // back wall
  b.box(x0 + t / 2, FLOOR_Y, (zf + zb) / 2, t, h, zb - zf, WALL, TILE.planks);   // sides
  b.box(x1 - t / 2, FLOOR_Y, (zf + zb) / 2, t, h, zb - zf, WALL, TILE.planks);
  // front wall: a doorway 1.5 wide, 2.1 high, and a window each side
  const dw = 0.75; b.box(x0 / 2 - dw / 2 + 0.3, FLOOR_Y, zf + t / 2, (x1 - x0) / 2 - dw, h, t, WALL, TILE.planks); b.box(x1 / 2 + dw / 2 - 0.3, FLOOR_Y, zf + t / 2, (x1 - x0) / 2 - dw, h, t, WALL, TILE.planks);
  b.box(0, FLOOR_Y + 2.1, zf + t / 2, dw * 2, h - 2.1, t, WALL, TILE.planks);
  b.box(0, FLOOR_Y + h, (zf + zb) / 2, x1 - x0 + 0.5, 0.2, zb - zf + 0.5, ROOF, TILE.planks);
  b.box(0, FLOOR_Y + 2.3, zf - 0.02, 2.4, 0.3, 0.06, '#ffffff', TILE.glow);   // one long transom light over the door (two windows and a door read as a face)
  b.quad([x0 + t, FLOOR_Y, zb - t - 0.01], [x1 - t, FLOOR_Y, zb - t - 0.01], [x1 - t, FLOOR_Y + h, zb - t - 0.01], [x0 + t, FLOOR_Y + h, zb - t - 0.01], '#8a6c3a', TILE.glow);
  b.quad([x0 + t + 0.01, FLOOR_Y, zf + t], [x0 + t + 0.01, FLOOR_Y, zb - t], [x0 + t + 0.01, FLOOR_Y + h, zb - t], [x0 + t + 0.01, FLOOR_Y + h, zf + t], '#6a4e28', TILE.glow);
  b.quad([x1 - t - 0.01, FLOOR_Y, zb - t], [x1 - t - 0.01, FLOOR_Y, zf + t], [x1 - t - 0.01, FLOOR_Y + h, zf + t], [x1 - t - 0.01, FLOOR_Y + h, zb - t], '#6a4e28', TILE.glow);
  // inside: a desk under the back wall, one page on it, a lamp from the beam
  b.box(0, FLOOR_Y, zb - 0.9, 2.2, 0.95, 0.9, '#b07a46', TILE.planks);
  b.box(-0.45, FLOOR_Y + 0.95, zb - 0.9, 0.86, 0.02, 0.62, '#f6eed0', TILE.glow);   // the page: bright, ignores the light
  b.box(0.7, FLOOR_Y + 0.95, zb - 0.9, 0.12, 0.2, 0.12, '#3a2a1a', TILE.bark);    // an ink pot, lid on
  b.cyl(0, FLOOR_Y + h - 0.7, (zf + zb) / 2 + 0.6, 0.02, 0.02, 0.7, 4, '#1a1410', TILE.bark);
  b.box(0, FLOOR_Y + h - 1.1, (zf + zb) / 2 + 0.6, 0.36, 0.4, 0.36, '#ffe0a0', TILE.glow);
  b.box(-1.2, FLOOR_Y, zb - 0.9, 0.7, 0.7, 0.7, '#9a6a3a', TILE.planks);       // a sea chest, shut
  return { zf, zb };
}

function rig(b, sails) {
  [[-0.2, 13], [-2.8, 15], [-5.4, 11]].forEach(([z, h]) => {
    b.cyl(0, 1.2, z, 0.2, 0.12, h, 6, '#2a1e2a', TILE.bark);
    b.box(0, 1.2 + h * 0.92, z, 7.4, 0.16, 0.16, '#2a1e2a', TILE.bark);   // the yard
    b.box(0, 1.2 + h * 0.6, z, 8.6, 0.16, 0.16, '#2a1e2a', TILE.bark);
    for (const [y0, y1, w] of [[0.64, 0.9, 3.6], [0.32, 0.58, 4.2]]) {   // square sails, full of a wind that is not there
      const n = 6, ya = 1.2 + h * y0, yb = 1.2 + h * y1;
      for (let i = 0; i < n; i++) for (const s of [0]) {
        const u0 = i / n, u1 = (i + 1) / n, bw = (u) => Math.sin(Math.PI * u) * 0.9;
        const A = (u, y) => [(u - 0.5) * 2 * w, y, z - 0.5 * bw(u) * Math.sin(Math.PI * (y - ya) / (yb - ya + 0.01)) - 0.3];
        sails.quad(A(u0, ya), A(u1, ya), A(u1, yb), A(u0, yb), '#ece8fa', TILE.sail);
      }
    }
  });
  // fore and aft lanterns on posts
  b.box(0, 3.0, 6.9, 0.16, 0.9, 0.16, '#2a1e2a', TILE.bark); b.box(0, 3.9, 6.9, 0.8, 0.8, 0.8, '#ffe0a0', TILE.glow);   // stern light
  b.box(0, 2.3, -8.0, 0.16, 0.7, 0.16, '#2a1e2a', TILE.bark); b.box(0, 3.0, -8.0, 0.6, 0.6, 0.6, '#ffe0a0', TILE.glow);   // bow light
}

function deck(b) {
  // everything squared away: hatches shut, a rope coiled flat, a barrel lashed
  b.box(0.0, 1.06, -0.9, 1.7, 0.28, 1.5, '#3a3050', TILE.planks);   // hatch
  b.box(0.0, 1.06, 1.0, 1.2, 0.2, 1.2, '#3a3050', TILE.planks);
  for (let i = 0; i < 4; i++) b.cyl(1.9, 1.1 + i * 0.1, -0.8, 0.7 - i * 0.05, 0.7 - i * 0.05, 0.1, 8, '#b8a070', TILE.rope);
  b.cyl(-1.9, 1.1, 0.9, 0.45, 0.45, 0.9, 8, '#5a4030', TILE.planks);
  for (let i = 0; i < 4; i++) { const z = -4.0 + i * 2.6; b.box(2.3, 1.7, z, 0.12, 0.4, 0.12, '#2a1e2a', TILE.bark); b.box(-2.3, 1.7, z, 0.12, 0.4, 0.12, '#2a1e2a', TILE.bark); }   // belaying pins in the rail
}

/** build the Raven at (x, z), heading ry; the hull's keel clears the sea by `lift`; returns the group so a test can remove it */
export function buildRaven(scene, x, z, ry = 0, lift = 0.55) {
  const hb = new Builder(), sb = new Builder(); sb.doubleSided = true;
  hull(hb); cabin(hb); deck(hb); rig(hb, sb);
  const g = new THREE.Group(); g.position.set(x, -SECTIONS[2].keel + lift, z); g.rotation.y = ry;
  const m1 = new THREE.Mesh(hb.geometry(), mats.hull), m2 = new THREE.Mesh(sb.geometry(), mats.sail);
  m1.frustumCulled = m2.frustumCulled = false; g.add(m1, m2);
  // the cabin's light on the deck in front of the door: a warm pool, no flicker
  const lb = new Builder(); lb.quad([-1.6, 1.2, 2.65], [1.6, 1.2, 2.65], [1.0, 1.08, -0.6], [-1.0, 1.08, -0.6], '#ffd070', TILE.white);
  const pool = new THREE.Mesh(lb.geometry(), mats.glow); pool.renderOrder = 2; g.add(pool);
  // soft amber halos round the lamps and shutters (half-clear, so they read through fog)
  const hb2 = new Builder(); hb2.ambient = 1;
  for (const [x, y, z, r] of [[0, 3.9, 6.9, 0.7], [0, 3.0, -8.0, 0.55]]) hb2.blob(x, y, z, r * 1.15, r * 1.15, r * 1.15, '#ffb050', TILE.white, 0.05, 3);
  const halo = new THREE.Mesh(hb2.geometry(), mats.glow); halo.renderOrder = 3; g.add(halo);
  scene.add(g); return g;
}
