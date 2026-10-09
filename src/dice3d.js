import * as THREE from 'three';
import { mulberry32 } from './util.js';
import { dieTexture, dieGeometry } from './hut.js';

// Low-poly, pixelated 3D dice for the checks and the tavern, built like the Lady's d20:
// a tiny WebGL canvas, flat shading, nearest-filtered textures, a tumble that settles on the rolled face.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const PIPS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] };
const D6_FACES = [3, 4, 2, 5, 1, 6];   // box material order +x -x +y -y +z -z; opposite faces add to 7
const D6_NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

function pipTexture(n, seed) {
  const S = 24, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d'), r = mulberry32(seed), pal = ['#9a8460', '#cdb88e', '#efe0b8'];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const edge = Math.min(x, y, S - 1 - x, S - 1 - y);
    const k = 1.6 + (r() - 0.5) * 0.6 - (edge < 2 ? 1 : 0) + BAYER[(y % 4) * 4 + (x % 4)] / 16 - 0.5;
    c.fillStyle = pal[Math.max(0, Math.min(2, Math.round(k)))]; c.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(60,40,20,0.4)'; c.fillRect(r() * S | 0, r() * S | 0, 1, 1); }
  for (const [px, py] of PIPS[n]) { c.fillStyle = n === 1 ? '#8a1a1a' : '#2a1608'; c.fillRect(4 + px * 6, 4 + py * 6, 4, 4); c.fillStyle = 'rgba(255,240,210,.4)'; c.fillRect(4 + px * 6, 8 + py * 6, 4, 1); }
  const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}

const CHECK_PAL = ['#8a7650', '#c4ac80', '#e2d2a8', '#f4ead0'], CHECK_INK = '#3a1c08';
// where it ends up: her die as it looks out of the candlelight, old stained bone with a blood-dark 1
const WORN_PAL = ['#3e2e1e', '#6a5438', '#97805a', '#c2aa80'], WORN_INK = '#140a04', WORN_ONE = '#7a0a2a';
const mix = (a, b, t) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, '0')).join('');

export class Die3D {
  /** kind: 'd20' | 'd6'; res: render size in pixels (shown pixelated via CSS) */
  constructor(canvas, kind = 'd20', res = 64) {
    this.cv = canvas; this.kind = kind;
    this.r = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
    this.r.setPixelRatio(1); this.r.setSize(res, res, false);
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20); this.camZ = kind === 'd6' ? 5.2 : 4.6; this.cam.position.set(0, 0, this.camZ);
    if (kind === 'd6') {
      const g = new THREE.BoxGeometry(1.5, 1.5, 1.5);
      this.mesh = new THREE.Mesh(g, D6_FACES.map((n, i) => new THREE.MeshLambertMaterial({ map: pipTexture(n, 40 + i) })));
    } else {
      const { g, normals, ups } = dieGeometry(); this.normals = normals; this.ups = ups;
      // a cleaner, newer die than the Lady's: pale bone with brown ink
      this.mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: dieTexture(CHECK_PAL, CHECK_INK, CHECK_INK), flatShading: true }));
      this.wear = 0;
    }
    this.scene.add(this.mesh);
    this.scene.add(new THREE.AmbientLight(0x8a7080, 1.5));
    const key = new THREE.DirectionalLight(0xffd8a0, 2.2); key.position.set(-1.5, 2, 3); this.scene.add(key);
    this.mesh.quaternion.copy(this.faceQuat(kind === 'd6' ? 6 : 20));
    this.anim = null; this.raf = 0; this.last = 0;
    this.draw();
  }
  faceQuat(n) {
    const z = new THREE.Vector3(0, 0, 1);
    if (this.kind === 'd6') {
      const nrm = new THREE.Vector3(...D6_NORMALS[D6_FACES.indexOf(n)]);
      const q = Math.abs(nrm.z) > 0.5 && nrm.z < 0 ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI) : new THREE.Quaternion().setFromUnitVectors(nrm, z);
      return new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, -0.24, 0.05)).multiply(q);   // the rolled face looks straight at you; only a sliver of the sides shows, so nobody reads the wrong face
    }
    const f = n - 1, q = new THREE.Quaternion().setFromUnitVectors(this.normals[f], z);
    const up = this.ups[f].clone().applyQuaternion(q), ang = Math.atan2(up.x, up.y);
    return new THREE.Quaternion().setFromAxisAngle(z, ang).multiply(q);
  }
  /** tumble, then settle on face n; done() once it rests */
  roll(n, done, time = 1.1) {
    this.cam.position.z = this.camZ;   // back out for the tumble
    this.anim = { t: 0, n, time, spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), speed: 18, from: null, done };
    this.last = performance.now();
    if (!this.raf) this.raf = requestAnimationFrame((ts) => this.tick(ts));
  }
  tick(ts) {
    this.raf = 0;
    const dt = Math.min(0.05, (ts - this.last) / 1000); this.last = ts;
    const a = this.anim; if (!a) return;
    a.t += dt;
    if (a.t < a.time) {   // tumbling, slowing, with little hops
      a.speed *= Math.pow(0.35, dt);
      this.mesh.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(a.spin, a.speed * dt));
      const left = a.time - a.t;
      this.mesh.position.y = Math.abs(Math.sin(a.t * 9)) * 0.5 * left;
      this.mesh.position.x = Math.sin(a.t * 5) * 0.15 * left;
    } else {
      if (!a.from) a.from = this.mesh.quaternion.clone();
      const k = Math.min(1, (a.t - a.time) / 0.4), e = 1 - Math.pow(1 - k, 3);
      this.mesh.quaternion.slerpQuaternions(a.from, this.faceQuat(a.n), e);
      this.mesh.position.set(0, 0, 0);
      if (this.kind === 'd20') this.cam.position.z = this.camZ - 1.2 * e;   // lean in on the face that came up
      if (k >= 1) { this.anim = null; this.draw(); if (a.done) a.done(); return; }
    }
    this.draw();
    this.raf = requestAnimationFrame((t2) => this.tick(t2));
  }
  /** the check die darkens toward the Lady's own, in four steps (k 0..1). Nobody remarks on it. */
  setWear(k) {
    if (this.kind !== 'd20') return;
    const step = Math.round(Math.max(0, Math.min(1, k)) * 3);
    if (step === this.wear) return;
    this.wear = step; const t = [0, 0.45, 0.75, 1][step];
    const old = this.mesh.material.map;
    this.mesh.material.map = dieTexture(CHECK_PAL.map((c, i) => mix(c, WORN_PAL[i], t)), mix(CHECK_INK, WORN_INK, t), mix(CHECK_INK, WORN_ONE, t));
    this.mesh.material.needsUpdate = true; if (old) old.dispose();
    this.draw();
  }
  draw() { this.r.render(this.scene, this.cam); }
}
