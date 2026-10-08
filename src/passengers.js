import { mulberry32, hash2 } from './util.js';
import { nearby, findRumour, bearingName } from './jobs.js';

// Passengers: people who pay for passage to another harbour. On the way they talk, a line every half
// minute or so: little stories, hints about buried treasure, gossip. Sometimes Mara answers back.
// The captain never says a word.
const PEOPLE = [
  { name: 'Old Wendel', who: 'a retired net-mender', lines: [
    'I mended nets in Tama for forty years. Never once caught a fish myself. Did not like the look in their eyes.',
    'My wife said the sea gives back what it takes. She has been gone eleven years. I am still waiting.',
    'You hold the tiller like my brother did. He was terrible at it too.'] },
  { name: 'Pippa Fairweather', who: 'a travelling cartographer\'s apprentice', lines: [
    'Master Perrin sends his maps by bottle now. Nobody has seen him hand one over in years.',
    'I drew this coast three times. It came out different every time. The coast, I mean. Not my drawing.',
    'Did you know islands have handwriting? You can tell who drew them by how they curl.'] },
  { name: 'Brother Ansel', who: 'a lighthouse monk', lines: [
    'We keep the lamps lit so the ships can find the harbours. And so the harbours can find the ships.',
    'Count the lighthouses on your way. Then count them on your way back. Tell me if the numbers match.',
    'The oil smells of the deep. We do not ask where the guild gets it.'] },
  { name: 'Mags & Tully', who: 'two fish-wives with a lot of luggage', lines: [
    'Tully says I talk too much. Tully, I do NOT talk too much. See, captain? She is not even listening.',
    'We are visiting our cousin. She owes us a goat. It is a long story. The goat is longer.',
    'Best fish soup in the islands is at the far harbour. Worst too. Same pot.'] },
  { name: 'Captain Ruy', who: 'a captain without a ship', lines: [
    'Lost mine to a whirlpool off the Pearl Banks. Sail round them, never through. Never.',
    'Raiders fly black flags but sail red hulls. If you see red at dusk, put out your lanterns.',
    'A good crew is worth more than a good ship. Yours seems... spirited.'] },
  { name: 'A quiet woman in grey', who: 'going home', lines: [
    'I\'m going home. I\'ll know it when I see it. I always do. It always moves a little.',
    'You have kind hands, captain. Rope-burned. Mine used to be like that.',
    'No, I don\'t need anything to eat. Thank you. I ate, before.'] },
  { name: 'Pim', who: 'a boy with a lantern', lines: [
    'My mum said keep it lit till we land. She didn\'t say which land.',
    'Do boats dream? I think this one does. It keeps turning left in its sleep.',
    'I\'m not scared of the dark. The dark is scared of the lantern. Mum said.'] },
  { name: 'Master Odo', who: 'a notary with a sealed letter', lines: [
    'I have a document for someone on board. It says "the captain". It doesn\'t say which one.',
    'Everything must be signed, captain. Births, ships, tides. Somebody signs the tides, you know.',
    'Your name, for my records? ...Never mind. I seem to have it already.'] },
];
const MARA_BANTER = [
  ['Is she always this cheerful?', 'Always! Even in storms. ESPECIALLY in storms.'],
  ['Does the captain ever speak?', 'Only in emergencies. And knots. Very expressive knots.'],
  ['This ship is smaller than it looked from the dock.', 'She is cosy! Cosy is a feature.'],
  ['Is that fish hanging from the mast for luck?', 'For lunch. Luck was yesterday\'s fish.'],
  ['How long have you sailed together?', 'Since forever! Well. Since Tuesday. Forever-ish.'],
  ['I think a gull just stole my hat.', 'He does that. We call him the Quartermaster.'],
];
const SEASICK = [
  'Captain, I think my breakfast wants to go home before I do.',
  'Is the ship supposed to lean like this? Do not answer that.',
  'I will pay double if you make it stop. I will pay triple. I have no more money but I will pay it.',
];
const DARK_LINES = [
  'The water is so quiet here. Is it always this quiet?',
  'I keep hearing my name from under the hull. Probably just the planks. Probably.',
  'Please do not stop the ship out here.',
];

export function makePassenger(world, from, serial) {
  const rng = mulberry32(hash2(from.seed, serial, 4747));
  if (rng() > 0.55) return null;                                   // not every day somebody wants to travel
  const list = nearby(world, from.x, from.z, 250, 1100, 'harbour').filter((o) => o.d.id !== from.id);
  if (!list.length) return null;
  const { d: to, dist } = list[Math.floor(rng() * list.length) % list.length];
  const p = PEOPLE[Math.floor(rng() * PEOPLE.length) % PEOPLE.length];
  return { name: p.name, who: p.who, fromId: from.id, toId: to.id, toName: to.name, x: to.x, z: to.z, reward: Math.round(15 + dist * 0.09), said: 0, timer: 12 };
}

/** called every frame while a passenger is aboard and the ship is sailing */
export function passengerTalk(pass, dt, ctx) {   // ctx: { mate, world, ship, state, dread }
  if (ctx.mate.busy) return;
  pass.timer -= dt;
  if (pass.timer > 0) return;
  pass.timer = 28 + Math.random() * 22;
  const p = PEOPLE.find((x) => x.name === pass.name) || PEOPLE[0];
  const say = (t, dk) => ctx.mate.say(t, dk, pass.name);
  const dk = ctx.dread > 0.55;
  const roll = Math.random();
  if (ctx.storm > 0.4 && roll < 0.6) { say(SEASICK[Math.floor(Math.random() * SEASICK.length)]); if (Math.random() < 0.4) ctx.mate.say('Lean over the downwind side. The OTHER side!'); return; }
  if (dk && roll < 0.5) { say(DARK_LINES[pass.said++ % DARK_LINES.length], true); return; }
  if (roll < 0.3) {                                                // a treasure hint: it goes on your chart
    const r = findRumour(ctx.world, { x: ctx.ship.pos.x, z: ctx.ship.pos.z }, ctx.state);
    if (r) {
      ctx.state.rumoured[r.d.id] = { name: r.d.name, x: Math.round(r.d.x), z: Math.round(r.d.z), source: pass.name, found: false };
      say(`My grandfather swore there was gold buried on ${r.d.name}, ${bearingName(r.d.x - ctx.ship.pos.x, r.d.z - ctx.ship.pos.z)} of here. Mark it, if you like. I never had a boat.`);
      return;
    }
  }
  if (roll < 0.55) { const [a, b] = MARA_BANTER[Math.floor(Math.random() * MARA_BANTER.length)]; say(a); ctx.mate.say(b, false); return; }
  say(p.lines[pass.said++ % p.lines.length]);
}
