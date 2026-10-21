import * as THREE from 'three';
import { psxMaterial, U } from './psx.js';

const CELL = 5, SEG = 150, SIZE = CELL * SEG;

// Same function on CPU (ship bobbing) and GPU (vertex shader).
export function waveHeight(x, z, t, amp = 1) {
  return amp * (
    0.28 * Math.sin(0.35 * x + 0.22 * z + t * 1.1) +
    0.18 * Math.sin(-0.27 * x + 0.41 * z + t * 1.5) +
    0.08 * Math.sin(0.9 * x - 0.7 * z + t * 2.3));
}

const GLSL_WAVE = /* glsl */`
uniform float uTime; uniform float uWave;
// small chop on top of the swell: only for the look (the ship rides the swell alone)
float chop(vec2 p){
  return uWave * (0.07 * sin(1.7 * p.x + 1.1 * p.y + uTime * 2.9) + 0.05 * sin(-1.3 * p.x + 2.1 * p.y + uTime * 3.4));
}
uniform float uWStyle;
const float W5 = 1.2566371;   // 2 pi / 5 s: the four loop-test styles only use whole multiples of it, so they repeat every 5 seconds
float waveH(vec2 p){
  float s = uWStyle, t = uTime;
  if (s < 0.5) return uWave * (0.28 * sin(0.35 * p.x + 0.22 * p.y + uTime * 1.1) +
                  0.18 * sin(-0.27 * p.x + 0.41 * p.y + uTime * 1.5) +
                  0.08 * sin(0.9 * p.x - 0.7 * p.y + uTime * 2.3)) + chop(p);
  if (s < 1.5) return uWave * (0.30 * sin(0.30 * p.x + 0.20 * p.y + W5 * t) + 0.18 * sin(-0.25 * p.x + 0.38 * p.y + 2.0 * W5 * t) + 0.07 * sin(0.8 * p.x - 0.6 * p.y + 3.0 * W5 * t) + 0.05 * sin(1.6 * p.x + 1.2 * p.y + 4.0 * W5 * t));
  if (s < 2.5) return uWave * 0.10 * sin(0.50 * p.y + 0.10 * p.x + W5 * t);
  if (s < 3.5) return uWave * (0.13 * sin(0.40 * p.x + 0.30 * p.y + W5 * t) + 0.05 * sin(-0.5 * p.x + 0.7 * p.y + 2.0 * W5 * t));
  float h = 0.62 * sin(0.20 * p.x + 0.13 * p.y + W5 * t) + 0.40 * sin(-0.17 * p.x + 0.24 * p.y + W5 * t + 1.3) + 0.16 * sin(0.45 * p.x - 0.3 * p.y + 2.0 * W5 * t);
  return uWave * (h + 0.28 * h * abs(h));   // sharper crests, flatter troughs
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
        head: `varying vec3 vWP; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uWave; uniform float uWStyle; uniform float uTime;
          const float W5 = 1.2566371;
          float rnd(vec2 q) { return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }`,
        body: `
          vec3 fn = normalize(cross(dFdx(vWP), dFdy(vWP)));
          if (fn.y < 0.0) fn = -fn;
          float crest = clamp(vWP.y / (0.9 * max(uWave, 0.5)) + 0.5, 0.0, 1.0);
          vec3 outc;
          if (uWStyle < 0.5) {
          vec3 wcol = mix(uDeep, uShallow, crest * 0.55);
          float lit = dot(fn, uSunDir);
          float diff = 0.62 + 0.5 * max(lit, 0.0) - 0.12 * max(-lit, 0.0);   // faces toward the sun bright, away dark: visible facets
          diff = floor(diff * 6.0 + 0.5) / 6.0;                                 // banded, PS1-style
          wcol = mix(wcol, uDeep * 0.75, (1.0 - crest) * 0.35);                // troughs a little deeper
          vec3 vd = normalize(cameraPosition - vWP);
          vec2 blk = floor(vWP.xz * 1.1);
          vec3 jn = normalize(fn + vec3(fract(sin(dot(blk, vec2(12.9898, 78.233))) * 43758.5453) - 0.5, 0.0, fract(sin(dot(blk, vec2(39.346, 11.135))) * 24634.6345) - 0.5) * 0.5);
          float spec = step(0.9985, dot(jn, normalize(uSunDir + vd)));
          // foam flecks on the crests, in chunky blocks
          vec2 fb = floor(vWP.xz * 0.9);
          float fr = fract(sin(dot(fb, vec2(27.17, 91.31))) * 15731.743);
          float foam = step(0.78, crest) * step(0.72, fr) * smoothstep(0.3, 0.9, uWave);
                    outc = mix(wcol * diff * uLight, vec3(0.92, 0.95, 0.9) * uLight, foam * 0.55) + spec * uSunColor * 0.6;
          } else if (uWStyle < 1.5) {
            // 1: toon facets. Three flat tones per facet, white edges on the facets that face the sun, crisp foam caps
            float lit = dot(fn, uSunDir);
            float tone = lit > 0.88 ? 1.0 : lit > 0.78 ? 0.55 : 0.12;
            vec3 base = mix(uDeep * 0.62, uShallow * 0.92, tone) * (0.85 + 0.15 * crest);
            vec2 blk = floor(vWP.xz * 1.7);
            float cap = step(0.86, crest) * step(0.6, rnd(blk));
            float glint = step(0.9992, dot(normalize(fn + (vec3(rnd(blk), 0.0, rnd(blk + 4.0)) - 0.5) * 0.6), normalize(uSunDir + normalize(cameraPosition - vWP))));
            outc = mix(base, vec3(0.95, 0.98, 0.95), cap * 0.85) * uLight + glint * uSunColor;
          } else if (uWStyle < 2.5) {
            // 2: retro bands. Dithered stripes scroll toward the camera, chunky pixel dashes ride the lines
            float ph = vWP.z * 0.16 + vWP.x * 0.035 - uTime * 4.0 / 5.0;
            float f = fract(ph) * 4.0, st = floor(f), fr = f - st;
            float dth = rnd(floor(gl_FragCoord.xy / 2.0));
            float band = (st + step(dth, fr)) / 4.0;
            vec3 base = mix(uDeep * 0.7, uShallow * 0.95, band * 0.9);
            float row = mod(floor(ph), 4.0);
            float dash = step(fract(ph), 0.10) * step(0.45, rnd(vec2(floor(vWP.x * 0.55 + row * 3.0), row)));
            outc = mix(base, vec3(0.9, 0.97, 0.95), dash * 0.8) * uLight;
          } else if (uWStyle < 3.5) {
            // 3: clear shallows. Turquoise water over sand, moving caustic light, soft sparkle
            vec2 q = vWP.xz;
            float ca = 0.5 * sin(q.x * 1.7 + W5 * uTime) + 0.5 * sin(q.y * 1.5 - W5 * uTime);
            float cb = 0.5 * sin(q.x * 2.6 - q.y * 2.2 + 2.0 * W5 * uTime) + 0.5 * sin(q.x * 1.0 + q.y * 2.8 + W5 * uTime);
            float cau = 1.0 - abs(ca * cb) * 2.4;
            float cl = (step(0.88, cau) * 0.55 + step(0.7, cau) * 0.22) * (1.0 - smoothstep(22.0, 85.0, length(cameraPosition - vWP)));
            float lit = floor((0.7 + 0.35 * max(dot(fn, uSunDir), 0.0)) * 5.0 + 0.5) / 5.0;
            vec3 base = mix(vec3(0.06, 0.50, 0.58), vec3(0.34, 0.80, 0.72), crest * 0.5 + 0.1) * lit;
            vec2 blk = floor(vWP.xz * 1.4);
            float spark = step(0.996, rnd(blk + floor(uTime * 2.0))) * 0.9;
            outc = (base + cl * vec3(0.55, 0.95, 0.85) + spark) * uLight;
          } else {
            // 4: dark rollers. Inky water, steep faces, foam streaks blown along the crests
            float lit = dot(fn, uSunDir);
            float diff = 0.45 + 0.35 * max(lit, 0.0);
            diff = floor(diff * 5.0 + 0.5) / 5.0;
            vec3 base = mix(uDeep * vec3(0.30, 0.42, 0.55), uShallow * vec3(0.45, 0.6, 0.62), crest * 0.7) * diff;
            base = mix(base, uDeep * 0.12, (1.0 - crest) * 0.5);
            vec2 sb = floor(vec2(vWP.x * 1.6, vWP.z * 0.5));
            float streak = step(0.78, crest) * step(0.5, rnd(sb)) + step(0.9, crest) * step(0.3, rnd(sb + 9.0));
            outc = mix(base, vec3(0.82, 0.88, 0.86), clamp(streak, 0.0, 1.0) * 0.8) * uLight;
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
