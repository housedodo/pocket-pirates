// The moon (owner, 2026-11-26: "make the moon phases fit like in real life, and a random event where a near eclipse or an eclipse
// happens"). The moon goes round in MONTH days in the real order (new, waxing crescent, first quarter, gibbous, full, waning), and
// rises later each night as the real one does: a thin new crescent sets soon after the sun, a full moon rises as the sun sets, the
// old moon is up in the morning. How much of her is lit sets how bright the night is.
// Eclipses happen only where they really can: the moon's at a full moon, around midnight; the sun's at a new moon, around noon.
// Some are near ones (a bite out of the disc), some whole. While one is whole:
//   the moon's  she turns the colour of old copper, the night goes darker, the sea lies down and the wind drops; somewhere a bell
//               rings once with no ship near it. Mara and the crew speak of it, and the next harbour talks of nothing else.
//   the sun's   the day goes to dusk at noon, the stars come out, every bird lands and is quiet. Far out (dread 0.4+), for as
//               long as the sun is black, a shape of stars stands low in the sky that is not there on any other night.
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { hash2, smoothstep } from '../util.js';
import { tod } from '../daynight.js';

export const MONTH = 16;                 // days from new moon to new moon (shorter than the real 29.5, so a voyage sees the round)
export const LUNAR_P = 0.45, LUNAR_TOTAL = 0.3;   // at a full moon: the chance of an eclipse, and of those the share that are whole
export const SOLAR_P = 0.3, SOLAR_TOTAL = 0.35;   // at a new moon: the same for the sun
const WIN = 0.07, CORE = 0.022;           // how long it lasts either side of midnight / noon (in days), and the whole part

const params = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(''); } })();
const FORCE = params.get('eclipse');      // tests: lunar, lunarnear, solar, solarnear
const now = () => (state.dayN || 0) + (state.time || 0);
const offset = () => {
  if (FORCE && !(typeof window !== 'undefined' && window.__BUILD === 'full')) {   // tests: the round set so tonight is full (lunar) or today new (solar)
    const lunar = FORCE.startsWith('lunar'), at = lunar ? Math.round(now()) : Math.round(now() - 0.5) + 0.5;
    return (((lunar ? 0.5 * MONTH : 0) - at) % MONTH + MONTH) % MONTH;
  }
  return (hash2(state.seed || 1, 3, 911) % 1000) / 1000 * MONTH;
};
/** 0 new .. 0.5 full .. 1 new, at day-time d */
export const phaseAt = (d = now()) => ((((d + offset()) / MONTH) % 1) + 1) % 1;
/** how much of her face is lit, 0..1 */
export const litAt = (d = now()) => (1 - Math.cos(phaseAt(d) * Math.PI * 2)) / 2;
/** the moon's own clock: where she stands is where the sun stood (phase) of a day earlier */
export const moonTime = (t) => t - phaseAt();

/** this month's eclipses: the full moon's midnight and the new moon's noon, each with or without one */
function monthOf(d) { return Math.floor((d + offset()) / MONTH); }
function eventAt(kind, m) {
  const P = kind === 'lunar' ? LUNAR_P : SOLAR_P, T = kind === 'lunar' ? LUNAR_TOTAL : SOLAR_TOTAL, h = Math.abs(hash2(state.seed || 1, m * 2 + (kind === 'lunar' ? 1 : 0), 4242)) % 1000 / 1000;
  if (h >= P) return null;
  const centre = m * MONTH - offset() + (kind === 'lunar' ? MONTH / 2 : MONTH);   // the day-time of exact full / new moon
  const at = kind === 'lunar' ? Math.round(centre) : Math.round(centre - 0.5) + 0.5;   // the nearest midnight / noon
  return { kind, total: h < P * T, at };
}
/** the eclipse in reach of now (or null): { kind, total, at, k: 0..1 how much is covered now } */
export function eclipseNow() {
  const d = now();
  if (FORCE && !(typeof window !== 'undefined' && window.__BUILD === 'full')) {
    const lunar = FORCE.startsWith('lunar'), at = lunar ? Math.round(d) : Math.round(d - 0.5) + 0.5;
    return cover({ kind: lunar ? 'lunar' : 'solar', total: !FORCE.endsWith('near'), at }, d);
  }
  const m = monthOf(d);
  for (const mm of [m - 1, m, m + 1]) for (const kind of ['lunar', 'solar']) { const e = eventAt(kind, mm); if (e && Math.abs(d - e.at) < WIN) return cover(e, d); }
  return null;
}
function cover(e, d) {
  const x = Math.abs(d - e.at), k = e.total ? 1 - smoothstep(CORE, WIN, x) : 0.62 * (1 - smoothstep(0, WIN, x));   // a near one never closes
  return { ...e, k: Math.max(0, k), whole: e.total && x < CORE };
}

// ---- each frame (main.js): what happens while one is on
const SAY = {
  lunar0: 'Captain, look at the moon. Something is eating the edge of her.',
  lunarWhole: 'She has gone the colour of an old penny. Nobody is talking. Listen to that.',
  lunarAfter: 'She is coming back. The crew will be telling this one for years, and getting it wrong.',
  solar0: 'The light is wrong, Captain. Look at the shadows on the deck, they have gone sharp.',
  solarWhole: 'It is noon and I can see the stars.',
  solarAfter: 'There. There it is again. The birds can come down off the yards now.',
  near: 'A bite out of the moon tonight. My grandmother said that means a lost sheep. We have no sheep.',
  nearSun: 'Something took a bite out of the sun just now. It is giving it back, slowly.',
};
const say = (k) => { const m = G.objectives && G.objectives.mate; if (m) m.say(SAY[k], k === 'solarWhole' && (rt.dread || 0) >= 0.4); };
export function moonTick(dt = 0) {
  greenTick(dt);
  const e = eclipseNow(); rt.eclipse = e;
  const E = state.story.eclipse || (state.story.eclipse = {});
  if (!e || e.k < 0.05) { if (E.cur && E.cur.whole && !E.cur.after) { E.cur.after = true; say(E.cur.kind === 'lunar' ? 'lunarAfter' : 'solarAfter'); } if (!e) E.cur = null; return; }
  const key = `${e.kind}@${e.at}`;
  if (!E.cur || E.cur.key !== key) {
    E.cur = { key, kind: e.kind, whole: false, after: false };
    if ((e.kind === 'lunar' && (state.time > 0.8 || state.time < 0.25)) || (e.kind === 'solar' && state.time > 0.3 && state.time < 0.7)) say(e.total ? (e.kind === 'lunar' ? 'lunar0' : 'solar0') : (e.kind === 'lunar' ? 'near' : 'nearSun'));
  }
  if (e.whole && !E.cur.whole) {
    E.cur.whole = true; E.seen = { kind: e.kind, day: state.dayN, told: false };
    say(e.kind === 'lunar' ? 'lunarWhole' : 'solarWhole');
    if (G.weather) G.weather.calmHold = Math.max(G.weather.calmHold || 0, 40);   // the sea lies down and the wind drops
    if (e.kind === 'lunar') setTimeout(() => G.audio && G.audio.play('bell', { vol: 0.25 }), 6000);   // a bell, and no ship near it
    if (e.kind === 'solar' && G.fauna) for (const b of G.fauna.birds) { b.want = 1; b.next = 60; }   // every bird comes down
    state.notes.push({ text: e.kind === 'lunar' ? 'The moon went out tonight and came back red. The sea lay flat. A bell rang somewhere with no ship near it.' : 'The sun went black at noon. The stars came out. Every bird came down and kept still until it was over.', dark: e.kind === 'solar' && (rt.dread || 0) >= 0.4 });
  }
}
// ---- the green flash (owner, 2026-11-26: "a very, very rare easter egg"): at sunset over open water and a clear sky, about one sunset in
// FLASH_IN, the last sliver of the sun goes green for a breath. Sailors say it is a soul coming back. Once seen it is in the Ship's book.
export const FLASH_IN = 90, FLASH_S = 1.6;
let lastEl = null;
function greenTick(dt) {
  const el = tod.sunElev, d = state.dayN || 0;
  if (rt.greenT > 0) { rt.greenT -= dt; rt.greenK = Math.sin(Math.PI * Math.max(0, rt.greenT) / FLASH_S); if (rt.greenT <= 0) rt.greenK = 0; }
  if (lastEl != null && lastEl > 0.012 && el <= 0.012 && state.time > 0.6) {   // the sun touching the sea
    const forced = params.get('greenflash') && !(typeof window !== 'undefined' && window.__BUILD === 'full');
    const clear = !G.weather || Math.max(G.weather.cloud || 0, G.weather.rain || 0, G.weather.storm || 0, G.weather.fog || 0) < 0.3;
    const lucky = Math.abs(hash2(state.seed || 1, d, 5150)) % FLASH_IN === 0;
    if (forced || (lucky && clear && !rt.modal && (G.world && G.world.lastEdge > 30))) {
      rt.greenT = FLASH_S;
      state.story.greenFlash = (state.story.greenFlash || 0) + 1;
      if (state.story.greenFlash === 1) state.notes.push({ text: 'At sunset, for one breath, the last of the sun went green. Mara says it is a soul coming back from the other side.', dark: false });
      setTimeout(() => { const m = G.objectives && G.objectives.mate; if (m && !m.busy) m.say(state.story.greenFlash === 1 ? 'Did you see that? Green. Just for a breath. My father said that is a soul coming back.' : 'Green again. Somebody is coming back tonight.'); }, 1800);
    }
  }
  lastEl = el;
}
/** the next harbour talks of it (systems/interact.js on docking): a line once, the day after at most */
export function eclipseTalk() {
  const s = state.story.eclipse && state.story.eclipse.seen;
  if (!s || s.told || state.dayN - s.day > 1) return null;
  s.told = true;
  return s.kind === 'lunar' ? 'On the quay they talk of nothing but last night\'s moon. Somebody\'s goat stopped giving milk. Somebody else found a ring they had lost.'
    : 'The whole harbour is still talking about the dark at noon. The children were let out of school to see it, and three of them say they saw a ship in the sky.';
}
