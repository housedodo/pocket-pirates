// Harbour life: what makes each harbour its own place, and gives a reason to visit every one.
//  - A resident with a story: one named person per harbour whose problem plays out over four visits (one step a day).
//    Some steps need something (a fish, fruit, lamp oil, a night visit, the festival day); some send you to a partner
//    harbour and back. When a story ends the harbour changes for good: a prop by the pier, a line on the board.
//  - The house dish: every village style cooks one thing; eat it in the tavern and it helps until the dawn after next.
//  - The week's event: each harbour's festival day has a name, and its local game pays double on that day.
//  - Gossip: what you did in one harbour is talked about in the next.
//  - Fragments: each harbour holds one piece of an old story (the table by the water, the one who keeps the count).
//    Never explained; you only see the whole by visiting them all.
// main.js draws the rows (board and tavern) and calls these; state.life holds everything.
import { hash2 } from './util.js';
import { nearby } from './jobs.js';

export const lifeOf = (state) => (state.life = state.life || { arcs: {}, ate: {}, played: {}, frags: [], fragAt: {}, news: [], told: {}, keep: [], meal: null });

// ---------------------------------------------------------------- the house dish, by village style
export const DISHES = {
  classic: { id: 'pie', name: 'Harbour fish pie', text: 'the ship feels lighter: a little more speed', cost: 8 },
  fishing: { id: 'stew', name: "Fisher's stew", text: 'the fish bite sooner', cost: 6 },
  terraced: { id: 'bread', name: 'Honey bread', text: 'the crew set and reef the sails faster', cost: 7 },
  thatch: { id: 'curry', name: 'Coconut curry', text: 'a caught gust lasts longer', cost: 7 },
  market: { id: 'rum', name: 'Spiced rum', text: 'the canvas strains less in a gale', cost: 9 },
  farm: { id: 'pepper', name: 'Pepper pot', text: 'an extra handful when you pick fruit', cost: 6 },
  shrine: { id: 'tea', name: 'Bitter tea', text: 'the lantern reaches further', cost: 8 },
  wreckers: { id: 'pork', name: 'Salt pork', text: 'the hull mends at sea, even in a storm', cost: 8 },
};
const DISH_LINES = {
  pie: 'Flaky, hot, far too big. The cook watches you finish it.',
  stew: 'Fish, onions, something green. It tastes of the morning catch.',
  bread: 'Still warm. The honey comes from the terraces above the town.',
  curry: 'Hot enough to make your eyes water. The crew ask for seconds.',
  rum: 'It warms you right down to the keel.',
  pepper: 'Beans, peppers, a little pork. Farmers\' food: it stays with you.',
  tea: 'Bitter as bark. Afterwards the lamps all seem a little brighter.',
  pork: 'Salt enough to cure a sailor. The wreckers eat it standing up.',
};
/** the meal in your belly: its id while it lasts (until the dawn after next), else null */
export function meal(state) { const m = lifeOf(state).meal; return m && state.dayN <= m.until ? m.id : null; }
export function eat(state, d) {
  const L = lifeOf(state), dish = DISHES[d.style] || DISHES.classic;
  L.meal = { id: dish.id, until: state.dayN + 1, at: d.name }; L.ate[d.id] = state.dayN;
  return DISH_LINES[dish.id];
}

// ---------------------------------------------------------------- the week's event and the local game, by style
export const GAMES = {
  classic: { id: 'bells', name: 'Ring the peal', how: 'repeat the peal on the bells (1-4)', event: 'Bell Sunday' },
  fishing: { id: 'nets', name: 'Mend the net', how: 'stop the shuttle on each hole (Space)', event: 'Fleet Home' },
  terraced: { id: 'skip', name: 'Skip a stone', how: 'power, then angle (Space)', event: 'Stone Day' },
  thatch: { id: 'kite', name: 'Fly the kite', how: 'keep it in the band (A / D)', event: 'Kite Day' },
  market: { id: 'auction', name: 'The auction', how: 'bid or pass: guess what the lot is worth', event: 'The Grand Auction' },
  farm: { id: 'shy', name: 'Coconut shy', how: 'throw as the arm swings over a coconut (Space)', event: 'Harvest Fair' },
  shrine: { id: 'lanterns', name: 'Float the lanterns', how: 'let go as the gap comes round (Space)', event: 'Lantern Vigil' },
  wreckers: { id: 'arm', name: 'Arm-wrestle', how: 'push on the beat (Space)', event: 'Strongarm Night' },
};
export const gameOf = (d) => GAMES[d.style] || GAMES.classic;
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const isEvent = (d, state) => d.festival === state.dayN % 7;
/** "Kite Day here today" / "Kite Day here on Thursday (in 3 days)" */
export function eventLine(d, state) {
  const g = gameOf(d), n = (d.festival - (state.dayN % 7) + 7) % 7;
  return n === 0 ? `${g.event} is today!` : `${g.event} here on ${WEEKDAYS[d.festival]} (${n === 1 ? 'tomorrow' : `in ${n} days`})`;
}
/** what a local game pays: tier 0 nothing, 1 a little, 2 well; doubled on the event day, plus a keepsake */
export function gamePrize(d, state, tier) {
  const ev = isEvent(d, state), gold = [0, 12, 30][tier] * (ev ? 2 : 1);
  const L = lifeOf(state); L.played[d.id] = state.dayN;
  let keep = null;
  if (ev && tier === 2 && !L.keep.some((k) => k.at === d.id)) { keep = { at: d.id, name: `${d.name}'s ${KEEPSAKE[gameOf(d).id]}` }; L.keep.push(keep); }
  return { gold, keep, ev };
}
const KEEPSAKE = { bells: 'bell-ringer\'s ribbon', nets: 'net needle of bone', skip: 'flat lucky stone', kite: 'red kite tail', auction: 'auctioneer\'s token', shy: 'painted coconut', lanterns: 'paper lantern', arm: 'iron wristband' };
export const playedToday = (state, d) => lifeOf(state).played[d.id] === state.dayN;

// ---------------------------------------------------------------- residents: a story over four visits
// step fields: at ('home' | 'partner'), need (null | 'fish' | 'fruit' | 'oil' | 'night' | 'event'), say (what you see),
// btn (the button), done (what happens), gold (paid on that step). {P} = the partner harbour, {H} = home.
export const ARCS = {
  bakers: { who: 'Ada the baker', prop: 'bunting', steps: [
    { at: 'home', say: 'Ada the baker pushes a loaf into your arms. "Take that to my sister Ode in {P}. Ask her if hers is better. She will lie."', btn: 'Take the loaf', done: 'You stow the loaf. It smells of aniseed.' },
    { at: 'partner', say: 'Ode the baker sniffs Ada\'s loaf, eats half of it, and says nothing for a long time. Then she wraps one of her own for you. "Tell her nothing. Give her that."', btn: 'Take Ode\'s loaf', done: 'Ode\'s loaf is still warm. It smells of aniseed too.' },
    { at: 'home', say: 'Ada tears into her sister\'s loaf. Her face does several things. "Hers is better," she says at last. "Do not tell her."', btn: 'Say nothing', done: 'Ada is quiet all afternoon. She bakes twice as much as usual.', gold: 10 },
    { at: 'home', say: 'There are two names over the bakery door now: ADA & ODE. Ode came on the morning boat with her ovens. They argue all day and both seem very happy.', btn: 'Buy a bun', done: 'The bun is free. "For the postman," they say together.', end: true },
  ], after: 'Two names over the bakery door. They are still arguing.' },
  dog: { who: 'Tilda and her dog', prop: 'dog', steps: [
    { at: 'home', say: 'A girl called Tilda is crying on the pier. Her dog Biscuit swam after a fishing boat yesterday and did not come back. "He goes where the boats go. Will you look?"', btn: 'Promise to look', done: 'Tilda draws Biscuit for you: four legs, a lot of ears.' },
    { at: 'partner', say: 'On the quay at {P} a wet brown dog with a lot of ears is eating someone\'s lunch. He has a red collar. It says BISCUIT.', btn: 'Take him aboard', done: 'Biscuit sits in the bow the whole way, barking at the waves.' },
    { at: 'home', say: 'Biscuit is over the side and up the pier before you have tied up. Tilda sits down on the planks and holds on to him and does not let go.', btn: 'Leave them be', done: 'Her mother presses a few coins into your hand.', gold: 15 },
    { at: 'home', say: 'Biscuit barks at the Merry Gull from the end of the pier, every time, until you step ashore. Tilda has taught him to sit. He mostly does not.', btn: 'Pat the dog', done: 'Biscuit leans against your leg like a sack of wet flour.', end: true },
  ], after: 'Biscuit barks from the end of the pier until you are ashore.' },
  widow: { who: 'Ines at the lamp', prop: 'lamp', steps: [
    { at: 'home', say: 'Ines keeps a lamp lit at the end of the pier for her husband Tomas, out on the Little Wren. "Nineteen days late. He is never late. The lamp must not go out." She is nearly out of oil.', need: 'oil', btn: 'Give her oil (10)', done: 'She fills the lamp with careful hands, and thanks you without looking away from the sea.' },
    { at: 'home', say: 'Ines gives you Tomas\'s blue scarf. "Show it in {P}. Someone may have seen the Wren."', btn: 'Take the scarf', done: 'The scarf smells of tar and of someone else\'s house.' },
    { at: 'partner', say: 'An old salt in {P} knows the scarf. "The Wren? Came in a month back. Tomas sold her on this quay and walked inland. Said he was getting away from a lamp." He hands the scarf back.', btn: 'Take it back', done: 'You fold the scarf. You are not sure what you will tell her.' },
    { at: 'home', say: 'The lamp at the end of the pier is cold. Ines\'s door is open and the beds are made. On the table, two cups, both still warm.', btn: 'Leave the scarf', done: 'You leave the scarf on the table, next to the cups.', end: true, dark: true },
  ], after: 'Ines\'s lamp is dark. Nobody lights it, and nobody takes it down.' },
  boat: { who: 'Pim the boatbuilder', prop: 'boat', steps: [
    { at: 'home', say: 'A boy called Pim is building a boat out of driftwood on the beach. It is mostly holes. "I need nails. The smith takes fruit."', need: 'fruit', btn: 'Give him fruit', done: 'Pim runs off with the fruit and comes back with a fistful of bent nails.' },
    { at: 'home', say: 'The boat has a bottom now. "Gran says the first fish goes in the hull, for luck. I have never caught a fish."', need: 'fish', btn: 'Give him a fish', done: 'Pim nails the fish to the inside of the hull, very seriously.' },
    { at: 'home', say: 'Pim is painting a name on the bow in big red letters: MERRY GULL II. "So she knows where she is going."', btn: 'Admire it', done: 'Pim stands back and looks at it for a long time.' },
    { at: 'home', say: 'Launch day. Pim\'s boat floats. It leaks, and he bails with one hand and waves with the other all the way round the pier and back.', btn: 'Cheer', done: 'The whole pier cheers. Pim pretends not to hear.', end: true },
  ], after: 'Pim\'s little boat is out again. It leaks. He bails and waves.' },
  keeper: { who: 'Old Sabe', prop: 'chair', steps: [
    { at: 'home', say: 'Old Sabe keeps the harbour light, though he can barely see it any more. "Oil, captain, if you have it. The light goes on whether I see it or not."', need: 'oil', btn: 'Give him oil (10)', done: 'He fills the lamp by feel, not spilling a drop.' },
    { at: 'home', say: '"Sail past the light one night," Sabe says. "Close in. I want to hear a ship go by again."', btn: 'Promise', done: 'Come back after dark.' },
    { at: 'home', need: 'night', say: 'Sabe is on the steps in the dark when you tie up. "I heard you go by. The gulls told me. They tell me where everyone has been." He gives you a lens from his old glass.', btn: 'Take the lens', done: 'The lens is scratched, and very clear.', gold: 12 },
    { at: 'home', say: 'A girl keeps the light now. Sabe sits on the steps facing the sea with his eyes shut. "I see it better like this," he says, and tells you where you sailed yesterday.', btn: 'Sit with him', done: 'He is right about every island.', end: true, dark: true },
  ], after: 'Sabe sits on the steps with his eyes shut, and knows where you have been.' },
  singer: { who: 'Lune who sings', prop: 'candles', steps: [
    { at: 'home', say: 'Lune sings on the quay every evening, but one song always stops halfway. "My mother never taught me the end. Someone in {P} might know it."', btn: 'Ask for her', done: 'Lune hums the tune until you have it.' },
    { at: 'partner', say: 'An old woman in {P} knows the tune. She sings the last verse very quietly, and makes you say it back twice.', btn: 'Learn it', done: 'You keep the words in your head the whole way back.' },
    { at: 'home', say: 'You give Lune the words. She sings the whole song for the first time: a table by the water, a candle, and a number nobody says. She stops. "That is not how I remember it ending."', btn: 'Listen', done: 'The quay is very quiet.', gold: 8, dark: true },
    { at: 'home', say: 'At dusk the whole village sings Lune\'s song, all the way to the end. Lune does not. She says she never knew the words before, and hums something else.', btn: 'Listen', done: 'You find you know all the words.', end: true, dark: true },
  ], after: 'At dusk they sing Lune\'s song to the end. Lune hums something else.' },
  bride: { who: 'Marisol the bride', prop: 'arch', steps: [
    { at: 'home', say: 'Marisol is getting married on {H}\'s festival day, to Teo from {P}. "He has not sent the ring. Take him this ribbon and ask him why not."', btn: 'Take the ribbon', done: 'The ribbon is blue, with her name sewn on it.' },
    { at: 'partner', say: 'Teo in {P} goes pale at the ribbon, runs indoors and comes back with a ring in a box. "I was polishing it. For a month. Tell her that."', btn: 'Take the ring', done: 'You keep the box somewhere very safe.' },
    { at: 'home', say: 'Marisol opens the box, laughs, cries, and puts it on the wrong finger. "Come to the wedding. It is on our festival day."', btn: 'Promise to come', done: 'Come back on the festival day.', gold: 10 },
    { at: 'home', need: 'event', say: 'A wedding on the festival day: flowers on the pier, a cake on a cart, Teo in a coat that is too big. Marisol throws her bouquet, and the crew catch it.', btn: 'Dance', done: 'You dance badly and are cheered for it.', end: true },
  ], after: 'Marisol and Teo wave from a blue house above the pier.' },
  counter: { who: 'Corvo who counts ships', prop: 'wall', steps: [
    { at: 'home', say: 'A man called Corvo stands on the pier with a stick of chalk, writing every ship that comes in on the harbour wall. "Name?" He writes MERRY GULL, very neatly.', btn: 'Let him', done: 'Corvo nods and turns back to the sea.' },
    { at: 'home', say: 'Corvo has filled most of the wall. "Busy week," he says, and writes MERRY GULL again.', btn: 'Point it out', done: 'He looks at the wall, then at you. "Twice. Yes."' },
    { at: 'home', say: 'Your ship\'s name is on the wall three times now. One of them is dated next week. Corvo will not look at you.', btn: 'Read the wall', done: 'Most of the ships on the wall you have never heard of. Two you have.', dark: true },
    { at: 'home', say: 'The wall has been washed clean. There is a new man on the pier with a stick of chalk. "Name?" he says.', btn: 'Tell him', done: 'He writes MERRY GULL, very neatly.', end: true, dark: true },
  ], after: 'A man on the pier writes every ship on the wall in chalk. The wall is washed every week.' },
};
const ARC_IDS = Object.keys(ARCS);

/** which story lives in this harbour (Tama and the second harbour are fixed, the rest from the seed) */
export function arcIdOf(d) {
  if (d.id === '0,-1') return 'bakers';
  if (d.id === '-2,-1') return 'dog';
  const rest = ARC_IDS.filter((k) => k !== 'bakers' && k !== 'dog');
  return rest[Math.abs(hash2(d.seed | 0, 41, 7)) % rest.length];
}
export const arcDone = (state, id) => !!(state.life && state.life.arcs[id] && state.life.arcs[id].done);

/** the harbour the story sends you to: the nearest other harbour the fog allows (Tama's sister harbour for Tama) */
function pickPartner(world, d) {
  if (d.id === '0,-1') { const s = world.desc(-2, -1); if (s) return s; }
  if (d.id === '-2,-1') { const s = world.desc(0, -1); if (s) return s; }
  const list = nearby(world, d.x, d.z, 100, 900, 'harbour').filter((o) => o.d.id !== d.id).sort((a, b) => a.dist - b.dist);
  return list.length ? list[0].d : world.desc(0, -1);
}
const fill = (t, a) => t.replace(/\{P\}/g, a.partnerName).replace(/\{H\}/g, a.homeName);

/** the resident rows shown on this harbour's board: its own story and any story whose partner step is here */
export function residentRows(state, world, d, ctx) {
  const L = lifeOf(state), rows = [];
  // the home story
  const id = d.id, arcId = arcIdOf(d), A = ARCS[arcId];
  let a = L.arcs[id];
  if (!a) { const p = pickPartner(world, d); a = { arc: arcId, step: 0, day: -1, homeName: d.name, partnerName: p ? p.name : d.name, partner: p ? p.id : null }; }
  if (a.done) rows.push({ key: id, after: A.after, who: A.who, dark: ARCS[arcId].steps[3].dark });
  else {
    const s = A.steps[a.step];
    if (s.at === 'home') rows.push(stepRow(state, d, a, A, s, id, ctx));
    else rows.push({ key: id, wait: true, who: A.who, text: fill(`${A.who} is waiting to hear from {P}.`, a) });
  }
  // stories from other harbours whose next step is here
  for (const [hid, b] of Object.entries(L.arcs)) {
    if (hid === id || b.done || !b.partner || b.partner !== d.id) continue;
    const B = ARCS[b.arc], s = B.steps[b.step];
    if (s.at === 'partner') rows.push(stepRow(state, d, b, B, s, hid, ctx));
  }
  return rows;
}
function stepRow(state, d, a, A, s, key, ctx) {
  const today = a.day === state.dayN && a.step > 0;   // one step a day
  let block = today ? 'Come back another day.' : '';
  if (!block && s.need === 'fish' && !state.catch.length) block = 'needs a fish from your hold';
  if (!block && s.need === 'fruit' && !Object.values(state.fruit).some((n) => n > 0)) block = 'needs some fruit';
  if (!block && s.need === 'oil' && state.oil < 10) block = 'needs 10 lamp oil';
  if (!block && s.need === 'night' && !ctx.night) block = 'come back after dark';
  if (!block && s.need === 'event' && !isEvent(d, state)) block = `on ${WEEKDAYS[d.festival]}, the festival day`;
  const name = a.partnerName || '…';
  return { key, who: A.who, text: s.say.replace(/\{P\}/g, name).replace(/\{H\}/g, a.homeName), btn: s.btn, block, dark: !!s.dark };
}
/** take the step: returns { toast, gold, ended, arc } or null */
export function takeStep(state, world, d, key) {
  const L = lifeOf(state);
  let a = L.arcs[key];
  if (!a) { const p = pickPartner(world, d); a = L.arcs[key] = { arc: arcIdOf(d), step: 0, day: -1, homeName: d.name, partner: p ? p.id : null, partnerName: p ? p.name : d.name }; }
  const A = ARCS[a.arc], s = A.steps[a.step];
  if (!s || a.done) return null;
  if (s.need === 'fish') { if (!state.catch.length) return null; state.catch.shift(); }
  if (s.need === 'fruit') { const f = Object.keys(state.fruit).find((k) => state.fruit[k] > 0); if (!f) return null; state.fruit[f]--; }
  if (s.need === 'oil') { if (state.oil < 10) return null; state.oil -= 10; }
  if (s.gold) state.gold += s.gold;
  a.step++; a.day = state.dayN;
  const ended = !!s.end || a.step >= A.steps.length;
  if (ended) { a.done = true; news(state, 'arc', { arc: a.arc, where: a.homeName, at: key }); }
  L.touched = L.touched || {}; L.touched[d.id] = state.dayN;
  return { toast: s.done + (s.gold ? ` (+${s.gold}g)` : ''), ended, arc: a.arc, dark: !!s.dark };
}

// ---------------------------------------------------------------- gossip: what you did travels
export function news(state, kind, o = {}) {
  const L = lifeOf(state); L.news.push({ kind, day: state.dayN, ...o }); if (L.news.length > 30) L.news.shift();
}
const GOSSIP = {
  arc: {
    bakers: ['They say the two bakers in {W} have made it up. Nobody in this town believes it.'],
    dog: ['Heard you brought a little girl\'s dog home to {W}. The dog is telling everyone.'],
    widow: ['That widow in {W} with the lamp. They say the lamp went out. We do not talk about it.'],
    boat: ['A boy in {W} built a boat that floats. Mostly. You had a hand in it, they say.'],
    keeper: ['The old keeper in {W} sees with his eyes shut now, they say. Knows where every ship has been.'],
    singer: ['They sing a new song in {W} at dusk. A sailor taught it them, they say. Do not sing it here.'],
    bride: ['You danced at a wedding in {W}! Badly, they say. Very badly.'],
    counter: ['There is a man in {W} who writes ships on a wall. Yours is on it, they say. More than once.'],
  },
  treasure: ['Heard you dug up a chest on {W}. Half the harbour is out there with shovels now.', 'Treasure off {W}, they say. Was it heavy? It is always heavy in the stories.'],
  raider: ['You sent a Brotherhood ship to the bottom, they say. Drinks are on the house. One drink.', 'Heard about the raider. The Reef Brotherhood heard too, captain. Mind yourself.'],
  game: ['They say you won the {G} in {W}! On the festival day, too.', 'Heard you cleaned up at the {G} in {W}. They want a rematch.'],
  passengers: ['Folk say the Merry Gull is the friendliest passage between here and {W}.'],
};
/** a villager's line about something you did somewhere else, or null; each piece of news is told once per harbour */
export function gossipAt(state, d) {
  const L = lifeOf(state);
  const fresh = L.news.filter((n) => n.at !== d.id && n.where !== d.name && state.dayN - n.day <= 8 && !(L.told[d.id] || []).includes(n.day + n.kind + (n.where || '')));
  if (!fresh.length) return null;
  const n = fresh[fresh.length - 1];
  (L.told[d.id] = L.told[d.id] || []).push(n.day + n.kind + (n.where || ''));
  const pool = n.kind === 'arc' ? GOSSIP.arc[n.arc] : GOSSIP[n.kind];
  if (!pool) return null;
  const text = pool[Math.abs(hash2(d.seed | 0, n.day, 3)) % pool.length].replace(/\{W\}/g, n.where || 'the next harbour').replace(/\{G\}/g, n.game || 'contest');
  return { speaker: 'fisher', text, dark: n.kind === 'arc' && ['widow', 'counter', 'singer'].includes(n.arc) };
}

// ---------------------------------------------------------------- fragments of an old story, one per harbour
// The source fits the village (a carving at the shrine, a song at the fishing town...). A second harbour of the same
// style tells one of the spare ones. Never names her; never explains.
const FRAG_BY_STYLE = {
  classic: { src: 'The bell\'s inscription', text: 'Cut round the rim of the old bell, worn almost smooth: RING SOFTLY. TWO STROKES, NEVER THREE.' },
  fishing: { src: 'An old fisher\'s story', text: 'An old fisher says his grandfather rowed out one calm night to a little black house on the water, and played a game at a table with a woman who never said a word. He won. The fish came back that year.' },
  terraced: { src: 'A painting on the terrace wall', text: 'Painted along the terrace wall, older than the houses: the sea drawn as one long smooth line, a tiny house sitting on it, a light in the house, and nothing else.' },
  thatch: { src: 'A children\'s counting rhyme', text: 'Children skipping on the beach: "One for the gull and two for the bell, three for the one who keeps the sea well... nineteen, twenty, and all of us sleep." They start again at one.' },
  market: { src: 'A dice seller', text: 'An old woman at the market sells dice, all of them twenty-sided, every one missing a different number. "She would like them back," she says, and does not say who.' },
  farm: { src: 'A page wrapping eggs', text: 'The eggs come wrapped in an old ledger page: two columns, a date and a number from one to twenty, going back two hundred years. The last line is dated next month.' },
  shrine: { src: 'A carving over the shrine door', text: 'Carved over the shrine door: a woman at a table, a die with too many faces. Scratched underneath, later and by another hand: SHE COUNTS SO WE DO NOT HAVE TO.' },
  wreckers: { src: 'A figurehead on the beach', text: 'An old figurehead stands in the sand: a woman holding a die. The wreckers touch it for luck before they go out. They touch the die. Never her face.' },
};
const FRAG_SPARE = [
  { src: 'A note in the tavern\'s rafters', text: 'Tucked in the rafters, in a careful hand: "Low numbers tonight. Bar the doors. Do not look at the water until she throws again."' },
  { src: 'An innkeeper\'s habit', text: 'The innkeeper always sets one more place than there are guests, at the end of the table nearest the sea. "For the one who is up all night," she says, as if that explains it.' },
  { src: 'A sailor\'s tattoo', text: 'An old sailor shows you a tattoo on his wrist: a single die, showing twenty. "So she knows I am on her side," he says, and pulls his sleeve down.' },
  { src: 'A sign on the harbour wall', text: 'A painted sign by the pier, very old: QUIET AFTER DARK. SHE IS COUNTING.' },
];
// Earlier dreams (CANON 2026-11-12: the world is a dream, and not the first one). Only in harbours far from Tama, in this order,
// full game only. The last shows something of Mara's village (the street down to the water, the bell, the blue door); she says nothing.
export const FRAG_EARLIER = [
  { src: 'A chart in the harbourmaster\'s drawer', text: 'At the bottom of the harbourmaster\'s drawer, an old chart in a hand nobody here knows. Every island on it is wrong. None of them is anywhere. The sea is drawn exactly the same.' },
  { src: 'A calendar by the tavern door', text: 'A calendar nailed up by the tavern door, the paper gone soft as cloth. The months have names nobody uses. The year printed at the top has never been.' },
  { src: 'An old fisher\'s memory', text: 'An old fisher mending in the sun says that when he was small there were two moons, one behind the other. "Nobody else remembers," he says. "I stopped saying."' },
  { src: 'A small painting in the chapel', text: 'A small painting, very old: a street that runs down to the water, not along it. A bell over the roofs. The third door is blue. Nobody here knows what town it is.', mara: true },
];
const EARLIER_ON = () => typeof window === 'undefined' || window.__BUILD !== 'demo';
const FAR = 600;   // a harbour this far from Tama (0, -118) may keep one of the earlier dreams
/** the fragment this harbour holds (or null once taken). Shown once the harbour knows you: two of a resident step,
 * its game and its dish, and only once the story has reached its later chapters (ok) */
export function fragmentAt(state, d, ok) {
  const L = lifeOf(state);
  if (!ok || L.fragAt[d.id]) return null;
  const known = (L.arcs[d.id] && L.arcs[d.id].step > 0 ? 1 : 0) + (L.played[d.id] != null ? 1 : 0) + (L.ate[d.id] != null ? 1 : 0);
  if (known < 2) return { locked: true };
  if (EARLIER_ON() && Math.hypot(d.x, d.z + 118) > FAR) {   // far out: the next of the earlier dreams, while any is left
    const next = FRAG_EARLIER.find((e) => !L.frags.some((x) => x.text === e.text));
    if (next) return { ...next, style: 'earlier' };
  }
  const style = FRAG_BY_STYLE[d.style] || FRAG_BY_STYLE.classic;
  const usedStyle = L.frags.some((f) => f.style === d.style);
  const f = usedStyle ? FRAG_SPARE.find((s) => !L.frags.some((x) => x.text === s.text)) : style;
  return f ? { ...f, style: d.style } : null;
}
export function takeFragment(state, d, f) {
  const L = lifeOf(state); L.fragAt[d.id] = state.dayN; L.frags.push({ style: f.style, text: f.text, src: f.src, at: d.name });
  state.notes.push({ text: `${f.src}, ${d.name}: ${f.text}`, dark: true });
  return L.frags.length;
}
export const FRAG_TOTAL = Object.keys(FRAG_BY_STYLE).length + FRAG_SPARE.length + (EARLIER_ON() ? FRAG_EARLIER.length : 0);
