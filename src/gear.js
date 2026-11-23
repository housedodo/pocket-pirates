// The diving bell and the ship's boat (a design trial, owner 2026-11-23: "design both like other objects in game and show how it would
// play out"; docs/proposals/DIVE_AND_BOAT.md). Played since 2026-11-23 (systems/gearplay.js): on the Gull when bought and aboard.
//   the diving bell: a squat brass bell with two dark bands and three small round ports, an iron ring on top, hung on a chain from a
//     davit at the starboard quarter. Stowed, it hangs just over the rail; lowered, the chain pays out to the water.
//   the ship's boat: a small clinker boat with two thwarts and a pair of oars, towed astern on a line (its own model, not the sea's
//     sighting rowboat, so it reads as the Gull's: the same oak and the same paint).
import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';

const BRASS = '#b08a3a', BRASS_D = '#7a5a22', IRON = '#2a2622', OAK = '#8a5428', OAK_D = '#5a3418';
const meshOf = (b) => { const m = new THREE.Mesh(b.geometry(), mats.props); return m; };

/** the bell alone, its mouth at y 0 (about 1.5 tall, 2.2 across the mouth) */
export function buildBell() {
  const b = new Builder();
  b.cyl(0, 0, 0, 1.1, 0.72, 1.3, 10, BRASS, TILE.white);            // the body, flaring to the mouth
  b.cyl(0, 1.3, 0, 0.72, 0.35, 0.3, 10, BRASS, TILE.white);         // the shoulder
  b.cyl(0, 0.05, 0, 1.14, 1.14, 0.14, 10, BRASS_D, TILE.white, false);   // the lip
  b.cyl(0, 0.75, 0, 0.94, 0.94, 0.1, 10, BRASS_D, TILE.white, false);    // a band
  for (let i = 0; i < 3; i++) { const t = (i / 3) * Math.PI * 2 + 0.3; b.box(Math.cos(t) * 0.92, 0.42, Math.sin(t) * 0.92, 0.26, 0.26, 0.26, '#1a2a30', TILE.white); }   // three ports
  b.box(0, 1.6, 0, 0.12, 0.34, 0.12, IRON); b.box(0, 1.85, 0, 0.42, 0.1, 0.1, IRON);   // the ring
  return b;
}
/** the ship's boat alone, about 3.6 long, its keel at y 0, bow toward -z: a lofted clinker hull (owner, 2026-11-23: "the boat looks
 *  very flat"): the sheer rises to the bow and a little to the stern, two strakes of planking outside, the inside dark with ribs,
 *  a transom, a stem post, two thwarts, rowlocks and a pair of oars shipped along the thwarts */
export function buildBoat() {
  const b = new Builder();
  // stations bow (-1.8) to stern (+1.7): half-beam at the gunwale, sheer height, half-beam at the chine
  const ST = [[-1.8, 0.04, 0.78, 0.02], [-1.45, 0.34, 0.66, 0.16], [-0.9, 0.6, 0.56, 0.36], [-0.2, 0.7, 0.52, 0.44], [0.6, 0.68, 0.53, 0.42], [1.25, 0.58, 0.58, 0.36], [1.7, 0.46, 0.66, 0.3]];
  const OUT1 = '#8a5428', OUT2 = '#a0662e', IN = '#4a2c14', RIM = '#c8a878', KEEL = '#5a3418';
  for (let i = 0; i < ST.length - 1; i++) {
    const [z0, w0, h0, c0] = ST[i], [z1, w1, h1, c1] = ST[i + 1];
    for (const sx of [-1, 1]) {
      const g0 = [sx * w0, h0, z0], g1 = [sx * w1, h1, z1], m0 = [sx * (w0 * 0.5 + c0 * 0.5), (h0 + 0.12) * 0.5, z0], m1 = [sx * (w1 * 0.5 + c1 * 0.5), (h1 + 0.12) * 0.5, z1];
      const k0 = [sx * c0, 0.12, z0], k1 = [sx * c1, 0.12, z1], q0 = [0, 0, z0], q1 = [0, 0, z1];
      b.orient([0, 0.9, (z0 + z1) / 2]);   // outside: faces away from a point above the middle
      b.quad(m0, m1, g1, g0, OUT2, TILE.planks); b.quad(k0, k1, m1, m0, OUT1, TILE.planks); b.quad(q0, q1, k1, k0, KEEL, TILE.planks);
      const ins = (p) => [p[0] * 0.9, p[1] + 0.02, p[2]];   // inside: the same skin a little in, dark, facing in
      b.orient([sx * 3, 0.6, (z0 + z1) / 2]);
      b.quad(ins(m0), ins(m1), ins(g1), ins(g0), IN, TILE.planks); b.quad(ins(k0), ins(k1), ins(m1), ins(m0), IN, TILE.planks);
    }
    b.orient(null);
    b.box(0, 0.14, (z0 + z1) / 2, Math.min(c0, c1) * 1.6, 0.04, Math.abs(z1 - z0) + 0.02, IN, TILE.planks);   // the bottom boards
  }
  b.orient(null);
  for (let i = 1; i < ST.length - 1; i++) { const [z, w, h] = ST[i]; for (const sx of [-1, 1]) b.box(sx * w * 0.97, h - 0.02, z, 0.08, 0.07, Math.abs(ST[i + 1][0] - ST[i - 1][0]) * 0.55, RIM, TILE.planks); }   // the gunwale rail
  for (const z of [-1.1, -0.45, 0.3, 0.95]) b.box(0, 0.16, z, 0.9, 0.36, 0.05, '#3a2210', TILE.planks);   // ribs
  { const [z, w, h] = ST[ST.length - 1]; b.quad([-w, h, z], [w, h, z], [w * 0.5, 0.1, z], [-w * 0.5, 0.1, z], OUT1, TILE.planks); b.quad([-w * 0.5, 0.1, z], [w * 0.5, 0.1, z], [w, h, z], [-w, h, z], IN, TILE.planks); }   // the transom
  b.box(0, 0, -1.82, 0.1, 0.92, 0.12, KEEL, TILE.planks);   // the stem post, standing a little proud of the bow
  b.box(0, -0.05, 0, 0.08, 0.08, 3.3, KEEL, TILE.planks);    // the keel
  for (const z of [-0.6, 0.55]) b.box(0, 0.48, z, 1.0, 0.06, 0.26, RIM, TILE.planks);   // two thwarts
  for (const sx of [-1, 1]) { b.box(sx * 0.5, 0.72, 0.05, 0.05, 0.12, 0.05, '#2a2622'); b.box(sx * 0.18, 0.56, 0.05, 0.06, 0.05, 2.6, RIM, TILE.planks); b.box(sx * 0.18, 0.55, 1.4, 0.16, 0.03, 0.42, RIM, TILE.planks); }   // rowlocks; oars shipped fore and aft
  return b;
}
/** both on the Gull: the davit and the bell at the starboard quarter, the boat towed astern on a line. Returns handles to move them */
export function makeGear() {
  const g = new THREE.Group();
  const davit = new Builder();
  davit.box(1.25, 1.6, 2.2, 0.16, 2.2, 0.16, IRON); davit.box(1.75, 3.7, 2.2, 1.1, 0.14, 0.14, IRON);   // an L of iron over the side
  g.add(meshOf(davit));
  const bell = meshOf(buildBell()); bell.scale.setScalar(0.62); g.add(bell);
  const chain = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1, 0.08), new THREE.MeshBasicMaterial({ color: 0x2a2622 })); g.add(chain);
  const boat = meshOf(buildBoat()); g.add(boat);
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1), new THREE.MeshBasicMaterial({ color: 0xc8b890 })); g.add(line);
  g.userData.gearGroup = true; boat.userData.towed = line.userData.towed = true;
  const H = { g, bell, chain, boat, line, drop: 0, tow: 7.5 };
  H.place = () => {   // stowed or lowered (drop: how far the bell has gone down from the davit), and the boat at the end of its line
    const top = 3.62, by = top - 0.6 - H.drop;
    bell.position.set(2.25, by - 1.85 * 0.62, 2.2);
    chain.position.set(2.25, (top + by) / 2, 2.2); chain.scale.y = Math.max(0.05, top - by);
    boat.position.set(0, -0.15, 3.2 + H.tow);
    line.position.set(0, 0.6, 3.2 + H.tow / 2 - 0.4); line.scale.z = H.tow - 1.2; line.rotation.x = 0.08;
  };
  H.place();
  return H;
}
