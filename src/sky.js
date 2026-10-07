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
    this.group.add(this.eyeStars);

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
  }

  update(dt, cam, stage, windDir, tod) {
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

    this.cloudMat.color.copy(stage.cloud);
    const wx = Math.sin(windDir), wz = -Math.cos(windDir);
    for (const c of this.clouds) {
      c.position.x += wx * 2.5 * dt;
      c.position.z += wz * 2.5 * dt;
      const dx = c.position.x - cam.position.x, dz = c.position.z - cam.position.z;
      if (dx * dx + dz * dz > 460 * 460) { // wrap to the opposite side
        c.position.x = cam.position.x - dx * 0.92;
        c.position.z = cam.position.z - dz * 0.92;
      }
    }
  }
}
