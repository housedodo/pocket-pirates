import * as THREE from 'three';
import { psxMaterial, U } from './psx.js';

const CELL = 5, SEG = 150, SIZE = CELL * SEG;

// THE SEA. Two looks that blend into each other, never switch:
//  - the toon swell (calm, bright, faceted), and
//  - the dark rollers (long steep swells, inky water, foam streaks), which the sea slowly grows into with distance, dread and storms (WATER.rough, 0..1, eased in main.js over about 25 seconds).
// Near any island the water turns lighter and shallower (WATER.isl, the nearest twelve islands) and the swell flattens a little. Same formulas on the CPU (ship, fauna) and the GPU.
export const WATER = { rough: 0, isl: [] };   // isl: [[x, z, radius], ...]
export const NISL = 12;
/** island outlines for the shallows: "x,z" -> the six lobe numbers of world.js shoreR (registered when an island is built) */
export const ISL_LOBES = new Map();
const NO_LOBES = [0, 0, 0, 0, 0, 0];
const SHORE_FALL = 18;                          // how far out from the shoreline the water stays light and shallow
/** the island's own shoreline radius in direction (dx, dz), the same formula as world.js shoreR */
function shoreRad(r, L, dx, dz) { const th = Math.atan2(dz, dx); return r * (1 + L[0] * Math.sin(2 * th + L[3]) + L[1] * Math.sin(3 * th + L[4]) + L[2] * Math.sin(5 * th + L[5])); }
const W = 1.2566371, WR = 0.6283185;           // swell speed, roller speed (rad/s)
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** 0 in open water .. 1 right at an island's shore */
export function shoreAt(x, z) {
  let s = 0;
  for (const [ix, iz, r] of WATER.isl) { const L = ISL_LOBES.get(`${ix},${iz}`) || NO_LOBES; s = Math.max(s, 1 - sstep(0, SHORE_FALL, Math.hypot(x - ix, z - iz) - shoreRad(r, L, x - ix, z - iz) * 1.02)); }
  return s;
}
// Real water is never regular: waves of many directions and unrelated speeds, travelling in groups (the envelope), their crests bent a little by a slow warp of the surface.
const wsin = Math.sin;
export function waveHeight(x, z, t, amp = 1) {
  const r = WATER.rough, k = 1.2 + 1.0 * r;                                           // the warp bends the crests more as the sea gets rough
  const px = x + k * wsin(0.07 * z + 0.31 * t), pz = z + k * wsin(0.06 * x - 0.27 * t + 2.0);
  const sw = 0.30 * wsin(0.30 * px + 0.20 * pz + W * t) + 0.18 * wsin(-0.25 * px + 0.38 * pz + 2 * W * t) + 0.07 * wsin(0.8 * px - 0.6 * pz + 3 * W * t) + 0.05 * wsin(1.6 * px + 1.2 * pz + 4 * W * t);
  const E = 1 - (0.2 + 0.4 * r) * (0.5 - 0.5 * wsin(0.021 * x - 0.017 * z + 0.21 * t + 1) * wsin(0.013 * x + 0.019 * z - 0.17 * t));   // sets of bigger and smaller waves
  let h = 0;
  if (r > 0.001) {
    h = 0.41 * wsin(0.20 * px + 0.13 * pz + WR * t) + 0.285 * wsin(-0.17 * px + 0.24 * pz + WR * t + 1.3) + 0.15 * wsin(0.45 * px - 0.30 * pz + 2 * WR * t + 0.4) + 0.105 * wsin(0.31 * px + 0.52 * pz + 1.32 * WR * t + 2.1)
      + 0.075 * wsin(-0.62 * px + 0.18 * pz + 2.7 * WR * t + 4.0) + 0.05 * wsin(0.9 * px + 0.7 * pz + 3.3 * WR * t + 5.2) + 0.2 * wsin(0.083 * px - 0.11 * pz + 0.65 * WR * t + 0.7);
    h *= E; h += 0.28 * h * Math.abs(h);
  }
  return amp * (sw * (1 - r) * (0.85 + 0.15 * E) + h * r) * (1 - 0.45 * shoreAt(x, z));
}

const GLSL_SHORE = /* glsl */`
uniform vec3 uIsl[${NISL}]; uniform vec3 uIslA[${NISL}]; uniform vec3 uIslB[${NISL}]; uniform float uRough;
float shoreF(vec2 p){ float s = 0.0; for (int i = 0; i < ${NISL}; i++) { vec3 I = uIsl[i]; vec2 d = p - I.xy; float th = atan(d.y, d.x); vec3 A = uIslA[i], B = uIslB[i];
  float R = I.z * (1.0 + A.x * sin(2.0 * th + B.x) + A.y * sin(3.0 * th + B.y) + A.z * sin(5.0 * th + B.z));   // follows the island's own lobed outline (world.js shoreR)
  s = max(s, 1.0 - smoothstep(0.0, ${SHORE_FALL.toFixed(1)}, length(d) - R * 1.02)); } return s; }`;
const GLSL_WAVE = /* glsl */`
uniform float uTime; uniform float uWave;
${GLSL_SHORE}
const float WS = 1.2566371; const float WRL = 0.6283185;
float waveH(vec2 p){
  float t = uTime;
  float k = 1.2 + 1.0 * uRough;
  vec2 q = p + k * vec2(sin(0.07 * p.y + 0.31 * t), sin(0.06 * p.x - 0.27 * t + 2.0));
  float sw = 0.30 * sin(0.30 * q.x + 0.20 * q.y + WS * t) + 0.18 * sin(-0.25 * q.x + 0.38 * q.y + 2.0 * WS * t) + 0.07 * sin(0.8 * q.x - 0.6 * q.y + 3.0 * WS * t) + 0.05 * sin(1.6 * q.x + 1.2 * q.y + 4.0 * WS * t);
  float E = 1.0 - (0.2 + 0.4 * uRough) * (0.5 - 0.5 * sin(0.021 * p.x - 0.017 * p.y + 0.21 * t + 1.0) * sin(0.013 * p.x + 0.019 * p.y - 0.17 * t));
  float h = 0.0;
  if (uRough > 0.001) {
    h = 0.41 * sin(0.20 * q.x + 0.13 * q.y + WRL * t) + 0.285 * sin(-0.17 * q.x + 0.24 * q.y + WRL * t + 1.3) + 0.15 * sin(0.45 * q.x - 0.30 * q.y + 2.0 * WRL * t + 0.4) + 0.105 * sin(0.31 * q.x + 0.52 * q.y + 1.32 * WRL * t + 2.1)
      + 0.075 * sin(-0.62 * q.x + 0.18 * q.y + 2.7 * WRL * t + 4.0) + 0.05 * sin(0.9 * q.x + 0.7 * q.y + 3.3 * WRL * t + 5.2) + 0.2 * sin(0.083 * q.x - 0.11 * q.y + 0.65 * WRL * t + 0.7);
    h *= E; h += 0.28 * h * abs(h);
  }
  return uWave * (mix(sw * (0.85 + 0.15 * E), h, uRough)) * (1.0 - 0.45 * shoreF(p));
}
varying vec3 vWP;`;

export class Ocean {
  constructor() {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const count = geo.attributes.position.count;
    geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3));
    this.material = psxMaterial({
      vertexColors: true, key: 'O',
      vertex: {
        head: GLSL_WAVE,
        begin: `vec4 wp0 = modelMatrix * vec4(position, 1.0);
                float wh = waveH(wp0.xz);
                vec3 transformed = vec3(position.x, position.y + wh, position.z);
                vWP = wp0.xyz + vec3(0.0, wh, 0.0);`,
      },
      fragmentColor: {
        head: `varying vec3 vWP; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uWave; uniform float uTime;
          ${GLSL_SHORE}
          float rnd(vec2 q) { return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }
          float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(rnd(i), rnd(i + vec2(1.0, 0.0)), f.x), mix(rnd(i + vec2(0.0, 1.0)), rnd(i + vec2(1.0, 1.0)), f.x), f.y); }`,
        body: `
          vec3 fn = normalize(cross(dFdx(vWP), dFdy(vWP)));
          if (fn.y < 0.0) fn = -fn;
          float crest = clamp(vWP.y / (0.9 * max(uWave, 0.5)) + 0.5, 0.0, 1.0);
          float lit = dot(fn, uSunDir);
          float shore = shoreF(vWP.xz);
          // calm: toon facets, three flat tones by how a facet faces the sun, small foam caps, glints
          float tone = lit > 0.88 ? 1.0 : lit > 0.78 ? 0.62 : 0.28;
          tone = mix(tone, max(tone, 0.55), shore * 0.7);                                  // the shallows lose their dark facets
          vec3 calm = mix(uDeep * 0.62, uShallow * 0.92, tone) * (0.85 + 0.15 * crest);
          vec2 blk = floor(vWP.xz * 1.7);
          float cap = step(0.88 - 0.12 * (vn(vWP.xz * 0.35 + vec2(uTime * 0.09, uTime * 0.05)) - 0.5) * 2.0, crest) * step(0.4, rnd(blk));
          float glint = step(0.9992, dot(normalize(fn + (vec3(rnd(blk), 0.0, rnd(blk + 4.0)) - 0.5) * 0.6), normalize(uSunDir + normalize(cameraPosition - vWP))));
          vec3 outA = mix(calm, vec3(0.95, 0.98, 0.95), cap * 0.85) * uLight + glint * uSunColor;
          // unruly: dark rollers, steep faces, foam streaks blown along the crests
          float dfR = floor((0.45 + 0.35 * max(lit, 0.0)) * 5.0 + 0.5) / 5.0;
          vec3 rb = mix(uDeep * vec3(0.42, 0.55, 0.68), uShallow * vec3(0.55, 0.68, 0.7), crest * 0.7) * dfR;
          rb = mix(rb, uDeep * 0.12, (1.0 - crest) * 0.5);
          // foam: irregular patches that follow the crests, torn into ragged edges by two scales of drifting noise (no grid)
          vec2 fp = floor(vWP.xz * 1.3) / 1.3;
          float fn1 = vn(fp * 0.16 + vec2(uTime * 0.11, -uTime * 0.07)), fn2 = vn(fp * 0.5 + vec2(-uTime * 0.23, uTime * 0.15)), fn3 = rnd(floor(vWP.xz * 2.6));
          float tear = fn1 * 0.55 + fn2 * 0.35 + fn3 * 0.18;
          float streak = step(0.92 - 0.14 * (tear - 0.5) * 2.0, crest + 0.06 * (fn2 - 0.5)) * step(0.35, fn1) + step(0.985, crest) * step(0.45, fn2);
          vec3 outB = mix(rb, vec3(0.82, 0.88, 0.86), clamp(streak, 0.0, 1.0) * 0.7) * uLight;
          vec3 outc = mix(outA, outB, uRough * (1.0 - 0.6 * shore));                        // gradual: the roughness itself eases in over time and distance
          // near land: lighter, shallower, more turquoise (the same flat banded look)
          vec3 shallowTint = mix(uShallow * 1.12, vec3(0.72, 0.95, 0.82), 0.35 * (1.0 - smoothstep(0.4, 0.9, uDread))) * uLight;   // the pale turquoise fades out as dread rises (no milky shores in the dark)
          ivec2 bq = ivec2(mod(floor(gl_FragCoord.xy), 4.0));                              // ordered 4x4 Bayer dither between three steps, no hard rings
          float BY[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
          float bay = BY[bq.x + bq.y * 4];
          float band = clamp(floor(shore * 3.0 + (bay + 0.5) / 16.0) / 3.0, 0.0, 1.0);
          outc = mix(outc, shallowTint, band * 0.6);
          diffuseColor.rgb = outc;`,
      },
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 0;
  }
  update(cx, cz) {
    this.mesh.position.set(Math.round(cx / CELL) * CELL, 0, Math.round(cz / CELL) * CELL);
    for (let i = 0; i < NISL; i++) {   // the outlines of the islands main.js put in uIsl
      const n = WATER.isl[i], L = (n && ISL_LOBES.get(`${n[0]},${n[1]}`)) || NO_LOBES;
      U.uIslA.value[i].set(L[0], L[1], L[2]); U.uIslB.value[i].set(L[3], L[4], L[5]);
    }
  }
}
export { U };
