// Controller support (standard mapping: Xbox / PlayStation / Switch Pro / Steam Deck). At sea the pad makes the same key presses the
// keyboard makes (the game's default codes); the rudder takes the stick's own angle. In any screen the pad moves a focus between
// that screen's buttons and presses them (G-02, docs/proposals/SYSTEMS_FEEL.md 4.11; the table is in docs/DESIGN.md).
//   at sea                                         in a screen (pause, harbour, log, shipyard, cards, title, endings)
//   left stick   steer (analogue), sails (W / S)   left stick, d-pad   move the focus (a slider: left / right sets it)
//   d-pad        arrows (steer, sails, dig grid)   A          press the focused button
//   A  interact (E)    B  nothing                  B          back one level, then close (Esc)
//   X  fishing (C)     Y  captain's log (M)        LB / RB    previous / next tab or bookmark (left / right)
//   RT strike, fire, go on (Space)  LT oars (G)    RT         throw, roll, go on (Space)    Y   the log (M)
//   LB / RB, right stick X  look around (Z / X)    Start      pause / resume
//   right stick Y  zoom (rt.padZoom)               the tavern games: A or RT play (Space), stick / d-pad as arrows, X / Y bid / let it go (1 / 2)
//   View  tap: tracker (Q), hold: ask Mara (Y)     left stick press  lantern (L)       Start  pause (Esc)
import { rt, G } from './core/runtime.js';
import { setDevice, setPadSource, capturing, device } from './input.js';

/** the numbers a playtester tunes (G-11, G-15, G-02): stick dead zone and curve, zoom dead zone, the View hold, menu repeat */
export const PAD_TUNE = { dead: 0.15, curve: 1.5, trim: 0.55, digStick: 0.45, look: 0.5, zoomDead: 0.5, hintHold: 0.6, nav: 0.5, repeat0: 0.35, repeat: 0.14 };

const SEA = { 0: 'KeyE', 2: 'KeyC', 3: 'KeyM', 4: 'KeyZ', 5: 'KeyX', 6: 'KeyG', 7: 'Space', 9: 'Escape', 10: 'KeyL',
  12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight' };   // B (1) does nothing at sea; View (8) is tap Q / hold Y
const MENU = { 3: 'KeyM', 4: 'ArrowLeft', 5: 'ArrowRight', 7: 'Space', 9: 'Escape' };   // A, B and the directions are the focus's (below)
const LOCAL = { 0: 'Space', 1: 'Escape', 2: 'Digit1', 3: 'Digit2', 7: 'Space', 9: 'Escape', 12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight' };
const KEYCHAR = { KeyL: 'l', KeyE: 'e', KeyC: 'c', KeyM: 'm', KeyZ: 'z', KeyX: 'x', KeyG: 'g', KeyQ: 'q', KeyY: 'y', KeyA: 'a', KeyD: 'd', KeyW: 'w', KeyS: 's', Space: ' ', Escape: 'Escape', Digit1: '1', Digit2: '2' };

const $ = (id) => document.getElementById(id);
const shown = (el) => el && (el.classList.contains('show') || el.classList.contains('open'));
/** the screen the pad is in, or null at sea: 'local' for the tavern games (they read keys), else the screen's element */
export function padScreen() {
  if (rt.introT >= 0) return null;
  if (shown($('thPanel'))) return $('thPanel');
  if (rt.modal === 'local') return 'local';
  if (rt.modal) return document.querySelector('.modal.open');
  for (const id of ['ending', 'demoend', 'credits']) if (shown($(id))) return $(id);
  if (!rt.started && rt.titleScene) return $('titleMenu');
  return null;
}
const FOCUSABLE = 'button, input[type=range], input[type=checkbox], input[type=radio], select, [tabindex]:not([tabindex="-1"])';
/** what the focus may land on: shown, enabled, and not on a page turned away (the log's pages scroll sideways) */
export function focusables(root) {
  return [...root.querySelectorAll(FOCUSABLE)].filter((el) => {
    if (el.disabled || !el.getClientRects().length) return false;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false;
    if (getComputedStyle(el).visibility === 'hidden') return false;
    for (let a = el.parentElement; a && a !== root.parentElement; a = a.parentElement) {
      const ox = getComputedStyle(a).overflowX;
      if (ox !== 'visible') { const c = a.getBoundingClientRect(); if (r.right <= c.left + 1 || r.left >= c.right - 1) return false; }
    }
    return true;
  });
}
function moveFocus(root, dir) {
  const list = focusables(root), cur = document.activeElement;
  if (!list.length) return false;
  if (!list.includes(cur)) { list[0].focus(); return true; }
  if (cur.type === 'range' && (dir === 'L' || dir === 'R')) {   // a volume slider: left / right set it
    const step = parseFloat(cur.step) || 1; cur.value = String(parseFloat(cur.value) + (dir === 'R' ? step : -step));
    cur.dispatchEvent(new Event('input', { bubbles: true })); cur.dispatchEvent(new Event('change', { bubbles: true })); return true;
  }
  const a = cur.getBoundingClientRect(), ax = (a.left + a.right) / 2, ay = (a.top + a.bottom) / 2;
  let best = null, bs = Infinity;
  for (const el of list) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect(), bx = (b.left + b.right) / 2, by = (b.top + b.bottom) / 2;
    const main = dir === 'D' ? b.top - a.bottom + (by - ay) * 0.01 : dir === 'U' ? a.top - b.bottom + (ay - by) * 0.01 : dir === 'R' ? b.left - a.right + (bx - ax) * 0.01 : a.left - b.right + (ax - bx) * 0.01;
    const ahead = dir === 'D' ? by > ay + 1 : dir === 'U' ? by < ay - 1 : dir === 'R' ? bx > ax + 1 : bx < ax - 1;
    if (!ahead) continue;
    const side = dir === 'D' || dir === 'U' ? Math.abs(bx - ax) : Math.abs(by - ay);
    const s = Math.max(0, main) + side * 2;
    if (s < bs) { bs = s; best = el; }
  }
  if (!best) return false;
  best.focus(); best.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  return true;
}

export function installGamepad(onConnect) {
  const held = new Set();
  const send = (code, down) => {
    const t = document.activeElement && document.activeElement !== document.body ? document.activeElement : window;
    t.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: KEYCHAR[code] || code, bubbles: true, cancelable: true }));
  };
  const tap = (code) => { send(code, true); send(code, false); };
  const set = (code, on) => { if (on && !held.has(code)) { held.add(code); send(code, true); } else if (!on && held.has(code)) { held.delete(code); send(code, false); } };
  const release = () => { for (const code of [...held]) set(code, false); };
  window.addEventListener('gamepadconnected', (e) => { if (onConnect) onConnect(e.gamepad.id); });
  let pad = null, prevBtn = [], mode = null, stale = new Set(), staleAxes = false, nav = { dir: null, t: 0 }, view = { t: -1, used: false }, last = performance.now();
  setPadSource(() => pad);
  const poll = () => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    pad = [...pads].find((g) => g && g.connected) || null;
    const T = PAD_TUNE;
    rt.padSteer = 0; rt.padZoom = 0;
    if (pad) {
      const raw = pad.buttons.map((b) => !!b && (b.pressed || b.value > 0.5)), ax = pad.axes.slice(0, 4);
      if (raw.some(Boolean) || ax.some((v) => Math.abs(v) > 0.3)) setDevice('pad');
      // a button or stick still held from the last screen (Start that opened the pause, the stick that was steering) waits to be let go
      for (const i of [...stale]) if (!raw[i]) stale.delete(i);
      if (staleAxes && ax.every((v) => Math.abs(v) < 0.3)) staleAxes = false;
      const btn = raw.map((v, i) => v && !stale.has(i));
      const [lx = 0, ly = 0, rx = 0, ry = 0] = staleAxes ? [] : ax;
      const down = (i) => btn[i] && !prevBtn[i];
      if (capturing()) {   // Pause > Settings > Keys waits for a key: B or Start leave the old one
        release(); if (down(1) || down(9)) tap('Escape');
        prevBtn = btn; requestAnimationFrame(poll); return;
      }
      const screen = padScreen(), m = screen === 'local' ? 'local' : screen ? 'menu' : 'sea';
      if (m !== mode) { release(); mode = m; nav.dir = null; view.t = -1; raw.forEach((v, i) => { if (v) stale.add(i); }); staleAxes = m !== 'sea' && ax.some((v) => Math.abs(v) > 0.3); prevBtn = raw; requestAnimationFrame(poll); return; }   // back at sea the stick steers at once (G-12)
      if (m === 'menu') {
        const want = new Set();
        for (const [i, code] of Object.entries(MENU)) if (btn[i]) want.add(code);
        for (const code of [...held]) if (!want.has(code)) set(code, false);
        for (const code of want) set(code, true);
        const dir = btn[12] || ly < -T.nav ? 'U' : btn[13] || ly > T.nav ? 'D' : btn[14] || lx < -T.nav ? 'L' : btn[15] || lx > T.nav ? 'R' : null;
        if (dir !== nav.dir) { nav.dir = dir; nav.t = T.repeat0; if (dir) step(screen, dir); }
        else if (dir) { nav.t -= dt; if (nav.t <= 0) { nav.t = T.repeat; step(screen, dir); } }
        if (down(0)) press(screen);
        if (down(1)) tap('Escape');
        if (!btn[12] && !btn[13] && !btn[14] && !btn[15] && !dir) keepFocus(screen);
      } else if (m === 'local') {
        const want = new Set();
        for (const [i, code] of Object.entries(LOCAL)) if (btn[i]) want.add(code);
        if (lx < -T.digStick) want.add('ArrowLeft'); if (lx > T.digStick) want.add('ArrowRight');
        if (ly < -T.trim) want.add('ArrowUp'); if (ly > T.trim) want.add('ArrowDown');
        for (const code of [...held]) if (!want.has(code)) set(code, false);
        for (const code of want) set(code, true);
      } else {
        const want = new Set();
        for (const [i, code] of Object.entries(SEA)) if (btn[i]) want.add(code);
        const dig = G.digGame && G.digGame.active;
        if (dig) { if (lx < -T.digStick) want.add('KeyA'); if (lx > T.digStick) want.add('KeyD'); }   // the dig grid moves by steps
        else if (Math.abs(lx) > T.dead) rt.padSteer = Math.sign(lx) * Math.pow((Math.abs(lx) - T.dead) / (1 - T.dead), T.curve);   // G-11: the rudder follows the stick
        if (ly < -T.trim) want.add('KeyW'); if (ly > T.trim) want.add('KeyS');
        if (rx < -T.look) want.add('KeyZ'); if (rx > T.look) want.add('KeyX');
        if (Math.abs(ry) > T.zoomDead) rt.padZoom = Math.sign(ry) * (Math.abs(ry) - T.zoomDead) / (1 - T.zoomDead);   // G-15: down = out
        if (btn[8]) { if (view.t < 0) { view.t = 0; view.used = false; } view.t += dt; if (!view.used && view.t >= T.hintHold) { view.used = true; tap('KeyY'); } }
        else { if (view.t >= 0 && !view.used) tap('KeyQ'); view.t = -1; }
        for (const code of [...held]) if (!want.has(code)) set(code, false);
        for (const code of want) set(code, true);
      }
      prevBtn = btn;
    } else { release(); prevBtn = []; }
    requestAnimationFrame(poll);
  };
  const step = (root, dir) => { if (!moveFocus(root, dir)) tap({ U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' }[dir]); };   // nothing that way: the screen's own arrows (pages, tabs)
  const press = (root) => {
    if (shown($('roll'))) return;   // the die is in the air
    const list = focusables(root), cur = document.activeElement;
    if (list.includes(cur)) { cur.click(); return; }
    if (list.length === 1) { list[0].click(); return; }
    if (list.length) { list[0].focus(); return; }
    if (root.id === 'credits') root.click(); else tap('KeyE');   // a talk with no buttons: E moves it on
  };
  // the focus stays in the open screen, so the first press of A always lands on something shown
  const keepFocus = (root) => { if (device !== 'pad') return; const cur = document.activeElement; if (root.contains(cur) && focusables(root).includes(cur)) return; const list = focusables(root); if (list.length) list[0].focus({ preventScroll: true }); };
  requestAnimationFrame(poll);
}
