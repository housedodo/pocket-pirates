import { shoreR, hasLighthouse, CELL } from './world.js';
import { SECTOR, sectorInfo, FACTIONS, sectorCoord } from './sectors.js';
import { UPGRADES, MAX_LEVEL } from './upgrades.js';
import { friendLevel, bearingName } from './jobs.js';
import { mulberry32, hash2 } from './util.js';
import { MAIN_GOALS, SIDE_GOALS } from './objectives.js';
import { FISH } from './fishing.js';
import { GROUPS, byId } from './customize.js';

// The captain's log: tabbed book. The Map tab draws a hand-inked, low-poly parchment chart.
const TABS = [['map', 'Map'], ['jobs', 'Jobs'], ['rumours', 'Rumours'], ['journal', 'Journal'], ['ship', 'Ship'], ['standing', 'Standing'], ['goals', 'Goals']];
const W = 760, H = 520;
const INK = '#4a2e18';

const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const shade = (c, k) => { const [r, g, b] = hex(c); return `rgb(${Math.max(0, Math.min(255, r * k)) | 0},${Math.max(0, Math.min(255, g * k)) | 0},${Math.max(0, Math.min(255, b * k)) | 0})`; };

const LAND = { sand: '#ecd69c', jungle: '#92c274', rocky: '#b7ad9c', treasure: '#ecd69c', harbour: '#dcb877' };

export class Logbook {
  constructor(deps) {
    this.d = deps; // { state, world, ship, seed, toast }
    this.tab = 'map';
    this.view = { cx: 0, cz: 0, sc: 0.8, follow: true };
    this.root = document.getElementById('chart');
    this.tabsEl = document.getElementById('logTabs');
    this.body = document.getElementById('logBody');
    this.parch = null;
    this.tabsEl.innerHTML = TABS.map(([id, label], i) => `<button data-tab="${id}">${i + 1} ${label}</button>`).join('');
    this.tabsEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) this.open(b.dataset.tab); });
    document.getElementById('logClose').addEventListener('click', () => deps.close());
  }

  open(tab = this.tab) {
    this.tab = tab;
    this.tabsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    if (tab === 'map' && this.view.follow) { this.view.cx = this.d.ship.pos.x; this.view.cz = this.d.ship.pos.z; }
    this.render();
  }
  step(dir) { const i = TABS.findIndex((t) => t[0] === this.tab); this.open(TABS[(i + dir + TABS.length) % TABS.length][0]); }
  tabByIndex(i) { if (TABS[i]) this.open(TABS[i][0]); }

  render() {
    const fn = { map: this.renderMap, jobs: this.renderJobs, rumours: this.renderRumours, journal: this.renderJournal, ship: this.renderShip, standing: this.renderStanding, goals: this.renderGoals }[this.tab];
    fn.call(this);
  }

  // ------------------------------------------------------------ simple tabs
  renderJobs() {
    const { state, ship } = this.d;
    const j = state.job;
    let html = '<h3>Active job</h3>';
    if (j) {
      const dx = j.x - ship.pos.x, dz = j.z - ship.pos.z;
      html += `<div class="card"><b>Deliver ${j.item}</b><br>From ${j.fromName} to <b>${j.toName}</b><br>${Math.round(Math.hypot(dx, dz))} fathoms ${bearingName(dx, dz)} of you &middot; pays <b>${j.reward}g</b><br><button id="abandon" class="mini">Abandon job</button></div>`;
    } else html += '<div class="card dim">No job right now. Look at the job board in any harbour (press E near one) or trade with passing ships.</div>';
    html += '<h3>Delivered</h3>';
    const hist = state.jobHistory || [];
    html += hist.length ? hist.slice(-8).reverse().map((h) => `<div class="row">&bull; ${h.item} to ${h.to} <span>+${h.reward}g</span></div>`).join('') : '<div class="card dim">Nothing delivered yet.</div>';
    this.body.innerHTML = html;
    const b = document.getElementById('abandon');
    if (b) b.addEventListener('click', () => { state.job = null; this.d.toast('Job abandoned.'); this.render(); });
  }

  renderGoals() {
    const { state } = this.d, g = state.goals, ctx = { state };
    let html = '<h3>Main goals</h3>';
    MAIN_GOALS.forEach((m, i) => {
      const done = i < g.i, cur = i === g.i;
      html += `<div class="card ${done ? 'dim' : ''}"><b>${done ? '&#10003; ' : cur ? '&#9654; ' : ''}${m.title}</b> <span style="float:right">${m.reward}g</span><br>${done ? '<small>Done.</small>' : cur || i === g.i + 1 ? m.text : '<i>???</i>'}${cur ? '<br><button id="skipGoal" class="mini">Skip this goal</button>' : ''}</div>`;
    });
    html += '<h3>Optional goals</h3>';
    for (const sgl of SIDE_GOALS) {
      const done = !!g.side[sgl.id];
      html += `<div class="card ${done ? 'dim' : ''}"><b>${done ? '&#10003; ' : '&#9675; '}${sgl.title}</b> <span style="float:right">${sgl.reward}g</span><br>${sgl.text}</div>`;
    }
    const st = state.stats;
    html += `<h3>Stats</h3><div class="row">Distance sailed <span>${Math.round(st.dist)}</span></div><div class="row">Fish caught <span>${st.fish}</span></div><div class="row">Treasures dug <span>${st.treasures}</span></div><div class="row">Wrecks salvaged <span>${st.wrecks}</span></div><div class="row">Raiders sunk <span>${st.sunk}</span></div><div class="row">Deliveries <span>${st.deliveries}</span></div>`;
    this.body.innerHTML = html;
    const b = document.getElementById('skipGoal');
    if (b) b.addEventListener('click', () => { this.d.skipGoal(); this.render(); });
  }

  renderRumours() {
    const { state, ship } = this.d;
    const list = Object.entries(state.rumoured);
    let html = '<h3>Rumours</h3>';
    if (!list.length) html += '<div class="card dim">No rumours yet. Buy one from a harbour drunk (40g) or swap news with a passing ship.</div>';
    for (const [id, r] of list) {
      const dx = r.x - ship.pos.x, dz = r.z - ship.pos.z;
      html += `<div class="card"><b>${r.name}</b> ${r.found ? '<span class="ok">charted &#10003;</span>' : ''}<br>
        ${r.found ? 'You found it.' : `Said to lie ${Math.round(Math.hypot(dx, dz))} fathoms ${bearingName(dx, dz)} of you. It is marked with a ? on your map.`}<br><small>Heard from: ${r.source || 'a harbour drunk'}</small></div>`;
    }
    this.body.innerHTML = html;
  }

  renderJournal() {
    const { state } = this.d;
    const isl = Object.values(state.discovered);
    const types = { harbour: 'Harbours', treasure: 'Treasure isles', jungle: 'Jungle isles', rocky: 'Rocky isles', sandbar: 'Sandbars' };
    let html = `<h3>Charted waters (${isl.length})</h3>`;
    for (const [t, label] of Object.entries(types)) {
      const l = isl.filter((i) => i.type === t);
      if (l.length) html += `<div class="row"><b>${label}</b> <span>${l.map((i) => i.name).join(', ')}</span></div>`;
    }
    if (!isl.length) html += '<div class="card dim">Nothing charted yet. Go and look!</div>';
    html += `<h3>Treasures &amp; salvage (${state.loot.length})</h3>`;
    html += state.loot.length ? state.loot.slice(-12).reverse().map((l) => `<div class="row ${l.dark ? 'dk' : ''}">&bull; ${l.name} <span>${l.value}g</span></div>`).join('') : '<div class="card dim">None yet. Look for a red X, or a wreck.</div>';
    const rid = Object.entries(state.riddles);
    html += `<h3>Treasure riddles (${rid.length})</h3>`;
    html += rid.length ? rid.map(([id, text]) => { const [cx, cz] = id.split(',').map(Number), dd = this.d.world.desc(cx, cz); return `<div class="card ${state.dug.has(id) ? 'dim' : ''}"><b>${dd ? dd.name : id}</b> ${state.dug.has(id) ? '<span class="ok">dug up &#10003;</span>' : ''}<br><i>"${text}"</i></div>`; }).join('') : '<div class="card dim">None yet. Treasure isles have an arch with an inscription: sail close and press E to study it.</div>';
    const caught = FISH.filter((f) => state.fishLog[f.id]);
    html += `<h3>Fish log (${caught.length}/${FISH.length})</h3>`;
    html += caught.length ? caught.map((f) => { const l = state.fishLog[f.id]; return `<div class="row ${f.dark ? 'dk' : ''}">${f.name} <span>x${l.count} &middot; best ${l.best}kg</span></div>`; }).join('') : '<div class="card dim">Nothing caught yet. Slow down and press C.</div>';
    html += `<h3>Messages in bottles (${state.notes.length})</h3>`;
    html += state.notes.length ? state.notes.map((n) => `<div class="card ${n.dark ? 'dk' : ''}"><i>"${n.text}"</i></div>`).join('') : '<div class="card dim">None yet.</div>';
    this.body.innerHTML = html;
  }

  renderShip() {
    const { state } = this.d;
    const b = state.buffs || {};
    let html = `<h3>Your ship</h3><div class="row"><b>Gold</b> <span>${state.gold}g</span></div>`;
    for (const u of UPGRADES) {
      const lv = state.upgrades[u.id];
      html += `<div class="card"><b>${u.name}</b> <span class="pips">${'■'.repeat(lv)}${'□'.repeat(MAX_LEVEL - lv)}</span><br><small>${lv ? u.text[lv - 1] : 'Stock fittings.'}</small></div>`;
    }
    html += '<h3>Looks</h3>' + GROUPS.map(([g, label, list]) => `<div class="row">${label} <span>${byId(list, state.custom[g]).name}</span></div>`).join('');
    html += `<h3>Combat</h3><div class="row">Hull <span>${Math.round(state.hp)}/${this.d.ship.mods.maxHp}</span></div><div class="row">Cannonballs <span>${state.ammo}</span></div>`;
    const act = [];
    if (b.speed > 0) act.push(`Fresh supplies: +15% speed (${Math.ceil(b.speed)}s)`);
    if (b.dig > 0) act.push(`Rum rations: faster digging (${Math.ceil(b.dig)}s)`);
    html += '<h3>Active effects</h3>' + (act.length ? act.map((a) => `<div class="row">&bull; ${a}</div>`).join('') : '<div class="card dim">None.</div>');
    this.body.innerHTML = html;
  }

  renderStanding() {
    const { state, world, seed } = this.d;
    const stars = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
    const secs = {};
    const harbours = Object.entries(state.rep).map(([id, r]) => {
      const [cx, cz] = id.split(',').map(Number), d = world.desc(cx, cz);
      if (!d) return null;
      const sec = sectorInfo(...sectorCoord(d.x, d.z), seed), lvl = friendLevel(r);
      secs[sec.id] = secs[sec.id] || { sec, sum: 0 };
      secs[sec.id].sum += lvl;
      return { name: d.name, lvl, sec };
    }).filter(Boolean);
    let html = '<h3>Sectors you know</h3>';
    const seen = (state.sectorsSeen || []).map((id) => { const [sx, sz] = id.split(',').map(Number); return sectorInfo(sx, sz, seed); });
    html += seen.length ? seen.map((s) => `<div class="card"><b>${s.name}</b> <span class="fac" style="background:${s.faction.color}"></span> ${s.faction.name}<br><small>Standing: ${stars(Math.min(3, (secs[s.id] || { sum: 0 }).sum))} &mdash; ${(secs[s.id] || { sum: 0 }).sum >= 3 ? 'ships here are glad to see you' : (secs[s.id] || { sum: 0 }).sum >= 1 ? 'you are known here' : 'a stranger in these waters'}</small></div>`).join('') : '<div class="card dim">You have not seen any sector yet.</div>';
    html += '<h3>Harbour reputation</h3>';
    html += harbours.length ? harbours.map((h) => `<div class="row">${h.name} <span>${stars(h.lvl)}</span></div>`).join('') : '<div class="card dim">Visit harbours and deliver jobs to be remembered. Ships in nearby waters are likelier to trade with a captain they have heard of.</div>';
    this.body.innerHTML = html;
  }

  // ------------------------------------------------------------ map
  renderMap() {
    this.body.innerHTML = `<div class="mapwrap"><canvas id="mapCv" width="${W}" height="${H}"></canvas>
      <div class="mapctl"><button id="mz+">+</button><button id="mz-">&minus;</button><button id="mc" title="Centre on ship">&#9678;</button></div></div>
      <div class="legend">Drag to pan &middot; wheel or +/&minus; to zoom &middot; <b>&#9750;</b> harbour &nbsp; <b style="color:#b02818">&#10005;</b> treasure &nbsp; <b style="color:#b02818">?</b> rumour &nbsp; <b style="color:#d07010">&#9873;</b> job</div>`;
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
    c.fillStyle = '#e4d1a0'; c.fillRect(0, 0, W, H);
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

    // sectors
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

    // waves (little ink squiggles)
    const rr = mulberry32(9);
    c.strokeStyle = 'rgba(60,110,130,0.35)'; c.lineWidth = 1.2;
    for (let gz = Math.floor(z0 / 70); gz <= z1 / 70; gz++) for (let gx = Math.floor(x0 / 70); gx <= x1 / 70; gx++) {
      const h = hash2(gx, gz, 77); if (h % 3 !== 0) continue;
      const px = X(gx * 70 + (h % 40)), pz = Z(gz * 70 + ((h >> 8) % 40));
      c.beginPath(); c.moveTo(px - 7, pz); c.quadraticCurveTo(px - 3.5, pz - 4, px, pz); c.quadraticCurveTo(px + 3.5, pz + 4, px + 7, pz); c.stroke();
    }

    // islands
    const labels = [];
    for (const [id, vv] of Object.entries(state.discovered)) {
      const [cx, cz] = id.split(',').map(Number), d = world.desc(cx, cz);
      if (!d) continue;
      const px = X(d.x), pz = Z(d.z);
      if (px < -60 || px > W + 60 || pz < -60 || pz > H + 60) continue;
      this.drawIsland(c, d, px, pz, sc, state);
      labels.push([d.name, px, pz + d.r * sc * 1.15 + 11]);
    }
    c.font = 'italic 600 12px Georgia, serif'; c.textAlign = 'center';
    for (const [name, lx, lz] of labels) { c.strokeStyle = 'rgba(228,209,160,0.9)'; c.lineWidth = 3; c.strokeText(name, lx, lz); c.fillStyle = INK; c.fillText(name, lx, lz); }

    // sector names
    c.font = 'italic 700 17px Georgia, serif';
    for (let sz = sz0; sz <= sz1; sz++) for (let sx = sx0; sx <= sx1; sx++) {
      const info = sectorInfo(sx, sz, seed), cx = X(sx * SECTOR), cz = Z(sz * SECTOR - SECTOR / 2) + 22;
      if (!seen.has(info.id)) { c.fillStyle = 'rgba(74,46,24,0.3)'; c.fillText('~ uncharted ~', cx, cz); continue; }
      c.fillStyle = 'rgba(74,46,24,0.75)'; c.fillText(info.name, cx, cz);
      c.font = 'italic 12px Georgia, serif'; c.fillStyle = info.faction.color; c.fillText(info.faction.name, cx, cz + 15); c.font = 'italic 700 17px Georgia, serif';
    }

    // rumours + job
    for (const r of Object.values(state.rumoured)) {
      if (r.found) continue;
      const px = X(r.x), pz = Z(r.z);
      c.setLineDash([3, 3]); c.strokeStyle = '#b02818'; c.lineWidth = 1.5; c.beginPath(); c.arc(px, pz, 15, 0, 7); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#b02818'; c.font = 'bold 18px Georgia, serif'; c.textAlign = 'center'; c.fillText('?', px, pz + 6);
    }
    if (state.job) {
      const px = X(state.job.x), pz = Z(state.job.z);
      c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(px, pz); c.lineTo(px, pz - 24); c.stroke();
      c.fillStyle = '#d07010'; c.beginPath(); c.moveTo(px, pz - 24); c.lineTo(px + 15, pz - 18); c.lineTo(px, pz - 12); c.closePath(); c.fill(); c.stroke();
    }

    // the ship
    c.save(); c.translate(X(ship.pos.x), Z(ship.pos.z)); c.rotate(ship.heading);
    c.fillStyle = '#8a4a26'; c.strokeStyle = INK; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, -11); c.lineTo(6, 4); c.lineTo(3, 9); c.lineTo(-3, 9); c.lineTo(-6, 4); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff4d8'; c.beginPath(); c.moveTo(0, -8); c.lineTo(8, 2); c.lineTo(0, 2); c.closePath(); c.fill(); c.stroke();
    c.restore();

    // compass rose
    c.save(); c.translate(70, H - 70);
    c.strokeStyle = INK; c.fillStyle = 'rgba(74,46,24,0.8)'; c.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(0, 0); c.lineTo(5, -(i % 2 ? 18 : 34)); c.lineTo(0, -(i % 2 ? 24 : 44)); c.closePath(); if (i % 2 === 0) c.fill(); else c.stroke(); }
    c.restore();
    c.fillStyle = INK; c.font = 'bold 15px Georgia, serif'; c.textAlign = 'center'; c.fillText('N', 70, H - 120);

    // burnt edges
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.85);
    g.addColorStop(0, 'rgba(70,40,15,0)'); g.addColorStop(1, 'rgba(70,40,15,0.55)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(6, 6, W - 12, H - 12);
    c.lineWidth = 1; c.strokeRect(11, 11, W - 22, H - 22);
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
    // low-poly facets
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
      if (state.dug.has(d.id)) { c.fillStyle = '#8a5a30'; c.fillRect(px - 5 * s, pz - 3 * s, 10 * s, 6 * s); c.strokeRect(px - 5 * s, pz - 3 * s, 10 * s, 6 * s); c.fillStyle = '#ffd23a'; c.fillRect(px - 1 * s, pz - 1 * s, 2 * s, 2 * s); c.strokeStyle = '#2a7a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(px + 6 * s, pz - 6 * s); c.lineTo(px + 9 * s, pz - 2 * s); c.lineTo(px + 14 * s, pz - 10 * s); c.stroke(); }
      else { c.fillStyle = '#9a948a'; c.fillRect(px - 6 * s, pz - 8 * s, 3 * s, 12 * s); c.fillRect(px + 3 * s, pz - 8 * s, 3 * s, 12 * s); c.fillRect(px - 7 * s, pz - 10 * s, 14 * s, 3 * s); c.strokeRect(px - 7 * s, pz - 10 * s, 14 * s, 3 * s); }
    }
  }
}
