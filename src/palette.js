import * as THREE from 'three';
import { clamp, lerp } from './util.js';

// One keyframe per "dread" stage (0 .. 1). Everything that changes the mood of
// the world lives here, so tuning the horror arc is a matter of editing numbers.
const KEYS = [
  { // 1 - Sunny
    d: 0.0, skyTop: '#3a86e0', skyHorizon: '#bfeaff', fog: '#bfeaff', deep: '#1b86c6', shallow: '#4fe0d0',
    sun: '#fff2a8', cloud: '#ffffff', tint: '#ffffff',
    light: 1.0, sat: 1.18, vig: 0.25, dither: 0.8, fogNear: 90, fogFar: 330, wave: 1.0, snap: 1.0, sunElev: 0.62, sunSize: 1.0, stars: 0,
  },
  { // 2 - Off
    d: 0.25, skyTop: '#5490d0', skyHorizon: '#d6e8e0', fog: '#d2e4dc', deep: '#1d7a9e', shallow: '#58c4b8',
    sun: '#fff6c8', cloud: '#f2f4f0', tint: '#fffdf4',
    light: 0.96, sat: 1.0, vig: 0.35, dither: 0.9, fogNear: 80, fogFar: 300, wave: 1.0, snap: 0.9, sunElev: 0.55, sunSize: 1.0, stars: 0,
  },
  { // 3 - Wrong
    d: 0.5, skyTop: '#5a5f9c', skyHorizon: '#c4d196', fog: '#a9bb86', deep: '#1c5a6c', shallow: '#3f8c78',
    sun: '#e8ffb8', cloud: '#c9c8b8', tint: '#f4ffe6',
    light: 0.8, sat: 0.7, vig: 0.5, dither: 1.0, fogNear: 55, fogFar: 250, wave: 1.2, snap: 0.7, sunElev: 0.38, sunSize: 1.15, stars: 0.0,
  },
  { // 4 - Eerie
    d: 0.75, skyTop: '#24243e', skyHorizon: '#6a7c76', fog: '#4a5a58', deep: '#0e2c3c', shallow: '#285856',
    sun: '#d4dccf', cloud: '#59606a', tint: '#e0f0ee',
    light: 0.7, sat: 0.55, vig: 0.68, dither: 1.1, fogNear: 35, fogFar: 190, wave: 1.45, snap: 0.5, sunElev: 0.22, sunSize: 1.3, stars: 0.5,
  },
  { // 5 - Cosmic
    d: 1.0, skyTop: '#06030e', skyHorizon: '#5a1a50', fog: '#2a1034', deep: '#12123a', shallow: '#52287c',
    sun: '#000000', cloud: '#2a1030', tint: '#ffd8ff',
    light: 0.8, sat: 0.95, vig: 0.9, dither: 1.3, fogNear: 25, fogFar: 150, wave: 1.9, snap: 0.32, sunElev: 0.3, sunSize: 1.9, stars: 1.0,
  },
];

const COLS = ['skyTop', 'skyHorizon', 'fog', 'deep', 'shallow', 'sun', 'cloud', 'tint'];
const NUMS = ['light', 'sat', 'vig', 'dither', 'fogNear', 'fogFar', 'wave', 'snap', 'sunElev', 'sunSize', 'stars'];

for (const k of KEYS) for (const c of COLS) k[c] = new THREE.Color(k[c]);

export const stage = { dread: 0, index: 0 };
for (const c of COLS) stage[c] = new THREE.Color();

export function sampleStage(dread) {
  dread = clamp(dread, 0, 1);
  const f = dread * (KEYS.length - 1);
  const i = Math.min(KEYS.length - 2, Math.floor(f));
  const t = f - i;
  const a = KEYS[i], b = KEYS[i + 1];
  for (const c of COLS) stage[c].copy(a[c]).lerp(b[c], t);
  for (const n of NUMS) stage[n] = lerp(a[n], b[n], t);
  // the ceiling comes down (docs/ART_SPEC.md 5.2): across 0.58-0.66 the fog closes on an eased curve instead of the straight line.
  // Both ends keep the straight-line values, so no readability budget moves; only the shape between them.
  if (dread > 0.58 && dread < 0.66) {
    const at = (dd, n) => { const ff = dd * (KEYS.length - 1), ii = Math.min(KEYS.length - 2, Math.floor(ff)), tt = ff - ii; return lerp(KEYS[ii][n], KEYS[ii + 1][n], tt); };
    const e = (dread - 0.58) / 0.08, k = e * e * (3 - 2 * e);
    for (const n of ['fogNear', 'fogFar']) stage[n] = lerp(at(0.58, n), at(0.66, n), k);
  }
  stage.dread = dread;
  stage.index = Math.min(4, Math.floor(dread * 5));
  return stage;
}

export const DARK_THRESHOLD = 0.5; // above this, islands swap to their "wrong" decor

// The sea is six strata (docs/WORLD_REDESIGN.md 5.3). Dread is piecewise-linear across them, so every stratum has its own
// feel and a place can be given a stratum on purpose (a "distance lie"). r0..r1 is the radius band, d0..d1 the dread band.
export const STRATA = [
  { id: 'S0', name: 'Home Sound', r0: 0,    r1: 450,  d0: 0,    d1: 0.12 },
  { id: 'S1', name: 'The Shoals', r0: 450,  r1: 800,  d0: 0.12, d1: 0.28 },
  { id: 'S2', name: 'Trade Belt', r0: 800,  r1: 1150, d0: 0.28, d1: 0.45 },
  { id: 'S3', name: 'The Slack',  r0: 1150, r1: 1550, d0: 0.45, d1: 0.62 },
  { id: 'S4', name: 'The Dim',    r0: 1550, r1: 1950, d0: 0.62, d1: 0.82 },
  { id: 'S5', name: 'The Lid',    r0: 1950, r1: 2400, d0: 0.82, d1: 1.0 },
];
/** full dread at the end of the last stratum (D3, the table by the water, sits here) */
export const DREAD_RANGE = STRATA[STRATA.length - 1].r1;
/** the stratum index (0..5) a radius lies in */
export const strataIndex = (d) => { for (let i = 0; i < STRATA.length; i++) if (d < STRATA[i].r1) return i; return STRATA.length - 1; };
/** dread by radius, from the strata table */
export function strataDread(d) {
  const S = STRATA[strataIndex(d)];
  return clamp(S.d0 + (S.d1 - S.d0) * clamp((d - S.r0) / (S.r1 - S.r0), 0, 1), 0, 1);
}
/** the demo build is the bright game: no dread by distance at all (the dev build keeps it for testing) */
export const dreadAtDistance = (d) => (window.__BUILD === 'demo' ? 0 : strataDread(d));
/** turning back is not a reset: dread never falls below 85% of the worst you have sailed into (peak is 0..1) */
export const dreadWithPeak = (dist, peak) => Math.max(dist, 0.85 * (peak || 0));
