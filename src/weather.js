import * as THREE from 'three';
import { fbm, smoothstep, clamp, mulberry32 } from './util.js';

// Rolling weather: overcast -> rain -> storms (with lightning), plus fog banks.
// Driven by slow noise, scaled by dread (the further out, the nastier it gets).
const GREY_TOP = new THREE.Color('#56626f'), GREY_HOR = new THREE.Color('#9aa5ad'), GREY_FOG = new THREE.Color('#8c979e');
const RED_SKY = new THREE.Color('#d8402a'), RED_TOP = new THREE.Color('#6a2038');
const WHITE = new THREE.Color(1, 1, 1);
// light rain: a soft pale-grey drizzle, the sea goes still and milky. A storm: a slate-black sky, a dark heaving sea.
const DRIZZLE_TOP = new THREE.Color('#8e9aa6'), DRIZZLE_HOR = new THREE.Color('#c3cbd0'), DRIZZLE_FOG = new THREE.Color('#b4bec4');
const DRIZZLE_DEEP = new THREE.Color('#4c7d92'), DRIZZLE_SHALLOW = new THREE.Color('#86b8b6');
const STORM_TOP = new THREE.Color('#161c26'), STORM_HOR = new THREE.Color('#3a4450'), STORM_FOG = new THREE.Color('#2c353f');
const STORM_DEEP = new THREE.Color('#132630'), STORM_SHALLOW = new THREE.Color('#2f4c52'), STORM_CLOUD = new THREE.Color('#3a414c');
const STORM_TINT = new THREE.Color('#c8d6e6');
const N = 1400, BOX = 36, HEIGHT = 34;

export class Weather {
  constructor(scene) {
    this.scene = scene;
    this.cloud = 0; this.rain = 0; this.storm = 0; this.fog = 0; this.darkness = 0;
    this.flash = 0; this.flashQueue = 0; this.nextFlash = 6;
    this.prevRain = 0; this.calm = 0; this.redSky = 0; this.stormAhead = 0;
    this.heavy = 0; this.drizzle = 0;   // 0..1: how much of it is a proper storm / gentle rain (see update)
    this.onThunder = null;
    this.noCalm = 0;     // seconds with no natural calm (the wind has just picked up again)
    this.calmHold = 0;   // seconds of dead calm the story has asked for
    this.front = 0; this.frontAhead = 0;   // a scheduled storm front (set by the game from the calendar)
    this.region = { rain: 1, storm: 1, fog: 1 };   // regional character (set from the sector's faction)
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
    const rainMul = (0.55 + 0.45 * dread) * this.region.rain, stormMul = (0.45 + 0.55 * dread) * this.region.storm, fogMul = (0.3 + 0.7 * dread) * this.region.fog;
    const target = this.force || {
      cloud: smoothstep(0.4, 0.62, n1),
      rain: smoothstep(0.55, 0.68, n1) * rainMul,
      storm: smoothstep(0.64, 0.76, n1) * stormMul,
      fog: smoothstep(0.5, 0.82, n2) * fogMul,
    };
    if (!this.force && this.front > 0) {   // the front: cloud first, then rain, then the blow
      target.cloud = Math.max(target.cloud, Math.min(1, this.front * 1.4)); target.rain = Math.max(target.rain, this.front * 0.85); target.storm = Math.max(target.storm, this.front * 0.95);
    }
    // dead calm: no wind at all for a while, only in fair weather
    const n3 = fbm(t / 150 + 5.3, 0.5, 31);
    if (this.calmHold > 0) this.calmHold -= dt;
    if (this.noCalm > 0) this.noCalm -= dt;
    const calmT = this.calmHold > 0 ? 1 : this.noCalm > 0 ? 0 : this.force ? (this.force.calm || 0) : smoothstep(0.64, 0.74, n3) * (1 - smoothstep(0.45, 0.6, n1));
    this.calm += (calmT - this.calm) * Math.min(1, dt * 0.3);
    // what the sky will do in a few minutes: a red evening sky warns of a storm tomorrow
    const ahead = fbm((t + 160) / 190 + 3.1, 0.5, 11);
    this.stormAhead = Math.max(smoothstep(0.62, 0.74, ahead) * stormMul, this.frontAhead * 0.9);
    const dusk = tod.twilight || 0;
    this.redSky += ((this.stormAhead > 0.3 && this.storm < 0.2 ? dusk : 0) - this.redSky) * Math.min(1, dt * 0.5);
    // Two-stage easing: the target is chased by a slow follower, and the weather chases that. The start is an
    // S-curve (a hint first: greying sky, a haze), never a jump. Fog is slowest. A forced weather (title, dev) is fast.
    if (this.force || !this.mid) { this.mid = {}; for (const key of Object.keys(target)) this.mid[key] = this[key]; }
    for (const key of Object.keys(target)) {
      if (this.force) { this[key] += (target[key] - this[key]) * Math.min(1, dt * 0.35); this.mid[key] = this[key]; continue; }
      const r = key === 'fog' ? 0.045 : key === 'storm' ? 0.06 : 0.08;
      this.mid[key] += (target[key] - this.mid[key]) * Math.min(1, dt * r);
      this[key] += (this.mid[key] - this[key]) * Math.min(1, dt * r * 1.4);
    }
    this.darkness = Math.max(this.storm * 0.9, this.rain * 0.45, this.cloud * 0.25);
    this.heavy = smoothstep(0.2, 0.65, this.storm);                       // 0 = light rain, 1 = a proper storm
    this.drizzle = clamp(this.rain * 1.6, 0, 1) * (1 - this.heavy);       // how much of the weather is gentle rain


    // lightning
    this.flash = Math.max(0, this.flash - dt * 3.2);
    if (this.storm > 0.35) {
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) {
        this.flash = 1; this.flashQueue = 1;
        this.nextFlash = (5 + this.rng() * 10) / (0.5 + this.storm);
        if (this.onThunder) this.onThunder(0.3 + this.rng() * 2.2);
      }
    }
    if (this.flashQueue === 1 && this.flash < 0.35) { this.flash = 0.8; this.flashQueue = 0; }

    // rain streaks: light rain is a thin, slow, nearly upright drizzle; a storm is a dense, fast sheet driven sideways by the wind
    const h = this.heavy, wet = Math.max(this.rain, this.storm * 0.8);
    const count = Math.floor(clamp(wet * 1.4, 0, 1) * N * (0.4 + 0.6 * h));
    this.lines.visible = count > 4;
    if (this.lines.visible) {
      this.lines.geometry.setDrawRange(0, count * 2);
      this.lines.material.opacity = (0.4 + 0.2 * wet) * (1 - h) + (0.5 + 0.25 * wet) * h;
      this.lines.material.color.setRGB(0.77 - 0.2 * h, 0.87 - 0.17 * h, 0.95 - 0.13 * h);
      const fall = 26 + 44 * h, len = 0.8 + 1.8 * h, slant = (0.25 + 1.1 * h) * windStr;
      const wx = Math.sin(windDir) * slant, wz = -Math.cos(windDir) * slant;
      const v = this.verts;
      for (let i = 0; i < count; i++) {
        this.py[i] -= fall * dt;
        if (this.py[i] < 0) { this.py[i] += HEIGHT; this.px[i] = cam.position.x + (this.rng() - 0.5) * BOX * 2; this.pz[i] = cam.position.z + (this.rng() - 0.5) * BOX * 2; }
        if (this.px[i] - cam.position.x > BOX) this.px[i] -= BOX * 2; else if (this.px[i] - cam.position.x < -BOX) this.px[i] += BOX * 2;
        if (this.pz[i] - cam.position.z > BOX) this.pz[i] -= BOX * 2; else if (this.pz[i] - cam.position.z < -BOX) this.pz[i] += BOX * 2;
        const o = i * 6;
        v[o] = this.px[i]; v[o + 1] = this.py[i]; v[o + 2] = this.pz[i];
        v[o + 3] = this.px[i] - wx * len; v[o + 4] = this.py[i] + len; v[o + 5] = this.pz[i] - wz * len;
      }
      this.lines.geometry.attributes.position.needsUpdate = true;
    }
  }

  /** Mutates the per-frame stage so everything downstream sees the weather. */
  apply(stage) {
    const c = this.cloud, fogK = Math.max(c * 0.6, this.fog * 0.8, this.rain * 0.5);
    stage.skyTop.lerp(GREY_TOP, c * 0.65);
    stage.skyHorizon.lerp(GREY_HOR, Math.max(c, this.fog) * 0.55);
    stage.fog.lerp(GREY_FOG, fogK * 0.7);
    stage.cloud.multiplyScalar(1 - 0.45 * c);
    stage.light *= 1 - 0.3 * this.darkness;   // weather only darkens (it used to hold a floor of 0.28 that also lit up clear nights)
    stage.sat *= 1 - 0.25 * c;
    stage.wave *= (1 - 0.25 * this.drizzle) * (1 + 1.3 * this.storm);   // rain flattens the swell; a storm heaps it up
    // light rain: pale grey sky, a milky, quiet sea, soft mist. A storm: near-black sky, dark slate water, cold flat light, scudding clouds
    const dz = this.drizzle, st = this.heavy;
    stage.skyTop.lerp(DRIZZLE_TOP, dz * 0.85); stage.skyHorizon.lerp(DRIZZLE_HOR, dz * 0.8); stage.fog.lerp(DRIZZLE_FOG, dz * 0.8);
    stage.deep.lerp(DRIZZLE_DEEP, dz * 0.6); stage.shallow.lerp(DRIZZLE_SHALLOW, dz * 0.55); stage.cloud.lerp(DRIZZLE_HOR, dz * 0.6);
    stage.skyTop.lerp(STORM_TOP, st * 0.75); stage.skyHorizon.lerp(STORM_HOR, st * 0.6); stage.fog.lerp(STORM_FOG, st * 0.6);   // the horizon stays lighter: something to steer by
    stage.deep.lerp(STORM_DEEP, st * 0.5); stage.shallow.lerp(STORM_SHALLOW, st * 0.45); stage.cloud.lerp(STORM_CLOUD, st * 0.8);   // a dark sea, but you can still read the waves
    stage.tint.lerp(STORM_TINT, st * 0.5);
    stage.light *= (1 - 0.1 * dz) * (1 - 0.18 * st);
    stage.sat *= (1 - 0.3 * dz) * (1 - 0.35 * st);
    stage.vig += 0.15 * st;
    stage.fogFar *= (1 - 0.4 * dz) * (1 - 0.2 * st); stage.fogNear *= (1 - 0.5 * dz) * (1 - 0.3 * st);   // a storm still lets you see islands and lighthouses   // drizzle: a soft mist that swallows the far islands
    stage.cloudSpeed = 1 + 5 * st;
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
