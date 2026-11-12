// Boot configuration: URL flags, local storage, the saved voyage (read once), the player's settings.
// The lowest layer: it imports nothing from the game, and everything may import it.
export const params = new URLSearchParams(location.search);
export const SAVE_KEY = 'pocket-pirates-save-v1', SETTINGS_KEY = 'pocket-pirates-settings-v1';
export const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode etc. */ } },
};
export const saved = params.get('fresh') ? null : store.get(SAVE_KEY);
export const DEV = !!params.get('dev') || window.__BUILD === 'dev';   // ?dev=1: test keys (1-5 dread, 0, [ ], `) and the full-dread effects menu
export const settings = Object.assign({ muted: false, musicOff: false, vol: { music: 1, amb: 1, sfx: 1 }, windStyle: 'dial', hud: 'classic', tracker: true, abyss: {} }, store.get(SETTINGS_KEY) || {});
export const THREADS_KEY = 'pocket-pirates-threads-v1';
/** mutable flags of this browser session (not saved) */
export const session = {
  noSave: false,   // set by New voyage / Sunk: the save is being wiped, so nothing may write it again before the reload
};
