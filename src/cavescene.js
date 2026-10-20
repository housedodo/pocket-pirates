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
const VIOLET = ['#05040a', '#150a22', '#2a1245', '#52208a', '#a050e0', '#f0c8ff'];
const SCENES = {
  house(ctx, node) {   // the lamp room: a huge steady lamp, a round desk, a ledger, an hourglass that has stopped
    lantern(ctx, WARM, 160, 70, 150, 105, 12);
    R(ctx, '#ffd23a', 146, 30, 28, 26); R(ctx, '#fff4b0', 150, 34, 20, 18); R(ctx, '#3a2210', 138, 56, 44, 6);
    R(ctx, '#5a3418', 60, 112, 200, 8); R(ctx, '#3a2210', 70, 120, 10, 40); R(ctx, '#3a2210', 240, 120, 10, 40);
    R(ctx, '#e8dcc0', 120, 100, 44, 12); R(ctx, '#b8a880', 120, 108, 44, 4); R(ctx, '#6a3a1a', 128, 94, 28, 6);
    R(ctx, '#e8c050', 192, 98, 10, 14); R(ctx, '#ffe88a', 194, 100, 6, 4);
    if (node !== 'door') { R(ctx, '#2a1a0e', 180, 74, 6, 24); R(ctx, '#e8e0d0', 178, 62, 10, 14); R(ctx, '#e8b890', 180, 66, 6, 6); }   // the keeper
    return { lamps: [[160, 44, 90, '#ffd070']] };
  },
  bellreef(ctx, node) {   // green water over a reef, a belfry roof, a bell
    ramp(ctx, (x, y) => { const r = Math.hypot((x - 160) / 160, (y - 90) / 90), n = fbm(x / 9, y / 9, 55); return (1.05 - r * 0.8) * (0.55 + 0.6 * n) + 0.08; }, TEAL);
    for (let i = 0; i < 30; i++) R(ctx, '#9fe0d8', hash(i, 1, 9) * W, 20 + hash(i, 2, 9) * 130, 1, 1);
    R(ctx, '#3a2f30', 100, 112, 120, 30); R(ctx, '#2a2024', 112, 100, 96, 16);
    R(ctx, '#5a3418', 128, 68, 64, 40); R(ctx, '#3a2210', 124, 62, 72, 8); R(ctx, '#7a4a22', 136, 54, 48, 10); R(ctx, '#3a2210', 132, 48, 56, 8);
    R(ctx, '#c9a85c', 148, 78, 24, 22); R(ctx, '#ffd23a', 152, 82, 16, 8); R(ctx, '#8a6a30', 156, 98, 8, 6);
    if (node === 'town') { for (let i = 0; i < 6; i++) { R(ctx, '#2a1a0e', 20 + i * 52, 118, 36, 26); R(ctx, '#7a3a2a', 16 + i * 52, 108, 44, 12); R(ctx, '#ffd23a', 30 + i * 52, 128, 6, 8); } }
    return { lamps: [[160, 84, 80, '#58f0e0']] };
  },
  ferry(ctx, node) {   // a grey pier and a grey lantern in fog
    ramp(ctx, (x, y) => (0.3 + 0.4 * (1 - y / H) + 0.2 * fbm(x / 12, y / 12, 61)) * (1 - 0.3 * Math.hypot((x - 160) / 200, (y - 90) / 110)), GREY);
    R(ctx, '#2a2a38', 40, 118, 240, 10); for (let i = 0; i < 9; i++) R(ctx, '#15151f', 50 + i * 28, 128, 6, 22);
    R(ctx, '#4a4a5a', 148, 80, 4, 40); R(ctx, '#b8b8c0', 142, 70, 16, 14); R(ctx, '#e8e8f0', 146, 74, 8, 6);
    R(ctx, '#15151f', 200, 92, 14, 26); R(ctx, '#2a2a38', 202, 84, 10, 10);   // the passenger
    return { lamps: [[150, 76, 70, '#c8c8d8']] };
  },
  hollow(ctx, node) {   // a lamp-lit pier at dusk, a figure with wet hands
    lantern(ctx, TEAL, 160, 78, 150, 100, 71);
    R(ctx, '#2a3a48', 30, 118, 260, 10); for (let i = 0; i < 10; i++) R(ctx, '#0b1020', 36 + i * 26, 128, 6, 22);
    R(ctx, '#1a2a3a', 150, 80, 22, 40); R(ctx, '#e8e0d0', 154, 66, 14, 16); R(ctx, '#1a1a2a', 157, 71, 2, 2); R(ctx, '#1a1a2a', 163, 71, 2, 2);
    R(ctx, '#9fe0d8', 150, 112, 6, 8); R(ctx, '#9fe0d8', 166, 112, 6, 8);
    return { lamps: [[160, 70, 90, '#9fe0d8']] };
  },
  musichouse(ctx, node) {   // a house on four legs in black water, one window, three notes drifting
    ramp(ctx, (x, y) => (0.25 + 0.3 * (y / H) + 0.2 * fbm(x / 10, y / 10, 81)) * (1 - 0.4 * Math.hypot((x - 160) / 190, (y - 90) / 100)), ['#05040a', '#0b1020', '#14263a', '#1f3a56', '#3a5a88', '#9fb8e0']);
    for (const lx of [118, 132, 188, 202]) { R(ctx, '#0b0a12', lx, 100, 4, 50); }
    R(ctx, '#15151f', 112, 70, 96, 34); R(ctx, '#0b0a12', 108, 62, 104, 10); R(ctx, '#2a2a38', 128, 50, 64, 14);
    R(ctx, '#ffd23a', 152, 78, 16, 14); R(ctx, '#fff4b0', 156, 82, 8, 6);
    for (let i = 0; i < 3; i++) { R(ctx, '#e8f0ff', 220 + i * 18, 60 - i * 12, 5, 5); R(ctx, '#e8f0ff', 224 + i * 18, 52 - i * 12, 1, 8); }
    return { lamps: [[160, 84, 70, '#ffd070']] };
  },
  raven(ctx, node) {   // two ships, the same, at dusk
    ramp(ctx, (x, y) => (y < 100 ? 0.15 + 0.5 * (1 - y / 100) : 0.12 + 0.1 * fbm(x / 8, y / 8, 91)), ['#05040a', '#1a1030', '#3a1a50', '#7a2a60', '#d0603a', '#ffc070']);
    const ship = (x, y, col, sail) => { R(ctx, col, x, y + 26, 70, 12); R(ctx, '#2a1a0e', x + 6, y + 38, 58, 4); R(ctx, '#3a2210', x + 34, y - 6, 3, 34); R(ctx, sail, x + 8, y, 26, 28); R(ctx, '#ffd23a', x + 50, y + 22, 6, 4); };
    ship(70, 62, '#7a4a22', '#e8dcc0'); ship(180, 66, '#2a2438', '#6a6a80');
    return { lamps: [[160, 70, 100, '#ff9a50']] };
  },
  colourspring(ctx, node) {   // the Colour's spring: a ring of pale stones on a dark sea and a hum of violet coming up through it
    ramp(ctx, (x, y) => { const r = Math.hypot((x - 160) / 150, (y - 92) / 78), n = fbm(x / 8, y / 8, 41); return Math.max(0, 1.05 - r * 0.95) * (0.55 + 0.7 * n); }, VIOLET);
    const cx = 160, cy = 96;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, x = cx + Math.cos(a) * 46, y = cy + Math.sin(a) * 18; R(ctx, '#c8c4d8', x - 6, y - 5, 12, 8); R(ctx, '#7a7690', x - 6, y + 1, 12, 3); }
    if (node === 'stones' || node === 'seal') { R(ctx, '#07040e', cx - 14, cy - 5, 28, 10); R(ctx, '#e8b0ff', cx - 9, cy - 2, 18, 4); }
    if (node === 'seal') { R(ctx, '#d8d4e8', cx - 22, cy + 22, 44, 22); R(ctx, '#8a86a4', cx - 22, cy + 38, 44, 6); }
    for (let i = 0; i < 40; i++) { const a = hash(i, 3, 6) * 6.28, d = 8 + hash(i, 4, 6) * 70; R(ctx, '#f0c8ff', cx + Math.cos(a) * d, cy - 10 - hash(i, 5, 6) * 50 + Math.sin(a) * 8, 1, 1); }
    return { lamps: [[cx, cy, 82, '#d070ff']] };
  },
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
export const caveLook = (kind) => (kind === 'grotto' ? 'passage' : 'lantern');   // the Colour's spring uses the lantern look
