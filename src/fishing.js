import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';
import { waveHeight } from './ocean.js';
import { clamp, smoothstep } from './util.js';

// The fishing minigame: C starts a swinging power meter and C again casts: a short cast lands by the boat (small, easy
// fish), a long one far out (bigger, rarer, harder fish, a longer wait). Wait for a bite and hook it in time (C / Space),
// then the bite ring (after Dredge): a needle sweeps round the ring; strike (C / Space) on a green mark, better on its gold
// heart. Each hit pulls the catch meter up and flips the needle; dawdle and the fish drags the meter back down. Bigger fish
// turn the needle faster and give smaller, fewer marks; dark fish (and dread) make the marks drift and the needle stall.
// It can go wrong three ways: too slow on the bite, three strikes on empty water, or the meter runs dry.
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
const CAYS_DUSK = ['sword', 'cuttle', 'moonfish'];   // regions.js: the Free Cays' fishing grounds
const inHours = (h, [a, b]) => (a <= b ? h >= a && h < b : h >= a || h < b);
/** how well a species fits the water the line is in (1 = ideal); a poor fit is never zero, so luck still counts */
export function habitatFit(id, env) {
  const hb = HABITAT[id]; if (!hb || !env) return 1;
  const cays = env.region === 'free' && CAYS_DUSK.includes(id);   // the Cays' calm water: the dusk and night fish come into open water, and bite better
  let k = hb.zones.some((z) => env.zones.includes(z)) || (cays && env.zones.includes('open')) ? 1 : 0.1;
  if (hb.hours) k *= inHours(env.hour, hb.hours) ? 1.5 * (cays ? 2 : 1) : 0.45;
  if (hb.tide) k *= env.low ? 1.6 : 0.4;
  return k;
}

// the Colour thread's catch (threads.js): not in the species list, so nobody can ask the fishers about it
export const BRIGHT_FISH = { id: 'bright', name: 'a bright fish', kg: [8, 20], price: 10, diff: 0.25, w: 0, min: 0, max: 1, bright: true };
export const fishById = (id) => FISH.find((f) => f.id === id);

// The water changes the fight (the ring plays differently by where and when you fish). Picked when the fish is hooked:
//   snag  by a wreck:        red snag marks among the green; strike one and the line catches (two misses)
//   night after dark:        the marks fade; they glow only as the needle comes near, and in a slow pulse
//   swell in rain or storm:  the needle surges and slows with the waves
//   deep  far from land:     long marks, a slow heavy needle: HOLD C / Space while it is on green, let go off it
//   reef  by rocks or reefs: the marks dart to a new place every second or so (they flicker just before)
//   calm  anywhere else:     the plain ring
export const RING_KINDS = {
  snag: { name: 'Wreck water', tip: 'Strike on green, never on red: red is the wreck.', ring: '#3a2a1a' },
  night: { name: 'Night water', tip: 'The marks only show near the needle. Strike on green.', ring: '#0a0e1c' },
  swell: { name: 'Heavy swell', tip: 'The needle surges with the waves. Strike on green.', ring: '#2a3a4a' },
  deep: { name: 'Deep water', tip: 'HOLD C / Space while the needle is on green; let go off it.', ring: '#0a2448' },
  reef: { name: 'Reef water', tip: 'The marks dart about. Strike on green before they move.', ring: '#0e4a4a' },
  calm: { name: '', tip: 'Strike (C / Space) when the needle is on a green mark. Gold is better.', ring: '#123a5a' },
};
export function ringKind(env, c) {
  const z = (env && env.zones) || [];
  if (z.includes('wreck')) return 'snag';
  if ((c.night || 0) > 0.5) return 'night';
  if (env && env.rough) return 'swell';
  if (z.includes('deep')) return 'deep';
  if (z.includes('reef') || z.includes('lagoon')) return 'reef';
  return 'calm';
}

const rnd = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

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
    this.ringCv = document.getElementById('fishring'); this.rg = this.ringCv.getContext('2d'); this.rg.imageSmoothingEnabled = false;
    this.ui.addEventListener('pointerdown', (e) => { this.press(true); e.preventDefault(); });
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
    if (this.mode === 'reel') return this.strike();
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
    const f = this.fish, df = this.diff = Math.min(0.97, f.diff + (this.power || 0) * 0.12);
    this.a = -Math.PI / 2; this.dir = 1; this.speed = 2.0 + df * 2.3; this.meter = 0.35; this.miss = 0; this.flash = 0; this.stall = 0;
    this.drain = 0.02 + df * 0.02; this.wrong = !!f.dark || (this.cb.getCtx().dread || 0) > 0.5;
    this.kind = this.fish.bright ? 'calm' : ringKind(this.env, this.lastCtx || {});
    this.zones = []; this.snags = []; this.strain = 0; this.pulse = 0; this.hold = false;
    if (this.kind === 'deep') { this.speed *= 0.6; this.drain *= 0.8; }
    for (let i = 0; i < (this.kind === 'deep' ? 2 : df > 0.75 ? 2 : 3); i++) this.addZone();
    if (this.kind === 'snag') for (let i = 0; i < (df > 0.5 ? 2 : 1); i++) this.addSnag();
    this.say = RING_KINDS[this.kind].name ? `${RING_KINDS[this.kind].name}. ${RING_KINDS[this.kind].tip}` : '';
  }
  /** a free place on the ring for an arc of this length, away from the other marks (and the needle) */
  freeSpot(len) {
    const all = [...this.zones, ...(this.snags || [])];
    let a0 = 0;
    for (let k = 0; k < 40; k++) { a0 = rnd(0, TAU); if (all.every((z) => Math.abs(angDiff(a0 + len / 2, z.a0 + z.len / 2)) > (len + z.len) / 2 + 0.25) && Math.abs(angDiff(a0 + len / 2, this.a || 0)) > len / 2 + 0.5) break; }
    return a0;
  }
  addZone() {
    const len = (this.kind === 'deep' ? 1.35 - this.diff * 0.4 : 0.85 - this.diff * 0.45) * rnd(0.85, 1.15);
    this.zones.push({ a0: this.freeSpot(len), len, drift: rnd(-0.45, 0.45), jump: rnd(1.0, 1.6) });
  }
  addSnag() { const len = rnd(0.45, 0.7); this.snags.push({ a0: this.freeSpot(len), len }); }
  /** C / Space while the ring turns */
  strike() {
    if (this.kind === 'deep') { this.hold = true; return; }   // deep water: the fight is a hold, not a tap (reel handles it)
    const snag = (this.snags || []).find((z) => Math.abs(angDiff(this.a, z.a0 + z.len / 2)) < z.len / 2);
    if (snag) {   // the hook catches on the wreck
      this.miss = Math.min(3, this.miss + 2); this.flash = 0.4; this.flashCol = '#c83a20';
      this.say = this.miss >= 3 ? '' : 'Snagged on the wreck! One strike left.';
      if (this.cb.onStrike) this.cb.onStrike('miss');
      if (this.miss >= 3) this.finish(false, 'snag');
      return;
    }
    const hit = this.zones.find((z) => Math.abs(angDiff(this.a, z.a0 + z.len / 2)) < z.len / 2);
    if (hit) {
      const gold = Math.abs(angDiff(this.a, hit.a0 + hit.len / 2)) < hit.len * 0.18;
      this.meter = Math.min(1, this.meter + (gold ? 0.3 : 0.18)); this.flash = 0.25; this.flashCol = gold ? '#ffd23a' : '#5ec45a';
      this.zones.splice(this.zones.indexOf(hit), 1); this.addZone(); this.dir *= -1;
      if (this.snags && this.snags.length) { const n = this.snags.length; this.snags = []; for (let i = 0; i < n; i++) this.addSnag(); }   // the wreck shifts under you
      this.say = gold ? 'Gold! It turns, tired.' : 'A good pull.';
      if (this.cb.onStrike) this.cb.onStrike(gold ? 'gold' : 'good');
      if (this.meter >= 1) this.finish(true);
    } else {
      this.miss++; this.flash = 0.3; this.flashCol = '#ff6a4a';   // a miss costs a miss, not the meter (three and it is gone)
      this.say = this.miss >= 3 ? '' : `Empty water. ${3 - this.miss} left.`;
      if (this.cb.onStrike) this.cb.onStrike('miss');
      if (this.miss >= 3) this.finish(false, 'miss');
    }
  }
  finish(won, why = '') {
    const f = this.fish;
    this.cancel();
    if (won) {
      const kg = +(f.kg[0] + Math.pow(Math.random(), 1.6 - 0.9 * (this.power || 0)) * (f.kg[1] - f.kg[0])).toFixed(1);   // far out, the big ones
      this.cb.onCatch({ id: f.id, name: f.name, kg, value: Math.max(1, Math.round(kg * f.price)), dark: !!f.dark, zone: this.env ? this.env.label : '', hour: this.env ? this.env.hour : 12 });
    } else if (why === 'slow') this.cb.toast(f.dark ? 'It sank away while you waited.' : 'Too slow: it swam off with the bait.');
    else if (why === 'snag') this.cb.toast('The line wraps round a rib of the wreck and parts. The fish is gone.');
    else if (why === 'strain') this.cb.toast('You held too long off the mark: the line parted.');
    else if (why === 'miss') this.cb.toast(f.dark ? 'Three strikes on nothing. Something below let go, slowly.' : 'Three strikes on empty water: it slipped the hook.');
    else this.cb.toast(f.dark ? 'The line goes slack. Something below let go on purpose.' : 'It got away!');
  }

  update(dt, t, ctx) {
    this.lastCtx = ctx; this.t = t;
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
    this.bar.style.display = 'none';
    this.ringCv.style.display = this.mode === 'reel' ? 'block' : 'none';
    this.msg.className = this.mode === 'bite' ? 'blink' : '';
    this.msg.textContent = this.mode === 'wait' ? 'Line in the water... (C pulls it in)' : this.mode === 'bite' ? (this.fish.dark ? 'SOMETHING PULLS BACK! Press C / Space!' : 'BITE! Press C / Space!')
      : this.say || RING_KINDS[this.kind || 'calm'].tip;
    if (this.mode === 'reel') this.drawRing();
  }

  /** the bite ring, drawn small and shown pixelated */
  drawRing() {
    const g = this.rg, S = 120, cx = 60, cy = 60, r = 46, dark = this.wrong;
    const arc = (a0, a1, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke(); };
    g.clearRect(0, 0, S, S);
    g.fillStyle = '#120c1c'; g.beginPath(); g.arc(cx, cy, r + 9, 0, TAU); g.fill();
    const K = this.kind || 'calm';
    arc(0, TAU, 10, RING_KINDS[K].ring);
    for (const z of this.zones) {
      const m = z.a0 + z.len / 2;
      let vis = 1;
      if (K === 'night') vis = Math.max(1 - smoothstep(0.35, 1.0, Math.abs(angDiff(this.a, m)) - z.len / 2), this.pulse > 0 ? 1 : 0);   // only near the needle, or in the pulse
      if (K === 'reef' && z.jump < 0.3 && Math.floor(z.jump * 20) % 2) vis = 0.25;   // flickers before it darts
      if (vis < 0.05) continue;
      g.globalAlpha = vis;
      arc(z.a0, z.a0 + z.len, 10, dark ? '#ff30c8' : '#5ec45a');
      if (K !== 'deep') arc(m - z.len * 0.18, m + z.len * 0.18, 10, '#ffd23a');
      g.globalAlpha = 1;
    }
    for (const z of this.snags || []) { arc(z.a0, z.a0 + z.len, 10, '#c83a20'); arc(z.a0 + z.len * 0.3, z.a0 + z.len * 0.7, 4, '#3a1a10'); }
    if (K === 'deep' && this.strain > 0) arc(0, TAU, 2, `rgba(255,106,74,${Math.min(1, this.strain / 0.7)})`);   // the line strains
    g.strokeStyle = dark ? '#ff30c8' : '#4fe0d0'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, r - 12, -Math.PI / 2, -Math.PI / 2 + TAU * this.meter); g.stroke();
    g.strokeStyle = this.flash > 0 ? this.flashCol : '#f4ead0'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(this.a) * (r + 6), cy + Math.sin(this.a) * (r + 6)); g.stroke();
    g.fillStyle = dark ? '#3a2a40' : '#1b86c6'; g.fillRect(cx - 9, cy - 3, 13, 7); g.fillRect(cx + 4, cy - 5, 4, 11); g.fillStyle = dark ? '#ff30c8' : '#0b0716'; g.fillRect(cx - 6, cy - 1, 2, 2);
    for (let i = 0; i < 3; i++) { g.fillStyle = i < this.miss ? '#ff6a4a' : '#3a3070'; g.fillRect(4 + i * 8, 4, 6, 6); }
  }

  reel(dt) {
    this.flash = Math.max(0, this.flash - dt);
    const K = this.kind || 'calm';
    if (this.wrong && this.stall <= 0 && Math.random() < dt * 0.25) this.stall = 0.6;   // the needle stops, and looks back
    const surge = K === 'swell' ? 0.45 + 1.1 * (0.5 + 0.5 * Math.sin((this.t || 0) * 1.9)) : 1;   // the swell: the needle surges and slows
    if (this.stall > 0) this.stall -= dt; else this.a += this.dir * this.speed * surge * dt;
    if (K === 'night') { this.pulse -= dt; if (this.pulse < -1.4) this.pulse = 0.28; }
    if (K === 'reef') for (const z of this.zones) { z.jump -= dt; if (z.jump <= 0) { const i = this.zones.indexOf(z); this.zones.splice(i, 1); z.a0 = this.freeSpot(z.len); z.jump = rnd(1.0, 1.6); this.zones.splice(i, 0, z); } }
    if (K === 'deep') {   // hold on the mark to pull it in; hold off the mark and the line strains
      const on = this.zones.some((z) => Math.abs(angDiff(this.a, z.a0 + z.len / 2)) < z.len / 2);
      if (this.hold && on) { this.meter = Math.min(1, this.meter + (0.2 - this.diff * 0.06) * dt); this.flash = 0.05; this.flashCol = '#5ec45a'; this.strain = Math.max(0, this.strain - dt); if (this.meter >= 1) { this.finish(true); return; } }
      else if (this.hold) { this.strain += dt; if (this.strain > 0.7) { this.strain = 0; this.miss++; this.hold = false; this.say = this.miss >= 3 ? '' : `The line screams. Let go off the mark! ${3 - this.miss} left.`; if (this.cb.onStrike) this.cb.onStrike('miss'); if (this.miss >= 3) { this.finish(false, 'strain'); return; } } }
      else this.strain = Math.max(0, this.strain - dt * 2);
      if (this.a > TAU * 4 || this.a < -TAU * 4) this.a %= TAU;
    }
    if (this.wrong) for (const z of this.zones) z.a0 += z.drift * dt;
    this.meter = Math.max(0, this.meter - this.drain * dt);
    if (this.meter <= 0) this.finish(false, 'slow');
  }
}
