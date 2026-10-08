import { mulberry32, hash2 } from './util.js';
import { pxi } from './pixelui.js';

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
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function dieFace(cv, n, tint) {
  const c = cv.getContext('2d'), S = cv.width; c.clearRect(0, 0, S, S);
  const cx = S / 2, cy = S / 2, R = S * 0.46;
  const hex = Array.from({ length: 6 }, (_, i) => [cx + Math.cos(i / 6 * 6.283 - 1.571) * R, cy + Math.sin(i / 6 * 6.283 - 1.571) * R]);
  const pal = tint === 'good' ? ['#3a7a30', '#5ec45a', '#9ae890'] : tint === 'bad' ? ['#6a1a20', '#b03030', '#e06050'] : ['#8a7650', '#cdb88e', '#efe0b8'];
  const inside = (x, y) => { for (let i = 0; i < 6; i++) { const [ax, ay] = hex[i], [bx, by] = hex[(i + 1) % 6]; if ((bx - ax) * (y - ay) - (by - ay) * (x - ax) < 0) return false; } return true; };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (!inside(x + 0.5, y + 0.5)) continue;
    const dy = (y - cy) / R, k = 1.6 - dy * 0.9 + BAYER[(y % 4) * 4 + (x % 4)] / 16 - 0.5;
    c.fillStyle = pal[Math.max(0, Math.min(2, Math.round(k)))]; c.fillRect(x, y, 1, 1);
  }
  c.fillStyle = '#2a1608';
  for (let i = 0; i < 6; i++) { const [ax, ay] = hex[i], [bx, by] = hex[(i + 1) % 6]; for (let t = 0; t <= 1; t += 1 / S) c.fillRect(Math.round(ax + (bx - ax) * t) - 1, Math.round(ay + (by - ay) * t) - 1, 2, 2); }
  c.font = `${Math.round(S * 0.42)}px "DotGothic16", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(255,240,210,.5)'; c.fillText(String(n), cx + 1, cy + 3);
  c.fillStyle = '#2a1608'; c.fillText(String(n), cx, cy + 2);
}

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
  let t = 0;
  const spin = setInterval(() => {
    t++; dieFace(cv, 1 + Math.floor(Math.random() * 20));
    cv.style.transform = `rotate(${(Math.random() - 0.5) * 40}deg) translateY(${-Math.abs(Math.sin(t * 0.7)) * 14}px)`;
    if (t < 16) return;
    clearInterval(spin); cv.style.transform = '';
    dieFace(cv, n, ok ? 'good' : 'bad');
    res.textContent = n === 20 ? 'NATURAL 20!' : n === 1 ? 'NATURAL 1...' : `${n}${bonus ? ` ${bonus > 0 ? '+' : ''}${bonus} = ${total}` : ''}: ${ok ? 'SUCCESS' : 'FAIL'}`;
    res.className = ok ? 'ok' : 'bad';
    setTimeout(() => { el.classList.remove('open'); done(ok, n, total); }, 1500);
  }, 70);
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
  constructor(el, deps) { this.el = el; this.d = deps; }
  start(opponent, stake) {
    this.opp = opponent; this.stake = stake; this.me = 0; this.them = 0; this.turn = 0; this.mine = true; this.over = false; this.busy = false;
    this.log = `${opponent} slides two coins forward and grins. First to 30.`;
    this.render();
  }
  roll() {
    if (this.over || !this.mine || this.busy) return;
    const n = 1 + Math.floor(Math.random() * 6); this.last = n;
    if (n === 1) { this.turn = 0; this.log = 'A one. Everything this turn is lost.'; this.mine = false; this.render(); this.theirTurn(); return; }
    this.turn += n; this.log = `${n}. This turn: ${this.turn}.`;
    if (this.me + this.turn >= 30) { this.me += this.turn; this.turn = 0; return this.end(true); }
    this.render();
  }
  hold() {
    if (this.over || !this.mine || this.busy || !this.turn) return;
    this.me += this.turn; this.turn = 0; this.mine = false; this.log = 'You bank it.'; this.render(); this.theirTurn();
  }
  theirTurn() {
    this.busy = true; let t = 0;
    const step = () => {
      const n = 1 + Math.floor(Math.random() * 6); this.last = n;
      if (n === 1) { this.log = `${this.opp} rolls a one and swears at the table.`; t = 0; return this.back(); }
      t += n; this.log = `${this.opp} rolls ${n}. (${t} this turn)`; this.render();
      if (this.them + t >= 30) { this.them += t; return this.end(false); }
      const hold = t >= (this.them > this.me ? 15 : 20) || this.them + t >= 30;
      if (hold) { this.them += t; this.log = `${this.opp} holds at ${t}.`; return this.back(); }
      setTimeout(step, 650);
    };
    setTimeout(step, 700);
  }
  back() { this.render(); setTimeout(() => { this.busy = false; this.mine = true; this.render(); }, 700); }
  end(won) {
    this.over = true; this.busy = false;
    this.log = won ? `${this.opp} pushes the coins over with a sigh. (+${this.stake * 2} gold)` : `${this.opp} sweeps up the coins. Better luck tomorrow.`;
    this.d.onEnd(won); this.render();
  }
  render() {
    const pip = (n) => `<span class="pigdie">${n || '-'}</span>`;
    this.el.querySelector('#pigBody').innerHTML = `<div class="pigrow"><div><b>You</b><br>${this.me}${this.turn ? ` <small>+${this.turn}</small>` : ''}</div>${pip(this.last)}<div><b>${this.opp}</b><br>${this.them}</div></div><p class="quote">${this.log}</p>`;
    this.el.querySelector('#pigRoll').disabled = this.over || !this.mine || this.busy;
    this.el.querySelector('#pigHold').disabled = this.over || !this.mine || this.busy || !this.turn;
  }
}
