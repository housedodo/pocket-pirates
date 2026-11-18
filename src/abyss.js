import { isKnown } from './clues.js';
import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats, psxMaterial, getAtlas } from './psx.js';
import { shipGeos } from './ship.js';
import { shoreR, terrainHeight } from './world.js';
import { hoursPerSecond } from './daynight.js';
import { smoothstep, clamp } from './util.js';
import { keptBack } from './regions.js';
import { FRUITS } from './fruit.js';
import { rt } from './core/runtime.js';
const KEPT_FROM = 0.2;   // how deep (abyss.k, 0 at dread 0.86 .. 1 at 0.97) before the deep gives back what the Drowned kept

// Full dread ("the abyss"): twelve separate effects that only happen in the very worst water.
// Every effect can be switched on/off in the pause menu and tried on its own, so they can be
// compared and the best ones kept.
export const EFFECTS = [
  { id: 'calm', name: 'Glass calm', desc: 'The sea goes mirror-flat. Your reflection does not quite match you.' },
  { id: 'hud', name: 'Corrupted HUD', desc: 'Place names rewrite themselves, the clock runs backwards, the gold whispers.' },
  { id: 'wind', name: 'Mad wind meter', desc: 'The needle spins and the ring flickers as if the wind came from everywhere.' },
  { id: 'mara', name: 'Mara breaks', desc: 'Her lines glitch, she says things she should not, then stops answering.' },
  { id: 'lights', name: 'Lighthouses stare', desc: 'Every lighthouse swings its beam down onto your ship, holds it there, then goes dark.' },
  { id: 'watchers', name: 'Watchers', desc: 'Figures on the shores turn to face you. Four looks, from subtle to scary (Style button).' },
  { id: 'map', name: 'Living map', desc: 'The chart draws itself: islands crawl and places you never saw appear.' },
  { id: 'loop', name: 'Time loop', desc: 'Two black suns. Every so often the last twenty seconds happen again.' },
  { id: 'ocean', name: 'Wrong ocean', desc: 'Waves run backwards, the horizon tilts, the sails fight the wind.' },
  { id: 'catch', name: 'Wrong catches', desc: 'Your line brings up memories; chests hold things you already own.' },
  { id: 'leviathan', name: 'Leviathan & the Eye', desc: 'Vast arches rise at the horizon. Linger too long and the Eye awakens (ending).' },
];

const GRADED = new Set(['calm', 'wind', 'hud', 'ocean']);   // effects that can be shown at partial strength

const MARA_LINES = [
  'Captain, I c-c-can\'t remember which way is home. Can you?',
  'We have always been sailing here. Haven\'t we? Haven\'t we.',
  'Who is steering? Who is steering? Who is st',
  'Eleven answered at roll call this morning. I did not call it.',
  'Are you looking at me, Captain? Somebody is.',
  'Mara is not here right now. Please leave a message after the tide.',
  'The water is clear here. I can see a long way down. A long way.',
  'What was your name? I wrote it in the log and the ink moved.',
  '. . . . . . . . . . . .',
  'We could still turn. We could still turn. We could',
  'The stars are not where I left them.',
];
const MARA_HINTS = ['Mara does not answer. Her hat is lying on the deck.', 'Mara is staring at the horizon and will not turn around.', 'Someone answers in Mara\'s voice, from below the deck.'];
// E1 (owner, 2026-11-18): "the Eye" is the player's own word for what they see, named only at the very bottom (EYE_K: the leviathan's
// water, where fullTime runs). E2: the stock lines rewritten in the game's own flat voice (drafts, docs/WRITER_TODO.txt 4.7).
export const EYE_K = 0.9;
const EYE_LIES = new Set(['THE EYE', 'The Eye']);
const PLACE_LIES = ['TAMA IS THAT WAY', 'you passed here', 'HOME?', 'first time here?', 'THE EYE', 'the same water', 'here', 'Harbour T̶a̶m̶a̶'];
const GOLD_LIES = ['???', 'they count it too', '0', '∞', 'not yours'];
const TRACK_LIES = ['Find your way home', 'There is nothing to deliver', 'Keep sailing', 'Nothing behind you'];
const MAP_NAMES = ['Here', 'Where the Gull lies', 'Tama?', 'The Last Harbour', 'Your Island', 'Nowhere', 'The Eye'];
const MEMORIES = [
  ['Your own compass', 'It points at you.'], ['A letter in your handwriting', 'You have not written it yet.'], ['Mara\'s hat', 'It is dry.'],
  ['The fish you caught yesterday', 'Still alive. Still looking at you.'], ['A key to your cabin', 'The lock was changed long ago.'],
  ['A small wooden ship', 'It is the Gull, carved by someone who knew it well.'], ['A lantern, still lit', 'Underwater. For years.'],
];
// E3 (owner, 2026-11-18): text breaks every way at full dread, varied, so it reads as the game itself failing, not one effect:
// letters to blocks, letters dropped, a word stuck and repeated, a line cut off mid-word, or two of these at once.
const GLITCH = '▓▒░█▚▞';
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const BREAKS = {
  blocks: (s, amt) => [...s].map((ch) => (ch !== ' ' && Math.random() < amt ? pick(GLITCH) : ch)).join(''),
  drop: (s, amt) => [...s].filter((ch) => ch === ' ' || Math.random() >= amt).join(''),
  repeat: (s) => { const w = s.split(' '); if (w.length < 2) return `${s} ${s}`; const i = Math.floor(Math.random() * w.length); w.splice(i, 0, ...Array(1 + Math.floor(Math.random() * 2)).fill(w[i])); return w.join(' '); },
  cut: (s) => (s.length < 6 ? s : s.slice(0, Math.max(3, Math.floor(s.length * (0.35 + Math.random() * 0.45))))),
};
/** break a line one of the ways (or two); amt is how hard */
export function corrupt(s, amt) {
  const ways = Object.keys(BREAKS), a = pick(ways);
  let out = BREAKS[a](s, amt);
  if (Math.random() < 0.25) { const b = pick(ways.filter((w) => w !== a && w !== 'cut')); out = BREAKS[b](out, amt * 0.6); }
  return out;
}
/** a lie from a list: the Eye's own names only at the very bottom (E1) */
const lie = (list, k) => pick(k >= EYE_K ? list : list.filter((x) => !EYE_LIES.has(x)));
const ramp = (t, a, b, len) => clamp(Math.min((t - a) / 2.5, (b - t) / 2.5, 1), 0, 1) * (len > 0 ? 1 : 0); // 0..1 with soft edges

// The watchers: pale villagers with little glowing eyes (the other three looks tried were deleted, RULES 35, 2026-11-15)
function watcherGeo() {
  const b = new Builder();
  b.cyl(0, 0, 0, 0.34, 0.22, 1.25, 5, '#cfc6dc', TILE.white, true);
  b.blob(0, 1.5, 0, 0.24, 0.28, 0.24, '#d8d0e4', TILE.bone, 0.05, 3);
  b.box(-0.09, 1.52, 0.2, 0.08, 0.06, 0.06, '#ffffff', TILE.spore);
  b.box(0.09, 1.52, 0.2, 0.08, 0.06, 0.06, '#ffffff', TILE.spore);
  return b.geometry();
}

export class Abyss {
  /** d: { scene, ship, world, sky, settings, state, mate, toast, fade, onEnding } */
  constructor(d) {
    this.d = d;
    this.k = 0;              // 0..1 how "full" the dread is
    this.solo = null;        // effect being tried on its own
    this.t = 0;
    this.history = [];       // ship positions (time loop)
    this.histT = 0;
    // timers / windows for periodic events
    this.calm = { next: 20, a: -1, b: -1 };
    this.maraT = 6;
    this.light = { t0: 0 };
    this.loopT = 45;
    this.lev = { next: 15, t0: -99 };
    this.fullTime = 0;
    this.ending = null;
    this.spin = 0; this.spinV = 0;
    this.hudCache = {}; this.hudT = 0;
    this.mapOpenT = 0; this.phantoms = [];
    // one effect at a time: it creeps in, holds, fades, then nothing for a while, then another
    this.cyc = { id: null, phase: 'rest', t: 6 + Math.random() * 20, len: 1, w: 0, last: null };

    const { scene } = d, G = shipGeos();
    // 1 - reflection (mirrored ship, under a see-through sea)
    this.refl = new THREE.Group();
    const rMat = psxMaterial({ map: getAtlas(), vertexColors: true, color: 0xc8b8ee, fog: false, side: THREE.DoubleSide, key: 'AbR' });
    for (const g of [G.hull, G.sail, G.mast]) this.refl.add(new THREE.Mesh(g, rMat));
    this.refl.children[1].position.set(0, 1.0, -0.3);
    this.refl.scale.y = -1; this.refl.visible = false; scene.add(this.refl);
    this.under = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x05020a, fog: false }));
    this.under.visible = false; scene.add(this.under); // the black below the glass
    // 6 - watchers
    this.wGeo = null;
    this.watchers = new Map(); // island id -> [{mesh, delay}]
    this.wScan = 0;
    // 12 - leviathan arches + the Eye
    const arch = new THREE.TorusGeometry(42, 6, 5, 12, Math.PI);
    this.archMat = psxMaterial({ color: 0x1a0a22, fog: false, key: 'AbL' });
    this.arches = [0, 1, 2].map((i) => { const m = new THREE.Mesh(arch, this.archMat); m.visible = false; m.scale.setScalar(1 - i * 0.18); scene.add(m); return m; });
    this.eye = new THREE.Group();
    const em = (col, r, sy, ord) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 18), new THREE.MeshBasicMaterial({ color: col, fog: false, depthTest: false, depthWrite: false })); m.scale.y = sy; m.renderOrder = ord; return m; };
    this.eyeLid = em(0x0a0410, 1.08, 0.5, -16); this.eyeWhite = em(0xf4e8ff, 1, 0.44, -15); this.eyeIris = em(0xff30c8, 0.36, 1, -14); this.eyePupil = em(0x050008, 0.16, 1, -13);
    this.eyeIris.position.z = 0.01; this.eyePupil.position.z = 0.02;
    this.eye.add(this.eyeLid, this.eyeWhite, this.eyeIris, this.eyePupil); this.eye.visible = false; scene.add(this.eye);
    this.overlay = document.createElement('div');
    this.overlay.id = 'awaken';
    document.body.appendChild(this.overlay);
  }

  /** is an effect active right now? */
  on(id) {
    if (this.k < 0.5 || this.ending && id !== 'leviathan') return false;
    if (this.solo) return this.solo === id;
    if (this.ending) return true;
    const c = this.cyc;
    return c.id === id && c.w > (GRADED.has(id) ? 0.01 : 0.3);
  }
  /** how strongly an effect is showing right now (0..1): effects fade in and out */
  str(id) { return this.solo ? (this.solo === id ? 1 : 0) : this.cyc.id === id ? this.cyc.w : 0; }
  enabled(id) { return !this.d.settings.abyss || this.d.settings.abyss[id] !== false; }

  /** the rotation: rest -> in -> hold -> out -> rest, every length random */
  stepCycle(dt) {
    const c = this.cyc, R = Math.random;
    if (this.k < 0.5 || this.solo) { if (c.phase !== 'rest') { c.phase = 'rest'; c.t = 8 + R() * 25; } c.w = 0; c.id = null; return; }
    c.t -= dt;
    if (c.phase === 'in') c.w = clamp(1 - c.t / c.len, 0, 1);
    else if (c.phase === 'out') c.w = clamp(c.t / c.len, 0, 1);
    if (c.t > 0) return;
    if (c.phase === 'rest') {
      const pool = EFFECTS.map((f) => f.id).filter((id) => this.enabled(id) && id !== c.last);
      if (!pool.length) { c.t = 10; return; }
      c.id = pick(pool); c.last = c.id; c.phase = 'in'; c.t = c.len = 3 + R() * 9; c.w = 0;
      this.begin(c.id);
    } else if (c.phase === 'in') { c.phase = 'hold'; c.t = 15 + R() * 75; c.w = 1; }
    else if (c.phase === 'hold') { c.phase = 'out'; c.t = c.len = 5 + R() * 14; }
    else { c.phase = 'rest'; c.t = 8 + R() * 110; c.w = 0; c.id = null; }
  }
  /** an effect is starting: line its events up so something happens while it lasts */
  begin(id) {
    const t = this.t;
    if (id === 'calm') { this.calm.a = t + 1; this.calm.b = t + 200; }
    if (id === 'mara') this.maraT = 2 + Math.random() * 6;
    if (id === 'lights') this.light.t0 = t + 2;
    if (id === 'loop') this.loopT = 10 + Math.random() * 25;
    if (id === 'leviathan') this.lev.next = 3 + Math.random() * 8;
  }

  /** "Try" button: force full dread and start this effect immediately */
  trigger(id) {
    this.solo = id;
    const t = this.t;
    if (id === 'calm') { this.calm.a = t + 1; this.calm.b = t + 26; }
    if (id === 'mara') { this.maraT = 20; this.d.mate.say(this.maraLine(), true); }
    if (id === 'lights') this.light.t0 = t + 1;
    if (id === 'watchers') this.clearWatchers();
    if (id === 'loop') this.loopT = 9;
    if (id === 'leviathan') this.lev.next = 2;
    if (id === 'catch') this.d.toast('Try it: cast a line (C), dig for treasure or salvage a wreck.', true, 6000);
  }
  stopTest() { this.solo = null; }

  update(dt, c) { // c: { dread, live, camera, camYaw, ch, tod, toastClock }
    this.t += dt;
    const t = this.t, { ship } = this.d;
    this.k = smoothstep(0.86, 0.97, c.dread);
    const live = c.live;
    // the Eye does not wait for its turn: after long enough in the worst water, the leviathan comes
    this.fullTime = this.k > 0.9 && live ? this.fullTime + (rt.edge ? 0 : dt) : 0;   // the clock holds while the Edge runs (systems/edge.js)
    if (this.fullTime > (isKnown(this.d.state, 'lookup') ? 200 : 140) && this.cyc.id !== 'leviathan' && !this.solo && !this.ending) { this.cyc.id = 'leviathan'; this.cyc.phase = 'hold'; this.cyc.t = 9999; this.cyc.w = 1; this.begin('leviathan'); }
    this.stepCycle(dt);

    // ship history (for the time loop)
    this.histT -= dt;
    if (live && this.histT <= 0) { this.histT = 0.2; this.history.push({ x: ship.pos.x, z: ship.pos.z, h: ship.heading }); if (this.history.length > 160) this.history.shift(); }

    // 1 glass calm
    this.calmAmt = this.on('calm') ? ramp(t, this.calm.a, this.calm.b, 1) * this.str('calm') : 0;
    this.refl.visible = this.under.visible = this.calmAmt > 0.02;
    this.under.position.set(ship.pos.x, -10, ship.pos.z);
    if (this.refl.visible) {
      this.refl.position.set(ship.pos.x, -0.15, ship.pos.z);
      const wrong = Math.min(1, (t - this.calm.a) / 12) * 1.9; // it slowly turns to look somewhere else
      this.refl.rotation.y = -(ship.heading + wrong);
    }

    // 3 wind meter
    if (this.on('wind')) {
      this.spinV += (Math.random() - 0.5) * dt * 30; this.spinV *= 0.97;
      this.spin += (this.spinV + Math.sin(t * 0.7) * 4) * dt * this.str('wind');
    } else this.spin *= Math.max(0, 1 - dt * 2);

    // 4 Mara
    const mate = this.d.mate;
    const maraOn = this.on('mara');
    mate.el.classList.toggle('glitch', maraOn);
    mate.face.classList.toggle('eye', maraOn);
    if (maraOn && live) {
      this.maraT -= dt;
      if (this.maraT <= 0 && !mate.busy) { mate.say(this.maraLine(), true); this.maraT = 30 + Math.random() * 25; }
    }

    // 5 lighthouses: stare 10s, dead 7s, normal 20s
    this.lightPhase = null;
    if (this.on('lights')) {
      const u = ((t - this.light.t0) % 37 + 37) % 37;
      this.lightPhase = u < 10 ? 'stare' : u < 17 ? 'dead' : null;
    }

    // 6 watchers
    this.updateWatchers(dt, c);

    // 8 time loop
    if (this.on('loop') && live) {
      this.loopT -= dt;
      const n = Math.min(100, this.history.length - 5);
      if (this.loopT <= 0 && n >= 35) {
        this.loopT = 70 + Math.random() * 40;
        const back = this.history[this.history.length - n];
        this.history.length = this.history.length - n;
        this.d.fade.classList.add('on');
        setTimeout(() => {
          ship.pos.set(back.x, 0, back.z); ship.heading = back.h;
          this.d.state.time = (this.d.state.time - n * 0.2 * hoursPerSecond(this.d.state.time) / 24 + 1) % 1;
          this.d.fade.classList.remove('on');
          this.d.toast(Math.random() < 0.5 ? 'You have been here before.' : 'It is this exact moment again.', true, 4500);
        }, 450);
      }
    }

    // 9 wrong ocean: sails
    ship.wrongSails = this.on('ocean') ? 1 : 0;


    // 12 leviathan + ending
    this.updateLeviathan(dt, c);
  }

  // ---- hooks main.js asks every frame -------------------------------------------------
  get waveMul() { return 1 - 0.96 * (this.calmAmt || 0); }
  get seeThrough() { return this.calmAmt || 0; }
  waveTime(t) { return this.on('ocean') ? -t * 1.25 : t; }
  roll(t) { return this.on('ocean') ? (Math.sin(t * 0.31) * 0.11 + Math.sin(t * 0.13) * 0.05) * this.str('ocean') : 0; }
  windDir(dir) { return dir + this.spin; }
  windFloor(f) { return this.on('wind') && Math.random() < this.str('wind') ? Math.random() : f; }
  get lookUp() { return this.archUp > 0.4 || !!this.ending; } // the camera is pulled up to look
  get sun2() { return this.on('loop'); }

  hud(field, value) {
    if (!this.on('hud')) return value;
    const c = this.hudCache[field];
    if (c && c.src === value && this.t < c.until) return c.out;
    let out = value;
    const r = Math.random();
    if (Math.random() > this.str('hud')) { this.hudCache[field] = { src: value, out: value, until: this.t + 0.5 + Math.random() }; return value; }   // fading: fewer lies
    if (field === 'place') out = r < 0.3 ? lie(PLACE_LIES, this.k) : corrupt(value, 0.25);
    else if (field === 'clock') {
      const m = value.split(':').map(Number), mins = (1440 - (m[0] * 60 + m[1])) % 1440;
      out = r < 0.12 ? pick(['??:??', '13:66', '00:00', '--:--']) : `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    } else if (field === 'gold') out = r < 0.25 ? pick(GOLD_LIES) : value;
    else if (field === 'track') out = r < 0.4 ? `<div class="trow main">${pick(TRACK_LIES)}</div>` : value.replace(/>([^<]{3,})</g, (m, s) => `>${corrupt(s, 0.2)}<`);
    this.hudCache[field] = { src: value, out, until: this.t + (field === 'clock' ? 0.25 : 0.5 + Math.random() * 1.2) };
    return out;
  }

  /** one of her lines at full dread; about half of them break as they are said (E3) */
  maraLine() { const l = pick(MARA_LINES); return Math.random() < 0.5 && l.length > 12 ? corrupt(l, 0.12) : l; }
  maraHint() { if (!this.on('mara')) return false; this.d.toast(pick(MARA_HINTS), true, 5000); return true; }

  /** 11: the line brings up memories */
  wrongCatch(f) {
    if (this.k > KEPT_FROM) { const it = keptBack(this.d.state, 'fish'); if (it) return it.fish; }   // the deep gives back a fish the Drowned kept: the very one, once (L8)
    if (!this.on('catch')) return f;
    const [name, note] = pick(MEMORIES);
    return { ...f, id: 'memory', name: `${name}. ${note}`, kg: +(0.2 + Math.random()).toFixed(1), value: 1, dark: true };
  }
  /** 11: chests hold things you already own */
  wrongLoot(loot, state) {
    if (this.k > KEPT_FROM) { const it = keptBack(state, 'hold'); if (it) return it.loot ? it.loot : { name: FRUITS[it.fruit].name, value: FRUITS[it.fruit].price, fruit: it.fruit }; }   // or a thing from the hold they kept (L8)
    if (!this.on('catch') || !state.loot.length) return loot;
    const prev = state.loot[Math.floor(Math.random() * state.loot.length)];
    return { ...loot, name: `${prev.name.replace(/^From the [^:]+: /, '')}... again. It is yours. It was always yours`, dark: true };
  }

  /** 7: map distortion for the logbook */
  onMapOpen(ship) {
    this.mapOpenT = performance.now();
    this.phantoms = [];
    if (!this.on('map')) return;
    const names = (this.k >= EYE_K ? [...MAP_NAMES] : MAP_NAMES.filter((x) => !EYE_LIES.has(x))).sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2, dd = 60 + Math.random() * 140;
      this.phantoms.push({ id: `ph${i}`, type: pick(['rocky', 'jungle', 'treasure']), x: ship.pos.x + Math.cos(a) * dd, z: ship.pos.z + Math.sin(a) * dd, r: 12 + Math.random() * 10, seed: (Math.random() * 65535) | 0, lobes: [0.15, 0.1, 0.06, Math.random() * 6, Math.random() * 6, Math.random() * 6], name: names[i] });
    }
  }
  mapWarp() {
    if (!this.on('map')) return null;
    return { t: performance.now() / 1000, since: (performance.now() - this.mapOpenT) / 1000, phantoms: this.phantoms };
  }

  // ---- internals ------------------------------------------------------------------------
  clearWatchers() { for (const list of this.watchers.values()) for (const w of list) this.d.scene.remove(w.mesh); this.watchers.clear(); }
  updateWatchers(dt, c) {
    if (!this.on('watchers')) { if (this.watchers.size) this.clearWatchers(); return; }
    const { ship, world, scene } = this.d;
    const geo = this.wGeo || (this.wGeo = watcherGeo());
    const add = (list, x, y, z, sc, i) => {
      const mesh = new THREE.Mesh(geo, mats.props);
      mesh.position.set(x, y, z); mesh.rotation.y = Math.random() * Math.PI * 2; mesh.scale.setScalar(sc);
      scene.add(mesh);
      list.push({ mesh, y, delay: 1.5 + i * 0.35 + Math.random() * 0.6, step: 0, ph: Math.random() * 6 });
    };
    this.wScan -= dt;
    if (this.wScan <= 0) {
      this.wScan = 1.5;
      const keep = new Set();
      for (const isl of world.islands.values()) {
        const dsc = isl.desc;
        if (Math.hypot(dsc.x - ship.pos.x, dsc.z - ship.pos.z) > 190) continue;
        keep.add(dsc.id);
        if (this.watchers.has(dsc.id)) continue;
        const list = [];
        const n = Math.max(3, Math.round(dsc.r / 2.6));
        for (let i = 0; i < n; i++) {
          const th = (i / n) * Math.PI * 2 + Math.random() * 0.3;
          const rr = shoreR(dsc, th) * (0.8 + Math.random() * 0.08);
          const lx = Math.cos(th) * rr, lz = Math.sin(th) * rr, h = Math.max(0.3, terrainHeight(dsc, lx, lz));
          add(list, dsc.x + lx, h - 0.05, dsc.z + lz, 1.3 + Math.random() * 0.4, i);
        }
        this.watchers.set(dsc.id, list);
      }
      for (const [id, list] of this.watchers) if (!keep.has(id)) { for (const w of list) scene.remove(w.mesh); this.watchers.delete(id); }
    }
    for (const list of this.watchers.values()) for (const w of list) {
      w.delay -= dt;
      if (w.delay > 0) continue;
      const want = Math.atan2(ship.pos.x - w.mesh.position.x, ship.pos.z - w.mesh.position.z);
      w.step -= dt;            // the others turn to face you in sudden little steps, one after another
      if (w.step > 0) continue;
      w.step = 0.9 + Math.random() * 0.8;
      w.mesh.rotation.y = want;
    }
  }

  updateLeviathan(dt, c) {
    const { ship } = this.d, t = this.t;
    const on = this.on('leviathan');
    if (on && c.live) {
      this.lev.next -= dt;
      if (this.lev.next <= 0 && t - this.lev.t0 > 32) {
        this.lev.t0 = t; this.lev.next = 55 + Math.random() * 35;
        const a = c.ch + (Math.random() - 0.5) * 1.0, fx = Math.sin(a), fz = -Math.cos(a);
        const la = a + Math.PI / 2 + (Math.random() - 0.5) * 0.8, lx = Math.sin(la), lz = -Math.cos(la);
        this.arches.forEach((m, i) => {
          const off = (i - 1) * 78;
          m.position.set(ship.pos.x + fx * (135 + i * 22) + lx * off, -60, ship.pos.z + fz * (135 + i * 22) + lz * off);
          m.rotation.set(0, Math.atan2(-lz, lx), 0);
          m.userData.d = i * 1.4;
        });
      }
      if (this.fullTime > 170 && !this.ending && !this.solo) this.startEnding(c);
    }
    const u = t - this.lev.t0;
    this.archUp = 0;
    for (const m of this.arches) {
      const v = u - (m.userData.d || 0);
      const rise = on ? clamp(Math.min(v / 8, (30 - v) / 8), 0, 1) : 0;
      m.visible = rise > 0.001; this.archUp = Math.max(this.archUp, rise);
      m.position.y = -60 + 52 * rise * rise * (3 - 2 * rise) + Math.sin(t * 0.4 + m.userData.d) * 1.5;
    }
    if (this.ending) this.updateEnding(dt, c);
  }

  /** final: She Rises (systems/endgame.js): nobody wakes; the white goes to the end of the voyage (d.onFinal) */
  startEnding(final = false) {
    if (this.ending) return;
    this.ending = { t: 0, step: 0, final: final === true };
    this.overlay.className = 'show';
    this.overlay.innerHTML = '';
    document.body.classList.add('awakening');
  }
  /** the waking without what comes before it: from the white straight to waking off Tama (the Edge, gone over: CANON 2026-11-18) */
  wake(from) {
    if (this.ending) return;
    this.ending = { t: 15.6, step: 4, from };
    this.overlay.className = 'show white'; this.overlay.innerHTML = '';
    document.body.classList.add('awakening');
  }
  updateEnding(dt, c) {
    const e = this.ending;
    e.t += dt || 0.016;
    const cam = c.camera, open = smoothstep(1, 5, e.t) * (e.t > 15 ? 0 : 1);
    this.eye.visible = e.t < 15.5 && !e.from;
    const fx = Math.sin(c.ch), fz = -Math.cos(c.ch);
    this.eye.position.set(cam.position.x + fx * 700, cam.position.y + 150, cam.position.z + fz * 700);
    this.eye.lookAt(cam.position);
    this.eye.scale.set(260, 260 * Math.max(0.02, open), 260);
    const look = Math.sin(e.t * 0.8) * 0.08;
    this.eyeIris.position.x = look; this.eyePupil.position.x = look;
    this.eyePupil.scale.setScalar(1 + Math.max(0, e.t - 6) * 0.25);
    const say = (text, cls = '') => { const p = document.createElement('p'); p.className = cls; p.textContent = text; this.overlay.appendChild(p); };
    if (e.step === 0 && e.t > 5) { e.step = 1; say('THE EYE OPENS.', 'big'); }
    if (e.step === 1 && e.t > 8.5) { e.step = 2; say('It has watched you since the first harbour.'); }
    if (e.step === 2 && e.t > 11.5) { e.step = 3; say('It knows your name now.'); }
    if (e.step === 3 && e.t > 14) { e.step = 4; this.overlay.classList.add('white'); }
    if (e.step === 4 && e.t > 16 && e.final) { e.step = 6; this.overlay.className = ''; this.overlay.innerHTML = ''; document.body.classList.remove('awakening'); this.ending = null; this.solo = null; this.fullTime = 0; if (this.d.onFinal) this.d.onFinal(); return; }
    if (e.step === 4 && e.t > 16) { e.step = 5; this.overlay.innerHTML = ''; this.d.onEnding(e.from); say('You wake on the deck. Harbour Tama is in sight and the sea is blue.'); say('Nobody remembers the way back. Nobody asks.'); }
    if (e.step === 5 && e.t > 23) { e.step = 6; this.overlay.className = ''; this.overlay.innerHTML = ''; document.body.classList.remove('awakening'); this.ending = null; this.fullTime = 0; this.solo = null; this.cyc = { id: null, phase: 'rest', t: 30 + Math.random() * 60, len: 1, w: 0, last: 'leviathan' }; }
  }
}
