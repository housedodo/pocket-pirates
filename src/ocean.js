import * as THREE from 'three';
import { psxMaterial, U } from './psx.js';

const CELL = 8, SEG = 90, SIZE = CELL * SEG;

// Same function on CPU (ship bobbing) and GPU (vertex shader).
export function waveHeight(x, z, t, amp = 1) {
  return amp * (
    0.28 * Math.sin(0.35 * x + 0.22 * z + t * 1.1) +
    0.18 * Math.sin(-0.27 * x + 0.41 * z + t * 1.5) +
    0.08 * Math.sin(0.9 * x - 0.7 * z + t * 2.3));
}

const GLSL_WAVE = /* glsl */`
uniform float uTime; uniform float uWave;
float waveH(vec2 p){
  return uWave * (0.28 * sin(0.35 * p.x + 0.22 * p.y + uTime * 1.1) +
                  0.18 * sin(-0.27 * p.x + 0.41 * p.y + uTime * 1.5) +
                  0.08 * sin(0.9 * p.x - 0.7 * p.y + uTime * 2.3));
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
        head: `varying vec3 vWP; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uWave;`,
        body: `
          vec3 fn = normalize(cross(dFdx(vWP), dFdy(vWP)));
          if (fn.y < 0.0) fn = -fn;
          float crest = clamp(vWP.y / (0.9 * max(uWave, 0.5)) + 0.5, 0.0, 1.0);
          vec3 wcol = mix(uDeep, uShallow, crest * 0.55);
          float diff = 0.74 + 0.3 * max(dot(fn, uSunDir), 0.0);
          vec3 vd = normalize(cameraPosition - vWP);
          vec2 blk = floor(vWP.xz * 1.1);
          vec3 jn = normalize(fn + vec3(fract(sin(dot(blk, vec2(12.9898, 78.233))) * 43758.5453) - 0.5, 0.0, fract(sin(dot(blk, vec2(39.346, 11.135))) * 24634.6345) - 0.5) * 0.5);
          float spec = step(0.9985, dot(jn, normalize(uSunDir + vd)));
          diffuseColor.rgb = wcol * diff * uLight + spec * uSunColor * 0.6;`,
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
