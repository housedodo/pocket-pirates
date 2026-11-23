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
/** the ship's boat alone, about 3.4 long, its keel at y 0, bow toward -z */
export function buildBoat() {
  const b = new Builder();
  b.box(0, 0, 0.1, 1.15, 0.45, 2.6, OAK, TILE.planks);                          // the body
  b.box(0, 0.08, -1.45, 0.75, 0.38, 0.5, OAK, TILE.planks);                     // the bow, narrower
  b.box(0, 0.16, -1.85, 0.35, 0.32, 0.35, OAK_D, TILE.planks);                  // the stem
  b.box(0, 0.42, 0.1, 1.2, 0.08, 2.7, OAK_D, TILE.planks);                      // the gunwale
  for (const z of [-0.5, 0.6]) b.box(0, 0.32, z, 1.1, 0.07, 0.28, '#c8a878', TILE.planks);   // two thwarts
  for (const s of [-1, 1]) { b.box(s * 0.85, 0.42, 0.1, 1.1, 0.05, 0.08, '#c8a878', TILE.planks); b.box(s * 1.35, 0.4, 0.1, 0.35, 0.03, 0.14, '#c8a878', TILE.planks); }   // oars shipped along the sides
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
