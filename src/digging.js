// Digging for treasure: probing the shore (hot and cold). The riddle got you to the right shore, not the right spot.
// The beach is a grid of squares; dig one (click it, or arrows / WASD and E / Space) and the sand tells you how close the
// chest is: the darker and wetter, the closer. Hidden stones crack the shovel, and the tide creeps up the beach with
// every dig. It fails when the tide floods the beach before you find it, or when two stones break the shovel; the crew
// then digs out and you can try again (a new beach, the chest somewhere else).
// Later in the game (dread) some squares lie about how damp they are.
const W = 200, H = 136, CW = 22, CH = 20, OX = 12, OY = 14;
const DAMP = ['#3a2412', '#3a2412', '#5e3c1e', '#86602e', '#b08c4c', '#efdcaa'];   // by distance to the chest: 1 soaked .. 5+ bone dry (much paler than undug sand)

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
    this.cx = Math.floor(this.cols / 2); this.cy = Math.floor(this.rows / 2); this.digs = 0; this.cracks = 0; this.t = 0;
    this.chest = [Math.floor(Math.random() * this.cols), Math.floor(Math.random() * this.rows)];
    this.cells = Array.from({ length: this.cols * this.rows }, () => ({ dug: false, stone: false, lie: Math.random() < (o.lie || 0), t: 0 }));
    for (let s = 0; s < o.stones;) { const i = Math.floor(Math.random() * this.cells.length); if (i !== this.chest[1] * this.cols + this.chest[0] && !this.cells[i].stone) { this.cells[i].stone = true; s++; } }
    this.say(`Dig a square (click, or arrows and E). The darker the sand, the closer. The tide comes in after ${o.digs} digs.`);
    this.ui.style.display = 'block'; this.draw();
  }
  cancel() { this.active = false; this.ui.style.display = 'none'; }
  say(t) { this.msg.textContent = t; }
  move(dx, dy) { if (!this.active) return; this.cx = Math.max(0, Math.min(this.cols - 1, this.cx + dx)); this.cy = Math.max(0, Math.min(this.rows - 1, this.cy + dy)); this.draw(); }
  dist(x, y) { return Math.abs(x - this.chest[0]) + Math.abs(y - this.chest[1]); }

  press() {
    if (!this.active) return;
    const c = this.cells[this.cy * this.cols + this.cx];
    if (c.dug) { this.say('Already dug there. Try another square.'); return; }
    c.dug = true; c.t = 0.25; this.digs++;
    if (this.cx === this.chest[0] && this.cy === this.chest[1]) { this.cb.sound('found'); this.found = true; this.draw(); this.cancel(); this.o.onDone(); return; }
    if (c.stone) {
      this.cracks++; this.cb.sound('rock');
      if (this.cracks >= 2) { this.cancel(); this.o.onFail('stone'); return; }
      this.say('CLANG! A stone under the sand. The shovel cracks: one more and it breaks.');
    } else {
      this.cb.sound('dig');
      const d = this.dist(this.cx, this.cy);
      this.say(d <= 1 ? 'Wet sand. Very close!' : d <= 3 ? 'Damp. Getting closer.' : 'Dry as a biscuit.');
    }
    if (this.digs >= this.o.digs) { this.cancel(); this.o.onFail('tide'); return; }
    this.draw();
  }

  update(dt) { if (!this.active) return; this.t += dt; for (const c of this.cells) c.t = Math.max(0, c.t - dt); this.draw(); }

  draw() {
    const g = this.g, px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    px(0, 0, W, H, '#c8a85a');
    // the tide: the sea creeps up from the bottom with every dig
    const tide = this.digs / this.o.digs, ty = H - 10 - tide * 18 + Math.sin(this.t * 2.2) * 1.5;
    px(0, ty, W, H - ty, '#1b86c6'); px(0, ty, W, 2, '#bfeaff');
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const c = this.cells[y * this.cols + x], X = OX + x * CW, Y = OY + y * CH;
      let col = (x + y) % 2 ? '#d2b268' : '#c8a85a';
      if (c.dug) {
        if (c.stone) col = '#8a8a92';
        else { let d = this.dist(x, y); if (c.lie) d = Math.max(0, 6 - d); col = DAMP[Math.min(DAMP.length - 1, d)]; }   // clear steps: soaked, wet, damp, dry, bone dry
      }
      px(X, Y, CW - 2, CH - 2, col);
      if (c.dug && !c.stone) px(X + 7, Y + 6, 6, 6 - (c.t > 0 ? 2 : 0), '#3a2414');
      if (c.dug && c.stone) px(X + 5, Y + 5, 8, 4, '#a8a8b0');
    }
    if (this.found) { const X = OX + this.chest[0] * CW, Y = OY + this.chest[1] * CH; px(X + 3, Y + 4, 14, 10, '#ffd23a'); px(X + 3, Y + 8, 14, 2, '#6a4a2e'); }
    if (this.active) { g.strokeStyle = '#f4ead0'; g.lineWidth = 2; g.strokeRect(OX + this.cx * CW - 1, OY + this.cy * CH - 1, CW, CH); }
    // the shovel and the tide
    for (let i = 0; i < 2; i++) px(4 + i * 8, 3, 6, 6, i < this.cracks ? '#ff6a4a' : '#3a3070');
    px(W - 46, 3, 42, 6, '#3a3070'); px(W - 46, 3, 42 * (1 - tide), 6, '#4fe0d0');
  }
}
