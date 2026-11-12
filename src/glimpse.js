// One wrong moment, once. After the first throw at the hut, on the way home, for about seventeen seconds: the wind drops, the sea
// goes flat, every sound goes away, the gulls stop and turn to look, a lighthouse in sight swings its beam onto the deck, and
// a deep-sea diver stands upright on the water off the bow, broken: a cracked helmet, torn suit, a snapped air hose. Then it is gone and everything is as it was. Nothing explains it;
// Mara only asks why you went quiet. (main.js applies k to the wind, waves, sound, gulls and lighthouses.)
import * as THREE from 'three';
import { smoothstep } from './util.js';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';

export const GLIMPSE_LEN = 17;   // was 9: the diver stays about ten seconds

export class Glimpse {
  constructor(scene) {
    // a deep-sea diver, broken and rusted through: a dented copper helmet with a cracked front window and one side pane gone, flaking
    // rust and barnacles, rust running down the swollen canvas suit in long streaks, corroded straps, weights and cuffs, one arm bent the wrong
    // way, a snapped lifeline chain and a snapped air hose. It leans, standing in the water to the knee, facing the ship (+z is the front).
    const b = new Builder();
    const COP = '#a0602f', COPD = '#6a3b20', RU1 = '#a4562a', RU2 = '#7a3c1e', RU3 = '#c4723a', RUD = '#3f2012', CRUST = '#8c6a46', BARN = '#b9b5a5', BARD = '#8a8678';
    const VER = '#5f8068', VERL = '#86ab96', GLASS = '#0b0f13', CRACK = '#cfe0e4', RUBBER = '#18181a', LEAD = '#3e3d44', LEADR = '#5a4034', SUIT = '#242a24', SUITD = '#161b18', STAIN = '#3a2a1c', KELP = '#1d3a2b';
    const ST = TILE.stone, W = TILE.white, R = TILE.rope;
    const rivet = (x, y, z, c = RU3) => b.box(x, y, z, 0.1, 0.1, 0.1, c, W);
    const barn = (x, y, z, r, sd) => b.blob(x, y, z, r, r * 0.8, r, sd % 2 ? BARN : BARD, W, 0.35, sd);
    const radial = (n, rad, y, fn) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; fn(Math.cos(a) * rad, y, Math.sin(a) * rad, a, i); } };
    b.push(0, 1.5, 0, 0, 1, 1, 1, 0, 0);                                                  // upright, the soles of the boots on the surface of the water
    // legs and boots
    b.cyl(-0.55, -1.5, 0, 0.55, 0.45, 2.3, 6, SUITD, W, true);
    b.cyl(0.55, -1.5, 0.1, 0.55, 0.45, 2.3, 6, SUITD, W, true);
    b.box(-0.55, -1.5, 0.35, 0.8, 0.5, 1.2, LEADR, ST); b.box(0.55, -1.5, 0.45, 0.8, 0.5, 1.2, LEADR, ST);   // lead boots, rusted
    b.box(-0.55, -1.0, 0.55, 0.86, 0.1, 0.8, RU2, W); b.box(0.55, -1.0, 0.65, 0.86, 0.1, 0.8, RU2, W);       // boot straps gone brown
    b.blob(-0.55, -1.2, 1.0, 0.4, 0.28, 0.35, RU1, W, 0.25, 11); b.blob(0.55, -1.2, 1.1, 0.4, 0.28, 0.35, RU2, W, 0.25, 12);   // toecaps
    barn(-0.9, -1.35, 0.5, 0.14, 3); barn(-0.78, -1.28, 0.8, 0.1, 4); barn(0.95, -1.3, 0.6, 0.13, 5); barn(0.2, -1.4, 0.9, 0.09, 6);
    // the canvas suit, swollen and dark, with seams, rust stains and torn patches
    b.cyl(0, 0.7, 0, 1.05, 0.9, 3.3, 7, SUIT, W, true);
    for (const a of [0.4, 1.9, 3.3, 4.8]) b.box(Math.cos(a) * 1.0, 0.8, Math.sin(a) * 1.0, 0.05, 3.0, 0.05, SUITD, W);   // seams
    for (const [x, y, w, h, c] of [[-0.45, 1.9, 0.6, 0.5, STAIN], [0.5, 2.6, 0.5, 0.7, RU2], [-0.2, 3.1, 0.7, 0.4, STAIN], [0.35, 1.3, 0.45, 0.4, RU1], [-0.6, 2.7, 0.35, 0.5, RUD]]) {
      const z = Math.sqrt(Math.max(0.2, 1.0 - x * x)) + 0.012; b.box(x, y, z, w, h, 0.05, c, W);        // stains where the metal has bled into the canvas
    }
    for (const [x, len, c] of [[-0.55, 2.2, RU2], [-0.3, 1.5, RUD], [0.05, 2.7, RU1], [0.4, 1.9, RU2], [0.7, 1.3, RUD], [-0.8, 1.2, RU2]]) {
      const z = Math.sqrt(Math.max(0.2, 1.0 - x * x)) + 0.02; b.box(x, 3.7 - len, z, 0.09, len, 0.05, c, W);   // rust running down from the collar in long streaks
    }
    b.cyl(0, 1.0, 0, 1.12, 1.12, 0.38, 8, LEADR, ST, true);                                   // the lead belt, rusted
    radial(8, 1.13, 1.2, (x, y, z) => rivet(x, y, z, RU3));
    b.box(0, 1.0, 1.14, 0.34, 0.4, 0.1, RU3, W); b.box(0, 1.05, 1.2, 0.14, 0.24, 0.05, RUD, W);   // the buckle
    for (const x of [-0.75, 0.75]) b.box(x, 0.2, Math.sqrt(1.0 - x * x * 0.7) + 0.03, 0.32, 0.8, 0.12, LEADR, ST);   // weights on straps
    // the lifeline: a chain from the belt, cut
    for (let i = 0; i < 5; i++) b.box(-0.95 - i * 0.02, 0.9 - i * 0.28, 0.5 + (i % 2) * 0.05, i % 2 ? 0.1 : 0.2, 0.22, i % 2 ? 0.2 : 0.1, RU2, W);
    b.box(-1.0, -0.55, 0.52, 0.08, 0.34, 0.08, RUD, W);
    b.cyl(0, 3.7, 0, 1.0, 0.95, 0.55, 8, COPD, W, true);                                      // breastplate
    radial(10, 0.99, 3.97, (x, y, z) => rivet(x, y, z));
    b.cyl(0, 3.55, 0, 1.03, 1.03, 0.12, 8, RU1, W, true);                                     // its lower rim, orange with rust
    b.box(0, 3.05, 0.98, 0.7, 0.55, 0.14, COP, W);                                            // a breastplate fitting
    rivet(-0.24, 3.2, 1.07); rivet(0.24, 3.2, 1.07); rivet(-0.24, 2.9, 1.07); rivet(0.24, 2.9, 1.07);
    barn(-0.5, 3.35, 0.9, 0.14, 7); barn(-0.38, 3.28, 0.96, 0.1, 8); barn(0.7, 3.5, 0.75, 0.12, 9);
    // the helmet sits straight on the shoulders
    b.push(0, 4.15, 0, 0, 1, 1, 1, 0, 0);
    b.cyl(0, 0, 0, 0.9, 0.9, 0.3, 8, RU2, W, true);                                           // neck ring
    radial(8, 0.91, 0.15, (x, y, z) => rivet(x, y, z, VER));
    b.blob(0, 1.0, 0, 1.18, 1.1, 1.18, COP, W, 0.09, 2);                                       // the copper dome, pitted
    b.cyl(0, 0.45, 0, 1.17, 1.17, 0.12, 9, RUD, W, true); b.cyl(0, 1.5, 0, 0.85, 0.85, 0.1, 9, RU2, W, true);   // seam bands
    b.blob(0.55, 1.45, 0.45, 0.62, 0.42, 0.55, COPD, W, 0.12, 5);                              // the dent
    b.blob(-0.6, 0.6, 0.4, 0.5, 0.34, 0.45, VER, W, 0.16, 7); b.blob(-0.2, 1.7, 0.2, 0.4, 0.2, 0.35, VERL, W, 0.2, 13);   // verdigris
    b.blob(0.2, 1.9, -0.3, 0.45, 0.25, 0.4, RU1, W, 0.2, 14); b.blob(0.6, 0.35, 0.7, 0.32, 0.2, 0.3, RU3, W, 0.25, 15); b.blob(-0.1, 0.4, 0.85, 0.28, 0.16, 0.2, RU3, W, 0.25, 16);   // flaking rust
    b.box(0, 0.65, 1.06, 1.1, 1.05, 0.22, RU2, W);                                             // front window frame
    radial(8, 0.5, 0.7, (x, y, z, a, i) => rivet(x * 1.05, y + z * 0.95, 1.2, i % 3 ? RU3 : VER));   // rivets round the frame
    b.box(0, 0.7, 1.16, 0.74, 0.72, 0.14, GLASS, W);                                           // the glass, dark
    b.push(0, 1.05, 1.25, 0, 1, 1, 1, 0, 0.5); b.box(-0.02, -0.38, 0, 0.05, 0.78, 0.03, CRACK, W); b.pop();   // cracks across it
    b.push(0, 1.05, 1.25, 0, 1, 1, 1, 0, -0.9); b.box(0.1, -0.3, 0, 0.04, 0.6, 0.03, CRACK, W); b.pop();
    b.box(-0.2, 0.9, 1.25, 0.28, 0.04, 0.03, CRACK, W);
    for (const [x, len, c] of [[-0.45, 1.4, RU1], [0.15, 1.9, RUD], [0.5, 1.2, RU2], [-0.15, 1.0, RU3]]) b.box(x, 0.55 - len * 0.7, 1.19, 0.08, len, 0.04, c, W);   // rust running down from the frame
    barn(-0.55, 0.15, 1.1, 0.13, 17); barn(-0.42, 0.08, 1.14, 0.1, 18); barn(0.58, 1.2, 1.0, 0.1, 19);
    b.box(-1.02, 0.7, 0.1, 0.24, 0.8, 0.8, RU2, W);                                            // left side frame: the pane is gone
    b.box(-1.1, 0.78, 0.1, 0.12, 0.5, 0.5, GLASS, W);
    b.box(-1.12, 1.15, 0.1, 0.12, 0.1, 0.5, RU3, W); b.box(-1.12, 0.35, 0.3, 0.12, 0.1, 0.12, CRACK, W);   // jagged edge and a last sliver of glass
    b.box(1.02, 0.7, 0.1, 0.22, 0.8, 0.8, RU2, W); b.box(1.1, 0.78, 0.1, 0.1, 0.5, 0.5, '#2a3a40', W);   // right side: glass, whole but dim
    barn(-1.1, 0.45, -0.3, 0.12, 20); barn(-1.05, 0.55, -0.45, 0.1, 21);
    b.cyl(0, 0.5, -1.1, 0.34, 0.3, 0.6, 6, RU2, W, true); b.cyl(0, 0.5, -1.1, 0.36, 0.36, 0.1, 6, VER, W, true);   // the hose socket, green at the nut
    b.pop();
    // arms: the left hangs too low, the right is bent wrong; rusted cuffs and elbow plates
    b.cyl(-1.3, 0.1, 0.1, 0.34, 0.26, 3.5, 6, SUIT, W, true);
    b.cyl(-1.3, 0.0, 0.1, 0.42, 0.4, 0.34, 6, RU1, W, true); radial(6, 0.42, 0.15, (x, y, z) => rivet(-1.3 + x, y, 0.1 + z, RU3));   // the cuff
    b.blob(-1.3, -0.35, 0.1, 0.4, 0.45, 0.35, SUITD, W, 0.15, 3);                              // the hand
    b.blob(-1.55, 2.4, 0.1, 0.22, 0.4, 0.3, RU2, W, 0.2, 22);                                  // a stain on the sleeve
    b.cyl(1.3, 2.4, 0, 0.34, 0.28, 1.5, 6, SUIT, W, true);
    b.blob(1.3, 2.35, 0.05, 0.42, 0.32, 0.38, COPD, W, 0.15, 23);                              // elbow plate
    b.push(1.35, 2.4, 0, 0, 1, 1, 1, 0, -1.9); b.cyl(0, 0, 0, 0.28, 0.24, 1.9, 6, SUIT, W, true); b.cyl(0, 1.55, 0, 0.36, 0.34, 0.3, 6, RU1, W, true); b.blob(0, 2.15, 0, 0.36, 0.42, 0.3, SUITD, W, 0.15, 4); b.pop();
    // the air hose: leaves the back of the helmet, rings of rust, falls in loops, ends cut and open
    b.push(0, 4.7, -1.15, 0, 1, 1, 1, -0.5, 0); b.cyl(0, 0, 0, 0.22, 0.22, 2.4, 6, RUBBER, R, true); for (const y of [0.4, 1.0, 1.6, 2.2]) b.cyl(0, y, 0, 0.26, 0.26, 0.08, 6, RU2, W, true); b.pop();
    b.push(0, 3.3, -2.0, 0, 1, 1, 1, 0.1, 0); b.cyl(0, 0, 0, 0.22, 0.22, 2.6, 6, RUBBER, R, true); for (const y of [0.5, 1.3, 2.1]) b.cyl(0, y, 0, 0.26, 0.26, 0.08, 6, RU2, W, true); b.pop();
    b.push(0, 0.9, -2.15, 0, 1, 1, 1, -0.35, 0); b.cyl(0, 0, 0, 0.22, 0.2, 1.6, 6, RUBBER, R, true); b.cyl(0, 1.5, 0, 0.3, 0.28, 0.25, 6, RU1, W, true); b.box(0, 1.65, 0, 0.18, 0.14, 0.18, '#0a0a0c', W); b.pop();   // the cut end: rusted fitting, open
    // torn canvas and kelp
    for (const [x, z, h, w] of [[-0.8, 0.8, 1.7, 0.22], [-0.3, 1.0, 1.3, 0.18], [0.5, 0.95, 1.9, 0.24], [0.95, 0.5, 1.2, 0.18], [-0.95, 0.2, 1.4, 0.2]]) b.box(x, 0.1 - h * 0.35, z, w, h, 0.05, SUITD, W);
    for (const [x, z, h] of [[0.2, 1.05, 2.4], [-0.6, 0.9, 1.8], [1.0, -0.3, 2.0]]) { b.push(x, 2.8, z, 0, 1, 1, 1, 0.12, 0.08); b.box(0, -h, 0, 0.12, h, 0.04, KELP, W); b.pop(); }
    b.pop();
    this.fig = new THREE.Mesh(b.geometry(), mats.props);
    this.fig.visible = false; this.fig.scale.setScalar(0.95);   // was 1.6: smaller, farther-off
    scene.add(this.fig);
    this.t = -1; this.k = 0;
  }
  get active() { return this.t >= 0; }
  start(ship) {
    this.t = 0;
    const a = ship.heading + 0.3, d = 48;
    this.fig.position.set(ship.pos.x + Math.sin(a) * d, 0, ship.pos.z - Math.cos(a) * d);
    this.fig.rotation.y = Math.atan2(ship.pos.x - this.fig.position.x, ship.pos.z - this.fig.position.z);
  }
  /** returns true on the frame the moment ends */
  update(dt) {
    if (this.t < 0) { this.k = 0; return false; }
    this.t += dt;
    const t = this.t;
    this.k = smoothstep(0, 1.2, t) * (1 - smoothstep(GLIMPSE_LEN - 2, GLIMPSE_LEN, t));
    this.fig.visible = t > 3 && t < 14;   // there, and then not there: no fade
    if (t >= GLIMPSE_LEN) { this.t = -1; this.k = 0; this.fig.visible = false; return true; }
    return false;
  }
}
