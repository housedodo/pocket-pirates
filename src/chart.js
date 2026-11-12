// The sea chart (the Chart bookmark of the captain's log): the frame, pan and zoom, the side panel and the hover card.
// The drawing itself is in chartstyles.js. Hover an island for a card with what is there.
// Side panel: what you follow (place, bearing, sailing time), what the chart shows (toggles with counts), this week's festivals, the line key.
import { sectorInfo, sectorCoord } from './sectors.js';
import { bearingName } from './jobs.js';
import * as life from './harbourlife.js';
import { CHART_STYLE, drawVariant } from './chartstyles.js';

// ---- palette (the game's colours, a little muted for paper)
const P = {
  deep: [38, 92, 116], mid: [47, 111, 134], shal1: [84, 156, 164], shal2: [134, 200, 196], foam: [226, 238, 228],
  sand: '#e8d2a0', sandD: '#c8aa70', green: '#7aa85a', greenD: '#557f3e', rock: '#a8a090', rockD: '#7a7266', ink: '#22180f',
  cream: '#fff3d8', red: '#b8341c', blue: '#2a6a9a', gold: '#e8a830', purple: '#6a4aa0', grey: '#6a6058',
};
const KIND_COL = { harbour: P.red, treasure: P.red, rumour: P.red, errand: P.gold, note: P.purple, crates: P.gold };
const STYLE_NAME = { classic: 'harbour town', fishing: 'fishing town', terraced: 'terraced town', thatch: 'thatch village', market: 'market town', farm: 'farm village', shrine: 'shrine village', wreckers: "wreckers' beach" };
const TYPE_NAME = { harbour: 'harbour', jungle: 'jungle isle', rocky: 'rocks', sandbar: 'sandbar', treasure: 'treasure isle', atoll: 'atoll', volcano: 'volcano', mangrove: 'mangroves' };

// ---- 9x9 pixel icons
const ICONS = {
  harbour: ['....#....', '...#.#...', '....#....', '..#####..', '....#....', '....#....', '#...#...#', '.#..#..#.', '..#####..'],
  treasure: ['##.....##', '.##...##.', '..##.##..', '...###...', '....#....', '...###...', '..##.##..', '.##...##.', '##.....##'],
  rumour: ['..####...', '.##..##..', '.....##..', '....##...', '...##....', '...##....', '.........', '...##....', '...##....'],
  errand: ['.#.......', '.#####...', '.#######.', '.#####...', '.#.......', '.#.......', '.#.......', '.#.......', '###......'],
  note: ['...###...', '..#####..', '.###.###.', '..#####..', '...###...', '....#....', '....#....', '....#....', '....#....'],
  crates: ['.........', '#########', '##.....##', '#.#...#.#', '#..#.#..#', '#...#...#', '#..#.#..#', '#########', '.........'],
  jungle: ['.##...##.', '#..#.#..#', '...###...', '..#.#.#..', '....#....', '....#....', '...#.....', '...#.....', '..###....'],
  rocky: ['.........', '....#....', '...###...', '..##.##..', '..#...##.', '.##....#.', '##.....##', '#########', '.........'],
  sandbar: ['.........', '.........', '.##......', '.##...##.', '......##.', '...##....', '...##....', '.........', '.........'],
  atoll: ['..#####..', '.#.....#.', '#...#...#', '#..###..#', '#...#...#', '.#.....#.', '..#####..', '.........', '.........'],
  arch: ['.#######.', '#########', '##.....##', '##.....##', '##.....##', '##.....##', '##.....##', '.........', '.........'],
  volcano: ['...#.#...', '..#.#.#..', '...###...', '..#####..', '.#######.', '#########', '.........', '.........', '.........'],
  mangrove: ['.#.#.#.#.', '#########', '.#######.', '...###...', '..#.#.#..', '.#..#..#.', '.........', '.........', '.........'],
};


export function renderChart(lb) {
  const v = lb.view; v.show = v.show || { harbour: true, treasure: true, rumour: true, errand: true, note: true, names: true };
  lb.root.classList.add('mapmode');
  if (CHART_STYLE) lb.root.dataset.chartstyle = CHART_STYLE;
  lb.body.innerHTML = `<div class="chartgrid"><div class="mapwrap"><canvas id="mapCv"></canvas><canvas id="mapTxt"></canvas><div id="mapCard"></div>
      <div class="mapctl"><button id="mz+">+</button><button id="mz-">&minus;</button><button id="mc" title="Centre on ship">&#9678;</button></div></div>
      <aside class="chartside" id="chartSide"></aside></div>`;
  const cv = document.getElementById('mapCv'), wrap = cv.parentElement;
  lb.cv = cv; lb.c = cv.getContext('2d');
  const size = () => { const w = Math.max(200, wrap.clientWidth), h = Math.max(150, wrap.clientHeight); lb.MW = w; lb.MH = h; cv.width = Math.ceil(w / 2); cv.height = Math.ceil(h / 2); const t = document.getElementById('mapTxt'); t.width = w; t.height = h; };
  size();
  const zoom = (k) => { v.sc = Math.max(0.15, Math.min(2.4, v.sc * k)); drawChart(lb); };
  document.getElementById('mz+').onclick = () => zoom(1.25);
  document.getElementById('mz-').onclick = () => zoom(0.8);
  document.getElementById('mc').onclick = () => { v.follow = true; v.cx = lb.d.ship.pos.x; v.cz = lb.d.ship.pos.z; drawChart(lb); };
  cv.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 0.87); }, { passive: false });
  const toWorld = (e) => { const r = cv.getBoundingClientRect(); return [v.cx + ((e.clientX - r.left) / r.width * lb.MW - lb.MW / 2) / v.sc, v.cz + ((e.clientY - r.top) / r.height * lb.MH - lb.MH / 2) / v.sc]; };
  let drag = null;
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, cx: v.cx, cz: v.cz }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => {
    if (drag) { const k = lb.MW / cv.getBoundingClientRect().width; v.cx = drag.cx - (e.clientX - drag.x) * k / v.sc; v.cz = drag.cz - (e.clientY - drag.y) * k / v.sc; v.follow = false; drawChart(lb); hideCard(); return; }
    hover(lb, e, toWorld(e));
  });
  cv.addEventListener('pointerleave', hideCard);
  cv.addEventListener('pointerup', (e) => {
    const moved = drag && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4; drag = null;
    if (moved) return;
    const [wx, wz] = toWorld(e);
    if (!lb.pencil) {   // a pin of your own: the compass follows the newest one until you get there
      const st = lb.d.state.story, pins = st.pins || (st.pins = []);
      const hit = pins.findIndex((q) => Math.hypot(q.x - wx, q.z - wz) < 22 / v.sc + 4);
      if (hit >= 0) pins.splice(hit, 1);
      else { for (const q of pins) q.on = false; pins.push({ x: Math.round(wx), z: Math.round(wz), on: true }); if (pins.length > 6) pins.shift(); }
      drawChart(lb); return;
    }
    const near = lb.d.world.nearest(wx, wz, 40 / v.sc + 12), B = lb.d.state.board || (lb.d.state.board = { pos: {}, ties: [], note: '', guess: [] });
    const gx = near ? near.desc.x : wx, gz = near ? near.desc.z : wz;
    const i = B.guess.findIndex((g) => g.card === lb.pencil && Math.hypot(g.x - gx, g.z - gz) < 30);
    if (i >= 0) B.guess.splice(i, 1); else B.guess.push({ x: gx, z: gz, card: lb.pencil });
    drawChart(lb);
  });
  lb.chartSize = size;
  drawChart(lb);
  side(lb);
}
const hideCard = () => { const el = document.getElementById('mapCard'); if (el) el.style.display = 'none'; };

/** the island under the pointer: a card with what is there */
function hover(lb, e, [wx, wz]) {
  const { state, world } = lb.d, v = lb.view, el = document.getElementById('mapCard');
  let best = null, bd = 1e9;
  for (const id of Object.keys(state.discovered)) { const [cx, cz] = id.split(',').map(Number), d = world.desc(cx, cz); if (!d) continue; const dd = Math.hypot(d.x - wx, d.z - wz) - d.r; if (dd < bd) { bd = dd; best = d; } }
  if (!best || bd * v.sc > 16) { hideCard(); lb.cv.style.cursor = 'crosshair'; return; }
  lb.cv.style.cursor = 'pointer';
  const d = best, rows = [];
  const [sx, sz] = sectorCoord(d.x, d.z), fac = sectorInfo(sx, sz, lb.d.seed).faction.name;
  const sub = d.type === 'harbour' ? `${STYLE_NAME[d.style] || 'harbour'} · ${fac}` : `${TYPE_NAME[d.type] || d.type}`;
  const row = (k, t, col) => rows.push(`<div class="mc-row"><i class="mc-ic" style="--c:${col}">${iconHtml(k)}</i><span>${t}</span></div>`);
  if (state.job && state.job.toId === d.id) row('errand', `Deliver ${state.job.item}`, P.gold);
  if (state.passenger && state.passenger.toId === d.id) row('errand', `${state.passenger.name} goes ashore here`, P.gold);
  for (const q of state.quests) if (q.giverId === d.id) row('errand', 'A commission was given here', P.gold);
  if (d.type === 'harbour') {
    const L = life.lifeOf(state), a = L.arcs[d.id], A = life.ARCS[life.arcIdOf(d)];
    if (a && a.done) row('harbour', A.after, P.red); else if (a) row('harbour', `${A.who}: ${a.step} of 4`, P.red); else row('harbour', A.who, P.red);
    row('note', life.eventLine(d, state).replace(' here', ''), P.blue);
    if (L.frags.some((f) => f.at === d.name)) row('note', 'You have heard its old story', P.purple);
  }
  if (d.type === 'treasure') row('treasure', state.dug.has(d.id) ? 'Dug up' : 'A chest is buried here', P.red);
  if (state.rumoured[d.id] && !state.rumoured[d.id].found) row('rumour', `Rumour from ${state.rumoured[d.id].source}`, P.red);
  if (d.hut && state.story && state.story.hutKnown) row('note', 'Someone lives here', '#3a1838');
  el.innerHTML = `<b>${d.name}</b><small>${sub}</small>${rows.length ? `<hr>${rows.join('')}` : ''}`;
  const r = lb.cv.getBoundingClientRect(), wr = el.parentElement.getBoundingClientRect();
  let x = e.clientX - wr.left + 18, y = e.clientY - wr.top - 20;
  el.style.display = 'block';
  if (x + el.offsetWidth > wr.width - 8) x = e.clientX - wr.left - el.offsetWidth - 18;
  if (y + el.offsetHeight > wr.height - 8) y = wr.height - el.offsetHeight - 8;
  el.style.left = `${x}px`; el.style.top = `${Math.max(6, y)}px`; void r;
}
/** a 9x9 icon as an inline pixel SVG (for the panel and the card) */
function iconHtml(k) { const m = ICONS[k]; if (!m) return ''; let s = ''; m.forEach((row, j) => { for (let i = 0; i < 9; i++) if (row[i] === '#') s += `M${i} ${j}h1v1h-1z`; }); return `<svg viewBox="0 0 9 9" shape-rendering="crispEdges"><path d="${s}" fill="#fff"/></svg>`; }

/** the side panel: where you are, the errand you follow, what is shown, this week, the line key */
function side(lb) {
  const { state, world, ship, seed } = lb.d, v = lb.view, el = document.getElementById('chartSide'); if (!el) return;
  const [sx, sz] = sectorCoord(ship.pos.x, ship.pos.z), info = sectorInfo(sx, sz, seed);
  const disc = Object.keys(state.discovered).map((id) => { const [cx, cz] = id.split(',').map(Number); return world.desc(cx, cz); }).filter(Boolean);
  const harb = disc.filter((d) => d.type === 'harbour');
  const tr = lb.d.track ? lb.d.track() : null;
  const errands = (state.job ? 1 : 0) + (state.passenger ? 1 : 0) + state.quests.length;
  const counts = { harbour: harb.length, treasure: disc.filter((d) => d.type === 'treasure' && !state.dug.has(d.id)).length, rumour: Object.values(state.rumoured).filter((r) => !r.found).length, errand: errands, note: ((state.story && state.story.pins) || []).length };
  const chip = (k, label, n) => `<label class="cs-row"><i class="mc-ic" style="--c:${KIND_COL[k] || P.grey}">${iconHtml(k === 'names' ? 'jungle' : k)}</i><span>${label}</span><em>${n == null ? '' : n}</em><input type="checkbox" data-show="${k}" ${v.show[k] ? 'checked' : ''}><b class="cs-box"></b></label>`;
  const week = harb.map((d) => ({ d, n: (d.festival - (state.dayN % 7) + 7) % 7 })).sort((a, b) => a.n - b.n).slice(0, 3)
    .map(({ d, n }) => `<div class="cs-ev"><b>${life.gameOf(d).event}</b><small>${d.name.replace(/^(Harbour|Haven|Port) /, '')} · ${n === 0 ? 'today' : n === 1 ? 'tomorrow' : life.WEEKDAYS[d.festival]}</small></div>`).join('');
  el.innerHTML = `<h4 class="cs-title">${info.name}</h4><small class="cs-sub">${info.faction.name} · ${disc.length} ${disc.length === 1 ? 'isle' : 'isles'} charted</small>
    <div class="cs-h">FOLLOWING</div>${tr ? `<div class="cs-follow"><i class="mc-ic" style="--c:${P.gold}">${iconHtml('errand')}</i><div><b>${tr.label}</b><small>${bearingName(tr.x - ship.pos.x, tr.z - ship.pos.z)} · ${lb.d.eta ? lb.d.eta(Math.hypot(tr.x - ship.pos.x, tr.z - ship.pos.z)) : Math.round(Math.hypot(tr.x - ship.pos.x, tr.z - ship.pos.z))}</small></div></div>` : '<small class="cs-none">nothing: pick one in Orders</small>'}
    <div class="cs-h">ON THE CHART</div>${chip('harbour', 'Harbours', counts.harbour)}${chip('treasure', 'Treasure', counts.treasure)}${chip('rumour', 'Rumours', counts.rumour)}${chip('errand', 'Errands', counts.errand)}${chip('note', 'My pins', counts.note)}${chip('names', 'Island names')}
    ${week ? `<div class="cs-h">THIS WEEK</div>${week}` : ''}
    <div class="cs-h">LINES</div><div class="cs-line"><i style="--c:${P.gold}"></i>course to errand</div><div class="cs-line dot"><i style="--c:#dff0f0"></i>current</div>
    <div class="cs-keys">drag · wheel zoom · click to pin</div>`;
  el.querySelectorAll('input[data-show]').forEach((b) => b.addEventListener('change', () => { v.show[b.dataset.show] = b.checked; drawChart(lb); }));
}

/** the chart itself is drawn in chartstyles.js (an inked portolan on vellum); this file keeps the frame, the side panel and the hover card */
export function drawChart(lb) { return drawVariant(lb, CHART_STYLE); }
