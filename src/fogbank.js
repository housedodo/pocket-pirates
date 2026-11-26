// The Halved Isle's fog bank (owner, 2026-11-26: "redesign the fog... the same logic as the rain, clouds and sun"; look a picked from
// three, then "blend the fog in a bit more"): a ragged ring of fog standing round the isle, rising off the sea and fraying at the top,
// with a thinner inner ring so it is not one wall. Drawn in the haze colour and cut pixel by pixel with an ordered dither (no soft
// alpha), it leans out of the sea and into the sky with long dithered fades, drifts slowly, and opens round the ship when the lens
// lantern is lit (places.js sets how thick, and the clear pocket).
import * as THREE from 'three';

const VS = 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const FS = `uniform vec3 uC; uniform float uOp; uniform float uT; uniform vec3 uShip; uniform float uClear; uniform float uLayer; uniform float uTown; uniform vec3 uTownAt; uniform vec2 uCtr;
varying vec2 vUv; varying vec3 vW;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
float b2(vec2 a){ return fract(dot(a, vec2(0.5, a.y * 0.75))); } float b4(vec2 a){ a = floor(a); return b2(floor(0.5 * a)) * 0.25 + b2(a); }
void main(){
  float n, a;
  if (uTown > 1.5) {   // the town's rings: upright mist round the houses, seen side on, fraying at the top
    n = fbm(vec2(vUv.x * 14.0 + uT * 0.03 + uLayer * 5.0, vUv.y * 2.0 - uT * 0.06));
    a = smoothstep(0.0, 0.15, vUv.y) * (1.0 - smoothstep(0.25 + 0.5 * n, 1.0, vUv.y)) * smoothstep(0.25, 0.7, n) * 1.3;
    a *= uOp;
    if (uClear > 0.0) a *= smoothstep(6.0, 14.0, distance(vW.xz, uShip.xz));
  } else if (uTown > 0.5) {   // the street mist: low layers lying in the town, in drifting clots, thinner the higher they lie
    float r = distance(vW.xz, uTownAt.xz);
    n = fbm(vW.xz * 0.045 + vec2(uT * 0.04, -uT * 0.025 + uLayer * 3.7));
    a = (1.0 - smoothstep(uTownAt.y * 0.55, uTownAt.y * 1.1, r)) * smoothstep(0.3, 0.75, n) * 1.25 * (1.0 - 0.06 * uLayer);
    a *= uOp;
    if (uClear > 0.0) a *= smoothstep(6.0, 14.0, distance(vW.xz, uShip.xz));   // the lamp shows only your own deck
  } else {
    n = fbm(vec2(vUv.x * 26.0 + uT * 0.02 + uLayer * 7.0, vUv.y * 2.5 - uT * 0.05));
    a = smoothstep(0.0, 0.3, vUv.y) * (1.0 - smoothstep(0.15 + 0.45 * n, 0.95, vUv.y)) * (0.45 + 0.75 * n) * (1.0 - 0.3 * uLayer);
    a *= uOp;
    if (uClear > 0.0) a *= smoothstep(uClear * 0.45, uClear, distance(vW.xz, uShip.xz));
  }
  if (uTown > 1.5 || uTown < 0.5) {   // a ring seen edge-on (its two ends) fades out, so the bank has no straight sides (owner: "odd in the dark")
    vec2 rad = normalize(vW.xz - (uTown > 1.5 ? uTownAt.xz : uCtr)), toCam = normalize(cameraPosition.xz - vW.xz);
    a *= smoothstep(0.06, 0.45, abs(dot(rad, toCam)));
  }
  // an uneven cut, never rows: 2-pixel cells of noise, clumped by a slower noise (owner: "not dots in perfect rows")
  float th = h21(floor(gl_FragCoord.xy) + floor(uLayer * 17.0));   // the clots come from the noise in the world, the cut only frays their edges
  if (a <= (uTown > 0.5 ? 0.3 + 0.4 * th : 0.08 + 0.8 * th)) discard;   // (town: tighter, so the clots read solid)
  gl_FragColor = vec4(uC * (0.95 + 0.07 * n) * mix(0.97, 1.03, vUv.y), 1.0);
}`;

export class FogBank {
  /** town: { x, z, r } a harbour inside the bank gets its own street mist */
  constructor(scene, x, z, R, town) {
    this.group = new THREE.Group(); this.group.position.set(x, 0, z); this.mats = [];
    const mk = (layer) => { const m = new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color('#dfe6e8') }, uOp: { value: 1 }, uT: { value: 0 }, uShip: { value: new THREE.Vector3() }, uClear: { value: 0 }, uLayer: { value: layer }, uTown: { value: 0 }, uTownAt: { value: new THREE.Vector3() }, uCtr: { value: new THREE.Vector2(x, z) } },
      vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide }); this.mats.push(m); return m; };
    const g = new THREE.CylinderGeometry(R * 1.05, R * 1.2, 38, 56, 1, true); g.translate(0, 15, 0); this.group.add(new THREE.Mesh(g, mk(0)));
    const g2 = new THREE.CylinderGeometry(R * 0.7, R * 0.8, 26, 40, 1, true); g2.translate(0, 9, 0); this.group.add(new THREE.Mesh(g2, mk(1)));   // the inner ring
    if (town) {   // low discs over the harbour's streets, up over its roofs
      this.townMats = [];
      for (let i = 0; i < 8; i++) { const m = mk(i);   /* eight layers, up over the houses on the hill */ m.uniforms.uTown.value = 1; m.uniforms.uTownAt.value.set(town.x, town.r * 2.2, town.z); this.townMats.push(m);
        const g3 = new THREE.CircleGeometry(town.r * 3.4, 40); g3.rotateX(-Math.PI / 2); const ms = new THREE.Mesh(g3, m); ms.position.set(town.x - x, 0.8 + i * 2.3, town.z - z); this.group.add(ms); }
    }
    if (town) for (const [k, rr] of [[0, 0.7], [1, 1.15], [2, 1.7]]) {   // and three rings round the houses, up over the roofs
      const m = mk(k + 8); m.uniforms.uTown.value = 2; m.uniforms.uTownAt.value.set(town.x, town.r * 2.2, town.z); this.townMats.push(m);
      const g4 = new THREE.CylinderGeometry(town.r * rr, town.r * rr * 1.08, 22, 40, 1, true); g4.translate(town.x - x, 10, town.z - z); this.group.add(new THREE.Mesh(g4, m));
    }
    for (const c of this.group.children) c.renderOrder = 6;
    scene.add(this.group);
  }
  /** each frame: colour from the haze, how thick, the lantern's clear pocket round the ship */
  update(dt, ship, colour, op, clearR, townOp = op) {
    for (const m of this.mats) { const u = m.uniforms; u.uC.value.copy(colour); u.uOp.value = u.uTown.value > 0.5 ? townOp : op; u.uT.value += dt; u.uShip.value.copy(ship.pos); u.uClear.value = clearR; }
  }
}
