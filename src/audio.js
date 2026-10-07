// Audio: real files in public/audio/<cue>.ogg|mp3|wav win; any cue without a file is
// synthesised on the fly (src/synth.js), so the game always has sound.
// See docs/AUDIO.md for the cue list and design notes.
import { canSynth, synth } from './synth.js';

const STAGES = 5;
export const CUES = {
  loops: [
    'sea', 'surf', 'wind', 'rain', 'amb_night',
    ...Array.from({ length: STAGES }, (_, i) => `amb_${i + 1}`),
    ...Array.from({ length: STAGES }, (_, i) => `music_${i + 1}`),
  ],
  oneShots: ['creak', 'splash', 'bump', 'dig', 'treasure', 'discover', 'harbour', 'ui', 'whisper', 'stage_up', 'buy', 'pause',
    'thunder', 'horn', 'gull', 'dolphin', 'whale', 'bell', 'bottle'],
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
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.8;
  }
  setMusic(on) {
    this.musicOn = on;
    if (this.musicBus) this.musicBus.gain.value = on ? 0.6 : 0;
  }
  setPaused(p) {
    if (!this.ctx) return;
    if (p) this.ctx.suspend(); else this.ctx.resume();
  }

  async start() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? 0.6 : 0;
    this.musicBus.connect(this.master);

    // one-shots first (cheap), then ambience, then music, yielding between cues so the game stays smooth
    const order = [...CUES.oneShots, 'sea', 'wind', 'surf', 'rain', 'amb_night', ...CUES.loops.filter((k) => k.startsWith('amb_') && k !== 'amb_night'), ...CUES.loops.filter((k) => k.startsWith('music_'))];
    for (const k of order) {
      await this.load(k);
      if (CUES.loops.includes(k)) this.startLoop(k);
      await tick();
    }
    this.ready = true;
  }

  async load(key) {
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
    src.connect(gain).connect(key.startsWith('music_') ? this.musicBus : this.master);
    src.start();
    this.loops.set(key, gain);
  }

  setLoop(key, v) {
    const g = this.loops.get(key);
    if (g) g.gain.setTargetAtTime(v, this.ctx.currentTime, 0.7);
  }

  play(key, { vol = 1, rate = 1 } = {}) {
    if (!this.ctx) return;
    const buf = this.buffers.get(key);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.playbackRate.value = rate;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(g).connect(this.master);
    src.start();
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
    this.setLoop('surf', s.surf * 0.7);
    this.setLoop('wind', Math.min(1, s.wind * 0.35 + s.storm * 0.5));
    this.setLoop('rain', s.rain * 0.85);
    this.setLoop('amb_night', s.night * 0.7 * (1 - s.rain * 0.7));
    const stage = Math.min(STAGES - 1, Math.floor(dread * STAGES));
    if (stage > this.lastStage) this.play('stage_up');
    this.lastStage = stage;
    if (dread > 0.45) { // occasional whispers once things get strange
      this.whisperTimer -= dt;
      if (this.whisperTimer <= 0) { this.play('whisper', { vol: 0.35 + dread * 0.4, rate: 0.85 + Math.random() * 0.3 }); this.whisperTimer = 6 + Math.random() * 14 * (1.2 - dread); }
    }
  }
}
