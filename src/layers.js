// Stage 1 out on open sea: the instrument stems (public/audio/s1_*.ogg) come in one by one as the main quests are done.
// They are one 16-bar loop at 99 BPM (38.8 s, all the same length, rendered through HOIST at FAIR WEATHER), started at
// the same instant so they stay locked together. Nothing plays before the first quest; quest 1 brings in bass and
// shaperbox, every quest after that one more instrument (order shuffled per voyage). Once three or more are in, the band
// plays in "scenes": the full band, then a line-up of only two or three (bass + pluck, guitar arp + drums + bell ...),
// always a different combination from the last ones, then the full band again, and so on. Scenes change on a 4-bar
// phrase. A newcomer gets a full-band scene while it fades in so you hear it arrive. Each layer also swells gently and
// wanders a little around its place in the stereo field, and all of them sit under a soft low-pass that moves with the swell and closes in strong wind, as if
// the music reached you over the waves. Right by a shore they ease down to 40%.
import { mulberry32 } from './util.js';

export const LAYERS = ['s1_bass', 's1_shaperbox', 's1_pluck', 's1_drums', 's1_bell', 's1_guitar'];
const FIRST = ['s1_bass', 's1_shaperbox'];   // the first quest brings these two in together
// [home pan -1..1, how far it wanders, how fast]: bass and drums stay near the middle, the rest spread out
const PLACE = {
  s1_bass: [0, 0.1, 0.031], s1_shaperbox: [-0.3, 0.32, 0.023], s1_pluck: [0.42, 0.3, 0.037],
  s1_drums: [-0.08, 0.14, 0.019], s1_bell: [0.58, 0.28, 0.027], s1_guitar: [-0.52, 0.28, 0.041],
};
const FADE_IN = 30;      // seconds for a new instrument to come all the way in
const PHRASE = 4 * 4 * 60 / 99;   // 4 bars at 99 BPM (9.7 s): scenes change on a phrase
const smooth = (x) => x * x * (3 - 2 * x);
const keyOf = (set) => [...set].sort().join('+');

export class SeaLayers {
  constructor(ctx, out) {
    this.ctx = ctx;
    this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 2200; this.lp.Q.value = 0.5;
    this.bus = ctx.createGain(); this.bus.gain.value = 1;
    this.lp.connect(this.bus).connect(out);
    this.pans = new Map(); this.st = new Map(); this.srcs = new Map();
    this.t = 0; this.bg = 0; this.open = 1;
    this.pace = 1;           // test flag (?dev=1&musicpace=4): everything moves this many times faster
    this.rnd = Math.random;
    this.order = [...LAYERS];
    this.scene = new Set(); this.sceneFull = true; this.sceneLeft = 0; this.recent = []; this.lastN = 0; this.t0 = 0; this.phrase = -1; this.smalls = 0;
  }
  get ready() { return this.srcs.size > 0; }

  /** the order the later instruments arrive in: shuffled once per voyage, bass and shaperbox always first */
  setSeed(seed) {
    const r = mulberry32((seed ^ 0x51ea) >>> 0), rest = LAYERS.filter((k) => !FIRST.includes(k));
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    this.order = [...FIRST, ...rest];
  }

  /** src -> gain (the mixer's level for this cue) -> its own panner -> the shared low-pass; started later, all at once */
  add(key, src, gain) {
    const p = this.ctx.createStereoPanner(); p.pan.value = PLACE[key][0];
    src.connect(gain).connect(p).connect(this.lp);
    this.pans.set(key, p); this.srcs.set(key, src);
    this.st.set(key, { intro: 0, breath: 1, swell: 1, next: 8 + this.rnd() * 10, inScene: 0, ph: this.rnd() * 6.283 });
  }
  /** start every loaded stem on the same sample so they stay in time */
  start() { const when = this.ctx.currentTime + 0.15; this.t0 = when; for (const s of this.srcs.values()) s.start(when); }

  /** the next scene: after a full band a line-up of two or three, never one heard lately and sharing at most one player with the last */
  nextScene(on) {
    const full = new Set(on);
    if (on.length < 3) return { set: full, full: true, len: 4 };
    const wantFull = !this.sceneFull && (this.smalls >= 2 || this.rnd() < 0.5);   // after one or two small line-ups, the whole band again
    if (wantFull) return { set: full, full: true, len: 3 + Math.floor(this.rnd() * 3) };
    const sizes = on.length === 3 ? [2] : [2, 3];
    let best = null, bestScore = -1;
    for (let tries = 0; tries < 40; tries++) {
      const size = sizes[Math.floor(this.rnd() * sizes.length)], pool = [...on], pick = new Set();
      while (pick.size < size) pick.add(pool.splice(Math.floor(this.rnd() * pool.length), 1)[0]);
      const shared = this.sceneFull ? 0 : [...pick].filter((k) => this.scene.has(k)).length;
      const score = (this.recent.includes(keyOf(pick)) ? 0 : 2) + (shared <= 1 ? 1 : 0) + this.rnd() * 0.5;
      if (score > bestScore) { best = pick; bestScore = score; }
    }
    return { set: best, full: false, len: 2 + Math.floor(this.rnd() * 3) };
  }
  setRate(r) { for (const s of this.srcs.values()) s.playbackRate.value = r; }

  /** how many instruments the quests have brought in so far */
  static count(quests) { return quests >= 1 ? Math.min(LAYERS.length, quests + 1) : 0; }

  /**
   * One frame. s: { quests (main goals done), open (0 by the shore .. 1 open sea), wind (0..1.3), stage (how much of
   * dread stage 1 is left, 0..1) }. Returns the level (0..1) each stem should play at.
   */
  update(dt, s) {
    const d = dt * this.pace, T = this.ctx.currentTime;
    this.t += d;
    const n = SeaLayers.count(s.quests), on = this.order.filter((k) => this.srcs.has(k)).slice(0, n);
    // the whole band grows a little louder as it fills up, but stays in the background
    this.bg += ((n ? 0.5 + 0.04 * (n - 2) : 0) - this.bg) * (1 - Math.exp(-d / 20));
    this.open += ((s.open ?? 1) - this.open) * (1 - Math.exp(-dt / 8));   // eases down slowly by the shore
    // the swell: two slow waves; the music lifts on the crest and sinks (and darkens) in the trough
    const wave = 0.5 + 0.3 * Math.sin(this.t * 0.61) + 0.2 * Math.sin(this.t * 0.37 + 1.3);
    this.bus.gain.setTargetAtTime(0.82 + 0.18 * wave, T, 0.4);
    const wind = Math.min(1, s.wind || 0);
    this.lp.frequency.setTargetAtTime(Math.max(800, (1500 + 1500 * wave) * (1 - 0.35 * wind)), T, 0.5);

    // scenes: a newcomer brings a full-band scene (long enough to hear it arrive); otherwise a new scene when the last has run out,
    // on the next phrase
    this.sceneLeft -= d;
    const phrase = Math.floor((T - this.t0) / PHRASE), onPhrase = phrase !== this.phrase;
    this.phrase = phrase;
    if (on.length !== this.lastN) {
      this.lastN = on.length;
      this.scene = new Set(on); this.sceneFull = true; this.sceneLeft = on.length ? FADE_IN + 3 * PHRASE : 0; this.smalls = 0;
    } else if (on.length && this.sceneLeft <= 0 && (onPhrase || this.pace !== 1)) {
      const sc = this.nextScene(on);
      this.scene = sc.set; this.sceneFull = sc.full; this.sceneLeft = sc.len * PHRASE;
      this.smalls = sc.full ? 0 : this.smalls + 1;
      if (!sc.full) { this.recent.push(keyOf(sc.set)); if (this.recent.length > 4) this.recent.shift(); }
    }
    const out = {};
    for (const k of LAYERS) {
      const st = this.st.get(k);
      if (!st) continue;
      if (on.includes(k)) st.intro = Math.min(1, st.intro + d / FADE_IN);
      // in or out of the scene: a few seconds to come and go (a small line-up plays a little louder than one voice in the full band)
      const inT = this.scene.has(k) ? (this.sceneFull ? 1 : 1.25) : 0;
      st.inScene += (inT - st.inScene) * (1 - Math.exp(-d / (inT > st.inScene ? 2.5 : 3.5)));
      st.next -= d;
      if (st.next <= 0) { st.swell = 0.75 + 0.25 * this.rnd(); st.next = 10 + this.rnd() * 15; }   // and a gentle swell up or down
      st.breath += (st.swell - st.breath) * (1 - Math.exp(-d / 5));
      const [home, wander, sp] = PLACE[k];
      const pan = home + wander * (Math.sin(this.t * sp * 6.283 + st.ph) * 0.7 + Math.sin(this.t * sp * 14.4 + st.ph * 1.7) * 0.3);
      this.pans.get(k).pan.setTargetAtTime(Math.max(-0.9, Math.min(0.9, pan)), T, 1);
      out[k] = smooth(st.intro) * st.inScene * st.breath * this.bg * (s.stage ?? 1) * (0.4 + 0.6 * this.open);
    }
    return out;
  }
}

// The tavern in every harbour: four stems from the same session (99 BPM, 38.8 s, through HOIST, gently), muffled as if
// heard through the wall. Inside the tavern (its tab, or the dice game) they play softly with the highs filtered away;
// elsewhere in the harbour they are fainter and duller still, music from down the street. All four start together.
export const TAVERN = ['tav_bass', 'tav_shaperbox', 'tav_pluck', 'tav_drums'];
const TAV_PAN = { tav_bass: 0, tav_shaperbox: -0.25, tav_pluck: 0.3, tav_drums: 0.05 };

export class Tavern {
  constructor(ctx, out) {
    this.ctx = ctx;
    // two low-passes in a row (24 dB/oct): the high notes stay behind the wall
    this.lp1 = ctx.createBiquadFilter(); this.lp1.type = 'lowpass'; this.lp1.Q.value = 0.6;
    this.lp2 = ctx.createBiquadFilter(); this.lp2.type = 'lowpass'; this.lp2.Q.value = 0.6;
    this.lp1.frequency.value = this.lp2.frequency.value = 600;
    this.lp1.connect(this.lp2).connect(out);
    this.srcs = new Map();
    this.k = 0; this.near = 0;
  }
  get ready() { return this.srcs.size > 0; }
  add(key, src, gain) { const p = this.ctx.createStereoPanner(); p.pan.value = TAV_PAN[key] || 0; src.connect(gain).connect(p).connect(this.lp1); this.srcs.set(key, src); }
  start() { const when = this.ctx.currentTime + 0.15; for (const s of this.srcs.values()) s.start(when); }
  setRate(r) { for (const s of this.srcs.values()) s.playbackRate.value = r; }

  /** where: 0 away from any harbour, 0.35 in the harbour, 1 inside the tavern. Returns how loud each stem plays and how present the tavern is (0..1) */
  update(dt, where) {
    this.k += (where - this.k) * (1 - Math.exp(-dt / (where > this.k ? 1.2 : 0.8)));
    const inside = Math.max(0, (this.k - 0.35) / 0.65), T = this.ctx.currentTime;
    const cut = 380 + 820 * inside;   // about 400 Hz from the street, 1.2 kHz inside: still muffled
    this.lp1.frequency.setTargetAtTime(cut, T, 0.3); this.lp2.frequency.setTargetAtTime(cut * 1.15, T, 0.3);
    const lv = this.k < 0.01 ? 0 : 0.12 + 0.3 * inside;   // quiet: the room, not a concert
    const out = {}; for (const k of TAVERN) out[k] = this.k > 0.01 ? lv * Math.min(1, this.k / 0.35) : 0;
    return { levels: out, presence: Math.min(1, this.k / 0.35) * (0.6 + 0.4 * inside) };
  }
}
