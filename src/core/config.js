// Boot configuration: URL flags, local storage, the saved voyage (read once), the player's settings.
// The lowest layer: it imports nothing from the game, and everything may import it.
/** the playtest build (scripts/single.py full, 2026-11-15): the whole game with no test tools. Every URL flag is ignored (so no ?dev,
 *  ?dread, ?seed...), and with them the dev keys, the mixer (F8) and the Sound Studio (F9) */
export const PLAYTEST = window.__BUILD === 'full';
export const params = new URLSearchParams(PLAYTEST ? '' : location.search);
export const SETTINGS_KEY = 'pocket-pirates-settings-v1';
// reefs (owner, 2026-11-26: "remove reefs from the game for now, there will be a more elaborate solution later"): the shallow shelves
// (systems/shallows.js), the Reef's coral heads (regiondecor.js, reef.js) and the Reef's white water (seawater.js) are off; the code stays
export const REEFS_ON = false;
export const REAL_SAVE_KEY = 'pocket-pirates-save-v1', DEV_LIVE_KEY = 'pocket-pirates-dev-live';
/** the Dev Studio's sandbox (ui/devstudio.js; dev builds only): a snapshot was loaded in this tab, so the voyage is read from and saved
 *  to DEV_LIVE_KEY, beside the real save and never over it, until "Back to the real save" */
const SANDBOX = window.__BUILD !== 'demo' && window.__BUILD !== 'full' && (!!new URLSearchParams(location.search).get('dev') || window.__BUILD === 'dev')
  && (() => { try { return sessionStorage.getItem('hoist-dev-sandbox') === '1'; } catch (e) { return false; } })();
export const SAVE_KEY = SANDBOX ? DEV_LIVE_KEY : REAL_SAVE_KEY;
export const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode etc. */ } },
};
export const saved = SANDBOX ? store.get(DEV_LIVE_KEY) : params.get('fresh') ? null : store.get(SAVE_KEY);
/** the URL overrode the voyage (another sea, another place or hour): this session plays it but never writes the save (task R8) */
export const PINNED = ['seed', 'x', 'z', 'time'].some((k) => params.has(k));
/** the demo build is a different game (RULES 29): set only by scripts/single.py; undefined under the dev server means the full game */
export const DEMO = window.__BUILD === 'demo';
export const DEV = !DEMO && (!!params.get('dev') || window.__BUILD === 'dev');   // ?dev=1: test keys (1-5 dread, 0, [ ], `) and the full-dread effects menu; never in the demo
export const settings = Object.assign({ muted: false, musicOff: false, vol: { music: 1, amb: 1, sfx: 1 }, hud: 'classic', tracker: true, abyss: {} }, store.get(SETTINGS_KEY) || {});
/** comfort (task G4): camera shake and tremor, the picture's wobble and colour split, flashes. Off by default when the system asks
 *  for reduced motion; once the player sets one it is remembered like any other setting */
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
settings.comfort = Object.assign({ shake: !REDUCED, wobble: !REDUCED, flash: !REDUCED, rumble: !REDUCED }, settings.comfort || {});   // rumble: a pad's, G-19
export const THREADS_KEY = 'pocket-pirates-threads-v1';
/** mutable flags of this browser session (not saved) */
export const session = {
  sandbox: SANDBOX,   // the Dev Studio's sandbox: SAVE_KEY is DEV_LIVE_KEY
  noSave: false,   // set by New voyage / Sunk: the save is being wiped, so nothing may write it again before the reload
};
