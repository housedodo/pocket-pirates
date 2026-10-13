// The inside of a cave as its own full screen: a 320x180 pixel picture, ordered-dithered like the rest of the game, scaled up.
// Two looks (see docs/concept/cave-screen.html): 'lantern' = a black screen with one circle of lamplight (the Hermit's Larder, the Tally Niche)
// and 'passage' = a first-person tunnel with a lit chamber and rising water (the Rising Grotto).
const W = 320, H = 180;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hx = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const hash = (x, y, s = 1) => { let h = Math.imul(x * 374761393 + y * 668265263 + s * 2147483647, 1274126177); h = (h ^ (h >>> 13)) >>> 0; return (Math.imul(h, 1103515245) >>> 8) / 16777216; };
const vnoise = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
const fbm = (x, y, s) => vnoise(x, y, s) * 0.55 + vnoise(x * 2.1, y * 2.1, s + 3) * 0.3 + vnoise(x * 4.3, y * 4.3, s + 7) * 0.15;
function ramp(ctx, f, colours) {   // f(x, y) -> brightness 0..1, dithered onto a colour ramp
  const img = ctx.getImageData(0, 0, W, H), d = img.data, n = colours.length - 1, rgb = colours.map(hx);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = f(x, y); if (v == null) continue;
    const t = Math.max(0, Math.min(1, v)) * n, i = Math.min(n - 1, Math.floor(t)), frac = t - i;
    const c = rgb[frac > BAYER[(y & 3) * 4 + (x & 3)] / 16 ? i + 1 : i], k = (y * W + x) * 4;
    d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function glow(ctx, cx, cy, r, col, a) {
  const x0 = Math.max(0, cx - r | 0), y0 = Math.max(0, cy - r | 0), x1 = Math.min(W, cx + r | 0), y1 = Math.min(H, cy + r | 0);
  if (x1 <= x0 || y1 <= y0) return;
  const img = ctx.getImageData(x0, y0, x1 - x0, y1 - y0), d = img.data, c = hx(col), w = x1 - x0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const t = 1 - Math.hypot(x - cx, (y - cy) * 1.2) / r; if (t <= 0) continue;
    const k = ((y - y0) * w + (x - x0)) * 4, m = t * t * a * (t > BAYER[(y & 3) * 4 + (x & 3)] / 16 ? 1 : 0.5);
    d[k] += (c[0] - d[k]) * m; d[k + 1] += (c[1] - d[k + 1]) * m; d[k + 2] += (c[2] - d[k + 2]) * m;
  }
  ctx.putImageData(img, x0, y0);
}
const stal = (ctx, seed, col, n, maxH) => { for (let i = 0; i < n; i++) { const x = Math.floor(hash(i, 5, seed) * W), h = 3 + Math.floor(hash(i, 9, seed) * maxH), w = 2 + Math.floor(hash(i, 11, seed) * 3); for (let k = 0; k < h; k++) R(ctx, col, x - Math.floor((w * (h - k)) / h / 2), k, Math.max(1, Math.round((w * (h - k)) / h)), 1); } };
const chest = (ctx, x, y, s = 1) => { R(ctx, '#5a3418', x, y + 6 * s, 20 * s, 10 * s); R(ctx, '#7a4a22', x, y, 20 * s, 7 * s); R(ctx, '#3a2210', x, y + 6 * s, 20 * s, s); R(ctx, '#c9a85c', x + 8 * s, y + 4 * s, 4 * s, 5 * s); R(ctx, '#ffd23a', x + 3 * s, y + 5 * s, 3 * s, s); R(ctx, '#ffd23a', x + 14 * s, y + 4 * s, 2 * s, s); R(ctx, '#ffe88a', x + 5 * s, y + 3 * s, 2 * s, s); };

const WARM = ['#05040a', '#120a06', '#2a1a0e', '#4a2c16', '#7a4a22', '#b8793a'];
const GREY = ['#07070c', '#15151f', '#2a2a38', '#4a4a5a', '#7a7a88', '#b8b8c0'];
const TEAL = ['#05040a', '#0b1020', '#14263a', '#1f4a56', '#3a8890', '#9fe0d8'];

function lantern(ctx, ramp0, cx, cy, rx, ry, seed) {
  ramp(ctx, (x, y) => Math.max(0, 1 - Math.hypot((x - cx) / rx, (y - cy) / ry) * 1.15) * (0.75 + 0.5 * fbm(x / 6, y / 6, seed)), ramp0);
}
function shelves(ctx, jars, glint) {
  R(ctx, '#2a1a0e', 70, 52, 4, 80); R(ctx, '#2a1a0e', 250, 52, 4, 80);
  for (const y of [70, 100]) { R(ctx, '#5a3418', 62, y, 196, 3); for (let i = 0; i < 9; i++) { const x = 70 + i * 21 + (i % 2) * 3, h = 8 + (i * 7) % 6; R(ctx, ['#a07a3a', '#6a8a5a', '#8a5a3a', '#c8b878'][i % 4], x, y - h, 10, h); R(ctx, '#e8dcc0', x + 2, y - h - 2, 6, 2); } }
  if (glint) { R(ctx, '#ffd23a', 197, 86, 4, 4); R(ctx, '#fff4b0', 198, 87, 2, 2); }
}
function hermit(ctx, x, y) { R(ctx, '#e8e0d0', x, y, 18, 30); R(ctx, '#e8b890', x + 4, y - 6, 10, 10); R(ctx, '#7a3a2a', x - 2, y - 12, 22, 7); R(ctx, '#e8e0d0', x + 2, y + 4, 14, 14); R(ctx, '#1a1a2a', x + 6, y - 4, 2, 2); R(ctx, '#1a1a2a', x + 12, y - 4, 2, 2); }

/** draws the picture for this room; returns { lamps: [[x, y, r, colour]], water: top row of the water or null } */
const SCENES = {
  larder(ctx, node) {
    lantern(ctx, WARM, 160, 74, 130, 95, 8);
    const lamps = [[157, 40, 34, '#ffb050']];
    if (node === 'door' || node === 'washing') {
      R(ctx, '#2a1a0e', 40, 52, 240, 2);   // the line
      for (let i = 0; i < 9; i++) R(ctx, ['#e8dcc0', '#b8c8d8', '#c87a5a'][i % 3], 60 + i * 24, 54, 10 + (i % 2) * 2, 16 + (i * 5) % 10);
      R(ctx, '#2a1a0e', 150, 90, 20, 50); R(ctx, '#4a2c16', 146, 86, 28, 4);   // the narrow way on
      R(ctx, '#5a5a66', 176, 120, 10, 12); R(ctx, '#9a9aa6', 178, 118, 6, 3);
    } else {
      shelves(ctx, true, node === 'pantry');
      R(ctx, '#3a2210', 112, 124, 14, 22); R(ctx, '#7a4a22', 112, 124, 14, 3);
      R(ctx, '#6a3a1a', 192, 126, 30, 20); R(ctx, '#3a2210', 192, 134, 30, 2);
      if (node !== 'pantry') { hermit(ctx, 150, 100); R(ctx, '#5a5a66', 176, 120, 10, 12); R(ctx, '#9a9aa6', 178, 118, 6, 3); }
      for (let i = 0; i < 6; i++) R(ctx, '#e8dcc0', 214 + i * 6, 40, 3, 11 + (i * 5) % 7);
      R(ctx, '#2a1a0e', 210, 38, 38, 2);
    }
    R(ctx, '#ffd23a', 154, 38, 6, 8);
    return { lamps };
  },
  niche(ctx, node) {
    lantern(ctx, GREY, 160, 70, 170, 110, 33);
    const near = node === 'door' ? 40 : 110;
    for (let col = 0; col < 16; col++) for (let row = 0; row < 8; row++) {   // tally marks in groups of five
      const bx = 36 + col * 16, by = 40 + row * 13; if (Math.hypot(bx - 160, by - 70) > near) continue;   // (the top stays clear for the title)
      for (let k = 0; k < 4; k++) R(ctx, '#e8e4c8', bx + k * 3, by, 1, 8); R(ctx, '#e8e4c8', bx - 1, by + 3, 13, 1);
    }
    const lamps = [[160, 92, 44, '#e8e4c0']];
    if (node === 'shelf') {
      R(ctx, '#0b0a12', 110, 104, 100, 6); R(ctx, '#3a3a48', 102, 100, 116, 6);
      R(ctx, '#7a4a22', 126, 84, 22, 16); R(ctx, '#3a2210', 126, 91, 22, 1); R(ctx, '#c9a85c', 134, 90, 4, 3);
      R(ctx, '#c9a85c', 168, 90, 16, 10); R(ctx, '#ffd23a', 170, 92, 12, 6); R(ctx, '#3a2210', 175, 94, 2, 2);
    } else R(ctx, '#e8e4c8', 120, 146, 80, 2), R(ctx, '#e8e4c8', 128, 150, 64, 1);   // the writing at the bottom
    return { lamps };
  },
  grotto(ctx, node, tide) {
    const k = node === 'door' ? 0.22 : node === 'ledge' ? 0.34 : 0.5, cx = 160, cy = 84;
    ramp(ctx, (x, y) => {
      const dx = (x - cx) / 150, dy = (y - cy) / 84, r = Math.hypot(dx, dy), n = fbm(x / 9, y / 9, 3), rin = k;
      if (r < rin) return 0.78 + 0.2 * (1 - r / rin) + n * 0.1;
      return (0.55 - (r - rin) * 0.75 + (n - 0.5) * 0.35) * (0.6 + 0.4 * Math.sin(r * 22 + n * 5) * 0.5 + 0.2);
    }, TEAL);
    stal(ctx, 4, '#0b1020', 26, 14);
    const lamps = [[cx, cy + 10, 62 + k * 80, '#58f0e0']];
    if (node !== 'door') {
      const s = node === 'chest' ? 1.7 : 1;
      R(ctx, '#0b1c2a', 126 - 10 * (s - 1), 100 + 6 * (s - 1), 68 * s, 6); R(ctx, '#2a4a52', 128 - 10 * (s - 1), 98 + 6 * (s - 1), 64 * s, 3);
      chest(ctx, 150 - 10 * (s - 1), 86 + 8 * (s - 1), s);
    }
    return { lamps, water: Math.round(134 - tide * 36) };
  },
};

export class CaveScene {
  constructor(canvas) { this.cv = canvas; this.ctx = canvas.getContext('2d', { willReadFrequently: true }); this.bg = document.createElement('canvas'); this.bg.width = W; this.bg.height = H; this.t = 0; this.raf = 0; this.info = null; }
  /** kind: 'larder' | 'niche' | 'grotto'; node: the room id; tide: 0..1 (the grotto's rising water) */
  show(kind, node, tide = 0.25) {
    const b = this.bg.getContext('2d', { willReadFrequently: true });
    b.clearRect(0, 0, W, H); R(b, '#05040a', 0, 0, W, H);
    this.kind = kind; this.tide = tide; this.info = (SCENES[kind] || SCENES.larder)(b, node, tide);
    this.frame();
  }
  frame() {
    if (!this.info) return;
    const c = this.ctx; c.drawImage(this.bg, 0, 0);
    const t = this.t, wob = (i) => 0.82 + 0.18 * Math.sin(t * 7 + i * 2) + 0.06 * Math.sin(t * 13 + i);
    this.info.lamps.forEach(([x, y, r, col], i) => glow(c, x, y, r, col, 0.4 * wob(i)));
    if (this.info.water != null) {   // rising water at the bottom, shimmering
      const top = this.info.water;
      for (let y = top; y < H; y++) for (let x = 0; x < W; x++) {
        const w = 0.35 + 0.4 * Math.sin(x / 6 + y / 3 + t * 1.6) * 0.5 + (y - top) / 90 * 0.3;
        R(c, w > BAYER[(y & 3) * 4 + (x & 3)] / 16 * 0.9 + 0.2 ? '#2a8890' : '#123a48', x, y, 1, 1);
      }
      for (let x = 20; x < 300; x += 17) R(c, '#9fe0d8', x + ((hash(x, 1, 5) * 8 + t * 6) % 24 | 0), top + 4 + (hash(x, 2, 5) * 26 | 0), 5, 1);
    }
  }
  start() { if (this.raf) return; let last = 0; const loop = (ts) => { this.raf = requestAnimationFrame(loop); if (ts - last < 110) return; this.t += (ts - last) / 1000 * (last ? 1 : 0); last = ts; this.frame(); }; this.raf = requestAnimationFrame(loop); }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
}
export const caveLook = (kind) => (kind === 'grotto' ? 'passage' : 'lantern');
