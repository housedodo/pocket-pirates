// Controller support (standard mapping: Xbox / PlayStation / Switch Pro / Steam Deck). The pad is turned into the same key
// presses the keyboard makes, so every menu, minigame and prompt works without its own code.
//   left stick / d-pad   steer and sails (A/D, W/S) - in menus and the dig grid the d-pad is the arrow keys
//   A / Cross            interact (E)            B / Circle      back, close (Esc)
//   X / Square           fishing (C)             Y / Triangle    captain's log (M)
//   RT                   strike / fire / skip (Space)            LT    oars (G)
//   LB / RB, right stick camera (Z / X)          View / Select   tracker (Q)        Menu / Start   pause (Esc)
//   left stick press     lantern on / off (L)
const BUTTONS = { 0: 'KeyE', 1: 'Escape', 2: 'KeyC', 3: 'KeyM', 4: 'KeyZ', 5: 'KeyX', 6: 'KeyG', 7: 'Space', 8: 'KeyQ', 9: 'Escape', 10: 'KeyL',
  12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight' };
const KEYCHAR = { KeyL: 'l', KeyE: 'e', KeyC: 'c', KeyM: 'm', KeyZ: 'z', KeyX: 'x', KeyG: 'g', KeyQ: 'q', KeyA: 'a', KeyD: 'd', KeyW: 'w', KeyS: 's', Space: ' ', Escape: 'Escape' };

export function installGamepad(onConnect) {
  const held = new Set();
  const send = (code, down) => {
    const t = document.activeElement && document.activeElement !== document.body ? document.activeElement : window;
    t.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: KEYCHAR[code] || code, bubbles: true, cancelable: true }));
  };
  const set = (code, on) => { if (on && !held.has(code)) { held.add(code); send(code, true); } else if (!on && held.has(code)) { held.delete(code); send(code, false); } };
  window.addEventListener('gamepadconnected', (e) => { if (onConnect) onConnect(e.gamepad.id); });
  const poll = () => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = [...pads].find((g) => g && g.connected);
    if (p) {
      const want = new Set();
      for (const [i, code] of Object.entries(BUTTONS)) { const b = p.buttons[i]; if (b && (b.pressed || b.value > 0.5)) want.add(code); }
      const [lx = 0, ly = 0, rx = 0] = p.axes;
      if (lx < -0.45) want.add('KeyA'); if (lx > 0.45) want.add('KeyD');
      if (ly < -0.55) want.add('KeyW'); if (ly > 0.55) want.add('KeyS');
      if (rx < -0.5) want.add('KeyZ'); if (rx > 0.5) want.add('KeyX');
      for (const code of [...held]) if (!want.has(code)) set(code, false);
      for (const code of want) set(code, true);
    } else for (const code of [...held]) set(code, false);
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
}
