// The Edge (owner's sequence, 2026-11-12): once, the first time the ship reaches the deepest dread (stage 5) on open water, the
// sea ahead runs to a straight lip and pours over it into nothing; past it, things far too big stand in the dark. The helm does
// not answer and a current draws the ship to the lip; the camera looks out over the drop and back at the statues; then the mist
// comes in white, and when it clears the ship is drifting away from the edge, pointing home. About 45 seconds. Nothing explains it.
// Full game only. The geometry is the Edge concept (concepts.js buildEdge); the sea beyond the lip is cut off with a clip plane.
import * as THREE from 'three';
import { rt } from '../core/runtime.js';
import { state } from '../core/state.js';
import { renderer, ocean, scene } from '../core/engine.js';
import { buildEdge } from '../concepts.js';

const LEN = 45, AHEAD = 200, STOP = 7;          // seconds; how far ahead the lip appears; where the ship stops short of it
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
rt.edge = null;          // the running sequence: { t, lip:[x,z], f:[fx,fz], r:[rx,rz], g, h0 }
rt.edgeLock = false;     // the helm does not answer
rt.edgeHush = 0;         // 0..1: how far the sound goes away

/** start it now (dev: __game.edge()); the trigger below calls this once */
export function startEdge(ship, fadeEl) {
  if (rt.edge) return false;
  const h = ship.heading, f = [Math.sin(h), -Math.cos(h)], r = [Math.cos(h), Math.sin(h)];
  const lip = [ship.pos.x + f[0] * AHEAD, ship.pos.z + f[1] * AHEAD];
  const g = buildEdge(scene, lip[0], lip[1], -h);
  const far = g.userData.far.material; far.transparent = true; far.opacity = 0; far.needsUpdate = true;
  const n = new THREE.Vector3(-f[0], 0, -f[1]);                       // keep the sea on the ship's side of the lip
  renderer.localClippingEnabled = true; ocean.material.clippingPlanes = [new THREE.Plane(n, -(n.x * lip[0] + n.z * lip[1]))]; ocean.material.needsUpdate = true;
  rt.edge = { t: 0, lip, f, r, g, far, fadeEl, from: [ship.pos.x, ship.pos.z], turned: false };
  rt.edgeLock = true; state.story.edge = state.dayN;
  return true;
}

/** each frame at sea (full game). ctx: { dt, dread, ship, quiet, clearAhead, fadeEl, onDone } */
export function edgeTick({ dt, dread, ship, quiet, clearAhead, fadeEl, onDone }) {
  if (!rt.edge) {
    if (state.story.edge !== undefined || dread < 0.9 || quiet || !clearAhead()) return;
    startEdge(ship, fadeEl);
  }
  const e = rt.edge; e.t += dt; const t = e.t, { f, r, lip } = e;
  e.far.opacity = smooth(0, 14, t);                                   // the dark and what stands in it come out of the mist
  rt.edgeHush = 0.85 * smooth(2, 16, t) * (1 - smooth(40, 45, t));
  if (!e.turned) {
    // the current: the ship is drawn to the lip, slowing at the end, and held there
    const d0 = AHEAD - STOP, k = smooth(1, 20, t), dist = d0 * (k * k * (3 - 2 * k) * 0.5 + k * 0.5);
    ship.pos.x = e.from[0] + f[0] * dist; ship.pos.z = e.from[1] + f[1] * dist;
    ship.heading = Math.atan2(f[0], -f[1]); ship.speed = t < 20 ? 6 : 0; ship.vel = null; ship.trim = 0;
  }
  // the camera: behind and above, looking out (approach); out over the drop, looking back at the ship (20-28 s);
  // low behind the ship, looking up at the statues (28-36 s)
  const S = [ship.pos.x, ship.pos.z], P = (a, b, y) => [S[0] + f[0] * a + r[0] * b, y, S[1] + f[1] * a + r[1] * b], L = (a, b, y) => [lip[0] + f[0] * a + r[0] * b, y, lip[1] + f[1] * a + r[1] * b];
  const shots = [
    { pos: P(-24, 4, 10), look: L(160, -10, 34) },
    { pos: L(32, 44, 12), look: L(-4, -2, -10) },
    { pos: P(-34, 10, 11), look: L(260, -14, 32) },
  ];
  const k1 = smooth(17, 23, t), k2 = smooth(27, 31, t);
  const a = k2 > 0 ? shots[1] : shots[0], b = k2 > 0 ? shots[2] : shots[1], kk = k2 > 0 ? k2 : k1;
  rt.camOverride = t < 37 ? { pos: lerp3(a.pos, b.pos, kk), look: lerp3(a.look, b.look, kk) } : null;
  // the mist comes in white; behind it the edge is gone and the ship drifts away from it, pointing home
  if (t > 35 && !e.fading) { e.fading = true; fadeEl.style.background = '#e8eef0'; fadeEl.classList.add('on'); }
  if (t > 37 && !e.turned) {
    e.turned = true;
    scene.remove(e.g); ocean.material.clippingPlanes = null; ocean.material.needsUpdate = true;
    ship.pos.x -= f[0] * 170; ship.pos.z -= f[1] * 170; ship.heading += Math.PI; ship.speed = 1.5; ship.vel = null; rt.camHeading = ship.heading; rt.yawT = 0; rt.camYaw = 0;
  }
  if (t > 40 && e.fading) { e.fading = false; fadeEl.classList.remove('on'); }
  if (t >= LEN) { fadeEl.style.background = ''; rt.edge = null; rt.edgeLock = false; rt.edgeHush = 0; onDone(); }
}
