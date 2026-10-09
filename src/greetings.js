// Harbour greetings: now and then, when you come ashore, someone on the pier says something first.
// Who speaks depends on the hour; what they say on the hour, the weather and how wrong the sea has become.
// Rare on purpose: a line you only hear sometimes is a line you read.

// portraits: 8x8, H hair/hat, S skin, E eyes, M mouth, C clothes, A accent
const FACE = ['..HHHH..', '.HHHHHH.', '.SSSSSS.', '.SESSES.', '.SSSSSS.', '..SMMS..', '.CCACCC.', 'CCCCCCCC'];
const SPEAKERS = {
  fisher: { name: 'An old fisher', H: '#3a4a5a', S: '#c98e64', C: '#2f6a8a', A: '#e8dcc0', when: ['dawn', 'day'] },
  netmender: { name: 'A net-mender', H: '#8a8a8a', S: '#e8b88a', C: '#6a4a2a', A: '#c8b078', when: ['dawn', 'day', 'evening'] },
  market: { name: 'A woman at the fish stall', H: '#d24a3e', S: '#f2cfa8', C: '#e8c040', A: '#ffffff', when: ['day'] },
  child: { name: 'A barefoot child', H: '#5a3a1c', S: '#e8b88a', C: '#5ec45a', A: '#ffd23a', when: ['day', 'evening'] },
  harbourmaster: { name: 'The harbourmaster', H: '#1b1538', S: '#c98e64', C: '#2a4e72', A: '#ffd23a', when: ['dawn', 'day', 'evening'] },
  docker: { name: 'A docker with a crate', H: '#c8402a', S: '#8a5a3a', C: '#9a6ad0', A: '#c8b078', when: ['dawn', 'day'] },
  oldsalt: { name: 'An old salt on a barrel', H: '#e8e0d0', S: '#c98e64', C: '#3c78c8', A: '#e8e0d0', when: ['day', 'evening', 'night'] },
  innkeeper: { name: 'The innkeeper', H: '#5a3a1c', S: '#f2cfa8', C: '#7a2418', A: '#f4ead0', when: ['evening', 'night'] },
  fiddler: { name: 'A fiddler outside the tavern', H: '#2a1608', S: '#e8b88a', C: '#4e6a26', A: '#c9a85c', when: ['evening'] },
  lamplighter: { name: 'The lamplighter', H: '#3a3448', S: '#c98e64', C: '#5a5a62', A: '#ffd060', when: ['evening', 'night'] },
  watchman: { name: 'The night watchman', H: '#2a2a30', S: '#c98e64', C: '#3a3a48', A: '#ffd060', when: ['night'] },
  someone: { name: 'Someone on the pier', H: '#0a0810', S: '#14101c', C: '#0a0810', A: '#0a0810', when: [], eyes: '#d8d0e0', mouth: '#14101c' },
};
export const speakerName = (id) => SPEAKERS[id].name;

const portraitCache = {};
export function portrait(id) {
  if (portraitCache[id]) return portraitCache[id];
  const sp = SPEAKERS[id], cv = document.createElement('canvas'); cv.width = cv.height = 8;
  const c = cv.getContext('2d'), col = { H: sp.H, S: sp.S, C: sp.C, A: sp.A, E: sp.eyes || '#1a0f08', M: sp.mouth || '#7a3a2a' };
  FACE.forEach((row, y) => [...row].forEach((ch, x) => { if (col[ch]) { c.fillStyle = col[ch]; c.fillRect(x, y, 1, 1); } }));
  return (portraitCache[id] = cv.toDataURL());
}

// ---- lines. Short; odd rather than scary; nothing explained.
const BY_TIME = {
  dawn: [
    'You are up early, captain. The sea is always politest before breakfast.',
    'First boat out this morning came back with its nets folded. Nobody folded them.',
    'Mind the mist on the water. It burns off by eight. Usually by eight.',
    'Bread is still warm, captain. Bakery opens before the bakers wake.',
    'Morning! The gulls are late today. They are never late.',
  ],
  day: [
    'Fresh fish, fresh rum, fresh rumours! Take your pick.',
    'Lovely weather. Been lovely for a while now. Nobody can say how long.',
    'Try the fish stew. Nobody knows who makes it, but it is always hot.',
    'Folk say there is treasure on the little isles. Folk say a lot of things.',
    'You have got a good ship there. Small. Brave. Like a dog that barks at thunder.',
    'Captain! Buy a mango. Buy two. They will not keep.',
    'Hot one today. Even the crabs are sitting in the shade.',
    'Welcome, welcome! Mind the step. Mind the next one too.',
  ],
  evening: [
    'Tavern is warm and the beds are only a little haunted. Ha! Joking.',
    'Watch the lighthouse come on. It is the best part of the day.',
    'Stay for a song? We only know the one, but we know it very well.',
    'Sun goes down the same way every evening. You would think that would be comforting.',
    'Supper is fish. Supper is always fish. Nobody here has ever complained.',
  ],
  night: [
    'Late to be sailing, captain. The sea does not mind. The sea never minds.',
    'Lanterns stay lit till dawn. It is the rule. Nobody remembers why. It is still the rule.',
    'Keep your voice down. The water carries sound at night. Both ways.',
    'Do not count the stars out here. You will only get a different number.',
    'Who goes there? Oh. A captain. You are allowed. Probably.',
  ],
};
// each speaker has a few of their own
const BY_SPEAKER = {
  fisher: ['Nets were heavy today. Mostly fish.', 'Wind is from the right place for once. Make use of it.', 'I have fished here forty years. The sea has never once said thank you.'],
  netmender: ['Every hole I mend, the sea makes two. We get along.', 'Hold this end, would you? No? Fair enough.', 'Found a knot in the net this morning I never learned. Lovely knot.'],
  market: ['Mangoes! Limes! Something purple, I forget the name! All fresh!', 'You look thin, captain. Have a fish. Have three.', 'Do not haggle with me before noon. After noon, you may try.'],
  child: ['Is that your ship? Can I steer? Just a bit?', 'I found a shell that whispers. Want to hear? No, wait, it stopped.', 'Mum says not to talk to sailors. You are not a sailor, you are a captain.'],
  harbourmaster: ['Berth three is free. Berth four is free. Do not use berth five.', 'Sign the book, captain. Anywhere is fine. The pages fill up on their own anyway.', 'Watch the sky, not the water. The sky tells you sooner.'],
  docker: ['Mind your feet. This crate is heavier than it looks. Always is.', 'Crates in, crates out. Some days I do not know which.', 'Lift with your legs, captain. Not with your hopes.'],
  oldsalt: ['When I was your age the sea was flat as a plate. Truly. Ask anyone. Nobody remembers.', 'Sit a while. The barrel does not mind. I asked.', 'Had a ship like yours once. Then I had half a ship. Then I had this barrel.'],
  innkeeper: ['Beds are dry and the soup is wet. That is all I promise.', 'Room at the end of the hall. Leave the window shut. It sticks. That is all.', 'You look like you need a bed, captain. Or a week.'],
  fiddler: ['A coin for a tune? A tune for a coin? I am not fussy about the order.', 'I know one song. Every night it is a little longer.', 'Shh. Listen. Even the gulls are keeping time.'],
  lamplighter: ['One lamp for every boat out. That is the custom. I light a few extra, to be safe.', 'Evening, captain. You are lit now. Off you go.', 'Some nights the lamps light before I reach them. Saves me the walk.'],
  watchman: ['Halt! Oh. It is you. Carry on.', 'All quiet. Quiet is good. Mostly.', 'I walk the pier till dawn. The pier is longer at night. I have measured.'],
};
// what a village does, said as if it were nothing
const BY_CUSTOM = {
  whitewash: ['We paint the houses every spring. White walls, blue roofs. Always have.', 'Mind the paint, captain. It is always a little wet.'],
  lanterns: ['The lamps stay lit all night here. The rule is older than the lamps.', 'Bring oil if you come back. We go through a lot of oil.'],
  nochildren: ['Children? No, not here. Not for a long time. More tea?', 'It is a quiet village. We like it quiet.'],
  choir: ['Stay till dusk, captain. We sing at dusk. Everyone sings.', 'You will hear us from the water tonight. We always know the words.'],
  nightboats: ['We fish at night here. The fish are braver in the dark. So are we.', 'Look for our lanterns on the water after sundown. Wave if you like.'],
  kites: ['Kites up every afternoon! The wind likes us here.', 'My kite is the red one. No, the other red one.'],
  bells: ['You will hear the bells at noon. Twelve, every day. We count.', 'The bell rope is worn smooth. Nobody remembers who rang it first.'],
};
const BY_EVENT = {
  market: ['Market day! Everyone is buying, nobody is listening. Perfect.', 'Bring your fish, captain. Market day pays.'],
  festival: ['Festival today! Eat something. Dance something. Do not ask what the songs are about.', 'Flags up, lamps lit, nobody working. Festival day.'],
  lantern: ['Lantern night. We set them on the water and let them go. They come back, mostly.', 'Light one for someone, captain. Anyone. They do not have to be gone.'],
};
const BY_WEATHER = {
  Rain: [
    'Come in out of the wet! Not that it helps. Everything here is a little damp forever.',
    'Rain on the harbour is good luck. Rain in the harbour is something else.',
    'Smell that? Rain and tar. Best smell in the world, ask anyone.',
  ],
  Storm: [
    'You sailed in this? You are either very brave or very lost.',
    'Tie her up double, captain. The last ship that tied up single is still out there. Somewhere.',
  ],
  Fog: [
    'Did you come in on the fog or through it? There is a difference.',
    'In fog like this you hear the bell from the old belfry. We have no belfry.',
  ],
  Overcast: [
    'Grey all day. Good for the skin, bad for the mood.',
    'Clouds sitting low today. Like they are listening.',
  ],
  Calm: [
    'Not a breath of wind all day. The flags do not even remember how to flap.',
    'Sea like glass today. You can see right down. I would not.',
  ],
};
const BY_DREAD = [
  [],
  [ // off
    'Funny. The gulls went quiet this morning. All of them, at once.',
    'Somebody keeps leaving wet footprints on the pier. Coming up out of the water. Just the one set.',
    'The bell rang twelve at noon. Then thirteen. Then it stopped, embarrassed.',
    'Same tide as yesterday. Exactly the same. Down to the ripple.',
    'Strange. I could have sworn there were four piers yesterday.',
    'The children have a new song. Nobody taught it to them. It is quite catchy.',
    'Old Perrin\'s cat will not look at the sea any more. Will not even blink.',
  ],
  [ // wrong
    'Have you been here before? I could swear I served you. Tomorrow.',
    'We ran out of fish. The nets come up full, but we ran out of fish.',
    'The gulls bring us things now. Rings, mostly. Never the same finger size.',
    'Do not sleep facing the window. No reason. Just do not.',
    'We stopped counting the boats that come back. It was always one more than went out.',
    'My reflection waved first today. I waved back. It seemed polite.',
    'The tide came in and forgot to go out. We are waiting to see what it wants.',
  ],
  [ // eerie
    'Do not look at the water after dusk. Not for long. Not at all.',
    'Everyone left. I stayed to keep the lamps lit. Someone has to.',
    'You are welcome here. You are always welcome here. You are always here.',
    'We remember you. We always remember you.',
    'The fish have started looking up. All of them. At the same spot.',
    'Your ship came in last night as well. We waved. Nobody waved back.',
  ],
  [ // cosmic
    '...you can hear it too, can you not? Under the keel. Humming.',
    'It is not angry. That is the worst part. It is only very, very patient.',
    'Welcome home, captain. We saved your seat. It was always your seat.',
  ],
];

export function dayPhase(hour) { return hour >= 5 && hour < 8 ? 'dawn' : hour >= 8 && hour < 18 ? 'day' : hour >= 18 && hour < 22 ? 'evening' : 'night'; }

/** a speaker and a line for this visit. ctx: { hour, weather (label), dread 0..1, rnd } */
export function pickGreeting(ctx) {
  const r = ctx.rnd, stage = Math.min(4, Math.floor(ctx.dread * 5)), phase = dayPhase(ctx.hour);
  // as the sea goes wrong, sometimes nobody says anything at all
  if (stage >= 2 && r() < 0.18 + 0.12 * (stage - 2)) return { speaker: 'someone', text: '...', slow: true, dark: true };
  const who = Object.keys(SPEAKERS).filter((id) => SPEAKERS[id].when.includes(phase)), speaker = who[Math.floor(r() * who.length)];
  const pool = [];
  for (const l of BY_SPEAKER[speaker] || []) pool.push([l, stage <= 1 ? 4 : stage === 2 ? 2 : 0.5]);
  for (const l of BY_TIME[phase]) pool.push([l, stage <= 1 ? 3 : 1]);
  for (const l of BY_WEATHER[ctx.weather] || []) pool.push([l, 4]);
  for (const l of BY_CUSTOM[ctx.custom] || []) pool.push([l, stage <= 2 ? 4 : 1]);
  for (const l of BY_EVENT[ctx.event] || []) pool.push([l, 6]);
  for (let s = 1; s <= stage; s++) for (const l of BY_DREAD[s]) pool.push([l, s === stage ? 5 : 1]);
  let total = pool.reduce((a, [, w]) => a + w, 0), k = r() * total, text = pool[0][0];
  for (const [l, w] of pool) { k -= w; if (k <= 0) { text = l; break; } }
  return { speaker, text, dark: stage >= 3 };
}

// ---- after a throw at the hut, someone on the pier already knows the number. Nobody says how.
const WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
export const numberWord = (n) => WORDS[n] || String(n);
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const an = (n) => (n === 8 || n === 11 || n === 18 ? 'an' : 'a');
const BY_ROLL = {
  low: ['Bad luck travels fast, captain. {A} {w}, was it?', 'Heard it came up {w}. Nobody told me. I just heard.', 'You threw {a} {w} last night, did you not? The fish knew before we did.', '{W}. Hm. Well. Nobody blames you. Not yet.', 'The tide came in {w} minutes late this morning. Funny number, {w}.'],
  ten: ['Ten. Nothing at all. She almost smiled, did she not?', 'A ten, they say. Neither here nor there. Like the rest of us.'],
  mid: ['Heard you threw {a} {w}! The whole pier slept well.', '{A} {w}, they say. Good. Good. Keep doing that.', 'Calm night, thanks to you. {W}, was it? Lovely number.'],
  high: ['{W}! The nets came up singing this morning. That was you, was it not?', 'Somebody threw {a} {w} and the whole sea went soft. Was that you, captain?'],
  twenty: ['Twenty. You could hear the whole sea let its breath out.', 'Twenty! The old women in the market are crying. Good crying, mostly.'],
};
/** a greeting about the player's last throw at the hut */
export function rollGreeting(n, hour, rnd) {
  if (n === 1) return { speaker: 'someone', text: 'One.', slowWord: true, dark: true };
  const pool = n === 20 ? BY_ROLL.twenty : n >= 17 ? BY_ROLL.high : n >= 11 ? BY_ROLL.mid : n === 10 ? BY_ROLL.ten : BY_ROLL.low;
  const w = numberWord(n), text = pool[Math.floor(rnd() * pool.length)].replace(/\{w\}/g, w).replace(/\{W\}/g, cap(w)).replace(/\{a\}/g, an(n)).replace(/\{A\}/g, cap(an(n)));
  const phase = dayPhase(hour), who = Object.keys(SPEAKERS).filter((id) => SPEAKERS[id].when.includes(phase));
  return { speaker: who[Math.floor(rnd() * who.length)], text, dark: n <= 5 };
}
