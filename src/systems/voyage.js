// The long voyage (owner, 2026-11-23: "do 6, 8, 9"): what the sea costs the crew. None of it is a number on the HUD.
//   stores  food and water, in days (state.story.stores). They run down with the clock, faster with more hands aboard. A harbour's market
//           fills them; Hollowgreen fills the water casks; a fish caught or fruit picked puts a little food by. Empty never kills: it
//           sours the crew, and Mara says so.
//   mood    the crew's spirits, 0..1 (state.story.mood): a long time at sea, storms, an empty store and a bad night bring it down; a
//           harbour, a night's rest, music in the Cays, a raider sunk or a chest dug bring it up. It shows in Mara's words and in the
//           Ship's book, and in the work: a glad crew digs and loads faster, a sullen one slower, and at the very bottom a hired hand
//           goes ashore at the next harbour.
//   nerves  night far from land (after the first throw; never in the demo): alone in the dark, small wrong things gather (rt.nerves,
//           not saved). A light that keeps pace astern and is gone when you turn to it; a bell with no ship; a count of the crew that
//           comes out one too many. The lamp, a full crew and good spirits keep it back; the dawn clears it.
import * as THREE from 'three';
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { scene } from '../core/engine.js';
import { DAY_LENGTH, tod } from '../daynight.js';
import { toast } from '../ui/dom.js';
import { angleDiff, clamp } from '../util.js';
import { handLeaves } from './hands.js';

const DEMO = () => typeof window !== 'undefined' && window.__BUILD === 'demo';
// ---- the numbers (tune by hand)
export const STORE_MAX = 6, STORE_START = 4;                  // days of food and of water the casks hold; a new voyage starts with
export const STORE_BURN = 1, STORE_HAND = 0.25;               // days used per game day, and how much more each hired hand eats
export const FISH_FOOD = 0.15, FRUIT_FOOD = 0.2;              // a fish caught, a fruit picked: part of a day put by
export const STORE_PRICE = 3;                                  // gold per day of food or water at a market
export const MOOD_START = 0.7;
export const MOOD = { sea: -0.12, storm: -0.6, hungry: -0.5, thirsty: -0.8, dock: 0.1, rest: 0.35, music: 1.2, sunk: 0.1, chest: 0.1, nerves: -0.25 };   // per game day; dock/rest/sunk/chest once each
export const BANDS = [[0.65, 'glad'], [0.4, 'steady'], [0.2, 'quiet'], [0, 'sullen']];
export const WORK = { glad: [0.88, 0.92], steady: [1, 1], quiet: [1.15, 1.1], sullen: [1.35, 1.25] };   // [dig time, reload] multipliers
export const LEAVE_AT = 0.12;                                  // below this a hired hand goes ashore at the next harbour
export const NERVE_FAR = 140, NERVE_RISE = 1 / 90, NERVE_FALL = 1 / 40;   // units from land; per s alone in the dark; per s otherwise

const SAY = {   // Mara (drafts)
  quiet: 'The crew have gone quiet, Captain. A harbour would do them good.',
  sullen: 'Nobody is singing. They do the work, and not a stroke more.',
  glad: 'Hear that? Somebody has started a song below.',
  food: 'We are down to the last of the biscuit, Captain.',
  water: 'The water casks are nearly dry, Captain.',
  foodOut: 'There is nothing left to eat aboard. They are not saying anything. That is worse.',
  waterOut: 'The casks are dry. Any land with a spring, Captain. Any at all.',
};
const say = (k) => { if (G.objectives && G.objectives.mate && !G.objectives.mate.busy) G.objectives.mate.say(SAY[k]); };

export const stores = () => state.story.stores || (state.story.stores = { food: STORE_START, water: STORE_START });
export const mood = () => (state.story.mood == null ? (state.story.mood = MOOD_START) : state.story.mood);
export const band = (m = mood()) => BANDS.find(([k]) => m >= k)[1];
/** main.js refreshMods: the crew's spirits in the work */
export function moodMods(m) { if (DEMO()) return m; const w = WORK[band()]; m.digTime *= w[0]; m.reload *= w[1]; return m; }
const bump = (d) => { state.story.mood = clamp(mood() + d, 0, 1); };

// ---- docking (systems/interact.js): spirits up; a hand at the end of his rope goes ashore
export function voyageDock(d) {
  const V = state.story.voyage || (state.story.voyage = {});
  if (V.dockDay !== state.dayN || V.dockAt !== d.id) { V.dockDay = state.dayN; V.dockAt = d.id; bump(MOOD.dock); }
  if (mood() < LEAVE_AT && state.crew && state.crew.length) {
    const c = state.crew.pop();
    return `${c.name} picks up a bag and goes down the gangplank without a word. Nobody tries to stop them.`;
  }
  if (mood() < LEAVE_AT) return handLeaves(d);   // then a specialist (systems/hands.js)
  return null;
}
/** the market's row (ui/harbour.js): how many days are missing, and what filling them costs here */
export const storesNeed = (cap = STORE_MAX) => { const S = stores(); return { food: Math.max(0, cap - S.food), water: Math.max(0, cap - S.water) }; };   // cap: what this harbour can spare (systems/harbours.js FEEL)
export function fillStores(mul = 1, cap = STORE_MAX) {
  const n = storesNeed(cap), cost = Math.ceil((n.food + n.water) * STORE_PRICE * mul);
  if (state.gold < cost) return 0;
  state.gold -= cost; const S = stores(); S.food = Math.max(S.food, cap); S.water = Math.max(S.water, cap); return cost;
}
const DAYS = ['none', 'a day', 'two days', 'three days', 'four days', 'five days', 'six days'];
const daysWord = (n) => DAYS[Math.max(0, Math.min(6, Math.floor(n + 0.2)))];
/** the Ship's book (logbook.js): [html, bind] */
export function partCrew(h3, ent) {
  if (DEMO()) return null;
  const S = stores(), b = band();
  const how = { glad: 'In good spirits. Somebody sings below.', steady: 'Steady. They do what is asked.', quiet: 'Quiet. Too long at sea.', sullen: 'Sullen. The work is slow.' }[b];
  return [h3('Crew and stores') + ent('The crew', how) + ent('Food', `for ${daysWord(S.food)}`, '', S.food < 1 ? 'dim' : '') + ent('Water', `for ${daysWord(S.water)}`, '', S.water < 1 ? 'dim' : ''), () => {}];
}

// ---- night nerves: the light astern
let light = null;
function makeLight() {
  light = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0 }));
  light.visible = false; scene.add(light);
}
const N = { light: 0, lightAng: 0, night: -1, done: {} };
function nervesTick(dt) {
  const S = G.ship, far = !G.world || G.world.lastEdge == null || G.world.lastEdge > NERVE_FAR;
  const after = !!(state.hut && state.hut.rolls && state.hut.rolls.length);
  const dark = tod.night > 0.6 && !rt.modal && !rt.boat;
  const nk = state.dayN + (state.time < 0.5 ? -0.5 : 0);   // one night spans midnight
  if (N.night !== nk) { N.night = nk; N.done = {}; }
  const on = !DEMO() && after && dark && far;
  let rise = NERVE_RISE * (S.flame ? 0.5 : 1) * (band() === 'glad' ? 0.7 : 1) * (1 - 0.2 * ((state.crew && state.crew.length) || 0));
  rt.nerves = clamp((rt.nerves || 0) + (on ? rise : -NERVE_FALL * (tod.night < 0.2 ? 4 : 1)) * dt, 0, 1);
  const n = rt.nerves;
  if (n > 0.35 && !N.done.light) { N.done.light = true; N.light = 40; N.lightAng = Math.PI + (Math.random() - 0.5) * 0.8; }
  if (N.light > 0) {   // a light keeping pace astern, on the water, about seventy off; gone when the bow turns toward it
    if (!light) makeLight();
    N.light -= dt;
    const a = S.heading + N.lightAng, x = S.pos.x + Math.sin(a) * 70, z = S.pos.z - Math.cos(a) * 70;
    light.position.set(x, 0.8, z); light.visible = true;
    light.material.opacity = Math.min(0.85, light.material.opacity + dt * 0.3) * (N.light < 3 ? N.light / 3 : 1);
    const toIt = Math.atan2(x - S.pos.x, -(z - S.pos.z)), camA = rt.camYaw != null ? S.heading + rt.camYaw : S.heading;
    if (Math.abs(angleDiff(toIt, S.heading)) < 0.35 || Math.abs(angleDiff(toIt, camA)) < 0.2 || n < 0.15) N.light = 0;
  } else if (light && light.visible) { light.visible = false; light.material.opacity = 0; }
  if (n > 0.6 && !N.done.bell) { N.done.bell = true; G.audio.play('bell', { vol: 0.22 }); }   // a bell, and no ship anywhere
  if (n > 0.85 && !N.done.count) { N.done.count = true; bump(-0.1); toast('Someone on deck is counting the crew under their breath. One too many, and they start again.', true, 7000); }
  return on ? n : 0;
}

// ---- each frame (main.js)
const seen = { fish: null, fruit: null, sunk: null, chest: null, rest: null, grove: null };
export function voyageTick(dt) {
  if (DEMO() || !rt.started) return;
  const S = stores(), st = state.stats, days = dt / DAY_LENGTH;
  if (seen.fish == null) Object.assign(seen, { fish: st.fish || 0, fruit: st.fruitPicked || 0, sunk: st.sunk || 0, chest: st.treasures || 0, rest: state.story.restDay, grove: state.story.lm && state.story.lm.grove });
  const live = !rt.modal || rt.modal === 'dive';
  // stores
  if (live) {
    const eat = STORE_BURN * (1 + STORE_HAND * ((state.crew && state.crew.length) || 0)) * days;
    const f0 = S.food, w0 = S.water;
    S.food = Math.max(0, S.food - eat); S.water = Math.max(0, S.water - eat);
    if (f0 >= 1 && S.food < 1) say('food'); if (w0 >= 1 && S.water < 1) say('water');
    if (f0 > 0 && S.food <= 0) say('foodOut'); if (w0 > 0 && S.water <= 0) say('waterOut');
  }
  if ((st.fish || 0) > seen.fish) { S.food = Math.min(STORE_MAX, S.food + FISH_FOOD * (st.fish - seen.fish)); seen.fish = st.fish; }
  if ((st.fruitPicked || 0) > seen.fruit) { S.food = Math.min(STORE_MAX, S.food + FRUIT_FOOD * 2 * (st.fruitPicked - seen.fruit)); seen.fruit = st.fruitPicked; }
  { const g = state.story.lm && state.story.lm.grove; if (g != null && g !== seen.grove) { seen.grove = g; S.water = STORE_MAX; } }   // Hollowgreen's spring
  // mood
  const b0 = band();
  if (live) {
    let d = MOOD.sea * days;
    if (G.weather && G.weather.storm > 0.6) d += MOOD.storm * days;
    if (S.food <= 0) d += MOOD.hungry * days;
    if (S.water <= 0) d += MOOD.thirsty * days;
    if ((rt.lullK || 0) > 0.5) d += MOOD.music * days;
    d += MOOD.nerves * nervesTick(dt) * days * 4;
    bump(d);
  }
  if ((st.sunk || 0) > seen.sunk) { bump(MOOD.sunk); seen.sunk = st.sunk; }
  if ((st.treasures || 0) > seen.chest) { bump(MOOD.chest); seen.chest = st.treasures; }
  if (state.story.restDay !== seen.rest) { bump(MOOD.rest); seen.rest = state.story.restDay; }   // a night ashore
  const b1 = band();
  if (b1 !== b0) {
    G.refreshMods();
    const down = BANDS.findIndex(([, n]) => n === b1) > BANDS.findIndex(([, n]) => n === b0);
    if (down && (b1 === 'quiet' || b1 === 'sullen')) say(b1);
    if (!down && b1 === 'glad') say('glad');
  }
}
