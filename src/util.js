import * as THREE from 'three';

// The whole game is authored in "display space", like a PS1 title would be:
// no sRGB conversion, colours go to the screen exactly as written.
THREE.ColorManagement.enabled = false;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const angleDiff = (a, b) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export function hash2(x, y, seed = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return h >>> 0;
}
export const rand2 = (x, y, seed = 0) => hash2(x, y, seed) / 4294967296;

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function vnoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = rand2(xi, yi, seed), b = rand2(xi + 1, yi, seed);
  const c = rand2(xi, yi + 1, seed), d = rand2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
// 3 octaves, normalised to 0..1
export function fbm(x, y, seed = 0) {
  return (vnoise(x, y, seed) * 0.5 + vnoise(x * 2, y * 2, seed + 17) * 0.25 + vnoise(x * 4, y * 4, seed + 31) * 0.125) / 0.875;
}

export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
