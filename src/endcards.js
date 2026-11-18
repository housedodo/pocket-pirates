// The ending cards (owner, 2026-11-18: "the endings have the end cards and then just a short description"). Each card is the game's own
// scene at the Table by the Water, framed for that ending, rendered and turned into pixel art in the browser: averaged down to 320 wide,
// a palette taken from the scene itself, ordered dither between the two nearest colours, a halo round every flame. Nothing is a file
// (RULES 24): the picture is made from the world the player is standing in. Good Dreams is the live view of the Gull where she now lies;
// "Keep sailing" turns that picture back into the game in steps (320 wide, then finer, then the game itself), and play goes on from there.
// The painted stills (cavescene.js) stay as the fallback when a card cannot be made (no Table near, the demo).
import * as THREE from 'three';
import { rt, G } from './core/runtime.js';
import { state } from './core/state.js';
import { LM } from './landmarks.js';
import { shoreR, terrainHeight } from './world.js';
import { makeGuitar } from './systems/endgame.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const WAIT = 10;   // frames the world is given to settle into the new light and camera before the picture is taken

/** where the table stands (world units): x, z, y at the table top. The sea lies along +x from it (landmarks.js 'table', P(0, 0.7)) */
export function tableSpot() {
  const L = LM.table; if (!L || !G.world) return null;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const d = G.world.desc(Math.round(L.x / 110) + dx, Math.round(L.z / 110) + dz);
    if (d && d.lm === 'table') { const R = shoreR(d, 0) * 0.7; return { x: d.x + R, z: d.z, y: terrainHeight(d, R, 0) + 1.0, d }; }
  }
  return null;
}

/** how each ending is framed: the hour, a clear still sky, calm (the sea as it will be: Long Sleep and the Tune wake to no dread), the camera (from the land side, looking out to sea), what is added or hidden */
const STAGES = {
  sleep: { time: 0.27, clear: true, calm: true, cam: (T) => ({ pos: [T.x - 3.4, T.y + 0.7, T.z + 2.6], look: [T.x + 5, T.y - 0.1, T.z - 1.6] }) },
  rises: { time: 0.95, cam: (T) => ({ pos: [T.x - 4.2, T.y + 1.0, T.z + 2.2], look: [T.x + 8, T.y + 0.8, T.z - 1.4] }) },
  tune: { time: 0.93, clear: true, calm: true, guitar: true, cam: (T) => ({ pos: [T.x - 3.4, T.y + 0.7, T.z + 2.6], look: [T.x + 5, T.y - 0.1, T.z - 1.6] }) },
  leave: { cam: (T) => ({ pos: [T.x - 8, T.y + 1.5, T.z + 3.6], look: [T.x + 1.5, T.y - 0.2, T.z - 0.4] }) },   // from down the sand, walking away
  sit: { cam: (T) => ({ pos: [T.x - 2.6, T.y + 1.8, T.z + 1.9], look: [T.x + 2.4, T.y - 0.4, T.z - 0.4] }) },   // over the table: the far chair empty now, the sea beyond
  dreams: { anchor: true },   // the live view: the Gull at anchor off the Table, the game's own camera
};

/** the Gull at anchor off the Table for Good Dreams: she lies along the shore, sails in, and the follow camera behind her */
function anchorOff(T) {
  const ship = G.ship, R = shoreR(T.d, 0) + 24;
  ship.pos.set(T.d.x + R, 0, T.d.z + 8); ship.heading = 0; ship.speed = 0; ship.trim = 0; ship.vel = null; ship.yaw = 0;
  rt.camHeading = 0; rt.yawT = 0; rt.camYaw = 0;
}

/** make the card for an ending: frame it, wait a few frames, take the picture, put everything back. cb(dataURL | null) */
export function makeCard(id, cb) {
  const S = STAGES[id], T = tableSpot();
  if (!S || !T || window.__BUILD === 'demo') { cb(null); return; }
  const keep = { time: state.time, cam: rt.camOverride, vis: G.ship.root.visible, force: G.weather.force, forced: rt.forced };
  if (S.calm) { rt.forced = 0.03; rt.dread = 0.03; }
  if (S.time != null) state.time = S.time;
  if (S.clear) { const w = G.weather; w.force = { cloud: 0.1, rain: 0, storm: 0, fog: 0, calm: 1 }; w.cloud = 0.1; w.rain = 0; w.storm = 0; w.fog = 0; }
  if (S.anchor) anchorOff(T);
  let gtr = null;
  if (S.guitar) { gtr = makeGuitar(); gtr.position.set(T.x - 1.6, T.y - 0.45, T.z + 0.6); gtr.rotation.order = 'YXZ'; gtr.rotation.set(1.2, 0.9, 0); G.ship.root.parent.add(gtr); }   // leaning on your chair
  if (S.cam) { rt.camOverride = S.cam(T); G.ship.root.visible = false; }
  let n = WAIT;
  rt.onRendered = (cv) => {
    if (--n > 0) return;
    rt.onRendered = null;
    let url = null;
    try { url = pixelate(cv, 320, 16).toDataURL(); } catch (e) { /* a lost context: the painted still stays */ }
    if (S.cam) { rt.camOverride = keep.cam; G.ship.root.visible = keep.vis; }
    if (S.clear) G.weather.force = keep.force;
    if (S.calm) rt.forced = keep.forced;
    if (gtr && gtr.parent) gtr.parent.remove(gtr);
    if (S.time != null && id !== 'sleep' && id !== 'tune' && id !== 'rises') state.time = keep.time;   // those three go on at their own hour
    cb(url);
  };
}

/** the picture as pixel art: W wide (the canvas's own shape), a palette of n colours from the picture itself (0: the averaged pixels
 *  as they are), ordered dither between the two nearest colours, a halo round each flame */
export function pixelate(src, W, n) {
  const H = Math.round(W * src.height / src.width), mid = document.createElement('canvas'), cv = document.createElement('canvas');
  mid.width = W * 2; mid.height = H * 2; cv.width = W; cv.height = H;
  const m = mid.getContext('2d'); m.imageSmoothingEnabled = true; m.drawImage(src, 0, 0, W * 2, H * 2);
  const c = cv.getContext('2d', { willReadFrequently: true }); c.imageSmoothingEnabled = true; c.drawImage(mid, 0, 0, W, H);
  if (!n) return cv;
  const img = c.getImageData(0, 0, W, H), d = img.data;
  { // a night card is lifted until its shapes read, and stays a night: gamma from the picture's mean brightness, never brighter than ~78
    let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    const mean = Math.max(4, sum / (d.length / 4)), gam = mean < 70 ? Math.max(0.5, Math.log(78 / 255) / Math.log(mean / 255)) : 1;
    if (gam < 1) for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = 255 * Math.pow(d[i + k] / 255, gam);
  }
  const pal = palette(d, n);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = (y * W + x) * 4, r = d[k], g = d[k + 1], b = d[k + 2];
    let i1 = 0, i2 = 0, d1 = 1e9, d2 = 1e9;
    for (let i = 0; i < pal.length; i++) { const p = pal[i], e = (p[0] - r) ** 2 * 0.3 + (p[1] - g) ** 2 * 0.59 + (p[2] - b) ** 2 * 0.11; if (e < d1) { d2 = d1; i2 = i1; d1 = e; i1 = i; } else if (e < d2) { d2 = e; i2 = i; } }
    const t = Math.sqrt(d1) / (Math.sqrt(d1) + Math.sqrt(d2) + 1e-6);   // 0 on the nearest colour, 0.5 halfway to the next
    const p = pal[t * 2 > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 * 1.6 ? i2 : i1];   // dither only in the strip where two colours meet
    d[k] = p[0]; d[k + 1] = p[1]; d[k + 2] = p[2];
  }
  halos(d, W, H);
  c.putImageData(img, 0, 0);
  return cv;
}
/** a palette from the picture: k-means over a sample, started from colours spread over its brightness */
function palette(d, n) {
  const px = []; for (let i = 0; i < d.length; i += 4 * 3) px.push([d[i], d[i + 1], d[i + 2]]);
  const lum = (p) => p[0] * 0.3 + p[1] * 0.59 + p[2] * 0.11, s = [...px].sort((a, b) => lum(a) - lum(b));
  let C = Array.from({ length: n }, (_, i) => [...s[Math.min(s.length - 1, Math.floor((i + 0.5) / n * s.length))]]);
  for (let it = 0; it < 7; it++) {
    const acc = C.map(() => [0, 0, 0, 0]);
    for (const p of px) { let bi = 0, be = 1e9; for (let i = 0; i < C.length; i++) { const q = C[i], e = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2; if (e < be) { be = e; bi = i; } } const a = acc[bi]; a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3]++; }
    C = C.map((q, i) => (acc[i][3] ? [acc[i][0] / acc[i][3], acc[i][1] / acc[i][3], acc[i][2] / acc[i][3]] : q));
  }
  return C.map((q) => q.map(Math.round));
}
/** the brightest warm points (candle flames, lamps, windows) get a soft dithered halo, as the painted stills have */
function halos(d, W, H) {
  const pts = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const k = (y * W + x) * 4; if (d[k] > 150 && d[k + 1] > 105 && d[k + 2] < 110 && d[k] - d[k + 2] > 70) if (!pts.some((q) => Math.abs(q[0] - x) < 6 && Math.abs(q[1] - y) < 6)) pts.push([x, y]); }
  for (const [cx, cy] of pts.slice(0, 16)) for (let y = cy - 9; y <= cy + 9; y++) for (let x = cx - 9; x <= cx + 9; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const t = 1 - Math.hypot(x - cx, (y - cy) * 1.15) / 9; if (t <= 0 || t * t * 0.7 < BAYER[(y & 3) * 4 + (x & 3)] / 16) continue;
    const k = (y * W + x) * 4; d[k] += (255 - d[k]) * 0.35; d[k + 1] += (208 - d[k + 1]) * 0.35; d[k + 2] += (112 - d[k + 2]) * 0.35;
  }
}

// ---- Good Dreams: from the card back into the game, in steps
/** the card over the whole screen, then the live view taken again, finer each step (320, 480, 720 wide, then unpixelated), then gone */
export function unpixelate(card, done) {
  let el = document.getElementById('endMorph');
  if (!el) { el = document.createElement('img'); el.id = 'endMorph'; document.body.appendChild(el); }
  el.src = card; el.className = 'on';
  const steps = [[480, 22], [720, 32], [1080, 0], [0, 0]];
  let i = 0;
  const next = () => {
    const st = steps[i++];
    if (!st) { el.className = ''; if (done) done(); return; }
    if (!st[0]) { el.className = 'on out'; setTimeout(() => { el.className = ''; if (done) done(); }, 700); return; }
    let n = 2;
    rt.onRendered = (cv) => { if (--n > 0) return; rt.onRendered = null; try { el.src = pixelate(cv, st[0], st[1]).toDataURL(); } catch (e) { /* keep the last step */ } setTimeout(next, 380); };
  };
  setTimeout(next, 700);   // the card holds a moment first
}
