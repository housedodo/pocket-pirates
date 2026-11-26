// The input layer (2026-11-16, docs/proposals/SYSTEMS_FEEL.md G-02, G-18, G-19, G-20): the key map and remapping, which device
// was used last, the key names in the text the player reads, the controller in menus, and rumble.
// The game below keeps reading the default codes (KeyE, KeyC, Space...): a remapped key is turned into its action's default code
// before any other listener sees it, so main.js, the menus and the minigames need no remapping code of their own.
import { settings, store, SETTINGS_KEY } from './core/config.js';
import { rt, G } from './core/runtime.js';

/** every remappable action: id, the name on Pause > Settings > Keys, the default code (which the game reads) */
export const KEY_ACTIONS = [
  ['steerL', 'Steer to port', 'KeyA'], ['steerR', 'Steer to starboard', 'KeyD'], ['sailUp', 'Let the sails out', 'KeyW'], ['sailDown', 'Reef the sails', 'KeyS'],
  ['interact', 'Interact', 'KeyE'], ['fish', 'Fish', 'KeyC'], ['strike', 'Strike, fire, go on', 'Space'], ['oars', 'Oars', 'KeyG'], ['lamp', 'Lamp', 'KeyL'],
  ['log', "Captain's log", 'KeyM'], ['orders', 'Orders', 'KeyJ'], ['tracker', 'Tracker', 'KeyQ'], ['follow', 'Follow the next order', 'KeyT'], ['hint', 'Ask Mara', 'KeyY'], ['hud', 'Hide the HUD', 'KeyH'],
  ['camL', 'Look left', 'KeyZ'], ['camR', 'Look right', 'KeyX'], ['camReset', 'Look ahead', 'KeyV'], ['tiltDown', 'Camera lower', 'KeyR'], ['tiltUp', 'Camera higher', 'KeyF'],
  ['zoomIn', 'Zoom in', 'Equal'], ['zoomOut', 'Zoom out', 'Minus'],
];
const DEF = Object.fromEntries(KEY_ACTIONS.map(([id, , c]) => [id, c]));
/** keys that keep their meaning and cannot be given to an action: pause, menus, pages, choices, help and the dev keys */
const RESERVED = /^(Escape|KeyP|Enter|NumpadEnter|Tab|Arrow.*|Digit.*|Numpad\d|F\d+|Backquote|Comma|Period|Bracket.*|Meta.*|OS.*|Alt.*|Control.*|Shift.*|CapsLock|ContextMenu)$/;

// settings.keys holds only the actions the player moved ({ interact: 'KeyK' }); an old settings file has none (RULES 31)
const userKeys = () => (settings.keys && typeof settings.keys === 'object' ? settings.keys : {});
export const bound = (id) => userKeys()[id] || DEF[id];
let XL = {};   // physical code -> the default code the game reads (null: the key was moved away and now does nothing)
function rebuild() {
  XL = {};
  for (const [id, , d] of KEY_ACTIONS) { const b = bound(id); if (b !== d) { XL[b] = d; if (!(d in XL)) XL[d] = null; } }
  for (const [id] of KEY_ACTIONS) { const b = bound(id); if (XL[b] === null) XL[b] = DEF[id]; }   // a swapped default stays live for its new action
}
/** give an action a key; an action that had that key takes this one's old key (no key ever does two things). false if reserved */
export function bindKey(id, code) {
  if (RESERVED.test(code) || !DEF[id]) return false;
  const k = { ...userKeys() }, old = bound(id), other = KEY_ACTIONS.find(([o]) => o !== id && bound(o) === code);
  if (other) k[other[0]] = old;
  k[id] = code;
  for (const a of Object.keys(k)) if (k[a] === DEF[a] || !DEF[a]) delete k[a];
  settings.keys = k; store.set(SETTINGS_KEY, settings); rebuild(); refreshText();
  return true;
}
export function resetKeys() { settings.keys = {}; store.set(SETTINGS_KEY, settings); rebuild(); refreshText(); }

// ---- key names: the real label where the browser tells it (navigator.keyboard.getLayoutMap), else from the code
let layout = null;
const NAMES = { Space: 'Space', Minus: '-', Equal: '=', Semicolon: ';', Quote: "'", Slash: '/', Backslash: '\\', IntlBackslash: '<', NumpadAdd: 'Num +', NumpadSubtract: 'Num -' };
export function keyLabel(code) {
  if (layout && layout.get(code)) { const s = layout.get(code); return s.length === 1 ? s.toUpperCase() : s; }
  return NAMES[code] || code.replace(/^Key|^Digit/, '');
}
export const actionLabel = (id) => keyLabel(bound(id));

// ---- the device in use: a key press says keyboard, a button or a stick says pad (G-18)
export let device = 'key';
export function setDevice(d) {
  if (d === device) return;
  device = d; document.body.classList.toggle('pad', d === 'pad'); refreshText();
}

// ---- key names in text (G-18, G-20). The code keeps one line in the keyboard's default words ("[E] Visit Tama", "press C / Space");
// what the player reads names their own key, or the pad's button. One pass, so a name already turned is never turned twice.
const TOK = { E: 'interact', C: 'fish', Space: 'strike', M: 'log', J: 'orders', G: 'oars', L: 'lamp', Q: 'tracker', Y: 'hint', H: 'hud', W: 'sailUp', S: 'sailDown', A: 'steerL', D: 'steerR' };
/** what each action is called on a pad (docs/DESIGN.md, the controller table); null: no button, the key's name stays */
export const PAD_NAMES = { interact: 'A', fish: 'X', strike: 'RT', log: 'Y', orders: 'Y', oars: 'LT', lamp: 'L3', tracker: 'View', hint: 'hold View', hud: null,
  steerL: 'stick left', steerR: 'stick right', sailUp: 'stick up', sailDown: 'stick down', camL: 'LB', camR: 'RB', zoomIn: 'right stick up', zoomOut: 'right stick down' };
const K = '(?:Space|[ECMJGLQYHWSAD])', SEP = '(?: ?\\/ ?| or )';
const KEY_RX = new RegExp([
  `(?<=\\[)${K}(?=\\])`,                                         // [E]
  `(?<=\\()${K}(?=[) ])`,                                        // (S)  (C pulls it in)
  `(?<=\\b(?:press|Press|PRESS|HOLD|hold|Hold|then) )${K}\\b`,    // press E, HOLD C, then C again
  `(?<=\\bwith )(?:E|C|Space)\\b`,                               // with E
  `\\b${K}(?=${SEP}${K}\\b)`, `(?<=\\b${K}${SEP})${K}\\b`,       // C / Space, A/D, C or Space
  `^${K}(?= {2,})`,                                              // the help line: "W   let the sails out"
  '(?<!of )\\bSpace\\b', '\\bEsc\\b',
].join('|'), 'g');
let identity = true;   // keyboard, nothing remapped: the text is already right
export function keyify(s) {
  if (identity || !s || typeof s !== 'string') return s;
  const out = s.replace(KEY_RX, (m) => {
    if (m === 'Esc') return device === 'pad' ? 'Start' : m;
    const a = TOK[m]; if (!a) return m;
    return device === 'pad' && PAD_NAMES[a] ? PAD_NAMES[a] : actionLabel(a);
  });
  return device === 'pad' ? out.replace(/stick (?:left|right|up|down)(?: ?\/ ?| or )stick (?:left|right|up|down)/g, 'stick') : out;
}
// Text nodes are turned as they appear (prompt, toasts, Mara, tips, buttons), and turned back from their own words when the device or a key changes.
const seen = new WeakMap(), lastIn = new WeakMap();
const SKIP = '#mixer, #studio, #devbar, #pauseKeys, #pauseControls, .keyed, script, style';   // these name keys themselves (helpText, the Keys rows)
function turn(t) {
  const p = t.parentNode; if (!p || (p.closest && p.closest(SKIP))) return;
  const st = seen.get(t); if (st && st.out === t.data) return;
  let orig = t.data; const last = lastIn.get(p);
  if (!st && last && last.out && last.out !== last.orig && orig.startsWith(last.out)) orig = last.orig + orig.slice(last.out.length);   // a line that read the shown text back and added to it
  const out = keyify(orig); seen.set(t, { orig, out }); lastIn.set(p, { orig, out });
  if (out !== t.data) t.data = out;
}
function walk(root, fn) { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) fn(n); }
export function refreshText() {
  identity = device === 'key' && !Object.keys(userKeys()).length;
  walk(document.body, (t) => { const st = seen.get(t); if (st && st.out === t.data) { const out = keyify(st.orig); st.out = out; if (out !== t.data) t.data = out; } else turn(t); });
  if (typeof onText === 'function') onText();
}
let onText = null;
/** the F1 help line and the first-voyage line (main.js), for the device in use */
export function helpText(full) {
  if (device === 'pad') return full
    ? '<span class="keyed">stick: steer and sails &middot; A interact &middot; X fish &middot; RT strike, fire &middot; LT oars<br>Y log &middot; View tracker (hold: ask Mara) &middot; Start pause &middot; LB / RB, right stick: look and zoom</span>'
    : '<span class="keyed">stick: steer and sails &middot; LT oars &middot; A interact<br>Y log &middot; Start pause &middot; right stick: look and zoom</span>';
  const k = actionLabel;
  return full
    ? `<span class="keyed">${k('steerL')}/${k('steerR')} steer &middot; ${k('sailUp')}/${k('sailDown')} sails &middot; ${k('oars')} oars &middot; ${k('interact')} interact &middot; ${k('fish')} fish<br>${k('log')} log &middot; ${k('orders')} orders &middot; ${k('tracker')} tracker &middot; Esc pause &middot; ${k('hud')} hide HUD &middot; F1 this help</span>`
    : `<span class="keyed">${k('steerL')}/${k('steerR')} steer &middot; ${k('sailUp')}/${k('sailDown')} sails &middot; ${k('oars')} oars &middot; ${k('interact')} interact<br>${k('log')} log &middot; Esc pause &middot; drag = tilt &middot; wheel or ${k('zoomOut')} ${k('zoomIn')} = zoom &middot; ${k('hud')} hide HUD &middot; F1 help</span>`;
}

// ---- press-to-set (Pause > Settings > Keys): the next real key press is the new key; Esc (pad B) cancels
let capture = null;
export function captureKey(id, done) { capture = { id, done }; }
export const capturing = () => !!capture;

const KEYCHAR = (c) => (c === 'Space' ? ' ' : c.startsWith('Key') ? c.slice(3).toLowerCase() : c);
function translate(e) {
  if (capture && e.type === 'keydown' && (e.isTrusted || e.code === 'Escape')) {
    e.preventDefault(); e.stopImmediatePropagation();
    const c = capture; capture = null;
    const ok = e.code !== 'Escape' && bindKey(c.id, e.code);
    c.done(ok, e.code);
    return;
  }
  if (!e.isTrusted) return;   // the pad's own presses and the ones made here are already in the game's codes
  if (e.type === 'keydown') setDevice('key');
  if (!(e.code in XL)) return;
  const t = e.target;
  if (t && t.closest && t.closest('input, textarea, select, #mixer, #studio, #thPanel')) return;
  e.stopImmediatePropagation();
  const to = XL[e.code];
  if (!to) return;   // the key's action was moved to another key
  const n = new KeyboardEvent(e.type, { code: to, key: KEYCHAR(to), repeat: e.repeat, bubbles: true, cancelable: true, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey });
  if (!(t || window).dispatchEvent(n)) e.preventDefault();
}

// ---- rumble (G-19): short, only on a pad that has it, only with the switch on, never for a horror beat
/** [ms, strong, weak] per sound cue the game already plays; the cue names the moment (docs/proposals/SYSTEMS_FEEL.md section 5) */
export const RUMBLE = { bite: [80, 0, 0.45], catch: [120, 0.25, 0.6], hit: [160, 0.7, 0.6], bump: [200, 1, 0.6] };
export const RUMBLE_ANCHOR = [60, 0, 0.35], RUMBLE_STRAIN = [60, 0.2, 0.5];
export let activePad = () => null;
export function setPadSource(fn) { activePad = fn; }
export function rumble([ms, strong, weak]) {
  if (!settings.comfort || !settings.comfort.rumble || device !== 'pad' || rt.edge) return;
  const p = activePad(), a = p && p.vibrationActuator;
  if (!a || !a.playEffect) return;
  try { const r = a.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); if (r && r.catch) r.catch(() => {}); } catch (err) { /* no rumble here */ }
}
let wasBit = false, wasWarned = false;
/** once a frame: the anchor biting and the sail-strain warning have no cue of their own */
export function rumbleTick() {
  const s = G.ship; if (!s) return;
  const bit = !!s.anchored && s.speed <= 0.3;
  if (bit && !wasBit) rumble(RUMBLE_ANCHOR);
  wasBit = bit;
  if (rt.strainWarned && !wasWarned) { rumble(RUMBLE_STRAIN); setTimeout(() => rumble(RUMBLE_STRAIN), 160); }
  wasWarned = !!rt.strainWarned;
}

/** boot: after the audio exists (main.js, beside installGamepad) */
export function installInput(textChanged) {
  onText = textChanged || null;
  rebuild();
  window.addEventListener('keydown', translate, true);
  window.addEventListener('keyup', translate, true);
  try { if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then((m) => { layout = m; refreshText(); }).catch(() => {}); } catch (err) { /* not offered */ }
  new MutationObserver((recs) => {
    if (identity) return;
    for (const r of recs) {
      if (r.type === 'characterData') turn(r.target);
      else for (const n of r.addedNodes) { if (n.nodeType === 3) turn(n); else if (n.nodeType === 1) walk(n, turn); }
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true });
  const a = G.audio;
  if (a && a.play) { const play = a.play.bind(a); a.play = (name, o) => { if (RUMBLE[name]) rumble(RUMBLE[name]); return play(name, o); }; }
  refreshText();
}
