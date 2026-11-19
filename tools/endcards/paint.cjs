// The six ending cards (owner, 2026-11-18: "more like the Good Dreams ones: detailed, coloured, not grey; low quality image files are
// fine"). Painted with codixel (.claude/skills/codixel) in the game's own ramps; the Merry Gull and the guitar are the game's own models,
// rendered and cut out (refs/, from tools: see docs/PROGRESS.md). Run: node tools/endcards/paint.cjs [preview dir]
// Writes src/endcards_data.js (the cards as data URLs, so the dev server, the build and the single-file games all have them) and,
// with a preview dir, the PNGs and a sheet.
const P = require('../../.claude/skills/codixel/core/pixel.js');
const fs = require('fs'), path = require('path');
const REF = path.join(__dirname, 'refs'), W = 320, H = 180;
const hx = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const C = (h) => P.col(hx(h)), clamp = (v) => Math.max(0, Math.min(255, v | 0));
const R = (b, c, x, y, w, h) => b.rect(Math.round(x), Math.round(y), Math.round(x + w), Math.round(y + h), hx(c));
// a twenty-sided die in pixels (owner, 2026-11-19: "the die is not 20 sided"): a hexagon's outline, a pale triangular face on top,
// the side faces in shade, a mark on the face
const D20 = ['..MLM..', '.MLLLM.', 'MLLKLLM', 'DMLLLMD', 'DDMLMDD', '.DDMDD.', '..DDD..'];
const D20C = { L: '#f0e8d8', M: '#c8bca4', D: '#8a7e6a', K: '#3a2210' };
const die20 = (b, x, y, k = 1) => D20.forEach((row, j) => { for (let i = 0; i < 7; i++) if (row[i] !== '.') R(b, D20C[row[i]], x + i * k, y + j * k, k, k); });
const F = (b, fn, cols) => b.field((x, y) => { const v = fn(x, y); return v == null ? null : Math.max(0.001, Math.min(0.999, v)); }, cols.map(C));
const glow = (b, cx, cy, r, col, a = 0.8, sy = 1.15) => { const c = hx(col); for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const t = 1 - Math.hypot(x - cx, (y - cy) * sy) / r; if (t <= 0 || P.bt(x, y) >= t * t * a) continue; const o = b.get(x, y); if (o) b.pset(x, y, P.mix(P.unpack(o), c, 0.42)); } };

// ---------------------------------------------------------------- the sky and the sea
function sky(b, HZ, ramp, o = {}) {
  F(b, (x, y) => (y >= HZ ? null : 0.12 + 0.84 * (y / HZ) ** (o.pow ?? 1.4)), ramp);
  const r = P.rng(o.seed ?? 1);
  for (let i = 0; i < (o.stars ?? 0); i++) { const x = r() * W | 0, y = r() * (HZ - 10) | 0; b.pset(x, y, hx(r() < 0.15 ? '#ffe8b0' : r() < 0.5 ? '#9fb8e0' : '#e8f0ff')); }
  if (o.band) for (let i = 0; i < 900; i++) { const x = r() * W, y = 10 + x * 0.16 + (r() - 0.5) * 20 * (0.6 + 0.4 * Math.sin(x / 30)); if (y < HZ - 8 && P.bt(x, y) < 0.55) b.pset(x | 0, y | 0, hx(r() < 0.3 ? '#9fb8e0' : '#3a5a88')); }
  if (o.clouds) P.clouds(b, { base: o.clouds[0], h: o.clouds[1], cols: o.clouds[2].map(hx), seed: o.seed ?? 5, amount: o.clouds[3] ?? 0.8, t: 0, T: 1, sun: o.sun || [0.3, 1] });
  if (o.disc) { const [mx, my, mr, col, halo] = o.disc; glow(b, mx, my, mr * 4, halo, 0.75); for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) if (Math.hypot(x, y) <= mr) b.pset(mx + x, my + y, hx(Math.hypot(x + 1, y + 1) < mr * 0.55 ? '#fffaf0' : col)); }
}
function sea(b, HZ, ramp, o = {}) {
  F(b, (x, y) => (y < HZ ? null : ((y - HZ) / (H - HZ)) ** 0.8 * 0.9 + 0.05), ramp);
  R(b, o.line || '#2a4a6a', 0, HZ, W, 1);   // the horizon, a thin pale line
  for (let y = HZ + 3; y < H; y += 3 + ((y - HZ) / 7 | 0)) for (let x = (y * 13) % 23; x < W; x += 26 + (y % 7) * 5) R(b, o.swell || '#2a4a6a', x, y, 3 + ((y - HZ) / 6 | 0), 1);
  if (o.road) { const [mx, c1, c2] = o.road; for (let y = HZ + 1; y < H; y++) { const w = 2 + (y - HZ) * 0.35; for (let k = 0; k < 3; k++) { const x = mx + (P.fbm(y * 0.7, k * 3.1, 2, 9) - 0.5) * w * 2.2; if (P.bt(x, y) < 0.7 - (y - HZ) / 160) R(b, k ? c2 : c1, x - 1, y, 2 + (y - HZ) / 25, 1); } } }
  for (const lx of o.lights || []) { glow(b, lx, HZ - 1, 10, '#ffd070', 0.9); R(b, '#ffe88a', lx, HZ - 2, 2, 2); for (let k = 0; k < 5; k++) R(b, '#c8a050', lx - (k % 2), HZ + 2 + k * 3, 3 - (k % 2), 1); }   // his light, hers
}
/** the beach the Table stands on: sand from `top` down, wet and darker at the water's edge with a line of foam */
function beach(b, top, ramp, wet, foam = '#c8d0d8') {
  F(b, (x, y) => (y < top + Math.sin(x / 37) * 2 + Math.sin(x / 11) * 0.8 ? null : 0.25 + 0.45 * P.fbm(x * 0.09, y * 0.22, 3, 7) + (y - top) / 120), ramp);
  for (let x = 0; x < W; x++) { const y = Math.round(top + Math.sin(x / 37) * 2 + Math.sin(x / 11) * 0.8); R(b, wet, x, y, 1, 2); if (P.bt(x, y) < 0.45) b.pset(x, y - 1, hx(foam)); }
}

// ---------------------------------------------------------------- the game's own things, cut out of renders (refs/)
const lampish = ([r, g, b]) => r > 150 && g > 100 && b < 80 && r - b > 95;
/** light a cut-out: k (overall), tint (multiplied), lamps lit or not, the edge facing `side` caught by the light */
function lit(spr, { k = 0.5, tint = [0.78, 0.86, 1.0], add = [12, 20, 46], lamps = true, side = -1, edge = 0.2 } = {}) {
  const o = new P.Buf(spr.w, spr.h), L = [];
  for (let y = 0; y < spr.h; y++) for (let x = 0; x < spr.w; x++) {
    const c = spr.px[y * spr.w + x]; if (!(c >>> 24)) continue; const [r, g, bb] = P.unpack(c);
    if (lampish([r, g, bb])) { if (lamps) { o.pset(x, y, hx(r > 220 ? '#ffe88a' : '#ffc060')); L.push([x, y]); continue; } }
    const lum = (r * 0.3 + g * 0.55 + bb * 0.15) / 255, e = !(spr.px[y * spr.w + x + side] >>> 24) ? edge : 0, kk = 0.34 + k * 0.7 * lum + e;
    o.pset(x, y, [clamp(r * kk * tint[0] + add[0]), clamp(g * kk * tint[1] + add[1]), clamp(bb * kk * tint[2] + add[2])]);
  }
  return { buf: P.quantize(o, 14).buf, lamps: L };
}
/** a sprite on the water with its waterline at wl and its broken reflection; mixCol: the water it reflects into */
function onWater(b, s, x0, wl, mixCol = '#0b1020', glowCol = '#ffd070') {
  const spr = s.buf, sw = spr.w, sh = spr.h, base = sh - Math.round(sh * 0.04);
  for (let y = 0; y < base; y++) for (let x = 0; x < sw; x++) { const c = spr.px[y * sw + x]; if (c >>> 24) b.pset(x0 + x, wl - base + y, P.unpack(c)); }
  for (let d = 0; d < base && wl + d < H; d++) {
    if (d % 3 === 2 && d > 4) continue;
    const wob = Math.round(Math.sin(d * 0.9) * (1 + d * 0.04)), sy = base - 1 - Math.round(d * 1.05); if (sy < 0) break;
    for (let x = 0; x < sw; x++) { const c = spr.px[sy * sw + x]; if (!(c >>> 24)) continue; const u = P.unpack(c), l = lampish(u);
      const fade = (l ? 0.9 : 0.8) - d / (base * 1.3); if (fade <= 0 || P.bt(x0 + x, wl + d) > fade + 0.35) continue;
      b.pset(x0 + x + wob, wl + d, P.mix(u, hx(mixCol), l ? 0.3 : 0.5)); }
  }
  for (const [lx, ly] of s.lamps) if ((lx * 7 + ly * 3) % 7 === 0) glow(b, x0 + lx, wl - base + ly, 9, glowCol, 0.45);
}
const small = (s, w) => { const k = w / s.buf.w; return { buf: P.resize(s.buf, w, { mode: true }), lamps: s.lamps.map(([x, y]) => [x * k | 0, y * k | 0]) }; };
const put = (b, spr, x0, y0, f = (c) => c) => { for (let y = 0; y < spr.h; y++) for (let x = 0; x < spr.w; x++) { const c = spr.px[y * spr.w + x]; if (c >>> 24) b.pset(x0 + x, y0 + y, f(P.unpack(c))); } };

// ---------------------------------------------------------------- the Table by the Water, as the game builds it (landmarks.js 'table')
// a white top, dark legs; your chair pale, the far chair's seat wet-black; six candles; the book open, the die, the drawing of the Edge
function candle(b, x, y, lit = true, h = 7) {
  R(b, '#e8e0c8', x, y, 2, h); R(b, '#c8bca0', x + 1, y + 1, 1, h - 1);
  if (lit) { const f = new P.Flame({ height: 8, width: 2.6, speed: 2.2, rough: 0.8, swayAmp: 1, bits: 0, cols: ['#7a2a0a', '#d0603a', '#ffb050', '#ffe88a', '#fff8d0'].map(hx) }); f.draw(b, x + 1, y, 0.7); }
  else R(b, '#3a3030', x + 1, y - 1, 1, 1);
}
// ---- the table as the owner's reference draws it (2026-11-18): a long farmhouse table seen at an angle, a whitewashed plank top worn
// through to grey wood, a deep apron, four square legs with the paint chipped, a slatted wooden chair at each end
const WASH = ['#3a302c', '#5f5048', '#8a786a', '#b4a290', '#d4c6b2', '#ece2d0'], WOOD = ['#2a201a', '#4a3a30', '#6a5646', '#8a7460'];   // measured off the owner's reference
/** fill a quad (screen points a, b, c, d in order) with fn(u, v) -> colour, by stepping finely over it */
function quad(b, a, bb, c, d, fn) {
  const L = Math.max(Math.hypot(bb[0] - a[0], bb[1] - a[1]), Math.hypot(c[0] - d[0], c[1] - d[1])), D = Math.max(Math.hypot(d[0] - a[0], d[1] - a[1]), Math.hypot(c[0] - bb[0], c[1] - bb[1]));
  const nu = Math.ceil(L * 2.2) + 1, nv = Math.ceil(D * 2.2) + 1;
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const u = i / nu, v = j / nv;
    const x = (1 - v) * ((1 - u) * a[0] + u * bb[0]) + v * ((1 - u) * d[0] + u * c[0]), y = (1 - v) * ((1 - u) * a[1] + u * bb[1]) + v * ((1 - u) * d[1] + u * c[1]);
    const col = fn(u, v, x, y); if (col) b.pset(Math.round(x), Math.round(y), col); }
}
const ramp = (cols, v, x, y) => hx(cols[Math.max(0, Math.min(cols.length - 1, Math.floor(v * cols.length + (BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.9)))]);
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** worn whitewash: planks along u, grain, the paint gone in patches, darker away from the light */
const worn = (u, v, x, y, base, planks = 5, seed = 3) => {
  const pv = v * planks, seam = Math.abs(pv - Math.round(pv)) < 0.06 * planks / 5;
  const chip = P.fbm(u * 14 + seed, v * 6, 3, seed) > 0.7, grain = P.fbm(u * 40, v * 3 + seed, 2, seed + 1) - 0.5;
  let t = base + grain * 0.14 - (chip ? 0.3 : 0) - (seam ? 0.22 : 0);
  return ramp(chip ? WOOD.concat(WASH.slice(2, 3)) : WASH, Math.max(0, Math.min(0.999, t)), Math.round(x), Math.round(y));
};
function slatChair(b, x, y, s, facing = 1, col = WASH) {   // a slatted chair, side on: seat, two legs seen, the back with three slats
  const W_ = 16 * s, h = 14 * s, bh = 18 * s, bx = facing > 0 ? x : x + W_ - 2 * s;
  quad(b, [x, y], [x + W_, y], [x + W_ - 2 * s, y - 3 * s], [x + 2 * s, y - 3 * s], (u, v, X, Y) => ramp(col, 0.55 + 0.25 * v, Math.round(X), Math.round(Y)));   // the seat
  for (const lx of [x + s, x + W_ - 3 * s]) R(b, col[2], lx, y, 2 * s, h);
  for (const lx of [x + 3 * s, x + W_ - 5 * s]) R(b, col[1], lx, y - 1, 1.5 * s, h - 2 * s);
  R(b, col[3], bx, y - bh, 2 * s, bh); R(b, col[3], bx + (facing > 0 ? 0 : 0), y - bh, 2 * s, 2 * s);
  for (let k = 0; k < 3; k++) R(b, col[4], bx - (facing > 0 ? 0 : 0), y - bh + 4 * s + k * 4 * s, 2 * s, 2 * s);
  R(b, col[2], bx + (facing > 0 ? 0 : 1 * s), y - bh, 1 * s, bh);
}
/** the Table by the Water after the reference: o.x, o.y the near-left corner of the top, o.L its length, o.s scale (1 at L 150) */
function table(b, o) {
  const L = o.L || 150, s = L / 150, x = o.x, y = o.y, light = o.light || '#ffd070';
  const nl = [x, y], nr = [x + L, y - L * 0.035], fr = [x + L + L * 0.12, y - L * 0.035 - L * 0.13], fl = [x + L * 0.12, y - L * 0.13];   // the top: near edge, far edge
  const at = (u, v) => [nl[0] + (nr[0] - nl[0]) * u + (fl[0] - nl[0]) * v, nl[1] + (nr[1] - nl[1]) * u + (fl[1] - nl[1]) * v];
  const legH = 34 * s, ap = 5 * s;
  // the far legs first (shorter: further away), then the far chair and the one in it
  for (const u of [0.04, 0.96]) { const p = at(u, 0.9); quad(b, [p[0] - 2 * s, p[1]], [p[0] + 2 * s, p[1]], [p[0] + 2 * s, p[1] + legH * 0.82], [p[0] - 2 * s, p[1] + legH * 0.82], (uu, v, X, Y) => worn(v, uu, X, Y, 0.45, 1, 7)); }
  const fc = at(1.04, 0.55);
  if (o.farChair !== false) slatChair(b, fc[0] - 2 * s, fc[1] + 15 * s, s * 0.9, -1);
  if (o.figure) {   // a person seated at the table's end, after the reference: hips on the chair, the back bent to the table, an arm on the wood
    const hip = [fc[0] + 4 * s, fc[1] + 11 * s], sh = [fc[0] - (o.figure === 'old' ? 4 : 1) * s, fc[1] - (o.figure === 'old' ? 6 : 10) * s], hd = [sh[0] - (o.figure === 'old' ? 6 : 2) * s, sh[1] - (o.figure === 'old' ? 1 : 6) * s];
    const knee = [fc[0] - 6 * s, fc[1] + 13 * s], foot = [fc[0] - 7 * s, fc[1] + 26 * s];
    const cols = o.figure === 'old' ? ['#1e1828', '#2e2638', '#4a4256', '#7a7088'] : ['#05040a', '#08070e', '#100e18', '#1c1826'];
    P.solid(b, [P.cap(hip[0], hip[1], knee[0], knee[1], 3.2 * s, 2.8 * s), P.cap(knee[0], knee[1], foot[0], foot[1], 2.4 * s, 2.2 * s), P.cap(hip[0], hip[1], sh[0], sh[1], 5.5 * s, 4.8 * s),
      P.cap(sh[0], sh[1], fc[0] - 13 * s, fc[1] - 1 * s, 2 * s, 1.8 * s), P.ell(hd[0], hd[1], 3.6 * s, 4 * s)], cols.map(hx), { light: [-0.7, -0.6, 0.5], ambient: o.figure === 'old' ? 0.3 : 0.12 });
    if (o.figure === 'old') { R(b, '#e8e4e8', hd[0] - 3 * s, hd[1] - 4 * s, 6 * s, 2 * s); R(b, '#c8c0c8', hd[0] + 1 * s, hd[1] - 3 * s, 3 * s, 3 * s); }   // her white hair, the head down on her arm
    else { P.solid(b, [P.ell(hd[0] + 1 * s, hd[1] - 1 * s, 4.6 * s, 5.2 * s)], ['#05040a', '#08070e', '#0e0c16', '#181422'].map(hx), { light: [-0.7, -0.6, 0.5], ambient: 0.1 }); R(b, '#020104', hd[0] - 3 * s, hd[1] - 1 * s, 3 * s, 4 * s); }   // a hood, and nothing under it
  }
  // the top, the apron under its near and right edges, the near legs
  quad(b, nl, nr, fr, fl, (u, v, X, Y) => worn(u, v, X, Y, 0.84 - 0.2 * v, 5, 3));
  quad(b, nl, nr, [nr[0], nr[1] + ap], [nl[0], nl[1] + ap], (u, v, X, Y) => worn(u, v, X, Y, 0.4 - 0.1 * v, 2, 11));
  quad(b, nr, fr, [fr[0], fr[1] + ap], [nr[0], nr[1] + ap], (u, v, X, Y) => worn(u, v, X, Y, 0.3, 2, 13));
  R(b, '#f2eadc', nl[0], nl[1], 1, 1); for (let i = 0; i <= L; i++) { const p = at(i / L, 0); if (P.bt(p[0], p[1]) < 0.7) b.pset(Math.round(p[0]), Math.round(p[1]), hx('#efe6d6')); }   // the worn front edge catches the light
  for (const u of [0.03, 0.97]) { const p = at(u, 0); quad(b, [p[0] - 2.5 * s, p[1] + ap], [p[0] + 2.5 * s, p[1] + ap], [p[0] + 2.2 * s, p[1] + legH], [p[0] - 2.2 * s, p[1] + legH], (uu, v, X, Y) => worn(v, uu, X, Y, 0.62 - 0.25 * uu, 1, 5)); }
  // on it: the book open, the die, the drawing of the Edge, candles
  const bk = at(0.48, 0.45); quad(b, [bk[0] - 12 * s, bk[1] + 2 * s], [bk[0] + 12 * s, bk[1] + 0 * s], [bk[0] + 14 * s, bk[1] - 4 * s], [bk[0] - 9 * s, bk[1] - 2 * s], (u, v, X, Y) => (Math.abs(u - 0.5) < 0.03 ? hx('#8a7a5a') : (Math.round(v * 6) % 2 && u > 0.08 && u < 0.92 && Math.abs(u - 0.5) > 0.06 ? hx('#7a6a58') : hx(u < 0.5 ? '#efe4c8' : '#e2d6b8'))));
  if (o.die !== false) { const dp = at(0.24, 0.5), k = Math.max(1, Math.round(s * 0.7)); die20(b, dp[0], dp[1] - 7 * k, k); }
  { const dw = at(0.12, 0.3); quad(b, [dw[0], dw[1]], [dw[0] + 20 * s, dw[1] - 1.5 * s], [dw[0] + 23 * s, dw[1] - 5 * s], [dw[0] + 3 * s, dw[1] - 3.5 * s], (u, v, X, Y) => (Math.abs(v - 0.5) < 0.12 && u < 0.6 ? hx('#b01414') : u > 0.6 && u < 0.65 ? hx('#b01414') : hx('#d4c8a4'))); }   // the Edge, in red
  const cs = o.candleAt || [[0.08, 0.7], [0.2, 0.75], [0.34, 0.68], [0.7, 0.7], [0.8, 0.62], [0.9, 0.7]];
  for (const [u, v] of cs) { const p = at(u, v); candle(b, Math.round(p[0]), Math.round(p[1] - 7 * s), o.candles !== false, Math.max(4, Math.round(7 * s))); }
  if (o.candles !== false) { const m = at(0.5, 0.5); glow(b, m[0], m[1] - 6 * s, L * 0.42, light, 0.42, 1.6); for (const [u, v] of cs) { const p = at(u, v); glow(b, p[0] + 1, p[1] - 9 * s, 8 * s + 3, light, 0.6); } }
  // your chair, at the near-left end, pulled out a little and turned, empty
  if (o.near !== false) slatChair(b, nl[0] - 15 * s, nl[1] + 13 * s, s * 1.15, 1);
  return { at, legBase: at(0.03, 0)[1] + legH };
}

/** the guitar as the owner's reference draws it: a dreadnought, warm tan top darker to its edge, the dark side showing on the right, a
 *  round soundhole with a ring, a low dark bridge, a dark neck and a headstock with pegs; it leans on what it stands against.
 *  (x, y): the bottom of the body; s: scale; lean: how far the top leans right (px of shear per px of height); lit: how warm the light */
function guitarArt(b, x, y, s = 1, lean = 0.22, lit = 1) {
  const g = new P.Buf(40, 100); g.ox = -20; g.oy = -96;
  const TOP = ['#2a1810', '#4a3020', '#6e4c36', '#986f58', '#b88c68', '#d6a878'].map(hx);
  P.solid(g, [P.ell(1.2, -31, 6.4, 5.8), P.ell(0.6, -22, 5.0, 4.0), P.ell(0, -12, 7.8, 8.4)], ['#140c08', '#231d1a', '#2a1c14', '#3a281c'].map(hx), { light: [0.8, -0.4, 0.4] });   // the side, a little to the right
  g.ox = -19;
  P.solid(g, [P.ell(0, -31, 6, 5.6), P.ell(-0.4, -22, 4.8, 3.9), P.ell(-1, -12, 7.4, 8.2)], TOP, { light: [-0.5, -0.7, 0.6], ambient: 0.28 });   // the top
  g.ox = -20;
  for (let a = 0; a < 6.28; a += 0.1) g.pset(Math.round(-1 + Math.cos(a) * 3.2), Math.round(-22.5 + Math.sin(a) * 3.2), hx('#c89a70'));   // the ring
  for (let yy = -25; yy <= -20; yy++) for (let xx = -4; xx <= 2; xx++) if (Math.hypot(xx + 1, yy + 22.5) < 2.6) g.pset(xx, yy, hx('#0c0806'));   // the soundhole
  g.rect(-5, -11, 3, -9, hx('#1c120c')); g.pset(-1, -11, hx('#e8dcc0'));   // the bridge, a saddle
  g.rect(-2, -60, 1, -35, hx('#2e1e14')); g.rect(-2, -60, -1, -35, hx('#4a3424'));   // the neck
  for (let yy = -57; yy < -36; yy += 4) g.pset(0, yy, hx('#8a7a6a'));   // frets
  g.rect(-3, -68, 2, -60, hx('#24160e')); for (const yy of [-66, -63]) { g.pset(-4, yy, hx('#d8cbb0')); g.pset(2, yy, hx('#d8cbb0')); }   // the headstock, its pegs
  // lean it, scale it, and light it a little with the candles
  for (let yy = -96; yy < 4; yy++) for (let xx = -20; xx < 20; xx++) {
    const c = g.get(xx, yy); if (!(c >>> 24)) continue; const [r, gg, bb] = P.unpack(c);
    const col = [clamp(r * lit + 4), clamp(gg * lit * 0.96 + 2), clamp(bb * lit * 0.9)];
    for (let i = 0; i < Math.ceil(s); i++) for (let j = 0; j < Math.ceil(s); j++) b.pset(Math.round(x + (xx - yy * lean) * s) + i, Math.round(y + yy * s) + j, col);
  }
}
/** footprints in the sand from (x0,y0) towards (x1,y1) */
function steps(b, x0, y0, x1, y1, n, col) { for (let i = 0; i < n; i++) { const t = i / (n - 1), x = x0 + (x1 - x0) * t + (i % 2 ? 2 : -2) * (1 - t * 0.5), y = y0 + (y1 - y0) * t; R(b, col, x, y, 2 + t * 2, 1 + t); } }

// ---------------------------------------------------------------- the cards
const side = P.load(path.join(REF, 'px_side.png')), quarter = P.load(path.join(REF, 'px_quarter.png')), stern = P.load(path.join(REF, 'px_stern.png')), guitar = P.load(path.join(REF, 'guitar.png'));
const NIGHT = ['#05040a', '#0b1020', '#14263a', '#1f3a56', '#3a5a88'], NSEA = ['#14263a', '#0f1d30', '#0b1020', '#05040a'];
const cards = {};

cards.dreams = () => {   // A. At anchor (the owner's pick): side on, sails furled, the moon's road, a light at each end of the horizon
  const b = new P.Buf(W, H), HZ = 104;
  sky(b, HZ, NIGHT, { stars: 70, seed: 3, disc: [64, 30, 7, '#dfe8ff', '#9fb8e0'] });
  sea(b, HZ, NSEA, { road: [64, '#dfe8ff', '#9fb8e0'], lights: [18, 298] });
  onWater(b, lit(side, { k: 0.55 }), 112, 134);
  return b;
};
cards.sleep = () => {   // first light; the sea has breathed out. The table on the sand, candles burnt down, the old woman asleep over the book; the Gull off shore
  const b = new P.Buf(W, H), HZ = 96;
  sky(b, HZ, ['#2a1f45', '#5a4070', '#b07890', '#f0b890', '#ffe4b8'], { pow: 1.1, seed: 4, disc: [236, HZ - 5, 9, '#fff0c8', '#ffd0a0'],
    clouds: [56, 14, ['#5a4070', '#b07890', '#f0c098', '#fff0d8'], 0.75], sun: [0.4, 1] });
  sea(b, HZ, ['#c08890', '#8a6080', '#5a4068', '#3a2a50'], { line: '#ffe0b8', swell: '#e0a890', road: [240, '#fff0c8', '#ffc890'] });
  onWater(b, small(lit(side, { k: 0.75, tint: [1.0, 0.85, 0.85], add: [30, 16, 30], lamps: false, side: 1, edge: 0.3 }), 46), 58, HZ + 14, '#8a6080');
  beach(b, 132, ['#4a3038', '#7a5a58', '#a8846a', '#c8a888', '#e0c8a8', '#f0dcc0'], '#8a6870', '#ffe8d0');
  table(b, { x: 80, y: 136, L: 150, light: '#ffe0b0', candles: false, figure: 'old' });
  for (const cx of [6, 17, 33, 80, 92, 108]) { const sm = new P.Smoke({ height: 18, width: 2, cols: ['#b8a8b8', '#d8c8d0'].map(hx), alpha: [0.12, 0.22] }); try { sm.draw(b, 96 + cx + 1, 121, 0.4); } catch (e) { /* thin smoke is a nicety */ } }   // the candles just out
  for (let i = 0; i < 46; i++) R(b, '#7a5a58', 96 - i * 2.2, 162 + (i % 3) * 0.5, 2, 1);   // the long shadow of the table toward you
  return b;
};
cards.rises = () => {   // the sea lit from below; something vast under it; the table very small on the sand, its candles still lit
  const b = new P.Buf(W, H), HZ = 92;
  sky(b, HZ, ['#05040a', '#100618', '#2a0a2a', '#4a0a3a', '#8a1a52'], { stars: 26, seed: 9 });
  F(b, (x, y) => (y < HZ ? null : 0.12 + 0.88 * Math.max(0, 1 - Math.hypot((x - 168) / 175, (y - 126) / 30)) * (0.7 + 0.5 * P.fbm(x * 0.05, y * 0.2, 3, 4))), ['#05040a', '#2a0a2a', '#5a1a5a', '#a03a8a', '#ff70d0']);
  R(b, '#c04a8a', 0, HZ, W, 1);
  F(b, (x, y) => (y < HZ + 8 || y > 150 ? null : Math.hypot((x - 168) / 132, (y - 122) / 15) < 1 && P.fbm(x * 0.03, y * 0.3, 2, 8) > 0.33 ? 0.92 : null), ['#1a0620', '#07020a']);   // the shape under the water
  R(b, '#05040a', 164, 120, 9, 4); R(b, '#ff9ae0', 166, 121, 5, 2); R(b, '#fff0ff', 168, 121, 1, 1); glow(b, 168, 122, 22, '#ff70d0', 0.8);   // and in it, an opening
  for (let i = 0; i < 70; i++) { const r = P.rng(i + 50); const x = r() * W, y = HZ + 2 + r() * 40; if (P.bt(x, y) < 0.6) R(b, '#ff9ae0', x, y, 1 + (r() * 3 | 0), 1); }   // glints from below
  onWater(b, small(lit(side, { k: 0.3, tint: [0.9, 0.6, 0.9], add: [16, 4, 22] }), 30), 252, HZ + 7, '#5a1a5a', '#ff9ae0');
  beach(b, 146, ['#07040a', '#140a14', '#2a1622', '#3a2430', '#56384a', '#7a5060'], '#3a1630', '#ff9ae0');
  table(b, { x: 128, y: 150, L: 66, light: '#ffd070', figure: 'shape' });   // small on the sand, in front of the lit sea
  return b;
};
cards.tune = () => {   // a blue night; two lights far off; the table, the die untouched, the guitar leaning on your chair; the Gull with her lamp
  const b = new P.Buf(W, H), HZ = 100;
  sky(b, HZ, NIGHT, { stars: 80, seed: 13, band: true });
  sea(b, HZ, NSEA, { lights: [34, 290] });
  onWater(b, small(lit(quarter, { k: 0.5 }), 54), 214, HZ + 18);
  beach(b, 134, ['#0b0a12', '#1a1624', '#2a2434', '#3a3448', '#4a4a5a', '#5a5a6e'], '#14263a', '#9fb8e0');
  table(b, { x: 82, y: 138, L: 150, light: '#ffd070', figure: 'shape' });
  guitarArt(b, 62, 178, 1.5, 0.2, 1.0);   // the guitar, after the owner's reference, leaning on your chair in the candles' light
  glow(b, 66, 150, 24, '#ffb050', 0.45);
  return b;
};
cards.leave = () => {   // misty night; you walk back down the sand; behind you the table, one candle, someone still in the far chair; the Gull waits
  const b = new P.Buf(W, H), HZ = 98;
  sky(b, HZ, ['#07070c', '#15151f', '#2a2a3c', '#4a4a62', '#6a6a84'], { stars: 18, seed: 21 });
  sea(b, HZ, ['#3a3a52', '#24243a', '#15151f', '#07070c'], { line: '#7a7a94', swell: '#4a4a62' });
  beach(b, 118, ['#0b0a12', '#1c1a26', '#2e2a38', '#403a4a', '#56506a', '#6e6a84'], '#2a2a3c', '#9a9ab4');
  table(b, { x: 196, y: 128, L: 56, light: '#ffd070', figure: 'shape', near: false, candleAt: [[0.85, 0.6]] });   // far behind you now, up the sand: one candle
  steps(b, 214, 140, 112, 178, 12, '#14121c');
  onWater(b, small(lit(stern, { k: 0.45, tint: [0.8, 0.8, 0.95], add: [14, 14, 30] }), 40), 60, HZ + 20, '#24243a');
  P.mist(b, { x: 160, y: 108, w: 190, h: 18, below: 22, t: 0, T: 1, col: hx('#8a8aa4'), strength: 0.75 });
  return b;
};
cards.sit = () => {   // Your Seat, after the owner's reference: inside the round hut, from her chair. Curved log walls, the cone of the thatch
  // overhead with its beams, bone charms on strings; a small window glowing a sick purple; the door open on the night sea, a ship's light,
  // someone coming up the boards; on the table under your hands her book open, a closed one, the candle in its holder
  const b = new P.Buf(W, H), cx = 160, CV = [265, 120];   // the candle: the only warm light
  const wallTop = (x) => 26 + 26 * ((x - cx) / 170) ** 2, floorY = (x) => 122 - 12 * ((x - cx) / 170) ** 2;
  const lightAt = (x, y) => Math.max(0, 1 - Math.hypot(x - CV[0], (y - CV[1]) * 1.2) / 230);
  const DARK = ['#050307', '#0d0809', '#1a110c', '#2a1c12', '#3e2a1a', '#5a3e26', '#7a5636'];
  // the thatch overhead: beams running up to the cone's point, straw between
  F(b, (x, y) => (y >= wallTop(x) ? null : 0.06 + 0.16 * P.fbm(Math.atan2(y + 120, x - cx) * 40, Math.hypot(x - cx, y + 120) * 0.06, 3, 41) + 0.25 * lightAt(x, y)), DARK);
  for (let i = -6; i <= 6; i++) { const x1 = cx + i * 30, y1 = wallTop(x1); b.line(cx + i * 4, -6, x1, y1, hx(i % 2 ? '#1a110c' : '#24180f'), 2); }
  // the wall: logs standing round the room, each its own width, shaded round, a dark seam between
  let x0 = -4, k = 0;
  while (x0 < W + 4) {
    const w = 8 + ((k * 7) % 5), xm = x0 + w / 2, top = wallTop(xm), bot = floorY(xm);
    for (let x = x0; x < x0 + w; x++) for (let y = Math.floor(top); y < bot; y++) {
      const u = (x - x0) / w, round = Math.sin(u * Math.PI), grain = P.fbm(x * 0.6 + k * 9, y * 0.08, 2, 43) - 0.5;
      const v = 0.05 + round * 0.18 + grain * 0.08 + lightAt(x, y) * 0.55 * (0.5 + 0.5 * round);
      b.pset(x, y, hx(DARK[Math.max(0, Math.min(6, Math.floor(v * 7 + (BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.9)))]));
    }
    R(b, '#030204', x0 + w - 1, top, 1, bot - top); x0 += w; k++;
  }
  R(b, '#120c08', 0, 0, W, 1);
  // the window, small, on the left: four panes of a purple night, sick light on the logs round it, ragged cloth
  const wx = 46, wy = 50;
  F(b, (x, y) => (x < wx || x >= wx + 30 || y < wy || y >= wy + 26 ? null : 0.2 + 0.6 * (1 - (y - wy) / 26)), ['#0a0612', '#1e1030', '#3a1a50', '#6a2a80']);
  for (let i = 0; i < 10; i++) { const r = P.rng(i + 7); b.pset(wx + 2 + (r() * 26 | 0), wy + 2 + (r() * 12 | 0), hx('#c8b0e0')); }
  R(b, '#1a110c', wx - 2, wy - 2, 34, 2); R(b, '#1a110c', wx - 2, wy + 26, 34, 3); R(b, '#1a110c', wx - 2, wy, 2, 26); R(b, '#1a110c', wx + 30, wy, 2, 26); R(b, '#1a110c', wx + 14, wy, 2, 26); R(b, '#1a110c', wx, wy + 12, 30, 2);
  glow(b, wx + 15, wy + 13, 34, '#7a3a9a', 0.45);
  for (const [cx0, dir] of [[wx - 6, 1], [wx + 32, -1]]) F(b, (x, y) => { const t = (y - (wy - 4)) / 40; if (t < 0 || t > 1) return null; const w = 3 + 3 * t + Math.sin(y * 0.7) * 0.8, d = dir > 0 ? x - (cx0 + 3) : (cx0 - 3) - x; if (y > wy + 30 && (x * 7 + y) % 5 === 0) return null; return d >= 0 && d < w ? 0.2 + 0.35 * (1 - d / w) + 0.12 * Math.sin(x * 1.3) : null; }, ['#0e0a10', '#221e26', '#3a3640', '#56525c']);   // the curtains, grey, torn
  // the door, open, on the right: the night sea outside, a ship's light, the boards, someone coming up them
  const D0 = 210, D1 = 252, DT = wallTop(231) + 6, DB = floorY(231) + 2;
  F(b, (x, y) => (x < D0 || x >= D1 || y < DT || y >= DB ? null : y < 84 ? 0.15 + 0.65 * ((y - DT) / (84 - DT)) : null), ['#05040a', '#0b1020', '#14263a', '#1f3a56', '#3a5a88']);
  F(b, (x, y) => (x < D0 || x >= D1 || y < 84 || y >= DB ? null : 0.2 + 0.25 * P.fbm(x * 0.2, y * 0.5, 2, 53)), ['#05040a', '#0b1020', '#14263a']);
  for (let i = 0; i < 14; i++) { const r = P.rng(i + 31); b.pset(D0 + (r() * 42 | 0), DT + (r() * 28 | 0), hx('#e8f0ff')); }
  R(b, '#2a4a6a', D0, 84, D1 - D0, 1); R(b, '#ffd070', 222, 81, 2, 2); glow(b, 223, 82, 8, '#ffd070', 0.8); for (let k2 = 0; k2 < 4; k2++) R(b, '#c8a050', 222, 86 + k2 * 3, 2, 1);   // a ship's light out there
  for (let y = 100; y < DB; y += 3) R(b, y % 2 ? '#3a2a1e' : '#2e2218', D0 + (DB - y) * 0.4, y, D1 - D0 - (DB - y) * 0.8, 2);   // the boards up to the door
  P.solid(b, [P.cap(236, 76, 237, 102, 4, 4.5), P.ell(236, 71, 3.4, 4), P.cap(236, 101, 233, 116, 2, 2), P.cap(238, 101, 241, 115, 2, 2), P.cap(232, 80, 230, 96, 1.6, 1.4)], ['#020103', '#06050a', '#0b0a12', '#141220'].map(hx), { light: [0.4, -0.8, 0.4], ambient: 0.1 });   // someone, not yet in
  for (let y = 70; y < 116; y++) if (P.bt(240, y) < 0.6) b.pset(241, y, hx('#3a5a88'));   // the night catches an edge of them
  R(b, '#0e0907', D0 - 3, DT - 3, D1 - D0 + 6, 3); R(b, '#0e0907', D0 - 3, DT, 3, DB - DT); R(b, '#0e0907', D1, DT, 3, DB - DT);
  quad(b, [D1 + 3, DT + 2], [D1 + 22, DT + 8], [D1 + 22, DB + 6], [D1 + 3, DB], (u, v, X, Y) => hx(DARK[Math.min(6, 1 + Math.floor(lightAt(X, Y) * 5 + P.fbm(u * 3, v * 9, 2, 57)))]));   // the door itself, swung in
  // the floor: planks running to the door
  F(b, (x, y) => (y < floorY(x) || y >= 140 ? null : 0.1 + 0.2 * lightAt(x, y) + 0.1 * P.fbm(x * 0.05, y * 0.4, 2, 59) - (Math.abs(((x - cx) / (y - 40)) * 9 % 1) < 0.08 ? 0.08 : 0)), DARK);
  // bone charms on strings from the thatch
  for (const [hxp, len, kind] of [[96, 30, 0], [128, 18, 1], [176, 26, 0], [196, 14, 2]]) { const top = wallTop(hxp) - 18; R(b, '#4a4038', hxp, top, 1, len); const y = top + len;
    if (kind === 0) { R(b, '#d8d0bc', hxp - 2, y, 5, 2); R(b, '#d8d0bc', hxp - 1, y + 2, 3, 3); b.pset(hxp - 1, y + 3, hx('#1a1410')); b.pset(hxp + 1, y + 3, hx('#1a1410')); }   // a small skull
    else if (kind === 1) { R(b, '#c8c0ac', hxp - 3, y, 7, 1); R(b, '#c8c0ac', hxp - 3, y - 1, 1, 3); R(b, '#c8c0ac', hxp + 3, y - 1, 1, 3); }   // a bone
    else { R(b, '#6a8a8a', hxp - 1, y, 3, 4); R(b, '#a8d0c8', hxp, y + 1, 1, 1); } }   // sea glass
  // the table under your hands: rough planks, the candle's light along its edge
  F(b, (x, y) => (y < 138 + (x - 160) * 0.02 ? null : 0.18 + 0.4 * lightAt(x, y) + 0.12 * (P.fbm(x * 0.02, y * 0.5, 3, 61) - 0.5) - (Math.abs((y - 138) % 9) < 0.7 ? 0.1 : 0)), DARK);
  for (let x = 0; x < W; x++) { const y = Math.round(138 + (x - 160) * 0.02); b.pset(x, y, hx(lightAt(x, y) > 0.4 ? '#a87a4a' : '#5a3e26')); }
  // her book, open under your hands, the pages full; a closed one beside it; the die
  const page = (a1, b1, c1, d1, left) => quad(b, a1, b1, c1, d1, (u, v, X, Y) => { const l = lightAt(X, Y), inner = left ? u : 1 - u, base = 0.55 + 0.4 * l - (inner > 0.9 ? 0.25 : 0);
    if (inner < 0.9 && inner > 0.08 && v > 0.08 && v < 0.92 && Math.round(v * 26) % 2 === 0 && P.fbm(u * 30, v * 13, 2, left ? 63 : 64) > 0.38) return hx(P.fbm(u * 5, v * 3, 1, 65) > 0.7 ? '#7a1a1a' : '#4a3a2c');
    return hx(['#6a5a44', '#a8946e', '#d4c4a0', '#ece0c4', '#f8f0dc'][Math.max(0, Math.min(4, Math.floor(base * 5 + (BAYER4[(Math.round(Y) & 3) * 4 + (Math.round(X) & 3)] / 16 - 0.5) * 0.8)))]); });
  page([96, 174], [160, 168], [160, 142], [108, 146], true); page([160, 168], [226, 176], [214, 147], [160, 142], false);
  R(b, '#2a1a10', 158, 142, 3, 27);   // the gutter
  quad(b, [40, 150], [84, 147], [82, 140], [44, 142], (u, v, X, Y) => hx(v < 0.2 ? '#6a2a1a' : ['#2a120c', '#4a2014', '#6a2a1a'][Math.min(2, Math.floor(lightAt(X, Y) * 4))]));   // a closed book, old red leather
  R(b, '#3a1a10', 40, 150, 44, 2);
  die20(b, 91, 131);   // the die
  // the candle in its holder, and its light
  R(b, '#2a1a10', 254, 136, 22, 3); R(b, '#4a3020', 256, 134, 18, 2); R(b, '#e8e0c8', 262, 112, 6, 22); R(b, '#c8bca0', 266, 113, 2, 21); R(b, '#f8f0dc', 262, 112, 2, 2);
  new P.Flame({ height: 16, width: 4.4, speed: 2.2, rough: 0.8, swayAmp: 1.5, bits: 0, cols: ['#7a2a0a', '#d0603a', '#ffb050', '#ffe88a', '#fff8d0'].map(hx) }).draw(b, 265, 112, 0.5);
  glow(b, 265, 104, 70, '#ffc060', 0.5); glow(b, 265, 104, 22, '#ffe8a0', 0.75);
  return b;
};

const order = ['sleep', 'dreams', 'rises', 'tune', 'leave', 'sit'];
const out = {}; for (const k of order) out[k] = cards[k]();
const prev = process.argv[2];
if (prev) {
  fs.mkdirSync(prev, { recursive: true });
  for (const k of order) P.save(out[k], path.join(prev, `card_${k}.png`));
  P.save(P.sheet(order.map((k) => ({ buf: out[k], label: k.toUpperCase(), scale: 2 })), { cols: 2, gap: 12 }), path.join(prev, 'cards_sheet.png'));
}
// the module the game imports: one data URL per ending (PNG, 320x180)
const tmp = path.join(require('os').tmpdir(), 'hoist-card.png');
const lines = order.map((k) => { P.save(out[k], tmp); return `  ${k}: 'data:image/png;base64,${fs.readFileSync(tmp).toString('base64')}',`; });
fs.writeFileSync(path.join(__dirname, '..', '..', 'src', 'endcards_data.js'),
  `// Generated by tools/endcards/paint.cjs (do not edit): the six ending cards, 320x180 PNG, painted from the game's own models (owner, 2026-11-18).\nexport const CARDS = {\n${lines.join('\n')}\n};\n`);
console.log('wrote src/endcards_data.js', fs.statSync(path.join(__dirname, '..', '..', 'src', 'endcards_data.js')).size, 'bytes');
