import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';
import { waveHeight } from './ocean.js';
import { clamp, smoothstep } from './util.js';

// A relaxed fishing minigame: cast (C), wait for a bite, hook it (C / Space), then keep the
// moving marker inside the green zone by holding / releasing Space. Fish are sold at harbours.
// Species drift from cheerful to wrong with dread.
export const FISH = [
  // id, name, weight(rarity), difficulty, price/kg, kg range, dread range, night only, dark?
  { id: 'sardine', name: 'Sardine', w: 10, diff: 0.2, price: 5, kg: [0.1, 0.4], min: 0, max: 0.75 },
  { id: 'snapper', name: 'Red snapper', w: 8, diff: 0.35, price: 7, kg: [0.8, 3], min: 0, max: 0.7 },
  { id: 'mahi', name: 'Mahi-mahi', w: 4, diff: 0.5, price: 7, kg: [2, 9], min: 0, max: 0.65 },
  { id: 'tuna', name: 'Bluefin tuna', w: 2.5, diff: 0.68, price: 3, kg: [8, 40], min: 0, max: 0.6 },
  { id: 'sword', name: 'Swordfish', w: 1, diff: 0.85, price: 4, kg: [20, 80], min: 0, max: 0.6 },
  { id: 'grouper', name: 'Golden grouper', w: 0.5, diff: 0.6, price: 14, kg: [3, 12], min: 0, max: 0.5 },
  { id: 'lantern', name: 'Pale lanternfish', w: 5, diff: 0.4, price: 14, kg: [0.2, 1], min: 0.3, max: 1, night: true, dark: true },
  { id: 'eel', name: 'Glass eel that remembers', w: 4, diff: 0.55, price: 20, kg: [1, 4], min: 0.35, max: 1, dark: true },
  { id: 'pike', name: 'Many-eyed pike', w: 3, diff: 0.7, price: 12, kg: [3, 10], min: 0.5, max: 1, dark: true },
  { id: 'key', name: 'A fish shaped like a key', w: 1, diff: 0.75, price: 60, kg: [0.5, 2], min: 0.55, max: 1, dark: true },
  { id: 'angler', name: 'Drowned angler', w: 1.5, diff: 0.9, price: 6, kg: [10, 50], min: 0.7, max: 1, night: true, dark: true },
];
export const fishById = (id) => FISH.find((f) => f.id === id);

const rnd = (a, b) => a + Math.random() * (b - a);

export class Fishing {
  constructor(scene, ship, cbs) {
    this.scene = scene; this.ship = ship; this.cb = cbs;
    this.mode = 'idle';
    this.hold = false;
    this.t = 0;
    // bobber + line
    const b = new Builder(); b.doubleSided = true;
    b.blob(0, 0, 0, 0.28, 0.28, 0.28, '#f4f0e6', TILE.white, 0.04, 1);
    b.blob(0, 0.22, 0, 0.22, 0.2, 0.22, '#d63a30', TILE.white, 0.04, 2);
    this.bobber = new THREE.Mesh(b.geometry(), mats.props);
    this.bobber.visible = false; scene.add(this.bobber);
    this.rod = new THREE.Group(); this.rod.visible = false; scene.add(this.rod);
    this.castT = 0;
    this.setStyle(cbs.rodStyle || 'cane');
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3));
    this.line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xece4cc, fog: false }));
    this.line.visible = false; this.line.frustumCulled = false; scene.add(this.line);
    // UI
    this.ui = document.getElementById('fishui');
    this.msg = document.getElementById('fishmsg');
    this.bar = document.getElementById('fishbar');
    this.zoneEl = document.getElementById('fishzone');
    this.markEl = document.getElementById('fishmark');
    this.progEl = document.getElementById('fishprog');
    this.ui.addEventListener('pointerdown', (e) => { this.hold = true; this.press(true); e.preventDefault(); });
    this.ui.addEventListener('pointerup', () => { this.hold = false; });
    this.ui.addEventListener('pointerleave', () => { this.hold = false; });
  }

  /** what you fish with: 'hand' (a line thrown from a wooden winder at the rail) or a small rod: 'cane', 'reel', 'driftwood' */
  setStyle(style) {
    this.style = style;
    for (const ch of [...this.rod.children]) { this.rod.remove(ch); ch.geometry.dispose(); }
    const r = new Builder();   // rods are built along +z from the butt, at ship scale (the hull is ~5 long)
    if (style === 'hand') {      // a cross-shaped winder with the line wound round it, resting on the rail
      r.box(0, 0, 0, 0.5, 0.12, 0.12, '#8a5a30', TILE.bark); r.box(0, 0, 0, 0.12, 0.12, 0.5, '#8a5a30', TILE.bark);
      r.box(0, 0, 0, 0.3, 0.16, 0.3, '#e8dcc0', TILE.white);
      this.rodLen = 0;
    } else if (style === 'reel') { // short rod: cork grip, brass reel, dark tip
      r.box(0, 0, 0.25, 0.12, 0.12, 0.5, '#d8b080', TILE.white); r.box(0, -0.1, 0.42, 0.16, 0.14, 0.14, '#c9a85c', TILE.white);
      r.box(0, 0, 1.05, 0.08, 0.08, 1.1, '#8a5a30', TILE.white); this.rodLen = 1.6;
    } else if (style === 'driftwood') { // a crooked grey branch, line wound on a peg
      r.box(0, 0, 0.4, 0.13, 0.13, 0.8, '#b8ac94', TILE.white); r.box(0.06, 0, 1.15, 0.1, 0.1, 0.75, '#c8bca4', TILE.white);
      r.box(0.1, 0.05, 0.25, 0.18, 0.06, 0.06, '#5a3a1c', TILE.bark); this.rodLen = 1.5;
    } else {                     // 'cane': a slim bamboo pole with a cord-wrapped grip and darker nodes
      r.box(0, 0, 0.2, 0.12, 0.12, 0.4, '#7a4a26', TILE.white); r.box(0, 0, 1.05, 0.08, 0.08, 1.3, '#e8cc88', TILE.white);
      for (const z of [0.7, 1.1, 1.5]) r.box(0, 0, z, 0.1, 0.1, 0.05, '#a88850', TILE.white);
      this.rodLen = 1.75;
    }
    this.rod.add(new THREE.Mesh(r.geometry(), mats.props));
  }

  get active() { return this.mode !== 'idle'; }

  /** C or tap: cast / hook / pull the line in */
  press(fromReel = false) {
    if (this.mode === 'idle') return this.start();
    if (this.mode === 'bite') return this.hook();
    if (this.mode === 'wait' && !fromReel) return this.cancel('You reel in the empty line.');
    return null;
  }
  start() {
    const s = this.ship;
    if (s.speed > 2.5) { this.cb.toast('Too fast to fish: reef the sails (S) and let the ship slow down.'); return; }
    const rx = Math.cos(s.heading), rz = Math.sin(s.heading), fx = Math.sin(s.heading), fz = -Math.cos(s.heading);
    this.pos = { x: s.pos.x + rx * 4.8 + fx * 1.5, z: s.pos.z + rz * 4.8 + fz * 1.5 };
    // swing back, flick forward, the bobber flies out on an arc; then the wait begins
    this.mode = 'cast'; this.castT = 0; this.timer = 0; this.wait = rnd(2.5, 7) * (1 - 0.25 * this.cb.getCtx().bonus);
    this.rod.visible = true; this.bobber.visible = false; this.line.visible = false;
    this.cb.onStart();
  }
  cancel(text) {
    this.mode = 'idle'; this.bobber.visible = false; this.line.visible = false; this.rod.visible = false; this.ui.style.display = 'none';
    if (text) this.cb.toast(text);
  }
  pick(ctx) {
    const list = FISH.filter((f) => ctx.dread >= f.min && ctx.dread <= f.max && (!f.night || ctx.night > 0.5));
    const ws = list.map((f) => f.w * (f.dark ? 0.4 + ctx.dread : 1.25 - ctx.dread * 0.9));
    let r = Math.random() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; }
    return list[0];
  }
  hook() {
    this.mode = 'reel';
    const f = this.fish;
    this.zone = 0.5; this.zw = 0.34 - 0.13 * f.diff; this.fp = 0.5; this.ft = 0.5; this.fnext = 0; this.prog = 0.3;
  }
  finish(won) {
    const f = this.fish;
    this.cancel();
    if (won) {
      const kg = +(f.kg[0] + Math.pow(Math.random(), 1.6) * (f.kg[1] - f.kg[0])).toFixed(1);
      this.cb.onCatch({ id: f.id, name: f.name, kg, value: Math.max(1, Math.round(kg * f.price)), dark: !!f.dark });
    } else this.cb.toast(f.dark ? 'The line goes slack. Something below let go on purpose.' : 'It got away!');
  }

  update(dt, t, ctx) {
    if (this.mode === 'idle') return;
    const s = this.ship;
    if (s.speed > 3.2) { this.cancel('You pull the line in: the ship is moving too fast.'); return; }
    this.timer += dt;
    const p = this.pos, w = waveHeight(p.x, p.z, t, ctx.wave);
    let dip = 0;
    // the rod: butt at the starboard rail, pointing out over the water
    const rx = Math.cos(s.heading), rz = Math.sin(s.heading), base = new THREE.Vector3(s.pos.x + rx * 1.1, 1.9, s.pos.z + rz * 1.1);
    let pitch = 0.55;
    if (this.mode === 'cast') {
      this.castT += dt; const c = this.castT;
      pitch = c < 0.3 ? 0.55 + (1.9 - 0.55) * smoothstep(0, 0.3, c) : c < 0.5 ? 1.9 - 1.7 * smoothstep(0.3, 0.5, c) : 0.2 + 0.35 * smoothstep(0.5, 1.0, c);
    } else if (this.mode === 'bite' || this.mode === 'reel') pitch = 0.75 + Math.sin(t * 14) * 0.08;   // bent by the fish
    let tip;
    if (this.style === 'hand') {   // the winder sits on the rail; the line leaves from a hand's reach outboard
      base.y = 1.55; this.rod.position.copy(base); this.rod.rotation.set(0, -s.heading, 0);
      const swing = this.mode === 'cast' ? Math.sin(Math.min(1, this.castT / 0.45) * Math.PI) * 0.6 : 0;   // the arm swings the line round
      tip = new THREE.Vector3(base.x + rx * (0.5 + swing * 0.4), base.y + 0.5 + swing, base.z + rz * (0.5 + swing * 0.4));
    } else {
      const out = Math.cos(pitch) * this.rodLen; tip = new THREE.Vector3(base.x + rx * out, base.y + Math.sin(pitch) * this.rodLen, base.z + rz * out);
      this.rod.position.copy(base); this.rod.lookAt(tip);
    }
    if (this.mode === 'cast') {
      const k = smoothstep(0.42, 0.95, this.castT);
      this.bobber.visible = this.line.visible = this.castT > 0.42;
      if (this.castT >= 1.0) { this.mode = 'wait'; this.timer = 0; if (this.cb.onSplash) this.cb.onSplash(); }
      const bx = tip.x + (p.x - tip.x) * k, bz = tip.z + (p.z - tip.z) * k, by = tip.y + (w + 0.15 - tip.y) * k + Math.sin(k * Math.PI) * 2.6;
      this.bobber.position.set(bx, by, bz);
      const a = this.line.geometry.attributes.position;
      a.setXYZ(0, tip.x, tip.y, tip.z); a.setXYZ(1, (tip.x + bx) / 2, (tip.y + by) / 2 + 0.3, (tip.z + bz) / 2); a.setXYZ(2, bx, by, bz); a.needsUpdate = true;
      this.ui.style.display = 'none';
      return;
    }
    if (this.mode === 'wait') {
      if (this.timer >= this.wait) { this.mode = 'bite'; this.timer = 0; this.fish = this.pick(ctx); this.cb.onBite(this.fish); }
    } else if (this.mode === 'bite') {
      dip = -0.45 + Math.sin(t * 40) * 0.1;
      if (this.timer > 1.3) { this.cancel(this.fish.dark ? 'Whatever bit has lost interest.' : 'The fish spat the hook.'); return; }
    } else if (this.mode === 'reel') {
      this.reel(dt);
      if (this.mode === 'idle') return;
      dip = Math.sin(t * 18) * 0.12;
    }
    this.bobber.position.set(p.x, w + 0.15 + dip + Math.sin(t * 2.2) * 0.04, p.z);
    const a = this.line.geometry.attributes.position;
    const rail = [tip.x, tip.y, tip.z];
    a.setXYZ(0, rail[0], rail[1], rail[2]);
    a.setXYZ(1, (rail[0] + p.x) / 2, Math.max(w + 0.4, (rail[1] + w) / 2 - 0.6), (rail[2] + p.z) / 2);
    a.setXYZ(2, p.x, this.bobber.position.y, p.z);
    a.needsUpdate = true;

    // UI
    this.ui.style.display = 'block';
    this.bar.style.display = this.mode === 'reel' ? 'block' : 'none';
    this.msg.className = this.mode === 'bite' ? 'blink' : '';
    this.msg.textContent = this.mode === 'wait' ? 'Line in the water... (C pulls it in)' : this.mode === 'bite' ? (this.fish.dark ? 'SOMETHING PULLS BACK! Press C / Space!' : 'BITE! Press C / Space!') : 'Hold SPACE to reel, release to ease off';
    if (this.mode === 'reel') {
      this.zoneEl.style.left = `${(this.zone - this.zw / 2) * 100}%`; this.zoneEl.style.width = `${this.zw * 100}%`;
      this.markEl.style.left = `${this.fp * 100}%`;
      this.progEl.style.width = `${this.prog * 100}%`;
    }
  }

  reel(dt) {
    const f = this.fish;
    this.fnext -= dt;
    if (this.fnext <= 0) { this.ft = rnd(0.08, 0.92); this.fnext = rnd(0.5, 1.1) / (0.6 + f.diff); }
    this.fp += clamp(this.ft - this.fp, -1, 1) * Math.min(1, dt * (1.2 + 2.2 * f.diff));
    this.zone = clamp(this.zone + (this.hold ? 0.9 : -0.75) * dt, this.zw / 2, 1 - this.zw / 2);
    const inside = Math.abs(this.fp - this.zone) < this.zw / 2;
    this.prog += (inside ? 0.3 * (1.2 - f.diff * 0.5) : -0.24) * dt;
    if (this.prog >= 1) this.finish(true);
    else if (this.prog <= 0) this.finish(false);
  }
}
