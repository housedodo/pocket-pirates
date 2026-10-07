// Wind meters for the HUD. All of them are top-down: the ship is fixed in the middle, the
// wind blows toward w.dir (clockwise from north). Styles: dial (wood + cloth streamer),
// pennant (low-poly flag), rose (faceted wind rose), sock (low-poly windsock).
export const WIND_STYLES = ['dial', 'pennant', 'rose', 'sock', 'arrow', 'vane', 'ticks', 'chalk', 'needle'];
export const WIND_NAMES = { dial: 'Wooden dial', pennant: 'Low-poly pennant', rose: 'Faceted wind rose', sock: 'Windsock',
  arrow: 'Plain arrow', vane: 'Ink weather vane', ticks: 'Tick ring', chalk: 'Chalk sketch', needle: 'Brass needle' };

const S = 132, M = S / 2;
const tri = (c, a, b, d, col, stroke) => { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.closePath(); c.fillStyle = col; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 0.8; c.stroke(); } };
const ngon = (n, r, rot = 0) => Array.from({ length: n }, (_, i) => [M + Math.cos(rot + (i / n) * 6.2832) * r, M + Math.sin(rot + (i / n) * 6.2832) * r]);

/** a faceted plate: triangles from the centre to each edge, alternating two tones, with a brass rim */
function plate(c, n, r, cols, rim = '#d6b25a') {
  const p = ngon(n, r, -Math.PI / 2);
  for (let i = 0; i < n; i++) tri(c, [M, M], p[i], p[(i + 1) % n], cols[i % cols.length]);
  c.beginPath(); p.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath();
  c.lineWidth = 4; c.strokeStyle = rim; c.lineJoin = 'round'; c.stroke();
  c.lineWidth = 1.5; c.strokeStyle = '#2a1608'; c.stroke();
}
function northMark(c, col = '#f2dc9a') { tri(c, [M, 5], [M - 5, 14], [M + 5, 14], col, '#2a1608'); }
function ship(c, heading, col = '#e8d6a0') {
  c.save(); c.translate(M, M); c.rotate(heading);
  const hull = [[0, -12], [6, 4], [3, 10], [-3, 10], [-6, 4]];
  tri(c, hull[0], hull[1], hull[4], col, '#2a1608'); tri(c, hull[1], hull[2], hull[3], '#c8b27a', '#2a1608'); tri(c, hull[1], hull[3], hull[4], '#b49e68', '#2a1608');
  c.restore();
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => { let d = (b - a) % 6.2832; if (d > Math.PI) d -= 6.2832; if (d < -Math.PI) d += 6.2832; return d; };
/** coloured ring: if the nose pointed here, how well would she sail? green good, red in irons */
function ring(c, w, heading) {
  const N = 24, r0 = 40, r1 = 48, floor = w.floor == null ? 0.27 : w.floor;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * 6.2832 - Math.PI / 2, a1 = ((i + 1) / N) * 6.2832 - Math.PI / 2, am = (a0 + a1) / 2;
    const nose = am + Math.PI / 2;                                  // heading angle (clockwise from north) for this slice
    const eff = 1 - (1 - floor) * smooth(0.35 * Math.PI, Math.PI, Math.abs(angDiff(nose, w.dir)));
    const col = eff > 0.72 ? (i % 2 ? '#5ec45a' : '#4aa84a') : eff > 0.42 ? (i % 2 ? '#e0c844' : '#c8ae34') : (i % 2 ? '#e0584a' : '#c04034');
    const p = (a, r) => [M + Math.cos(a) * r, M + Math.sin(a) * r];
    tri(c, p(a0, r0), p(a1, r0), p(a0, r1), col, 'rgba(20,10,4,.55)');
    tri(c, p(a1, r0), p(a1, r1), p(a0, r1), col, 'rgba(20,10,4,.55)');
  }
}
function noseMark(c, heading) {
  c.save(); c.translate(M, M); c.rotate(heading);
  tri(c, [0, -53], [9, -38], [-9, -38], '#fff4d8', '#2a1608');
  tri(c, [0, -53], [9, -38], [0, -42], '#d8c8a0');
  c.restore();
}
function finish(c, w, heading, t, jobA) {
  ring(c, w, heading); noseMark(c, heading); jobFlag(c, jobA, t);
}
function jobFlag(c, a, t = 0) {
  if (a == null) return;
  const k = 1 + Math.sin(t * 5) * 0.12;
  c.save(); c.translate(M, M); c.rotate(a);
  tri(c, [0, -63 * k], [12, -50], [-12, -50], '#ffb040', '#2a1608');
  tri(c, [0, -63 * k], [12, -50], [0, -54], '#d87810');
  c.restore();
}

// ------------------------------------------------------------------ dial
function dial(c, w, heading, t, jobA) {
  const wood = c.createRadialGradient(M - 8, M - 10, 4, M, M, 52);
  wood.addColorStop(0, '#7a5230'); wood.addColorStop(1, '#3e2614');
  c.fillStyle = wood; c.beginPath(); c.arc(M, M, 52, 0, 7); c.fill();
  c.strokeStyle = 'rgba(20,10,4,.35)'; c.lineWidth = 1;
  for (let i = -3; i <= 3; i++) { c.beginPath(); c.arc(M, M, 46 - Math.abs(i) * 6, 0.3 + i * 0.12, 2.6 + i * 0.12); c.stroke(); }
  c.lineWidth = 5; c.strokeStyle = '#d6b25a'; c.beginPath(); c.arc(M, M, 53, 0, 7); c.stroke();
  c.lineWidth = 2; c.strokeStyle = '#8a6420'; c.beginPath(); c.arc(M, M, 56, 0, 7); c.stroke();
  northMark(c);
  ship(c, heading);
  c.save(); c.translate(M, M); c.rotate(w.dir);
  const len = 24 + w.strength * 16, amp = 2.5 + w.strength * 3 + (w.gust || 0) * 20, N = 14;
  const e = []; for (let i = 0; i <= N; i++) { const u = i / N; e.push([Math.sin(u * 7 - t * (5 + w.strength * 4)) * amp * u, -u * len, (1 - u * 0.85) * 6]); }
  c.beginPath(); e.forEach(([x, y, hw], i) => (i ? c.lineTo(x + hw, y) : c.moveTo(x + hw, y)));
  for (let i = N; i >= 0; i--) c.lineTo(e[i][0] - e[i][2], e[i][1]);
  c.closePath(); c.fillStyle = '#d6483a'; c.fill(); c.strokeStyle = '#4a1610'; c.lineWidth = 1.2; c.stroke();
  c.strokeStyle = '#f4ecd0'; c.lineWidth = 2; c.beginPath(); for (let i = 3; i <= N; i += 4) { c.moveTo(e[i][0] - e[i][2], e[i][1]); c.lineTo(e[i][0] + e[i][2], e[i][1]); } c.stroke();
  c.restore();
  finish(c, w, heading, t, jobA);
}

// ------------------------------------------------------------------ low-poly pennant on a driftwood hex plate
function pennant(c, w, heading, t, jobA) {
  plate(c, 6, 54, ['#bc8044', '#8a5a2c', '#6a421c', '#a46e36', '#7a4c24', '#b07a3c']);
  // inner hex ring and rope-ish ticks so the plate reads as carved wood
  const inner = ngon(6, 40, -Math.PI / 2);
  c.beginPath(); inner.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); c.lineWidth = 2; c.strokeStyle = 'rgba(250,230,170,.55)'; c.stroke();
  northMark(c);
  ship(c, heading);
  c.save(); c.translate(M, M); c.rotate(w.dir);
  const L = 32 + w.strength * 20, amp = 3 + w.strength * 3.5 + (w.gust || 0) * 22, N = 6;
  const cols = ['#e8503c', '#c43628', '#f0705a', '#a8281c', '#e04a38'];
  let prevL = [-8, 0], prevR = [8, 0];
  for (let i = 1; i <= N; i++) {
    const u = i / N, y = -u * L, hw = 8 * (1 - u * 0.9), off = Math.sin(u * 5 - t * (6 + w.strength * 4)) * amp * u;
    const l = [off - hw, y], r = [off + hw, y];
    tri(c, prevL, prevR, l, cols[(i * 2) % cols.length], 'rgba(60,10,6,.6)');
    tri(c, prevR, r, l, cols[(i * 2 + 1) % cols.length], 'rgba(60,10,6,.6)');
    prevL = l; prevR = r;
  }
  c.restore();
  // brass hex cap on the mast
  const cap = ngon(6, 5, 0);
  for (let i = 0; i < 6; i++) tri(c, [M, M], cap[i], cap[(i + 1) % 6], i % 2 ? '#e8d28a' : '#c8aa58', '#2a1608');
  finish(c, w, heading, t, jobA);
}

// ------------------------------------------------------------------ faceted wind rose on a slate octagon
function rose(c, w, heading, t, jobA) {
  plate(c, 8, 54, ['#52616a', '#46545e', '#5c6c76', '#3e4c56']);
  // the star: 8 faceted points
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.2832 - Math.PI / 2, long = i % 2 === 0, L = long ? 36 : 24, base = 7;
    const tip = [M + Math.cos(a) * L, M + Math.sin(a) * L], l = [M + Math.cos(a - 0.5) * base, M + Math.sin(a - 0.5) * base], r = [M + Math.cos(a + 0.5) * base, M + Math.sin(a + 0.5) * base];
    tri(c, [M, M], tip, l, i === 0 ? '#f0705a' : long ? '#f4ecd0' : '#c8b88a', 'rgba(20,10,4,.5)');
    tri(c, [M, M], tip, r, i === 0 ? '#c43628' : long ? '#b8a878' : '#9a8a60', 'rgba(20,10,4,.5)');
  }
  ship(c, heading, '#6a8a9a');
  // the wind: a faceted coral arrow that breathes with the gusts
  c.save(); c.translate(M, M); c.rotate(w.dir);
  const L = 22 + w.strength * 18 + Math.sin(t * 3) * (w.gust || 0) * 20;
  tri(c, [-4, 0], [4, 0], [0, -L], '#f26a50', '#4a1610');
  tri(c, [4, 0], [0, -L], [0, -L * 0.2], '#b8321f', '#4a1610');
  tri(c, [-9, -L + 9], [9, -L + 9], [0, -L - 8], '#f9a28a', '#4a1610');
  c.restore();
  finish(c, w, heading, t, jobA);
}

// ------------------------------------------------------------------ low-poly windsock on a teal plate
function sock(c, w, heading, t, jobA) {
  plate(c, 8, 54, ['#2f7f8a', '#3a929e', '#2a7080', '#348896']);
  northMark(c);
  ship(c, heading, '#cfe8e8');
  c.save(); c.translate(M, M); c.rotate(w.dir);
  // four chunky segments, wobbling in steps so it stays angular
  const N = 4, seg = 12 + w.strength * 4, amp = 2 + w.strength * 3 + (w.gust || 0) * 16;
  let prev = { x: 0, y: 0, hw: 9 };
  for (let i = 1; i <= N; i++) {
    const u = i / N, y = -i * seg, x = Math.round(Math.sin(u * 4 - t * (4 + w.strength * 4)) * amp * u / 2) * 2, hw = 9 * (1 - u * 0.6);
    const a = i % 2 ? '#e8503c' : '#f4ecd0', b = i % 2 ? '#bc3424' : '#d4cba8';
    const L0 = [prev.x - prev.hw, prev.y], R0 = [prev.x + prev.hw, prev.y], L1 = [x - hw, y], R1 = [x + hw, y];
    tri(c, L0, R0, L1, a, 'rgba(40,10,6,.65)');
    tri(c, R0, R1, L1, b, 'rgba(40,10,6,.65)');
    prev = { x, y, hw };
  }
  c.restore();
  const base = ngon(6, 5, 0);
  for (let i = 0; i < 6; i++) tri(c, [M, M], base[i], base[(i + 1) % 6], i % 2 ? '#e8d28a' : '#b8964c', '#2a1608');
  finish(c, w, heading, t, jobA);
}

// ------------------------------------------------------------------ simple, one or two colour meters
/** the same information as the coloured ring, in a single colour: a thin arc over the headings
 *  that sail well, a tick for the nose and a hollow tick toward the mission */
function plain(c, w, heading, col, jobA, r = 50) {
  const floor = w.floor == null ? 0.27 : w.floor;
  c.strokeStyle = col; c.lineWidth = 6; c.lineCap = 'butt';
  for (let i = 0; i < 36; i++) {
    const a0 = (i / 36) * 6.2832, a1 = ((i + 1) / 36) * 6.2832;
    const eff = 1 - (1 - floor) * smooth(0.35 * Math.PI, Math.PI, Math.abs(angDiff((a0 + a1) / 2, w.dir)));
    if (eff < 0.72) continue;
    c.beginPath(); c.arc(M, M, r, a0 - Math.PI / 2, a1 - Math.PI / 2 + 0.01); c.stroke();
  }
  c.save(); c.translate(M, M); c.rotate(heading);
  c.fillStyle = col; c.beginPath(); c.moveTo(0, -r - 9); c.lineTo(6, -r + 2); c.lineTo(-6, -r + 2); c.closePath(); c.fill();
  c.restore();
  if (jobA != null) {
    c.save(); c.translate(M, M); c.rotate(jobA);
    c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -r - 10); c.lineTo(5, -r - 1); c.lineTo(-5, -r - 1); c.closePath(); c.stroke();
    c.restore();
  }
}
function shipDot(c, heading, col) {
  c.save(); c.translate(M, M); c.rotate(heading);
  c.fillStyle = col; c.beginPath(); c.moveTo(0, -8); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath(); c.fill();
  c.restore();
}
function arrow(c, w, heading, t, jobA) {
  const col = '#f4ead0';
  c.strokeStyle = 'rgba(20,10,4,.5)'; c.lineWidth = 6; c.beginPath(); c.arc(M, M, 42, 0, 7); c.stroke();
  c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(M, M, 42, 0, 7); c.stroke();
  c.save(); c.translate(M, M); c.rotate(w.dir);
  const L = 18 + w.strength * 12;
  c.strokeStyle = 'rgba(20,10,4,.5)'; c.lineWidth = 7; c.beginPath(); c.moveTo(0, L); c.lineTo(0, -L); c.stroke();
  c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(0, L); c.lineTo(0, -L); c.stroke();
  c.fillStyle = col; c.beginPath(); c.moveTo(0, -L - 9); c.lineTo(8, -L + 3); c.lineTo(-8, -L + 3); c.closePath(); c.fill();
  c.restore();
  plain(c, w, heading, col, jobA, 42);
}
function vane(c, w, heading, t, jobA) {
  const ink = '#2a1608', paper = '#e8d6a6';
  c.fillStyle = paper; c.beginPath(); c.arc(M, M, 46, 0, 7); c.fill();
  c.strokeStyle = ink; c.lineWidth = 2; c.stroke();
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; c.beginPath(); c.moveTo(M + Math.sin(a) * 38, M - Math.cos(a) * 38); c.lineTo(M + Math.sin(a) * 45, M - Math.cos(a) * 45); c.stroke(); }
  c.font = 'bold 10px Georgia, serif'; c.textAlign = 'center'; c.fillStyle = ink; c.fillText('N', M, M - 27);
  c.save(); c.translate(M, M); c.rotate(w.dir + Math.sin(t * 3) * 0.03 * (1 + (w.gust || 0) * 8));
  c.fillStyle = ink; c.beginPath(); // arrow head, shaft, feathered tail
  c.moveTo(0, -34); c.lineTo(7, -22); c.lineTo(1.5, -22); c.lineTo(1.5, 16); c.lineTo(8, 30); c.lineTo(0, 24); c.lineTo(-8, 30); c.lineTo(-1.5, 16); c.lineTo(-1.5, -22); c.lineTo(-7, -22); c.closePath(); c.fill();
  c.restore();
  c.fillStyle = paper; c.beginPath(); c.arc(M, M, 3.5, 0, 7); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.5; c.stroke();
  plain(c, w, heading, '#2a1608', jobA, 46);
}
function ticks(c, w, heading, t, jobA) {
  const col = '#f4ead0', dim = 'rgba(244,234,208,.45)';
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * 6.2832, big = i % 8 === 0, r0 = big ? 32 : 36;
    c.strokeStyle = 'rgba(20,10,4,.45)'; c.lineWidth = big ? 5 : 4; c.beginPath(); c.moveTo(M + Math.sin(a) * r0, M - Math.cos(a) * r0); c.lineTo(M + Math.sin(a) * 42, M - Math.cos(a) * 42); c.stroke();
    c.strokeStyle = big ? col : dim; c.lineWidth = big ? 2.5 : 1.5; c.stroke();
  }
  // the wind is a single bright notch on the ring, plus a short tail on the other side
  c.save(); c.translate(M, M); c.rotate(w.dir);
  c.fillStyle = col; c.beginPath(); c.moveTo(0, -44); c.lineTo(7, -30); c.lineTo(-7, -30); c.closePath(); c.fill();
  c.strokeStyle = col; c.lineWidth = 2; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(0, 30); c.lineTo(0, -26); c.stroke(); c.setLineDash([]);
  c.restore();
  shipDot(c, heading, col);
  plain(c, w, heading, col, jobA, 42);
}
function chalk(c, w, heading, t, jobA) {
  const col = 'rgba(250,246,236,.9)';
  const jit = (k) => Math.sin(k * 12.9898 + Math.floor(t * 4) * 7.1) * 1.2; // the strokes shimmer a little
  c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = 2;
  for (let pass = 0; pass < 2; pass++) {
    c.beginPath();
    for (let i = 0; i <= 28; i++) { const a = (i / 28) * 6.2832 + pass * 0.1, r = 43 + jit(i + pass * 40); i ? c.lineTo(M + Math.sin(a) * r, M - Math.cos(a) * r) : c.moveTo(M + Math.sin(a) * r, M - Math.cos(a) * r); }
    c.stroke();
  }
  c.save(); c.translate(M, M); c.rotate(w.dir);
  const L = 18 + w.strength * 12;
  for (let pass = 0; pass < 2; pass++) {
    c.beginPath(); c.moveTo(jit(1 + pass), L); c.lineTo(jit(2 + pass), -L);
    c.moveTo(-8 + jit(3 + pass), -L + 9); c.lineTo(jit(4), -L - 2); c.lineTo(8 + jit(5 + pass), -L + 9);
    c.stroke();
  }
  c.restore();
  c.save(); c.translate(M, M); c.rotate(heading);
  c.beginPath(); c.moveTo(0, -8); c.lineTo(5 + jit(9), 6); c.lineTo(-5, 6 + jit(8)); c.closePath(); c.stroke();
  c.restore();
  plain(c, w, heading, col, jobA, 43);
}
function needle(c, w, heading, t, jobA) {
  const brass = '#d6b25a', dark = '#5a4012';
  c.strokeStyle = dark; c.lineWidth = 6; c.beginPath(); c.arc(M, M, 44, 0, 7); c.stroke();
  c.strokeStyle = brass; c.lineWidth = 3; c.stroke();
  c.save(); c.translate(M, M); c.rotate(w.dir + Math.sin(t * 2.3) * 0.02);
  const L = 34;
  c.fillStyle = brass; c.beginPath(); c.moveTo(0, -L); c.lineTo(5, 0); c.lineTo(0, L * 0.55); c.lineTo(-5, 0); c.closePath(); c.fill();
  c.fillStyle = dark; c.beginPath(); c.moveTo(0, -L); c.lineTo(5, 0); c.lineTo(0, 0); c.closePath(); c.fill();
  c.restore();
  c.fillStyle = brass; c.beginPath(); c.arc(M, M, 4, 0, 7); c.fill();
  plain(c, w, heading, brass, jobA, 44);
}

export function drawWind(style, c, w, heading, t, jobA) {
  c.clearRect(0, 0, S, S);
  ({ dial, pennant, rose, sock, arrow, vane, ticks, chalk, needle }[style] || dial)(c, w, heading, t, jobA);
}
