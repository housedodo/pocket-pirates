// The raider crews (owner, 2026-11-24: "different kinds of raiders, sometimes not hostile but want something and become hostile
// afterwards"; "parley"; "multiple designs for raiders, more character in the story by a little side story and a distinguishable ship
// as a story anchor"). Four named ships, one of each kind, each with its own look on the water before a word is said, its own way of
// coming at you, what it wants when hailed (E, the ship screen: ui/shiptrade.js), and three beats of a story over the voyage.
//   wolves     the Red Widow (Reef): black hull, sails the colour of old blood, a jawbone on her bowsprit. Comes straight in firing.
//              Captain Vosk hunts a ship like the Gull, "lower in the water". Named ships never sink: she strikes and is boarded.
//   tollmen    the Toll (Crown and Cays): a grey brig with a toll-booth on her deck and a lantern on a pole, gunports shut. She comes
//              alongside and holds up a ledger. Pay, give a crate, bluff, or refuse (or run): then the ports open.
//   beggars    the Patience (Cays and home water): a family on a half-wrecked sloop, sails patched in every colour, washing on a line.
//              They ask for water, a patch kit, a little coin. Refused, they follow, and at night they may try to take it.
//   collectors the Quiet Hand (deep water only): a clean white ship with too many lanterns and slack grey sails. Never hostile, never
//              hurt. Asks for a thing from the sea chest by name. Refused, she keeps you company.
// State: state.story.crews[id] = { met, beat, day, ... }. Full game only; never in the demo; never before the cannons.
import * as THREE from 'three';
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { Builder } from '../builder.js';
import { mats, psxMaterial, getAtlas } from '../psx.js';
import { TILE } from '../textures.js';
import { toast } from '../ui/dom.js';
import { sectorAt } from '../sectors.js';
import { angleDiff, clamp } from '../util.js';
import { tod } from '../daynight.js';
import { CHEST } from '../chest.js';
import { unlocked } from '../objectives.js';
import { handOn } from './hands.js';
import { mark } from './standing.js';
import { revealWreck } from './wrecks.js';

const DEMO = () => typeof window !== 'undefined' && window.__BUILD === 'demo';
export const CREW_GAP = 1.5, CREW_TRY = 25, CREW_P = 0.14;   // days before the same crew comes again; s between tries; the chance a try finds one
export const TOLL_MARK = 7;                                  // days the Toll leaves a ship alone once it has paid
const crews = () => state.story.crews || (state.story.crews = {});
const C = (id) => crews()[id] || (crews()[id] = { met: 0, beat: 0, day: -99 });
const say = (l) => { if (G.objectives && G.objectives.mate && !G.objectives.mate.busy) G.objectives.mate.say(l); };

const GUNNER = { wolves: 'Red sails. That is Vosk. She will not talk, Captain.', tollmen: 'Grey brig, ports shut. They want paying, not fighting.', beggars: 'Patched sail. Hungry, not dangerous. Not yet.', collectors: 'I do not know what that is. I would not shoot at it.' };
export const CREWS = {
  wolves: { name: 'the Red Widow', kind: 'schooner', faction: 'reef', where: (r, k, c) => (r === 'reef' && k < 0.55 && c.beat < 2) || (c.beat === 2 && k >= 0.6), hostile: true,   // her last beat is far out
    hull: '#2a1c1c', sail: [0.62, 0.16, 0.14], line: 'A woman in a long coat at the rail, one hand on a pistol, not drawing it. "You are not her. Lower in the water, she was. Still: your hold."' },
  tollmen: { name: 'the Toll', kind: 'merchant', faction: 'crown', where: (r, k) => (r === 'crown' || r === 'free') && k < 0.6, hostile: false,
    hull: '#7a7a78', sail: [0.92, 0.9, 0.86], line: 'A thin man in a grey coat holds up a ledger and a pen. "The toll for the passage, Captain. It has always been paid. It is your turn."' },
  beggars: { name: 'the Patience', kind: 'fisher', faction: 'free', where: (r, k) => (r === 'free' || r === 'home') && k < 0.5, hostile: false,
    hull: '#4a6a8a', sail: [1, 0.9, 0.78], line: 'A woman at the tiller, three children along the rail, a goat. "We have not had water in two days. Anything, Captain. We will remember it."' },
  collectors: { name: 'the Quiet Hand', kind: 'galleon', faction: 'drowned', where: (r, k) => k >= 0.6, hostile: false, deep: true,
    hull: '#e8e6e0', sail: [0.6, 0.62, 0.64], line: 'Someone at the rail in a white collar, very polite, writing as they speak. "We collect, Captain. You have something of ours."' },
};

// ---- the ships: each is the ordinary hull and rig (traffic.js) in its own paint, with its own things on deck
// each crew's livery (owner, 2026-11-25: "redesigns... all look like wooden ships, not grey or an unnatural colour for that time; ships
// from Port Royale and Pirates! as a reference"): period ship types in wood, tar, the natural paints of the day (ochre, red ochre,
// verdigris, white lead, gilt) and canvas (natural, tanned, mildewed). The owner chose design A for all four (2026-11-25).
// paint: [tar below the wale, the planking, the rails and wales] (recolour); sail: canvas tint; deck: [wood, roof] for houses on deck;
// patch: patch and laundry colours; flag: the streamer; shape: overrides SHAPE
export const LIVERY = {
  wolves: {
    a: { name: 'tarred brigantine', paint: ['#120d0a', '#3a2818', '#c89a48'], sail: [0.7, 0.4, 0.28], patch: ['#4a2618', '#6a3a24'], flag: 0x7a1810 },
  },
  tollmen: {
    a: { name: 'Dutch fluyt', paint: ['#1a120a', '#8a5a2c', '#e0b048'], sail: [0.98, 0.94, 0.82], deck: ['#9a7448', '#5a3a22'], flag: 0x2a3a6a },
  },
  beggars: {
    a: { name: 'weathered sloop', paint: ['#2a241e', '#7a6c5a', '#c4b49a'], sail: [0.92, 0.86, 0.72], patch: ['#a0583a', '#c8b898', '#6a5a44', '#8a7a5a', '#d8ccb0'] },
  },
  collectors: {
    a: { name: 'salt-bleached galleon', paint: ['#3a342c', '#9a9078', '#e8e0c8'], sail: [0.64, 0.62, 0.52], trim: '#2a241c' },
  },
};
export const SHIP_STYLE = 'a';
const hx2 = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const recoloured = {};
/** the same hull, painted: each vertex colour's brightness picks a colour along the livery's three paints (tar, planking, rails) */
function recolour(mesh, [d, m, l]) {
  const key = mesh.geometry.uuid + d + m + l;
  if (!recoloured[key]) {
    const g = mesh.geometry.clone(), D = hx2(d), Mid = hx2(m), L = hx2(l);
    for (const name of Object.keys(g.attributes)) {
      if (!/^color/.test(name)) continue;
      const a = g.attributes[name], n = a.itemSize;
      for (let i = 0; i < a.count; i++) { const r = a.getX(i), gg = a.getY(i), b = a.getZ(i), t = Math.min(1, (0.3 * r + 0.59 * gg + 0.11 * b) * 1.6), A = t < 0.5 ? D : Mid, B = t < 0.5 ? Mid : L, u = t < 0.5 ? t * 2 : t * 2 - 1; a.setXYZ(i, A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[2] + (B[2] - A[2]) * u); }
      a.needsUpdate = true; void n;
    }
    recoloured[key] = g;
  }
  mesh.geometry = recoloured[key];
}
// each crew's silhouette, read before her colours (owner, 2026-11-25, "do 2 and 3"): hull scale [beam, height, length], rig height, mast rake
//   the Widow long, low and raked; the Toll tall and boxy with a short rig; the Patience short with a stump of a mast; the Quiet Hand too
//   tall and narrow, like a church
const SHAPE = { wolves: { hull: [0.85, 0.72, 1.32], rig: 1.08, rake: 0.2 }, tollmen: { hull: [1.28, 1.32, 0.86], rig: 0.82 }, beggars: { hull: [1.0, 0.9, 0.74], rig: 0.66 }, collectors: { hull: [0.74, 1.2, 1.06], rig: 1.45 } };
const _v = new THREE.Vector3();
const mtl = {};
function materials(id, st) {
  const key = id + st; if (mtl[key]) return mtl[key];
  const atlas = getAtlas(), L = LIVERY[id][st];
  const h = psxMaterial({ map: atlas, vertexColors: true, dark: true, alphaTest: 0.5, side: THREE.DoubleSide, key: 'Rh' + key });   // wood grain through the paint; the paint is in the vertex colours
  const s = psxMaterial({ map: atlas, vertexColors: true, dark: true, side: THREE.DoubleSide, key: 'Rs' + key }); s.color.setRGB(...L.sail);
  return (mtl[key] = { h, s });
}
function dress(s, id, st = SHIP_STYLE) {
  const L = LIVERY[id][st], SH = { ...SHAPE[id], ...(L.shape || {}) }, M = materials(id, st), root = s.root, extra = new Builder();
  s.livery = st;
  { const old = root.children[0].material;   // the hull, the castle and the spare masts: every piece in the hull's material, in her own paint
    for (const m of root.children) if (m.isMesh && m.material === old) { recolour(m, L.paint); m.material = M.h; m.scale.multiply(_v.set(...SH.hull)); } }
  { const sh = SH;   // her own silhouette (owner, 2026-11-25): the masts stand where the stretched hull puts them, raked if she is a Widow
    for (const sl of s.sails) { sl.pivot.position.y *= sh.hull[1]; sl.pivot.position.z *= sh.hull[2]; sl.pivot.rotation.x = sh.rake || 0; }
    s.flag.position.y *= sh.hull[1] * sh.rig; s.flag.position.z *= sh.hull[2]; s.rigK = sh.rig; }
  for (const sl of s.sails) sl.sail.material = M.s;
  if (s.sails[0] && s.sails[0].jib) s.sails[0].jib.material = M.s;
  if (id === 'wolves') {   // a jawbone lashed to the bowsprit, a long red streamer, black patches on the red canvas
    extra.box(0, 1.7, -4.2, 0.2, 0.2, 0.9, '#d8d0bc', TILE.bone); for (let k = 0; k < 5; k++) extra.box(0, 1.45, -3.9 - k * 0.15, 0.5 - k * 0.06, 0.12, 0.06, '#e8e0cc', TILE.bone);
    for (const sl of s.sails) { const pb = new Builder(); pb.doubleSided = true; for (let k = 0; k < 3; k++) pb.box(0.36, 1.2 + k * 1.3, 0.8 + (k % 2) * 1.1, 0.06, 0.8, 0.9, L.patch[k % 2]); sl.sail.add(new THREE.Mesh(pb.geometry(), mats.props)); }   // darker canvas patched in
    s.flag.scale.set(1, 1, 2.4); s.flag.material = new THREE.MeshBasicMaterial({ color: L.flag, side: THREE.DoubleSide });
  } else if (id === 'tollmen') {   // a toll booth on deck, a lantern on a pole over the bow with a chain hanging from it, a black ring on the mainsail
    extra.box(0, 1.1, 1.2, 1.6, 1.3, 1.4, L.deck[0], TILE.planks); extra.gable(0, 2.4, 1.2, 1.8, 0.6, 1.6, L.deck[1], TILE.roof, L.deck[0]);   // a timber toll booth, shingled
    extra.box(0, 1.6, -3.6, 0.12, 2.6, 0.12, '#3a3632'); extra.box(0, 4.1, -3.6, 0.32, 0.4, 0.32, '#ffd890', TILE.glow);
    for (let k = 0; k < 6; k++) extra.box(0, 3.8 - k * 0.3, -3.75, 0.1, 0.2, 0.06, '#2a2622');
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; extra.box(Math.cos(a) * 0.9, 4.4 + Math.sin(a) * 0.9, -0.6, 0.3, 0.3, 0.04, '#3a2818'); }   // a ring painted on the mainsail in tar
    s.flag.material = new THREE.MeshBasicMaterial({ color: L.flag, side: THREE.DoubleSide });
  } else if (id === 'beggars') {   // patches in every colour, a mast that leans, washing on a line, the goat
    const P = L.patch;   // canvas, tanned and undyed cloth: what a poor family would have
    for (const sl of s.sails) {   // patches sewn onto the sail itself, so they swing with it
      const pb = new Builder(); pb.doubleSided = true;
      for (let k = 0; k < 6; k++) pb.box(0.36, 0.8 + (k % 3) * 1.3, 0.5 + Math.floor(k / 3) * 1.4 + (k % 2) * 0.3, 0.06, 0.9, 0.9, P[k % P.length]);
      sl.sail.add(new THREE.Mesh(pb.geometry(), mats.props));
    }
    extra.box(-0.6, 1.0, 1.4, 0.06, 0.06, 2.4, '#8a7a62'); for (const [z, c] of [[0.6, P[0]], [1.2, P[4]], [1.9, P[2]]]) extra.box(-0.6, 0.65, z, 0.04, 0.6, 0.4, c);
    extra.box(0.4, 0.9, 1.8, 0.3, 0.3, 0.6, '#d8d0c0'); extra.box(0.4, 1.15, 1.45, 0.2, 0.22, 0.24, '#d8d0c0'); for (const z of [1.6, 2.0]) for (const x of [0.3, 0.5]) extra.box(x, 0.65, z, 0.06, 0.3, 0.06, '#6a5a4a');   // the goat
    if (s.sails[0]) s.sails[0].pivot.rotation.z = 0.12;   // the jury-rigged mast leans
    root.position.y -= 0.25;                                // low in the water
  } else if (id === 'collectors') {   // a row of small lanterns down both rails, lit day and night; slack sails; no flag
    for (const sx of [-1, 1]) for (let k = 0; k < 7; k++) extra.box(sx * 1.25, 1.8, -2.6 + k * 0.85, 0.18, 0.24, 0.18, '#fff0c0', TILE.glow);
    extra.box(0, 1.3, -2.0, 2.4, 0.08, 4.4, L.trim);   // the trim along her waist (tar, or worn gilt)
    for (const sl of s.sails) sl.limp = true;
    s.flag.visible = false;
  }
  const m = new THREE.Mesh(extra.geometry(), mats.props); root.add(m);
  s.crewMesh = m;
}

// ---- appearing: now and then, one crew at a time, where its water is
let tryT = CREW_TRY;
export const crewShip = () => G.traffic && G.traffic.ships.find((s) => s.crew && !s.sinking);
function canSpawn(id) {
  const c = C(id);
  if (state.dayN + state.time - c.day < CREW_GAP) return false;
  if (id === 'tollmen' && c.paid != null && state.dayN - c.paid < TOLL_MARK) return false;   // her mark: she has your toll
  if (id === 'wolves' && c.beat >= 3) return false;   // her story is over
  if (id === 'beggars' && c.beat >= 3) return false;  // they have a home now
  return true;
}
export function spawnCrew(id, x, z, st) {   // st: a livery key (only 'a' since the owner chose, 2026-11-25)
  const S = G.ship, def = CREWS[id];
  if (x == null) { const a = S.heading + (Math.random() - 0.5) * 1.6, d = 200; x = S.pos.x + Math.sin(a) * d; z = S.pos.z - Math.cos(a) * d; }
  const derelict = id === 'wolves' && C(id).beat === 2 && rt.dread >= 0.6;   // her last beat: found adrift, far out
  const s = G.traffic.spawnAt(def.kind, def.faction, x, z, Math.atan2(S.pos.x - x, -(S.pos.z - z)), derelict ? 'derelict' : 'live', derelict ? 0.8 : null, def.hostile && !derelict);
  s.crew = id; s.name = def.name.replace(/^the /, '');   // 'Red Widow': the prompt says "Hail the Red Widow" s.special = 'crew'; s.maxHp *= 1.4; s.hp = s.maxHp;
  dress(s, id, st || SHIP_STYLE);
  const c = C(id); c.met++; c.day = state.dayN + state.time;
  if (derelict) s.crewDerelict = true;
  if (handOn('gunner') && !derelict) setTimeout(() => toast(`Hask, at the guns: "${GUNNER[id]}"`, false, 5000), 1500);   // the gunner reads her (systems/hands.js)
  return s;
}
/** each frame (main.js): bring one in now and then; each kind keeps its own way of coming at you */
export function crewTick(dt) {
  if (DEMO() || !G.traffic || !rt.started || rt.modal) return;
  if (!unlocked(state, 'cannons')) return;   // no raiders of any kind before the cannons
  const S = G.ship, on = crewShip();
  if (!on) {
    if ((tryT -= dt) > 0) return;
    tryT = CREW_TRY;
    if (Math.random() > CREW_P) return;
    const r = sectorAt(S.pos.x, S.pos.z, state.seed), reg = r.sx === 0 && r.sz === 0 ? 'home' : r.faction.id, k = rt.dread || 0;
    const after = !!(state.hut && state.hut.rolls && state.hut.rolls.length);
    const ids = Object.keys(CREWS).filter((id) => CREWS[id].where(reg, k, C(id)) && canSpawn(id) && (!CREWS[id].deep || after));
    if (ids.length) spawnCrew(ids[Math.floor(Math.random() * ids.length)]);
    return;
  }
  const s = on, dx = S.pos.x - s.x, dz = S.pos.z - s.z, d = Math.hypot(dx, dz), toYou = Math.atan2(dx, -dz), c = C(s.crew);
  rig(s, rt.tNow);
  if (s.crewDerelict) return;
  const steer = (want, spd, rate = 0.6) => { s.heading += clamp(angleDiff(s.heading, want), -rate * dt, rate * dt); s.speed = spd; };   // angleDiff(a, b) is b - a
  const toward = (x, z) => Math.atan2(x - s.x, -(z - s.z));
  const fx = Math.sin(S.heading), fz = -Math.cos(S.heading), rx = Math.cos(S.heading), rz = Math.sin(S.heading);
  // the Widow (owner, 2026-11-25: her way of coming at you is part of her look): she always works round to your stern before she fires
  if (s.crew === 'wolves' && s.hostile && !s.struck) {
    const ax = S.pos.x - fx * 26, az = S.pos.z - fz * 26, astern = (-dx * fx + -dz * fz) < -0.75 * d;   // her bearing from you is behind your stern
    if (!astern) { steer(toward(ax + rx * 6 * s.circle, az + rz * 6 * s.circle), Math.max(9.5, S.speed + 2.5), 0.9); s.fireCd = Math.max(s.fireCd, 0.8); }
    else { const hx = S.pos.x - fx * 18, hz = S.pos.z - fz * 18; steer(toward(hx, hz), clamp(S.speed + (Math.hypot(hx - s.x, hz - s.z) - 2) * 0.4, 2, S.speed + 3), 1.0); }   // then she holds there, a little off your stern, and fires
  }
  if (s.crew === 'tollmen' && !s.hostile) {
    if (!s.asked) { if (d > 22) steer(toYou, Math.max(7, S.speed + 3), 1.0); else { s.asked = true; s.speed = 2; toast('A grey brig comes alongside, gunports shut. A man at her rail holds up a ledger.', false, 5500); } }
    else if (s.state !== 'paid') {   // she keeps station exactly one length off your beam, matching you, ledger up
      const tx = S.pos.x + rx * 14, tz = S.pos.z + rz * 14, td = Math.hypot(tx - s.x, tz - s.z);
      if (td > 4) steer(toward(tx, tz), clamp(S.speed + td * 0.5, 1, Math.max(11, S.speed + 4)), 1.2); else { s.heading += clamp(angleDiff(s.heading, S.heading), -dt, dt); s.speed = S.speed; } if (d > 140 && !s.warned) { s.warned = true; mark('crown', -2); refuse(s, 'You did not stop for the toll. Her gunports open.'); } }
    else steer(s.heading, 6);
  } else if (s.crew === 'beggars' && !s.hostile) {
    if (s.state === 'none' && d > 26) steer(toYou, 4);
    else if (s.shadow) { steer(toYou + Math.sin(rt.tNow * 0.1), Math.min(6, Math.max(3, d / 20))); if (tod.night > 0.6 && d < 60 && !s.tried) { s.tried = true; s.hostile = true; s.engaged = true; s.maxHp = s.hp = 25; toast('In the dark the Patience comes in fast. They are going to try to take it.', false, 5500); } }
  } else if (s.crew === 'collectors') {
    if (s.state === 'paid') steer(s.heading, 5);
    else {   // she keeps to windward of you, sailing straight into the wind as fast as she likes, her sails flat and empty
      const w = G.wind ? G.wind.dir : 0, ux = -Math.sin(w), uz = Math.cos(w), tx = S.pos.x + ux * 45, tz = S.pos.z + uz * 45;
      steer(toward(tx, tz), clamp(Math.hypot(tx - s.x, tz - s.z) / 4, 2, Math.max(9, S.speed + 3)), 0.9);
      if (rt.nerves != null && d < 120) rt.nerves = Math.min(1, rt.nerves + dt / 200);
    }
  }
}
/** after traffic.js has set the sails for the wind: each crew's rig (height, the Patience's luffing, the Quiet Hand's flat empty sails) */
function rig(s, t) {
  s.sails.forEach((sl, i) => {
    sl.pivot.scale.y *= s.rigK || 1;
    if (sl.jib) sl.jib.scale.y *= s.rigK || 1;
    if (s.crew === 'beggars') { sl.pivot.rotation.y += Math.sin(t * 7 + i) * 0.22; sl.sail.scale.x *= 0.75 + 0.25 * Math.sin(t * 11 + i * 2); }   // they cannot trim her: the sail luffs and shakes
    if (sl.limp) { sl.pivot.scale.y *= 0.55; sl.pivot.rotation.y = 0; sl.sail.scale.x = 0.25; }   // the Quiet Hand: flat fore and aft whatever the wind
  });
}
function refuse(s, line) {
  s.hostile = true; s.engaged = true; s.fireCd = 1.2; s.state = 'none';
  toast(line, false, 5000);
}

// ---- the ship screen (ui/shiptrade.js asks): what each one wants, and what comes of it
export function crewLine(s) { return CREWS[s.crew].line; }
export function crewOffers(s) {
  if (s.offers) return s.offers;
  const c = C(s.crew), id = s.crew;
  if (s.crewDerelict) return (s.offers = [{ id: 'cw_board', label: 'Go aboard', cost: 0, desc: 'she is drifting, and nobody answers', used: false }]);
  if (id === 'wolves') return (s.offers = [
    { id: 'cw_tribute', label: 'Pay her off', cost: 70, desc: 'Vosk takes it without counting', used: false },
    { id: 'cw_wbluff', label: 'Tell her you are not the one', cost: 0, desc: c.beat ? 'she has met you before' : 'she has not met you before', used: false },
    { id: 'defy', label: 'Defy her', cost: 0, desc: 'press Space to fire once she is in range', used: false },
  ]);
  if (id === 'tollmen') { const toll = 20 + 6 * (c.paidN || 0), crate = Object.values(state.story.cargo || {}).some((n) => n > 0);
    if (c.crossed) return (s.offers = [{ id: 'cw_toll', label: 'Pay the toll', cost: toll, desc: 'your name is in his ledger now. There is no other way past him', used: false, must: true }, { id: 'cw_refuse', label: 'Refuse', cost: 0, desc: '', used: false, hidden: true }]);   // (owner, 2026-11-26: "sometimes you have to pay up")
    return (s.offers = [
      { id: 'cw_toll', label: 'Pay the toll', cost: toll, desc: 'he writes it in the ledger', used: false },
      { id: 'cw_crate', label: 'Give him a crate', cost: 0, desc: crate ? 'one crate from the hold, instead of coin' : 'there is nothing in the hold', used: !crate },
      { id: 'cw_tbluff', label: 'Say the Crown has excused you', cost: 0, desc: 'he will want to believe it more if they know you', used: false },
      { id: 'cw_refuse', label: 'Refuse', cost: 0, desc: 'he closes the ledger', used: false },
    ]); }
  if (id === 'beggars') { const S = state.story.stores || { food: 0, water: 0 };
    return (s.offers = [
      { id: 'cw_water', label: 'Food and water', cost: 0, desc: S.water >= 1 && S.food >= 1 ? 'a day of each from your own casks' : 'your own casks are nearly dry', used: !(S.water >= 1 && S.food >= 1) },
      { id: 'cw_kit', label: 'A patch kit', cost: 0, desc: state.patchKits > 0 ? `you have ${state.patchKits}` : 'you have none', used: !(state.patchKits > 0) },
      { id: 'cw_coin', label: 'A little coin', cost: 15, desc: 'for the next harbour', used: false },
      { id: 'cw_no', label: 'Sail on', cost: 0, desc: 'they watch you go', used: false },
    ]); }
  // collectors
  const has = (state.story.chest || []).filter((x) => !x.sold && CHEST[x.id] && CHEST[x.id].kind === 'remnant'), want = has[0];
  s.want = want ? want.id : null;
  return (s.offers = c.beat === 1 ? [
    { id: 'cw_number', label: 'Tell them your number', cost: 0, desc: 'the last one you threw', used: !(state.hut && state.hut.rolls && state.hut.rolls.length) },
    { id: 'cw_keep', label: 'Keep it to yourself', cost: 0, desc: 'they wait', used: false },
  ] : c.beat >= 2 ? [{ id: 'cw_look', label: 'Look', cost: 0, desc: 'they hold something up', used: false }] : [
    { id: 'cw_give', label: want ? `Give them ${CHEST[want.id].name.toLowerCase()}` : 'Give them something', cost: 0, desc: want ? 'they knew it was in your chest' : 'you have nothing they want', used: !want },
    { id: 'cw_keep', label: 'Keep it', cost: 0, desc: 'they will wait', used: false },
  ]);
}
/** returns true if it handled the offer */
export function crewOffer(s, o) {
  if (!o.id.startsWith('cw_')) return false;
  const c = C(s.crew), leave = () => { s.state = 'paid'; s.hostile = false; s.engaged = false; s.heading += Math.PI * 0.7; };
  const bumpMood = (d) => { state.story.mood = clamp((state.story.mood ?? 0.7) + d, 0, 1); };
  switch (o.id) {
    case 'cw_board': {   // the Red Widow, adrift (wolves beat 3)
      c.beat = 3; s.state = 'paid';
      const text = 'Nobody aboard. Her log is open on the chart table. The last line, in Vosk\'s hand: "Found her. Lower in the water, as I said. She was ours all along."';
      state.notes.push({ text, dark: true }); toast(text, true, 9000); G.closeModal(); return true;
    }
    case 'cw_tribute': leave(); toast('Vosk takes the purse without counting it. "Not the one," she says, to nobody, and her ship turns away.', false, 6000); break;
    case 'cw_wbluff':
      if (c.beat >= 1 || Math.random() < 0.25) { leave(); toast('She looks a long time at your waterline. "No. Too high." She lets you pass.', false, 6000); }
      else { s.fireCd = 0.3; toast('"They all say that." She draws.', false, 4000); }
      break;
    case 'cw_toll': {
      c.paidN = (c.paidN || 0) + 1; c.paid = state.dayN; c.crossed = false; leave();
      const L = c.paidN === 1 ? 'He writes THE MERRY GULL in the ledger and blots it. "Paid. Good sailing."'
        : c.paidN === 3 ? 'He turns the ledger round to show you. Your ship is on every page, far ahead, every toll already paid. The hand is yours.'
        : c.paidN >= 5 ? '"You are paid up, Captain. All the way." He closes the ledger. He does not open it for you again.' : 'He writes it down. He does not look up.';
      toast(L, c.paidN === 3, 8000); if (c.paidN === 3) state.notes.push({ text: 'The Toll\'s ledger: our ship on every page ahead, every toll paid, in my own hand.', dark: true });
      if (c.paidN >= 5) c.paid = state.dayN + 1e5;   // never again
      break;
    }
    case 'cw_crate': { const cg = state.story.cargo || {}; const k = Object.keys(cg).find((g) => cg[g] > 0); if (!k) return true; cg[k]--; if (!cg[k]) delete cg[k]; c.paid = state.dayN; leave(); toast('He takes the crate and writes it down as paid in full.', false, 5000); break; }
    case 'cw_tbluff': {
      let lv = 0; for (const r of Object.values(state.rep || {})) lv = Math.max(lv, Math.min(3, Math.floor((r.visits + 2 * r.deliveries) / 3)));
      if (Math.random() < 0.2 + 0.18 * lv) { c.paid = state.dayN; leave(); toast('He runs his pen down a page and finds something. "So you are." He lets you go.', false, 6000); }
      else { c.crossed = true; mark('crown', -2); refuse(s, 'He looks at you for a long moment, then closes the ledger. Her gunports open.'); }   // the Crown hears of it (systems/standing.js)
      break;
    }
    case 'cw_refuse': c.crossed = true; mark('crown', -2); refuse(s, 'He closes the ledger without a word. Her gunports open.'); break;
    case 'cw_water': case 'cw_kit': case 'cw_coin': {
      if (o.id === 'cw_water') { const S = state.story.stores; S.food -= 1; S.water -= 1; }
      if (o.id === 'cw_kit') state.patchKits--;
      c.helped = (c.helped || 0) + 1; c.beat = Math.min(3, c.helped); leave(); bumpMood(0.08); mark('free', 2);   // the Cays hear of it
      const L = c.helped === 1 ? 'The children wave until they are out of sight. The woman does not; she nods once, and writes your ship\'s name on the inside of the hatch.'
        : c.helped === 2 ? 'This time she has something for you: a scrap of chart, a cross on it in the shallows. "My husband found that. He did not come back from it. You might."'
        : 'They are looking for somewhere to stop for good. She asks about the stilt hut on the Sandbar Cays. "Nobody lives there?" You do not know what to tell her.';
      toast(L, false, 8000);
      if (c.helped === 2) { state.story.patienceChart = state.dayN; revealWreck(G.world, 'husband', 'the Patience'); }   // her husband's boat goes on the chart (systems/wrecks.js)
      if (c.helped >= 3) state.story.patienceHome = state.dayN;   // shallows.js: they live at the stilt hut now
      break;
    }
    case 'cw_no': s.shadow = true; s.state = 'done'; c.refused = (c.refused || 0) + 1; toast('They watch you go. A while later, their patched sail is still behind you.', false, 5000); break;
    case 'cw_give': { const it = (state.story.chest || []).find((x) => x.id === s.want && !x.sold); if (it) it.sold = true; c.beat = 1; leave(); toast('They take it as if it had been lent. "Thank you. That is one." The lanterns go away down the wind.', true, 7000); break; }
    case 'cw_number': { c.beat = 2; leave(); const n = state.hut.rolls[state.hut.rolls.length - 1].n; toast(`You tell them. They do not write it down. "We know," they say. "We wanted to hear you say it."`, true, 7000); state.story.toldNumber = n; break; }
    case 'cw_look': c.beat = 3; leave(); toast('They hold up a figurehead, wet, old, carved. It is your own, from the bow of the Gull. You can still see her there, at the bow, where she has always been.', true, 9000); break;
    case 'cw_keep': s.state = 'none'; s.offers = null; toast('"Of course." They do not go anywhere.', true, 4000); break;
    default: return false;
  }
  return true;
}
/** combat (storybeats.onHitEnemy): a named ship never sinks; she strikes, and boarding her is a beat of her story */
export function crewStruck(s) {
  if (!s.crew) return false;
  s.hp = 1; s.struck = true; s.engaged = false; s.rig = s.rig ?? 0.3;
  toast(`The ${s.name} strikes her colours. Come alongside and board her (E).`, false, 5500);
  return true;
}
export function crewBoarded(s) {
  if (!s.crew) return null;
  const c = C(s.crew);
  if (s.crew === 'wolves') { c.beat = Math.min(2, c.beat + 1); return c.beat === 1 ? 'In Vosk\'s cabin, a page of her log: "Not the one. Lower in the water, she was. I will know her."' : 'Vosk does not look at you this time. "You again. Not you. Never you."'; }
  if (s.crew === 'tollmen') return 'In the booth, the ledger. Your ship is on every page, far ahead. You do not take it.';
  if (s.crew === 'beggars') { c.refused = (c.refused || 0) + 1; mark('free', -4); return 'They had almost nothing. The children watch you take it.'; }
  return null;
}
