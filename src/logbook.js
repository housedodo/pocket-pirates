import { shoreR, hasLighthouse } from './world.js';
import { SECTOR, sectorInfo, sectorCoord } from './sectors.js';
import { UPGRADES, MAX_LEVEL } from './upgrades.js';
import { friendLevel, bearingName, questProgress, questNeed, questTitle, questIcon, FRUITS, fruitName } from './jobs.js';
import { mulberry32, hash2 } from './util.js';
import { MAIN_GOALS, SIDE_GOALS } from './objectives.js';
import { FISH } from './fishing.js';
import { GROUPS, byId } from './customize.js';

// The captain's log: an old low-poly book. Tabs are cloth bookmarks sticking out of the right side, content flows over two pages
// (turn with the arrows below / Up and Down), and the Map is a hand-inked low-poly chart.
const TABS = [['map', 'Map', '🧭'], ['goals', 'Goals', '⚓'], ['quests', 'Quests', '📜'], ['riddles', 'Riddles', '🗝'], ['rumours', 'Rumours', '🗣'], ['journal', 'Journal', '📖'], ['ship', 'Ship', '⛵'], ['standing', 'Standing', '⭐']];
const W = 880, H = 470;
const INK = '#3a2210';

const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const shade = (c, k) => { const [r, g, b] = hex(c); return `rgb(${Math.max(0, Math.min(255, r * k)) | 0},${Math.max(0, Math.min(255, g * k)) | 0},${Math.max(0, Math.min(255, b * k)) | 0})`; };
const LAND = { sand: '#ecd69c', jungle: '#92c274', rocky: '#b7ad9c', treasure: '#ecd69c', harbour: '#dcb877' };
// ---- hand-drawn look: every line is drawn twice, a little off, with wobbly sub-segments; fills are
// uneven watercolour washes with pencil hatching. Seeded, so a drawing does not boil while you pan.
const circ = (x, y, r, n = 12) => Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * 6.2832) * r, y + Math.sin((i / n) * 6.2832) * r]);
const rectP = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
function sketcher(c, seed) {
  const r = mulberry32(seed | 0), j = (a) => (r() - 0.5) * 2 * a;
  const path = (pts, closed, amp) => {
    const P = closed ? [...pts, pts[0]] : pts;
    c.beginPath();
    P.forEach((p, i) => {
      if (!i) { c.moveTo(p[0] + j(amp), p[1] + j(amp)); return; }
      const q = P[i - 1];
      for (let k = 1; k <= 3; k++) { const t = k / 3; c.lineTo(q[0] + (p[0] - q[0]) * t + j(amp), q[1] + (p[1] - q[1]) * t + j(amp)); }
    });
  };
  return {
    r, j,
    line(pts, o = {}) {
      const { closed = true, col = INK, w = 1.3, passes = 2, amp = 1.1, alpha = 1 } = o;
      c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
      for (let i = 0; i < passes; i++) { c.lineWidth = w * (0.6 + r() * 0.6); c.globalAlpha = alpha * (0.6 + r() * 0.4); path(pts, closed, amp); c.stroke(); }
      c.globalAlpha = 1;
    },
    wash(pts, col, a = 0.6, amp = 1.8) {
      c.fillStyle = col;
      c.globalAlpha = a; path(pts, true, amp); c.fill();
      const ox = j(2), oz = j(2); c.globalAlpha = a * 0.45; path(pts.map((p) => [p[0] + ox, p[1] + oz]), true, amp * 1.6); c.fill(); // misregistered second coat
      c.globalAlpha = 1;
    },
    hatch(pts, o = {}) {
      const { col = INK, gap = 4, a = 0.25, ang = 0.9 } = o;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      c.save(); c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.clip();
      c.strokeStyle = col; c.lineWidth = 0.8; c.globalAlpha = a;
      const L = (x1 - x0) + (y1 - y0), dx = Math.cos(ang), dy = Math.sin(ang);
      for (let t = -L; t < L; t += gap + j(1)) {
        const cx = (x0 + x1) / 2 + t * dy, cy = (y0 + y1) / 2 - t * dx;
        c.beginPath(); c.moveTo(cx - dx * L + j(1), cy - dy * L + j(1)); c.lineTo(cx + dx * L + j(1), cy + dy * L + j(1)); c.stroke();
      }
      c.restore(); c.globalAlpha = 1;
    },
    text(str, x, y, o = {}) {
      const { font = 'italic 700 12px Georgia, serif', col = INK, halo = true } = o;
      c.save(); c.translate(x + j(1), y + j(1)); c.rotate(j(0.06)); c.font = font; c.textAlign = 'center';
      if (halo) { c.strokeStyle = 'rgba(232,214,166,0.85)'; c.lineWidth = 3; c.strokeText(str, 0, 0); }
      c.fillStyle = col; c.globalAlpha = 0.85 + r() * 0.15; c.fillText(str, 0, 0); c.restore(); c.globalAlpha = 1;
    },
  };
}
// the cover: worn leather as a low-poly mesh (each facet lit from the top-left), stitched edge, brass corners
function lowPolyCover() {
  const CW = 1000, CH = 600, cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  const c = cv.getContext('2d'), r = mulberry32(404), NX = 14, NY = 8, P = [];
  for (let y = 0; y <= NY; y++) for (let x = 0; x <= NX; x++) {
    const edge = x === 0 || y === 0 || x === NX || y === NY;
    P.push([x / NX * CW + (edge ? 0 : (r() - 0.5) * 40), y / NY * CH + (edge ? 0 : (r() - 0.5) * 40), r() * 60]);
  }
  const at = (x, y) => P[y * (NX + 1) + x], L = [-0.5, -0.6, 0.62];
  const face = (a, b, d) => {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], len = Math.hypot(...n) || 1;
    const k = Math.abs((n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / len), sh = 0.45 + k * 0.85 + (r() - 0.5) * 0.12;
    c.fillStyle = `rgb(${92 * sh | 0},${54 * sh | 0},${26 * sh | 0})`;
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.closePath(); c.fill();
    c.strokeStyle = c.fillStyle; c.lineWidth = 1; c.stroke();
  };
  for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
    const a = at(x, y), b = at(x + 1, y), d = at(x + 1, y + 1), e = at(x, y + 1);
    if ((x + y) % 2) { face(a, b, d); face(a, d, e); } else { face(a, b, e); face(b, d, e); }
  }
  for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(${r() > 0.5 ? '20,10,4' : '180,130,80'},${r() * 0.18})`; c.fillRect(r() * CW, r() * CH, 1 + r() * 30, 1); } // scuffs
  for (let i = 0; i < 25; i++) { c.fillStyle = 'rgba(20,10,4,0.18)'; c.beginPath(); c.ellipse(r() * CW, r() * CH, 10 + r() * 40, 6 + r() * 20, r() * 3, 0, 7); c.fill(); } // worn patches
  c.strokeStyle = 'rgba(232,200,140,0.55)'; c.lineWidth = 2; c.setLineDash([7, 6]); c.strokeRect(9, 9, CW - 18, CH - 18); c.setLineDash([]);
  const corner = (x, y, sx, sy) => {
    const pts = [[x, y], [x + sx * 46, y], [x, y + sy * 46]];
    const tri = (a, b, d, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.lineTo(...d); c.closePath(); c.fill(); };
    const m = [x + sx * 15, y + sy * 15];
    tri(pts[0], pts[1], m, '#e2c47a'); tri(pts[0], m, pts[2], '#a8873c'); tri(pts[1], pts[2], m, '#c9a85c');
    c.fillStyle = '#5a4012'; c.beginPath(); c.arc(x + sx * 10, y + sy * 10, 2.5, 0, 7); c.fill();
  };
  corner(0, 0, 1, 1); corner(CW, 0, -1, 1); corner(0, CH, 1, -1); corner(CW, CH, -1, -1);
  const g = c.createLinearGradient(CW / 2 - 40, 0, CW / 2 + 40, 0); // spine bulge
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(CW / 2 - 40, 0, 80, CH);
  return cv.toDataURL();
}
const stars = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
const ent = (title, sub = '', right = '', cls = '') => `<div class="ent ${cls}"><b>${title}</b>${right ? `<span class="r">${right}</span>` : ''}${sub ? `<small>${sub}</small>` : ''}</div>`;
const h3 = (t) => `<h3>${t}</h3>`;
const more = (arr, n) => (arr.length > n ? `<div class="ent dim"><small>+ ${arr.length - n} more</small></div>` : '');

export class Logbook {
  constructor(deps) {
    this.d = deps; // { state, world, ship, seed, toast, close, skipGoal, mate, dread }
    this.tab = 'map';
    this.view = { cx: 0, cz: 0, sc: 0.8, follow: true };
    this.root = document.getElementById('chart');
    this.tabsEl = document.getElementById('logTabs');
    this.body = document.getElementById('logBody');
    this.num = document.getElementById('pgNum');
    this.page = 0;
    this.parch = null;
    this.root.querySelector('.book').style.backgroundImage = `url(${lowPolyCover()})`;
    this.tabsEl.innerHTML = TABS.map(([id, label, icon], i) => `<button data-tab="${id}" title="${label} (${i + 1})"><span>${icon}</span><em>${label}</em></button>`).join('');
    this.tabsEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) this.open(b.dataset.tab); });
    document.getElementById('logClose').addEventListener('click', () => deps.close());
    document.getElementById('pgPrev').addEventListener('click', () => this.turn(-1));
    document.getElementById('pgNext').addEventListener('click', () => this.turn(1));
  }

  open(tab = this.tab) {
    this.tab = tab; this.page = 0;
    this.tabsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    if (tab === 'map' && this.view.follow) { this.view.cx = this.d.ship.pos.x; this.view.cz = this.d.ship.pos.z; }
    this.render();
  }
  step(dir) { const i = TABS.findIndex((t) => t[0] === this.tab); this.open(TABS[(i + dir + TABS.length) % TABS.length][0]); }
  tabByIndex(i) { if (TABS[i]) this.open(TABS[i][0]); }

  turn(dir) {
    const gap = 56, w = this.body.clientWidth, count = Math.max(1, Math.round((this.body.scrollWidth + gap) / (w + gap)));
    this.page = Math.max(0, Math.min(count - 1, this.page + dir));
    this.body.scrollTo({ left: this.page * (w + gap), behavior: 'smooth' });
    this.num.textContent = count > 1 ? `${this.page + 1} / ${count}` : '';
  }

  render() {
    this.body.className = this.tab === 'map' ? 'full' : 'cols';
    this.body.scrollLeft = 0;
    ({ map: this.renderMap, goals: this.renderGoals, quests: this.renderQuests, riddles: this.renderRiddles, rumours: this.renderRumours, journal: this.renderJournal, ship: this.renderShip, standing: this.renderStanding })[this.tab].call(this);
    requestAnimationFrame(() => this.turn(0));
  }

  // ------------------------------------------------------------ pages
  renderGoals() {
    const { state } = this.d, g = state.goals, st = state.stats;
    let html = h3('Main goals');
    MAIN_GOALS.forEach((m, i) => {
      const done = i < g.i, cur = i === g.i;
      html += ent(`${done ? '✓' : cur ? '▶' : '○'} ${m.title}`, cur ? m.text : '', `${m.reward}g`, done ? 'done' : cur ? 'cur' : (i === g.i + 1 ? '' : 'dim'));
    });
    if (MAIN_GOALS[g.i]) html += `<button id="skipGoal" class="mini">Skip this goal</button>`;
    html += '<h3 class="brk">Optional</h3>';
    for (const s of SIDE_GOALS) html += ent(`${g.side[s.id] ? '✓' : '○'} ${s.title}`, g.side[s.id] ? '' : s.text, `${s.reward}g`, g.side[s.id] ? 'done' : '');
    const notes = (this.d.mate && this.d.mate.history.slice(-3)) || [];
    if (notes.length) html += h3('Mara said') + notes.map((n) => `<div class="ent"><small>“${n}”</small></div>`).join('');
    html += h3('Voyage') + ent(`${Math.round(st.dist)} sailed`, `${st.fish} fish · ${st.treasures} treasures · ${st.wrecks} wrecks · ${st.sunk} raiders · ${st.deliveries} deliveries`);
    this.body.innerHTML = html;
    const b = document.getElementById('skipGoal');
    if (b) b.addEventListener('click', () => { this.d.skipGoal(); this.render(); });
  }

  renderQuests() {
    const { state, ship } = this.d, dread = this.d.dread();
    let html = h3('Delivery');
    const j = state.job;
    if (j) {
      const dx = j.x - ship.pos.x, dz = j.z - ship.pos.z;
      html += ent(`📮 ${j.item}`, `to ${j.toName} · ${Math.round(Math.hypot(dx, dz))} ${bearingName(dx, dz)}`, `${j.reward}g`) + '<button id="abandon" class="mini">Abandon</button>';
    } else html += ent('No delivery', 'Take one at a harbour job board.', '', 'dim');
    html += h3(`Commissions (${state.quests.length}/3)`);
    if (!state.quests.length) html += ent('None taken', 'Harbour boards post errands: fish, fruit, crates, raiders…', '', 'dim');
    for (const q of state.quests) {
      const need = questNeed(q), have = questProgress(q, state), done = have >= need;
      let where = `for ${q.giverName}`;
      if (q.type === 'crates' && !done) { const dx = q.center.x - ship.pos.x, dz = q.center.z - ship.pos.z; where = `search ${bearingName(dx, dz)}, ~${Math.round(Math.hypot(dx, dz))}`; }
      html += `<div class="ent ${done ? 'cur' : ''}"><b>${questIcon(q)} ${questTitle(q, dread)}</b><span class="r">${q.reward}g</span><small>${where}${done ? ' · ready to hand in' : ''}</small><i class="pbar"><b style="width:${Math.round((have / need) * 100)}%"></b></i><small>${have}/${need} <button class="mini" data-drop="${q.id}">Drop</button></small></div>`;
    }
    const hist = state.jobHistory || [];
    html += '<h3 class="brk">Done</h3>' + (hist.length ? hist.slice(-4).reverse().map((h) => ent(h.item, `to ${h.to}`, `+${h.reward}g`)).join('') : ent('Nothing yet', '', '', 'dim'));
    this.body.innerHTML = html;
    const b = document.getElementById('abandon');
    if (b) b.addEventListener('click', () => { state.job = null; this.d.toast('Delivery abandoned.'); this.render(); });
    this.body.querySelectorAll('[data-drop]').forEach((x) => x.addEventListener('click', () => { this.d.dropQuest(x.dataset.drop); this.render(); }));
  }

  renderRiddles() {
    const { state, world, ship } = this.d;
    const ids = Object.keys(state.riddles);
    let html = h3('Treasure riddles');
    if (!ids.length) html += '<div class="riddle dim"><i>None yet.</i><small>Sail up to a treasure isle and press E to study the arch: it names the shore where the chest is buried.</small></div>';
    ids.sort((a, b) => (state.dug.has(a) ? 1 : 0) - (state.dug.has(b) ? 1 : 0));
    for (const id of ids) {
      const [cx, cz] = id.split(',').map(Number), d = world.desc(cx, cz), dug = state.dug.has(id);
      const where = d ? (() => { const dx = d.x - ship.pos.x, dz = d.z - ship.pos.z; return `${bearingName(dx, dz)}, ~${Math.round(Math.hypot(dx, dz))} fathoms`; })() : '';
      html += `<div class="riddle ${dug ? 'done' : ''}"><b>${d ? d.name : id}</b> ${dug ? '<span class="ok">✓ dug up</span>' : ''}<p>“${state.riddles[id]}”</p>${dug ? '' : `<small>${where}</small>`}</div>`;
    }
    this.body.innerHTML = html;
  }

  renderRumours() {
    const { state, ship } = this.d;
    const list = Object.values(state.rumoured);
    let html = h3('Rumours');
    if (!list.length) html += ent('None yet', 'Buy one in a harbour, or trade with a ship.', '', 'dim');
    for (const r of list) {
      const dx = r.x - ship.pos.x, dz = r.z - ship.pos.z;
      html += ent(r.name, r.found ? 'found' : `${bearingName(dx, dz)}, ~${Math.round(Math.hypot(dx, dz))} fathoms · ${r.source || ''}`, r.found ? '✓' : '?', r.found ? 'done' : '');
    }
    this.body.innerHTML = html;
  }

  renderJournal() {
    const { state } = this.d, dread = this.d.dread();
    const isl = Object.values(state.discovered);
    const types = { harbour: 'Harbours', treasure: 'Treasure isles', jungle: 'Jungles', rocky: 'Rocks', sandbar: 'Sandbars' };
    let html = h3(`Charted (${isl.length})`);
    for (const [t, label] of Object.entries(types)) { const l = isl.filter((i) => i.type === t); if (l.length) html += ent(`${label} · ${l.length}`, l.slice(0, 6).map((i) => i.name).join(', ') + (l.length > 6 ? '…' : '')); }
    if (!isl.length) html += ent('Nothing yet', '', '', 'dim');
    const caught = FISH.filter((f) => state.fishLog[f.id]);
    html += h3(`Fish log ${caught.length}/${FISH.length}`);
    html += caught.length ? caught.map((f) => ent(f.name, `best ${state.fishLog[f.id].best}kg`, `×${state.fishLog[f.id].count}`, f.dark ? 'dk' : '')).join('') : ent('Press C at sea', '', '', 'dim');
    const fruits = Object.entries(state.fruit).filter(([, n]) => n > 0);
    html += h3('Hold') + ent('Fish', state.catch.length ? `${state.catch.length} to sell` : 'none') + ent('Fruit', fruits.length ? fruits.map(([f, n]) => `${n} ${fruitName(f, dread)}`).join(', ') : 'none');
    html += h3(`Treasures (${state.loot.length})`);
    html += state.loot.length ? state.loot.slice(-6).reverse().map((l) => ent(l.name, '', `${l.value}g`, l.dark ? 'dk' : '')).join('') + more(state.loot, 6) : ent('None yet', '', '', 'dim');
    html += h3(`Bottles (${state.notes.length})`);
    html += state.notes.length ? state.notes.slice(-4).reverse().map((n) => `<div class="ent ${n.dark ? 'dk' : ''}"><small>“${n.text}”</small></div>`).join('') : ent('None yet', '', '', 'dim');
    this.body.innerHTML = html;
  }

  renderShip() {
    const { state, ship } = this.d;
    let html = h3('The Pocket Pearl') + ent(`${state.gold} gold`, `hull ${Math.round(state.hp)}/${ship.mods.maxHp} · ${state.ammo} cannonballs`);
    html += h3('Fittings') + UPGRADES.map((u) => { const lv = state.upgrades[u.id]; return ent(u.name, lv ? u.text[lv - 1].split(':')[0] : 'stock', `<span class="pips">${'■'.repeat(lv)}${'□'.repeat(MAX_LEVEL - lv)}</span>`); }).join('');
    html += h3('Looks') + GROUPS.map(([g, label, list]) => ent(label, byId(list, state.custom[g]).name)).join('');
    const b = state.buffs || {}, act = [];
    if (b.speed > 0) act.push(['Fresh supplies', `${Math.ceil(b.speed)}s`]);
    if (b.dig > 0) act.push(['Rum rations', `${Math.ceil(b.dig)}s`]);
    html += h3('Active') + (act.length ? act.map(([a, t]) => ent(a, '', t)).join('') : ent('Nothing', '', '', 'dim'));
    this.body.innerHTML = html;
  }

  renderStanding() {
    const { state, world, seed } = this.d;
    const secs = {};
    const harbours = Object.entries(state.rep).map(([id, r]) => {
      const [cx, cz] = id.split(',').map(Number), d = world.desc(cx, cz);
      if (!d) return null;
      const sec = sectorInfo(...sectorCoord(d.x, d.z), seed), lvl = friendLevel(r);
      secs[sec.id] = (secs[sec.id] || 0) + lvl;
      return { name: d.name, lvl };
    }).filter(Boolean);
    let html = h3('Sectors');
    const seen = (state.sectorsSeen || []).map((id) => { const [sx, sz] = id.split(',').map(Number); return sectorInfo(sx, sz, seed); });
    html += seen.length ? seen.map((s) => ent(`<span class="fac" style="background:${s.faction.color}"></span> ${s.name}`, s.faction.name, stars(Math.min(3, secs[s.id] || 0)))).join('') : ent('Unseen', '', '', 'dim');
    html += h3('Harbours') + (harbours.length ? harbours.map((h) => ent(h.name, '', stars(h.lvl))).join('') : ent('Nobody knows you yet', 'Visit and deliver.', '', 'dim'));
    this.body.innerHTML = html;
  }

  // ------------------------------------------------------------ map
  renderMap() {
    this.body.innerHTML = `<div class="mapwrap"><canvas id="mapCv" width="${W}" height="${H}"></canvas>
      <div class="mapctl"><button id="mz+">+</button><button id="mz-">&minus;</button><button id="mc" title="Centre on ship">◎</button></div></div>
      <div class="legend">drag to pan · wheel to zoom · <b>⌂</b> harbour &nbsp;<b>▯</b> arch (treasure) &nbsp;<b style="color:#b02818">?</b> rumour &nbsp;<b style="color:#d07010">⚑</b> delivery &nbsp;<b style="color:#b07010">▣</b> crates</div>`;
    const cv = document.getElementById('mapCv');
    this.cv = cv; this.c = cv.getContext('2d');
    const v = this.view;
    const zoom = (k) => { v.sc = Math.max(0.15, Math.min(2.4, v.sc * k)); this.drawMap(); };
    document.getElementById('mz+').onclick = () => zoom(1.25);
    document.getElementById('mz-').onclick = () => zoom(0.8);
    document.getElementById('mc').onclick = () => { v.follow = true; v.cx = this.d.ship.pos.x; v.cz = this.d.ship.pos.z; this.drawMap(); };
    cv.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 0.87); }, { passive: false });
    let drag = null;
    cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, cx: v.cx, cz: v.cz }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const k = W / cv.getBoundingClientRect().width;
      v.cx = drag.cx - (e.clientX - drag.x) * k / v.sc; v.cz = drag.cz - (e.clientY - drag.y) * k / v.sc; v.follow = false;
      this.drawMap();
    });
    cv.addEventListener('pointerup', () => { drag = null; });
    this.drawMap();
  }

  parchment() {
    if (this.parch) return this.parch;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'), r = mulberry32(55), sk = sketcher(c, 9);
    c.fillStyle = '#e2cd9a'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 180; i++) { c.fillStyle = `rgba(${r() > 0.5 ? '140,100,50' : '255,245,210'},${0.03 + r() * 0.06})`; c.beginPath(); c.ellipse(r() * W, r() * H, 20 + r() * 90, 14 + r() * 60, r() * 3, 0, 7); c.fill(); }
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(110,75,35,${r() * 0.14})`; c.fillRect(r() * W, r() * H, 1 + r() * 3, 1); }   // fibres
    // water stains with dark tide-lines
    for (let i = 0; i < 4; i++) {
      const x = r() * W, y = r() * H, rr = 30 + r() * 70, pts = circ(x, y, rr, 16).map(([px, py]) => [px + (r() - 0.5) * rr * 0.4, py + (r() - 0.5) * rr * 0.4]);
      sk.wash(pts, 'rgba(150,105,50,1)', 0.07, 6); sk.line(pts, { col: 'rgba(120,75,30,1)', w: 1.6, alpha: 0.35, amp: 3, passes: 1 });
    }
    // a coffee-mug ring, half a ring next to it
    for (const [x, y, a0, a1] of [[W * 0.78, H * 0.22, 0, 6.2], [W * 0.84, H * 0.3, 2.2, 5.4]]) {
      c.strokeStyle = 'rgba(110,60,20,0.28)'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, 34, a0, a1); c.stroke();
      c.lineWidth = 1.2; c.strokeStyle = 'rgba(90,45,15,0.3)'; c.beginPath(); c.arc(x, y, 36.5, a0, a1 - 0.6); c.stroke();
    }
    // fold creases: a dark valley with a rubbed, lighter ridge beside it
    for (const [x0, y0, x1, y1] of [[W / 2, 0, W / 2 + 6, H], [0, H / 2, W, H / 2 - 4]]) {
      for (const [col, off, w] of [['rgba(80,50,20,0.28)', 0, 1.4], ['rgba(255,248,225,0.35)', 2, 2.5], ['rgba(80,50,20,0.1)', -3, 4]]) {
        c.strokeStyle = col; c.lineWidth = w; c.beginPath();
        for (let k = 0; k <= 20; k++) { const t = k / 20, x = x0 + (x1 - x0) * t + (y0 === 0 ? off : 0) + (r() - 0.5), y = y0 + (y1 - y0) * t + (x0 === 0 ? off : 0) + (r() - 0.5); k ? c.lineTo(x, y) : c.moveTo(x, y); }
        c.stroke();
      }
    }
    // graphite smudges and erased scribbles
    for (let i = 0; i < 6; i++) {
      const x = r() * W, y = r() * H, g = c.createRadialGradient(x, y, 2, x, y, 30 + r() * 30);
      g.addColorStop(0, 'rgba(70,65,60,0.13)'); g.addColorStop(1, 'rgba(70,65,60,0)'); c.fillStyle = g; c.fillRect(x - 70, y - 70, 140, 140);
    }
    for (let i = 0; i < 5; i++) {
      const x = r() * W, y = r() * H, pts = Array.from({ length: 7 }, (_, k) => [x + k * 6 + r() * 4, y + (k % 2 ? 6 : -6) + r() * 3]);
      sk.line(pts, { closed: false, col: '#6a6460', w: 1, alpha: 0.25, passes: 1 });
    }
    // pencil notes somebody left
    const notes = ['calm here', 'fish?', '12 fathoms', 'x nothing', 'reef!', '40 + 15 = 55', 'ask Perrin', 'gulls', '?'];
    for (let i = 0; i < 7; i++) sk.text(notes[i % notes.length], 40 + r() * (W - 80), 30 + r() * (H - 60), { font: `italic ${10 + (r() * 3 | 0)}px Georgia, serif`, col: 'rgba(80,72,64,0.5)', halo: false });
    for (let i = 0; i < 3; i++) { const x = 60 + r() * (W - 120), y = 40 + r() * (H - 80); sk.line([[x, y], [x + 30 + r() * 40, y + (r() - 0.5) * 30]], { closed: false, col: '#6a6460', alpha: 0.35, w: 1, passes: 1 }); }
    // ink blots and spatter
    for (let i = 0; i < 3; i++) {
      const x = r() * W, y = r() * H, rr = 3 + r() * 6;
      sk.wash(circ(x, y, rr, 9).map(([px, py]) => [px + (r() - 0.5) * rr, py + (r() - 0.5) * rr]), '#2a1608', 0.65, 1);
      for (let k = 0; k < 6; k++) { c.fillStyle = 'rgba(42,22,8,0.5)'; c.beginPath(); c.arc(x + (r() - 0.5) * rr * 6, y + (r() - 0.5) * rr * 6, r() * 1.6, 0, 7); c.fill(); }
    }
    // worn, darkened edges and a dog-eared corner
    for (let i = 0; i < 260; i++) {
      const side = i % 4, t = r(), d = r() * r() * 26;
      const x = side === 0 ? t * W : side === 1 ? W - d : side === 2 ? t * W : d, y = side === 0 ? d : side === 1 ? t * H : side === 2 ? H - d : t * H;
      c.fillStyle = `rgba(90,55,20,${0.05 + r() * 0.08})`; c.beginPath(); c.arc(x, y, 3 + r() * 9, 0, 7); c.fill();
    }
    c.fillStyle = 'rgba(245,232,200,0.9)'; c.beginPath(); c.moveTo(W, H - 34); c.lineTo(W - 34, H); c.lineTo(W - 30, H - 30); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(90,55,20,0.45)'; c.lineWidth = 1; c.stroke();
    this.parch = cv;
    return cv;
  }

  drawMap() {
    const { state, world, ship, seed } = this.d, c = this.c, v = this.view, sc = v.sc;
    if (!c) return;
    const X = (wx) => W / 2 + (wx - v.cx) * sc, Z = (wz) => H / 2 + (wz - v.cz) * sc;
    c.drawImage(this.parchment(), 0, 0);

    const x0 = v.cx - W / 2 / sc, x1 = v.cx + W / 2 / sc, z0 = v.cz - H / 2 / sc, z1 = v.cz + H / 2 / sc;
    const [sx0, sz0] = sectorCoord(x0, z0), [sx1, sz1] = sectorCoord(x1, z1);
    const seen = new Set(state.sectorsSeen || []);
    c.lineWidth = 1.4; c.setLineDash([8, 6]);
    for (let sz = sz0; sz <= sz1; sz++) for (let sx = sx0; sx <= sx1; sx++) {
      const info = sectorInfo(sx, sz, seed), L = X(sx * SECTOR - SECTOR / 2), T = Z(sz * SECTOR - SECTOR / 2), S = SECTOR * sc;
      const sk = sketcher(c, hash2(sx, sz, 31));
      if (seen.has(info.id)) sk.wash(rectP(L + 4, T + 4, S - 8, S - 8), info.faction.color, 0.08, 6);
      c.setLineDash([6, 7]); sk.line(rectP(L, T, S, S), { col: '#4a2e18', w: 1.2, passes: 1, amp: 1.5, alpha: 0.5 }); c.setLineDash([]);
    }

    c.strokeStyle = 'rgba(60,110,130,0.35)'; c.lineWidth = 1.2;
    for (let gz = Math.floor(z0 / 70); gz <= z1 / 70; gz++) for (let gx = Math.floor(x0 / 70); gx <= x1 / 70; gx++) {
      const h = hash2(gx, gz, 77); if (h % 3 !== 0) continue;
      const px = X(gx * 70 + (h % 40)), pz = Z(gz * 70 + ((h >> 8) % 40));
      sketcher(c, h).line([[px - 7, pz], [px - 3.5, pz - 3], [px, pz], [px + 3.5, pz + 3], [px + 7, pz]], { closed: false, col: '#3c6e82', w: 1.1, passes: 1, amp: 0.6, alpha: 0.5 });
    }

    const labels = [];
    const warp = this.d.abyss ? this.d.abyss.mapWarp() : null; // full dread: the chart draws itself
    let n = 0;
    for (const id of Object.keys(state.discovered)) {
      const [cx, cz] = id.split(',').map(Number), d = world.desc(cx, cz);
      if (!d) continue;
      let px = X(d.x), pz = Z(d.z);
      if (warp) {
        if (warp.since < n++ * 0.18) continue;
        const h = hash2(cx, cz, 9) % 100;
        px += Math.sin(warp.t * 0.35 + h) * 26; pz += Math.cos(warp.t * 0.27 + h * 1.7) * 20;
      }
      if (px < -60 || px > W + 60 || pz < -60 || pz > H + 60) continue;
      this.drawIsland(c, d, px, pz, sc, state);
      labels.push([warp && (hash2(cx, cz, Math.floor(warp.t / 3)) % 5 === 0) ? 'not here' : d.name, px, pz + d.r * sc * 1.15 + 11]);
    }
    if (warp) {
      for (const ph of warp.phantoms) {
        if (warp.since < 1.2) continue;
        const px = X(ph.x) + Math.sin(warp.t * 0.5) * 10, pz = Z(ph.z);
        c.globalAlpha = Math.min(1, (warp.since - 1.2) / 2);
        this.drawIsland(c, ph, px, pz, sc, state);
        labels.push([ph.name, px, pz + ph.r * sc * 1.15 + 11]);
        c.globalAlpha = 1;
      }
      if (warp.since > 2.5) {
        c.save(); c.translate(X(ship.pos.x), Z(ship.pos.z)); c.rotate(-0.25 + Math.sin(warp.t * 0.3) * 0.05);
        c.globalAlpha = Math.min(0.75, (warp.since - 2.5) / 3);
        c.font = 'italic 700 34px Georgia, serif'; c.fillStyle = '#7a1a3a'; c.textAlign = 'center';
        c.fillText('TURN BACK', 0, -60);
        c.strokeStyle = '#7a1a3a'; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 44, 20, 0, 0, 7); c.stroke();
        c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fillStyle = '#7a1a3a'; c.fill();
        c.restore(); c.globalAlpha = 1;
      }
      if (!this.warpRaf) this.warpRaf = requestAnimationFrame(() => { this.warpRaf = 0; if (this.tab === 'map' && document.getElementById('chart').classList.contains('open')) this.drawMap(); });
    }
    c.font = 'italic 700 12px Georgia, serif'; c.textAlign = 'center';
    for (const [name, lx, lz] of labels) sketcher(c, hash2(lx | 0, name.length, 5)).text(name, lx, lz);

    c.font = 'italic 700 17px Georgia, serif';
    for (let sz = sz0; sz <= sz1; sz++) for (let sx = sx0; sx <= sx1; sx++) {
      const info = sectorInfo(sx, sz, seed), cx = X(sx * SECTOR), cz = Z(sz * SECTOR - SECTOR / 2) + 22;
      const sk = sketcher(c, hash2(sx, sz, 8));
      if (!seen.has(info.id)) { sk.text('~ uncharted ~', cx, cz, { font: 'italic 700 17px Georgia, serif', col: 'rgba(74,46,24,0.3)', halo: false }); continue; }
      sk.text(info.name, cx, cz, { font: 'italic 700 17px Georgia, serif', col: 'rgba(74,46,24,0.75)', halo: false });
      sk.text(info.faction.name, cx, cz + 15, { font: 'italic 12px Georgia, serif', col: info.faction.color, halo: false });
    }

    for (const r of Object.values(state.rumoured)) {
      if (r.found) continue;
      const px = X(r.x), pz = Z(r.z);
      const sk = sketcher(c, hash2(r.x, r.z, 3));
      sk.line(circ(px, pz, 15, 10), { col: '#b02818', w: 1.5, amp: 1.6 });
      sk.text('?', px, pz + 6, { font: 'bold 18px Georgia, serif', col: '#b02818', halo: false });
    }
    for (const q of state.quests) if (q.type === 'crates') {
      const px = X(q.center.x), pz = Z(q.center.z);
      const sk = sketcher(c, hash2(q.center.x | 0, q.center.z | 0, 4));
      c.setLineDash([5, 5]); sk.line(circ(px, pz, 70 * sc, 18), { col: '#a06a10', w: 1.4, passes: 1, amp: 2.5 }); c.setLineDash([]);
      sk.wash(rectP(px - 7, pz - 6, 14, 12), '#8a5a30', 0.8, 0.8); sk.line(rectP(px - 7, pz - 6, 14, 12), { w: 1.2, amp: 1.1 });
      sk.line([[px - 7, pz - 6], [px + 7, pz + 6]], { closed: false, w: 0.9, passes: 1 });
    }
    if (state.job) {
      const px = X(state.job.x), pz = Z(state.job.z), sk = sketcher(c, 77);
      sk.line([[px, pz], [px, pz - 24]], { closed: false, w: 1.6 });
      sk.wash([[px, pz - 24], [px + 15, pz - 18], [px, pz - 12]], '#d07010', 0.85, 0.8); sk.line([[px, pz - 24], [px + 15, pz - 18], [px, pz - 12]], { w: 1.2, amp: 1.1 });
    }

    c.save(); c.translate(X(ship.pos.x), Z(ship.pos.z)); c.rotate(ship.heading);
    { const sk = sketcher(c, 12), hull = [[0, -11], [6, 4], [3, 9], [-3, 9], [-6, 4]], sail = [[0, -8], [8, 2], [0, 2]];
      sk.wash(hull, '#8a4a26', 0.9, 0.5); sk.line(hull, { w: 1.4, amp: 0.6 }); sk.wash(sail, '#fff4d8', 0.95, 0.4); sk.line(sail, { w: 1.1, amp: 0.5 }); }
    c.restore();

    { // a hand-drawn compass rose
      const sk = sketcher(c, 21), cx = 70, cy = H - 70;
      sk.line(circ(cx, cy, 30, 14), { w: 1, passes: 2, amp: 1.2, alpha: 0.7 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2, L = i % 2 ? 22 : 42, side = a + 0.25;
        const tip = [cx + Math.cos(a) * L, cy + Math.sin(a) * L], s1 = [cx + Math.cos(side) * 6, cy + Math.sin(side) * 6];
        if (i % 2 === 0) sk.wash([[cx, cy], s1, tip], '#4a2e18', 0.75, 0.6);
        sk.line([[cx, cy], s1, tip], { w: 1.1, amp: 0.7 });
      }
      sk.text('N', cx, cy - 48, { font: 'bold 15px Georgia, serif', halo: false });
    }

    const g = c.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.9);
    g.addColorStop(0, 'rgba(70,40,15,0)'); g.addColorStop(1, 'rgba(70,40,15,0.5)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    { const sk = sketcher(c, 3); sk.line(rectP(6, 6, W - 12, H - 12), { w: 2.6, amp: 1.4 }); sk.line(rectP(11, 11, W - 22, H - 22), { w: 1, passes: 1, amp: 1.2, alpha: 0.8 }); }
  }

  drawIsland(c, d, px, pz, sc, state) {
    const N = 14, base = LAND[d.type] || '#ecd69c', sk = sketcher(c, d.seed * 7 + 1);
    const pts = [], inner = [];
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2, r = shoreR(d, th) * sc;
      pts.push([px + Math.cos(th) * r, pz + Math.sin(th) * r]);
      inner.push([px + Math.cos(th) * r * 0.55, pz + Math.sin(th) * r * 0.55]);
    }
    const ring = (k) => pts.map((p) => [px + (p[0] - px) * k, pz + (p[1] - pz) * k]);
    sk.line(ring(1.28), { col: '#3a6a78', w: 0.9, passes: 1, amp: 1.6, alpha: 0.55 });   // old-chart coastal ripples
    sk.line(ring(1.55), { col: '#3a6a78', w: 0.8, passes: 1, amp: 2, alpha: 0.3 });
    sk.wash(pts, base, 0.75);
    if (d.type === 'jungle' || d.type === 'rocky' || d.type === 'treasure') sk.wash(inner, d.type === 'rocky' ? '#9a9486' : '#6aa456', 0.6, 2.5);
    sk.hatch(pts, { a: 0.2, gap: 3.4 + sc });
    sk.line(pts, { w: 1.5 });

    if (sc < 0.2) return;
    const s = Math.max(0.7, sc * 2.4);
    const house = (hx, hz, col) => {
      const body = rectP(hx - 4 * s, hz - s, 8 * s, 6 * s), roof = [[hx - 5 * s, hz - s], [hx, hz - 6 * s], [hx + 5 * s, hz - s]];
      sk.wash(body, '#f0e0b0', 0.8, 0.8); sk.line(body, { w: 1.1, amp: 1 });
      sk.wash(roof, col, 0.75, 0.8); sk.line(roof, { w: 1.1, amp: 1 });
    };
    const tower = (lx, lz, k) => {
      const body = [[lx - 2.6 * k, lz + 2 * k], [lx - 1.8 * k, lz - 10 * k], [lx + 1.8 * k, lz - 10 * k], [lx + 2.6 * k, lz + 2 * k]];
      sk.wash(body, '#f4f0e6', 0.85, 0.6); sk.line(body, { w: 1.1, amp: 1 });
      sk.line([[lx - 2.2 * k, lz - 5 * k], [lx + 2.2 * k, lz - 5 * k]], { closed: false, col: '#b03a2a', w: 1.6, passes: 1 });
      sk.wash(circ(lx, lz - 12 * k, 2 * k, 6), '#e8b838', 0.9, 0.5);
      for (let i = 0; i < 4; i++) { const a = -1.2 + i * 0.8; sk.line([[lx + Math.cos(a) * 3 * k, lz - 12 * k + Math.sin(a) * 3 * k], [lx + Math.cos(a) * 6 * k, lz - 12 * k + Math.sin(a) * 6 * k]], { closed: false, col: '#c08a20', w: 0.8, passes: 1 }); }
    };
    const palm = (hx, hz) => {
      sk.line([[hx, hz + 5 * s], [hx + 0.5 * s, hz], [hx + 1.2 * s, hz - 4 * s]], { closed: false, w: 1.2, passes: 2 });
      sk.wash(circ(hx + 1.2 * s, hz - 4.5 * s, 3.5 * s, 7), '#4a9a40', 0.55, 1.2);
      for (const a of [-2.8, -2.1, -1.4, -0.7, 0]) sk.line([[hx + 1.2 * s, hz - 4 * s], [hx + 1.2 * s + Math.cos(a) * 6 * s, hz - 4 * s + Math.sin(a) * 4 * s + 2 * s]], { closed: false, col: '#2e5a24', w: 1, passes: 1, amp: 0.8 });
    };
    if (d.type === 'harbour') {
      for (const [ox, oz, col] of [[-9, 0, '#c0483c'], [3, -4, '#3c78c8'], [10, 5, '#d09a30']]) house(px + ox * s, pz + oz * s, col);
      if (hasLighthouse(d)) tower(px - 14 * s, pz - 6 * s, s);
    } else if (d.type === 'jungle' || d.type === 'sandbar') {
      const n = d.type === 'jungle' ? 3 : 1;
      for (let i = 0; i < n; i++) palm(px + (i - (n - 1) / 2) * 9 * s, pz + ((i * 5) % 7 - 3) * s);
    } else if (d.type === 'rocky') {
      for (const [ox, oz, h] of [[-6, 3, 9], [2, 0, 13], [9, 4, 8]]) {
        const hx = px + ox * s, hz = pz + oz * s, peak = [[hx - 5 * s, hz + 4 * s], [hx, hz - h * s], [hx + 5 * s, hz + 4 * s]];
        sk.wash(peak, '#8a8478', 0.7, 0.8); sk.hatch([[hx, hz - h * s], [hx + 5 * s, hz + 4 * s], [hx, hz + 4 * s]], { a: 0.45, gap: 2 }); sk.line(peak, { w: 1.2, amp: 1.1 });
      }
      if (hasLighthouse(d)) tower(px + 12 * s, pz - 4 * s, s * 0.85);
    } else if (d.type === 'treasure') {
      if (state.dug.has(d.id)) {
        const box = rectP(px - 5 * s, pz - 3 * s, 10 * s, 6 * s);
        sk.wash(box, '#8a5a30', 0.85, 0.6); sk.line(box, { w: 1.1, amp: 1 }); sk.wash(circ(px, pz, 1.4 * s, 5), '#ffd23a', 1, 0.3);
      } else {
        for (const ox of [-6, 3]) { const leg = rectP(px + ox * s, pz - 8 * s, 3 * s, 12 * s); sk.wash(leg, '#a8a294', 0.8, 0.6); sk.line(leg, { w: 1.1, amp: 1 }); }
        const top = rectP(px - 7 * s, pz - 10.5 * s, 14 * s, 3 * s); sk.wash(top, '#a8a294', 0.8, 0.6); sk.line(top, { w: 1.1, amp: 1 });
      }
    }
  }
}
