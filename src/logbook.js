import { shoreR, hasLighthouse } from './world.js';
import { SECTOR, sectorInfo, sectorCoord } from './sectors.js';
import { UPGRADES, MAX_LEVEL } from './upgrades.js';
import { friendLevel, bearingName, questProgress, questNeed, questTitle, questIcon, FRUITS, fruitName } from './jobs.js';
import { mulberry32, hash2 } from './util.js';
import { MAIN_GOALS, SIDE_GOALS } from './objectives.js';
import { FISH } from './fishing.js';
import { GROUPS, byId } from './customize.js';

// The captain's log: an open book. Tabs are ribbons on the edge, content flows over two pages
// (turn with the arrows below / Up and Down), and the Map is a hand-inked low-poly chart.
const TABS = [['map', 'Map', '🧭'], ['goals', 'Goals', '⚓'], ['quests', 'Quests', '📜'], ['riddles', 'Riddles', '🗝'], ['rumours', 'Rumours', '🗣'], ['journal', 'Journal', '📖'], ['ship', 'Ship', '⛵'], ['standing', 'Standing', '⭐']];
const W = 880, H = 470;
const INK = '#3a2210';

const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const shade = (c, k) => { const [r, g, b] = hex(c); return `rgb(${Math.max(0, Math.min(255, r * k)) | 0},${Math.max(0, Math.min(255, g * k)) | 0},${Math.max(0, Math.min(255, b * k)) | 0})`; };
const LAND = { sand: '#ecd69c', jungle: '#92c274', rocky: '#b7ad9c', treasure: '#ecd69c', harbour: '#dcb877' };
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
    const c = cv.getContext('2d'), r = mulberry32(55);
    c.fillStyle = '#e8d6a6'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(${r() > 0.5 ? '140,100,50' : '255,245,210'},${0.03 + r() * 0.05})`; c.beginPath(); c.ellipse(r() * W, r() * H, 20 + r() * 90, 14 + r() * 60, r() * 3, 0, 7); c.fill(); }
    for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(110,75,35,${r() * 0.12})`; c.fillRect(r() * W, r() * H, 1 + r() * 2, 1); }
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
      if (seen.has(info.id)) { c.fillStyle = info.faction.color + '22'; c.fillRect(L, T, S, S); }
      c.strokeStyle = 'rgba(74,46,24,0.45)'; c.strokeRect(L, T, S, S);
    }
    c.setLineDash([]);

    c.strokeStyle = 'rgba(60,110,130,0.35)'; c.lineWidth = 1.2;
    for (let gz = Math.floor(z0 / 70); gz <= z1 / 70; gz++) for (let gx = Math.floor(x0 / 70); gx <= x1 / 70; gx++) {
      const h = hash2(gx, gz, 77); if (h % 3 !== 0) continue;
      const px = X(gx * 70 + (h % 40)), pz = Z(gz * 70 + ((h >> 8) % 40));
      c.beginPath(); c.moveTo(px - 7, pz); c.quadraticCurveTo(px - 3.5, pz - 4, px, pz); c.quadraticCurveTo(px + 3.5, pz + 4, px + 7, pz); c.stroke();
    }

    const labels = [];
    for (const id of Object.keys(state.discovered)) {
      const [cx, cz] = id.split(',').map(Number), d = world.desc(cx, cz);
      if (!d) continue;
      const px = X(d.x), pz = Z(d.z);
      if (px < -60 || px > W + 60 || pz < -60 || pz > H + 60) continue;
      this.drawIsland(c, d, px, pz, sc, state);
      labels.push([d.name, px, pz + d.r * sc * 1.15 + 11]);
    }
    c.font = 'italic 700 12px Georgia, serif'; c.textAlign = 'center';
    for (const [name, lx, lz] of labels) { c.strokeStyle = 'rgba(232,214,166,0.92)'; c.lineWidth = 3; c.strokeText(name, lx, lz); c.fillStyle = INK; c.fillText(name, lx, lz); }

    c.font = 'italic 700 17px Georgia, serif';
    for (let sz = sz0; sz <= sz1; sz++) for (let sx = sx0; sx <= sx1; sx++) {
      const info = sectorInfo(sx, sz, seed), cx = X(sx * SECTOR), cz = Z(sz * SECTOR - SECTOR / 2) + 22;
      if (!seen.has(info.id)) { c.fillStyle = 'rgba(74,46,24,0.3)'; c.fillText('~ uncharted ~', cx, cz); continue; }
      c.fillStyle = 'rgba(74,46,24,0.75)'; c.fillText(info.name, cx, cz);
      c.font = 'italic 12px Georgia, serif'; c.fillStyle = info.faction.color; c.fillText(info.faction.name, cx, cz + 15); c.font = 'italic 700 17px Georgia, serif';
    }

    for (const r of Object.values(state.rumoured)) {
      if (r.found) continue;
      const px = X(r.x), pz = Z(r.z);
      c.setLineDash([3, 3]); c.strokeStyle = '#b02818'; c.lineWidth = 1.5; c.beginPath(); c.arc(px, pz, 15, 0, 7); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#b02818'; c.font = 'bold 18px Georgia, serif'; c.textAlign = 'center'; c.fillText('?', px, pz + 6);
    }
    for (const q of state.quests) if (q.type === 'crates') {
      const px = X(q.center.x), pz = Z(q.center.z);
      c.setLineDash([5, 4]); c.strokeStyle = '#a06a10'; c.lineWidth = 1.6; c.beginPath(); c.arc(px, pz, 70 * sc, 0, 7); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#8a5a30'; c.fillRect(px - 7, pz - 6, 14, 12); c.strokeStyle = INK; c.strokeRect(px - 7, pz - 6, 14, 12); c.fillStyle = '#ffd23a'; c.fillRect(px - 2, pz - 2, 4, 4);
    }
    if (state.job) {
      const px = X(state.job.x), pz = Z(state.job.z);
      c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(px, pz); c.lineTo(px, pz - 24); c.stroke();
      c.fillStyle = '#d07010'; c.beginPath(); c.moveTo(px, pz - 24); c.lineTo(px + 15, pz - 18); c.lineTo(px, pz - 12); c.closePath(); c.fill(); c.stroke();
    }

    c.save(); c.translate(X(ship.pos.x), Z(ship.pos.z)); c.rotate(ship.heading);
    c.fillStyle = '#8a4a26'; c.strokeStyle = INK; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, -11); c.lineTo(6, 4); c.lineTo(3, 9); c.lineTo(-3, 9); c.lineTo(-6, 4); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff4d8'; c.beginPath(); c.moveTo(0, -8); c.lineTo(8, 2); c.lineTo(0, 2); c.closePath(); c.fill(); c.stroke();
    c.restore();

    c.save(); c.translate(70, H - 70);
    c.strokeStyle = INK; c.fillStyle = 'rgba(74,46,24,0.8)'; c.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(0, 0); c.lineTo(5, -(i % 2 ? 18 : 34)); c.lineTo(0, -(i % 2 ? 24 : 44)); c.closePath(); if (i % 2 === 0) c.fill(); else c.stroke(); }
    c.restore();
    c.fillStyle = INK; c.font = 'bold 15px Georgia, serif'; c.textAlign = 'center'; c.fillText('N', 70, H - 120);

    const g = c.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.9);
    g.addColorStop(0, 'rgba(70,40,15,0)'); g.addColorStop(1, 'rgba(70,40,15,0.5)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(5, 5, W - 10, H - 10);
    c.lineWidth = 1; c.strokeRect(10, 10, W - 20, H - 20);
  }

  drawIsland(c, d, px, pz, sc, state) {
    const N = 18, base = LAND[d.type] || '#ecd69c';
    const pts = [], pts2 = [], wash = [];
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2, r = shoreR(d, th) * sc;
      pts.push([px + Math.cos(th) * r, pz + Math.sin(th) * r]);
      pts2.push([px + Math.cos(th) * r * 0.55, pz + Math.sin(th) * r * 0.55]);
      wash.push([px + Math.cos(th) * r * 1.35, pz + Math.sin(th) * r * 1.35]);
    }
    const poly = (p) => { c.beginPath(); p.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); };
    poly(wash); c.fillStyle = 'rgba(110,190,200,0.35)'; c.fill();
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N, k = 0.86 + ((hash2(i, d.seed, 3) % 100) / 100) * 0.24 + (i % 2 ? 0.05 : -0.05);
      c.beginPath(); c.moveTo(px, pz); c.lineTo(pts[i][0], pts[i][1]); c.lineTo(pts[j][0], pts[j][1]); c.closePath();
      c.fillStyle = shade(base, k); c.fill();
    }
    if (d.type === 'jungle' || d.type === 'rocky' || d.type === 'treasure') {
      const inner = d.type === 'rocky' ? '#9a9486' : '#6aa456';
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N, k = 0.85 + ((hash2(i, d.seed, 9) % 100) / 100) * 0.3;
        c.beginPath(); c.moveTo(px, pz); c.lineTo(pts2[i][0], pts2[i][1]); c.lineTo(pts2[j][0], pts2[j][1]); c.closePath();
        c.fillStyle = shade(inner, k); c.fill();
      }
    }
    poly(pts); c.strokeStyle = INK; c.lineWidth = 1.6; c.lineJoin = 'round'; c.stroke();

    if (sc < 0.2) return;
    const s = Math.max(0.7, sc * 2.4);
    c.lineWidth = 1.2; c.strokeStyle = INK;
    if (d.type === 'harbour') {
      for (const [ox, oz, col] of [[-9, 0, '#c0483c'], [3, -4, '#3c78c8'], [10, 5, '#d09a30']]) {
        const hx = px + ox * s, hz = pz + oz * s;
        c.fillStyle = '#f0e0b0'; c.fillRect(hx - 4 * s, hz - 1 * s, 8 * s, 6 * s); c.strokeRect(hx - 4 * s, hz - 1 * s, 8 * s, 6 * s);
        c.fillStyle = col; c.beginPath(); c.moveTo(hx - 5 * s, hz - 1 * s); c.lineTo(hx, hz - 6 * s); c.lineTo(hx + 5 * s, hz - 1 * s); c.closePath(); c.fill(); c.stroke();
      }
      if (hasLighthouse(d)) { const lx = px - 14 * s, lz = pz - 8 * s; c.fillStyle = '#f4f0e6'; c.fillRect(lx - 2.5 * s, lz - 10 * s, 5 * s, 12 * s); c.strokeRect(lx - 2.5 * s, lz - 10 * s, 5 * s, 12 * s); c.fillStyle = '#e8b838'; c.fillRect(lx - 2 * s, lz - 13 * s, 4 * s, 3 * s); }
    } else if (d.type === 'jungle' || d.type === 'sandbar') {
      const n = d.type === 'jungle' ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const hx = px + (i - 1) * 9 * s, hz = pz + ((i * 5) % 7 - 3) * s;
        c.beginPath(); c.moveTo(hx, hz + 5 * s); c.lineTo(hx + 1 * s, hz - 3 * s); c.stroke();
        c.fillStyle = '#4a9a40'; for (const a of [-2.6, -1.9, -1.2, -0.5]) { c.beginPath(); c.moveTo(hx + s, hz - 3 * s); c.lineTo(hx + s + Math.cos(a) * 7 * s, hz - 3 * s + Math.sin(a) * 5 * s + 2 * s); c.lineTo(hx + s + Math.cos(a + 0.4) * 4 * s, hz - 3 * s + Math.sin(a + 0.4) * 3 * s); c.closePath(); c.fill(); }
      }
    } else if (d.type === 'rocky') {
      for (const [ox, oz, h] of [[-6, 3, 9], [2, 0, 13], [9, 4, 8]]) {
        const hx = px + ox * s, hz = pz + oz * s;
        c.fillStyle = '#8a8478'; c.beginPath(); c.moveTo(hx - 5 * s, hz + 4 * s); c.lineTo(hx, hz - h * s); c.lineTo(hx + 5 * s, hz + 4 * s); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#f4f0e6'; c.beginPath(); c.moveTo(hx - 1.6 * s, hz - (h - 4) * s); c.lineTo(hx, hz - h * s); c.lineTo(hx + 1.6 * s, hz - (h - 4) * s); c.closePath(); c.fill();
      }
      if (hasLighthouse(d)) { const lx = px + 12 * s, lz = pz - 6 * s; c.fillStyle = '#f4f0e6'; c.fillRect(lx - 2 * s, lz - 8 * s, 4 * s, 10 * s); c.strokeRect(lx - 2 * s, lz - 8 * s, 4 * s, 10 * s); c.fillStyle = '#e8b838'; c.fillRect(lx - 1.6 * s, lz - 11 * s, 3.2 * s, 3 * s); }
    } else if (d.type === 'treasure') {
      if (state.dug.has(d.id)) { c.fillStyle = '#8a5a30'; c.fillRect(px - 5 * s, pz - 3 * s, 10 * s, 6 * s); c.strokeRect(px - 5 * s, pz - 3 * s, 10 * s, 6 * s); c.fillStyle = '#ffd23a'; c.fillRect(px - 1 * s, pz - 1 * s, 2 * s, 2 * s); }
      else { c.fillStyle = '#9a948a'; c.fillRect(px - 6 * s, pz - 8 * s, 3 * s, 12 * s); c.fillRect(px + 3 * s, pz - 8 * s, 3 * s, 12 * s); c.fillRect(px - 7 * s, pz - 10 * s, 14 * s, 3 * s); c.strokeRect(px - 7 * s, pz - 10 * s, 14 * s, 3 * s); }
    }
  }
}
