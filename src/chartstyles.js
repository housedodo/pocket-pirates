// Chart variants (proposals, picked by URL flag; no flag = the chart in chart.js, untouched).
//   ?chartstyle=a  inked portolan on vellum: a sea-green wash where you have sailed, bare vellum and rhumb lines elsewhere
//   ?chartstyle=b  engraved pilot chart: black ink on laid paper, water lines round the shores, stipple shoals, soundings
//   ?chartstyle=c  indigo and gold: a dyed night chart in the game's navy, gold rhumbs, the known sea lit in teal
//   ?uifont=a|b|c  a typeface pairing (see FONTS); the CSS for the pages is the CHART-VARIANTS block in index.html
// Rule for all three: painted means sailed. Water within sight of an isle you have charted (or of the ship) is drawn as sea;
// everything else is the bare sheet with the chartmaker's rhumb lines. The fog wall is just where the paint stops.
// Everything is set pixel by pixel at half resolution (no anti-aliased strokes); labels go on the full-resolution layer and
// are cut hard (alpha threshold), like the #crisp filter.
import { shoreR, hasLighthouse } from './world.js';
import { sectorInfo, sectorCoord } from './sectors.js';
import { hash2 } from './util.js';
import { LANES } from './seaplay.js';
import { LM } from './landmarks.js';
import { isKnown } from './clues.js';

const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const pick = (k) => (['a', 'b', 'c'].includes((q.get(k) || '').toLowerCase()) ? q.get(k).toLowerCase() : null);
export const CHART_STYLE = pick('chartstyle');
export const UI_FONT = pick('uifont');
if (typeof document !== 'undefined') {
  if (UI_FONT) document.documentElement.dataset.uifont = UI_FONT;
  if (CHART_STYLE) document.documentElement.dataset.chartstyle = CHART_STYLE;
}

/** display face (harbours, the name of the waters) and text face (isles, notes), with the sizes that sit on each font's own grid */
export const FONTS = {
  0: { disp: '"Pirata One", Georgia, serif', dpx: 22, dbig: 26, body: '"DotGothic16", monospace', bpx: 16 },
  a: { disp: '"Jacquard 12", "Pirata One", serif', dpx: 24, dbig: 24, body: '"DotGothic16", monospace', bpx: 16 },
  b: { disp: '"Pirata One", Georgia, serif', dpx: 24, dbig: 26, body: '"Jersey 10", "DotGothic16", monospace', bpx: 16 },   // Jersey 10 carries size-adjust 125%: 16px draws at 20, two screen pixels per font pixel
  c: { disp: '"IM Fell English SC", Georgia, serif', dpx: 20, dbig: 24, body: '"IM Fell DW Pica", Georgia, serif', bpx: 16 },
}[UI_FONT || 0];
let fontsAsked = false;

// ---- the three looks
const TH = {
  a: {
    paper: [[231, 213, 168], [221, 201, 152]], fox: [201, 174, 122], edge: [196, 170, 120],
    sea: [[150, 190, 176], [130, 174, 166]], rim: [98, 146, 146], shoal: [190, 216, 190],
    ink: [52, 32, 18], soft: [120, 92, 60], red: [158, 46, 28], gold: [164, 104, 22], pencil: [58, 58, 122],
    rh: [[176, 148, 104], [150, 164, 112], [194, 130, 100]], rhSea: [[98, 132, 122], [92, 140, 110], [150, 122, 104]],
    land: { sand: [240, 224, 176], green: [176, 184, 124], rock: [198, 184, 158], dark: [150, 128, 116], shade: [150, 122, 84] },
    lagoon: [190, 216, 190], current: [244, 236, 208], txt: '#34200f', txtRed: '#9a2c1a', txtSoft: '#6e5236', halo: null,
  },
  b: {
    paper: [[236, 230, 210], [229, 222, 199]], fox: [214, 204, 176], edge: [206, 196, 168],
    sea: [[208, 220, 210], [208, 220, 210]], rim: [150, 168, 164], shoal: [222, 230, 216],
    ink: [34, 28, 28], soft: [112, 108, 104], red: [156, 40, 30], gold: [34, 28, 28], pencil: [58, 58, 122],
    rh: [[196, 188, 166], [196, 188, 166], [196, 188, 166]], rhSea: [[168, 184, 178], [168, 184, 178], [168, 184, 178]],
    land: { sand: [244, 240, 224], green: [244, 240, 224], rock: [244, 240, 224], dark: [200, 194, 182], shade: [34, 28, 28] },
    lagoon: [208, 220, 210], current: [34, 28, 28], txt: '#221c1c', txtRed: '#9c281e', txtSoft: '#5c5854', halo: null,
  },
  c: {
    paper: [[27, 21, 56], [34, 27, 72]], fox: [42, 34, 86], edge: [18, 13, 40],
    sea: [[30, 78, 112], [36, 96, 128]], rim: [24, 58, 92], shoal: [72, 176, 178],
    ink: [12, 9, 28], soft: [201, 168, 92], red: [226, 86, 56], gold: [255, 210, 58], pencil: [176, 160, 240],
    rh: [[98, 80, 84], [70, 60, 104], [84, 68, 84]], rhSea: [[54, 110, 136], [48, 104, 136], [54, 110, 136]],
    land: { sand: [236, 214, 156], green: [112, 166, 92], rock: [168, 160, 150], dark: [110, 98, 108], shade: [150, 122, 84] },
    lagoon: [79, 224, 208], current: [223, 240, 240], txt: '#f4ead0', txtRed: '#ffd23a', txtSoft: '#c9a85c', halo: '#0c091c',
  },
};

// ---- sprites (character grids, like src/pixelui.js)
export const SPR = {
  anchor: ['....#....', '...#.#...', '....#....', '..#####..', '....#....', '....#....', '#...#...#', '.#..#..#.', '..#####..'],
  cross: ['##.....##', '.##...##.', '..##.##..', '...###...', '..##.##..', '.##...##.', '##.....##'],
  query: ['.####.', '##..##', '....##', '...##.', '..##..', '......', '..##..', '..##..'],
  flag: ['##....', '#####.', '######', '#####.', '##....', '#.....', '#.....', '#.....'],
  pin: ['..###..', '.#...#.', '#..#..#', '#.###.#', '#..#..#', '.#...#.', '..###..'],
  crate: ['#######', '##...##', '#.#.#.#', '#..#..#', '#.#.#.#', '##...##', '#######'],
  tree: ['.##..', '####.', '.###.', '..#..', '..#..'],
  palm: ['#.#.#', '.###.', '#.#.#', '..#..', '.#...'],
  hill: ['...#...', '..#.#..', '.#..##.', '#....##'],
  peak: ['..#.#..', '...#...', '..#.#..', '.#..##.', '#....##'],
  house: ['..#..', '.###.', '#####', '.#.#.', '.###.'],
  spire: ['.#.', '###', '.#.', '.#.', '###', '#.#', '###'],
  root: ['.###.', '#####', '.#.#.', '#.#.#'],
  light: ['.#.', '###', '.#.', '.#.', '.#.', '###'],
  fleur: ['...#...', '..###..', '..###..', '#.###.#', '#######', '#.###.#', '...#...', '.#####.', '...#...'],
};
const DIG = ['###|#.#|#.#|#.#|###', '.#.|##.|.#.|.#.|###', '###|..#|###|#..|###', '###|..#|.##|..#|###', '#.#|#.#|###|..#|..#', '###|#..|###|..#|###', '###|#..|###|#.#|###', '###|..#|..#|.#.|.#.', '###|#.#|###|#.#|###', '###|#.#|###|..#|###'].map((s) => s.split('|'));

const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const h01 = (a, b, s) => ((hash2(a, b, s) >>> 0) % 1000) / 1000;
const vnoise = (x, z) => { const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi; const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz); return (h01(xi, zi, 7) * (1 - sx) + h01(xi + 1, zi, 7) * sx) * (1 - sz) + (h01(xi, zi + 1, 7) * (1 - sx) + h01(xi + 1, zi + 1, 7) * sx) * sz; };
const css = (a) => `rgb(${a[0]},${a[1]},${a[2]})`;
const RHUMB_C = [-190, 170], RHUMB_R = 640;   // the wind rose the chart was ruled from (world units), and its ring of sixteen

export function drawVariant(lb, key) {
  const T = TH[key], { state, world, ship, seed } = lb.d, c = lb.c, v = lb.view, sc = v.sc;
  if (!c || !lb.MW) return;
  if (!fontsAsked && document.fonts && document.fonts.load) { fontsAsked = true; Promise.all([document.fonts.load(`${FONTS.dpx}px ${FONTS.disp}`), document.fonts.load(`${FONTS.bpx}px ${FONTS.body}`)]).then(() => drawVariant(lb, key)).catch(() => {}); }
  const W = lb.MW, H = lb.MH, w2 = c.canvas.width, h2 = c.canvas.height, show = v.show, k2 = sc / 2;
  const X = (wx) => (W / 2 + (wx - v.cx) * sc) / 2, Z = (wz) => (H / 2 + (wz - v.cz) * sc) / 2;   // world -> half-res pixels
  const WX = (x) => v.cx + (x * 2 - W / 2) / sc, WZ = (y) => v.cz + (y * 2 - H / 2) / sc;
  const warp = lb.d.abyss ? lb.d.abyss.mapWarp() : null;
  c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.globalAlpha = 1;

  // ---- islands we know (with the full-dread warp: they drift and phantoms appear), as in chart.js
  const isl = [], known = [];
  let n = 0;
  for (const id of Object.keys(state.discovered)) {
    const [cx, cz] = id.split(',').map(Number), d = world.desc(cx, cz); if (!d) continue;
    known.push(d);
    let ox = 0, oz = 0;
    if (warp) { if (warp.since < n++ * 0.18) continue; const h = hash2(cx, cz, 9) % 100; ox = Math.sin(warp.t * 0.35 + h) * 26 / sc; oz = Math.cos(warp.t * 0.27 + h * 1.7) * 20 / sc; }
    if (X(d.x + ox) < -60 || X(d.x + ox) > w2 + 60 || Z(d.z + oz) < -60 || Z(d.z + oz) > h2 + 60) continue;
    isl.push({ d, ox, oz, a: 1, name: warp && (hash2(cx, cz, Math.floor(warp.t / 3)) % 5 === 0) ? 'not here' : d.name });
  }
  if (warp && warp.since > 1.2) for (const ph of warp.phantoms) isl.push({ d: ph, ox: Math.sin(warp.t * 0.5) * 10 / sc, oz: 0, name: ph.name, ghost: true, a: Math.min(1, (warp.since - 1.2) / 2) });

  // ---- shore field: for every pixel near an island, how far it is from that shore (px, negative on land)
  const N = w2 * h2, shore = new Float32Array(N).fill(99), who = new Int16Array(N).fill(-1), BAND = 13;
  isl.forEach((o, k) => {
    const d = o.d, tab = new Float32Array(65); let rm = 0;
    for (let i = 0; i < 64; i++) { tab[i] = shoreR(d, (i / 64) * Math.PI * 2) * k2; if (tab[i] > rm) rm = tab[i]; }
    tab[64] = tab[0]; o.rm = rm; o.px = X(d.x + o.ox); o.pz = Z(d.z + o.oz);
    const x0 = Math.max(0, Math.floor(o.px - rm - BAND)), x1 = Math.min(w2 - 1, Math.ceil(o.px + rm + BAND)), y0 = Math.max(0, Math.floor(o.pz - rm - BAND)), y1 = Math.min(h2 - 1, Math.ceil(o.pz + rm + BAND));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - o.px, dy = y + 0.5 - o.pz, dist = Math.hypot(dx, dy); if (dist > rm + BAND) continue;
      let t = Math.atan2(dy, dx) / (Math.PI * 2); if (t < 0) t += 1; t *= 64; const ti = Math.floor(t), s = dist - (tab[ti] + (tab[ti + 1] - tab[ti]) * (t - ti)), i = y * w2 + x;
      if (s < 0 && o.a < 1 && BAY[(y & 3) * 4 + (x & 3)] / 16 >= o.a) continue;   // a phantom fades in as a dither
      if (s < shore[i]) { shore[i] = s; who[i] = k; }
    }
  });

  // ---- what you have seen: water within sight of a charted isle or of the ship, never past the fog wall (coarse grid, then eased)
  const G = 4, gw = Math.ceil(w2 / G) + 2, gh = Math.ceil(h2 / G) + 2, seen = new Float32Array(gw * gh), gate = lb.d.gate ? lb.d.gate() : Infinity;
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    const wx = WX(gx * G), wz = WZ(gy * G); let D = Math.hypot(wx - ship.pos.x, wz - ship.pos.z) - 115;
    for (const d of known) { const dd = Math.hypot(wx - d.x, wz - d.z) - d.r - 125; if (dd < D) D = dd; }
    D += (vnoise(wx / 75, wz / 75) - 0.5) * 70;
    if (gate !== Infinity) D = Math.max(D, Math.hypot(wx, wz) - gate + 6);
    seen[gy * gw + gx] = D;
  }
  const seenAt = (x, y) => { const fx = x / G, fy = y / G, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, i = iy * gw + ix; return (seen[i] * (1 - tx) + seen[i + 1] * tx) * (1 - ty) + (seen[i + gw] * (1 - tx) + seen[i + gw + 1] * tx) * ty; };

  // ---- the sheet, the paint and the land, pixel by pixel
  const img = c.createImageData(w2, h2), px = img.data, wet = new Uint8Array(N);
  const put = (i, col) => { const j = i * 4; px[j] = col[0]; px[j + 1] = col[1]; px[j + 2] = col[2]; px[j + 3] = 255; };
  const LAND = T.land;
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
    const i = y * w2 + x, wx = WX(x), wz = WZ(y), b = BAY[(y & 3) * 4 + (x & 3)] / 16, s = shore[i];
    if (s < 0) {   // land
      const o = isl[who[i]], d = o.d, ty = d.blight ? 'dark' : d.type, depth = -s / Math.max(3, o.rm);
      let col = ty === 'rocky' ? LAND.rock : ty === 'volcano' || ty === 'dark' ? LAND.dark : LAND.sand;
      const greenish = ty === 'jungle' || ty === 'treasure' || ty === 'harbour' || ty === 'mangrove';
      if (key !== 'b') {
        if (greenish && depth > 0.3 + b * 0.16) col = LAND.green;
        if (ty === 'atoll' && depth > 0.45) col = T.lagoon;
        if (ty === 'rocky' && depth > 0.4 && b > 0.5) col = LAND.sand;
        const se = (x + 0.5 - o.px) + (y + 0.5 - o.pz);   // lit from the top left: the lower right shore is in shade
        if (s > -3.2 && se > 0 && b < 0.5 && !(ty === 'atoll' && depth > 0.45)) col = LAND.shade;
      } else {
        if (ty === 'atoll' && depth > 0.45) col = T.lagoon;
        else if (ty === 'sandbar' || ty === 'atoll') { if (((x * 3 + y * 5) % 7) === 0) col = T.soft; }   // sand: dotted
        else if (o.rm > 5 && (ty === 'rocky' || ty === 'volcano' || ty === 'dark')) {   // hill hachures: short strokes running down from the crown
          const th = Math.atan2(y + 0.5 - o.pz, x + 0.5 - o.px), spoke = Math.floor(th * 7 + 40) & 1;
          if (depth > 0.18 && depth < 0.75 && spoke && ((x + y) & 1)) col = ty === 'rocky' ? T.soft : T.ink;
        }
      }
      put(i, col); continue;
    }
    const D = seenAt(x, y) + (vnoise(wx / 13, wz / 13) - 0.5) * 16;
    if (D < 0) {   // sea you have sailed
      wet[i] = 1;
      const nn = vnoise(wx / 150, wz / 150) * 0.7 + vnoise(wx / 38, wz / 38) * 0.3;
      let col = nn + (b - 0.5) * 0.4 > 0.5 ? T.sea[1] : T.sea[0];
      if (key === 'a') {
        if (D > -7 && b < 0.62) col = T.rim;                         // a wash dries darker at its edge
        if (s < 7 && b < 1 - s / 7) col = T.shoal;                   // pale shallows
        if (s >= 1 && s < 5 && ((x * 5 + y * 3) % 7 === 0)) col = T.rim;   // shoal dots hard by the shore
      } else if (key === 'b') {
        const band = s < BAND ? Math.floor(s) : -1;                   // the engraver's water lines, wider apart as they leave the shore
        if (band === 1 || band === 4 || band === 8) col = band === 8 ? ((x + y) & 1 ? T.rim : col) : T.rim;
        else if (s < 4 && ((x * 3 + y * 7) % 5 === 0)) col = T.soft;  // shoals: stipple
        else if (s > 12 && (y % 7) === 3 && h01(Math.floor(wx / 26), Math.floor(wz / 9), 3) > 0.87 && ((x >> 1) & 1)) col = T.rim;   // a few ruled wave strokes
        if (D > -3) col = (x + y) & 1 ? T.rim : col;
      } else {
        if (D > -6 && b < 0.5) col = T.rim;
        if (s < 8 && b < 1 - s / 8) col = T.rim;
        if (s < 3.4) col = T.shoal;                                   // the game's turquoise shallows, as one hard band
        if (s >= 3.4 && s < 6 && b < 0.3) col = T.shoal;
      }
      put(i, col); continue;
    }
    // bare sheet
    const pn = vnoise(wx / 95, wz / 95) * 0.65 + vnoise(wx / 21, wz / 21) * 0.35;
    let col = pn + (b - 0.5) * 0.35 > 0.52 ? T.paper[1] : T.paper[0];
    if (vnoise(wx / 6 + 31, wz / 6 - 17) > 0.86 && ((x + y) & 1)) col = T.fox;       // foxing
    if (key === 'a' && D < 9 && h01(x, y, 5) > 0.82 + D * 0.02) col = T.sea[0];      // dry brush past the edge of the wash
    const e = Math.min(x, y, w2 - 1 - x, h2 - 1 - y); if (e < 10 && b > 0.35 + e * 0.065) col = T.edge;   // the sheet is darker at its edges
    put(i, col);
  }
  // coast: one ink pixel on the land side; the engraved chart doubles it on the shaded (lower right) shore
  for (let y = 1; y < h2 - 1; y++) for (let x = 1; x < w2 - 1; x++) {
    const i = y * w2 + x; if (shore[i] >= 0) continue;
    const edge = shore[i - 1] >= 0 || shore[i + 1] >= 0 || shore[i - w2] >= 0 || shore[i + w2] >= 0;
    if (edge || (key === 'b' && (shore[i + w2 + 1] >= 0 || shore[Math.min(N - 1, i + 2 * w2 + 2)] >= 0))) put(i, T.ink);
  }
  // rhumb lines from the wind rose and its ring: principal winds, half winds and quarter winds in their own inks
  { const nodes = [[RHUMB_C[0], RHUMB_C[1], key === 'b' ? 16 : 8]];
    if (key !== 'b') for (let k = 0; k < 8; k++) nodes.push([RHUMB_C[0] + Math.sin(k * Math.PI / 4) * RHUMB_R, RHUMB_C[1] - Math.cos(k * Math.PI / 4) * RHUMB_R, 8]);
    for (const [nx, nz, cnt] of nodes) for (let k = 0; k < cnt; k++) {
      const a = (k / cnt) * Math.PI, ux = Math.sin(a), uy = -Math.cos(a), ox = X(nx), oy = Z(nz), cls = cnt === 16 ? (k % 4 === 0 ? 0 : k % 2 === 0 ? 1 : 2) : (k % 2 === 0 ? 0 : k % 4 === 1 ? 1 : 2);
      // clip the endless line to the sheet
      let t0 = -1e9, t1 = 1e9, ok = true;
      for (const [p, u, m] of [[ox, ux, w2 - 1], [oy, uy, h2 - 1]]) { if (Math.abs(u) < 1e-6) { if (p < 0 || p > m) ok = false; } else { let ta = (0 - p) / u, tb = (m - p) / u; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); } }
      if (!ok || t0 >= t1) continue;
      const step = 1 / Math.max(Math.abs(ux), Math.abs(uy));
      for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) {
        const x = Math.round(ox + ux * t), y = Math.round(oy + uy * t); if (x < 0 || y < 0 || x >= w2 || y >= h2) continue;
        const i = y * w2 + x, ph = Math.abs(Math.round(t / step)); if (shore[i] < 1.5) continue;
        if (cls === 0 ? ph % 8 === 7 : cls === 1 ? ph % 4 >= 2 : ph % 4 !== 0) continue;   // principal: nearly solid; half winds: dashed; quarter winds: dotted
        put(i, wet[i] ? T.rhSea[cls] : T.rh[cls]);
      }
    } }
  c.putImageData(img, 0, 0);

  // ---- pixel tools for everything drawn on top (no anti-aliased strokes anywhere)
  const dot = (x, y, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); };
  const INK = css(T.ink), RED = css(T.red), GOLD = css(T.gold), SOFT = css(T.soft), PENCIL = css(T.pencil);
  const groundAt = (x, y) => { x = Math.max(0, Math.min(w2 - 1, Math.round(x))); y = Math.max(0, Math.min(h2 - 1, Math.round(y))); return wet[y * w2 + x] ? css(T.sea[0]) : css(T.paper[0]); };
  /** a sprite centred on (cx, cy); `halo` leaves a little clear ground round it, the way a letterer leaves room */
  const spr = (name, cx, cy, col, halo) => {
    const m = SPR[name], w = m[0].length, x0 = Math.round(cx - w / 2), y0 = Math.round(cy - m.length / 2);
    if (halo) { c.fillStyle = halo; m.forEach((row, j) => { for (let i = 0; i < w; i++) if (row[i] === '#') c.fillRect(x0 + i - 1, y0 + j - 1, 3, 3); }); }
    c.fillStyle = col; m.forEach((row, j) => { for (let i = 0; i < w; i++) if (row[i] === '#') c.fillRect(x0 + i, y0 + j, 1, 1); });
  };
  const line = (ax, ay, bx, by, col, on = 1, off = 0) => { const len = Math.max(1, Math.round(Math.max(Math.abs(bx - ax), Math.abs(by - ay)))); c.fillStyle = col; for (let s = 0; s <= len; s++) { if (off && (s % (on + off)) >= on) continue; c.fillRect(Math.round(ax + (bx - ax) * s / len), Math.round(ay + (by - ay) * s / len), 1, 1); } };
  const ring = (cx, cy, r, col, on = 1, off = 0) => { const steps = Math.max(8, Math.round(r * 6.3)); c.fillStyle = col; for (let s = 0; s < steps; s++) { if (off && (s % (on + off)) >= on) continue; const a = (s / steps) * Math.PI * 2; c.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); } };
  const digits = (str, x, y, col) => { c.fillStyle = col; let ox = Math.round(x - (str.length * 4 - 1) / 2); for (const ch of str) { const m = DIG[+ch]; if (m) m.forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === '#') c.fillRect(ox + i, Math.round(y) + j, 1, 1); }); ox += 4; } };

  // soundings (engraved chart): small depth figures in the water you know, deeper away from the land
  if (key === 'b' && sc >= 0.45) { const gs = 62;
    for (let gz = Math.floor(WZ(0) / gs); gz <= WZ(h2) / gs; gz++) for (let gx = Math.floor(WX(0) / gs); gx <= WX(w2) / gs; gx++) {
      const h = hash2(gx, gz, 61) >>> 0; if (h % 5 > 2) continue;
      const wx = gx * gs + (h % 37), wz = gz * gs + ((h >> 6) % 37), x = Math.round(X(wx)), y = Math.round(Z(wz));
      if (x < 12 || y < 12 || x > w2 - 12 || y > h2 - 12 || !wet[y * w2 + x] || seenAt(x, y) > -22) continue;
      let near = 1e9; for (const d of known) near = Math.min(near, Math.hypot(wx - d.x, wz - d.z) - d.r);
      if (near < 16) continue;
      digits(String(Math.max(2, Math.min(96, Math.round(near / 7 + (h >> 12) % 4)))), x, y - 2, SOFT);
    } }

  // ---- what stands on the land, drawn in profile as the old charts do: trees, hills, a town
  for (const o of isl) {
    const d = o.d, rp = o.rm; if (o.ghost || rp < 7 || sc < 0.45 || d.hut) continue;
    const landCol = key === 'c' ? css(T.ink) : INK, at = (k, rr) => { const a = (hash2(d.x | 0, d.z | 0, 20 + k) % 628) / 100; return [o.px + Math.cos(a) * rp * rr, o.pz + Math.sin(a) * rp * rr * 0.8]; };
    const many = rp > 14 ? 4 : rp > 10 ? 3 : 2;
    if (d.type === 'harbour') { spr('spire', o.px + 1, o.pz - 3, landCol); spr('house', o.px - 4, o.pz, key === 'b' ? landCol : RED); if (rp > 9) spr('house', o.px + 6, o.pz + 1, key === 'b' ? landCol : RED); if (rp > 13) spr('tree', o.px - 1, o.pz + 6, landCol); }
    else if (d.type === 'jungle' || d.type === 'treasure') { for (let k = 0; k < many; k++) { const [x, y] = at(k, 0.42); spr(k % 2 ? 'palm' : 'tree', x, y, landCol); } if (d.type === 'treasure' && rp > 9) spr('hill', o.px, o.pz - 1, landCol); }
    else if (d.type === 'rocky' && key !== 'b') { spr('hill', o.px - 1, o.pz, landCol); if (rp > 11) spr('hill', o.px + 5, o.pz + 4, landCol); }
    else if (d.type === 'volcano') spr('peak', o.px, o.pz - 1, key === 'c' ? css(T.red) : landCol);
    else if (d.type === 'mangrove') for (let k = 0; k < many; k++) { const [x, y] = at(k, 0.45); spr('root', x, y, landCol); }
    else if (d.type === 'sandbar' && rp > 9) spr('palm', o.px, o.pz - 1, landCol);
  }

  // ---- currents (ridden, or seen from Wick's gallery): a feathered line of ticks with an arrow head
  { const all = state.story && state.story.lm && state.story.lm.keeper !== undefined, rode = (state.story && state.story.lanes) || {}, col = css(T.current);
    for (const L of LANES) if (all || rode[L.name]) {
      const ax = X(L.a[0]), az = Z(L.a[1]), bx = X(L.b[0]), bz = Z(L.b[1]), len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
      for (let s = 0; s < len; s += 4) for (const o of [-3, 3]) dot(ax + ux * s - uz * o, az + uz * s + ux * o, col);
      for (let k = 0; k < 5; k++) { dot(bx - ux * k - uz * k, bz - uz * k + ux * k, col); dot(bx - ux * k + uz * k, bz - uz * k - ux * k, col); }
    } }
  // ---- the course to the errand you follow: a dashed line in the errand's ink
  const tr = lb.d.track ? lb.d.track() : null;
  if (tr && show.errand) line(X(ship.pos.x), Z(ship.pos.z), X(tr.x), Z(tr.z), key === 'b' ? RED : GOLD, 4, 3);
  // lost crates: a dashed ring
  for (const qq of state.quests) if (qq.type === 'crates' && show.errand) { ring(X(qq.center.x), Z(qq.center.z), 35 * sc, key === 'b' ? RED : GOLD, 3, 3); spr('crate', X(qq.center.x), Z(qq.center.z), INK, groundAt(X(qq.center.x), Z(qq.center.z))); }
  // pencil guesses (the riddle board)
  for (const g of (state.board && state.board.guess) || []) ring(X(g.x), Z(g.z), 13, PENCIL, 2, 2);
  // pencil marks the world has taught (clues.js capabilities)
  if (isKnown(state, 'wreckticks')) for (const k of ['ribs', 'wreck']) { const l = LM[k], x = Math.round(X(l.x)), z = Math.round(Z(l.z)); for (let i = -2; i <= 2; i++) { dot(x + i, z + i - 7, PENCIL); dot(x + i, z - i - 7, PENCIL); } }
  if (isKnown(state, 'cupmark')) { const l = LM.cup, x = Math.round(X(l.x)) + 6, z = Math.round(Z(l.z)) - 8; ['#.#', '#.#', '##.', '#.#', '#.#'].forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === '#') dot(x + i, z + j, PENCIL); }); }

  // ---- one marker language: anchor = harbour, cross = treasure, question mark = hearsay, pennant = errand, ringed cross = your pin
  const labels = [];
  for (const o of isl) {
    const d = o.d, ix = o.px, iz = o.pz, rpx = Math.max(5, shoreR(d, Math.PI / 2) * k2), rl = Math.max(5, shoreR(d, Math.PI) * k2);
    if (d.type === 'harbour' && show.harbour) spr('anchor', ix - rl - 8, iz + 2, key === 'c' ? GOLD : INK, groundAt(ix - rl - 8, iz + 2));
    if (d.type === 'treasure' && !state.dug.has(d.id) && show.treasure && state.goals && state.goals.i >= 2) spr('cross', ix + rpx + 5, iz - rpx - 3, RED, groundAt(ix + rpx + 5, iz - rpx - 3));
    if (d.type === 'harbour' && hasLighthouse(d) && sc >= 0.55) { const lx = ix + Math.max(5, shoreR(d, 0) * k2) + 4; spr('light', lx, iz - 4, INK, groundAt(lx, iz - 4)); dot(lx - 0.5, iz - 7, GOLD === INK ? RED : GOLD); }
    if (d.hut && state.story && state.story.hutKnown) { const hx = Math.round(ix + 3), hz = Math.round(iz - 3); c.fillStyle = '#120c0e'; c.fillRect(hx - 4, hz - 2, 8, 6); for (let k = 0; k < 7; k++) c.fillRect(hx - 6 + k, hz - 3 - k, 13 - Math.round(k * 1.9), 1); c.fillRect(hx + 2, hz - 10, 3, 1); c.fillStyle = '#c030a0'; c.fillRect(hx + 1, hz, 2, 2); }
    const big = d.type === 'harbour';
    if (big || (show.names && sc >= 0.5)) labels.push({ t: o.name, x: ix * 2, y: (iz + rpx) * 2 + (big ? 20 : 14), big, gx: ix, gy: iz + rpx + 8 });
  }
  for (const r of Object.values(state.rumoured)) if (!r.found && show.rumour) spr('query', X(r.x) - 9, Z(r.z) - 9, RED, groundAt(X(r.x) - 9, Z(r.z) - 9));
  const flag = (x, y) => { const g = groundAt(x, y); spr('flag', x, y, INK, g); c.fillStyle = key === 'b' ? RED : GOLD; c.fillRect(Math.round(x - 3) + 1, Math.round(y - 4) + 1, 4, 3); };
  if (state.job && show.errand) flag(X(state.job.x) + 10, Z(state.job.z) - 10);
  if (state.passenger && show.errand) flag(X(state.passenger.x) + 10, Z(state.passenger.z) - 10);
  for (const qq of ((state.story && state.story.pins) || [])) if (show.note) spr('pin', X(qq.x), Z(qq.z), qq.on ? PENCIL : SOFT, groundAt(X(qq.x), Z(qq.z)));

  // ---- your ship: a red arrow on her heading inside a ring, with clear ground round it (drawn last, above the lettering)
  const drawShip = (cx, m) => { const sx = Math.round(X(ship.pos.x)), sz = Math.round(Z(ship.pos.z)), h = ship.heading, fx = Math.sin(h), fy = -Math.cos(h), g = groundAt(sx, sz), edge = key === 'c' ? '#f4ead0' : INK;
    const R = (x, y, w, hh, col) => { cx.fillStyle = col; cx.fillRect(x * m, y * m, w * m, hh * m); };
    for (const [r, col] of [[12, g], [10, g], [11, edge]]) { const steps = Math.round(r * 6.3); for (let s2 = 0; s2 < steps; s2++) { const a = (s2 / steps) * Math.PI * 2; R(Math.round(sx + Math.cos(a) * r), Math.round(sz + Math.sin(a) * r), 1, 1, col); } }
    const cells = []; for (let t = -5; t <= 8; t += 0.5) { const wd = (8 - t) * 0.34; for (let u = -wd; u <= wd; u += 0.5) if (!(t < -2.5 && Math.abs(u) < (-2.5 - t) * 1.1)) cells.push([Math.round(sx + fx * t - fy * u), Math.round(sz + fy * t + fx * u), t]); }
    for (const [x, y] of cells) R(x - 1, y - 1, 3, 3, key === 'c' ? css(T.ink) : INK);
    for (const [x, y, t] of cells) R(x, y, 1, 1, key === 'c' ? (t > 3 ? RED : '#f4ead0') : RED); };

  // ---- the wind rose, bottom left: an eight-point star, dark and light halves, a fleur-de-lis for north
  { const cx = 27, cz = h2 - 30, R = 15, ground = css(T.paper[0]), lite = key === 'c' ? css(T.gold) : css(T.paper[0]), dark = key === 'c' ? css([120, 96, 48]) : INK, edge = key === 'c' ? css(T.soft) : INK;
    for (let y = -R - 3; y <= R + 3; y++) for (let x = -R - 3; x <= R + 3; x++) { const d2 = x * x + y * y; if (d2 <= (R + 3) * (R + 3)) { c.fillStyle = ground; c.fillRect(cx + x, cz + y, 1, 1); } }
    ring(cx, cz, R + 3, edge); ring(cx, cz, R + 1, edge, 1, 2);
    const ray = (a, len, wid, red) => { const ux = Math.sin(a), uy = -Math.cos(a); for (let t = 0; t <= len; t += 0.5) { const wd = wid * (1 - t / len); for (let u = -wd; u <= wd; u += 0.5) { const x = Math.round(cx + ux * t - uy * u), y = Math.round(cz + uy * t + ux * u), onEdge = Math.abs(u) > wd - 0.6 || t > len - 1; c.fillStyle = onEdge ? edge : u < 0 ? (red ? RED : dark) : lite; c.fillRect(x, y, 1, 1); } } };
    for (let k = 0; k < 4; k++) ray(Math.PI / 4 + k * Math.PI / 2, R * 0.62, 2.2, false);
    for (let k = 0; k < 4; k++) ray(k * Math.PI / 2, R, 3, key !== 'b' && k === 0);
    spr('fleur', cx + 0.5, cz - R - 7, key === 'c' ? GOLD : key === 'b' ? INK : RED, ground); }
  if (warp && warp.since > 2.5 && BAY[0] / 16 < 1) { const a = Math.min(0.75, (warp.since - 2.5) / 3); c.fillStyle = '#7a1a3a'; for (let s = 0; s < 140; s++) { if ((s % 4) / 4 >= a) continue; const th = (s / 140) * Math.PI * 2, x = Math.round(X(ship.pos.x) + Math.cos(th) * 22), y = Math.round(Z(ship.pos.z) + Math.sin(th) * 10); c.fillRect(x, y, 2, 2); } }

  // ---- the cartouche, top left: the name of these waters and a scale of fathoms
  const [sx0, sz0] = sectorCoord(ship.pos.x, ship.pos.z), waters = sectorInfo(sx0, sz0, seed).name;
  const unit = [20, 50, 100, 200, 500, 1000, 2000].find((u) => u * k2 >= 34) || 2000, barW = Math.round(unit * k2);
  const CW = Math.max(118, barW + 26), CH = 44, CX = 7, CY = 7;
  { const ground = css(T.paper[0]), edge = key === 'c' ? css(T.soft) : INK;
    c.fillStyle = key === 'c' ? css(T.ink) : css(T.soft); c.fillRect(CX + 2, CY + 2, CW, CH);                // a hard shadow
    c.fillStyle = ground; c.fillRect(CX, CY, CW, CH);
    c.fillStyle = edge; c.fillRect(CX, CY, CW, 1); c.fillRect(CX, CY + CH - 1, CW, 1); c.fillRect(CX, CY, 1, CH); c.fillRect(CX + CW - 1, CY, 1, CH);
    c.fillRect(CX + 2, CY + 2, CW - 4, 1); c.fillRect(CX + 2, CY + CH - 3, CW - 4, 1); c.fillRect(CX + 2, CY + 2, 1, CH - 4); c.fillRect(CX + CW - 3, CY + 2, 1, CH - 4);
    for (const [qx, qy] of [[CX, CY], [CX + CW - 3, CY], [CX, CY + CH - 3], [CX + CW - 3, CY + CH - 3]]) { c.fillStyle = key === 'b' ? INK : key === 'c' ? GOLD : RED; c.fillRect(qx, qy, 3, 3); }   // corner studs
    if (key === 'b') for (let x = CX + 6; x < CX + CW - 6; x += 2) dot(x, CY + 21, INK);                         // a dotted rule under the name
    else line(CX + 10, CY + 21, CX + CW - 11, CY + 21, key === 'c' ? css(T.soft) : RED);
    // scale bar: four parts, dark and light in turn, feet at the ends
    const bx = CX + Math.round((CW - barW) / 2), by = CY + 26;
    c.fillStyle = edge; c.fillRect(bx, by, barW + 1, 4);
    for (let k = 0; k < 4; k++) if (k % 2) { c.fillStyle = ground; c.fillRect(bx + 1 + Math.round(barW * k / 4), by + 1, Math.round(barW / 4) - 1, 2); }
    c.fillStyle = edge; c.fillRect(bx, by - 2, 1, 7); c.fillRect(bx + barW, by - 2, 1, 7); }
  // ---- the neatline: a double rule; the engraved chart has a graduated border, dark and light in turn
  { const edge = key === 'c' ? css(T.soft) : INK; c.fillStyle = edge;
    c.fillRect(0, 0, w2, 2); c.fillRect(0, h2 - 2, w2, 2); c.fillRect(0, 0, 2, h2); c.fillRect(w2 - 2, 0, 2, h2);
    if (key === 'b') { c.fillStyle = css(T.paper[0]); c.fillRect(2, 2, w2 - 4, 2); c.fillRect(2, h2 - 4, w2 - 4, 2); c.fillRect(2, 2, 2, h2 - 4); c.fillRect(w2 - 4, 2, 2, h2 - 4);
      c.fillStyle = INK; const st = Math.max(6, Math.round(50 * k2)), offx = Math.round(X(0)) % (st * 2), offy = Math.round(Z(0)) % (st * 2);
      for (let x = offx - st * 2; x < w2; x += st * 2) { c.fillRect(Math.max(2, x), 2, Math.min(st, w2 - 2 - x), 2); c.fillRect(Math.max(2, x), h2 - 4, Math.min(st, w2 - 2 - x), 2); }
      for (let y = offy - st * 2; y < h2; y += st * 2) { c.fillRect(2, Math.max(2, y), 2, Math.min(st, h2 - 2 - y)); c.fillRect(w2 - 4, Math.max(2, y), 2, Math.min(st, h2 - 2 - y)); }
      c.fillRect(4, 4, w2 - 8, 1); c.fillRect(4, h2 - 5, w2 - 8, 1); c.fillRect(4, 4, 1, h2 - 8); c.fillRect(w2 - 5, 4, 1, h2 - 8);
    } else { c.fillRect(3, 3, w2 - 6, 1); c.fillRect(3, h2 - 4, w2 - 6, 1); c.fillRect(3, 3, 1, h2 - 6); c.fillRect(w2 - 4, 3, 1, h2 - 6); } }

  // ---- lettering on the full-resolution layer, cut hard: harbours in the display face (red ink on paper), isles in the text face
  if (isKnown(state, 'date')) labels.push({ t: `Day ${Math.round((state.dayN || 0) + 30)}`, x: W - 70, y: H - 24, big: false, soft: true });   // a date in the margin, in a hand that is not yours
  const tc = document.getElementById('mapTxt'), t = tc && tc.getContext('2d');
  if (t) {
    t.clearRect(0, 0, W, H); t.textAlign = 'center'; t.textBaseline = 'middle'; t.lineJoin = 'round';
    const write = (str, x, y, font, col, halo) => { t.font = font; if (halo) { t.lineWidth = 5; t.strokeStyle = halo; t.strokeText(str, Math.round(x), Math.round(y)); } t.fillStyle = col; t.fillText(str, Math.round(x), Math.round(y)); };
    const dfont = (px) => `400 ${px}px ${FONTS.disp}`, bfont = `400 ${FONTS.bpx}px ${FONTS.body}`;
    for (const L of labels) write(L.t, L.x, L.y, L.big ? dfont(FONTS.dpx) : bfont, L.big ? T.txtRed : L.soft ? T.txtSoft : T.txt, T.halo || (L.gx !== undefined ? groundAt(L.gx, L.gy) : null));
    // the cartouche: fit the name of the waters between its rules
    { let px = FONTS.dbig; t.font = dfont(px); while (px > 14 && t.measureText(waters).width > CW * 2 - 20) { px -= 2; t.font = dfont(px); }
      write(waters, (CX + CW / 2) * 2, (CY + 12) * 2, dfont(px), T.txt, null);
      write(`${unit} fathoms`, (CX + CW / 2) * 2, (CY + 37) * 2 - 1, bfont, T.txtSoft, null); }
    if (warp && warp.since > 2.5) { t.globalAlpha = 1; write('TURN BACK', X(ship.pos.x) * 2, Z(ship.pos.z) * 2 - 60, `400 32px ${FONTS.body}`, '#7a1a3a', null); }
    // cut the letters hard (no soft edges): the same idea as the #crisp filter
    const ti = t.getImageData(0, 0, W, H), td = ti.data;
    for (let i = 3; i < td.length; i += 4) td[i] = td[i] > 120 ? 255 : 0;
    t.putImageData(ti, 0, 0);
    drawShip(t, 2);
  } else drawShip(c, 1);
  if (warp && !lb.warpRaf) lb.warpRaf = requestAnimationFrame(() => { lb.warpRaf = 0; if (lb.tab === 'map' && document.getElementById('chart').classList.contains('open')) drawVariant(lb, key); });
}
