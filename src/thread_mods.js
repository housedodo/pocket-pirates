import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';
import { shipGeos } from './ship.js';
import { waveHeight } from './ocean.js';

// The six dark threads that sit beside the Colour (Story Bible, "Multiple paths"). One module each, all driven by the Threads hub (threads.js).
// A module: { update(ctx), flag(name,arg), event(name,arg,site), interact(ctx), clue(), harbourRow(d), onDock(d), onRest(d), modAdjust(m), ... }.
// ctx = { ship, t, amp, dt, api }. Everything here is full game only and every one of them is optional.
const D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const mesh = (b, scene, scale = 1) => { const m = new THREE.Mesh(b.geometry(), mats.props); m.scale.setScalar(scale); m.frustumCulled = false; scene.add(m); return m; };
/** keeps one mesh alive while the ship is within `range` of `site` */
function stage(hub, key, site, ship, range, build) {
  const live = hub.live;
  if (D(site, ship.pos) > range) { const m = live.get(key); if (m) { hub.scene.remove(m); live.delete(key); } return null; }
  let m = live.get(key); if (!m) { m = build(); live.set(key, m); }
  return m;
}

// ================= THE STRANGE HIGH HOUSE: a lamp that is always lit, and a keeper with all the time there is
export function houseMod(hub) {
  const tp = hub.tp('house', { pacts: [], page: false, torn: false, visits: 0, last: null });
  const site = () => hub.pick('house', 350, 900);
  const has = (k) => tp.pacts.some((p) => p.k === k);
  return {
    update({ ship, t, amp, api }) {
      const s = site();
      const m = stage(hub, 'house', s, ship, 520, () => {
        const b = new Builder(); b.doubleSided = true;
        b.blob(0, -0.5, 0, 6, 2.6, 6, '#585c66', TILE.stone, 0.3, 3);
        b.cyl(0, 1.5, 0, 2.4, 1.6, 12, 7, '#e8e4d8', TILE.stone);
        b.box(0, 13.4, 0, 3.4, 0.6, 3.4, '#3a2a28', TILE.planks);
        b.box(0, 14.0, 0, 2.2, 2.2, 2.2, '#ffe08a', TILE.glow);       // the lamp: lit by day too
        b.box(0, 16.2, 0, 3.0, 0.5, 3.0, '#7a2f2a', TILE.planks);
        b.box(0, 1.6, 2.2, 0.9, 1.6, 0.2, '#07070c', TILE.white);      // the open door
        return mesh(b, hub.scene);
      });
      if (m) m.position.set(s.x, waveHeight(s.x, s.z, t, amp) + 0.8, s.z);
      // pacts come due
      const d = api.state.dayN;
      if (tp.last == null) tp.last = d;
      if (d !== tp.last) {
        tp.last = d;
        for (const p of [...tp.pacts]) {
          if (p.due > d || p.paid) continue;
          p.paid = true;
          if (p.k === 'wind') { api.toast('The borrowed wind has gone home. The sea is very still.', true, 6000); p.calm = d + 1; }
          if (p.k === 'hour') { api.toast('You sleep through the morning. It was owed.', true, 6000); api.state.time = Math.max(api.state.time, 0.3); }
        }
        api.refreshMods();
      }
    },
    interact({ ship, api }) { if (D(site(), ship.pos) < 46) return { key: 'house', prompt: 'E: climb the tower', run: () => { tp.visits++; api.openScene('house', `house:${tp.visits}`); } }; return null; },
    flag(n, arg) {
      if (n === 'canpact') return tp.pacts.filter((p) => !p.paid).length < 3 && !tp.torn;
      if (n === 'can') return !has(arg) && !tp.torn && (arg !== 'wind' || hub.state.notes.length > 0);
      if (n === 'canledger') return !tp.page;
      if (n === 'haspage') return tp.page && !tp.torn;
    },
    hallText() {
      const word = tp.visits <= 1 ? 'A pleasant man, in a chair, with a pot of tea and no shadow to speak of. He knows your name. He knows the date, and several others.'
        : tp.torn ? 'The keeper has the look of somebody whose accounts have been spoiled. He pours tea anyway.' : 'The keeper has put your ships in order since last time.';
      return `${word} The lamp upstairs is humming.`;
    },
    event(n, arg, site) {
      const api = hub.api;
      if (n === 'take') {
        api.addMark('owed');
        if (arg === 'wind') { hub.state.notes.pop(); tp.pacts.push({ k: 'wind', due: api.state.dayN + 2 }); api.refreshMods(); return 'A page of your log is gone.'; }
        if (arg === 'hour') { api.state.time = Math.max(0, api.state.time - 0.125); tp.pacts.push({ k: 'hour', due: api.state.dayN + 1 }); return 'It is three hours earlier than it was.'; }
        if (arg === 'throw') { if (hub.state.hut) hub.state.hut.lastDay = -1; api.cool(); tp.pacts.push({ k: 'throw', due: api.state.dayN + 99, paid: true }); return 'You may throw again at the hut today.'; }
      }
      if (n === 'ledger') {
        tp.page = true; api.keep('page', 'A page from the ledger', 'Ships, in a neat hand. Some of the dates have not happened yet.');
        const c = hub.mod('captain');
        if (c && c.stage() !== 'none') { c.sign(); return 'One entry is signed twice. The second hand is yours, and is not.'; }
        return '';
      }
      if (n === 'tear') { tp.torn = true; tp.page = false; tp.pacts = []; api.refreshMods(); const c = hub.mod('captain'); if (c) c.unsign(); return ''; }
    },
    modAdjust(m, api) {
      const d = api.state.dayN;
      for (const p of tp.pacts) {
        if (p.k === 'wind' && !p.paid) m.speed *= 1.14;
        if (p.k === 'wind' && p.calm && d <= p.calm) m.speed *= 0.78;
      }
    },
    clue: () => `A lamp on a rock ${hub.dir(site())} of Tama stays lit past dawn. Nobody likes to say what it burns.`,
  };
}

// ================= THE DROWNED BELL: a belfry under a reef; it rings at low tide, and you may count
export function bellMod(hub) {
  const tp = hub.tp('bell', { clappers: 0, n: 0, ended: null, asked: false, next: 0 });
  const site = () => hub.pick('bell', 500, 900);
  if (!tp.n) tp.n = 3 + (Math.abs(hub.state.seed) % 5);
  let queue = [];
  return {
    update({ ship, t, amp, dt, api }) {
      const s = site(), low = api.tide() < -0.15;
      const m = stage(hub, 'bell', s, ship, 420, () => {
        const b = new Builder(); b.doubleSided = true;
        b.blob(-3, -1, 0, 4, 2.2, 3.4, '#585c66', TILE.stone, 0.3, 5); b.blob(3, -1.2, 1, 3.4, 2, 3, '#70737c', TILE.stone, 0.3, 8);
        b.gable(0, 0.4, 0, 3.4, 2.6, 3.4, '#6a4a3a', TILE.planks, '#6a4a3a');   // a belfry roof
        b.box(0, -0.6, 0, 1.4, 1.6, 1.4, '#8a6a4a', TILE.planks);
        return mesh(b, hub.scene);
      });
      if (m) m.position.set(s.x, waveHeight(s.x, s.z, t, amp) + (low ? 0.6 : -2.6), s.z);
      const d = D(s, ship.pos);
      if (!tp.ended && low && d < 280 && api.state.dayN >= 0) {   // the strokes, a few with long gaps
        tp.next -= dt;
        if (tp.next <= 0) { tp.next = 18; queue = Array.from({ length: tp.n }, (_, i) => i * 1.4); }
      }
      if (queue.length) { queue = queue.map((q) => q - dt); while (queue.length && queue[0] <= 0) { queue.shift(); api.audio.play('bell', { vol: Math.max(0.1, 0.8 * (1 - d / 300)), rate: 0.55, pan: Math.max(-1, Math.min(1, Math.sin(Math.atan2(s.x - ship.pos.x, -(s.z - ship.pos.z)) - ship.heading))) }); } }
      if (tp.ended === 'steal' && api.night() > 0.6) {   // the stolen bell tolls on deck
        tp.deck = (tp.deck || 40) - dt;
        if (tp.deck <= 0) { tp.deck = 50 + Math.random() * 30; api.audio.play('bell', { vol: 0.35, rate: 0.5 }); }
      }
    },
    interact({ ship, api }) { if (!tp.ended && api.tide() < -0.15 && D(site(), ship.pos) < 30) return { key: 'bell', prompt: 'E: listen over the side', run: () => api.openScene('bellreef', `bell:${tp.ended || 'x'}`) }; return null; },
    onSalvage(api) { if (tp.ended || tp.clappers >= 3 || Math.random() > 0.45) return ''; tp.clappers++; return `Among the iron: a bell clapper, green with age. (${tp.clappers} of 3)`; },
    flag(n) {
      if (n === 'hasclappers') return tp.clappers >= 3;
      if (n === 'tune') { const mu = hub.mod('music'); return tp.clappers >= 3 && !!mu && mu.heard() >= 3; }
      if (n === 'coin') { const c = hub.mod('coin'); return !!c && c.hasCoin(); }
      if (n === 'gold30') return hub.state.gold >= 30;
    },
    countChoices() {
      return [3, 4, 5, 6, 7].map((k) => k === tp.n
        ? { label: `${k}`, go: { text: 'Yes. That many. The long gaps are what the bell is made of.', next: 'belfry' } }
        : { label: `${k}`, go: { text: 'Not that many. You listen again.', next: 'listen' } });
    },
    belfryText: () => `The belfry stands in a ring of weed. The bell is there, black and whole, and its mouth is empty. ${tp.clappers >= 3 ? 'You have the three iron tongues from the wrecks.' : `It needs three clappers. You have ${tp.clappers}. Wrecks keep them.`}`,
    event(n, arg) {
      const api = hub.api;
      if (n === 'tolls') { for (let i = 0; i < tp.n; i++) setTimeout(() => api.audio.play('bell', { vol: 0.7, rate: 0.55 }), i * 1100); return; }
      if (n === 'ring') {
        tp.ended = arg === 'tune' ? 'tune' : 'ring';
        if (arg === 'tune') { api.clearMark('owed'); api.keep('shell', 'The lamplit shell', 'It rings, very faintly, in a tune you know.'); return 'Something owed, somewhere, is quietly marked paid.'; }
        api.addMark('called'); api.keep('shell', 'A drowned shell', 'It rings, if you hold it up, with a stroke that is not yours.'); return '';
      }
      if (n === 'silence') { tp.ended = 'silence'; api.addMark('quiet'); if (arg === 'coin') { api.clearMark('owed'); const c = hub.mod('coin'); if (c) c.spend(); } return ''; }
      if (n === 'steal') { tp.ended = 'steal'; api.state.gold += 120; api.addMark('owed'); return ' (+120 gold)'; }
      if (n === 'buy') { api.keep('shell', 'A shell from the cloth', 'It rings your name, very faintly. You are almost sure it was not meant for you.'); return ''; }
      if (n === 'asked') { api.addMark('counted'); return ''; }
    },
    salvageMul: () => (tp.ended === 'ring' ? 1.25 : 1),
    clue: () => `At low tide, out on the ${hub.dir(site())} reef, you can hear the sea count. Nobody counts along.`,
  };
}

// ================= THE FERRYMAN'S COIN: a grey passenger who pays in a worn coin, and a pier on no chart
export function coinMod(hub) {
  const tp = hub.tp('coin', { state: 'none', from: null, day0: 0, fee: 0, ended: null, tp: null });
  const offer = () => hub.scan().filter((d) => d.type === 'harbour' && d.id !== '0,-1' && Math.hypot(d.x - hub.home().x, d.z - hub.home().z) < 1100).sort((a, b) => a.id < b.id ? -1 : 1);
  const offerAt = () => { const l = offer(); return l.length ? [l[Math.abs(hub.state.seed) % l.length], l[(Math.abs(hub.state.seed) + 3) % l.length]] : []; };
  return {
    stage: () => tp.state, hasCoin: () => tp.state === 'carry', spend() { if (tp.state === 'carry') { tp.state = 'done'; tp.ended = 'spent'; } },
    harbourRow(d) { return tp.state === 'none' && !tp.ended && offerAt().some((o) => o && o.id === d.id) ? { id: 'coin', html: 'A grey passenger asks for passage. They pay in a worn coin, and they do not say where to.', btn: 'Take them aboard' } : null; },
    act(id, d) {
      if (id !== 'coin') return;
      const api = hub.api, h = hub.home(), a = ((Math.abs(hub.state.seed) % 628) / 100);
      tp.state = 'carry'; tp.from = d.id; tp.day0 = api.state.dayN; tp.last = api.state.dayN;
      tp.target = { x: d.x + Math.cos(a) * 680, z: d.z + Math.sin(a) * 680 };
      api.keep('coin', 'A worn coin', 'Both faces have been worn smooth. Warm, as if somebody has only just let go of it.');
      api.toast('The passenger sits in the bow and does not speak. They point to the ' + api.bearing(tp.target.x - d.x, tp.target.z - d.z) + '.', false, 7000);
    },
    update({ ship, t, amp, api }) {
      if (tp.state !== 'carry') { if (tp.state === 'refused') return; return; }
      const d = api.state.dayN;
      if (d !== tp.last) {
        tp.last = d; api.state.gold = Math.max(0, api.state.gold - 5);
        if (d - tp.day0 >= 6) { tp.state = 'done'; tp.ended = 'lapsed'; api.addMark('owed'); api.toast('You wake and the passenger is gone. The coin on your pillow is cold now.', true, 7000); return; }
        api.toast(`The passenger points to the ${api.bearing(tp.target.x - ship.pos.x, tp.target.z - ship.pos.z)}. (-5 gold)`, false, 4000);
      }
      const m = stage(hub, 'coin', tp.target, ship, 360, () => {
        const b = new Builder(); b.doubleSided = true;
        b.box(0, 0, 0, 3.4, 0.5, 9, '#6e7078', TILE.planks); b.box(-1.5, 0.5, -3.8, 0.4, 3.2, 0.4, '#58606a', TILE.bark);
        b.box(-1.5, 3.7, -3.8, 0.9, 0.9, 0.9, '#c8d0d8', TILE.glow);     // one grey lantern
        return mesh(b, hub.scene);
      });
      if (m) m.position.set(tp.target.x, waveHeight(tp.target.x, tp.target.z, t, amp) + 0.5, tp.target.z);
    },
    interact({ ship, api }) { if (tp.state === 'carry' && tp.target && D(tp.target, ship.pos) < 18) return { key: 'coin', prompt: 'E: the grey pier', run: () => api.openScene('ferry', 'ferry') }; return null; },
    flag(n) { if (n === 'canpay') return hub.state.gold >= 30; },
    event(n) {
      const api = hub.api;
      if (n === 'pay') { tp.state = 'done'; tp.ended = 'paid'; tp.lamps = true; api.clearMark('owed'); return ''; }
      if (n === 'refuse') {
        tp.state = 'done'; tp.ended = 'stays';
        hub.state.crew.push({ name: 'The Passenger', look: 'grey, always at the rail', trait: 'omen', wish: { kind: 'none', text: 'has nowhere to go', done: false }, cost: 0, until: 99999, permanent: true });
        return '(Superstitious joins the crew, and stays.)';
      }
      if (n === 'swap') { tp.state = 'done'; tp.ended = 'swapped'; api.addMark('salt'); const f = hub.scan().find((o) => o.id === tp.from); api.state.dayN++; api.state.time = 0.3; if (f) api.teleport(f); return ''; }
    },
    harbourLine() { if (tp.lamps) { tp.lamps = false; return 'The harbour has lit its lamps very early today. Nobody remembers lighting them.'; } return null; },
    clue: () => 'A grey figure stood on the quay all week, asking each captain for passage. Nobody asked where.',
  };
}

// ================= THE HOLLOW HARBOUR: a harbour that is very, very glad you came
export function hollowMod(hub) {
  const tp = hub.tp('hollow', { id: null, w: 0, lastW: -1, accepted: false, docked: false, left: false });
  const harbour = () => {
    if (tp.id) return hub.scan().find((d) => d.id === tp.id);
    const h = hub.home(), l = hub.scan().filter((d) => d.type === 'harbour' && Math.hypot(d.x - h.x, d.z - h.z) > 900 && Math.hypot(d.x - h.x, d.z - h.z) < 1500).sort((a, b) => a.id < b.id ? -1 : 1);
    if (!l.length) return null;
    const d = l[Math.abs(hub.state.seed) % l.length]; tp.id = d.id; return d;
  };
  return {
    welcome: () => tp.w, accepted: () => tp.accepted, blocksSeat: () => tp.accepted, harbourId: () => { const d = harbour(); return d && d.id; },
    harbourRow(d) { const h = harbour(); return h && h.id === d.id && tp.w >= 5 && !tp.accepted ? { id: 'hollow', html: 'The harbourmaster is waiting at the end of the pier. He has been all week.', btn: 'Speak to him' } : null; },
    act(id) { if (id === 'hollow') hub.api.openScene('hollow', 'hollow'); },
    onDock(d) { if (!harbour() || harbour().id !== d.id) return; tp.docked = true; tp.left = false; if (tp.lastW !== hub.state.dayN) { tp.lastW = hub.state.dayN; tp.w++; } },
    onRest(d) {
      if (!harbour() || harbour().id !== d.id) return null;
      tp.w += 2;
      for (const c of hub.state.crew) { if (c.permanent) continue; c.until = (c.until || 0) + 2; if (c.wish && !c.wish.done) c.wish.faded = true; }
      return 'You sleep well. The crew sleep better. They are slow to wake, and smile before they open their eyes.';
    },
    update({ ship, api }) {
      const d = harbour(); if (!d || !tp.docked || tp.left) return;
      if (D(d, ship.pos) > 70) {   // sailing away
        tp.left = true; tp.docked = false;
        const crew = hub.state.crew.filter((c) => !c.permanent);
        if (tp.w >= 3 && crew.length && !tp.accepted) { const c = crew[crew.length - 1]; hub.state.crew = hub.state.crew.filter((x) => x !== c); api.toast(`${c.name} did not come back to the ship. Somebody says they went down to the water, smiling.`, true, 8000); }
      }
    },
    harbourLine(d) { const h = harbour(); if (!h || h.id !== d.id) return null; return tp.w >= 4 ? 'Welcome home, Captain.' : tp.w >= 2 ? 'Welcome back! We kept your place.' : 'Welcome, Captain! Everyone is so glad.'; },
    priceMul(d) { const h = harbour(); return h && h.id === d.id && tp.w >= 1 ? 1.12 : 1; },
    event(n) { if (n === 'accept') { tp.accepted = true; hub.api.addMark('salt'); hub.api.refreshMods(); return ''; } },
    modAdjust(m) { if (tp.accepted) { m.fogBonus += 70; m.digTime *= 0.95; } },
    fishBonus: () => (tp.accepted ? 1.25 : 1),
    patchSite: () => harbour(),
    clue: () => { const d = harbour(); return `There is a harbour out ${d ? hub.dir(d) : 'there'} where they love visitors. People who go there write home happily, and then not.`; },
  };
}

// ================= THE MUSIC OUT OF THE FOG: three notes from a house that is not there
export function musicMod(hub) {
  const tp = hub.tp('music', { nights: [], ended: null, changed: false, t: 0, near: 0 });
  const site = () => hub.pick('music', 1000, 1500);
  const NOTES = [293.66, 392, 493.88];
  let step = 0;
  return {
    heard: () => tp.nights.length,
    update({ ship, t, amp, dt, api }) {
      const s = site(), d = D(s, ship.pos), nt = api.night();
      if (tp.changed) api.audio.setMusicRate && api.audio.setMusicRate(0.944);
      const m = stage(hub, 'music', s, ship, 260, () => {
        const b = new Builder(); b.doubleSided = true;
        for (const [x, z] of [[-1.8, -1.4], [1.8, -1.4], [-1.8, 1.4], [1.8, 1.4]]) b.box(x, -1, z, 0.35, 5, 0.35, '#4a3a30', TILE.bark);
        b.box(0, 4.2, 0, 5.4, 3.2, 4.2, '#8a6a4a', TILE.planks); b.gable(0, 7.4, 0, 6, 2.2, 4.8, '#5a2a2a', TILE.planks, '#5a2a2a');
        b.box(0, 5, 2.15, 1.2, 1.2, 0.15, '#ffd070', TILE.glow);       // the one lit window
        return mesh(b, hub.scene);
      });
      if (m) { m.visible = nt > 0.55; m.position.set(s.x, waveHeight(s.x, s.z, t, amp) + 0.6, s.z); }
      if (tp.ended || nt < 0.55 || d > 360) return;
      tp.t -= dt;
      if (tp.t <= 0) {
        tp.t = 9; api.audio.playTone(NOTES[step % 3], { dur: 1.6, vol: 0.2 * Math.max(0.15, 1 - d / 380), pan: Math.max(-1, Math.min(1, Math.sin(Math.atan2(s.x - ship.pos.x, -(s.z - ship.pos.z)) - ship.heading))) });
        step++;
      }
      if (d < 130) {
        tp.near += dt;
        if (tp.near > 8 && !tp.nights.includes(api.state.dayN)) { tp.nights.push(api.state.dayN); if (tp.nights.length === 3) api.toast('You know the tune now. You wish you did not.', true, 6000); }
      }
    },
    interact({ ship, api }) { if (!tp.ended && tp.nights.length >= 3 && api.night() > 0.55 && D(site(), ship.pos) < 38) return { key: 'music', prompt: 'E: the house on four legs', run: () => api.openScene('musichouse', 'music') }; return null; },
    event(n, arg) {
      const api = hub.api;
      if (n === 'answer') { tp.ended = 'answered'; api.keep('lantern', 'The sight lantern', 'Lit all day tomorrow. Things that hide in the water show up in it.'); hub.state.story.sightUntil = api.state.dayN + 1; if (arg === 'owed') api.addMark('owed'); return ''; }
      if (n === 'refuse') { tp.ended = 'refused'; api.addMark('quiet'); return ''; }
      if (n === 'change') { tp.ended = 'changed'; tp.changed = true; api.addMark('called'); return ''; }
    },
    sight: () => (hub.state.story.sightUntil || -1) >= hub.state.dayN,
    clue: () => 'On still nights out past the far reefs, a few say they hear three notes in the fog. Always the same three.',
  };
}

// ================= THE OTHER CAPTAIN: a ship like yours, with the wrong colours
export function captainMod(hub) {
  const tp = hub.tp('captain', { stage: 'none', signed: false, saved: null, deadline: 0, ended: null });
  const site = () => hub.pick('captain', 1400, 1800);
  const ravenMats = () => hub.cache.raven || (hub.cache.raven = { props: mats.props.clone(), sail: mats.sail.clone() });
  const buildRaven = (dark) => {
    const g = new THREE.Group(), mm = ravenMats(), G = shipGeos();
    mm.props.color.set(dark ? '#1a1830' : '#ffffff'); mm.sail.color.set('#2a2638');
    const hull = new THREE.Mesh(G.hull, mm.props), mast = new THREE.Mesh(G.mast, mm.props), sail = new THREE.Mesh(G.sail, mm.sail); sail.position.set(0, 1.0, -0.3);
    g.add(hull, mast, sail); g.traverse((o) => { o.frustumCulled = false; }); hub.scene.add(g); return g;
  };
  return {
    stage: () => tp.stage, sign() { tp.signed = true; }, unsign() { tp.signed = false; },
    update({ ship, t, amp, api }) {
      const s = site();
      if (tp.stage === 'none' || tp.stage === 'seen') {
        const g = stage(hub, 'raven', s, ship, 320, () => buildRaven(true));
        if (g) { g.position.set(s.x, waveHeight(s.x, s.z, t, amp) + 0.1, s.z); g.rotation.y = 1 + Math.sin(t * 0.1) * 0.05; }
        if (tp.stage === 'none' && D(s, ship.pos) < 140) { tp.stage = 'seen'; api.toast('A ship like yours. The wrong colours. When you look again, it is lower in the water, and still.', true, 7000); }
      } else { const g = hub.live.get('raven'); if (g) { hub.scene.remove(g); hub.live.delete('raven'); } }
      if (tp.stage === 'aboard') {
        // the Gull, tied up where the two ships were swapped
        const gl = stage(hub, 'gull', s, ship, 420, () => { const g = new THREE.Group(), G = shipGeos(); g.add(new THREE.Mesh(G.hull, mats.props), new THREE.Mesh(G.mast, mats.props), new THREE.Mesh(G.sail, mats.sail)); g.children[2].position.set(0, 1.0, -0.3); g.traverse((o) => { o.frustumCulled = false; }); hub.scene.add(g); return g; });
        if (gl) { const a = t * 0.05; gl.position.set(s.x + Math.cos(a) * 14, waveHeight(s.x, s.z, t, amp) + 0.1, s.z + Math.sin(a) * 14); gl.rotation.y = -a; }
        if (api.state.dayN > tp.deadline) { this.event('stay', null); api.toast('Nobody came back for the Gull. After a while you stop looking for it.', true, 8000); }
      }
    },
    onRest(d) {
      if (tp.stage !== 'seen') return null;
      tp.stage = 'aboard'; tp.deadline = hub.api.state.dayN + 3; tp.saved = { ...hub.state.custom };
      hub.api.setLook({ hull: 'midnight', sail: 'night', flag: 'black' });
      hub.api.refreshMods();
      hub.api.say('Captain? Whose ship is this?');
      return 'You wake aboard. It is not quite your ship. It is your ship, a little to the left. The Gull is gone from the quay.';
    },
    interact({ ship, api }) { if (tp.stage === 'aboard' && D(site(), ship.pos) < 40) return { key: 'captain', prompt: 'E: come alongside', run: () => api.openScene('raven', 'raven') }; return null; },
    event(n) {
      const api = hub.api;
      if (n === 'back') { tp.ended = 'back'; tp.stage = 'done'; api.setLook(tp.saved); api.keep('glass', 'A spyglass with the wrong initials', 'It sees a long way. The initials are yours, and not.'); api.state.gold += 40; api.refreshMods(); return ' (+40 gold)'; }
      if (n === 'sink') { tp.ended = 'sunk'; tp.stage = 'done'; api.setLook(tp.saved); api.addMark('salt'); api.refreshMods(); api.state.story.askedWho = true; setTimeout(() => api.say('Captain... who was that?'), 4000); return ''; }
      if (n === 'stay') { tp.ended = 'stayed'; tp.stage = 'done'; api.addMark('owed'); if (tp.signed) api.addMark('called'); api.refreshMods(); return ''; }
    },
    modAdjust(m) { if (tp.stage === 'aboard' || tp.ended === 'stayed') { m.speed *= 0.88; m.turn *= 0.85; m.maxHp += 60; } },
    clue: () => 'The shipwright says there is a name scratched inside your hull. Not the Gull. Somebody left it.',
  };
}

export const MODS = { house: houseMod, bell: bellMod, coin: coinMod, hollow: hollowMod, music: musicMod, captain: captainMod };
