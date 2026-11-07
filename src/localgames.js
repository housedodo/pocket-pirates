// The local games: one per village style, played in the tavern (harbourlife.js GAMES). Each is a small 3D scene built
// like the rest of the world (Builder meshes, the PS1 materials, the real ocean) and drawn by the game's own renderer and
// post effects, so it looks like the boat and the islands. A thin 2D layer on top carries only the meters, the counters
// and the pop-up words. Each game is scored 0 (nothing), 1 (a little) or 2 (well).
// main.js opens it as the 'local' modal, forwards keys, and while it is open renders localGames.render(post) instead of the world.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats, U } from './psx.js';
import { Ocean } from './ocean.js';
import { villager } from './world.js';
import { mulberry32 } from './util.js';

const W = 320, H = 180;                 // the HUD's logical space
const OX = 40000, OZ = 40000;            // the games are staged far out at sea, away from every island
const C = { dark: '#241a22', gold: '#ffd23a', red: '#e0503e', green: '#62cc5e', ink: '#fff6e4', grey: '#7a7680' };
const rnd = (a, b) => a + Math.random() * (b - a);
const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

// ---------------------------------------------------------------- building helpers
function mesh(fn, mat = mats.props) { const B = new Builder(); fn(B); const m = new THREE.Mesh(B.geometry(), mat); m.frustumCulled = false; return m; }
const glowMat = () => mats.glow;
function palm(B, x, y, z, s = 1, seed = 1) {
  B.push(x, y, z, seed, s);
  for (let i = 0; i < 6; i++) B.cyl(Math.sin(i * 0.5) * 0.18 * i, i * 0.9, 0, 0.24 - i * 0.02, 0.22 - i * 0.02, 0.9, 5, '#8a6236', TILE.bark, false);
  const tx = Math.sin(3) * 0.9, ty = 5.4;
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, ex = tx + Math.cos(a) * 2.6, ez = Math.sin(a) * 2.6; B.tri([tx, ty, 0], [ex, ty - 1.2, ez], [tx + Math.cos(a + 0.35) * 1.4, ty - 0.2, Math.sin(a + 0.35) * 1.4], '#3a9a48', TILE.leaf); B.tri([tx, ty, 0], [tx + Math.cos(a - 0.35) * 1.4, ty - 0.2, Math.sin(a - 0.35) * 1.4], [ex, ty - 1.2, ez], '#2e8a3e', TILE.leaf); }
  B.blob(tx, ty - 0.2, 0, 0.35, 0.3, 0.35, '#5a3a1c', TILE.bark, 0.2, 3);
  B.pop();
}
function hut(B, x, z, ry, s = 1, thatch = true) {
  B.push(x, 0, z, ry, s);
  B.box(0, 0, 0, 3.2, 2.2, 2.6, '#e8dcc0', TILE.wall); B.box(0, 0, 1.31, 0.8, 1.4, 0.05, '#5a3a24', TILE.planks);
  B.gable(0, 2.2, 0, 3.8, 1.8, 3.2, thatch ? '#c8a050' : '#b84a32', thatch ? TILE.rope : TILE.roof, '#e8dcc0');
  B.pop();
}
function boat(B, x, z, ry, sail = '#f4ecd0') {
  B.push(x, 0, z, ry);
  B.box(0, -0.2, 0, 1.4, 0.6, 3.6, '#9a6a3a', TILE.planks); B.box(0, 0.38, 0, 1.0, 0.05, 3.0, '#6b4a2e', TILE.planks);
  B.box(0, 0.4, 0.2, 0.1, 3.2, 0.1, '#5a3a1c', TILE.bark); B.tri([0, 3.5, 0.2], [0, 0.8, 0.2], [0, 0.9, -1.6], sail, TILE.sail);
  B.pop();
}
function islandBlob(B, x, z, r, h = 3, green = true) { B.blob(x, -0.6, z, r, h * 0.5, r * 0.8, '#e8d098', TILE.sand, 0.12, x); if (green) B.blob(x, h * 0.3, z, r * 0.7, h * 0.55, r * 0.55, '#4aa04e', TILE.leaf, 0.25, z); }
function ring(B, r, n, col, w = 0.18) { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; B.push(Math.cos(a) * r, 0, Math.sin(a) * r, -a); B.box(0, 0, 0, w, 0.06, (Math.PI * 2 * r) / n * 0.8, col, TILE.white); B.pop(); } }

export class LocalGames {
  constructor(audio) {
    this.audio = audio;
    this.el = document.createElement('div'); this.el.id = 'localgame'; this.el.className = 'modal';
    this.el.innerHTML = '<h2 id="lgTitle"></h2><canvas id="lgHud"></canvas><div id="lgFoot"><p id="lgLine"></p><button id="lgDone">Leave [E]</button></div>';
    document.body.appendChild(this.el);
    this.cv = this.el.querySelector('#lgHud'); this.ctx = this.cv.getContext('2d');
    this.lineEl = this.el.querySelector('#lgLine');
    this.el.querySelector('#lgDone').addEventListener('click', () => this.finish());
    this.held = new Set();
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    this.cv.addEventListener('pointerdown', () => this.key('Space'));
    this.cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 900);
    this.view = null;
  }
  /** id: game id, title, onDone(tier, finished) when the player leaves */
  open(id, title, onDone) {
    this.id = id; this.onDone = onDone; this.tier = null; this.t = 0; this.held.clear();
    this.parts = []; this.pops = []; this.shakeT = 0; this.endT = 0;
    this.el.querySelector('#lgTitle').textContent = title;
    if (this.view) this.dispose();
    this.g = GAMES[id]();
    this.view = this.stage(this.g);
    this.say(this.g.how);
    this.el.classList.add('open'); document.body.classList.add('minigame');
    this.last = performance.now();
    const loop = (now) => { if (!this.active) return; const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.step(dt); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  /** a fresh scene for the game: sky colour, fog, the ocean, then whatever the game builds */
  stage(g) {
    const L = g.look || {}, scene = new THREE.Scene(), root = new THREE.Group();
    scene.background = new THREE.Color(L.sky || '#8fd0f0');
    scene.fog = new THREE.Fog(L.fog || L.sky || '#bfeaff', L.near || 60, L.far || 320);
    root.position.set(OX, L.y || 0, OZ); scene.add(root);
    let ocean = null; if (L.ocean !== false) { ocean = new Ocean(); scene.add(ocean.mesh); }
    g.build(root, this);
    return { scene, root, ocean, look: L };
  }
  dispose() { this.view.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.view = null; }
  get active() { return this.el.classList.contains('open'); }
  say(t) { this.lineEl.textContent = t; }
  /** a point in the game's local 3D space -> the HUD's 320x180 space */
  at(x, y, z) { const v = new THREE.Vector3(OX + x, (this.view.look.y || 0) + y, OZ + z).project(this.cam); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H }; }
  aim(px, py, pz, lx, ly, lz) { const y0 = this.view.look.y || 0; this.cam.position.set(OX + px, y0 + py, OZ + pz); this.cam.lookAt(OX + lx, y0 + ly, OZ + lz); this.cam.updateMatrixWorld(); }
  // ---- feedback (HUD space)
  burst(x, y, cols = [C.gold, C.ink], n = 14, sp = 70) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = sp * (0.4 + Math.random()); this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.6 + Math.random() * 0.5, t: 0, col: cols[i % cols.length], r: 1 + Math.random() * 1.4 }); } }
  burst3(x, y, z, cols, n, sp) { const p = this.at(x, y, z); this.burst(p.x, p.y, cols, n, sp); }
  pop(x, y, text, col = C.gold) { this.pops.push({ x, y, text, col, t: 0 }); }
  pop3(x, y, z, text, col) { const p = this.at(x, y, z); this.pop(p.x, p.y, text, col); }
  shake(s = 0.25) { this.shakeT = Math.max(this.shakeT, s); }
  step(dt) {
    const g = this.g; this.t += dt;
    if (this.tier == null) {
      g.update(dt, this);
      if (g.over) { this.tier = g.tier(); this.say(g.result(this.tier) + '   [E]'); this.audio && this.audio.play(this.tier ? 'treasure' : 'ui', { vol: 0.5 }); if (this.tier) for (let i = 0; i < 3; i++) this.burst(rnd(60, 260), rnd(40, 110), [C.gold, C.red, C.green, C.ink], 18, 90); }
    } else this.endT += dt;
    this.shakeT = Math.max(0, this.shakeT - dt);
    g.sync(this.t, this);
    if (this.shakeT > 0) { const k = this.shakeT * 0.25; this.cam.position.x += rnd(-k, k); this.cam.position.y += rnd(-k, k); }
    this.hud(dt);
  }
  /** called by main.js instead of rendering the world: the game's scene, in the game's light, through the same post */
  render(post) {
    const v = this.view; if (!v) return;
    const L = v.look, keep = { light: U.uLight.value, wave: U.uWave.value, rough: U.uRough.value, rain: U.uRain.value, dread: U.uDread.value, sun: U.uSunDir.value.clone(), sunC: U.uSunColor.value.clone(), deep: U.uDeep.value.clone(), sh: U.uShallow.value.clone(), gust: U.uGust.value.map((q) => q.clone()) };
    U.uLight.value = L.light != null ? L.light : 1; U.uWave.value = L.wave != null ? L.wave : 0.6; U.uRough.value = 0; U.uRain.value = 0; U.uDread.value = 0;
    U.uSunDir.value.set(...(L.sun || [0.3, 0.8, -0.5])).normalize(); U.uSunColor.value.set(L.sunCol || '#fff2a8');
    U.uDeep.value.set(L.deep || '#1b86c6'); U.uShallow.value.set(L.shallow || '#4fe0d0'); for (const q of U.uGust.value) q.set(1e6, 1e6, 1, 0);
    const pu = post.material.uniforms, pk = { d: pu.uDread.value, s: pu.uSat.value, v: pu.uVig.value, tint: pu.uTint.value.clone() };
    pu.uDread.value = 0; pu.uSat.value = 1.05; pu.uVig.value = 0.35; pu.uTint.value.set(1, 1, 1);
    if (v.ocean) v.ocean.update(this.cam.position.x, this.cam.position.z);
    post.render(v.scene, this.cam);
    U.uLight.value = keep.light; U.uWave.value = keep.wave; U.uRough.value = keep.rough; U.uRain.value = keep.rain; U.uDread.value = keep.dread;
    U.uSunDir.value.copy(keep.sun); U.uSunColor.value.copy(keep.sunC); U.uDeep.value.copy(keep.deep); U.uShallow.value.copy(keep.sh); keep.gust.forEach((q, i) => U.uGust.value[i].copy(q));
    pu.uDread.value = pk.d; pu.uSat.value = pk.s; pu.uVig.value = pk.v; pu.uTint.value.copy(pk.tint);
  }
  hud(dt) {
    const cv = this.cv, dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || window.innerWidth, h = cv.clientHeight || window.innerHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = this.ctx, k = Math.max(w / W, h / H) * dpr, ox = (w * dpr - W * k) / 2, oy = (h * dpr - H * k) / 2;   // the 3D view fills the screen like cover
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    c.setTransform(k, 0, 0, k, ox, oy); c.lineJoin = 'round'; c.lineCap = 'round';
    if (this.g.hud) this.g.hud(c, this.t, this);
    for (const p of this.parts) { p.t += dt; p.vy += 140 * dt; p.x += p.vx * dt; p.y += p.vy * dt; const a = 1 - p.t / p.life; if (a <= 0) continue; c.globalAlpha = a; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.28); c.fill(); }
    c.globalAlpha = 1; this.parts = this.parts.filter((p) => p.t < p.life);
    for (const p of this.pops) { p.t += dt; const a = Math.min(1, 2.5 * (1 - p.t)); if (a <= 0) continue; c.globalAlpha = a; const s = 1 + 0.4 * Math.max(0, 1 - p.t * 6); txt(c, p.text, p.x, p.y - p.t * 22, 11 * s, p.col); }
    c.globalAlpha = 1; this.pops = this.pops.filter((p) => p.t < 1);
    if (this.tier != null) txt(c, ['TRY AGAIN TOMORROW', 'NOT BAD!', 'WONDERFUL!'][this.tier], W / 2, H / 2 - 10, 20 + 3 * Math.sin(this.endT * 4) * Math.max(0, 1 - this.endT), [C.ink, C.gold, C.gold][this.tier]);
  }
  key(code) {
    if (code === 'KeyE' || code === 'Escape') { this.finish(); return; }
    this.held.add(code);
    if (this.tier == null && this.g.key) this.g.key(code, this);
  }
  finish() {
    if (!this.active) return;
    this.el.classList.remove('open'); document.body.classList.remove('minigame');
    if (this.view) this.dispose();
    const t = this.tier == null ? 0 : this.tier, cb = this.onDone; this.onDone = null;
    if (cb) cb(t, this.tier != null);
  }
  blip(v = 0.35) { this.audio && this.audio.play('ui', { vol: v }); }
}

// ---------------------------------------------------------------- HUD helpers (320x180 space)
function lin(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
function ol(c, w = 1.2) { c.lineWidth = w; c.strokeStyle = C.dark; c.stroke(); }
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function txt(c, s, x, y, size = 10, col = C.ink, align = 'center') {
  c.font = `900 ${size}px ${FONT}`; c.textAlign = align; c.textBaseline = 'middle';
  c.lineWidth = Math.max(2, size * 0.28); c.strokeStyle = C.dark; c.strokeText(String(s), x, y); c.fillStyle = col; c.fillText(String(s), x, y);
}
function lighten(hex, k) { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, f = (v) => Math.round(v + (255 - v) * k); return `rgb(${f(r)},${f(g)},${f(b)})`; }
function meter(c, x, y, w, h, k, col) { rr(c, x, y, w, h, h / 2); c.fillStyle = 'rgba(36,26,34,0.85)'; c.fill(); ol(c, 1.4); const f = Math.max(0, Math.min(1, k)); if (f > 0.01) { rr(c, x + 1.5, y + 1.5, Math.max(h - 3, (w - 3) * f), h - 3, (h - 3) / 2); c.fillStyle = lin(c, 0, y, 0, y + h, [lighten(col, 0.35), col]); c.fill(); } }
function pips(c, x, y, n, used, col = C.gold, r = 2.6) { for (let i = 0; i < n; i++) { c.beginPath(); c.arc(x + (i - (n - 1) / 2) * (r * 3), y, r, 0, 6.28); c.fillStyle = i < used ? 'rgba(60,50,60,0.9)' : col; c.fill(); ol(c, 1); } }
function panel(c, x, y, w, h) { rr(c, x, y, w, h, 5); c.fillStyle = 'rgba(28,20,30,0.72)'; c.fill(); ol(c, 1.2); }

// ---------------------------------------------------------------- the games
const GAMES = {
  // ---- Tama: repeat the peal, high in the belfry over the harbour
  bells() {
    const g = { how: 'Watch the peal, then ring it back on the bells: 1, 2, 3, 4.', seq: [], pos: 0, mode: 'show', t: 0, lit: -1, done: 0, len: 3, over: false, sw: [0, 0, 0, 0], glow: [0, 0, 0, 0],
      look: { sky: '#f4b874', fog: '#f8caa0', y: 26, light: 1, sun: [0.1, 0.35, -1], sunCol: '#ffd8a0', far: 420, wave: 0.5 } };
    const BX = [-4.5, -1.5, 1.5, 4.5];
    const grow = () => { g.seq = []; for (let i = 0; i < g.len; i++) g.seq.push(Math.floor(Math.random() * 4)); g.mode = 'show'; g.t = -0.8; g.pos = 0; g.prevLit = -1; };
    grow();
    g.build = (root) => {
      root.add(mesh((B) => {
        B.box(0, -1, -1, 16, 1, 7, '#8a7a6a', TILE.stone); B.box(0, -0.05, 0.5, 14, 0.1, 4, '#9a6a3e', TILE.planks);
        for (const x of [-6, -3, 0, 3, 6]) { B.box(x, 0, -2.2, 1.1, 7.2, 1.1, '#b8aa96', TILE.stone); B.box(x, 7.2, -2.2, 1.4, 0.4, 1.4, '#a09280', TILE.stone); }
        B.box(0, 7.5, -2.2, 14.5, 1.6, 1.4, '#b0a28e', TILE.stone); B.box(0, 6.2, -0.4, 13.5, 0.5, 0.5, '#6b4a2e', TILE.bark);
        B.box(0, 0, 2.6, 14, 1.1, 0.4, '#a89a86', TILE.stone);
        B.gable(0, 9.1, -1.2, 15.5, 2.6, 4.2, '#b84a32', TILE.roof, '#b0a28e');
      }));
      root.add(mesh((B) => { islandBlob(B, 0, -60, 70, 6); for (let i = 0; i < 14; i++) { const x = -60 + i * 9 + Math.sin(i) * 3, z = -40 - (i % 4) * 9; B.push(x, -24, z, i); B.box(0, 0, 0, 4, 3, 4, '#e8dcc0', TILE.wall); B.gable(0, 3, 0, 4.6, 2, 4.6, i % 3 ? '#b84a32' : '#3c78c8', TILE.roof, '#e8dcc0'); B.pop(); } islandBlob(B, 90, -220, 30, 10); islandBlob(B, -120, -260, 40, 14); }));
      g.bells = BX.map((x) => { const piv = new THREE.Group(); piv.position.set(x, 6.2, -0.4);
        piv.add(mesh((B) => { B.box(0, -0.5, 0, 1.4, 0.45, 0.5, '#5a3a1c', TILE.bark); B.cyl(0, -3.4, 0, 1.2, 0.95, 0.35, 10, '#c89030', TILE.white, false); B.cyl(0, -3.05, 0, 0.95, 0.55, 1.6, 10, '#d8a440', TILE.white, true, '#b88020'); B.blob(0, -1.4, 0, 0.32, 0.3, 0.32, '#c89030', TILE.white, 0.1, 2); B.blob(0, -3.55, 0, 0.22, 0.22, 0.22, '#3a3036', TILE.white, 0.1, 3); }));
        const gl = mesh((B) => B.blob(0, -2.4, 0, 1.7, 1.6, 1.7, '#ffd890', TILE.glow, 0.1, 5), glowMat()); gl.visible = false; piv.add(gl); piv.userData.gl = gl;
        root.add(piv); return piv; });
    };
    g.update = (dt, L) => {
      g.t += dt; for (let i = 0; i < 4; i++) { g.sw[i] *= Math.pow(0.05, dt); g.glow[i] = Math.max(0, g.glow[i] - dt * 2.5); }
      if (g.mode === 'show') { const i = Math.floor(g.t / 0.62); const on = g.t >= 0 && g.t % 0.62 < 0.4 && i < g.seq.length; g.lit = on ? g.seq[i] : -1; if (on && g.prevLit !== i) { g.prevLit = i; g.sw[g.seq[i]] = 1; g.glow[g.seq[i]] = 1; L.blip(0.3); } if (i >= g.seq.length) { g.mode = 'play'; g.lit = -1; L.say('Your turn: ring it back.'); } }
    };
    g.key = (code, L) => {
      if (g.mode !== 'play') return; const k = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[code]; if (k == null) return;
      g.sw[k] = 1; g.glow[k] = 1; L.blip(0.4);
      if (k !== g.seq[g.pos]) { L.shake(0.4); L.pop3(BX[k], 4.5, -0.4, 'CLANG!', C.red); g.over = true; return; }
      L.burst3(BX[k], 2.8, -0.4, [C.gold, C.ink], 8, 40);
      if (++g.pos >= g.seq.length) { g.done++; L.pop(W / 2, 30, g.done >= 4 ? 'PERFECT PEAL!' : 'GOOD PEAL!', C.gold); if (g.done >= 4) { g.over = true; return; } g.len++; grow(); L.say(`Lovely. Again, one bell longer (${g.done}/4).`); }
    };
    g.tier = () => (g.done >= 3 ? 2 : g.done >= 1 ? 1 : 0);
    g.result = (t) => [`A bell rings out of turn. The ringers wince. (${g.done} peals)`, `Not bad. The tower clock almost agrees with you. (${g.done} peals)`, `A clean peal! Gulls lift off every roof. (${g.done} peals)`][t];
    g.sync = (T, L) => { L.aim(0, 3.6, 10.5, 0, 3.2, -2); g.bells.forEach((b, i) => { b.rotation.x = Math.sin(T * 9) * 0.45 * g.sw[i]; b.userData.gl.visible = g.glow[i] > 0.05; }); };
    g.hud = (c, T, L) => {
      BX.forEach((x, i) => { const p = L.at(x, 2.0, -0.4); rr(c, p.x - 8, p.y + 18, 16, 14, 4); c.fillStyle = g.glow[i] > 0.2 ? C.gold : C.ink; c.fill(); ol(c); c.font = `900 9px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.dark; c.fillText(String(i + 1), p.x, p.y + 25.5); });
      panel(c, W / 2 - g.seq.length * 6 - 6, 160, g.seq.length * 12 + 12, 14);
      for (let i = 0; i < g.seq.length; i++) { c.beginPath(); c.arc(W / 2 + (i - (g.seq.length - 1) / 2) * 12, 167, 3.2, 0, 6.28); c.fillStyle = g.mode === 'play' && i < g.pos ? C.green : g.mode === 'show' ? C.gold : '#c8b898'; c.fill(); ol(c, 1); }
    };
    return g;
  },
  // ---- fishing town: mend the net hung on the quay
  nets() {
    const g = { how: 'The shuttle runs along the torn net: press Space as it crosses the glowing hole.', x: 20, v: 120, hole: 160, hits: 0, tries: 0, over: false,
      look: { sky: '#86ccee', fog: '#c4ecfa', light: 1, wave: 0.7 } };
    const X = (x) => ((x - 160) / 160) * 8;
    const next = () => { g.hole = 40 + Math.random() * 240; g.v = (g.v > 0 ? 1 : -1) * (120 + g.tries * 22); };
    next();
    g.build = (root) => {
      root.add(mesh((B) => {
        B.box(0, 0.2, 5, 22, 0.35, 8, '#9a6a3e', TILE.planks); for (let i = -10; i <= 10; i += 4) for (const z of [1.4, 8.6]) B.box(i, -2, z, 0.5, 2.6, 0.5, '#5a3a1c', TILE.bark);
        for (const x of [-9, 9]) B.box(x, 0.5, 0.5, 0.6, 6.2, 0.6, '#6b4a2e', TILE.bark);
        B.box(0, 5.9, 0.5, 18.4, 0.14, 0.14, '#c8b080', TILE.rope); B.box(0, 1.1, 0.5, 18.4, 0.14, 0.14, '#c8b080', TILE.rope);
        for (let x = -9; x < 9; x += 1.2) for (const s of [-1, 1]) { const len = Math.hypot(2.4, 4.8); B.push(x + 0.6, 3.5, 0.5, 0, 1, 1, 1, 0, s * Math.atan2(2.4, 4.8)); B.box(0, -len / 2, 0, 0.05, len, 0.05, '#efe0b8', TILE.rope); B.pop(); }
        B.box(0, 3.45, 0.5, 18.2, 0.16, 0.16, '#b89a68', TILE.rope);
        boat(B, -14, -12, 0.6); boat(B, 12, -20, -0.4, '#d24a3e'); boat(B, 2, -36, 1.2);
        islandBlob(B, -60, -140, 40, 12); islandBlob(B, 80, -180, 30, 8);
        for (let i = 0; i < 3; i++) B.box(-11 + i * 0.7, 0.55, 3.5 + i * 0.5, 0.6, 0.6, 0.6, '#8a5a30', TILE.planks);
        B.cyl(9.5, 0.55, 4.5, 0.4, 0.4, 0.9, 8, '#6b4a2e', TILE.planks);
        villager(B, -6, 0.55, 3.2, 0.3, mulberry32(5), 'fisher'); villager(B, 7, 0.55, 3.6, -0.5, mulberry32(6), 'oldsalt');
      }));
      g.holeM = mesh((B) => { B.push(0, 0, 0, 0, 1, 1, 1, Math.PI / 2); ring(B, 0.8, 14, '#ffd860', 0.16); B.pop(); }, glowMat()); root.add(g.holeM);
      g.shut = mesh((B) => { B.push(0, 0, 0, 0, 1, 1, 1, 0, Math.PI / 2); B.cyl(0, -1, 0, 0.16, 0.22, 1.4, 6, '#d8a060', TILE.planks); B.cyl(0, 0.4, 0, 0.22, 0.02, 0.7, 6, '#c89050', TILE.planks); B.pop(); }); root.add(g.shut);
      g.knots = new THREE.Group(); root.add(g.knots);
    };
    g.update = (dt) => { g.x += g.v * dt; if (g.x < 22) { g.x = 22; g.v = -g.v; } if (g.x > W - 22) { g.x = W - 22; g.v = -g.v; } };
    g.key = (code, L) => { if (code !== 'Space') return; const ok = Math.abs(g.x - g.hole) < 9;
      if (ok) { g.hits++; const k = mesh((B) => B.blob(0, 0, 0, 0.3, 0.3, 0.3, '#ffd23a', TILE.rope, 0.2, g.hits)); k.position.set(X(g.hole), 3.5, 0.6); g.knots.add(k); L.burst3(X(g.hole), 3.5, 0.5, [C.ink, C.gold], 12, 50); L.pop3(X(g.hole), 4.6, 0.5, 'KNOT!', C.gold); }
      else { L.shake(0.25); L.pop3(X(g.x), 4.6, 0.5, 'miss', '#d8d0d8'); }
      g.tries++; L.blip(ok ? 0.45 : 0.2); L.say(`Knots tied: ${g.hits} of ${g.tries} (8 holes).`); if (g.tries >= 8) g.over = true; else next(); };
    g.tier = () => (g.hits >= 7 ? 2 : g.hits >= 4 ? 1 : 0);
    g.result = (t) => [`The net comes up with a hole you could row through. (${g.hits}/8)`, `It will hold. Probably. (${g.hits}/8)`, `The old net-menders nod at your knots. (${g.hits}/8)`][t];
    g.sync = (T, L) => { L.aim(0, 4.2, 11.5, 0, 3.0, 0); g.holeM.position.set(X(g.hole), 3.5, 0.62); const s = 1 + 0.12 * Math.sin(T * 8); g.holeM.scale.set(s, s, s); g.shut.position.set(X(g.x), 3.5, 0.8); g.shut.rotation.x = T * 6; };
    g.hud = (c) => { panel(c, W / 2 - 30, 160, 60, 14); pips(c, W / 2, 167, 8, g.tries, C.ink, 2.4); };
    return g;
  },
  // ---- terraced town: skip a stone at sunset off the beach
  skip() {
    const g = { how: 'Space to set the power, Space again to set the angle. Low and fast skips best. Three throws.', phase: 'power', k: 0, dir: 1, p: 0, a: 0, throws: 0, best: 0, fly: null, over: false, rings: [],
      look: { sky: '#f29a64', fog: '#f8c08a', light: 0.95, sun: [0.15, 0.18, -1], sunCol: '#ffb070', deep: '#2a4a7a', shallow: '#e08a6a', wave: 0.45, far: 380 } };
    const P = (u) => ({ x: 1 + u * 0.6, z: 2 - u * 4.2 });
    g.build = (root) => {
      root.add(mesh((B) => {
        B.blob(0, -0.8, 9, 18, 1.2, 8, '#e8d098', TILE.sand, 0.1, 2);
        B.push(-22, 0, -18, 0.5);
        for (let i = 0; i < 5; i++) { const w = 18 - i * 3.2; B.box(0, -1 + i * 2.4, -i * 1.5, w, 2.4, 12 - i * 1.8, i % 2 ? '#b8a07a' : '#a8906a', TILE.stone, TILE.leaf, '#5aa84e');
          for (let j = 0; j < 3 - (i > 2 ? 1 : 0); j++) { B.push(-w / 2 + 3 + j * 4.4, 1.4 + i * 2.4, -i * 1.5 + 1, j); B.box(0, 0, 0, 2.6, 2, 2.4, '#f2e8d4', TILE.wall); B.gable(0, 2, 0, 3, 1.4, 2.8, '#b84a32', TILE.roof, '#f2e8d4'); B.pop(); } }
        B.pop();
        islandBlob(B, 60, -160, 36, 14);
        for (let i = 0; i < 6; i++) B.blob(-6 + i * 2.6, -0.2, 6 + (i % 2), 0.35, 0.22, 0.3, '#9a9088', TILE.stone, 0.2, i);
        villager(B, -5, -0.2, 7, 2.6, mulberry32(14), 'child'); villager(B, -3.6, -0.2, 7.6, 2.8, mulberry32(15), 'child');
      }));
      root.add(mesh((B) => B.blob(0, 40, -400, 26, 26, 4, '#ffd890', TILE.glow, 0.02, 1), glowMat()));
      g.stone = mesh((B) => B.blob(0, 0, 0, 0.32, 0.12, 0.26, '#a89c90', TILE.stone, 0.15, 4)); root.add(g.stone); g.stone.visible = false;
      g.ringM = Array.from({ length: 10 }, () => { const m = mesh((B) => ring(B, 1, 16, '#ffffff', 0.12), mats.foam); m.visible = false; root.add(m); return m; });
    };
    g.update = (dt, L) => {
      if (g.phase === 'power' || g.phase === 'angle') { g.k += g.dir * dt * (g.phase === 'power' ? 1.3 : 1.7); if (g.k > 1) { g.k = 1; g.dir = -1; } if (g.k < 0) { g.k = 0; g.dir = 1; } }
      for (const r of g.rings) r.t += dt; g.rings = g.rings.filter((r) => r.t < 1.8);
      if (g.fly) { const f = g.fly; const prev = Math.floor(f.t / 0.32); f.t += dt; const now = Math.floor(f.t / 0.32);
        if (now > prev && now <= f.n) { const q = P(now); g.rings.push({ x: q.x, z: q.z, t: 0 }); L.pop3(q.x, 1.2, q.z, String(now), C.ink); L.blip(0.2); }
        if (f.t > 0.3 + f.n * 0.32 + 0.3) { g.fly = null; g.throws++; if (f.n > g.best) { g.best = f.n; if (f.n >= 4) L.pop(W / 2, 30, `${f.n} SKIPS!`, C.gold); } else if (f.n === 0) L.pop3(P(0.6).x, 1, P(0.6).z, 'plop', '#d0e0f0');
          L.say(`${f.n} skip${f.n === 1 ? '' : 's'}! Best so far: ${g.best}. (${g.throws}/3)`); if (g.throws >= 3) g.over = true; else { g.phase = 'power'; g.k = 0; } } }
    };
    g.key = (code, L) => { if (code !== 'Space') return;
      if (g.phase === 'power') { g.p = g.k; g.phase = 'angle'; g.k = 0; g.dir = 1; L.blip(0.3); }
      else if (g.phase === 'angle') { g.a = g.k; g.phase = 'fly'; const n = Math.max(0, Math.round(g.p * 9 * Math.max(0, 1 - Math.abs(g.a - 0.25) * 2.6))); g.fly = { t: 0, n }; L.blip(0.4); } };
    g.tier = () => (g.best >= 6 ? 2 : g.best >= 3 ? 1 : 0);
    g.result = (t) => [`Plop. The children on the wall laugh kindly. (best ${g.best})`, `A fair skip. A dog runs after it. (best ${g.best})`, `It skips and skips. The whole terrace counts out loud. (best ${g.best})`][t];
    g.sync = (T, L) => {
      L.aim(-1.5, 2.6, 12, 3, 0.4, -16);
      if (g.fly) { const f = g.fly, u = Math.min(f.t / 0.32, f.n + 0.7), i = Math.floor(u), q = P(u), hgt = u > f.n ? Math.max(-0.4, 0.3 - (u - f.n) * 1.2) : Math.abs(Math.sin(u * Math.PI)) * Math.max(0.15, 1.1 - i * 0.12) + 0.1;
        g.stone.visible = true; g.stone.position.set(q.x, hgt + (u < 1 ? (1 - u) * 1.2 : 0), q.z + (u < 1 ? (1 - u) * 6 : 0)); g.stone.rotation.y = T * 20; } else g.stone.visible = false;
      g.ringM.forEach((m, i) => { const r = g.rings[i]; m.visible = !!r; if (r) { const s = 0.4 + r.t * 1.8; m.scale.set(s, 1, s * 0.8); m.position.set(r.x, 0.18, r.z); } });
    };
    g.hud = (c) => {
      panel(c, 96, 140, 140, 32);
      txt(c, 'POWER', 128, 150, 7, C.ink); meter(c, 104, 156, 50, 9, g.phase === 'power' ? g.k : g.p, C.gold);
      const ang = (g.phase === 'angle' ? g.k : g.a) * 1.2; txt(c, 'ANGLE', 200, 150, 7, C.ink);
      c.strokeStyle = 'rgba(98,204,94,0.9)'; c.lineWidth = 3; c.beginPath(); c.arc(184, 168, 18, -0.42, -0.18); c.stroke();
      c.strokeStyle = C.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(184, 168); c.lineTo(184 + Math.cos(ang) * 20, 168 - Math.sin(ang) * 20); c.stroke();
      pips(c, 268, 160, 3, g.throws, '#c8c0b8', 3);
    };
    return g;
  },
  // ---- thatch village: fly the kite over the beach
  kite() {
    const g = { how: 'Gusts push the kite about: hold A and D to keep it between the gold poles for 20 seconds.', x: 160, v: 0, t: 0, inT: 0, gust: 0, gt: 0, over: false, was: true,
      look: { sky: '#62bcef', fog: '#bfe8fa', light: 1.05, wave: 0.6 } };
    const X = (x) => ((x - 160) / 160) * 11;
    g.build = (root) => {
      root.add(mesh((B) => {
        B.blob(0, -1.2, 2, 30, 1.8, 14, '#ecd29a', TILE.sand, 0.08, 7);
        palm(B, -12, 0, -2, 1.1, 1); palm(B, 13, 0, -4, 0.9, 2); palm(B, -17, 0, 4, 0.8, 3);
        hut(B, -7, -6, 0.3, 0.9); hut(B, 8, -8, -0.4, 0.8);
        boat(B, 18, -18, 1.3); islandBlob(B, -70, -160, 30, 10);
        villager(B, -4, 0, 2.5, 0.6, mulberry32(4), 'child'); villager(B, 5, 0, 1.5, -0.5, mulberry32(9), 'fisher');
      }));
      g.kid = mesh((B) => villager(B, 0, 0, 0, Math.PI, mulberry32(12), 'child')); g.kid.position.set(0, 0, 4); root.add(g.kid);
      g.band = mesh((B) => { for (const x of [-2.2, 2.2]) { B.box(x, 0, 0, 0.14, 20, 0.14, '#ffe890', TILE.glow); B.blob(x, 20, 0, 0.35, 0.35, 0.35, '#ffe890', TILE.glow, 0.1, 1); } }, glowMat()); g.band.position.set(0, 0, -2); root.add(g.band);
      g.kite = new THREE.Group(); root.add(g.kite);
      g.kite.add(mesh((B) => { B.doubleSided = true; B.tri([0, 1.6, 0], [1.2, 0, 0], [0, 0, 0], '#e0503e', TILE.flag); B.tri([0, 1.6, 0], [0, 0, 0], [-1.2, 0, 0], '#ffd23a', TILE.flag); B.tri([0, 0, 0], [1.2, 0, 0], [0, -2, 0], '#ffd23a', TILE.flag); B.tri([0, 0, 0], [0, -2, 0], [-1.2, 0, 0], '#e0503e', TILE.flag); B.box(0, -2, 0.02, 0.06, 3.6, 0.06, '#6b4a2e', TILE.bark); }, mats.flagP));
      g.tail = Array.from({ length: 6 }, (_, i) => { const col = ['#62cc5e', '#e0503e', '#3c78c8'][i % 3]; const m = mesh((B) => { B.doubleSided = true; B.tri([-0.3, 0.15, 0], [0.3, -0.15, 0], [0.3, 0.15, 0], col, TILE.flag); B.tri([-0.3, 0.15, 0], [-0.3, -0.15, 0], [0.3, -0.15, 0], col, TILE.flag); }, mats.flagP); root.add(m); return m; });
      g.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 12 }, () => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: 0xffffff })); g.line.frustumCulled = false; root.add(g.line);
      g.tailLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 7 }, () => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: 0xffffff })); g.tailLine.frustumCulled = false; root.add(g.tailLine);
    };
    g.update = (dt, L) => {
      g.t += dt; g.gt -= dt; if (g.gt <= 0) { g.gt = rnd(0.6, 1.8); g.gust = rnd(-1, 1) * (60 + g.t * 4); }
      const pull = (L.held.has('KeyD') || L.held.has('ArrowRight') ? 1 : 0) - (L.held.has('KeyA') || L.held.has('ArrowLeft') ? 1 : 0);
      g.v += (g.gust + pull * 150) * dt; g.v *= 1 - dt * 1.8; g.x = Math.max(14, Math.min(W - 14, g.x + g.v * dt));
      const inb = Math.abs(g.x - 160) < 34; if (inb) { g.inT += dt; if (Math.random() < dt * 5) L.burst3(X(g.x) + rnd(-1, 1), 11 + rnd(-1, 1), -2, [C.gold], 1, 15); }
      if (inb !== g.was) { g.was = inb; if (!inb) L.pop3(X(g.x), 14, -2, 'whoa!', C.ink); }
      if (g.t >= 20) g.over = true; else if (Math.floor(g.t) !== Math.floor(g.t - dt)) L.say(`Between the poles: ${Math.round(g.inT)} s of ${Math.round(g.t)} s.`);
    };
    g.tier = () => { const f = g.inT / 20; return f > 0.8 ? 2 : f > 0.5 ? 1 : 0; };
    g.result = (t) => [`The kite ends up in a palm tree. A boy goes up after it. (${Math.round(g.inT)} s)`, `It stays up, mostly. (${Math.round(g.inT)} s)`, `It hangs there like it was painted on the sky. (${Math.round(g.inT)} s)`][t];
    g.sync = (T, L) => {
      L.aim(0, 4.5, 17, 0, 8, -2);
      const kx = X(g.x), ky = 11.5 + Math.sin(T * 1.7) * 0.4; g.kite.position.set(kx, ky, -2); g.kite.rotation.z = -g.v * 0.004 + Math.sin(T * 3) * 0.05;
      const hand = new THREE.Vector3(0.3, 1.2, 4), top = new THREE.Vector3(kx, ky - 0.3, -2), pos = g.line.geometry.attributes.position;
      for (let i = 0; i < 12; i++) { const u = i / 11, p = hand.clone().lerp(top, u); p.y -= Math.sin(u * Math.PI) * 1.6; pos.setXYZ(i, p.x, p.y, p.z); } pos.needsUpdate = true;
      const tp = g.tailLine.geometry.attributes.position; tp.setXYZ(0, kx, ky - 2, -2);
      g.tail.forEach((m, i) => { const x = kx - g.v * 0.012 * (i + 1) + Math.sin(T * 6 + i) * 0.35, y = ky - 2.4 - i * 0.75; m.position.set(x, y, -2); m.rotation.z = Math.sin(T * 7 + i) * 0.6; tp.setXYZ(i + 1, x, y, -2); }); tp.needsUpdate = true;
      g.kid.rotation.y = Math.PI + Math.sin(T * 2) * 0.1;
    };
    g.hud = (c) => { panel(c, 104, 162, 112, 13); meter(c, 108, 165, 104, 7, g.t / 20, C.green); };
    return g;
  },
  // ---- market town: the auction under the awning
  auction() {
    const LOTS = [['a ship in a bottle', 'bottle'], ['a brass compass', 'compass'], ['a crate of "spices"', 'crate'], ['a painting of a cow', 'frame'], ['a captain\'s hat', 'hat'], ['a sealed sea chest', 'chest'], ['a parrot (quiet)', 'parrot'], ['a box of buttons', 'crate']];
    const g = { how: '1 = bid five more, 2 = pass. The guess under each lot is roughly what it is worth.', lot: 0, profit: 0, over: false, bump: 0, who: -1, slide: 0,
      look: { sky: '#8ccfee', fog: '#d8eef6', light: 1.05, far: 200 } };
    const newLot = () => { const v = Math.round(rnd(20, 90)), L0 = LOTS[Math.floor(Math.random() * LOTS.length)]; g.cur = { name: L0[0], icon: L0[1], v, guess: Math.round(v + rnd(-15, 15)), price: 10, them: [Math.round(v * rnd(0.6, 1.15)), Math.round(v * rnd(0.5, 1.05))], high: 'none' }; g.slide = 1; g.newIcon = true; };
    newLot();
    const lotMesh = (k) => mesh((B) => {
      if (k === 'bottle') { B.push(0, 0.35, 0, 0, 1, 1, 1, 0, Math.PI / 2); B.cyl(0, -0.6, 0, 0.3, 0.3, 1.0, 8, '#a0d8c8', TILE.white); B.cyl(0, 0.4, 0, 0.3, 0.1, 0.35, 8, '#a0d8c8', TILE.white); B.pop(); B.box(0, 0.12, 0, 0.5, 0.2, 0.2, '#6b4a2e', TILE.planks); B.tri([0, 0.25, 0], [0, 0.55, 0], [0.25, 0.27, 0], '#f4ecd0', TILE.sail); }
      else if (k === 'compass') { B.cyl(0, 0, 0, 0.5, 0.5, 0.18, 10, '#c89030', TILE.white, true, '#f4ecd0'); B.box(0, 0.19, 0, 0.08, 0.02, 0.6, '#d24a3e', TILE.white); }
      else if (k === 'frame') { B.box(0, 0, 0, 1.4, 1.0, 0.1, '#c89030', TILE.planks); B.box(0, 0.1, 0.03, 1.15, 0.8, 0.08, '#8ac880', TILE.white); B.blob(0, 0.45, 0.1, 0.25, 0.15, 0.05, '#f4f0e6', TILE.white, 0.1, 2); }
      else if (k === 'hat') { B.cyl(0, 0, 0, 0.7, 0.7, 0.06, 10, '#2a2a3a', TILE.white); B.cyl(0, 0.06, 0, 0.42, 0.36, 0.45, 10, '#2a2a3a', TILE.white); B.blob(0, 0.35, 0.38, 0.1, 0.1, 0.05, '#f4f0e6', TILE.bone, 0.1, 1); }
      else if (k === 'parrot') { B.box(-0.3, 0, 0, 0.8, 0.08, 0.08, '#6b4a2e', TILE.bark); B.blob(0, 0.35, 0, 0.2, 0.32, 0.2, '#5ec45a', TILE.white, 0.1, 1); B.blob(0, 0.72, 0, 0.17, 0.17, 0.17, '#d24a3e', TILE.white, 0.1, 2); B.blob(0.15, 0.7, 0, 0.08, 0.05, 0.05, '#ffd23a', TILE.white, 0.1, 3); }
      else { B.box(0, 0, 0, 1.0, 0.7, 0.7, '#a06a3a', TILE.planks); if (k === 'chest') { B.box(0, 0.7, 0, 1.0, 0.2, 0.7, '#8a5a30', TILE.planks); B.box(0, 0.4, 0.36, 0.16, 0.2, 0.04, '#ffd23a', TILE.white); } }
    });
    g.build = (root) => {
      root.add(mesh((B) => {
        B.box(0, -0.4, 0, 30, 0.4, 20, '#d8c49a', TILE.sand);
        B.box(0, 0, 0, 5.6, 1.05, 1.2, '#9a6a3e', TILE.planks, TILE.planks, '#b07a46');
        for (const x of [-2.9, 2.9]) for (const z of [-1.6, 0.8]) B.box(x, 0, z, 0.2, 3.1, 0.2, '#6b4a2e', TILE.bark);
        for (let i = 0; i < 8; i++) { B.push(-2.8 + i * 0.8 + 0.4, 3.0, -0.4, 0, 1, 1, 1, -0.28); B.box(0, 0, 0, 0.8, 0.08, 3.2, i % 2 ? '#f4ead8' : '#d24a3e', TILE.flag); B.pop(); }
        for (let i = 0; i < 4; i++) { B.push(-7 - i * 4.5, 0, -8 + i, 0.3 * i); B.box(0, 0, 0, 3.6, 3, 3.6, '#e8dcc0', TILE.wall); B.gable(0, 3, 0, 4.2, 2, 4.2, i % 2 ? '#3c78c8' : '#b84a32', TILE.roof, '#e8dcc0'); B.pop(); }
        for (let i = 0; i < 3; i++) { B.push(8 + i * 4.5, 0, -9 + i, -0.3 * i); B.box(0, 0, 0, 3.6, 3, 3.6, '#f4ead8', TILE.wall); B.gable(0, 3, 0, 4.2, 2, 4.2, '#b84a32', TILE.roof, '#f4ead8'); B.pop(); }
        villager(B, 0, 0, -1.3, 0, mulberry32(3), 'market');
        palm(B, -12, 0, -3, 0.9, 2);
      }));
      g.bid = [[-3.2, 1.6, 0.9], [-1.8, 2.2, 0.5], [3.4, 1.8, -0.7]].map(([x, z, ry], i) => {
        const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = ry + Math.PI;
        grp.add(mesh((B) => villager(B, 0, 0, 0, 0, mulberry32(20 + i), i === 1 ? 'oldsalt' : 'docker')));
        const pad = new THREE.Group(); pad.position.set(0.35, 1.15, 0); pad.add(mesh((B) => { B.box(0, 0, 0, 0.06, 0.8, 0.06, '#6b4a2e', TILE.bark); B.box(0, 0.8, 0, 0.45, 0.45, 0.05, i === 2 ? '#ffd23a' : '#f4f0e6', TILE.white); })); grp.add(pad); grp.userData.pad = pad;
        root.add(grp); return grp; });
      g.lotG = new THREE.Group(); g.lotG.position.set(0, 1.05, 0.1); root.add(g.lotG);
    };
    const settle = (L, mine) => { const c = g.cur;
      if (mine) { const d = c.v - c.price; g.profit += d; L.pop(W / 2, 40, `SOLD! ${d >= 0 ? '+' : ''}${d}`, d >= 0 ? C.green : C.red); if (d > 0) L.burst3(0, 1.6, 0, [C.gold, C.ink], 16); else L.shake(0.2); L.say(`You win ${c.name} for ${c.price}. It is worth ${c.v}.`); }
      else { L.pop(W / 2, 40, 'GONE!', C.ink); L.say(`${c.name} goes to a local for ${c.price}. It was worth ${c.v}.`); }
      if (++g.lot >= 4) g.over = true; else newLot(); };
    g.update = (dt) => { g.bump = Math.max(0, g.bump - dt * 2); g.slide = Math.max(0, g.slide - dt * 2.5); };
    g.key = (code, L) => { const c = g.cur;
      if (code === 'Digit1' || code === 'Numpad1') { c.price += 5; c.high = 'you'; g.who = 2; g.bump = 1; L.blip(0.3);
        const bidder = c.them.findIndex((m) => m >= c.price + 5); if (bidder < 0) settle(L, true); else { c.price += 5; c.high = 'them'; setTimeout(() => { g.who = bidder; g.bump = 1; }, 250); L.say(`A local bids ${c.price}.`); } }
      if (code === 'Digit2' || code === 'Numpad2') settle(L, c.high === 'you');
    };
    g.tier = () => (g.profit >= 40 ? 2 : g.profit > 0 ? 1 : 0);
    g.result = (t) => [`You paid more than it was all worth. The auctioneer thanks you warmly. (${g.profit >= 0 ? '+' : ''}${g.profit})`, `A little ahead. Nobody noticed. (+${g.profit})`, `A sharp eye! The dealers glare at you over their pipes. (+${g.profit})`][t];
    g.sync = (T, L) => {
      L.aim(0.6, 2.6, 6.6, 0, 1.4, -0.4);
      if (g.newIcon) { g.newIcon = false; g.lotG.clear(); g.lotG.add(lotMesh(g.cur.icon)); }
      g.lotG.position.x = g.slide * 6; g.lotG.rotation.y = T * 0.8;
      g.bid.forEach((b, i) => { const up = g.who === i ? g.bump : 0; b.userData.pad.rotation.x = -up * 2.4; b.userData.pad.position.y = 1.15 + up * 0.3; });
    };
    g.hud = (c, T, L) => {
      const p = { x: 62, y: 128 };
      panel(c, p.x - 52, p.y - 34, 104, 30); c.font = `700 8px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.ink; c.fillText(g.cur.name, p.x, p.y - 26); c.fillStyle = '#e0c890'; c.fillText(`worth about ${g.cur.guess}?`, p.x, p.y - 15);
      rr(c, W / 2 - 30, 140, 60, 22, 4); c.fillStyle = '#2e3a34'; c.fill(); ol(c, 1.4); txt(c, `${g.cur.price}g`, W / 2, 151, 12 + g.bump * 3, g.cur.high === 'you' ? C.green : C.ink);
      txt(c, `${g.profit >= 0 ? '+' : ''}${g.profit}g`, 306, 18, 11, g.profit >= 0 ? C.green : C.red, 'right');
      pips(c, W / 2, 170, 4, g.lot, C.gold); txt(c, '1 = BID    2 = PASS', 56, 170, 7, C.ink);
    };
    return g;
  },
  // ---- farm: the coconut shy at the harvest fair
  shy() {
    const g = { how: 'The marker swings: press Space as it sits over a coconut. Five balls.', a: 0, dir: 1, balls: 5, hits: 0, nuts: [0.25, 0.5, 0.75].map((p) => ({ p, up: true, fall: 0 })), shot: null, over: false,
      look: { sky: '#74c4ee', fog: '#cdeefa', light: 1.05, far: 220 } };
    const X = (p) => (p - 0.5) * 8;
    g.build = (root) => {
      root.add(mesh((B) => {
        B.box(0, -0.4, 0, 40, 0.4, 30, '#6ab04a', TILE.leaf);
        B.box(0, 0, -6.5, 11, 4.6, 0.3, '#f4ead8', TILE.wall); for (let i = 0; i < 6; i++) B.box(-4.6 + i * 1.84, 0, -6.3, 0.9, 4.6, 0.05, '#d24a3e', TILE.flag);
        for (const x of [-5.5, 5.5]) B.box(x, 0, -6, 0.3, 5.4, 0.3, '#6b4a2e', TILE.bark);
        for (let i = 0; i < 8; i++) { B.push(-5.6 + i * 1.6 + 0.8, 5.3, -5.2, 0, 1, 1, 1, 0.35); B.box(0, 0, 0, 1.6, 0.1, 2.6, i % 2 ? '#ffd23a' : '#d24a3e', TILE.flag); B.pop(); }
        for (const p of [0.25, 0.5, 0.75]) { B.box(X(p), 0, -4, 0.3, 1.9, 0.3, '#8a5a30', TILE.bark); B.box(X(p), 1.9, -4, 0.7, 0.12, 0.7, '#6b4a2e', TILE.planks); }
        B.box(0, 0, 0.5, 11, 1.0, 0.6, '#9a6a3e', TILE.planks, TILE.planks, '#b07a46');
        for (let i = 0; i < 6; i++) B.blob(-4.5 + i * 0.35, 1.2, 0.5, 0.17, 0.17, 0.17, '#f4f0e6', TILE.white, 0.1, i);
        for (let i = 0; i < 5; i++) { B.push(-12 + i * 1.6, 0, -9 + (i % 2), i); B.box(0, 0, 0, 1.1, 0.8, 1.1, '#d8b848', TILE.rope); B.pop(); }
        palm(B, 11, 0, -8, 0.9, 4); villager(B, 3.6, 0, -2.4, 0.4, mulberry32(7), 'market'); villager(B, -8, 0, -2, 1.2, mulberry32(8), 'child'); villager(B, 9, 0, -1, -1, mulberry32(9), 'fisher');
        for (let i = 0; i < 4; i++) { B.push(-14 + i * 9, 0, -16, 0); B.box(0, 0, 0, 3, 2.6, 3, '#e8dcc0', TILE.wall); B.gable(0, 2.6, 0, 3.6, 1.6, 3.6, '#c8a050', TILE.rope, '#e8dcc0'); B.pop(); }
      }));
      g.nm = g.nuts.map((n) => { const m = mesh((B) => B.blob(0, 0, 0, 0.42, 0.4, 0.42, '#7a4e2a', TILE.bark, 0.25, n.p * 10)); root.add(m); return m; });
      g.mark = mesh((B) => B.cyl(0, 0, 0, 0.25, 0, 0.55, 4, '#ffd860', TILE.glow), glowMat()); g.mark.rotation.x = Math.PI; root.add(g.mark);
      g.ball = mesh((B) => B.blob(0, 0, 0, 0.18, 0.18, 0.18, '#f4f0e6', TILE.white, 0.1, 2)); root.add(g.ball);
    };
    g.update = (dt, L) => { g.a += g.dir * dt * (0.8 + (5 - g.balls) * 0.12); if (g.a > 1) { g.a = 1; g.dir = -1; } if (g.a < 0) { g.a = 0; g.dir = 1; }
      for (const n of g.nuts) if (!n.up) n.fall += dt;
      if (g.shot) { g.shot.t += dt; if (g.shot.t > 0.4) { if (g.shot.hit) { L.burst3(X(g.shot.a), 2.3, -4, ['#8a5a30', C.ink, C.gold], 14); L.pop3(X(g.shot.a), 3.2, -4, 'BONK!', C.gold); L.shake(0.2); } else L.pop3(X(g.shot.a), 3, -4, 'miss', '#e8e0d0'); g.shot = null; } }
      if (g.balls <= 0 && !g.shot) g.over = true; };
    g.key = (code, L) => { if (code !== 'Space' || g.balls <= 0 || g.shot) return; g.balls--;
      const n = g.nuts.find((q) => q.up && Math.abs(q.p - g.a) < 0.05); g.shot = { a: g.a, t: 0, hit: !!n }; if (n) { n.up = false; g.hits++; L.blip(0.5); } else L.blip(0.2);
      if (g.nuts.every((q) => !q.up)) setTimeout(() => g.nuts.forEach((q) => { q.up = true; q.fall = 0; }), 900);
      L.say(`Coconuts down: ${g.hits}. Balls left: ${g.balls}.`); };
    g.tier = () => (g.hits >= 4 ? 2 : g.hits >= 2 ? 1 : 0);
    g.result = (t) => [`The coconuts sit there, smug. (${g.hits})`, `Two down! You may keep one. It is a coconut. (${g.hits})`, `Coconuts everywhere. The stall holder looks worried. (${g.hits})`][t];
    g.sync = (T, L) => {
      L.aim(0, 2.3, 7.5, 0, 1.8, -4);
      g.nuts.forEach((n, i) => { const m = g.nm[i]; if (n.up) { m.position.set(X(n.p), 2.42, -4); m.rotation.set(0, 0, 0); } else { const t = n.fall; m.position.set(X(n.p) + t * 0.6, Math.max(0.4, 2.42 + 1.5 * t - 9 * t * t), -4 - t * 1.8); m.rotation.set(t * 8, 0, t * 5); } });
      g.mark.position.set(X(g.a), 3.6 + Math.sin(T * 6) * 0.12, -4);
      if (g.shot) { const k = g.shot.t / 0.4; g.ball.visible = true; g.ball.position.set(0.8 + (X(g.shot.a) - 0.8) * k, 1.5 + (2.4 - 1.5) * k + Math.sin(k * Math.PI) * 1.2, 5 + (-4 - 5) * k); }
      else { g.ball.visible = g.balls > 0; g.ball.position.set(0.9, 1.45 + Math.sin(T * 3) * 0.03, 5.2); }
    };
    g.hud = (c) => { panel(c, 252, 158, 60, 16); for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(262 + i * 10, 166, 3.5, 0, 6.28); c.fillStyle = i < g.balls ? C.ink : 'rgba(80,90,70,0.9)'; c.fill(); ol(c, 1); } };
    return g;
  },
  // ---- shrine: float the lanterns out through the gap in the reef, at night
  lanterns() {
    const g = { how: 'Let a lantern go with Space: the current carries it out to the reef. It must pass the gap. Six lanterns.', gx: 160, t: 0, left: 6, through: 0, flying: [], out: [], over: false,
      look: { sky: '#1a2248', fog: '#1e2a50', light: 0.55, sun: [0.3, 0.5, -1], sunCol: '#c8d4ff', deep: '#0c2448', shallow: '#1a4a6a', wave: 0.45, near: 30, far: 220 } };
    const GX = (x) => ((x - 160) / 160) * 9, Z = (y) => 4 + ((y - 160) / (52 - 160)) * -16;
    g.build = (root) => {
      root.add(mesh((B) => {
        B.box(0, -1, 9, 9, 1.4, 6, '#6a6070', TILE.stone); B.box(0, -1, 6.2, 6, 0.9, 1.4, '#5a5262', TILE.stone);
        for (const x of [-5.5, 5.5]) B.cyl(x, 0.4, 7, 0.26, 0.24, 7.6, 6, '#d8402e', TILE.planks); B.box(0, 7.8, 7, 13, 0.4, 0.6, '#d8402e', TILE.planks); B.box(0, 6.8, 7, 11.4, 0.3, 0.4, '#d8402e', TILE.planks); B.box(0, 8.2, 7, 14, 0.25, 0.8, '#2a2026', TILE.planks);
        for (const x of [-4.4, 4.4]) { B.cyl(x, 0.4, 10, 0.3, 0.3, 0.8, 6, '#a8a49c', TILE.stone); B.box(x, 1.2, 10, 0.6, 0.5, 0.6, '#ffffff', TILE.glow); B.box(x, 1.7, 10, 0.9, 0.2, 0.9, '#8a867c', TILE.stone); }
        islandBlob(B, -40, -60, 22, 10); islandBlob(B, 50, -80, 28, 14);
      }));
      root.add(mesh((B) => B.blob(30, 60, -300, 14, 14, 4, '#f4f0d8', TILE.glow, 0.02, 1), glowMat()));
      g.rocks = Array.from({ length: 34 }, (_, i) => { const m = mesh((B) => B.blob(0, 0, 0, 1.1 + (i % 3) * 0.25, 1.0 + (i % 2) * 0.5, 0.9, '#7a7488', TILE.stone, 0.3, i)); m.userData.x = -22 + i * 1.33; m.scale.setScalar(1.5); m.position.set(m.userData.x, 0.5, -12 - (i % 2) * 0.6); root.add(m); return m; });
      const mk = () => { const grp = new THREE.Group(); grp.add(mesh((B) => { B.box(0, 0, 0, 0.9, 0.12, 0.9, '#6b4a2e', TILE.planks); B.box(0, 0.12, 0, 0.7, 0.9, 0.7, '#ffe0a0', TILE.glow); B.box(0, 1.02, 0, 0.8, 0.1, 0.8, '#c8382a', TILE.planks); })); grp.add(mesh((B) => B.blob(0, 0.6, 0, 2.0, 1.4, 2.0, '#ffb050', TILE.glow, 0.1, 2), glowMat())); root.add(grp); grp.visible = false; return grp; };
      g.pool = Array.from({ length: 14 }, mk);
    };
    g.update = (dt, L) => { g.t += dt; g.gx = 160 + Math.sin(g.t * (1.1 + (6 - g.left) * 0.08)) * 110;
      for (const f of g.flying) { f.y -= dt * 80; if (!f.judged && f.y <= 52) { f.judged = true; f.ok = Math.abs(g.gx - 160) < 22; if (f.ok) { g.through++; g.out.push({ z: Z(52), x: 0, t: 0 }); L.burst3(0, 1, Z(52), [C.gold, '#ffb060'], 10, 40); L.pop3(0, 2.5, Z(52), 'THROUGH!', C.gold); } else { L.shake(0.15); L.pop3(0, 2.5, Z(52), 'out...', '#a8a0b8'); } L.say(`Through the gap: ${g.through}. Lanterns left: ${g.left}.`); } }
      g.flying = g.flying.filter((f) => !f.judged);
      for (const o of g.out) { o.t += dt; o.z -= dt * 3; o.x = Math.sin(o.t * 0.7 + o.z) * 2; }
      if (g.left <= 0 && !g.flying.length) g.over = true; };
    g.key = (code, L) => { if (code !== 'Space' || g.left <= 0 || g.flying.some((f) => f.y > 120)) return; g.left--; g.flying.push({ y: 160 }); L.blip(0.3); };
    g.tier = () => (g.through >= 5 ? 2 : g.through >= 3 ? 1 : 0);
    g.result = (t) => [`Most of them gutter out against the reef. (${g.through}/6)`, `Some of them make it out to sea. (${g.through}/6)`, `A line of little lights goes out to sea, and keeps going. (${g.through}/6)`][t];
    g.sync = (T, L) => {
      L.aim(0, 4.2, 12.5, 0, 0.2, -12);
      const gx = GX(g.gx); g.rocks.forEach((m) => { const d = Math.abs(m.userData.x - gx); m.position.y = d < 2.6 ? -4 : 0.5 + Math.sin(T + m.userData.x) * 0.05; });
      let k = 0; const use = (x, z, s) => { const m = g.pool[k++]; if (!m) return; m.visible = true; m.position.set(x, 0.15 + Math.sin(T * 2 + z) * 0.08, z); m.scale.setScalar(s); };
      for (const f of g.flying) use(Math.sin(f.y * 0.05) * 0.3, Z(f.y), 1);
      for (const o of g.out) use(o.x, o.z, 1);
      if (g.left > 0 && !g.flying.some((f) => f.y > 120)) use(0, 5.2, 0.9);
      for (; k < g.pool.length; k++) g.pool[k].visible = false;
    };
    g.hud = (c) => { panel(c, 244, 158, 70, 16); for (let i = 0; i < 6; i++) { rr(c, 250 + i * 10.5, 162, 7, 8, 2); c.fillStyle = i < g.left ? '#ffd890' : 'rgba(80,70,90,0.9)'; c.fill(); ol(c, 1); } };
    return g;
  },
  // ---- wreckers: arm-wrestle at a lamplit table on the beach
  arm() {
    const g = { how: 'Push with Space on the beat (when the ring closes). Off the beat you lose your grip.', p: 0, t: 0, beat: 0.62, them: 0.17, over: false, hit: 0,
      look: { sky: '#2a1c30', fog: '#3a2430', light: 0.75, sun: [0.2, 0.9, 0.4], sunCol: '#ffc880', deep: '#1a3050', shallow: '#3a5a6a', near: 20, far: 120, wave: 0.5 } };
    g.build = (root) => {
      root.add(mesh((B) => {
        B.blob(0, -1, -2, 22, 1.4, 14, '#c8a870', TILE.sand, 0.1, 3);
        B.box(0, 0, 0, 3.6, 1.0, 1.6, '#8a5a30', TILE.planks, TILE.planks, '#a87040');
        B.push(0, 0, -5, 0); B.box(0, 0, 0, 12, 3.5, 0.4, '#6b4a2e', TILE.planks); for (let i = 0; i < 6; i++) B.box(-5 + i * 2, 0, 0.3, 0.3, 3.8, 0.3, '#4a3020', TILE.bark); B.pop();
        B.box(0, 3.9, -1, 0.06, 1.0, 0.06, '#2a2026', TILE.bark); B.box(0, 3.4, -1, 0.5, 0.55, 0.5, '#ffffff', TILE.glow);
        for (let i = 0; i < 4; i++) B.blob(-6 + i * 4, 0.3, -3 + (i % 2), 0.7, 0.5, 0.6, '#5a4a3a', TILE.planks, 0.3, i);
        boat(B, 9, -9, 0.6); villager(B, -2.6, 0, 0.4, Math.PI / 2, mulberry32(30), 'docker'); villager(B, 2.6, 0, 0.4, -Math.PI / 2, mulberry32(31), 'fisher');
      }));
      root.add(mesh((B) => B.blob(0, 3.4, -1, 3.5, 2.5, 3.5, '#ffb050', TILE.glow, 0.1, 1), glowMat()));
      g.crowd = Array.from({ length: 7 }, (_, i) => { const m = mesh((B) => villager(B, 0, 0, 0, 0, mulberry32(40 + i))); m.position.set(-4.5 + i * 1.5, 0, -2.6 - (i % 2) * 0.6); root.add(m); return m; });
      const forearm = (sleeve, skin) => mesh((B) => { B.box(0, -1.1, 0, 0.32, 1.1, 0.36, skin, TILE.white); B.box(0, -1.15, 0, 0.42, 0.42, 0.44, sleeve, TILE.white); });
      g.armA = forearm('#4a3a2a', '#b8784a'); g.armB = forearm('#3c78c8', '#f0c8a0'); root.add(g.armA); root.add(g.armB);
      g.fist = mesh((B) => B.blob(0, 0, 0, 0.3, 0.26, 0.26, '#d8a070', TILE.white, 0.15, 4)); root.add(g.fist);
    };
    g.update = (dt) => { g.t += dt; g.hit = Math.max(0, g.hit - dt * 4); g.them = 0.17 + g.t * 0.006 + Math.sin(g.t * 1.7) * 0.05; g.p -= g.them * dt; if (g.p <= -1 || g.p >= 1 || g.t > 18) g.over = true; };
    g.key = (code, L) => { if (code !== 'Space') return; const ph = (g.t % g.beat) / g.beat, near = Math.min(ph, 1 - ph) * g.beat;
      if (near < 0.11) { g.p += 0.13; g.hit = 1; L.blip(0.4); L.burst3(0, 2.1, 0, [C.gold, C.ink], 6, 40); L.pop(W / 2 + rnd(-30, 30), 50, ['HUP!', 'HEAVE!', 'YES!'][Math.floor(Math.random() * 3)], C.gold); L.shake(0.1); }
      else { g.p -= 0.04; L.blip(0.15); L.pop(W / 2, 50, 'slip', '#c8b8a8'); } };
    g.tier = () => (g.p >= 1 ? 2 : g.p > 0 ? 1 : 0);
    g.result = (t) => [`Your knuckles meet the table. The wreckers cheer, for him.`, `Neither of you gives in. He shakes your hand, hard.`, `His arm goes down! The whole beach shouts.`][t];
    // a forearm from the elbow (on the table) up to the clasped fists
    const place = (m, elbow, fist) => { const d = fist.clone().sub(elbow), len = d.length(); m.position.copy(fist); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.scale.set(1, len / 1.1, 1); };
    g.sync = (T, L) => {
      L.aim(0, 2.5, 4.4, 0, 1.55, 0);
      const ang = -g.p * 0.85, F = new THREE.Vector3(Math.sin(ang) * 1.05, 1.05 + Math.cos(ang) * 1.05, 0);
      g.fist.position.copy(F);
      place(g.armA, new THREE.Vector3(-0.75, 1.15, 0), F); place(g.armB, new THREE.Vector3(0.75, 1.15, 0), F);
      g.crowd.forEach((m, i) => { m.position.y = Math.abs(Math.sin(T * 5 + i)) * (0.05 + g.hit * 0.25); });
    };
    g.hud = (c) => {
      const ph = (g.t % g.beat) / g.beat, r = 6 + (1 - ph) * 22; c.strokeStyle = C.gold; c.lineWidth = 2; c.beginPath(); c.arc(276, 40, r, 0, 6.28); c.stroke(); c.beginPath(); c.arc(276, 40, 6 + g.hit * 3, 0, 6.28); c.fillStyle = C.gold; c.fill(); ol(c, 1); txt(c, 'BEAT', 276, 72, 7, C.ink);
      rr(c, 60, 152, 200, 12, 6); c.fillStyle = 'rgba(36,26,34,0.85)'; c.fill(); ol(c, 1.4);
      const f = (g.p + 1) / 2; rr(c, 61.5, 153.5, Math.max(9, 197 * f), 9, 4.5); c.fillStyle = g.p >= 0 ? C.green : C.red; c.fill();
      c.fillStyle = C.ink; c.fillRect(159, 148, 2, 20); txt(c, 'HIM', 46, 158, 7, C.red); txt(c, 'YOU', 274, 158, 7, C.green);
    };
    return g;
  },
};
