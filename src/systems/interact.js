// Interaction: what E does where the ship is (getInteract), doing it (tryInteract), going ashore on a hand-made place (goAshore),
// and the anchor that holds her still meanwhile (anchorTick, HEAVE_KINDS: RULES 18, E works under way). Moved out of main.js (task R5).
// main.js computes the interaction once a frame into rt.tg (frame step 4); the prompt, the anchor and E all read that one value.
// Everything main.js owns comes through G, read at call time; screens (ui/ other than dom.js) too, since systems sit below them.
import { markSeen, tableOpen } from '../clues.js';
import { G, rt } from '../core/runtime.js';
import { state } from '../core/state.js';
import { tod } from '../daynight.js';
import { isOpen } from '../gates.js';
import { pickGreeting, rollGreeting } from '../greetings.js';
import * as life from '../harbourlife.js';
import { bearingName, friendLevel, fruitName, fruitOf, plural, repOf } from '../jobs.js';
import { LM } from '../landmarks.js';
import { lootFor } from '../lore.js';
import { goalReached } from '../objectives.js';
import { oilCap } from '../oil.js';
import { stageOf } from '../palette.js';
import { RELIGHT_OIL, RELIGHT_PAY, SALVAGE_MUL, lampDead, laneArrival, regionAt } from '../regions.js';
import { sectorAt } from '../sectors.js';
import { TREASURE_TIERS, rollCheck } from '../tabletop.js';
import { boatStatus } from '../traffic.js';
import { $, harbourEl, toast } from '../ui/dom.js';
import { shipwrightLine } from '../upgrades.js';
import { angleDiff, hash2, mulberry32 } from '../util.js';
import { isFestival, isLanternNight, isMarketDay, nightKey, tideAt } from './calendar.js';
import { mendSails, oilOn } from './storybeats.js';

export function getInteract() {
  const hi = G.world.nearest(G.ship.pos.x, G.ship.pos.z, 18);
  if (hi && hi.desc.hut && G.world.hutShown) return { kind: 'hut', key: 'hut', isl: hi };
  const sg = G.sighting.near(G.ship.pos.x, G.ship.pos.z); if (sg) return { kind: 'sighting', key: 'sight', s: sg };
  const cvs = G.caves.near(G.ship.pos.x, G.ship.pos.z); if (cvs) return { kind: 'cave', key: cvs.id, site: cvs };
  const spr = G.threads.springNear(G.ship.pos.x, G.ship.pos.z); if (spr) return { kind: 'spring', key: 'spring', src: spr };
  const thr = G.threads.interact(G.ship); if (thr) return { kind: 'thread', key: thr.key, th: thr };
  // a harbour is entered at its pier; anywhere else along its shore you only get a hint
  const hb = G.world.nearest(G.ship.pos.x, G.ship.pos.z, 38, ['harbour']);
  if (hb) {
    const d = hb.desc, dk = d.dock;
    if (dk && Math.hypot(G.ship.pos.x - (d.x + dk.x), G.ship.pos.z - (d.z + dk.z)) < 22) return (!G.onbAll() && !goalReached(state, 'harbour')) ? null : { kind: 'harbour', key: d.id, isl: hb };   // no "visit" at the very start: Mara sends you when it is time
    if (G.world.lastEdge < 16) return { kind: 'harbourfar', key: d.id, isl: hb };
  }
  const sc = G.secrets.near(G.ship.pos.x, G.ship.pos.z, state.collected); if (sc && !(sc.kind === 'camp' && state.story.secrets && state.story.secrets[sc.key + '@'] === state.dayN)) return { kind: 'secret', key: sc.key, sc };
  const lmI = G.world.nearest(G.ship.pos.x, G.ship.pos.z, 16);
  if (lmI && lmI.desc.lm) return { kind: 'landmark', key: 'lm' + lmI.desc.id, isl: lmI };
  const isl = G.world.nearest(G.ship.pos.x, G.ship.pos.z, 16, ['treasure']);
  if (isl) return { kind: isl.desc.type, key: isl.desc.id, isl };
  if (G.sea.nearWreck) return { kind: 'wreck', key: G.sea.nearWreck.o.id, o: G.sea.nearWreck.o };
  const sh = G.traffic.nearestHail(G.ship.pos.x, G.ship.pos.z, 24);
  if (sh) return { kind: 'ship', key: 'ship' + sh.id, s: sh };
  const fi = G.world.nearest(G.ship.pos.x, G.ship.pos.z, 14, ['jungle', 'sandbar']);
  if (fi) return { kind: 'fruit', key: 'fruit' + fi.desc.id, isl: fi };
  { const li = G.world.nearest(G.ship.pos.x, G.ship.pos.z, 45); if (li && G.world.lit && li.desc.lampAt && lampDead(state, li.desc, nightKey())) return { kind: 'relight', key: 'relight:' + li.desc.id, isl: li }; }   // a dead Guild light
  if (state.sailsTorn && state.patchKits > 0) return { kind: 'patch', key: 'patch' };   // anywhere at sea: patch the sail with a kit
  return null;
}

export const HEAVE_KINDS = new Set(['thread', 'spring', 'cave', 'treasure', 'fruit', 'wreck', 'landmark', 'patch']);
rt.heave = null, rt.anchorAt = null;   // heave: E was pressed under way, the anchor is going down; anchorAt: where she lies while it is down
/** the anchor: down while going ashore, digging, salvaging, patching or fishing, so the ship cannot drift off the spot */
export function anchorTick() {
  if (rt.heave) {
    const tg = rt.tg;
    if (!tg || tg.key !== rt.heave.key || rt.tNow - rt.heave.t > 8 || rt.modal) rt.heave = null;
    else if (G.ship.speed <= 0.3) { rt.heave = null; tryInteract(); }
  }
  G.ship.anchored = !!rt.heave || !!rt.dig || G.fishing.active;
  if (!G.ship.anchored) { rt.anchorAt = null; return; }
  if (!rt.anchorAt && G.ship.speed < 0.3) rt.anchorAt = { x: G.ship.pos.x, z: G.ship.pos.z };
  if (rt.anchorAt) { G.ship.pos.x = rt.anchorAt.x; G.ship.pos.z = rt.anchorAt.z; }   // currents and leeway do not move an anchored ship
}
export function tryInteract() {
  if (!rt.started || rt.modal) return;
  const tg = rt.tg !== undefined ? rt.tg : getInteract();   // this frame's (main.js sets rt.tg once a frame)
  if (!tg) return;
  if (tg.kind === 'sighting') { G.openCard(tg.s.card); return; }
  // E under way: the anchor goes down first, and the crew goes ashore as soon as she lies still (no need to stop her by hand)
  if (HEAVE_KINDS.has(tg.kind) && G.ship.speed > 0.3 && !rt.dig && !(tg.kind === 'treasure' && tg.isl.dug)) { if (!rt.heave) G.audio.play('ui'); rt.heave = { key: tg.key, t: rt.tNow }; return; }
  if (tg.kind === 'thread') { if (G.ship.speed > 0.35) { toast('Bring the ship to a full stop first (S to reef the sails).', false, 3000); return; } tg.th.run(); return; }
  if (tg.kind === 'spring') { if (G.ship.speed > 0.35) { toast('Bring the ship to a full stop first (S to reef the sails).', false, 3000); return; } G.openCave({ id: `spring:${G.threads.c.src.id}`, kind: 'colourspring' }); return; }
  if (tg.kind === 'cave') { if (G.ship.speed > 0.35) { toast('Bring the ship to a full stop first (S to reef the sails).', false, 3000); return; } G.openCave(tg.site); return; }
  if (tg.kind === 'hut') { if (!state.story.hutKnown) { G.audio.play('knock'); toast('Nobody answers. Inside, a pen scratches, then stops.', true, 4500); return; } G.openModal('hut'); return; }
  if ((tg.kind === 'treasure' || tg.kind === 'fruit' || tg.kind === 'wreck' || tg.kind === 'landmark') && G.ship.speed > 0.35) { toast('Bring the ship to a full stop first (S to reef the sails).', false, 3000); return; }
  if (tg.kind === 'landmark') { if (!rt.dig) goAshore(tg); return; }
  if (tg.kind === 'secret') {
    if (G.ship.speed > 0.6) { toast('Bring the ship to a full stop first (S to reef the sails).', false, 3000); return; }
    if (!rt.dig) rt.dig = { key: tg.key, t: 0, label: tg.sc.kind === 'kestrel' ? 'Someone goes down on a rope...' : tg.sc.kind === 'camp' ? 'Going ashore...' : 'Salvaging...', need: tg.sc.kind === 'kestrel' ? 5 : 3.2, done: () => G.secretFound(tg.sc) };
    return;
  }
  if (tg.kind === 'relight') {   // the Lantern Guild's dead light: oil from your lamp, and the keeper pays and marks the waters
    if (state.oil < RELIGHT_OIL) { toast(`The lamp needs ${RELIGHT_OIL} oil. You have ${Math.floor(state.oil)}.`, false, 3500); return; }
    const d = tg.isl.desc; state.oil -= RELIGHT_OIL; (state.story.relit = state.story.relit || {})[d.id] = nightKey(); state.gold += RELIGHT_PAY;
    const k = G.revealAround(d.x, d.z); tg.isl.setLit(G.world.lit); G.audio.play('discover', { vol: 0.5 });
    toast(`The light is burning again. The keeper pays ${RELIGHT_PAY} gold${k ? ` and marks ${k} island${k > 1 ? 's' : ''} on your chart` : ''}.`, false, 6000);
    return;
  }
  if (tg.kind === 'patch') {
    if (G.ship.speed > 0.6) { toast('Bring the ship to a stop to patch the sail (S, and wait).', false, 3000); return; }
    if (!rt.dig) rt.dig = { key: 'patch', t: 0, label: 'Patching the mainsail...', need: 4.5, done: () => { state.patchKits--; mendSails(`Patched. The sail holds again (${state.patchKits} ${state.patchKits === 1 ? 'kit' : 'kits'} left).`); } };
    return;
  }
  if (tg.kind === 'harbour') {
    const d = tg.isl.desc, rep = repOf(state, d.id);
    if (!rep.last || Date.now() - rep.last > 120000) rep.visits++;
    rep.last = Date.now();
    state.stats.harbours++;
    if (state.hp < G.ship.mods.maxHp) { state.hp = G.ship.mods.maxHp; toast('The harbour crew patches up your hull for free.', false, 3000); }
    if (state.sailsTorn) setTimeout(() => mendSails('The sailmaker stitches your mainsail whole again.'), 600);
    const rng = mulberry32(hash2(d.seed, Math.floor(rt.tNow / 8), 3));
    const idx = stageOf(rt.dread), lvl = friendLevel(rep);
    rt.hbShipLine = shipwrightLine(rng, idx);
    G.threads.onDock(d);
    // someone on the pier may speak first: always on a first visit or a story beat, otherwise rarely
    let say = null;
    { const cur = G.objectives.current;
      if (cur && cur.id === 'harbour' && d.id === '0,-1' && !state.story.letterP1) state.story.letterP1 = 'wait';   // landfall done: the letter is already waiting, before the goal catches up
      if (cur && cur.id === 'perrin' && d.id === '0,-1' && !state.story.perrinNote && !state.story.letterP2) state.story.letterP2 = 'wait';   // the note waits as a letter; the player takes it
      if (cur && cur.id === 'gossip' && d.id !== '0,-1' && !state.story.hutKnown) { state.story.hutKnown = true; say = { speaker: 'fisher', text: `The black hut? Out past the ${bearingName(G.world.hutDesc.x - d.x, G.world.hutDesc.z - d.z)} water. There is a table, they say.`, dark: true, story: true }; } }
    const g = state.greet, h = state.hut, told = state.story.rollSeen || 0, ending = state.story.demoEnd === 'pending', free = g.lastDay !== state.dayN || ending;   // one voice a day, wherever you dock
    if (!say && free && h && h.rolls.length > told) {   // someone already knows the number: always after the first throw, then about half the time
      state.story.rollSeen = h.rolls.length;
      if (told === 0 || ending || Math.random() < 0.5) { say = rollGreeting(h.rolls[h.rolls.length - 1].n, state.time * 24, Math.random); if (ending) say.endsDemo = true; }
    }
    if (!say && ending && h && h.rolls.length) { say = rollGreeting(h.rolls[h.rolls.length - 1].n, state.time * 24, Math.random); say.endsDemo = true; state.story.rollSeen = h.rolls.length; }
    if (!say && free && G.laterOK() && window.__BUILD !== 'demo' && !state.story.lullRumour && sectorAt(d.x, d.z, state.seed).faction.id === 'free') { state.story.lullRumour = 1; say = { speaker: 'oldsalt', text: 'In the Cays they say the dark keeps quiet while somebody plays.', story: true }; }   // points at the Two Players (the gentle ending)
    if (!say && free && !state.story.tellGreet && G.lateTell() && Math.random() < 0.5) { state.story.tellGreet = 1; say = { speaker: 'harbourmaster', text: 'Captain. Just yourself again? I will put you down as one.', story: true }; }   // a tell: they greet only you
    if (!say && free && G.laterOK() && isOpen(state, 'tab', 'tavern') && Math.random() < 0.6) say = life.gossipAt(state, d);
    if (!say && free && G.laterOK() && rt.dread < 0.6) say = G.taleAt(d);
    if (!say && free && G.laterOK() && (g.day[d.id] == null || Math.random() < 0.3)) say = pickGreeting({ hour: state.time * 24, weather: G.weather.label, dread: rt.dread, rnd: Math.random, custom: d.custom, event: isFestival(d) ? 'festival' : isMarketDay() ? 'market' : isLanternNight() ? 'lantern' : null, boat: (() => { const b = boatStatus(d, state.dayN, rt.dread, state.seed); return b.today === 'stayed' ? 'stayed' : b.yesterday === 'lost' ? 'lost' : null; })() });
    if (!say && free && window.__BUILD !== 'demo') { const tl = G.threads.harbourLine(d); if (tl) say = { speaker: 'fisher', text: tl, dark: true, story: true }; }
    if (laneArrival(state, d, rt.lane && rt.tNow - rt.lane.t < 90 ? rt.lane : null)) setTimeout(() => toast('In by the buoys. The harbourmaster ticks a line in the book.', false, 4500), 1400);   // the Crown's record (regions.js)
    if (d.region === 'reef' && state.story.bounty) { const b = state.story.bounty; state.gold += b; state.story.bounty = 0; setTimeout(() => toast(`The Brotherhood pays the bounty: +${b} gold.`, false, 5000), 1600); }   // raiders sunk in Reef waters (regions.js)
    rt.harbourIsl = tg.isl; rt.hbTab = 'board'; G.frameVillage(d); G.autosave();
    if (G.lettersAt(d).length) setTimeout(() => toast('A letter waits for you at the harbourmaster\'s board.', false, 6000), 900);
    else if (G.petOffer(d)) setTimeout(() => { const po = G.PETS[G.petOffer(d)]; toast(`${po.title}. ${po.sub[0].toUpperCase()}${po.sub.slice(1)}.`, false, 6000); }, 900);
    for (const c of state.crew) if (c.wish && !c.wish.done && c.wish.kind === 'harbour' && c.wish.id === tg.isl.desc.id) G.wishDone(c);
    harbourEl.classList.toggle('dark', idx >= 3);
    $('hbBannerName').textContent = d.name; $('hbSaid').textContent = ''; $('hbLine').style.display = 'none'; $('hbDay').textContent = G.dayLine(d);
    if (say && G.objectives.mate.busy && !say.endsDemo && !say.story) say = null;   // Mara is speaking about the quest: a passing greeting waits for another day
    if (say) { g.day[d.id] = state.dayN; g.lastDay = state.dayN; G.showGreeting(d, say); } else G.openModal('harbour');
    G.audio.play('harbour');
  } else if (tg.kind === 'treasure' && !tg.isl.dug && !rt.dig) {
    const d = tg.isl.desc;
    if (!state.riddles[d.id]) {
      rt.dig = { key: tg.key, t: 0, label: 'Reading the inscription...', need: 2.2, done: () => { G.readArch(d); G.objectives.remark('riddle'); } };
      G.audio.play('dig');
    } else if (state.halves[d.id]) {
      toast('Half a riddle is not enough to dig by. The other half is written on another arch.', false, 5000);
    } else if (rt.digFix > rt.tNow) {
      toast('The crew is still digging out the collapsed hole.', false, 2500);
    } else {
      rt.dig = { key: tg.key, t: 0, mini: true, label: 'Digging...', need: 1, done: () => {
        const ang = Math.atan2(G.ship.pos.z - d.z, G.ship.pos.x - d.x);
        if (Math.abs(angleDiff(ang, d.puzzle.angle)) > 0.85) {
          state.attempts[d.id] = (state.attempts[d.id] || 0) + 1;
          toast(state.attempts[d.id] >= 2 ? 'Nothing here but sand. Reread the riddle in your orders and try another shore.' : 'The crew digs and finds only sand and crabs. Wrong shore!', false, 6000);
          return;
        }
        let loot = G.abyss.wrongLoot(lootFor(mulberry32(hash2(d.seed, 7, state.seed)), d.dread), state);
        const first = d.id === '1,-1';   // the first treasure always pays for one starter upgrade
        if (first) loot = { name: 'Perrin\'s chest: a bag of old doubloons', value: 120, dark: false };
        const land = (tier) => {
          loot.value = Math.round(loot.value * G.ship.mods.lootMul * (tier ? tier.mult : 1));
          if (tier && tier.mult < 1) loot.name = `${loot.name} (water-damaged)`; else if (tier && tier.mult >= 2) loot.name = `${loot.name} (and more beneath it)`;
          state.stats.treasures++; state.stats.solved++; if (!first) life.news(state, 'treasure', { where: d.name });
          state.gold += loot.value; state.loot.push(loot);
          toast(`Treasure! ${loot.name} (+${loot.value} gold)`, loot.dark, 7000);
          G.audio.play('treasure');
        };
        state.dug.add(d.id); tg.isl.setDug(true);   // claimed now, so the throw cannot be started twice
        if (first) land(null); else rollCheck(state, { label: 'The chest: how good a find?', kind: 'luck', dark: loot.dark, tiers: TREASURE_TIERS, treasure: true, attempts: state.attempts[d.id] || 0 }, (ok, n, total, tier) => land(tier));
      } };
      { // probing the shore (digging.js), only on the right shore: a wrong shore is a short dig that finds sand, as before
        const right = Math.abs(angleDiff(Math.atan2(G.ship.pos.z - d.z, G.ship.pos.x - d.x), d.puzzle.angle)) <= 0.85;
        if (!right) { rt.dig.mini = false; rt.dig.need = 2.2; }
        else {
          const first = d.id === '1,-1', tools = (1 - G.ship.mods.digTime) * 6 + (state.buffs.dig > 0 ? 2 : 0);   // the first treasure (tutorial) is kinder; better tools, more digs before the tide
          const beach = first ? 'sand' : ['sand', 'shingle', 'dune', 'mud'][Math.abs(hash2(d.seed, 41, 3)) % 4];   // every treasure isle has its own kind of beach (digging.js BEACHES)
          const pa = d.puzzle.angle, ox = Math.cos(pa), oz = Math.sin(pa), rx = Math.sin(pa), rz = -Math.cos(pa);   // the beach: o out to sea, r along it
          const sun = () => { const sx = -Math.sin(tod.sunAz), sz = Math.cos(tod.sunAz); return { elev: tod.sunElev, gx: sx * rx + sz * rz, gy: sx * ox + sz * oz, dim: 1 - 0.75 * Math.max(G.weather.cloud || 0, G.weather.rain || 0) }; };   // the arch's shadow on the sand, from where the sun is now
          const noon = d.puzzle.shadow ? { elev: Math.max(0.3, rt.sunScale), gx: rz, gy: oz } : null;
          const predug = !first && !state.story.predug && state.stats.treasures >= 1;   // the second chest: one hole is there already, over the chest (once)
          if (predug) state.story.predug = 1;
          G.digGame.start({ cols: 8, rows: 5, beach, sun, noon, predug, digs: Math.round((first ? 13 : 10) + tools - (d.dread > 0.5 ? 1 : 0)), stones: first ? 2 : 3 + (d.dread > 0.4 ? 1 : 0), lie: d.dread > 0.5 ? 0.3 : 0,
            onDone: () => { const done = rt.dig && rt.dig.done; rt.dig = null; if (done) done(); if (predug && G.digGame.preFound) markSeen(state, 'CL-H3-hole'); if (predug && G.digGame.preFound) setTimeout(() => G.objectives.say('Somebody dug here first, and stopped a spade short. Lucky us.'), 3000); },
            onFail: (why) => { rt.dig = null; rt.digFix = rt.tNow + 6; rt.digFixWhy = why; state.attempts[d.id] = (state.attempts[d.id] || 0) + 1;
              toast(why === 'tide' ? 'The tide comes in and fills every hole. The crew waits for it to go out again.' : why === 'mud' ? 'The light goes and the mud is everywhere. The crew scrapes the shovels clean and tries again.' : 'The shovel breaks on a second stone. The crew fetches the spare.', false, 5500); } });
        }
      }
      G.audio.play('dig');
    }
  } else if (tg.kind === 'fruit' && !rt.dig) {
    const d = tg.isl.desc, f = fruitOf(d);
    if (state.harvest[d.id] != null && state.harvest[d.id] >= state.dayN) { toast(`The ${plural(fruitName(f, d.dread), 2)} here are picked clean for today.`, false, 3500); return; }
    rt.dig = { key: tg.key, t: 0, label: 'Picking fruit...', need: 2.4, done: () => {
      const n = Math.max(1, Math.round((2 + Math.floor(Math.random() * 3)) * G.ship.mods.lootMul)) + (life.meal(state) === 'pepper' ? 2 : 0);
      state.fruit[f] = (state.fruit[f] || 0) + n; state.harvest[d.id] = state.dayN; state.stats.fruitPicked += n;
      toast(`The crew picked ${n} ${plural(fruitName(f, d.dread), n)}.`, d.dread > 0.5, 4500);
    } };
  } else if (tg.kind === 'ship') {
    G.hailShip(tg.s);
  } else if (tg.kind === 'wreck' && !rt.dig) {
    const o = tg.o;
    rt.dig = { key: tg.key, t: 0, label: 'Salvaging the wreck...', need: 3.4 * G.ship.mods.digTime * (state.buffs.dig > 0 ? 0.7 : 1), done: () => {
      const loot = G.abyss.wrongLoot(lootFor(mulberry32(o.rngSeed), o.dread), state);
      loot.value = Math.round(loot.value * 1.3 * G.ship.mods.lootMul * (tideAt() < -0.45 ? 1.3 : 1) * G.threads.salvageMul() * (SALVAGE_MUL[regionAt(o.x, o.z, state.seed)] || 1));   // the tide has uncovered more; the Reef keeps the ships that come (regions.js)
      loot.name = `From the wreck: ${loot.name}`;
      o.salvaged = true; if (!o.extra) state.collected.add(o.id); state.stats.wrecks++;
      state.gold += loot.value; state.loot.push(loot);
      toast(`Salvaged! ${loot.name} (+${loot.value} gold)`, loot.dark, 7000);
      { const x = G.threads.onSalvage(); if (x) setTimeout(() => toast(x, true, 6000), 1500); }
      G.audio.play('treasure');
    } };
    G.audio.play('dig');
  }
}

// going ashore on a hand-made place (places.js says what you find)
export function goAshore(tg) {
  const d = tg.isl.desc;
  rt.dig = { key: tg.key, t: 0, label: 'Going ashore...', need: 2.6, done: () => {
    if (d.lm === 'table' && tableOpen(state) && !state.story.ending && window.__BUILD !== 'demo') { G.places.visit(d.lm, state, {}); G.openTable(); return; }
    const r = G.places.visit(d.lm, state, { night: tod.night > 0.45, calm: G.weather.calm > 0.5, still: G.weather.storm < 0.3, tide: tideAt(), mara: true });   // still: the Two Players play on any night without a storm
    if (!r) return;
    if (r.clue) G.seeClue(r.clue);   // the ledger takes it; no popup (docs/WORLD_REDESIGN.md 6.7)
    const demo = window.__BUILD === 'demo';
    let text = r.dark && demo ? r.text.split('. ')[0] + '.' : r.text;
    const bits = [];
    if (r.gold) { const g = Math.round((r.gold[0] + Math.random() * (r.gold[1] - r.gold[0])) * (r.first ? 1 : G.ship.mods.lootMul)); state.gold += g; bits.push(`+${g} gold`); G.audio.play('treasure'); }
    if (r.ammo) { state.ammo += r.ammo; bits.push(`+${r.ammo} cannonballs`); }
    if (r.heal && state.hp < G.ship.mods.maxHp) { state.hp = G.ship.mods.maxHp; bits.push('hull mended'); }
    if (r.fruit) { const f = 'mango'; state.fruit[f] = (state.fruit[f] || 0) + r.fruit; bits.push(`+${r.fruit} ${plural(fruitName(f, 0), r.fruit)}`); }
    if (r.chart) { let n = 0; for (const id of r.chart) { const l = LM[id], [cx, cz] = l.key.split(',').map(Number), o = G.world.desc(cx, cz); if (o && !state.discovered[o.id]) { state.discovered[o.id] = { name: o.name, type: o.type, x: Math.round(o.x), z: Math.round(o.z) }; n++; } } if (n) bits.push(`${n} new ${n === 1 ? 'place' : 'places'} on your chart`); }
    if (r.around) { const n = G.revealAround(d.x, d.z); if (n) bits.push(`${n} ${n === 1 ? 'isle' : 'isles'} charted`); }
    if (d.lm === 'keeper' && oilOn() && state.oil < oilCap(state.upgrades) - 1) { state.oil = oilCap(state.upgrades); bits.push('Wick fills your lamp'); }
    if (r.oil && oilOn() && state.oil < oilCap(state.upgrades) - 1) { state.oil = oilCap(state.upgrades); bits.push('the lamp is filled'); }
    if (r.note) state.notes.push({ text: r.note, dark: false });
    toast(text + (bits.length ? ` (${bits.join(', ')})` : ''), !!r.dark && !demo, 9000);
    if (r.first) state.stats.places = (state.stats.places || 0) + 1;
  } };
}
