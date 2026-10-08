import { mulberry32, hash2 } from './util.js';
import { pxi } from './pixelui.js';
import { Die3D } from './dice3d.js';

// Board-game pieces: d20 skill checks, encounter cards at sea, hired hands with traits, and dice at the tavern.
// The captain never speaks; cards are written as what happens, not what you say.

// ---------------------------------------------------------------- crew
export const TRAITS = {
  lucky: { name: 'Lucky', text: '+2 on luck rolls', luck: 2 },
  salt: { name: 'Old salt', text: '+2 seamanship, storms wear the hull less', sea: 2 },
  tongue: { name: 'Silver tongue', text: '+2 on talk rolls (haggling, bluffing)', talk: 2 },
  rower: { name: 'Strong rower', text: 'rowing is 40% faster', row: 0.4 },
  eyes: { name: 'Sharp-eyed', text: 'fog never blurs the compass, +1 luck', luck: 1, fog: true },
  omen: { name: 'Superstitious', text: '+3 on rolls when the sea is wrong', omen: 3 },
};
const HANDS = ['Tobiah', 'Nell', 'Quint', 'Sabela', 'Ojo', 'Marisol', 'Hendrik', 'Little Fen', 'Ada Brine', 'Corvo'];
const LOOKS = ['missing two fingers', 'humming all the time', 'with a parrot that does not talk', 'very tall', 'barefoot, always', 'with a tattoo of an eye', 'who never blinks first'];
const WISHES = [
  { kind: 'volcano', text: 'wants to see a fire mountain' },
  { kind: 'atoll', text: 'wants to swim in a ring-island lagoon' },
  { kind: 'mangrove', text: 'wants to see the walking trees' },
  { kind: 'harbour', text: 'wants to visit family in ' },
];

/** today's hand for hire at a harbour (or null) */
export function crewForHire(d, dayN, state, world) {
  const rng = mulberry32(hash2(d.seed, dayN, 5151));
  if (rng() > 0.6) return null;
  const traitIds = Object.keys(TRAITS), trait = traitIds[Math.floor(rng() * traitIds.length)];
  const name = HANDS[Math.floor(rng() * HANDS.length)];
  if ((state.crew || []).some((c) => c.name === name)) return null;
  const w = WISHES[Math.floor(rng() * WISHES.length)];
  const wish = { kind: w.kind, text: w.text, done: false };
  if (w.kind === 'harbour') {
    const list = [];
    for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) { const o = world.desc(Math.round(d.x / 110) + dx, Math.round(d.z / 110) + dz); if (o && o.type === 'harbour' && o.id !== d.id) list.push(o); }
    if (!list.length) { wish.kind = 'volcano'; wish.text = WISHES[0].text; } else { const h = list[Math.floor(rng() * list.length)]; wish.id = h.id; wish.text += h.name; }
  }
  return { name, look: LOOKS[Math.floor(rng() * LOOKS.length)], trait, wish, cost: 40 + Math.floor(rng() * 5) * 10, from: d.id };
}
/** total bonus from the crew for a kind of roll ('sea' | 'talk' | 'luck'), plus a fulfilled wish's +1 */
export function crewBonus(state, kind, dark = false) {
  let b = 0; const why = [];
  for (const c of state.crew || []) {
    const t = TRAITS[c.trait];
    let v = (t[kind] || 0) + (dark ? t.omen || 0 : 0);
    if (v && c.wish && c.wish.done) v += 1;
    if (v) { b += v; why.push(`${c.name} +${v}`); }
  }
  return { b, why };
}
export const hasTrait = (state, id) => (state.crew || []).some((c) => c.trait === id);

// ---------------------------------------------------------------- the d20 check
let d20 = null;
/** Show a d20 roll over everything. check: { label, dc, kind, dark, extra:[[name, n]] }; done(success, roll, total) */
export function rollCheck(state, check, done) {
  const el = document.getElementById('roll'), cv = document.getElementById('rollCv');
  const { b, why } = crewBonus(state, check.kind, check.dark);
  const extra = check.extra || [];
  const bonus = b + extra.reduce((a, [, n]) => a + n, 0);
  const parts = [...why, ...extra.map(([nm, n]) => `${nm} ${n >= 0 ? '+' : ''}${n}`)];
  document.getElementById('rollLbl').textContent = `${check.label}: need ${check.dc}`;
  document.getElementById('rollMod').textContent = parts.length ? parts.join(' · ') : 'no bonus';
  const res = document.getElementById('rollRes'); res.textContent = ''; res.className = '';
  el.classList.add('open');
  const n = 1 + Math.floor(Math.random() * 20), total = n + bonus;
  const ok = n === 20 || (n !== 1 && total >= check.dc);
  if (!d20) d20 = new Die3D(cv, 'd20', 64);
  d20.roll(n, () => {
    res.textContent = n === 20 ? 'NATURAL 20!' : n === 1 ? 'NATURAL 1...' : `${n}${bonus ? ` ${bonus > 0 ? '+' : ''}${bonus} = ${total}` : ''}: ${ok ? 'SUCCESS' : 'FAIL'}`;
    res.className = ok ? 'ok' : 'bad';
    setTimeout(() => { el.classList.remove('open'); done(ok, n, total); }, 1500);
  });
}

// ---------------------------------------------------------------- encounter cards
// each choice: { label, check?: { label, kind, dc }, ok(ctx), fail(ctx), go(ctx) }; ctx helpers return the outcome text
const fishOf = (ctx, id) => { const f = ctx.FISH.find((x) => x.id === id); const kg = +(f.kg[0] + Math.random() * (f.kg[1] - f.kg[0])).toFixed(1); return { id: f.id, name: f.name, kg, value: Math.max(1, Math.round(kg * f.price)) }; };
export const CARDS = [
  { id: 'chest', icon: 'crate', title: 'A Floating Chest', text: 'A sea chest bobs past, iron-bound, still locked.', choices: [
    { label: 'Haul it aboard', check: { label: 'Seamanship', kind: 'sea', dc: 10 },
      ok: (c) => { const g = 25 + Math.floor(Math.random() * 40); c.state.gold += g; return `Heavy, wet, and full of coins. +${g} gold.`; },
      fail: (c) => { c.hurt(8); return 'It swings into the hull on the way up. The chest sinks. The dent stays.'; } },
    { label: 'Let it drift', go: () => 'It turns slowly and drifts off. Someone else\'s luck.' }] },
  { id: 'stowaway', icon: 'talk', title: 'A Stowaway', text: 'A small face peeks out from between the fruit crates.', choices: [
    { label: 'Put them to work', check: { label: 'Luck', kind: 'luck', dc: 11 },
      ok: (c) => { c.state.gold += 30; return 'They scrub the deck and find a purse wedged in the planks. +30 gold. They keep the button.'; },
      fail: (c) => { const g = Math.min(c.state.gold, 15); c.state.gold -= g; return `At the next wave they are gone. So are ${g} gold.`; } },
    { label: 'Share your bread', go: (c) => { c.repNear(); return 'They eat like a gull and fall asleep on the rope pile. Word of it will reach the next harbour.'; } }] },
  { id: 'dinghy', icon: 'coin', title: 'A Peddler in a Dinghy', text: 'An old peddler rows alongside, rattling a tray of oddments and folded maps.', choices: [
    { label: 'Haggle for a map', check: { label: 'Talk', kind: 'talk', dc: 12 },
      ok: (c) => c.rumour('a peddler in a dinghy') || 'He sells you a map. It is of a place you have already been. Still, nice drawing.',
      fail: (c) => { const g = Math.min(c.state.gold, 12); c.state.gold -= g; return `You pay ${g} gold for a map that turns out to be a fish recipe.`; } },
    { label: 'Wave him on', go: () => 'He rows away, singing about money.' }] },
  { id: 'squall', icon: 'flag', title: 'A Squall Line', text: 'A wall of grey rain stands across your course, and the wind behind it is fast.', choices: [
    { label: 'Ride it through', check: { label: 'Seamanship', kind: 'sea', dc: 13 },
      ok: (c) => { c.state.buffs.speed = Math.max(c.state.buffs.speed, 90); return 'You come out the other side flying. (Fair wind for a while.)'; },
      fail: (c) => { c.hurt(12); return 'The squall slaps the ship flat for a long second. Planks complain.'; } },
    { label: 'Go round it', go: (c) => { c.state.time = (c.state.time + 0.02) % 1; return 'A long way round. Dry, at least.'; } }] },
  { id: 'castaway', icon: 'talk', title: 'A Castaway', text: 'Someone on a raft, waving a shirt on a stick.', choices: [
    { label: 'Pull them aboard', go: (c) => c.castaway() },
    { label: 'Throw them a barrel', go: (c) => { c.state.gold = Math.max(0, c.state.gold - 5); return 'You throw a barrel of water and some biscuits. They wave the shirt in thanks.'; } }] },
  { id: 'shoal', icon: 'fish', title: 'A Silver Shoal', text: 'The water boils with little fish all around the hull.', choices: [
    { label: 'Cast the nets', check: { label: 'Luck', kind: 'luck', dc: 9 },
      ok: (c) => { const n = 3 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) c.state.catch.push(fishOf(c, Math.random() < 0.7 ? 'sardine' : 'snapper')); return `The nets come up heavy. ${n} fish into the hold.`; },
      fail: () => 'The shoal turns as one and is gone. The nets come up with one boot.' },
    { label: 'Just watch', go: () => 'They flash and turn like thrown coins. It is very beautiful.' }] },
  { id: 'rowboat', icon: 'talk', title: 'A Rowboat, Empty', text: 'An empty rowboat drifts alongside, oars stowed, a cup of tea still steaming on the seat.', choices: [
    { label: 'Take the tea', check: { label: 'Luck', kind: 'luck', dc: 10 },
      ok: (c) => { c.state.buffs.speed = Math.max(c.state.buffs.speed, 60); return 'It is very good tea. Everyone feels quick and cheerful for a while.'; },
      fail: () => 'You drink it. In the morning the cup is on your table, full again.' },
    { label: 'Push it away', go: () => 'It follows you for an hour. Then it does not.' }] },
  { id: 'buoy', icon: 'pip', title: 'A Singing Buoy', text: 'A buoy rings with no wind and no waves. It is ringing a tune.', choices: [
    { label: 'Sail closer', check: { label: 'Luck', kind: 'luck', dc: 12 },
      ok: (c) => { const g = 15 + Math.floor(Math.random() * 25); c.state.gold += g; return `Coins are tied to its chain, like offerings. You take a few. (+${g} gold) The tune stops.`; },
      fail: (c) => { c.hurt(5); return 'The buoy swings round and knocks the hull, once, politely. The tune goes on.'; } },
    { label: 'Ring your own bell back', go: () => 'You ring the ship\'s bell. The buoy waits, then rings the same tune back, one note wrong.' }] },
  { id: 'gull', icon: 'letter', title: 'The Same Gull', text: 'A gull lands on the rail. It has a tiny brass ring on its leg, engraved with your ship\'s name.', choices: [
    { label: 'Feed it', go: (c) => { c.repNear(); return 'It eats a biscuit, looks at you for a long time, and leaves. Somewhere, someone hears you are generous.'; } },
    { label: 'Read the ring closely', check: { label: 'Luck', kind: 'luck', dc: 11 },
      ok: (c) => c.rumour('a ring on a gull\'s leg') || 'Tiny letters under the name: a date. Next week\'s.',
      fail: () => 'The gull bites you and flies off. The ring said something else on the inside. You did not see what.' }] },
  { id: 'sails', icon: 'skull', title: 'Sails on the Horizon', text: 'Red hulls, black flags, far off. They have not seen you yet.', minDread: 0.15, choices: [
    { label: 'Fly friendly colours', check: { label: 'Talk', kind: 'talk', dc: 12 },
      ok: () => 'They dip their flag at your merchant pennant and sail on. Rude, but harmless.',
      fail: (c) => { const g = Math.min(c.state.gold, 20); c.state.gold -= g; return `They come close enough to shout. A "toll" of ${g} gold goes over in a bucket.`; } },
    { label: 'Run for it', check: { label: 'Seamanship', kind: 'sea', dc: 10 },
      ok: () => 'You slip behind the swell. When you look again, they are gone.',
      fail: (c) => { c.hurt(6); return 'One shot, long range, through the rail. Then they lose interest.'; } }] },
  { id: 'calm', icon: 'nostar', title: 'A Patch of Glass', text: 'The sea goes perfectly still in a circle around the ship. Something is singing under it.', minDread: 0.4, dark: true, choices: [
    { label: 'Listen', check: { label: 'Luck', kind: 'luck', dc: 14, dark: true },
      ok: (c) => { c.state.loot.push({ name: 'From the glass sea: a shell that hums your name', value: 0, dark: true }); return 'You hear the words. You do not remember them, but you have a shell in your hand.'; },
      fail: (c) => { c.glitch(); return 'For a second the sky is the wrong way up.'; } },
    { label: 'Row out of it', go: () => 'Mara rows hard and does not look over the side.' }] },
];

/** a card for this moment, or null */
export function drawCard(dread, seen) {
  const pool = CARDS.filter((c) => dread >= (c.minDread || 0) && !(c.dark && dread < 0.4));
  const fresh = pool.filter((c) => !seen.includes(c.id));
  const list = fresh.length ? fresh : pool;
  return list[Math.floor(Math.random() * list.length)];
}

export function renderCard(card, onChoose) {
  const el = document.getElementById('card');
  el.classList.toggle('dark', !!card.dark);
  document.getElementById('cardIcon').innerHTML = pxi(card.icon);
  document.getElementById('cardTitle').textContent = card.title;
  document.getElementById('cardText').textContent = card.text;
  const box = document.getElementById('cardChoices');
  box.innerHTML = card.choices.map((ch, i) => `<button data-i="${i}">${i + 1}. ${ch.label}${ch.check ? ` <small>(${ch.check.label} ${ch.check.dc})</small>` : ''}</button>`).join('');
  box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => onChoose(card.choices[+b.dataset.i])));
  document.getElementById('cardOut').textContent = '';
  document.getElementById('cardDone').style.display = 'none';
}

// ---------------------------------------------------------------- Pig, at the tavern
// First to 30. Roll a d6 as often as you dare: a 1 loses the turn's points. Hold to bank them.
export class Pig {
  constructor(el, deps) { this.el = el; this.d = deps; this.die = null; }
  start(opponent, stake) {
    if (!this.die) this.die = new Die3D(this.el.querySelector('#pigCv'), 'd6', 48);
    this.opp = opponent; this.stake = stake; this.me = 0; this.them = 0; this.turn = 0; this.mine = true; this.over = false; this.busy = false;
    this.log = `${opponent} slides two coins forward and grins. First to 30.`;
    this.render();
  }
  /** throw the die, then call after(n) once it has settled */
  throwDie(after) { const n = 1 + Math.floor(Math.random() * 6); this.busy = true; this.render(); this.die.roll(n, () => { this.busy = false; after(n); }, 0.7); }
  roll() {
    if (this.over || !this.mine || this.busy) return;
    this.throwDie((n) => {
      if (n === 1) { this.turn = 0; this.log = 'A one. Everything this turn is lost.'; this.mine = false; this.render(); this.theirTurn(); return; }
      this.turn += n; this.log = `${n}. This turn: ${this.turn}.`;
      if (this.me + this.turn >= 30) { this.me += this.turn; this.turn = 0; this.end(true); return; }
      this.render();
    });
  }
  hold() {
    if (this.over || !this.mine || this.busy || !this.turn) return;
    this.me += this.turn; this.turn = 0; this.mine = false; this.log = 'You bank it.'; this.render(); this.theirTurn();
  }
  theirTurn() {
    let t = 0;
    const step = () => this.throwDie((n) => {
      this.busy = true;
      if (n === 1) { this.log = `${this.opp} rolls a one and swears at the table.`; return this.back(); }
      t += n; this.log = `${this.opp} rolls ${n}. (${t} this turn)`; this.render();
      if (this.them + t >= 30) { this.them += t; this.end(false); return; }
      if (t >= (this.them > this.me ? 15 : 20)) { this.them += t; this.log = `${this.opp} holds at ${t}.`; return this.back(); }
      setTimeout(step, 450);
    });
    this.busy = true; this.render(); setTimeout(step, 600);
  }
  back() { this.busy = true; this.render(); setTimeout(() => { this.busy = false; this.mine = true; this.render(); }, 800); }
  end(won) {
    this.over = true; this.busy = false;
    this.log = won ? `${this.opp} pushes the coins over with a sigh. (+${this.stake * 2} gold)` : `${this.opp} sweeps up the coins. Better luck tomorrow.`;
    this.d.onEnd(won); this.render();
  }
  render() {
    const q = (id) => this.el.querySelector(id);
    q('#pigMe').innerHTML = `${this.me}${this.turn ? ` <small>+${this.turn}</small>` : ''}`;
    q('#pigThem').textContent = this.them; q('#pigOpp').textContent = this.opp;
    q('#pigLog').textContent = this.log;
    q('#pigRoll').disabled = this.over || !this.mine || this.busy;
    q('#pigHold').disabled = this.over || !this.mine || this.busy || !this.turn;
  }
}
