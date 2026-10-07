import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats, psxMaterial } from './psx.js';
import { shipGeos } from './ship.js';
import { waveHeight } from './ocean.js';
import { hash2, mulberry32, smoothstep, clamp } from './util.js';
import { CELL } from './world.js';
import { dreadAtDistance } from './palette.js';

// Things floating or hiding between the islands: salvage barrels, messages in bottles,
// half-sunk wrecks, whirlpools and glowing shoals.
const RADIUS = 3;

let barrelGeo, bottleGeo, wreckExtraGeo, whirlGeo, discGeo;
function geos() {
  if (barrelGeo) return;
  let b = new Builder(); b.doubleSided = true;
  b.cyl(0, -0.2, 0, 0.45, 0.45, 0.85, 6, '#ffffff', TILE.planks);
  b.cyl(0, 0.05, 0, 0.5, 0.5, 0.1, 6, '#3a3a40', TILE.white, false);
  b.cyl(0, 0.4, 0, 0.5, 0.5, 0.1, 6, '#3a3a40', TILE.white, false);
  barrelGeo = b.geometry();

  b = new Builder(); b.doubleSided = true;
  b.cyl(0, 0, 0, 0.17, 0.17, 0.5, 6, '#8fe0b0', TILE.white);
  b.cyl(0, 0.5, 0, 0.17, 0.07, 0.2, 6, '#8fe0b0', TILE.white, false);
  b.cyl(0, 0.1, 0, 0.1, 0.1, 0.32, 5, '#ffffff', TILE.glow, false); // the note inside glows
  bottleGeo = b.geometry();

  b = new Builder(); b.doubleSided = true;
  b.push(0.3, 0.5, -0.5, 0, 1, 1, 1, 0.2, 0.55);
  b.cyl(0, 0, 0, 0.17, 0.1, 4.5, 5, '#ffffff', TILE.bark, false);
  b.pop();
  b.tri([0.2, 3.4, -0.3], [2.2, 2.3, 0.4], [0.3, 1.5, -0.2], '#b9b3a2', TILE.sail);
  b.tri([-0.4, 1.4, 1.5], [-1.6, 1.8, 2.8], [-0.2, 1.1, 2.4], '#8a8472', TILE.sail);
  wreckExtraGeo = b.geometry();

  // spiral whirlpool: dark centre + white arms (RGBA vertex colours)
  const pos = [], col = [];
  const push = (x, z, r, g, bl, a) => { pos.push(x, 0, z); col.push(r, g, bl, a); };
  const segs = 24, R = 9;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
    push(0, 0, 0.02, 0.05, 0.15, 0.9);
    push(Math.cos(a1) * R, Math.sin(a1) * R, 0.1, 0.3, 0.5, 0);
    push(Math.cos(a0) * R, Math.sin(a0) * R, 0.1, 0.3, 0.5, 0);
  }
  for (let arm = 0; arm < 3; arm++) for (let k = 0; k < 14; k++) {
    const r0 = 1 + k * 0.6, r1 = 1 + (k + 1) * 0.6, a0 = r0 * 0.55 + arm * 2.094, a1 = r1 * 0.55 + arm * 2.094, w = 0.55 * (1 - k / 16);
    const P = (r, a, o) => [Math.cos(a) * r + Math.cos(a + 1.57) * o, Math.sin(a) * r + Math.sin(a + 1.57) * o];
    const A = P(r0, a0, -w), B = P(r0, a0, w), C = P(r1, a1, w), D = P(r1, a1, -w), al = 0.85 * (1 - k / 15);
    for (const q of [A, B, C, A, C, D]) push(q[0], q[1], 1, 1, 1, al);
  }
  whirlGeo = new THREE.BufferGeometry();
  whirlGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  whirlGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));

  const dp = [], dc = [], ds = 24, dr = 3;
  for (let r = 0; r < dr; r++) for (let i = 0; i < ds; i++) {
    const v = (ii, rr) => { const a = (ii / ds) * Math.PI * 2, rad = rr / dr; return [Math.cos(a) * rad, 0, Math.sin(a) * rad, 0.75 * Math.pow(1 - rad, 1.1)]; };
    const A = v(i, r), B = v(i + 1, r), C = v(i + 1, r + 1), D = v(i, r + 1);
    for (const q of [A, C, B, A, D, C]) { dp.push(q[0], q[1], q[2]); dc.push(1, 1, 1, q[3]); }
  }
  discGeo = new THREE.BufferGeometry();
  discGeo.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
  discGeo.setAttribute('color', new THREE.Float32BufferAttribute(dc, 4));
}

export class SeaFeatures {
  constructor(scene, world, seed, collected) {
    this.scene = scene; this.world = world; this.seed = seed; this.collected = collected;
    this.cells = new Map();
    this.onEvent = null;
    geos();
    this.whirlMat = psxMaterial({ color: 0xffffff, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, key: 'Wp' });
    this.shoalMat = psxMaterial({ color: 0xffffff, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, key: 'Sl', fragmentColor: { head: '', body: 'diffuseColor.rgb /= max(uLight, 0.05);' } });
    this.whirlTold = false;
  }

  free(x, z, margin) {
    const cx = Math.round(x / CELL), cz = Math.round(z / CELL);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const d = this.world.desc(cx + dx, cz + dz);
      if (d && Math.hypot(d.x - x, d.z - z) < d.r * 1.9 + margin) return false;
    }
    return true;
  }

  makeCell(cx, cz) {
    const items = [];
    if (this.world.desc(cx, cz)) return items;
    const rng = mulberry32(hash2(cx, cz, this.seed + 777));
    const roll = rng();
    const bx = cx * CELL + (rng() - 0.5) * 70, bz = cz * CELL + (rng() - 0.5) * 70;
    if (Math.hypot(bx, bz) < 45 || !this.free(bx, bz, 8)) return items;
    const dread = dreadAtDistance(Math.hypot(bx, bz));
    const add = (o) => { items.push(o); if (o.mesh) this.scene.add(o.mesh); };

    if (roll < 0.22) {
      const n = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const id = `b:${cx},${cz}:${i}`;
        if (this.collected.has(id)) continue;
        const m = new THREE.Mesh(barrelGeo, mats.props);
        add({ type: 'barrel', id, x: bx + (rng() - 0.5) * 9, z: bz + (rng() - 0.5) * 9, mesh: m, phase: rng() * 6, dread });
      }
    } else if (roll < 0.36) {
      const id = `bt:${cx},${cz}`;
      if (!this.collected.has(id)) add({ type: 'bottle', id, x: bx, z: bz, mesh: new THREE.Mesh(bottleGeo, mats.props), phase: rng() * 6, dread });
    } else if (roll < 0.46) {
      const id = `w:${cx},${cz}`;
      const g = new THREE.Group();
      const hull = new THREE.Mesh(shipGeos().hull, mats.props);
      hull.rotation.set(0.32, 0, 0.45); hull.position.y = -1.4; hull.scale.setScalar(1.3);
      g.add(hull); g.add(new THREE.Mesh(wreckExtraGeo, mats.props));
      g.rotation.y = rng() * 6.28;
      g.position.set(bx, 0, bz);
      add({ type: 'wreck', id, x: bx, z: bz, mesh: g, dread, salvaged: this.collected.has(id), rngSeed: hash2(cx, cz, this.seed + 5) });
    } else if (roll < 0.54 && dread > 0.08) {
      add({ type: 'whirl', id: `wp:${cx},${cz}`, x: bx, z: bz, mesh: new THREE.Mesh(whirlGeo, this.whirlMat), dread });
    } else if (roll < 0.66) {
      const m = new THREE.Mesh(discGeo, this.shoalMat); m.scale.setScalar(17); m.position.set(bx, 0.55, bz); m.renderOrder = 1;
      add({ type: 'shoal', id: `s:${cx},${cz}`, x: bx, z: bz, mesh: m, dread });
    }
    return items;
  }

  update(dt, t, ctx) {
    const { ship, wave, stage, tod } = ctx;
    const ccx = Math.round(ship.pos.x / CELL), ccz = Math.round(ship.pos.z / CELL);
    for (let dz = -RADIUS; dz <= RADIUS; dz++) for (let dx = -RADIUS; dx <= RADIUS; dx++) {
      const k = `${ccx + dx},${ccz + dz}`;
      if (!this.cells.has(k)) this.cells.set(k, this.makeCell(ccx + dx, ccz + dz));
    }
    // colours
    this.whirlMat.color.setRGB(1, 1, 1).lerp(new THREE.Color(1, 0.4, 0.9), smoothstep(0.6, 0.9, stage.dread));
    this.shoalMat.color.copy(stage.shallow).lerp(new THREE.Color(1, 1, 1), 0.3).lerp(new THREE.Color(0.2, 1, 0.9), tod.night * 0.9).lerp(new THREE.Color(0.9, 0.3, 1), tod.night * smoothstep(0.55, 0.9, stage.dread) * 0.8);

    this.nearWreck = null;
    for (const [k, items] of this.cells) {
      const [cx, cz] = k.split(',').map(Number);
      if (Math.max(Math.abs(cx - ccx), Math.abs(cz - ccz)) > RADIUS + 1) {
        for (const o of items) if (o.mesh) this.scene.remove(o.mesh);
        this.cells.delete(k);
        continue;
      }
      for (let i = items.length - 1; i >= 0; i--) {
        const o = items[i], d = Math.hypot(o.x - ship.pos.x, o.z - ship.pos.z);
        switch (o.type) {
          case 'barrel': case 'bottle': {
            o.mesh.position.set(o.x, waveHeight(o.x, o.z, t, wave) + 0.1, o.z);
            o.mesh.rotation.set(Math.sin(t * 1.3 + o.phase) * 0.25, t * 0.2 + o.phase, Math.cos(t * 1.1 + o.phase) * 0.3 + (o.type === 'bottle' ? 1.1 : 0));
            if (d < 4.8) {
              this.scene.remove(o.mesh); items.splice(i, 1); this.collected.add(o.id);
              if (this.onEvent) this.onEvent({ type: o.type, o });
            }
            break;
          }
          case 'wreck': {
            o.mesh.position.y = waveHeight(o.x, o.z, t, wave) * 0.4;
            o.mesh.rotation.z = Math.sin(t * 0.5 + o.x) * 0.03;
            if (!o.salvaged && d < 16 + 6 && (!this.nearWreck || d < this.nearWreck.d)) this.nearWreck = { o, d };
            break;
          }
          case 'whirl': {
            o.mesh.position.set(o.x, 0.75, o.z);
            o.mesh.rotation.y -= dt * (1.1 + o.dread);
            const R = 14;
            if (d < R && dt > 0) {
              const k2 = 1 - d / R, nx = (o.x - ship.pos.x) / Math.max(d, 0.1), nz = (o.z - ship.pos.z) / Math.max(d, 0.1);
              ship.pos.x += (nx * 3.6 - nz * 2.2) * k2 * dt; ship.pos.z += (nz * 3.6 + nx * 2.2) * k2 * dt;
              ship.speed *= 1 - 0.35 * k2 * dt;
              if (this.onEvent && !this.whirlTold) { this.whirlTold = true; this.onEvent({ type: 'whirl', o }); }
            } else if (d > R + 10) this.whirlTold = this.whirlTold && false;
            break;
          }
          case 'shoal': {
            o.mesh.position.y = 0.55;
            break;
          }
        }
      }
    }
  }
}
