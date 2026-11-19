// The ending cards (owner, 2026-11-18): each ending is its card and one short line. The cards are painted (tools/endcards/paint.cjs, with
// codixel) from the game's own models and shipped as small PNGs in endcards_data.js (owner: "low quality image files are fine"; RULES 24
// has this one exception). Good Dreams goes on from its card: the Gull is put at anchor off the Table as the card shows her (side on,
// sails in, night, a calm sea) with the camera at the card's angle; "Keep sailing" turns the picture into the live view in steps (the
// view pixelated at 320, 480, 720 and 1080 wide, then the game itself) and the camera eases back behind the ship; play goes on from there.
import { rt, G } from './core/runtime.js';
import { state } from './core/state.js';
import { LM } from './landmarks.js';
import { shoreR } from './world.js';
import { CARDS } from './endcards_data.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** the card for an ending (a data URL), or null (the painted still stays) */
export const cardFor = (id) => (window.__BUILD === 'demo' ? null : CARDS[id] || null);

/** the Table's island, if it is near */
function tableDesc() {
  const L = LM.table; if (!L || !G.world) return null;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const d = G.world.desc(Math.round(L.x / 110) + dx, Math.round(L.z / 110) + dz); if (d && d.lm === 'table') return d; }
  return null;
}
/** Good Dreams, as its card shows it: the Gull at anchor off the Table, side on with her bow to the right, sails in, a calm clear night;
 *  the camera on the island's side of her, looking out to sea (the angle the card was painted from: the game's own side view) */
export function dreamsSetup() {
  const d = tableDesc(), ship = G.ship; if (!d || window.__BUILD === 'demo') return false;
  const R = shoreR(d, 0) + 26;
  ship.pos.set(d.x + R, 0, d.z + 8); ship.heading = Math.PI; ship.speed = 0; ship.trim = 0; ship.vel = null; ship.yaw = 0;
  state.time = 0.775;   // the end of dusk: still light enough to see the Gull and the Table as the card shows them, and the night comes on as it does (owner, 2026-11-19: the hand-back was far darker than the card)
  const w = G.weather; w.calmHold = 120; w.cloud = 0; w.rain = 0; w.storm = 0; w.fog = 0;
  rt.camHeading = Math.PI; rt.yawT = 0; rt.camYaw = 0;
  const P = ship.pos;
  rt.camOverride = { pos: [P.x - 21, 2.6, P.z - 0.8], look: [P.x, 3.6, P.z] };   // the Gull a third of the width, the horizon just under the middle
  return true;
}

/** a picture as pixel art: W wide (the canvas's own shape), a palette of n colours from the picture (0: the averaged pixels as they are),
 *  ordered dither between the two nearest colours */
export function pixelate(src, W, n, fixed = null, lift = 1) {
  const H = Math.round(W * src.height / src.width), mid = document.createElement('canvas'), cv = document.createElement('canvas');
  mid.width = W * 2; mid.height = H * 2; cv.width = W; cv.height = H;
  const m = mid.getContext('2d'); m.imageSmoothingEnabled = true; m.drawImage(src, 0, 0, W * 2, H * 2);
  const c = cv.getContext('2d', { willReadFrequently: true }); c.imageSmoothingEnabled = true; c.drawImage(mid, 0, 0, W, H);
  if (!n) return cv;
  const img = c.getImageData(0, 0, W, H), d = img.data;
  if (lift !== 1) for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = 255 * Math.pow(d[i + k] / 255, 1 / lift);   // brighter, keeping the dark dark
  const pal = fixed || palette(d, n);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = (y * W + x) * 4, r = d[k], g = d[k + 1], b = d[k + 2];
    let i1 = 0, i2 = 0, d1 = 1e9, d2 = 1e9;
    for (let i = 0; i < pal.length; i++) { const p = pal[i], e = (p[0] - r) ** 2 * 0.3 + (p[1] - g) ** 2 * 0.59 + (p[2] - b) ** 2 * 0.11; if (e < d1) { d2 = d1; i2 = i1; d1 = e; i1 = i; } else if (e < d2) { d2 = e; i2 = i; } }
    const t = Math.sqrt(d1) / (Math.sqrt(d1) + Math.sqrt(d2) + 1e-6), p = pal[t * 2 > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 * 1.6 ? i2 : i1];
    d[k] = p[0]; d[k + 1] = p[1]; d[k + 2] = p[2];
  }
  c.putImageData(img, 0, 0);
  return cv;
}
function palette(d, n) {   // k-means over a sample, started from colours spread over its brightness
  const px = []; for (let i = 0; i < d.length; i += 4 * 3) px.push([d[i], d[i + 1], d[i + 2]]);
  const lum = (p) => p[0] * 0.3 + p[1] * 0.59 + p[2] * 0.11, s = [...px].sort((a, b) => lum(a) - lum(b));
  let C = Array.from({ length: n }, (_, i) => [...s[Math.min(s.length - 1, Math.floor((i + 0.5) / n * s.length))]]);
  for (let it = 0; it < 6; it++) {
    const acc = C.map(() => [0, 0, 0, 0]);
    for (const p of px) { let bi = 0, be = 1e9; for (let i = 0; i < C.length; i++) { const q = C[i], e = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2; if (e < be) { be = e; bi = i; } } const a = acc[bi]; a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3]++; }
    C = C.map((q, i) => (acc[i][3] ? [acc[i][0] / acc[i][3], acc[i][1] / acc[i][3], acc[i][2] / acc[i][3]] : q));
  }
  return C.map((q) => q.map(Math.round));
}

/** Good Dreams: the card over the whole screen, then the live view taken again, finer each step, then the game; the camera eases back */
export function unpixelate(card, done) {
  let el = document.getElementById('endMorph');
  if (!el) { el = document.createElement('img'); el.id = 'endMorph'; document.body.appendChild(el); }
  el.src = card; el.className = 'on';
  // the first steps draw the live view in the card's own colours (its palette), so the painting turns into the game without a jump
  let cardPal = null;
  { const im = new Image(); im.onload = () => { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0); cardPal = palette(x.getImageData(0, 0, cv.width, cv.height).data, 18); }; im.src = card; }
  const steps = [[320, 16, 'card', 1.5], [480, 22, 'card', 1.3], [720, 32, null, 1.15], [1080, 0, null, 1]];
  let i = 0;
  const finish = () => {
    el.className = 'on out';
    setTimeout(() => {
      el.className = '';
      const o = rt.camOverride; if (o) { rt.camLeave = { pos: o.pos, look: o.look, t: 0, dur: 3 }; rt.camOverride = null; }
      if (done) done();
    }, 700);
  };
  const next = () => {
    const st = steps[i++]; if (!st) { finish(); return; }
    let n = 2;
    rt.onRendered = (cv) => { if (--n > 0) return; rt.onRendered = null; try { el.src = pixelate(cv, st[0], st[1], st[2] === 'card' ? cardPal : null, st[3]).toDataURL(); } catch (e) { /* keep the last step */ } setTimeout(next, i === 1 ? 600 : 380); };
  };
  setTimeout(next, 900);   // the card holds a moment first
}
