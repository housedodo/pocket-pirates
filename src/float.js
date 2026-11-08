// How a hull floats on the swell. One shared model for the player's ship and every other ship.
//  - The water under the hull is read at nine points along and across it and fitted with a plane: its mean height (heave), its slope along
//    the hull (pitch) and across it (roll). A hull longer than the short ripples rides the envelope of the waves, not each one.
//  - Buoyancy: heave is a stiff, well damped spring, so the hull follows the water closely; a hull cannot be pulled under the water below it by more than its
//    draft margin or thrown above the water by more than a small lift, however big the swell (the old soft spring let it lag a crest
//    and sink into the trough, which is what happened far out).
//  - Pitch and roll follow the slope with a little weight (a softer spring and some overshoot), and are limited so a steep face tips the
//    bow, never flips it.
import { waveHeight } from './ocean.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** the water under a hull of length L and beam B at (x, z) heading h: { mean, centre (the water right under the middle), along (slope, + is up toward the bow), across (+ up to starboard), lo, hi } */
export function hullWater(x, z, h, t, wave, L = 7.6, B = 3.8) {   // read over a stretch a little longer than the hull (a ship feels the swell, not every ripple)
  const fx = Math.sin(h), fz = -Math.cos(h), rx = Math.cos(h), rz = Math.sin(h);
  const pts = [[-0.5, 0], [-0.25, 0], [-0.15, 0], [0, 0], [0.15, 0], [0.25, 0], [0.5, 0], [0, -0.5], [0, 0.5], [-0.3, -0.45], [0.3, 0.45]];   // [along fraction of L, across fraction of B]
  let sum = 0, sa = 0, sc = 0, saa = 0, scc = 0, lo = 1e9, hi = -1e9;
  const hs = []; let centre = 0;
  for (const [a, c] of pts) {
    const A = a * L, C = c * B;
    const y = waveHeight(x + fx * A + rx * C, z + fz * A + rz * C, t, wave);
    if (c === 0 && Math.abs(a) <= 0.15) centre += (a === 0 ? 0.5 : 0.25) * y;   // the water under the middle, smoothed over a short stretch (no ripples)
    hs.push([A, C, y]); sum += y; if (y < lo) lo = y; if (y > hi) hi = y;
  }
  const mean = sum / pts.length;
  for (const [A, C, y] of hs) { sa += A * (y - mean); saa += A * A; sc += C * (y - mean); scc += C * C; }
  return { mean, centre, along: sa / (saa || 1), across: sc / (scc || 1), lo, hi };
}

/** advance a floating state F = { y, vy, p, vp, r, vr } toward the water w (from hullWater). extra: { pitch, roll, lift } added to the targets */
export function rideWaves(F, w, dt, extra = {}) {
  const dtc = Math.min(dt, 0.05);
  // heave aims between the average and the water right under the middle: on a crest the average is lower than the crest itself, and a hull
  // that rides the average sits down in the wave (that is what put the ship under water); a hull rides high on the crest, a little above the trough
  const tY = 0.6 * w.centre + 0.4 * w.mean + (extra.lift ?? 0.12);
  const tP = clamp(Math.atan(w.along) * 0.9, -0.55, 0.55) + (extra.pitch || 0);
  const tR = clamp(Math.atan(w.across) * 0.85, -0.6, 0.6) + (extra.roll || 0);
  if (!(F.init)) { F.y = tY; F.vy = 0; F.p = tP; F.vp = 0; F.r = tR; F.vr = 0; F.init = true; F.ty = tY; F.tp = tP; F.tr = tR; F.wy = 0; F.wp = 0; F.wr = 0; }
  // how fast the water itself is rising or tilting (smoothed): the hull's spring damps against THAT speed, not against standing still,
  // so it rises and falls with the water instead of lagging behind it (a damped spring on its own always trails a moving target)
  if (dtc > 0) {
    const lp = Math.min(1, dtc * 8);
    F.wy += ((tY - F.ty) / dtc - F.wy) * lp; F.wp += ((tP - F.tp) / dtc - F.wp) * lp * 0.5; F.wr += ((tR - F.tr) / dtc - F.wr) * lp * 0.5;
    F.ty = tY; F.tp = tP; F.tr = tR;
  }
  const spring = (k, vk, tg, vt, wn, z) => { F[vk] += (wn * wn * (tg - F[k]) + 2 * z * wn * (vt - F[vk])) * dtc; F[k] += F[vk] * dtc; };
  if (dtc > 0) { spring('y', 'vy', tY, F.wy, 8, 0.9); spring('p', 'vp', tP, F.wp, 2.8, 0.85); spring('r', 'vr', tR, F.wr, 2.3, 0.85); }
  // a hull tips with the face of a wave but never flips: a hard limit on the angles
  if (F.p > 0.62) { F.p = 0.62; if (F.vp > 0) F.vp = 0; } else if (F.p < -0.62) { F.p = -0.62; if (F.vp < 0) F.vp = 0; }
  if (F.r > 0.68) { F.r = 0.68; if (F.vr > 0) F.vr = 0; } else if (F.r < -0.68) { F.r = -0.68; if (F.vr < 0) F.vr = 0; }
  // the hull floats: never more than a hand under the water below its middle, never far above it
  const lowest = w.centre - 0.3, highest = Math.max(w.centre, w.mean) + 0.7;
  if (F.y < lowest) { F.y = lowest; if (F.vy < 0) F.vy = 0; }
  if (F.y > highest) { F.y = highest; if (F.vy > 0) F.vy = 0; }
  if (Math.abs(F.y - tY) > 4) { F.y = tY; F.vy = 0; }   // after a teleport
  return F;
}
