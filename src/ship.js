import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';
import { waveHeight } from './ocean.js';
import { clamp, lerp, smoothstep, angleDiff } from './util.js';
import { computeMods } from './upgrades.js';

export const MAX_SPEED = 11;
const SECTIONS = [
  { z: 3.0, w: 0.95, deck: 1.0, keel: -0.05 },
  { z: 2.0, w: 1.25, deck: 0.95, keel: -0.3 },
  { z: 0.5, w: 1.4, deck: 0.85, keel: -0.45 },
  { z: -1.0, w: 1.3, deck: 0.85, keel: -0.45 },
  { z: -2.2, w: 0.95, deck: 1.0, keel: -0.3 },
  { z: -3.2, w: 0.45, deck: 1.35, keel: -0.05 },
  { z: -3.9, w: 0.05, deck: 1.75, keel: 0.25 },
];

function buildHull() {
  const b = new Builder();
  b.doubleSided = true;
  const P = SECTIONS.map((s) => {
    const mid = (s.deck + s.keel) / 2;
    return {
      tr: [s.w, s.deck, s.z], tl: [-s.w, s.deck, s.z],
      mr: [s.w * 0.92, mid, s.z], ml: [-s.w * 0.92, mid, s.z],
      br: [s.w * 0.35, s.keel, s.z], bl: [-s.w * 0.35, s.keel, s.z],
      ir: [s.w * 0.86, s.deck, s.z], il: [-s.w * 0.86, s.deck, s.z],
      fr: [s.w * 0.84, s.deck - 0.38, s.z], fl: [-s.w * 0.84, s.deck - 0.38, s.z],
    };
  });
  const upper = '#c4733a', lower = '#8a5028', deckC = '#ffffff';
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], c = P[i + 1];
    b.quad(a.tr, a.mr, c.mr, c.tr, upper, TILE.planks);
    b.quad(a.mr, a.br, c.br, c.mr, lower, TILE.planks);
    b.quad(a.tl, c.tl, c.ml, a.ml, upper, TILE.planks);
    b.quad(a.ml, c.ml, c.bl, a.bl, lower, TILE.planks);
    b.quad(a.bl, c.bl, c.br, a.br, lower, TILE.planks);
    // rim, inner wall, deck
    b.quad(a.tr, c.tr, c.ir, a.ir, '#7a4222', TILE.planks);
    b.quad(a.tl, a.il, c.il, c.tl, '#7a4222', TILE.planks);
    b.quad(a.ir, c.ir, c.fr, a.fr, '#8a5a30', TILE.planks);
    b.quad(a.il, a.fl, c.fl, c.il, '#8a5a30', TILE.planks);
    b.quad(a.fl, a.fr, c.fr, c.fl, deckC, TILE.planks);
  }
  const s = SECTIONS[0], p0 = P[0];
  b.quad(p0.tl, p0.tr, p0.mr, p0.ml, upper, TILE.planks); // transom
  b.quad(p0.ml, p0.mr, p0.br, p0.bl, lower, TILE.planks);
  // stern cabin
  b.box(0, 0.5, 1.9, 1.7, 1.25, 1.7, '#ffffff', TILE.wall, TILE.planks, '#7a4222');
  b.box(0, 1.75, 1.9, 2.0, 0.16, 2.0, '#6b3a1e', TILE.planks);
  // lanterns
  b.box(0.0, 1.9, 2.9, 0.18, 0.7, 0.18, '#6b4a2e', TILE.bark);
  b.box(0.0, 2.55, 2.9, 0.4, 0.4, 0.4, '#ffffff', TILE.glow);
  b.box(0.0, 1.55, -3.2, 0.4, 0.4, 0.4, '#ffffff', TILE.glow);
  // mast, crow's nest, bowsprit, barrels
  b.cyl(0, 0.5, -0.3, 0.16, 0.1, 6.9, 5, '#ffffff', TILE.bark, false);
  b.cyl(0, 5.5, -0.3, 0.6, 0.5, 0.35, 6, '#ffffff', TILE.planks);
  b.push(0, 1.4, -3.6, 0, 1, 1, 1, 0.28);
  b.box(0, 0, -1.2, 0.15, 0.15, 2.6, '#ffffff', TILE.bark);
  b.pop();
  b.cyl(-0.7, 0.55, 0.4, 0.34, 0.34, 0.7, 6, '#ffffff', TILE.planks);
  b.cyl(0.65, 0.55, 0.9, 0.34, 0.34, 0.7, 6, '#ffffff', TILE.planks);
  b.box(0.55, 0.55, -1.8, 0.8, 0.7, 0.8, '#ffffff', TILE.planks);
  return b;
}

function buildMainsail() {
  const b = new Builder();
  b.doubleSided = true;
  b.ambient = 0.8;
  const GU = 4, GV = 5;
  const pt = (u, v) => {
    const len = lerp(3.5, 1.5, v);
    return [0.75 * Math.sin(Math.PI * u) * Math.sin(Math.PI * (0.12 + 0.76 * v)), 0.2 + v * 5.0, 0.12 + u * len];
  };
  for (let i = 0; i < GU; i++) for (let j = 0; j < GV; j++) {
    const a = pt(i / GU, j / GV), bb = pt((i + 1) / GU, j / GV), c = pt((i + 1) / GU, (j + 1) / GV), d = pt(i / GU, (j + 1) / GV);
    b.quad(a, bb, c, d, '#fff4d8', TILE.sail);
  }
  b.box(0, 0.05, 1.85, 0.13, 0.13, 3.7, '#ffffff', TILE.bark);
  return b;
}

function buildJib() {
  const b = new Builder();
  b.doubleSided = true;
  b.ambient = 0.8;
  const tip = [0, 6.2, -0.35], tack = [0, 1.9, -3.5], clew = [0, 1.9, -0.7], mid = [0.5, 3.4, -1.5];
  b.tri(tip, tack, mid, '#fff0cc', TILE.sail, [[0.5, 1], [0, 0], [0.5, 0.5]]);
  b.tri(tack, clew, mid, '#fff0cc', TILE.sail, [[0, 0], [1, 0], [0.5, 0.5]]);
  b.tri(clew, tip, mid, '#fff0cc', TILE.sail, [[1, 0], [0.5, 1], [0.5, 0.5]]);
  return b;
}

const meshOf = (b, mat) => new THREE.Mesh(b.geometry(), mat);

// geometry is built once and shared with NPC ships
let GEOS = null;
export function shipGeos() {
  return GEOS || (GEOS = { hull: buildHull().geometry(), sail: buildMainsail().geometry(), jib: buildJib().geometry() });
}

export class Ship {
  constructor(scene) {
    this.root = new THREE.Group();
    this.root.rotation.order = 'YXZ';
    scene.add(this.root);
    this.root.add(new THREE.Mesh(shipGeos().hull, mats.props));

    this.sailPivot = new THREE.Group();
    this.sailPivot.position.set(0, 1.0, -0.3);
    this.sail = new THREE.Mesh(shipGeos().sail, mats.sail);
    this.sailPivot.add(this.sail);
    this.root.add(this.sailPivot);

    this.jib = new THREE.Mesh(shipGeos().jib, mats.sail);
    this.root.add(this.jib);

    // pennant (bright: red, dark: black skull)
    this.flag = new THREE.Group();
    this.flag.position.set(0, 7.35, -0.3);
    const fb = new Builder(); fb.doubleSided = true;
    fb.box(0, -0.1, 0, 0.08, 0.5, 0.08, '#ffffff', TILE.bark);
    fb.tri([0, 0.35, 0], [0, -0.05, 0], [0, 0.15, 1.7], '#ffffff', TILE.flag, [[0, 1], [0, 0], [1, 0.5]]);
    const db = new Builder(); db.doubleSided = true;
    db.box(0, -0.1, 0, 0.08, 0.5, 0.08, '#ffffff', TILE.bark);
    db.quad([0, 0.55, 0], [0, -0.2, 0], [0, -0.2, 1.4], [0, 0.55, 1.4], '#ffffff', TILE.skull);
    this.flagBright = meshOf(fb, mats.props);
    this.flagDark = meshOf(db, mats.props);
    this.flagDark.visible = false;
    this.flag.add(this.flagBright, this.flagDark);
    this.root.add(this.flag);

    // wake puffs
    this.puffGeo = new THREE.CircleGeometry(1, 6).rotateX(-Math.PI / 2);
    this.puffGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(7 * 4).fill(1), 4));
    this.puffs = [];
    for (let i = 0; i < 30; i++) {
      const m = new THREE.Mesh(this.puffGeo, mats.wake);
      m.visible = false; m.renderOrder = 2;
      scene.add(m);
      this.puffs.push({ m, life: 0, max: 1, size: 1 });
    }
    this.puffTimer = 0;

    // lantern glow on the water (visible at night)
    const pos = [], col = [], segs = 20, rings = 4;
    const v = (i, r) => { const a = (i / segs) * Math.PI * 2; return [Math.cos(a) * r / rings, 0, Math.sin(a) * r / rings, 1, 1, 1, Math.pow(1 - r / rings, 1.5)]; };
    const pv = (q) => { pos.push(q[0], q[1], q[2]); col.push(q[3], q[4], q[5], q[6]); };
    for (let r = 0; r < rings; r++) for (let i = 0; i < segs; i++) {
      const a = v(i, r), b = v(i + 1, r), c = v(i + 1, r + 1), d = v(i, r + 1);
      pv(a); pv(c); pv(b); pv(a); pv(d); pv(c);
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    this.glow = new THREE.Mesh(gg, mats.glow);
    this.glow.renderOrder = 3;
    this.glow.frustumCulled = false;
    scene.add(this.glow);
    this.mods = computeMods({});

    this.pos = new THREE.Vector3();
    this.heading = 0;
    this.speed = 0;
    this.trim = 0.75;
    this.rudder = 0;
    this.eff = 1;
    this.rel = 0;
  }

  update(dt, input, wind, t) {
    // trim + rudder
    this.trim = clamp(this.trim + input.sail * 0.6 * dt, 0, 1);
    this.rudder += (input.steer - this.rudder) * Math.min(1, dt * 4);

    // wind
    const a = Math.abs(angleDiff(this.heading, wind.dir));
    this.eff = 1 - (1 - this.mods.floor) * smoothstep(0.35 * Math.PI, Math.PI, a);
    this.rel = angleDiff(this.heading, wind.dir);
    const target = MAX_SPEED * this.mods.speed * this.eff * this.trim * wind.strength;
    const rate = target > this.speed ? 0.5 : 0.7;
    this.speed += (target - this.speed) * Math.min(1, rate * dt);

    this.heading += this.rudder * this.mods.turn * (0.28 + 0.8 * clamp(this.speed / 6, 0, 1)) * dt;
    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.z -= Math.cos(this.heading) * this.speed * dt;
  }

  // call after collision resolution
  place(dt, t, wave, dark, night = 0) {
    const h = this.heading;
    const fx = Math.sin(h), fz = -Math.cos(h), rx = Math.cos(h), rz = Math.sin(h);
    const p = this.pos;
    const wh = (ox, oz) => waveHeight(p.x + fx * oz * -1 + rx * ox, p.z + fz * oz * -1 + rz * ox, t, wave);
    const bow = wh(0, -2.6), stern = wh(0, 2.6), right = wh(1.3, 0), left = wh(-1.3, 0);
    const pitch = Math.atan2(bow - stern, 5.2);
    const roll = Math.atan2(right - left, 2.6) - Math.sin(this.rel) * 0.1 * this.eff * this.trim - this.rudder * 0.14 * (this.speed / MAX_SPEED);
    this.root.position.set(p.x, (bow + stern + right + left) / 4 + 0.12, p.z);
    this.root.rotation.set(pitch, -h, roll);

    // sails follow the wind
    const sgn = this.rel >= 0 ? 1 : -1;
    const swing = lerp(1.4, 0.1, Math.abs(this.rel) / Math.PI) * sgn;
    this.sailPivot.rotation.y += (swing - this.sailPivot.rotation.y) * Math.min(1, dt * 2.5);
    const flat = 0.14 + 0.86 * this.trim;
    const k = this.mods.sailScale;
    this.sailPivot.scale.set(k, flat * k, k);
    this.sail.scale.x += (sgn - this.sail.scale.x) * Math.min(1, dt * 2.5);
    this.jib.scale.x += (sgn - this.jib.scale.x) * Math.min(1, dt * 2.5);
    this.jib.scale.y = flat;
    this.jib.position.y = (1 - flat) * 0;
    this.flag.rotation.y = Math.PI - this.rel + Math.sin(t * 9) * 0.18;
    this.flagBright.visible = !dark;
    this.flagDark.visible = dark;

    // lantern glow
    const L = this.mods.lantern;
    this.glow.position.set(p.x, 0.8, p.z);
    this.glow.scale.setScalar(5 + 3 * L);
    mats.glow.opacity = (0.12 + 0.34 * night * (0.6 + 0.2 * L)) * (L === 0 ? 0.6 : 1);

    // wake
    this.puffTimer -= dt;
    if (this.puffTimer <= 0 && this.speed > 1.2) {
      this.puffTimer = 0.1;
      const pf = this.puffs.find((q) => q.life <= 0);
      if (pf) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const bx = p.x - fx * 3.2 + rx * side * 0.9, bz = p.z - fz * 3.2 + rz * side * 0.9;
        pf.m.position.set(bx, waveHeight(bx, bz, t, wave) + 0.18, bz);
        pf.life = pf.max = 1.6; pf.size = 0.5 + Math.random() * 0.5;
        pf.m.visible = true;
      }
    }
    for (const q of this.puffs) {
      if (q.life <= 0) continue;
      q.life -= dt;
      const k = 1 - q.life / q.max;
      q.m.scale.setScalar(q.size * Math.sin(Math.min(1, k * 1.0) * Math.PI) * (1 + k));
      if (q.life <= 0) q.m.visible = false;
    }
  }
}
