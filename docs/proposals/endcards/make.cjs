// End-card proposals for HOIST, built with codixel (core/pixel.js) in the game's own palettes (src/cavescene.js ramps).
// 320x180, dithered, no anti-aliasing. Previews only.
const P = require('../../../.claude/skills/codixel/core/pixel.js');
const W = 320, H = 180, HZ = 96;   // the horizon
const hx = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const pal = (a) => a.map(hx);
const palN = (a) => a.map((h) => P.col(hx(h)));
const F = (b, fn, cols) => b.field((x, y) => { const v = fn(x, y); return v == null ? null : Math.max(0.001, Math.min(0.999, v)); }, palN(cols));
const R = (b, c, x, y, w, h) => b.rect(x, y, x + w, y + h, hx(c));
const stars = (b, n, seed, col = '#e8f0ff', y1 = HZ - 10) => { const r = P.rng(seed); for (let i = 0; i < n; i++) b.pset(r() * W | 0, r() * y1 | 0, hx(r() < 0.15 ? '#ffe8b0' : col)); };
const glow = (b, cx, cy, r, col, a) => { const c = hx(col); for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) { const t = 1 - Math.hypot(x - cx, (y - cy) * 1.2) / r; if (t <= 0) continue; if (P.bt(x, y) < t * t * a * 1.6) { const o = b.get(x, y); if (!o) continue; const u = P.unpack(o); b.pset(x, y, P.mix(u, c, 0.45)); } } };
const sea = (b, cols, t = 0) => P.reflect(b, { y0: HZ, y1: H, t, T: 1, cols: pal(cols), keep: 0.55, falloff: 0.008 });
const sand = (b, top, cols) => F(b, (x, y) => (y < top + Math.sin(x / 40) * 2 ? null : 0.3 + 0.4 * P.fbm(x * 0.12, y * 0.25, 3, 7) + (y - top) / 140), cols);
const SAND = ['#120a06', '#2a1a0e', '#4a3a28', '#6a5a40', '#8a7a5a', '#b8a880'];
const candle = (b, x, y, h = 8) => { R(b, '#e8e0c8', x, y, 2, h); R(b, '#d8ccb0', x + 1, y + 1, 1, h - 1); const f = new P.Flame({ height: 9, width: 3, speed: 2.2, rough: 0.8, swayAmp: 1, bits: 0, cols: pal(['#7a2a0a', '#d0603a', '#ffb050', '#ffe88a', '#fff8d0']) }); f.draw(b, x + 1, y, 0.7); };
const table = (b, x, y, w, col = '#5a3418') => { R(b, '#3a2210', x + 4, y + 4, w - 8, 6); R(b, col, x, y, w, 5); R(b, '#7a4a22', x, y, w, 1); R(b, '#2a1a0e', x + 6, y + 10, 4, 24); R(b, '#2a1a0e', x + w - 10, y + 10, 4, 24); };
const book = (b, x, y, open = true) => { if (open) { R(b, '#e8dcc0', x, y, 14, 4); R(b, '#d8ccb0', x + 14, y, 14, 4); R(b, '#8a7a5a', x + 13, y, 2, 4); for (let i = 0; i < 2; i++) { R(b, '#5a4a3a', x + 2, y + 1 + i * 2, 9, 1); R(b, '#5a4a3a', x + 16, y + 1 + i * 2, 9, 1); } } else { R(b, '#2a1a0e', x + 4, y + 1, 18, 3); R(b, '#4a2c16', x + 4, y, 18, 1); } };
const die = (b, x, y) => { R(b, '#e8e0d0', x, y, 5, 4); R(b, '#b8b0a0', x, y + 3, 5, 1); b.pset(x + 2, y + 1, hx('#3a2210')); };
const chair = (b, x, y, col = '#2a1a0e', back = 'left') => { R(b, col, x, y, 16, 3); R(b, col, x + 1, y + 3, 2, 14); R(b, col, x + 13, y + 3, 2, 14); R(b, col, back === 'left' ? x : x + 14, y - 18, 2, 18); R(b, col, back === 'left' ? x : x + 8, y - 18, 8, 2); };
const hooded = (b, x, y, col = '#05040a') => { P.solid(b, [P.cap(x, y - 30, x, y, 7, 11), P.ell(x, y - 33, 6, 7), P.cap(x - 7, y - 22, x - 9, y - 6, 3, 3), P.cap(x + 7, y - 22, x + 9, y - 6, 3, 3)], pal([col, col, '#0b0a12', '#15131c']), { ambient: 0.1, light: [0.8, -0.3, 0.4] }); };

const cards = {};
// 1. THE LONG SLEEP: first light, a flat sea, the table side on, the book shut, an old woman asleep in her chair
cards.sleep = () => { const b = new P.Buf(W, H);
  P.sky(b, { cols: pal(['#1a1430', '#4a3a5a', '#a0708a', '#e8b890', '#ffe0b0']), y0: 0, y1: HZ });
  P.clouds(b, { base: 58, h: 16, cols: pal(['#4a3a5a', '#a0708a', '#e8b890', '#fff0d0']), seed: 5, amount: 0.8, t: 0, T: 1, sun: [0.2, 1] });
  glow(b, 230, HZ - 2, 40, '#fff0c0', 0.8); R(b, '#fff4d8', 222, HZ - 4, 16, 4);   // the sun, only just up
  sea(b, ['#a0708a', '#6a4a6a', '#2a1a30']); sand(b, 140, SAND);
  table(b, 112, 120, 86); book(b, 140, 116, false); die(b, 126, 116);
  chair(b, 186, 136, '#3a2a20', 'right'); P.solid(b, [P.ell(196, 128, 7, 9), P.ell(195, 117, 4, 4), P.cap(196, 128, 188, 134, 3, 2)], pal(['#2a2030', '#3a3040', '#6a6070', '#a8a0a8']), { light: [0.9, -0.2, 0.5] });
  R(b, '#e8e0e0', 192, 113, 7, 2);   // her hair, white, the head bowed
  for (let i = 0; i < 40; i++) R(b, '#4a3a28', 110 - i * 2, 145 + (i % 3), 2, 1);   // the long shadow toward you
  return b; };
// 2. GOOD DREAMS: a blue night, the Gull at anchor small, a light at each end of the horizon: his, hers
cards.dreams = () => { const b = new P.Buf(W, H);
  P.sky(b, { cols: pal(['#05040a', '#0b1020', '#14263a', '#1f3a56', '#3a5a88']), y0: 0, y1: HZ }); stars(b, 70, 3);
  for (let i = 0; i < 260; i++) { const x = (i * 1.23) % W, y = 20 + Math.sin(x / 60) * 10 + (P.rng(i)() - 0.5) * 18; if (P.bt(x, y) < 0.5) b.pset(x | 0, y | 0, hx('#3a5a88')); }   // the band of the milky way
  sea(b, ['#1f3a56', '#14263a', '#0b1020']);
  for (const x of [28, 292]) { glow(b, x, HZ - 2, 14, '#ffd070', 0.9); R(b, '#ffe88a', x, HZ - 3, 2, 2); for (let k = 0; k < 6; k++) R(b, '#c8a050', x - 1 + (k % 2), HZ + 3 + k * 4, 3 - (k % 2), 1); }
  R(b, '#2a1a0e', 150, HZ + 6, 24, 4); R(b, '#1a0f08', 152, HZ + 10, 20, 2); R(b, '#3a2210', 161, HZ - 16, 1, 22); R(b, '#c8bc9a', 157, HZ - 13, 8, 2);   // the Gull, sails furled
  R(b, '#ffd070', 172, HZ + 3, 1, 2); glow(b, 172, HZ + 3, 9, '#ffd070', 0.8);   // her stern lamp
  return b; };
// 3. SHE RISES: the sea lit from below, something vast under it, the table very small on the sand
cards.rises = () => { const b = new P.Buf(W, H);
  P.sky(b, { cols: pal(['#05040a', '#100618', '#2a0a2a', '#4a0a3a', '#7a1a4a']), y0: 0, y1: HZ }); stars(b, 30, 9, '#c08ab0');
  F(b, (x, y) => (y < HZ ? null : 0.15 + 0.85 * Math.max(0, 1 - Math.hypot((x - 160) / 150, (y - 128) / 24)) * (0.7 + 0.5 * P.fbm(x * 0.05, y * 0.2, 3, 4))), ['#05040a', '#2a0a2a', '#5a1a5a', '#a03a8a', '#ff70d0']);
  F(b, (x, y) => (y < HZ + 6 || y > 150 ? null : Math.hypot((x - 160) / 120, (y - 126) / 14) < 1 && P.fbm(x * 0.03, y * 0.3, 2, 8) > 0.35 ? 0.9 : null), ['#100618', '#05040a']);   // the shape under the water
  R(b, '#05040a', 158, 124, 4, 3); R(b, '#ff9ae0', 159, 125, 2, 1);   // and in it, one opening
  sand(b, 156, ['#05040a', '#120a10', '#2a1a22', '#3a2a30', '#5a4048', '#7a5a60']);
  table(b, 150, 160, 22); die(b, 158, 156);
  return b; };
// 4. THE TUNE IS KEPT: night, the far chair empty, a guitar leaning on it, the die untouched; far off, two lights
cards.tune = () => { const b = new P.Buf(W, H);
  P.sky(b, { cols: pal(['#05040a', '#0b1020', '#14263a', '#1f3a56', '#3a5a88']), y0: 0, y1: HZ }); stars(b, 60, 13);
  sea(b, ['#1f3a56', '#14263a', '#0b1020']); for (const x of [40, 280]) { glow(b, x, HZ - 1, 12, '#ffd070', 0.9); R(b, '#ffe88a', x, HZ - 2, 2, 2); }
  sand(b, 128, SAND);
  chair(b, 166, 116, '#1a0f08', 'right'); table(b, 96, 120, 128); book(b, 140, 115); die(b, 116, 115); candle(b, 206, 107);
  P.solid(b, [P.ell(176, 104, 7, 8), P.ell(176, 94, 5, 5), P.cap(176, 90, 182, 66, 1.5, 1.5)], pal(['#3a1a08', '#7a4a22', '#a0602a', '#d89050']), { light: [-0.5, -0.6, 0.6] });   // the guitar against the chair
  R(b, '#2a1608', 174, 101, 4, 3); R(b, '#2a1a0e', 180, 62, 4, 6);
  glow(b, 207, 102, 40, '#ffd070', 0.55);
  return b; };
// 5. THE UNSEEN THROW: the table stands on the water in a sea mist, the far chair taken, yours pulled out, one candle
cards.leave = () => { const b = new P.Buf(W, H);
  P.sky(b, { cols: pal(['#07070c', '#15151f', '#2a2a38', '#4a4a5a']), y0: 0, y1: HZ });
  sea(b, ['#2a2a38', '#15151f', '#07070c']);
  hooded(b, 160, 112); table(b, 110, 110, 100, '#3a2a20'); book(b, 146, 105); candle(b, 192, 97);
  R(b, '#2a1a0e', 196, 132, 18, 3); R(b, '#2a1a0e', 198, 135, 2, 16); R(b, '#2a1a0e', 210, 135, 2, 12); R(b, '#3a2210', 212, 112, 2, 22);   // your chair, out from the table, turned to you
  for (const x of [116, 204]) for (let i = 0; i < 3; i++) R(b, '#4a4a5a', x - 3 - i * 3, 145 + i * 2, 10 + i * 6, 1);
  P.mist(b, { x: 160, y: 120, w: 170, h: 26, below: 30, t: 0, T: 1, col: hx('#7a7a88'), strength: 0.9 });
  glow(b, 193, 94, 34, '#ffd070', 0.6);
  return b; };
// 6. YOUR SEAT: from the keeper's chair, inside the hut: her book open under your hands, the candle, the door, someone new in it
cards.sit = () => { const b = new P.Buf(W, H);
  F(b, (x, y) => 0.12 + 0.2 * P.fbm(x * 0.08, y * 0.08, 3, 31) * (1 - Math.hypot((x - 200) / 260, (y - 110) / 160)), ['#05040a', '#120a06', '#2a1a0e', '#4a2c16']);
  P.sky(b, { cols: pal(['#3a1a50', '#7a2a60', '#d0603a', '#ffc070']), y0: 34, y1: 86 }); b.rect(0, 0, 134, 180, 0); b.rect(184, 0, 320, 180, 0);   // the door: evening
  F(b, (x, y) => (x < 136 || x >= 184 || y < 34 || y >= 120 ? null : y < 86 ? null : 0.25 + 0.15 * P.fbm(x * 0.2, y * 0.6, 2, 33)), ['#05040a', '#1a1030', '#3a1a50']);
  F(b, (x, y) => ((x < 136 || x >= 184 || y < 34 || y >= 120) ? 0.12 + 0.2 * P.fbm(x * 0.08, y * 0.08, 3, 31) * (1 - Math.hypot((x - 200) / 260, (y - 110) / 160)) : null), ['#05040a', '#120a06', '#2a1a0e', '#4a2c16']);
  R(b, '#2a1a0e', 132, 30, 56, 4); R(b, '#2a1a0e', 132, 30, 4, 92); R(b, '#2a1a0e', 184, 30, 4, 92);
  R(b, '#4a9a5a', 145, 72, 8, 10); R(b, '#5ab06a', 149, 74, 6, 6); R(b, '#2a1a0e', 152, 70, 1, 16); R(b, '#7a4a22', 142, 85, 16, 3);   // green sails, new paint
  P.solid(b, [P.cap(170, 70, 170, 118, 5, 6), P.ell(170, 64, 4, 5)], pal(['#05040a', '#0b0a12', '#15131c', '#2a2232']), { light: [-0.9, 0.1, 0.4] });   // someone in the door, not yet in
  R(b, '#3a2210', 0, 130, 320, 50); R(b, '#5a3418', 0, 126, 320, 6); R(b, '#7a4a22', 0, 126, 320, 1);
  R(b, '#e8dcc0', 96, 136, 62, 34); R(b, '#d8ccb0', 160, 136, 62, 34); R(b, '#8a7a5a', 157, 136, 4, 34);   // the book, open, full
  const r = P.rng(4); for (let y = 140; y < 168; y += 2) { R(b, '#5a4a3a', 100, y, 40 + (r() * 14 | 0), 1); R(b, '#5a4a3a', 164, y, 40 + (r() * 14 | 0), 1); }
  R(b, '#7a1a1a', 100, 166, 22, 1);   // the last line, in red, unfinished
  P.solid(b, [P.cap(250, 178, 236, 150, 7, 5), P.ell(232, 146, 6, 4)], pal(['#2a1a10', '#5a3a28', '#8a5a40', '#c08a68']), { light: [0.6, -0.6, 0.5] });   // your hand, holding the pen
  R(b, '#1a0f08', 226, 132, 1, 14);
  die(b, 62, 120); candle(b, 270, 110, 14); glow(b, 271, 104, 70, '#ffd070', 0.55);
  return b; };

const order = [['sleep', 'THE LONG SLEEP'], ['dreams', 'GOOD DREAMS'], ['rises', 'SHE RISES'], ['tune', 'THE TUNE IS KEPT'], ['leave', 'THE UNSEEN THROW'], ['sit', 'YOUR SEAT']];
const out = process.argv[2];
const bufs = order.map(([k, l]) => { const b = cards[k](); P.save(b, `${out}/endcard_${k}.png`); return { buf: b, label: l, scale: 2 }; });
P.save(P.sheet(bufs, { cols: 2, gap: 12 }), `${out}/endcards_proposals.png`);
