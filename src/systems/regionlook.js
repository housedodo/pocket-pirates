// Each region of the sea has its own light (2026-11-13, owner): sky, haze, water, sun, how far you see and how the sea runs.
// The look is laid over the dread palette (palette.js) before the time of day darkens it, so nights follow on their own.
// Crossing is slow on purpose, twice over: in space, the nearby sectors are blended by distance (a gradient a few hundred units
// wide instead of a line at the sector edge), and in time, the blend itself eases toward that mix over about half a minute, so
// even a fast ship sees the colours drift, never jump. Home Sound stays the plain bright sea; the deep keeps its own horror
// (the regional colours fade as the dread rises, except the Drowned, whose grey is the deep's).
import * as THREE from 'three';
import { SECTOR, sectorCoord, sectorInfo } from '../sectors.js';
import { smoothstep } from '../util.js';

// the five looks (docs/proposals/REGIONS.md, the bolder prototype). Colours replace the palette's at full strength; numbers too.
const LOOKS = {
  crown:   { skyTop: '#1e5ad0', skyHorizon: '#eaf2ff', fog: '#e2ecff', deep: '#0a2f8a', shallow: '#3d8fe8', sun: '#ffffff', cloud: '#ffffff', tint: '#eef4ff', light: 1.05, sat: 1.15, fogNear: 120, fogFar: 460, wave: 0.8 },   // cold clear cobalt: you see far, and are seen
  free:    { skyTop: '#39a6d8', skyHorizon: '#ffd890', fog: '#ffe2a8', deep: '#009a84', shallow: '#8af5c0', sun: '#ffcc60', cloud: '#fff0d8', tint: '#fff0d0', light: 1.1, sat: 1.35, fogNear: 90, fogFar: 330, wave: 0.6 },     // a warm emerald lagoon under golden haze
  reef:    { skyTop: '#5c6c7e', skyHorizon: '#dde6e0', fog: '#cfdcd4', deep: '#0f6656', shallow: '#b4f6d8', sun: '#f4f8f0', cloud: '#b8c0c4', tint: '#f2fff8', light: 0.95, sat: 0.95, fogNear: 70, fogFar: 280, wave: 1.8 },  // jade shoal water, salt-grey sky, a hard chop
  lantern: { skyTop: '#4a3a30', skyHorizon: '#f0a860', fog: '#b8784a', deep: '#142424', shallow: '#3e5e48', sun: '#ff9a40', cloud: '#8a6a50', tint: '#ffd8a8', light: 0.85, sat: 1.0, fogNear: 35, fogFar: 200, wave: 0.9 },   // black water under amber smoke: a short view
  drowned: { skyTop: '#3e4450', skyHorizon: '#a0a6ac', fog: '#8c9298', deep: '#262e34', shallow: '#56646a', sun: '#e0e4e8', cloud: '#7a8088', tint: '#e6eef2', light: 0.8, sat: 0.4, fogNear: 60, fogFar: 260, wave: 0.3 },     // lead-grey, flat, low fog
};
const IDS = Object.keys(LOOKS), COLS = ['skyTop', 'skyHorizon', 'fog', 'deep', 'shallow', 'sun', 'cloud', 'tint'], NUMS = ['light', 'sat', 'fogNear', 'fogFar', 'wave'];
for (const L of Object.values(LOOKS)) for (const c of COLS) L[c] = new THREE.Color(L[c]);

const SIGMA = 230;     // the spatial blend: how wide the gradient between two sectors is (units)
const TAU = 22;        // the blend eases toward where you are with this time constant (seconds): a crossing takes ~40-60 s to settle
const HOME_IN = [380, 620];   // Home Sound stays plain; the regions come in over this distance from Tama
const cur = { w: Object.fromEntries(IDS.map((id) => [id, 0])), home: 1, at: null };
const mix = { c: Object.fromEntries(COLS.map((c) => [c, new THREE.Color()])), n: {} };

/** what the sea around (x, z) looks like right now: weights per region (sum <= 1; the rest is plain sea) */
function target(x, z, seed) {
  const w = Object.fromEntries(IDS.map((id) => [id, 0]));
  const [sx, sz] = sectorCoord(x, z); let tot = 0;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const i = sectorInfo(sx + dx, sz + dz, seed), d = Math.hypot(x - i.cx, z - i.cz) - SECTOR * 0.32;   // flat inside the sector's core
    const e = Math.max(0, d), k = Math.exp(-(e * e) / (2 * SIGMA * SIGMA));
    tot += k; if (!(i.sx === 0 && i.sz === 0)) w[i.faction.id] += k;   // Tama's own sector is plain sea
  }
  const home = 1 - smoothstep(HOME_IN[0], HOME_IN[1], Math.hypot(x, z));
  for (const id of IDS) w[id] = (w[id] / tot) * (1 - home);
  return w;
}

/** lay the region's look over `stage` (palette.js sampleStage) in place. Call once a frame, before the time of day is applied. */
export function regionLook(stage, pos, dt, dread, seed) {
  const t = target(pos.x, pos.z, seed);
  const jump = !cur.at || Math.hypot(pos.x - cur.at.x, pos.z - cur.at.z) > 300;   // a new voyage, a load, a teleport: start where you are
  const a = jump ? 1 : 1 - Math.exp(-Math.min(dt, 0.5) / TAU);
  for (const id of IDS) cur.w[id] += (t[id] - cur.w[id]) * a;
  cur.at = { x: pos.x, z: pos.z };
  // the regions' colours give way to the dread palette in the deep (dread 0.5 to 0.85); the Drowned's grey belongs to the deep and stays
  const fade = 1 - smoothstep(0.5, 0.85, dread);   // the mid sea keeps its colours; the deep takes them
  let k = 0; for (const c of COLS) mix.c[c].setRGB(0, 0, 0); for (const n of NUMS) mix.n[n] = 0;
  for (const id of IDS) {
    const f = cur.w[id] * (id === 'drowned' ? (window.__BUILD === 'demo' ? 0 : 1) : fade); if (f < 1e-4) continue;   // the demo has no deep
    const L = LOOKS[id]; k += f;
    for (const c of COLS) mix.c[c].r += L[c].r * f, mix.c[c].g += L[c].g * f, mix.c[c].b += L[c].b * f;
    for (const n of NUMS) mix.n[n] += L[n] * f;
  }
  if (k < 1e-4) return 0;
  const inv = 1 / k, K = Math.min(1, k);
  for (const c of COLS) stage[c].lerp(mix.c[c].multiplyScalar(inv), K);
  for (const n of NUMS) stage[n] += (mix.n[n] * inv - stage[n]) * K;
  return K;
}
/** the current blend, for tests: { crown: 0.8, free: 0.1, ... } */
export const regionWeights = () => ({ ...cur.w });
