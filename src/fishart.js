// Pixel portraits of every fish you can catch (2026-11-13, owner), for the catch book in the Ship's book (logbook.js).
// Detailed but cartoony: a 72x36 picture per species, painted in code like everything else (no image files): a body outline from
// a profile, shading from a dark back to a pale belly (ordered dither between bands), fins with rays, the species' tail and pattern,
// a dark outline, a big cartoon eye with a highlight, and one or two touches of its own (the swordfish's bill, the angler's lure).
// The dark ones are the wrong side of the sea: the glass eel has something inside it, the pike has too many eyes, the key is a key.
const W = 72, H = 36;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hx = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mixc = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));

// ---- the species. len/h: body length and half height; peak: where it is deepest (0 tail .. 1 nose); nose: how blunt the head is;
// cols: back, side, belly, fin; tail: fork | lunate | round | fan | none; dorsal: [from, to, height]; pattern; eye: [t, size]
const SPEC = {
  sardine:   { len: 46, h: 6,  peak: 0.6, nose: 0.5, cols: ['#2c5d8a', '#9fc4d8', '#eef6f8', '#7aa0b8'], tail: 'fork', dorsal: [0.45, 0.6, 5], pattern: 'dots', eye: [0.88, 2.2], iris: '#e8e0c0' },
  snapper:   { len: 44, h: 11, peak: 0.6, nose: 0.6, cols: ['#b8202a', '#ea5a4a', '#ffc0b0', '#d83a3a'], tail: 'fork', dorsal: [0.25, 0.78, 7, 'spiky'], pattern: 'scales', eye: [0.84, 3], lips: true, iris: '#f0c040' },
  mahi:      { len: 50, h: 10, peak: 0.78, nose: 1.0, cols: ['#2a8a4a', '#b8d83a', '#ffe060', '#3a7ad8'], tail: 'fork', dorsal: [0.12, 0.95, 5], pattern: 'bluedots', eye: [0.9, 2.4], iris: '#d8b040', scale: 0.5 },
  tuna:      { len: 52, h: 9,  peak: 0.55, nose: 0.55, cols: ['#1a2a5a', '#5a7aa8', '#e8eef4', '#24345e'], tail: 'lunate', dorsal: [0.5, 0.66, 6], pattern: 'finlets', eye: [0.86, 2.6], iris: '#c8c8a0', scale: 0.4 },
  sword:     { len: 46, h: 8,  peak: 0.62, nose: 0.6, cols: ['#3a2a5a', '#8a7aa8', '#e4e0ec', '#4a3a6a'], tail: 'lunate', dorsal: [0.58, 0.78, 11], pattern: null, eye: [0.84, 2.6], bill: 18, iris: '#b8a8c8', scale: 0.3 },
  grouper:   { len: 46, h: 12, peak: 0.55, nose: 0.8, cols: ['#a86a10', '#f0b830', '#ffe8a0', '#c88a20'], tail: 'round', dorsal: [0.25, 0.75, 6, 'spiky'], pattern: 'spots', eye: [0.82, 2.6], lips: true, big: true, iris: '#e8a020' },
  cuttle:    { cuttle: true, len: 40, h: 10, cols: ['#6a3a5a', '#b87a8a', '#f0d0c8', '#e8c8b8'], eye: [0.74, 3] },
  barracuda: { len: 58, h: 6,  peak: 0.5, nose: 0.35, cols: ['#3a4a5a', '#a8b8c0', '#f0f4f4', '#5a6a78'], tail: 'fork', dorsal: [0.42, 0.55, 5], pattern: 'bars', eye: [0.86, 2.4], teeth: true, iris: '#e8e8d0' },
  bream:     { len: 40, h: 11, peak: 0.6, nose: 0.75, cols: ['#4a6a7a', '#b8ccd4', '#f4f8f8', '#6a8494'], tail: 'fork', dorsal: [0.25, 0.75, 5, 'spiky'], pattern: 'gilt', eye: [0.82, 3], iris: '#f0d060' },
  moonfish:  { len: 38, h: 15, peak: 0.55, nose: 0.85, cols: ['#a83a5a', '#e88a98', '#f8d8dc', '#e8402a'], tail: 'lunate', dorsal: [0.4, 0.85, 9], pattern: 'whitespots', eye: [0.82, 3.2], tailK: 0.7, iris: '#f0b040', scale: 0.4 },
  // the dark ones (only ever drawn once caught)
  lantern:   { len: 34, h: 9,  peak: 0.62, nose: 0.85, cols: ['#8aa0b0', '#d8e4ea', '#f6fafc', '#b8c8d4'], tail: 'fork', dorsal: [0.45, 0.62, 4], pattern: 'photophores', eye: [0.8, 4.2], pale: true, scale: 0.5 },
  eel:       { len: 64, h: 4.5, peak: 0.5, nose: 0.4, cols: ['#7ac8d0', '#bfeef0', '#e8ffff', '#9adce4'], tail: 'none', dorsal: [0.05, 0.75, 2], pattern: 'glass', eye: [0.94, 1.8], glass: true },
  pike:      { len: 56, h: 7,  peak: 0.45, nose: 0.35, cols: ['#3a4a1a', '#7a8a3a', '#d8d8a0', '#5a6a2a'], tail: 'fork', dorsal: [0.15, 0.28, 6], pattern: 'eyes', eye: [0.86, 2.4], teeth: true, iris: '#d8c040' },
  key:       { key: true, len: 52, h: 5, cols: ['#8a6a1a', '#d8b040', '#ffe88a', '#a8842a'], eye: [0.9, 2.2] },
  angler:    { len: 40, h: 13, peak: 0.7, nose: 1.0, cols: ['#1a1418', '#3a2a2e', '#5a4a48', '#2a2024'], tail: 'round', dorsal: [0.3, 0.55, 4], pattern: 'barnacles', eye: [0.78, 1.4], angler: true },
  bright:    { len: 42, h: 11, peak: 0.6, nose: 0.7, cols: ['#8a1aff', '#e050ff', '#ffb0ff', '#c030ff'], tail: 'fork', dorsal: [0.25, 0.75, 6], pattern: null, eye: [0.82, 2.8], neon: true, scale: 0.6 },
};

function paint(id) {
  const S = SPEC[id]; if (!S) return null;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), img = g.createImageData(W, H), d = img.data;
  const A = new Float32Array(W * H);                       // alpha (0..1) of each pixel we paint
  const col = new Array(W * H).fill(null);
  const set = (x, y, c, a = 1) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; col[i] = typeof c === 'string' ? hx(c) : c; A[i] = a; };
  const [back, side, belly, fin] = S.cols.map(hx);
  const cy = H / 2 + (S.angler ? 2 : 0), x0 = Math.round((W - S.len - (S.bill || 0)) / 2) + 4, x1 = x0 + S.len;   // tail end .. nose
  const dith = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;
  const shade = (v, x, y) => {   // v 0 (top of the body) .. 1 (belly): back, side, belly in dithered bands, a highlight on top
    const b1 = 0.38 + (dith(x, y) - 0.5) * 0.18, b2 = 0.7 + (dith(x, y) - 0.5) * 0.18;
    return v < b1 ? mixc(back, side, v / b1 * 0.35) : v < b2 ? side : mixc(side, belly, Math.min(1, (v - b2) / 0.2 + 0.4));
  };

  if (S.cuttle) {   // a mantle with a frilled fin all round, a W-shaped pupil, arms at the front, zebra stripes on the back
    const rx = S.len / 2, cx = x0 + rx;
    for (let x = x0 - 3; x <= x0 + S.len; x++) for (let y = 0; y < H; y++) {
      const u = (x - cx) / rx, v = (y - cy) / S.h; const r = u * u + v * v;
      if (r < 1) { const t = (y - (cy - S.h)) / (2 * S.h); let c = shade(t, x, y); if (t < 0.45 && ((x + Math.round(Math.sin(y * 0.9) * 2)) % 5 === 0)) c = mixc(c, [40, 20, 40], 0.6); set(x, y, c); }
      else if (r < 1.32 && Math.abs(v) > 0.2) set(x, y, mixc(fin, [255, 255, 255], ((x + y) % 3 === 0) ? 0.35 : 0), 0.95);   // the frill
    }
    for (let k = 0; k < 6; k++) { const yy = cy - 4 + k * 1.6, len = 9 + (k % 3) * 3; for (let i = 0; i < len; i++) set(x0 + S.len + i, yy + Math.sin(i * 0.5 + k) * 1.2 + (k - 2.5) * i * 0.08, mixc(side, belly, 0.4)); }
    paintOutline(); eye(x0 + S.len * S.eye[0], cy - 3, S.eye[1], 'w'); return finish();
  }
  if (S.key) {   // a key: a ring at the tail with a hole, a long shaft, the bit hanging down as fins, a fish's face at the end
    const ringX = x0 + 7;
    for (let x = x0; x <= x1; x++) for (let y = 0; y < H; y++) {
      const rr = Math.hypot(x - ringX, y - cy);
      if (rr < 8 && rr > 3.5) set(x, y, shade((y - cy + 8) / 16, x, y));
      if (x > ringX + 6 && x < x1 && Math.abs(y - cy) <= 2.5) set(x, y, shade((y - cy + 2.5) / 5, x, y));
    }
    for (const [bx, bh] of [[x1 - 16, 6], [x1 - 11, 4], [x1 - 6, 7]]) for (let y = cy + 2; y < cy + 2 + bh; y++) for (let x = bx; x < bx + 3; x++) set(x, y, shade(0.6, x, y));   // the bit
    for (let x = x1; x < x1 + 5; x++) for (let y = cy - 3; y <= cy + 3; y++) if (Math.abs(y - cy) <= 3 - (x - x1) * 0.6) set(x, y, shade((y - cy + 3) / 6, x, y));   // its head
    paintOutline(); eye(x1 - 1, cy - 1, S.eye[1], 'w'); set(x1 + 3, cy + 1, '#3a2a10'); return finish();
  }

  // ---- an ordinary (or nearly ordinary) fish
  const prof = (t) => {   // half height at t (0 tail end, 1 nose)
    const pk = S.peak, tt = t < pk ? 0.5 * t / pk : 0.5 + 0.5 * (t - pk) / (1 - pk);
    let h = Math.pow(Math.sin(Math.PI * tt), S.h > 9 ? 0.5 : 0.75) * S.h;   // deep-bodied fish are rounder
    if (t > pk) h *= 1 - Math.pow((t - pk) / (1 - pk), 2.5) * (1 - S.nose * 0.55);   // a blunt head keeps its height
    return Math.max(h, t < 0.12 ? S.h * 0.18 : 0);           // the wrist before the tail
  };
  const topOf = (t) => cy - prof(t) * (S.angler ? 0.8 : 1), botOf = (t) => cy + prof(t) * (S.big || S.angler ? 1.15 : 1);
  // tail (behind the body)
  const tx = x0, th = S.h * (S.tail === 'lunate' ? 1.25 : 1.05);
  const tailPx = (x, y) => {
    const u = (tx - x) / ((S.tail === 'lunate' ? 9 : 8) * (S.tailK || 1)), v = (y - cy) / (th * (S.tailK || 1));   // u 0 at the wrist .. 1 at the tip
    if (u < 0 || u > 1.05) return false;
    if (S.tail === 'fork') return Math.abs(v) < 0.25 + u * 0.75 && Math.abs(v) > u * 0.55 - 0.12;
    if (S.tail === 'lunate') return Math.abs(v) < 0.2 + u * 0.9 && Math.abs(v) > Math.pow(u, 1.6) * 0.75 - 0.05;
    if (S.tail === 'round' || S.tail === 'fan') return u * u + v * v * 0.9 < 0.8;
    return false;
  };
  for (let x = tx - 10; x <= tx + 1; x++) for (let y = 0; y < H; y++) if (S.tail !== 'none' && tailPx(x, y)) {   // rays fanning out, the tips lighter and thinner
    const u = (tx - x) / 9, ray = (Math.round((y - cy) * (1 - u * 0.35)) & 1) === 0;
    set(x, y, mixc(mixc(fin, [0, 0, 0], ray ? 0.22 : 0), [255, 255, 255], u > 0.7 ? 0.28 : 0), S.glass ? 0.6 : u > 0.8 ? 0.85 : 1); }
  // dorsal fin
  if (S.dorsal) { const [a, b, hh, spiky] = S.dorsal;
    for (let x = x0 + a * S.len; x <= x0 + b * S.len; x++) { const t = (x - x0) / S.len, k = (t - a) / (b - a), top = topOf(t);
      let fh = hh * (S.sword || id === 'sword' ? Math.sin(k * Math.PI) : Math.min(1, k * 3) * (1 - k * 0.45)); if (spiky && (Math.round(x) % 3 === 0)) fh += 1.5;
      for (let y = top - fh; y < top + 1; y++) { const tip = (top - y) / Math.max(1, fh); set(x, y, mixc(mixc(fin, [0, 0, 0], Math.round(x) % 2 === 0 ? 0.25 : 0), [255, 255, 255], tip > 0.7 ? 0.3 : 0), S.glass ? 0.6 : tip > 0.8 ? 0.85 : 1); } } }
  // belly fins (pectoral and anal)
  { const pt = 0.7, px = x0 + pt * S.len, pb = botOf(pt);
    for (let i = 0; i < 7; i++) for (let j = 0; j <= i * 0.6; j++) set(px - i, pb - 1 + j, mixc(fin, i % 2 ? [0, 0, 0] : [255, 255, 255], i % 2 ? 0.2 : (i > 4 ? 0.25 : 0)), S.glass ? 0.6 : 1);
    const at = 0.28, ax = x0 + at * S.len, ab = botOf(at);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3 - i * 0.4; j++) set(ax - i * 0.8, ab + j, fin, S.glass ? 0.6 : 1); }
  // body
  for (let x = x0; x <= x1; x++) { const t = (x - x0) / S.len, top = topOf(t), bot = botOf(t);
    for (let y = Math.ceil(top); y <= Math.floor(bot); y++) { const v = (y - top) / Math.max(1, bot - top); let c = shade(v, x, y); if (y === Math.floor(bot) && !S.angler) c = mixc(c, [255, 255, 255], 0.22); set(x, y, c, S.glass ? 0.55 : 1); } }
  // patterns
  const onBody = (x, y) => { const t = (x - x0) / S.len; return t >= 0 && t <= 1 && y > topOf(t) + 0.5 && y < botOf(t) - 0.5; };
  const gillT = S.eye[0] - 0.12;
  if (S.scale !== 0 && !S.glass && !S.angler) {   // scales: offset rows of small crescents, a dark edge and a lit one, behind the gill only
    const k = S.scale || 1;
    for (let y = 0; y < H; y++) for (let x = x0 + 4; x < x0 + S.len * gillT - 1; x++) {
      if (!onBody(x, y)) continue; const i = y * W + x, c = col[i]; if (!c) continue;
      const m = (x + ((y >> 1) & 1) * 2) % 4;
      if ((y & 1) === 0 && m === 0) col[i] = mixc(c, [0, 0, 0], 0.16 * k);
      else if ((y & 1) === 1 && m === 1) col[i] = mixc(c, [255, 255, 255], 0.12 * k);
    }
  }
  if (!S.angler) for (let x = x0 + 5; x < x0 + S.len * gillT; x += 2) {   // the lateral line, from the gill to the tail
    const t = (x - x0) / S.len, y = Math.round(topOf(t) + (botOf(t) - topOf(t)) * 0.36 + Math.sin(t * 5) * 0.4), i = y * W + x;
    if (onBody(x, y) && col[i]) col[i] = mixc(col[i], S.glass ? [40, 90, 100] : [255, 255, 255], 0.35);
  }
  const dot = (x, y, c, r = 1) => { for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (a * a + b * b <= r * r + 0.3 && onBody(x + a, y + b)) set(x + a, y + b, c, S.glass ? 0.7 : 1); };
  switch (S.pattern) {
    case 'dots': for (let i = 0; i < 6; i++) dot(x0 + S.len * (0.52 + i * 0.05), cy - 1, '#1a3a5a', 0.6); break;
    case 'scales': for (let x = x0 + 6; x < x1 - 8; x++) for (let y = 0; y < H; y++) if (onBody(x, y) && (x + y) % 5 === 0 && y > cy) set(x, y, mixc(side, [255, 220, 180], 0.3)); break;   // a pale sheen low on the flank
    case 'bluedots': for (let i = 0; i < 10; i++) dot(x0 + S.len * (0.2 + (i * 0.073) % 0.62), cy - 2 + ((i * 5) % 7), '#3a7ad8', 0.6); break;
    case 'finlets': for (let i = 0; i < 5; i++) { const x = x0 + S.len * (0.12 + i * 0.065); set(x, topOf((x - x0) / S.len) - 1, '#ffd23a'); set(x, botOf((x - x0) / S.len) + 1, '#ffd23a'); } for (let x = x0 + 10; x < x1 - 10; x++) set(x, cy, mixc(side, [255, 255, 255], 0.35)); break;
    case 'spots': for (let i = 0; i < 14; i++) dot(x0 + S.len * (0.15 + (i * 0.137) % 0.7), cy - 7 + ((i * 7) % 14), '#8a4a08', 0.7); break;
    case 'bars': for (let k = 0; k < 9; k++) { const x = x0 + S.len * (0.18 + k * 0.075); for (let y = cy - 5; y < cy; y++) if (onBody(x, y)) set(x, y, mixc(back, [0, 0, 0], 0.2)); } break;
    case 'gilt': { const exg = Math.round(x0 + S.len * S.eye[0]), eyg = Math.round(cy - prof(S.eye[0]) * 0.32); for (let x = exg - 3; x <= exg + 2; x++) for (let y = eyg - 4; y <= eyg - 3; y++) if (onBody(x, y)) set(x, y, x === exg - 3 || x === exg + 2 ? '#c8962a' : '#f2c43a'); } for (let x = x0 + 6; x < x1 - 8; x += 3) for (let y = cy - 6; y < cy + 6; y += 3) if (onBody(x, y)) set(x, y, mixc(side, back, 0.25)); break;   // the gold brow above the eye, a faint grid of scales
    case 'whitespots': for (let i = 0; i < 16; i++) dot(x0 + S.len * (0.18 + (i * 0.131) % 0.68), cy - 11 + ((i * 9) % 22), '#ffffff', 0.6); break;
    case 'photophores': for (let i = 0; i < 9; i++) { const x = x0 + S.len * (0.2 + i * 0.07); set(x, botOf((x - x0) / S.len) - 1.5, '#e8ff60'); } break;
    case 'glass': for (let x = x0 + 2; x < x1 - 4; x++) set(x, cy + Math.sin(x * 0.35) * 0.4, '#5a9aa0', 0.9);   // the spine, seen through it
      for (let a = 0; a < 7; a++) set(x0 + S.len * 0.46 + Math.cos(a) * 1.6, cy + 0.5 + Math.sin(a) * 1.6, '#e8c040');   // and something in it: a ring
      break;
    case 'eyes': for (let i = 0; i < 6; i++) { const x = x0 + S.len * (0.3 + i * 0.08), y = cy - 2 + (i % 2) * 3; eye(x, y, 1.9, 'y'); } break;
    case 'barnacles': for (let i = 0; i < 12; i++) dot(x0 + S.len * (0.12 + (i * 0.17) % 0.6), cy - 9 + ((i * 7) % 15), i % 3 ? '#b8b0a0' : '#4a6a3a', 0.6); break;
  }
  // the head: a gill line, the mouth, and the species' own touches
  { const gx = x0 + S.len * gillT, gt = (gx - x0) / S.len;   // the gill cover: a dark curve, a lit rim just behind it, the plate a shade darker
    for (let y = Math.ceil(topOf(gt)) + 2; y < botOf(gt) - 1; y++) { const cx2 = gx + Math.sin((y - cy) * 0.3) * 1.2;
      set(cx2, y, mixc(side, back, 0.6), S.glass ? 0.6 : 1); if (onBody(cx2 - 1, y)) set(cx2 - 1, y, mixc(col[y * W + Math.round(cx2 - 1)] || side, [255, 255, 255], 0.25), S.glass ? 0.6 : 1);
      for (let x = Math.round(cx2) + 1; x < x0 + S.len * (S.eye[0] - 0.03); x++) if (onBody(x, y) && (x + y) % 2 === 0) col[y * W + x] = mixc(col[y * W + x] || side, [0, 0, 0], 0.08); } }
  const my = cy + prof(0.97) * 0.35 + (S.angler ? 2 : 0);
  if (S.bill) for (let i = 0; i < S.bill; i++) { set(x1 + i, cy - 1 + i * 0.03, '#4a3a5a'); if (i < S.bill - 4) set(x1 + i, cy, '#8a7aa8'); }
  if (S.angler) {   // a huge jaw with crooked teeth, and the lure on its stalk, glowing
    for (let x = x1 - 9; x <= x1 + 1; x++) set(x, my, '#000000');
    for (let k = 0; k < 6; k++) { const x = x1 - 8 + k * 1.7; set(x, my - 1, '#f0ece0'); set(x + 0.8, my + 1, '#f0ece0'); if (k % 2) set(x, my - 2, '#f0ece0'); }
    const sx = x1 - 12, sy = topOf((sx - x0) / S.len); for (let i = 0; i < 12; i++) set(sx + i * 0.9, sy - Math.sin(i / 11 * Math.PI) * 7 - i * 0.2, '#3a2a2e');
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) set(sx + 11.5 + a, sy - 3 + b, a || b ? '#a8ff70' : '#ffffff');
  } else {   // the mouth: a short line turning down at the corner, a lit lip above it, a nostril ahead of the eye
    const mc = mixc(back, [0, 0, 0], 0.65); set(x1, my, mc); set(x1 - 1, my, mc); set(x1 - 2, my + 0.6, mc); set(x1 - 3, my + 1, mc);
    set(x1 - 1, my - 1, mixc(side, [255, 255, 255], 0.3));
    set(x0 + S.len * Math.min(0.97, S.eye[0] + 0.07), cy - prof(S.eye[0]) * 0.4, mixc(back, [0, 0, 0], 0.5));
  }
  if (S.teeth) { set(x1, my + 1, '#ffffff'); set(x1 - 2, my + 1, '#ffffff'); }
  if (S.lips) { set(x1, my - 1, mixc(back, [255, 200, 200], 0.4)); set(x1, my + 1, mixc(back, [255, 200, 200], 0.4)); }
  paintOutline();
  // highlight along the back, and a shine
  for (let x = x0 + 4; x < x1 - 3; x++) { const t = (x - x0) / S.len, y = Math.ceil(topOf(t)) + 1; if (A[y * W + Math.round(x)] > 0.5 && x % 2 === 0) set(x, y, mixc(col[y * W + Math.round(x)] || side, [255, 255, 255], S.glass ? 0.5 : 0.3), A[y * W + Math.round(x)]); }
  eye(x0 + S.len * S.eye[0], cy - prof(S.eye[0]) * 0.32 - (S.angler ? 1 : 0), S.eye[1], S.pale ? 'pale' : S.neon ? 'none' : 'w');
  return finish();

  function eye(ex, ey, r, kind) {   // a real fish eye, small, placed by hand: a dark rim, the iris behind, the pupil looking forward, a dot of light
    ex = Math.round(ex); ey = Math.round(ey);
    const rim = kind === 'none' ? [90, 0, 140] : mixc(back, [0, 0, 0], 0.72), P = kind === 'pale' ? [30, 40, 70] : [8, 6, 8];
    const I = hx(kind === 'pale' ? '#c8d8f0' : kind === 'y' ? '#e8d040' : kind === 'none' ? '#ff80ff' : S.iris || '#d8a838'), L = [255, 255, 255];
    const STAMP = kind === 'pale' ? ['.RRR.', 'RIILR', 'RIPPR', 'RIPPR', '.RRR.']   // the deep lanternfish: a big pale eye
      : kind === 'y' ? ['.I.', 'IPI', '.I.']                                        // the pike's other eyes: yellow, staring
      : kind === 'none' ? ['.R.', 'RIR', '.R.']                                     // the bright fish: no pupil at all
      : r >= 2.6 ? ['.RR.', 'RLPR', 'RIPR', '.RR.'] : ['.R.', 'IPR', '.R.'];
    const o = Math.floor(STAMP.length / 2);
    STAMP.forEach((row, b) => [...row].forEach((ch, a) => { const c = { R: rim, I, P, L }[ch]; if (c) set(ex - o + a, ey - o + b, c); }));
    if (STAMP.length === 3 && kind !== 'y' && kind !== 'none') set(ex, ey - 1, mixc(rim, L, 0.25));   // a glint on the rim
  }
  function paintOutline() {   // every empty pixel next to a painted one becomes the dark outline
    const out = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (A[i] > 0) continue;
      if ((x > 0 && A[i - 1] > 0) || (x < W - 1 && A[i + 1] > 0) || (y > 0 && A[i - W] > 0) || (y < H - 1 && A[i + W] > 0)) out.push(i); }
    const oc = S.glass ? [60, 120, 130] : S.neon ? [90, 0, 140] : [30, 18, 24];
    for (const i of out) {   // the outline takes the colour of what it borders, much darker (warmer than flat black)
      const nb = [i - 1, i + 1, i - W, i + W].find((n) => n >= 0 && n < W * H && A[n] > 0 && col[n]);
      col[i] = nb != null && !S.glass && !S.neon ? mixc(col[nb], oc, 0.72) : oc; A[i] = S.glass ? 0.8 : 1; }
  }
  function finish() {
    for (let i = 0; i < W * H; i++) if (A[i] > 0 && col[i]) { d[i * 4] = col[i][0]; d[i * 4 + 1] = col[i][1]; d[i * 4 + 2] = col[i][2]; d[i * 4 + 3] = Math.round(A[i] * 255); }
    g.putImageData(img, 0, 0); return cv;
  }
}

const cache = new Map();
/** the portrait of a species as a data URL (painted once). id: a FISH id, or 'bright' for the Colour's catch */
export function fishArt(id) {
  if (!cache.has(id)) { const cv = paint(id); cache.set(id, cv ? cv.toDataURL() : ''); }
  return cache.get(id);
}
/** its silhouette (for a species you have only heard of): the same picture, all one colour */
export function fishShadow(id) {
  const k = id + ':shadow';
  if (!cache.has(k)) {
    const cv = paint(id); if (!cv) { cache.set(k, ''); return ''; }
    const g = cv.getContext('2d'); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#5a4630'; g.fillRect(0, 0, W, H);
    cache.set(k, cv.toDataURL());
  }
  return cache.get(k);
}
export const FISH_ART_IDS = Object.keys(SPEC);
