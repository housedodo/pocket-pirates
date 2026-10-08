import { shoreR, hasLighthouse } from './world.js';
import { SECTOR, sectorInfo, sectorCoord } from './sectors.js';
import { UPGRADES, MAX_LEVEL } from './upgrades.js';
import { friendLevel, bearingName, questProgress, questNeed, questTitle, questIcon, FRUITS, fruitName } from './jobs.js';
import { mulberry32, hash2 } from './util.js';
import { MAIN_GOALS, SIDE_GOALS, CHAPTERS, goalText } from './objectives.js';
import { FISH } from './fishing.js';
import { GROUPS, byId } from './customize.js';
import { TRAITS } from './tabletop.js';
import { pxi } from './pixelui.js';

// The captain's log: an old low-poly book. Tabs are cloth bookmarks sticking out of the right side, content flows over two pages
// (turn with the arrows below / Up and Down), and the Map is a hand-inked low-poly chart.
const TABS = [['map', 'Map', ''], ['goals', 'Goals', ''], ['quests', 'Quests', ''], ['riddles', 'Riddles', ''], ['rumours', 'Rumours', ''], ['journal', 'Journal', ''], ['ship', 'Ship', ''], ['standing', 'Standing', '']];
const W = 880, H = 470;
const INK = '#3a2210';

const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const shade = (c, k) => { const [r, g, b] = hex(c); return `rgb(${Math.max(0, Math.min(255, r * k)) | 0},${Math.max(0, Math.min(255, g * k)) | 0},${Math.max(0, Math.min(255, b * k)) | 0})`; };
const LAND = { sand: '#ecd69c', jungle: '#92c274', rocky: '#b7ad9c', treasure: '#ecd69c', harbour: '#dcb877', volcano: '#6a6064', atoll: '#f0dca4', mangrove: '#6a8a4a' };
// ---- hand-drawn look: every line is drawn twice, a little off, with wobbly sub-segments; fills are
// uneven watercolour washes with pencil hatching. Seeded, so a drawing does not boil while you pan.
const circ = (x, y, r, n = 12) => Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * 6.2832) * r, y + Math.sin((i / n) * 6.2832) * r]);
const rectP = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
let TEXTQ = null;   // while the chart draws, its labels are queued here and painted on a full-resolution layer
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
      const { closed = true, col = INK, w = 1.3, alpha = 1 } = o, amp = Math.max(1.2, o.amp || 1.1) * 2;
      c.strokeStyle = col; c.lineCap = 'square'; c.lineJoin = 'miter';
      // no thin lines: every stroke is at least two map pixels wide, drawn once, rough
      c.lineWidth = Math.max(4, w * 3) * (0.85 + r() * 0.3); c.globalAlpha = alpha * (0.75 + r() * 0.25); path(pts, closed, amp); c.stroke();
      c.globalAlpha = 1;
    },
    wash(pts, col, a = 0.6, amp = 1.8) {
      c.fillStyle = col;
      c.globalAlpha = Math.min(1, a * 1.25); path(pts, true, amp * 1.5); c.fill();
      c.globalAlpha = 1;
    },
    hatch(pts, o = {}) {
      const { col = INK, gap = 4, a = 0.25, ang = 0.9 } = o;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      c.save(); c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.clip();
      c.strokeStyle = col; c.lineWidth = 3; c.globalAlpha = a; c.lineCap = 'square';
      const L = (x1 - x0) + (y1 - y0), dx = Math.cos(ang), dy = Math.sin(ang);
      for (let t = -L; t < L; t += gap * 2.6 + j(2)) {
        const cx = (x0 + x1) / 2 + t * dy, cy = (y0 + y1) / 2 - t * dx;
        c.beginPath(); c.moveTo(cx - dx * L + j(1), cy - dy * L + j(1)); c.lineTo(cx + dx * L + j(1), cy + dy * L + j(1)); c.stroke();
      }
      c.restore(); c.globalAlpha = 1;
    },
    text(str, x, y, o = {}) {
      const { col = INK, halo = true } = o;
      const font = (o.font || '700 12px Georgia, serif').replace('italic ', '').replace(/\b(bold|[5-9]00)\b/, '400').replace(/(\d+)px/, (m, n) => `${+n >= 30 ? 32 : 16}px`).replace(/Georgia, serif|Georgia/, '"DotGothic16", monospace');
      if (TEXTQ) { TEXTQ.push({ str, x: x + j(1.5), y: y + j(1.5), rot: j(0.03), font, col, halo, a: 0.85 + r() * 0.15 }); return; } // drawn later, crisp, on the label layer
      c.save(); c.translate(x + j(1.5), y + j(1.5)); c.rotate(j(0.04)); c.font = font; c.textAlign = 'center';
      if (halo) { c.strokeStyle = 'rgba(232,214,166,0.9)'; c.lineWidth = 6; c.lineJoin = 'miter'; c.strokeText(str, 0, 0); }
      c.fillStyle = col; c.globalAlpha = 0.85 + r() * 0.15; c.fillText(str, 0, 0); c.restore(); c.globalAlpha = 1;
    },
  };
}
// ---- the book: a battered pixel tome. Cover and pages are drawn on small canvases (dithered, scratched,
// stained, with torn transparent edges) and shown pixelated.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const mkCanvas = (w, h) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return [cv, cv.getContext('2d')]; };
const dith = (x, y) => BAYER[(y % 4) * 4 + (x % 4)] / 16 - 0.5;
/** pixel line */
function pline(c, x0, y0, x1, y1, col) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  c.fillStyle = col;
  for (let i = 0; i <= n; i++) c.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1);
}
/** a dithered blob: solid in the middle, broken up toward the edge */
function pblob(c, r, x, y, rad, col) {
  c.fillStyle = col;
  for (let yy = -rad; yy <= rad; yy++) for (let xx = -rad; xx <= rad; xx++) {
    const d = Math.hypot(xx, yy * 1.3) / rad + (r() - 0.5) * 0.35;
    if (d < 0.6 || (d < 1 && dith(x + xx + 99, y + yy + 99) > d - 0.75)) c.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
  }
}
/** nibble the outline away: torn, chipped edges (deeper at the corners) */
function tear(c, r, w, h, depth) {
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) { const d = Math.floor(r() * r() * depth); c.clearRect(x, y < 1 ? 0 : h - d, 1, d); }
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) { const d = Math.floor(r() * r() * depth); c.clearRect(x < 1 ? 0 : w - d, y, d, 1); }
  for (const [cx, cy] of [[0, 0], [w, 0], [0, h], [w, h]]) for (let i = 0; i < 6; i++) { const k = 1 + Math.floor(r() * 3); c.clearRect(cx ? cx - k - i * r() : i * r(), cy ? cy - k : 0, k, k); }
}
function pixelCover() {
  const W0 = 150, H0 = 90, [cv, c] = mkCanvas(W0, H0), r = mulberry32(41), pal = ['#20100a', '#3a2214', '#55331c', '#744824'];
  const blobs = Array.from({ length: 12 }, () => [r() * W0, r() * H0, 12 + r() * 25, r()]);
  for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
    let v = 0.45; for (const [bx, by, br, bv] of blobs) v += (bv - 0.5) * Math.max(0, 1 - Math.hypot(x - bx, y - by) / br);
    v += (1 - Math.min(1, Math.min(x, W0 - 1 - x, y, H0 - 1 - y) / 10)) * -0.3 - (Math.abs(x - 74.5) < 3 ? 0.35 : 0) + (r() - 0.5) * 0.25;
    c.fillStyle = pal[Math.max(0, Math.min(3, Math.round(v * 3 + dith(x, y))))]; c.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 40; i++) { const x = r() * W0, y = r() * H0, a = r() * 6.28, l = 2 + r() * 9; pline(c, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, r() < 0.7 ? '#8a6038' : '#140a06'); } // scratches
  for (let i = 0; i < 7; i++) pblob(c, r, r() * W0, r() * H0, 2 + r() * 5, 'rgba(14,7,4,0.55)');                                                // stains
  c.fillStyle = '#b8954c'; for (let x = 6; x < W0 - 6; x += 3) if (r() > 0.15) { c.fillRect(x, 4, 1, 1); c.fillRect(x, H0 - 5, 1, 1); }          // stitching, a few missing
  for (let y = 6; y < H0 - 6; y += 3) if (r() > 0.15) { c.fillRect(4, y, 1, 1); c.fillRect(W0 - 5, y, 1, 1); }
  const gold = ['#e8cc84', '#b8954c', '#7a5a24', '#4a3410'];
  const corner = (x0, y0, sx, sy) => { for (let i = 0; i < 10; i++) for (let j = 0; j < 10 - i; j++) { if (r() < 0.08) continue; c.fillStyle = gold[i + j < 3 ? 0 : i + j < 6 ? 1 : i + j < 9 ? 2 : 3]; c.fillRect(sx > 0 ? x0 + i : x0 - i - 1, sy > 0 ? y0 + j : y0 - j - 1, 1, 1); } };
  corner(0, 0, 1, 1); corner(W0, 0, -1, 1); corner(0, H0, 1, -1); corner(W0, H0, -1, -1);
  tear(c, r, W0, H0, 3);
  return cv.toDataURL();
}
function pixelPage() {
  const W0 = 160, H0 = 90, [cv, c] = mkCanvas(W0, H0), r = mulberry32(42), pal = ['#8a7044', '#b49a62', '#d2ba84', '#e6d4a4'];
  for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
    const g = Math.abs(x - 79.5) / 80, edge = Math.min(x, W0 - 1 - x, y, H0 - 1 - y);
    const v = 3 - (g < 0.08 ? (0.08 - g) * 30 : 0) - (edge < 4 ? (4 - edge) * 0.45 : 0) - (r() < 0.06 ? 1 : 0) + (r() - 0.5) * 0.3;
    c.fillStyle = pal[Math.max(0, Math.min(3, Math.round(v + dith(x, y))))]; c.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 18; i++) pblob(c, r, r() * W0, r() * H0, 1 + r() * 2.5, 'rgba(120,80,40,0.35)');                           // foxing
  for (let i = 0; i < 3; i++) { const x = [6, W0 - 7, 34][i] + r() * 6, y = [5 + r() * 6, H0 - 9, H0 - 6][i]; pblob(c, r, x, y, 2 + r() * 2, '#2a1608'); for (let k = 0; k < 6; k++) c.fillRect(x + (r() - 0.5) * 12, y + (r() - 0.5) * 10, 1, 1); } // ink blots
  { const x = 128, y = 66, rr = 8; c.fillStyle = 'rgba(110,60,20,0.5)'; for (let a = 0.4; a < 5.8; a += 0.08) c.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr * 0.9), 1, 1); } // coffee ring
  pline(c, 20, 0, 58, H0, 'rgba(255,248,225,0.25)'); pline(c, 21, 0, 59, H0, 'rgba(90,60,30,0.2)');                                   // crease
  for (let i = 0; i < 9; i++) for (let j = 0; j < 9 - i; j++) { c.fillStyle = (i + j) % 2 ? '#b49a62' : '#d2ba84'; c.fillRect(W0 - 1 - i, H0 - 1 - j, 1, 1); } // dog-ear
  pline(c, W0 - 10, H0 - 1, W0 - 1, H0 - 10, '#6a5230');
  tear(c, r, W0, H0, 3);
  return cv.toDataURL();
}

/** posterise the chart with an ordered dither: hard pixel edges, a gritty printed look */
function pixelate(c, w, h) {
  const img = c.getImageData(0, 0, w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, t = (BAYER[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * 34;
    for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, Math.round((d[i + k] + t) / 34) * 34));
  }
  c.putImageData(img, 0, 0);
}
const trackBtn = (state, id) => (state.tracked === id ? '<small class="tracked">&gt; following this one</small>' : `<button class="mini" data-track="${id}">Follow</button>`);
const stars = (n) => pxi('star').repeat(n) + pxi('nostar').repeat(3 - n);
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
    this.paintBook();
    this.tabsEl.innerHTML = TABS.map(([id, label, icon], i) => `<button data-tab="${id}" title="${label} (${i + 1})"><span>${icon}</span><em>${label}</em></button>`).join('');
    this.tabsEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) this.open(b.dataset.tab); });
    document.getElementById('logClose').addEventListener('click', () => deps.close());
    document.getElementById('pgPrev').addEventListener('click', () => this.turn(-1));
    document.getElementById('pgNext').addEventListener('click', () => this.turn(1));
  }

  /** paint the cover and pages (small pixel canvases, shown pixelated) */
  paintBook() {
    const book = this.root.querySelector('.book');
    book.style.backgroundImage = `url(${pixelCover()})`;
    book.querySelector('.spread').style.setProperty('--page', `url(${pixelPage()})`);
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
    let html = '';
    const curCh = MAIN_GOALS[g.i] ? MAIN_GOALS[g.i].ch : CHAPTERS.length;
    CHAPTERS.forEach((ch, ci) => {
      if (ci > curCh) return;                       // later chapters stay unwritten
      html += h3(`${ch.n}. ${ch.title}`);
      MAIN_GOALS.forEach((m, i) => {
        if (m.ch !== ci) return;
        const done = i < g.i, cur = i === g.i;
        if (!done && !cur) return;
        html += ent(`${done ? pxi('check') : pxi('next')} ${m.title}`, cur ? goalText(m, { state, ship: this.d.ship }) : '', m.reward ? `${m.reward}g` : '', done ? 'done' : 'cur');
      });
    });
    if (curCh < CHAPTERS.length) html += ent('...', 'The rest of the page is blank.', '', 'dim');
    if (MAIN_GOALS[g.i]) html += `<button id="skipGoal" class="mini">Skip this goal</button>`;
    html += '<h3 class="brk">Optional</h3>';
    for (const s of SIDE_GOALS) html += ent(`${g.side[s.id] ? pxi('check') : pxi('open')} ${s.title}`, g.side[s.id] ? '' : s.text, `${s.reward}g`, g.side[s.id] ? 'done' : '');
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
      html += ent(`${pxi('letter')} ${j.item}`, `to ${j.toName} · ${Math.round(Math.hypot(dx, dz))} ${bearingName(dx, dz)}`, `${j.reward}g`) + trackBtn(state, 'job');
    } else html += ent('No delivery', 'Take one at a harbour job board.', '', 'dim');
    const pg = state.passenger;
    if (pg) { const dx = pg.x - ship.pos.x, dz = pg.z - ship.pos.z; html += h3('Passenger') + ent(`${pxi('talk')} ${pg.name}`, `to ${pg.toName} · ${Math.round(Math.hypot(dx, dz))} ${bearingName(dx, dz)}`, `${pg.reward}g`) + trackBtn(state, 'passenger'); }
    html += h3(`Commissions (${state.quests.length}/3)`);
    if (!state.quests.length) html += ent('None taken', 'Harbour boards post errands: fish, fruit, crates, raiders…', '', 'dim');
    for (const q of state.quests) {
      const need = questNeed(q), have = questProgress(q, state), done = have >= need;
      let where = `for ${q.giverName}`;
      if (q.type === 'crates' && !done) { const dx = q.center.x - ship.pos.x, dz = q.center.z - ship.pos.z; where = `search ${bearingName(dx, dz)}, ~${Math.round(Math.hypot(dx, dz))}`; }
      html += `<div class="ent ${done ? 'cur' : ''}"><b>${questIcon(q)} ${questTitle(q, dread)}</b><span class="r">${q.reward}g</span><small>${where}${done ? ' · ready to hand in' : ''}</small><i class="pbar"><b style="width:${Math.round((have / need) * 100)}%"></b></i><small>${have}/${need}</small>${trackBtn(state, q.id)}</div>`;
    }
    const hist = state.jobHistory || [];
    html += '<h3 class="brk">Done</h3>' + (hist.length ? hist.slice(-4).reverse().map((h) => ent(h.item, `to ${h.to}`, `+${h.reward}g`)).join('') : ent('Nothing yet', '', '', 'dim'));
    this.body.innerHTML = html;
    this.body.querySelectorAll('[data-track]').forEach((x) => x.addEventListener('click', () => { state.tracked = x.dataset.track; this.d.retrack(); this.render(); }));
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
      html += `<div class="riddle ${dug ? 'done' : ''}"><b>${d ? d.name : id}</b> ${dug ? `<span class="ok">${pxi('check')} dug up</span>` : ''}<p>“${state.riddles[id]}”</p>${dug ? '' : `<small>${where}</small>`}</div>`;
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
      html += ent(r.name, r.found ? 'found' : `${bearingName(dx, dz)}, ~${Math.round(Math.hypot(dx, dz))} fathoms · ${r.source || ''}`, r.found ? pxi('check') : '?', r.found ? 'done' : '');
    }
    this.body.innerHTML = html;
  }

  renderJournal() {
    const { state } = this.d, dread = this.d.dread();
    const isl = Object.values(state.discovered);
    const types = { harbour: 'Harbours', treasure: 'Treasure isles', jungle: 'Jungles', rocky: 'Rocks', sandbar: 'Sandbars', volcano: 'Volcanoes', atoll: 'Atolls', mangrove: 'Mangroves' };
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
    html += h3('Fittings') + UPGRADES.map((u) => { const lv = state.upgrades[u.id]; return ent(u.name, lv ? u.text[lv - 1].split(':')[0] : 'stock', `<span class="pips">${pxi('pip').repeat(lv)}${pxi('nopip').repeat(MAX_LEVEL - lv)}</span>`); }).join('');
    html += h3('Crew') + ((state.crew || []).length ? state.crew.map((c) => ent(`${c.name}, ${c.look}`, `${TRAITS[c.trait].name}: ${TRAITS[c.trait].text} · ${c.wish.done ? 'wish fulfilled (+1)' : c.wish.text}`)).join('') : ent('Only Mara', 'Hire hands at harbour taverns (Market tab).', '', 'dim'));
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
    this.body.innerHTML = `<div class="mapwrap"><canvas id="mapCv" width="${W / 2}" height="${H / 2}"></canvas><canvas id="mapTxt" width="${W}" height="${H}"></canvas>
      <div class="mapctl"><button id="mz+">+</button><button id="mz-">&minus;</button><button id="mc" title="Centre on ship">${pxi('target')}</button></div></div>
      <div class="legend">drag to pan · wheel to zoom · <b style="color:#b02818">?</b> rumour · <b style="color:#d07010">flag</b> delivery · <b style="color:#8a5a30">box</b> lost crates</div>`;
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
    TEXTQ = [];
    c.setTransform(0.5, 0, 0, 0.5, 0, 0);   // drawn in 880x470 chart space onto a half-size canvas, shown pixelated
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

    { // the fog wall: beyond it the chart is grey and unfinished
      const R = this.d.gate ? this.d.gate() : Infinity;
      if (R !== Infinity) {
        c.save(); c.beginPath(); c.rect(0, 0, W, H); c.moveTo(X(R), Z(0)); c.arc(X(0), Z(0), R * sc, 0, Math.PI * 2, true);
        c.fillStyle = 'rgba(110,104,96,0.42)'; c.fill('evenodd'); c.restore();
        sketcher(c, 4242).line(circ(X(0), Z(0), R * sc, 48), { col: '#6a6058', w: 2, amp: 2.5, passes: 2, alpha: 0.6 });
      }
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
        c.font = '400 32px "DotGothic16", monospace'; c.fillStyle = '#7a1a3a'; c.textAlign = 'center';
        c.fillText('TURN BACK', 0, -60);
        c.strokeStyle = '#7a1a3a'; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 44, 20, 0, 0, 7); c.stroke();
        c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fillStyle = '#7a1a3a'; c.fill();
        c.restore(); c.globalAlpha = 1;
      }
      if (!this.warpRaf) this.warpRaf = requestAnimationFrame(() => { this.warpRaf = 0; if (this.tab === 'map' && document.getElementById('chart').classList.contains('open')) this.drawMap(); });
    }
    c.font = '400 16px "DotGothic16", monospace'; c.textAlign = 'center';
    if (sc >= 1.1) for (const [name, lx, lz] of labels) sketcher(c, hash2(lx | 0, name.length, 5)).text(name, lx, lz);

    c.font = '400 32px "DotGothic16", monospace';
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

    c.save(); c.translate(X(ship.pos.x), Z(ship.pos.z));
    { const sk = sketcher(c, 13); sk.wash(circ(0, 0, 24, 12), '#ffe060', 0.45, 0.3); sk.line(circ(0, 0, 24, 12), { w: 2.4, amp: 1, col: '#b02818' }); } // you are here
    c.rotate(ship.heading); c.scale(1.7, 1.7);
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
    { const sk = sketcher(c, 3); sk.line(rectP(8, 8, W - 16, H - 16), { w: 3, amp: 1.4 }); }
    c.setTransform(1, 0, 0, 1, 0, 0);
    pixelate(c, W / 2, H / 2);
    const tq = TEXTQ; TEXTQ = null;
    const tc = document.getElementById('mapTxt'), t = tc && tc.getContext('2d');
    if (t) {
      t.clearRect(0, 0, W, H);
      for (const q of tq) {
        t.save(); t.translate(Math.round(q.x), Math.round(q.y)); t.rotate(q.rot); t.font = q.font; t.textAlign = 'center';
        if (q.halo) { t.strokeStyle = 'rgba(226,208,160,0.95)'; t.lineWidth = 5; t.lineJoin = 'miter'; t.strokeText(q.str, 0, 0); }
        t.globalAlpha = q.a; t.fillStyle = q.col; t.fillText(q.str, 0, 0); t.restore();
      }
    }
  }

  drawIsland(c, d, px, pz, sc, state) {
    // low-poly: a handful of rough corners, each facet a flat shade (lit from the top-left)
    const N = 8, base = LAND[d.type] || '#ecd69c', sk = sketcher(c, d.seed * 7 + 1);
    const pts = [], inner = [];
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2 + sk.j(0.2), r = shoreR(d, th) * sc * (0.9 + sk.r() * 0.2);
      pts.push([px + Math.cos(th) * r, pz + Math.sin(th) * r]);
      inner.push([px + Math.cos(th + 0.3) * r * 0.5, pz + Math.sin(th + 0.3) * r * 0.5]);
    }
    const ring = (k) => pts.map((p) => [px + (p[0] - px) * k, pz + (p[1] - pz) * k]);
    c.setLineDash([10, 10]); sk.line(ring(1.4), { col: '#3a6a78', w: 1.4, alpha: 0.45 }); c.setLineDash([]);   // coastal ripple
    const top = [px + sk.j(3 * sc), pz - 2 * sc + sk.j(3 * sc)];
    const fan = (P, col) => P.forEach((p, i) => {
      const q = P[(i + 1) % P.length], mid = Math.atan2((p[1] + q[1]) / 2 - pz, (p[0] + q[0]) / 2 - px);
      c.fillStyle = shade(col, 0.82 + 0.26 * Math.max(0, -Math.cos(mid + 0.8)) + sk.j(0.04));
      c.beginPath(); c.moveTo(top[0], top[1]); c.lineTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.closePath(); c.fill();
      c.strokeStyle = c.fillStyle; c.lineWidth = 2; c.stroke();
    });
    fan(pts, base);
    if (d.type === 'jungle' || d.type === 'rocky' || d.type === 'treasure') fan(inner, d.type === 'rocky' ? '#9a9486' : '#6aa456');
    if (d.type === 'atoll') fan(inner, '#6ac8c8');
    if (d.type === 'volcano') fan(inner.map((p) => [px + (p[0] - px) * 0.45, pz + (p[1] - pz) * 0.45]), '#b8402a');
    if (d.type === 'mangrove') fan(inner, '#3f6a30');
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
    if (d.hut && state.story && state.story.hutKnown) { // the dark hut: a black crooked shape with one purple window
      const hx = px + 8 * s, hz = pz - 2 * s, body = [[hx - 5 * s, hz + 4 * s], [hx - 4 * s, hz - 3 * s], [hx + 4 * s, hz - 2 * s], [hx + 5 * s, hz + 4 * s]];
      sk.wash(body, '#1e1619', 1, 0.6); sk.wash([[hx - 6 * s, hz - 2 * s], [hx - 1 * s, hz - 8 * s], [hx + 5.5 * s, hz - 1.5 * s]], '#120c0e', 1, 0.6);
      c.fillStyle = '#c030a0'; c.fillRect(hx + 1 * s, hz - 1 * s, 2.5 * s, 2.5 * s);
    }
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
