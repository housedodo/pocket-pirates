// Hailing other ships at sea: whether they answer (your standing in these waters), what they offer, and the trade screen.
import { clamp, mulberry32 } from '../util.js';
import { stageOf } from '../palette.js';
import { lootFor, bottleNote } from '../lore.js';
import { makeJob, findRumour, friendLevel, bearingName, nearby, FRUITS, sellable } from '../jobs.js';
import { KINDS } from '../traffic.js';
import { tod } from '../daynight.js';
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { $, toast } from './dom.js';
import { pxi } from '../pixelui.js';
import { crewOffers, crewOffer, crewLine } from '../systems/raiders.js';
import { hailNews } from '../systems/news.js';

export let hailChance;   // set by the init function(s) below, at the point in boot where main.js had them

// ---------------------------------------------------------------- hailing other ships
export function localStanding(x, z) {
  let max = 0, sum = 0;
  for (const [id, r] of Object.entries(state.rep)) {
    const [cx, cz] = id.split(',').map(Number), d = G.world.desc(cx, cz);
    if (!d || Math.hypot(d.x - x, d.z - z) > 450) continue;
    const l = friendLevel(r); max = Math.max(max, l); sum += l;
  }
  return { max, sum };
}
export const REFUSALS = ['The crew glances at you and looks away.', 'A sailor waves you off. They are not in the mood.', 'The captain pretends not to hear you.', 'They hoist a little more sail and leave you behind.'];
export function hailShip(sh) {
  const rng = mulberry32(sh.seed);
  state.stats.hails++;
  if (sh.crew) { sh.offers = null; startHail(sh); return; }   // a raider crew: what she wants (systems/raiders.js)
  if (sh.hostile && sh.hp > 0) { sh.state = 'open'; startHail(sh); return; }
  if (sh.special === 'regatta') { sh.state = 'done'; toast('They wave without slowing down. It is a race, and they are winning.', false, 5000); return; }
  if (sh.special === 'market') { sh.state = 'open'; startHail(sh); return; }
  if (sh.mode === 'derelict') {
    sh.state = 'done';
    const loot = G.abyss.wrongLoot(lootFor(rng, rt.dread), state); loot.value = Math.round(loot.value * 0.6);
    loot.name = `From the drifting ${KINDS[sh.kind].label}: ${loot.name}`;
    state.gold += loot.value; state.loot.push(loot);
    toast(`You board the empty ship and find: ${loot.name} (+${loot.value}g)`, true, 7000);
  } else if (sh.mode === 'ghost') {
    sh.state = 'done';
    toast('Your hail comes back as your own voice, from a very long way off.', true, 6000);
  } else if (sh.roll < hailChance(sh)) {
    sh.state = 'open'; startHail(sh);
  } else {
    sh.state = 'refused';
    const hint = localStanding(sh.x, sh.z).max < 1 ? ' (Perhaps they would listen if you were better known in these waters.)' : '';
    toast(REFUSALS[Math.floor(rng() * REFUSALS.length)] + hint, false, 6000);
  }
}
export const FACTION_GREET = {
  crown: 'Ahoy! The Crown Traders always have time for honest custom.',
  free: 'The Free Cays welcome you, friend! Come aboard, metaphorically.',
  reef: 'Make it quick. We have somewhere to be, and none of it is here.',
  lantern: 'The Lantern Guild keeps the lamps burning. State your business.',
};
export function shipOffers(sh) {
  if (sh.crew) return crewOffers(sh);
  if (sh.offers) return sh.offers;
  if (sh.hostile) return (sh.offers = [
    { id: 'tribute', label: 'Pay tribute', cost: 30 + Math.round(KINDS[sh.kind].scale * 15), desc: 'they take the coin and let you pass in peace', used: false },
    { id: 'bluff', label: 'Bluff', cost: 0, desc: 'they may believe you have a fleet behind you... or open fire', used: false },
    { id: 'defy', label: 'Defy them', cost: 0, desc: 'press Space to fire once they are in range', used: false },
  ]);
  if (sh.special === 'market') return (sh.offers = [
    { id: 'sellall', label: 'Sell your catch aboard', cost: 0, desc: 'fish and fruit fetch a third more than ashore', used: false },
    { id: 'mchart', label: 'A hand-drawn chart', cost: 25, desc: 'the islands round here, as the traders know them', used: false },
    { id: 'oddment', label: 'An oddment from the back', cost: 12, desc: 'nobody remembers where it came from', used: false },
  ]);
  const rng = mulberry32(sh.seed + 11), pool = [];
  if (findRumour(G.world, { x: sh.x, z: sh.z }, state)) pool.push({ id: 'chart', label: 'Sea-chart scrap', cost: 35, desc: 'marks a treasure isle on your map' });
  pool.push({ id: 'supplies', label: 'Fresh supplies', cost: 25, desc: '+15% speed for 3 minutes' });
  pool.push({ id: 'rum', label: 'Rum rations', cost: 20, desc: 'your crew digs 30% faster for 3 minutes' });
  pool.push({ id: 'news', label: 'Swap news', cost: 0, desc: 'the weather, and how the harbours she came from are doing' });
  pool.push({ id: 'tale', label: 'Swap tall tales', cost: 0, desc: 'you jot one down in your journal' });
  if (nearby(G.world, sh.x, sh.z, 0, 700, 'harbour').length) pool.push({ id: 'message', label: 'Carry a message', cost: 0, desc: 'a delivery job for a nearby harbour' });
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  { const ni = pool.findIndex((o) => o.id === 'news'); if (ni > 2 && Object.keys(state.discovered).length) [pool[2], pool[ni]] = [pool[ni], pool[2]]; }   // she always has news of the harbours (systems/news.js)
  sh.offers = pool.slice(0, 3).map((o) => ({ ...o, used: false }));
  return sh.offers;
}
// First they speak, then you choose (owner, 2026-11-26: "just like how Mara or a passenger would talk... first a conversation, then the
// options appear at the bottom while the game is visible"): their words go through Mara's speech box under their own name, the game
// running; when they have said it, the choices come up as a strip across the foot of the screen.
function spoken(t) {   // only what they say (owner, 2026-11-26): the words inside the quotes, without the narration round them
  const m = t.match(/["\u201c]([^"\u201d]+)["\u201d]/g); return m ? m.map((q) => q.slice(1, -1)).join(' ') : t;
}
function lineFor(sh) {
  return sh.crew ? spoken(crewLine(sh)) : sh.special === 'market' ? 'Everything must go. Everything always goes. Come aboard, Captain.' : sh.hostile ? 'Nice ship. Shame if something happened to it. A little tribute, perhaps?' : (FACTION_GREET[sh.faction.id] || 'Ahoy!');
}
function startHail(sh) {
  if (rt.hailPending) return;   // already speaking: a second E does not queue her again (owner: "I could not do anything")
  const m = G.objectives && G.objectives.mate;
  if (sh.crewDerelict) { rt.tradeShip = sh; G.openModal('ship'); return; }   // the Widow adrift: nobody answers, so nobody speaks (audit 2026-11-26)
  if (!m) { rt.tradeShip = sh; G.openModal('ship'); return; }
  m.queue.unshift({ text: lineFor(sh), dark: sh.crew === 'collectors', who: sh.name, hail: true });
  rt.hailPending = sh;
}
/** each frame (main.js): once they have said it (and a beat to read it), the choices */
export function hailTick() {
  const sh = rt.hailPending; if (!sh) return;
  const m = G.objectives.mate;
  if (sh.sinking || Math.hypot(sh.x - G.ship.pos.x, sh.z - G.ship.pos.z) > 90) { rt.hailPending = null; rt.hailTyped = null; m.queue = m.queue.filter((q) => !q.hail); if (sh.state === 'open') sh.state = 'none'; return; }   // gone, or you sailed off: she can be hailed again
  const typed = m.cur && m.cur.hail && m.shown >= m.cur.text.length;
  if (typed && rt.hailTyped == null) rt.hailTyped = rt.tNow;
  const talking = m.queue.some((q) => q.hail) || (m.cur && m.cur.hail && (!typed || rt.tNow - rt.hailTyped < 1.3));   // a beat after her last word, not Mara's long reading pause
  if (talking || rt.modal) return;
  if (m.cur && m.cur.hail) { m.cur = null; if (!m.queue.length) m.el.style.display = 'none'; }   // said: the box gives way to the choices
  rt.hailPending = null; rt.hailTyped = null; rt.tradeShip = sh; G.openModal('ship');
}
export function renderShipTrade() {
  const sh = rt.tradeShip;
  $('shName').textContent = sh.name;
  $('shLine').textContent = sh.crew ? crewLine(sh) : sh.special === 'market' ? 'A trader leans on the rail among the lanterns: "Everything must go. Everything always goes. Come aboard, captain."' : sh.hostile ? 'The raider captain grins: "Nice ship. Shame if something happened to it. A little tribute, perhaps?"' : (FACTION_GREET[sh.faction.id] || 'Ahoy!');
  $('shGold').textContent = state.gold;
  // the choices (owner, 2026-11-26): two or three, never more; what cannot be done is not shown; a price only where something is paid
  const all = shipOffers(sh).map((o, i) => ({ o, i })).filter(({ o }) => !o.used && !o.hidden);
  { const h = shipOffers(sh).findIndex((o) => o.hidden && !o.used); rt.shRefuse = h >= 0 ? h : null; }   // closing a pay-only hail is refusing it
  const shown = all.length > 3 ? [...all.slice(0, 2), all[all.length - 1]] : all;
  $('shList').innerHTML = shown.map(({ o, i }, k) => { const short = o.cost > state.gold;
    return `<button class="ch${o.must ? ' must' : ''}" data-i="${i}" ${short ? 'disabled' : ''}><span class="k">${k + 1}</span><span class="lb">${o.label}<small>${short ? `you have ${state.gold} of ${o.cost}` : o.desc}</small></span>${o.cost ? `<span class="cost">${pxi('coin')}${o.cost}</span>` : ''}</button>`; }).join('');
  $('shList').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => doOffer(parseInt(b.dataset.i, 10))));
  $('shipmodal').classList.toggle('dark', sh.crew === 'collectors' || rt.dread > 0.5);
  $('shClose').textContent = shown.length === 1 && shown[0].o.must ? 'Refuse anyway' : 'Wave goodbye';
}
G.shipOffer = (i) => doOffer(i);
export function doOffer(i) {
  const sh = rt.tradeShip, o = shipOffers(sh)[i];
  if (!o || o.used || state.gold < o.cost) return;
  const rng = mulberry32(sh.seed + 77 + i);
  if (sh.crew && crewOffer(sh, o)) { state.gold -= o.cost; o.used = true; if (sh.state === 'none') sh.offers = null; if (rt.modal === 'ship') G.closeModal(); return; }   // a named ship's meeting ends with the choice (audit 2026-11-26: one paid toll could then be refused)
  const idx = stageOf(rt.dread);
  if (o.id === 'sellall') {
    const sale = sellable(state);   // what an errand in hand needs stays aboard (G-08)
    const fish = sale.fish.reduce((a, f) => a + f.value, 0) * 0.7, fruit = Object.entries(sale.fruit).reduce((a, [f, n]) => a + FRUITS[f].price * n, 0) * 0.7, v = Math.round((fish + fruit) * 1.33);
    if (!v) { toast('Nothing in the hold to sell. They are very polite about it.'); return; }
    state.gold += v; state.catch = sale.fishLeft; state.fruit = { ...sale.fruitLeft }; toast(`Sold your hold aboard the market for ${v} gold.`); G.audio.play('buy');
  } else if (o.id === 'mchart') {
    const k = G.revealAround(sh.x, sh.z); toast(k ? `A hand-drawn chart: ${k} island${k > 1 ? 's' : ''} added to your map.` : 'You know these waters already. It is a lovely drawing.', false, 6000);
  } else if (o.id === 'oddment') {
    const odd = ['a brass button that is always cold', 'a spoon with a second, smaller bowl', 'a map of a room you have not been in', 'a bell the size of a thumb. It rings when nobody touches it'];
    const it = odd[Math.floor(rng() * odd.length)]; state.loot.push({ name: `From the floating market: ${it}`, value: 0, dark: false }); toast(`An oddment: ${it}.`, false, 6000);
  } else if (o.id === 'tribute') { sh.hostile = false; sh.engaged = false; toast('The raiders take your coin, grinning, and sail on.'); }
  else if (o.id === 'bluff') {
    if (Math.random() < 0.45) { sh.hostile = false; sh.engaged = false; toast('The raiders squint at the horizon, then think better of it.'); }
    else { sh.fireCd = 0.3; toast('They laugh, and open fire!'); }
  } else if (o.id === 'defy') { toast('You hoist your colours. Fire when ready (Space).'); }
  else if (o.id === 'chart') {
    const r = findRumour(G.world, { x: sh.x, z: sh.z }, state);
    if (!r) return;
    state.rumoured[r.d.id] = { name: r.d.name, x: Math.round(r.d.x), z: Math.round(r.d.z), source: `the ${sh.name}`, found: false };
    toast(`Chart scrap: ${r.d.name} lies ${bearingName(r.d.x - sh.x, r.d.z - sh.z)} of here. It is marked on your map.`, false, 7000);
  } else if (o.id === 'supplies') { state.buffs.speed = 180; toast('Fresh supplies stowed: the ship feels lighter.'); }
  else if (o.id === 'rum') { state.buffs.dig = 180; toast('Rum rations handed out: the crew is in high spirits.'); }
  else if (o.id === 'news') {
    const lines = [G.wind.fromName ? `Winds from the ${G.wind.fromName}, they say, and shifting.` : '', G.weather.storm > 0.3 || G.weather.stormAhead > 0.3 ? 'Watch the evening sky. Red means a blow.' : G.weather.rain > 0.3 ? 'Rain all week out east.' : 'Fair skies for the next day or so.', tod.night > 0.5 ? 'Keep to the lit harbours after dark.' : 'Lighthouses burn only after dusk, so mind your hour.'];
    const hn = hailNews(sh, rng);   // the harbours she came from, written on your chart (systems/news.js)
    toast(`News from the ${sh.name}: ${lines[Math.floor(rng() * lines.length)]}${hn ? ' ' + hn : ''}`, !!(hn && hn.includes('tomorrow')), hn ? 10000 : 7000);
  } else if (o.id === 'tale') {
    const text = bottleNote(rng, idx);
    state.notes.push({ text, dark: idx >= 2 });
    toast(`A tall tale, written in your journal: "${text}"`, idx >= 2, 8000);
  } else if (o.id === 'message') {
    if (state.job) { toast('You already have a delivery to make.'); return; }
    const from = nearby(G.world, sh.x, sh.z, 0, 700, 'harbour').sort((a, b) => a.dist - b.dist)[0].d;
    const j = makeJob(G.world, from, (state.serial[from.id] || 0) + 100 + sh.id);
    if (!j) { toast('They have nothing to send right now.'); return; }
    j.fromName = `the ${sh.name}`; j.reward = Math.round(j.reward * 0.8);
    state.job = j;   // (a ship's delivery is never timed)
    toast(`Message taken: deliver ${j.item} to ${j.toName} (+${j.reward}g)`, j.dark, 7000);
  }
  state.gold -= o.cost; o.used = true;
  if (o.id === 'tribute' || o.id === 'bluff' || o.id === 'defy') { G.closeModal(); return; }   // a raider's answer ends the talk (paid, bluffed, or guns)
  renderShipTrade();
}

/** boot code that ran at this point in main.js; main.js calls it in the same place */
export function initShipTrade() {
  hailChance = (sh) => { const st = localStanding(sh.x, sh.z); return clamp(0.28 + 0.14 * st.max + 0.03 * Math.min(6, st.sum) + sh.faction.mood, 0.1, 0.88); };
}
