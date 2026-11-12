import { mulberry32, hash2 } from './util.js';
import { nearby, findRumour, bearingName } from './jobs.js';

// Passengers: people who pay for passage to another harbour. On the way they talk, a line every half
// minute or so: little stories, hints about buried treasure, gossip. They talk to the captain. Mara answers them, and they never
// hear her: nobody sees or hears Mara but the captain (CANON 2026-11-12). Never pointed out. The captain never says a word.
const PEOPLE = [
  { name: 'Old Wendel', who: 'a retired net-mender', lines: [
    'I mended nets in Tama for forty years. Never once caught a fish myself. Did not like the look in their eyes.',
    'My wife said the sea gives back what it takes. She has been gone eleven years. I am still waiting.',
    'You hold the tiller like my brother did. He was terrible at it too.', 'They say a man in a beard lives on one of the empty islands. I knew a man with a beard. Different man, probably.', 'Do you hear the bell, captain? No? Good. Me neither.'] },
  { name: 'Pippa Fairweather', who: 'a travelling cartographer\'s apprentice', lines: [
    'Master Perrin sends his maps by bottle now. Nobody has seen him hand one over in years.',
    'I drew this coast three times. It came out different every time. The coast, I mean. Not my drawing.',
    'Did you know islands have handwriting? You can tell who drew them by how they curl.', 'I have drawn this coast four times. It is different every time. My master says that is my fault.', 'If two things line up, one behind the other, you are on a line. That is the first thing they teach you. The second is lunch.'] },
  { name: 'Brother Ansel', who: 'a lighthouse monk', lines: [
    'We keep the lamps lit so the ships can find the harbours. And so the harbours can find the ships.',
    'Count the lighthouses on your way. Then count them on your way back. Tell me if the numbers match.',
    'The oil smells of the deep. We do not ask where the guild gets it.', 'Every lighthouse has its own rhythm. I could tell you which one by the blinking, if I were awake at night. I never am.', 'We pray for sailors. We do not say which way we face while we do it.'] },
  { name: 'Mags & Tully', who: 'two fish-wives with a lot of luggage', lines: [
    'Tully says I talk too much. Tully, I do NOT talk too much. See, captain? She is not even listening.',
    'We are visiting our cousin. She owes us a goat. It is a long story. The goat is longer.',
    'Best fish soup in the islands is at the far harbour. Worst too. Same pot.', 'Mags says you are handsome. Tully says you are tired. They are both right.', 'We have brought fish to sell. Yes, on a boat. Yes, at sea. Do not look at us like that.'] },
  { name: 'Captain Ruy', who: 'a captain without a ship', lines: [
    'Lost mine to a whirlpool off the Pearl Banks. Sail round them, never through. Never.',
    'Raiders fly black flags but sail red hulls. If you see red at dusk, put out your lanterns.',
    'A good crew is worth more than a good ship. Yours seems... spirited.', 'I had a ship once. Bigger than this. Slower. Sank on a calm day, which is the worst kind of day to sink.', 'You let the tide do half the work, captain. I approve. I never did, and look at me.'] },
  { name: 'A quiet woman in grey', who: 'going home', lines: [
    'I\'m going home. I\'ll know it when I see it. I always do. It always moves a little.',
    'You have kind hands, captain. Rope-burned. Mine used to be like that.',
    'No, I don\'t need anything to eat. Thank you. I ate, before.', '...', 'I used to know a man who kept a light. He watched the sea from the edge every evening. I never asked what he was looking for.'] },
  { name: 'Pim', who: 'a boy with a lantern', lines: [
    'My mum said keep it lit till we land. She didn\'t say which land.',
    'Do boats dream? I think this one does. It keeps turning left in its sleep.',
    'I\'m not scared of the dark. The dark is scared of the lantern. Mum said.', "Can I hold the tiller? I won't steer. I just want to hold it.", 'My lantern is out of oil. It is fine. I am not scared. I am a little scared.'] },
  { name: 'Master Odo', who: 'a notary with a sealed letter', lines: [
    'I have a document for someone on board. It says "the captain". It doesn\'t say which one.',
    'Everything must be signed, captain. Births, ships, tides. Somebody signs the tides, you know.',
    'Your name, for my records? ...Never mind. I seem to have it already.', 'The letter is sealed. I do not know what it says. I would very much like to know what it says.', 'Contracts, captain, are like tides. They come back around.'] },
];
// [the passenger, to the captain] [Mara, answering] [the passenger again, as if nobody had spoken]
const MARA_BANTER = [
  ['Just the one of you on this whole ship, Captain? Brave.', 'Two! There are two of us. Hello?', 'Must get lonely out here. I would talk to myself.'],
  ['Who were you smiling at just now, Captain? ...Never mind. Sea air.', 'At me. I told a very good joke.', 'My uncle used to smile at the sea like that. Nice man.'],
  ['Is there tea aboard? I can make it myself, I do not want to be a bother.', 'Second cup is mine, thank you.', 'One cup, then. One is plenty.'],
  ['Do you always set out two mugs, Captain?', 'Yes. Because there ARE two.', 'Habit, I suppose. I still set a place for my mother.'],
  ['Somebody has left a coat on the hatch. Yours?', 'Mine. Do not sit on it.', 'Lovely and warm. As if somebody just took it off.'],
  ['Does the ship always creak like that? Like somebody walking about?', 'That is me. I am walking about.', 'Old boats talk, my father said. Pay them no mind.'],
  ['Who steers while you sleep, Captain?', 'I do! Me. Right here.', 'The sea, I suppose. It knows the way.'],
  ['I think a gull just stole my hat.', 'He does that. We call him the Quartermaster.', 'Nobody saw that, did they? Good.'],
  ['This ship is smaller than it looked from the dock.', 'She is cosy! Cosy is a feature.', 'Still. Room enough for one.'],
];
const SEASICK = [
  'Is this a storm or is the sea just upset with me personally?',
  'I am going to lie down on the deck. If I roll overboard, it was a good trip.',
  'Captain, I think my breakfast wants to go home before I do.',
  'Is the ship supposed to lean like this? Do not answer that.',
  'I will pay double if you make it stop. I will pay triple. I have no more money but I will pay it.',
];
const DARK_LINES = [
  'The water is so quiet here. Is it always this quiet?',
  'I keep hearing my name from under the hull. Probably just the planks. Probably.',
  'Please do not stop the ship out here.',
];

export function makePassenger(world, from, serial, force = false) {
  const rng = mulberry32(hash2(from.seed, serial, 4747));
  if (rng() > 0.55 && !force) return null;                                   // not every day somebody wants to travel
  const list = nearby(world, from.x, from.z, 150, 1100, 'harbour').filter((o) => o.d.id !== from.id);
  if (!list.length) return null;
  const { d: to, dist } = list[Math.floor(rng() * list.length) % list.length];
  const p = PEOPLE[Math.floor(rng() * PEOPLE.length) % PEOPLE.length];
  return { name: p.name, who: p.who, fromId: from.id, toId: to.id, toName: to.name, x: to.x, z: to.z, reward: Math.round(15 + dist * 0.09), said: 0, timer: 12 };
}

/** called every frame while a passenger is aboard and the ship is sailing */
export function passengerTalk(pass, dt, ctx) {   // ctx: { mate, world, ship, state, dread }
  if (ctx.mate.busy || (ctx.mate.hush && ctx.mate.hush())) return;   // no chatter round the hut or the diver
  pass.timer -= dt;
  if (pass.timer > 0) return;
  pass.timer = 28 + Math.random() * 22;
  const p = PEOPLE.find((x) => x.name === pass.name) || PEOPLE[0];
  const say = (t, dk) => ctx.mate.say(t, dk, pass.name);
  const dk = ctx.dread > 0.55;
  const roll = Math.random();
  if (ctx.storm > 0.4 && roll < 0.6) { say(SEASICK[Math.floor(Math.random() * SEASICK.length)]); if (Math.random() < 0.4) { ctx.mate.say('Lean over the downwind side. The OTHER side!'); say('Which side is downwind, Captain? Never mind. I will guess.'); } return; }
  if (dk && roll < 0.5) { say(DARK_LINES[pass.said++ % DARK_LINES.length], true); return; }
  if (roll < 0.3) {                                                // a treasure hint: it goes on your chart
    const r = findRumour(ctx.world, { x: ctx.ship.pos.x, z: ctx.ship.pos.z }, ctx.state);
    if (r) {
      ctx.state.rumoured[r.d.id] = { name: r.d.name, x: Math.round(r.d.x), z: Math.round(r.d.z), source: pass.name, found: false };
      say(`My grandfather swore there was gold buried on ${r.d.name}, ${bearingName(r.d.x - ctx.ship.pos.x, r.d.z - ctx.ship.pos.z)} of here. Mark it, if you like. I never had a boat.`);
      return;
    }
  }
  if (roll < 0.55) { const [a, b, c] = MARA_BANTER[Math.floor(Math.random() * MARA_BANTER.length)]; say(a); ctx.mate.say(b, false); if (c) say(c); return; }   // she answers; they do not hear her
  say(p.lines[pass.said++ % p.lines.length]);
}
