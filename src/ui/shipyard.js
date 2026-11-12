// The shipyard: a turntable where any hull, sail, flag or figurehead can be tried on before it is bought. State in rt (yard*).
import { clamp } from '../util.js';
import { GROUPS, byId } from '../customize.js';
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { $ } from './dom.js';

export let yardSel;   // set by the init function(s) below, at the point in boot where main.js had them

export function renderYard() {
  if (!rt.yardTry) rt.yardTry = { ...state.custom };
  G.ship.setCustom(rt.yardTry);
  $('yardGold').textContent = state.gold;
  $('yardTabs').innerHTML = GROUPS.map(([g, label]) => `<button data-tab="${g}" class="${g === rt.yardTab ? 'on' : ''}">${label.replace('Hull paint', 'Hull').replace('Pennant colour', 'Colour').replace('Pennant shape', 'Shape').replace('Figurehead', 'Figure')}</button>`).join('');
  const { g, list, o } = yardSel();
  $('yardBody').innerHTML = `<div class="swatches">${list.map((x) => {
    const key = `${g}:${x.id}`, owned = !x.cost || state.owned.has(key), locked = x.ok && !x.ok(state), on = rt.yardTry[g] === x.id;
    const col = g === 'hull' ? x.upper : g === 'flag' ? x.color : g === 'sail' ? `rgb(${x.tint.map((v) => Math.min(255, v * 235) | 0)})` : '';
    return `<button data-id="${x.id}" class="${on ? 'on' : ''}${locked ? ' lock' : ''}" title="${locked ? x.req : ''}">${col ? `<span class="dot" style="background:${col}"></span>` : ''}${x.name}${owned || locked ? '' : ` ${x.cost}g`}</button>`;
  }).join('')}</div>`;
  const key = `${g}:${o.id}`, owned = !o.cost || state.owned.has(key), locked = o.ok && !o.ok(state), worn = state.custom[g] === o.id;
  $('yardTry').innerHTML = locked ? `${o.name}<small>Locked: ${o.req}</small>` : `${worn ? 'Wearing' : 'Trying'}: ${o.name}<small>${owned ? 'yours' : `${o.cost} gold`}</small>`;
  const buy = $('yardBuy');
  buy.textContent = owned ? 'Wear it' : `Buy ${o.cost}g`;
  buy.disabled = locked || worn || (!owned && state.gold < o.cost);
  $('yardBack').disabled = rt.yardTry[g] === state.custom[g];
}
export const yardTurn = (d) => { rt.yardYaw += d; rt.yardIdle = 0; };

/** boot code that ran at this point in main.js; main.js calls it in the same place */
export function initShipyard() {
  // ---------------------------------------------------------------- shipyard (cosmetics)
  // ---- the shipyard: a turntable. Anything can be tried on first (owned or not); nothing is paid for until Buy.
  rt.yardTab = 'hull', rt.yardTry = null, rt.yardYaw = 0.9, rt.yardZoom = 1, rt.yardIdle = 0, rt.yardDrag = null;
  yardSel = () => { const [g, , list] = GROUPS.find((x) => x[0] === rt.yardTab); return { g, list, o: byId(list, rt.yardTry[g]) }; };
  $('yardTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { rt.yardTab = b.dataset.tab; G.audio.play('ui', { vol: 0.4 }); renderYard(); } });
  $('yardBody').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; rt.yardTry[rt.yardTab] = b.dataset.id; G.audio.play('ui', { vol: 0.3 }); renderYard(); });
  $('yardBuy').addEventListener('click', () => {
    const { g, o } = yardSel(), key = `${g}:${o.id}`;
    if (o.cost && !state.owned.has(key)) { if (state.gold < o.cost) return; state.gold -= o.cost; state.owned.add(key); state.stats.cosmetics++; G.audio.play('buy'); }
    state.custom[g] = o.id; renderYard();
  });
  $('yardBack').addEventListener('click', () => { const { g } = yardSel(); rt.yardTry[g] = state.custom[g]; renderYard(); });
  $('yTurnL').addEventListener('click', () => yardTurn(-Math.PI / 2));
  $('yTurnR').addEventListener('click', () => yardTurn(Math.PI / 2));
  $('yardClose').addEventListener('click', () => G.closeModal());
  G.yardEl.addEventListener('pointerdown', (e) => { if (e.target === G.yardEl) { rt.yardDrag = { x: e.clientX, yaw: rt.yardYaw }; G.yardEl.setPointerCapture(e.pointerId); } });
  G.yardEl.addEventListener('pointermove', (e) => { if (rt.yardDrag) { rt.yardYaw = rt.yardDrag.yaw - (e.clientX - rt.yardDrag.x) * 0.01; rt.yardIdle = 0; } });
  G.yardEl.addEventListener('pointerup', () => { rt.yardDrag = null; });
  G.yardEl.addEventListener('wheel', (e) => { rt.yardZoom = clamp(rt.yardZoom * (e.deltaY < 0 ? 0.92 : 1.08), 0.45, 1.8); e.preventDefault(); }, { passive: false });
}
