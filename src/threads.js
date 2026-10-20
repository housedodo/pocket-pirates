import * as THREE from 'three';
import { shoreR } from './world.js';
import { waveHeight } from './ocean.js';
import { hash2 } from './util.js';
import { THREAD_IDS, pickAwake } from './marks.js';

// MULTIPLE PATHS (Story Bible): optional dark threads built on old horror tales. This file is the first one, as a prototype:
//   THE COLOUR (after "The Colour Out of Space"). One patch of sea by an atoll is a shade wrong. Fish caught in it are huge, bright and
//   tasteless; it creeps a little further every day and jumps along the trade routes; it can be sealed (a short scene), sold, or let spread.
// Full game only (never in the demo). In this prototype the Colour is always awake; the planned "3 of 7 threads per voyage" comes later.
export const COLOUR = '#c24cff';
const MAX_PATCHES = 4, GROW = 4, CAP = 95, SEG = 28, RINGS = 7;

function ditherTexture() {   // a radial dither: solid in the middle, thinning out, hard pixels like everything else
  const N = 64, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), img = g.createImageData(N, N), B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const r = Math.hypot(x - N / 2 + 0.5, y - N / 2 + 0.5) / (N / 2), k = 1 - r, th = B[(y & 3) * 4 + (x & 3)] / 16, i = (y * N + x) * 4;
    const on = r < 1 && k * 1.7 > th, hot = r < 0.55 && ((x + y * 3) & 7) === 0;
    img.data[i] = hot ? 255 : 255; img.data[i + 1] = hot ? 230 : 255; img.data[i + 2] = 255; img.data[i + 3] = on ? (hot ? 255 : 200) : 0;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}

export class Threads {
  constructor(scene, world, state) {
    this.scene = scene; this.world = world; this.state = state; this.meshes = new Map(); this.tex = null;
    this.cells = null; this.tint = 0;
  }
  get c() { return this.awake('colour') ? this.state.story.colour : null; }
  /** which threads this voyage has awake (the Tide of Threads). `choice` is a dev override: an array of ids, or null for "by the seed". */
  setup(choice) {
    const st = this.state.story;
    if (Array.isArray(choice)) st.threads = choice.filter((id) => THREAD_IDS.includes(id));
    else if (!Array.isArray(st.threads)) st.threads = st.colour ? ['colour'] : pickAwake(this.state.seed);   // a voyage from before the Tide had only the Colour
    return st.threads;
  }
  awake(id) { return (this.state.story.threads || []).includes(id); }
  /** every island once, by scanning the cells around Tama (cached) */
  scan() {
    if (this.cells) return this.cells;
    const list = [];
    for (let cx = -10; cx <= 10; cx++) for (let cz = -11; cz <= 9; cz++) { const d = this.world.desc(cx, cz); if (d) list.push(d); }
    return (this.cells = list);
  }
  /** the atoll that holds the spring: one in reach of Tama's first waters (450 to 1300 away), picked by the voyage's seed */
  ensure() {
    const st = this.state.story;
    if (!this.awake('colour')) return null;
    if (st.colour) return st.colour;
    const home = this.world.desc(0, -1); if (!home) return null;
    const cand = this.scan().filter((d) => d.type === 'atoll' && Math.hypot(d.x - home.x, d.z - home.z) > 450 && Math.hypot(d.x - home.x, d.z - home.z) < 1300)
      .sort((a, b) => a.id < b.id ? -1 : 1);
    if (!cand.length) return null;
    const d = cand[hash2(this.state.seed, 61, 1) % cand.length], th = ((hash2(Math.round(d.x), Math.round(d.z), this.state.seed + 9) >> 3) % 628) / 100, r = shoreR(d, th) + 22;
    st.colour = { src: { id: d.id, name: d.name, x: d.x + Math.cos(th) * r, z: d.z + Math.sin(th) * r }, found: false, day0: null, lastDay: null, patches: [{ x: d.x + Math.cos(th) * r, z: d.z + Math.sin(th) * r, r: 16 }], fish: 0, end: null, said: false, rumoured: false };
    return st.colour;
  }
  patchAt(x, z, k = 0.85) { const c = this.c; if (!c) return null; for (const p of c.patches) if (Math.hypot(p.x - x, p.z - z) < p.r * k) return p; return null; }
  /** has the colour reached this harbour? */
  touched(d) { const c = this.c; return !!c && c.patches.some((p) => Math.hypot(p.x - d.x, p.z - d.z) < p.r + 50); }
  springNear(x, z) { const c = this.c; return c && c.found && !c.end && Math.hypot(c.src.x - x, c.src.z - z) < 20 ? c.src : null; }
  /** the world's hue: 0..0.3, rising while it spreads, fading once sealed */
  get worldTint() { return this.tint; }

  /** called every frame in the full game; `on` is false in the demo and during the quiet opening */
  update(dt, ship, on, t, amp, say) {
    const c = on ? this.ensure() : null;
    if (!c) { for (const [id, m] of this.meshes) { this.scene.remove(m); this.meshes.delete(id); } this.tint += (0 - this.tint) * Math.min(1, dt); return; }
    const S = this.state;
    // the spring was visited: the scene's result decides how it ends
    const res = S.story.caves && S.story.caves[`spring:${c.src.id}`];
    if (res && !c.end) { c.end = res === 'win' ? 'sealed' : 'failed'; }
    // first sight: Mara says one thing
    if (!c.found && Math.hypot(c.src.x - ship.pos.x, c.src.z - ship.pos.z) < 150) {
      c.found = true; c.day0 = c.lastDay = S.dayN;
      if (say) say('Captain, that water is the wrong colour.');
    }
    // each new day: it creeps, it jumps along the routes; once sealed it ebbs
    if (c.found && S.dayN !== c.lastDay) {
      const days = Math.min(5, S.dayN - c.lastDay); c.lastDay = S.dayN;
      for (let i = 0; i < days; i++) this.step(c);
    }
    // the hue of the world
    const spread = c.found ? Math.min(0.3, (S.dayN - c.day0) * 0.015) : 0;
    const want = c.end === 'sealed' ? 0 : c.end === 'failed' || c.end === 'sold' || !c.end ? spread : spread;
    this.tint += (want - this.tint) * Math.min(1, dt * 0.5);
    this.draw(ship, t, amp);
  }
  step(c) {
    const S = this.state, day = S.dayN;
    if (c.end === 'sealed') { for (const p of c.patches) p.r -= 7; c.patches = c.patches.filter((p) => p.r > 4); return; }
    for (const p of c.patches) p.r = Math.min(CAP, p.r + GROW);
    if (c.patches.length < MAX_PATCHES && (day - c.day0) % 3 === 2) {   // a new patch off the nearest trade harbour
      const hs = this.scan().filter((d) => d.type === 'harbour' && c.patches.some((p) => Math.hypot(p.x - d.x, p.z - d.z) < 900) && !c.patches.some((p) => Math.hypot(p.x - d.x, p.z - d.z) < 140));
      if (hs.length) {
        const d = hs[hash2(day, c.patches.length, S.seed + 4) % hs.length], th = ((hash2(Math.round(d.x), day, S.seed) >> 2) % 628) / 100, r = shoreR(d, th) + 40;
        c.patches.push({ x: d.x + Math.cos(th) * r, z: d.z + Math.sin(th) * r, r: 10 });
      }
    }
  }
  seal() { const c = this.c; if (c) c.end = 'sealed'; }
  draw(ship, t, amp) {
    const c = this.c; if (!this.tex) this.tex = ditherTexture();
    const keep = new Set();
    c.patches.forEach((p, i) => {
      const id = `p${i}`, near = Math.hypot(p.x - ship.pos.x, p.z - ship.pos.z) < p.r + 380;
      if (!near) { const m = this.meshes.get(id); if (m) m.visible = false; return; }
      keep.add(id);
      let m = this.meshes.get(id);
      if (!m) {
        const n = SEG * RINGS + 1, g = new THREE.BufferGeometry(), uv = new Float32Array(n * 2), idx = [];
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
        uv[0] = 0.5; uv[1] = 0.5;
        for (let r = 1; r <= RINGS; r++) for (let s = 0; s < SEG; s++) { const a = (s / SEG) * Math.PI * 2, k = r / RINGS, j = 1 + (r - 1) * SEG + s; uv[j * 2] = 0.5 + Math.cos(a) * k * 0.5; uv[j * 2 + 1] = 0.5 + Math.sin(a) * k * 0.5; }
        for (let s = 0; s < SEG; s++) idx.push(0, 1 + s, 1 + ((s + 1) % SEG));
        for (let r = 1; r < RINGS; r++) for (let s = 0; s < SEG; s++) { const a = 1 + (r - 1) * SEG + s, b = 1 + (r - 1) * SEG + ((s + 1) % SEG), d = a + SEG, e = b + SEG; idx.push(a, d, b, b, d, e); }
        g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
        const mat = new THREE.MeshBasicMaterial({ color: COLOUR, map: this.tex, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
        m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 3; this.scene.add(m); this.meshes.set(id, m);
      }
      m.visible = true;
      const pos = m.geometry.attributes.position.array, R = p.r * (1 + 0.04 * Math.sin(t * 0.7 + i));
      pos[0] = p.x; pos[1] = waveHeight(p.x, p.z, t, amp) + 0.22; pos[2] = p.z;
      for (let r = 1; r <= RINGS; r++) for (let s = 0; s < SEG; s++) {
        const a = (s / SEG) * Math.PI * 2 + 0.05 * Math.sin(t * 0.4 + r), k = (r / RINGS) * (1 + 0.06 * Math.sin(a * 3 + t * 0.9)), j = 1 + (r - 1) * SEG + s;
        const x = p.x + Math.cos(a) * R * k, z = p.z + Math.sin(a) * R * k;
        pos[j * 3] = x; pos[j * 3 + 1] = waveHeight(x, z, t, amp) + 0.22; pos[j * 3 + 2] = z;
      }
      m.geometry.attributes.position.needsUpdate = true;
      m.material.color.setHSL(0.78 + 0.03 * Math.sin(t * 0.5 + i * 2), 1, 0.62 + 0.06 * Math.sin(t * 1.3));
      m.material.opacity = 0.72 + 0.1 * Math.sin(t * 1.1 + i);
    });
    for (const [id, m] of this.meshes) if (!keep.has(id)) m.visible = false;
  }
}
