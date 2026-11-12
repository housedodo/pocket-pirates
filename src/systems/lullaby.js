// The Two Players keep the Free Cays asleep (CANON 2026-11-12: they sailed, refused to throw, and found that their song soothes the
// sleeper). In the Free Cays on a night without storm the dread there cannot climb past stage 2 (LULL_CAP). Near Teo's sandbar or
// Ilse's rock you hear the eight bars: Teo's guitar starts, Ilse's violin finishes. Never explained.
// The tune here is a placeholder on the synth tone (audio.playTone) until the composer's recording replaces it (docs/AUDIO.md).
import { rt } from '../core/runtime.js';

export const LULL_CAP = 0.45;                    // just under stage 3 (0.5)
const TEO = [495, 70], ILSE = [880, 190];        // landmarks.js: Teo's Sandbar (4,1), Ilse's Rock (8,2)
const HEAR = 600;                                // how far the tune carries over still water
// eight bars in D, 6/8 at 125 BPM: an eighth note is 0.16 s, a bar 0.96 s. [note, eighths]
const E8 = 60 / 125 / 3;
const HZ = { D4: 293.66, E4: 329.63, Fs4: 369.99, G4: 392, A4: 440, B4: 493.88 };
const TEO_BARS = [['A4', 3], ['Fs4', 3], ['G4', 3], ['E4', 3], ['Fs4', 2], ['E4', 1], ['D4', 3], ['E4', 6]];
const ILSE_BARS = [['A4', 3], ['B4', 3], ['A4', 3], ['Fs4', 3], ['G4', 2], ['Fs4', 1], ['E4', 3], ['D4', 6]];

rt.lullK = 0;          // 0..1: how far the Cays' night quiet holds the dread down
rt.lullT = 8;          // seconds until the tune is played again

/** the dread the Cays allow tonight: the target pulled down to the cap as lullK rises */
export function lullDread(target) { return target - Math.max(0, target - LULL_CAP) * rt.lullK; }

/** each frame at sea. ctx: { dt, free (in the Free Cays), night (0..1), storm (0..1), ship, audio } */
export function lullabyTick({ dt, free, night, storm, ship, audio }) {
  const on = free && night > 0.4 && storm < 0.3;
  rt.lullK += ((on ? 1 : 0) - rt.lullK) * Math.min(1, dt * 0.2);
  if (rt.lullK < 0.6) return;
  const dTeo = Math.hypot(ship.pos.x - TEO[0], ship.pos.z - TEO[1]), dIlse = Math.hypot(ship.pos.x - ILSE[0], ship.pos.z - ILSE[1]);
  if (Math.min(dTeo, dIlse) > HEAR) return;
  rt.lullT -= dt; if (rt.lullT > 0) return;
  rt.lullT = 45 + Math.random() * 30;
  const t0 = playPhrase(audio, TEO_BARS, ship, TEO, dTeo, 1, 0);
  playPhrase(audio, ILSE_BARS, ship, ILSE, dIlse, 2, t0 + 0.3);   // she takes the tune where he left it, an octave up
}

function playPhrase(audio, bars, ship, at, dist, octave, start) {
  const vol = 0.22 * Math.max(0, 1 - dist / HEAR); if (vol <= 0.01) return start + bars.reduce((a, [, n]) => a + n, 0) * E8;
  const rel = Math.atan2(at[0] - ship.pos.x, -(at[1] - ship.pos.z)) - ship.heading, pan = Math.sin(rel) * 0.8;
  let t = start;
  for (const [n, len] of bars) { const at_ = t; setTimeout(() => audio.playTone(HZ[n] * octave, { dur: len * E8 * (octave === 2 ? 1.6 : 1.1), vol, pan }), at_ * 1000); t += len * E8; }
  return t;
}
