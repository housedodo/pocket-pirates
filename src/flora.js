// Flora (owner, 2026-11-28: "are there variations in the flora? If not, create multiple different vegetations and suggest how they
// should be distributed and which parts should stay bare"; then "keep the suggestions you made"). plantIsland below grows them by
// region, island kind and zone as docs/proposals/world/FLORA.md says; __game.flora(x, z) lays them all out on a raft. Every plant splits as the palms do: what stays in the dark mood (trunks,
// stems, dry leaves) goes to A, the living green and the flowers to B (gone when an island goes dark), a dead version's extras to D.
// Inspiration: the real Caribbean shore and dry islands (sabal and royal palms, sea grape, agave, the kadushi cactus and the wind-bent
// divi-divi of Curacao and Aruba, banana and heliconia in the wet hills, the kapok tree that villages kept as a meeting tree, sea oats and
// beach morning glory on the dunes).
import { TILE } from './textures.js';

const h01 = (x, z, s) => { const v = Math.sin(x * 12.9898 + z * 78.233 + s * 37.719) * 43758.5453; return v - Math.floor(v); };
const pick = (a, k) => a[Math.floor(k * a.length) % a.length];

/** a crown of feather fronds at (px, py, pz): n fronds of length L, drooping by droop, green col (B), with dry ones under it (A) */
function fronds(A, B, px, py, pz, n, L, col, droop, seed, dry = 2) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + h01(px, pz, seed + i) * 0.5, dx = Math.cos(a), dz = Math.sin(a), sx = -dz, sz = dx, l = L * (0.85 + h01(pz, px, i) * 0.3);
    const mid = [px + dx * l * 0.5, py + 0.45 * L * 0.3, pz + dz * l * 0.5], tip = [px + dx * l, py - droop * l, pz + dz * l];
    const w = 0.32 * L;
    B.tri([px, py, pz], [mid[0] + sx * w, mid[1], mid[2] + sz * w], tip, i % 3 === 1 ? shade(col, 1.12) : col, TILE.leaf, [[0.5, 0], [0, 0.45], [0.5, 1]]);
    B.tri([px, py, pz], tip, [mid[0] - sx * w, mid[1], mid[2] - sz * w], col, TILE.leaf, [[0.5, 0], [0.5, 1], [1, 0.45]]);
  }
  for (let i = 0; i < dry; i++) {   // a dry frond or two hanging under the crown (they stay when the green goes)
    const a = i * 2.6 + seed, dx = Math.cos(a), dz = Math.sin(a);
    A.tri([px, py - 0.1, pz], [px + dx * 0.4 - dz * 0.2, py - 0.2, pz + dz * 0.4 + dx * 0.2], [px + dx * 0.55, py - L * 0.6, pz + dz * 0.55], '#8a7250', TILE.leaf, [[0.5, 0], [0, 0.5], [0.5, 1]]);
  }
}
const shade = (hex, k) => '#' + [1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k))).toString(16).padStart(2, '0')).join('');

export const FLORA = {
  /** sabal (thatch) palm: a straight trunk with the old leaf bases crossed on it, a round crown of fans */
  fanPalm(A, B, D, x, y, z, s = 1) {
    const h = 3.6 * s;
    A.cyl(x, y - 0.2, z, 0.26 * s, 0.24 * s, h, 6, '#7a6a52', TILE.bark, false);
    for (let i = 0; i < 6; i++) { const yy = y + 0.5 + i * h / 7, a = i * 1.1; A.push(x, yy, z, a, 1, 1, 1, 0.5, 0); A.box(0, 0, 0.2 * s, 0.14 * s, 0.4 * s, 0.1, '#5e4e3a', TILE.bark); A.pop(); }   // the boots
    for (let i = 0; i < 9; i++) {   // the fans: each a flat wedge of two triangles, held out on a stalk
      const a = (i / 9) * Math.PI * 2 + h01(x, z, i) * 0.4, dx = Math.cos(a), dz = Math.sin(a), sx = -dz, sz = dx, up = i % 3 === 0 ? 0.9 : i % 3 === 1 ? 0.35 : -0.15;
      const c = [x + dx * 1.0 * s, y + h + up * s, z + dz * 1.0 * s], R = 1.3 * s;
      B.tri([x, y + h, z], c, [x + dx * 0.5 * s, y + h + 0.1, z + dz * 0.5 * s], '#5a8a3a', TILE.leaf);
      const f1 = [c[0] + dx * R * 0.7 + sx * R * 0.75, c[1] + (0.75 + up * 0.4) * R, c[2] + dz * R * 0.7 + sz * R * 0.75], f2 = [c[0] + dx * R * 0.7 - sx * R * 0.75, c[1] + (0.75 + up * 0.4) * R, c[2] + dz * R * 0.7 - sz * R * 0.75], fc = i % 2 ? '#6a9a48' : '#4e7e34';
      B.tri(c, f1, f2, fc, TILE.leaf); B.tri(c, f2, f1, fc, TILE.leaf);   // both faces: a fan is seen from above and below
    }
    for (let i = 0; i < 4; i++) { const a = i * 1.6 + x, dx = Math.cos(a), dz = Math.sin(a); A.tri([x, y + h - 0.2, z], [x + dx * 0.5 - dz * 0.3, y + h - 0.4, z + dz * 0.5 + dx * 0.3], [x + dx * 0.4, y + h - 1.5 * s, z + dz * 0.4], '#8a7250', TILE.leaf); }   // a skirt of dead fans
  },
  /** royal palm: tall, a smooth pale trunk that swells a little, a green crownshaft, long arching fronds; planted along streets */
  royalPalm(A, B, D, x, y, z, s = 1) {
    const h = 6.0 * s;
    A.cyl(x, y - 0.2, z, 0.34 * s, 0.4 * s, h * 0.45, 7, '#b8b4a8', TILE.white, false);
    A.cyl(x, y - 0.2 + h * 0.45, z, 0.4 * s, 0.26 * s, h * 0.55, 7, '#c8c4b8', TILE.white, false);
    A.cyl(x, y - 0.2 + h, z, 0.28 * s, 0.22 * s, 1.1 * s, 6, '#5a9a4a', TILE.white, false);   // the crownshaft
    fronds(A, B, x, y + h + 0.9 * s, z, 9, 2.9 * s, '#4a9a40', 0.32, 3, 1);
  },
  /** a clump of young coconut palms, three heights from one foot, leaning apart */
  palmClump(A, B, D, x, y, z, s = 1) {
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + h01(x, z, 4), lean = 0.35 + k * 0.1, hh = (1.8 + k * 1.1) * s, n = 4;
      let px = x, pz = z, py = y - 0.2;
      for (let i = 0; i < n; i++) { const r0 = 0.2 * s * (1 - i * 0.1), seg = hh / n; A.cyl(px, py, pz, r0, r0 * 0.9, seg, 5, '#9a8466', TILE.bark, false); px += Math.cos(a) * lean * seg * (0.3 + i * 0.25); pz += Math.sin(a) * lean * seg * (0.3 + i * 0.25); py += seg; }
      fronds(A, B, px, py, pz, 6, 1.7 * s, k === 1 ? '#5aa844' : '#4a9a40', 0.45, k + 7, 1);
      if (k === 2) for (let i = 0; i < 3; i++) B.blob(px + Math.cos(i * 2) * 0.22, py - 0.15, pz + Math.sin(i * 2) * 0.22, 0.17, 0.19, 0.17, '#6a8a2a', TILE.white, 0.1, i);   // coconuts
    }
  },
  /** sea grape: a low sprawling shrub of the beach line, round leathery leaves (some red), purple grapes hanging */
  seaGrape(A, B, D, x, y, z, s = 1) {
    for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.3; A.push(x, y, z, a, 1, 1, 1, 0.9, 0); A.cyl(0, -0.1, 0, 0.1 * s, 0.07 * s, 1.4 * s, 4, '#8a6a4a', TILE.bark, false); A.pop(); }
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + h01(x, z, 1), r = (i % 2 ? 1.1 : 0.5) * s; B.blob(x + Math.cos(a) * r, y + (0.8 + (i % 3) * 0.2) * s, z + Math.sin(a) * r, 0.75 * s, 0.4 * s, 0.75 * s, i === 3 ? '#b8584a' : i % 2 ? '#5a9a3a' : '#4a8a34', TILE.leaf, 0.3, i + 2); }
    for (let i = 0; i < 4; i++) { const a = i * 1.5 + 0.7; B.box(x + Math.cos(a) * 1.0 * s, y + 0.35 * s, z + Math.sin(a) * 1.0 * s, 0.14, 0.32, 0.14, '#6a3a7a', TILE.white); }
    A.blob(x, y + 0.15, z, 1.0 * s, 0.15, 1.0 * s, '#7a6a4a', TILE.leaf, 0.3, 9);   // fallen leaves under it
  },
  /** agave (century plant): a rosette of thick blue-green spikes; now and then the tall flower stalk it sends up once and dies after */
  agave(A, B, D, x, y, z, s = 1, spike = true) {
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + (i % 2) * 0.2, dx = Math.cos(a), dz = Math.sin(a), sx = -dz * 0.22 * s, sz = dx * 0.22 * s, L = (i % 2 ? 1.3 : 1.7) * s, up = (i % 3) * 0.35 + 0.6;
      const tip = [x + dx * L, y + up * s, z + dz * L];
      B.tri([x + sx, y, z + sz], tip, [x - sx, y, z - sz], i % 2 ? '#7aa890' : '#6a9a84', TILE.leaf);
      A.tri([x + sx * 0.6, y, z + sz * 0.6], [x + dx * L * 0.5, y + up * s * 0.3, z + dz * L * 0.5], [x - sx * 0.6, y, z - sz * 0.6], '#8a8060', TILE.leaf);   // the old leaves at the foot
    }
    if (spike) {
      A.cyl(x, y + 0.3, z, 0.1 * s, 0.05 * s, 4.4 * s, 4, '#8a7a50', TILE.bark, false);
      for (let i = 0; i < 4; i++) { const yy = y + (2.6 + i * 0.5) * s, a = i * 1.9; A.box(x + Math.cos(a) * 0.3, yy, z + Math.sin(a) * 0.3, 0.6 * s, 0.05, 0.05, '#8a7a50', TILE.bark); B.blob(x + Math.cos(a) * 0.6 * s, yy + 0.1, z + Math.sin(a) * 0.6 * s, 0.26 * s, 0.18 * s, 0.26 * s, '#e8c040', TILE.white, 0.2, i); }
    }
  },
  /** kadushi: the columnar cactus of the dry islands, ribbed green columns from one foot; a prickly pear beside it */
  cactus(A, B, D, x, y, z, s = 1) {
    const cols = [[0, 0, 3.4], [0.45, 0.2, 2.5], [-0.35, 0.35, 2.0], [0.1, -0.45, 1.5]];
    for (const [ox, oz, hh] of cols) {
      A.cyl(x + ox * s, y - 0.2, z + oz * s, 0.24 * s, 0.22 * s, hh * s, 6, '#6aa064', TILE.leaf, false);
      A.cyl(x + ox * s, y - 0.2 + hh * s, z + oz * s, 0.22 * s, 0.05 * s, 0.22 * s, 6, '#8ab478', TILE.leaf, false);
    }
    const px = x + 1.2 * s, pz = z - 0.4 * s;   // the prickly pear: flat pads on pads, a red fruit or two
    for (const [ox, oy, oz, a] of [[0, 0.3, 0, 0], [0.25, 0.75, 0.05, 0.5], [-0.25, 0.8, -0.05, -0.4], [0.1, 1.2, 0, 0.2]]) { A.push(px + ox * s, y + oy * s, pz + oz * s, 0.3, 1, 1, 1, 0, a); A.blob(0, 0, 0, 0.3 * s, 0.34 * s, 0.08 * s, '#6a9a50', TILE.leaf, 0.1, 3); A.pop(); }
    B.blob(px + 0.18 * s, y + 1.55 * s, pz, 0.08, 0.1, 0.08, '#c8304a', TILE.white, 0.05, 1); B.blob(px - 0.2 * s, y + 1.15 * s, pz, 0.08, 0.1, 0.08, '#c8304a', TILE.white, 0.05, 2);
  },
  /** divi-divi: the wind-bent tree of the windward shores, a short twisted trunk and a flat crown blown all to one side (along +x) */
  divi(A, B, D, x, y, z, s = 1) {
    A.push(x, y - 0.1, z, 0, 1, 1, 1, 0, -0.9); A.cyl(0, 0, 0, 0.26 * s, 0.18 * s, 1.6 * s, 5, '#6a5038', TILE.bark, false); A.pop();
    A.push(x + 1.2 * s, y + 0.95 * s, z, 0, 1, 1, 1, 0, -1.35); A.cyl(0, 0, 0, 0.18 * s, 0.1 * s, 2.6 * s, 5, '#6a5038', TILE.bark, false); A.pop();
    for (let i = 0; i < 4; i++) B.blob(x + (1.4 + i * 0.8) * s, y + (1.45 + i * 0.06) * s, z + (i % 2 ? 0.4 : -0.35) * s, (1.1 - i * 0.12) * s, 0.32 * s, 0.85 * s, i % 2 ? '#5a8a3a' : '#4a7a32', TILE.leaf, 0.25, i);
    for (let i = 0; i < 3; i++) A.box(x + (2.0 + i * 0.7) * s, y + 1.2 * s, z + (i - 1) * 0.4, 0.6, 0.06, 0.06, '#5a4430', TILE.bark);   // bare twigs under the crown
  },
  /** banana: a clump of soft stems, big torn paddle leaves arching out, a bunch and its purple flower */
  banana(A, B, D, x, y, z, s = 1) {
    for (let k = 0; k < 3; k++) {
      const ox = (k - 1) * 0.5 * s, oz = (k % 2) * 0.35 * s, hh = (2.2 + k * 0.4) * s, bx = x + ox, bz = z + oz;
      A.cyl(bx, y - 0.1, bz, 0.2 * s, 0.15 * s, hh, 5, '#9aaa60', TILE.leaf, false);
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3 + k, dx = Math.cos(a), dz = Math.sin(a), sx = -dz * 0.35 * s, sz = dx * 0.35 * s, L = 1.9 * s, top = [bx, y + hh, bz];
        const m = [bx + dx * L * 0.55, y + hh + 0.6 * s, bz + dz * L * 0.55], t = [bx + dx * L, y + hh - 0.3 * s, bz + dz * L];
        B.quad(top, [m[0] + sx, m[1], m[2] + sz], t, [m[0] - sx, m[1], m[2] - sz], i % 2 ? '#6ab04a' : '#5aa040', TILE.leaf);
        if (i === 4) A.tri(top, [m[0] + sx, m[1] - 0.8, m[2] + sz], [bx + dx * 0.6, y + hh - 1.6 * s, bz + dz * 0.6], '#8a7a4a', TILE.leaf);   // a dead leaf hanging down the stem
      }
    }
    B.blob(x + 0.3 * s, y + 1.6 * s, z + 0.4 * s, 0.3 * s, 0.4 * s, 0.3 * s, '#9ab040', TILE.white, 0.2, 5);   // the bunch
    B.blob(x + 0.3 * s, y + 1.05 * s, z + 0.45 * s, 0.14 * s, 0.22 * s, 0.14 * s, '#7a2a5a', TILE.white, 0.1, 6);
  },
  /** heliconia: a stand of upright paddle leaves with red and yellow lobster-claw flowers; the wet understorey */
  heliconia(A, B, D, x, y, z, s = 1) {
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + h01(x, z, 2), r = 0.45 * s, bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r, hh = (1.7 + (i % 3) * 0.45) * s;
      A.cyl(bx, y - 0.1, bz, 0.05, 0.04, hh * 0.6, 3, '#4a7a34', TILE.bark, false);
      B.push(bx, y + hh * 0.55, bz, a, 1, 1, 1, 0.25, 0); B.box(0, 0, 0, 0.5 * s, hh * 0.7, 0.05, i % 2 ? '#3c8a3a' : '#4a9a40', TILE.leaf); B.pop();
    }
    for (let k = 0; k < 2; k++) { const bx = x + (k ? 0.3 : -0.25) * s, bz = z + (k ? -0.2 : 0.25) * s; for (let i = 0; i < 5; i++) B.box(bx + (i % 2 ? 0.1 : -0.1), y + (1.2 + i * 0.22) * s, bz, 0.3, 0.16, 0.1, i === 4 ? '#f0c030' : '#e03a2a', TILE.white); }
  },
  /** kapok (ceiba): the great tree a village meets under. Buttress roots like walls, a tall pale trunk, wide flat layers of crown. One to an island at most */
  kapok(A, B, D, x, y, z, s = 1) {
    // the foot (owner, 2026-11-28: "the wall-like roots look too flat and uncanny"): the trunk flares into seven buttresses of
    // different lengths, each a thick wedge that is high and broad at the trunk, thins and drops in a concave curve as it runs out,
    // and snakes a little sideways; past its end a root runs on along the ground and dives under the soil
    const bark = '#b0a892', crease = '#8a8270';
    A.cyl(x, y - 0.3, z, 1.15 * s, 0.62 * s, 1.9 * s, 8, bark, TILE.white, false);   // the flare
    A.cyl(x, y + 1.6 * s, z, 0.62 * s, 0.5 * s, 5.4 * s, 7, '#b8b0a0', TILE.white, false);
    const N = 7;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + h01(x, z, i) * 0.45, ca = Math.cos(a), sa = Math.sin(a);
      const L = (1.5 + h01(z, x, i + 3) * 1.4) * s, Hh = (1.5 + h01(x, z, i + 7) * 1.1) * s, t0 = (0.2 + h01(x, z, i + 9) * 0.08) * s;
      const wig = (h01(x, z, i + 11) - 0.5) * 0.9 * s, n = 6, pts = [];
      for (let j = 0; j <= n; j++) {
        const u = j / n, r = 0.55 * s + u * L, top = Hh * Math.pow(1 - u, 1.7) + 0.05, w = Math.sin(u * Math.PI * 1.2) * wig * u, th = t0 * (1 - u * 0.75);
        const cx = x + ca * r - sa * w, cz = z + sa * r + ca * w;
        pts.push({ L0: [cx - sa * th, y - 0.25, cz + ca * th], L1: [cx - sa * th * 0.55, y + top, cz + ca * th * 0.55], R0: [cx + sa * th, y - 0.25, cz - ca * th], R1: [cx + sa * th * 0.55, y + top, cz - ca * th * 0.55] });
      }
      for (let j = 0; j < n; j++) {
        const p = pts[j], q = pts[j + 1], col = j % 2 ? bark : '#a8a08a';
        for (const [a1, b1, c1, d1, cc] of [[p.L0, q.L0, q.L1, p.L1, col], [p.R0, p.R1, q.R1, q.R0, col], [p.L1, q.L1, q.R1, p.R1, '#c0b8a4']]) { A.quad(a1, b1, c1, d1, cc, TILE.white); A.quad(d1, c1, b1, a1, cc, TILE.white); }
      }
      A.tri(pts[0].L0, pts[0].L1, pts[0].R1, crease, TILE.white); A.tri(pts[0].R1, pts[0].R0, pts[0].L0, crease, TILE.white);
      const e = pts[n], ex = (e.L0[0] + e.R0[0]) / 2, ez = (e.L0[2] + e.R0[2]) / 2, rl = (0.8 + h01(z, x, i) * 1.2) * s;   // the surface root running on
      A.push(ex, y - 0.12, ez, Math.PI / 2 - a + (h01(x, z, i + 13) - 0.5) * 0.6, 1, 1, 1, 0, Math.PI / 2 - 0.12);
      A.cyl(0, 0, 0, 0.1 * s, 0.05 * s, rl, 4, crease, TILE.white, false); A.pop();
    }
    for (let i = 0; i < 5; i++) { const a = i * 1.26, L = 2.6 * s; A.push(x, y + 6.2 * s, z, a, 1, 1, 1, 0, -1.1); A.cyl(0, 0, 0, 0.22 * s, 0.12 * s, L, 5, '#a09888', TILE.white, false); A.pop(); }
    for (const [yy, rr, k] of [[6.6, 4.2, 0], [8.0, 3.2, 1], [9.0, 1.9, 2]]) B.blob(x, y + yy * s, z, rr * s, 0.7 * s, rr * 0.9 * s, k === 1 ? '#5a9a3a' : '#4a8a34', TILE.leaf, 0.3, k + 11);
    D.blob(x, y + 6.4 * s, z, 3.4 * s, 0.2, 3.4 * s, '#6a6070', TILE.bone, 0.5, 4);   // in the dark mood: a pale web of bare branches
  },
  /** the dune: sea oats (tall pale blades with seed heads) and beach morning glory creeping over the sand with pink flowers */
  dune(A, B, D, x, y, z, s = 1) {
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7 + h01(x, z, 5), r = (0.2 + (i % 3) * 0.35) * s, bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r, hh = (0.9 + (i % 4) * 0.25) * s, lean = (i % 2 ? 0.2 : -0.15);
      A.tri([bx - 0.05, y, bz], [bx + 0.05, y, bz], [bx + lean, y + hh, bz + 0.05], '#c8b47a', TILE.leaf);
      A.tri([bx + 0.05, y, bz], [bx - 0.05, y, bz], [bx + lean, y + hh, bz + 0.05], '#c8b47a', TILE.leaf);
      if (i % 2) A.box(bx + lean, y + hh - 0.05, bz, 0.07, 0.3, 0.07, '#d8c89a', TILE.rope);
    }
    for (let i = 0; i < 6; i++) { const a = i * 1.1 + 2, r = (1.0 + (i % 2) * 0.5) * s, vx = x + Math.cos(a) * r, vz = z + Math.sin(a) * r;
      B.blob(vx, y + 0.06, vz, 0.42 * s, 0.07, 0.3 * s, '#4a8a3a', TILE.leaf, 0.3, i); if (i % 2 === 0) B.blob(vx + 0.15, y + 0.13, vz, 0.09, 0.05, 0.09, '#e870b0', TILE.white, 0.05, i); }
  },
};
export const FLORA_KINDS = Object.keys(FLORA);

// ---- where they grow (docs/proposals/world/FLORA.md, kept by the owner 2026-11-28)
// beach: the beach line (6-15 % in from the shore); low: the island's own trees and undergrowth, one or two kinds picked per island so no
// two neighbours look alike and no island has more than two big tree kinds (the palms are one). palmK thins the coconut palms.
export const REGION_FLORA = {
  home:    { beach: ['seaGrape', 'palmClump', 'dune'], low: ['banana', 'heliconia'], under: true, palmK: 1 },
  free:    { beach: ['seaGrape', 'seaGrape', 'palmClump', 'dune'], low: ['banana', 'banana', 'heliconia'], under: true, palmK: 1 },
  crown:   { beach: ['dune', 'seaGrape'], low: ['divi', 'cactus', 'agave'], dry: true, tree: 'royalPalm', palmK: 0.45 },
  lantern: { beach: ['seaGrape', 'dune'], low: ['fanPalm', 'royalPalm'], tree: 'fanPalm', palmK: 0.8 },
  reef:    { beach: ['seaGrape', 'dune'], low: ['agave', 'cactus', 'seaGrape'], dry: true, palmK: 0.7 },
  drowned: { beach: ['dune'], low: ['deadFan'], palmK: 0.25 },
};
const BANK = { x: -1231, z: -217, R: 230 };   // the Halved Isle's fog bank (landmarks.js BARRIERS.broken): nothing green grows in it
export const inBank = (d) => Math.hypot(d.x - BANK.x, d.z - BANK.z) < BANK.R;
/** does a palm at (x, z) stand? (world.js palms(): the rng is spent the same either way, so nothing else on the island moves) */
export const palmStands = (d, x, z) => h01(x, z, 21) < ((REGION_FLORA[d.region] || REGION_FLORA.home).palmK);

/** grow an island's plants. H: { A, B, D, spot, terrainHeight, shoreR, angleDiff, rng } (rng its own stream). Bare by rule: the wet sand,
 *  slopes and summits, the harbour's streets, quay and the ground in front of the pier, landmarks (never called for them), the fog bank */
export function plantIsland(d, H) {
  const T = d.type, F = REGION_FLORA[d.region] || REGION_FLORA.home, { A, B, D, rng } = H;
  if (T === 'mangrove' || d.heskLight || d.fogHaven || d.blight) return;
  const dead = inBank(d);
  const thin = 1 - 0.6 * Math.max(0, Math.min(1, d.dread || 0)), N = (k) => Math.round(k * thin);
  const topH = Math.max(1, d.H);
  const ok = (p, hMax = 0.7) => {   // not on a slope, not on the summit
    if (!p) return false; const [x, y, z] = p;
    if (topH > 3 && y > topH * hMax) return false;
    const g = Math.max(Math.abs(H.terrainHeight(d, x + 1, z) - H.terrainHeight(d, x - 1, z)), Math.abs(H.terrainHeight(d, x, z + 1) - H.terrainHeight(d, x, z - 1))) / 2;
    if (g > 0.45) return false;
    if (T === 'harbour') { const df = Math.abs(H.angleDiff(p[3], d.dockTh)); if (df < 1.35) return false; }   // the pier, its jetty and the back stair
    return true;
  };
  const grow = (kind, p, s) => {
    if (kind === 'deadFan') { FLORA.fanPalm(A, JUNK, D, p[0], p[1], p[2], s); return; }   // only what stays in the dark: trunk and dead fans
    FLORA[kind](A, B, D, p[0], p[1], p[2], s);
  };
  const place = (n, t0, t1, hMin, kinds, s0, s1, hMax) => { for (let i = 0; i < n; i++) { const p = H.spot(d, rng, t0, t1, hMin); const k = pick(kinds, rng()), s = s0 + rng() * (s1 - s0); if (ok(p, hMax)) grow(k, p, s); } };
  if (dead) { place(N(2), 0.3, 0.8, 0.6, ['deadFan'], 0.8, 1.0); return; }
  const r = d.r || 20, beachN = N(Math.max(1, Math.round(r / 9))), u = h01(d.x, d.z, 31);
  const lowKinds = F.low.length > 1 ? [F.low[Math.floor(u * F.low.length)], F.low[Math.floor(((u * 7.3) % 1) * F.low.length)]] : F.low;   // one or two of the region's kinds
  switch (T) {
    case 'sandbar':
      place(N(T === 'sandbar' ? 2 : 1), 0.2, 0.75, 0.15, ['dune'], 0.8, 1.1, 1);
      if ((d.region === 'free' || d.region === 'home') && u < 0.4) place(1, 0.1, 0.5, 0.3, ['palmClump'], 0.8, 1.0, 1);
      return;
    case 'atoll': place(N(3), 0.68, 0.86, 0.4, ['seaGrape'], 0.8, 1.1, 1); return;
    case 'harbour':
      place(beachN, 0.86, 0.94, 0.25, F.beach, 0.8, 1.1, 1);
      if (F.tree && d.id !== '0,-1') place(N(3), 0.72, 0.86, 0.6, [F.tree], 0.8, 1.0, 1);
      return;
    case 'volcano':
      place(N(4), 0.74, 0.9, 0.3, F.dry ? ['agave'] : ['banana', 'heliconia'], 0.8, 1.1, 0.35);
      return;
    case 'rocky':
      if (F.dry) place(N(4), 0.25, 0.8, 0.4, ['agave', 'cactus'], 0.7, 1.0, 0.6);
      place(N(1), 0.86, 0.94, 0.2, F.beach, 0.8, 1.0, 1);
      return;
    case 'jungle': case 'treasure': default: {
      place(beachN, 0.84, 0.93, 0.2, F.beach, 0.8, 1.1, 1);
      place(N(T === 'jungle' ? 4 : 2), 0.2, 0.7, 0.8, lowKinds, 0.8, 1.15);
      if (F.under && T === 'jungle') place(N(4), 0.25, 0.8, 0.8, ['heliconia'], 0.9, 1.2);
      if (T === 'jungle' && !F.dry && d.region !== 'drowned' && r > 21 && u < 0.35) place(1, 0.15, 0.45, 0.9, ['kapok'], 0.75, 0.9);   // one great tree, on a few big islands
    }
  }
}
class Junk { tri() { return this; } quad() { return this; } box() { return this; } cyl() { return this; } blob() { return this; } push() { return this; } pop() { return this; } }
const JUNK = new Junk();

