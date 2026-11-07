// The local games: one per village style, played in the tavern (harbourlife.js GAMES). Each is a small canvas toy,
// a minute or less, scored 0 (nothing), 1 (a little) or 2 (well). The modal builds itself; main.js opens it as 'local'
// and forwards keys. Pixel look: a 320x180 canvas scaled up, flat colours, no text on the canvas but numbers.
const W = 320, H = 180;
const C = { sea: '#2a6a9a', deep: '#1c4a74', foam: '#e8f4f8', sand: '#e0c890', wood: '#8a5a30', dark: '#2a2026', gold: '#ffd23a', red: '#d24a3e', green: '#5ec45a', sky: '#9ad0ec', ink: '#f4f0e6', grey: '#6a6a72' };
const rnd = (a, b) => a + Math.random() * (b - a);

export class LocalGames {
  constructor(audio) {
    this.audio = audio;
    this.el = document.createElement('div'); this.el.id = 'localgame'; this.el.className = 'modal';
    this.el.innerHTML = '<div class="menu" id="lgWide"><h2 id="lgTitle"></h2><canvas id="lgCv" width="320" height="180"></canvas><p class="quote" id="lgLine"></p><button id="lgDone">Leave [E]</button></div>';
    document.body.appendChild(this.el);
    this.cv = this.el.querySelector('#lgCv'); this.ctx = this.cv.getContext('2d');
    this.lineEl = this.el.querySelector('#lgLine');
    this.el.querySelector('#lgDone').addEventListener('click', () => this.finish());
    this.held = new Set();
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    this.cv.addEventListener('pointerdown', () => this.key('Space'));
  }
  /** id: game id, title, onDone(tier) when the player leaves */
  open(id, title, onDone) {
    this.id = id; this.onDone = onDone; this.tier = null; this.t = 0; this.held.clear();
    this.el.querySelector('#lgTitle').textContent = title;
    this.g = GAMES[id](); this.say(this.g.how);
    this.el.classList.add('open');
    this.last = performance.now();
    const loop = (now) => { if (!this.el.classList.contains('open')) return; const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.step(dt); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  get active() { return this.el.classList.contains('open'); }
  say(t) { this.lineEl.textContent = t; }
  step(dt) {
    const g = this.g; this.t += dt;
    if (this.tier == null) {
      g.update(dt, this);
      if (g.over) { this.tier = g.tier(); this.say(g.result(this.tier) + '   [E]'); this.audio && this.audio.play(this.tier ? 'treasure' : 'ui', { vol: 0.5 }); }
    }
    g.draw(this.ctx, this.t);
  }
  key(code) {
    if (code === 'KeyE' || code === 'Escape') { this.finish(); return; }
    this.held.add(code);
    if (this.tier == null && this.g.key) this.g.key(code, this);
  }
  finish() {
    if (!this.active) return;
    this.el.classList.remove('open');
    const t = this.tier == null ? 0 : this.tier, cb = this.onDone; this.onDone = null;
    if (cb) cb(t, this.tier != null);
  }
  blip(v = 0.35) { this.audio && this.audio.play('ui', { vol: v }); }
}

// ---------------------------------------------------------------- helpers
function bg(c, top = C.sky, sea = C.sea, horizon = 70) { c.fillStyle = top; c.fillRect(0, 0, W, horizon); c.fillStyle = sea; c.fillRect(0, horizon, W, H - horizon); }
function num(c, n, x, y, col = C.ink) { c.fillStyle = col; c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText(String(n), x, y); }
function bar(c, x, y, w, h, k, col) { c.fillStyle = C.dark; c.fillRect(x, y, w, h); c.fillStyle = col; c.fillRect(x + 1, y + 1, (w - 2) * Math.max(0, Math.min(1, k)), h - 2); }

const GAMES = {
  // ---- Tama: repeat the peal
  bells() {
    const g = { how: 'Watch the peal, then ring it back on the bells: 1, 2, 3, 4.', seq: [], pos: 0, mode: 'show', t: 0, lit: -1, done: 0, len: 3, over: false };
    const grow = () => { g.seq = []; for (let i = 0; i < g.len; i++) g.seq.push(Math.floor(Math.random() * 4)); g.mode = 'show'; g.t = -0.6; g.pos = 0; };
    grow();
    g.update = (dt, L) => {
      g.t += dt; if (g.flash > 0) g.flash -= dt;
      if (g.mode === 'show') { const i = Math.floor(g.t / 0.6); g.lit = g.t >= 0 && g.t % 0.6 < 0.42 && i < g.seq.length ? g.seq[i] : -1; if (g.lit >= 0 && g.prevLit !== i) { g.prevLit = i; L.blip(0.3); } if (i >= g.seq.length) { g.mode = 'play'; g.lit = -1; L.say('Your turn.'); } }
    };
    g.key = (code, L) => {
      if (g.mode !== 'play') return; const k = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[code]; if (k == null) return;
      g.lit = k; g.flash = 0.25; L.blip(0.4);
      if (k !== g.seq[g.pos]) { g.over = true; return; }
      if (++g.pos >= g.seq.length) { g.done++; if (g.done >= 4) { g.over = true; return; } g.len++; g.prevLit = -1; grow(); L.say(`Good. Again, one bell longer (${g.done}/4).`); }
    };
    g.tier = () => (g.done >= 3 ? 2 : g.done >= 1 ? 1 : 0);
    g.result = (t) => [`A bell rings out of turn. The ringers wince. (${g.done} peals)`, `Not bad. The tower clock almost agrees with you. (${g.done} peals)`, `A clean peal! Gulls lift off every roof. (${g.done} peals)`][t];
    g.draw = (c) => {
      bg(c, '#c8b8a0', '#8a7a68', 150);
      for (let i = 0; i < 4; i++) { const x = 52 + i * 72, on = g.lit === i && (g.mode === 'show' || g.flash > 0);
        c.fillStyle = C.wood; c.fillRect(x - 2, 20, 4, 30); c.fillStyle = on ? C.gold : '#b08a3a'; c.beginPath(); c.moveTo(x - 22, 96); c.quadraticCurveTo(x - 20, 46, x, 46); c.quadraticCurveTo(x + 20, 46, x + 22, 96); c.fill();
        c.fillStyle = C.dark; c.fillRect(x - 3, 92, 6, 8); num(c, i + 1, x, 128, on ? C.gold : C.ink); }
      c.fillStyle = C.ink; for (let i = 0; i < g.seq.length; i++) { c.fillStyle = g.mode === 'play' && i < g.pos ? C.green : C.grey; c.fillRect(W / 2 - g.seq.length * 6 + i * 12, 160, 8, 8); }
    };
    return g;
  },
  // ---- fishing town: stop the shuttle on the hole
  nets() {
    const g = { how: 'The shuttle runs along the torn line: press Space as it crosses the gold hole.', x: 20, v: 120, hole: 160, hits: 0, tries: 0, over: false, msgT: 0, msg: '' };
    const next = () => { g.hole = 40 + Math.random() * 240; g.v = (g.v > 0 ? 1 : -1) * (120 + g.tries * 22); };
    next();
    g.update = (dt) => { g.x += g.v * dt; if (g.x < 16) { g.x = 16; g.v = -g.v; } if (g.x > W - 16) { g.x = W - 16; g.v = -g.v; } g.msgT -= dt; };
    g.key = (code, L) => { if (code !== 'Space') return; const ok = Math.abs(g.x - g.hole) < 9; if (ok) g.hits++; g.tries++; g.msg = ok ? 'knot' : 'miss'; g.msgT = 0.5; L.blip(ok ? 0.45 : 0.2); L.say(`Knots tied: ${g.hits} of ${g.tries} (8 holes).`); if (g.tries >= 8) g.over = true; else next(); };
    g.tier = () => (g.hits >= 7 ? 2 : g.hits >= 4 ? 1 : 0);
    g.result = (t) => [`The net comes up with a hole you could row through. (${g.hits}/8)`, `It will hold. Probably. (${g.hits}/8)`, `The old net-menders nod at your knots. (${g.hits}/8)`][t];
    g.draw = (c) => {
      bg(c, '#a8d4e8', C.deep, 40);
      c.strokeStyle = '#d8c8a0'; c.lineWidth = 1;
      for (let x = 0; x < W; x += 16) { c.beginPath(); c.moveTo(x, 50); c.lineTo(x + 16, 130); c.moveTo(x + 16, 50); c.lineTo(x, 130); c.stroke(); }
      c.fillStyle = '#d8c8a0'; c.fillRect(0, 88, W, 4);
      c.fillStyle = C.gold; c.fillRect(g.hole - 9, 84, 18, 12);
      c.fillStyle = C.wood; c.fillRect(g.x - 10, 80, 20, 20); c.fillStyle = C.ink; c.fillRect(g.x - 1, 76, 2, 28);
      if (g.msgT > 0) num(c, g.msg === 'knot' ? '✓' : 'x', g.x, 70, g.msg === 'knot' ? C.green : C.red);
      for (let i = 0; i < 8; i++) { c.fillStyle = i < g.tries ? C.grey : C.dark; c.fillRect(W / 2 - 48 + i * 12, 160, 8, 8); }
    };
    return g;
  },
  // ---- terraced town: skip a stone (power, then angle), three throws, the best counts
  skip() {
    const g = { how: 'Space to set the power, Space again to set the angle. Low and fast skips best. Three throws.', phase: 'power', k: 0, dir: 1, p: 0, a: 0, throws: 0, best: 0, fly: null, over: false };
    g.update = (dt, L) => {
      if (g.phase === 'power' || g.phase === 'angle') { g.k += g.dir * dt * (g.phase === 'power' ? 1.3 : 1.7); if (g.k > 1) { g.k = 1; g.dir = -1; } if (g.k < 0) { g.k = 0; g.dir = 1; } }
      if (g.fly) { g.fly.t += dt; const f = g.fly; if (f.t > 0.3 + f.n * 0.32) { g.fly = null; g.throws++; g.best = Math.max(g.best, f.n); L.say(`${f.n} skip${f.n === 1 ? '' : 's'}! Best so far: ${g.best}. (${g.throws}/3)`); if (g.throws >= 3) g.over = true; else { g.phase = 'power'; g.k = 0; } } }
    };
    g.key = (code, L) => { if (code !== 'Space') return;
      if (g.phase === 'power') { g.p = g.k; g.phase = 'angle'; g.k = 0; g.dir = 1; L.blip(0.3); }
      else if (g.phase === 'angle') { g.a = g.k; g.phase = 'fly'; const n = Math.max(0, Math.round(g.p * 9 * Math.max(0, 1 - Math.abs(g.a - 0.25) * 2.6))); g.fly = { t: 0, n }; L.blip(0.4); } };
    g.tier = () => (g.best >= 6 ? 2 : g.best >= 3 ? 1 : 0);
    g.result = (t) => [`Plop. The children on the wall laugh kindly. (best ${g.best})`, `A fair skip. A dog runs after it. (best ${g.best})`, `It skips and skips. The whole terrace counts out loud. (best ${g.best})`][t];
    g.draw = (c, T) => {
      bg(c, '#b8dcf0', C.sea, 92);
      c.fillStyle = '#9a8a6a'; for (let i = 0; i < 4; i++) c.fillRect(0, 92 - i * 14, 60 - i * 12, 14);
      bar(c, 80, 150, 90, 10, g.phase === 'power' ? g.k : g.p, C.gold);
      c.strokeStyle = C.ink; c.lineWidth = 2; const ang = (g.phase === 'angle' ? g.k : g.a) * 1.2; c.beginPath(); c.moveTo(210, 160); c.lineTo(210 + Math.cos(ang) * 30, 160 - Math.sin(ang) * 30); c.stroke();
      c.strokeStyle = C.green; c.beginPath(); c.moveTo(210, 160); c.lineTo(210 + Math.cos(0.3) * 34, 160 - Math.sin(0.3) * 34); c.stroke();
      if (g.fly) { const f = g.fly; for (let i = 0; i < f.n; i++) { const tt = 0.3 + i * 0.32; if (f.t > tt) { const x = 70 + (i + 1) * 26; c.strokeStyle = C.foam; c.lineWidth = 1; c.beginPath(); c.ellipse(x, 96, 6 + (f.t - tt) * 20, 2 + (f.t - tt) * 5, 0, 0, 6.28); c.stroke(); } }
        const i = Math.min(f.n, Math.floor((f.t - 0.0) / 0.32)), x = 50 + (Math.min(f.t / 0.32, f.n + 1)) * 26, y = 94 - Math.abs(Math.sin((f.t / 0.32) * Math.PI)) * (14 - i); c.fillStyle = C.grey; c.fillRect(x - 3, y - 2, 6, 3); }
      for (let i = 0; i < 3; i++) { c.fillStyle = i < g.throws ? C.grey : C.dark; c.fillRect(140 + i * 12, 166, 8, 8); }
    };
    return g;
  },
  // ---- thatch village: keep the kite in the band
  kite() {
    const g = { how: 'Gusts push the kite about: hold A and D to keep it in the gold band for 20 seconds.', x: 160, v: 0, t: 0, inT: 0, gust: 0, gt: 0, over: false };
    g.update = (dt, L) => {
      g.t += dt; g.gt -= dt; if (g.gt <= 0) { g.gt = rnd(0.6, 1.8); g.gust = rnd(-1, 1) * (60 + g.t * 4); }
      const pull = (L.held.has('KeyD') || L.held.has('ArrowRight') ? 1 : 0) - (L.held.has('KeyA') || L.held.has('ArrowLeft') ? 1 : 0);
      g.v += (g.gust + pull * 150) * dt; g.v *= 1 - dt * 1.8; g.x = Math.max(10, Math.min(W - 10, g.x + g.v * dt));
      if (Math.abs(g.x - 160) < 34) g.inT += dt;
      if (g.t >= 20) g.over = true; else if (Math.floor(g.t) !== Math.floor(g.t - dt)) L.say(`In the band: ${Math.round(g.inT)} s of ${Math.round(g.t)} s.`);
    };
    g.tier = () => { const f = g.inT / 20; return f > 0.8 ? 2 : f > 0.5 ? 1 : 0; };
    g.result = (t) => [`The kite ends up in a palm tree. A boy goes up after it. (${Math.round(g.inT)} s)`, `It stays up, mostly. (${Math.round(g.inT)} s)`, `It hangs there like it was painted on the sky. (${Math.round(g.inT)} s)`][t];
    g.draw = (c, T) => {
      bg(c, '#a8daf4', '#e0c890', 150);
      c.fillStyle = 'rgba(255,210,58,0.25)'; c.fillRect(126, 0, 68, 150);
      c.strokeStyle = '#f4f0e6'; c.lineWidth = 1; c.beginPath(); c.moveTo(160, 160); c.quadraticCurveTo(160, 100, g.x, 46); c.stroke();
      c.fillStyle = C.red; c.beginPath(); c.moveTo(g.x, 30); c.lineTo(g.x + 12, 46); c.lineTo(g.x, 64); c.lineTo(g.x - 12, 46); c.fill();
      for (let i = 0; i < 4; i++) { c.fillStyle = [C.gold, C.green, C.red, C.gold][i]; c.fillRect(g.x - 2 + Math.sin(T * 6 + i) * 4, 66 + i * 7, 4, 4); }
      bar(c, 110, 166, 100, 8, g.t / 20, C.green);
    };
    return g;
  },
  // ---- market town: four lots, bid or pass
  auction() {
    const NAMES = ['a ship in a bottle', 'a brass compass', 'a crate of "spices"', 'a painting of a cow', 'a captain\'s hat', 'a sealed sea chest', 'a parrot (quiet)', 'a box of buttons'];
    const g = { how: '1 = bid five more, 2 = pass. The guess under each lot is roughly what it is worth.', lot: 0, profit: 0, over: false, log: [] };
    const newLot = () => { const v = Math.round(rnd(20, 90)); g.cur = { name: NAMES[Math.floor(Math.random() * NAMES.length)], v, guess: Math.round(v + rnd(-15, 15)), price: 10, them: [Math.round(v * rnd(0.6, 1.15)), Math.round(v * rnd(0.5, 1.05))], high: 'none' }; };
    newLot();
    const settle = (L, mine) => { const c = g.cur; let line;
      if (mine) { g.profit += c.v - c.price; line = `You win ${c.name} for ${c.price}. It is worth ${c.v}.`; } else line = `${c.name} goes to a local for ${c.price}. It was worth ${c.v}.`;
      g.log.unshift(line); L.say(line); if (++g.lot >= 4) g.over = true; else newLot(); };
    g.key = (code, L) => { const c = g.cur;
      if (code === 'Digit1' || code === 'Numpad1') { c.price += 5; c.high = 'you'; L.blip(0.3);
        const bidder = c.them.findIndex((m) => m >= c.price + 5); if (bidder < 0) settle(L, true); else { c.price += 5; c.high = 'them'; L.say(`A local bids ${c.price}.`); } }
      if (code === 'Digit2' || code === 'Numpad2') { settle(L, c.high === 'you'); }
    };
    g.update = () => {};
    g.tier = () => (g.profit >= 40 ? 2 : g.profit > 0 ? 1 : 0);
    g.result = (t) => [`You paid more than it was all worth. The auctioneer thanks you warmly. (${g.profit >= 0 ? '+' : ''}${g.profit})`, `A little ahead. Nobody noticed. (+${g.profit})`, `A sharp eye! The dealers glare at you over their pipes. (+${g.profit})`][t];
    g.draw = (c) => {
      bg(c, '#c89a6a', '#8a5a30', 120);
      c.fillStyle = C.dark; c.fillRect(50, 40, 220, 70); c.fillStyle = C.gold; c.fillRect(54, 44, 212, 62);
      c.fillStyle = C.dark; c.font = '10px monospace'; c.textAlign = 'center'; c.fillText(g.cur.name, 160, 70); c.fillText(`worth about ${g.cur.guess}?`, 160, 88);
      num(c, `${g.cur.price}g`, 160, 140, g.cur.high === 'you' ? C.green : C.ink); c.font = '10px monospace'; c.fillStyle = C.ink; c.fillText(g.cur.high === 'you' ? 'your bid' : g.cur.high === 'them' ? 'a local\'s bid' : 'opening', 160, 154);
      num(c, `${g.profit >= 0 ? '+' : ''}${g.profit}`, 290, 20, g.profit >= 0 ? C.green : C.red);
      for (let i = 0; i < 4; i++) { c.fillStyle = i < g.lot ? C.grey : C.dark; c.fillRect(136 + i * 12, 166, 8, 8); }
    };
    return g;
  },
  // ---- farm: coconut shy
  shy() {
    const g = { how: 'The arm swings: press Space as it points at a coconut. Five balls.', a: 0, dir: 1, balls: 5, hits: 0, nuts: [0.25, 0.5, 0.75].map((p) => ({ p, up: true, fall: 0 })), shot: null, over: false };
    g.update = (dt, L) => { g.a += g.dir * dt * (0.8 + (5 - g.balls) * 0.12); if (g.a > 1) { g.a = 1; g.dir = -1; } if (g.a < 0) { g.a = 0; g.dir = 1; }
      for (const n of g.nuts) if (!n.up) n.fall += dt; if (g.shot) { g.shot.t += dt; if (g.shot.t > 0.35) g.shot = null; }
      if (g.balls <= 0 && !g.shot) g.over = true; };
    g.key = (code, L) => { if (code !== 'Space' || g.balls <= 0 || g.shot) return; g.balls--; g.shot = { a: g.a, t: 0 };
      const n = g.nuts.find((q) => q.up && Math.abs(q.p - g.a) < 0.05); if (n) { n.up = false; g.hits++; L.blip(0.5); } else L.blip(0.2);
      if (g.nuts.every((q) => !q.up)) g.nuts.forEach((q) => { q.up = true; q.fall = 0; });
      L.say(`Coconuts down: ${g.hits}. Balls left: ${g.balls}.`); };
    g.tier = () => (g.hits >= 4 ? 2 : g.hits >= 2 ? 1 : 0);
    g.result = (t) => [`The coconuts sit there, smug. (${g.hits})`, `Two down! You may keep one. It is a coconut. (${g.hits})`, `Coconuts everywhere. The stall holder looks worried. (${g.hits})`][t];
    g.draw = (c) => {
      bg(c, '#b0dcf0', '#7ab05a', 120);
      for (const n of g.nuts) { const x = 60 + n.p * 200; c.fillStyle = C.wood; c.fillRect(x - 2, 60, 4, 60); if (n.up) { c.fillStyle = '#6a4a2a'; c.beginPath(); c.arc(x, 54, 8, 0, 6.28); c.fill(); } else { c.fillStyle = '#6a4a2a'; c.beginPath(); c.arc(x + n.fall * 30, Math.min(126, 54 + n.fall * n.fall * 300), 8, 0, 6.28); c.fill(); } }
      const ax = 60 + g.a * 200; c.strokeStyle = C.ink; c.lineWidth = 3; c.beginPath(); c.moveTo(160, 176); c.lineTo(ax, 120); c.stroke();
      if (g.shot) { const x = 60 + g.shot.a * 200, k = g.shot.t / 0.35; c.fillStyle = C.ink; c.beginPath(); c.arc(160 + (x - 160) * k, 176 - (176 - 54) * k, 3, 0, 6.28); c.fill(); }
      for (let i = 0; i < 5; i++) { c.fillStyle = i < g.balls ? C.ink : C.dark; c.beginPath(); c.arc(270 + i * 9, 166, 3, 0, 6.28); c.fill(); }
    };
    return g;
  },
  // ---- shrine: float the lanterns through the gap
  lanterns() {
    const g = { how: 'Let a lantern go with Space: the current carries it up to the rocks. It must pass the gap. Six lanterns.', gx: 160, t: 0, left: 6, through: 0, flying: [], over: false };
    g.update = (dt, L) => { g.t += dt; g.gx = 160 + Math.sin(g.t * (1.1 + (6 - g.left) * 0.08)) * 110;
      for (const f of g.flying) { f.y -= dt * 80; if (!f.judged && f.y <= 40) { f.judged = true; f.ok = Math.abs(g.gx - 160) < 22; if (f.ok) g.through++; L.say(`Through the gap: ${g.through}. Lanterns left: ${g.left}.`); } }
      g.flying = g.flying.filter((f) => f.y > -20);
      if (g.left <= 0 && !g.flying.length) g.over = true; };
    g.key = (code, L) => { if (code !== 'Space' || g.left <= 0 || g.flying.some((f) => f.y > 120)) return; g.left--; g.flying.push({ y: 160 }); L.blip(0.3); };
    g.tier = () => (g.through >= 5 ? 2 : g.through >= 3 ? 1 : 0);
    g.result = (t) => [`Most of them gutter out against the rocks. (${g.through}/6)`, `Some of them make it out to sea. (${g.through}/6)`, `A line of little lights goes out to sea, and keeps going. (${g.through}/6)`][t];
    g.draw = (c, T) => {
      bg(c, '#1a2238', '#16304e', 30);
      c.fillStyle = '#3a3a44'; c.fillRect(0, 34, W, 12); c.fillStyle = '#16304e'; c.fillRect(g.gx - 22, 34, 44, 12);
      for (const f of g.flying) { const x = 160; c.fillStyle = f.judged && !f.ok ? C.grey : C.gold; c.fillRect(x - 4, f.y - 4, 8, 8); if (!f.judged || f.ok) { c.fillStyle = 'rgba(255,210,58,0.2)'; c.beginPath(); c.arc(x, f.y, 12, 0, 6.28); c.fill(); } }
      c.fillStyle = C.wood; c.fillRect(140, 166, 40, 8);
      for (let i = 0; i < 6; i++) { c.fillStyle = i < g.left ? C.gold : C.dark; c.fillRect(250 + i * 10, 168, 6, 6); }
    };
    return g;
  },
  // ---- wreckers: arm-wrestle on the beat
  arm() {
    const g = { how: 'Push with Space on the beat (when the ring closes). Off the beat you lose your grip.', p: 0, t: 0, beat: 0.62, them: 0.17, over: false };
    g.update = (dt) => { g.t += dt; g.them = 0.17 + g.t * 0.006 + Math.sin(g.t * 1.7) * 0.05; g.p -= g.them * dt; if (g.p <= -1 || g.p >= 1 || g.t > 18) g.over = true; };
    g.key = (code, L) => { if (code !== 'Space') return; const ph = (g.t % g.beat) / g.beat, near = Math.min(ph, 1 - ph) * g.beat; if (near < 0.11) { g.p += 0.13; L.blip(0.4); } else { g.p -= 0.04; L.blip(0.15); } };
    g.tier = () => (g.p >= 1 ? 2 : g.p > 0 ? 1 : 0);
    g.result = (t) => [`Your knuckles meet the table. The wreckers cheer, for him. `, `Neither of you gives in. He shakes your hand, hard.`, `His arm goes down! The whole beach shouts.`][t];
    g.draw = (c, T) => {
      bg(c, '#3a2a22', '#5a3e24', 120);
      c.fillStyle = C.wood; c.fillRect(60, 120, 200, 10);
      const ang = -g.p * 0.9; c.save(); c.translate(160, 118); c.rotate(ang); c.fillStyle = '#d8a878'; c.fillRect(-4, -60, 8, 60); c.fillStyle = '#c89868'; c.fillRect(-7, -66, 14, 12); c.restore();
      const ph = (g.t % g.beat) / g.beat, r = 6 + (1 - ph) * 24; c.strokeStyle = C.gold; c.lineWidth = 2; c.beginPath(); c.arc(260, 50, r, 0, 6.28); c.stroke(); c.fillStyle = C.gold; c.beginPath(); c.arc(260, 50, 5, 0, 6.28); c.fill();
      bar(c, 60, 150, 200, 10, (g.p + 1) / 2, g.p >= 0 ? C.green : C.red); c.fillStyle = C.ink; c.fillRect(159, 148, 2, 14);
    };
    return g;
  },
};
