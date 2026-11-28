// Danger at sea (owner, 2026-11-28: "make danger real", from the gameplay review: a raider hit for 7-10 against a hull of 100-190 that
// heals itself, so the hull and cannon upgrades had nothing to answer). Three things, none of them a number on the HUD:
//   threat    a raider's strength grows with her water and with the days at sea: the home waters' are timid, the Reef's are hard;
//             by the second month every crew is better found. More hull, harder and more often hit, a truer aim (combat.js, traffic.js).
//   fire      a round shot that strikes home can set the deck alight: smoke from the deck, the hull burns until the crew have it out
//             (sooner in rain, with a bigger crew, sooner still with a better hull). Mara calls it once.
//   boarding  a raider that gets alongside a ship with no way on her (slow, anchored) puts men over the rail: get way on and pull off,
//             or they take a share of the gold and a crate from the hold and are gone. The sails and the oars are the answer.
// Deep water hurts more as well: storm wear grows with the dread (main.js), less with a stronger hull.
//   the follower  (owner, 2026-11-28: "do the gameplay changes how you see fit"; the review: no threat in the late game) far out, in the
//             deep dread and well away from land, a long dark shape comes up under the water and keeps pace behind the ship. It never
//             shows itself. A ship under way with her lamp lit it only follows; one that lies still, or sails dark at night, it strikes from
//             below: the hull, the crew's nerve. Shallow water near an island, or the dawn, sends it down. A better lantern keeps it further off.
// Full game only (the demo has its own, gentler sea).
import { isKnown } from '../clues.js';
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { toast } from '../ui/dom.js';
import { hurtPlayer } from './storybeats.js';
import { cargo } from './trade.js';
import * as THREE from 'three';
import { scene } from '../core/engine.js';

const DEMO = () => typeof window !== 'undefined' && window.__BUILD === 'demo';
// ---- the numbers (tune by hand)
export const REGION_THREAT = { home: 0.6, free: 0.85, crown: 1.0, lantern: 1.0, reef: 1.25, drowned: 1.3 };
export const DAY_GROWTH = 0.5, DAY_FULL = 30;            // threat rises by half again over the first 30 days
export const HIT = [9, 13];                               // a raider's round shot at threat 1 (was 7-10 at every threat)
export const FIRE_P = 0.28, FIRE_HULL = 0.13;             // chance a hit sets the deck alight; less per hull level
export const FIRE_DPS = 1.4, FIRE_TIME = 9;               // hull lost a second while it burns; seconds until it is out on its own
export const BOARD_R = 7.5, BOARD_SLOW = 3.5, BOARD_TIME = 3.2;   // alongside, slower than this, for this long: they are over the rail
export const BOARD_GOLD = 0.15;                           // the share of the gold a boarding party takes (and one crate)

export const threatAt = (region) => (REGION_THREAT[region] || 1) * (1 + DAY_GROWTH * Math.min(1, (state.dayN || 0) / DAY_FULL));
/** traffic.js: a raider is armed for her water (her hull grows with the threat) */
export function armRaider(s) {
  if (DEMO()) return;
  const th = threatAt((s.faction && s.faction.id) || 'free');
  s.threat = th; s.maxHp = s.hp = Math.round(s.hp * (0.8 + 0.4 * th));
}
/** combat.js: her shot (damage, spread) and the time to her next one */
export const raiderShot = (s) => { const th = DEMO() ? 0.8 : (s.threat || 1); return { dmg: (HIT[0] + Math.random() * (HIT[1] - HIT[0])) * th, spreadK: 1 / Math.sqrt(th), cdK: 1 / (0.8 + 0.2 * th) }; };

/** main.js passes this as onHitPlayer: the hurt, and now and then a fire */
export function playerHit(dmg, owner) {
  hurtPlayer(dmg);
  if (DEMO() || owner !== 1) return;
  const p = Math.max(0.05, FIRE_P - FIRE_HULL * FIRE_P * ((state.upgrades && state.upgrades.hull) || 0));
  if (Math.random() < p && !(rt.fire > 0)) {
    rt.fire = FIRE_TIME; rt.fireTick = 0;
    if (!rt.fireSaid) { rt.fireSaid = true; if (G.objectives && G.objectives.mate) G.objectives.mate.say('Fire on deck! Buckets, all of you!'); }
  }
}

/** each frame (main.js, after combat.update) */
export function dangerTick(dt) {
  if (DEMO()) return;
  const ship = G.ship; if (!ship) return;
  if (rt.fire > 0) {   // the fire: hull burns, smoke rises from the deck; rain, hands and a sound hull put it out sooner
    const hands = 1 + 0.25 * ((state.upgrades && state.upgrades.crew) || 0) + 0.2 * ((state.upgrades && state.upgrades.hull) || 0);
    const rain = G.weather ? G.weather.rain || 0 : 0;
    rt.fire -= dt * hands * (1 + 2 * rain);
    rt.fireTick = (rt.fireTick || 0) + dt;
    if (rt.fireTick >= 1.5) { rt.fireTick = 0; hurtPlayer(FIRE_DPS * 1.5); }
    if (G.combat && (rt.fireSmoke = (rt.fireSmoke || 0) - dt) <= 0) {
      rt.fireSmoke = 0.18;
      const bx = ship.pos.x + Math.sin(ship.heading) * (Math.random() - 0.3) * 2.5, bz = ship.pos.z - Math.cos(ship.heading) * (Math.random() - 0.3) * 2.5;
      G.combat.puff(bx, 2.4 + Math.random() * 0.6, bz, 0.35 + Math.random() * 0.25);
    }
    if (rt.fire <= 0) { rt.fire = 0; toast('The fire is out.', false, 3500); }
  }
  // boarding: a hostile raider close alongside a ship with no way on her
  const tr = G.traffic; if (!tr) return;
  let near = null;
  for (const s of tr.ships) { if (!s.hostile || s.sinking || s.struck || s.hp <= 0) continue; if (Math.hypot(s.x - ship.pos.x, s.z - ship.pos.z) < BOARD_R) { near = s; break; } }
  const slow = (ship.speed || 0) < BOARD_SLOW || ship.anchored;
  if (near && slow) {
    if (!(rt.boardT > 0) && !rt.boardWarned) { rt.boardWarned = true; if (G.objectives && G.objectives.mate) G.objectives.mate.say('Grapnels! They mean to board us! Get way on her, Captain!'); }
    rt.boardT = (rt.boardT || 0) + dt;
    if (rt.boardT >= BOARD_TIME) boarded(near);
  } else { rt.boardT = Math.max(0, (rt.boardT || 0) - dt * 2); if (!near) rt.boardWarned = false; }
}

function boarded(s) {
  rt.boardT = 0; rt.boardWarned = false;
  const took = Math.round((state.gold || 0) * BOARD_GOLD); state.gold -= took;
  const c = cargo(), keys = Object.keys(c).filter((k) => c[k] > 0);
  let crate = '';
  if (keys.length) { const k = keys[Math.floor(Math.random() * keys.length)]; c[k]--; if (c[k] <= 0) delete c[k]; crate = ' and a crate from the hold'; }
  hurtPlayer(6);
  s.hostile = false; s.engaged = false; s.heading += Math.PI * 0.8; s.speed = 8;   // they are gone with it
  toast(`They came over the rail and went back with ${took} gold${crate}.`, false, 7000);
}

// ---- the follower (see the header). Numbers by hand.
export const FOLLOW_DREAD = 0.68, FOLLOW_LAND = 70, FOLLOW_SLOW = 3.2, STRIKE_EVERY = 22, STRIKE = [9, 16];
let shadow = null;
function shadowMesh() {
  if (shadow) return shadow;
  const g = new THREE.SphereGeometry(1, 8, 4); g.scale(2.4, 0.25, 11);
  shadow = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x05070a, transparent: true, opacity: 0, depthWrite: false }));
  shadow.renderOrder = 3; scene.add(shadow); return shadow;
}
export function followerTick(dt) {
  if (DEMO() || !G.ship || !G.world) return;
  const ship = G.ship, dread = rt.dread || 0, night = G.daynight ? G.daynight.night : ((state.time || 0) > 0.8 || (state.time || 0) < 0.2);
  const land = G.world.nearest && G.world.nearest(ship.pos.x, ship.pos.z, FOLLOW_LAND);
  const dawn = (state.time || 0) > 0.22 && (state.time || 0) < 0.3;
  const want = dread >= FOLLOW_DREAD && !land && !dawn;
  rt.follow = Math.max(0, Math.min(1, (rt.follow || 0) + (want ? dt / 40 : -dt / 8)));
  rt.lampBlue = isKnown(state, 'bluelamp') ? rt.follow : 0;   // the Guild's clue (CL-L1-a, "The lamps burn a little blue"): the ship's lamp goes blue while it is near
  const m = shadowMesh(); m.visible = rt.follow > 0.02;
  if (!m.visible) { rt.followT = 0; return; }
  const lamp = !rt.lampOut, back = 14 + 10 * ((state.upgrades && state.upgrades.lantern) || 0) * (lamp ? 1 : 0) + (lamp ? 6 : -4);   // a better lamp keeps it further back
  const h = ship.heading, t = rt.tNow || 0;
  m.position.set(ship.pos.x - Math.sin(h) * back + Math.cos(h) * Math.sin(t * 0.13) * 6, -1.6, ship.pos.z + Math.cos(h) * back + Math.sin(h) * Math.sin(t * 0.13) * 6);
  m.rotation.y = -h + Math.sin(t * 0.21) * 0.15;
  m.material.opacity = 0.42 * rt.follow;
  const exposed = (ship.speed || 0) < FOLLOW_SLOW || ship.anchored || (night && rt.lampOut);
  rt.followT = exposed ? (rt.followT || 0) + dt * rt.follow : Math.max(0, (rt.followT || 0) - dt * 0.5);
  if (rt.followT >= STRIKE_EVERY) {
    rt.followT = 0;
    hurtPlayer((STRIKE[0] + Math.random() * (STRIKE[1] - STRIKE[0])) * (1 - 0.1 * ((state.upgrades && state.upgrades.hull) || 0)));
    rt.shake = Math.max(rt.shake || 0, 0.8);
    if (state.story.mood != null) state.story.mood = Math.max(0, state.story.mood - 0.08);
    if (!rt.followSaid) { rt.followSaid = true; if (G.objectives && G.objectives.mate) G.objectives.mate.say('Something struck the keel. From underneath. Keep her moving, Captain, and keep the lamp lit.'); }
    else if (G.objectives && G.objectives.mate && Math.random() < 0.4) G.objectives.mate.say('Again. It is still there.', true);
  }
}

