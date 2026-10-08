import { mulberry32 } from './util.js';

// Procedural fallback audio: every cue the game asks for can be synthesised here, so the
// game has sound with zero files. Real files in public/audio/ override these per cue.
// Everything is mono, 22.05 kHz, deliberately lo-fi (PS1-ish).
const SR = 22050;
const TAU = Math.PI * 2;
const mk = (sec) => new Float32Array(Math.floor(sec * SR));
const noise = (n, seed = 1) => { const r = mulberry32(seed), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r() * 2 - 1; return x; };

function lp(x, a) { let y = 0; for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] = y; } return x; }
function hp(x, a) { const c = Float32Array.from(x); lp(c, a); for (let i = 0; i < x.length; i++) x[i] -= c[i]; return x; }
function bp(x, f, q) { // RBJ band-pass
  const w = TAU * f / SR, al = Math.sin(w) / (2 * q), b0 = al, b2 = -al, a0 = 1 + al, a1 = -2 * Math.cos(w), a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y;
  }
  return x;
}
function norm(x, peak = 0.8) { let m = 1e-6; for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i])); const k = peak / m; for (let i = 0; i < x.length; i++) x[i] *= k; return x; }
function loopify(x, n) {
  const L = x.length - n, out = new Float32Array(L);
  for (let i = 0; i < L; i++) out[i] = i < n ? x[i] * (i / n) + x[L + i] * (1 - i / n) : x[i];
  return out;
}
function echo(x, delay, fb, mix, wrap = false) {
  const d = Math.floor(delay * SR), out = Float32Array.from(x);
  for (let i = 0; i < x.length; i++) {
    let j = i - d;
    if (j < 0) { if (!wrap) continue; j += x.length; }
    out[i] += out[j] * fb;
  }
  for (let i = 0; i < x.length; i++) out[i] = x[i] * (1 - mix) + out[i] * mix;
  return out;
}
const env = (t, a, d) => Math.min(1, t / a) * Math.exp(-t / d);
const swell = (t, T, k = 1) => 0.5 + 0.5 * Math.sin(TAU * k * t / T);

// ---------------------------------------------------------------- loops
const LOOPS = {
  oars() { // two strokes: a dip, a pull, a drip, in a 3.6 s loop
    const T = 3.6, x = mk(T), nz = lp(noise(x.length, 41), 0.25);
    for (let k = 0; k < 2; k++) {
      const t0 = k * 1.8;
      tone(x, t0, 0.5, (t) => nz[Math.floor((t0 + t) * SR) % x.length] * Math.exp(-t * 7) * Math.min(1, t / 0.02) * 1.3);
      tone(x, t0 + 0.05, 0.25, (t) => Math.sin(TAU * (140 - 60 * t) * t) * Math.exp(-t * 12) * 0.4);
      tone(x, t0 + 1.1, 0.4, (t) => Math.sin(TAU * 1200 * t) * Math.exp(-t * 30) * 0.15);
    }
    return norm(x, 0.5);
  },
  sea() {
    const T = 8, n = Math.floor((T + 0.5) * SR), a = noise(n, 11), b = Float32Array.from(a);
    lp(a, 0.035); lp(b, 0.28);
    for (let i = 0; i < n; i++) { const t = i / SR, s1 = swell(t, T), s2 = swell(t + 1.3, T / 2); a[i] = a[i] * 3 * (0.4 + 0.6 * s1) + b[i] * 0.45 * s2 * s1; }
    return norm(loopify(a, Math.floor(0.5 * SR)), 0.55);
  },
  surf() {
    const T = 6, n = Math.floor((T + 0.5) * SR), a = noise(n, 12);
    lp(a, 0.22);
    for (let i = 0; i < n; i++) { const t = i / SR; a[i] *= Math.pow(Math.max(0, Math.sin(Math.PI * ((t % 6) / 6))), 2.5) * 1.2 + 0.05; }
    return norm(loopify(a, Math.floor(0.5 * SR)), 0.6);
  },
  wind() {
    const T = 8, n = Math.floor((T + 0.5) * SR), a = bp(noise(n, 13), 520, 0.9);
    for (let i = 0; i < n; i++) { const t = i / SR; a[i] *= 0.35 + 0.65 * swell(t, T, 1) * swell(t + 2, T, 2); a[i] += Math.sin(TAU * (610 + 40 * Math.sin(TAU * t / T)) * t) * 0.012 * swell(t, T / 2); }
    return norm(loopify(a, Math.floor(0.5 * SR)), 0.5);
  },
  rain() {
    const T = 4, n = Math.floor((T + 0.4) * SR), a = hp(noise(n, 14), 0.3);
    lp(a, 0.7);
    for (let i = 0; i < n; i++) a[i] *= 0.85 + 0.15 * Math.sin(TAU * i / SR * 7);
    return norm(loopify(a, Math.floor(0.4 * SR)), 0.5);
  },
  amb_night() {
    const T = 8, n = Math.floor((T + 0.5) * SR), a = lp(noise(n, 15), 0.02);
    for (let i = 0; i < n; i++) {
      const t = i / SR, gate = Math.max(0, Math.sin(TAU * 12 * t)) * (Math.sin(TAU * t * 1.25) > 0.35 ? 1 : 0);
      a[i] = a[i] * 6 * swell(t, T) + Math.sin(TAU * 4300 * t) * gate * 0.06 + Math.sin(TAU * 3700 * t) * gate * (Math.sin(TAU * t * 0.9) > 0.5 ? 1 : 0) * 0.04;
    }
    return norm(loopify(a, Math.floor(0.5 * SR)), 0.35);
  },
  amb_1() { // bright air
    const T = 12, n = Math.floor((T + 0.5) * SR), a = bp(noise(n, 21), 700, 0.6);
    for (let i = 0; i < n; i++) { const t = i / SR; a[i] = a[i] * (0.5 + 0.5 * swell(t, T, 1)) + (Math.sin(TAU * 880 * t) + Math.sin(TAU * 1318 * t) * 0.6) * 0.012 * swell(t, T / 3); }
    return norm(loopify(a, Math.floor(0.5 * SR)), 0.4);
  },
  amb_2() { // thin and quiet
    const T = 12, n = Math.floor((T + 0.5) * SR), a = bp(noise(n, 22), 450, 0.8);
    for (let i = 0; i < n; i++) { const t = i / SR; a[i] = a[i] * 0.6 * swell(t, T) + (Math.sin(TAU * 110 * t) + 0.7 * Math.sin(TAU * 164.8 * t)) * 0.05 * swell(t, T / 2); }
    return norm(loopify(a, Math.floor(0.5 * SR)), 0.35);
  },
  amb_3() { // detuned drone
    const T = 12, n = Math.floor((T + 0.5) * SR), a = bp(noise(n, 23), 900, 1.2);
    for (let i = 0; i < n; i++) { const t = i / SR; a[i] = a[i] * 0.3 + (Math.sin(TAU * 110 * t) + Math.sin(TAU * 116.5 * t) + 0.5 * Math.sin(TAU * 220.9 * t)) * 0.07 * (0.6 + 0.4 * swell(t, T)); }
    return norm(loopify(a, Math.floor(0.5 * SR)), 0.4);
  },
  amb_4() { // sparse, breathing
    const T = 14, n = Math.floor((T + 0.5) * SR), a = lp(noise(n, 24), 0.05);
    for (let i = 0; i < n; i++) { const t = i / SR; a[i] = a[i] * 5 * Math.pow(swell(t, 7), 2) + (Math.sin(TAU * 55 * t) * 0.12 + Math.sin(TAU * 82.4 * t) * 0.05) * (0.7 + 0.3 * swell(t, T)); }
    return norm(loopify(a, Math.floor(0.5 * SR)), 0.4);
  },
  amb_5() { // endlessly falling Shepard-Risset tone over a sub rumble
    const T = 16, n = Math.floor(T * SR), x = new Float32Array(n), K = 7, ph = new Float32Array(K);
    for (let i = 0; i < n; i++) {
      const t = i / SR; let s = 0;
      for (let k = 0; k < K; k++) {
        const pos = k + (1 - t / T), f = 55 * Math.pow(2, pos), w = Math.exp(-Math.pow(pos - 3.4, 2) / (2 * 1.5 * 1.5));
        ph[k] += TAU * f / SR; s += Math.sin(ph[k]) * w;
      }
      x[i] = s * 0.12 + Math.sin(TAU * 36 * t) * 0.18 * (0.7 + 0.3 * Math.sin(TAU * t / T * 2));
    }
    const nz = lp(noise(n, 25), 0.04);
    for (let i = 0; i < n; i++) x[i] += nz[i] * 1.5 * Math.pow(swell(i / SR, 8), 3);
    return norm(x, 0.5);
  },
};

// ---------------------------------------------------------------- music
const BEAT = 0.75, BARS = 8;
const MELODY = [ // [midi, beats]; D major sea-shanty-ish
  [62, 1], [66, 1], [69, 1], [69, 1],   [71, 1], [69, .5], [67, .5], [66, 1], [62, 1],
  [64, 1], [67, 1], [71, 1], [71, 1],   [69, 1.5], [66, .5], [62, 2],
  [62, 1], [66, 1], [69, 1], [74, 1],   [71, 1], [69, 1], [66, 1], [64, 1],
  [67, 1], [69, 1], [71, 1], [69, 1],   [66, 1], [64, 1], [62, 2],
];
const BASS = [38, 38, 43, 38, 38, 45, 43, 38];
const mf = (m, cents = 0) => 440 * Math.pow(2, (m - 69 + cents / 100) / 12);

function accordion(x, t0, dur, f, amp) {
  const n0 = Math.floor(t0 * SR), n = Math.floor((dur + 0.12) * SR);
  for (let i = 0; i < n && n0 + i < x.length; i++) {
    const t = i / SR, e = Math.min(1, t / 0.03) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.12)), ph = TAU * f * t;
    let s = 0;
    for (let h = 1; h <= 5; h++) s += (Math.sin(ph * h * 1.0017) + Math.sin(ph * h * 0.9983)) / h;
    x[n0 + i] += s * 0.14 * amp * e * (1 + 0.1 * Math.sin(TAU * 5.5 * t));
  }
}
function musicBox(x, t0, dur, f, amp, decay = 0.7) {
  const n0 = Math.floor(t0 * SR), n = Math.floor(Math.min(dur + 1.2, 2.2) * SR);
  for (let i = 0; i < n && n0 + i < x.length; i++) {
    const t = i / SR, e = Math.min(1, t / 0.004) * Math.exp(-t / decay);
    x[n0 + i] += (Math.sin(TAU * f * t) + 0.4 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t * 6) + 0.15 * Math.sin(TAU * f * 5.4 * t) * Math.exp(-t * 10)) * 0.3 * amp * e;
  }
}
function bassNote(x, t0, dur, f, amp) {
  const n0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  for (let i = 0; i < n && n0 + i < x.length; i++) {
    const t = i / SR, e = Math.min(1, t / 0.01) * Math.max(0, 1 - t / dur) ;
    x[n0 + i] += (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * f * 3 * t)) * 0.3 * amp * e;
  }
}
function stomp(x, t0, amp) { const n0 = Math.floor(t0 * SR); for (let i = 0; i < 0.14 * SR && n0 + i < x.length; i++) { const t = i / SR; x[n0 + i] += Math.sin(TAU * (60 - 200 * t) * t) * Math.exp(-t * 30) * 0.7 * amp; } }
function clap(x, t0, amp, r) { const n0 = Math.floor(t0 * SR); for (let i = 0; i < 0.06 * SR && n0 + i < x.length; i++) { const t = i / SR; x[n0 + i] += (r() * 2 - 1) * Math.exp(-t * 60) * 0.25 * amp; } }

function music(stage) {
  const x = mk(BARS * 4 * BEAT), r = mulberry32(300 + stage);
  const bars = BARS;
  let t = 0;
  const notes = MELODY.map(([m, b]) => { const o = { m, t, b: b * BEAT }; t += b * BEAT; return o; });
  const pulse = (fn) => { for (let b = 0; b < bars * 4; b++) fn(b); };
  if (stage === 1) {
    for (const n of notes) accordion(x, n.t, n.b * 0.92, mf(n.m), 0.9);
    BASS.forEach((m, i) => { bassNote(x, i * 4 * BEAT, 1.9 * BEAT, mf(m), 0.8); bassNote(x, i * 4 * BEAT + 2 * BEAT, 1.9 * BEAT, mf(m + 7), 0.6); });
    pulse((b) => { if (b % 2 === 0) stomp(x, b * BEAT, 0.8); else clap(x, b * BEAT, 0.8, r); });
  } else if (stage === 2) {
    notes.forEach((n, i) => accordion(x, n.t + (i > 20 ? 0.03 : 0), n.b * 0.92, mf(n.m, i === 11 || i === 12 ? -45 : 0), 0.8));
    BASS.forEach((m, i) => bassNote(x, i * 4 * BEAT, 3.6 * BEAT, mf(m), 0.6));
    pulse((b) => { if (b % 4 === 0) stomp(x, b * BEAT, 0.4); });
  } else if (stage === 3) {
    notes.forEach((n, i) => {
      const m = n.m === 66 ? 65 : n.m === 71 ? 70 : n.m;
      musicBox(x, n.t, n.b, mf(m, 25 * Math.sin(i * 0.9)), 0.9, 0.9);
    });
    BASS.forEach((m, i) => { if (i % 2 === 0) bassNote(x, i * 4 * BEAT, 7.8 * BEAT, mf(m - (i === 4 ? 1 : 0)), 0.5); });
  } else {
    notes.forEach((n, i) => { if (i % 3 === 0) musicBox(x, n.t, n.b * 2, mf(n.m - 12, i % 2 ? -30 : 20), 1, 1.6); });
    bassNote(x, 0, 16 * BEAT, mf(26), 0.6);
  }
  let out = stage >= 3 ? echo(x, BEAT * 0.75, stage === 4 ? 0.55 : 0.45, 0.6, true) : x;
  if (stage === 5) {
    out = Float32Array.from(out).reverse();
    for (let i = 0; i < out.length; i++) { const t = i / SR; out[i] = out[i] * 0.8 + Math.sin(TAU * 36 * t) * 0.15 + Math.sin(TAU * 38.2 * t) * 0.1; }
  }
  return norm(out, 0.6);
}

// ---------------------------------------------------------------- one-shots
function tone(x, t0, dur, fn, amp = 1) { const n0 = Math.floor(t0 * SR), n = Math.floor(dur * SR); for (let i = 0; i < n && n0 + i < x.length; i++) x[n0 + i] += fn(i / SR) * amp; }
function bell(x, t0, f, dur, amp = 1) {
  tone(x, t0, dur, (t) => { const e = Math.min(1, t / 0.003); let s = 0; [[1, 1, 1.6], [2.0, 0.6, 1.0], [2.76, 0.5, 0.7], [5.4, 0.3, 0.4], [8.9, 0.15, 0.25]].forEach(([r, a, d]) => { s += Math.sin(TAU * f * r * t) * a * Math.exp(-t / (d * dur * 0.5)); }); return s * e * 0.3; }, amp);
}

const SHOTS = {
  cannon() { const x = mk(1.6), nz = lp(noise(x.length, 51), 0.12); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = nz[i] * Math.exp(-t * 3.5) * 2 + Math.sin(TAU * (55 - 25 * t) * t) * Math.exp(-t * 5); } return norm(x, 0.85); },
  hit() { const x = mk(0.8), nz = bp(noise(x.length, 52), 900, 0.7); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = nz[i] * Math.exp(-t * 10) + Math.sin(TAU * 80 * t) * Math.exp(-t * 8) * 0.8; } return norm(x, 0.8); },
  cast() { const x = mk(0.9), nz = bp(noise(x.length, 53), 2500, 2); tone(x, 0, 0.35, (t) => nz[Math.floor(t * SR)] * Math.sin(Math.PI * t / 0.35)); tone(x, 0.6, 0.3, (t) => Math.sin(TAU * (600 - 500 * t) * t) * Math.exp(-t * 14) * 0.5); return norm(x, 0.5); },
  bite() { const x = mk(0.5); tone(x, 0, 0.12, (t) => Math.sin(TAU * 1400 * t) * Math.exp(-t * 30)); tone(x, 0.16, 0.12, (t) => Math.sin(TAU * 1400 * t) * Math.exp(-t * 30)); return norm(x, 0.55); },
  catch() { const x = mk(1.2); tone(x, 0, 0.4, (t) => Math.sin(TAU * (200 + 600 * t) * t) * Math.exp(-t * 6) * 0.5); [659.3, 784, 987.8].forEach((f, i) => bell(x, 0.2 + i * 0.09, f, 0.8, 0.7)); return norm(x, 0.6); },
  roll_d20() { const x = mk(1.3), r = mulberry32(54); for (let k = 0; k < 9; k++) { const t0 = 0.05 + k * 0.11 + r() * 0.04, f = 900 + r() * 900; tone(x, t0, 0.08, (t) => (Math.sin(TAU * f * t) + Math.sin(TAU * f * 2.3 * t) * 0.4) * Math.exp(-t * 60) * (1 - k * 0.07)); } return norm(x, 0.55); },
  roll_d6() { const x = mk(0.9), r = mulberry32(55); for (let k = 0; k < 6; k++) { const t0 = 0.04 + k * 0.12 + r() * 0.03, f = 600 + r() * 500; tone(x, t0, 0.07, (t) => Math.sin(TAU * f * t) * Math.exp(-t * 70) * (1 - k * 0.1)); } return norm(x, 0.55); },
  card() { const x = mk(0.5), nz = bp(noise(x.length, 56), 3000, 1.5); tone(x, 0, 0.3, (t) => nz[Math.floor(t * SR)] * Math.sin(Math.PI * t / 0.3)); tone(x, 0.25, 0.06, (t) => Math.sin(TAU * 300 * t) * Math.exp(-t * 60) * 0.5); return norm(x, 0.45); },
  success() { const x = mk(1.1); [523.3, 784, 1046.5].forEach((f, i) => bell(x, i * 0.08, f, 0.9, 0.8)); return norm(x, 0.55); },
  fail() { const x = mk(1.0); tone(x, 0, 0.9, (t) => Math.sin(TAU * (220 - 60 * t) * t) * Math.exp(-t * 3) * (0.6 + 0.4 * Math.sin(TAU * 7 * t))); return norm(x, 0.5); },
  chapter() { const x = mk(3); bell(x, 0, 196, 2.8); bell(x, 0.5, 293.7, 2.4, 0.7); return norm(x, 0.55); },
  knock() { const x = mk(1.2); for (let k = 0; k < 3; k++) tone(x, k * 0.28, 0.15, (t) => Math.sin(TAU * 120 * t) * Math.exp(-t * 40) + Math.sin(TAU * 310 * t) * Math.exp(-t * 60) * 0.4); return norm(x, 0.6); },
  ending() { const x = mk(5); tone(x, 0, 5, (t) => (Math.sin(TAU * 55 * t) + Math.sin(TAU * 82.4 * t) * 0.6 + Math.sin(TAU * 110.5 * t) * 0.3) * Math.min(1, t / 1.5) * Math.exp(-t * 0.6)); bell(x, 0.2, 110, 4.5, 0.6); return norm(x, 0.6); },
  creak() {
    const x = mk(0.9), r = mulberry32(31), n = x.length;
    let ph = 0, gate = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR, f = 90 + 55 * Math.sin(t * 3.5) + t * 40;
      ph += TAU * f / SR;
      if (i % 220 === 0) gate = r() < 0.55 ? 1 : 0.2;
      let s = 0; for (let h = 1; h <= 6; h++) s += Math.sin(ph * h) / h;
      x[i] = s * gate * Math.sin(Math.PI * t / 0.9) * 0.4;
    }
    return norm(lp(x, 0.3), 0.5);
  },
  splash() { const x = noise(Math.floor(0.7 * SR), 32); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] *= Math.exp(-t * 6) * Math.min(1, t / 0.01); } lp(x, 0.4); return norm(x, 0.6); },
  bump() { const x = mk(0.5), nz = lp(noise(x.length, 33), 0.2); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = Math.sin(TAU * (70 - 70 * t) * t) * Math.exp(-t * 9) + nz[i] * Math.exp(-t * 20) * 0.6; } return norm(x, 0.8); },
  dig() { const x = mk(1.4); const nz = bp(noise(x.length, 34), 1500, 0.8); for (let k = 0; k < 3; k++) tone(x, k * 0.45, 0.3, (t) => nz[Math.floor((k * 0.45 + t) * SR)] * Math.sin(Math.PI * t / 0.3) * 1.2 + Math.sin(TAU * 90 * t) * Math.exp(-t * 20) * 0.5); return norm(x, 0.6); },
  treasure() { const x = mk(2); [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => bell(x, i * 0.11, f, 1.4, 0.8)); return norm(x, 0.7); },
  discover() { const x = mk(1); bell(x, 0, 784, 0.9); bell(x, 0.14, 1174.7, 0.8, 0.8); return norm(x, 0.55); },
  harbour() { const x = mk(2.6); bell(x, 0, 330, 2.2); bell(x, 0.8, 392, 1.8, 0.8); return norm(x, 0.6); },
  bell() { const x = mk(3.4); bell(x, 0, 220, 3.2); return norm(x, 0.55); },
  ui() { const x = mk(0.12); tone(x, 0, 0.12, (t) => Math.sin(TAU * 880 * t) * Math.exp(-t * 40)); return norm(x, 0.5); },
  pause() { const x = mk(0.22); tone(x, 0, 0.22, (t) => Math.sin(TAU * (320 - 400 * t) * t) * Math.exp(-t * 16)); return norm(x, 0.5); },
  buy() { const x = mk(0.7); bell(x, 0, 1568, 0.5, 0.8); bell(x, 0.08, 2093, 0.5, 0.8); tone(x, 0, 0.05, (t) => (Math.sin(t * 9000) > 0 ? 1 : -1) * Math.exp(-t * 90) * 0.2); return norm(x, 0.55); },
  bottle() { const x = mk(0.9); tone(x, 0, 0.5, (t) => (Math.sin(TAU * 2200 * t) + 0.6 * Math.sin(TAU * 3300 * t)) * Math.exp(-t * 12) * 0.3); tone(x, 0.18, 0.3, (t) => Math.sin(TAU * (300 + 900 * t) * t) * Math.exp(-t * 10) * 0.6); return norm(x, 0.55); },
  whisper() {
    const n = Math.floor(2.4 * SR), a = noise(n, 35), b = Float32Array.from(a);
    bp(a, 780, 5); bp(b, 2100, 6);
    for (let i = 0; i < n; i++) { const t = i / SR, syl = Math.pow(Math.max(0, Math.sin(TAU * t * 3.1 + Math.sin(t * 5))), 1.5), fade = Math.sin(Math.PI * t / 2.4); a[i] = (a[i] * 1.0 + b[i] * 0.7) * syl * fade; }
    return norm(echo(a, 0.19, 0.4, 0.5), 0.55);
  },
  stage_up() {
    const x = mk(2.8);
    [[220, 1], [233.1, 1], [329.6, 0.6]].forEach(([f, a]) => tone(x, 0, 2.8, (t) => { const fr = f * (1 - 0.35 * t / 2.8); return (Math.sin(TAU * fr * t) + 0.4 * Math.sin(TAU * fr * 2.01 * t)) * Math.sin(Math.PI * Math.min(1, t / 2.8)) * 0.25 * a; }));
    return norm(echo(x, 0.3, 0.5, 0.5), 0.6);
  },
  thunder() {
    const n = Math.floor(4.2 * SR), a = noise(n, 36); lp(a, 0.03);
    for (let i = 0; i < n; i++) { const t = i / SR; a[i] = a[i] * 7 * Math.min(1, t / 0.15) * Math.exp(-t / 1.3) * (0.7 + 0.3 * Math.sin(TAU * 9 * t)) + Math.sin(TAU * 42 * t) * Math.exp(-t / 0.9) * 0.15; }
    return norm(a, 0.8);
  },
  horn() { const x = mk(1.7); tone(x, 0, 1.7, (t) => { const e = Math.min(1, t / 0.12) * (t < 1.3 ? 1 : Math.max(0, 1 - (t - 1.3) / 0.4)); return (Math.sin(TAU * 147 * t) + Math.sin(TAU * 185 * t) + 0.3 * Math.sin(TAU * 294 * t)) * 0.3 * e; }); return norm(lp(x, 0.4), 0.7); },
  gull() { const x = mk(0.9); [[0, 0.28, 1600, 950], [0.34, 0.3, 1450, 800], [0.7, 0.2, 1300, 900]].forEach(([s, d, f0, f1]) => tone(x, s, d, (t) => { const f = f0 + (f1 - f0) * (t / d); return Math.sin(TAU * f * t + 3 * Math.sin(TAU * 28 * t)) * Math.sin(Math.PI * t / d) * 0.4; })); return norm(x, 0.45); },
  dolphin() { const x = mk(1); for (let i = 0; i < 6; i++) tone(x, i * 0.035, 0.02, (t) => Math.sin(TAU * 5000 * t) * Math.exp(-t * 200)); tone(x, 0.3, 0.6, (t) => Math.sin(TAU * (1800 + 2600 * Math.sin(Math.PI * t / 0.6 * 0.5)) * t) * Math.sin(Math.PI * t / 0.6) * 0.4); return norm(x, 0.45); },
  whale() {
    const x = mk(5.5);
    tone(x, 0, 5.5, (t) => { const f = 80 + 60 * Math.sin(Math.PI * t / 5.5) + 8 * Math.sin(TAU * 0.7 * t); return (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 2 * t) + 0.25 * Math.sin(TAU * f * 3 * t)) * Math.sin(Math.PI * t / 5.5) * 0.4; });
    return norm(echo(x, 0.5, 0.45, 0.5), 0.6);
  },
};

const LOOP_KEYS = Object.keys(LOOPS);
export const canSynth = (key) => LOOP_KEYS.includes(key) || key in SHOTS || /^music_[1-5]$/.test(key);
export const SYNTH_EXTRA_LOOPS = ['wind', 'rain', 'surf'];
export const SYNTH_EXTRA_SHOTS = ['thunder', 'horn', 'gull', 'dolphin', 'whale', 'bell', 'bottle'];

export function synth(ctx, key) {
  let data = null;
  if (LOOPS[key]) data = LOOPS[key]();
  else if (SHOTS[key]) data = SHOTS[key]();
  else if (/^music_[1-5]$/.test(key)) data = music(parseInt(key.slice(6), 10));
  if (!data) return null;
  const buf = ctx.createBuffer(1, data.length, SR);
  buf.copyToChannel(data, 0);
  return buf;
}
