// Audio: real files in public/audio/<cue>.ogg|mp3|wav win; any cue without a file is
// synthesised on the fly (src/synth.js), so the game always has sound.
// See docs/AUDIO.md for the cue list and design notes.
import { canSynth, synth } from './synth.js';
import { SeaLayers, LAYERS, Tavern, TAVERN, HutMusic, HUT } from './layers.js';
import { smoothstep } from './util.js';

// Master switch for all sound (files in public/audio/, else the synthesised fallback).
export const AUDIO_ENABLED = !(typeof window !== 'undefined' && window.__SILENT);   // the demo ships with sound too (without the dread-stage cues, see DEMO_SKIP); the silent build sets __SILENT
// cues the demo never plays (no dread there): left out of the demo file and never loaded, to keep it small and spoiler-free
const DEMO_SKIP = new Set(['music_3']);

const STAGES = 5;
export const CUES = {
  loops: [
    'sea', 'rain', 'rain_2', 'rain_storm', 'gulls', 'coast', 'forest',   // wind, the stage ambience amb_1..5, amb_night and oars were removed
    'music_3',   // the user's own "Dread" piece for the middle dread band; the placeholder music_1/2/4/5 and surf are gone
    ...LAYERS,   // stage 1 on open sea: one instrument more with every quest (src/layers.js)
    ...TAVERN,   // the harbour tavern, muffled through the wall
    ...HUT,      // the hut's theme, on the first visit
  ],
  // only these effects play. Every other effect the game asks for (splash, treasure, cannon, horn ...) is silent on purpose:
  // it is not listed, so it is never loaded and never synthesised. Add a name back here (and its file) to bring one back.
  oneShots: ['ui', 'dig', 'buy', 'pause', 'chapter', 'fail', 'success', 'card', 'roll_d6', 'roll_d20', 'cast', 'bite', 'catch',
    'thunder', 'oar'],   // oar: one soft stroke while rowing (synthesised)   // thunder: the recorded distant roll (with rain)
};
const tick = () => new Promise((r) => setTimeout(r, 0));

export class AudioBus {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.loops = new Map();
    this.whisperTimer = 8;
    this.lastStage = 0;
    this.muted = false;
    this.musicOn = true;
    this.ready = false;
    this.studioDuck = 0; this.studioDuckAmb = 0;   // the sound studio hushes the game's own music / ambience while a placement plays
    this.musicRate = 1;      // a thread (the Music out of the Fog) can leave the music a little flat
    this.userVol = { music: 1, amb: 1, sfx: 1 };   // the player's own sliders in the pause menu (0..1), on top of the mix
    this.vol = {};           // per-cue volume (1 = as authored): public/audio/volumes.json, then the mixer's local overrides
    this.preview = null;     // mixer: a loop being auditioned on its own
    this.level = {};         // the level each loop is currently asked to play at (for the mixer's meters)
    this.layerSeed = 0;      // the voyage's seed: the order the stage-1 instruments arrive in
    this.layerPace = 1;      // test flag (?dev=1&musicpace=4): the stage-1 layers move this many times faster
    this.rainMix = 0; this.rainMixT = 0; this.rainSwap = 30;   // the two light-rain recordings cross-fade slowly so the rain never repeats
    this.thunderT = 20; this.lastThunder = -99;                // distant thunder now and then in strong rain
  }
  v(key) { return this.vol[key] != null ? this.vol[key] : 1; }
  setVol(key, x) { this.vol[key] = x; }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.8 * this.v('_master') * (1 - (this.hushK || 0));
  }
  /** 0..1: everything goes quiet (the glimpse, glimpse.js) */
  hush(k) { if (k === (this.hushK || 0)) return; this.hushK = k; if (this.master) this.master.gain.value = this.muted ? 0 : 0.8 * this.v('_master') * (1 - k); }
  setMusic(on) {
    this.musicOn = on;
    if (this.musicBus) this.musicBus.gain.value = on ? 0.6 * this.v('_music') * this.userVol.music : 0;
  }
  /** the player's sliders: kind 'music' | 'amb' | 'sfx', x 0..1 */
  setUserVol(kind, x) {
    this.userVol[kind] = x;
    if (kind === 'music') this.setMusic(this.musicOn);
    else { const b = kind === 'amb' ? this.ambBus : this.sfxBus; if (b) b.gain.value = x; }
  }
  setPaused(p) {
    if (!this.ctx) return;
    if (p) this.ctx.suspend(); else this.ctx.resume();
  }

  async start() {
    if (!AUDIO_ENABLED || this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? 0.6 : 0;
    this.musicBus.connect(this.master);
    this.seaMusic = this.ctx.createGain(); this.seaMusic.connect(this.musicBus);   // the music of the sea (stage loops and layers): ducks while the tavern plays
    this.tavern = new Tavern(this.ctx, this.musicBus);
    this.hut = new HutMusic(this.ctx, this.musicBus); this.tavPresence = 0; this.hutPresence = 0;
    this.layers = new SeaLayers(this.ctx, this.seaMusic); this.layers.setSeed(this.layerSeed); this.layers.pace = this.layerPace;
    this.ambBus = this.ctx.createGain(); this.ambBus.gain.value = this.userVol.amb; this.ambBus.connect(this.master);   // sea, gulls, rain, coast, forest
    this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = this.userVol.sfx; this.sfxBus.connect(this.master);   // one-shot effects

    if (window.__VOLUMES) Object.assign(this.vol, window.__VOLUMES);   // the single-file build carries its own
    else try { const r = await fetch('audio/volumes.json'); if (r.ok && !(r.headers.get('content-type') || '').includes('text/html')) Object.assign(this.vol, await r.json()); } catch (e) { /* no volumes file */ }
    try { Object.assign(this.vol, JSON.parse(localStorage.getItem('pocket-pirates-mixer') || '{}')); } catch (e) { /* storage blocked */ }
    this.setMuted(this.muted); this.setMusic(this.musicOn);
    // one-shots first (cheap), then ambience, then music, yielding between cues so the game stays smooth
    const order = [...CUES.oneShots, 'sea', 'rain', 'rain_2', 'rain_storm', 'gulls', 'coast', 'forest', ...CUES.loops.filter((k) => k.startsWith('music_')), ...LAYERS, ...TAVERN, ...HUT];
    for (const k of order) {
      if (window.__BUILD === 'demo' && DEMO_SKIP.has(k)) continue;
      await this.load(k);
      if (CUES.loops.includes(k)) this.startLoop(k);
      await tick();
    }
    this.layers.start();   // the stage-1 stems all start on the same sample (they waited silently until every one had loaded)
    this.tavern.start();
    this.hut.start();
    this.ready = true;
  }

  async load(key) {
    const inl = window.__AUDIO && window.__AUDIO[key];   // single-file build: sounds are inlined
    if (inl) { try { this.buffers.set(key, await this.ctx.decodeAudioData(await (await fetch(inl)).arrayBuffer())); return; } catch (e) { /* fall through */ } }
    for (const ext of window.__AUDIO ? [] : ['ogg', 'mp3', 'wav']) {   // a single-file build carries every file it has: a cue that is not inlined is synthesised, never fetched
      try {
        const res = await fetch(`audio/${key}.${ext}`);
        if (!res.ok) continue;
        if ((res.headers.get('content-type') || '').includes('text/html')) continue; // dev-server fallback page
        const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
        this.buffers.set(key, buf);
        return;
      } catch (e) { /* missing or undecodable: fall through */ }
    }
    if (canSynth(key)) {
      try { this.buffers.set(key, synth(this.ctx, key)); } catch (e) { console.warn('synth failed', key, e); }
    }
  }

  startLoop(key) {
    const buf = this.buffers.get(key);
    if (!buf || this.loops.has(key)) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    if (key === 'gulls') {   // far away they are dull and thin; the closer you get, the clearer (low-pass opens with level)
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.4;
      const env = this.ctx.createGain(); env.gain.value = 0;   // the colony comes and goes (see driftGulls)
      src.connect(lp).connect(gain).connect(env).connect(this.ambBus);
      this.tone = lp; this.gullEnv = env; this.gullOn = false; this.gullSwitch = 3 + Math.random() * 6;
    } else if (LAYERS.includes(key)) this.layers.add(key, src, gain);   // its own panner, the shared low-pass; started with the others
    else if (TAVERN.includes(key)) this.tavern.add(key, src, gain);
    else if (HUT.includes(key)) this.hut.add(key, src, gain);
    else src.connect(gain).connect(key.startsWith('music_') ? this.seaMusic : this.ambBus);
    if (!LAYERS.includes(key) && !TAVERN.includes(key) && !HUT.includes(key)) src.start();
    this.loops.set(key, gain);
    (this.srcs || (this.srcs = new Map())).set(key, src);
    if (this.isMusic(key) && this.musicRate !== 1) src.playbackRate.value = this.musicRate;
  }

  has(key) { return this.buffers.has(key); }

  /** every music loop at this playback rate (1 = as authored; 0.944 = one semitone flat) */
  setMusicRate(r) { this.musicRate = r; if (this.srcs) for (const [k, src] of this.srcs) if (this.isMusic(k)) src.playbackRate.value = r; }
  isMusic(k) { return k.startsWith('music_') || LAYERS.includes(k) || TAVERN.includes(k) || HUT.includes(k); }

  /** every frame, sailing or ashore. where: 0 at sea, 0.35 in a harbour, 1 inside its tavern (or at its dice table) */
  tavernUpdate(dt, where) {
    if (!this.ctx || !this.tavern.ready) return;
    const t = this.tavern.update(dt, where);
    this.tavPresence = t.presence;
    for (const k of TAVERN) this.setLoop(k, t.levels[k] * (1 - this.hutPresence));
    this.seaMusic.gain.setTargetAtTime((1 - 0.9 * t.presence) * (1 - this.hutPresence), this.ctx.currentTime, 0.5);   // the sea's music steps aside
  }
  /** every frame: target 0..1, how much the hut's theme should play (main.js: hutMusicTarget). While it plays, nothing else does */
  hutUpdate(dt, target) {
    if (!this.ctx || !this.hut.ready) return;
    const h = this.hut.update(dt, target);
    this.hutPresence = h.presence;
    for (const k of HUT) this.setLoop(k, h.levels[k]);
  }

  /**
   * A very soft voice blip while somebody's words type out (every third letter): a short, rounded, low-passed tone with a
   * little pitch wobble, soft but clear of the sea's rumble (peaks about -28 dBFS at the output). Mara a little higher; guests lower; dark lines
   * lower and duller. Follows the Effects slider.
   */
  blip(dark = false, guest = false) {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    if (t - (this.lastBlip || 0) < 0.06) return;   // never a rattle
    this.lastBlip = t;
    const base = (guest ? 360 : 470) * (dark ? 0.75 : 1), f = base * (1 + (Math.random() - 0.5) * 0.12);   // above the sea's rumble, so it is heard without being loud
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.94, t + 0.06);
    lp.type = 'lowpass'; lp.frequency.value = dark ? 1500 : 2600; lp.Q.value = 0.3;
    const vol = 0.05 * this.v('blip');
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(lp).connect(g).connect(this.sfxBus || this.master); o.start(t); o.stop(t + 0.09);
  }

  /** a soft bell-like note (for the tune in the fog); `pan` -1..1, `vol` 0..1 */
  playTone(freq, { dur = 1.8, vol = 0.3, pan = 0 } = {}) {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime, g = this.ctx.createGain(), p = this.ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const [m, a, type] of [[1, 1, 'sine'], [2.01, 0.35, 'sine'], [3.98, 0.12, 'triangle']]) {
      const o = this.ctx.createOscillator(), og = this.ctx.createGain(); o.type = type; o.frequency.value = freq * m; og.gain.value = a; o.connect(og).connect(g); o.start(t); o.stop(t + dur + 0.1);
    }
    g.connect(p).connect(this.sfxBus || this.master);
  }

  setLoop(key, v) {
    this.level[key] = v;
    const g = this.loops.get(key);
    v *= 1 - (this.isMusic(key) ? this.studioDuck : this.studioDuckAmb);
    if (this.preview) v = key === this.preview ? 0.8 : 0;   // auditioning one loop: everything else hushes
    if (g) g.gain.setTargetAtTime(v * (this.preview && key === this.preview ? Math.max(0.5, this.v(key)) : this.v(key)), this.ctx.currentTime, this.preview ? 0.15 : 0.7);   // a soloed loop is audible even at 0%
    if (key === 'gulls' && this.tone) this.tone.frequency.setTargetAtTime(700 + 9500 * Math.min(1, v) * Math.min(1, v), this.ctx.currentTime, 0.7);
  }

  /** re-apply every loop's gain now (the mixer calls this so solo works even while the game is paused) */
  refreshLoops() { if (!this.ctx) return; for (const k of this.loops.keys()) this.setLoop(k, this.level[k] || 0); }

  play(key, { vol = 1, rate = 1, raw = false, pan = null } = {}) {
    if (!this.ctx) return;
    const buf = this.buffers.get(key);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.playbackRate.value = rate;
    const g = this.ctx.createGain(); g.gain.value = vol * (raw ? Math.max(0.5, this.v(key)) : this.v(key));
    if (pan != null) { const pn = this.ctx.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, pan)); src.connect(g).connect(pn).connect(this.sfxBus || this.master); }
    else src.connect(g).connect(this.sfxBus || this.master);
    src.start();
  }

  /** the gulls are not constant: they call for a few seconds, then go quiet for a good while (closer to them: longer calls, shorter gaps) */
  driftGulls(dt, near) {
    if (!this.gullEnv) return;
    this.gullSwitch -= dt;
    if (this.gullSwitch <= 0) {
      this.gullOn = !this.gullOn;
      this.gullSwitch = this.gullOn ? 5 + Math.random() * 7 + near * 8 : (22 + Math.random() * 45) * (1.4 - near * 0.7);
    }
    this.gullEnv.gain.setTargetAtTime(this.gullOn ? 1 : 0, this.ctx.currentTime, this.gullOn ? 1.2 : 2.2);
  }

  /**
   * Rain in two kinds: light rain (two recordings, `rain` and `rain_2`, cross-faded every half minute or so) and a proper
   * storm (`rain_storm`, heavy rain drumming on the deck), blended by how hard it rains and blows. In strong rain a distant
   * thunder rolls in now and then.
   */
  rainBeds(dt, s) {
    const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const heavy = this.has('rain_storm') ? Math.max(sm(0.25, 0.6, s.storm), sm(0.75, 1, s.rain)) : 0;
    const wet = Math.max(s.rain, s.storm * 0.8);
    this.rainSwap -= dt;
    if (this.rainSwap <= 0) { this.rainMixT = this.rainMixT > 0.5 ? Math.random() * 0.3 : 0.7 + Math.random() * 0.3; this.rainSwap = 25 + Math.random() * 40; }
    this.rainMix += (this.rainMixT - this.rainMix) * (1 - Math.exp(-dt / 6));
    const x = this.has('rain_2') ? this.rainMix : 0, light = wet * 0.85 * (1 - heavy * 0.8);
    this.setLoop('rain', light * Math.cos(x * Math.PI / 2));
    this.setLoop('rain_2', light * Math.sin(x * Math.PI / 2));
    this.setLoop('rain_storm', wet * heavy * 0.9);
    const strong = Math.max(sm(0.55, 0.8, s.rain), sm(0.3, 0.5, s.storm));
    if (strong > 0.05) {
      this.thunderT -= dt * strong;
      if (this.thunderT <= 0) { this.thunder(0.55 + 0.4 * strong); this.thunderT = 30 + Math.random() * 50; }
    }
  }

  /** a distant roll of thunder (lightning asks for one too); never two on top of each other */
  thunder(vol = 0.9) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (t - this.lastThunder < 25) return;   // the roll is long (about 18 s): from time to time, not every flash
    this.lastThunder = t;
    this.play('thunder', { vol: vol * (0.75 + Math.random() * 0.25), rate: 0.9 + Math.random() * 0.15, pan: (Math.random() * 2 - 1) * 0.7 });
  }

  /** s: { dread, speed (0..1), night (0..1), wind (0..1.3), rain, storm, quests (main goals done), open (0 by the shore .. 1 open sea) } */
  update(dt, s) {
    if (!this.ctx) return;
    const dread = s.dread;
    const layered = this.layers.ready;   // the stage-1 stems are the music of the bright sea
    this.setLoop('music_3', smoothstep(0.45, 0.58, dread) * (1 - smoothstep(0.75, 0.9, dread)) * 0.75);   // the "Dread" piece: after stage 2, until the deep
    if (layered) {
      // the stage-1 band carries the bright half of the sea (dread up to about 0.3, ~660 units from Tama), then hands over to music_3
      const lv = this.layers.update(dt, { quests: s.quests || 0, open: s.open, wind: s.wind, stage: 1 - smoothstep(0.2, 0.32, dread), stage2: smoothstep(0.2, 0.32, dread) * (1 - smoothstep(0.45, 0.58, dread)), battle: !!s.battle, night: s.night, freecays: s.freecays });   // stage 1 band, then stage 2, then music_3
      for (const k of LAYERS) if (k in lv) this.setLoop(k, lv[k] * 1.5);   // the stems are mastered quiet (about -25 LUFS each): this puts the full band a few dB under the sea
    }
    this.setLoop('sea', 0.3 + s.speed * 0.45);
    this.rainBeds(dt, s);
    this.setLoop('gulls', (s.gulls || 0) * 0.9);
    this.driftGulls(dt, s.gulls || 0);
    const stage = Math.min(STAGES - 1, Math.floor(dread * STAGES));
    if (stage > this.lastStage) this.play('stage_up');
    this.lastStage = stage;
    if (dread > 0.45) { // occasional whispers once things get strange
      this.whisperTimer -= dt;
      if (this.whisperTimer <= 0) { this.play('whisper', { vol: 0.35 + dread * 0.4, rate: 0.85 + Math.random() * 0.3 }); this.whisperTimer = 6 + Math.random() * 14 * (1.2 - dread); }
    }
  }
}
