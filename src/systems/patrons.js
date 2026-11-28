// Patrons (owner, 2026-11-28: "do commissions", from the review: "jobs are generated from harbour seeds and the giver is just the harbour's
// name"). Every harbour of the four waters and Tama has one person with a small story of three errands: the patron. Their errands sit on
// the board above the ordinary commissions, under their name. Each step is one of the errands the game already has (a catch, fruit, lost
// crates, a raider, a sighting) or a parcel to carry to another harbour. The three steps tell one small thing about them; the last pays
// most and leaves something behind: a find for the ship (chest.js findLook) and the harbour's good word. Taking a step uses one of the
// three commission places. One patron at a time per harbour; when their story is done, a line of what became of them stays on the board.
// Far out, where the dread is high, the last line goes quietly wrong (the parcel's address is somebody nobody remembers). Full game only.
import { state } from '../core/state.js';
import { G } from '../core/runtime.js';
import { toast } from '../ui/dom.js';
import { pxi } from '../pixelui.js';
import { hash2, mulberry32 } from '../util.js';
import { FISH } from '../fishing.js';
import { FRUIT_ORDER, fruitName, plural } from '../fruit.js';
import { nearby, makeCrates, repOf, bearingName } from '../jobs.js';
import { pierOf } from '../world.js';
import { findLook } from '../chest.js';

const DEMO = () => typeof window !== 'undefined' && window.__BUILD === 'demo';
export const STEP_PAY = [40, 60, 95];   // gold for each step (more with the harbour's dread, below)
const FIRST = ['Ada', 'Bastien', 'Celia', 'Dorin', 'Esme', 'Fergus', 'Greta', 'Hollis', 'Ivo', 'Josette', 'Kasimir', 'Lune', 'Moss', 'Nadia', 'Oren', 'Pell', 'Rosalind', 'Silas', 'Tamsin', 'Ulla', 'Wendell', 'Yara'];
const LAST = ['Brack', 'Corrie', 'Danvers', 'Ellery', 'Fenn', 'Gale', 'Harrow', 'Ives', 'Keel', 'Lorne', 'Marrow', 'Nettle', 'Orme', 'Pike', 'Quill', 'Rook', 'Sallow', 'Thorne', 'Vane', 'Wray'];
// the stories: three steps each ({ type, ask, done } and the type's own fields), and what is left on the board after
export const STORIES = {
  feast: { job: 'the cook at the tavern', steps: [
    { type: 'fish', n: 2, ask: 'My daughter marries on Sunday, and the fish this week are small and sad. Two good ones, Captain.', done: 'She holds them up by the tail to show the whole kitchen.' },
    { type: 'fruit', n: 5, ask: 'Fruit for the cake now. Five, whatever is ripest.', done: 'The cake leans a little. Nobody minds.' },
    { type: 'carry', item: 'a slice of wedding cake in a tin', ask: 'Her godmother could not come. Take her a slice? She is in {to}.', done: 'The old woman eats it on the pier, slowly, and asks you to tell them it was good.', wrong: 'Nobody in {to} knows a godmother by that name. A neighbour takes the tin and says she will keep it for when someone comes for it.' },
  ], after: 'There is a drawing of the wedding pinned up in the tavern. You are in it, at the back, very small.' },
  widower: { job: 'who mends the nets', steps: [
    { type: 'crates', ask: 'My boat went over in the squall. Her gear is still out there, floating. Bring it in for me.', done: 'He lays it all out on the quay and touches each thing once.' },
    { type: 'spot', what: 'dolphins', n: 2, ask: 'She used to say the dolphins came for her boat. Look for them out there. Tell me if they still come.', done: 'He nods, and does not ask you anything else.' },
    { type: 'carry', item: 'a letter that was never posted', ask: 'Her sister is in {to}. I wrote this a year ago. I could not send it.', done: 'The sister reads it twice and folds it into her apron.', wrong: 'The house in {to} is shut up. Somebody has written his name on the door in chalk, carefully, as if he lived there.' },
  ], after: 'He has a new boat. He has not named her yet.' },
  mason: { job: 'the master mason', steps: [
    { type: 'crates', ask: 'Our barge lost its load of tools in the swell. They float, the fools who made them. Fetch them back.', done: '"Every chisel. You must have counted."' },
    { type: 'bounty', n: 1, ask: 'A raider has been taking our timber barges. Sink her, and the new church wall goes up this year.', done: 'The wall goes up a course a day. You can hear the hammers from the water.' },
    { type: 'carry', item: 'a mason\'s level, wrapped in cloth', ask: 'My old master is in {to}. Give him this back. Tell him the wall is true.', done: '"True," he says, and holds the bubble up to the light for a long time.', wrong: 'In {to} they say his old master died before this harbour had a wall. They keep the level anyway.' },
  ], after: 'The new wall has a stone with a ship cut in it. It looks a little like yours.' },
  naturalist: { job: 'who draws the fish', steps: [
    { type: 'spot', what: 'whales', n: 1, ask: 'I have drawn every fish in the harbour. I want a whale. Find one and tell me how it moved.', done: 'She draws while you talk and does not look up once.' },
    { type: 'fish', rare: true, n: 1, ask: 'Now something rare. Out deep, where the water goes dark blue.', done: 'She weighs it, measures it, draws it, and lets you keep the drawing.' },
    { type: 'carry', item: 'a jar with a specimen in it', ask: 'The society in {to} will want to see this. Carry it upright.', done: 'They put it on a shelf between two others exactly like it. Nobody can say who sent those.', wrong: 'The society in {to} has the same jar on its shelf already, the same label, in her hand. It has been there for years.' },
  ], after: 'Her drawings are on the walls of the harbourmaster\'s office now. The whale is the biggest.' },
  choir: { job: 'who leads the choir', steps: [
    { type: 'fruit', n: 4, ask: 'Fruit, for the singers\' throats. Four will do. The sweet kind.', done: 'They practise with their mouths full and nobody can tell.' },
    { type: 'spot', what: 'dolphins', n: 2, ask: 'They say the dolphins sing back. Find them, and listen for me.', done: '"Higher than us," he says, pleased. "Of course."' },
    { type: 'carry', item: 'a bundle of hymn sheets', ask: 'The church in {to} lost its music in a fire. Take them ours.', done: 'That Sunday both harbours sing the same hymn at the same hour. You can hear it from the middle of the sea.', wrong: 'The church in {to} has its music. It always had. They sing from it every night now, and the doors stay shut.' },
  ], after: 'They sing on the quay when your ship comes in. Only the once, but they do.' },
  smuggler: { job: 'who keeps the chandlery', steps: [
    { type: 'carry', item: 'a box you are not to open', ask: 'A box for a friend in {to}. Do not open it. Do not shake it either.', done: 'The friend opens it on the spot. Tea. Only tea. She laughs at your face.', wrong: 'The friend in {to} will not take it. "Not that one," she says. "Take it back out and drop it where it is deep."' },
    { type: 'bounty', n: 1, ask: 'The raider who has been following my boats. Sink her and I will stop asking you to carry boxes.', done: '"Good. That was my cousin\'s ship. He will be furious. Good."' },
    { type: 'crates', ask: 'Last one. Some crates went over the side in a hurry. Get them back before the customs men do.', done: 'She stacks them in the back of the shop and puts a cloth over them.' },
  ], after: 'There is a crate of good tea with your name chalked on it every time you come in.' },
};
const STORY_IDS = Object.keys(STORIES);

/** the patron of harbour d (seeded: the same person every game on the same map), or null */
export function patronOf(d) {
  if (DEMO() || !d || d.type !== 'harbour' || d.region === 'drowned' || d.fogHaven) return null;
  const r = mulberry32(hash2(d.seed || 1, 41, 9));
  return { name: `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`, story: STORY_IDS[Math.floor(r() * STORY_IDS.length)] };
}
const P = () => state.story.patrons || (state.story.patrons = {});
const prog = (d) => P()[d.id] || (P()[d.id] = { step: 0 });
export const patronDone = (d) => !!(P()[d.id] && P()[d.id].step >= 3);

/** this step as a commission (state.quests), built fresh from the harbour and the step */
function stepQuest(d, pat, k) {
  const S = STORIES[pat.story], st = S.steps[k], rng = mulberry32(hash2(d.seed || 1, 77 + k, 13)), dk = d.dread || 0;
  const q = { id: `pat:${d.id}:${k}`, type: st.type, giverId: d.id, giverName: d.name, patron: d.id, step: k, who: pat.name, reward: Math.round(STEP_PAY[k] * (1 + dk)) };
  if (st.type === 'fish') {
    const pool = FISH.filter((f) => !f.night && dk >= f.min - 0.1 && dk <= f.max).sort((a, b) => a.price - b.price);
    const f = st.rare ? pool[pool.length - 1 - Math.floor(rng() * Math.min(3, pool.length))] : pool[Math.floor(rng() * Math.min(5, pool.length))];
    if (!f) return null; Object.assign(q, { species: f.id, n: st.n });
  } else if (st.type === 'fruit') Object.assign(q, { fruit: FRUIT_ORDER[Math.floor(rng() * FRUIT_ORDER.length)], n: st.n });
  else if (st.type === 'crates') { const c = makeCrates(G.world, d, rng); if (!c) return null; Object.assign(q, { crates: c.crates, center: c.center }); }
  else if (st.type === 'bounty') Object.assign(q, { n: st.n });
  else if (st.type === 'spot') Object.assign(q, { what: st.what, n: st.n });
  else if (st.type === 'carry') {
    const list = nearby(G.world, d.x, d.z, 200, 700, 'harbour').filter((o) => o.d.id !== d.id && o.d.region !== 'drowned' && !o.d.fogHaven);
    if (!list.length) return null;
    const to = list[Math.floor(rng() * list.length)].d;
    Object.assign(q, { toId: to.id, toName: to.name, item: st.item, ...pierOf(to) });
  }
  return q;
}
const fill = (t, q) => t.replace(/\{to\}/g, q && q.toName ? q.toName : 'the next harbour');

/** ui/harbour.js: the patron's rows on the board (html), and the offer to bind */
export function patronRows(d) {
  const pat = patronOf(d); if (!pat) return { html: '', offer: null };
  const S = STORIES[pat.story], p = prog(d);
  let html = `<div class="sec">${pat.name.toUpperCase()}, ${S.job.toUpperCase()}</div>`;
  if (p.step >= 3) return { html: html + `<small>${S.after}</small>`, offer: null };
  const live = (state.quests || []).find((q) => q.patron === d.id);
  if (live) return { html: html + `<small>${live.type === 'carry' ? `waiting to hear from ${live.toName}` : 'waiting on what they asked'}</small>`, offer: null };
  const q = stepQuest(d, pat, p.step); if (!q) return { html: '', offer: null };
  const full = (state.quests || []).length >= 3;
  html += `<div class="qrow letter"><div><b>${pxi('talk')} "${fill(S.steps[p.step].ask, q)}"</b><br><small>${p.step + 1} of 3 · ${q.type === 'carry' ? `${bearingName(q.x - d.x, q.z - d.z)}, ` : ''}${q.reward}g${full ? ' · your hands are full (three errands)' : ''}</small></div><button data-paccept="${q.id}" ${full ? 'disabled' : ''}>Accept</button></div>`;
  return { html, offer: q };
}
/** ui/harbour.js handIn: a patron's step is done (at the patron's harbour, or for a parcel where it went) */
export function patronStepDone(q) {
  if (!q || !q.patron) return;
  const [cx, cz] = q.patron.split(',').map(Number), d = G.world.desc(cx, cz), pat = patronOf(d); if (!pat) return;
  const S = STORIES[pat.story], st = S.steps[q.step], p = prog(d);
  p.step = Math.max(p.step, q.step + 1);
  const wrong = st.wrong && (d.dread || 0) > 0.55;
  setTimeout(() => toast(`${pat.name}: ${fill(wrong ? st.wrong : st.done, q)}`, wrong, 8000), 1200);
  if (p.step >= 3) {   // the story is done: the harbour's good word, and something left for the ship
    const r = repOf(state, d.id); r.deliveries = (r.deliveries || 0) + 2;
    setTimeout(() => { if (!findLook(1)) { state.gold += 60; toast(`${pat.name} presses a purse on you. +60 gold`, false, 5000); } }, 4500);
    state.stats.patrons = (state.stats.patrons || 0) + 1;
  }
}
export { fruitName, plural };
