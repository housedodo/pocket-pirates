import * as THREE from 'three';
import { mulberry32, smoothstep, lerp } from './util.js';
import { U } from './psx.js';

const R = 900;

export class Sky {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    // gradient dome
    this.domeMat = new THREE.ShaderMaterial({
      uniforms: { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() } },
      vertexShader: 'varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uTop; uniform vec3 uHorizon; varying float vY; void main(){ float t = pow(clamp(vY,0.0,1.0), 0.5); gl_FragColor = vec4(mix(uHorizon, uTop, t), 1.0); }',
      side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 14, 8), this.domeMat);
    dome.renderOrder = -30;
    dome.frustumCulled = false;
    this.group.add(dome);

    // sun / black sun with corona
    this.sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, depthWrite: false, depthTest: false });
    this.sun = new THREE.Mesh(new THREE.CircleGeometry(40, 16), this.sunMat);
    this.sun.renderOrder = -20;
    this.coronaMat = new THREE.MeshBasicMaterial({ color: 0xff70d0, fog: false, depthWrite: false, depthTest: false, transparent: true, opacity: 0 });
    this.corona = new THREE.Mesh(new THREE.RingGeometry(46, 66, 20), this.coronaMat);
    this.corona.renderOrder = -21;
    this.sunHolder = new THREE.Group();
    this.sunHolder.add(this.corona, this.sun);
    this.group.add(this.sunHolder);

    // stars (+ one very wrong constellation: an eye)
    const rng = mulberry32(99);
    const pts = [], eye = [];
    const dir = (az, el, r = R * 0.96) => [Math.sin(az) * Math.cos(el) * r, Math.sin(el) * r, -Math.cos(az) * Math.cos(el) * r];
    for (let i = 0; i < 260; i++) pts.push(...dir(rng() * Math.PI * 2, 0.08 + rng() * 1.4));
    const EYE_AZ = 0.0, EYE_EL = 0.62;
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2;
      eye.push(...dir(EYE_AZ + Math.cos(a) * 0.34, EYE_EL + Math.sin(a) * 0.1));
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      eye.push(...dir(EYE_AZ + Math.cos(a) * 0.035, EYE_EL + Math.sin(a) * 0.055));
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false, depthTest: false });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.renderOrder = -25;
    this.stars.frustumCulled = false;
    this.group.add(this.stars);
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.Float32BufferAttribute(eye, 3));
    this.eyeMat = new THREE.PointsMaterial({ color: 0xffd0ff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false, depthTest: false });
    this.eyeStars = new THREE.Points(eg, this.eyeMat);
    this.eyeStars.renderOrder = -25;
    this.eyeStars.frustumCulled = false;
    this.eyeGroup = new THREE.Group();
    this.eyeGroup.rotation.order = 'YXZ';
    this.eyeTilt = 0;
    this.eyeGroup.add(this.eyeStars);
    this.group.add(this.eyeGroup);
    this.eyeYaw = 0;
    // a second sun for the time-loop effect (two suns setting at once)
    this.sun2 = new THREE.Group();
    this.sun2.add(new THREE.Mesh(this.corona.geometry, this.coronaMat), new THREE.Mesh(this.sun.geometry, new THREE.MeshBasicMaterial({ color: 0xffe4ff, fog: false, depthWrite: false, depthTest: false })));
    this.sun2.children.forEach((m, i) => { m.renderOrder = -21 + i; });
    this.sun2.visible = false;
    this.group.add(this.sun2);

    // moon
    this.moonMat = new THREE.MeshBasicMaterial({ color: 0xdfe8ff, fog: false, depthWrite: false, depthTest: false });
    this.moon = new THREE.Mesh(new THREE.CircleGeometry(26, 14), this.moonMat);
    this.moon.renderOrder = -20;
    this.group.add(this.moon);

    // clouds: flat-bottomed low-poly puffs that drift with the wind
    const ico = new THREE.IcosahedronGeometry(1, 0);
    const pos = ico.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i += 3) {
      const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      const v = y > 0.1 ? 1 : 0.72;
      for (let k = 0; k < 3; k++) cols.set([v, v, v], (i + k) * 3);
    }
    ico.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    this.cloudMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
    this.clouds = [];
    for (let i = 0; i < 16; i++) {
      const g = new THREE.Group();
      const lumps = 3 + Math.floor(rng() * 3);
      for (let k = 0; k < lumps; k++) {
        const m = new THREE.Mesh(ico, this.cloudMat);
        m.scale.set(8 + rng() * 8, 3 + rng() * 2.5, 6 + rng() * 5);
        m.position.set((k - lumps / 2) * 9 + rng() * 4, rng() * 2, rng() * 6);
        g.add(m);
      }
      const a = rng() * Math.PI * 2, d = 120 + rng() * 300;
      g.position.set(Math.cos(a) * d, 55 + rng() * 40, Math.sin(a) * d);
      g.scale.setScalar(1.2 + rng());
      g.userData.off = new THREE.Vector3(g.position.x, g.position.y, g.position.z);
      this.clouds.push(g);
      scene.add(g);
    }
    this.sunDir = new THREE.Vector3();

    // a high layer: thin streaks of cirrus far above the puffs, drifting slowly
    this.highMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, fog: false, depthWrite: false });
    this.high = [];
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(ico, this.highMat);
      const a = rng() * Math.PI * 2, d = 150 + rng() * 380;
      m.position.set(Math.cos(a) * d, 150 + rng() * 40, Math.sin(a) * d);
      m.scale.set(40 + rng() * 50, 0.6, 4 + rng() * 5); m.rotation.y = rng() * 0.6;
      this.high.push(m); scene.add(m);
    }
    // the storm wall: a dark, towering bank on the horizon, upwind. It rises over the horizon as a storm or a front comes near
    this.wallMat = new THREE.MeshBasicMaterial({ color: 0x2a3038, fog: false });
    const rnd = new THREE.IcosahedronGeometry(1, 1);
    this.wall = new THREE.Group();
    for (let row = 0; row < 2; row++) for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(rnd, this.wallMat);
      m.position.set((i - 8) * 30 + rng() * 14, row ? 92 + rng() * 20 : 62 + rng() * 10, row * 18 + rng() * 12);   // a bank of cloud in the sky, not land
      m.scale.set(30 + rng() * 22, row ? 22 + rng() * 14 : 16 + rng() * 8, 22 + rng() * 10);
      this.wall.add(m);
    }
    // grey curtains of rain hanging from it down to the sea
    this.curtainMat = new THREE.MeshBasicMaterial({ color: 0x5a626c, transparent: true, opacity: 0.4, fog: false, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(30 + rng() * 30, 70), this.curtainMat);
      c.position.set((i - 3) * 62 + rng() * 20, 28, 6 + rng() * 10); c.rotation.z = (rng() - 0.5) * 0.25;
      this.wall.add(c);
    }
    this.wall.visible = false; scene.add(this.wall);

    // shooting star
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
    this.meteorMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false, depthTest: false, depthWrite: false });
    this.meteor = new THREE.Line(mg, this.meteorMat);
    this.meteor.frustumCulled = false; this.meteor.renderOrder = -19;
    this.group.add(this.meteor);
    this.meteorLife = 0; this.meteorTimer = 6;
    this.mHead = new THREE.Vector3(); this.mVel = new THREE.Vector3();
  }

  update(dt, cam, stage, windDir, tod, fx = {}) {
    this.group.position.copy(cam.position);
    this.domeMat.uniforms.uTop.value.copy(stage.skyTop);
    this.domeMat.uniforms.uHorizon.value.copy(stage.skyHorizon);

    const place = (obj, az, el) => {
      this.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
      obj.position.copy(this.sunDir).multiplyScalar(R * 0.9);
      obj.lookAt(cam.position);
    };
    place(this.sunHolder, tod.sunAz, tod.sunElev);
    this.sunDirV = this.sunDirV || new THREE.Vector3();
    this.sunDirV.copy(this.sunDir);
    this.sunHolder.visible = tod.sunElev > -0.08;
    this.sunHolder.scale.setScalar(stage.sunSize * (1 + 0.35 * tod.twilight));
    this.sunMat.color.copy(stage.sun);
    this.coronaMat.opacity = smoothstep(0.78, 1.0, stage.dread);
    place(this.moon, tod.moonAz, tod.moonElev);
    const moonDir = this.sunDir.clone();
    this.moon.visible = tod.moonElev > -0.08;
    this.moonMat.color.set('#dfe8ff').lerp(stage.sun, 0.15 * stage.dread);

    // the light that makes glints on the water: sun by day, moon by night
    const dayish = smoothstep(-0.05, 0.12, tod.sunElev);
    U.uSunDir.value.copy(moonDir).lerp(this.sunDirV, dayish).normalize();
    U.uSunColor.value.copy(stage.sun).lerp(new THREE.Color(0.3, 0.38, 0.7), 1 - dayish).lerp(new THREE.Color(1, 0.4, 0.85), smoothstep(0.8, 1, stage.dread) * dayish);

    this.starMat.opacity = Math.max(stage.stars, tod.night * 0.95);
    this.eyeMat.opacity = smoothstep(0.8, 1.0, stage.dread);
    // full dread: the eye turns to stay in front of you, and blinks
    if (fx.eyeYaw != null) {
      const want = -fx.eyeYaw;
      this.eyeYaw += Math.atan2(Math.sin(want - this.eyeYaw), Math.cos(want - this.eyeYaw)) * Math.min(1, dt * 1.5);
      this.eyeMat.size = 3; this.eyeMat.opacity = 1;
      this.blink = (this.blink || 0) - dt;
      if (this.blink < -0.18) this.blink = 3 + Math.random() * 5;
      this.eyeGroup.scale.y = this.blink < 0 ? 0.92 : 1;
      this.eyeTilt += (-0.42 - this.eyeTilt) * Math.min(1, dt * 0.8); // sinks down to stare over the horizon
      this.eyeGroup.rotation.set(this.eyeTilt + (this.blink < 0 ? 0.03 : 0), this.eyeYaw, 0);
    } else { this.eyeYaw *= 0.98; this.eyeTilt *= 0.98; this.eyeGroup.rotation.set(this.eyeTilt, this.eyeYaw, 0); this.eyeGroup.scale.y = 1; this.eyeMat.size = 2; }
    this.sun2.visible = !!fx.sun2;
    if (fx.sun2) {
      const az = tod.sunAz + 1.3, el = Math.max(0.05, Math.min(0.2, tod.sunElev)), d2 = R * 0.9;
      this.sun2.position.set(Math.sin(az) * Math.cos(el) * d2, Math.sin(el) * d2, -Math.cos(az) * Math.cos(el) * d2);
      this.sun2.lookAt(cam.position);
      this.sun2.scale.setScalar(stage.sunSize * 1.2);
    }

    // shooting stars at night (they fall *up* when dread is high)
    this.meteorTimer -= dt;
    if (this.meteorLife <= 0 && this.meteorTimer <= 0 && tod.night > 0.7) {
      const az = Math.random() * Math.PI * 2, el = 0.5 + Math.random() * 0.7, r = R * 0.95;
      const up = stage.dread > 0.65;
      this.mHead.set(Math.sin(az) * Math.cos(el) * r, Math.sin(el) * r, -Math.cos(az) * Math.cos(el) * r);
      this.mVel.set((Math.random() - 0.5) * 600, (up ? 1 : -1) * (200 + Math.random() * 200), (Math.random() - 0.5) * 600);
      this.meteorLife = 0.9; this.meteorTimer = 6 + Math.random() * 12;
      this.meteorMat.color.set(up ? '#ff70d0' : '#ffffff');
    }
    if (this.meteorLife > 0) {
      this.meteorLife -= dt;
      this.mHead.addScaledVector(this.mVel, dt);
      const p = this.meteor.geometry.attributes.position;
      p.setXYZ(0, this.mHead.x, this.mHead.y, this.mHead.z);
      p.setXYZ(1, this.mHead.x - this.mVel.x * 0.14, this.mHead.y - this.mVel.y * 0.14, this.mHead.z - this.mVel.z * 0.14);
      p.needsUpdate = true;
      this.meteorMat.opacity = Math.max(0, this.meteorLife / 0.9);
    } else this.meteorMat.opacity = 0;

    // sunrise and sunset colour the clouds; at night they go dark with the sky
    this.cloudMat.color.copy(stage.cloud).lerp(stage.sun, Math.min(0.6, tod.twilight * 0.6));
    this.highMat.color.copy(stage.cloud).lerp(stage.sun, Math.min(0.7, tod.twilight * 0.8));
    this.highMat.opacity = 0.5 * (1 - 0.7 * tod.night) * (1 - 0.6 * (fx.storm || 0));
    for (const m of this.high) {
      m.position.x += Math.sin(windDir) * 0.8 * dt; m.position.z += -Math.cos(windDir) * 0.8 * dt;
      const dx = m.position.x - cam.position.x, dz = m.position.z - cam.position.z;
      if (dx * dx + dz * dz > 560 * 560) { m.position.x = cam.position.x - dx * 0.92; m.position.z = cam.position.z - dz * 0.92; }
    }
    { // the storm wall stands on the horizon where the wind comes from
      const k = Math.max(0, Math.min(1, fx.stormWall || 0));
      this.wall.visible = k > 0.02;
      if (this.wall.visible) {
        const up = windDir + Math.PI, D = 430;
        this.wall.position.set(cam.position.x + Math.sin(up) * D, -110 + 110 * k, cam.position.z - Math.cos(up) * D);   // rises as the weather comes
        this.wall.rotation.y = -up;
        this.wallMat.color.set('#363c46').lerp(stage.skyHorizon, 0.35).multiplyScalar(0.55 + 0.45 * (1 - tod.night));
        this.curtainMat.color.copy(this.wallMat.color).lerp(stage.skyHorizon, 0.4); this.curtainMat.opacity = 0.45 * k;
      }
    }
  }
}
