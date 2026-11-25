import * as THREE from 'three';
import { mulberry32, smoothstep, lerp } from './util.js';
import { U, psxMaterial } from './psx.js';
const C_SUN_NIGHT = new THREE.Color(0.3, 0.38, 0.7), C_SUN_DREAD = new THREE.Color(1, 0.4, 0.85);   // made once (task R6)

const R = 900;
const GREY_TOP = new THREE.Color('#8a98a6');

const STAR_VS = `attribute float aSize; attribute vec3 aColor; attribute float aPhase; attribute float aCross; attribute float aRank; attribute float aBand;
uniform float uOpacity; uniform float uTime; uniform float uTwinkle; uniform float uDens; uniform float uBandK;
varying vec3 vC; varying float vA; varying float vX;
void main(){
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize;
  if (aRank > (aBand > 0.5 ? uBandK : uDens)) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; }   // this night's sky is thinner: the stars with the highest rank are not there
  float s = floor(fract(sin(floor(uTime * 1.5 + aPhase * 9.0) * 12.9898 + aPhase * 78.233) * 43758.5453) * 3.0);   // stepped flicker, three levels
  vA = uOpacity * (1.0 - 0.28 * s * uTwinkle);
  vC = aColor; vX = aCross;
}`;
const STAR_FS = `varying vec3 vC; varying float vA; varying float vX;
void main(){
  if (vX > 0.5) { vec2 d = abs(gl_PointCoord - 0.5); if (min(d.x, d.y) > 0.08) discard; }   // a pixel plus sign
  gl_FragColor = vec4(vC, vA);
}`;

// the day: four moods of weather-less sky, one a day (the mood tints only the zenith; the horizon keeps the fog's colour so the sea meets it)
const DAY_MOODS = [
  { name: 'Clear',     top: '#1c62ea', tk: 0.75, clouds: 7,  tall: 1.0, cirrus: 0.5 },
  { name: 'Hazy',      top: '#b8d0e6', tk: 0.85,  clouds: 12, tall: 0.75, cirrus: 1.0 },
  { name: 'Bright',    top: '#58aaf2', tk: 0.75,  clouds: 9,  tall: 1.1, cirrus: 0.7 },
  { name: 'Towering',  top: '#2a56a8', tk: 0.7,  clouds: 16, tall: 1.8, cirrus: 0.25 },
];

// The night skies. Four moods of one sky (theme "Calm"): a thin field of stars in tiers, a tilted milky way with a dark dust lane,
// a few pixel-cross stars and an eight-sided ring round the moon. Only the colour differs, slightly. One of them is up each night.
const NIGHT_SKIES = [
  { name: 'Calm',   bg: '#9fb0d8', tier: '#f2f4ff', c0: '#ffd9a0', c1: '#9fb8ff', warm: 0.30, halo: '#aebcf0', yaw: 0.0, tilt: 1.0 },
  { name: 'Amber',  bg: '#b8b0c8', tier: '#fff4e0', c0: '#ffcf90', c1: '#b0baff', warm: 0.45, halo: '#f0e0b0', yaw: 1.6, tilt: 0.9 },
  { name: 'Teal',   bg: '#98b8c8', tier: '#eafaff', c0: '#c0f0e8', c1: '#88a8ff', warm: 0.20, halo: '#a8e0e0', yaw: 3.4, tilt: 1.1 },
  { name: 'Violet', bg: '#a8a0d0', tier: '#f4eeff', c0: '#f0c8ff', c1: '#90a0f0', warm: 0.25, halo: '#c0b0f0', yaw: 5.0, tilt: 0.95 },
];

// how full the sky is on a given night: the share of the field that shows and the share of the milky way. It does not follow the colour,
// so a lush night and a bare one come in any colour. Mostly middling; some nights hardly any stars, some a whole band.
const RICHNESS = [[1, 1], [0.6, 0.5], [0.35, 0], [0.12, 0], [0.75, 0], [0.45, 0.25], [0.9, 0.7], [0.22, 0], [0.55, 0], [1, 0.45]];
const nightHash = (n) => { let h = (n | 0) * 374761393 + 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0); };

// builds the star points (and the moon's halo) for one sky. v < 0: the old sky; else an index into NIGHT_SKIES. pts = the old 260 white stars.
function buildStars(v, pts, dir) {
  const P = [], Cc = [], S = [], Ph = [], X = [], Rk = [], Bd = [];
  const r2 = mulberry32(7 + (v + 1) * 101);
  const col = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
  const add = (p, c, size, cross = 0, rank = r2(), band = 0) => { P.push(...p); Cc.push(...c); S.push(size); Ph.push(r2()); X.push(cross); Rk.push(rank); Bd.push(band); };
  let halo = null;
  if (v < 0) {
    for (let i = 0; i < pts.length; i += 3) add([pts[i], pts[i + 1], pts[i + 2]], [1, 1, 1], 2);
  } else {
    const K = NIGHT_SKIES[v], bgc = col(K.bg), tc = col(K.tier), gc = col('#ffe2a0'), w = col(K.c0), bl = col(K.c1), R96 = R * 0.96;
    for (let i = 0; i < 130; i++) add(dir(r2() * 6.2832, 0.05 + r2() * 1.45), bgc, 2);
    for (let i = 0; i < 24; i++) add(dir(r2() * 6.2832, 0.1 + r2() * 1.4), tc, 3, 0, r2() * 0.6);   // the brighter ones are the last to go
    for (let i = 0; i < 8; i++) add(dir(r2() * 6.2832, 0.15 + r2() * 1.2), gc, 3, 0, r2() * 0.5);
    for (let i = 0; i < 6; i++) add(dir(r2() * 6.2832, 0.3 + r2() * 1.0), tc, 9, 1, r2() * 0.45);
    const ct = Math.cos(K.tilt), st = Math.sin(K.tilt), cy = Math.cos(K.yaw), sy = Math.sin(K.yaw);
    const gauss = () => (r2() + r2() + r2() + r2() - 2) * 0.9;
    for (let i = 0; i < 2000; i++) {
      const a = r2() * 6.2832, o = gauss() * 0.15;
      if (Math.abs(o) < 0.03) continue;   // the dust lane
      let x = Math.cos(a), y = Math.sin(a) * ct - st * o, z = Math.sin(a) * st + ct * o;
      const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l;
      if (y < 0.03) continue;
      const rx = x * cy - z * sy, rz = x * sy + z * cy;
      const core = Math.exp(-Math.pow((a - 1.57) / 0.9, 2));   // brighter and warmer round the core
      const c = r2() < K.warm + core * 0.4 ? w : bl, f = 0.4 + 0.5 * core;
      add([rx * R96, y * R96, rz * R96], [c[0] * f, c[1] * f, c[2] * f], r2() < 0.1 ? 3 : 2, 0, r2(), 1);
    }
    halo = { r0: 30, r1: 37, color: new THREE.Color(K.halo).getHex(), opacity: 0.2 };
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('aColor', new THREE.Float32BufferAttribute(Cc, 3));
  geo.setAttribute('aSize', new THREE.Float32BufferAttribute(S, 1));
  geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(Ph, 1));
  geo.setAttribute('aCross', new THREE.Float32BufferAttribute(X, 1));
  geo.setAttribute('aRank', new THREE.Float32BufferAttribute(Rk, 1));
  geo.setAttribute('aBand', new THREE.Float32BufferAttribute(Bd, 1));
  return { geo, halo };
}

export class Sky {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    // gradient dome
    this.domeMat = new THREE.ShaderMaterial({
      uniforms: { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uFogC: { value: new THREE.Color() }, uGlow: { value: new THREE.Color('#ff6a7a') }, uGlowK: { value: 0 }, uSunXZ: { value: new THREE.Vector2(0, -1) },
        uBank: { value: 0 }, uBankDir: { value: new THREE.Vector2(0, -1) }, uBankC: { value: new THREE.Color('#363c46') }, uT: { value: 0 },
        uPaint: { value: 0 }, uStreak: { value: 0 }, uCov: { value: 0.3 }, uOff: { value: new THREE.Vector2() }, uWA: { value: 0 },
        uCLit: { value: new THREE.Color('#ffffff') }, uCShade: { value: new THREE.Color('#a0a8b8') } },
      vertexShader: 'varying float vY; varying vec2 vXZ; void main(){ vec3 n = normalize(position); vY = n.y; vXZ = n.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      // seven bands with an ordered-dither seam between them (STYLE 2: no smooth gradients; G2). Below the horizon the dome is the fog:
      // where the sea ends (seen from high up) there is no seam (visual QA 2026-11-19). The storm bank and the painted clouds (?clouds=b|c,
      // 2026-11-25) are drawn here too, so they are made of the sky's own colours and cannot stand apart from it.
      fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uFogC; uniform vec3 uGlow; uniform float uGlowK; uniform vec2 uSunXZ;
uniform float uBank; uniform vec2 uBankDir; uniform vec3 uBankC; uniform float uT;
uniform float uPaint; uniform float uStreak; uniform float uCov; uniform vec2 uOff; uniform float uWA; uniform vec3 uCLit; uniform vec3 uCShade;
varying float vY; varying vec2 vXZ;
float b2(vec2 a){ return fract(dot(a, vec2(0.5, a.y * 0.75))); } float b4(vec2 a){ a = floor(a); return b2(floor(0.5 * a)) * 0.25 + b2(a); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
void main(){
  float dth = b4(gl_FragCoord.xy) - 0.5;
  float t = pow(clamp(vY,0.0,1.0), 0.5); float b = floor(t * 7.0 + dth * 0.4 + 0.5) / 7.0; vec3 c = mix(uHorizon, uTop, clamp(b, 0.0, 1.0));
  float g = uGlowK * (1.0 - smoothstep(0.0, 0.34, vY)) * (0.3 + 0.7 * max(0.0, dot(normalize(vXZ + 1e-4), uSunXZ))); float q = floor(g * 4.0 + dth * 0.5 + 0.5) / 4.0; c = mix(c, uGlow, clamp(q, 0.0, 1.0) * 0.8);
  if (uPaint > 0.5 && vY > 0.0) {   // painted clouds: noise on a plane overhead, three tones, dithered edges, thinning into the horizon haze
    vec2 p = vXZ / (vY + 0.14) * 1.5;
    float ca = cos(uWA), sa = sin(uWA); p = vec2(ca * p.x + sa * p.y, -sa * p.x + ca * p.y);
    if (uStreak > 0.5) p *= vec2(0.32, 1.7);
    p += uOff;
    float f = fbm(p), thr = 0.78 - uCov * 0.62;
    float e = f - thr + dth * 0.045;
    if (e > 0.0) {
      float s = fbm(p + vec2(uSunXZ.x, -uSunXZ.y) * 0.18 + vec2(0.0, 0.12));
      float lit = mix(clamp((f - s) * 7.0 + 0.55, 0.0, 1.0), 0.45, uCov * uCov * 0.75);   // under full cover the layer goes flat and even
      vec3 body = mix(uCShade, uCLit, floor(lit * 2.0 + dth * 0.6 + 0.5) / 2.0);
      float edge = step(e, 0.035);
      body = mix(body, mix(c, uCLit, 0.55), edge);
      float k = smoothstep(0.0, 0.2, vY + dth * 0.05);
      c = mix(c, body, floor(k * 3.0 + dth * 0.5 + 0.5) / 3.0);
    }
  }
  if (uBank > 0.0) {   // the storm bank: it rises over the horizon upwind, ragged on top, rain hanging from it to the sea
    float bw = smoothstep(0.15, 0.9, dot(normalize(vXZ + 1e-4), uBankDir));
    float az = atan(vXZ.y, vXZ.x);
    float top = sqrt(uBank) * bw * (0.12 + 0.2 * vn(vec2(az * 5.0 + uT * 0.015, 0.0)) + 0.03 * vn(vec2(az * 11.0, 3.0)));
    c = mix(c, mix(uBankC, uHorizon, 0.45), 0.3 * uBank * bw * (1.0 - smoothstep(0.0, 0.45, vY - top)));   // the sky above it darkens toward it
    if (vY < top + dth * 0.014) {
      float lip = smoothstep(top - 0.035, top, vY);
      vec3 bc = mix(uBankC, mix(uBankC, uHorizon, 0.5), floor(lip * 2.0 + dth * 0.6 + 0.5) / 2.0);
      float shaft = smoothstep(0.45, 0.8, vn(vec2(az * 9.0 + uT * 0.02, 1.0))) * (1.0 - smoothstep(0.0, top * 0.7, vY));   // soft grey veils of rain under the belly
      c = mix(bc, mix(uBankC, uHorizon, 0.3), floor(shaft * 2.0 + dth * 0.7 + 0.5) / 2.0 * 0.7);
      float low = 1.0 - smoothstep(0.0, top * 0.4, vY);   // its foot dissolves into the haze where the sea ends: no hard line above the water
      c = mix(c, uFogC, floor(low * 3.0 + dth * 0.8 + 0.5) / 3.0 * 0.85);
    }
  }
  c = mix(c, uFogC, smoothstep(0.0, -0.04, vY)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 14, 8), this.domeMat);
    dome.renderOrder = -30;
    dome.frustumCulled = false;
    this.group.add(dome);

    // sun / black sun with corona
    this.sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, depthWrite: false, depthTest: false });
    this.sun = new THREE.Mesh(new THREE.CircleGeometry(40, 8), this.sunMat);   // eight sides, like everything else (G2)
    this.sun.renderOrder = -20;
    this.coronaMat = new THREE.MeshBasicMaterial({ color: 0xff70d0, fog: false, depthWrite: false, depthTest: false, transparent: true, opacity: 0 });
    this.corona = new THREE.Mesh(new THREE.RingGeometry(46, 66, 8), this.coronaMat);
    this.corona.renderOrder = -21;
    this.sunHolder = new THREE.Group();
    this.sunHolder.add(this.corona, this.sun);
    this.group.add(this.sunHolder);

    // stars (+ one very wrong constellation: an eye)
    const rng = mulberry32(99), rng0 = rng;
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
    // night skies: ?sky=0 the old one, ?sky=1..4 one of the four moods; without it they take turns, one a night (update)
    const flag = (() => { try { const q = new URLSearchParams(location.search).get('sky'); return q == null ? -1 : +q || 0; } catch (e) { return -1; } })();
    this.skyFlag = flag;
    this.starU = { uOpacity: { value: 0 }, uTime: { value: 0 }, uTwinkle: { value: 1 }, uDens: { value: 1 }, uBandK: { value: 1 } };
    this.starT = 0;
    this.starMat = new THREE.ShaderMaterial({ uniforms: this.starU, vertexShader: STAR_VS, fragmentShader: STAR_FS, transparent: true, fog: false, depthWrite: false, depthTest: true });   // depth-tested: the ship, islands and sea hide them (they were drawn over the ship: owner 2026-11-20); they sit at R 900, inside the far plane
    this.haloMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, depthWrite: false, depthTest: false, transparent: true, opacity: 0 });
    this.halo = new THREE.Mesh(new THREE.RingGeometry(30, 37, 8), this.haloMat);   // an eight-sided ring round the moon
    this.halo.renderOrder = -21; this.halo.frustumCulled = false;
    this.group.add(this.halo);
    this.skySets = [-1, 0, 1, 2, 3].map((v) => {
      const sf = buildStars(v, pts, dir);
      const m = new THREE.Points(sf.geo, this.starMat);
      m.renderOrder = -25; m.frustumCulled = false; m.visible = false;
      this.group.add(m);
      return { pts: m, halo: sf.halo };
    });
    this.skyNow = -2;
    this.setNightSky(flag >= 1 ? flag - 1 : flag === 0 ? -1 : 0);
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
    this.moon = new THREE.Mesh(new THREE.CircleGeometry(26, 8), this.moonMat);
    this.moon.renderOrder = -20;
    this.group.add(this.moon);

    // the cloud look on trial (owner, 2026-11-25: "make them blend with the sky"): ?clouds=a shaded puffs coloured from the sky,
    // b painted into the sky, c painted streaks; without it, the old puffs and the old storm wall
    this.look = (() => { try { const q = new URLSearchParams(location.search).get('clouds'); return q === 'a' || q === 'b' || q === 'c' ? q : 'old'; } catch (e) { return 'old'; } })();
    this.domeMat.uniforms.uPaint.value = this.look === 'b' || this.look === 'c' ? 1 : 0; this.domeMat.uniforms.uStreak.value = this.look === 'c' ? 1 : 0;
    this.puffU = { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uLit: { value: new THREE.Color() }, uShade: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() } };
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
    this.cloudMat = this.look === 'a' ? new THREE.ShaderMaterial({ uniforms: this.puffU, fog: false,   // A: lit top, shaded belly, and the far ones dissolve into the sky behind them
      vertexShader: 'varying vec3 vW; varying float vNY; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vNY = normalize(mat3(modelMatrix) * normal).y; gl_Position = projectionMatrix * viewMatrix * w; gl_Position.xy = floor(gl_Position.xy / gl_Position.w * 160.0 + 0.5) / 160.0 * gl_Position.w; }',
      fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uLit; uniform vec3 uShade; uniform vec3 uCam; varying vec3 vW; varying float vNY;
float b2(vec2 a){ return fract(dot(a, vec2(0.5, a.y * 0.75))); } float b4(vec2 a){ a = floor(a); return b2(floor(0.5 * a)) * 0.25 + b2(a); }
void main(){ float dth = b4(gl_FragCoord.xy) - 0.5; vec3 d = normalize(vW - uCam);
  float t = pow(clamp(d.y, 0.0, 1.0), 0.5); vec3 sky = mix(uHorizon, uTop, floor(t * 7.0 + dth * 0.4 + 0.5) / 7.0);
  float tone = floor(clamp(vNY * 0.9 + 0.55, 0.0, 1.0) * 2.0 + dth * 0.7 + 0.5) / 2.0; vec3 col = mix(uShade, uLit, tone);
  float fade = smoothstep(250.0, 480.0, length(vW.xz - uCam.xz)) * 0.5 + (1.0 - smoothstep(0.02, 0.16, d.y)) * 0.45;
  col = mix(col, sky, floor(clamp(fade, 0.0, 1.0) * 3.0 + dth * 0.6 + 0.5) / 3.0); gl_FragColor = vec4(col, 1.0); }` })
      : psxMaterial({ vertexColors: true, fog: true, key: 'Lc', fragmentColor: { head: '', body: 'diffuseColor.rgb /= max(uLight, 0.05);' } });   // snaps (G2); stage.cloud already darkens them at night
    this.clouds = [];
    const rc = mulberry32(5);   // the clouds past the first sixteen only come with overcast weather, and use their own dice so nothing else moves
    for (let i = 0; i < 28; i++) {
      const rng = i < 16 ? rng0 : rc;
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
      g.userData.base = g.scale.x; g.userData.k = 1;
      this.clouds.push(g);
      scene.add(g);
    }
    this.sunDir = new THREE.Vector3();
    this.dayLook = (() => { try { return new URLSearchParams(location.search).get('day') !== '0'; } catch (e) { return true; } })();   // ?day=0: the old day
    this.dayMoodFlag = (() => { try { const q = new URLSearchParams(location.search).get('daymood'); return q == null ? -1 : (+q || 0) % 4; } catch (e) { return -1; } })();
    this.mood = DAY_MOODS[0]; this.moodSeen = null; this.tallK = 1; this.topK = 0; this.moodTop = new THREE.Color('#2c74e0');
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

  /** which night sky is up: -1 the old one, 0..3 a mood */
  setNightSky(i) {
    if (i === this.skyNow) return;
    this.skyNow = i;
    this.skySets.forEach((k, j) => { k.pts.visible = j === i + 1; });
    this.skyHalo = this.skySets[i + 1].halo;
    if (this.skyHalo) this.haloMat.color.setHex(this.skyHalo.color);
    this.starU.uTwinkle.value = i < 0 ? 0 : 1;
  }

  /** the day's changes: the zenith mood, the dawn and dusk glow, drifting clouds */
  dayUpdate(dt, cam, stage, windDir, tod, fx) {
    if (fx.night != null && fx.night !== this.moodSeen) { this.moodSeen = fx.night; this.mood = DAY_MOODS[this.dayMoodFlag >= 0 ? this.dayMoodFlag : nightHash(fx.night * 3 + 1) % DAY_MOODS.length]; this.moodTop.set(this.mood.top); }
    const m = this.mood, cover = Math.min(1, fx.cover || 0), fair = tod.day * (1 - stage.dread) * (1 - 0.7 * tod.twilight) * (1 - cover);   // rain and cloud: the weather's grey sky, not the day's blue
    this.domeMat.uniforms.uTop.value.lerp(this.moodTop, m.tk * fair).lerp(GREY_TOP, cover * 0.55 * tod.day);   // overcast: the zenith greys over
    // dawn and dusk: a pink band up the horizon, strongest toward the sun, dithered in steps
    const u = this.domeMat.uniforms, sx = Math.sin(tod.sunAz), sz = -Math.cos(tod.sunAz), sl = Math.hypot(sx, sz) || 1;
    u.uSunXZ.value.set(sx / sl, sz / sl);
    u.uGlowK.value = Math.min(1, tod.twilight * 1.1) * (1 - stage.dread) * (1 - 0.5 * (fx.storm || 0));
    // clouds: some days few, some many and tall; they drift with the wind and wrap round you
    this.tallK += (m.tall + (1 - m.tall) * cover - this.tallK) * Math.min(1, dt * 0.25);   // overcast: a low, flat layer
    const wx = Math.sin(windDir) * 1.6, wz = -Math.cos(windDir) * 1.6;
    this.clouds.forEach((g, i) => {
      const want = i < m.clouds + (28 - m.clouds) * cover ? 1 : 0;   // overcast fills the sky
      g.userData.k += (want - g.userData.k) * Math.min(1, dt * 0.4);
      g.position.x += wx * dt; g.position.z += wz * dt;
      const dx = g.position.x - cam.position.x, dz = g.position.z - cam.position.z;
      if (dx * dx + dz * dz > 440 * 440) { g.position.x = cam.position.x - dx * 0.9; g.position.z = cam.position.z - dz * 0.9; g.userData.k = 0; }
      const b = g.userData.base, k = g.userData.k;
      const wide = 1 + 0.8 * cover;   // and the puffs run together
      g.scale.set(b * k * wide, b * k * this.tallK, b * k * wide); g.visible = k > 0.03 && this.look !== 'b' && this.look !== 'c';
    });
    { // the painted clouds' cover and drift (?clouds=b|c)
      const du = this.domeMat.uniforms; du.uCov.value = Math.min(1, (m.clouds / 28) * 1.1 + cover * 0.75); du.uWA.value = windDir;
      du.uOff.value.x += 0.006 * dt; du.uT.value += dt;
    }
    this.cirrusK = m.cirrus;
  }

  update(dt, cam, stage, windDir, tod, fx = {}) {
    if (fx.night != null && fx.night !== this.nightSeen) {   // a new night: the next colour, and how full it is
      this.nightSeen = fx.night;
      if (this.skyFlag < 0) this.setNightSky(((fx.night % 4) + 4) % 4);
      const rf = new URLSearchParams(location.search).get('rich');
      const r = RICHNESS[rf != null ? (+rf || 0) % RICHNESS.length : nightHash(fx.night) % RICHNESS.length];
      this.starU.uDens.value = r[0]; this.starU.uBandK.value = r[1];
    }
    this.group.position.copy(cam.position);
    this.domeMat.uniforms.uTop.value.copy(stage.skyTop);
    this.domeMat.uniforms.uHorizon.value.copy(stage.skyHorizon);
    this.domeMat.uniforms.uFogC.value.copy(stage.fog);
    if (this.dayLook) this.dayUpdate(dt, cam, stage, windDir, tod, fx);

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
    U.uSunColor.value.copy(stage.sun).lerp(C_SUN_NIGHT, 1 - dayish).lerp(C_SUN_DREAD, smoothstep(0.8, 1, stage.dread) * dayish);

    const starOp = Math.max(stage.stars, tod.night * 0.95 * (1 - smoothstep(0.3, 0.48, tod.day)));   // the night's stars go as the day comes (they lingered after sunrise: owner 2026-11-20); the dread's daylight stars stay
    this.starT += dt; this.starU.uTime.value = this.starT; this.starU.uOpacity.value = starOp;
    if (this.skyHalo) { this.halo.position.copy(this.moon.position); this.halo.quaternion.copy(this.moon.quaternion); this.halo.visible = this.moon.visible; this.haloMat.opacity = this.skyHalo.opacity * tod.night * (1 - 0.5 * stage.dread); } else this.halo.visible = false;
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
    if (this.cloudMat.color) this.cloudMat.color.copy(stage.cloud).lerp(stage.sun, Math.min(0.6, tod.twilight * 0.6));
    if (this.look !== 'old') {   // the new looks take their colours from the sky itself: lit like the cloud colour, shaded like the sky low down
      const du = this.domeMat.uniforms, cov = Math.min(1, fx.cover || 0), P = this.puffU;
      const lit = du.uCLit.value.copy(stage.cloud).lerp(stage.sun, Math.min(0.5, tod.twilight * 0.5)).lerp(du.uHorizon.value, 0.22).lerp(GREY_TOP, cov * 0.35);
      du.uCShade.value.copy(du.uHorizon.value).lerp(du.uTop.value, 0.3).multiplyScalar(0.9 - 0.18 * cov).lerp(lit, 0.3);
      P.uTop.value.copy(du.uTop.value); P.uHorizon.value.copy(du.uHorizon.value); P.uLit.value.copy(lit); P.uShade.value.copy(du.uCShade.value); P.uCam.value.copy(cam.position);
    }
    this.highMat.color.copy(stage.cloud).lerp(stage.sun, Math.min(0.7, tod.twilight * 0.8));
    this.highMat.opacity = 0.5 * (this.dayLook ? this.cirrusK * 2 * 0.5 : 1) * (1 - 0.7 * tod.night) * (1 - 0.6 * (fx.storm || 0));
    for (const m of this.high) {
      m.position.x += Math.sin(windDir) * 0.8 * dt; m.position.z += -Math.cos(windDir) * 0.8 * dt;
      const dx = m.position.x - cam.position.x, dz = m.position.z - cam.position.z;
      if (dx * dx + dz * dz > 560 * 560) { m.position.x = cam.position.x - dx * 0.92; m.position.z = cam.position.z - dz * 0.92; }
    }
    { // the storm wall stands on the horizon where the wind comes from
      const k = Math.max(0, Math.min(1, fx.stormWall || 0));
      this.wall.visible = k > 0.02 && this.look === 'old';
      const du = this.domeMat.uniforms; du.uBank.value = this.look === 'old' ? 0 : k;
      if (this.look !== 'old') { const up = windDir + Math.PI; du.uBankDir.value.set(Math.sin(up), -Math.cos(up)); du.uBankC.value.set('#363c46').lerp(stage.skyHorizon, 0.3).multiplyScalar(0.6 + 0.4 * (1 - tod.night)); }
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
