// The Halved Isle's fog bank (owner, 2026-11-26: "redesign the fog... the same logic as the rain, clouds and sun"; look a picked from
// three, then "blend the fog in a bit more"): a ragged ring of fog standing round the isle, rising off the sea and fraying at the top,
// with a thinner inner ring so it is not one wall. Drawn in the haze colour and cut pixel by pixel with an ordered dither (no soft
// alpha), it leans out of the sea and into the sky with long dithered fades, drifts slowly, and opens round the ship when the lens
// lantern is lit (places.js sets how thick, and the clear pocket).
import * as THREE from 'three';

const VS = 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const FS = `uniform vec3 uC; uniform float uOp; uniform float uT; uniform vec3 uShip; uniform float uClear; uniform float uLayer;
varying vec2 vUv; varying vec3 vW;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
float b2(vec2 a){ return fract(dot(a, vec2(0.5, a.y * 0.75))); } float b4(vec2 a){ a = floor(a); return b2(floor(0.5 * a)) * 0.25 + b2(a); }
void main(){
  float n = fbm(vec2(vUv.x * 26.0 + uT * 0.02 + uLayer * 7.0, vUv.y * 2.5 - uT * 0.05));
  float a = smoothstep(0.0, 0.3, vUv.y) * (1.0 - smoothstep(0.15 + 0.45 * n, 0.95, vUv.y)) * (0.35 + 0.65 * n) * (1.0 - 0.3 * uLayer);
  a *= uOp;
  if (uClear > 0.0) a *= smoothstep(uClear * 0.45, uClear, distance(vW.xz, uShip.xz));
  if (a <= b4(gl_FragCoord.xy) * 0.9 + 0.05) discard;
  gl_FragColor = vec4(uC * (0.95 + 0.07 * n) * mix(0.97, 1.03, vUv.y), 1.0);
}`;

export class FogBank {
  constructor(scene, x, z, R) {
    this.group = new THREE.Group(); this.group.position.set(x, 0, z); this.mats = [];
    const mk = (layer) => { const m = new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color('#dfe6e8') }, uOp: { value: 1 }, uT: { value: 0 }, uShip: { value: new THREE.Vector3() }, uClear: { value: 0 }, uLayer: { value: layer } },
      vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide }); this.mats.push(m); return m; };
    const g = new THREE.CylinderGeometry(R * 1.05, R * 1.2, 38, 56, 1, true); g.translate(0, 15, 0); this.group.add(new THREE.Mesh(g, mk(0)));
    const g2 = new THREE.CylinderGeometry(R * 0.7, R * 0.8, 26, 40, 1, true); g2.translate(0, 9, 0); this.group.add(new THREE.Mesh(g2, mk(1)));   // the inner ring
    for (const c of this.group.children) c.renderOrder = 6;
    scene.add(this.group);
  }
  /** each frame: colour from the haze, how thick, the lantern's clear pocket round the ship */
  update(dt, ship, colour, op, clearR) {
    for (const m of this.mats) { const u = m.uniforms; u.uC.value.copy(colour); u.uOp.value = op; u.uT.value += dt; u.uShip.value.copy(ship.pos); u.uClear.value = clearR; }
  }
}
