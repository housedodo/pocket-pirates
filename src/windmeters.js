// The wind meter: a tick ring drawn as real pixel art (a 36x36 canvas shown 4x bigger, the same
// pixel size as the 3D world). Top-down: north is up and marked with an N, the wind blows toward
// w.dir (clockwise from north).
//  - the ring is bright over the headings that sail well and dim where the ship would be slow
//  - the arrow through the middle is the wind
//  - the small triangle outside the ring is the ship's bow, the orange dot is the tracked mission
export const PX = 36;
const C = PX / 2, R = 13;
const CREAM = '#f4ead0', DIM = 'rgba(244,234,208,0.38)', SHADOW = 'rgba(20,10,4,0.6)', JOB = '#ffb040';

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => { let d = (b - a) % 6.2832; if (d > Math.PI) d -= 6.2832; if (d < -Math.PI) d += 6.2832; return d; };
const at = (a, r) => [C + Math.sin(a) * r, C - Math.cos(a) * r];

// 3x5 pixel N
const GLYPH_N = ['1.1', '111', '111', '1.1', '1.1'];

export function drawWind(c, w, heading, t, jobA) {
  c.clearRect(0, 0, PX, PX);
  const floor = w.floor == null ? 0.27 : w.floor;
  // everything is drawn twice: a dark pixel shadow one down-right, then the real colour
  for (const pass of [0, 1]) {
    const o = pass ? 0 : 1;
    const dot = (x, y, col) => { c.fillStyle = pass ? col : SHADOW; c.fillRect(Math.round(x - 0.5) + o, Math.round(y - 0.5) + o, 1, 1); };
    const line = (x0, y0, x1, y1, col, dash = 0) => {
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      for (let i = 0; i <= n; i++) if (!dash || Math.floor(i / dash) % 2 === 0) dot(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, col);
    };
    const tri = (a, b, d, col) => {
      const x0 = Math.floor(Math.min(a[0], b[0], d[0])), x1 = Math.ceil(Math.max(a[0], b[0], d[0]));
      const y0 = Math.floor(Math.min(a[1], b[1], d[1])), y1 = Math.ceil(Math.max(a[1], b[1], d[1]));
      const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const p = [x + 0.5, y + 0.5], d1 = s(p, a, b), d2 = s(p, b, d), d3 = s(p, d, a);
        if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) dot(x + 0.5, y + 0.5, col);
      }
    };
    // ring: bright and doubled where the bow would sail well, dim elsewhere
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * 6.2832, eff = 1 - (1 - floor) * smooth(0.35 * Math.PI, Math.PI, Math.abs(angDiff(a, w.dir)));
      const [x, y] = at(a, R);
      dot(x, y, eff >= 0.72 ? CREAM : DIM);
      if (eff >= 0.72) { const [x2, y2] = at(a, R + 1); dot(x2, y2, CREAM); }
    }
    // ticks (the north one is replaced by the N)
    for (let i = 1; i < 16; i++) {
      const a = (i / 16) * 6.2832, big = i % 4 === 0, [x0, y0] = at(a, big ? 9 : 11), [x1, y1] = at(a, R - 1);
      line(x0, y0, x1, y1, big ? CREAM : DIM);
    }
    GLYPH_N.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '1') dot(C - 1 + x + 0.5, 6 + y + 0.5, CREAM); }));
    // wind arrow through the middle
    const L = 4 + Math.min(1.3, w.strength) * 2.5, [tx, ty] = at(w.dir, L), [bx, by] = at(w.dir + Math.PI, L);
    line(bx, by, tx, ty, CREAM);
    tri(at(w.dir, L + 4), at(w.dir + 0.6, L - 0.5), at(w.dir - 0.6, L - 0.5), CREAM);
    // bow marker just outside the ring
    tri(at(heading, R + 4.8), at(heading + 0.22, R + 1.6), at(heading - 0.22, R + 1.6), CREAM);
    // mission dot
    if (jobA != null) { const [jx, jy] = at(jobA, R + 3); dot(jx, jy, JOB); dot(jx + 1, jy, JOB); dot(jx, jy + 1, JOB); dot(jx + 1, jy + 1, JOB); }
  }
}
