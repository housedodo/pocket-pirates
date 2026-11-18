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
function table(b, o) {
  const { x, y, w = 118, light = '#ffd070', top = '#e8e2d4', topShade = '#b8b0a0', leg = '#3a2a1e', candles = true } = o;
  // the far chair (behind the table), and in it the one who waits, or the old woman, or nobody
  R(b, '#1c1214', x + w - 34, y - 26, 22, 26); R(b, '#e0d8c8', x + w - 34, y - 28, 22, 3);   // its back
  if (o.figure === 'shape') { P.solid(b, [P.cap(x + w - 23, y - 30, x + w - 23, y - 2, 7, 10), P.ell(x + w - 23, y - 34, 5.5, 6.5)], ['#05040a', '#05040a', '#0b0a12', '#15131c'].map(hx), { ambient: 0.1, light: [0.8, -0.3, 0.4] }); R(b, '#6a6070', x + w - 30, y - 3, 3, 2); R(b, '#6a6070', x + w - 18, y - 3, 3, 2); }
  if (o.figure === 'old') { P.solid(b, [P.cap(x + w - 23, y - 26, x + w - 24, y - 2, 6, 9), P.ell(x + w - 22, y - 26, 4.5, 4.5), P.cap(x + w - 30, y - 12, x + w - 34, y - 2, 2.2, 2)], ['#2a2030', '#3a3040', '#6a6070', '#a8a0a8'].map(hx), { light: [0.9, -0.5, 0.5] }); R(b, '#e8e4e8', x + w - 26, y - 30, 8, 3); R(b, '#c8c0c8', x + w - 27, y - 28, 2, 3); }   // her white hair, the head bowed onto the book
  // the top: a slab seen a little from above
  R(b, top, x, y, w, 6); R(b, topShade, x, y + 5, w, 2); R(b, '#fff8e8', x + 2, y, w - 4, 1);
  for (const lx of [x + 4, x + w - 8]) { R(b, leg, lx, y + 7, 4, 26); R(b, '#1a120c', lx + 3, y + 7, 1, 26); }
  // the book, open, a pen; the die; the drawing of the Edge in red
  if (o.book !== false) { R(b, '#efe4c8', x + 38, y - 3, 15, 4); R(b, '#e0d4b4', x + 54, y - 3, 15, 4); R(b, '#8a7a5a', x + 53, y - 3, 1, 4); for (let i = 0; i < 2; i++) { R(b, '#6a5a48', x + 40, y - 2 + i * 2, 10, 1); R(b, '#6a5a48', x + 56, y - 2 + i * 2, 9, 1); } R(b, '#1a0f08', x + 72, y - 7, 1, 7); }
  if (o.die !== false) { R(b, '#f0e8d8', x + 22, y - 4, 5, 4); R(b, '#b8b0a0', x + 22, y - 1, 5, 1); b.pset(x + 24, y - 3, hx('#3a2210')); }
  R(b, '#d4c8a4', x + 8, y + 1, 26, 4); R(b, '#b01414', x + 10, y + 2, 14, 1); R(b, '#b01414', x + 24, y + 2, 1, 3); for (let i = 0; i < 3; i++) R(b, '#b01414', x + 26 + i * 2, y + 3 + (i % 2), 1, 1);   // the Edge
  // the candles: six along the top
  for (const [cx, lit] of [[6, 1], [17, 1], [33, 1], [80, 1], [92, 1], [108, 1]]) candle(b, x + cx, y - 7, candles && lit);
  if (candles) { glow(b, x + w / 2, y - 6, w * 0.7, light, 0.55, 1.4); for (const cx of [6, 17, 33, 80, 92, 108]) glow(b, x + cx + 1, y - 9, 8, light, 0.6); }
  // your chair, in front, pale, pulled out a little
  if (o.near !== false) { const cx = x + (o.nearX ?? 12); R(b, '#e0d8c8', cx, y + 16, 22, 3); R(b, '#b8b0a0', cx, y + 19, 22, 1); R(b, '#c8c0b0', cx + 1, y + 19, 2, 16); R(b, '#c8c0b0', cx + 19, y + 19, 2, 16); R(b, '#e0d8c8', cx - 1, y - 6, 3, 25); R(b, '#e0d8c8', cx - 1, y - 6, 24, 3); }
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
  table(b, { x: 96, y: 128, light: '#ffe0b0', candles: false, figure: 'old' });
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
  const tb = new P.Buf(W, H); table(tb, { x: 0, y: 40, w: 118, light: '#ffd070', figure: 'shape' });   // the table, far off: drawn whole and shrunk
  const tt = P.resize(P.crop(tb, 0, 0, 126, 80), 64, { mode: true }); put(b, tt, 132, 172 - tt.h);   // on the sand, in front of the lit sea
  return b;
};
cards.tune = () => {   // a blue night; two lights far off; the table, the die untouched, the guitar leaning on your chair; the Gull with her lamp
  const b = new P.Buf(W, H), HZ = 100;
  sky(b, HZ, NIGHT, { stars: 80, seed: 13, band: true });
  sea(b, HZ, NSEA, { lights: [34, 290] });
  onWater(b, small(lit(quarter, { k: 0.5 }), 54), 214, HZ + 18);
  beach(b, 134, ['#0b0a12', '#1a1624', '#2a2434', '#3a3448', '#4a4a5a', '#5a5a6e'], '#14263a', '#9fb8e0');
  table(b, { x: 70, y: 130, light: '#ffd070', figure: 'shape' });
  put(b, guitar, 58, 101, ([r, g, bb]) => [clamp(r * 0.9 + 10), clamp(g * 0.75 + 6), clamp(bb * 0.6 + 6)]);   // the game's guitar, against your chair, in the candles' light
  glow(b, 66, 128, 26, '#ffb050', 0.5);
  return b;
};
cards.leave = () => {   // misty night; you walk back down the sand; behind you the table, one candle, someone still in the far chair; the Gull waits
  const b = new P.Buf(W, H), HZ = 98;
  sky(b, HZ, ['#07070c', '#15151f', '#2a2a3c', '#4a4a62', '#6a6a84'], { stars: 18, seed: 21 });
  sea(b, HZ, ['#3a3a52', '#24243a', '#15151f', '#07070c'], { line: '#7a7a94', swell: '#4a4a62' });
  beach(b, 118, ['#0b0a12', '#1c1a26', '#2e2a38', '#403a4a', '#56506a', '#6e6a84'], '#2a2a3c', '#9a9ab4');
  const tb = new P.Buf(W, H); table(tb, { x: 0, y: 40, w: 118, light: '#ffd070', figure: 'shape', near: false, candles: true });
  { const t2 = P.resize(P.crop(tb, 0, 0, 126, 80), 52, { mode: true }); put(b, t2, 196, 138 - t2.h); }   // far behind you now, up the sand
  steps(b, 214, 140, 112, 178, 12, '#14121c');
  onWater(b, small(lit(stern, { k: 0.45, tint: [0.8, 0.8, 0.95], add: [14, 14, 30] }), 40), 60, HZ + 20, '#24243a');
  P.mist(b, { x: 160, y: 108, w: 190, h: 18, below: 22, t: 0, T: 1, col: hx('#8a8aa4'), strength: 0.75 });
  return b;
};
cards.sit = () => {   // from the other chair, inside: her book open under your hands, the candle, the door on the evening, a ship you do not know
  const b = new P.Buf(W, H);
  F(b, (x, y) => 0.12 + 0.24 * P.fbm(x * 0.08, y * 0.08, 3, 31) * (1 - Math.hypot((x - 240) / 300, (y - 110) / 170)), ['#05040a', '#140a08', '#2a1a0e', '#4a2c16']);
  // the door, open on the evening sea
  const D = [132, 30, 56, 92];
  const door = new P.Buf(D[2], D[3]); door.ox = D[0]; door.oy = D[1];
  F(door, (x, y) => (y < 84 ? 0.12 + 0.85 * ((y - 30) / 54) ** 1.2 : null), ['#2a1a50', '#5a2a68', '#b04a5a', '#f07a4a', '#ffc070']);
  F(door, (x, y) => (y < 84 ? null : 0.2 + 0.25 * P.fbm(x * 0.2, y * 0.6, 2, 33)), ['#1a1030', '#2a1a48', '#4a2a5a']);
  for (let y = 85; y < 122; y += 3) R(door, '#d0603a', D[0] + 6 + (y * 7) % 30, y, 6, 1);
  const green = small(lit(quarter, { k: 0.8, tint: [0.9, 0.8, 0.8], add: [20, 10, 20], lamps: false, side: -1 }), 26);
  for (let i = 0; i < green.buf.px.length; i++) { const c = green.buf.px[i]; if (!(c >>> 24)) continue; const [r, g, bb] = P.unpack(c); if (r > 120 && g > 110 && bb > 90 && Math.abs(r - g) < 40) green.buf.px[i] = P.col([clamp(r * 0.45), clamp(g * 0.95), clamp(bb * 0.5)]); }   // green sails, new paint
  put(door, green.buf, D[0] + 8, 62);
  P.solid(door, [P.cap(174, 62, 174, 121, 5, 6), P.ell(174, 56, 4, 5)], ['#05040a', '#0b0a12', '#15131c', '#2a2232'].map(hx), { light: [-0.9, 0.1, 0.4] });   // someone in the door, not yet in
  put(b, door, D[0], D[1]);
  R(b, '#2a1a0e', 128, 26, 64, 4); R(b, '#2a1a0e', 128, 26, 4, 98); R(b, '#2a1a0e', 188, 26, 4, 98); R(b, '#4a2c16', 128, 26, 64, 1);
  // the table under your hands, the book open and full, the pen; the die pushed across; the candle
  R(b, '#3a2210', 0, 128, 320, 52); R(b, '#5a3418', 0, 124, 320, 6); R(b, '#8a5a2a', 0, 124, 320, 1);
  for (let x = 0; x < 320; x += 23) R(b, '#2a1808', x, 134, 1, 46);
  R(b, '#efe4c8', 92, 134, 66, 36); R(b, '#e0d4b4', 160, 134, 66, 36); R(b, '#8a7a5a', 157, 134, 4, 36); R(b, '#b8a888', 92, 168, 134, 2);
  const r = P.rng(4); for (let y = 138; y < 166; y += 2) { R(b, '#5a4a3a', 96, y, 42 + (r() * 14 | 0), 1); R(b, '#5a4a3a', 164, y, 42 + (r() * 14 | 0), 1); if (r() < 0.2) R(b, '#7a1a1a', 96 + (r() * 30 | 0), y, 8, 1); }
  R(b, '#a01414', 164, 166, 22, 1);   // the last line, in red, not finished
  P.solid(b, [P.cap(258, 180, 242, 152, 7, 5), P.ell(238, 148, 6, 4)], ['#2a1a10', '#5a3a28', '#8a5a40', '#c08a68'].map(hx), { light: [0.6, -0.6, 0.5] });   // your hand, holding the pen
  R(b, '#1a0f08', 232, 132, 1, 15);
  R(b, '#f0e8d8', 58, 118, 6, 5); R(b, '#b8b0a0', 58, 122, 6, 1); b.pset(60, 119, hx('#3a2210'));   // the die, pushed across
  R(b, '#e8e0c8', 276, 104, 3, 20); R(b, '#c8bca0', 278, 105, 1, 19);
  new P.Flame({ height: 14, width: 4, speed: 2.2, rough: 0.8, swayAmp: 1.5, bits: 0, cols: ['#7a2a0a', '#d0603a', '#ffb050', '#ffe88a', '#fff8d0'].map(hx) }).draw(b, 277, 104, 0.5);
  glow(b, 278, 98, 80, '#ffd070', 0.6); glow(b, 278, 98, 26, '#ffe8a0', 0.8);
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
