import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';
import { waveHeight } from './ocean.js';
import { clamp, smoothstep } from './util.js';

// The fishing minigame: C starts a swinging power meter and C again casts: a short cast lands by the boat (small, easy
// fish), a long one far out (bigger, rarer, harder fish, a longer wait). Wait for a bite and hook it in time (C / Space),
// then keep the moving marker inside the green zone by holding / releasing Space. Now and then the fish RUNS: hold on
// through a run and the line's tension climbs, and at the top the line snaps. Ease off, let it run, then reel again.
// It can go wrong three ways: too slow on the bite, the fish gets away (progress runs out), or the line snaps.
// Fish are sold at harbours.
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
  { id: 'cuttle', name: 'Cuttlefish', w: 3, diff: 0.45, price: 9, kg: [0.3, 2], min: 0, max: 0.7 },
  { id: 'barracuda', name: 'Barracuda', w: 3, diff: 0.7, price: 6, kg: [3, 15], min: 0, max: 0.7 },
  { id: 'bream', name: 'Sea bream', w: 6, diff: 0.3, price: 6, kg: [0.5, 2.5], min: 0, max: 0.7 },
  { id: 'moonfish', name: 'Moonfish', w: 2, diff: 0.5, price: 10, kg: [1, 6], min: 0, max: 0.7 },
];
/** where and when each bright species bites. Nothing in the game points at these: the player learns them by fishing and by asking the fishers. */
export const HABITAT = {
  sardine: { zones: ['shallows', 'harbour'], text: 'Sardines run in the shallows, near any island and in the harbours, all day.', say: 'Sardines? Anywhere close to land. Right off the beach, the harbours. Any hour.' },
  snapper: { zones: ['reef'], hours: [5, 11], text: 'Red snapper keep to rocky edges and reefs, mornings mostly.', say: 'Snapper hug the rocky shores and the reefs. Early. Before the sun is high.' },
  mahi: { zones: ['open', 'deep'], hours: [5, 12], text: 'Mahi-mahi run in open water, away from land, in the morning.', say: 'Mahi-mahi like the open blue, well off the land, and the morning.' },
  tuna: { zones: ['deep'], hours: [13, 19], text: 'Bluefin tuna hold in the deep water, far from any island, in the afternoon.', say: 'Tuna are out in the deep stretches, far from land. Afternoons.' },
  sword: { zones: ['deep'], hours: [17, 22], text: 'Swordfish come up in the deep water around dusk.', say: 'Swordfish, out in the deep, round dusk. Strong back, strong line.' },
  grouper: { zones: ['wreck'], hours: [5, 12], tide: 'low', text: 'Golden grouper sulk under wrecks, at low tide, mornings.', say: 'Golden groupers? Under the wrecks. Low tide. Mornings. Tell nobody.' },
  cuttle: { zones: ['lagoon'], hours: [17, 22], text: 'Cuttlefish drift in the lagoon of a ring island at dusk.', say: 'Cuttlefish like the still water inside a ring of sand. Dusk.' },
  barracuda: { zones: ['reef'], hours: [10, 16], text: 'Barracuda patrol reef edges at midday.', say: 'Barracuda off the rocky edges, midday, when the light is hard.' },
  bream: { zones: ['harbour'], hours: [16, 21], text: 'Sea bream gather by harbour piers in the evening.', say: 'Bream like the pilings of a pier, evenings, with the cooking smoke on the water.' },
  moonfish: { zones: ['open', 'deep'], hours: [21, 4], text: 'Moonfish rise in open water on dark nights.', say: 'Moonfish? Open water, deep night. They come up for the moon.' },
};
const inHours = (h, [a, b]) => (a <= b ? h >= a && h < b : h >= a || h < b);
/** how well a species fits the water the line is in (1 = ideal); a poor fit is never zero, so luck still counts */
export function habitatFit(id, env) {
  const hb = HABITAT[id]; if (!hb || !env) return 1;
  let k = hb.zones.some((z) => env.zones.includes(z)) ? 1 : 0.1;
  if (hb.hours) k *= inHours(env.hour, hb.hours) ? 1.5 : 0.45;
  if (hb.tide) k *= env.low ? 1.6 : 0.4;
  return k;
}

// the Colour thread's catch (threads.js): not in the species list, so nobody can ask the fishers about it
export const BRIGHT_FISH = { id: 'bright', name: 'a bright fish', kg: [8, 20], price: 10, diff: 0.25, w: 0, min: 0, max: 1, bright: true };
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
    this.buildRod();
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
    this.tenEl = document.getElementById('fishten');   // line tension (it snaps at the top)
    this.ui.addEventListener('pointerdown', (e) => { this.hold = true; this.press(true); e.preventDefault(); });
    this.ui.addEventListener('pointerup', () => { this.hold = false; });
    this.ui.addEventListener('pointerleave', () => { this.hold = false; });
  }

  /** the rod: a slim bamboo cane with a cord-wrapped grip and darker nodes, built along +z from the butt (the hull is ~5 long) */
  buildRod() {
    const r = new Builder();
    r.box(0, 0, 0.2, 0.12, 0.12, 0.4, '#7a4a26', TILE.white); r.box(0, 0, 1.05, 0.08, 0.08, 1.3, '#e8cc88', TILE.white);
    for (const z of [0.7, 1.1, 1.5]) r.box(0, 0, z, 0.1, 0.1, 0.05, '#a88850', TILE.white);
    this.rodLen = 1.75;
    this.rod.add(new THREE.Mesh(r.geometry(), mats.props));
  }

  get active() { return this.mode !== 'idle'; }

  /** C or tap: cast / hook / pull the line in */
  press(fromReel = false) {
    if (this.mode === 'idle') return this.start();
    if (this.mode === 'aim') return this.cast();
    if (this.mode === 'bite') return this.hook();
    if (this.mode === 'wait' && !fromReel) return this.cancel('You reel in the empty line.');
    return null;
  }
  start() {
    const s = this.ship;
    if (s.speed > 2.5) { this.cb.toast('Too fast to fish: reef the sails (S) and let the ship slow down.'); return; }
    // first the power meter: it swings until C is pressed again
    this.mode = 'aim'; this.aimT = Math.random() * 0.5; this.power = 0;
    this.rod.visible = true; this.bobber.visible = false; this.line.visible = false;
  }
  /** C again: cast at the power the meter shows */
  cast() {
    const s = this.ship, pw = this.power;
    const rx = Math.cos(s.heading), rz = Math.sin(s.heading), fx = Math.sin(s.heading), fz = -Math.cos(s.heading), dist = 3.2 + 7.5 * pw;
    this.pos = { x: s.pos.x + rx * dist + fx * 1.5, z: s.pos.z + rz * dist + fz * 1.5 };
    // swing back, flick forward, the bobber flies out on an arc; then the wait begins (far out the fish take longer to find it)
    this.mode = 'cast'; this.castT = 0; this.timer = 0; this.wait = rnd(2.5, 7) * (1 - 0.25 * this.cb.getCtx().bonus) + pw * 2.5;
    this.cb.onStart();
  }
  cancel(text) {
    this.mode = 'idle'; this.bobber.visible = false; this.line.visible = false; this.rod.visible = false; this.ui.style.display = 'none';
    if (text) this.cb.toast(text);
  }
  pick(ctx) {
    if (ctx.env && ctx.env.colour && Math.random() < 0.7) { this.env = ctx.env; return BRIGHT_FISH; }   // in the wrong water most bites are the wrong fish
    const list = FISH.filter((f) => ctx.dread >= f.min && ctx.dread <= f.max && (!f.night || ctx.night > 0.5));
    this.env = ctx.env || null;
    const far = (this.power || 0.5) - 0.5;   // a long cast favours the big, hard fish; a short one the small, easy ones
    const ws = list.map((f) => f.w * Math.exp(far * 3.2 * (f.diff - 0.45)) * (f.dark ? 0.4 + ctx.dread : (1.25 - ctx.dread * 0.9) * habitatFit(f.id, ctx.env)));
    let r = Math.random() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; }
    return list[0];
  }
  hook() {
    this.mode = 'reel';
    const f = this.fish;
    this.diff = Math.min(0.97, f.diff + (this.power || 0) * 0.12);
    this.zone = 0.5; this.zw = 0.34 - 0.13 * this.diff; this.fp = 0.5; this.ft = 0.5; this.fnext = 0; this.prog = 0.3;
    this.tension = 0; this.run = 0; this.nextRun = rnd(2.2, 4.5) / (0.6 + this.diff);
  }
  finish(won, why = '') {
    const f = this.fish;
    this.cancel();
    if (won) {
      const kg = +(f.kg[0] + Math.pow(Math.random(), 1.6 - 0.9 * (this.power || 0)) * (f.kg[1] - f.kg[0])).toFixed(1);   // far out, the big ones
      this.cb.onCatch({ id: f.id, name: f.name, kg, value: Math.max(1, Math.round(kg * f.price)), dark: !!f.dark, zone: this.env ? this.env.label : '', hour: this.env ? this.env.hour : 12 });
    } else if (why === 'snap') this.cb.toast(f.dark ? 'The line snaps. Something below kept the hook.' : 'SNAP! The line broke: you held on too hard while it ran.');
    else this.cb.toast(f.dark ? 'The line goes slack. Something below let go on purpose.' : 'It got away!');
  }

  update(dt, t, ctx) {
    if (this.mode === 'idle') return;
    const s = this.ship;
    if (s.speed > 3.2) { this.cancel('You pull the line in: the ship is moving too fast.'); return; }
    this.timer += dt;
    const p = this.pos || s.pos, w = waveHeight(p.x, p.z, t, ctx.wave);   // (no bobber yet while aiming)
    let dip = 0;
    // the rod: butt at the starboard rail, pointing out over the water
    const rx = Math.cos(s.heading), rz = Math.sin(s.heading), base = new THREE.Vector3(s.pos.x + rx * 1.1, 1.9, s.pos.z + rz * 1.1);
    let pitch = 0.55;
    if (this.mode === 'aim') {   // the power meter: a needle swinging from "by the boat" to "far out"
      this.aimT += dt; const ph = (this.aimT / 1.15) % 2; this.power = ph < 1 ? ph : 2 - ph;
      pitch = 0.9 + this.power * 0.9;
      const out0 = Math.cos(pitch) * this.rodLen; this.rod.position.copy(base); this.rod.lookAt(new THREE.Vector3(base.x + rx * out0, base.y + Math.sin(pitch) * this.rodLen, base.z + rz * out0));
      this.ui.style.display = 'block'; this.bar.style.display = 'block'; this.msg.className = '';
      this.msg.textContent = 'Press C to cast: short = small fish, far = big fish (harder)';
      this.zoneEl.style.left = '0%'; this.zoneEl.style.width = `${this.power * 100}%`; this.zoneEl.style.background = 'rgba(255, 210, 58, .5)';
      this.markEl.style.left = `${this.power * 100}%`; this.progEl.style.width = '0%'; if (this.tenEl) this.tenEl.parentNode.style.display = 'none';
      return;
    }
    if (this.mode === 'cast') {
      this.castT += dt; const c = this.castT;
      pitch = c < 0.3 ? 0.55 + (1.9 - 0.55) * smoothstep(0, 0.3, c) : c < 0.5 ? 1.9 - 1.7 * smoothstep(0.3, 0.5, c) : 0.2 + 0.35 * smoothstep(0.5, 1.0, c);
    } else if (this.mode === 'bite' || this.mode === 'reel') pitch = 0.75 + Math.sin(t * 14) * 0.08;   // bent by the fish
    const out = Math.cos(pitch) * this.rodLen, tip = new THREE.Vector3(base.x + rx * out, base.y + Math.sin(pitch) * this.rodLen, base.z + rz * out);
    this.rod.position.copy(base); this.rod.lookAt(tip);
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
    if (this.mode === 'reel' && this.run > 0) this.msg.className = 'blink';
    this.msg.textContent = this.mode === 'wait' ? 'Line in the water... (C pulls it in)' : this.mode === 'bite' ? (this.fish.dark ? 'SOMETHING PULLS BACK! Press C / Space!' : 'BITE! Press C / Space!')
      : this.run > 0 ? (this.fish.dark ? 'IT PULLS DOWN! Let go of SPACE!' : 'IT RUNS! Let go of SPACE or the line snaps!') : 'Hold SPACE to reel, release to ease off';
    if (this.mode === 'reel') {
      this.zoneEl.style.background = '';
      if (this.tenEl) { this.tenEl.parentNode.style.display = 'block'; this.tenEl.style.width = `${this.tension * 100}%`; this.tenEl.style.background = this.tension > 0.7 ? '#ff4a3a' : '#e89a3a'; }
      this.zoneEl.style.left = `${(this.zone - this.zw / 2) * 100}%`; this.zoneEl.style.width = `${this.zw * 100}%`;
      this.markEl.style.left = `${this.fp * 100}%`;
      this.progEl.style.width = `${this.prog * 100}%`;
    }
  }

  reel(dt) {
    const df = this.diff;
    // runs: the fish bolts for the edge; hold on through it and the tension climbs
    this.nextRun -= dt;
    if (this.run <= 0 && this.nextRun <= 0) { this.run = rnd(0.9, 1.6); this.ft = this.fp < 0.5 ? 0.97 : 0.03; this.nextRun = rnd(2.5, 5.5) / (0.6 + df); }
    if (this.run > 0) this.run -= dt;
    this.fnext -= dt;
    if (this.run <= 0 && this.fnext <= 0) { this.ft = rnd(0.08, 0.92); this.fnext = rnd(0.5, 1.1) / (0.6 + df); }
    this.fp += clamp(this.ft - this.fp, -1, 1) * Math.min(1, dt * (1.2 + 2.2 * df) * (this.run > 0 ? 1.8 : 1));
    this.zone = clamp(this.zone + (this.hold ? 0.9 : -0.75) * dt, this.zw / 2, 1 - this.zw / 2);
    this.tension = clamp(this.tension + (this.run > 0 ? (this.hold ? 0.85 + 0.6 * df : -0.4) : (this.hold ? 0.06 : -0.45)) * dt, 0, 1);
    const inside = Math.abs(this.fp - this.zone) < this.zw / 2;
    this.prog += (inside ? 0.3 * (1.2 - df * 0.5) : -0.24) * dt;
    if (this.tension >= 1) this.finish(false, 'snap');
    else if (this.prog >= 1) this.finish(true);
    else if (this.prog <= 0) this.finish(false);
  }
}
