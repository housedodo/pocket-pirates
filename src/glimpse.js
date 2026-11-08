// One wrong moment, once. After the first throw at the hut, on the way home, for about nine seconds: the wind drops, the sea
// goes flat, every sound goes away, the gulls stop and turn to look, a lighthouse in sight swings its beam onto the deck, and
// a deep-sea diver stands in the water off the bow, broken: a cracked helmet, torn suit, a snapped air hose. Then it is gone and everything is as it was. Nothing explains it;
// Mara only asks why you went quiet. (main.js applies k to the wind, waves, sound, gulls and lighthouses.)
import * as THREE from 'three';
import { smoothstep } from './util.js';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';

export const GLIMPSE_LEN = 9;

export class Glimpse {
  constructor(scene) {
    // a deep-sea diver in a brass-and-copper suit, broken: it leans, the helmet is tipped and dented, the front glass is cracked and
    // one side pane is gone, the suit hangs in strips with kelp in it, one arm is bent the wrong way, the air hose is snapped.
    // Standing in the water to the knee, facing the ship (+z is the front).
    const b = new Builder();
    const COP = '#8f5a38', COPD = '#5e3a24', VER = '#5f8068', BRASS = '#b8934a', SUIT = '#242a24', SUITD = '#161b18', KELP = '#1d3a2b', GLASS = '#0b0f13', CRACK = '#cfe0e4', RUBBER = '#18181a', LEAD = '#4a4a52';
    b.push(0, 0, 0, 0, 1, 1, 1, 0, 0.14);                                                 // the whole body leans, as if held up by the current
    b.cyl(-0.55, -1.5, 0, 0.55, 0.45, 2.3, 6, SUITD, TILE.white, true);                    // legs, in the water
    b.cyl(0.55, -1.5, 0.1, 0.55, 0.45, 2.3, 6, SUITD, TILE.white, true);
    b.box(-0.55, -1.5, 0.35, 0.8, 0.5, 1.2, LEAD, TILE.white);                             // weighted boots
    b.box(0.55, -1.5, 0.45, 0.8, 0.5, 1.2, LEAD, TILE.white);
    b.cyl(0, 0.7, 0, 1.05, 0.9, 3.3, 7, SUIT, TILE.white, true);                           // the canvas suit, swollen and dark
    b.cyl(0, 1.0, 0, 1.12, 1.12, 0.38, 8, LEAD, TILE.white, true);                         // lead belt
    b.cyl(0, 3.7, 0, 1.0, 0.95, 0.55, 8, COPD, TILE.white, true);                          // breastplate
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; b.box(Math.cos(a) * 0.98, 3.85, Math.sin(a) * 0.98, 0.14, 0.14, 0.14, BRASS, TILE.white); }   // bolts
    b.push(0.12, 4.15, 0, 0, 1, 1, 1, 0.1, -0.34);                                         // the helmet pivots at the neck: tipped to one side, nodding
    b.cyl(0, 0, 0, 0.9, 0.9, 0.3, 8, BRASS, TILE.white, true);                             // neck ring
    b.blob(0, 1.0, 0, 1.18, 1.1, 1.18, COP, TILE.white, 0.07, 2);                          // the copper dome
    b.blob(0.55, 1.45, 0.45, 0.62, 0.42, 0.55, COPD, TILE.white, 0.12, 5);                  // a dent, darker, where something hit it
    b.blob(-0.6, 0.55, 0.4, 0.45, 0.3, 0.4, VER, TILE.white, 0.15, 7);                      // verdigris
    b.box(0, 0.65, 1.06, 1.0, 0.95, 0.22, BRASS, TILE.white);                              // front window frame
    b.box(0, 0.7, 1.16, 0.74, 0.72, 0.14, GLASS, TILE.white);                              // the glass, dark
    b.push(0, 1.05, 1.25, 0, 1, 1, 1, 0, 0.5); b.box(-0.02, -0.38, 0, 0.05, 0.78, 0.03, CRACK, TILE.white); b.pop();   // cracks across it
    b.push(0, 1.05, 1.25, 0, 1, 1, 1, 0, -0.9); b.box(0.1, -0.3, 0, 0.04, 0.6, 0.03, CRACK, TILE.white); b.pop();
    b.box(-0.2, 0.9, 1.25, 0.28, 0.04, 0.03, CRACK, TILE.white);
    b.box(-1.02, 0.7, 0.1, 0.22, 0.7, 0.7, BRASS, TILE.white);                              // side window frame, left: the pane is gone
    b.box(-1.1, 0.78, 0.1, 0.12, 0.5, 0.5, GLASS, TILE.white);                             // nothing in it
    b.box(1.02, 0.7, 0.1, 0.2, 0.7, 0.7, BRASS, TILE.white);                               // right: glass, whole but dim
    b.box(1.1, 0.78, 0.1, 0.1, 0.5, 0.5, '#2a3a40', TILE.white);
    b.cyl(0, 0.5, -1.1, 0.3, 0.28, 0.6, 6, BRASS, TILE.white, true);                       // the hose socket at the back of the helmet
    b.pop();
    // arms: the left hangs too low, the right is bent wrong, with its hand turned the wrong way
    b.cyl(-1.3, 0.1, 0.1, 0.34, 0.26, 3.5, 6, SUIT, TILE.white, true);
    b.blob(-1.3, 0.0, 0.1, 0.4, 0.45, 0.35, SUITD, TILE.white, 0.15, 3);
    b.cyl(1.3, 2.4, 0, 0.34, 0.28, 1.5, 6, SUIT, TILE.white, true);
    b.push(1.35, 2.4, 0, 0, 1, 1, 1, 0, -1.9); b.cyl(0, 0, 0, 0.28, 0.24, 1.9, 6, SUIT, TILE.white, true); b.blob(0, 2.05, 0, 0.36, 0.42, 0.3, SUITD, TILE.white, 0.15, 4); b.pop();
    // the air hose: leaves the back of the helmet, falls in loops, and ends cut and open, hanging
    b.push(0, 4.7, -1.15, 0, 1, 1, 1, -0.5, 0); b.cyl(0, 0, 0, 0.22, 0.22, 2.4, 6, RUBBER, TILE.white, true); b.pop();
    b.push(0, 3.3, -2.0, 0, 1, 1, 1, 0.1, 0); b.cyl(0, 0, 0, 0.22, 0.22, 2.6, 6, RUBBER, TILE.white, true); b.pop();
    b.push(0, 0.9, -2.15, 0, 1, 1, 1, -0.35, 0); b.cyl(0, 0, 0, 0.22, 0.2, 1.6, 6, RUBBER, TILE.white, true); b.box(0, 0.1, -0.1, 0.26, 0.1, 0.26, BRASS, TILE.white); b.pop();   // the cut end, brass fitting, open
    // torn canvas and kelp
    for (const [x, z, h, w] of [[-0.8, 0.8, 1.7, 0.22], [-0.3, 1.0, 1.3, 0.18], [0.5, 0.95, 1.9, 0.24], [0.95, 0.5, 1.2, 0.18], [-0.95, 0.2, 1.4, 0.2]]) b.box(x, 0.1 - h * 0.35, z, w, h, 0.05, SUITD, TILE.white);
    for (const [x, z, h] of [[0.2, 1.05, 2.4], [-0.6, 0.9, 1.8], [1.0, -0.3, 2.0]]) { b.push(x, 2.8, z, 0, 1, 1, 1, 0.12, 0.08); b.box(0, -h, 0, 0.12, h, 0.04, KELP, TILE.white); b.pop(); }
    b.pop();
    this.fig = new THREE.Mesh(b.geometry(), mats.props);
    this.fig.visible = false; this.fig.scale.setScalar(1.9);
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
    this.fig.visible = t > 2 && t < 6.6;   // there, and then not there: no fade
    if (t >= GLIMPSE_LEN) { this.t = -1; this.k = 0; this.fig.visible = false; return true; }
    return false;
  }
}
