import * as THREE from 'three';
import { psxMaterial, U } from './psx.js';

const CELL = 5, SEG = 150, SIZE = CELL * SEG;

// THE SEA. Two looks that blend into each other, never switch:
//  - the toon swell (calm, bright, faceted), and
//  - the dark rollers (long steep swells, inky water, foam streaks), which the sea slowly grows into with distance, dread and storms (WATER.rough, 0..1, eased in main.js over about 25 seconds).
// Near any island the water turns lighter and shallower (WATER.isl, the nearest twelve islands) and the swell flattens a little. Same formulas on the CPU (ship, fauna) and the GPU.
export const WATER = { rough: 0, isl: [] };   // isl: [[x, z, radius], ...]
export const NISL = 12;
const W = 1.2566371, WR = 0.6283185;           // swell speed, roller speed (rad/s)
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** 0 in open water .. 1 right at an island's shore */
export function shoreAt(x, z) {
  let s = 0;
  for (const [ix, iz, r] of WATER.isl) s = Math.max(s, 1 - sstep(0, 40, Math.hypot(x - ix, z - iz) - r * 1.1));
  return s;
}
export function waveHeight(x, z, t, amp = 1) {
  const sw = 0.30 * Math.sin(0.30 * x + 0.20 * z + W * t) + 0.18 * Math.sin(-0.25 * x + 0.38 * z + 2 * W * t) + 0.07 * Math.sin(0.8 * x - 0.6 * z + 3 * W * t) + 0.05 * Math.sin(1.6 * x + 1.2 * z + 4 * W * t);
  let h = 0, r = WATER.rough;
  if (r > 0.001) { h = 0.62 * Math.sin(0.20 * x + 0.13 * z + WR * t) + 0.40 * Math.sin(-0.17 * x + 0.24 * z + WR * t + 1.3) + 0.16 * Math.sin(0.45 * x - 0.3 * z + 2 * WR * t); h += 0.28 * h * Math.abs(h); }
  return amp * (sw * (1 - r) + h * r) * (1 - 0.45 * shoreAt(x, z));
}

const GLSL_SHORE = /* glsl */`
uniform vec3 uIsl[${NISL}]; uniform float uRough;
float shoreF(vec2 p){ float s = 0.0; for (int i = 0; i < ${NISL}; i++) { vec3 I = uIsl[i]; s = max(s, 1.0 - smoothstep(0.0, 40.0, length(p - I.xy) - I.z * 1.1)); } return s; }`;
const GLSL_WAVE = /* glsl */`
uniform float uTime; uniform float uWave;
${GLSL_SHORE}
const float WS = 1.2566371; const float WRL = 0.6283185;
float waveH(vec2 p){
  float t = uTime;
  float sw = 0.30 * sin(0.30 * p.x + 0.20 * p.y + WS * t) + 0.18 * sin(-0.25 * p.x + 0.38 * p.y + 2.0 * WS * t) + 0.07 * sin(0.8 * p.x - 0.6 * p.y + 3.0 * WS * t) + 0.05 * sin(1.6 * p.x + 1.2 * p.y + 4.0 * WS * t);
  float h = 0.0;
  if (uRough > 0.001) { h = 0.62 * sin(0.20 * p.x + 0.13 * p.y + WRL * t) + 0.40 * sin(-0.17 * p.x + 0.24 * p.y + WRL * t + 1.3) + 0.16 * sin(0.45 * p.x - 0.3 * p.y + 2.0 * WRL * t); h += 0.28 * h * abs(h); }
  return uWave * mix(sw, h, uRough) * (1.0 - 0.45 * shoreF(p));
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
          float rnd(vec2 q) { return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }`,
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
          float cap = step(0.86, crest) * step(0.6, rnd(blk));
          float glint = step(0.9992, dot(normalize(fn + (vec3(rnd(blk), 0.0, rnd(blk + 4.0)) - 0.5) * 0.6), normalize(uSunDir + normalize(cameraPosition - vWP))));
          vec3 outA = mix(calm, vec3(0.95, 0.98, 0.95), cap * 0.85) * uLight + glint * uSunColor;
          // unruly: dark rollers, steep faces, foam streaks blown along the crests
          float dfR = floor((0.45 + 0.35 * max(lit, 0.0)) * 5.0 + 0.5) / 5.0;
          vec3 rb = mix(uDeep * vec3(0.42, 0.55, 0.68), uShallow * vec3(0.55, 0.68, 0.7), crest * 0.7) * dfR;
          rb = mix(rb, uDeep * 0.12, (1.0 - crest) * 0.5);
          vec2 sb = floor(vec2(vWP.x * 1.6, vWP.z * 0.5));
          float streak = step(0.94, crest) * step(0.6, rnd(sb)) + step(0.99, crest) * step(0.4, rnd(sb + 9.0));
          vec3 outB = mix(rb, vec3(0.82, 0.88, 0.86), clamp(streak, 0.0, 1.0) * 0.7) * uLight;
          vec3 outc = mix(outA, outB, uRough * (1.0 - 0.6 * shore));                        // gradual: the roughness itself eases in over time and distance
          // near land: lighter, shallower, more turquoise (the same flat banded look)
          vec3 shallowTint = mix(uShallow * 1.12, vec3(0.72, 0.95, 0.82), 0.35) * uLight;
          float band = floor(shore * 4.0 + 0.5) / 4.0;                                     // banded like everything else
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
  }
}
export { U };
