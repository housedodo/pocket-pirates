// The fishers' marks (M-HOME-2, with P-HOME-2 "The empty mark"; docs/proposals/REGIONAL_CATALOGUE.md, owner 2026-11-17).
// Three places in Home Sound where the home boats fish, each where two tall things that already stand line up by eye (Tama's
// lighthouse, Wick's light, the Grey Tooth, the Drowned Bell's tower, Hollowgreen's dark wood): the pilots' transit, the
// Kestrel's own language, taught on something harmless first. From 06:00 to 15:00 a Tama or Velto boat lies at anchor on each
// mark; at 15:00 it goes home and the water is empty. Within MARK_R of a mark the bite comes sooner and snapper, bream and grouper
// bite as if in their own water at their own hour (fishing.js habitatFit, env.mark). No marker, no word: the boats, always in the
// same three places, and the two things in line when you sit where they sat. Demo-safe: nothing here is strange.
import { mulberry32, lerp } from '../util.js';
import { waveHeight } from '../ocean.js';
import { LM } from '../landmarks.js';
import { CELL, shoreR, Island } from '../world.js';
import { sectorAt } from '../sectors.js';
import { HOME_SOUND_R, TAMA_ID, MARK_R, MARK_OUT, MARK_HOME, MARK_SAIL } from '../regions.js';

const MARKS = 3;                           // marks per seed
const MARK_FROM = 60, MARK_TO = 260;       // how far past the nearer of its two tall things a mark lies (in line, the far one behind it)
const MARK_INSIDE = HOME_SOUND_R - 40;     // marks keep inside the Sound
const MARK_CLEAR = 35;                     // open water round a mark (from any shore; the most open point on each line is taken)
const MARK_APART = 120;                    // marks stand apart from each other
const KESTREL_CLEAR = 40;                  // never on the Kestrel's two lines: that transit stays the only one with a ship under it
const PIER_CLEAR = 60;                     // never by a harbour (RULES 24c: the main pier is the captain's)
const HOME_OFF = 70;                       // where a boat goes in to: this far off its harbour's shore, toward its mark
const HIDE_R = 150;                        // a boat that is in is only put away when the ship is further off than this

/** the tall things that stand in Home Sound, as world points */
function tallThings(world) {
  const t = world.desc(0, -1), out = [];
  if (t && !t.lampAt) new Island(t, false).dispose();   // the light's place is settled when Tama is built: build it once, off-stage, to know it
  if (t && t.lampAt) out.push({ id: 'tama', x: t.lampAt.x, z: t.lampAt.z });
  for (const k of ['keeper', 'crag', 'bell', 'grove']) out.push({ id: k, x: LM[k].x, z: LM[k].z });
  return out;
}
const lineDist = (px, pz, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1; return Math.abs((px - a.x) * dz - (pz - a.z) * dx) / L; };

/** the seed's marks: { x, z, near, far, home } (near and far: the two things in line; home: the harbour its boat comes from) */
export function placeMarks(world, seed, kestrel) {
  const T = tallThings(world), tama = world.desc(0, -1), velto = [...Array(9)].map((_, i) => world.desc(-4 + i, -1)).find((d) => d && d.type === 'harbour' && d.region === 'home' && d.id !== TAMA_ID);
  const homes = [tama, velto].filter(Boolean);
  const openAt = (x, z) => { let e = 1e9; const cx = Math.round(x / CELL), cz = Math.round(z / CELL);
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const d = world.desc(cx + dx, cz + dz); if (d) e = Math.min(e, Math.hypot(d.x - x, d.z - z) - d.r * 1.4); }
    return e; };
  const pairs = [];
  for (const a of T) for (const b of T) if (a !== b) pairs.push([a, b]);
  const rng = mulberry32(seed * 131 + 7);
  for (let i = pairs.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pairs[i], pairs[j]] = [pairs[j], pairs[i]]; }
  const marks = [], used = new Set();
  for (const [a, b] of pairs) {
    if (marks.length >= MARKS) break;
    const key = [a.id, b.id].sort().join(); if (used.has(key)) continue;
    const ux = a.x - b.x, uz = a.z - b.z, L = Math.hypot(ux, uz);
    let best = null;
    for (let s = MARK_FROM; s <= MARK_TO; s += 10) {
      const x = a.x + (ux / L) * s, z = a.z + (uz / L) * s, e = openAt(x, z);
      if (!tama || Math.hypot(x - tama.x, z - tama.z) > MARK_INSIDE || e < MARK_CLEAR || (best && e <= best.e)) continue;
      if (marks.some((m) => Math.hypot(m.x - x, m.z - z) < MARK_APART)) continue;
      if (homes.some((h) => Math.hypot(h.x - x, h.z - z) - h.r < PIER_CLEAR)) continue;
      if (kestrel && (lineDist(x, z, kestrel, LM.crag) < KESTREL_CLEAR || lineDist(x, z, kestrel, LM.bell) < KESTREL_CLEAR || Math.hypot(x - kestrel.x, z - kestrel.z) < 2 * KESTREL_CLEAR)) continue;
      best = { x, z, e };
    }
    if (!best) continue;
    const home = homes.slice().sort((p, q) => Math.hypot(p.x - best.x, p.z - best.z) - Math.hypot(q.x - best.x, q.z - best.z))[0];
    marks.push({ x: best.x, z: best.z, near: a.id, far: b.id, home: home.id }); used.add(key);
  }
  return marks;
}

/** 0 in, 1 on the mark, by the clock alone (so the boats are always where the hour says) */
export function boatK(hour) {
  const k = hour < MARK_OUT - MARK_SAIL ? 0 : hour < MARK_OUT ? (hour - (MARK_OUT - MARK_SAIL)) / MARK_SAIL : hour < MARK_HOME ? 1 : hour < MARK_HOME + MARK_SAIL ? 1 - (hour - MARK_HOME) / MARK_SAIL : 0;
  return k * k * (3 - 2 * k);
}

export class HomeMarks {
  constructor(scene, world, traffic, seed, kestrel) {
    this.scene = scene; this.world = world;
    this.marks = placeMarks(world, seed, kestrel);
    this.boats = this.marks.map((m) => {
      const h = world.desc(...m.home.split(',').map(Number)), th = Math.atan2(m.z - h.z, m.x - h.x), R = shoreR(h, th) + HOME_OFF;
      const parts = traffic.build('fisher', sectorAt(h.x, h.z, seed).faction, false);
      parts.root.visible = false; scene.add(parts.root);
      return { ...parts, m, inAt: [h.x + Math.cos(th) * R, h.z + Math.sin(th) * R], x: 0, z: 0, hd: 0 };
    });
  }
  /** the mark the point lies on (within MARK_R), or null */
  atMark(x, z) { return this.marks.find((m) => Math.hypot(m.x - x, m.z - z) < MARK_R) || null; }
  /** each frame (world time): the boats go out at dawn, lie at anchor on their marks, go home at three */
  update(t, { ship, hour, wave, dread }) {
    const k = boatK(hour), moving = k > 0.02 && k < 0.98, back = hour >= MARK_HOME;
    for (const b of this.boats) {
      const x = lerp(b.inAt[0], b.m.x, k), z = lerp(b.inAt[1], b.m.z, k), away = Math.atan2(b.m.x - b.inAt[0], -(b.m.z - b.inAt[1]));
      b.x = x; b.z = z; b.hd = moving ? (back ? away + Math.PI : away) : away + 1.2 + Math.sin(t * 0.07 + b.m.x) * 0.5;   // at anchor she swings to the wind
      b.root.visible = dread < 0.4 && (k > 0.02 || Math.hypot(ship.pos.x - x, ship.pos.z - z) < HIDE_R && b.root.visible);
      if (!b.root.visible) continue;
      b.root.position.set(x, waveHeight(x, z, t, wave) + 0.1, z);
      b.root.rotation.set(Math.sin(t * 0.9 + x) * 0.04, -b.hd, Math.cos(t * 0.7 + z) * 0.05);
      const furl = moving ? 1 : 0.22;
      for (const sl of b.sails) { sl.pivot.rotation.y = 0.5; sl.pivot.scale.set(sl.s, furl * sl.s, sl.s); if (sl.jib) sl.jib.scale.y = furl; }
      b.flag.rotation.y = Math.PI + Math.sin(t * 8) * 0.2;
    }
  }
  /** the boats are solid while they are out */
  solids(out) { for (const b of this.boats) if (b.root.visible) out.push({ x: b.x, z: b.z, ax: Math.sin(b.hd), az: -Math.cos(b.hd), hl: 1.3, r: 0.9 }); }
}
