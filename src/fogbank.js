// The Halved Isle's fog bank (owner, 2026-11-26: "redesign the fog, three possible, the same logic as the rain, clouds and sun"): drawn
// in the sky's own colours (the haze and the horizon), with dithered edges cut pixel by pixel (no soft alpha), drifting slowly, and
// thinning round the ship when the lens lantern is lit. Three looks on trial (?fogbank=a|b|c; without it the old dome):
//   a  the wall    a ragged ring of fog standing round the isle, rising off the sea and fraying at the top; from far off a bank on the horizon
//   b  the veils   loose curtains of mist across the water, turned to face you, drifting through each other as you sail in
//   c  the sea mist low layers hugging the water, thinner the higher they lie: masts and the isle's crown stand above them
import * as THREE from 'three';

const VS = 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const HEAD = `uniform vec3 uC; uniform float uOp; uniform float uT; uniform vec3 uShip; uniform float uClear; uniform vec2 uCtr; uniform float uR; uniform float uLayer;
varying vec2 vUv; varying vec3 vW;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
float b2(vec2 a){ return fract(dot(a, vec2(0.5, a.y * 0.75))); } float b4(vec2 a){ a = floor(a); return b2(floor(0.5 * a)) * 0.25 + b2(a); }
void cut(float a){ a *= uOp; if (uClear > 0.0) a *= smoothstep(uClear * 0.45, uClear, distance(vW.xz, uShip.xz)); a = floor(a * 4.0 + 0.35) / 4.0; if (a <= mix(b4(gl_FragCoord.xy), h21(floor(gl_FragCoord.xy * 0.5)), 0.35) * 0.94 + 0.03) discard; }`;   // cut() bands the thickness, then cuts it: thick parts solid, only the edges dithered
const FS = {
  a: `${HEAD} void main(){ float n = fbm(vec2(vUv.x * 26.0 + uT * 0.02, vUv.y * 2.5 - uT * 0.05));
    float a = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.25 + 0.5 * n, 0.95, vUv.y)) * (0.55 + 0.6 * n); cut(a);
    gl_FragColor = vec4(uC * (0.92 + 0.12 * n) * mix(1.0, 1.06, vUv.y), 1.0); }`,
  b: `${HEAD} void main(){ vec2 q = vUv - 0.5; float e = 1.0 - smoothstep(0.18, 0.5, length(q * vec2(1.0, 1.6)));
    float n = fbm(vUv * vec2(3.0, 2.0) + vec2(uT * 0.04 + uLayer * 3.1, uLayer)); cut(e * (0.75 + 0.9 * n) * smoothstep(0.0, 0.2, vUv.y));
    gl_FragColor = vec4(uC * (0.9 + 0.15 * n), 1.0); }`,
  c: `${HEAD} void main(){ float r = distance(vW.xz, uCtr), edge = 1.0 - smoothstep(uR * 0.85, uR * 1.5, r);
    float n = fbm(vW.xz * 0.025 + vec2(uT * 0.03, uLayer * 5.0)) ; cut(edge * (0.2 + 0.95 * n) * (1.0 - uLayer * 0.13));
    gl_FragColor = vec4(uC * (0.9 + 0.12 * n + 0.04 * uLayer), 1.0); }`,
};

export class FogBank {
  constructor(scene, x, z, R, look) {
    this.look = look; this.group = new THREE.Group(); this.group.position.set(x, 0, z); this.R = R; this.mats = []; this.cards = [];
    const mk = (layer = 0) => { const m = new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color('#dfe6e8') }, uOp: { value: 1 }, uT: { value: 0 }, uShip: { value: new THREE.Vector3() }, uClear: { value: 0 }, uCtr: { value: new THREE.Vector2(x, z) }, uR: { value: R }, uLayer: { value: layer } },
      vertexShader: VS, fragmentShader: FS[look], side: THREE.DoubleSide, fog: true }); m.fog = false; this.mats.push(m); return m; };
    if (look === 'a') {
      const g = new THREE.CylinderGeometry(R * 1.05, R * 1.2, 34, 56, 1, true); g.translate(0, 14, 0);
      this.group.add(new THREE.Mesh(g, mk()));
      const g2 = new THREE.CylinderGeometry(R * 0.7, R * 0.8, 24, 40, 1, true); g2.translate(0, 9, 0); this.group.add(new THREE.Mesh(g2, mk(1)));   // an inner ring: it is not one wall
    } else if (look === 'b') {
      let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 22; i++) {
        const a = r() * 6.283, d = R * (0.2 + r() * 1.05), w = 70 + r() * 50, h = 22 + r() * 16;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mk(i)); m.position.set(Math.cos(a) * d, h * 0.42 - 1, Math.sin(a) * d);
        m.userData.drift = [r() - 0.5, r() - 0.5, a, d]; this.group.add(m); this.cards.push(m);
        m.onBeforeRender = (_r, _s, cam) => { m.rotation.y = Math.atan2(cam.position.x - (this.group.position.x + m.position.x), cam.position.z - (this.group.position.z + m.position.z)); m.updateMatrixWorld(); };   // turned to you as it is drawn
      }
    } else {
      for (let i = 0; i < 6; i++) { const g = new THREE.CircleGeometry(R * 1.6, 48); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mk(i)); m.position.y = 0.8 + i * 1.9; this.group.add(m); }
    }
    for (const c of this.group.children) c.renderOrder = 6;
    scene.add(this.group);
  }
  /** each frame: colour from the haze, how thick, the lantern's clear pocket round the ship */
  update(dt, ship, colour, op, clearR) {
    for (const m of this.mats) { const u = m.uniforms; u.uC.value.copy(colour); u.uOp.value = op; u.uT.value += dt; u.uShip.value.copy(ship.pos); u.uClear.value = clearR; }
    for (const c of this.cards) {   // the veils drift
      const [dx, dz, a, d] = c.userData.drift, t = this.mats[0].uniforms.uT.value;
      c.position.x = Math.cos(a + t * 0.004 * (dx + 0.6)) * d; c.position.z = Math.sin(a + t * 0.004 * (dx + 0.6)) * d;
    }
  }
}
