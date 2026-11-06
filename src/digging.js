// Digging for treasure is a timing game. A needle swings across the gauge; E (or Space) swings the shovel where it is.
//  - green, the soft sand: digs deep (2)      - yellow, packed sand: digs a little (1)      - anywhere else: mostly air (0)
//  - grey, a stone: CLANG, the shovel cracks. Two cracks and the hole caves in: the dig fails and the crew must dig out
//    the collapse before trying again.
// Every swing moves the sand and the stone and makes the needle a little faster. Better tools (ship upgrades, the dig
// buff) widen the soft sand; the first treasure (the tutorial) is a little kinder.
const rnd = (a, b) => a + Math.random() * (b - a);

export class DigGame {
  constructor(cb) {
    this.cb = cb;   // { toast, sound(kind) }
    this.ui = document.getElementById('digui');
    this.msg = document.getElementById('digmsg');
    this.track = document.getElementById('digtrack');
    this.okEl = document.getElementById('digok'); this.goodEl = document.getElementById('diggood'); this.rockEl = document.getElementById('digrock');
    this.needle = document.getElementById('digneedle'); this.prog = document.getElementById('digprog'); this.cracksEl = document.getElementById('digcracks');
    this.active = false;
    this.ui.addEventListener('pointerdown', (e) => { this.press(); e.preventDefault(); });
  }

  /** o: { need (depth to reach), ease (0..1: wider soft sand), onDone(), onFail() } */
  start(o) {
    this.o = o; this.active = true;
    this.depth = 0; this.cracks = 0; this.x = 0; this.dir = 1; this.speed = 0.55; this.flash = 0; this.say = 'E / Space: swing the shovel when the needle is on the soft sand';
    this.roll();
    this.ui.style.display = 'block';
    this.render();
  }
  cancel() { this.active = false; this.ui.style.display = 'none'; }

  /** new sand and a new stone for the next swing */
  roll() {
    const e = this.o.ease || 0;
    this.gw = 0.11 + 0.09 * e; this.ow = this.gw + 0.2;                 // soft sand inside packed sand
    this.gc = rnd(0.22, 0.78);
    let rc = rnd(0.06, 0.94);
    for (let k = 0; k < 20 && Math.abs(rc - this.gc) < this.ow / 2 + 0.06; k++) rc = rnd(0.06, 0.94);   // the stone never sits in the sand
    this.rc = rc; this.rw = 0.09;
  }

  press() {
    if (!this.active) return;
    const x = this.x;
    if (Math.abs(x - this.rc) < this.rw / 2) {
      this.cracks++; this.flash = 0.35; this.cb.sound('rock');
      if (this.cracks >= 2) { this.cancel(); this.o.onFail(); return; }
      this.say = 'CLANG! A stone. The shovel cracks. One more and the hole caves in.';
    } else if (Math.abs(x - this.gc) < this.gw / 2) { this.depth += 2; this.say = 'Good swing!'; this.cb.sound('good'); }
    else if (Math.abs(x - this.gc) < this.ow / 2) { this.depth += 1; this.say = 'A little deeper.'; this.cb.sound('ok'); }
    else this.say = 'Mostly air.';
    if (this.depth >= this.o.need) { this.render(); this.cancel(); this.o.onDone(); return; }
    this.speed = Math.min(1.15, this.speed + 0.06);
    this.roll();
  }

  update(dt) {
    if (!this.active) return;
    this.x += this.dir * this.speed * dt;
    if (this.x > 1) { this.x = 2 - this.x; this.dir = -1; } else if (this.x < 0) { this.x = -this.x; this.dir = 1; }
    this.flash = Math.max(0, this.flash - dt);
    this.render();
  }

  render() {
    const pc = (v) => `${v * 100}%`;
    this.okEl.style.left = pc(this.gc - this.ow / 2); this.okEl.style.width = pc(this.ow);
    this.goodEl.style.left = pc(this.gc - this.gw / 2); this.goodEl.style.width = pc(this.gw);
    this.rockEl.style.left = pc(this.rc - this.rw / 2); this.rockEl.style.width = pc(this.rw);
    this.needle.style.left = pc(this.x);
    this.prog.style.width = pc(Math.min(1, this.depth / this.o.need));
    this.cracksEl.textContent = this.cracks ? 'Shovel: cracked! Mind the stones' : 'Shovel: whole';
    this.cracksEl.className = this.cracks ? 'bad' : '';
    this.msg.textContent = this.say;
    this.track.classList.toggle('shake', this.flash > 0);
  }
}
