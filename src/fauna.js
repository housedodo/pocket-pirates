import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats, psxMaterial } from './psx.js';
import { waveHeight } from './ocean.js';
import { smoothstep, lerp, clamp, mulberry32 } from './util.js';
import { SeaLife } from './sealife.js';
import { shoreR, terrainHeight } from './world.js';

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

/** a flying bird, facing +z, its right wing out along +x from the shoulder at the origin (the left is the same, mirrored).
 *  gull: white, a grey mantle, black wingtips, an orange beak, a short pale tail; crow: black all over, a heavy dark beak, a fanned
 *  tail, and the ragged wingtip of a crow: four primaries spread like fingers */
function birdModel(kind) {
  const B = new Builder(), W = new Builder(); B.doubleSided = W.doubleSided = true; B.darkSame = W.darkSame = true; B.grime = W.grime = 0;
  if (kind === 'gull') {
    B.blob(0, -0.05, 0.05, 0.13, 0.12, 0.42, '#f6f4ee', TILE.white, 0.06, 2); B.blob(0, 0.02, 0.44, 0.09, 0.09, 0.11, '#f6f4ee', TILE.white, 0.05, 3);
    B.box(0, 0.0, 0.53, 0.04, 0.04, 0.12, '#f0a030'); B.box(0, -0.05, -0.4, 0.18, 0.03, 0.22, '#e8e6e0');
    W.quad([0, 0, 0.2], [0, 0, -0.16], [0.62, 0, -0.18], [0.6, 0, 0.18], '#aab2bc'); W.quad([0.6, 0, 0.18], [0.62, 0, -0.18], [1.05, 0, -0.32], [0.98, 0, 0.0], '#c4cad2');
    W.tri([0.98, 0, 0.0], [1.05, 0, -0.32], [1.28, 0, -0.38], '#1e1e26');   // the black tip
  } else {
    const BL = '#16131a', BL2 = '#221e26';
    B.blob(0, -0.04, 0.02, 0.14, 0.13, 0.4, BL, TILE.white, 0.06, 4); B.blob(0, 0.03, 0.42, 0.1, 0.1, 0.11, BL2, TILE.white, 0.05, 5);
    B.cyl(0, 0.01, 0.5, 0.045, 0.012, 0.16, 4, '#3a3a40', TILE.white, false);   // the heavy beak, pointing ahead (a cone along +y, tipped below)
    for (let k = -2; k <= 2; k++) B.tri([0, -0.04, -0.32], [k * 0.07 - 0.04, -0.04, -0.62], [k * 0.07 + 0.04, -0.04, -0.62], k % 2 ? BL : BL2);   // a fanned tail
    W.quad([0, 0, 0.18], [0, 0, -0.18], [0.6, 0, -0.2], [0.58, 0, 0.2], BL); W.quad([0.58, 0, 0.2], [0.6, 0, -0.2], [0.86, 0, -0.18], [0.86, 0, 0.16], BL2);
    for (let k = 0; k < 4; k++) { const z = 0.12 - k * 0.1; W.quad([0.86, 0, z + 0.03], [0.86, 0, z - 0.04], [1.22 - k * 0.04, 0, z - 0.06 - k * 0.03], [1.22 - k * 0.04, 0, z - 0.02 - k * 0.03], k % 2 ? BL : BL2); }   // the fingers
  }
  return { bodyGeo: B.geometry(), wingGeo: W.geometry() };
}

export class Fauna {
  constructor(scene, world) {
    this.scene = scene; this.world = world;
    this.dummy = new THREE.Object3D();
    this.t = 0;

    // ---- birds (two instanced wing meshes)

    // two real birds (owner, 2026-11-23: "you changed the model of the normal gulls, do that with the black ones as well"): a gull and a
    // crow, each a body (head, beak, tail) and a pair of wings, instanced; the crows take over as the water darkens (`crow` below)
    this.birdMat = psxMaterial({ vertexColors: true, side: THREE.DoubleSide, key: 'Bd' });
    const inst = (geo) => { const m = new THREE.InstancedMesh(geo, this.birdMat, NB); m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); return m; };
    this.flocks = { gull: birdModel('gull'), crow: birdModel('crow') };
    for (const f of Object.values(this.flocks)) { f.body = inst(f.bodyGeo); f.wR = inst(f.wingGeo); f.wL = inst(f.wingGeo); }
    this.birds = Array.from({ length: NB }, (_, i) => ({ anchor: null, ang: Math.random() * 6.28, r: 0, h: 0, phase: Math.random() * 10, spd: rnd(0.6, 1), i, k: 0, sit: null, next: rnd(4, 25), yawS: 0 }));

    // ---- dolphins
    this.dolMat = psxMaterial({ vertexColors: true, color: 0xffffff, key: 'Dl' });
    const dg = dolphinGeo();
    this.dolphins = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(dg, this.dolMat); m.visible = false; m.rotation.order = 'YXZ'; m.scale.setScalar(1.7); scene.add(m);
      return { m, u: 2, delay: 0, sx: 0, sz: 0, vx: 0, vz: 0, phase: Math.random() * 6 };
    });
    this.dolTimer = 30; this.circle = null;

    // ---- flying fish
    const fg = new Builder(); fg.doubleSided = true;
    fg.tri([0, 0, -0.3], [0.35, 0.05, 0], [0, 0, 0.3], '#dfe9f2'); fg.tri([0, 0, -0.3], [-0.35, 0.05, 0], [0, 0, 0.3], '#dfe9f2');
    const fgeo = fg.geometry();
    this.fish = Array.from({ length: 6 }, () => {
      const m = new THREE.Mesh(fgeo, mats.props); m.visible = false; scene.add(m);
      return { m, u: 2, sx: 0, sz: 0, vx: 0, vz: 0 };
    });
    this.fishTimer = 25;

    // ---- sea turtles (Free Cays and Lantern Guild waters by day): a shell, a small head, slow flippers
    const tb = new Builder(); tb.doubleSided = true;
    tb.blob(0, 0, 0, 0.62, 0.22, 0.8, '#5a7a3a', TILE.white, 0.12, 3); tb.blob(0, 0.12, 0.05, 0.4, 0.14, 0.5, '#7a9a4a', TILE.white, 0.12, 5);
    tb.blob(0, 0.14, -0.95, 0.17, 0.14, 0.2, '#9aa86a', TILE.white, 0.1, 7);
    for (const sx of [-1, 1]) for (const zz of [-0.4, 0.45]) tb.box(sx * 0.78, -0.02, zz, 0.55, 0.07, 0.26, '#6a8a42', TILE.white);
    const tgeo = tb.geometry();
    this.turtles = Array.from({ length: 3 }, () => { const m = new THREE.Mesh(tgeo, mats.props); m.visible = false; m.scale.setScalar(1.5); scene.add(m); return { m, life: 0, x: 0, z: 0, h: 0, dive: 0 }; });
    this.turtleTimer = 20;

    // ---- whale + shadow
    this.whaleMat = psxMaterial({ vertexColors: true, key: 'Wh' });
    this.whale = new THREE.Mesh(whaleGeo(), this.whaleMat);
    this.whale.visible = false; this.whale.rotation.order = 'YXZ'; scene.add(this.whale);
    this.whaleT = -1; this.whaleTimer = 70; this.whaleData = null; this.spoutT = 0;
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
    this.gullTimer = 4; this.nearBird = 1e9;
    this.life = new SeaLife(scene, world);   // weed, logs, jellyfish on the open sea (sealife.js)
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
    const nActive = watchers ? 9 : dread < 0.35 ? Math.round(10 * (1 - 0.5 * smoothstep(0.15, 0.32, dread))) : Math.round(5 + 23 * smoothstep(0.35, 0.78, dread));   // a few gulls, not a cloud; they thin out, and then the crows come, more and more of them (owner, 2026-11-23: the birds slowly appear)
    const crow = smoothstep(0.3, 0.55, dread);
    const kind = crow > 0.5 ? 'crow' : 'gull', F = this.flocks[kind], O = this.flocks[kind === 'crow' ? 'gull' : 'crow'];   // the whole flock is one or the other
    const flap = lerp(9, 3.5, smoothstep(0.3, 0.8, dread));
    const frozen = ctx.freeze != null ? ctx.freeze : 1 - smoothstep(0.3, 0.45, dread) * (1 - smoothstep(0.5, 0.6, dread));      // 1 normal .. 0 frozen (the glimpse freezes them too)
    const dirSign = dread > 0.5 ? -1 : 1;
    let nearBird = 1e9;
    // (owner, 2026-11-26: "they should not be flying the whole time, especially in the dread zones; they can sit on the trees, the beach
    // or similar"): each bird takes turns flying and sitting. A sitting gull is on the ground of an island near by (beach, grass, rock)
    // and lifts off when the ship comes close; crows sit longer and do not lift off (they watch). At the deepest dread most of them sit
    // on the Gull's own rail, and only a few circle.
    const V = this._v || (this._v = new THREE.Vector3());
    const RAIL = [[0.92, 2.0], [-0.92, 2.0], [1.2, 0.5], [-1.2, 0.5], [1.15, -1.0], [-1.15, -1.0], [0.85, -2.2], [-0.85, -2.2]];   // ship-local x, z
    for (let i = 0; i < NB; i++) {
      const b = this.birds[i], d = this.dummy;
      const isCrow = ((i * 0.6180339) % 1) < crow, F = this.flocks[isCrow ? 'crow' : 'gull'], O = this.flocks[isCrow ? 'gull' : 'crow'], crowish = isCrow;   // the crows come one by one, not the whole flock at once (audit)
      let visible = i < nActive;
      let x = 0, y = 0, z = 0, yaw = 0;
      if (visible) {
        // the flying point (as before)
        if (watchers) {
          b.ang += dt * 0.35 * (i % 2 ? 1 : -1);
          const rr = 13 + (i % 3) * 2;
          x = sx + Math.cos(b.ang + i) * rr; z = sz + Math.sin(b.ang + i) * rr; y = 13 + (i % 3);
          yaw = Math.atan2(sx - x, sz - z);
        } else {
          if (!b.anchor || Math.hypot(b.anchor.x - sx, b.anchor.z - sz) > 260 || !this.world.islands.has(b.anchor.id)) {
            b.anchor = this.pickAnchor(ship); b.sit = null; b.k = 0;
            if (b.anchor) { b.r = b.anchor.r * rnd(0.5, 1.1) + 3; b.h = rnd(7, 11); }
          }
          if (!b.anchor) visible = false;
          else {
            b.ang += dt * (5.5 / b.r) * b.spd * frozen * dirSign * (dread > 0.5 ? 0.6 : 1) * (1 - b.k);
            const live = frozen * (dread > 0.5 ? 0.3 : 1), rr = b.r * (1 + 0.3 * live * Math.sin(t * 0.23 + b.phase * 2));
            x = b.anchor.x + Math.cos(b.ang) * rr; z = b.anchor.z + Math.sin(b.ang) * rr;
            y = b.h + Math.sin(t * 0.7 + b.phase) * 0.6 + live * (2.2 * Math.sin(t * 0.31 + b.phase * 3) + 1.2 * Math.sin(t * 0.83 + b.phase));
            const vx = -Math.sin(b.ang) * dirSign, vz = Math.cos(b.ang) * dirSign;
            yaw = frozen < 0.5 && dread < 0.5 ? Math.atan2(sx - x, sz - z) : Math.atan2(vx, vz);
          }
        }
        // sitting: choose a place, go down to it, stay, lift off again
        if (visible) {
          b.next -= dt;
          const onRail = watchers && i % 3 !== 0;   // the deepest dread: two in three sit on the rail
          if (onRail) { const R = RAIL[i % RAIL.length]; V.set(R[0], 1.1, R[1]); ship.root.localToWorld(V); b.sit = { x: V.x, y: V.y, z: V.z, rail: true }; b.want = 1; }
          else if (b.sit && b.sit.rail) { b.sit = null; b.want = 0; }
          else if (b.next <= 0) {
            if (b.want) { b.want = 0; b.next = crowish ? rnd(5, 12) : rnd(14, 32); }   // up again
            else if (b.anchor) {   // down: a spot on the island's ground, not too near the water
              const D = b.anchor, th = Math.random() * 6.28, rho = shoreR(D, th) * rnd(0.45, 0.9), lx = Math.cos(th) * rho, lz = Math.sin(th) * rho;
              const gy = terrainHeight(D, lx, lz);
              if (gy > 0.4) { b.sit = { x: D.x + lx, y: gy + 0.32, z: D.z + lz }; b.want = 1; b.yawS = Math.random() * 6.28; }
              b.next = crowish ? rnd(30, 80) : rnd(14, 40);
            }
          }
          if (b.want && b.sit && !b.sit.rail && !crowish && Math.hypot(b.sit.x - sx, b.sit.z - sz) < 22) { b.want = 0; b.next = rnd(12, 24); }   // a gull lifts off as the ship comes near
          b.k = clamp(b.k + (b.want ? 1 : -1) * dt / 2.2, 0, 1);
          if (b.k > 0 && b.sit) {
            const e = b.k * b.k * (3 - 2 * b.k);
            x = lerp(x, b.sit.x, e); z = lerp(z, b.sit.z, e); y = lerp(y, b.sit.y, e) + Math.sin(e * Math.PI) * 1.5;
            if (b.k > 0.95) yaw = b.sit.rail || crowish ? Math.atan2(sx - x, sz - z) + (b.sit.rail ? Math.PI * 0.5 * (i % 2 ? 1 : -1) : 0) : b.yawS;   // crows face you; on the rail they face outboard
          } else if (!b.sit) b.k = 0;
        }
      }
      if (visible) {
        nearBird = Math.min(nearBird, Math.hypot(x - sx, z - sz));
        const glide = watchers ? 1 : smoothstep(-0.2, 0.3, Math.sin(t * 0.4 + b.phase * 5));   // now and then they stop flapping and glide
        let fl = Math.sin(t * flap + b.phase) * (frozen < 0.5 && dread < 0.5 ? 0.08 : 0.55) * (0.15 + 0.85 * glide);
        if (b.k > 0.9) fl = -1.25 + (Math.sin(t * 0.37 + b.phase * 7) > 0.995 ? 0.6 : 0);   // sitting: wings folded (now and then one is stretched, on its own clock)
        else if (b.k > 0.05) fl = Math.sin(t * flap * 1.6 + b.phase) * 0.7;   // landing and lifting off: busy wings
        const sc = watchers && !(b.k > 0.5) ? 1.7 : 1.25;
        d.position.set(x, y, z); d.rotation.set(0, yaw, 0); d.scale.set(sc, sc, sc);
        d.rotation.z = 0; d.updateMatrix(); F.body.setMatrixAt(i, d.matrix);
        d.rotation.z = fl; d.updateMatrix(); F.wR.setMatrixAt(i, d.matrix);
        d.scale.set(-sc, sc, sc); d.rotation.z = -fl; d.updateMatrix(); F.wL.setMatrixAt(i, d.matrix);
        d.scale.set(0, 0, 0); d.updateMatrix(); O.body.setMatrixAt(i, d.matrix); O.wR.setMatrixAt(i, d.matrix); O.wL.setMatrixAt(i, d.matrix);
      } else {
        d.scale.set(0, 0, 0); d.position.set(0, -50, 0); d.updateMatrix();
        for (const f of Object.values(this.flocks)) { f.body.setMatrixAt(i, d.matrix); f.wR.setMatrixAt(i, d.matrix); f.wL.setMatrixAt(i, d.matrix); }
      }
    }
    for (const f of Object.values(this.flocks)) for (const m of [f.body, f.wR, f.wL]) m.instanceMatrix.needsUpdate = true;
    this.nearBird = nearBird;   // distance to the closest visible gull (the ambience loop follows it)
    // gull cries (only while they still sound like gulls)
    this.gullTimer -= dt;
    if (this.gullTimer <= 0) {
      this.gullTimer = rnd(4, 10);
      if (dread < 0.3 && nearBird < 70 && !audio.has('gulls')) audio.play('gull', { vol: clamp(1 - nearBird / 80, 0.15, 0.8), rate: rnd(0.9, 1.15) });
    }

    // ================= dolphins =================
    const dolMood = dread < 0.3 ? 'jump' : dread < 0.6 ? 'circle' : dread < 0.85 ? 'ghost' : 'none';
    const pale = smoothstep(0.55, 0.7, dread);
    this.dolMat.color.setRGB(lerp(1, 1.5, pale), lerp(1, 1.5, pale), lerp(1, 1.55, pale));
    if (dolMood === 'jump' || dolMood === 'ghost') {
      this.dolTimer -= dt;
      if (this.dolTimer <= 0 && this.dolphins.every((d) => d.u >= 1) && !this.quiet) {
        this.dolTimer = rnd(55, 120);
        if (Math.random() < 0.45) this.dolTimer = rnd(40, 80);        // often they just don't show up
        else {
          const side = Math.random() < 0.5 ? -1 : 1, off = rnd(10, 20), ahead = rnd(2, 14);
          const bx = sx + rx * side * off + fwdx * ahead, bz = sz + rz * side * off + fwdz * ahead;
          const ang = ship.heading + rnd(-0.4, 0.4), spd = 8;
          const clear = [0, 0.25, 0.5, 0.75, 1, 1.3].every((k) => !this.world.nearest(bx + Math.sin(ang) * spd * 1.5 * k + rx * 7, bz - Math.cos(ang) * spd * 1.5 * k + rz * 7, 5) && !this.world.nearest(bx + Math.sin(ang) * spd * 1.5 * k, bz - Math.cos(ang) * spd * 1.5 * k, 5));
          if (!clear) this.dolTimer = 3;            // land in the way: try again shortly
          else {
          this.dolphins.forEach((d, i) => {
            d.u = -i * 0.28; d.sx = bx + rx * i * 2.4; d.sz = bz + rz * i * 2.4; d.vx = Math.sin(ang) * spd; d.vz = -Math.cos(ang) * spd; d.entered = false; d.exited = false;
          });
          if (dolMood === 'jump' && this.onSpot) this.onSpot('dolphins');
          }
        }
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
      if (!this.circle || Math.hypot(this.circle.x - sx, this.circle.z - sz) > 90) { const c = { x: sx + fwdx * 28 + rx * rnd(-8, 8), z: sz + fwdz * 28 + rz * rnd(-8, 8) }; this.circle = this.world.nearest(c.x, c.z, 12) ? { x: c.x, z: c.z, hidden: true } : c; }
      if (this.circle.hidden) { for (const d of this.dolphins) { d.m.visible = false; d.u = 2; } } else
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

    // ================= flying fish (more in the Reef and Free Cays waters) =================
    if (dread < 0.45) {
      this.fishTimer -= dt;
      if (this.fishTimer <= 0 && this.fish.every((f) => f.u >= 1)) {
        this.fishTimer = rnd(40, 90) * ({ crown: 1.6, free: 0.5, reef: 0.4, lantern: 1.1, drowned: 2 }[ctx.faction] || 1);
        if (this.onSpot) this.onSpot('flyfish');   // the Ship's book sketches it (systems/sealog.js)
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

    // ================= sea turtles =================
    const turtleRate = { free: 1, lantern: 0.6, crown: 0.25 }[ctx.faction] || 0, hr = ctx.sched ? ctx.sched.hour : 12;
    if (turtleRate && dread < 0.4 && hr > 7 && hr < 18) {
      this.turtleTimer -= dt * turtleRate;
      const slot = this.turtles.find((q) => q.life <= 0);
      if (this.turtleTimer <= 0 && slot) {
        this.turtleTimer = rnd(40, 90);
        const side = Math.random() < 0.5 ? -1 : 1, off = rnd(14, 30), ahead = rnd(-5, 30), x = sx + rx * side * off + fwdx * ahead, z = sz + rz * side * off + fwdz * ahead;
        if (!this.world.nearest(x, z, 8)) { slot.life = rnd(22, 40); slot.x = x; slot.z = z; slot.h = rnd(0, 6.28); slot.dive = 0; slot.seen = false; }
      }
    }
    for (const q of this.turtles) {
      if (q.life <= 0) { q.m.visible = false; continue; }
      q.life -= dt; q.h += Math.sin(t * 0.3 + q.x) * 0.06 * dt;
      q.x += Math.sin(q.h) * 0.55 * dt; q.z -= Math.cos(q.h) * 0.55 * dt;
      const near = Math.hypot(q.x - sx, q.z - sz) < 9;
      q.dive = Math.min(1, Math.max(0, q.dive + (near || q.life < 3 ? dt * 0.8 : -dt * 0.8)));
      q.m.visible = q.dive < 0.95;
      q.m.position.set(q.x, waveHeight(q.x, q.z, t, wave) - 0.05 - q.dive * 1.1 + Math.sin(t * 1.4 + q.x) * 0.04, q.z);
      q.m.rotation.set(0, q.h + Math.PI, Math.sin(t * 0.8 + q.z) * 0.06);
      if (!q.seen && Math.hypot(q.x - sx, q.z - sz) < 40) { q.seen = true; if (this.onSpot) this.onSpot('turtles'); }
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
    this.life.update(dt, t, ctx);
  }

  /** the whale is solid while its back is out of the water; a turtle's shell too */
  solids(out) {
    if (this.whaleT >= 0 && this.whaleData && this.whale.visible && this.whale.position.y > -1.9) {
      const w = this.whaleData, a = this.whale.rotation.y;
      out.push({ x: w.x, z: w.z, ax: Math.sin(a), az: Math.cos(a), hl: 6, r: 2.2 });
    }
    for (const q of this.turtles) if (q.life > 0 && q.m.visible && q.m.position.y > -0.4) out.push({ x: q.x, z: q.z, r: 0.9 });
    return out;
  }

  updateWhale(dt, t, ctx, fwdx, fwdz, rx, rz) {
    const { ship, dread, wave, audio } = ctx;
    const sx = ship.pos.x, sz = ship.pos.z;
    const showWhale = dread < 0.7, showShadow = dread >= 0.7;

    // the whale migration: on Thursdays the whales pass often, every one of them heading east
    const mig = !!(ctx.sched && ctx.sched.wd === 3 && ctx.sched.hour >= 7 && ctx.sched.hour < 18);
    this.whaleTimer -= dt;
    if (mig && this.whaleTimer > 70 && this.whaleT < 0) this.whaleTimer = rnd(8, 40);
    if (showWhale && this.whaleT < 0 && this.whaleTimer <= 0) {
      this.whaleTimer = mig ? rnd(35, 70) : rnd(120, 230);
      const a = mig ? Math.PI / 2 + rnd(-0.5, 0.5) + (Math.random() < 0.5 ? Math.PI * 0.5 : -Math.PI * 0.5) : ship.heading + rnd(-1.2, 1.2), dist = rnd(70, 120);
      this.whaleData = { x: sx + Math.sin(a) * dist, z: sz - Math.cos(a) * dist, h: mig ? Math.PI / 2 + rnd(-0.12, 0.12) : a + rnd(1, 2) * (Math.random() < 0.5 ? 1 : -1), mig };
      this.whaleT = 0; this.spoutT = 2; this.whaleData.spotted = false;
      audio.play('whale', { vol: 0.6 });
    }
    if (this.whaleT >= 0 && this.whaleData) {
      const w = this.whaleData; this.whaleT += dt;
      const T = this.whaleT, DUR = 26;
      w.x += Math.sin(w.h) * 2.2 * dt; w.z -= Math.cos(w.h) * 2.2 * dt;
      if (!w.spotted && T > 3 && Math.hypot(w.x - sx, w.z - sz) < 110) { w.spotted = true; if (this.onSpot) this.onSpot(w.mig ? 'migration' : 'whales'); }
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
      this.shadowTimer = rnd(80, 150);
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
