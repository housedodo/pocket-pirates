import * as THREE from 'three';
import { fbm, smoothstep, clamp, mulberry32 } from './util.js';
import { Tentacle } from './horror.js';

// Rolling weather: overcast -> rain -> storms (with lightning), plus fog banks.
// Driven by slow noise, scaled by dread (the further out, the nastier it gets).
const GREY_TOP = new THREE.Color('#56626f'), GREY_HOR = new THREE.Color('#9aa5ad'), GREY_FOG = new THREE.Color('#8c979e');
const RED_SKY = new THREE.Color('#d8402a'), RED_TOP = new THREE.Color('#6a2038');
const WHITE = new THREE.Color(1, 1, 1);
const N = 700, BOX = 36, HEIGHT = 34;

export class Weather {
  constructor(scene) {
    this.scene = scene;
    this.cloud = 0; this.rain = 0; this.storm = 0; this.fog = 0; this.darkness = 0;
    this.flash = 0; this.flashQueue = 0; this.nextFlash = 6;
    this.rainbow = 0; this.prevRain = 0; this.calm = 0; this.redSky = 0; this.stormAhead = 0;
    this.onThunder = null;
    this.phantom = null; this.phantomT = 0;
    this.rng = mulberry32(2024);

    this.px = new Float32Array(N), this.py = new Float32Array(N), this.pz = new Float32Array(N);
    for (let i = 0; i < N; i++) { this.px[i] = (this.rng() - 0.5) * BOX * 2; this.py[i] = this.rng() * HEIGHT; this.pz[i] = (this.rng() - 0.5) * BOX * 2; }
    this.verts = new Float32Array(N * 6);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.verts, 3));
    g.setDrawRange(0, 0);
    this.lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xc4def2, transparent: true, opacity: 0.55, fog: false, depthWrite: false }));
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 5;
    scene.add(this.lines);
  }

  get label() {
    if (this.storm > 0.4) return 'Storm';
    if (this.calm > 0.5) return 'Calm';
    if (this.rain > 0.3) return 'Rain';
    if (this.fog > 0.4) return 'Fog';
    if (this.cloud > 0.55) return 'Overcast';
    return 'Clear';
  }

  update(dt, t, dread, windDir, windStr, cam, tod) {
    const n1 = fbm(t / 190 + 3.1, 0.5, 11), n2 = fbm(t / 260 + 9.7, 0.5, 23);
    const rainMul = 0.55 + 0.45 * dread, stormMul = 0.45 + 0.55 * dread, fogMul = 0.3 + 0.7 * dread;
    const target = this.force || {
      cloud: smoothstep(0.4, 0.62, n1),
      rain: smoothstep(0.55, 0.68, n1) * rainMul,
      storm: smoothstep(0.64, 0.76, n1) * stormMul,
      fog: smoothstep(0.6, 0.78, n2) * fogMul,
    };
    // dead calm: no wind at all for a while, only in fair weather
    const n3 = fbm(t / 150 + 5.3, 0.5, 31);
    const calmT = this.force ? (this.force.calm || 0) : smoothstep(0.64, 0.74, n3) * (1 - smoothstep(0.45, 0.6, n1));
    this.calm += (calmT - this.calm) * Math.min(1, dt * 0.3);
    // what the sky will do in a few minutes: a red evening sky warns of a storm tomorrow
    const ahead = fbm((t + 160) / 190 + 3.1, 0.5, 11);
    this.stormAhead = smoothstep(0.62, 0.74, ahead) * stormMul;
    const dusk = tod.twilight || 0;
    this.redSky += ((this.stormAhead > 0.3 && this.storm < 0.2 ? dusk : 0) - this.redSky) * Math.min(1, dt * 0.5);
    const k = Math.min(1, dt * 0.35);
    for (const key of Object.keys(target)) this[key] += (target[key] - this[key]) * k;
    this.darkness = Math.max(this.storm * 0.9, this.rain * 0.45, this.cloud * 0.25);

    // rainbow after a shower, in daylight
    if (this.prevRain > 0.4 && this.rain <= 0.4 && tod.sunHeight > 0.2 && dread < 0.6) this.rainbow = 1;
    this.prevRain = this.rain;
    this.rainbow = Math.max(0, this.rainbow - dt / 70);

    // lightning
    this.flash = Math.max(0, this.flash - dt * 3.2);
    if (this.storm > 0.35) {
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) {
        this.flash = 1; this.flashQueue = 1;
        this.nextFlash = (5 + this.rng() * 10) / (0.5 + this.storm);
        if (this.onThunder) this.onThunder(0.3 + this.rng() * 2.2);
        if (dread > 0.35 && this.rng() < 0.65) this.showPhantom(cam, t);
      }
    }
    if (this.flashQueue === 1 && this.flash < 0.35) { this.flash = 0.8; this.flashQueue = 0; }
    this.phantomT -= dt;
    if (this.phantom) { this.phantom.root.visible = this.phantomT > 0; if (this.phantom.root.visible) this.phantom.update(t, 1); }

    // rain streaks
    const count = Math.floor(clamp(this.rain, 0, 1) * N);
    this.lines.visible = count > 4;
    if (this.lines.visible) {
      this.lines.geometry.setDrawRange(0, count * 2);
      this.lines.material.opacity = 0.25 + 0.35 * this.rain;
      const wx = Math.sin(windDir) * 0.45 * windStr, wz = -Math.cos(windDir) * 0.45 * windStr;
      const v = this.verts;
      for (let i = 0; i < count; i++) {
        this.py[i] -= 40 * dt;
        if (this.py[i] < 0) { this.py[i] += HEIGHT; this.px[i] = cam.position.x + (this.rng() - 0.5) * BOX * 2; this.pz[i] = cam.position.z + (this.rng() - 0.5) * BOX * 2; }
        if (this.px[i] - cam.position.x > BOX) this.px[i] -= BOX * 2; else if (this.px[i] - cam.position.x < -BOX) this.px[i] += BOX * 2;
        if (this.pz[i] - cam.position.z > BOX) this.pz[i] -= BOX * 2; else if (this.pz[i] - cam.position.z < -BOX) this.pz[i] += BOX * 2;
        const o = i * 6;
        v[o] = this.px[i]; v[o + 1] = this.py[i]; v[o + 2] = this.pz[i];
        v[o + 3] = this.px[i] - wx; v[o + 4] = this.py[i] + 1.2; v[o + 5] = this.pz[i] - wz;
      }
      this.lines.geometry.attributes.position.needsUpdate = true;
    }
  }

  showPhantom(cam, t) {
    if (!this.phantom) {
      this.phantom = new Tentacle(0, 0, this.rng);
      this.phantom.root.scale.setScalar(1.4);
      this.phantom.root.visible = false;
      this.scene.add(this.phantom.root);
    }
    const a = this.rng() * Math.PI * 2, d = 45 + this.rng() * 40;
    this.phantom.root.position.set(cam.position.x + Math.cos(a) * d, 0, cam.position.z + Math.sin(a) * d);
    this.phantomT = 0.4;
  }

  /** Mutates the per-frame stage so everything downstream sees the weather. */
  apply(stage) {
    const c = this.cloud, fogK = Math.max(c * 0.6, this.fog * 0.8, this.rain * 0.5);
    stage.skyTop.lerp(GREY_TOP, c * 0.65);
    stage.skyHorizon.lerp(GREY_HOR, Math.max(c, this.fog) * 0.55);
    stage.fog.lerp(GREY_FOG, fogK * 0.7);
    stage.cloud.multiplyScalar(1 - 0.45 * c);
    stage.light = Math.max(0.28, stage.light * (1 - 0.42 * this.darkness));
    stage.sat *= 1 - 0.25 * c;
    stage.wave *= 1 + 0.7 * this.storm;
    stage.fogFar = Math.max(40, stage.fogFar * (1 - 0.6 * this.fog - 0.25 * this.rain));
    stage.fogNear = Math.max(8, stage.fogNear * (1 - 0.7 * this.fog));
    if (this.redSky > 0.02) { stage.skyHorizon.lerp(RED_SKY, this.redSky * 0.6); stage.skyTop.lerp(RED_TOP, this.redSky * 0.35); stage.fog.lerp(RED_SKY, this.redSky * 0.3); }
    stage.wave *= 1 - 0.75 * this.calm;
    if (this.flash > 0) {
      stage.skyTop.lerp(WHITE, this.flash * 0.75);
      stage.skyHorizon.lerp(WHITE, this.flash * 0.75);
      stage.fog.lerp(WHITE, this.flash * 0.5);
      stage.light += this.flash * 0.8;
    }
  }
}
