// The sea chart (the Map tab of the captain's log). A full-width chart with a side panel, in the game's pixel style:
// drawn at half resolution and shown pixelated, a dithered teal sea, flat sand and green islands with dark ink coasts,
// pale shallows round every shore, 9x9 pixel icons on coloured badges (colour = meaning), labels in the game's pixel
// font (Pirata One for harbours and the sea's name). Hover an island for a card with what is there.
// Side panel: the errand you follow, what the chart shows (toggles with counts), this week's festivals, the line key.
import { shoreR, hasLighthouse } from './world.js';
import { sectorInfo, sectorCoord } from './sectors.js';
import { hash2 } from './util.js';
import { bearingName } from './jobs.js';
import { LANES } from './seaplay.js';
import { LM } from './landmarks.js';
import { isKnown } from './clues.js';
import * as life from './harbourlife.js';

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
const TYPE_ICON = { jungle: 'jungle', rocky: 'rocky', sandbar: 'sandbar', atoll: 'atoll', treasure: 'arch', volcano: 'volcano', mangrove: 'mangrove' };
/** an icon on a pixel badge, at half-res pixel coords (cx, cy) */
function badge(c, kind, cx, cy, col, fg = '#fff') {
  cx = Math.round(cx); cy = Math.round(cy);
  const R = 7;
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) { const d = x * x + y * y; if (d <= R * R + 2) { c.fillStyle = d > (R - 1) * (R - 1) + 1 ? P.ink : col; c.fillRect(cx + x, cy + y, 1, 1); } }
  glyph(c, kind, cx - 4, cy - 4, fg);
}
function glyph(c, kind, x, y, col) { const m = ICONS[kind]; if (!m) return; c.fillStyle = col; m.forEach((row, j) => { for (let i = 0; i < 9; i++) if (row[i] === '#') c.fillRect(x + i, y + j, 1, 1); }); }

const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const vnoise = (x, z) => { const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi, h = (a, b) => ((hash2(a, b, 7) >>> 0) % 1000) / 1000; const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz); return (h(xi, zi) * (1 - sx) + h(xi + 1, zi) * sx) * (1 - sz) + (h(xi, zi + 1) * (1 - sx) + h(xi + 1, zi + 1) * sx) * sz; };

export function renderChart(lb) {
  const v = lb.view; v.show = v.show || { harbour: true, treasure: true, rumour: true, errand: true, note: true, names: true };
  lb.root.classList.add('mapmode');
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
  el.innerHTML = `<h4 class="cs-title">${info.name}</h4><small class="cs-sub">${info.faction.name} · ${disc.length} isles charted</small>
    <div class="cs-h">FOLLOWING</div>${tr ? `<div class="cs-follow"><i class="mc-ic" style="--c:${P.gold}">${iconHtml('errand')}</i><div><b>${tr.label}</b><small>${bearingName(tr.x - ship.pos.x, tr.z - ship.pos.z)} · ${Math.round(Math.hypot(tr.x - ship.pos.x, tr.z - ship.pos.z))}</small></div></div>` : '<small class="cs-none">nothing: pick one in Quests</small>'}
    <div class="cs-h">ON THE CHART</div>${chip('harbour', 'Harbours', counts.harbour)}${chip('treasure', 'Treasure', counts.treasure)}${chip('rumour', 'Rumours', counts.rumour)}${chip('errand', 'Errands', counts.errand)}${chip('note', 'My pins', counts.note)}${chip('names', 'Island names')}
    ${week ? `<div class="cs-h">THIS WEEK</div>${week}` : ''}
    <div class="cs-h">LINES</div><div class="cs-line"><i style="--c:${P.gold}"></i>course to errand</div><div class="cs-line dot"><i style="--c:#dff0f0"></i>current</div>
    <div class="cs-keys">drag · wheel zoom · click to pin</div>`;
  el.querySelectorAll('input[data-show]').forEach((b) => b.addEventListener('change', () => { v.show[b.dataset.show] = b.checked; drawChart(lb); }));
}

export function drawChart(lb) {
  const { state, world, ship } = lb.d, c = lb.c, v = lb.view, sc = v.sc;
  if (!c || !lb.MW) return;
  const W = lb.MW, H = lb.MH, w2 = c.canvas.width, h2 = c.canvas.height, show = v.show;
  const X = (wx) => (W / 2 + (wx - v.cx) * sc) / 2, Z = (wz) => (H / 2 + (wz - v.cz) * sc) / 2;   // world -> half-res pixels
  const warp = lb.d.abyss ? lb.d.abyss.mapWarp() : null;
  c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
  // ---- the sea: two teals, dithered by a slow noise in world space, so the water has texture but stays calm
  const img = c.createImageData(w2, h2), px = img.data;
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
    const wx = v.cx + (x * 2 - W / 2) / sc, wz = v.cz + (y * 2 - H / 2) / sc, n = vnoise(wx / 140, wz / 140) * 0.7 + vnoise(wx / 40, wz / 40) * 0.3;
    const pick = n + (BAY[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.35 > 0.5 ? P.mid : P.deep, i = (y * w2 + x) * 4;
    px[i] = pick[0]; px[i + 1] = pick[1]; px[i + 2] = pick[2]; px[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  // little wave ticks
  c.fillStyle = 'rgba(200,232,232,0.35)';
  const x0 = v.cx - W / 2 / sc, x1 = v.cx + W / 2 / sc, z0 = v.cz - H / 2 / sc, z1 = v.cz + H / 2 / sc, gs = 60;
  for (let gz = Math.floor(z0 / gs); gz <= z1 / gs; gz++) for (let gx = Math.floor(x0 / gs); gx <= x1 / gs; gx++) { const h = hash2(gx, gz, 77) >>> 0; if (h % 3) continue; const ax = Math.round(X(gx * gs + (h % 40))), az = Math.round(Z(gz * gs + ((h >> 8) % 40))); c.fillRect(ax, az, 2, 1); c.fillRect(ax + 2, az - 1, 2, 1); c.fillRect(ax + 4, az, 2, 1); }

  // ---- islands we know (with the full-dread warp: they drift and phantoms appear)
  const isl = [];
  let n = 0;
  for (const id of Object.keys(state.discovered)) {
    const [cx, cz] = id.split(',').map(Number), d = world.desc(cx, cz); if (!d) continue;
    let ox = 0, oz = 0;
    if (warp) { if (warp.since < n++ * 0.18) continue; const h = hash2(cx, cz, 9) % 100; ox = Math.sin(warp.t * 0.35 + h) * 26 / sc; oz = Math.cos(warp.t * 0.27 + h * 1.7) * 20 / sc; }
    if (X(d.x + ox) < -60 || X(d.x + ox) > w2 + 60 || Z(d.z + oz) < -60 || Z(d.z + oz) > h2 + 60) continue;
    isl.push({ d, ox, oz, name: warp && (hash2(cx, cz, Math.floor(warp.t / 3)) % 5 === 0) ? 'not here' : d.name });
  }
  if (warp && warp.since > 1.2) for (const ph of warp.phantoms) isl.push({ d: ph, ox: Math.sin(warp.t * 0.5) * 10 / sc, oz: 0, name: ph.name, ghost: true });
  const outline = (d, ox, oz, grow) => { c.beginPath(); for (let i = 0; i < 28; i++) { const th = (i / 28) * Math.PI * 2, r = shoreR(d, th) + grow / sc; const xx = X(d.x + ox + Math.cos(th) * r), zz = Z(d.z + oz + Math.sin(th) * r); i ? c.lineTo(xx, zz) : c.moveTo(xx, zz); } c.closePath(); };
  const rgb = (a) => `rgb(${a[0]},${a[1]},${a[2]})`;
  for (const [g, col] of [[22, P.shal1], [10, P.shal2]]) for (const o of isl) { outline(o.d, o.ox, o.oz, g * Math.min(1.4, Math.max(0.6, sc))); c.fillStyle = rgb(col); c.fill(); }
  for (const o of isl) { outline(o.d, o.ox, o.oz, 4); c.strokeStyle = rgb(P.foam); c.lineWidth = 1; c.stroke(); }
  for (const o of isl) {
    const d = o.d; c.globalAlpha = o.ghost ? Math.min(1, (warp.since - 1.2) / 2) : 1;
    outline(d, o.ox, o.oz, 0); c.fillStyle = d.type === 'rocky' ? P.rock : d.type === 'volcano' ? '#6a6064' : P.sand; c.fill();
    const inner = d.type === 'jungle' || d.type === 'atoll' || d.type === 'treasure' || d.type === 'harbour' || d.type === 'mangrove' ? P.green : d.type === 'rocky' ? P.rockD : null;
    if (inner && d.r * sc > 8) { c.save(); outline(d, o.ox, o.oz, 0); c.clip(); c.beginPath(); c.ellipse(X(d.x + o.ox) - 1, Z(d.z + o.oz) - 1, d.r * sc * 0.28, d.r * sc * 0.24, 0, 0, 6.28); c.fillStyle = d.type === 'atoll' ? '#6ac8c8' : inner; c.fill(); c.restore(); }
    // sun from the top-left: a darker lower-right rim
    c.save(); outline(d, o.ox, o.oz, 0); c.clip(); outline(d, o.ox - 2.5 / sc, o.oz - 2.5 / sc, 0); c.lineWidth = 3; c.strokeStyle = 'rgba(80,50,20,0.35)'; c.stroke(); c.restore();
    outline(d, o.ox, o.oz, 0); c.strokeStyle = P.ink; c.lineWidth = 1; c.stroke();
    c.globalAlpha = 1;
  }

  // ---- the fog wall: beyond it the chart is greyed and unfinished (a dither, like the rest of the game)
  { const R = lb.d.gate ? lb.d.gate() : Infinity;
    if (R !== Infinity) { const cx = X(0), cz = Z(0), rr = R * sc / 2;
      c.fillStyle = 'rgba(70,64,70,0.75)'; for (let y = 0; y < h2; y++) for (let x = (y & 1); x < w2; x += 2) if ((x - cx) ** 2 + (y - cz) ** 2 > rr * rr) c.fillRect(x, y, 1, 1);
      c.strokeStyle = 'rgba(230,230,230,0.6)'; c.lineWidth = 1; c.setLineDash([3, 3]); c.beginPath(); c.arc(cx, cz, rr, 0, 6.28); c.stroke(); c.setLineDash([]); } }

  // ---- currents (ridden, or seen from Wick's gallery): dotted lanes with an arrow head
  { const all = state.story && state.story.lm && state.story.lm.keeper !== undefined, rode = (state.story && state.story.lanes) || {};
    for (const L of LANES) if (all || rode[L.name]) {
      const ax = X(L.a[0]), az = Z(L.a[1]), bx = X(L.b[0]), bz = Z(L.b[1]), len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
      c.fillStyle = '#dff0f0'; for (let s = 0; s < len; s += 4) for (const o of [-3, 3]) c.fillRect(Math.round(ax + ux * s - uz * o), Math.round(az + uz * s + ux * o), 1, 1);
      for (let k = 0; k < 5; k++) { c.fillRect(Math.round(bx - ux * k - uz * k), Math.round(bz - uz * k + ux * k), 1, 1); c.fillRect(Math.round(bx - ux * k + uz * k), Math.round(bz - uz * k - ux * k), 1, 1); }
    } }
  // ---- the course to the errand you follow: a dashed gold line
  const tr = lb.d.track ? lb.d.track() : null;
  if (tr && show.errand) { c.strokeStyle = P.gold; c.lineWidth = 1; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(Math.round(X(ship.pos.x)) + 0.5, Math.round(Z(ship.pos.z)) + 0.5); c.lineTo(Math.round(X(tr.x)) + 0.5, Math.round(Z(tr.z)) + 0.5); c.stroke(); c.setLineDash([]); }
  // lost crates: a dashed ring
  for (const q of state.quests) if (q.type === 'crates' && show.errand) { c.strokeStyle = P.gold; c.setLineDash([3, 3]); c.beginPath(); c.arc(X(q.center.x), Z(q.center.z), 35 * sc, 0, 6.28); c.stroke(); c.setLineDash([]); badge(c, 'crates', X(q.center.x), Z(q.center.z), P.gold, P.ink); }
  // pencil guesses (the riddle board)
  for (const g of (state.board && state.board.guess) || []) { c.strokeStyle = '#3a3a7a'; c.setLineDash([2, 2]); c.beginPath(); c.arc(X(g.x), Z(g.z), 13, 0, 6.28); c.stroke(); c.setLineDash([]); }

  // pencil marks the world has taught (clues.js capabilities): wreck ticks at the Ribs and the Throwers' Wreck, the first letter of a rubbed-out name by the Cup
  if (isKnown(state, 'wreckticks')) for (const k of ['ribs', 'wreck']) { const l = LM[k], x = Math.round(X(l.x)), z = Math.round(Z(l.z)); c.fillStyle = '#3a3a7a'; for (let i = -2; i <= 2; i++) { c.fillRect(x + i, z + i - 7, 1, 1); c.fillRect(x + i, z - i - 7, 1, 1); } }
  if (isKnown(state, 'cupmark')) { const l = LM.cup, x = Math.round(X(l.x)) + 6, z = Math.round(Z(l.z)) - 8; c.fillStyle = '#3a3a7a'; ['#.#', '#.#', '##.', '#.#', '#.#'].forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === '#') c.fillRect(x + i, z + j, 1, 1); }); }

  // ---- icons: small type glyphs on islands (when zoomed in), badges for what matters
  const labels = [];
  for (const o of isl) {
    const d = o.d, ix = X(d.x + o.ox), iz = Z(d.z + o.oz), rpx = Math.max(5, shoreR(d, Math.PI / 2) * sc / 2);
    if (d.type === 'harbour' && show.harbour) badge(c, 'harbour', ix, iz, P.red);
    else if (sc >= 0.55 && TYPE_ICON[d.type] && rpx > 6) glyph(c, TYPE_ICON[d.type], Math.round(ix) - 4, Math.round(iz) - 4, 'rgba(34,24,15,0.75)');
    if (d.type === 'treasure' && !state.dug.has(d.id) && show.treasure && state.goals && state.goals.i >= 2) badge(c, 'treasure', ix + rpx + 3, iz - rpx - 2, P.red);
    if (d.type === 'harbour' && hasLighthouse(d) && sc >= 0.55) { c.fillStyle = '#f4f0e6'; c.fillRect(Math.round(ix - rpx - 4), Math.round(iz - 6), 2, 6); c.fillStyle = '#ffd23a'; c.fillRect(Math.round(ix - rpx - 4), Math.round(iz - 8), 2, 2); }
    if (d.hut && state.story && state.story.hutKnown) { const hx = Math.round(ix + 3), hz = Math.round(iz - 3); c.fillStyle = '#120c0e'; c.fillRect(hx - 4, hz - 2, 8, 6); c.beginPath(); c.moveTo(hx - 6, hz - 2); c.lineTo(hx + 1, hz - 9); c.lineTo(hx + 6, hz - 2); c.fill(); c.fillStyle = '#c030a0'; c.fillRect(hx + 1, hz, 2, 2); }
    const big = d.type === 'harbour';
    if (big || (show.names && sc >= 0.5)) labels.push({ t: o.name, x: ix * 2, y: (iz + rpx) * 2 + (big ? 20 : 14), big });
  }
  for (const r of Object.values(state.rumoured)) if (!r.found && show.rumour) badge(c, 'rumour', X(r.x) - 9, Z(r.z) - 9, P.red);
  if (state.job && show.errand) badge(c, 'errand', X(state.job.x) + 10, Z(state.job.z) - 10, P.gold, P.ink);
  if (state.passenger && show.errand) badge(c, 'errand', X(state.passenger.x) + 10, Z(state.passenger.z) - 10, P.gold, P.ink);
  for (const q of ((state.story && state.story.pins) || [])) if (show.note) badge(c, 'note', X(q.x), Z(q.z) - 8, q.on ? P.purple : '#8a7a9a');

  // ---- your ship: a pixel arrow pointing the way you are heading, in a ring
  { const sx = Math.round(X(ship.pos.x)), sz = Math.round(Z(ship.pos.z)), h = ship.heading;
    c.strokeStyle = 'rgba(255,243,216,0.85)'; c.lineWidth = 1; c.beginPath(); c.arc(sx + 0.5, sz + 0.5, 10, 0, 6.28); c.stroke();
    const pt = (a, r) => [sx + Math.sin(h + a) * r, sz - Math.cos(h + a) * r];
    c.beginPath(); c.moveTo(...pt(0, 8)); c.lineTo(...pt(2.5, 6)); c.lineTo(...pt(Math.PI, 2)); c.lineTo(...pt(-2.5, 6)); c.closePath(); c.fillStyle = P.cream; c.fill();
    c.beginPath(); c.moveTo(...pt(0, 6)); c.lineTo(...pt(2.5, 4)); c.lineTo(...pt(Math.PI, 0.5)); c.lineTo(...pt(-2.5, 4)); c.closePath(); c.fillStyle = P.red; c.fill(); }
  // ---- a small compass rose, bottom left
  { const cx = 22, cz = h2 - 22; for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) { const d2 = x * x + y * y; if (d2 <= 145) { c.fillStyle = d2 > 121 ? P.ink : 'rgba(239,224,188,0.9)'; c.fillRect(cx + x, cz + y, 1, 1); } }
    c.fillStyle = P.red; for (let k = 0; k < 9; k++) c.fillRect(cx - Math.floor((9 - k) / 4), cz - 10 + k, 1 + 2 * Math.floor((9 - k) / 4), 1);
    c.fillStyle = P.ink; for (let k = 0; k < 9; k++) c.fillRect(cx - Math.floor((9 - k) / 4), cz + 10 - k, 1 + 2 * Math.floor((9 - k) / 4), 1); }
  if (warp && warp.since > 2.5) { c.save(); c.globalAlpha = Math.min(0.75, (warp.since - 2.5) / 3); c.strokeStyle = '#7a1a3a'; c.lineWidth = 2; c.beginPath(); c.ellipse(X(ship.pos.x), Z(ship.pos.z), 22, 10, 0, 0, 6.28); c.stroke(); c.restore(); }
  // ---- a thin ink frame
  c.strokeStyle = P.ink; c.lineWidth = 2; c.strokeRect(1, 1, w2 - 2, h2 - 2);

  if (isKnown(state, 'date')) labels.push({ t: `Day ${Math.round((state.dayN || 0) + 30)}`, x: W - 70, y: H - 24, big: false });   // a date in the margin, in a hand that is not yours
  // ---- labels on the full-res layer: Pirata One for harbours, the pixel font for the rest, cream with a dark rim
  const tc = document.getElementById('mapTxt'), t = tc && tc.getContext('2d');
  if (t) {
    t.clearRect(0, 0, W, H); t.textAlign = 'center'; t.textBaseline = 'middle'; t.lineJoin = 'round';
    for (const L of labels) {
      t.font = L.big ? '400 22px "Pirata One", Georgia, serif' : '400 15px "DotGothic16", monospace';
      t.lineWidth = L.big ? 5 : 4; t.strokeStyle = 'rgba(26,18,10,0.92)'; t.strokeText(L.t, Math.round(L.x), Math.round(L.y));
      t.fillStyle = L.big ? '#fff3d8' : '#f2e6c8'; t.fillText(L.t, Math.round(L.x), Math.round(L.y));
    }
    t.font = '400 16px "DotGothic16", monospace'; t.textAlign = 'center';
    t.strokeStyle = 'rgba(26,18,10,0.9)'; t.lineWidth = 4; t.strokeText('N', 44, H - 82); t.fillStyle = '#fff3d8'; t.fillText('N', 44, H - 82);
    if (warp && warp.since > 2.5) { t.globalAlpha = Math.min(0.75, (warp.since - 2.5) / 3); t.font = '400 30px "DotGothic16", monospace'; t.fillStyle = '#7a1a3a'; t.fillText('TURN BACK', X(ship.pos.x) * 2, Z(ship.pos.z) * 2 - 60); t.globalAlpha = 1; }
  }
  if (warp && !lb.warpRaf) lb.warpRaf = requestAnimationFrame(() => { lb.warpRaf = 0; if (lb.tab === 'map' && document.getElementById('chart').classList.contains('open')) drawChart(lb); });
}
