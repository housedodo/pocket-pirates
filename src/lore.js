import { pick, smoothstep } from './util.js';

// Names, harbour gossip and loot all drift from cosy to cosmic with dread.

const PREFIX = {
  harbour: ['Port', 'Haven', 'Harbour', 'Port'],
  jungle: ['Isle', 'Green Isle', 'Isle of', 'Palm Isle'],
  sandbar: ['Cay', 'Shoal', 'Sandy Cay', 'Spit'],
  rocky: ['Rock', 'Crag', 'Spire', 'Skerry'],
  treasure: ['Hollow Cay', 'Gold Cay', 'Buried Isle', 'Lost Cay'],
  volcano: ['Mount', 'Ember Isle', 'Ash', 'Smoke Isle'],
  atoll: ['Ring of', 'Lagoon', 'Atoll', 'Blue Ring'],
  mangrove: ['Mangrove', 'Mire', 'Rootwater', 'Heron Isle'],
};
const SYL1 = ['Mar', 'Ros', 'Tor', 'Bel', 'Cor', 'Dun', 'Fen', 'Gal', 'Hal', 'Lor', 'Mon', 'Pel', 'Sal', 'Tam', 'Vel', 'Bri', 'Cal', 'Per'];
const SYL2 = ['ow', 'ra', 'is', 'to', 'en', 'ia', 'ay', 'ell', 'on', 'ina', 'a', 'ar'];
// far out the names wear away: an ordinary name (often one from home) with letters gone, as if rubbed off a chart (no genre names)
const WORN_BASE = ['Tama', 'Tama', 'Velto', 'Monar', 'Belell', 'Salia', 'Perrin', 'Galen'];
const worn = (rng) => { let w = rng() < 0.5 ? pick(rng, WORN_BASE) : `${pick(rng, SYL1)}${pick(rng, SYL2)}`; for (let k = 0, n = 1 + Math.floor(rng() * 2); k < n && w.length > 3; k++) { const i = 1 + Math.floor(rng() * (w.length - 1)); w = w.slice(0, i) + w.slice(i + 1); } return w; };
const ELD_PRE = ['Isle of', 'The', 'Rest of', 'Little'];

export function makeName(rng, type, dread) {
  if (rng() < smoothstep(0.35, 0.85, dread)) {
    return `${pick(rng, ELD_PRE)} ${worn(rng)}`;
  }
  const pre = pick(rng, PREFIX[type]), w = `${pick(rng, SYL1)}${pick(rng, SYL2)}`;
  return `${pre} ${w === 'Mara' ? 'Maren' : w}`;   // never the first mate's name (other islands called Tama are renamed in describeCell)
}

const GOSSIP = [
  [ // sunny
    'Welcome to {name}, captain! Fair winds today!',
    'Fresh fish, fresh rum, fresh rumours! Take your pick.',
    'Folk say there is treasure on the little isles to the north-east. Folk say a lot of things.',
    'Lovely weather. Been lovely for a while now. Nobody can say how long.',
    'Try the fish stew. Nobody knows who makes it, but it\'s always hot.',
    'Our lighthouse keeper retired. The light still comes on. We think he forgot to tell it.',
    'The tide brought in a rowboat this morning. Dry inside. Oars neatly stowed.',
  ],
  [ // off
    'Funny. The gulls went quiet this morning. All of them, at once.',
    'Old Perrin\'s cat will not look at the sea any more. Won\'t even blink.',
    'Same tide as yesterday. Exactly the same. Down to the ripple.',
    'My neighbour\'s dog barks at the sea every evening at the same minute. Then stops. Then wags.',
    'Somebody keeps leaving the harbour bell rope tied in a sailor\'s knot. Nobody here ties that knot.',
    'The children have a new song. Nobody taught it to them. It\'s quite catchy.',
    'Strange. I could have sworn there were four piers yesterday.',
  ],
  [ // wrong
    'The lighthouse lit itself last night. Perrin was very calm about it. Too calm.',
    'We ran out of fish. The nets come up full, but we ran out of fish.',
    'Have you been here before? I could swear I\'ve served you. Tomorrow.',
    'We stopped counting the boats that come back. It was always one more than went out.',
    'The gulls bring us things now. Rings, mostly. Never the same finger size.',
    'Don\'t sleep facing the window. No reason. Just don\'t.',
  ],
  [ // eerie
    'Don\'t look at the water after dusk. Not for long. Not at all.',
    'Everyone left. I stayed to keep the lamps lit. Someone has to. Someone is always watching.',
    'The stars are wrong. I counted them. There are more every night.',
  ],
  [ // cosmic
    '...you can hear it too, can you not? Under the keel. Humming.',
    'Nobody here is angry. Nobody here is in any hurry.',
    'Welcome back, captain. Your chair is where you left it.',
  ],
];
export const gossip = (rng, idx, name) => pick(rng, GOSSIP[Math.min(4, idx)]).replace('{name}', name);

const LOOT_BRIGHT = [
  ['Gilded Compass', 120], ['Pearl Necklace', 150], ['Silver Goblet', 90], ['Jewelled Dagger', 180],
  ['Chest of Doubloons', 260], ['Ruby Idol', 300], ['Captain\'s Spyglass', 110], ['Tin of Fine Tobacco', 60],
];
const LOOT_DARK = [
  ['A jar of teeth', 40], ['A map of somewhere that is not here', 90], ['A conch that whispers your name', 140],
  ['A coin with two faces, both yours', 200], ['A lantern full of dark', 120], ['Seaweed that remembers', 70],
  ['A drawing of the sea, from underneath', 160], ['A key to a door you have not found', 230],
];
export function lootFor(rng, dread) {
  const dark = rng() < smoothstep(0.35, 0.8, dread);
  const [name, value] = pick(rng, dark ? LOOT_DARK : LOOT_BRIGHT);
  return { name, value: Math.round(value * 0.5), dark };   // economy: treasure pays half its table value
}

// ---- messages in bottles, floating salvage
const NOTES = [
  [ // sunny
    'Dear finder: the fishing is wonderful at Port Tama. Come for the rum, stay for the sunsets. -M.',
    'If you read this, you owe me a drink. I threw it from a very nice boat.',
    'Day 12. Spirits high. We have named the parrot "Admiral". It disagrees.',
    'To whoever finds this: the best treasure is the friends we sail with. Also a chest of gold on a small cay, north-east. Mostly the friends.',
    'Day 4. Calm seas. Cook swears the soup tastes of rain. We have not had rain.',
    'Please return this bottle. It is my favourite bottle.',
    'The parrot has learned a new word. None of us said it.',
    'Day 30. We have eaten all the biscuits. Morale remains excellent, thanks to the parrot.',
    'The Grey Tooth keeps a tin box on its top. Bring a pencil.',
    'If you find this at low tide, look around. The sea is generous when it is out.',
    'To my sister in Velto: I am fine. The captain is a fool. The food is good. Burn this.',
  ],
  [ // off
    'Day 20. The gulls have stopped following the boat. Cook says it\'s the weather. There is no weather.',
    'Same sunset three nights running. Everyone agrees. Nobody minds. That bothers me.',
    'We counted the crew this morning. Eleven. We are ten. Please advise.',
    'Whoever finds this: you have lovely handwriting. I saw it on the letter you have not sent yet.',
    'We dropped anchor and it did not reach the bottom. We pulled it up and it was warm.',
    'The birds fly home at dusk and we follow them. Tonight they flew the other way.',
    'Somebody keeps leaving the lantern on the stern lit. Nobody admits it. It is always lit.',
    'The man on the empty island waved. When we came back, there was no island.',
  ],
  [ // wrong
    'The compass points at the water now, not north. Down. We have stopped looking at it.',
    'Do not trust the harbour lights after midnight. They know your name already.',
    'The fish have started to look at us. I want to be clear: they are looking at us.',
    'We sank the anchor and it kept going. We cut the rope. It is still going. I can feel it.',
    'Someone was standing at the end of the pier at dusk again. I did not see them leave.',
  ],
  [ // eerie
    'I have been writing this note for nine days. It is the same note. I think I am the bottle.',
    'Dont follow the singing. It is not coming from the water. It is coming from underneath the water.',
    'The stars are doing something. Please tell me you can see it too.',
    'The note in this bottle was written by me tomorrow. I recognise the handwriting. It shakes more.',
  ],
  [ // cosmic
    'y o u  a r e  n e a r l y  h e r e',
    'We are not lost. We have always been exactly here. It was the sea that moved.',
    'Turn back. Or do not. The water does not mind either way.',
    "d o n ' t  s t o p  r o w i n g",
  ],
];
export const bottleNote = (rng, idx) => pick(rng, NOTES[Math.min(4, idx)]);

const BARRELS_BRIGHT = [['barrel of rum', 25], ['crate of oranges', 18], ['barrel of salted fish', 15], ['chest of silver spoons', 35]];
const BARRELS_DARK = [['barrel of black water', 30], ['crate of teeth', 22], ['barrel that hums', 40], ['sack of wet stars', 45]];
export function barrelLoot(rng, dread) {
  const dark = rng() < smoothstep(0.35, 0.8, dread);
  const [name, value] = pick(rng, dark ? BARRELS_DARK : BARRELS_BRIGHT);
  return { name, value, dark };
}

// ---- sector (region) names
const SEC_ADJ = ['Windward', 'Sunlit', 'Golden', 'Quiet', 'Pearl', 'Coral', 'Salt', 'Lazy', 'Emerald', 'Cinder', 'Gilded', 'Misty'];
const SEC_NOUN = ['Reaches', 'Shoals', 'Straits', 'Banks', 'Sound', 'Cays', 'Passage', 'Waters', 'Flats'];
export function makeSectorName(rng, dread) {
  if (dread > 0.72 || rng() < smoothstep(0.4, 0.85, dread) * 0.7) return `The ${worn(rng)} ${pick(rng, ['Deep', 'Reach', 'Water'])}`;
  return `${pick(rng, SEC_ADJ)} ${pick(rng, SEC_NOUN)}`;
}

// ---- treasure riddles: each treasure isle hides its chest on one particular shore
const RIDDLES = {
  east: [
    ['Where the sun is born, the chest lies sleeping.', 'Greet the morning at the shore it greets first. Dig there.'],
    ['Where the sun is born, and bleeds.', 'The shore that watches the dawn will not blink. Dig beneath its stare.'],
  ],
  west: [
    ['Where the day goes to die, something shiny waits.', 'The shore that swallows the sun keeps my treasure.'],
    ['Where the light is eaten each evening: dig there, and be quick.', 'The setting sun has been feeding on this place for years. Dig where it eats.'],
  ],
  north: [
    ['Seek the shore the pole star never leaves.', 'Look where the compass needle points; the chest lies on that side.'],
    ['Seek the shore that the cold star watches. It watches back.', 'North, always north, where the needle leans toward something that leans back.'],
  ],
  south: [
    ['Turn your back on the pole star. There.', 'The shore opposite the needle is where I buried it.'],
    ['The shore that faces away from every star. Dig there, and do not look up.', 'South, where the compass turns away from itself.'],
  ],
  palm: [
    ['One palm bows alone to the sea. Dig at its root.', 'Where the lone palm leans out over the water, three paces inland.'],
    ['One tree bows to the water as if listening. Dig where it listens.', 'The palm that leans toward the sea is not leaning; it is being pulled.'],
  ],
};
export const PUZZLE_ANGLE = { east: 0, south: Math.PI / 2, west: Math.PI, north: -Math.PI / 2 };
export function makePuzzle(rng, name, dread) {
  const kinds = ['east', 'west', 'north', 'south', 'palm'];
  const kind = kinds[Math.floor(rng() * kinds.length)];
  const dark = dread > 0.45 ? 1 : 0;
  const line = RIDDLES[kind][dark][Math.floor(rng() * 2)];
  const angle = kind === 'palm' ? rng() * Math.PI * 2 : PUZZLE_ANGLE[kind] + (rng() - 0.5) * 0.3;
  return { kind, angle, text: line, name };
}
