// Audio: real files in public/audio/<cue>.ogg|mp3|wav win; any cue without a file is
// synthesised on the fly (src/synth.js), so the game always has sound.
// See docs/AUDIO.md for the cue list and design notes.
import { canSynth, synth } from './synth.js';

// Master switch for all sound (files in public/audio/, else the synthesised fallback).
export const AUDIO_ENABLED = true;   // the demo ships with sound too (without the dread-stage cues, see DEMO_SKIP)
// cues the demo never plays (no dread there): left out of the demo file and never loaded, to keep it small and spoiler-free
const DEMO_SKIP = new Set(['music_3', 'music_4', 'music_5', 'amb_3', 'amb_4', 'amb_5', 'whisper', 'stage_up']);

const STAGES = 5;
export const CUES = {
  loops: [
    'sea', 'surf', 'wind', 'rain', 'amb_night', 'oars', 'gulls', 'coast',
    ...Array.from({ length: STAGES }, (_, i) => `amb_${i + 1}`),
    ...Array.from({ length: STAGES }, (_, i) => `music_${i + 1}`),
  ],
  oneShots: ['creak', 'splash', 'bump', 'dig', 'treasure', 'discover', 'harbour', 'ui', 'whisper', 'stage_up', 'buy', 'pause',
    'thunder', 'horn', 'gull', 'dolphin', 'whale', 'bell', 'bottle',
    'cannon', 'hit', 'cast', 'bite', 'catch', 'roll_d20', 'roll_d6', 'card', 'success', 'fail', 'chapter', 'knock', 'ending'],
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
    this.userVol = { music: 1, amb: 1, sfx: 1 };   // the player's own sliders in the pause menu (0..1), on top of the mix
    this.vol = {};           // per-cue volume (1 = as authored): public/audio/volumes.json, then the mixer's local overrides
    this.preview = null;     // mixer: a loop being auditioned on its own
    this.level = {};         // the level each loop is currently asked to play at (for the mixer's meters)
  }
  v(key) { return this.vol[key] != null ? this.vol[key] : 1; }
  setVol(key, x) { this.vol[key] = x; }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.8 * this.v('_master');
  }
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
    this.ambBus = this.ctx.createGain(); this.ambBus.gain.value = this.userVol.amb; this.ambBus.connect(this.master);   // sea, wind, gulls, rain, ambience
    this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = this.userVol.sfx; this.sfxBus.connect(this.master);   // one-shot effects

    if (window.__VOLUMES) Object.assign(this.vol, window.__VOLUMES);   // the single-file build carries its own
    else try { const r = await fetch('audio/volumes.json'); if (r.ok && !(r.headers.get('content-type') || '').includes('text/html')) Object.assign(this.vol, await r.json()); } catch (e) { /* no volumes file */ }
    try { Object.assign(this.vol, JSON.parse(localStorage.getItem('pocket-pirates-mixer') || '{}')); } catch (e) { /* storage blocked */ }
    this.setMuted(this.muted); this.setMusic(this.musicOn);
    // one-shots first (cheap), then ambience, then music, yielding between cues so the game stays smooth
    const order = [...CUES.oneShots, 'sea', 'wind', 'surf', 'rain', 'amb_night', 'oars', 'gulls', 'coast', ...CUES.loops.filter((k) => k.startsWith('amb_') && k !== 'amb_night'), ...CUES.loops.filter((k) => k.startsWith('music_'))];
    for (const k of order) {
      if (window.__BUILD === 'demo' && DEMO_SKIP.has(k)) continue;
      await this.load(k);
      if (CUES.loops.includes(k)) this.startLoop(k);
      await tick();
    }
    this.ready = true;
  }

  async load(key) {
    const inl = window.__AUDIO && window.__AUDIO[key];   // single-file build: sounds are inlined
    if (inl) { try { this.buffers.set(key, await this.ctx.decodeAudioData(await (await fetch(inl)).arrayBuffer())); return; } catch (e) { /* fall through */ } }
    for (const ext of ['ogg', 'mp3', 'wav']) {
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
    if (key === 'wind') {   // the gusts drift: a slow second gain and a stereo pan that wander so the loop never repeats the same way
      const mod = this.ctx.createGain(), pan = this.ctx.createStereoPanner();
      mod.gain.value = 1; pan.pan.value = 0;
      src.connect(gain).connect(mod).connect(pan).connect(this.ambBus);
      this.windMod = mod; this.windPan = pan; this.windSrc = src; this.windT = 0; this.windGust = 1; this.windSide = 0;
    } else if (key === 'gulls') {   // far away they are dull and thin; the closer you get, the clearer (low-pass opens with level)
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.4;
      const env = this.ctx.createGain(); env.gain.value = 0;   // the colony comes and goes (see driftGulls)
      src.connect(lp).connect(gain).connect(env).connect(this.ambBus);
      this.tone = lp; this.gullEnv = env; this.gullOn = false; this.gullSwitch = 3 + Math.random() * 6;
    } else src.connect(gain).connect(key.startsWith('music_') ? this.musicBus : this.ambBus);
    src.start();
    this.loops.set(key, gain);
  }

  has(key) { return this.buffers.has(key); }

  setLoop(key, v) {
    this.level[key] = v;
    const g = this.loops.get(key);
    if (this.preview) v = key === this.preview ? 0.8 : 0;   // auditioning one loop: everything else hushes
    if (g) g.gain.setTargetAtTime(v * (this.preview && key === this.preview ? Math.max(0.5, this.v(key)) : this.v(key)), this.ctx.currentTime, this.preview ? 0.15 : 0.7);   // a soloed loop is audible even at 0%
    if (key === 'gulls' && this.tone) this.tone.frequency.setTargetAtTime(700 + 9500 * Math.min(1, v) * Math.min(1, v), this.ctx.currentTime, 0.7);
  }

  /** re-apply every loop's gain now (the mixer calls this so solo works even while the game is paused) */
  refreshLoops() { if (!this.ctx) return; for (const k of this.loops.keys()) this.setLoop(k, this.level[k] || 0); }

  play(key, { vol = 1, rate = 1, raw = false } = {}) {
    if (!this.ctx) return;
    const buf = this.buffers.get(key);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.playbackRate.value = rate;
    const g = this.ctx.createGain(); g.gain.value = vol * (raw ? Math.max(0.5, this.v(key)) : this.v(key));
    src.connect(g).connect(this.sfxBus || this.master);
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

  /** wind loop drift: volume swells and fades (about 45% to 120%) and the sound drifts left and right, never the same twice */
  driftWind(dt) {
    if (!this.windMod) return;
    this.windT += dt;
    const t = this.windT, T = this.ctx.currentTime;
    this.windNext = (this.windNext || 0) - dt;
    if (this.windNext <= 0) { this.windNext = 4 + Math.random() * 9; this.windGust = 0.55 + Math.random() * 0.6; this.windSide = (Math.random() * 2 - 1) * 0.8; }
    const swell = 0.8 + 0.18 * Math.sin(t * 0.21) + 0.12 * Math.sin(t * 0.083 + 1.7);
    this.windMod.gain.setTargetAtTime(Math.max(0.35, swell * this.windGust), T, 2.2);
    const pan = Math.max(-0.9, Math.min(0.9, 0.5 * Math.sin(t * 0.11 + 0.6) + 0.35 * Math.sin(t * 0.047) + this.windSide * 0.4));
    this.windPan.pan.setTargetAtTime(pan, T, 2.5);
    this.windSrc.playbackRate.setTargetAtTime(1 + 0.025 * Math.sin(t * 0.09 + 2), T, 3);
  }

  /** s: { dread, speed (0..1), night (0..1), wind (0..1.3), rain, storm, surf (0..1) } */
  update(dt, s) {
    if (!this.ctx) return;
    const dread = s.dread;
    for (let i = 0; i < STAGES; i++) {
      const w = Math.max(0, 1 - Math.abs(dread * (STAGES - 1) - i)); // triangular cross-fade
      this.setLoop(`amb_${i + 1}`, w * 0.8);
      this.setLoop(`music_${i + 1}`, w * 0.75);
    }
    this.setLoop('sea', 0.3 + s.speed * 0.45);
    this.driftWind(dt);
    this.setLoop('surf', s.surf * 0.7);
    this.setLoop('wind', Math.min(1, s.wind * 0.35 + s.storm * 0.5));
    this.setLoop('rain', s.rain * 0.85);
    this.setLoop('amb_night', s.night * 0.7 * (1 - s.rain * 0.7));
    this.setLoop('oars', s.rowing ? 0.7 : 0);
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
