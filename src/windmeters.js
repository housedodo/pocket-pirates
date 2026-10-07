// Wind meters for the HUD. All of them are top-down: the ship is fixed in the middle, the
// wind blows toward w.dir (clockwise from north). Styles: dial (wood + cloth streamer),
// pennant (low-poly flag), rose (faceted wind rose), sock (low-poly windsock).
export const WIND_STYLES = ['dial', 'pennant', 'rose', 'sock'];
export const WIND_NAMES = { dial: 'Wooden dial', pennant: 'Low-poly pennant', rose: 'Faceted wind rose', sock: 'Windsock' };

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
function jobFlag(c, a) {
  if (a == null) return;
  c.save(); c.translate(M, M); c.rotate(a); tri(c, [0, -58], [7, -49], [-7, -49], '#ff9a3a', '#2a1608'); c.restore();
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
  c.setLineDash([3, 4]); c.lineWidth = 3; c.strokeStyle = '#e8d6a0'; c.beginPath(); c.arc(M, M, 48, 0, 7); c.stroke(); c.setLineDash([]);
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
  jobFlag(c, jobA);
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
  jobFlag(c, jobA);
}

// ------------------------------------------------------------------ faceted wind rose on a slate octagon
function rose(c, w, heading, t, jobA) {
  plate(c, 8, 54, ['#52616a', '#46545e', '#5c6c76', '#3e4c56']);
  // 16 tick triangles
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 6.2832 - Math.PI / 2, r0 = 47, r1 = i % 2 ? 43 : 40, d = 0.05;
    tri(c, [M + Math.cos(a - d) * r0, M + Math.sin(a - d) * r0], [M + Math.cos(a + d) * r0, M + Math.sin(a + d) * r0], [M + Math.cos(a) * r1, M + Math.sin(a) * r1], '#e8d6a0');
  }
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
  jobFlag(c, jobA);
}

// ------------------------------------------------------------------ low-poly windsock on a teal plate
function sock(c, w, heading, t, jobA) {
  plate(c, 12, 54, ['#2f7f8a', '#3a929e', '#2a7080', '#348896']);
  northMark(c);
  ship(c, heading, '#cfe8e8');
  c.save(); c.translate(M, M); c.rotate(w.dir);
  const N = 7, seg = 7 + w.strength * 3.5, amp = 2 + w.strength * 3 + (w.gust || 0) * 18;
  let prev = { x: 0, y: 0, hw: 8 };
  for (let i = 1; i <= N; i++) {
    const u = i / N, y = -i * seg, x = Math.sin(u * 6 - t * (5 + w.strength * 5)) * amp * u, hw = 8 * (1 - u * 0.72);
    const a = i % 2 ? '#e8503c' : '#f4ecd0', b = i % 2 ? '#c03626' : '#d8cfae';
    const L0 = [prev.x - prev.hw, prev.y], R0 = [prev.x + prev.hw, prev.y], L1 = [x - hw, y], R1 = [x + hw, y];
    tri(c, L0, R0, L1, a, 'rgba(40,10,6,.55)');
    tri(c, R0, R1, L1, b, 'rgba(40,10,6,.55)');
    prev = { x, y, hw };
  }
  c.restore();
  // pole base
  const base = ngon(8, 5, 0);
  for (let i = 0; i < 8; i++) tri(c, [M, M], base[i], base[(i + 1) % 8], i % 2 ? '#e8d28a' : '#b8964c', '#2a1608');
  jobFlag(c, jobA);
}

export function drawWind(style, c, w, heading, t, jobA) {
  c.clearRect(0, 0, S, S);
  ({ dial, pennant, rose, sock }[style] || dial)(c, w, heading, t, jobA);
}
