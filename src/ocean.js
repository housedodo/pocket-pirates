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
/** wave size by how far land is: low and gentle by islands and harbours (0.35), normal ~120 out, big in the open sea (1.7, 260+ from any land) */
export function seaScale(x, z) {
  let near = 0;
  for (const [ix, iz, r] of WATER.isl) near = Math.max(near, 1 - sstep(15, 260, Math.hypot(x - ix, z - iz) - r * 1.1));
  return 0.35 + 1.35 * (1 - near);
}
// the looks the water can take (uOcean); 0 is the original toon facets. Chosen in the pause menu (Ocean) or ?ocean=1..4
export const OCEAN_STYLES = ['Toon facets', 'Soft swell', 'Painted bands', 'Wind chop', 'Deep sheen', 'Chop facets'];   // 5: mostly wind chop over a little of the toon facets (the default)
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
  return amp * (sw * (1 - r) * (0.85 + 0.15 * E) + h * r) * seaScale(x, z);
}

const GLSL_SHORE = /* glsl */`
uniform vec3 uIsl[${NISL}]; uniform float uRough;
float shoreF(vec2 p){ float s = 0.0; for (int i = 0; i < ${NISL}; i++) { vec3 I = uIsl[i]; s = max(s, 1.0 - smoothstep(0.0, 40.0, length(p - I.xy) - I.z * 1.1)); } return s; }
float landNear(vec2 p){ float s = 0.0; for (int i = 0; i < ${NISL}; i++) { vec3 I = uIsl[i]; s = max(s, 1.0 - smoothstep(15.0, 260.0, length(p - I.xy) - I.z * 1.1)); } return s; }`;
const GLSL_WAVEFN = /* glsl */`
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
  return uWave * (mix(sw * (0.85 + 0.15 * E), h, uRough)) * (0.35 + 1.35 * (1.0 - landNear(p)));   // low by land, big in the open sea
}`;
const GLSL_WAVE = GLSL_WAVEFN + '\nvarying vec3 vWP;';

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
        head: `varying vec3 vWP; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uMurk; uniform float uOcean; uniform vec2 uWindDir;
          ${GLSL_WAVEFN}
          float bay2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
          float bay4(vec2 a) { return bay2(0.5 * a) * 0.25 + bay2(a); }   // ordered dither, so smooth light still reads as pixels
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
          if (uOcean > 0.5) {
            // the other looks: the same waves, lit with smooth normals (no flat triangles), dithered into a few tones so they stay pixel art
            float e = 0.7;
            vec3 sn = normalize(vec3(-(waveH(vWP.xz + vec2(e, 0.0)) - waveH(vWP.xz - vec2(e, 0.0))) / (2.0 * e), 1.0, -(waveH(vWP.xz + vec2(0.0, e)) - waveH(vWP.xz - vec2(0.0, e))) / (2.0 * e)));
            vec3 V = normalize(cameraPosition - vWP);
            float open = 1.0 - landNear(vWP.xz), d = bay4(gl_FragCoord.xy);
            float cr = clamp(vWP.y / (1.1 * max(uWave, 0.5)) + 0.5, 0.0, 1.0);
            vec3 S; vec3 cn = sn;
            bool chop = (uOcean > 2.5 && uOcean < 3.5) || uOcean > 4.5;
            if (uOcean < 1.5) {
              // 1 SOFT SWELL: gentle light over the swell in five dithered tones, darker troughs, lace foam on the highest crests
              float l = clamp(dot(sn, uSunDir) * 0.55 - 0.12 + cr * 0.5, 0.0, 1.0);
              float q = floor(l * 4.0 + d) / 4.0;
              S = mix(uDeep * 0.58, uShallow * 0.92, q * 0.85);
              float lace = step(0.86 - 0.1 * open, cr) * step(0.5, vn(vWP.xz * 0.5 + vec2(uTime * 0.12, -uTime * 0.08)) + d * 0.3);
              S = mix(S, vec3(0.93, 0.97, 0.96), lace * 0.75);
            } else if (uOcean < 2.5) {
              // 2 PAINTED BANDS: the sea painted in height bands like a sea chart, thin pale contour lines riding the waves
              float c = waveH(vWP.xz) / max(uWave * 0.45, 0.2) + 0.6 * vn(vWP.xz * 0.04 + vec2(uTime * 0.02, 0.0));   // the true height per pixel: smooth contours, no triangles
              float b = clamp(floor(c * 1.5 + 1.5), 0.0, 4.0) / 4.0;
              S = mix(uDeep * 0.6, uShallow * 0.9, b * 0.8);
              float line = 1.0 - smoothstep(0.0, 0.07, abs(fract(c * 1.5) - 0.5) - 0.42);
              S = mix(S, mix(uShallow, vec3(1.0), 0.6), line * 0.45 * (0.4 + 0.6 * open));
              S *= 0.9 + 0.2 * clamp(dot(sn, uSunDir), 0.0, 1.0);
            } else if (chop) {
              // 3 WIND CHOP: a smooth base swell with a small, fast chop on top (stronger out at sea), sparkles and whitecap flecks
              // 5 CHOP FACETS: the same, laid 70/30 over the original toon facets so the sea keeps a little of its faceted shape
              vec2 cp = vWP.xz * 1.1 + uWindDir * uTime * 1.4;
              float n0 = vn(cp), nx = vn(cp + vec2(0.35, 0.0)), nz = vn(cp + vec2(0.0, 0.35));
              cn = normalize(sn + vec3(n0 - nx, 0.0, n0 - nz) * (0.6 + 1.2 * open));
              float l = clamp(dot(cn, uSunDir) * 0.65 - 0.02, 0.0, 1.0);
              S = mix(uDeep * 0.6, uShallow * 0.88, floor(l * 3.0 + d) / 3.0 * 0.8);
              float spec = pow(max(dot(reflect(-uSunDir, cn), V), 0.0), 40.0);
              S += uSunColor * step(0.55 + 0.3 * d, spec) * 0.8;
              float fleck = step(0.93 - 0.06 * open, vn(vWP.xz * 0.9 + uWindDir * uTime * 0.7)) * step(0.55, cr) * open;
              S = mix(S, vec3(0.95), fleck * 0.85);
              if (uOcean > 4.5) S = mix(mix(calm, vec3(0.95, 0.98, 0.95), cap * 0.85), S, 0.7);
            } else {
              // 4 DEEP SHEEN: dark clear body, the sky's sheen on the faces you see at a slant, long foam streaks drawn out by the wind
              float fres = pow(1.0 - max(dot(sn, V), 0.0), 3.0);
              vec3 body = mix(uDeep * 0.42, uShallow * 0.62, clamp(cr * 0.55 + dot(sn, uSunDir) * 0.2, 0.0, 1.0));
              vec3 sky = mix(uShallow, vec3(0.85, 0.93, 1.0), 0.5);
              S = mix(body, sky, floor(clamp(fres * 1.5, 0.0, 1.0) * 4.0 + d) / 4.0 * 0.6);
              vec2 wd = uWindDir, wp = vec2(-wd.y, wd.x);
              float st = vn(vec2(dot(vWP.xz, wd) * 0.05 - uTime * 0.25, dot(vWP.xz, wp) * 0.9));
              S = mix(S, vec3(0.9, 0.95, 0.95), step(0.82 - 0.08 * open, st) * step(0.45, cr) * 0.6);
            }
            S = S * uLight + glint * uSunColor * 0.6;
            vec3 outR = outB;
            if (chop) {   // the dark rollers get the same chop, so a rough sea matches the calm one
              float lr = clamp(dot(cn, uSunDir) * 0.6 + 0.25, 0.0, 1.0);
              vec3 rc = mix(uDeep * vec3(0.42, 0.55, 0.68), uShallow * vec3(0.55, 0.68, 0.7), cr * 0.7) * (floor(lr * 4.0 + d) / 4.0 * 0.7 + 0.3);
              rc = mix(rc, uDeep * 0.2, (1.0 - cr) * 0.3);
              vec3 rch = mix(rc, vec3(0.82, 0.88, 0.86), clamp(streak, 0.0, 1.0) * 0.7) * uLight;
              outR = uOcean > 4.5 ? mix(outB, rch, 0.7) : rch;
            }
            outc = mix(S, outR, uRough * (1.0 - 0.6 * shore));
          }
          // near land: lighter, shallower, more turquoise (the same flat banded look)
          vec3 shallowTint = mix(uShallow * 1.12, vec3(0.72, 0.95, 0.82), 0.35) * uLight;
          float band = floor(shore * 4.0 + 0.5) / 4.0;                                     // banded like everything else
          outc = mix(outc, shallowTint, band * 0.6);
          // round the hut's island: no turquoise. Dark, still, murky water, olive-black with drifting scum, the light dying in it;
          // it thickens towards the shore and fades out over about 90 units, in bands like the shallows
          float mk = 1.0 - smoothstep(0.0, 90.0, length(vWP.xz - uMurk.xy) - uMurk.z);
          if (mk > 0.0) {
            mk = floor(mk * 5.0 + 0.5) / 5.0;
            vec3 murk = mix(vec3(0.045, 0.06, 0.055), vec3(0.13, 0.15, 0.1), tone * 0.55 + crest * 0.25);   // facets barely lit
            float scum = step(0.64, vn(floor(vWP.xz * 0.9) / 0.9 * 0.11 + vec2(uTime * 0.012, -uTime * 0.009)));   // slow drifting scum
            murk = mix(murk, vec3(0.22, 0.22, 0.13), scum * 0.45 * smoothstep(0.3, 1.0, mk));
            outc = mix(outc, murk * uLight, mk * 0.92);
          }
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
