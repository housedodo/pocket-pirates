// The Halved Isle's fog (owner, 2026-11-26: "change the fog to something finer, this looks very artificial"; "the dome shape is too
// obvious from afar, the fog should slowly come... the player feels like he is slowly getting surrounded"). Nothing stands in the
// world to be seen from outside: the scene's own haze closes in over a long way (places.js sets how thick, main.js draws it), and
// round the ship a low mist lies on the water, thin wisps in the haze's colour, soft-edged in a few PS1 bands, moving with the
// ship so it is never seen from afar. The lens lantern keeps the deck clear of it; people coming back to Haven Hesk thin it.
import * as THREE from 'three';

const VS = 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const FS = `uniform vec3 uC; uniform float uOp; uniform float uT; uniform vec3 uShip; uniform float uClear; uniform float uLayer; uniform float uR;
varying vec3 vW;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.07 + vec2(1.7, 9.2); a *= 0.5; } return s; }
void main(){
  float r = distance(vW.xz, uShip.xz);
  vec2 q = vW.xz * 0.07 + vec2(uT * 0.035, -uT * 0.02) + uLayer * 4.3;   // long thin wisps, drifting
  float n = fbm(q * vec2(1.0, 2.2));
  float a = uOp * (1.0 - smoothstep(uR * 0.55, uR, r)) * smoothstep(0.32, 0.8, n) * (1.0 - 0.14 * uLayer);
  a *= smoothstep(uClear * 0.6, uClear, r);   // your own deck stays clear
  a = floor(a * 5.0 + 0.5) / 5.0 * 0.55;      // a few soft bands, never dots
  if (a <= 0.01) discard;
  gl_FragColor = vec4(uC * (0.96 + 0.08 * n), a);
}`;

export class FogBank {
  constructor(scene) {
    this.group = new THREE.Group(); this.mats = []; this.R = 90;
    for (let i = 0; i < 5; i++) {
      const m = new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color('#dfe6e8') }, uOp: { value: 0 }, uT: { value: 0 }, uShip: { value: new THREE.Vector3() }, uClear: { value: 8 }, uLayer: { value: i }, uR: { value: this.R } },
        vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      const g = new THREE.CircleGeometry(this.R, 40); g.rotateX(-Math.PI / 2);
      const ms = new THREE.Mesh(g, m); ms.position.y = 0.5 + i * 0.9; ms.renderOrder = 6; ms.frustumCulled = false;
      this.group.add(ms); this.mats.push(m);
    }
    this.group.visible = false;
    scene.add(this.group);
  }
  /** each frame: the haze's colour, how thick round the ship (0..1), how far the lantern keeps the deck clear */
  update(dt, ship, colour, op, clearR) {
    this.group.visible = op > 0.02;
    if (!this.group.visible) return;
    this.group.position.set(ship.pos.x, 0, ship.pos.z);
    for (const m of this.mats) { const u = m.uniforms; u.uC.value.copy(colour); u.uOp.value = op; u.uT.value += dt; u.uShip.value.copy(ship.pos); u.uClear.value = clearR; }
  }
}
