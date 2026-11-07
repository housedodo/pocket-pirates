// The local games: one per village style, played in the tavern (harbourlife.js GAMES). Each is a small canvas toy,
// a minute or less, scored 0 (nothing), 1 (a little) or 2 (well). The modal builds itself; main.js opens it as 'local'
// and forwards keys. Look: crisp, painted scenes in the game's palette (outlined shapes, soft shading, animated sea and
// sky), with feedback that feels good: sparkles, pop-up words, a little shake. Logic runs in a 320x180 space; the canvas
// is drawn at 4x (and the screen's pixel ratio) so nothing is blurry or blocky.
const W = 320, H = 180;
const C = { sea: '#2a7ab0', deep: '#174a78', foam: '#eef8fb', sand: '#ecd29a', sandD: '#c8a868', wood: '#9a6436', woodD: '#5e3a1e', dark: '#241a22', gold: '#ffd23a', goldD: '#c8901a', red: '#e0503e', redD: '#9a2a22', green: '#62cc5e', sky: '#8fd0f0', ink: '#fff6e4', grey: '#7a7680', stone: '#a89c8c', stoneD: '#6e6458', leaf: '#3aa05a', night: '#141a34' };
const rnd = (a, b) => a + Math.random() * (b - a);
const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

export class LocalGames {
  constructor(audio) {
    this.audio = audio;
    this.el = document.createElement('div'); this.el.id = 'localgame'; this.el.className = 'modal';
    this.el.innerHTML = '<div class="menu" id="lgWide"><h2 id="lgTitle"></h2><canvas id="lgCv"></canvas><p class="quote" id="lgLine"></p><button id="lgDone">Leave [E]</button></div>';
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
    this.parts = []; this.pops = []; this.shakeT = 0; this.endT = 0;
    const k = 4 * Math.min(2, window.devicePixelRatio || 1); this.k = k;
    this.cv.width = W * k; this.cv.height = H * k;
    this.el.querySelector('#lgTitle').textContent = title;
    this.g = GAMES[id](); this.say(this.g.how);
    this.el.classList.add('open');
    this.last = performance.now();
    const loop = (now) => { if (!this.el.classList.contains('open')) return; const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.step(dt); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  get active() { return this.el.classList.contains('open'); }
  say(t) { this.lineEl.textContent = t; }
  // ---- feedback
  burst(x, y, cols = [C.gold, C.ink], n = 14, sp = 70) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = sp * (0.4 + Math.random()); this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.6 + Math.random() * 0.5, t: 0, col: cols[i % cols.length], r: 1 + Math.random() * 1.6 }); } }
  pop(x, y, text, col = C.gold) { this.pops.push({ x, y, text, col, t: 0 }); }
  shake(s = 0.25) { this.shakeT = Math.max(this.shakeT, s); }
  step(dt) {
    const g = this.g, c = this.ctx; this.t += dt;
    if (this.tier == null) {
      g.update(dt, this);
      if (g.over) { this.tier = g.tier(); this.say(g.result(this.tier) + '   [E]'); this.audio && this.audio.play(this.tier ? 'treasure' : 'ui', { vol: 0.5 }); if (this.tier) for (let i = 0; i < 3; i++) this.burst(rnd(60, 260), rnd(40, 110), [C.gold, C.red, C.green, C.ink], 18, 90); }
    } else this.endT += dt;
    this.shakeT = Math.max(0, this.shakeT - dt);
    const sx = this.shakeT > 0 ? rnd(-2, 2) * this.shakeT * 6 : 0, sy = this.shakeT > 0 ? rnd(-2, 2) * this.shakeT * 6 : 0;
    c.setTransform(this.k, 0, 0, this.k, sx * this.k, sy * this.k); c.imageSmoothingEnabled = true; c.lineJoin = 'round'; c.lineCap = 'round';
    g.draw(c, this.t, this);
    // particles and pop-up words over everything
    for (const p of this.parts) { p.t += dt; p.vy += 140 * dt; p.x += p.vx * dt; p.y += p.vy * dt; const a = 1 - p.t / p.life; if (a <= 0) continue; c.globalAlpha = a; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.28); c.fill(); }
    c.globalAlpha = 1; this.parts = this.parts.filter((p) => p.t < p.life);
    for (const p of this.pops) { p.t += dt; const a = Math.min(1, 2.5 * (1 - p.t)); if (a <= 0) continue; c.globalAlpha = a; const s = 1 + 0.4 * Math.max(0, 1 - p.t * 6); txt(c, p.text, p.x, p.y - p.t * 22, 11 * s, p.col); }
    c.globalAlpha = 1; this.pops = this.pops.filter((p) => p.t < 1);
    if (this.tier != null) { const a = Math.min(0.35, this.endT); c.fillStyle = `rgba(20,14,24,${a})`; c.fillRect(-10, -10, W + 20, H + 20); txt(c, ['TRY AGAIN TOMORROW', 'NOT BAD!', 'WONDERFUL!'][this.tier], W / 2, H / 2 + 4, 20 + 3 * Math.sin(this.endT * 4) * Math.max(0, 1 - this.endT), [C.ink, C.gold, C.gold][this.tier]); }
    vignette(c);
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

// ---------------------------------------------------------------- painting helpers (all in 320x180 space)
function lin(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
function ol(c, w = 1.2) { c.lineWidth = w; c.strokeStyle = C.dark; c.stroke(); }
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function blob(c, x, y, rx, ry, col, out = true) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.28); c.fillStyle = col; c.fill(); if (out) ol(c); }
function shadow(c, x, y, rx, ry = rx * 0.3, a = 0.25) { c.fillStyle = `rgba(20,14,24,${a})`; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.28); c.fill(); }
function txt(c, s, x, y, size = 10, col = C.ink, align = 'center') {
  c.font = `900 ${size}px ${FONT}`; c.textAlign = align; c.textBaseline = 'middle';
  c.lineWidth = Math.max(2, size * 0.28); c.strokeStyle = C.dark; c.strokeText(String(s), x, y); c.fillStyle = col; c.fillText(String(s), x, y);
}
function meter(c, x, y, w, h, k, col, label) {
  rr(c, x, y, w, h, h / 2); c.fillStyle = '#3a2c36'; c.fill(); ol(c, 1.4);
  const f = Math.max(0, Math.min(1, k)); if (f > 0.01) { rr(c, x + 1.5, y + 1.5, Math.max(h - 3, (w - 3) * f), h - 3, (h - 3) / 2); c.fillStyle = lin(c, 0, y, 0, y + h, [lighten(col, 0.35), col]); c.fill(); }
  if (label) txt(c, label, x - 4, y + h / 2, 7, C.ink, 'right');
}
function pips(c, x, y, n, used, col = C.gold, r = 2.6) { for (let i = 0; i < n; i++) { c.beginPath(); c.arc(x + (i - (n - 1) / 2) * (r * 3), y, r, 0, 6.28); c.fillStyle = i < used ? '#4a3e48' : col; c.fill(); ol(c, 1); } }
function lighten(hex, k) { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, f = (v) => Math.round(v + (255 - v) * k); return `rgb(${f(r)},${f(g)},${f(b)})`; }
function vignette(c) { const g = c.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,6,16,0.45)'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20); }
function sky(c, T, top, bot, h, { sun = null, clouds = true, stars = false } = {}) {
  c.fillStyle = lin(c, 0, 0, 0, h, [top, bot]); c.fillRect(-10, -10, W + 20, h + 10);
  if (stars) for (let i = 0; i < 40; i++) { const x = (i * 73.3) % W, y = (i * 37.1) % (h - 10), tw = 0.5 + 0.5 * Math.sin(T * 2 + i); c.fillStyle = `rgba(255,248,220,${0.3 + 0.6 * tw})`; c.fillRect(x, y, 1.1, 1.1); }
  if (sun) { const g = c.createRadialGradient(sun[0], sun[1], 2, sun[0], sun[1], sun[2] * 3); g.addColorStop(0, sun[3]); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.fillRect(sun[0] - sun[2] * 3, sun[1] - sun[2] * 3, sun[2] * 6, sun[2] * 6); blob(c, sun[0], sun[1], sun[2], sun[2], sun[3], false); }
  if (clouds) for (let i = 0; i < 4; i++) { const x = ((i * 97 + T * (4 + i * 1.5)) % (W + 80)) - 40, y = 14 + (i * 23) % (h * 0.5); cloud(c, x, y, 0.7 + (i % 3) * 0.25); }
}
function cloud(c, x, y, s) { c.fillStyle = 'rgba(255,255,255,0.9)'; for (const [dx, dy, r] of [[0, 0, 7], [8, -3, 8], [17, 0, 6.5], [9, 3, 7]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, 6.28); c.fill(); } }
function sea(c, T, y, top = C.sea, bot = C.deep, crest = 'rgba(238,248,251,0.55)') {
  c.fillStyle = lin(c, 0, y, 0, H, [top, bot]); c.fillRect(-10, y, W + 20, H - y + 10);
  c.strokeStyle = crest; c.lineWidth = 1;
  for (let r = 0; r < 6; r++) { const yy = y + 5 + r * r * 3.2, amp = 0.6 + r * 0.35, sp = 8 + r * 5, len = 10 + r * 5;
    for (let x = -40 + ((T * sp + r * 31) % 40); x < W + 20; x += 40 + r * 6) { c.beginPath(); c.moveTo(x, yy); c.quadraticCurveTo(x + len / 2, yy - amp * 2, x + len, yy); c.stroke(); } }
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(-10, y, W + 20, 1.2);
}
function palm(c, x, y, s, T) { c.strokeStyle = C.woodD; c.lineWidth = 3 * s; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 6 * s, y - 20 * s, x + 3 * s, y - 34 * s); c.stroke(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.7 + Math.sin(T * 1.5 + i) * 0.06; c.beginPath(); c.moveTo(x + 3 * s, y - 34 * s); c.quadraticCurveTo(x + 3 * s + Math.cos(a) * 10 * s, y - 34 * s + Math.sin(a) * 10 * s - 4 * s, x + 3 * s + Math.cos(a) * 18 * s, y - 34 * s + Math.sin(a) * 6 * s + 6 * s); c.strokeStyle = C.leaf; c.lineWidth = 3 * s; c.stroke(); } }

const GAMES = {
  // ---- Tama: repeat the peal (belfry against a gold evening sky)
  bells() {
    const g = { how: 'Watch the peal, then ring it back on the bells: 1, 2, 3, 4.', seq: [], pos: 0, mode: 'show', t: 0, lit: -1, done: 0, len: 3, over: false, sw: [0, 0, 0, 0] };
    const grow = () => { g.seq = []; for (let i = 0; i < g.len; i++) g.seq.push(Math.floor(Math.random() * 4)); g.mode = 'show'; g.t = -0.7; g.pos = 0; g.prevLit = -1; };
    grow();
    const bx = (i) => 58 + i * 68;
    g.update = (dt, L) => {
      g.t += dt; for (let i = 0; i < 4; i++) g.sw[i] *= Math.pow(0.04, dt);
      if (g.mode === 'show') { const i = Math.floor(g.t / 0.62); const on = g.t >= 0 && g.t % 0.62 < 0.4 && i < g.seq.length; g.lit = on ? g.seq[i] : -1; if (on && g.prevLit !== i) { g.prevLit = i; g.sw[g.seq[i]] = 1; L.blip(0.3); } if (i >= g.seq.length) { g.mode = 'play'; g.lit = -1; L.say('Your turn: ring it back.'); } }
    };
    g.key = (code, L) => {
      if (g.mode !== 'play') return; const k = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[code]; if (k == null) return;
      g.sw[k] = 1; L.blip(0.4);
      if (k !== g.seq[g.pos]) { L.shake(0.35); L.pop(bx(k), 40, 'CLANG!', C.red); g.over = true; return; }
      L.burst(bx(k), 70, [C.gold, C.ink], 8, 40);
      if (++g.pos >= g.seq.length) { g.done++; L.pop(W / 2, 40, g.done >= 4 ? 'PERFECT PEAL!' : 'GOOD PEAL!', C.gold); if (g.done >= 4) { g.over = true; return; } g.len++; grow(); L.say(`Lovely. Again, one bell longer (${g.done}/4).`); }
    };
    g.tier = () => (g.done >= 3 ? 2 : g.done >= 1 ? 1 : 0);
    g.result = (t) => [`A bell rings out of turn. The ringers wince. (${g.done} peals)`, `Not bad. The tower clock almost agrees with you. (${g.done} peals)`, `A clean peal! Gulls lift off every roof. (${g.done} peals)`][t];
    g.draw = (c, T) => {
      sky(c, T, '#f6b46a', '#ffe2a8', H, { sun: [W / 2, 150, 22, '#fff1c0'], clouds: true });
      c.fillStyle = 'rgba(120,70,60,0.35)'; for (let i = 0; i < 6; i++) c.fillRect(i * 60 - 10, 140 - (i % 3) * 12, 44, 60);   // roofs far below
      // the belfry: stone with four arches
      c.fillStyle = lin(c, 0, 10, 0, 180, [C.stone, C.stoneD]); c.fillRect(-10, 10, W + 20, 180);
      for (let i = 0; i < 4; i++) { const x = bx(i); c.beginPath(); c.moveTo(x - 27, 150); c.lineTo(x - 27, 50); c.arc(x, 50, 27, Math.PI, 0); c.lineTo(x + 27, 150); c.closePath(); c.fillStyle = lin(c, 0, 20, 0, 150, ['#ffd99a', '#f7a868']); c.fill(); ol(c, 1.6); }
      c.fillStyle = C.stoneD; c.fillRect(-10, 150, W + 20, 30); c.fillStyle = '#857a6c'; c.fillRect(-10, 150, W + 20, 3);
      for (let i = 0; i < 4; i++) {
        const x = bx(i), on = g.lit === i || g.sw[i] > 0.5, ang = Math.sin(T * 14) * 0.35 * g.sw[i];
        c.save(); c.translate(x, 34); c.rotate(ang);
        c.fillStyle = C.woodD; c.fillRect(-12, -6, 24, 5); c.strokeStyle = C.dark; c.lineWidth = 1; c.strokeRect(-12, -6, 24, 5);
        c.beginPath(); c.moveTo(-6, 0); c.quadraticCurveTo(-8, 6, -14, 34); c.quadraticCurveTo(-20, 42, -22, 44); c.lineTo(22, 44); c.quadraticCurveTo(20, 42, 14, 34); c.quadraticCurveTo(8, 6, 6, 0); c.closePath();
        c.fillStyle = lin(c, -20, 0, 20, 0, on ? ['#ffe680', '#fff6c0', '#e8a820'] : ['#b8822a', '#e8b84a', '#8a5a18']); c.fill(); ol(c, 1.4);
        c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(-9, 8, 3, 22);
        blob(c, Math.sin(T * 14 + 1) * 4 * g.sw[i], 47, 3.5, 3.5, C.dark, false);
        c.restore();
        if (on) { c.strokeStyle = `rgba(255,240,160,${0.6 * Math.max(g.sw[i], g.lit === i ? 1 : 0)})`; c.lineWidth = 1.5; for (let r = 0; r < 2; r++) { c.beginPath(); c.arc(x, 60, 30 + r * 8 + (T * 30) % 8, -2.6, -0.5); c.stroke(); } }
        rr(c, x - 9, 128, 18, 16, 4); c.fillStyle = on ? C.gold : C.ink; c.fill(); ol(c, 1.2); c.font = `900 10px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.dark; c.fillText(String(i + 1), x, 136.5);
      }
      for (let i = 0; i < g.seq.length; i++) { const x = W / 2 + (i - (g.seq.length - 1) / 2) * 12; c.beginPath(); c.moveTo(x - 3.5, 170); c.quadraticCurveTo(x - 3, 162, x, 162); c.quadraticCurveTo(x + 3, 162, x + 3.5, 170); c.closePath(); c.fillStyle = g.mode === 'play' && i < g.pos ? C.green : g.mode === 'show' ? C.gold : '#c8b898'; c.fill(); ol(c, 1); }
    };
    return g;
  },
  // ---- fishing town: stop the shuttle on the torn hole (a net hung between posts over the harbour)
  nets() {
    const g = { how: 'The shuttle runs along the torn net: press Space as it crosses the glowing hole.', x: 20, v: 120, hole: 160, hits: 0, tries: 0, over: false, tied: [] };
    const next = () => { g.hole = 40 + Math.random() * 240; g.v = (g.v > 0 ? 1 : -1) * (120 + g.tries * 22); };
    next();
    g.update = (dt) => { g.x += g.v * dt; if (g.x < 22) { g.x = 22; g.v = -g.v; } if (g.x > W - 22) { g.x = W - 22; g.v = -g.v; } };
    g.key = (code, L) => { if (code !== 'Space') return; const ok = Math.abs(g.x - g.hole) < 9; if (ok) { g.hits++; g.tied.push(g.hole); L.burst(g.hole, 88, [C.ink, C.gold], 12, 50); L.pop(g.hole, 66, 'KNOT!', C.gold); } else { L.shake(0.2); L.pop(g.x, 66, 'miss', '#c8c0c8'); }
      g.tries++; L.blip(ok ? 0.45 : 0.2); L.say(`Knots tied: ${g.hits} of ${g.tries} (8 holes).`); if (g.tries >= 8) g.over = true; else next(); };
    g.tier = () => (g.hits >= 7 ? 2 : g.hits >= 4 ? 1 : 0);
    g.result = (t) => [`The net comes up with a hole you could row through. (${g.hits}/8)`, `It will hold. Probably. (${g.hits}/8)`, `The old net-menders nod at your knots. (${g.hits}/8)`][t];
    g.draw = (c, T) => {
      sky(c, T, '#7cc6ee', '#d6f0fa', 70, { sun: [262, 26, 10, '#fff8d8'] });
      sea(c, T, 70);
      // far boats
      for (let i = 0; i < 3; i++) { const x = (40 + i * 110 + T * 3) % (W + 40) - 20, y = 78 + i * 2; c.fillStyle = C.woodD; c.fillRect(x - 7, y, 14, 3); c.fillStyle = C.ink; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 10); c.lineTo(x + 6, y - 2); c.fill(); }
      // posts
      for (const x of [10, W - 10]) { c.fillStyle = lin(c, x - 4, 0, x + 4, 0, [C.wood, C.woodD]); c.fillRect(x - 4, 40, 8, 140); c.strokeStyle = C.dark; c.lineWidth = 1.2; c.strokeRect(x - 4, 40, 8, 140); }
      // the net: sagging diamond mesh
      c.strokeStyle = '#efe0b8'; c.lineWidth = 1;
      const sag = (x) => Math.sin((x / W) * Math.PI) * 10;
      for (let x = 10; x < W - 10; x += 12) { c.beginPath(); c.moveTo(x, 54 + sag(x)); c.lineTo(x + 30, 130 + sag(x + 30)); c.stroke(); c.beginPath(); c.moveTo(x + 30, 54 + sag(x + 30)); c.lineTo(x, 130 + sag(x)); c.stroke(); }
      c.strokeStyle = '#c8b080'; c.lineWidth = 2.4; c.beginPath(); for (let x = 10; x <= W - 10; x += 6) c.lineTo(x, 88 + sag(x)); c.stroke();
      // the hole: a torn gap with a pulsing ring
      const hy = 88 + sag(g.hole), pul = 1 + 0.15 * Math.sin(T * 8);
      c.fillStyle = 'rgba(23,74,120,0.9)'; c.beginPath(); c.ellipse(g.hole, hy, 10, 12, 0, 0, 6.28); c.fill();
      c.strokeStyle = C.gold; c.lineWidth = 2; c.beginPath(); c.ellipse(g.hole, hy, 12 * pul, 14 * pul, 0, 0, 6.28); c.stroke();
      for (const x of g.tied) { blob(c, x, 88 + sag(x), 3, 3, C.gold); }
      // the shuttle: a wooden netting needle trailing twine
      const sy = 88 + sag(g.x);
      c.strokeStyle = '#efe0b8'; c.lineWidth = 1; c.beginPath(); c.moveTo(g.x, sy); c.quadraticCurveTo(g.x - g.v * 0.1, sy + 14, g.x - g.v * 0.18, sy + 8); c.stroke();
      c.save(); c.translate(g.x, sy); c.beginPath(); c.moveTo(-16, 0); c.quadraticCurveTo(-10, -6, 12, -4); c.lineTo(17, 0); c.lineTo(12, 4); c.quadraticCurveTo(-10, 6, -16, 0); c.closePath(); c.fillStyle = lin(c, 0, -5, 0, 5, ['#e0a868', C.wood]); c.fill(); ol(c, 1.3); c.fillStyle = C.woodD; c.fillRect(-6, -1, 10, 2); c.restore();
      // dock planks in front
      c.fillStyle = lin(c, 0, 150, 0, 180, [C.wood, C.woodD]); c.fillRect(-10, 150, W + 20, 30); c.strokeStyle = C.dark; c.lineWidth = 1; for (let x = 0; x < W; x += 26) { c.beginPath(); c.moveTo(x, 150); c.lineTo(x, 180); c.stroke(); } c.beginPath(); c.moveTo(-10, 150); c.lineTo(W + 10, 150); c.stroke();
      pips(c, W / 2, 166, 8, g.tries, C.ink);
    };
    return g;
  },
  // ---- terraced town: skip a stone at sunset (power, then angle), three throws, the best counts
  skip() {
    const g = { how: 'Space to set the power, Space again to set the angle. Low and fast skips best. Three throws.', phase: 'power', k: 0, dir: 1, p: 0, a: 0, throws: 0, best: 0, fly: null, over: false, rings: [] };
    g.update = (dt, L) => {
      if (g.phase === 'power' || g.phase === 'angle') { g.k += g.dir * dt * (g.phase === 'power' ? 1.3 : 1.7); if (g.k > 1) { g.k = 1; g.dir = -1; } if (g.k < 0) { g.k = 0; g.dir = 1; } }
      for (const r of g.rings) r.t += dt; g.rings = g.rings.filter((r) => r.t < 1.6);
      if (g.fly) { const f = g.fly; const prev = Math.floor(f.t / 0.32); f.t += dt; const now = Math.floor(f.t / 0.32);
        if (now > prev && now <= f.n) { const x = 70 + now * 24; g.rings.push({ x, t: 0 }); L.pop(x, 100, String(now), C.ink); L.blip(0.2); }
        if (f.t > 0.3 + f.n * 0.32 + 0.3) { g.fly = null; g.throws++; if (f.n > g.best) { g.best = f.n; if (f.n >= 4) L.pop(W / 2, 40, `${f.n} SKIPS!`, C.gold); } else if (f.n === 0) L.pop(90, 100, 'plop', '#c8d8e8');
          L.say(`${f.n} skip${f.n === 1 ? '' : 's'}! Best so far: ${g.best}. (${g.throws}/3)`); if (g.throws >= 3) g.over = true; else { g.phase = 'power'; g.k = 0; } } }
    };
    g.key = (code, L) => { if (code !== 'Space') return;
      if (g.phase === 'power') { g.p = g.k; g.phase = 'angle'; g.k = 0; g.dir = 1; L.blip(0.3); }
      else if (g.phase === 'angle') { g.a = g.k; g.phase = 'fly'; const n = Math.max(0, Math.round(g.p * 9 * Math.max(0, 1 - Math.abs(g.a - 0.25) * 2.6))); g.fly = { t: 0, n }; L.blip(0.4); } };
    g.tier = () => (g.best >= 6 ? 2 : g.best >= 3 ? 1 : 0);
    g.result = (t) => [`Plop. The children on the wall laugh kindly. (best ${g.best})`, `A fair skip. A dog runs after it. (best ${g.best})`, `It skips and skips. The whole terrace counts out loud. (best ${g.best})`][t];
    g.draw = (c, T) => {
      sky(c, T, '#f28a5a', '#ffd48a', 96, { sun: [250, 88, 16, '#fff0b0'] });
      sea(c, T, 96, '#e0906a', '#3a5a8a', 'rgba(255,230,190,0.6)');
      c.fillStyle = 'rgba(255,220,150,0.35)'; for (let i = 0; i < 6; i++) c.fillRect(244 - i * 2, 100 + i * 9, 12 + i * 4, 2);   // sun path
      // terraces on the left with little houses
      for (let i = 0; i < 4; i++) { const y = 96 - i * 16, w = 92 - i * 18; c.fillStyle = lin(c, 0, y - 16, 0, y, ['#b8a07a', '#8a7458']); c.fillRect(-10, y - 16, w + 10, 16); c.strokeStyle = C.dark; c.lineWidth = 1; c.strokeRect(-10, y - 16, w + 10, 16); c.fillStyle = C.leaf; c.fillRect(-10, y - 17, w + 10, 2);
        const hx = w - 20; c.fillStyle = '#f4ead8'; c.fillRect(hx, y - 28, 12, 12); c.strokeRect(hx, y - 28, 12, 12); c.fillStyle = C.red; c.beginPath(); c.moveTo(hx - 2, y - 28); c.lineTo(hx + 6, y - 35); c.lineTo(hx + 14, y - 28); c.closePath(); c.fill(); ol(c, 1); c.fillStyle = i % 2 ? '#ffd23a' : '#4a3a44'; c.fillRect(hx + 4, y - 24, 3, 3); }
      // ripples and the stone
      for (const r of g.rings) { c.strokeStyle = `rgba(255,245,230,${0.8 * (1 - r.t / 1.6)})`; c.lineWidth = 1.2; c.beginPath(); c.ellipse(r.x, 104, 4 + r.t * 16, 1.2 + r.t * 3.5, 0, 0, 6.28); c.stroke(); }
      if (g.fly) { const f = g.fly, u = Math.min(f.t / 0.32, f.n + 0.6), x = 60 + u * 24, i = Math.floor(u), y = 102 - Math.abs(Math.sin(u * Math.PI)) * Math.max(3, 16 - i * 1.6); shadow(c, x, 104, 3, 1, 0.3); c.save(); c.translate(x, y); c.rotate(f.t * 20); blob(c, 0, 0, 3.4, 2, C.stone); c.restore(); }
      // the controls panel
      rr(c, 96, 140, 140, 32, 6); c.fillStyle = 'rgba(36,26,34,0.75)'; c.fill(); ol(c, 1.2);
      txt(c, 'POWER', 128, 150, 7, C.ink); meter(c, 104, 156, 50, 9, g.phase === 'power' ? g.k : g.p, C.gold);
      const ang = (g.phase === 'angle' ? g.k : g.a) * 1.2; txt(c, 'ANGLE', 200, 150, 7, C.ink);
      c.strokeStyle = 'rgba(98,204,94,0.9)'; c.lineWidth = 3; c.beginPath(); c.arc(184, 168, 18, -0.42, -0.18); c.stroke();
      c.strokeStyle = C.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(184, 168); c.lineTo(184 + Math.cos(ang) * 20, 168 - Math.sin(ang) * 20); c.stroke(); blob(c, 184, 168, 2, 2, C.gold);
      pips(c, 268, 160, 3, g.throws, C.stone, 3);
    };
    return g;
  },
  // ---- thatch village: keep the kite in the band over a bright beach
  kite() {
    const g = { how: 'Gusts push the kite about: hold A and D to keep it in the gold band for 20 seconds.', x: 160, v: 0, t: 0, inT: 0, gust: 0, gt: 0, over: false, was: true };
    g.update = (dt, L) => {
      g.t += dt; g.gt -= dt; if (g.gt <= 0) { g.gt = rnd(0.6, 1.8); g.gust = rnd(-1, 1) * (60 + g.t * 4); }
      const pull = (L.held.has('KeyD') || L.held.has('ArrowRight') ? 1 : 0) - (L.held.has('KeyA') || L.held.has('ArrowLeft') ? 1 : 0);
      g.v += (g.gust + pull * 150) * dt; g.v *= 1 - dt * 1.8; g.x = Math.max(14, Math.min(W - 14, g.x + g.v * dt));
      const inb = Math.abs(g.x - 160) < 34; if (inb) { g.inT += dt; if (Math.random() < dt * 6) L.parts.push({ x: g.x + rnd(-8, 8), y: 46 + rnd(-8, 8), vx: 0, vy: -10, life: 0.6, t: 0, col: C.gold, r: 1 }); }
      if (inb !== g.was) { g.was = inb; if (!inb) L.pop(g.x, 24, 'whoa!', C.ink); }
      if (g.t >= 20) g.over = true; else if (Math.floor(g.t) !== Math.floor(g.t - dt)) L.say(`In the band: ${Math.round(g.inT)} s of ${Math.round(g.t)} s.`);
    };
    g.tier = () => { const f = g.inT / 20; return f > 0.8 ? 2 : f > 0.5 ? 1 : 0; };
    g.result = (t) => [`The kite ends up in a palm tree. A boy goes up after it. (${Math.round(g.inT)} s)`, `It stays up, mostly. (${Math.round(g.inT)} s)`, `It hangs there like it was painted on the sky. (${Math.round(g.inT)} s)`][t];
    g.draw = (c, T) => {
      sky(c, T, '#5ab8ee', '#c8ecfa', 124, { sun: [40, 26, 10, '#fff8d8'] });
      sea(c, T, 124);
      c.fillStyle = lin(c, 0, 140, 0, 180, [C.sand, C.sandD]); c.beginPath(); c.moveTo(-10, 180); c.lineTo(-10, 146); c.quadraticCurveTo(160, 132, W + 10, 146); c.lineTo(W + 10, 180); c.fill();
      palm(c, 30, 160, 1.1, T); palm(c, 292, 162, 0.9, T);
      // thatched huts
      for (const [x, s] of [[70, 1], [250, 0.85]]) { c.fillStyle = '#e8d8b0'; c.fillRect(x - 10 * s, 150 - 12 * s, 20 * s, 12 * s); c.strokeStyle = C.dark; c.lineWidth = 1; c.strokeRect(x - 10 * s, 150 - 12 * s, 20 * s, 12 * s); c.fillStyle = '#c8a050'; c.beginPath(); c.moveTo(x - 15 * s, 150 - 11 * s); c.lineTo(x, 150 - 26 * s); c.lineTo(x + 15 * s, 150 - 11 * s); c.closePath(); c.fill(); ol(c, 1); }
      // the band
      const bandA = 0.18 + 0.06 * Math.sin(T * 3); c.fillStyle = `rgba(255,210,58,${bandA})`; c.fillRect(126, 0, 68, 136);
      c.setLineDash([3, 3]); c.strokeStyle = 'rgba(255,240,180,0.9)'; c.lineWidth = 1; c.beginPath(); c.moveTo(126, 0); c.lineTo(126, 136); c.moveTo(194, 0); c.lineTo(194, 136); c.stroke(); c.setLineDash([]);
      // the child holding the string
      blob(c, 160, 156, 4, 4, '#8a5a3a'); c.fillStyle = C.red; rr(c, 156, 159, 8, 10, 2); c.fill(); ol(c, 1);
      // string and kite
      const tilt = g.v * 0.004;
      c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(161, 158); c.quadraticCurveTo(165, 100, g.x, 58); c.stroke();
      // tail with bows
      c.strokeStyle = '#fff'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(g.x, 66); for (let i = 1; i <= 6; i++) c.lineTo(g.x - g.v * 0.02 * i + Math.sin(T * 7 + i) * 3, 66 + i * 6); c.stroke();
      for (let i = 1; i <= 6; i++) { const bxx = g.x - g.v * 0.02 * i + Math.sin(T * 7 + i) * 3, by = 66 + i * 6; c.fillStyle = [C.gold, C.green, C.red][i % 3]; c.beginPath(); c.moveTo(bxx - 3, by - 2); c.lineTo(bxx + 3, by + 2); c.lineTo(bxx + 3, by - 2); c.lineTo(bxx - 3, by + 2); c.closePath(); c.fill(); }
      c.save(); c.translate(g.x, 46); c.rotate(tilt);
      c.beginPath(); c.moveTo(0, -18); c.lineTo(13, -2); c.lineTo(0, 20); c.lineTo(-13, -2); c.closePath(); c.fillStyle = C.red; c.fill();
      c.beginPath(); c.moveTo(0, -18); c.lineTo(13, -2); c.lineTo(0, -2); c.closePath(); c.fillStyle = C.gold; c.fill(); c.beginPath(); c.moveTo(0, -2); c.lineTo(-13, -2); c.lineTo(0, 20); c.closePath(); c.fillStyle = C.gold; c.fill();
      c.beginPath(); c.moveTo(0, -18); c.lineTo(13, -2); c.lineTo(0, 20); c.lineTo(-13, -2); c.closePath(); ol(c, 1.4);
      c.strokeStyle = C.woodD; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -18); c.lineTo(0, 20); c.moveTo(-13, -2); c.lineTo(13, -2); c.stroke(); c.restore();
      meter(c, 110, 170, 100, 7, g.t / 20, C.green);
    };
    return g;
  },
  // ---- market town: four lots under a striped awning, bid or pass
  auction() {
    const LOTS = [['a ship in a bottle', 'bottle'], ['a brass compass', 'compass'], ['a crate of "spices"', 'crate'], ['a painting of a cow', 'frame'], ['a captain\'s hat', 'hat'], ['a sealed sea chest', 'chest'], ['a parrot (quiet)', 'parrot'], ['a box of buttons', 'crate']];
    const g = { how: '1 = bid five more, 2 = pass. The guess under each lot is roughly what it is worth.', lot: 0, profit: 0, over: false, bump: 0, who: -1 };
    const newLot = () => { const v = Math.round(rnd(20, 90)), L0 = LOTS[Math.floor(Math.random() * LOTS.length)]; g.cur = { name: L0[0], icon: L0[1], v, guess: Math.round(v + rnd(-15, 15)), price: 10, them: [Math.round(v * rnd(0.6, 1.15)), Math.round(v * rnd(0.5, 1.05))], high: 'none' }; g.slide = 1; };
    newLot();
    const settle = (L, mine) => { const c = g.cur; let line;
      if (mine) { const d = c.v - c.price; g.profit += d; line = `You win ${c.name} for ${c.price}. It is worth ${c.v}.`; L.pop(160, 64, `SOLD! ${d >= 0 ? '+' : ''}${d}`, d >= 0 ? C.green : C.red); if (d > 0) L.burst(160, 80, [C.gold, C.ink], 16); else L.shake(0.2); }
      else { line = `${c.name} goes to a local for ${c.price}. It was worth ${c.v}.`; L.pop(160, 64, 'GONE!', C.ink); }
      L.say(line); if (++g.lot >= 4) g.over = true; else newLot(); };
    g.update = (dt) => { g.bump = Math.max(0, g.bump - dt * 3); g.slide = Math.max(0, (g.slide || 0) - dt * 3); };
    g.key = (code, L) => { const c = g.cur;
      if (code === 'Digit1' || code === 'Numpad1') { c.price += 5; c.high = 'you'; g.who = 2; g.bump = 1; L.blip(0.3);
        const bidder = c.them.findIndex((m) => m >= c.price + 5); if (bidder < 0) settle(L, true); else { c.price += 5; c.high = 'them'; g.who = bidder; L.say(`A local bids ${c.price}.`); } }
      if (code === 'Digit2' || code === 'Numpad2') settle(L, c.high === 'you');
    };
    g.tier = () => (g.profit >= 40 ? 2 : g.profit > 0 ? 1 : 0);
    g.result = (t) => [`You paid more than it was all worth. The auctioneer thanks you warmly. (${g.profit >= 0 ? '+' : ''}${g.profit})`, `A little ahead. Nobody noticed. (+${g.profit})`, `A sharp eye! The dealers glare at you over their pipes. (+${g.profit})`][t];
    const icon = (c, k, x, y) => {
      if (k === 'bottle') { rr(c, x - 7, y - 10, 14, 20, 5); c.fillStyle = 'rgba(160,220,200,0.8)'; c.fill(); ol(c); c.fillStyle = C.wood; c.fillRect(x - 3, y - 14, 6, 5); c.fillStyle = C.woodD; c.fillRect(x - 5, y + 2, 10, 3); c.fillStyle = C.ink; c.beginPath(); c.moveTo(x, y + 2); c.lineTo(x, y - 6); c.lineTo(x + 4, y + 1); c.fill(); }
      else if (k === 'compass') { blob(c, x, y, 11, 11, C.goldD); blob(c, x, y, 8, 8, C.ink); c.fillStyle = C.red; c.beginPath(); c.moveTo(x, y - 7); c.lineTo(x + 2, y); c.lineTo(x - 2, y); c.fill(); }
      else if (k === 'frame') { c.fillStyle = C.goldD; c.fillRect(x - 13, y - 10, 26, 20); c.strokeStyle = C.dark; c.strokeRect(x - 13, y - 10, 26, 20); c.fillStyle = '#a8d8a0'; c.fillRect(x - 10, y - 7, 20, 14); blob(c, x, y + 1, 6, 3.5, C.ink, false); c.fillStyle = C.dark; c.fillRect(x - 2, y, 3, 2); }
      else if (k === 'hat') { c.fillStyle = '#2a2a3a'; c.beginPath(); c.moveTo(x - 15, y + 4); c.quadraticCurveTo(x, y - 18, x + 15, y + 4); c.closePath(); c.fill(); ol(c); c.fillStyle = C.ink; c.beginPath(); c.arc(x, y - 3, 2.5, 0, 6.28); c.fill(); }
      else if (k === 'parrot') { blob(c, x, y, 7, 10, C.green); blob(c, x, y - 9, 6, 6, C.red); c.fillStyle = C.gold; c.beginPath(); c.moveTo(x + 4, y - 9); c.lineTo(x + 9, y - 7); c.lineTo(x + 4, y - 6); c.fill(); blob(c, x + 2, y - 10, 1, 1, C.dark, false); }
      else { c.fillStyle = lin(c, 0, y - 10, 0, y + 10, ['#c88a4a', C.wood]); c.fillRect(x - 13, y - 10, 26, 20); c.strokeStyle = C.dark; c.lineWidth = 1.2; c.strokeRect(x - 13, y - 10, 26, 20); c.beginPath(); c.moveTo(x - 13, y - 3); c.lineTo(x + 13, y - 3); c.stroke(); if (k === 'chest') { c.fillStyle = C.gold; c.fillRect(x - 2, y - 5, 4, 5); } }
    };
    g.draw = (c, T) => {
      c.fillStyle = lin(c, 0, 0, 0, H, ['#f0d8a8', '#c89a6a']); c.fillRect(-10, -10, W + 20, H + 20);
      // awning stripes with a scalloped edge
      for (let i = 0; i < 14; i++) { c.fillStyle = i % 2 ? '#f4ead8' : C.red; c.fillRect(i * 24 - 8, -4, 24, 30); }
      for (let i = 0; i < 14; i++) { c.fillStyle = i % 2 ? '#f4ead8' : C.red; c.beginPath(); c.arc(i * 24 + 4, 26, 12, 0, Math.PI); c.fill(); }
      c.strokeStyle = C.dark; c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i < 14; i++) c.arc(i * 24 + 4, 26, 12, Math.PI, 0, true); c.stroke();
      // the bidders: two locals and you
      const heads = [[48, '#c8885a', '#3a5a8a'], [92, '#8a5a3a', '#6a3a6a'], [272, '#e0aa80', C.red]];
      heads.forEach(([x, skin, coat], i) => { const lift = g.who === i ? Math.max(0, g.bump) * 6 : 0; c.fillStyle = coat; rr(c, x - 14, 120, 28, 40, 10); c.fill(); ol(c); blob(c, x, 108, 10, 11, skin); blob(c, x - 3, 106, 1.3, 1.3, C.dark, false); blob(c, x + 3, 106, 1.3, 1.3, C.dark, false);
        if (g.who === i && g.bump > 0) { c.fillStyle = C.ink; rr(c, x + 6, 80 - lift, 12, 16, 2); c.fill(); ol(c); c.strokeStyle = C.dark; c.beginPath(); c.moveTo(x + 10, 96 - lift); c.lineTo(x + 8, 116); c.stroke(); }
        if (i === 2) txt(c, 'YOU', x, 166, 7, C.gold); });
      // the counter and the lot
      c.fillStyle = lin(c, 0, 130, 0, 180, [C.wood, C.woodD]); c.fillRect(-10, 150, W + 20, 40); c.strokeStyle = C.dark; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-10, 150); c.lineTo(W + 10, 150); c.stroke();
      const ox = (g.slide || 0) * 160;
      c.save(); c.translate(ox, 0);
      shadow(c, 160, 132, 46, 6); rr(c, 112, 46, 96, 82, 6); c.fillStyle = '#fff6e0'; c.fill(); ol(c, 1.5);
      icon(c, g.cur.icon, 160, 72);
      c.font = `700 8px ${FONT}`; c.textAlign = 'center'; c.fillStyle = C.dark; c.fillText(g.cur.name, 160, 98); c.fillStyle = '#8a6a4a'; c.fillText(`worth about ${g.cur.guess}?`, 160, 110);
      c.restore();
      // price on a chalkboard
      rr(c, 128, 132, 64, 22, 3); c.fillStyle = '#2e3a34'; c.fill(); ol(c, 1.3); txt(c, `${g.cur.price}g`, 160, 143, 12 + g.bump * 3, g.cur.high === 'you' ? C.green : C.ink);
      txt(c, `${g.profit >= 0 ? '+' : ''}${g.profit}g`, 300, 46, 10, g.profit >= 0 ? C.green : C.red, 'right');
      pips(c, 160, 170, 4, g.lot, C.gold);
      txt(c, '1 = BID    2 = PASS', 46, 172, 7, C.ink);
    };
    return g;
  },
  // ---- farm: coconut shy at the fair
  shy() {
    const g = { how: 'The arm swings: press Space as it points at a coconut. Five balls.', a: 0, dir: 1, balls: 5, hits: 0, nuts: [0.25, 0.5, 0.75].map((p) => ({ p, up: true, fall: 0 })), shot: null, over: false };
    g.update = (dt, L) => { g.a += g.dir * dt * (0.8 + (5 - g.balls) * 0.12); if (g.a > 1) { g.a = 1; g.dir = -1; } if (g.a < 0) { g.a = 0; g.dir = 1; }
      for (const n of g.nuts) if (!n.up) n.fall += dt; if (g.shot) { g.shot.t += dt; if (g.shot.t > 0.35) { if (g.shot.hit) { L.burst(g.shot.x, 54, ['#8a5a30', C.ink, C.gold], 14); L.pop(g.shot.x, 34, 'BONK!', C.gold); L.shake(0.15); } else L.pop(g.shot.x, 40, 'miss', '#e8e0d0'); g.shot = null; } }
      if (g.balls <= 0 && !g.shot) g.over = true; };
    g.key = (code, L) => { if (code !== 'Space' || g.balls <= 0 || g.shot) return; g.balls--;
      const n = g.nuts.find((q) => q.up && Math.abs(q.p - g.a) < 0.05); g.shot = { a: g.a, t: 0, x: 60 + g.a * 200, hit: !!n };
      if (n) { n.up = false; g.hits++; L.blip(0.5); } else L.blip(0.2);
      if (g.nuts.every((q) => !q.up)) setTimeout(() => g.nuts.forEach((q) => { q.up = true; q.fall = 0; }), 700);
      L.say(`Coconuts down: ${g.hits}. Balls left: ${g.balls}.`); };
    g.tier = () => (g.hits >= 4 ? 2 : g.hits >= 2 ? 1 : 0);
    g.result = (t) => [`The coconuts sit there, smug. (${g.hits})`, `Two down! You may keep one. It is a coconut. (${g.hits})`, `Coconuts everywhere. The stall holder looks worried. (${g.hits})`][t];
    const nut = (c, x, y, rot = 0) => { c.save(); c.translate(x, y); c.rotate(rot); blob(c, 0, 0, 8, 7.5, '#7a4e2a'); c.fillStyle = '#5a3418'; for (let i = 0; i < 7; i++) c.fillRect(-6 + (i * 13) % 11, -5 + (i * 7) % 9, 1.5, 1); blob(c, -2, -3, 1.2, 1.2, '#3a2010', false); blob(c, 2, -3, 1.2, 1.2, '#3a2010', false); blob(c, 0, 0, 1.2, 1.2, '#3a2010', false); c.restore(); };
    g.draw = (c, T) => {
      sky(c, T, '#6ac0ee', '#d0f0fa', 120, { sun: [280, 24, 10, '#fff8d8'] });
      c.fillStyle = '#7cc05a'; c.beginPath(); c.moveTo(-10, 120); c.quadraticCurveTo(80, 104, 160, 116); c.quadraticCurveTo(250, 126, W + 10, 110); c.lineTo(W + 10, 190); c.lineTo(-10, 190); c.fill();
      // bunting
      for (let i = 0; i < 16; i++) { const x = i * 21, y = 8 + Math.sin(i * 0.4) * 3; c.fillStyle = [C.red, C.gold, C.green, '#3c78c8'][i % 4]; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 14, y); c.lineTo(x + 7, y + 10); c.closePath(); c.fill(); ol(c, 1); }
      // the stall back and posts
      rr(c, 30, 26, 260, 70, 6); c.fillStyle = 'rgba(244,234,216,0.8)'; c.fill(); ol(c, 1.2);
      for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? 'rgba(224,80,62,0.25)' : 'rgba(255,255,255,0)'; c.fillRect(30 + i * 26, 26, 26, 70); }
      for (const n of g.nuts) { const x = 60 + n.p * 200; c.fillStyle = lin(c, x - 3, 0, x + 3, 0, ['#c8a070', C.woodD]); c.fillRect(x - 3, 62, 6, 64); c.strokeStyle = C.dark; c.lineWidth = 1; c.strokeRect(x - 3, 62, 6, 64); c.fillStyle = C.wood; c.fillRect(x - 7, 60, 14, 4); c.strokeRect(x - 7, 60, 14, 4);
        if (n.up) nut(c, x, 52); else nut(c, x + n.fall * 40, Math.min(150, 52 + n.fall * n.fall * 320), n.fall * 9); }
      // the aiming arm (your arm, from the bottom)
      const ax = 60 + g.a * 200, ang = Math.atan2(120 - 190, ax - 160);
      c.save(); c.translate(160, 196); c.rotate(ang + Math.PI / 2);
      rr(c, -7, -66, 14, 70, 6); c.fillStyle = lin(c, -7, 0, 7, 0, ['#f0c8a0', '#c8946a']); c.fill(); ol(c, 1.4);
      c.fillStyle = '#3c78c8'; rr(c, -9, -24, 18, 30, 5); c.fill(); ol(c, 1.2);
      if (!g.shot && g.balls > 0) { blob(c, 0, -70, 6, 6, C.ink); }
      c.restore();
      // aim line
      c.setLineDash([2, 4]); c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(160, 130); c.lineTo(ax, 56); c.stroke(); c.setLineDash([]);
      if (g.shot) { const k = g.shot.t / 0.35, x = 160 + (g.shot.x - 160) * k, y = 130 - (130 - 52) * k - Math.sin(k * Math.PI) * 14; shadow(c, x, 150, 4 * (1 - k * 0.5), 1.4); blob(c, x, y, 5 - k * 2, 5 - k * 2, C.ink); }
      for (let i = 0; i < 5; i++) blob(c, 262 + i * 11, 166, 4, 4, i < g.balls ? C.ink : '#5a6a50');
    };
    return g;
  },
  // ---- shrine: float glowing lanterns out through a gap in the rocks, under the moon
  lanterns() {
    const g = { how: 'Let a lantern go with Space: the current carries it up to the rocks. It must pass the gap. Six lanterns.', gx: 160, t: 0, left: 6, through: 0, flying: [], out: [], over: false };
    g.update = (dt, L) => { g.t += dt; g.gx = 160 + Math.sin(g.t * (1.1 + (6 - g.left) * 0.08)) * 110;
      for (const f of g.flying) { f.y -= dt * 80; f.x = 160 + Math.sin(f.y * 0.08) * 3; if (!f.judged && f.y <= 52) { f.judged = true; f.ok = Math.abs(g.gx - 160) < 22; if (f.ok) { g.through++; g.out.push({ x: 160, y: 40, s: 1 }); L.burst(160, 50, [C.gold, '#ffb060'], 10, 40); L.pop(160, 70, 'THROUGH!', C.gold); } else { L.shake(0.15); L.pop(160, 70, 'out...', '#a8a0b8'); } L.say(`Through the gap: ${g.through}. Lanterns left: ${g.left}.`); } }
      g.flying = g.flying.filter((f) => !f.judged);
      for (const o of g.out) { o.y -= dt * 6; o.s = Math.max(0.25, o.s - dt * 0.12); o.x += Math.sin(g.t + o.y) * dt * 4; }
      if (g.left <= 0 && !g.flying.length) g.over = true; };
    g.key = (code, L) => { if (code !== 'Space' || g.left <= 0 || g.flying.some((f) => f.y > 120)) return; g.left--; g.flying.push({ y: 160, x: 160 }); L.blip(0.3); };
    g.tier = () => (g.through >= 5 ? 2 : g.through >= 3 ? 1 : 0);
    g.result = (t) => [`Most of them gutter out against the rocks. (${g.through}/6)`, `Some of them make it out to sea. (${g.through}/6)`, `A line of little lights goes out to sea, and keeps going. (${g.through}/6)`][t];
    const lantern = (c, x, y, s, a = 1) => {
      const gl = c.createRadialGradient(x, y, 1, x, y, 18 * s); gl.addColorStop(0, `rgba(255,200,90,${0.55 * a})`); gl.addColorStop(1, 'rgba(255,160,60,0)'); c.fillStyle = gl; c.fillRect(x - 18 * s, y - 18 * s, 36 * s, 36 * s);
      c.globalAlpha = a; rr(c, x - 5 * s, y - 6 * s, 10 * s, 12 * s, 3 * s); c.fillStyle = lin(c, 0, y - 6 * s, 0, y + 6 * s, ['#fff0b0', '#ffb050']); c.fill(); ol(c, 1 * s);
      c.fillStyle = C.red; c.fillRect(x - 5.5 * s, y - 7 * s, 11 * s, 2 * s); c.fillRect(x - 5.5 * s, y + 5 * s, 11 * s, 2 * s); c.globalAlpha = 1; };
    g.draw = (c, T) => {
      sky(c, T, '#0c1028', '#2a3460', 40, { sun: [262, 16, 7, '#f4f0d8'], clouds: false, stars: true });
      sea(c, T, 40, '#1e3a68', '#0c1a34', 'rgba(200,220,255,0.3)');
      c.fillStyle = 'rgba(244,240,216,0.25)'; for (let i = 0; i < 8; i++) c.fillRect(254 - i, 46 + i * 12, 16 + i * 2, 1.5);   // moon path
      for (const o of g.out) lantern(c, o.x, o.y, o.s, 0.9);
      // the rocks with the moving gap
      c.fillStyle = '#2a2a3a';
      const rock = (x0, x1) => { if (x1 <= x0) return; c.beginPath(); c.moveTo(x0, 60); for (let x = x0; x <= x1; x += 8) c.lineTo(x, 46 + Math.sin(x * 0.7) * 3 + ((x * 13) % 5)); c.lineTo(x1, 60); c.closePath(); c.fillStyle = lin(c, 0, 44, 0, 60, ['#4a4a5e', '#1e1e2a']); c.fill(); ol(c, 1.2); };
      rock(-10, g.gx - 22); rock(g.gx + 22, W + 10);
      c.strokeStyle = 'rgba(255,210,120,0.35)'; c.lineWidth = 1; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(g.gx - 22, 48); c.lineTo(g.gx - 22, 62); c.moveTo(g.gx + 22, 48); c.lineTo(g.gx + 22, 62); c.stroke(); c.setLineDash([]);
      // the lane the current takes
      c.strokeStyle = 'rgba(200,220,255,0.12)'; c.lineWidth = 14; c.beginPath(); c.moveTo(160, 160); c.lineTo(160, 56); c.stroke();
      for (const f of g.flying) lantern(c, f.x, f.y, 1);
      // the shrine steps at the water
      c.fillStyle = lin(c, 0, 158, 0, 180, ['#6a5e6e', '#3a3240']); c.fillRect(120, 160, 80, 20); c.strokeStyle = C.dark; c.lineWidth = 1.2; c.strokeRect(120, 160, 80, 20); c.fillRect(132, 170, 56, 10);
      for (const x of [112, 208]) { c.fillStyle = C.red; c.fillRect(x - 2, 132, 4, 30); c.strokeRect(x - 2, 132, 4, 30); }
      c.fillStyle = C.red; c.fillRect(106, 130, 108, 4); c.strokeRect(106, 130, 108, 4);
      if (g.left > 0 && !g.flying.some((f) => f.y > 120)) lantern(c, 160, 152, 0.9, 0.6 + 0.4 * Math.sin(T * 4));
      for (let i = 0; i < 6; i++) lantern(c, 252 + i * 10, 168, 0.5, i < g.left ? 1 : 0.25);
    };
    return g;
  },
  // ---- wreckers: arm-wrestle on the beat, at a lamplit table
  arm() {
    const g = { how: 'Push with Space on the beat (when the ring closes). Off the beat you lose your grip.', p: 0, t: 0, beat: 0.62, them: 0.17, over: false, hit: 0 };
    g.update = (dt) => { g.t += dt; g.hit = Math.max(0, g.hit - dt * 4); g.them = 0.17 + g.t * 0.006 + Math.sin(g.t * 1.7) * 0.05; g.p -= g.them * dt; if (g.p <= -1 || g.p >= 1 || g.t > 18) g.over = true; };
    g.key = (code, L) => { if (code !== 'Space') return; const ph = (g.t % g.beat) / g.beat, near = Math.min(ph, 1 - ph) * g.beat;
      if (near < 0.11) { g.p += 0.13; g.hit = 1; L.blip(0.4); L.burst(160, 86, [C.gold, C.ink], 6, 40); L.pop(160 + rnd(-20, 20), 60, ['HUP!', 'HEAVE!', 'YES!'][Math.floor(Math.random() * 3)], C.gold); L.shake(0.08); }
      else { g.p -= 0.04; L.blip(0.15); L.pop(160, 60, 'slip', '#c8b8a8'); } };
    g.tier = () => (g.p >= 1 ? 2 : g.p > 0 ? 1 : 0);
    g.result = (t) => [`Your knuckles meet the table. The wreckers cheer, for him.`, `Neither of you gives in. He shakes your hand, hard.`, `His arm goes down! The whole beach shouts.`][t];
    g.draw = (c, T) => {
      c.fillStyle = lin(c, 0, 0, 0, H, ['#2a1c1e', '#4a2e22']); c.fillRect(-10, -10, W + 20, H + 20);
      // the lamp glow and the crowd behind
      const gl = c.createRadialGradient(160, 30, 4, 160, 30, 150); gl.addColorStop(0, 'rgba(255,190,90,0.55)'); gl.addColorStop(1, 'rgba(255,150,60,0)'); c.fillStyle = gl; c.fillRect(-10, -10, W + 20, H + 20);
      c.strokeStyle = C.dark; c.lineWidth = 1; c.beginPath(); c.moveTo(160, -5); c.lineTo(160, 18); c.stroke(); rr(c, 153, 18, 14, 14, 3); c.fillStyle = '#ffd890'; c.fill(); ol(c, 1.2);
      for (let i = 0; i < 9; i++) { const x = 18 + i * 36, y = 70 + (i % 2) * 6 + Math.sin(T * 6 + i) * (g.hit * 2 + 0.6); c.fillStyle = 'rgba(30,18,22,0.8)'; c.beginPath(); c.arc(x, y, 11, 0, 6.28); c.fill(); c.fillRect(x - 14, y + 8, 28, 40); if (g.hit > 0.3 && i % 3 === 0) { c.fillRect(x - 16, y - 18, 4, 16); } }
      // the table
      c.fillStyle = lin(c, 0, 100, 0, 130, ['#b07a46', '#6e4426']); c.beginPath(); c.moveTo(20, 104); c.lineTo(300, 104); c.lineTo(320, 136); c.lineTo(0, 136); c.closePath(); c.fill(); ol(c, 1.4);
      c.fillStyle = C.woodD; c.fillRect(0, 136, W, 50); c.strokeStyle = C.dark; c.strokeRect(-1, 136, W + 2, 50);
      // two forearms meeting at the elbow pads, tilted by the score
      const ang = g.p * 0.85;
      c.save(); c.translate(160, 112); c.rotate(ang);
      // his arm (from the left, dark sleeve) and yours (from the right, blue sleeve)
      const arm = (side, skin, sleeve) => { c.save(); c.scale(side, 1); c.beginPath(); c.moveTo(60, 8); c.quadraticCurveTo(30, 4, 8, -36); c.lineTo(0, -40); c.lineTo(-4, -34); c.quadraticCurveTo(18, 4, 48, 18); c.closePath(); c.fillStyle = lin(c, 0, -40, 0, 18, [skin, lighten(skin, -0.0)]); c.fill(); ol(c, 1.4);
        c.beginPath(); c.moveTo(66, 4); c.lineTo(48, 22); c.lineTo(80, 30); c.lineTo(84, 10); c.closePath(); c.fillStyle = sleeve; c.fill(); ol(c, 1.2); c.restore(); };
      arm(-1, '#b8784a', '#4a3a2a'); arm(1, '#f0c8a0', '#3c78c8');
      blob(c, 0, -40, 9, 8, '#d8a070'); c.strokeStyle = C.dark; c.lineWidth = 1; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(-6, -40 + i * 3); c.lineTo(6, -40 + i * 3); c.stroke(); }
      c.restore();
      // the beat ring
      const ph = (g.t % g.beat) / g.beat, r = 6 + (1 - ph) * 22; c.strokeStyle = C.gold; c.lineWidth = 2; c.beginPath(); c.arc(276, 40, r, 0, 6.28); c.stroke(); blob(c, 276, 40, 6 + g.hit * 3, 6 + g.hit * 3, C.gold); txt(c, 'BEAT', 276, 70, 7, C.ink);
      // the tug meter: his side red, yours green
      rr(c, 60, 152, 200, 12, 6); c.fillStyle = '#3a2c36'; c.fill(); ol(c, 1.4);
      const f = (g.p + 1) / 2; rr(c, 61.5, 153.5, Math.max(9, 197 * f), 9, 4.5); c.fillStyle = g.p >= 0 ? C.green : C.red; c.fill();
      c.fillStyle = C.ink; c.fillRect(159, 148, 2, 20); txt(c, 'HIM', 46, 158, 7, C.red); txt(c, 'YOU', 274, 158, 7, C.green);
    };
    return g;
  },
};
