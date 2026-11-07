// Digging for treasure: probing the shore (hot and cold). The riddle got you to the right shore, not the right spot.
// The beach is a grid of squares; dig one (click it, or arrows / WASD and E / Space) and the sand tells you how close the
// chest is: the darker and wetter, the closer. Hidden stones crack the shovel, and the tide creeps up the beach with
// every dig. It fails when the tide floods the beach before you find it, or when two stones break the shovel; the crew
// then digs out and you can try again (a new beach, the chest somewhere else).
// Later in the game (dread) some squares lie about how damp they are.
// Each treasure isle has its own kind of beach, which changes the rules (o.beach):
//   sand     the plain game: the tide comes in after so many digs, two stones break the shovel
//   shingle  pebbles everywhere and more stones, but every hole shows how many stones lie next to it (grey dots)
//   dune     the wind blows sand back: every third dig, your oldest open hole fills in again and its colour is lost
//   mud      no tide, a little more time, but the mud swallows a square next to your holes after each dig
// The view: a strip of beach seen from above, the island at the top, the sea at the bottom. The treasure arch stands at the
// top of the beach and throws its real shadow across the sand: from the sun's place in the sky right now (o.sun()), so it is
// long and slanting in the morning, short at noon, gone at night. On some isles the riddle says the arch points at noon:
// there the chest lies under the tip of the shadow of its top at noon (o.noon), and only then does the shadow say so.
const W = 200, H = 168, CW = 22, CH = 20, OX = 12, OY = 44, ARCH_H = 6;   // ARCH_H: the arch's height in squares (for its shadow)
const DAMP = ['#3a2412', '#3a2412', '#5e3c1e', '#86602e', '#b08c4c', '#efdcaa'];
export const BEACHES = {
  sand: { name: '', ground: ['#c8a85a', '#d2b268'], say: '' },
  shingle: { name: 'A shingle beach', ground: ['#a8a090', '#b4ac9c'], say: 'More stones here, but each hole shows how many lie next to it.' },
  dune: { name: 'Dunes', ground: ['#e0c888', '#e8d498'], say: 'The wind fills old holes back in. Remember what they told you.' },
  mud: { name: 'A mud shore', ground: ['#7a6040', '#866a48'], say: 'No tide here, but the mud swallows the ground beside your holes.' },
};   // by distance to the chest: 1 soaked .. 5+ bone dry (much paler than undug sand)

export class DigGame {
  constructor(cb) {
    this.cb = cb;   // { sound(kind) }
    this.ui = document.getElementById('digui');
    this.msg = document.getElementById('digmsg');
    this.cv = document.getElementById('digcv'); this.g = this.cv.getContext('2d'); this.g.imageSmoothingEnabled = false;
    this.active = false;
    this.cv.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      const r = this.cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      const gx = Math.floor((x - OX) / CW), gy = Math.floor((y - OY) / CH);
      if (gx >= 0 && gx < this.cols && gy >= 0 && gy < this.rows) { this.cx = gx; this.cy = gy; this.press(); }
      e.preventDefault();
    });
  }

  /** o: { cols, rows, digs (before the tide is in), stones, lie (0..1 chance a square lies), onDone(), onFail(reason) } */
  start(o) {
    this.o = o; this.active = true; this.cols = o.cols || 8; this.rows = o.rows || 5;
    this.cx = Math.floor(this.cols / 2); this.cy = Math.floor(this.rows / 2); this.digs = 0; this.cracks = 0; this.t = 0; this.found = false;
    this.beach = BEACHES[o.beach] ? o.beach : 'sand'; this.order = [];
    this.maxCracks = this.beach === 'shingle' ? 3 : 2;
    if (this.beach === 'shingle') o = this.o = { ...o, stones: o.stones + 3 };
    if (this.beach === 'mud') o = this.o = { ...o, digs: o.digs + 3 };
    this.chest = [Math.floor(Math.random() * this.cols), Math.floor(Math.random() * this.rows)];
    // the arch stands just above the beach; on a noon-shadow isle it is placed so the noon shadow of its top falls on the chest
    this.arch = { x: 1.5 + Math.random() * (this.cols - 3), y: -0.8 };
    if (o.noon) {
      const L = ARCH_H / Math.tan(o.noon.elev), tipY = this.arch.y + o.noon.gy * L, cy = Math.max(0, Math.min(this.rows - 1, Math.floor(tipY)));
      const want = 1 + Math.floor(Math.random() * (this.cols - 2));
      this.arch.x = Math.max(0.6, Math.min(this.cols - 0.6, want + 0.5 - o.noon.gx * L));
      this.chest = [Math.max(0, Math.min(this.cols - 1, Math.floor(this.arch.x + o.noon.gx * L))), cy];
    }
    this.bed = this.bakeSand(BEACHES[this.beach]);
    this.cells = Array.from({ length: this.cols * this.rows }, () => ({ dug: false, stone: false, sunk: false, lie: Math.random() < (o.lie || 0), t: 0 }));
    for (let s = 0; s < o.stones;) { const i = Math.floor(Math.random() * this.cells.length); if (i !== this.chest[1] * this.cols + this.chest[0] && !this.cells[i].stone) { this.cells[i].stone = true; s++; } }
    const B = BEACHES[this.beach];
    this.say(B.name ? `${B.name}. ${B.say} ${this.beach === 'mud' ? `${o.digs} digs before dark.` : `The tide comes in after ${o.digs} digs.`}` : `Dig a square (click, or arrows and E). The darker the sand, the closer. The tide comes in after ${o.digs} digs.`);
    this.ui.style.display = 'block'; this.draw();
  }
  cancel() { this.active = false; this.ui.style.display = 'none'; }
  /** the beach, painted once: two sand tones dithered, speckles, shells, pebbles and weed by the waterline, grass at the top */
  bakeSand(B) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const bay = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], r = mulberry(17 + this.cols * 31 + Math.floor(Math.random() * 1e6));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = Math.sin(x * 0.11 + y * 0.07) * 0.5 + Math.sin(x * 0.031 - y * 0.05 + 2) * 0.5, wet = Math.max(0, (y - 120) / 40);
      g.fillStyle = (n * 0.5 + 0.5) * 16 > bay[(y % 4) * 4 + (x % 4)] + 4 ? B.ground[1] : B.ground[0];
      if (wet > 0 && bay[(y % 4) * 4 + (x % 4)] < wet * 14) g.fillStyle = shade(B.ground[0], 0.8);   // darker, wetter sand toward the sea
      g.fillRect(x, y, 1, 1);
      if (r() < 0.012) { g.fillStyle = shade(B.ground[0], r() < 0.5 ? 0.82 : 1.12); g.fillRect(x, y, 1, 1); }
    }
    for (let i = 0; i < 26; i++) { const x = r() * W, y = 30 + r() * (H - 40); g.fillStyle = r() < 0.5 ? '#f4ecdc' : '#e8b8a0'; g.fillRect(x | 0, y | 0, 2, 1); }   // shells
    for (let i = 0; i < 18; i++) { const x = r() * W, y = 40 + r() * 100; g.fillStyle = r() < 0.5 ? '#8a8478' : '#6e6a62'; g.fillRect(x | 0, y | 0, 2, 2); }   // pebbles
    for (let i = 0; i < 9; i++) { const x = r() * W, y = 128 + r() * 18; g.fillStyle = '#4a6a3a'; g.fillRect(x | 0, y | 0, 4, 1); g.fillRect((x + 1) | 0, (y + 1) | 0, 2, 1); }   // weed at the tideline
    g.fillStyle = '#4a7a3a'; g.fillRect(0, 0, W, 9);   // the island's edge at the top: grass and scrub
    for (let x = 0; x < W; x += 3) { g.fillStyle = r() < 0.5 ? '#3a6a30' : '#5a8a42'; g.fillRect(x, 9, 3, 1 + Math.floor(r() * 4)); }
    return c;
  }
  say(t) { this.msg.textContent = t; }
  move(dx, dy) { if (!this.active) return; this.cx = Math.max(0, Math.min(this.cols - 1, this.cx + dx)); this.cy = Math.max(0, Math.min(this.rows - 1, this.cy + dy)); this.draw(); }
  dist(x, y) { return Math.abs(x - this.chest[0]) + Math.abs(y - this.chest[1]); }
  stonesNear(x, y) { let n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < this.cols && ny < this.rows && this.cells[ny * this.cols + nx].stone) n++; } return n; }

  press() {
    if (!this.active) return;
    const c = this.cells[this.cy * this.cols + this.cx];
    if (c.dug) { this.say('Already dug there. Try another square.'); return; }
    if (c.sunk) { this.say('The mud has taken that square. Try another.'); return; }
    c.dug = true; c.t = 0.25; this.digs++; this.order.push(this.cy * this.cols + this.cx);
    if (this.cx === this.chest[0] && this.cy === this.chest[1]) { this.cb.sound('found'); this.found = true; this.draw(); this.cancel(); this.o.onDone(); return; }
    if (c.stone) {
      this.cracks++; this.cb.sound('rock');
      if (this.cracks >= this.maxCracks) { this.cancel(); this.o.onFail('stone'); return; }
      this.say(`CLANG! A stone under the sand. The shovel cracks: ${this.maxCracks - this.cracks === 1 ? 'one more and it breaks' : `${this.maxCracks - this.cracks} more and it breaks`}.`);
    } else {
      this.cb.sound('dig');
      const d = this.dist(this.cx, this.cy);
      this.say(d <= 1 ? 'Wet sand. Very close!' : d <= 3 ? 'Damp. Getting closer.' : 'Dry as a biscuit.');
      if (this.beach === 'shingle') { const n = this.stonesNear(this.cx, this.cy); if (n) this.say(`${this.msg.textContent} ${n === 1 ? 'A stone' : `${n} stones`} next to it.`); }
    }
    if (this.beach === 'dune' && this.digs % 3 === 0) {   // the wind fills the oldest open hole back in
      const i = this.order.find((k) => this.cells[k].dug && !this.cells[k].stone);
      if (i !== undefined) { this.cells[i].dug = false; this.order.splice(this.order.indexOf(i), 1); this.say(`${this.msg.textContent} The wind fills an old hole.`); }
    }
    if (this.beach === 'mud') {   // the mud swallows a square beside your holes (never the chest)
      const cand = [];
      for (let i = 0; i < this.cells.length; i++) {
        const x = i % this.cols, y = Math.floor(i / this.cols), q = this.cells[i];
        if (q.dug || q.sunk || (x === this.chest[0] && y === this.chest[1])) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < this.cols && ny < this.rows && this.cells[ny * this.cols + nx].dug; })) cand.push(i);
      }
      if (cand.length) this.cells[cand[Math.floor(Math.random() * cand.length)]].sunk = true;
    }
    if (this.digs >= this.o.digs) { this.cancel(); this.o.onFail(this.beach === 'mud' ? 'mud' : 'tide'); return; }
    this.draw();
  }

  update(dt) { if (!this.active) return; this.t += dt; for (const c of this.cells) c.t = Math.max(0, c.t - dt); this.draw(); }

  draw() {
    const g = this.g, px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const B = BEACHES[this.beach || 'sand'];
    g.drawImage(this.bed, 0, 0);
    // the arch's shadow, from where the sun is now (top-down: x along the beach, y down toward the sea)
    const sun = this.o.sun ? this.o.sun() : null, A = this.arch, ax = OX + A.x * CW, ay = OY + A.y * CH;
    if (sun && sun.elev > 0.05) {
      const L = Math.min(9, ARCH_H / Math.tan(sun.elev)), sx = sun.gx * L * CW, sy = sun.gy * L * CH;
      g.globalAlpha = Math.min(0.32, sun.elev * 0.9);
      g.fillStyle = '#2a1c10';
      const leg = (ox) => { g.beginPath(); g.moveTo(ax + ox - 3, ay); g.lineTo(ax + ox + 3, ay); g.lineTo(ax + ox + sx + 3, ay + sy); g.lineTo(ax + ox + sx - 3, ay + sy); g.closePath(); g.fill(); };
      leg(-10); leg(10);
      g.fillRect(Math.round(ax + sx - 13), Math.round(ay + sy - 3), 26, 6);   // the top of the arch: the end of the shadow
      g.globalAlpha = 1;
    }
    // the tide: the sea creeps up from the bottom with every dig (on a mud shore, the light goes instead); waves lap and draw back
    const tide = this.digs / this.o.digs, lap = Math.sin(this.t * 1.6) * 3, ty = H - 16 - tide * 22 + lap;
    if (this.beach === 'mud') { g.globalAlpha = 0.5 * tide; px(0, 0, W, H, '#1a1020'); g.globalAlpha = 1; px(0, H - 10, W, 10, '#4a3a28'); }
    else {
      px(0, ty + 3, W, H - ty, '#1b86c6'); px(0, ty + 9, W, H - ty, '#1576b0');
      for (let x = 0; x < W; x += 4) { const yy = ty + Math.sin(x * 0.09 + this.t * 2.4) * 2; px(x, yy, 4, 3, '#e8f6f8'); px(x, yy + 3, 4, 1, '#9fd8ef'); }   // the foam edge
    }
    // the grid: only faint corner marks until a square is dug
    for (let y = 0; y <= this.rows; y++) for (let x = 0; x <= this.cols; x++) px(OX + x * CW - 1, OY + y * CH - 1, 2, 2, 'rgba(60,40,20,0.25)');
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const c = this.cells[y * this.cols + x], X = OX + x * CW, Y = OY + y * CH;
      if (c.sunk) { px(X + 1, Y + 1, CW - 4, CH - 4, '#3a2a1c'); px(X + 4, Y + 8, 12, 2, '#5a4a34'); px(X + 7, Y + 5, 5, 2, '#5a4a34'); continue; }
      if (!c.dug) continue;
      if (c.stone) { px(X + 3, Y + 4, CW - 8, CH - 8, '#6a5a44'); px(X + 5, Y + 6, 10, 6, '#8a8a92'); px(X + 6, Y + 6, 5, 2, '#b4b4bc'); continue; }
      let d = this.dist(x, y); if (c.lie) d = Math.max(0, 6 - d);
      const col = DAMP[Math.min(DAMP.length - 1, d)];
      px(X + 1, Y + 2, CW - 4, CH - 4, shade(B.ground[1], 1.12));   // the heap of thrown-up sand round the hole
      px(X + 3, Y + 4, CW - 8, CH - 8, col);                          // the hole: its sand shows how damp it is (the clue)
      px(X + 3, Y + 4, CW - 8, 2, shade(col, 0.7));                   // the far wall in shade
      if (c.t > 0) px(X + 6, Y + 2, 3, 2, '#e8d8a8');                 // a spadeful flying
      if (this.beach === 'shingle') { const n = this.stonesNear(x, y); for (let k = 0; k < n; k++) px(X + 2 + k * 4, Y + 15, 3, 3, '#8a8a92'); }
    }
    if (this.found) { const X = OX + this.chest[0] * CW, Y = OY + this.chest[1] * CH; px(X + 3, Y + 4, 14, 10, '#ffd23a'); px(X + 3, Y + 8, 14, 2, '#6a4a2e'); }
    // the arch itself, standing at the top of the beach: two weathered pillars and a lintel
    for (const ox of [-10, 10]) { px(ax + ox - 3, ay - 26, 6, 27, '#9a9488'); px(ax + ox - 3, ay - 26, 2, 27, '#b8b2a4'); px(ax + ox - 4, ay - 1, 8, 3, '#6e6a62'); }
    px(ax - 15, ay - 31, 30, 6, '#a8a294'); px(ax - 15, ay - 31, 30, 2, '#c4beb0'); px(ax - 6, ay - 29, 12, 2, '#6e6a62');   // carved lintel
    // the cursor: corner brackets
    if (this.active) { const X = OX + this.cx * CW - 1, Y = OY + this.cy * CH - 1, c = '#f4ead0'; for (const [x0, y0, sx2, sy2] of [[0, 0, 1, 1], [CW - 4, 0, -1, 1], [0, CH - 4, 1, -1], [CW - 4, CH - 4, -1, -1]]) { px(X + x0 + (sx2 < 0 ? 3 : 0) - (sx2 < 0 ? 4 : 0), Y + y0, 5, 2, c); px(X + x0, Y + y0 + (sy2 < 0 ? -1 : 0), 2, 5, c); } }
    // the shovel and the tide
    for (let i = 0; i < (this.maxCracks || 2); i++) px(4 + i * 8, H - 9, 6, 6, i < this.cracks ? '#ff6a4a' : '#3a3070');
    px(W - 46, H - 9, 42, 6, '#3a3070'); px(W - 46, H - 9, 42 * (1 - tide), 6, '#4fe0d0');
  }
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
