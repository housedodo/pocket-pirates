// House families (owner, 2026-11-27: "more designs for houses, variations, and how to make it look uniform per harbour; make 4 distinct
// designs and what you used as inspiration"). On trial: ?houses=chattel|gable|bermuda|stilt puts every ordinary house of every harbour in
// that family; ?houses=region gives each region its own (Free Cays chattel, Crown gable, Lantern Bermuda, Reef stilt, home and Drowned
// as they are). Churches, belfries, warehouses, round huts, the tavern and the landmarks are untouched.
//   chattel  Barbados chattel houses: small wooden boxes on stone blocks, a steep gable, a door between two jalousie shutters, pastel
//            boards, fretwork under the eaves; families add a second unit behind as they grow.
//   gable    Willemstad's Handelskade (Curacao): narrow, bright, a white stepped or curved gable to the street, red tiles behind, white
//            frames; stood side by side they make a waterfront.
//   bermuda  Bermuda cottages: whitewashed or pale walls, the stepped white limestone roof that catches rain, a fat buttress chimney,
//            small windows with coloured shutters.
//   stilt    Garifuna and Belize coast fishing houses: plank huts on posts with a steep hipped palm-thatch roof, a front deck, a ladder.
// Uniform per harbour: one family, and one palette rolled from the harbour (three wall colours, one roof, one trim); every house in it
// draws from that. Variety inside: one or two units, an extension (lean-to, hood, deck), shutters open or shut, a little lean.
import { TILE } from './textures.js';

const pick = (a, k) => a[Math.floor(k * a.length) % a.length];
const h01 = (x, z, s) => { const v = Math.sin(x * 12.9898 + z * 78.233 + s * 37.719) * 43758.5453; return v - Math.floor(v); };
export const FAMILY_PALETTES = {
  chattel: { walls: [['#e6a8b8', '#a8d4e0', '#f0e0a0'], ['#b8e0c0', '#f0c8a0', '#c8c0e8'], ['#f4d090', '#9ad0d8', '#f0b0a0']], roofs: ['#9aa4a8', '#b8483a', '#5a8aa8'], trims: ['#f8f4ea', '#f4ead0'] },
  gable: { walls: [['#f2c840', '#4a8ad0', '#e8708a'], ['#5ab878', '#f08a40', '#58b8d0'], ['#e8d050', '#d05a50', '#7a9ae0']], roofs: ['#b8503a', '#a84a32'], trims: ['#f8f6f0'] },
  bermuda: { walls: [['#f4d4d8', '#d8e8f4', '#f6f0e4'], ['#f8e0c8', '#e0f0e4', '#f4f0f0'], ['#e8d8f0', '#f6ead0', '#dcecf4']], roofs: ['#f4f4f0'], trims: ['#3a6a9a', '#3a8a6a', '#b8483a'] },
  stilt: { walls: [['#a07850', '#8a6440', '#b48a5a'], ['#9a8060', '#7a5a3a', '#b89a70']], roofs: ['#c8a860', '#b89850', '#a88a48'], trims: ['#5a3e24'] },
};
/** a harbour's kit: its family and palette (world.js sets it while the harbour is built) */
export function harbourKit(fam, seed) {
  const P = FAMILY_PALETTES[fam]; if (!P) return null;
  const k = (Math.abs(seed) % 1000) / 1000;
  return { fam, walls: pick(P.walls, k), roof: pick(P.roofs, (k * 7.3) % 1), trim: pick(P.trims, (k * 3.1) % 1) };
}
/** build one house of the harbour's family in the house's own frame (front +z, ground y 0); x, z its place (for its own variety) */
export function familyHouse(A, kit, x, z, big = false) {
  const v = (s) => h01(x, z, s), wall = pick(kit.walls, v(1)), s = big ? 1.25 : 1;
  ({ chattel, gable, bermuda, stilt })[kit.fam](A, kit, wall, v, s);
}

function chattel(A, K, wall, v, s) {
  const w = 2.3 * s, d = 2.5 * s, h = 1.55 * s, base = 0.32, T = K.trim, two = v(2) < 0.5;
  const unit = (z0, ww, dd) => {
    A.box(0, base, z0, ww, h, dd, wall, TILE.planks, TILE.planks);
    A.gable(0, base + h, z0, ww + 0.3, 1.05 * s, dd + 0.25, K.roof, TILE.roof, wall);
    A.box(0, base + h - 0.1, z0 + dd / 2 + 0.06, ww + 0.2, 0.12, 0.06, T, TILE.planks);   // fretwork band under the eaves
  };
  for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A.box(cx * (w / 2 - 0.15), 0, cz * (d / 2 - 0.15), 0.32, base, 0.32, '#8a857c', TILE.stone);   // the stone blocks
  unit(0, w, d);
  if (two) unit(-d * 0.95, w * 0.92, d * 0.9);   // a second unit behind, as the family grew
  A.box(0, base, d / 2 + 0.02, 0.62, 1.4, 0.06, T, TILE.planks); A.box(0, base, d / 2 + 0.05, 0.5, 1.32, 0.05, '#5a3e2c', TILE.planks);   // the door, framed
  const open = v(3) < 0.5;
  for (const sx of [-1, 1]) {   // jalousie shutters either side
    A.box(sx * w * 0.3, base + 0.55, d / 2 + 0.04, 0.46, 0.62, 0.05, open ? '#2a2a34' : T, TILE.planks);
    if (open) for (const o of [-1, 1]) A.box(sx * w * 0.3 + o * 0.36, base + 0.55, d / 2 + 0.08, 0.22, 0.62, 0.04, T, TILE.planks);
  }
  A.box(0, 0, d / 2 + 0.3, 0.8, base, 0.5, '#9a958a', TILE.stone);   // the steps
  if (v(4) < 0.4) { A.push(0, base + 1.55, d / 2 + 0.3, 0, 1, 1, 1, 0.35, 0); A.box(0, 0, 0, 1.0, 0.07, 0.6, K.roof, TILE.roof); A.pop(); }   // a hood over the door
}

function gable(A, K, wall, v, s) {
  const w = 2.2 * s, d = 2.8 * s, tall = v(2) < 0.55, h = (tall ? 2.9 : 1.9) * s, T = K.trim;
  A.box(0, 0, 0, w, h, d, wall, TILE.wall, TILE.white);
  A.gable(0, h, -0.15, w - 0.1, 1.0 * s, d - 0.3, K.roof, TILE.roof, wall);   // red tiles behind the street gable
  // the street gable: stepped (three white-edged steps) or a curved hood
  if (v(3) < 0.5) for (let i = 0; i < 3; i++) { const ww = w * (0.86 - i * 0.26); A.box(0, h + i * 0.34 * s, d / 2 - 0.08, ww, 0.34 * s, 0.16, wall, TILE.white); A.box(0, h + (i + 1) * 0.34 * s - 0.05, d / 2 - 0.06, ww + 0.08, 0.06, 0.2, T, TILE.white); }
  else { A.box(0, h, d / 2 - 0.08, w * 0.7, 0.5 * s, 0.16, wall, TILE.white); A.cyl(0, h + 0.5 * s, d / 2 - 0.08, 0.5 * s, 0.5 * s, 0.16, 8, wall, TILE.white, true); A.box(0, h + 1.0 * s, d / 2 - 0.08, 0.14, 0.2, 0.18, T, TILE.white); }
  A.box(0, h - 0.08, d / 2 + 0.02, w + 0.1, 0.1, 0.06, T, TILE.white);   // cornice
  A.box(0, 0, d / 2 + 0.02, 0.6, 1.45, 0.06, T, TILE.white); A.box(0, 0, d / 2 + 0.05, 0.48, 1.38, 0.05, '#3a2a20', TILE.planks);   // door
  const floors = tall ? 2 : 1;
  for (let f = 0; f < floors; f++) for (const sx of (f ? [-0.62, 0, 0.62] : [-0.62, 0.62])) {   // white-framed windows, three upstairs
    A.box(sx * w * 0.5 * 1.1, 0.55 + f * 1.25 * s, d / 2 + 0.03, 0.42, 0.62, 0.05, T, TILE.white);
    A.box(sx * w * 0.5 * 1.1, 0.6 + f * 1.25 * s, d / 2 + 0.06, 0.3, 0.52, 0.04, '#24283a', TILE.white);
  }
}

function bermuda(A, K, wall, v, s) {
  const w = 2.9 * s, d = 2.5 * s, h = 1.45 * s, T = K.trim, R = K.roof;
  A.box(0, 0, 0, w, h, d, wall, TILE.white, TILE.white);
  for (let i = 0; i < 4; i++) { const k = 1 - i * 0.24; A.box(0, h + i * 0.24 * s, 0, (w + 0.3) * k, 0.24 * s, (d + 0.3) * k, R, TILE.stone); }   // the stepped white roof
  const sx = v(2) < 0.5 ? -1 : 1;   // the buttress chimney on one gable end, wide at the foot
  A.box(sx * (w / 2 + 0.25), 0, 0, 0.5, h * 0.7, 1.1, wall, TILE.white); A.box(sx * (w / 2 + 0.2), h * 0.7, 0, 0.4, h * 0.9, 0.7, wall, TILE.white); A.box(sx * (w / 2 + 0.2), h * 1.6 + 0.05, 0, 0.5, 0.12, 0.8, R, TILE.stone);
  A.box(-w * 0.18, 0, d / 2 + 0.02, 0.56, 1.35, 0.06, T, TILE.planks);   // a coloured door
  for (const wx of [w * 0.22, -w * 0.4]) {   // small windows with shutters in the trim colour
    A.box(wx, 0.6, d / 2 + 0.03, 0.36, 0.42, 0.04, '#2a2e3a', TILE.white);
    for (const o of [-1, 1]) A.box(wx + o * 0.28, 0.6, d / 2 + 0.06, 0.18, 0.42, 0.04, T, TILE.planks);
  }
  if (v(3) < 0.45) { A.box(w * 0.18, 0, d / 2 + 0.9, 1.8, 0.1, 1.4, '#e8e2d6', TILE.stone); for (const o of [-0.8, 0.8]) A.box(w * 0.18 + o, 0.1, d / 2 + 1.55, 0.14, 0.55, 0.14, wall, TILE.white); }   // a low walled step-yard
}

function stilt(A, K, wall, v, s) {
  const w = 2.4 * s, d = 2.2 * s, up = 0.9, h = 1.35 * s, T = K.trim;
  for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A.cyl(cx * (w / 2 - 0.1), -0.6, cz * (d / 2 - 0.1), 0.09, 0.08, up + 0.6, 4, T, TILE.bark, false);
  A.box(0, up, 0.35, w + 0.2, 0.1, d + 1.0, '#8a6a48', TILE.planks);   // the floor and the front deck
  A.box(0, up + 0.1, -0.1, w, h, d, wall, TILE.planks, TILE.planks);
  A.push(0, up + 0.1 + h, -0.1, Math.PI / 4); A.cyl(0, 0, 0, Math.max(w, d) * 0.85, 0.15, 1.35 * s, 4, K.roof, TILE.rope, false); A.pop();   // steep hipped thatch
  A.box(-w * 0.2, up + 0.1, d / 2 - 0.08, 0.5, 1.2, 0.06, '#3a2a1c', TILE.planks);   // the door
  A.box(w * 0.25, up + 0.65, d / 2 - 0.08, 0.4, 0.36, 0.05, '#1e1a16', TILE.planks);   // a window hole
  for (const o of [-0.22, 0.22]) A.box(o, -0.1, d / 2 + 1.0, 0.06, up + 0.1, 0.06, T, TILE.bark);   // the ladder
  for (let i = 0; i < 3; i++) A.box(0, 0.15 + i * 0.3, d / 2 + 1.0, 0.5, 0.05, 0.05, T, TILE.bark);
  if (v(2) < 0.5) A.quad([w / 2 + 0.05, up + 0.9, 0.5], [w / 2 + 0.05, up + 0.9, -0.6], [w / 2 + 0.05, up + 0.1, -0.5], [w / 2 + 0.05, up + 0.2, 0.4], '#c8c0a0', TILE.rope);   // a net drying
}
