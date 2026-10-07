import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats, psxMaterial } from './psx.js';
import { waveHeight } from './ocean.js';
import { smoothstep, lerp, clamp, mulberry32 } from './util.js';

// Sea life that goes wrong as dread rises:
//  gulls -> frozen watchers -> backwards-circling crows -> a ring of crows over your ship
//  dolphins -> circling in silence -> pale, tail-first leaps -> gone
//  whales -> a huge shadow sliding under the keel
const NB = 56;
const rnd = (a, b) => a + Math.random() * (b - a);

function dolphinGeo() {
  const b = new Builder();
  b.doubleSided = true;
  b.push(0, 0, 0, 0, 1, 1, 1, Math.PI / 2);
  b.cyl(0, -1.1, 0, 0.1, 0.4, 2.3, 5, '#7f9db6', TILE.white, true);
  b.cyl(0, 1.2, 0, 0.3, 0.08, 0.8, 5, '#9fb8cc', TILE.white, true);
  b.pop();
  b.tri([0, 0.35, 0.3], [0, 0.35, -0.5], [0, 0.95, -0.3], '#5f7d96');                  // dorsal fin
  b.tri([0, 0.05, -1.1], [0.8, 0.3, -1.6], [0.05, 0.05, -1.4], '#6f8da6');             // flukes
  b.tri([0, 0.05, -1.1], [-0.8, 0.3, -1.6], [-0.05, 0.05, -1.4], '#6f8da6');
  return b.geometry();
}
function whaleGeo() {
  const b = new Builder();
  b.doubleSided = true;
  b.blob(0, 0, 0, 2.4, 1.8, 6.5, '#5a6c84', TILE.white, 0.12, 3);
  b.blob(0, 0.3, 4.5, 1.7, 1.2, 3, '#6a7c94', TILE.white, 0.12, 4);
  b.tri([0, 0.3, -6.5], [3.2, 0.8, -9], [0.2, 0.3, -7.7], '#4a5a70');
  b.tri([0, 0.3, -6.5], [-3.2, 0.8, -9], [-0.2, 0.3, -7.7], '#4a5a70');
  b.tri([1.5, -0.4, 2], [3.8, -1.2, 0.2], [1.8, -0.5, 0.2], '#4a5a70');
  b.tri([-1.5, -0.4, 2], [-3.8, -1.2, 0.2], [-1.8, -0.5, 0.2], '#4a5a70');
  return b.geometry();
}

export class Fauna {
  constructor(scene, world) {
    this.scene = scene; this.world = world;
    this.dummy = new THREE.Object3D();
    this.t = 0;

    // ---- birds (two instanced wing meshes)
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0, 1.1, 0, -0.5, 0.95, 0, 0.45,
      0, 0, -0.7, 0.18, 0, 0.1, 0, 0, 0.6,
    ], 3));
    this.birdMat = psxMaterial({ color: 0xffffff, side: THREE.DoubleSide, key: 'Bd' });
    this.wingR = new THREE.InstancedMesh(wg, this.birdMat, NB);
    this.wingL = new THREE.InstancedMesh(wg, this.birdMat, NB);
    for (const m of [this.wingR, this.wingL]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }
    this.birds = Array.from({ length: NB }, (_, i) => ({ anchor: null, ang: Math.random() * 6.28, r: 0, h: 0, phase: Math.random() * 10, spd: rnd(0.6, 1), i }));

    // ---- dolphins
    this.dolMat = psxMaterial({ vertexColors: true, color: 0xffffff, key: 'Dl' });
    const dg = dolphinGeo();
    this.dolphins = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(dg, this.dolMat); m.visible = false; m.rotation.order = 'YXZ'; m.scale.setScalar(1.7); scene.add(m);
      return { m, u: 2, delay: 0, sx: 0, sz: 0, vx: 0, vz: 0, phase: Math.random() * 6 };
    });
    this.dolTimer = 6; this.circle = null;

    // ---- flying fish
    const fg = new Builder(); fg.doubleSided = true;
    fg.tri([0, 0, -0.3], [0.35, 0.05, 0], [0, 0, 0.3], '#dfe9f2'); fg.tri([0, 0, -0.3], [-0.35, 0.05, 0], [0, 0, 0.3], '#dfe9f2');
    const fgeo = fg.geometry();
    this.fish = Array.from({ length: 6 }, () => {
      const m = new THREE.Mesh(fgeo, mats.props); m.visible = false; scene.add(m);
      return { m, u: 2, sx: 0, sz: 0, vx: 0, vz: 0 };
    });
    this.fishTimer = 9;

    // ---- whale + shadow
    this.whaleMat = psxMaterial({ vertexColors: true, key: 'Wh' });
    this.whale = new THREE.Mesh(whaleGeo(), this.whaleMat);
    this.whale.visible = false; this.whale.rotation.order = 'YXZ'; scene.add(this.whale);
    this.whaleT = -1; this.whaleTimer = 35; this.whaleData = null; this.spoutT = 0;
    const sp = new THREE.IcosahedronGeometry(1, 0);
    this.spouts = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(sp, mats.props); m.visible = false; scene.add(m); return { m, life: 0 }; });
    this.spoutGeoMat = mats.foam;

    const pos = [], col = [], segs = 24, rings = 3;
    for (let r = 0; r < rings; r++) for (let i = 0; i < segs; i++) {
      const v = (ii, rr) => { const a = (ii / segs) * Math.PI * 2, rad = rr / rings; return [Math.cos(a) * rad, 0, Math.sin(a) * rad, Math.pow(1 - rad, 0.8)]; };
      const A = v(i, r), B = v(i + 1, r), C = v(i + 1, r + 1), D = v(i, r + 1);
      for (const q of [A, C, B, A, D, C]) { pos.push(q[0], q[1], q[2]); col.push(1, 1, 1, q[3]); }
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    sg.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    this.shadowMat = psxMaterial({ color: 0x06030e, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false, key: 'Sh' });
    this.shadow = new THREE.Mesh(sg, this.shadowMat);
    this.shadow.visible = false; this.shadow.renderOrder = 2; scene.add(this.shadow);
    this.shadowT = -1; this.shadowTimer = 25; this.shadowData = null;

    // ---- splashes
    const cg = new THREE.CircleGeometry(1, 7).rotateX(-Math.PI / 2);
    cg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(8 * 4).fill(1), 4));
    this.splashes = Array.from({ length: 14 }, () => { const m = new THREE.Mesh(cg, mats.foam); m.visible = false; m.renderOrder = 2; scene.add(m); return { m, life: 0 }; });
    this.gullTimer = 4;
  }

  splash(x, z, wave, t, size = 1) {
    const s = this.splashes.find((q) => q.life <= 0);
    if (!s) return;
    s.life = 0.9; s.size = size; s.m.position.set(x, waveHeight(x, z, t, wave) + 0.2, z); s.m.visible = true;
  }

  pickAnchor(ship) {
    let best = null, tries = 0;
    const arr = [...this.world.islands.values()];
    while (tries++ < 6 && arr.length) {
      const isl = arr[Math.floor(Math.random() * arr.length)], d = isl.desc;
      if (Math.hypot(d.x - ship.pos.x, d.z - ship.pos.z) < 230) { best = d; break; }
    }
    return best;
  }

  update(dt, t, ctx) {
    const { ship, dread, wave, audio } = ctx;
    this.t = t;
    const sx = ship.pos.x, sz = ship.pos.z;
    const fwdx = Math.sin(ship.heading), fwdz = -Math.cos(ship.heading), rx = Math.cos(ship.heading), rz = Math.sin(ship.heading);

    // ================= birds =================
    const watchers = dread >= 0.8;
    const nActive = watchers ? 9 : Math.round(NB * (1 - 0.55 * smoothstep(0.15, 0.45, dread)));
    const crow = smoothstep(0.3, 0.55, dread);
    this.birdMat.color.setRGB(lerp(1, 0.13, crow), lerp(1, 0.1, crow), lerp(1, 0.17, crow));
    const flap = lerp(9, 3.5, smoothstep(0.3, 0.8, dread));
    const frozen = 1 - smoothstep(0.3, 0.45, dread) * (1 - smoothstep(0.5, 0.6, dread));      // 1 normal .. 0 frozen
    const dirSign = dread > 0.5 ? -1 : 1;
    let nearBird = 1e9;
    for (let i = 0; i < NB; i++) {
      const b = this.birds[i], d = this.dummy;
      let visible = i < nActive;
      let x = 0, y = 0, z = 0, yaw = 0;
      if (visible) {
        if (watchers) {
          b.ang += dt * 0.35 * (i % 2 ? 1 : -1);
          const rr = 13 + (i % 3) * 2;
          x = sx + Math.cos(b.ang + i) * rr; z = sz + Math.sin(b.ang + i) * rr; y = 13 + (i % 3);
          yaw = Math.atan2(sx - x, sz - z);
        } else {
          if (!b.anchor || Math.hypot(b.anchor.x - sx, b.anchor.z - sz) > 260 || !this.world.islands.has(b.anchor.id)) {
            b.anchor = this.pickAnchor(ship);
            if (b.anchor) { b.r = b.anchor.r * rnd(0.5, 1.1) + 3; b.h = rnd(7, 11); }
          }
          if (!b.anchor) visible = false;
          else {
            b.ang += dt * (3.2 / b.r) * b.spd * frozen * dirSign * (dread > 0.5 ? 0.6 : 1);
            x = b.anchor.x + Math.cos(b.ang) * b.r; z = b.anchor.z + Math.sin(b.ang) * b.r;
            y = b.h + Math.sin(t * 0.7 + b.phase) * 0.6;
            const vx = -Math.sin(b.ang) * dirSign, vz = Math.cos(b.ang) * dirSign;
            yaw = frozen < 0.5 && dread < 0.5 ? Math.atan2(sx - x, sz - z) : Math.atan2(vx, vz);
          }
        }
      }
      if (visible) {
        nearBird = Math.min(nearBird, Math.hypot(x - sx, z - sz));
        const fl = Math.sin(t * flap + b.phase) * (frozen < 0.5 && dread < 0.5 ? 0.08 : 0.55);
        d.position.set(x, y, z); d.rotation.set(0, yaw, 0); d.scale.set(2, 2, 2);
        d.rotation.z = fl; d.updateMatrix(); this.wingR.setMatrixAt(i, d.matrix);
        d.scale.set(-2, 2, 2); d.rotation.z = -fl; d.updateMatrix(); this.wingL.setMatrixAt(i, d.matrix);
      } else {
        d.scale.set(0, 0, 0); d.position.set(0, -50, 0); d.updateMatrix();
        this.wingR.setMatrixAt(i, d.matrix); this.wingL.setMatrixAt(i, d.matrix);
      }
    }
    this.wingR.instanceMatrix.needsUpdate = true; this.wingL.instanceMatrix.needsUpdate = true;
    // gull cries (only while they still sound like gulls)
    this.gullTimer -= dt;
    if (this.gullTimer <= 0) {
      this.gullTimer = rnd(4, 10);
      if (dread < 0.3 && nearBird < 70) audio.play('gull', { vol: clamp(1 - nearBird / 80, 0.15, 0.8), rate: rnd(0.9, 1.15) });
    }

    // ================= dolphins =================
    const dolMood = dread < 0.3 ? 'jump' : dread < 0.6 ? 'circle' : dread < 0.85 ? 'ghost' : 'none';
    const pale = smoothstep(0.55, 0.7, dread);
    this.dolMat.color.setRGB(lerp(1, 1.5, pale), lerp(1, 1.5, pale), lerp(1, 1.55, pale));
    if (dolMood === 'jump' || dolMood === 'ghost') {
      this.dolTimer -= dt;
      if (this.dolTimer <= 0 && this.dolphins.every((d) => d.u >= 1)) {
        this.dolTimer = rnd(9, 20);
        const side = Math.random() < 0.5 ? -1 : 1, off = rnd(10, 20), ahead = rnd(2, 14);
        const bx = sx + rx * side * off + fwdx * ahead, bz = sz + rz * side * off + fwdz * ahead;
        const ang = ship.heading + rnd(-0.4, 0.4), spd = 8;
        this.dolphins.forEach((d, i) => {
          d.u = -i * 0.28; d.sx = bx + rx * i * 2.4; d.sz = bz + rz * i * 2.4; d.vx = Math.sin(ang) * spd; d.vz = -Math.cos(ang) * spd; d.entered = false; d.exited = false;
        });
      }
      const D = 1.5, H = 3.2;
      for (const d of this.dolphins) {
        if (d.u >= 1) { d.m.visible = false; continue; }
        d.u += dt / D;
        if (d.u < 0) { d.m.visible = false; continue; }
        const u = d.u, x = d.sx + d.vx * u * D, z = d.sz + d.vz * u * D;
        const y = waveHeight(x, z, t, wave) - 0.4 + H * 4 * u * (1 - u);
        const slope = H * 4 * (1 - 2 * u) / (Math.hypot(d.vx, d.vz) * D);
        d.m.visible = true;
        d.m.position.set(x, y, z);
        const yaw = Math.atan2(d.vx, d.vz) + (dolMood === 'ghost' ? Math.PI : 0);
        d.m.rotation.set(dolMood === 'ghost' ? Math.atan(slope) : -Math.atan(slope), yaw, 0);
        if (dolMood === 'jump') {
          if (!d.entered && u > 0.06) { d.entered = true; this.splash(x, z, wave, t, 1.1); audio.play('dolphin', { vol: 0.5, rate: rnd(0.95, 1.2) }); }
          if (!d.exited && u > 0.94) { d.exited = true; this.splash(x, z, wave, t, 1.2); audio.play('splash', { vol: 0.35 }); }
        }
      }
    } else if (dolMood === 'circle') {
      if (!this.circle || Math.hypot(this.circle.x - sx, this.circle.z - sz) > 90) this.circle = { x: sx + fwdx * 28 + rx * rnd(-8, 8), z: sz + fwdz * 28 + rz * rnd(-8, 8) };
      this.dolphins.forEach((d, i) => {
        const a = t * 0.9 + i * 2.1, r = 7;
        const x = this.circle.x + Math.cos(a) * r, z = this.circle.z + Math.sin(a) * r;
        const arc = Math.max(0, Math.sin(a * 2.5 + i));
        d.m.visible = true;
        d.m.position.set(x, waveHeight(x, z, t, wave) - 0.9 + arc * 1.3, z);
        d.m.rotation.set(-Math.cos(a * 2.5 + i) * 0.5, Math.atan2(-Math.sin(a), Math.cos(a)), 0);
        d.u = 2;
      });
    } else {
      for (const d of this.dolphins) { d.m.visible = false; d.u = 2; }
    }
    if (dolMood !== 'circle') this.circle = null;

    // ================= flying fish =================
    if (dread < 0.45) {
      this.fishTimer -= dt;
      if (this.fishTimer <= 0 && this.fish.every((f) => f.u >= 1)) {
        this.fishTimer = rnd(9, 20);
        const side = Math.random() < 0.5 ? -1 : 1, off = rnd(6, 14), ahead = rnd(4, 16);
        const ang = ship.heading + side * rnd(0.3, 0.9);
        this.fish.forEach((f, i) => {
          f.u = -i * 0.07; f.sx = sx + rx * side * off + fwdx * ahead + rnd(-2, 2); f.sz = sz + rz * side * off + fwdz * ahead + rnd(-2, 2);
          f.vx = Math.sin(ang) * 15; f.vz = -Math.cos(ang) * 15;
        });
      }
    }
    for (const f of this.fish) {
      if (f.u >= 1) { f.m.visible = false; continue; }
      f.u += dt / 1.3;
      if (f.u < 0) { f.m.visible = false; continue; }
      const x = f.sx + f.vx * f.u * 1.3, z = f.sz + f.vz * f.u * 1.3;
      f.m.visible = true;
      f.m.position.set(x, waveHeight(x, z, t, wave) + 0.5 + Math.sin(f.u * Math.PI) * 0.9, z);
      f.m.rotation.set(0, Math.atan2(f.vx, f.vz), 0);
      f.m.scale.set(1, 1 + Math.sin(t * 40) * 0.5, 1);
    }

    // ================= whale / shadow =================
    this.updateWhale(dt, t, ctx, fwdx, fwdz, rx, rz);

    // ================= splashes =================
    for (const s of this.splashes) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const k = 1 - s.life / 0.9;
      s.m.scale.setScalar(s.size * (0.4 + k * 2.4) * Math.max(0, 1 - k * k));
      if (s.life <= 0) s.m.visible = false;
    }
  }

  updateWhale(dt, t, ctx, fwdx, fwdz, rx, rz) {
    const { ship, dread, wave, audio } = ctx;
    const sx = ship.pos.x, sz = ship.pos.z;
    const showWhale = dread < 0.7, showShadow = dread >= 0.7;

    this.whaleTimer -= dt;
    if (showWhale && this.whaleT < 0 && this.whaleTimer <= 0) {
      this.whaleTimer = rnd(60, 110);
      const a = ship.heading + rnd(-1.2, 1.2), dist = rnd(70, 120);
      this.whaleData = { x: sx + Math.sin(a) * dist, z: sz - Math.cos(a) * dist, h: a + rnd(1, 2) * (Math.random() < 0.5 ? 1 : -1) };
      this.whaleT = 0; this.spoutT = 2;
      audio.play('whale', { vol: 0.6 });
    }
    if (this.whaleT >= 0 && this.whaleData) {
      const w = this.whaleData; this.whaleT += dt;
      const T = this.whaleT, DUR = 26;
      w.x += Math.sin(w.h) * 2.2 * dt; w.z -= Math.cos(w.h) * 2.2 * dt;
      const rise = smoothstep(0, 3, T), dive = smoothstep(DUR - 5, DUR, T);
      this.whale.visible = true;
      this.whale.position.set(w.x, waveHeight(w.x, w.z, t, wave) - 2.5 + rise * 2.1 - dive * 3.5, w.z);
      this.whale.rotation.set(dive * 0.5 + Math.sin(t * 0.8) * 0.04, w.h + Math.PI, 0);
      this.spoutT -= dt;
      if (this.spoutT <= 0 && T < DUR - 6 && T > 2) {
        this.spoutT = 6.5;
        for (let i = 0; i < 4; i++) { const sp = this.spouts.find((q) => q.life <= 0); if (sp) { sp.life = 1.6; sp.delay = i * 0.12; sp.x = w.x + Math.sin(w.h) * 3; sp.z = w.z - Math.cos(w.h) * 3; } }
      }
      if (T > DUR) { this.whaleT = -1; this.whale.visible = false; }
    } else this.whale.visible = false;
    for (const sp of this.spouts) {
      if (sp.life <= 0) { sp.m.visible = false; continue; }
      sp.life -= dt;
      const k = 1 - sp.life / 1.6;
      sp.m.visible = true;
      sp.m.position.set(sp.x, 1 + k * 6 - k * k * 2, sp.z);
      sp.m.scale.setScalar(Math.max(0.01, 0.5 * Math.sin(Math.min(1, k * 1.2) * Math.PI) + 0.1));
    }

    // the shadow under the keel
    this.shadowTimer -= dt;
    if (showShadow && this.shadowT < 0 && this.shadowTimer <= 0) {
      this.shadowTimer = rnd(45, 90);
      const side = Math.random() < 0.5 ? -1 : 1;
      this.shadowData = { x: sx + rx * side * 110, z: sz + rz * side * 110, vx: -rx * side * 7, vz: -rz * side * 7 };
      this.shadowT = 0;
      audio.play('whale', { vol: 0.9, rate: 0.5 });
    }
    if (this.shadowT >= 0 && this.shadowData) {
      const s = this.shadowData; this.shadowT += dt;
      s.x += s.vx * dt; s.z += s.vz * dt;
      const DUR = 32, f = Math.min(smoothstep(0, 5, this.shadowT), 1 - smoothstep(DUR - 6, DUR, this.shadowT));
      this.shadow.visible = true;
      this.shadow.position.set(s.x, 1.2, s.z);
      this.shadow.rotation.y = Math.atan2(s.vx, s.vz) + Math.PI / 2;
      this.shadow.scale.set(34, 1, 14);
      this.shadowMat.opacity = 0.55 * f;
      if (this.shadowT > DUR) { this.shadowT = -1; this.shadow.visible = false; }
    } else this.shadow.visible = false;
  }
}
