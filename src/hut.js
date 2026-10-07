import * as THREE from 'three';
import { mulberry32 } from './util.js';

// The dark hut: an old woman who says nothing, a table, and one twenty-sided die.
// One throw per in-game day. 11+ wins a small prize, 10 is nothing, 9 or lower she writes something
// down and the world flickers into the dread. Every throw is remembered (state.hut) for the story.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** 5x4 atlas of carved numbers on old, stained bone */
function dieTexture() {
  const S = 32, cv = document.createElement('canvas'); cv.width = S * 5; cv.height = S * 4;
  const c = cv.getContext('2d'), r = mulberry32(2020), pal = ['#6e5a40', '#a8926a', '#cdb88e', '#e4d4ae'];
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
    const u = (x % S) / S, v = (y % S) / S, edge = Math.min(v - 0.06, (u - 0.5) * 1.8 + (0.98 - v) * 0.9, (0.5 - u) * 1.8 + (0.98 - v) * 0.9);
    const k = 2.6 + (r() - 0.5) * 0.9 - (edge < 0.08 ? 1.2 : 0) + BAYER[(y % 4) * 4 + (x % 4)] / 16 - 0.5;
    c.fillStyle = pal[Math.max(0, Math.min(3, Math.round(k)))]; c.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 70; i++) { c.fillStyle = 'rgba(60,40,20,0.45)'; c.fillRect(r() * cv.width | 0, r() * cv.height | 0, 1 + (r() * 2 | 0), 1); } // grime
  c.font = 'bold 13px "Pixelify Sans", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let n = 1; n <= 20; n++) {
    const cx = ((n - 1) % 5) * S + S / 2, cy = Math.floor((n - 1) / 5) * S + S * 0.58;
    c.fillStyle = 'rgba(255,240,210,0.35)'; c.fillText(String(n), cx + 1, cy + 1); // carved: light lip below
    c.fillStyle = n === 1 ? '#5a0a2a' : '#2a1608'; c.fillText(String(n), cx, cy);
    if (n === 6 || n === 9) { c.fillStyle = '#2a1608'; c.fillRect(cx - 4, cy + 7, 8, 1); }
  }
  // a hard pixel look: remove the soft edges of the text
  const img = c.getImageData(0, 0, cv.width, cv.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] / 40) * 40;
  c.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  return tex;
}

function dieGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 0).toNonIndexed();
  const pos = g.attributes.position, uv = new Float32Array(pos.count * 2), normals = [], ups = [];
  // slightly uneven, worn: nudge each corner a little (same corner = same nudge)
  const r = mulberry32(7), bump = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!bump.has(key)) bump.set(key, 0.93 + r() * 0.1);
    const k = bump.get(key); pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
  }
  for (let f = 0; f < 20; f++) {
    const col = f % 5, row = Math.floor(f / 5), u0 = col / 5, v1 = 1 - row / 4, du = 1 / 5, dv = 1 / 4;
    // vertex 0,1 along the bottom of the cell, vertex 2 at the top: the number stands upright toward vertex 2
    const tri = [[u0 + du * 0.06, v1 - dv * 0.96], [u0 + du * 0.94, v1 - dv * 0.96], [u0 + du * 0.5, v1 - dv * 0.06]];
    tri.forEach(([a, b], k) => { uv[(f * 3 + k) * 2] = a; uv[(f * 3 + k) * 2 + 1] = b; });
    const p = [0, 1, 2].map((k) => new THREE.Vector3(pos.getX(f * 3 + k), pos.getY(f * 3 + k), pos.getZ(f * 3 + k)));
    const n = new THREE.Vector3().subVectors(p[1], p[0]).cross(new THREE.Vector3().subVectors(p[2], p[0])).normalize();
    const cen = p[0].clone().add(p[1]).add(p[2]).multiplyScalar(1 / 3);
    normals.push(n); ups.push(p[2].clone().sub(cen).normalize());
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return { g, normals, ups };
}

const WIN_LINES = ['She pushes something across the table without looking at it.', 'A dry little laugh. She pays.', 'She nods once, as if this was always going to happen.'];
const LOSE_LINES = ['The lady in the hut does not say anything. She writes something down.', 'She does not say anything. Somewhere under the floor, something turns over.', 'The lady does not look up. The candle leans toward you.', 'She says nothing. You are sure she said your name.'];
const TRINKETS = ['a tooth with a tiny ship carved into it', 'a fishbone needle', 'a jar of very old sand', 'a black pearl that is warm', 'a knot of hair tied in a sailor\'s hitch'];

export class Hut {
  /** d: { state, toast, onFail(roll), onWin(prize), onClose, isDay } */
  constructor(d) {
    this.d = d;
    this.el = document.getElementById('hutmodal');
    this.cv = document.getElementById('dieCv');
    this.txt = document.getElementById('hutTxt');
    this.btn = document.getElementById('hutRoll');
    this.btn.addEventListener('click', () => this.roll());
    document.getElementById('hutLeave').addEventListener('click', () => d.onClose());
    this.renderer = null;
    this.t = 0; this.anim = null;
  }
  get state() { const s = this.d.state; return s.hut || (s.hut = { rolls: [], wins: 0, fails: 0, lastDay: -1, visits: 0 }); }

  init() {
    if (this.renderer) return;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.cv, antialias: false, alpha: true });
    this.renderer.setPixelRatio(1); this.renderer.setSize(72, 72, false);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20); this.camera.position.set(0, 0, 4.6);
    const { g, normals, ups } = dieGeometry();
    this.normals = normals; this.ups = ups;
    this.die = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: dieTexture(), flatShading: true }));
    this.scene.add(this.die);
    this.scene.add(new THREE.AmbientLight(0x6a5070, 1.4));
    const key = new THREE.DirectionalLight(0xffc890, 2.2); key.position.set(-1.5, 2, 3); this.scene.add(key); // candle light
    this.die.quaternion.copy(this.faceQuat(20));
  }
  /** rotation that shows face n (1-20) to the camera, number upright */
  faceQuat(n) {
    const f = n - 1, q = new THREE.Quaternion().setFromUnitVectors(this.normals[f], new THREE.Vector3(0, 0, 1));
    const up = this.ups[f].clone().applyQuaternion(q), ang = Math.atan2(up.x, up.y);
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), ang).multiply(q);
  }

  open() {
    this.init();
    const h = this.state; h.visits++;
    const used = h.lastDay === this.d.state.dayN;
    this.txt.textContent = h.visits === 1
      ? 'An old woman sits at a table that is too big for the hut. She does not greet you. She sets down a yellowed twenty-sided die and waits.'
      : used ? 'The die is gone from the table. She is writing. Come back tomorrow.' : 'The die is already on the table, waiting for you.';
    this.btn.disabled = used;
    this.result = null;
  }

  roll() {
    const h = this.state;
    if (this.anim || h.lastDay === this.d.state.dayN) return;
    h.lastDay = this.d.state.dayN;
    const n = 1 + Math.floor(Math.random() * 20);
    this.anim = { t: 0, n, spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), speed: 18, from: null };
    this.btn.disabled = true;
    this.txt.textContent = 'The die clatters across the table...';
  }

  update(dt) {
    if (!this.renderer) return;
    this.t += dt;
    const a = this.anim;
    if (a) {
      a.t += dt;
      if (a.t < 1.4) { // tumbling, slowing down, with a little hop
        a.speed *= Math.pow(0.35, dt);
        this.die.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(a.spin, a.speed * dt));
        this.die.position.y = Math.abs(Math.sin(a.t * 9)) * 0.5 * (1.4 - a.t);
        this.die.position.x = Math.sin(a.t * 5) * 0.15 * (1.4 - a.t);
      } else {
        if (!a.from) a.from = this.die.quaternion.clone();
        const k = Math.min(1, (a.t - 1.4) / 0.45), e = 1 - Math.pow(1 - k, 3);
        this.die.quaternion.slerpQuaternions(a.from, this.faceQuat(a.n), e);
        this.die.position.set(0, 0, 0);
        if (k >= 1) { this.anim = null; this.settle(a.n); }
      }
    } else this.die.position.y = Math.sin(this.t * 1.3) * 0.03;
    this.renderer.render(this.scene, this.camera);
  }

  settle(n) {
    const h = this.state, rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
    h.rolls.push({ n, day: this.d.state.dayN });
    if (n > 10) {
      h.wins++;
      const gold = 10 + n * 2 + (n === 20 ? 40 : 0), trinket = n >= 17 ? rnd(TRINKETS) : null;
      this.d.state.gold += gold;
      if (trinket) this.d.state.loot.push({ name: `From the dark hut: ${trinket}`, value: 0, dark: true });
      this.txt.textContent = `${n}. ${rnd(WIN_LINES)} (+${gold} gold${trinket ? `, and ${trinket}` : ''})`;
      this.d.onWin(n);
    } else if (n === 10) {
      this.txt.textContent = '10. She almost smiles. Nothing happens. That is somehow worse.';
    } else {
      h.fails++;
      this.txt.textContent = `${n}. ${rnd(LOSE_LINES)}`;
      this.d.onFail(n);
    }
  }
}
