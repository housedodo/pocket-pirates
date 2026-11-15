// Tama's noon bell (task L3; owner, 2026-11-14: Tama's bell is the band's bell). At noon the bell in Tama's belfry swings once per
// stroke and each stroke sounds at the top of its swing with one stroke of the band's own bell (`bell`, cut from the s1_bell stem).
// The swing is the sound's silent twin (RULES 28): with the sound off the strokes can still be counted. How many strokes ring is
// main.js noonBells' business (one, as before; whether it should be the last throw is the owner's open question).
import { G } from '../core/runtime.js';

const SWING = 1.6, AMP = 0.45, DECAY = 1.4, LIFE = 4.2;   // seconds per swing, largest angle (radians), how fast it settles, one stroke's length
const strokes = [];

/** ring Tama's bell n times. vol: how loud each stroke is where the ship is (0: too far to hear; it still swings) */
export function ringNoon(isl, n = 1, vol = 0) {
  for (let i = 0; i < n; i++) strokes.push({ isl, t: -i * LIFE, vol, struck: false });
}

/** each frame (world time: it keeps going ashore, stops in menus): swing, and sound each stroke at the top of its swing */
export function noonBellTick(dt) {
  if (!strokes.length) return;
  for (let i = 0; i < strokes.length; i++) {
    const s = strokes[i]; s.t += dt;
    if (s.t < 0) continue;
    if (!s.struck && s.t >= SWING / 4) { s.struck = true; if (s.vol > 0) G.audio.play('bell', { vol: s.vol, delay: G.audio.toBeat ? G.audio.toBeat() : 0 }); }   // on the band's next beat (at most 0.6 s after the top of the swing), so it never flams against the band's own bell
    const b = s.isl.bell;
    if (b) b.rotation.x = s.t < LIFE ? AMP * Math.exp(-s.t / DECAY) * Math.sin((2 * Math.PI * s.t) / SWING) : 0;
    if (s.t >= LIFE) strokes.splice(i--, 1);
  }
}

/** for tests: strokes still to ring or swinging */
export const noonPending = () => strokes.length;
