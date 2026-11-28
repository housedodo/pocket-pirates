// House families (owner, 2026-11-27: "more designs for houses, variations, and how to make it look uniform per harbour"; then "build the
// building variations you have shown me, but also apply it to the other buildings of each harbour"). Every harbour is built in its region's
// family (world.js REGION_FAMILY): its houses, and its tavern, church, bell tower, warehouse and hall too. The landmarks of a village style
// (windmill, pagoda, torii, the hull hall, wells, fountains) and the lighthouse stay as they are. ?houses=chattel|gable|bermuda|stilt shows
// one family everywhere (not in the full game).
//   chattel  Barbados chattel houses: small wooden boxes on stone blocks, a steep gable, a door between two jalousie shutters, pastel
//            boards, fretwork under the eaves; families add a second unit behind as they grow. Its tavern is a rum shop with a gallery,
//            its church a white board chapel with a little belfry, its tower an open timber belfry, its warehouse a long board shed.
//   gable    Willemstad's Handelskade (Curacao): narrow, bright, a white stepped or curved gable to the street, red tiles behind, white
//            frames. The tavern is two gable houses knocked together, the church a yellow Dutch church with a white tower and spire,
//            the warehouse a tall pakhuis with stacked loading doors and a hoist beam.
//   bermuda  Bermuda cottages: whitewashed or pale walls, the stepped white limestone roof that catches rain, a fat buttress chimney,
//            small windows with coloured shutters. The tavern is long and low with "welcoming arms" steps, the church a white chapel
//            with a bell-cote and buttresses, the tower white with a stepped cap.
//   stilt    Garifuna and Belize coast fishing houses: plank huts on posts with a steep hipped palm-thatch roof, a front deck, a ladder.
//            The tavern has a long deck under a thatch awning, the church is an open thatched hall, the tower a pole lookout, the
//            warehouse an open boat shed.
// Uniform per harbour: one family, and one palette rolled from the harbour (three wall colours, one roof, one trim); every building in it
// draws from that. Variety inside: one or two units, an extension (lean-to, hood, deck), shutters open or shut, a little lean.
import { TILE } from './textures.js';

const shade = (hex, k = 0.82) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
const pick = (a, k) => a[Math.floor(k * a.length) % a.length];
const h01 = (x, z, s) => { const v = Math.sin(x * 12.9898 + z * 78.233 + s * 37.719) * 43758.5453; return v - Math.floor(v); };
export const FAMILY_PALETTES = {
  chattel: { walls: [['#e6a8b8', '#a8d4e0', '#f0e0a0'], ['#b8e0c0', '#f0c8a0', '#c8c0e8'], ['#f4d090', '#9ad0d8', '#f0b0a0']], roofs: ['#9aa4a8', '#b8483a', '#5a8aa8'], trims: ['#f8f4ea', '#f4ead0'] },
  gable: { walls: [['#f2c840', '#4a8ad0', '#e8708a'], ['#5ab878', '#f08a40', '#58b8d0'], ['#e8d050', '#d05a50', '#7a9ae0']], roofs: ['#b8503a', '#a84a32'], trims: ['#f8f6f0'] },
  bermuda: { walls: [['#f4d4d8', '#d8e8f4', '#f6f0e4'], ['#f8e0c8', '#e0f0e4', '#f4f0f0'], ['#e8d8f0', '#f6ead0', '#dcecf4']], roofs: ['#f4f4f0'], trims: ['#3a6a9a', '#3a8a6a', '#b8483a'] },
  stilt: { walls: [['#a07850', '#8a6440', '#b48a5a'], ['#9a8060', '#7a5a3a', '#b89a70']], roofs: ['#c8a860', '#b89850', '#a88a48'], trims: ['#5a3e24'] },
  classical: { walls: [['#e4ddcc', '#d6cfbd', '#cbc3b0'], ['#ddd6c6', '#cfc8b6', '#e8e2d2']], roofs: ['#a8735a', '#9a7a68'], trims: ['#5a8a78', '#4e7a6a'] },   // weathered marble, old tile, green bronze (the Drowned)
};
/** a harbour's kit: its family and palette (world.js sets it while the harbour is built) */
export function harbourKit(fam, seed) {
  const P = FAMILY_PALETTES[fam]; if (!P) return null;
  const k = (Math.abs(seed) % 1000) / 1000;
  return { fam, walls: pick(P.walls, k), roof: pick(P.roofs, (k * 7.3) % 1), trim: pick(P.trims, (k * 3.1) % 1) };
}
/** Tama's own kit (owner, 2026-11-28: "make Tama look more colourful and welcoming... a feel-good starter town"): the brightest chattel
 *  paints, each house its own wall and roof, white fretwork, doors in a colour of their own, flower boxes and pots (cheer) */
export function tamaKit() {
  return { fam: 'chattel', walls: ['#f4a0b8', '#6ad0d8', '#f8d860', '#9ae0a0', '#f8a878', '#c8a8f0', '#80b8f0'], roof: '#d8483a',
    roofs: ['#d8483a', '#2f9aa8', '#e87a3a', '#3c78c8', '#4aa86a'], trim: '#fbf8f0', doors: ['#2f7ad0', '#d83a5a', '#f0b030', '#2a9a7a', '#8a4ac8'], cheer: true };
}
const BLOOMS = ['#e8407a', '#f0c030', '#f4f0e8', '#e85a3a', '#c078e0'];
function cheer(A, K, v, x, y, z, w) {   // a flower box under a window: a painted trough and blooms
  A.box(x, y, z, w, 0.16, 0.24, pick(K.doors || [K.trim], v(8)), TILE.planks);
  for (let i = 0; i < 3; i++) A.blob(x + (i - 1) * w * 0.32, y + 0.2, z, 0.14, 0.11, 0.1, i === 1 ? '#4a8a38' : pick(BLOOMS, v(9 + i)), TILE.white, 0.1, i);
}
/** build one house of the harbour's family in the house's own frame (front +z, ground y 0); x, z its place (for its own variety) */
export function familyHouse(A, kit, x, z, big = false) {
  const v = (s) => h01(x, z, s), wall = pick(kit.walls, v(1)), s = big ? 1.25 : 1;
  ({ chattel, gable, bermuda, stilt, classical })[kit.fam](A, kit, wall, v, s);
}

function chattel(A, K, wall, v, s) {
  const w = 2.3 * s, d = 2.5 * s, h = 1.55 * s, base = 0.32, T = K.trim, two = v(2) < 0.5, roof = K.roofs ? pick(K.roofs, v(5)) : K.roof;
  const unit = (z0, ww, dd) => {
    A.box(0, base, z0, ww, h, dd, wall, TILE.white, TILE.white);
    for (let i = 1; i < 5; i++) A.box(0, base + i * h / 5, z0 + dd / 2 + 0.01, ww, 0.03, 0.02, shade(wall), TILE.white);   // board lines, a little darker than the paint
    A.gable(0, base + h, z0, ww + 0.3, 1.05 * s, dd + 0.25, roof, TILE.roof, wall);
    A.box(0, base + h - 0.1, z0 + dd / 2 + 0.06, ww + 0.2, 0.12, 0.06, T, TILE.planks);   // fretwork band under the eaves
  };
  for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A.box(cx * (w / 2 - 0.15), 0, cz * (d / 2 - 0.15), 0.32, base, 0.32, '#8a857c', TILE.stone);   // the stone blocks
  unit(0, w, d);
  if (two) unit(-d * 0.95, w * 0.92, d * 0.9);   // a second unit behind, as the family grew
  A.box(0, base, d / 2 + 0.02, 0.62, 1.4, 0.06, T, TILE.planks); A.box(0, base, d / 2 + 0.05, 0.5, 1.32, 0.05, K.doors ? pick(K.doors, v(6)) : '#5a3e2c', TILE.planks);   // the door, framed
  const open = v(3) < 0.5;
  for (const sx of [-1, 1]) {   // jalousie shutters either side
    A.box(sx * w * 0.3, base + 0.55, d / 2 + 0.04, 0.46, 0.62, 0.05, open ? '#2a2a34' : T, TILE.planks);
    if (open) for (const o of [-1, 1]) A.box(sx * w * 0.3 + o * 0.36, base + 0.55, d / 2 + 0.08, 0.22, 0.62, 0.04, T, TILE.planks);
  }
  A.box(0, 0, d / 2 + 0.3, 0.8, base, 0.5, '#9a958a', TILE.stone);   // the steps
  if (v(4) < (K.cheer ? 0.7 : 0.4)) { A.push(0, base + 1.55, d / 2 + 0.3, 0, 1, 1, 1, 0.35, 0); A.box(0, 0, 0, 1.0, 0.07, 0.6, roof, TILE.roof); A.pop(); }   // a hood over the door
  if (K.cheer) {   // flower boxes under both windows, a pot either side of the steps
    for (const sx of [-1, 1]) cheer(A, K, (k) => v(k + sx * 3), sx * w * 0.3, base + 0.38, d / 2 + 0.14, 0.56);
    for (const sx of [-1, 1]) { A.cyl(sx * 0.62, 0, d / 2 + 0.45, 0.17, 0.13, 0.3, 6, '#c8643a', TILE.stone, true); A.blob(sx * 0.62, 0.42, d / 2 + 0.45, 0.22, 0.18, 0.22, '#3f8a38', TILE.leaf, 0.2, 3 + sx); A.blob(sx * 0.62 + 0.08, 0.55, d / 2 + 0.5, 0.09, 0.09, 0.09, pick(BLOOMS, v(12 + sx)), TILE.white, 0.1, 1); }
  }
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
  for (let i = 0; i < 4; i++) { const k = 1 - i * 0.24; A.box(0, h + i * 0.24 * s, 0, (w + 0.3) * k, 0.24 * s, (d + 0.3) * k, R, TILE.white); }   // the stepped white roof
  const sx = v(2) < 0.5 ? -1 : 1;   // the buttress chimney on one gable end, wide at the foot
  A.box(sx * (w / 2 + 0.25), 0, 0, 0.5, h * 0.7, 1.1, wall, TILE.white); A.box(sx * (w / 2 + 0.2), h * 0.7, 0, 0.4, h * 0.9, 0.7, wall, TILE.white); A.box(sx * (w / 2 + 0.2), h * 1.6 + 0.05, 0, 0.5, 0.12, 0.8, R, TILE.white);
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

// ---- the other buildings of a harbour, in its family. kind: tavern | church | belltower | warehouse (round huts, stilt huts, cubes and
// the like are plain family houses: world.js and villagestyles.js send them to familyHouse). Each is built in its own frame (front +z,
// ground y 0). hooks.bell(A, y, s): hang a bell of size s from y (a bell tower's swings at noon); hooks.flag(A, x, y, z): the faction's
// flag on the church's top (it stands in for the cross or finial there).
// A tavern keeps a chimney near (-1.5, -0.7) whose top is about 4.8 high, where the harbour's evening smoke rises.
export function familyBuilding(A, kit, kind, x, z, hooks = {}) {
  const v = (s) => h01(x, z, s), wall = pick(kit.walls, v(1));
  const B = BUILDINGS[kit.fam][kind];
  if (B) B(A, kit, wall, v, hooks); else familyHouse(A, kit, x, z);
}
const DARK = '#24283a', DOOR = '#4a3222';
function tavernDress(A, K, f) {   // f: { w, d (front face z), y (floor), sign colour }: a hanging sign, two lamps by the door, barrels, a bench
  const fz = f.d, y = f.y || 0;
  A.box(f.w / 2 + 0.15, y + 1.3, fz - 0.15, 0.1, 1.5, 0.1, '#4a3424', TILE.bark);
  A.box(f.w / 2 + 0.55, y + 2.7, fz - 0.15, 0.9, 0.08, 0.08, '#4a3424', TILE.bark);
  A.box(f.w / 2 + 0.6, y + 2.0, fz - 0.15, 0.7, 0.56, 0.07, f.sign || '#e8c060', TILE.flag);
  for (const sx of [-0.75, 0.75]) A.box(sx, y + 1.75, fz + 0.08, 0.15, 0.2, 0.15, '#ffd890', TILE.glow);
  for (const [bx, by, bz, s] of [[-f.w / 2 + 0.45, 0, 0.55, 0.85], [-f.w / 2 + 1.15, 0, 0.62, 0.8], [-f.w / 2 + 0.8, 0.72, 0.58, 0.7]]) {
    A.cyl(bx, y + by, fz + bz, 0.42 * s, 0.34 * s, 0.9 * s, 6, '#8a5a30', TILE.planks, true);
    A.cyl(bx, y + by + 0.2 * s, fz + bz, 0.45 * s, 0.45 * s, 0.07 * s, 6, '#3a2a1c', TILE.stone, false);
  }
  A.box(f.w * 0.22, y, fz + 0.6, 1.3, 0.4, 0.36, '#6b4a2e', TILE.planks);   // the bench
}
const chimney = (A, col, top, tile = TILE.stone) => { A.box(-1.5, 0, -0.7, 0.5, top, 0.5, col, tile); A.box(-1.5, top, -0.7, 0.62, 0.1, 0.62, shade(col, 0.7), TILE.stone); };

// chattel: board units on stone blocks
function chUnit(A, K, wall, ox, oz, w, d, h, rh, base = 0.32) {
  for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A.box(ox + cx * (w / 2 - 0.15), 0, oz + cz * (d / 2 - 0.15), 0.32, base, 0.32, '#8a857c', TILE.stone);
  A.box(ox, base, oz, w, h, d, wall, TILE.white, TILE.white);
  for (let i = 1; i < 5; i++) A.box(ox, base + i * h / 5, oz + d / 2 + 0.01, w, 0.03, 0.02, shade(wall), TILE.white);
  A.gable(ox, base + h, oz, w + 0.3, rh, d + 0.25, K.roof, TILE.roof, wall);
  A.box(ox, base + h - 0.1, oz + d / 2 + 0.06, w + 0.2, 0.12, 0.06, K.trim, TILE.planks);
}
function shutters(A, cx, y, z, T, open) {
  A.box(cx, y, z, 0.46, 0.62, 0.05, open ? '#2a2a34' : T, TILE.planks);
  if (open) for (const o of [-1, 1]) A.box(cx + o * 0.36, y, z + 0.04, 0.22, 0.62, 0.04, T, TILE.planks);
}
const BUILDINGS = { chattel: {}, gable: {}, bermuda: {}, stilt: {}, classical: {} };

BUILDINGS.chattel.tavern = (A, K, wall, v) => {   // a rum shop: two units side by side, a gallery along the front
  const d = 3.0, h = 1.8, T = K.trim, wall2 = pick(K.walls, (v(1) + 0.4) % 1);
  chimney(A, '#8a857c', 4.8);
  chUnit(A, K, wall, -1.2, 0, 2.4, d, h, 1.15); chUnit(A, K, wall2, 1.2, 0, 2.4, d, h, 1.15);
  A.box(0, 0.32, d / 2 + 0.75, 4.9, 0.12, 1.5, '#8a6a48', TILE.planks);   // the gallery floor
  for (const px of [-2.3, -0.8, 0.8, 2.3]) A.box(px, 0.44, d / 2 + 1.4, 0.12, 1.6, 0.12, T, TILE.planks);
  A.push(0, 2.05, d / 2 + 0.75, 0, 1, 1, 1, 0.22, 0); A.box(0, 0, 0, 5.2, 0.08, 1.7, K.roof, TILE.roof); A.pop();
  A.box(0, 1.92, d / 2 + 1.45, 4.9, 0.14, 0.05, T, TILE.planks);   // fretwork on the gallery
  A.box(-1.2, 0.32, d / 2 + 0.02, 0.62, 1.45, 0.06, T, TILE.planks); A.box(-1.2, 0.32, d / 2 + 0.05, 0.5, 1.38, 0.05, DOOR, TILE.planks);
  A.box(1.2, 0.32, d / 2 + 0.02, 0.62, 1.45, 0.06, T, TILE.planks); A.box(1.2, 0.32, d / 2 + 0.05, 0.5, 1.38, 0.05, DOOR, TILE.planks);
  shutters(A, -0.4, 0.95, d / 2 + 0.04, T, true); shutters(A, 2.0, 0.95, d / 2 + 0.04, T, v(3) < 0.5);
  tavernDress(A, K, { w: 4.9, d: d / 2 + 1.5, y: 0.3 });
};
BUILDINGS.chattel.church = (A, K, wall, v, H) => {   // a white board chapel on blocks, a steep roof, a little belfry over the door
  const w = 3.0, d = 5.2, h = 2.3, base = 0.35, W = '#f4f0e6', T = K.trim;
  chUnit(A, K, W, 0, 0, w, d, h, 1.7, base);
  for (const pz of [-1.4, 0, 1.4]) for (const sx of [-1, 1]) { A.box(sx * (w / 2 + 0.01), base + 0.7, pz, 0.04, 1.1, 0.5, DARK, TILE.white); A.box(sx * (w / 2 + 0.02), base + 1.8, pz, 0.04, 0.2, 0.3, DARK, TILE.white); }   // tall pointed windows
  A.box(0, base, d / 2 + 0.02, 0.9, 1.75, 0.06, T, TILE.planks); A.box(0, base, d / 2 + 0.05, 0.76, 1.68, 0.05, DOOR, TILE.planks);
  A.box(0, 0, d / 2 + 0.4, 1.4, base, 0.6, '#9a958a', TILE.stone);
  const by = base + h + 1.0;   // the belfry sits on the ridge at the front
  A.box(0, by, d / 2 - 0.7, 1.0, 0.9, 1.0, W, TILE.white);
  for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A.box(cx * 0.4, by + 0.9, d / 2 - 0.7 + cz * 0.4, 0.14, 0.9, 0.14, W, TILE.planks);
  if (H.bell) { A.push(0, 0, d / 2 - 0.7); H.bell(A, by + 1.75, 0.6); A.pop(); }
  A.push(0, by + 1.8, d / 2 - 0.7, Math.PI / 4); A.cyl(0, 0, 0, 0.95, 0, 1.3, 4, K.roof, TILE.roof, false); A.pop();
  if (H.flag) H.flag(A, 0, by + 3.05, d / 2 - 0.7);
  else { A.box(0, by + 3.1, d / 2 - 0.7, 0.08, 0.6, 0.08, T, TILE.planks); A.box(0, by + 3.45, d / 2 - 0.7, 0.4, 0.08, 0.08, T, TILE.planks); }
};
BUILDINGS.chattel.belltower = (A, K, wall, v, H) => {   // an open timber belfry: four posts, braces, a platform, a hipped cap
  const T = K.trim;
  A.box(0, 0, 0, 2.0, 0.3, 2.0, '#8a857c', TILE.stone);
  for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A.box(cx * 0.8, 0.3, cz * 0.8, 0.2, 4.6, 0.2, '#6b4a2e', TILE.bark);
  for (const y of [1.5, 3.0]) for (const [w, d] of [[1.8, 0.1], [0.1, 1.8]]) for (const o of [-0.8, 0.8]) A.box(w > 1 ? 0 : o, y, w > 1 ? o : 0, w, 0.1, d, '#5a3e24', TILE.bark);
  A.box(0, 3.5, 0, 1.9, 0.12, 1.9, '#8a6a48', TILE.planks);
  A.box(0, 3.62, 0.85, 1.9, 0.5, 0.06, wall, TILE.white); A.box(0, 3.62, -0.85, 1.9, 0.5, 0.06, wall, TILE.white);   // a painted rail band
  if (H.bell) H.bell(A, 4.85, 1);
  A.push(0, 4.9, 0, Math.PI / 4); A.cyl(0, 0, 0, 1.6, 0, 1.4, 4, K.roof, TILE.roof, false); A.pop();
  A.box(0, 6.25, 0, 0.1, 0.5, 0.1, T, TILE.planks);
  A.box(0, 0.3, 0.92, 0.1, 3.2, 0.1, '#5a3e24', TILE.bark);   // a ladder up the front
  for (let i = 0; i < 6; i++) A.box(0, 0.6 + i * 0.5, 0.95, 0.5, 0.05, 0.05, '#5a3e24', TILE.bark);
};
BUILDINGS.chattel.warehouse = (A, K, wall) => {   // a long board shed on blocks
  const w = 2.8, d = 5.4, h = 1.9, base = 0.3;
  chUnit(A, K, shade(wall, 0.9), 0, 0, w, d, h, 0.9, base);
  A.box(0, base, d / 2 + 0.03, 1.6, 1.7, 0.06, K.trim, TILE.planks); A.box(0, base, d / 2 + 0.06, 1.44, 1.62, 0.05, '#3a2a1c', TILE.planks);
  for (const [cx, cz, r] of [[w / 2 + 0.55, d / 2 - 0.5, 0.3], [w / 2 + 0.6, d / 2 - 1.6, 0.9]]) { A.push(cx, 0, cz, r); A.box(0, 0, 0, 0.85, 0.75, 0.85, '#a07040', TILE.planks); A.pop(); }
};

// gable: Willemstad's waterfront
function gableFront(A, K, wall, x0, w, d, h, stepped, s = 1) {   // the street gable on top of a front of height h at z = d/2
  const T = K.trim;
  if (stepped) for (let i = 0; i < 3; i++) { const ww = w * (0.86 - i * 0.26); A.box(x0, h + i * 0.34 * s, d / 2 - 0.08, ww, 0.34 * s, 0.16, wall, TILE.white); A.box(x0, h + (i + 1) * 0.34 * s - 0.05, d / 2 - 0.06, ww + 0.08, 0.06, 0.2, T, TILE.white); }
  else { A.box(x0, h, d / 2 - 0.08, w * 0.7, 0.5 * s, 0.16, wall, TILE.white); A.cyl(x0, h + 0.5 * s, d / 2 - 0.08, 0.5 * s, 0.5 * s, 0.16, 8, wall, TILE.white, true); A.box(x0, h + 1.0 * s, d / 2 - 0.08, 0.14, 0.2, 0.18, T, TILE.white); }
  A.box(x0, h - 0.08, d / 2 + 0.02, w + 0.1, 0.1, 0.06, T, TILE.white);
}
function gWin(A, K, x, y, z) { A.box(x, y, z, 0.42, 0.62, 0.05, K.trim, TILE.white); A.box(x, y + 0.05, z + 0.03, 0.3, 0.52, 0.04, DARK, TILE.white); }
BUILDINGS.gable.tavern = (A, K, wall, v) => {   // two gable houses knocked into one, a wide door, the sign out over the quay
  const d = 3.0, wall2 = pick(K.walls, (v(1) + 0.4) % 1), sides = [[-1.15, wall, 2.9], [1.15, wall2, 2.2]];
  chimney(A, '#9a8a7a', 4.8);
  for (const [ox, wl, h] of sides) {
    A.box(ox, 0, 0, 2.3, h, d, wl, TILE.wall, TILE.white);
    A.gable(ox, h, -0.15, 2.2, 1.0, d - 0.3, K.roof, TILE.roof, wl);
    gableFront(A, K, wl, ox, 2.3, d, h, ox < 0 ? v(3) < 0.5 : v(3) >= 0.5);
    for (const sx of [-0.55, 0.55]) gWin(A, K, ox + sx, 1.55, d / 2 + 0.03);
  }
  A.box(-1.15, 0, d / 2 + 0.02, 1.0, 1.4, 0.06, K.trim, TILE.white); A.box(-1.15, 0, d / 2 + 0.05, 0.86, 1.32, 0.05, DOOR, TILE.planks);
  gWin(A, K, 1.15, 0.5, d / 2 + 0.03);
  tavernDress(A, K, { w: 4.6, d: d / 2, sign: '#f8f6f0' });
};
BUILDINGS.gable.church = (A, K, wall, v, H) => {   // a Dutch church: a long yellow hall, white trim, a white tower and spire at the front
  const w = 3.2, d = 5.4, h = 3.0, T = K.trim, yel = '#f2c840';
  A.box(0, 0, 0, w, h, d, yel, TILE.wall, TILE.white);
  A.box(0, h - 0.1, 0, w + 0.12, 0.14, d + 0.12, T, TILE.white);
  A.gable(0, h, 0, w + 0.3, 1.6, d + 0.3, K.roof, TILE.roof, yel);
  for (const pz of [-1.6, 0, 1.6]) for (const sx of [-1, 1]) { A.box(sx * (w / 2 + 0.02), 0.9, pz, 0.05, 1.5, 0.62, T, TILE.white); A.box(sx * (w / 2 + 0.04), 0.98, pz, 0.04, 1.34, 0.46, DARK, TILE.white); }
  const tz = d / 2 + 0.55;   // the tower
  A.box(0, 0, tz, 1.7, 5.0, 1.4, T, TILE.wall, TILE.white);
  for (const y of [2.4, 4.9]) A.box(0, y, tz, 1.82, 0.12, 1.52, yel, TILE.white);
  A.box(0, 0, tz + 0.71, 0.9, 1.9, 0.06, yel, TILE.white); A.box(0, 0, tz + 0.74, 0.74, 1.8, 0.05, DOOR, TILE.planks);
  A.box(0, 3.4, tz + 0.71, 0.5, 0.9, 0.05, DARK, TILE.white);
  A.cyl(0, 5.0, tz, 0.7, 0.7, 1.0, 8, T, TILE.white, true);   // the open lantern
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; A.box(Math.cos(a) * 0.7, 5.25, tz + Math.sin(a) * 0.7, 0.2, 0.5, 0.2, DARK, TILE.white); }
  if (H.bell) { A.push(0, 0, tz); H.bell(A, 5.9, 0.55); A.pop(); }
  A.cyl(0, 6.0, tz, 0.8, 0, 2.2, 8, K.roof, TILE.roof, false);
  A.box(0, 8.1, tz, 0.08, 0.6, 0.08, '#c8a040', TILE.glow);
  if (H.flag) H.flag(A, 0, 8.4, tz);
};
BUILDINGS.gable.belltower = (A, K, wall, v, H) => {   // a slim tower in the harbour's colour, white bands, an open belfry, an ogee cap
  const T = K.trim;
  A.box(0, 0, 0, 1.6, 4.6, 1.6, wall, TILE.wall, TILE.white);
  for (const y of [1.6, 3.2, 4.5]) A.box(0, y, 0, 1.72, 0.12, 1.72, T, TILE.white);
  A.box(0, 0, 0.81, 0.7, 1.5, 0.06, DOOR, TILE.planks);
  for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A.box(cx * 0.66, 4.6, cz * 0.66, 0.26, 1.3, 0.26, T, TILE.white);
  if (H.bell) H.bell(A, 5.8, 1);
  A.box(0, 5.9, 0, 1.75, 0.16, 1.75, T, TILE.white);
  A.cyl(0, 6.06, 0, 1.0, 0.35, 0.7, 8, K.roof, TILE.roof, true); A.cyl(0, 6.76, 0, 0.35, 0, 1.2, 8, K.roof, TILE.roof, false);
  A.blob(0, 8.05, 0, 0.14, 0.14, 0.14, '#c8a040', TILE.glow, 0.1, 2);
};
BUILDINGS.gable.warehouse = (A, K, wall) => {   // a tall pakhuis: three floors, a stepped gable, loading doors one above the other, a hoist beam
  const w = 2.8, d = 4.4, h = 4.4, T = K.trim, col = shade(wall, 0.85);
  A.box(0, 0, 0, w, h, d, col, TILE.wall, TILE.white);
  A.gable(0, h, -0.15, w - 0.1, 1.1, d - 0.3, K.roof, TILE.roof, col);
  gableFront(A, K, col, 0, w, d, h, true, 1.1);
  for (let f = 0; f < 3; f++) { A.box(0, 0.15 + f * 1.45, d / 2 + 0.03, 0.9, 1.15, 0.05, T, TILE.white); A.box(0, 0.2 + f * 1.45, d / 2 + 0.06, 0.76, 1.05, 0.05, f ? '#5a6a3a' : '#3a2a1c', TILE.planks); }
  for (const sx of [-0.95, 0.95]) for (let f = 1; f < 3; f++) gWin(A, K, sx, 0.4 + f * 1.45, d / 2 + 0.03);
  A.box(0, h + 0.75, d / 2 + 0.5, 0.16, 0.16, 1.1, '#4a3424', TILE.bark);   // the hoist beam, a rope and a hook
  A.box(0, h - 0.7, d / 2 + 0.98, 0.04, 1.45, 0.04, '#c8b890', TILE.rope); A.box(0, h - 0.8, d / 2 + 0.98, 0.14, 0.12, 0.08, '#3a3430', TILE.stone);
  for (const [cx, cz, r] of [[w / 2 + 0.55, d / 2 - 0.4, 0.2], [w / 2 + 0.55, d / 2 - 1.4, 1.0]]) { A.push(cx, 0, cz, r); A.box(0, 0, 0, 0.85, 0.75, 0.85, '#a07040', TILE.planks); A.pop(); }
};

// bermuda: white stepped roofs
function bRoof(A, R, w, d, h, y = 0, n = 4) { for (let i = 0; i < n; i++) { const k = 1 - i * 0.24; A.box(0, y + h + i * 0.24, 0, (w + 0.3) * k, 0.24, (d + 0.3) * k, R, TILE.white); } }
function bWin(A, K, x, y, z) { A.box(x, y, z, 0.36, 0.42, 0.04, '#2a2e3a', TILE.white); for (const o of [-1, 1]) A.box(x + o * 0.28, y, z + 0.03, 0.18, 0.42, 0.04, K.trim, TILE.planks); }
BUILDINGS.bermuda.tavern = (A, K, wall) => {   // long and low, two chimneys, "welcoming arms" steps flaring out from the door
  const w = 5.0, d = 3.0, h = 1.7;
  chimney(A, wall, 4.8, TILE.white);
  A.box(0, 0, 0, w, h, d, wall, TILE.white, TILE.white);
  bRoof(A, K.roof, w, d, h);
  A.box(w / 2 + 0.25, 0, 0, 0.5, h * 0.7, 1.1, wall, TILE.white); A.box(w / 2 + 0.2, h * 0.7, 0, 0.4, h * 1.1, 0.7, wall, TILE.white);   // the end buttress chimney
  A.box(0, 0, d / 2 + 0.02, 0.8, 1.45, 0.06, K.trim, TILE.planks);
  for (const wx of [-1.7, -0.9, 0.9, 1.7]) bWin(A, K, wx, 0.65, d / 2 + 0.03);
  for (let i = 0; i < 3; i++) A.box(0, 0, d / 2 + 0.3 + i * 0.32, 1.2 + i * 0.7, 0.3 - i * 0.09, 0.34, '#ece6da', TILE.stone);   // the welcoming arms
  for (const sx of [-1, 1]) A.box(sx * (0.75 + 0.95), 0, d / 2 + 0.75, 0.14, 0.5, 0.9, wall, TILE.white);
  tavernDress(A, K, { w, d: d / 2, sign: K.trim });
};
BUILDINGS.bermuda.church = (A, K, wall, v, H) => {   // a white chapel: a stepped roof, buttresses, a front gable wall with a bell-cote
  const w = 3.0, d = 5.2, h = 2.4, W = '#f6f4ee', T = K.trim;
  A.box(0, 0, 0, w, h, d, W, TILE.white, TILE.white);
  bRoof(A, K.roof, w, d, h, 0, 5);
  for (const pz of [-1.7, 0, 1.7]) for (const sx of [-1, 1]) A.box(sx * (w / 2 + 0.2), 0, pz, 0.4, 1.6, 0.5, W, TILE.white);   // buttresses
  for (const pz of [-0.85, 0.85]) for (const sx of [-1, 1]) A.box(sx * (w / 2 + 0.01), 0.8, pz, 0.04, 1.1, 0.42, '#2a2e3a', TILE.white);
  A.box(0, 0, d / 2 + 0.2, w + 0.2, 3.6, 0.4, W, TILE.white);   // the gable wall, stepped at the top
  for (let i = 0; i < 2; i++) A.box(0, 3.6 + i * 0.4, d / 2 + 0.2, (w + 0.2) * (0.62 - i * 0.24), 0.4, 0.4, W, TILE.white);
  for (const sx of [-0.35, 0.35]) A.box(sx, 4.4, d / 2 + 0.2, 0.16, 0.9, 0.36, W, TILE.white);   // the bell-cote
  if (H.bell) { A.push(0, 0, d / 2 + 0.2); H.bell(A, 5.2, 0.5); A.pop(); }
  A.box(0, 5.3, d / 2 + 0.2, 0.9, 0.18, 0.44, W, TILE.white);
  if (!H.flag) A.box(0, 5.48, d / 2 + 0.2, 0.08, 0.5, 0.08, T, TILE.planks);
  A.box(0, 0, d / 2 + 0.41, 0.8, 1.6, 0.05, T, TILE.planks); A.box(0, 2.3, d / 2 + 0.41, 0.4, 0.6, 0.04, '#2a2e3a', TILE.white);
  if (H.flag) H.flag(A, 0, 5.48, d / 2 + 0.2);
};
BUILDINGS.bermuda.belltower = (A, K, wall, v, H) => {   // a white tower, an arched belfry on four piers, a stepped cap
  const W = '#f6f4ee';
  A.box(0, 0, 0, 1.9, 3.8, 1.9, W, TILE.white, TILE.white);
  A.box(0, 0, 0.96, 0.7, 1.4, 0.05, K.trim, TILE.planks); A.box(0, 2.4, 0.96, 0.36, 0.5, 0.04, '#2a2e3a', TILE.white);
  for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A.box(cx * 0.72, 3.8, cz * 0.72, 0.46, 1.2, 0.46, W, TILE.white);
  if (H.bell) H.bell(A, 5.0, 1);
  A.push(0, 5.0, 0); bRoof(A, K.roof, 1.9, 1.9, 0, 0, 4); A.pop();
  A.box(0, 6.0, 0, 0.1, 0.6, 0.1, K.trim, TILE.planks);
};
BUILDINGS.bermuda.warehouse = (A, K, wall) => {   // a long white store with a stepped roof and buttressed ends
  const w = 2.8, d = 5.4, h = 2.0;
  A.box(0, 0, 0, w, h, d, wall, TILE.white, TILE.white);
  bRoof(A, K.roof, w, d, h, 0, 3);
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) A.box(sx * (w / 2 - 0.1), 0, sz * (d / 2 + 0.15), 0.5, 1.4, 0.3, wall, TILE.white);
  A.box(0, 0, d / 2 + 0.02, 1.6, 1.6, 0.06, K.trim, TILE.planks);
  for (const [cx, cz, r] of [[w / 2 + 0.55, d / 2 - 0.5, 0.3], [w / 2 + 0.6, d / 2 - 1.6, 0.9]]) { A.push(cx, 0, cz, r); A.box(0, 0, 0, 0.85, 0.75, 0.85, '#a07040', TILE.planks); A.pop(); }
};

// stilt: posts, decks and palm thatch
function posts(A, T, w, d, top, r = 0.09) { for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A.cyl(cx * (w / 2 - 0.1), -0.6, cz * (d / 2 - 0.1), r, r * 0.9, top + 0.6, 4, T, TILE.bark, false); }
function thatchHip(A, K, y, z, w, d, h) { A.push(0, y, z, Math.PI / 4); A.cyl(0, 0, 0, Math.max(w, d) * 0.85, 0.15, h, 4, K.roof, TILE.rope, false); A.pop(); }
BUILDINGS.stilt.tavern = (A, K, wall) => {   // a big hut on posts, a long deck under a thatch awning, a hammock
  const w = 4.2, d = 3.0, up = 0.9, h = 1.6, T = K.trim;
  chimney(A, '#8a6a4a', 4.8, TILE.planks);
  posts(A, T, w, d + 2.0, up, 0.11);
  A.box(0, up, 0.9, w + 0.3, 0.1, d + 2.0, '#8a6a48', TILE.planks);
  A.box(0, up + 0.1, -0.1, w, h, d, wall, TILE.planks, TILE.planks);
  thatchHip(A, K, up + 0.1 + h, -0.1, w, d, 1.6);
  for (const px of [-w / 2, 0, w / 2]) A.box(px, up + 0.1, d / 2 + 1.75, 0.1, 1.55, 0.1, T, TILE.bark);
  A.push(0, up + 1.7, d / 2 + 1.0, 0, 1, 1, 1, 0.2, 0); A.box(0, 0, 0, w + 0.6, 0.12, 1.9, K.roof, TILE.rope); A.pop();   // the awning
  A.box(-0.5, up + 0.1, d / 2 - 0.08, 0.7, 1.3, 0.06, '#3a2a1c', TILE.planks);
  A.box(1.2, up + 0.75, d / 2 - 0.08, 0.6, 0.4, 0.05, '#1e1a16', TILE.planks);
  A.quad([-w / 2 + 0.1, up + 1.2, d / 2 + 1.7], [-0.3, up + 1.2, d / 2 + 1.7], [-0.6, up + 0.7, d / 2 + 1.5], [-w / 2 + 0.4, up + 0.7, d / 2 + 1.5], '#c8584a', TILE.flag);   // a hammock
  for (const o of [-0.22, 0.22]) A.box(o, -0.1, d / 2 + 2.1, 0.06, up + 0.1, 0.06, T, TILE.bark);
  for (let i = 0; i < 3; i++) A.box(0, 0.15 + i * 0.3, d / 2 + 2.1, 0.5, 0.05, 0.05, T, TILE.bark);
  tavernDress(A, K, { w, d: d / 2 + 1.9, y: up + 0.1, sign: '#c8a860' });
};
BUILDINGS.stilt.church = (A, K, wall, v, H) => {   // an open thatched hall on low posts: low walls, a long steep roof, a carved post at the door
  const w = 3.6, d = 6.0, T = K.trim;
  A.box(0, 0, 0, w + 0.2, 0.3, d + 0.2, '#8a6a48', TILE.planks);
  for (const pz of [-d / 2, -d / 6, d / 6, d / 2]) for (const sx of [-1, 1]) A.box(sx * w / 2, 0.3, pz, 0.16, 2.0, 0.16, T, TILE.bark);
  for (const sx of [-1, 1]) A.box(sx * w / 2, 0.3, 0, 0.08, 0.7, d, wall, TILE.planks);
  A.box(0, 0.3, -d / 2, w, 1.9, 0.08, wall, TILE.planks);
  A.gable(0, 2.3, 0, w + 1.4, 2.4, d + 0.8, K.roof, TILE.rope, K.roof);
  A.box(0, 2.3, d / 2 + 0.3, 0.2, 2.3, 0.2, T, TILE.bark);   // the ridge post
  A.box(-1.0, 0, d / 2 + 0.6, 0.3, 2.6, 0.3, '#c8584a', TILE.bone); A.box(-1.0, 2.6, d / 2 + 0.6, 0.5, 0.3, 0.4, '#e8c060', TILE.bone);   // the carved post
  for (let i = 0; i < 3; i++) A.box(0, 0.3, -1.4 + i * 1.3, 2.0, 0.4, 0.3, '#6b4a2e', TILE.planks);   // benches
  if (H.bell) H.bell(A, 2.25, 0.5);
  if (H.flag) H.flag(A, 0, 4.5, d / 2 + 0.3);
};
BUILDINGS.stilt.belltower = (A, K, wall, v, H) => {   // a pole lookout: four tall poles, a platform, a thatch cap, a ladder
  const T = K.trim;
  for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A.cyl(cx * 0.75, 0, cz * 0.75, 0.12, 0.1, 5.2, 4, T, TILE.bark, false);
  for (const y of [1.6, 3.2]) for (const o of [-0.75, 0.75]) { A.box(0, y, o, 1.6, 0.08, 0.08, T, TILE.bark); A.box(o, y, 0, 0.08, 0.08, 1.6, T, TILE.bark); }
  A.box(0, 3.8, 0, 1.9, 0.12, 1.9, '#8a6a48', TILE.planks);
  A.box(0, 3.92, 0.9, 1.9, 0.5, 0.06, wall, TILE.planks);
  if (H.bell) H.bell(A, 5.1, 1);
  A.push(0, 5.1, 0, Math.PI / 4); A.cyl(0, 0, 0, 1.7, 0.1, 1.5, 4, K.roof, TILE.rope, false); A.pop();
  for (const o of [-0.22, 0.22]) A.box(o, 0, 1.0, 0.06, 3.9, 0.06, T, TILE.bark);
  for (let i = 0; i < 7; i++) A.box(0, 0.4 + i * 0.5, 1.0, 0.5, 0.05, 0.05, T, TILE.bark);
};
BUILDINGS.stilt.warehouse = (A, K) => {   // an open boat shed: a thatch roof on posts over a dugout and nets
  const w = 3.2, d = 5.6, T = K.trim;
  for (const pz of [-d / 2 + 0.2, 0, d / 2 - 0.2]) for (const sx of [-1, 1]) A.box(sx * (w / 2), 0, pz, 0.14, 1.9, 0.14, T, TILE.bark);
  A.gable(0, 1.9, 0, w + 0.8, 1.5, d + 0.6, K.roof, TILE.rope, K.roof);
  A.box(0, 0.05, 0, 0.8, 0.45, 4.2, '#6a4a30', TILE.planks); A.box(0, 0.45, 0, 0.6, 0.04, 3.8, '#3a2a1c', TILE.planks);   // the dugout
  A.quad([w / 2 + 0.02, 1.7, 1.6], [w / 2 + 0.02, 1.7, -1.4], [w / 2 + 0.02, 0.3, -1.2], [w / 2 + 0.02, 0.4, 1.4], '#c8c0a0', TILE.rope);
};

// ---- classical (owner, 2026-11-28: "change the drowned architecture into ancient Roman/Greek architecture and make it look like a lost
// civilisation"): the Drowned harbours are built in weathered marble. Columns with a base and a capital, low tiled roofs, pediments,
// porticos, a temple on a stepped podium, a long stoa for the tavern, a round tholos for the bell, an arched horreum for the stores.
// Older than anyone there: columns broken off and their drums lying where they fell, a roof gone from one house in three, a green-black
// tide line along every wall, cracks, a headless statue. Nobody living built these; the people of the Drowned live in them.
const ALGAE = '#3e5a46', CRACK = '#7a7466';
function column(A, x, y, z, h, r, col, broken = 0) {   // base, a tapering fluted shaft (8 sides), an echinus and abacus capital
  A.box(x, y, z, r * 2.6, 0.18, r * 2.6, col, TILE.white);
  const hh = broken ? h * broken : h;
  A.cyl(x, y + 0.18, z, r, r * 0.86, hh - 0.18, 8, col, TILE.white, !!broken);
  if (!broken) { A.cyl(x, y + h, z, r * 0.9, r * 1.35, 0.16, 8, col, TILE.white, true); A.box(x, y + h + 0.16, z, r * 2.8, 0.14, r * 2.8, col, TILE.white); }
  A.box(x, y + 0.18, z, r * 2.05, 0.35, r * 2.05, ALGAE, TILE.white);   // the tide line at its foot
}
function drum(A, x, y, z, r, a) { A.push(x, y + r, z, a, 1, 1, 1, 0, Math.PI / 2); A.cyl(0, -0.45, 0, r, r, 0.9, 8, '#d6cfbd', TILE.white, true); A.pop(); }   // a fallen column drum
function tideLine(A, w, d) { for (const [x, z, ww, dd] of [[0, d / 2 + 0.01, w, 0.02], [0, -d / 2 - 0.01, w, 0.02], [w / 2 + 0.01, 0, 0.02, d], [-w / 2 - 0.01, 0, 0.02, d]]) A.box(x, 0, z, ww, 0.42, dd, ALGAE, TILE.white); }
function crack(A, x, y, z, h) { A.box(x, y, z, 0.05, h, 0.03, CRACK, TILE.white); A.box(x + 0.08, y + h * 0.6, z, 0.05, h * 0.4, 0.03, CRACK, TILE.white); }
function classical(A, K, wall, v, s) {
  const w = 2.6 * s, d = 2.6 * s, h = 1.7 * s, T = K.trim, ruin = v(2) < 0.32;
  A.box(0, 0, 0, w + 0.3, 0.22, d + 0.3, '#bdb5a2', TILE.white);   // a stone footing
  A.box(0, 0.22, 0, w, h, d, wall, TILE.white, TILE.white); tideLine(A, w, d);
  if (!ruin) {
    A.push(0, 0.22 + h, 0, Math.PI / 2); A.gable(0, 0, 0, d + 0.25, 0.7 * s, w + 0.35, K.roof, TILE.roof, wall); A.pop();   // a low tiled roof, ridge across
    A.box(0, 0.22 + h - 0.08, 0, w + 0.32, 0.16, d + 0.32, '#e8e2d4', TILE.white);   // the cornice
  } else {   // roofless: the walls stand, ragged at the top, a beam across
    for (let i = 0; i < 3; i++) A.box(-w * 0.3 + i * w * 0.3, 0.22 + h, d / 2 - 0.15, w * 0.24, 0.2 + v(5 + i) * 0.5, 0.3, wall, TILE.white);
    A.box(0, 0.22 + h - 0.2, 0, 0.2, 0.2, d, '#4a3a2a', TILE.bark);
  }
  A.box(0, 0.22, d / 2 + 0.02, 0.62, 1.3, 0.06, '#2a2a30', TILE.white);   // a dark doorway
  if (v(3) < 0.6) {   // a small portico: two columns and a pediment over the door
    for (const sx of [-0.55, 0.55]) column(A, sx, 0.22, d / 2 + 0.75, 1.55 * s, 0.11, '#e4ddcc', v(9 + sx) < 0.15 ? 0.55 : 0);
    A.gable(0, 0.22 + 1.55 * s + 0.3, d / 2 + 0.6, 1.6, 0.45, 1.0, K.roof, TILE.roof, '#e4ddcc');
  }
  for (const sx of [-1, 1]) A.box(sx * w * 0.3, 0.95, d / 2 + 0.02, 0.3, 0.42, 0.05, '#2a2a30', TILE.white);   // small square windows
  crack(A, w * 0.42 * (v(4) < 0.5 ? 1 : -1), 0.5, d / 2 + 0.03, 1.0);
  if (v(6) < 0.45) drum(A, w * 0.7, 0, d / 2 + 1.3, 0.22, v(7) * 6);   // something fallen at the door
}
BUILDINGS.classical.tavern = (A, K, wall, v) => {   // a stoa: a long colonnade with a back wall and a tiled lean roof; lamps among the columns
  const w = 6.0, d = 2.6, h = 2.4, T = K.trim;
  chimney(A, '#bdb5a2', 4.8);
  A.box(0, 0, 0, w + 0.4, 0.3, d + 0.6, '#c8c0ae', TILE.white);   // the stylobate
  A.box(0, 0.3, -d / 2 + 0.2, w, h, 0.4, wall, TILE.white); tideLine(A, w, 0.4);
  for (let i = 0; i < 6; i++) column(A, -w / 2 + 0.4 + i * (w - 0.8) / 5, 0.3, d / 2, h, 0.14, '#e4ddcc', i === 4 && v(3) < 0.5 ? 0.6 : 0);
  A.push(0, 0.3 + h + 0.3, 0, 0, 1, 1, 1, -0.14, 0); A.box(0, 0, 0, w + 0.5, 0.14, d + 0.6, K.roof, TILE.roof); A.pop();
  A.box(0, 0.3 + h, d / 2, w + 0.3, 0.3, 0.34, '#e8e2d4', TILE.white);   // the entablature
  A.box(-1.2, 0.3, -d / 2 + 0.42, 0.9, 1.6, 0.05, '#2a2a30', TILE.white);
  tavernDress(A, K, { w, d: d / 2 + 0.3, y: 0.3, sign: T });
};
BUILDINGS.classical.church = (A, K, wall, v, H) => {   // a temple: a stepped podium, six columns across the front and four down each side, a pediment
  const w = 4.4, d = 6.6, h = 3.2, T = K.trim, steps = 3;
  for (let i = 0; i < steps; i++) A.box(0, i * 0.25, 0, w + 1.2 - i * 0.4, 0.25, d + 1.2 - i * 0.4, i % 2 ? '#c8c0ae' : '#d2cab8', TILE.white);
  const y0 = steps * 0.25;
  A.box(0, y0, -0.4, w - 1.4, h, d - 2.0, wall, TILE.white);   // the cella
  A.box(0, y0, d / 2 - 1.38, 0.9, 1.9, 0.06, '#24242c', TILE.white);
  const fallen = Math.floor(v(3) * 6);
  for (let i = 0; i < 6; i++) column(A, -w / 2 + 0.2 + i * (w - 0.4) / 5, y0, d / 2 - 0.3, h, 0.17, '#e8e2d4', i === fallen ? 0.35 : 0);
  for (const sx of [-1, 1]) for (let i = 1; i < 4; i++) column(A, sx * (w / 2 - 0.2), y0, d / 2 - 0.3 - i * (d - 0.6) / 4, h, 0.17, '#e4ddcc', sx > 0 && i === 2 && v(4) < 0.6 ? 0.5 : 0);
  A.box(0, y0 + h + 0.3, 0, w + 0.2, 0.42, d, '#e8e2d4', TILE.white);   // the entablature
  A.gable(0, y0 + h + 0.72, 0, w + 0.4, 1.1, d + 0.2, K.roof, TILE.roof, '#e8e2d4');   // the pediment front and back
  A.box(0, y0 + h + 1.82, d / 2 + 0.05, 0.3, 0.3, 0.3, T, TILE.white);   // a bronze acroterion
  drum(A, w / 2 + 1.2, 0, d / 2 - 1, 0.18, 0.4); drum(A, w / 2 + 1.0, 0, d / 2 + 0.2, 0.18, 1.2);   // the fallen column's drums
  A.box(-w / 2 - 1.1, 0, d / 2 + 0.4, 0.7, 0.9, 0.7, '#c8c0ae', TILE.white); A.box(-w / 2 - 1.1, 0.9, d / 2 + 0.4, 0.38, 1.2, 0.3, '#d6cfbd', TILE.white);   // a statue with no head
  if (H.bell) { A.push(0, 0, d / 2 - 0.4); H.bell(A, y0 + h + 0.2, 0.45); A.pop(); }
  if (H.flag) H.flag(A, 0, y0 + h + 1.95, d / 2 + 0.05);
};
BUILDINGS.classical.belltower = (A, K, wall, v, H) => {   // a tholos: a round temple, a ring of eight columns round a drum wall, a shallow dome
  const R = 1.6, h = 2.8, T = K.trim;
  for (let i = 0; i < 2; i++) A.cyl(0, i * 0.25, 0, R + 0.6 - i * 0.25, R + 0.6 - i * 0.25, 0.25, 10, i ? '#d2cab8' : '#c8c0ae', TILE.white, true);
  A.cyl(0, 0.5, 0, R - 0.5, R - 0.5, h, 10, wall, TILE.white, false);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; column(A, Math.cos(a) * R, 0.5, Math.sin(a) * R, h, 0.13, '#e8e2d4', i === 5 && v(3) < 0.5 ? 0.45 : 0); }
  A.cyl(0, 0.5 + h + 0.2, 0, R + 0.25, R + 0.25, 0.3, 10, '#e8e2d4', TILE.white, false);
  A.blob(0, 0.5 + h + 0.5, 0, R + 0.1, 1.0, R + 0.1, T, TILE.white, 0.05, 3);   // the dome, green with age
  if (H.bell) H.bell(A, 0.5 + h, 0.8);
  A.box(0, 0.5, R - 0.45, 0.6, 1.4, 0.06, '#24242c', TILE.white);
};
BUILDINGS.classical.warehouse = (A, K, wall) => {   // a horreum: a long stone store, a row of round-arched openings, a low roof
  const w = 3.0, d = 6.0, h = 2.4;
  A.box(0, 0, 0, w, h, d, wall, TILE.white, TILE.white); tideLine(A, w, d);
  A.push(0, h, 0); A.gable(0, 0, 0, w + 0.3, 0.6, d + 0.3, K.roof, TILE.roof, wall); A.pop();
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {   // arches down each side
    const z = -d / 2 + 1.1 + i * 1.9; A.box(sx * (w / 2 + 0.01), 0.3, z, 0.05, 1.2, 0.8, '#24242c', TILE.white);
    A.push(sx * (w / 2 + 0.01), 1.5, z, Math.PI / 2, 1, 1, 1, Math.PI / 2, 0); A.cyl(0, -0.025, 0, 0.4, 0.4, 0.05, 8, '#24242c', TILE.white, true); A.pop();
  }
  A.box(0, 0, d / 2 + 0.02, 1.4, 1.8, 0.06, '#2a2a30', TILE.white);
  A.push(0, 1.8, d / 2 + 0.02, 0, 1, 1, 1, Math.PI / 2, 0); A.cyl(0, -0.03, 0, 0.7, 0.7, 0.06, 8, '#2a2a30', TILE.white, true); A.pop();
  crack(A, -w * 0.3, 0.8, d / 2 + 0.03, 1.2); drum(A, w / 2 + 0.8, 0, 1.0, 0.2, 2.2);
  for (let i = 0; i < 3; i++) A.cyl(w / 2 + 0.6, 0, -1 - i * 0.7, 0.28, 0.2, 0.75, 6, '#b06a48', TILE.white, true);   // amphorae
};

