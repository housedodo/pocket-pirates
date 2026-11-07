// One wrong moment, once. After the first throw at the hut, on the way home, for about nine seconds: the wind drops, the sea
// goes flat, every sound goes away, the gulls stop and turn to look, a lighthouse in sight swings its beam onto the deck, and
// a tall pale figure stands on the water off the bow. Then it is gone and everything is as it was. Nothing explains it;
// Mara only asks why you went quiet. (main.js applies k to the wind, waves, sound, gulls and lighthouses.)
import * as THREE from 'three';
import { smoothstep } from './util.js';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';

export const GLIMPSE_LEN = 9;

export class Glimpse {
  constructor(scene) {
    const b = new Builder();
    b.cyl(0, -1.5, 0, 0.55, 0.3, 7.5, 5, '#1c1820', TILE.white, true);          // a long dark body, standing in the water
    b.cyl(-0.55, 3.2, 0, 0.12, 0.06, 2.6, 4, '#1c1820', TILE.white, false);      // arms hanging too low
    b.cyl(0.55, 3.2, 0, 0.12, 0.06, 2.6, 4, '#1c1820', TILE.white, false);
    b.blob(0, 6.6, 0, 0.42, 0.55, 0.42, '#e8e2d8', TILE.white, 0.05, 3);         // a pale face, no features
    this.fig = new THREE.Mesh(b.geometry(), mats.props);
    this.fig.visible = false; this.fig.scale.setScalar(1.7);
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
