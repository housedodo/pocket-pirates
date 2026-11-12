// The pause menu and the settings it holds: its panels and Back, the volume sliders, sound and music, the display options
// (ocean style, night view, lamp), fullscreen, the dev and abyss panels, the mixer and the Sound Studio.
import { clamp } from '../util.js';
import { U } from '../psx.js';
import { OCEAN_STYLES } from '../ocean.js';
import { AUDIO_ENABLED } from '../audio.js';
import { Mixer } from '../mixer.js';
import { SoundStudio } from '../studio.js';
import { tod, LAMPS, NIGHT_SET, NIGHT_MODES } from '../daynight.js';
import { EFFECTS, WATCHER_STYLES, WATCHER_NAMES } from '../abyss.js';
import { params, store, DEV, settings, SETTINGS_KEY } from '../core/config.js';
import { rt, G } from '../core/runtime.js';
import { $, pauseEl, shipEl, toast } from './dom.js';
import { fullMoon } from '../systems/calendar.js';

export let oceanLabel, nightLabels, showPauseMain, mixer, studio;   // set by the init function(s) below, at the point in boot where main.js had them

// fullscreen: on the title and in the pause menu (holding Esc or F11 also leave it)
export const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
export const fsOk = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
export function toggleFullscreen() {
  const d = document, el = d.documentElement;
  try {
    if (fsEl()) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else { const r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); }
  } catch (err) { /* not allowed here */ }
}
export function fsLabels() { $('tFull').textContent = fsEl() ? 'Windowed' : 'Fullscreen'; $('pbFull').textContent = `Fullscreen: ${fsEl() ? 'on' : 'off'}`; }
// in fullscreen, Esc should still pause instead of throwing you out: the keyboard lock keeps it for the game
// (Chrome/Edge; holding Esc still leaves fullscreen). Elsewhere P pauses too.
export function fsChanged() {
  fsLabels(); const kb = navigator.keyboard;
  try { if (kb && kb.lock) { if (fsEl()) kb.lock(['Escape']).catch(() => {}); else kb.unlock(); } } catch (err) { /* not supported */ }
}
/** tonight's moon: a night runs from 19:00 to 06:00; each one is either a new moon (pitch dark, no moon) or a full moon (moonlit) */
export function nightViewNow() { NIGHT_SET.view = rt.nightMode ? rt.nightMode - 1 : fullMoon() ? 2 : 0; }
// pause menu panels: main > settings > (sound, display), main > controls, main > dev tools > full dread. Back / Esc go up one level.
export const PAUSE_PANELS = { main: 'pauseMain', settings: 'pauseSettings', sound: 'pauseSound', display: 'pauseDisplay', controls: 'pauseControls', dev: 'pauseDev', abyss: 'pauseAbyss' };
export const PAUSE_PARENT = { settings: 'main', controls: 'main', dev: 'main', sound: 'settings', display: 'settings', abyss: 'dev' };
export const PAUSE_OPENER = { settings: 'pbSettings', controls: 'pbControls', dev: 'pbDevTools', sound: 'pbSoundMenu', display: 'pbDisplay', abyss: 'pbAbyss' };
export function showPause(name, focus) {
  rt.pausePanel = name;
  for (const [k, id] of Object.entries(PAUSE_PANELS)) $(id).style.display = k === name ? 'block' : 'none';
  $('pbNew').textContent = 'New voyage (erase save)';
  $('pbSound').textContent = `Sound: ${G.audio.muted ? 'off' : 'on'}`;
  $('pbMusic').textContent = `Music: ${G.audio.musicOn ? 'on' : 'off'}`;
  if (name === 'abyss') renderAbyssMenu();
  const f = focus && $(focus); (f && f.offsetParent ? f : $(PAUSE_PANELS[name]).querySelector('button')).focus();
}
export function pauseBack() { const from = rt.pausePanel; showPause(PAUSE_PARENT[from] || 'main', PAUSE_OPENER[from]); }
// full-dread effects: switch each one on/off, or try one on its own
export function renderAbyssMenu() {
  const on = (id) => settings.abyss[id] !== false;
  $('abList').innerHTML = EFFECTS.map((f, i) => `<div class="abrow"><button class="abtog ${on(f.id) ? 'on' : ''}" data-id="${f.id}">${on(f.id) ? 'ON' : 'OFF'}</button><div class="abtxt"><b>${i + 1}. ${f.name}</b><small>${f.desc}</small></div><button class="abtry" data-id="${f.id}">Try</button>${f.id === 'leviathan' ? '<button class="abtry" data-end="1">Ending</button>' : ''}${f.id === 'watchers' ? `<button class="abstyle">${WATCHER_NAMES[settings.watcherStyle || 'pale']}</button>` : ''}</div>`).join('');
  const st = $('abList').querySelector('.abstyle');
  if (st) st.addEventListener('click', () => { const i = WATCHER_STYLES.indexOf(settings.watcherStyle || 'pale'); settings.watcherStyle = WATCHER_STYLES[(i + 1) % WATCHER_STYLES.length]; store.set(SETTINGS_KEY, settings); renderAbyssMenu(); $('abList').querySelector('.abstyle').focus(); });
  $('abList').querySelectorAll('.abtog').forEach((b) => b.addEventListener('click', () => { settings.abyss[b.dataset.id] = !on(b.dataset.id); store.set(SETTINGS_KEY, settings); renderAbyssMenu(); }));
  $('abList').querySelectorAll('.abtry').forEach((b) => b.addEventListener('click', () => {
    rt.forced = 1; rt.dread = 1; G.abyss.k = 1;
    if (b.dataset.end) { G.abyss.solo = 'leviathan'; G.abyss.startEnding(); G.closeModal(); return; }
    const id = b.dataset.id;
    G.abyss.trigger(id); G.closeModal();
    if (id === 'map') setTimeout(() => { rt.logTab = 'map'; G.openModal('chart'); }, 150);
  }));
  $('abForce').textContent = rt.forced === 1 ? 'Back to automatic dread' : 'Go to full dread now (all ON effects)';
}
/** what is going on right now, as the sound studio's situations (see studio.js) */
export function soundSituation() {
  const f = new Set(), near = rt.started && !rt.titleScene ? G.world.nearest(G.ship.pos.x, G.ship.pos.z, 60) : null;
  if (!rt.started || rt.titleScene) f.add('title');
  else if (!rt.modal) f.add('sailing');
  if (rt.modal === 'harbour') f.add('harbour'); if (rt.modal === 'yard') f.add('yard'); if (rt.modal === 'hut') f.add('hut'); if (rt.modal === 'cave') f.add('cave');
  if (rt.modal === 'chart') f.add('chart'); if (rt.modal === 'card') f.add('log'); if (rt.modal === 'greet') f.add('talk'); if (rt.modal === 'pause') f.add('paused');
  if (G.fishing.active) f.add('fishing');
  if (G.traffic.ships.some((s) => s.hostile && !s.sinking && Math.hypot(s.x - G.ship.pos.x, s.z - G.ship.pos.z) < 90)) f.add('combat');
  if ($('demoend').classList.contains('show')) f.add('ending');
  f.add(tod.night > 0.6 ? 'night' : tod.twilight > 0.35 ? 'twilight' : 'day');
  if (G.weather.rain > 0.3) f.add('rain'); if (G.weather.storm > 0.3) f.add('storm'); if (G.weather.fog > 0.4) f.add('fog'); if (G.wind.strength > 0.9) f.add('windy');
  f.add(near ? 'land' : 'open');
  return { flags: f, dread: rt.dread };
}

/** boot code that ran at this point in main.js; main.js calls it in the same place */
export function initPause1() {
  if (!fsOk) { $('tFull').style.display = 'none'; $('pbFull').style.display = 'none'; }
  document.addEventListener('fullscreenchange', fsChanged);
  document.addEventListener('webkitfullscreenchange', fsChanged);
  $('tFull').addEventListener('click', (e) => { e.stopPropagation(); toggleFullscreen(); });
  $('pbFull').addEventListener('click', () => { toggleFullscreen(); $('pbFull').focus(); });
  // the look of the water (ocean.js OCEAN_STYLES): cycled in the pause menu, remembered; ?ocean=0..4 forces one
  oceanLabel = () => { $('pbOcean').textContent = `Ocean: ${OCEAN_STYLES[U.uOcean.value | 0]}`; };
  U.uOcean.value = params.has('ocean') ? clamp(parseInt(params.get('ocean'), 10) || 0, 0, OCEAN_STYLES.length - 1) : settings.ocean2 != null ? settings.ocean2 % OCEAN_STYLES.length : 5;
  oceanLabel();   // Chop facets by default
  // night view distance and lamp strength (daynight.js): cycled in the pause menu, remembered; ?nightview= / ?lamp= force one
  // night mode: 0 = moon phases (each night a new moon or a full one), 1..4 = one fixed view. Settings keys are new (v2) so the new defaults apply
  rt.nightMode = params.has('nightview') ? clamp((parseInt(params.get('nightview'), 10) || 0) + 1, 1, 4) : settings.nightMode2 != null ? settings.nightMode2 : 0;
  nightLabels = () => { $('pbNight').textContent = `Night: ${NIGHT_MODES[rt.nightMode]}`; $('pbLamp').textContent = `Lamp: ${LAMPS[NIGHT_SET.lamp].name}`; G.ship.lampK = LAMPS[NIGHT_SET.lamp].k; };
  NIGHT_SET.lamp = params.has('lamp') ? clamp(parseInt(params.get('lamp'), 10) || 0, 0, 3) : settings.lamp2 != null ? settings.lamp2 : 0;   // a candle by default
  nightLabels();
  $('pbNight').addEventListener('click', () => { rt.nightMode = (rt.nightMode + 1) % NIGHT_MODES.length; settings.nightMode2 = rt.nightMode; store.set(SETTINGS_KEY, settings); nightLabels(); $('pbNight').focus(); });
  $('pbLamp').addEventListener('click', () => { NIGHT_SET.lamp = (NIGHT_SET.lamp + 1) % LAMPS.length; settings.lamp2 = NIGHT_SET.lamp; store.set(SETTINGS_KEY, settings); nightLabels(); $('pbLamp').focus(); });
  $('pbOcean').addEventListener('click', () => { U.uOcean.value = ((U.uOcean.value | 0) + 1) % OCEAN_STYLES.length; settings.ocean2 = U.uOcean.value; store.set(SETTINGS_KEY, settings); oceanLabel(); $('pbOcean').focus(); });
}

/** boot code that ran at this point in main.js; main.js calls it in the same place */
export function initPause2() {
  // ---------------------------------------------------------------- pause menu
  if (!AUDIO_ENABLED) $('pbSoundMenu').style.display = 'none';
  rt.volT = 0;
  for (const r of $('pbVols').querySelectorAll('.pvol')) {   // the player's own volume sliders
    const inp = r.querySelector('input'), k = inp.dataset.k;
    inp.value = Math.round((G.audio.userVol[k] != null ? G.audio.userVol[k] : 1) * 100); r.querySelector('b').textContent = `${inp.value}%`;
    inp.addEventListener('input', () => { r.querySelector('b').textContent = `${inp.value}%`; G.audio.setUserVol(k, inp.value / 100); if (rt.modal === 'pause' && G.audio.ctx) { G.audio.ctx.resume(); clearTimeout(rt.volT); rt.volT = setTimeout(() => { if (rt.modal === 'pause') G.audio.ctx.suspend(); }, 1800); }   // the sound plays for a moment while you drag, so you can hear the level
      settings.vol = { ...G.audio.userVol }; store.set(SETTINGS_KEY, settings); });
    inp.addEventListener('keydown', (e) => { if (e.code.startsWith('Arrow')) e.stopPropagation(); });   // arrows move the slider, not the pause menu focus (Esc still closes)
  }
  rt.pausePanel = 'main';
  showPauseMain = () => showPause('main');
  for (const [name, btn] of Object.entries({ settings: 'pbSettings', controls: 'pbControls', dev: 'pbDevTools', sound: 'pbSoundMenu', display: 'pbDisplay', abyss: 'pbAbyss' })) $(btn).addEventListener('click', () => showPause(name));
  document.querySelectorAll('#pause .pback').forEach((b) => b.addEventListener('click', pauseBack));
  $('pbResume').addEventListener('click', () => G.closeModal());
  if (!DEV) { $('pbDevTools').style.display = 'none'; $('pbAbyss').style.display = 'none'; $('pbMixer').style.display = 'none'; $('pbStudio').style.display = 'none'; $('devKeys').style.display = 'none'; settings.abyss = {}; }   // players get every effect, no test menu
  mixer = new Mixer(G.audio, (t, d, ms) => toast(t, d, ms));
  $('pbMixer').addEventListener('click', () => { G.closeModal(); mixer.toggle(true); });
  studio = DEV ? new SoundStudio(G.audio, (t, d, ms) => toast(t, d, ms)) : null;   // dev only: load, cut and place your own music
  if (DEV) { window.__studio = studio; $('pbStudio').addEventListener('click', () => { G.closeModal(); studio.toggle(true); }); }
  //   // players get every effect, no test menu
  $('abAll').addEventListener('click', () => { const any = EFFECTS.some((f) => settings.abyss[f.id] === false); for (const f of EFFECTS) settings.abyss[f.id] = any; store.set(SETTINGS_KEY, settings); renderAbyssMenu(); });
  $('abForce').addEventListener('click', () => { G.abyss.stopTest(); if (rt.forced === 1) rt.forced = null; else { rt.forced = 1; rt.dread = 1; } renderAbyssMenu(); });
  $('pbLog').addEventListener('click', () => { rt.logTab = 'map'; G.openModal('chart'); });
  $('pbMusic').addEventListener('click', () => {
    G.audio.setMusic(!G.audio.musicOn);
    settings.musicOff = !G.audio.musicOn; store.set(SETTINGS_KEY, settings);
    showPause('sound', 'pbMusic');
  });
  $('pbSound').addEventListener('click', () => {
    G.audio.setMuted(!G.audio.muted);
    settings.muted = G.audio.muted; store.set(SETTINGS_KEY, settings);
    showPause('sound', 'pbSound');
  });
  pauseEl.addEventListener('pointerdown', (e) => { if (e.target === pauseEl) G.closeModal(); });
  // (a click beside the book no longer closes the log: Close, M or Esc do)
  shipEl.addEventListener('pointerdown', (e) => { if (e.target === shipEl) G.closeModal(); });
  $('shClose').addEventListener('click', () => G.closeModal());
  $('hbClose').addEventListener('click', () => G.closeModal());
}
