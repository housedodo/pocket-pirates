// The deep seas (owner, 2026-11-24: "in dread waves are high, boat going down"; "founders as story"). Past dread 0.65 the swell grows on
// top of the stage's own (DEEP_SWELL); burying her bow at speed there ships green water (a shudder, way lost, the helm slow for a moment).
// The towed boat can be swamped there and is gone (buy another); the rowing boat cannot be put in the water in big seas (gearplay.js).
// In the deepest water (FOUNDER_DREAD) a storm works at the hull; if it gives out there, or she is sunk there, she founders, and the
// captain wakes at Tama at dawn, the Gull at the pier, dry. The cargo and the towed boat are gone; nothing else is said. Not in the demo.
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { toast, $ } from '../ui/dom.js';
import { smoothstep } from '../util.js';
import { aboard } from './gearplay.js';

const DEMO = () => typeof window !== 'undefined' && window.__BUILD === 'demo';
export const DEEP_FROM = 0.65, DEEP_SWELL = 0.4, SWAMP_EVERY = 70, FOUNDER_DREAD = 0.85, STORM_WORK = 6;   // dread; added swell; mean s; dread; s per point of hull
/** main.js: the swell, made bigger in deep water */
export const deepSwell = (dread) => (DEMO() ? 1 : 1 + DEEP_SWELL * smoothstep(DEEP_FROM, 0.9, dread));
const deep = () => !DEMO() && (rt.dread || 0) >= DEEP_FROM;
/** the rowing boat cannot be launched (gearplay.js) */
export const tooRough = () => deep() && (G.weather.storm > 0.3 || (rt.dread || 0) > 0.75);
let greenT = 0, workT = 0;
export function deepTick(dt) {
  if (DEMO() || !rt.started || rt.modal || !G.ship) return;
  const S = G.ship, F = S.float;
  if (greenT > 0) { greenT -= dt; S.yaw = (S.yaw || 0) * 0.9; }
  if (!deep()) return;
  // green water: the bow buries in a trough at speed
  if (F && F.vp < -0.22 && S.speed > 5 && greenT <= 0) {
    greenT = 1.4; S.speed *= 0.8;
    if (!state.story.greenTold) { state.story.greenTold = state.dayN; toast('Green water comes over the bow and runs the length of the deck.', false, 4500); }
    if (G.audio) G.audio.play('bump', { vol: 0.5 });
  }
  // the towed boat swamps
  if (aboard('boat') && !rt.boat && S.speed > 3 && Math.random() < dt / SWAMP_EVERY * (0.5 + G.weather.storm)) {
    state.upgrades.boat = 0; if (state.story.gearAt) delete state.story.gearAt.boat; if (G.refreshMods) G.refreshMods();
    toast('The boat fills over her gunwale and goes down at the end of her line. You cut it.', false, 6000);
  }
  // the deepest water in a storm: the sea works at the hull
  if ((rt.dread || 0) >= FOUNDER_DREAD && G.weather.storm > 0.5 && S.speed > 1) {
    workT += dt;
    if (workT > STORM_WORK) { workT = 0; state.hp -= 1; if (state.hp <= 0) founder(); }
  }
}
/** storybeats.sinkPlayer asks first: in the deepest water she founders instead */
export const foundersHere = () => !DEMO() && (rt.dread || 0) >= FOUNDER_DREAD;
const LINES = ['The sea comes over the rail and does not go back.', 'Somebody is ringing the bell. Nobody is at the bell.', '', 'Tama. Morning. The Gull at her pier, dry, her lines made fast in a hand that is not yours.'];
export function founder() {
  if (rt.founding) return; rt.founding = true;
  state.story.foundered = (state.story.foundered || 0) + 1;
  $('fade').classList.add('on');
  toast(LINES[0], true, 3000);
  setTimeout(() => toast(LINES[1], true, 3000), 2600);
  setTimeout(() => {
    const d = G.world.desc(0, -1), dk = d.dock || { x: 0, z: 0 };
    G.ship.pos.set(d.x + dk.x, 0, d.z + dk.z); G.ship.heading = 0; G.ship.speed = 0; G.ship.vel = null; rt.camHeading = 0;
    state.dayN++; state.time = 6 / 24; state.hp = G.ship.mods.maxHp;
    state.story.cargo = {}; if (aboard('boat')) { state.upgrades.boat = 0; } if (G.refreshMods) G.refreshMods();
    for (const s of G.traffic.ships) { s.hostile = false; s.engaged = false; }
    $('fade').classList.remove('on'); rt.founding = false;
    toast(LINES[3], true, 8000);
    state.notes.push({ text: 'The Gull went down in the deep water. We woke at Tama, and she was at the pier, dry.', dark: true });
    setTimeout(() => { if (G.objectives && G.objectives.mate && !G.objectives.mate.busy) G.objectives.mate.say('We are home, Captain. I do not remember the way.'); }, 5000);
  }, 6000);
}
