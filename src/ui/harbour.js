// The harbour screens: the board (errands, commissions, letters, passengers), the market, the tavern (rest, harbour life, games),
// the shipwright, greetings at the pier, the ship's companions, and the marks that tell the tutorial where to click.
import { hash2 } from '../util.js';
import { portrait, speakerName } from '../greetings.js';
import { isOpen, lockPane } from '../gates.js';
import { Companion } from '../companion.js';
import { makeJob, findRumour, repOf, friendLevel, discount, bearingName, RUMOUR_COST, commissionsFor, questProgress, questNeed, questTitle, questIcon, FRUITS, fruitName, plural } from '../jobs.js';
import { makePassenger } from '../passengers.js';
import { sectorAt } from '../sectors.js';
import { unlocked } from '../objectives.js';
import { pxi } from '../pixelui.js';
import { UPGRADES, MAX_LEVEL, UP_CARD } from '../upgrades.js';
import { TRAITS, crewForHire, rollCheck } from '../tabletop.js';
import { FISH, HABITAT } from '../fishing.js';
import { oilCap } from '../oil.js';
import * as life from '../harbourlife.js';
import * as paper from '../newspaper.js';
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { markSeen } from '../clues.js';
import { drownedTake, OIL_SELL, sellMul, buyMul, marketNote, takeJob, clockAt, nowD, jobPay, DAY_SECONDS, recordMarks } from '../regions.js';
import { pierOf } from '../world.js';
import { $, toast } from './dom.js';
import { isMarketDay, isFestival } from '../systems/calendar.js';
import { addMark } from '../systems/storyflags.js';

export let upCost, tutorialGoal, priceNote;   // set by the init function(s) below, at the point in boot where main.js had them

// ---------------------------------------------------------------- harbour shipwright
export const UP_MUL = [1.3, 1.6, 1.9];   // economy: the shipwright charges more, steeply for the higher levels
export function handIn(q, d) {
  const need = questNeed(q);
  if (questProgress(q, state) < need) return;
  if (q.type === 'fish') { let n = need; state.catch = state.catch.filter((f) => (f.id === q.species && n > 0 ? (n--, false) : true)); }
  if (q.type === 'fruit') state.fruit[q.fruit] -= need;
  state.gold += q.reward;
  repOf(state, d.id).deliveries++;
  state.serial[d.id + '#c'] = (state.serial[d.id + '#c'] || 0) + 1;
  state.quests = state.quests.filter((x) => x.id !== q.id);
  G.sea.syncQuests(state.quests.filter((q) => q.id === state.tracked));
  state.stats.commissions = (state.stats.commissions || 0) + 1;
  toast(`Commission done: ${questTitle(q, rt.dread)} (+${q.reward} gold)`, rt.dread > 0.5, 6000);
  G.audio.play('treasure');
}
export function acceptCommission(o) {
  if (state.quests.length >= 3 || state.quests.some((x) => x.id === o.id)) return;
  const q = { ...o, base: o.type === 'bounty' ? state.stats.sunk : o.type === 'spot' ? state.stats[o.what] : 0 };
  if (q.crates) q.crates = q.crates.map((c) => ({ ...c }));
  state.quests.push(q);
  if (!state.tracked) state.tracked = q.id;
  G.sea.syncQuests(state.quests.filter((q) => q.id === state.tracked));
  toast(`Commission taken: ${questTitle(q, rt.dread)}`, false, 5000);
  G.audio.play('buy');
}
export const REST_LINES = ['You sleep like a stone. Gulls wake you at dawn.', 'Somebody snored all night. Possibly you.', 'You dream of warm water and wake up hungry.'];
export const REST_DARK = ['You sleep. Someone sat by your bed all night; the chair is still warm.', 'You wake at dawn. Your boots are wet, and full of sand you do not recognise.',
  'You sleep well. The innkeeper says you talked all night, in a voice that was not yours.', 'Your room had two beds. In the morning, both were slept in.'];
export function restAtTavern(cost) {
  if (state.gold < cost) return;
  state.gold -= cost;
  const dk = rt.dread > 0.6, hbd = rt.harbourIsl && rt.harbourIsl.desc;
  G.closeModal();
  $('fade').classList.add('on');
  setTimeout(() => {
    if (state.time * 24 >= 6) { G.noteSkip(); state.dayN++; G.crewLeave(); }    // slept past midnight
    state.time = 6 / 24; state.story.restDay = state.dayN;   // Mara is rested
    state.hp = G.ship.mods.maxHp;
    $('fade').classList.remove('on');
    toast(dk ? REST_DARK[Math.floor(Math.random() * REST_DARK.length)] : REST_LINES[Math.floor(Math.random() * REST_LINES.length)], dk, 6000);
    G.objectives.remark('rested', rt.dread);
    { const x = hbd ? G.threads.onRest(hbd) : ''; if (x) setTimeout(() => toast(x, true, 8000), 2400); }
    if (!state.story.tellRoom && G.lateTell()) { state.story.tellRoom = 1; setTimeout(() => toast('The innkeeper counted heads last night, got one, and charged you for one.', false, 7000), 4200); }   // a tell: never counted
  }, 1100);
}
export function renderHarbour() {
  if (!isOpen(state, 'tab', rt.hbTab)) rt.hbTab = 'board';   // a sign that has not opened yet: back to the board
  const d = rt.harbourIsl.desc, rep = repOf(state, d.id), lvl = friendLevel(rep);
  $('hbName').textContent = d.name;
  if ($('hbLine').style.display === 'none') $('hbLine').textContent = rt.harbourLine;
  $('hbBannerName').textContent = d.name;
  $('hbGold').textContent = state.gold;
  $('hbTabs').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === rt.hbTab));
  $('hbPlace').textContent = { board: "Harbourmaster's board", market: 'Market', tavern: 'Tavern', wright: 'Shipwright' }[rt.hbTab];
  postBadges(d, rep);
  const pane = $('hbPane');
  let html = '';
  $('hbWide').classList.toggle('shop', rt.hbTab === 'wright' || rt.hbTab === 'market');   // shops get a wider panel
  if (rt.hbTab === 'board') {
    // finish what you came for first: deliveries, passengers and finished commissions for this harbour
    const due = [];
    if (state.job && state.job.toId === d.id) due.push(`<div class="qrow"><div><b>${pxi('letter')} Deliver ${state.job.item}</b><br><small>+${state.job.reward}g</small></div><button id="doDeliver">Deliver</button></div>`);
    if (state.passenger && state.passenger.toId === d.id) due.push(`<div class="qrow"><div><b>${pxi('talk')} ${state.passenger.name} goes ashore</b><br><small>+${state.passenger.reward}g fare</small></div><button id="doDropoff">Drop off</button></div>`);
    for (const q of state.quests.filter((x) => x.giverId === d.id && questProgress(x, state) >= questNeed(x))) due.push(`<div class="qrow"><div><b>${questIcon(q)} ${questTitle(q, rt.dread)}</b><br><small>done · +${q.reward}g</small></div><button data-hand="${q.id}">Finish</button></div>`);
    if (rt.openLetter) html += `<div class="sec">A LETTER</div><div class="letterOpen"><p>${rt.openLetter.text}</p><small>${rt.openLetter.from} · kept in your log</small></div>`;
    for (const lt of lettersAt(d)) html += `<div class="sec">A LETTER</div><div class="qrow letter"><div><b>${pxi('letter')} ${lt.title}</b><br><small>${lt.sub}</small></div><button id="takeLetter" data-letter="${lt.key}">Take it</button></div>`;
    if (due.length) html += `<div class="sec">FINISH HERE</div>${due.join('')}`;
    if (G.lifeOn()) {   // the harbour's own person and their story (harbourlife.js), and this harbour's day in the week
      for (const r of life.residentRows(state, G.world, d, { night: state.time * 24 >= 19 || state.time * 24 < 5 })) {
        if (r.after) html += `<div class="sec">${r.who.toUpperCase()}</div><small class="${r.dark ? 'darkline' : ''}">${r.after}</small>`;
        else if (r.wait) html += `<div class="sec">${r.who.toUpperCase()}</div><small>${r.text}</small>`;
        else html += `<div class="sec">${r.who.toUpperCase()}</div><div class="qrow letter"><div><b>${pxi('talk')} ${r.text}</b>${r.block ? `<br><small>${r.block}</small>` : ''}</div><button class="lifeStep" data-k="${r.key}" ${r.block ? 'disabled' : ''}>${r.btn}</button></div>`;
      }
      html += `<div class="sec">THIS WEEK</div><small>${life.eventLine(d, state)}: ${life.gameOf(d).name} in the tavern pays double.</small>`;
    }
    html += '<div class="sec">DELIVERY</div>';
    const j = state.job || makeJob(G.world, d, state.serial[d.id] || 0, state.goals.i <= 8 ? 420 : 750);   // the first jobs stay close
    if (state.job && state.job.toId === d.id) html += '<small>Deliver the one above first.</small>';
    else if (state.job) html += `<div class="qrow"><div><b>${pxi('letter')} ${state.job.item}</b><br><small>to ${state.job.toName} · ${bearingName(state.job.x - d.x, state.job.z - d.z)}</small></div><small>${state.job.reward}g</small></div>`;
    else if (j && j.timed) {   // the Crown keeps time: a deadline, two prices, and the shared book of arrivals (regions.js)
      const due = clockAt(nowD(state) + j.timed / DAY_SECONDS), on = jobPay(state, { ...j, due: Infinity }, 'crown'), late = jobPay(state, { ...j, due: -1 }, 'crown');
      html += `<div class="qrow"><div><b>${pxi('letter')} ${j.item}</b><br><small>to ${j.toName} · ${bearingName(j.x - pierOf(d).x, j.z - pierOf(d).z)}, ${j.dist} · by ${due}: ${on}g, late ${late}g</small></div><button id="jobAccept">Accept</button></div><div class="ledgerrow">${recordMarks(state, pxi)}</div>`;
    } else if (j) html += `<div class="qrow"><div><b>${pxi('letter')} ${j.item}</b><br><small>to ${j.toName} · ${bearingName(j.x - pierOf(d).x, j.z - pierOf(d).z)}, ${j.dist} · ${j.reward}g</small></div><button id="jobAccept">Accept</button></div>`;
    else html += '<small>Nothing today.</small>';
    html += `<div class="sec">COMMISSIONS (${state.quests.length}/3)</div>`;
    const mine = state.quests.filter((q) => q.giverId === d.id);
    for (const q of mine) {
      const need = questNeed(q), have = questProgress(q, state);
      if (have < need) html += `<div class="qrow"><div><b>${questIcon(q)} ${questTitle(q, rt.dread)}</b><br><small>${have}/${need} · ${q.reward}g</small></div></div>`;
    }
    const offers = commissionsFor(G.world, d, state.serial[d.id + '#c'] || 0).filter((o) => !state.quests.some((x) => x.id === o.id));
    for (const o of offers) {
      const q = { ...o, base: 0 };
      html += `<div class="qrow"><div><b>${questIcon(o)} ${questTitle(q, rt.dread)}</b><br><small>${o.type === 'crates' ? `lost ${bearingName(o.center.x - d.x, o.center.z - d.z)} of here · ` : ''}${o.reward}g</small></div><button data-accept="${o.id}" ${state.quests.length >= 3 ? 'disabled' : ''}>Accept</button></div>`;
    }
    if (!mine.length && !offers.length) html += '<small>The board is empty. Come back after you have been out to sea.</small>';
    const pass = passengerAt(d);
    if (pass) html += `<div class="sec">PASSAGE</div><div class="qrow"><div><b>${pxi('talk')} ${pass.name}, ${pass.who}</b><br><small>wants passage to ${pass.toName} · pays ${pass.reward}g</small></div><button id="takePass">Take aboard</button></div>`;
    const r = findRumour(G.world, d, state);
    if (r) html += `<div class="sec">RUMOURS</div><div class="qrow"><div><b>${pxi('talk')} A sailor talks of buried treasure</b></div><button id="rumourBuy" ${state.gold >= RUMOUR_COST ? '' : 'disabled'}>${RUMOUR_COST}g</button></div>`;
    const chartCost = Math.ceil(30 * G.costMul());
    if (!state.charts[d.id]) html += `<div class="sec">LOCAL CHART</div><div class="qrow"><div><b>${pxi('flag')} A hand-drawn chart of these waters</b><br><small>the islands around ${d.name}, as the locals know them, and the way through the first fog</small></div><button id="buyChart" ${state.gold >= chartCost ? '' : 'disabled'}>${chartCost}g</button></div>`;
    for (const r of G.threads.harbourRows(d)) html += `<div class="sec">ON THE PIER</div><div class="qrow letter"><div><b>${pxi('talk')} ${r.html}</b></div><button class="thrAct" data-act="${r.id}">${r.btn}</button></div>`;
    const po = petOffer(d); if (po) html += `<div class="sec">ON THE PIER</div><div class="qrow letter"><div><b>${pxi('talk')} ${PETS[po].title}</b><br><small>${PETS[po].sub}</small></div><button id="takePet" data-pet="${po}">${PETS[po].btn}</button></div>`;
    pane.innerHTML = html;
    const bc = $('buyChart'); if (bc) bc.addEventListener('click', () => {
      if (state.gold < chartCost) return; state.gold -= chartCost; state.charts[d.id] = true;
      const k = G.revealAround(d.x, d.z);
      const note = G.CHART_NOTES[d.custom]; if (note) state.notes.push({ text: `${d.name}'s chart: ${note}`, dark: ['nochildren', 'statues', 'bells'].includes(d.custom) });
      toast(k ? `A hand-drawn chart of ${d.name}'s waters. ${k} island${k > 1 ? 's' : ''} added to your map.` : `A hand-drawn chart of ${d.name}'s waters. You know them all already. It is a lovely drawing.`, false, 6000);
      G.audio.play('buy'); renderHarbour(); });
    const ja = $('jobAccept');
    if (ja) ja.addEventListener('click', () => { state.job = takeJob(state, j); toast(j.due != null ? `Delivery taken: ${j.toName}, by ${clockAt(j.due)}.` : `Delivery taken: ${j.toName} (pays ${j.reward}g on arrival)`, j.dark); G.audio.play('buy'); renderHarbour(); });
    pane.querySelectorAll('.thrAct').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.act; G.threads.harbourAct(id, d); if (id === 'hollow') return; renderHarbour(); }));
    const tkp = $('takePet'); if (tkp) tkp.addEventListener('click', () => { takePet(tkp.dataset.pet); renderHarbour(); });
    pane.querySelectorAll('.lifeStep').forEach((b) => b.addEventListener('click', () => {
      const r = life.takeStep(state, G.world, d, b.dataset.k); if (!r) return;
      toast(r.toast, r.dark, 7000); G.audio.play(r.ended ? 'discover' : 'ui', { vol: r.ended ? 0.5 : 0.4 });
      if (r.ended) { G.autosave(); setTimeout(() => toast(`${d.name} will not be quite the same again.`, r.dark, 5000), 2600); }
      renderHarbour(); }));
    const tl = $('takeLetter'); if (tl) tl.addEventListener('click', () => { takeLetter(tl.dataset.letter); renderHarbour(); });
    const dv = $('doDeliver'); if (dv) dv.addEventListener('click', () => { G.completeJobIfHere(d); renderHarbour(); });
    const dp = $('doDropoff'); if (dp) dp.addEventListener('click', () => {
      const p = state.passenger, two = !state.story.berths && !(state.stats.passengers || 0);   // the first fare is paid for two berths; the harbourmaster looks for the other one (once, never explained)
      if (two) { state.story.berths = 1; p.reward *= 2; markSeen(state, 'CL-H1-berth'); }
      state.gold += p.reward; state.passenger = null; state.stats.passengers = (state.stats.passengers || 0) + 1;
      repOf(state, d.id).deliveries++; toast(`${p.name} waves goodbye from the pier. (+${p.reward}g${two ? ', two berths' : ''})`, false, 6000); G.audio.play('treasure');
      if (two) setTimeout(() => toast('"And the other one?" The harbourmaster looks along your deck, then shrugs and stamps the book.', false, 7000), 2200);
      if (!two && state.crew.length < 2 && Math.random() < 0.3 && !state.crew.some((c) => c.name === p.name)) {   // now and then a passenger asks to sail along for a few days
        const ids = Object.keys(TRAITS); G.signOn({ name: p.name, look: 'who did not want to get off', trait: ids[Math.floor(Math.random() * ids.length)], wish: { kind: 'volcano', text: 'wants to see a fire mountain', done: false }, cost: 0 }, 3);
        setTimeout(() => toast(`${p.name} asks to sail along for a few days. (${TRAITS[state.crew[state.crew.length - 1].trait].name} joins the crew.)`, false, 7000), 1800);
      }
      renderHarbour(); });
    const tp = $('takePass'); if (tp) tp.addEventListener('click', () => {
      state.passenger = pass; state.serial[d.id + '#p'] = (state.serial[d.id + '#p'] || 0) + 1; state.tracked = 'passenger';
      toast(`${pass.name} ${/&/.test(pass.name) ? 'come' : 'comes'} aboard, bound for ${pass.toName}.`, false, 5000); renderHarbour(); });
    pane.querySelectorAll('[data-hand]').forEach((b) => b.addEventListener('click', () => { handIn(state.quests.find((q) => q.id === b.dataset.hand), d); renderHarbour(); }));
    pane.querySelectorAll('[data-accept]').forEach((b) => b.addEventListener('click', () => { acceptCommission(offers.find((o) => o.id === b.dataset.accept)); renderHarbour(); }));
    const rb = $('rumourBuy');
    if (rb) rb.addEventListener('click', () => {
      if (state.gold < RUMOUR_COST) return;
      state.gold -= RUMOUR_COST;
      const f = G.falseRumour(d), t = f || r.d, dist = f ? f.dist : r.dist;   // not everything a sailor says is true; nothing tells you which
      state.rumoured[t.id] = { name: t.name, x: Math.round(t.x), z: Math.round(t.z), source: `a drunk in ${d.name}`, found: false };
      if (f) state.rumoured[t.id].fake = f.variant;
      toast(`Rumour: ${t.name}, ${bearingName(t.x - pierOf(d).x, t.z - pierOf(d).z)} of here, ~${Math.round(Math.hypot(t.x - pierOf(d).x, t.z - pierOf(d).z))}. Marked on your map.`, rt.dread > 0.5, 7000);
      G.audio.play('buy'); renderHarbour();
    });
  } else if (rt.hbTab === 'market' && rt.hbPaper && paper.thisWeeks(state)) {   // the paper, open
    pane.innerHTML = paper.paperHTML(paper.thisWeeks(state)) + '<div class="qrow"><div></div><button id="foldPaper">Fold it away</button></div>';
    $('foldPaper').addEventListener('click', () => { rt.hbPaper = false; G.audio.play('ui', { vol: 0.3 }); renderHarbour(); });
    pane.scrollTop = 0;
  } else if (rt.hbTab === 'market' && d.region === 'drowned') {   // the Drowned take no coin: they give what you lack, and keep one thing (regions.js)
    const done = state.story.placeSet && state.story.placeSet[d.id] === state.dayN, take = drownedTake(state);
    html += `<div class="sec">MARKET</div><small>Nobody here will take coin.</small>`;
    html += done ? '<small>The table is cleared. Come back tomorrow.</small>' : `<div class="qrow"><div><b>${pxi('lamp')} What the ship needs</b><br><small>oil to the brim, sailcloth, the hull made good. They keep ${take ? take.label : 'nothing: the hold is empty'}.</small></div><button id="placeSet">Take it</button></div>`;
    pane.innerHTML = html;
    const ps = $('placeSet'); if (ps) ps.addEventListener('click', () => {
      const tk = drownedTake(state); if (tk) tk.take();
      state.oil = oilCap(state.upgrades); state.patchKits = 3; state.hp = G.ship.mods.maxHp;
      (state.story.placeSet = state.story.placeSet || {})[d.id] = state.dayN;
      toast(tk ? `They fill the lamp, fold sailcloth into the locker and mend the hull. They keep ${tk.label}. Nobody says thank you.` : 'They fill the lamp, fold sailcloth into the locker and mend the hull. They ask for nothing. That is worse.', true, 7000);
      G.audio.play('buy'); renderHarbour(); });
  } else if (rt.hbTab === 'market') {
    const hg = state.haggle && state.haggle.id === d.id && state.haggle.day === state.dayN ? state.haggle : null, hm = (hg ? hg.mult : 1) / G.dreamCost() * (isMarketDay() ? 1.25 : 1) * (G.threads.touched(d) ? 1.15 : 1) * G.threads.priceMul(d);
    const hr = state.time * 24, shut = d.region === 'free' && !(hr >= 19 || hr < 5);   // the Cays' stalls open after dark (regions.js)
    const fishVal = Math.round(state.catch.reduce((a, f) => a + f.value, 0) * 0.7 * (1 + 0.05 * lvl) * hm * (isFestival(d) ? 1.5 : 1) * sellMul(d, 'fish', hr));
    const fruitList = Object.entries(state.fruit).filter(([, n]) => n > 0);
    const fruitVal = Math.round(fruitList.reduce((a, [f, n]) => a + FRUITS[f].price * n, 0) * 0.7 * (1 + 0.05 * lvl) * hm * sellMul(d, 'fruit', hr));
    const ammoCost = Math.ceil(25 * discount(rep) * G.costMul() * buyMul(d, 'ammo'));
    html += `<div class="sec">STANDING HERE</div><small>${pxi('star').repeat(lvl)}${pxi('nostar').repeat(3 - lvl)}${lvl ? `  (-${lvl * 5}% prices, +${lvl * 5}% for your catch)` : '  (visit and deliver to be remembered)'}</small>`;
    html += '<div class="sec">SELL</div>' + priceNote() + (marketNote(d, hr) ? `<small>${marketNote(d, hr)}</small>` : '') + (isFestival(d) ? '<small>Festival day: fish fetch half again as much.</small>' : isMarketDay() ? '<small>Market day: everything sells for a quarter more.</small>' : '');
    if (unlocked(state, 'haggle')) html += `<div class="qrow"><div><b>${pxi('coin')} Haggle</b><br><small>${hg ? (hg.mult > 1 ? `they pay ${Math.round((hg.mult - 1) * 100)}% more today` : hg.n === 1 ? 'word got round: 20% less for your catch, everything else 10% dearer' : 'they are offended: 10% less today') : 'a talk roll, once a day: 12 or more'}</small></div>${hg ? '' : '<button id="haggle">Roll</button>'}</div>`;
    html += `<div class="qrow"><div><b>${pxi('fish')} Fish</b><br><small>${state.catch.length ? `${state.catch.length} in the hold` : 'none: slow down and press C at sea'}</small></div>${state.catch.length && !shut ? `<button id="sellFish">+${fishVal}g</button>` : ''}</div>`;
    html += `<div class="qrow"><div><b>${pxi('banana')} Fruit</b><br><small>${fruitList.length ? fruitList.map(([f, n]) => `${n} ${plural(fruitName(f, rt.dread), n)}`).join(', ') : 'none: press E at jungle isles'}</small></div>${fruitList.length && !shut ? `<button id="sellFruit">+${fruitVal}g</button>` : ''}</div>`;
    { // the Colour thread: the quiet buyer, and a market the colour has already reached
      const cb = G.threads.c, hold = state.catch.filter((f) => f.bright), bv = Math.round(hold.reduce((a, f) => a + f.value, 0) * 2.2);
      if (G.threads.touched(d)) html += '<small>The fish stalls are full of bright ones today. Nobody says where from.</small>';
      if (cb && hold.length && !cb.end) html += `<div class="sec">A QUIET BUYER</div><div class="qrow"><div><b>${pxi('fish')} The bright ones</b><br><small>a stranger in a grey coat would take ${hold.length} off your hands at more than twice the price, and not ask where</small></div><button id="sellBright">+${bv}g</button></div>`;
    }
    if (d.region === 'lantern' && G.oilOn() && state.oil > 10) { const ov = Math.round((state.oil - 10) * OIL_SELL * hm); html += `<div class="qrow"><div><b>${pxi('lamp')} Lamp oil</b><br><small>the Guild buys all but a little for the way home</small></div><button id="sellOil">+${ov}g</button></div>`; }   // the Lantern Guild buys oil (regions.js)
    if (unlocked(state, 'cannons')) html += `<div class="sec">BUY</div><div class="qrow"><div><b>${pxi('ball')} 10 cannonballs</b><br><small>you have ${state.ammo}</small></div><button id="buyAmmo" ${state.gold >= ammoCost ? '' : 'disabled'}>${ammoCost}g</button></div>`;
    if (G.oilOn()) { const kc = Math.ceil(35 * discount(rep) * G.costMul() * buyMul(d, 'kit')); html += `<div class="sec">SAILCLOTH</div><div class="qrow"><div><b>${pxi('sail')} Sail patch kit</b> <span class="kits">${[0, 1, 2].map((k) => `<i class="${k < state.patchKits ? 'on' : ''}"></i>`).join('')}</span><br><small>${state.patchKits} aboard, room for 3: mends a torn sail at sea</small></div>${state.patchKits < 3 ? `<button id="buyKit" ${state.gold >= kc ? '' : 'disabled'}>${kc}g</button>` : '<button disabled>Full</button>'}</div>`; }
    if (G.oilOn()) { const { need, cost } = G.buyOil(discount(rep) * G.costMul()); html += `<div class="sec">LAMP OIL</div><div class="qrow"><div><b>${pxi('lamp')} Fill the lantern</b><span class="gauge"><i style="width:${Math.round(state.oil / oilCap(state.upgrades) * 100)}%"></i></span><br><small>${Math.round(state.oil)} of ${oilCap(state.upgrades)}: it burns at night, in fog and in storms</small></div>${need >= 1 ? `<button id="buyOil" ${state.gold >= cost ? '' : 'disabled'}>${cost}g</button>` : '<button disabled>Full</button>'}</div>`; }
    { // the paper comes in on the Friday boat: one copy a week (newspaper.js)
      const cp = paper.thisWeeks(state);
      html += `<div class="sec">THE PAPER</div>`;
      if (cp) html += `<div class="qrow"><div><b>${pxi('letter')} ${cp.stage >= 4 ? 'The Tidings' : 'The Harbour Tidings'}</b><br><small>this week's, bought in ${cp.at}</small></div><button id="readPaper">Read</button></div>`;
      else if (paper.onSale(state)) html += `<div class="qrow"><div><b>${pxi('letter')} The Harbour Tidings</b><br><small>the weather, a face from the harbour, the news</small></div><button id="buyPaper" ${state.gold >= paper.PAPER_COST ? '' : 'disabled'}>${paper.PAPER_COST}g</button></div>`;
      else html += `<small>The paper comes in on ${paper.nextLine(state)}.</small>`;
    }
    html += `<div class="sec">SHIPYARD</div><div class="qrow"><div><b>${pxi('paint')} Paint, sails, pennants, figureheads</b></div><button id="openYard">Open</button></div>`;
    pane.innerHTML = html;
    { const bk = $('buyKit'); if (bk) bk.addEventListener('click', () => { const kc = Math.ceil(35 * discount(rep) * G.costMul() * buyMul(d, 'kit')); if (state.gold < kc || state.patchKits >= 3) return; state.gold -= kc; state.patchKits++; G.audio.play('buy'); renderHarbour(); }); }
    { const bo = $('buyOil'); if (bo) bo.addEventListener('click', () => { const { cost } = G.buyOil(discount(rep) * G.costMul()); if (state.gold < cost) return; state.gold -= cost; state.oil = oilCap(state.upgrades); G.audio.play('buy'); toast('The lantern is full.', false, 2500); renderHarbour(); }); }
    const sf = $('sellFish'); if (sf) sf.addEventListener('click', () => { state.gold += fishVal; toast(`Sold ${state.catch.length} fish for ${fishVal} gold.`);
      if (state.story.hook === 'aboard' && state.catch.some((c) => c.hooked)) { state.story.hook = 'sold'; setTimeout(() => toast('"Second one this week," says the fishmonger, and drops the hook in a jar.', false, 7000), 1600); } state.catch = []; G.audio.play('buy'); renderHarbour(); });
    const sb = $('sellBright'); if (sb) sb.addEventListener('click', () => {
      const cb = G.threads.c, hold = state.catch.filter((f) => f.bright), v = Math.round(hold.reduce((a, f) => a + f.value, 0) * 2.2);
      state.gold += v; state.catch = state.catch.filter((f) => !f.bright); if (cb) cb.end = 'sold'; addMark('salt');
      toast(`+${v} gold. He does not weigh it. He lifts it once, nods, and is not on the quay when you look again.`, false, 8000); G.audio.play('buy'); renderHarbour(); });
    { const so = $('sellOil'); if (so) so.addEventListener('click', () => { const v = Math.round((state.oil - 10) * OIL_SELL * hm); state.gold += v; state.oil = 10; G.audio.play('buy'); toast(`The Guild takes the oil: +${v} gold.`, false, 3500); renderHarbour(); }); }
    const sfr = $('sellFruit'); if (sfr) sfr.addEventListener('click', () => { state.gold += fruitVal; toast(`Sold fruit for ${fruitVal} gold.`); state.fruit = {}; G.audio.play('buy'); renderHarbour(); });
    if ($('buyAmmo')) $('buyAmmo').addEventListener('click', () => { if (state.gold < ammoCost) return; state.gold -= ammoCost; state.ammo += 10; G.audio.play('buy'); renderHarbour(); });
    $('openYard').addEventListener('click', () => G.openModal('yard'));
    { const bp = $('buyPaper'); if (bp) bp.addEventListener('click', () => {
      if (state.gold < paper.PAPER_COST || paper.thisWeeks(state) || !paper.onSale(state)) return;
      const fac = sectorAt(d.x, d.z, state.seed).faction;
      state.gold -= paper.PAPER_COST;
      const p = life.lifeOf(state).paper = paper.printPaper(state, d, { dread: rt.dread, faction: fac.id, factionName: fac.name, frontOn: unlocked(state, 'passengers') });
      rt.hbPaper = true; G.audio.play('buy'); toast(paper.BUY_LINE[p.stage], p.stage >= 3, 4000); renderHarbour(); }); }
    { const rp = $('readPaper'); if (rp) rp.addEventListener('click', () => { rt.hbPaper = true; G.audio.play('ui', { vol: 0.3 }); renderHarbour(); }); }
    const hgb = $('haggle'); if (hgb) hgb.addEventListener('click', () => {
      rollCheck(state, { label: 'Talk', kind: 'talk', dc: 12, harbour: d.id, extra: lvl ? [['standing', lvl]] : [] }, (ok, n) => {
        state.haggle = { id: d.id, day: state.dayN, n, mult: ok ? (n === 20 ? 1.5 : 1.3) : n === 1 ? 0.8 : 0.9 };
        toast(ok ? 'The fishmonger laughs and gives in.' : n === 1 ? 'The fishmonger spits on the planks. By noon the whole harbour has heard.' : 'The fishmonger folds their arms. Prices just got worse.', false, 4000); if (rt.harbourIsl) renderHarbour(); }); });
  } else if (rt.hbTab === 'tavern') {
    if (G.lifeOn()) {   // the house dish, the local game, and the old story this harbour keeps (harbourlife.js)
      const dish = life.DISHES[d.style] || life.DISHES.classic, cur = life.meal(state), dc = Math.ceil(dish.cost * G.costMul());
      html += `<div class="sec">THE HOUSE DISH</div><div class="qrow"><div><b>${pxi('fish')} ${dish.name}</b><br><small>${dish.text}, until the dawn after next${cur ? ` · you have eaten: ${Object.values(life.DISHES).find((x) => x.id === cur).name}` : ''}</small></div><button id="eatDish" ${state.gold >= dc && cur !== dish.id ? '' : 'disabled'}>${cur === dish.id ? 'Full' : `${dc}g`}</button></div>`;
      const gm = life.gameOf(d), played = life.playedToday(state, d), ev = life.isEvent(d, state);
      html += `<div class="sec">${ev ? gm.event.toUpperCase() + ' (TODAY)' : 'THE LOCAL GAME'}</div><div class="qrow"><div><b>${pxi('pip')} ${gm.name}</b><br><small>${played ? 'you have played here today' : `${gm.how} · stake 5g · ${ev ? 'double prizes today' : `double on ${life.WEEKDAYS[d.festival]}`}`}</small></div><button id="playLocal" ${!played && state.gold >= 5 ? '' : 'disabled'}>Play</button></div>`;
      const fr = life.fragmentAt(state, d, state.goals.i >= 12 && !!state.story.hutKnown);   // RULES 6: nothing about her before the hut is known
      if (fr && !fr.locked) html += `<div class="sec">AN OLD STORY</div><div class="qrow letter"><div><b>${pxi('talk')} ${fr.src}</b><br><small>the locals know you now</small></div><button id="takeFrag">Listen</button></div>`;
    }
    { // rooms are let from 17:00, you wake at 06:00 with the hull mended
      const hour = state.time * 24, open = hour >= 17 || hour < 5, bedCost = Math.ceil(8 * discount(rep) * G.costMul());
      html += `<div class="sec">ROOMS</div><div class="qrow"><div><b>${pxi('bed')} A bed for the night</b><br><small>${open ? 'sleep until 06:00, the crew mends the hull' : 'rooms are let from 17:00'}</small></div><button id="restBed" ${open && state.gold >= bedCost ? '' : 'disabled'}>${bedCost}g</button></div>`;
    }
    { // the fishers at the quay will tell you where one kind bites, once a day per harbour: the only way to be told
      const asked = state.fishAsk[d.id] === state.dayN, unheard = FISH.filter((f) => !f.dark && !state.fishHeard[f.id]);
      html += `<div class="sec">AT THE QUAY</div><div class="qrow"><div><b>${pxi('fish')} Ask the fishers</b><br><small>${asked ? 'they have said what they will for today' : unheard.length ? 'where does anything bite?' : 'you have heard it all'}</small></div><button id="askFish" ${asked || !unheard.length ? 'disabled' : ''}>Ask</button></div>`;
    }
    if (window.__BUILD !== 'demo' && G.laterOK()) { const cl = G.threads.clueLines(); if (cl.length) html += `<div class="sec">OVERHEARD</div><small>${cl[Math.abs(hash2(d.seed, state.dayN, 5)) % cl.length]}</small>`; }
    if (unlocked(state, 'crew')) { // hands for hire, and dice with the locals
      const hand = crewForHire(d, state.dayN, state, G.world);
      html += '<div class="sec">AT THE TABLES</div>';
      if (hand && !state.crew.some((c) => c.name === hand.name)) html += `<div class="qrow"><div><b>${pxi('talk')} ${hand.name}, ${hand.look}</b><br><small>${TRAITS[hand.trait].name}: ${TRAITS[hand.trait].text} · ${hand.wish.text} · stays ${hand.stay || 4} days</small></div><button id="hireHand" ${state.gold >= hand.cost && state.crew.length < 2 ? '' : 'disabled'}>${state.crew.length < 2 ? `Hire ${hand.cost}g` : 'Crew full'}</button></div>`;
      for (const c of state.crew) html += c.permanent ? `<div class="qrow"><div><b>${pxi('talk')} ${c.name}</b> <small>(${TRAITS[c.trait].name}, stays)</small></div></div>` : `<div class="qrow"><div><b>${pxi('talk')} ${c.name}</b> <small>(${TRAITS[c.trait].name}, ${G.daysLeft(c)} days left)</small></div><button data-dismiss="${c.name}">Let go</button></div>`;
      html += `<div class="qrow"><div><b>${pxi('pip')} Dice with the locals</b><br><small>first to 30 · stake 10g</small></div><button id="playPig" ${state.gold >= 10 ? '' : 'disabled'}>Sit down</button></div>`;
      rt.pendingHand = hand;
    } else html += '<small>A fiddler, a fire, a lot of very old chairs. Nobody here knows you yet.</small>';
    pane.innerHTML = html;
    { const ed = $('eatDish'); if (ed) ed.addEventListener('click', () => { const dish = life.DISHES[d.style] || life.DISHES.classic, dc = Math.ceil(dish.cost * G.costMul()); if (state.gold < dc) return; state.gold -= dc; toast(`${dish.name}. ${life.eat(state, d)} (${dish.text})`, false, 7000); G.audio.play('buy'); renderHarbour(); }); }
    { const pl = $('playLocal'); if (pl) pl.addEventListener('click', () => {
      if (state.gold < 5 || life.playedToday(state, d)) return; state.gold -= 5; const isl = rt.harbourIsl, gm = life.gameOf(d);
      G.openModal('local'); rt.harbourIsl = isl;
      G.localGames.open(gm.id, life.isEvent(d, state) ? gm.event.toUpperCase() : gm.name.toUpperCase(), (tier, finished) => {
        const pr = life.gamePrize(d, state, finished ? tier : 0);
        if (pr.gold) state.gold += pr.gold + 5;
        if (pr.ev && tier === 2) life.news(state, 'game', { where: d.name, game: gm.event, at: d.id });
        setTimeout(() => { rt.harbourIsl = isl; rt.hbTab = 'tavern'; if (rt.modal === 'local' || !rt.modal) { G.closeModal(true); rt.harbourIsl = isl; G.openModal('harbour'); }
          if (pr.gold) toast(`+${pr.gold + 5} gold${pr.ev ? ' (festival prize)' : ''}${pr.keep ? `. And a keepsake: ${pr.keep.name}.` : ''}`, false, 6000); }, 30);
      }); }); }
    { const tf = $('takeFrag'); if (tf) tf.addEventListener('click', () => { const fr = life.fragmentAt(state, d, true); if (!fr || fr.locked) return; const n = life.takeFragment(state, d, fr);
      toast(fr.text, true, 14000); setTimeout(() => toast(`Written in your journal. (${n} of ${life.FRAG_TOTAL} old stories)`, false, 5000), 1500);
      if (fr.mara) setTimeout(() => toast('Mara does not say anything for a long while.', false, 6000), 7000);   // her village, in an earlier dream; she never explains
      G.audio.play('ui'); renderHarbour(); }); }
    $('restBed').addEventListener('click', () => restAtTavern(Math.ceil(8 * discount(rep) * G.costMul())));
    const af = $('askFish'); if (af) af.addEventListener('click', () => {
      const cl = G.threads.c;
      if (cl && !cl.found && !cl.rumoured && state.fishAsk[d.id] !== state.dayN && Math.random() < 0.5) { cl.rumoured = true; state.fishAsk[d.id] = state.dayN; toast(`A fisher at the quay: "Out by ${cl.src.name} the water has gone a shade I have no word for. The fish there are too big. Nobody has eaten one twice."`, false, 11000); G.audio.play('ui'); renderHarbour(); return; }
      const unheard = FISH.filter((f) => !f.dark && !state.fishHeard[f.id]); if (!unheard.length || state.fishAsk[d.id] === state.dayN) return;
      const f = unheard[Math.floor(Math.random() * unheard.length)];
      state.fishHeard[f.id] = true; state.fishAsk[d.id] = state.dayN;
      toast(`A fisher at the quay: "${HABITAT[f.id].say}" (Fisherman's log)`, false, 9000); G.audio.play('ui'); renderHarbour();
    });
    const hh = $('hireHand'); if (hh) hh.addEventListener('click', () => {
      const h = rt.pendingHand; if (!h || state.gold < h.cost || state.crew.length >= 2) return;
      state.gold -= h.cost; G.signOn(h, h.stay || 4); G.audio.play('buy'); toast(`${h.name} signs on. ${h.name} nods once and says nothing.`, false, 5000); G.objectives.remark('crew', rt.dread); renderHarbour(); });
    pane.querySelectorAll('[data-dismiss]').forEach((b) => b.addEventListener('click', () => { state.crew = state.crew.filter((c) => c.name !== b.dataset.dismiss); toast(`${b.dataset.dismiss} goes ashore with a small wave.`); renderHarbour(); }));
    if ($('playPig')) $('playPig').addEventListener('click', () => { if (state.gold < 10) return; state.gold -= 10; state.stats.pig = (state.stats.pig || 0) + 1; const isl = rt.harbourIsl; G.openModal('pig'); rt.pigHome = isl; G.pig.start(G.LOCALS[Math.floor(Math.random() * G.LOCALS.length)], 10); });
  } else {
    if (rt.hbShipLine) html += `<p class="quote">${rt.hbShipLine}</p>`;
    html += priceNote();   // the shipwright talks here, not over the welcome
    // one card per upgrade: icon, level, what you have, what the next level gives, what it opens up, the price
    html += '<div class="upgrid">' + UPGRADES.map((u) => {
      const lv = state.upgrades[u.id], maxed = lv >= MAX_LEVEL, C = UP_CARD[u.id] || {};
      const cost = maxed ? 0 : upCost(u, lv, rep), can = !maxed && state.gold >= cost, opens = !maxed && C.opens && C.opens[lv + 1];
      const now = lv ? u.text[lv - 1].split(':')[0] : C.stock;
      const pips = Array.from({ length: MAX_LEVEL }, (_, k) => `<i class="${k < lv ? 'on' : ''}${k === lv - 1 && rt.upFlash === u.id ? ' pop' : ''}"></i>`).join('');
      return `<div class="upc${maxed ? ' max' : ''}${can ? '' : ' poor'}${rt.upFlash === u.id ? ' bought' : ''}">
        <div class="upi">${pxi(C.icon || 'sail')}</div>
        <div class="upb"><div class="upt"><b>${u.name}</b><span class="lvp">${pips}</span></div>
          <div class="upnow">Now: ${now}</div>
          ${maxed ? '<div class="upnext done">The finest there is.</div>' : `<div class="upnext">${u.text[lv]}</div>`}
          ${opens ? `<div class="upopen">${pxi('open')}${opens}</div>` : ''}</div>
        <div class="upbuy">${maxed ? '<span class="upmax">MASTERWORK</span>' : `<button data-id="${u.id}" ${can ? '' : 'disabled'}>${pxi('coin')}${cost}</button>${can ? '' : `<small class="short">${cost - state.gold} short</small>`}`}</div>
      </div>`;
    }).join('') + '</div>';
    pane.innerHTML = html;
    pane.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => buyUpgrade(b.dataset.id)));
    rt.upFlash = null;
  }
  lockPane(state, $('hbPane'));   // what the story has not reached yet is greyed out (gates.js)
  tutorialMarks();
}
// someone at this harbour asking for passage (the board shows them; the same one every time you look today)
export function passengerAt(d) {
  return !state.passenger && unlocked(state, 'passengers') && makePassenger(G.world, d, (state.serial[d.id + '#p'] || 0) + state.dayN * 7, !!(G.objectives.current && G.objectives.current.id === 'passenger'));
}
export function tutorialMarks() {
  let g = tutorialGoal();
  if (g && g.id === 'job' && state.job && rt.harbourIsl && state.job.toId !== rt.harbourIsl.desc.id) g = null;   // accepted already: nothing to press here
  if (g && g.id === 'dig' && (state.story.letterP1 !== 'wait' || !rt.harbourIsl || rt.harbourIsl.desc.id !== '0,-1')) g = null;   // only while Perrin's letter waits, and only at Tama
  // always marked, tutorial or not: a letter waiting for you here (Perrin's), and a passenger asking for passage. Both sit on the board
  const always = rt.harbourIsl ? [...(lettersAt(rt.harbourIsl.desc).length ? ['takeLetter'] : []), ...(passengerAt(rt.harbourIsl.desc) && isOpen(state, 'btn', 'takePass') && !(state.stats.passengers || 0) && !state.passenger ? ['takePass'] : [])] : [];
  const seen = state.story.uiSeen || (state.story.uiSeen = {});
  $('hbTabs').querySelectorAll('.post').forEach((b) => {
    const t = b.dataset.t, open = isOpen(state, 'tab', t);
    b.classList.toggle('locked', !open);
    b.classList.toggle('fresh', open && t !== 'board' && t !== 'sail' && !seen[t]);   // just opened: it glows until you look inside once
    b.classList.toggle('next', open && ((!!g && t === g.tab) || (always.length > 0 && t === 'board')));
  });
  $('hbPane').querySelectorAll('.hl').forEach((e) => e.classList.remove('hl'));
  if (rt.hbTab === 'board') for (const id of always) { const el = $(id); if (el && !el.disabled && !el.classList.contains('locked')) el.classList.add('hl'); }
  if (!g || rt.hbTab !== g.tab) return;
  for (const id of g.mark || []) {
    const el = id === 'buy' ? $('hbPane').querySelector('button[data-id]:not([disabled]):not(.locked)') : $(id);
    if (el && !el.disabled && !el.classList.contains('locked')) el.classList.add('hl');
  }
}
// ---- letters: Perrin's riddle and his notes wait at the Tama board as a letter. Nothing is handed over until the player takes it.
export function lettersAt(d) {
  const out = [];
  if (d.id === '0,-1') {
    if (state.story.letterP1 === 'wait') out.push({ key: 'letterP1', title: 'A letter from Old Perrin', sub: 'sealed, left with the harbourmaster' });
    if (state.story.letterP2 === 'wait') out.push({ key: 'letterP2', title: 'Another letter from Old Perrin', sub: 'the harbourmaster waves it at you' });
  }
  return out;
}
// ---- ship's companions: a stray cat on the pier and a gull on a piling. Optional, harbour events, never needed for anything.
export const PETS = {
  cat: { title: 'A ginger cat on the pier', sub: 'she has been watching your ship all morning', btn: 'Take her aboard', toast: 'The cat steps aboard as if she had paid for the ticket.' },
  gull: { title: 'A gull on the piling', sub: 'it eyes your catch and not much else', btn: 'Offer a fish', toast: 'The gull hops onto the rail. It has opinions about your sailing.' },
};
export const companions = {};
export function addCompanion(kind) { if (!companions[kind]) companions[kind] = new Companion(G.ship, kind, hash2(state.seed, kind === 'cat' ? 5 : 6, 1)); return companions[kind]; }
/** which companion (if any) waits at this harbour: Tama has the cat, Velto the gull, other harbours roughly two in seven */
export function petOffer(d) {
  if (!G.laterOK()) return null;
  const own = state.story.pets || {};
  const k = d.id === '0,-1' ? 'cat' : d.id === '-2,-1' ? 'gull' : [ 'cat', 'gull' ][hash2(d.seed, 31, 7) % 7];
  return k && PETS[k] && !own[k] ? k : null;
}
export function takePet(kind) {
  state.story.pets = { ...(state.story.pets || {}), [kind]: 1 };
  addCompanion(kind); G.audio.play('discover'); toast(PETS[kind].toast, false, 6000); G.autosave();
}
export function takeLetter(key) {
  state.story[key] = 'taken'; G.audio.play('ui');
  const mate = G.objectives.mate;
  if (key === 'letterP1') {
    G.giveMap('1,-1', 'Old Perrin', true, true);   // no pile of text: Mara asks what you have, then sends you to the log
    rt.openLetter = { from: 'Old Perrin', text: `“${state.riddles['1,-1'] || ''}”` };
    mate.say('A letter? What have you got there, Captain?'); mate.say('He has sent you a riddle. Press M and open your orders to read it.'); rt.logTab = 'riddles';
    state.story.tabMark = 'riddles'; state.story.riddleLine = 'wait';
  } else if (key === 'letterP2') {
    G.perrinNote(true);
    { const n = state.notes[state.notes.length - 1]; if (n) rt.openLetter = { from: 'Old Perrin', text: n.text.replace(/^Perrin: /, '') }; }
    mate.say('Another letter from Perrin? Open your log with M: it is at the top of the Ship\'s book.'); rt.logTab = 'journal';
    state.story.tabMark = 'journal'; state.story.noteLine = 'wait';
  }
}
/** the log was opened on a tab: if Mara sent you there, she answers (once) and the mark goes */
export function tabOpened(tab) {
  const st = state.story;
  if (st.tabMark === tab) st.tabMark = null;
  if (tab === 'riddles' && st.riddleLine === 'wait') { st.riddleLine = 'done'; G.objectives.say('Perrin and his riddles! Find the shore it describes, then stop there and press E.'); }
  if (tab === 'journal' && st.noteLine === 'wait') { st.noteLine = 'done'; G.objectives.say('He wants us to check his chart. Read the note, then go and look.'); }
}
export function postBadges(d, rep) {
  let due = (state.job && state.job.toId === d.id ? 1 : 0) + (state.passenger && state.passenger.toId === d.id ? 1 : 0);
  due += state.quests.filter((x) => x.giverId === d.id && questProgress(x, state) >= questNeed(x)).length;
  const goods = state.catch.length + Object.values(state.fruit).reduce((a, n) => a + n, 0);
  const canUp = UPGRADES.some((u) => state.upgrades[u.id] < MAX_LEVEL && state.gold >= upCost(u, state.upgrades[u.id], rep));
  const set = (t, v) => { $('hbTabs').querySelector(`[data-t="${t}"] em`).textContent = v || ''; };
  set('board', due); set('market', goods);
  if (lettersAt(d).length) $('hbTabs').querySelector('[data-t="board"] em').innerHTML = pxi('letter');   // a little letter on the sign set('tavern', ''); set('wright', canUp ? '!' : ''); set('sail', '');
}
export function showGreeting(d, say) {
  const isl = rt.harbourIsl;
  G.openModal('greet'); rt.harbourIsl = isl;
  G.greetEl.classList.toggle('dark', !!say.dark);
  $('grName').textContent = d.name; $('grFace').src = portrait(say.speaker); $('grWho').textContent = speakerName(say.speaker);
  $('grTxt').textContent = ''; $('grMore').classList.remove('on');
  rt.greetNow = { say, shown: 0, timer: setInterval(() => {
    const t = rt.greetNow.say.text; rt.greetNow.shown++; greetText(t.slice(0, rt.greetNow.shown), say.slow);
    if (rt.greetNow.shown % 3 === 1 && /[A-Za-z0-9]/.test(t[rt.greetNow.shown - 1] || '')) G.audio.blip(!!say.dark, true);   // the villager's voice, softly
    if (rt.greetNow.shown >= t.length) { clearInterval(rt.greetNow.timer); rt.greetNow.timer = null; $('grMore').classList.add('on'); }
  }, say.slow ? 1300 : say.slowWord ? 320 : 34) };   // the stare: one dot at a time, slowly
}
export function greetText(t, dots) {
  if (dots) $('grTxt').innerHTML = '<i class="gdot"></i>'.repeat(t.length); else $('grTxt').textContent = t;
}
export function greetAdvance() {
  if (!rt.greetNow) return;
  if (rt.greetNow.timer) { clearInterval(rt.greetNow.timer); rt.greetNow.timer = null; greetText(rt.greetNow.say.text, rt.greetNow.say.slow); $('grMore').classList.add('on'); return; }
  const said = rt.greetNow.say; rt.greetNow = null;
  if (said.endsDemo && state.story.demoEnd === 'pending') {   // someone spoke of the throw: that is where the demo ends
    state.story.demoEnd = 'done'; G.closeModal(); setTimeout(G.showDemoEnd, 1800); return;
  }
  const isl = rt.harbourIsl; G.closeModal(true); rt.harbourIsl = isl;
  $('hbSaid').textContent = ''; { const q = $('hbLine'); q.textContent = said.slow ? '' : `"${said.text}"`; q.style.display = said.slow ? 'none' : 'block'; }   // the line stays at the top of the board panel while you are ashore
  G.openModal('harbour');
}
export function buyUpgrade(id) {
  const u = UPGRADES.find((x) => x.id === id), lv = state.upgrades[id];
  const cost = u && lv < MAX_LEVEL ? upCost(u, lv, repOf(state, rt.harbourIsl.desc.id)) : 0;
  if (!u || lv >= MAX_LEVEL || state.gold < cost) return;
  state.gold -= cost;
  state.upgrades[id] = lv + 1;
  G.refreshMods();
  if (id === 'hull') state.hp = G.ship.mods.maxHp;
  G.audio.play('buy');
  toast(`${u.name} upgraded to level ${lv + 1}`, rt.dread > 0.5);
  rt.upFlash = id; renderHarbour();
  { const gEl = $('hbGold'); gEl.classList.remove('spent'); void gEl.offsetWidth; gEl.classList.add('spent'); }
}

/** boot code that ran at this point in main.js; main.js calls it in the same place */
export function initHarbour() {
  upCost = (u, lv, rep) => Math.ceil(u.cost[lv] * UP_MUL[lv] * discount(rep) * G.costMul());
  rt.hbTab = 'board', rt.hbPaper = false;   // hbPaper: the Friday paper lies open on the market pane
  $('hbTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || !rt.harbourIsl) return; if (b.dataset.t === 'sail') { G.closeModal(); return; } if (!isOpen(state, 'tab', b.dataset.t)) return; rt.hbTab = b.dataset.t; rt.hbPaper = false; (state.story.uiSeen || (state.story.uiSeen = {}))[rt.hbTab] = true; G.audio.play('ui', { vol: 0.4 }); renderHarbour(); });
  // a red number on a sign when something waits there
  // the tutorial marks the sign (and the button) the current goal needs; goals later in the story carry no mark at all
  tutorialGoal = () => { const g = G.objectives.current; if (!g || !g.tab) return null; try { if (g.check({ state, ship: G.ship, world: G.world })) return null; } catch (e) { /* not checkable yet */ } return g; };   // a goal already done carries no mark
  // a control the story has not opened yet (gates.js) still answers a click: one short line, and nothing else happens
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('.locked'); if (!el) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const sign = el.closest('#hbTabs'), tab = el.closest('#logTabs');
    toast(tab ? 'Those pages are still blank.' : sign ? `The ${(el.firstChild ? el.firstChild.textContent : 'door').trim().toLowerCase()} is shut to us for now. It opens later in the voyage.` : 'Not yet. This opens later in the voyage.', false, 2600);
    G.audio.play('ui', { vol: 0.25 });
  }, true);
  // pressing a marked button clears every mark at once (the goal catches up a moment later)
  $('hbPane').addEventListener('click', (e) => { if (e.target.closest('.hl')) { $('hbPane').querySelectorAll('.hl').forEach((x) => x.classList.remove('hl')); $('hbTabs').querySelectorAll('.next').forEach((x) => x.classList.remove('next')); } }, true);
  for (const k of Object.keys(state.story.pets || {})) if (PETS[k]) addCompanion(k);   // companions from an earlier session
  rt.openLetter = null;   // the letter just taken lies open on the board until the captain leaves the harbour
  // one quiet line when the Lady's last throw moved the prices; nobody says why
  priceNote = () => { const k = G.dreamCost(); return k > 1 ? '<small>Prices are up today. Nobody says why.</small>' : k < 1 ? '<small>Prices are down today. Everyone seems to have slept well.</small>' : ''; };
  rt.harbourLine = '', rt.hbShipLine = '';
  // the greeting: a villager's line types out in a box like Mara's, then the harbour menu comes up
  rt.greetNow = null;
  $('grBox').addEventListener('click', () => greetAdvance());
  rt.upFlash = null;   // the card just bought: it flashes gold once
}
