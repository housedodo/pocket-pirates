// Stage 1 out on open sea: the instrument stems (public/audio/s1_*.ogg) come in one by one as the main quests are done.
// They are one 16-bar loop at 99 BPM (38.8 s, all the same length, rendered through HOIST at FAIR WEATHER), started at
// the same instant so they stay locked together. Nothing plays before the first quest; quest 1 brings in bass and
// shaperbox, every quest after that one more instrument (order shuffled per voyage). Each layer breathes on its own
// (slow swells, and once in a while it drops out briefly and comes back), wanders a little around its place in the
// stereo field, and all of them sit under a soft low-pass that moves with the swell and closes in strong wind, as if
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
const SETTLE = 90;       // a new instrument stays put this long before it may drop out
const smooth = (x) => x * x * (3 - 2 * x);

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
    this.st.set(key, { intro: 0, age: 0, breath: 1, target: 1, next: 8 + this.rnd() * 10, rest: false, ph: this.rnd() * 6.283 });
  }
  /** start every loaded stem on the same sample so they stay in time */
  start() { const when = this.ctx.currentTime + 0.15; for (const s of this.srcs.values()) s.start(when); }
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

    const sounding = on.filter((k) => !this.st.get(k).rest).length, out = {};
    for (const k of LAYERS) {
      const st = this.st.get(k);
      if (!st) continue;
      const isOn = on.includes(k);
      if (isOn) { st.intro = Math.min(1, st.intro + d / FADE_IN); st.age += d; }
      st.next -= d;
      if (isOn && st.next <= 0) {
        if (st.rest) { st.rest = false; st.target = 0.7 + 0.3 * this.rnd(); st.next = 20 + this.rnd() * 20; }   // back again
        else {
          // drop out for a while, as long as enough of the band keeps playing; the bass only rarely, and never while the band is small
          const canRest = st.age > SETTLE && sounding >= 3 && (!FIRST.includes(k) || n >= 4);
          if (canRest && this.rnd() < (k === 's1_bass' ? 0.05 : 0.15)) { st.rest = true; st.target = 0; st.next = 10 + this.rnd() * 12; }
          else { st.target = 0.65 + 0.35 * this.rnd(); st.next = 12 + this.rnd() * 18; }   // a slow swell up or down
        }
      }
      st.breath += (st.target - st.breath) * (1 - Math.exp(-d / 5));
      const [home, wander, sp] = PLACE[k];
      const pan = home + wander * (Math.sin(this.t * sp * 6.283 + st.ph) * 0.7 + Math.sin(this.t * sp * 14.4 + st.ph * 1.7) * 0.3);
      this.pans.get(k).pan.setTargetAtTime(Math.max(-0.9, Math.min(0.9, pan)), T, 1);
      out[k] = smooth(st.intro) * st.breath * this.bg * (s.stage ?? 1) * (0.4 + 0.6 * this.open);
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
