// The sea's small events, in place of the choice cards (owner, 2026-11-19: "do 1 and 2 for replacing choice cards"). No card and no
// menu any more. Each thing on the water either happens on its own as you pass (1), or is done with the game's ordinary controls (2):
// slowing down alongside, E as for salvage or a hail, a line cast with C. Their models are the old cards' signs (sighting.js SIGHTS).
//   chest     (2) E to haul it aboard; come at it slowly or it swings into the hull and sinks
//   dinghy    (2) E to buy a map from the peddler (MAP_PRICE): a rumour on the chart
//   buoy      (1) rings a tune with no wind as you come near; (2) E to take a coin from its chain, and the tune stops
//   castaway  (1) come alongside the raft and they climb aboard (crew, as before)
//   stowaway  (1) the crate that moves bumps the hull: somebody is aboard, and the deck is scrubbed by morning (a purse in the planks)
//   rowboat   (1) the empty rowboat with the steaming cup keeps company with you for a while; (2) lie still alongside and Mara takes the tea
//   shoal     (2) cast a line (C) in the boiling water: bites come at once (fishing waitMul)
//   calm      (1, dread 0.4 and up) the sea goes still in a circle and the ship slows; lie still in it and a shell comes up (the sea chest)
// The squall and the raiders' sails are left to the weather and the traffic, which already do them. Lines are the cards' own, cut down.
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { toast } from '../ui/dom.js';
import { chestAdd } from '../chest.js';
import { cardCtx } from '../ui/encounters.js';

export const MAP_PRICE = 12, HAUL_SLOW = 2.5, STILL = 0.8;
const say = (t, dark = false, ms = 6000) => toast(t, dark, ms);
export const EVENTS = {
  chest: { e: true, prompt: 'Haul the chest aboard' },
  dinghy: { e: true, prompt: `Buy a map from the peddler (${MAP_PRICE} gold)` },
  buoy: { e: true, prompt: 'Take a coin from its chain' },
  castaway: {}, stowaway: {}, rowboat: {}, shoal: {},
  calm: { minDread: 0.4 },
};
/** which event comes next (the demo keeps to the cosy ones) */
export function drawEvent(dread, seen) {
  const pool = Object.entries(EVENTS).filter(([id, e]) => dread >= (e.minDread || 0) && !seen.includes(id)).map(([id]) => id);
  const all = Object.entries(EVENTS).filter(([, e]) => dread >= (e.minDread || 0)).map(([id]) => id);
  const list = pool.length ? pool : all;
  return list[Math.floor(Math.random() * list.length)];
}
/** a card-shaped object for sighting.spawn */
export const eventCard = (id) => ({ id, ev: true, e: !!EVENTS[id].e, prompt: EVENTS[id].prompt });

/** E on an event's sign (interact.js) */
export function actEvent(c) {
  const id = c.card.id, ship = G.ship;
  if (id === 'chest') {
    if (ship.speed > HAUL_SLOW) { G.hurtPlayer(6); say('It swings into the hull on the way up. The chest sinks. The dent stays.'); }
    else { const g = 12 + Math.floor(Math.random() * 22); state.gold += g; G.audio.play('treasure'); say(`Heavy, wet, and full of coins. +${g} gold.`); }
    G.sighting.dismiss(); return;
  }
  if (id === 'dinghy') {
    if (state.gold < MAP_PRICE) { say('He looks at your purse and rows on, singing about money.'); G.sighting.dismiss(); return; }
    const r = cardCtx().rumour('a peddler in a dinghy');
    state.gold -= MAP_PRICE; say(r || 'He sells you a map. It is of a place you have already been. Still, nice drawing.', false, 8000);
    G.sighting.dismiss(); return;
  }
  if (id === 'buoy') {
    const g = 8 + Math.floor(Math.random() * 12); state.gold += g; say(`Coins are tied to its chain, like offerings. You take a few. (+${g} gold) The tune stops.`);
    c.card.e = false; c.label = ''; c.taken = true; return;
  }
}
/** each frame while an event's sign is on the water (sighting.js): what happens on its own */
export function eventTick(c, dist, dt) {
  const id = c.card.id, ship = G.ship;
  if (id === 'buoy' && !c.rang && dist < 45) { c.rang = true; G.audio.play('bell'); say('A buoy rings with no wind and no waves. It is ringing a tune.'); }
  if (id === 'castaway' && !c.done && dist < 16) { c.done = true; const t = cardCtx().castaway(); say(`Someone climbs off the raft and onto your deck. ${t}`, false, 8000); G.sighting.dismiss(); }
  if (id === 'stowaway' && !c.done && dist < 14) { c.done = true; state.gold += 15; say('The crate bumps the hull and a small face looks out. By morning the deck is scrubbed, and there is a purse wedged in the planks. +15 gold.', false, 8000); G.sighting.dismiss(); }
  if (id === 'rowboat') {
    if (!c.seen && dist < 40) { c.seen = c.age; say('An empty rowboat drifts alongside, oars stowed, a cup of tea still steaming on the seat.'); }
    if (c.seen != null && c.age - c.seen < 60 && dist > 30 && dist < 120) { const k = 30 / dist; c.x = ship.pos.x + (c.x - ship.pos.x) * k; c.z = ship.pos.z + (c.z - ship.pos.z) * k; }   // it keeps you company
    if (c.seen != null && !c.done && dist < 12 && ship.speed < STILL) { c.done = true; state.buffs.speed = Math.max(state.buffs.speed, 60); say('Mara takes the cup. It is very good tea. Everyone feels quick and cheerful for a while.'); }
    if (c.seen != null && c.age - c.seen > 60 && !c.left) { c.left = true; say('It follows you for an hour. Then it does not.', false, 4000); G.sighting.dismiss(); }
  }
  if (id === 'shoal') { rt.shoalNear = dist < 25; if (!c.seen && dist < 30) { c.seen = true; say('The water boils with little fish all around the hull.'); } }
  if (id === 'calm' && dist < 22) {
    if (!c.seen) { c.seen = true; say('The sea goes perfectly still in a circle around the ship. Something is singing under it.', true, 8000); }
    ship.speed *= Math.max(0, 1 - dt * 0.6);
    c.still = ship.speed < STILL ? (c.still || 0) + dt : 0;
    if (!c.done && c.still > 6) { c.done = true; chestAdd('shell'); }
  }
}
