// DOM helpers and the HUD elements the game writes to every frame, plus toasts (short messages above every menu).
import { params } from '../core/config.js';
import { PX } from '../windmeters.js';

export const $ = (id) => document.getElementById(id);
export const goldEl = $('gold').querySelector('b');
export const promptEl = $('prompt'), promptTxt = $('prompttxt'), promptBar = promptEl.querySelector('.bar'), promptFill = promptBar.querySelector('i');
export const toastsEl = $('toasts'), debugEl = $('debug'), helpEl = $('help');
export const chartEl = $('chart'), harbourEl = $('harbour'), pauseEl = $('pause'), shipEl = $('shipmodal');
export const compass = $('compassCv').getContext('2d');
$('compassCv').width = PX; $('compassCv').height = PX;
if (params.get('hud') === '0') $('hud').classList.add('hidden');

/** while hold() is true (the diver, the Edge, the sail home after the first throw, 30 s after them; never inside a menu) messages wait */
let hold = null; const waiting = [];
export function setToastHold(fn) { hold = fn; }
export function flushToasts() { if (waiting.length && !(hold && hold())) show(...waiting.shift()); }
export function toast(text, dark = false, ms = 5200) { if (hold && hold()) { if (waiting.length < 6) waiting.push([text, dark, ms]); return; } show(text, dark, ms); }
function show(text, dark = false, ms = 5200) {
  const el = document.createElement('div');
  el.className = 'toast panel txt' + (dark ? ' dark' : '');
  const sp = document.createElement('span'); sp.textContent = text; el.appendChild(sp);
  toastsEl.appendChild(el);
  while (toastsEl.children.length > 3) toastsEl.firstChild.remove();
  setTimeout(() => el.remove(), ms);
}
