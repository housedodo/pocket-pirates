// The Lantern Guild's lights (2026-11-17, owner: build the suggested puzzles; docs/proposals/REGIONAL_CATALOGUE.md section 5).
//   M-LANT-1 Every light its rhythm: each Guild lighthouse flashes its own pattern (regions.js lightRhythm: one to three flashes,
//     short or long, every 6 to 10 s). Once the ship has been within RHYTHM_NEAR of a lit one, the chart draws its pattern beside it
//     in ink, dots and dashes, no words (chartstyles.js). At night or in fog a light is named by counting.
//   P-LANT-3 The keeper's supper: at dusk, a lone lighthouse rock in Guild water (no harbour) has its keeper out on the gallery.
//     Pass within SUPPER_WAVE and he swings his lantern twice. Anchor under the light (E, within SUPPER_E): if you carry a fish, a
//     basket comes down on a line, takes the first fish, goes up, and comes down again with a jar of oil. No fish: it comes down
//     empty and goes up empty. Once a day per light. The Guild's people tend lamps, not nets (regions.js sellMul).
// Nothing here is said in words but one line of Mara's, once. Demo-safe: no dread, nothing from after the hut.
import * as THREE from 'three';
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { mats } from '../psx.js';
import { Builder } from '../builder.js';
import { TILE } from '../textures.js';
import { shoreR, terrainHeight } from '../world.js';
import { lampDead, lightRhythm, rhythmOn, RHYTHM_NEAR } from '../regions.js';
import { nightKey } from './calendar.js';
import { oilOn } from './storybeats.js';
import { oilCap } from '../oil.js';
import { sellable } from '../jobs.js';

// ---- P-LANT-3 numbers
export const SUPPER_FROM = 17.5, SUPPER_TO = 20.5;   // dusk, on the harbour clock
export const SUPPER_WAVE = 120;    // the keeper swings his lantern when the ship passes within this of the rock
export const SUPPER_E = 45;        // E reaches him from this close (as a dead light)
export const SUPPER_ANCHOR = 2.6;  // s: lying to under the light (as going ashore)
export const SUPPER_OIL = 20;      // what comes down in the jar
export const SUPPER_SWING = 3;     // s: two swings of the lantern
const BASKET_RUN = 2.5, BASKET_REST = 1.2;   // s: the basket's way down or up; how long it rests at either end
const KEEPER_SEEN = 260;           // the keeper is put on his gallery within this of the ship
const GALLERY_R = 2.1;             // how far out from the lamp he stands

/** the edge distance from (x, z) to an island's shore */
const edgeTo = (d, x, z) => Math.hypot(x - d.x, z - d.z) - shoreR(d, Math.atan2(z - d.z, x - d.x));
const guildLight = (d) => d.region === 'lantern' && !d.lm && !!d.lampAt;
const hourNow = () => state.time * 24;

/** once a frame (main.js, after the world): every lit Guild light flashes its rhythm; the keepers come out at dusk */
export function lanternTick(dt) {
  const p = G.ship.pos, rh = state.story.rhythm || (state.story.rhythm = {});
  for (const isl of G.world.islands.values()) {
    const d = isl.desc;
    if (!guildLight(d) || !isl.lampOn) continue;
    if (!isl.lit || isl.stare) continue;   // dark (day, or a dead light), or every beam turned on the ship: World.setLit has it
    const on = rhythmOn(lightRhythm(d), rt.tNow + (d.seed % 97) / 9.7);
    isl.lampOn.visible = on; if (isl.lampOff) isl.lampOff.visible = !on; if (isl.beam) isl.beam.visible = on;
    if (!rh[d.id] && edgeTo(d, p.x, p.z) < RHYTHM_NEAR) rh[d.id] = 1;   // the chart takes its pattern down
  }
  supperTick(dt);
}

// ---- P-LANT-3 the keeper's supper
let near = null;   // { isl, d, dist } the keeper's rock in reach this frame, or null
const keepers = new Map();   // d.id -> { isl, g, lantern, basket, rope, fish, jar, waved, swingT, run }
let geo = null;
function geos() {
  if (geo) return geo;
  const man = new Builder(); man.ambient = 0.7;
  man.box(0, 0.45, 0, 0.5, 0.9, 0.36, '#2a3440', TILE.white);    // a dark coat
  man.box(0, 1.07, 0, 0.32, 0.34, 0.3, '#d8a880', TILE.white);    // the face
  man.box(0, 1.28, 0, 0.38, 0.1, 0.36, '#1e1a16', TILE.white);    // a cap
  const lamp = new Builder(); lamp.grime = 0; lamp.ambient = 1;
  lamp.box(0, -0.55, 0, 0.32, 0.36, 0.32, '#ffc060', TILE.white);   // the lantern, hung below the hand
  const arm = new Builder(); arm.box(0, -0.18, 0, 0.06, 0.36, 0.06, '#1e1a16', TILE.white);
  const basket = new Builder(); basket.box(0, 0.2, 0, 0.6, 0.4, 0.6, '#9a7040', TILE.planks);
  const rope = new Builder(); rope.box(0, 0.5, 0, 0.05, 1, 0.05, '#c8b890', TILE.rope);   // one unit long: scaled to the drop
  const fish = new Builder(); fish.box(0, 0.48, 0, 0.18, 0.12, 0.5, '#b8c4cc', TILE.white);
  const jar = new Builder(); jar.box(0, 0.52, 0, 0.3, 0.36, 0.3, '#c89030', TILE.white);
  geo = { man: man.geometry(), lamp: lamp.geometry(), arm: arm.geometry(), basket: basket.geometry(), rope: rope.geometry(), fish: fish.geometry(), jar: jar.geometry() };
  return geo;
}
function keeperFor(isl) {
  const d = isl.desc; let k = keepers.get(d.id);
  if (k && k.isl !== isl) { k.isl.group.remove(k.g); keepers.delete(d.id); k = null; }   // the island was built again
  if (k) return k;
  const q = geos(), g = new THREE.Group(), man = new THREE.Mesh(q.man, mats.props), pivot = new THREE.Group();
  man.position.set(0, 0, GALLERY_R); g.add(man);
  pivot.position.set(0.32, 0.95, GALLERY_R + 0.15); pivot.add(new THREE.Mesh(q.arm, mats.props)); pivot.add(new THREE.Mesh(q.lamp, mats.glow)); g.add(pivot);
  const basket = new THREE.Group(), rope = new THREE.Mesh(q.rope, mats.props), fish = new THREE.Mesh(q.fish, mats.props), jar = new THREE.Mesh(q.jar, mats.props);
  basket.add(new THREE.Mesh(q.basket, mats.props), fish, jar); fish.visible = jar.visible = false;
  const L = d.lampAt, lx = L.x - d.x, lz = L.z - d.z, ly = (L.y || 9) - 0.45;
  g.position.set(lx, ly, lz);
  isl.group.add(g); isl.group.add(basket); isl.group.add(rope); basket.visible = rope.visible = false;
  k = { isl, g, pivot, basket, rope, fish, jar, lx, ly, lz, waved: false, swingT: 0, run: null };
  keepers.set(d.id, k); return k;
}
/** is this rock's keeper out tonight? (a lone Guild light, lit, dusk, oil on board the game) */
function keeperOut(d) {
  if (!guildLight(d) || d.type === 'harbour') return false;
  const h = hourNow();
  return h >= SUPPER_FROM && h <= SUPPER_TO && oilOn() && !lampDead(state, d, nightKey());
}
function supperTick(dt) {
  near = null;
  const p = G.ship.pos;
  for (const [id, k] of keepers) {   // the island went out of reach (or was built again): its keeper goes with it
    if (G.world.islands.get(id) === k.isl) continue;
    if (k.run) { if (k.run.fish && k.run.step < 5 && oilOn()) state.oil = Math.min(oilCap(state.upgrades), state.oil + SUPPER_OIL); if (k.run.fish) state.story.supper[id] = state.dayN; }   // sailed off mid-trade: the jar was sent down anyway
    k.isl.group.remove(k.g, k.basket, k.rope); keepers.delete(id);
  }
  for (const isl of G.world.islands.values()) {
    const d = isl.desc;
    if (!isl.lampOn || !guildLight(d) || d.type === 'harbour') continue;
    const dist = edgeTo(d, p.x, p.z), k = keepers.get(d.id);
    const out = keeperOut(d) && dist < KEEPER_SEEN;
    if (!out && !(k && k.run)) { if (k) k.g.visible = false; continue; }
    const kk = keeperFor(isl); kk.g.visible = true;
    kk.g.rotation.y = Math.atan2(p.x - (d.x + kk.lx), p.z - (d.z + kk.lz));   // he faces the ship
    if (dist < SUPPER_WAVE && !kk.waved) { kk.waved = true; kk.swingT = SUPPER_SWING; }   // come closer
    if (dist > SUPPER_WAVE + 40) kk.waved = false;
    kk.swingT = Math.max(0, kk.swingT - dt);
    kk.pivot.rotation.z = kk.swingT > 0 ? Math.sin((SUPPER_SWING - kk.swingT) / SUPPER_SWING * Math.PI * 4) * 0.9 : 0;
    if (kk.run) runBasket(kk, dt);
    if (out && dist < SUPPER_E && !kk.run && state.story.supper[d.id] !== state.dayN && (!near || dist < near.dist)) near = { isl, d, dist };
  }
}
/** getInteract (interact.js), after a dead light: the keeper's rock in reach, or null */
export function supperTarget() {
  if (!near) return null;
  return { kind: 'supper', key: 'supper:' + near.d.id, isl: near.isl, prompt: '[E] Lie to under the light' };
}
/** E (interact.js): the crew calls up; when it is done the basket comes down */
export function startSupper(tg) {
  const d = tg.isl.desc;
  rt.dig = { key: tg.key, t: 0, label: 'Calling up to the gallery...', need: SUPPER_ANCHOR, done: () => {
    const k = keeperFor(tg.isl);
    if (k.run) return;
    const L = d.lampAt, a = Math.atan2(G.ship.pos.x - L.x, G.ship.pos.z - L.z), bx = k.lx + Math.sin(a) * (GALLERY_R + 0.5), bz = k.lz + Math.cos(a) * (GALLERY_R + 0.5);
    k.run = { t: 0, step: 0, bx, bz, top: k.ly + 1.1, bottom: Math.max(terrainHeight(d, bx, bz), 0) + 0.1, fish: null };
  } };
}
function runBasket(k, dt) {
  const r = k.run, d = k.isl.desc;
  // steps: 0 down, 1 rest (the fish goes in), 2 up, 3 rest, 4 down with the jar, 5 rest (the oil), 6 up, then done
  const len = [BASKET_RUN, BASKET_REST, BASKET_RUN, BASKET_REST, BASKET_RUN, BASKET_REST, BASKET_RUN];
  r.t += dt;
  if (r.t >= len[r.step]) {
    r.t = 0; r.step++;
    if (r.step === 1) {   // at the bottom: the first fish goes in (never one an errand needs, G-08)
      const f = sellable(state).fish[0];
      if (f) { const i = state.catch.indexOf(f); if (i >= 0) state.catch.splice(i, 1); r.fish = f; k.fish.visible = true; }
    }
    if (r.step === 3 && !r.fish) {   // up empty: nothing to trade
      k.basket.visible = k.rope.visible = false; k.run = null;
      if (!state.story.supperHint) { state.story.supperHint = 1; G.objectives.say('No fish for the keeper, Captain?'); }
      return;
    }
    if (r.step === 3) { k.fish.visible = false; state.story.supper[d.id] = state.dayN; }   // the fish is taken in: once a day per light
    if (r.step === 4) k.jar.visible = true;
    if (r.step === 5 && oilOn()) state.oil = Math.min(oilCap(state.upgrades), state.oil + SUPPER_OIL);   // the jar is taken aboard
    if (r.step === 5) k.jar.visible = false;
    if (r.step >= len.length) { k.basket.visible = k.rope.visible = false; k.run = null; return; }
  }
  const down = r.step === 0 || r.step === 4, up = r.step === 2 || r.step === 6, f = r.t / len[r.step];
  const y = down ? r.top + (r.bottom - r.top) * f : up ? r.bottom + (r.top - r.bottom) * f : (r.step === 1 || r.step === 5 ? r.bottom : r.top);
  k.basket.visible = k.rope.visible = true;
  k.basket.position.set(r.bx, y, r.bz);
  k.rope.position.set(r.bx, y + 0.4, r.bz); k.rope.scale.y = Math.max(0.05, r.top - y - 0.4);
}
