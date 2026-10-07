import * as THREE from 'three';
import { TILE, tileUV } from './textures.js';
import { lerp } from './util.js';

// Tiny flat-shaded triangle soup builder. Lighting is "baked" into vertex colours
// (PS1 style), and every vertex also gets a second "dark" colour for the eerie mood.
const LIGHT = new THREE.Vector3(0.45, 0.8, 0.35).normalize();
const _v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
const _n = new THREE.Vector3(), _e1 = new THREE.Vector3(), _e2 = new THREE.Vector3(), _c = new THREE.Vector3();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _col = new THREE.Color();

export function darken(c, out = new THREE.Color()) {
  const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
  return out.setRGB(lerp(l, c.r, 0.3) * 0.5, lerp(l, c.g, 0.3) * 0.46, lerp(l, c.b, 0.3) * 0.6 + 0.04);
}
const toColor = (c) => (c instanceof THREE.Color ? c : _col.set(c));

export class Builder {
  constructor() {
    this.p = []; this.c = []; this.cb = []; this.uv = [];
    this.stack = [new THREE.Matrix4()];
    this.doubleSided = false;
    this.darkSame = false; // true: the dark-mood colour equals the normal colour (for dark-only props)
    this.ambient = 0.5;   // higher = flatter lighting (sails, flags)
    this.ref = null;       // when set, faces are wound to point away from this local point
    this.uvFn = null;      // optional (worldPos) => [u, v] override (terrain)
  }
  get m() { return this.stack[this.stack.length - 1]; }
  push(x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = sx, sz = sx, rx = 0, rz = 0) {
    _e.set(rx, ry, rz, 'YXZ');
    _q.setFromEuler(_e);
    _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
    this.stack.push(this.m.clone().multiply(_m));
    return this;
  }
  pop() { this.stack.pop(); return this; }
  orient(ref) { this.ref = ref ? new THREE.Vector3(...ref) : null; return this; }

  tri(a, b, c, col, tile = TILE.white, uvs = [[0, 0], [1, 0], [0.5, 1]], dark = null) {
    const M = this.m;
    _v[0].set(a[0], a[1], a[2]);
    _v[1].set(b[0], b[1], b[2]);
    _v[2].set(c[0], c[1], c[2]);
    if (this.ref) {
      _e1.subVectors(_v[1], _v[0]); _e2.subVectors(_v[2], _v[0]);
      _n.crossVectors(_e1, _e2);
      _c.copy(_v[0]).add(_v[1]).add(_v[2]).multiplyScalar(1 / 3).sub(this.ref);
      if (_n.dot(_c) < 0) { _v[1].set(c[0], c[1], c[2]); _v[2].set(b[0], b[1], b[2]); uvs = [uvs[0], uvs[2], uvs[1]]; }
    }
    for (const v of _v) v.applyMatrix4(M);
    _e1.subVectors(_v[1], _v[0]); _e2.subVectors(_v[2], _v[0]);
    _n.crossVectors(_e1, _e2);
    if (_n.lengthSq() < 1e-12) return this;
    _n.normalize();
    let d = _n.dot(LIGHT);
    if (this.doubleSided) d = Math.abs(d);
    const shade = Math.min(1.05, this.ambient + (1.05 - this.ambient) * Math.max(0, d) + 0.08 * _n.y);
    const cc = toColor(col);
    const cr = cc.r * shade, cg = cc.g * shade, cbl = cc.b * shade;
    const dc = dark ? toColor(dark) : this.darkSame ? cc : darken(cc);
    const dr = dc.r * shade, dg = dc.g * shade, db = dc.b * shade;
    const { u0, v0, du } = tileUV(tile);
    for (let i = 0; i < 3; i++) {
      this.p.push(_v[i].x, _v[i].y, _v[i].z);
      this.c.push(cr, cg, cbl);
      this.cb.push(dr, dg, db);
      if (this.uvFn) { const [u, v] = this.uvFn(_v[i]); this.uv.push(u, v); }
      else this.uv.push(u0 + uvs[i][0] * du, v0 + uvs[i][1] * du);
    }
    return this;
  }
  quad(a, b, c, d, col, tile = TILE.white, dark = null) {
    this.tri(a, b, c, col, tile, [[0, 0], [1, 0], [1, 1]], dark);
    this.tri(a, c, d, col, tile, [[0, 0], [1, 1], [0, 1]], dark);
    return this;
  }
  // box with its base-centre at (x,y,z)
  box(x, y, z, w, h, d, col, tile = TILE.white, topTile = tile, topCol = col) {
    const hw = w / 2, hd = d / 2, y1 = y + h;
    this.quad([x - hw, y, z + hd], [x + hw, y, z + hd], [x + hw, y1, z + hd], [x - hw, y1, z + hd], col, tile);
    this.quad([x + hw, y, z - hd], [x - hw, y, z - hd], [x - hw, y1, z - hd], [x + hw, y1, z - hd], col, tile);
    this.quad([x + hw, y, z + hd], [x + hw, y, z - hd], [x + hw, y1, z - hd], [x + hw, y1, z + hd], col, tile);
    this.quad([x - hw, y, z - hd], [x - hw, y, z + hd], [x - hw, y1, z + hd], [x - hw, y1, z - hd], col, tile);
    this.quad([x - hw, y1, z + hd], [x + hw, y1, z + hd], [x + hw, y1, z - hd], [x - hw, y1, z - hd], topCol, topTile);
    return this;
  }
  // (tapered) cylinder / cone, base at (x,y,z)
  cyl(x, y, z, r0, r1, h, segs, col, tile = TILE.white, cap = true, capCol = col) {
    const y1 = y + h;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
      const p0 = [x + Math.cos(a0) * r0, y, z + Math.sin(a0) * r0];
      const p1 = [x + Math.cos(a1) * r0, y, z + Math.sin(a1) * r0];
      const q1 = [x + Math.cos(a1) * r1, y1, z + Math.sin(a1) * r1];
      const q0 = [x + Math.cos(a0) * r1, y1, z + Math.sin(a0) * r1];
      const u0 = i / segs, u1 = (i + 1) / segs;
      if (r1 < 0.001) this.tri(p1, p0, [x, y1, z], col, tile, [[u1, 0], [u0, 0], [(u0 + u1) / 2, 1]]);
      else {
        this.tri(p1, p0, q0, col, tile, [[u1, 0], [u0, 0], [u0, 1]]);
        this.tri(p1, q0, q1, col, tile, [[u1, 0], [u0, 1], [u1, 1]]);
      }
      if (cap && r1 >= 0.001) this.tri([x, y1, z], q0, q1, capCol, tile, [[0.5, 0.5], [0, 0], [1, 0]]);
    }
    return this;
  }
  // chunky faceted rock/bush from a jittered icosahedron
  blob(x, y, z, rx, ry, rz, col, tile = TILE.white, jitter = 0.22, seed = 1) {
    const g = BLOB.attributes.position;
    for (let i = 0; i < g.count; i += 3) {
      const pts = [];
      for (let k = 0; k < 3; k++) {
        const px = g.getX(i + k), py = g.getY(i + k), pz = g.getZ(i + k);
        const j = 1 + (Math.sin((px * 12.9898 + py * 78.233 + pz * 37.719 + seed) * 43758.5453) % 1) * jitter;
        pts.push([x + px * rx * j, y + py * ry * j, z + pz * rz * j]);
      }
      this.tri(pts[0], pts[1], pts[2], col, tile);
    }
    return this;
  }
  // gable roof: ridge along z, base at y
  gable(x, y, z, w, h, d, col, tile, endCol) {
    const hw = w / 2, hd = d / 2;
    const a = [x - hw, y, z + hd], b = [x + hw, y, z + hd], c = [x + hw, y, z - hd], e = [x - hw, y, z - hd];
    const r0 = [x, y + h, z + hd], r1 = [x, y + h, z - hd];
    this.quad(b, c, r1, r0, col, tile);
    this.quad(e, a, r0, r1, col, tile);
    this.tri(a, b, r0, endCol, TILE.wall, [[0, 0], [1, 0], [0.5, 0.8]]);
    this.tri(c, e, r1, endCol, TILE.wall, [[0, 0], [1, 0], [0.5, 0.8]]);
    return this;
  }
  get empty() { return this.p.length === 0; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('colorB', new THREE.Float32BufferAttribute(this.cb, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return g;
  }
}

const BLOB = new THREE.IcosahedronGeometry(1, 0); // already non-indexed (flat faces)
