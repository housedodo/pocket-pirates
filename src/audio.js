// Drop-in audio. Put files in public/audio/<cue>.ogg (or .mp3/.wav); anything that
// is missing is silently skipped, so the game runs fine with no sound at all.
// See docs/AUDIO.md for the cue list and design notes.

const STAGES = 5;
export const CUES = {
  loops: [
    'sea',                                                 // constant water bed (volume follows speed)
    ...Array.from({ length: STAGES }, (_, i) => `amb_${i + 1}`),   // ambience per dread stage, cross-faded
    ...Array.from({ length: STAGES }, (_, i) => `music_${i + 1}`), // music per dread stage, cross-faded
  ],
  oneShots: ['creak', 'splash', 'bump', 'dig', 'treasure', 'discover', 'harbour', 'ui', 'whisper', 'stage_up'],
};

export class AudioBus {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.loops = new Map();
    this.whisperTimer = 8;
    this.lastStage = 0;
  }

  async start() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    await Promise.all([...CUES.loops, ...CUES.oneShots].map((k) => this.load(k)));
    for (const k of CUES.loops) this.startLoop(k);
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
      } catch (e) { /* missing or undecodable: skip */ }
    }
  }

  startLoop(key) {
    const buf = this.buffers.get(key);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain).connect(this.master);
    src.start();
    this.loops.set(key, gain);
  }

  setLoop(key, v) {
    const g = this.loops.get(key);
    if (g) g.gain.setTargetAtTime(v, this.ctx.currentTime, 0.6);
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

  update(dt, dread, speedFrac) {
    if (!this.ctx) return;
    for (let i = 0; i < STAGES; i++) {
      const w = Math.max(0, 1 - Math.abs(dread * (STAGES - 1) - i)); // triangular cross-fade
      this.setLoop(`amb_${i + 1}`, w * 0.9);
      this.setLoop(`music_${i + 1}`, w * 0.7);
    }
    this.setLoop('sea', 0.35 + speedFrac * 0.5);
    const stage = Math.min(STAGES - 1, Math.floor(dread * STAGES));
    if (stage > this.lastStage) this.play('stage_up');
    this.lastStage = stage;
    if (dread > 0.45) { // occasional whispers once things get strange
      this.whisperTimer -= dt;
      if (this.whisperTimer <= 0) { this.play('whisper', { vol: 0.5 + dread * 0.5, rate: 0.85 + Math.random() * 0.3 }); this.whisperTimer = 6 + Math.random() * 14 * (1.2 - dread); }
    }
  }
}
