// Encounters: sea encounter cards and their dice, the pig game, Mara's mood for the cards, one-time caves on their own screen, crew
// who sign on for a few days and their wishes. Called from main.js (the timer in frame(), E on a sign at sea) and the harbour screens.
import * as THREE from 'three';
import { CAVES } from '../caves.js';
import { CaveScene, caveLook } from '../cavescene.js';
import { findRumour, repOf, friendLevel, bearingName } from '../jobs.js';
import { unlocked } from '../objectives.js';
import { tod } from '../daynight.js';
import { TRAITS, hasTrait, rollCheck, drawCard, renderCard, Pig, setAdvProvider } from '../tabletop.js';
import { FISH } from '../fishing.js';
import { SIGHTS } from '../sighting.js';
import { LocalGames } from '../localgames.js';
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { $, toast } from './dom.js';
import { markFromRoll } from '../systems/storyflags.js';

export let localGames, pig, caveScene, COLOUR_DEEP, COLOUR_SHALLOW, daysLeft;   // set by the init function(s) below, at the point in boot where main.js had them

// ---------------------------------------------------------------- tabletop: encounter cards, crew wishes, dice
export const LOCALS = ['a one-eyed net-mender', 'the harbourmaster\'s aunt', 'a sunburnt docker', 'a very calm child', 'a fisherman who smells of tar'];
export function cardCtx() {
  return {
    state, FISH,
    hurt: (n) => G.hurtPlayer(n),
    glitch: () => { rt.preGlitch = rt.dread; rt.glitchT = 0.75; rt.shake = 0.4; },
    repNear: () => { const h = G.world.nearest(G.ship.pos.x, G.ship.pos.z, 900, ['harbour']); if (h) repOf(state, h.desc.id).deliveries++; },
    rumour: (src) => { const r = findRumour(G.world, { x: G.ship.pos.x, z: G.ship.pos.z }, state); if (!r) return null;
      state.rumoured[r.d.id] = { name: r.d.name, x: Math.round(r.d.x), z: Math.round(r.d.z), source: src, found: false };
      return `A map: treasure on ${r.d.name}, ${bearingName(r.d.x - G.ship.pos.x, r.d.z - G.ship.pos.z)} of here. Marked on your chart.`; },
    castaway: () => {
      if (state.crew.length >= 2) { cardCtx().repNear(); return 'They are dropped off at the next harbour with a story to tell. Your crew is full.'; }
      const ids = Object.keys(TRAITS), names = ['Wren', 'Old Ibbs', 'Salt Annie', 'Gus'];
      const c = { name: names.find((n) => !state.crew.some((x) => x.name === n)) || 'Gus', look: 'still salty from the raft', trait: ids[Math.floor(Math.random() * ids.length)], wish: { kind: 'volcano', text: 'wants to see a fire mountain', done: false }, cost: 0 };
      signOn(c, 3); return `${c.name} climbs aboard, drinks a whole bucket of water, and picks up a rope. (${TRAITS[c.trait].name} joins the crew.)`;
    },
  };
}
// Mara's mood, from how the voyage has treated her: cheerful (rested within two days, hull sound, the water still bright),
// rattled (a battered hull or the water gone wrong), steady otherwise. Cheerful and rattled tip sea and luck rolls.
export function maraMood() {
  const hull = state.hp / Math.max(1, G.ship.mods.maxHp), rested = state.story.restDay != null && state.dayN - state.story.restDay <= 2;
  if (hull < 0.3 || rt.dread >= 0.6) return 'rattled';
  if (rested && hull >= 0.6 && rt.dread < 0.5) return 'cheerful';
  return 'steady';
}
export function openCard(card) {
  if (!card) return;
  rt.cardBusy = false; rt.cardNext = null; $('cardDone').textContent = 'Sail on [E]'; G.openModal('card'); G.audio.play('card');
  const out = (t) => { $('cardOut').textContent = t; $('cardDone').style.display = ''; G.cardEl.querySelectorAll('#cardChoices button').forEach((b) => { b.disabled = true; }); rt.cardBusy = 'done'; };
  renderCard(card, (ch) => {
    if (rt.cardBusy) return; rt.cardBusy = true;
    if (!ch.check) { out(ch.go(cardCtx())); return; }
    rollCheck(state, ch.check, (ok, n) => { markFromRoll(n); out((ok ? ch.ok : ch.fail)(cardCtx())); });
  });
}
export const CAVE_TIDE = { door: 0.2, ledge: 0.34, chest: 0.5 };
export const hermitFace = () => '<i style="position:absolute;left:18px;top:14px;width:28px;height:14px;background:#e8e0d0"></i><i style="position:absolute;left:22px;top:28px;width:20px;height:24px;background:#e8e0d0"></i><i style="position:absolute;left:23px;top:20px;width:18px;height:11px;background:#e8b890"></i><i style="position:absolute;left:10px;top:12px;width:44px;height:7px;background:#7a3a2a"></i>';
export function openCave(site) {
  const cv = CAVES[site.kind]; if (!cv) return;
  rt.caveRun = site; rt.cardNext = null; rt.cardBusy = false; G.openModal('cave'); G.audio.play('card');
  const look = caveLook(site.kind);
  G.caveEl.classList.toggle('passage', look === 'passage'); G.caveEl.classList.toggle('lantern', look === 'lantern');
  $('caveTitle').querySelector('b').textContent = cv.name;
  caveScene.start();
  const done = $('caveDone');
  const show = (id) => {
    const node = cv.nodes[id]; rt.cardBusy = false; rt.cardNext = null;
    const tide = CAVE_TIDE[id] != null ? CAVE_TIDE[id] : 0.2;
    caveScene.show(site.kind, id, tide);
    $('caveTitle').querySelector('small').textContent = cv.tag || (site.kind === 'grotto' ? 'THE TIDE IS COMING IN' : site.kind === 'colourspring' ? 'THE WATER HUMS' : id === 'door' ? 'THE MOUTH OF THE CAVE' : '');
    if (node.enter) G.threads.event(node.enter, null, site);   // a room can do something when it is shown (the bell tolls)
    $('caveTide').firstElementChild.style.height = `${Math.round(tide / 0.6 * 100)}%`;
    const face = $('caveFace'); face.classList.toggle('gone', look === 'passage');
    face.innerHTML = site.kind === 'larder' && id === 'tea' ? hermitFace() : `<i class="pxi ico ${cv.icon}"></i>`;
    $('caveWho').textContent = site.kind === 'larder' && id === 'tea' ? 'The hermit' : '';
    const list = (typeof node.choices === 'function' ? node.choices(G.threads) : node.choices).filter((ch) => !ch.if || G.threads.flag(ch.if));
    $('caveBox').classList.remove('resolved'); $('caveSay').textContent = typeof node.text === 'function' ? node.text(G.threads) : node.text; $('caveOut').textContent = ''; done.style.display = 'none';
    $('caveChoices').innerHTML = list.map((ch, i) => `<button data-i="${i}">${i + 1}. ${ch.label}${ch.check ? ` <small>(${ch.check.label} ${ch.check.dc})</small>` : ''}</button>`).join('');
    $('caveChoices').querySelectorAll('button').forEach((bt) => bt.addEventListener('click', () => choose(list[+bt.dataset.i])));
  };
  const resolve = (r) => {
    if (r.cancel) { G.closeModal(); return; }   // not yet: the cave stays
    let text = r.text || ''; const fx = r.fx || {}, ctx = cardCtx();
    if (!text && r.next && !Object.keys(fx).length) { show(r.next); return; }   // the doorway: straight into the first room
    if (fx.gold) { state.gold = Math.max(0, state.gold + fx.gold); text += ` (${fx.gold > 0 ? '+' : ''}${fx.gold} gold)`; }
    if (fx.hurt) ctx.hurt(fx.hurt);
    if (fx.note) state.notes.push({ text: fx.note, dark: false });
    if (fx.time) state.time = (state.time + fx.time) % 1;
    if (fx.rep) ctx.repNear();
    if (fx.colour === 'seal') G.threads.seal();
    if (fx.event) { const extra = G.threads.event(fx.event, fx.arg, site); if (extra) text += ` ${extra}`; }
    if (fx.rumour) { const rm = ctx.rumour('a folded chart in a cave'); text += ` ${rm || 'You cannot read where it leads.'}`; }
    $('caveOut').textContent = text; $('caveBox').classList.add('resolved'); rt.cardBusy = 'done';
    if (!r.next) { G.caves.finish(site, r.end || 'win'); done.textContent = 'Back to the ship [E]'; rt.cardNext = null; }
    else { done.textContent = 'Go deeper [E]'; rt.cardNext = () => show(r.next); }
    done.style.display = 'inline-block';
  };
  const choose = (ch) => {
    if (rt.cardBusy) return; rt.cardBusy = true;
    if (!ch.check) { resolve(ch.go); return; }
    rollCheck(state, ch.check, (ok, n) => { markFromRoll(n); resolve(ok ? ch.ok : ch.fail); });
  };
  done.onclick = () => { if (rt.cardNext) { const f = rt.cardNext; rt.cardNext = null; f(); return; } G.closeModal(); };
  show('door');
}
export function tabletopTick(dt) {
  // encounter signs: rare, out on open water, never in weather, never part of any story
  G.sighting.update(dt, rt.tNow, G.ship);
  G.caves.update(dt, G.ship, window.__BUILD !== 'demo' && G.laterOK() && rt.dread < 0.5);   // caves are a full-game feature: not in the demo build
  if (unlocked(state, 'cards') && !G.sighting.active && G.ship.speed > 2 && rt.dread < 0.95 && G.weather.fog < 0.3 && G.weather.storm < 0.3 && !G.world.nearest(G.ship.pos.x, G.ship.pos.z, 90) && !G.fishing.active) {
    rt.cardT -= dt;
    if (rt.cardT <= 0) {
      const card = drawCard(rt.dread, state.cardsSeen, SIGHTS);
      if (card && G.sighting.spawn(card, G.ship, G.world)) { state.cardsSeen.push(card.id); if (state.cardsSeen.length > 5) state.cardsSeen.shift(); rt.cardT = 1500 + Math.random() * 1000; }
      else rt.cardT = 30;
    }
  }
  G.ship.rowBoost = hasTrait(state, 'rower') ? 1.4 : 1;
  document.body.classList.toggle('eyes', hasTrait(state, 'eyes'));
  // crew wishes
  if ((rt.wishT -= dt) > 0) return; rt.wishT = 2;
  for (const c of state.crew) {
    const w = c.wish; if (!w || w.done || w.faded) continue;
    const hit = w.kind === 'harbour' ? false : G.world.nearest(G.ship.pos.x, G.ship.pos.z, 70, [w.kind]);
    if (hit) wishDone(c);
  }
}
export function signOn(c, stay) { c.until = state.dayN + stay; state.crew.push(c); }
export function crewLeave() {
  for (const c of [...state.crew]) {
    if (c.until == null) c.until = state.dayN + 4;   // crew from an older save
    if (c.permanent || c.until > state.dayN) continue;
    state.crew = state.crew.filter((x) => x !== c);
    toast(`${c.name} has gone ashore. ${c.wish && c.wish.done ? 'Smiling, mostly.' : 'No hard feelings.'} (${TRAITS[c.trait].name} leaves the crew.)`, false, 7000);
  }
}
export function wishDone(c) {
  c.wish.done = true; c.until = Math.max(c.until || state.dayN, state.dayN) + 2;
  toast(`${c.name} stands at the rail a long time. (${c.name}'s wish came true: their bonus grows by 1.)`, false, 7000);
  if (!G.eventQuiet()) G.objectives.mate.say(`Look at ${c.name}. I have never seen anyone smile with only their eyebrows before.`);
}

/** boot code that ran at this point in main.js; main.js calls it in the same place */
export function initEncounters() {
  rt.pendingHand = null, rt.pigHome = null, rt.cardT = 900 + Math.random() * 600, rt.cardBusy = false, rt.wishT = 0;
  localGames = new LocalGames(G.audio);
  pig = new Pig(G.pigEl, { onEnd: (won) => { if (won) { state.gold += 20; G.audio.play('treasure'); if (Math.random() < 0.5) { const r = cardCtx().rumour('a sore loser at the tavern'); if (r) toast(r, false, 7000); } } } });
  $('pigRoll').addEventListener('click', () => pig.roll());
  $('pigHold').addEventListener('click', () => pig.hold());
  $('pigLeave').addEventListener('click', () => { if (pig.busy) return; G.closeModal(); if (rt.pigHome) { rt.harbourIsl = rt.pigHome; rt.hbTab = 'tavern'; G.openModal('harbour'); } });
  rt.cardNext = null;
  $('cardDone').addEventListener('click', () => { if (rt.cardNext) { const f = rt.cardNext; rt.cardNext = null; f(); return; } G.closeModal(); });
  // advantage and disadvantage on the d20: the die is thrown twice and the better (or worse) one stands
  setAdvProvider((check) => {
    let a = 0; const why = [];
    const up = (t) => { a++; why.push(t); }, down = (t) => { a--; why.push(t); };
    if (check.treasure && !check.attempts) up('right shore first try');
    { const mood = maraMood(); if (check.kind === 'sea' || check.kind === 'luck') { if (mood === 'cheerful') up('Mara is cheerful'); else if (mood === 'rattled') down('Mara is rattled'); } }
    if (check.kind === 'talk') {   // standing: regulars are heard, a stranger at their own counter is not
      const h = check.harbour ? { desc: { id: check.harbour } } : G.world.nearest(G.ship.pos.x, G.ship.pos.z, 400, ['harbour']);
      if (h) { const lvl = friendLevel(repOf(state, h.desc.id)); if (lvl >= 2) up('known here'); else if (lvl === 0 && check.harbour) down('a stranger here'); }
    }
    if (check.treasure && state.buffs.dig > 0) up('rum rations');
    if (check.kind === 'sea' && G.weather.storm > 0.35) down('storm');
    if ((check.kind === 'sea' || check.kind === 'luck') && tod.night > 0.6 && !state.upgrades.lantern) down('dark, no lantern');
    a = Math.max(-1, Math.min(1, a));
    return [a, a ? why : []];
  });
  // ---- one-time caves: a few rooms of choices and d20 checks on their own full screen; when it is over, won or lost, the sea closes over the mouth
  rt.caveRun = null;
  caveScene = new CaveScene($('caveCv'));
  COLOUR_DEEP = new THREE.Color('#5a2a8a'), COLOUR_SHALLOW = new THREE.Color('#b068e8');
  // ---- crew only stay a while: a hired hand for 3-5 days, a castaway or a passenger for 3, a fulfilled wish adds two. Then they go ashore.
  for (const c of state.crew) if (c.until == null) c.until = state.dayN + 4;   // crew from an older save
  daysLeft = (c) => Math.max(0, (c.until || 0) - state.dayN);
}
