import * as THREE from 'three';
import { makeAtlas, makeGrit } from './textures.js';

// Uniforms shared by every material in the game.
export const U = {
  uSnap: { value: new THREE.Vector2(240, 135) }, // vertex snap grid (half-res, in "pixels")
  uDread: { value: 0 },
  uTime: { value: 0 },      // stepped (12 fps) time for water
  uLight: { value: 1 },     // global brightness, emissive texels ignore it
  uSunDir: { value: new THREE.Vector3(0.3, 0.8, -0.5) },
  uSunColor: { value: new THREE.Color('#fff2a8') },
  uDeep: { value: new THREE.Color('#1b86c6') },
  uShallow: { value: new THREE.Color('#4fe0d0') },
  uWave: { value: 1 },
};

const VERT_HEAD = /* glsl */`
uniform vec2 uSnap;
uniform float uDread;
#ifdef USE_DARKCOL
attribute vec3 colorB;
#endif
`;
const FRAG_HEAD = /* glsl */`
uniform float uLight;
uniform float uDread;
`;

let atlas = null, grit = null;
export const getAtlas = () => atlas || (atlas = makeAtlas());
export const getGrit = () => grit || (grit = makeGrit());

/**
 * MeshBasicMaterial + PS1 tricks:
 *  - vertices snap to a coarse screen grid (the famous wobble; coarser as dread rises)
 *  - optional second vertex colour set ("colorB") that the world swaps to as dread rises
 *  - global light level multiplies everything except glowing texels (windows, lanterns, eyes)
 */
export function psxMaterial(opts = {}) {
  const { dark = false, grime = false, vertex, fragmentColor, key = '', ...params } = opts;
  const m = new THREE.MeshBasicMaterial(params);
  if (dark || grime) m.defines = Object.assign({}, dark ? { USE_DARKCOL: '' } : {}, grime ? { USE_GRIME: '' } : {});
  m.customProgramCacheKey = () => `psx${dark ? 'D' : ''}${grime ? 'G' : ''}${key}`;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U);
    let v = shader.vertexShader;
    v = v.replace('#include <common>', `#include <common>\n${VERT_HEAD}${vertex ? vertex.head : ''}`);
    if (vertex && vertex.begin) v = v.replace('#include <begin_vertex>', vertex.begin);
    if (dark) v = v.replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_DARKCOL\nvColor = vec4(mix(color.rgb, colorB, smoothstep(0.3, 0.85, uDread)), 1.0);\n#endif');
    if (grime) v = v.replace('#include <common>', '#include <common>\nvarying vec3 vGW;');
    v = v.replace('#include <project_vertex>', `#include <project_vertex>
      ${grime ? 'vGW = (modelMatrix * vec4(transformed, 1.0)).xyz;' : ''}
      gl_Position.xy = floor(gl_Position.xy / gl_Position.w * uSnap + 0.5) / uSnap * gl_Position.w;`);
    shader.vertexShader = v;

    let f = shader.fragmentShader;
    if (grime) f = f.replace('#include <common>', `#include <common>
      varying vec3 vGW;
      float gh(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`);
    f = f.replace('#include <common>', `#include <common>\n${FRAG_HEAD}${fragmentColor ? fragmentColor.head : ''}`);
    f = f.replace('#include <map_fragment>', `#include <map_fragment>
      float glow = 0.0;
      #ifdef USE_MAP
        glow = max(step(0.85, diffuseColor.r) * step(0.62, diffuseColor.g) * (1.0 - step(0.42, diffuseColor.b)),
                   step(0.9, diffuseColor.r) * (1.0 - step(0.35, diffuseColor.g)) * step(0.55, diffuseColor.b));
      #endif`);
    f = f.replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb *= mix(uLight, 1.0, glow);
      #ifdef USE_GRIME
        {
          vec3 q = floor(vGW * 1.6);
          float n = gh(q), n2 = gh(floor(vGW * 0.45) + 7.0);
          float dirt = step(0.76, n) * 0.15 + step(0.55, n2) * 0.04;
          float wet = smoothstep(0.7, -0.1, vGW.y);
          vec3 g = diffuseColor.rgb * (1.0 - dirt * (1.0 + uDread * 0.8));
          g = mix(g, g * vec3(0.66, 0.58, 0.46), wet * 0.5);
          diffuseColor.rgb = mix(g, diffuseColor.rgb, glow);
        }
      #endif
      ${fragmentColor ? fragmentColor.body : ''}`);
    shader.fragmentShader = f;
  };
  return m;
}

// ---- Shared materials ------------------------------------------------------
export const mats = {};
export function initMaterials() {
  const a = getAtlas();
  mats.terrain = psxMaterial({ map: getGrit(), vertexColors: true, dark: true, grime: true });
  mats.props = psxMaterial({ map: a, vertexColors: true, dark: true, grime: true, alphaTest: 0.5, side: THREE.DoubleSide });
  mats.flagP = psxMaterial({ map: a, vertexColors: true, dark: true, alphaTest: 0.5, side: THREE.DoubleSide });
  mats.sail = psxMaterial({ map: a, vertexColors: true, dark: true, grime: true, side: THREE.DoubleSide, key: 'S' });
  mats.shallow = psxMaterial({ vertexColors: true, transparent: true, depthWrite: false, key: 'A' });
  mats.foam = psxMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, vertexColors: true, key: 'F' });
  mats.beam = psxMaterial({ color: 0xffe080, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, fog: false, key: 'B', fragmentColor: { head: '', body: 'diffuseColor.rgb /= max(uLight, 0.05);' } });
  mats.wake = psxMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, vertexColors: true, key: 'Wk', fragmentColor: { head: '', body: 'diffuseColor.rgb /= mix(1.0, max(uLight, 0.05), 0.9);' } });
  mats.glow = psxMaterial({ color: 0xffc060, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, key: 'G', fragmentColor: { head: '', body: 'diffuseColor.rgb /= max(uLight, 0.05);' } });
  mats.tentacle = psxMaterial({ vertexColors: true, key: 'T' });
  return mats;
}

// ---- Post process: render at low-res, then posterise + dither + grade -------
export class PostFX {
  constructor(renderer) {
    this.renderer = renderer;
    this.target = new THREE.WebGLRenderTarget(320, 180, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true,
    });
    this.target.texture.colorSpace = THREE.NoColorSpace;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.target.texture },
        uRes: { value: new THREE.Vector2(320, 180) },
        uDread: { value: 0 }, uTime: { value: 0 }, uSat: { value: 1 }, uVig: { value: 0.3 },
        uDither: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) },
      },
      vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uDread, uTime, uSat, uVig, uDither; uniform vec3 uTint;
        varying vec2 vUv;
        float bayer(vec2 p){
          int x = int(mod(p.x, 4.0)); int y = int(mod(p.y, 4.0));
          int i = x + y * 4;
          float m[16] = float[16](0.,8.,2.,10., 12.,4.,14.,6., 3.,11.,1.,9., 15.,7.,13.,5.);
          return m[i] / 16.0;
        }
        void main(){
          vec2 uv = vUv;
          float w = smoothstep(0.7, 1.0, uDread);
          uv.x += sin(uv.y * 38.0 + uTime * 2.0) * 0.0025 * w;
          uv.y += sin(uv.x * 22.0 + uTime * 1.3) * 0.002 * w;
          vec3 c = texture2D(tDiffuse, uv).rgb;
          if (w > 0.0) { c.r = texture2D(tDiffuse, uv + vec2(0.0025 * w, 0.0)).r; c.b = texture2D(tDiffuse, uv - vec2(0.0025 * w, 0.0)).b; }
          float l = dot(c, vec3(0.299, 0.587, 0.114));
          c = mix(vec3(l), c, uSat) * uTint;
          vec2 q = vUv - 0.5;
          c *= 1.0 - uVig * dot(q, q) * 1.6;
          float d = bayer(floor(vUv * uRes));
          c += (d - 0.5) / 28.0 * uDither;
          c = floor(c * 31.0 + 0.5) / 31.0;       // 15-bit colour
          gl_FragColor = vec4(c, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.quad = new THREE.Mesh(geo, this.material);
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  resize(cssW, cssH) {
    const scale = Math.max(2, Math.round(cssH / 270));
    const w = Math.max(160, Math.ceil(cssW / scale)), h = Math.max(120, Math.ceil(cssH / scale));
    this.target.setSize(w, h);
    this.material.uniforms.uRes.value.set(w, h);
    this.internal = { w, h };
    return this.internal;
  }

  render(scene, camera) {
    const r = this.renderer;
    r.info.reset();
    r.setRenderTarget(this.target);
    r.clear();
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(this.scene, this.cam);
  }
}
