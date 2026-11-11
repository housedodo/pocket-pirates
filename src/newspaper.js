// The harbour paper: The Harbour Tidings comes in on the Friday boat and is sold at every market, once a week.
// Three parts: the weather for the region (true to the calendar: it knows the storm fronts), one face from the
// harbour, and the news (some of it is what you did). The higher the dread when you buy it, the less the paper
// sounds like a paper. Never explains; it only prints.
// main.js draws the market row and the open paper; state.life.paper keeps the last copy you bought.
import { mulberry32, hash2 } from './util.js';
import { lifeOf, WEEKDAYS } from './harbourlife.js';

export const PAPER_DAY = 4;   // Friday
export const PAPER_COST = 3;
export const weekOf = (state) => Math.floor(state.dayN / 7);
export const onSale = (state) => state.dayN % 7 === PAPER_DAY;
/** the copy bought this week, or null */
export const thisWeeks = (state) => { const p = lifeOf(state).paper; return p && p.week === weekOf(state) ? p : null; };
/** "Friday (in 3 days)" for the market row */
export function nextLine(state) { const n = (PAPER_DAY - (state.dayN % 7) + 7) % 7 || 7; return `${WEEKDAYS[PAPER_DAY]} (${n === 1 ? 'tomorrow' : `in ${n} days`})`; }
export const stageOf = (dread) => Math.min(4, Math.floor(dread * 5));

const pick = (rng, a) => a[Math.floor(rng() * a.length)];
const NAMES = ['Bettany Crale', 'Hamish Vell', 'Rosa Tully', 'Ewan Pike', 'Dorie Albright', 'Mags Fenner', 'Old Jory', 'Nan Ostler', 'Silas Keel', 'Wenna Holt', 'Tobin Marsh', 'Ida Swale'];

// ---------------------------------------------------------------- masthead, by dread stage
const MAST = ['THE HARBOUR TIDINGS', 'THE HARBOUR TIDINGS', 'THE HARBOUR TIDINGS', 'THE HARBOUR TIDINGS', 'THE TIDINGS'];
const TAG = ['News from every quay', 'News from every quay', 'News from every quay', 'News from every quay. Read it twice.', 'For those still awake'];
export const BUY_LINE = ['The ink is still wet.', 'The ink is still wet.', 'The ink is still wet. The boy who sold it would not stay.', 'The paper is damp. It smells of the sea.', 'The paper is damp, and warm.'];

// ---------------------------------------------------------------- the weather: the region's character and the calendar
const SKY = {
  crown: ['Fair, a fresh breeze', 'Cloud, clearing by noon', 'Bright and steady'],
  free: ['Fair and warm', 'Light airs, sun', 'Fair, a little cloud'],
  reef: ['Squalls by afternoon', 'Showers, hard and short', 'Fair, then a blow'],
  lantern: ['Fog at dawn, lifting late', 'Grey and still', 'Mist on the water by night'],
  drowned: ['Rain, then fog', 'Low cloud, a long swell', 'Drizzle all day'],
};
const WINDS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const SKY_UNEASY = ['Calm. The water flat as a table', 'Fog. Keep the lamps lit and count the crew', 'Still. No wind is expected', 'Clear, but the stars will be late'];
const SKY_LAST = [['Dark by noon', 'none'], ['Dark', 'none'], ['There is no forecast for Sunday', '']];
function forecast(rng, state, fac, stage, frontOn) {
  const rows = [];
  for (let k = 0; k < 3; k++) {
    const day = state.dayN + k, name = WEEKDAYS[day % 7];
    if (stage >= 4) { rows.push({ day: name, sky: SKY_LAST[k][0], wind: SKY_LAST[k][1] }); continue; }
    let sky = pick(rng, SKY[fac] || SKY.crown), wind = `${pick(rng, ['light', 'moderate', 'fresh'])}, ${pick(rng, WINDS)}`;
    if (frontOn && day % 6 === 5) { sky = 'A front in the afternoon. Be in harbour by noon'; wind = 'strong, rising'; }
    else if (stage === 2 && rng() < 0.5) sky += '. Fog by night';
    else if (stage === 3 && rng() < 0.7) { sky = SKY_UNEASY[(Math.floor(rng() * 4) + k) % SKY_UNEASY.length]; wind = rng() < 0.5 ? 'none' : wind; }
    rows.push({ day: name, sky, wind });
  }
  return rows;
}

// ---------------------------------------------------------------- one face from the harbour
const FACES = [
  [ // 0-1: the cosy harbour
    '{N} turned ninety on Tuesday and mended a net to prove it. "Ninety is nothing," {N} says. "The net was older."',
    '{N} has kept the same gull for eleven years. It is called Admiral. It has bitten the harbourmaster four times; {N} says it is choosy.',
    '{N} grows the biggest pumpkins on {H}, and says so to everyone who asks and most who do not.',
    '{N} rowed to the next island and back before breakfast, for a bet. Nobody remembers the bet. {N} won it.',
    '{N} is learning the fiddle. The tavern is patient. The dogs are less patient.',
    '{N} has painted every boat in {H} at least once. "Red for luck, yellow for the fish, and blue so the sea does not notice you."',
  ],
  [ // 2: uneasy
    '{N} has not been to sea since spring. "The fish looked up at me," {N} says, and will say no more. The boat is for sale. Nobody has asked.',
    '{N} sleeps by day now and walks the quay all night with a lamp. "Someone should be awake," {N} says. We thank {N} for it.',
    '{N} counts the boats in the harbour every evening, twice. The numbers do not always agree. {N} has begun to write them down.',
    '{N} the diver brought up a bell from the reef. It was dry inside. {N} has gone down every day since, "to see what else is dry."',
  ],
  [ // 3: wrong
    '{N} has stood at the end of the pier since Tuesday, facing the water. {N} is not unwell. {N} says it is nearly {N}\'s turn.',
    '{N} came home on Monday with the nets full and nobody else aboard. {N} says there was never any crew. There were three.',
    '{N} is teaching the children a new counting game. It goes up to twenty. The children will not say what happens at twenty.',
    'We were to write about {N} this week. Nobody here remembers who {N} is. If you do, write to us.',
  ],
  [ // 4: the paper looks back
    'This week\'s face is a captain with a ship called the Merry Gull. The Gull comes in every night after the lamps are out, ties up, and nobody comes ashore. We have kept a place at the table.',
    'This week\'s face is yours. Please hold still.',
    'There is nobody left in {H} to write about. There is a table by the water. Someone is sitting at it.',
  ],
];
const faceBand = (stage) => (stage <= 1 ? 0 : stage - 1);

// ---------------------------------------------------------------- the news: what you did, the region, the sea
const DEEDS = {
  treasure: ['CHEST DUG UP ON {W}', 'Half the harbour is out with shovels. The other half is selling shovels.'],
  raider: ['BROTHERHOOD SHIP SUNK', 'A visiting captain is thanked. The Reef Brotherhood says nothing, which is not like them.'],
  game: ['FESTIVAL PRIZE TAKEN AT {W}', 'A stranger won the {G}. {W} demands a rematch.'],
  passengers: ['FRIENDLY PASSAGE TO {W}', 'Travellers speak well of the Merry Gull. One says the captain hums.'],
  arc: ['THINGS HAVE CHANGED IN {W}', 'Ask anyone on the quay there. They will tell you all of it, twice.'],
};
const DEED_DARK = ['THE MERRY GULL WAS SEEN', 'Doing all the things a ship does. We have written every one of them down.'];
const REGION = {
  crown: [['CROWN RAISES HARBOUR DUES', 'A penny on every barrel. The quay is not pleased.'], ['NORTHERN LIGHT GOES DARK', 'The keeper says the lamp was lit. The ships say it was not.']],
  free: [['BOAT RACE ROUND THE CAYS', 'Won by a canoe with a goat in it. The goat is not allowed to race again.'], ['A CAY IS GONE', 'It was there on the old charts. The fishers say it never was.']],
  reef: [['BROTHERHOOD SAILS OFF THE SHOALS', 'Keep to the channel and a gun loaded.'], ['BROTHERHOOD SHIPS COME HOME EMPTY', 'Not robbed. Not wrecked. Empty, and neatly so.']],
  lantern: [['GUILD ASKS FOR MORE OIL', 'Every lamp to be lit an hour earlier this season. No reason given.'], ['GUILD LAMPS BURN ALL DAY', 'The guild asks that nobody put them out. For any reason.']],
  drowned: [['FOG FOR THE THIRD WEEK', 'Fishers are asked to call out their names on the way home.'], ['BELLS HEARD UNDER THE WATER', 'The fishers stopped rowing to listen. Some are still listening.']],
};
const SEA = [
  [ // 0-1
    ['RECORD CATCH OF SNAPPER', 'The market ran out of ice by noon.'], ['GOAT ELECTED TO HARBOUR COUNCIL', 'The vote was close. The goat has not yet spoken.'],
    ['NEW BELL FOR THE CHAPEL', 'It is louder than the old one. Much louder.'], ['TURTLES BACK ON THE SOUTH BEACHES', 'Children are asked not to ride them.'],
    ['PRICE OF ROPE FALLS', 'Nobody knows why. Buy now, says the chandler.'], ['WHALE SEEN OFF THE POINT', 'It waved. Witnesses agree it waved.'],
  ],
  [ // 2
    ['FEWER GULLS THIS YEAR', 'Nobody saw them go.'], ['TIDE LATE AGAIN', 'Only by minutes. The harbourmaster has started keeping a list.'],
    ['FISHER FOUND ASLEEP IN HIS BOAT', 'He had rowed home in his sleep. He does not remember setting out.'], ['A SHIP CAME IN WITH NO NAME', 'It had been painted over, from the inside.'],
  ],
  [ // 3
    ['THE TIDE DID NOT COME IN ON WEDNESDAY', 'It came in on Thursday, twice.'], ['CHILDREN SING IN THEIR SLEEP', 'All the same song. Parents are asked not to join in.'],
    ['NO NEWS FROM THE OUTER ISLANDS', 'The boats come back. The news does not.'], ['THE STARS WERE COUNTED', 'There were nineteen fewer. It was a clear night.'],
  ],
  [ // 4
    ['SHE HAS THROWN', 'Low.'], ['EVERYONE IS ASLEEP', 'Nobody is to wake them.'], ['THE SEA', 'The sea. The sea. The sea is'],
  ],
];
const NOTICE = [
  ['LOST: a red mitten, the left one. Reward: the right one.', 'FOR SALE: a rowing boat, one careful owner, one hole.', 'WANTED: a cook who can count past twelve.'],
  ['LOST: a red mitten, the left one. Reward: the right one.', 'FOR SALE: a rowing boat, one careful owner, one hole.', 'WANTED: a cook who can count past twelve.'],
  ['QUIET HOURS on the quay from dusk. By order.', 'FOUND: a lamp, still lit. Ask at the inn.', 'WANTED: a night watchman. Again.'],
  ['DO NOT answer a knock after midnight. It will knock again.', 'FOUND: twenty dice. One face is worn off every one.', 'WANTED: nobody. Nobody is wanted.'],
  ['', '', ''],
];

/** print this week's paper for harbour d. ctx: { dread, faction, factionName, frontOn, harbourName } */
export function printPaper(state, d, ctx) {
  const stage = stageOf(ctx.dread), week = weekOf(state);
  const rng = mulberry32(hash2((d.seed | 0) + 101, week, state.seed | 0));
  const name = pick(rng, NAMES), H = d.name;
  const fill = (t) => t.replace(/\{N\}/g, name).replace(/\{H\}/g, H);
  // the news: something you did (from the gossip), the region, and the sea at large
  const news = [];
  const L = lifeOf(state), deed = L.news.filter((n) => state.dayN - n.day <= 7 && DEEDS[n.kind]).pop();
  if (deed) {
    const [h, t] = stage >= 3 ? DEED_DARK : DEEDS[deed.kind], W = deed.where || 'the next harbour';
    const f = (s) => s.replace(/\{W\}/g, W).replace(/\{G\}/g, deed.game || 'contest');
    news.push({ h: f(h).toUpperCase(), t: f(t) });
  }
  if (stage < 4) { const r = REGION[ctx.faction] || REGION.crown; news.push({ h: r[stage >= 2 ? 1 : 0][0], t: r[stage >= 2 ? 1 : 0][1] }); }
  const pool = SEA[faceBand(stage)].slice();
  while (news.length < 3 && pool.length) news.push(((x) => ({ h: x[0], t: x[1] }))(pool.splice(Math.floor(rng() * pool.length), 1)[0]));
  const date = `${WEEKDAYS[state.dayN % 7]}, week ${week + 1}`;
  return {
    week, stage, at: H,
    mast: MAST[stage], tag: TAG[stage], date: stage >= 4 ? `${date}. ${date}.` : `${date} · ${ctx.factionName} waters`,
    region: ctx.factionName,
    weather: forecast(rng, state, ctx.faction, stage, ctx.frontOn),
    faceHead: stage >= 4 ? 'A FACE' : 'HARBOUR FACES',
    face: fill(pick(rng, FACES[faceBand(stage)])),
    news, notice: pick(rng, NOTICE[stage]),
  };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** the open paper, as HTML for the market pane */
export function paperHTML(p) {
  const w = p.weather.map((r) => `<div class="pwx"><u>${esc(r.day)}</u>${r.wind === 'none' ? ' · no wind' : r.wind ? ` · wind ${esc(r.wind)}` : ''}<br>${esc(r.sky)}.</div>`).join('');
  const n = p.news.map((x) => `<div class="pnews"><b>${esc(x.h)}</b><br>${esc(x.t)}</div>`).join('');
  return `<div class="paper d${p.stage}">
    <div class="pmast">${esc(p.mast)}</div>
    <div class="pdate">${esc(p.tag)} · ${esc(p.date)}</div>
    <div class="pcols">
      <div class="pcol"><div class="phead">THE WEATHER</div>${w}
        <div class="phead">${esc(p.faceHead)}</div><p class="pface">${esc(p.face)}</p></div>
      <div class="pcol"><div class="phead">THE NEWS</div>${n}${p.notice ? `<div class="pnote">${esc(p.notice)}</div>` : ''}</div>
    </div></div>`;
}
