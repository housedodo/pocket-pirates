import * as THREE from 'three';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { mats } from './psx.js';
import { shoreR } from './world.js';
import { hash2 } from './util.js';

// One-time sea caves: a dark mouth in a rocky shore. You can go in once. It is a short scene of choices and d20 checks
// (same card box as the sea encounters); when it ends, won or lost, the tide closes over the mouth and it never comes back.
// Never part of any story, never marked on the chart, always optional. Nothing here is about the Eye or the hut.
//
// Node format: { title?, text, choices: [ { label, check?: {label, kind: 'sea'|'luck'|'talk', dc}, go | ok | fail: Result } ] }
// Result: { text, next?: nodeId, end?: 'win' | 'lose', fx?: { gold, hurt, note, rumour, time, rep, buff } }
// A result with no next ends the visit. The very first node of every cave is the doorway: "Go in" or "Not yet" (cancel keeps the cave).
export const CAVES = {
  larder: {
    id: 'larder', name: 'The Hermit\'s Larder', icon: 'fish', glow: '#ffb050',
    nodes: {
      door: { text: 'A low cave mouth, and a smell of smoke, onions and wet wool. Somebody has hung washing across the passage.', choices: [
        { label: 'Go in', go: { text: '', next: 'washing' } },
        { label: 'Not yet', go: { cancel: true } }] },
      washing: { text: 'Socks, a shirt and something that might once have been a flag. Past the line there is a lantern, a kettle and a hum.', choices: [
        { label: 'Call out a greeting', check: { label: 'Talk', kind: 'talk', dc: 9 },
          ok: { text: '"Visitors!" says a voice, delighted. A man with a very long beard waves a ladle at you.', next: 'tea' },
          fail: { text: '"THE TAX MAN!" A boot comes through the washing first. You duck. Your purse is less quick.', next: 'tea', fx: { gold: -6 } } },
        { label: 'Duck under the washing, quietly', check: { label: 'Luck', kind: 'luck', dc: 12 },
          ok: { text: 'You slip through without a sound. The pantry is right there, door open, shelves full.', next: 'pantry' },
          fail: { text: 'A bucket. A very loud bucket. "WHO\'S THERE?" calls the beard behind the kettle.', next: 'tea' } },
        { label: 'Back away', go: { text: 'You back out into the light. The washing, you notice, now has your hat on it.', end: 'lose' } }] },
      tea: { text: 'The hermit pours tea into a shell and hands it over. He has opinions about gulls, tides and your hat.', choices: [
        { label: 'Drink it and listen', go: { text: 'He talks for an hour. It is almost useful. He says the biggest fish wait where a rock\'s shadow touches the sand at noon.', next: 'pantry', fx: { note: 'The cave hermit: the biggest fish wait where a rock\'s shadow touches the sand at noon.' } } },
        { label: 'Admire his spoon collection', check: { label: 'Talk', kind: 'talk', dc: 10 },
          ok: { text: 'He is moved to tears. He gives you the best spoon and a small bag of coins he "found".', end: 'win', fx: { gold: 24 } },
          fail: { text: 'You call one a fork. The silence is long. He walks you to the door with the ladle.', end: 'lose' } }] },
      pantry: { text: 'Barrels, nets, jars with labels in a language that is mostly arrows. One jar glints.', choices: [
        { label: 'Take the glinting jar', check: { label: 'Luck', kind: 'luck', dc: 11 },
          ok: { text: 'Coins, and a very old pickled onion. You take the coins.', end: 'win', fx: { gold: 32 } },
          fail: { text: 'It was pickles. All of it was pickles. You leave smelling like a salad.', end: 'lose' } },
        { label: 'Leave a coin and a thank you', go: { text: 'On the way out you find a small purse on the doorstep, with your name spelled wrong. The hermit sees everything.', end: 'win', fx: { gold: 14, rep: true } } }] },
    },
  },

  grotto: {
    id: 'grotto', name: 'The Rising Grotto', icon: 'crate', glow: '#58d8d0',
    nodes: {
      door: { text: 'A cave mouth that breathes: every wave sends cold air out and takes it back. Inside, the water has a green glow.', choices: [
        { label: 'Go in', go: { text: '', next: 'ledge' } },
        { label: 'Not yet', go: { cancel: true } }] },
      ledge: { text: 'A round chamber of green water. On a ledge across it sits a sea chest. The sound of the swell says the tide is coming in.', choices: [
        { label: 'Swim for the chest', check: { label: 'Seamanship', kind: 'sea', dc: 12 },
          ok: { text: 'Strong strokes, cold water, and you are on the ledge before the next wave.', next: 'chest' },
          fail: { text: 'The swell takes you into the rock. You get there, bruised, with the water already at the ledge.', next: 'chest', fx: { hurt: 6 } } },
        { label: 'Throw a line and drag it over', check: { label: 'Luck', kind: 'luck', dc: 11 },
          ok: { text: 'The hook catches the first time. The chest comes across the water like a very heavy duck.', next: 'chest' },
          fail: { text: 'The hook finds only rock. The tide pulls the line out of your hand. The chest sits there, smug.', end: 'lose' } },
        { label: 'Leave while you can', go: { text: 'You leave. Behind you the water closes the chamber, as if it had never had a chest.', end: 'lose' } }] },
      chest: { text: 'Inside: a damp ledger, a heap of coins and a brass lamp. The water is at your knees and rising.', choices: [
        { label: 'Grab all of it', check: { label: 'Luck', kind: 'luck', dc: 13 },
          ok: { text: 'You take the lot and a wave carries you to the mouth like a cork.', end: 'win', fx: { gold: 55 } },
          fail: { text: 'Too much for two arms. The lamp goes under. You come out with a few coins and a lot of seawater.', end: 'lose', fx: { gold: 12 } } },
        { label: 'Take only the coins', go: { text: 'Light, quick and dry enough. You are out before the water is at your waist.', end: 'win', fx: { gold: 30 } } }] },
    },
  },

  niche: {
    id: 'niche', name: 'The Tally Niche', icon: 'star', glow: '#e8e4c0',
    nodes: {
      door: { text: 'A narrow cave, dry and quiet. Pale marks cover the walls near the entrance, neat as stitches.', choices: [
        { label: 'Go in', go: { text: '', next: 'marks' } },
        { label: 'Not yet', go: { cancel: true } }] },
      marks: { text: 'Tally marks, thousands of them. At the bottom, in careful letters: "COUNT THEM AGAIN." A stone shelf waits at the far end.', choices: [
        { label: 'Count them', check: { label: 'Luck', kind: 'luck', dc: 11 },
          ok: { text: 'Your count matches the writing exactly, and you do not know how. Something clicks in the shelf.', next: 'shelf' },
          fail: { text: 'You lose count at 411. You start again. And again. When you look up, the lantern has burned low. A few hours are gone.', next: 'shelf', fx: { time: 0.1 } } },
        { label: 'Add one more mark', go: { text: 'Your line is crooked among the neat ones. It stays there. Somehow that feels right.', next: 'shelf', fx: { note: 'You added one crooked tally mark to a wall full of neat ones.' } } },
        { label: 'Back away', go: { text: 'You back out, politely. The marks are exactly where you left them.', end: 'lose' } }] },
      shelf: { text: 'On the shelf: a dented tin box, and an old brass compass lying open. Its needle swings and settles on the cave mouth.', choices: [
        { label: 'Take the compass', go: { text: 'It is worth something to a collector. The needle keeps pointing back at the cave until you are out of sight.', end: 'win', fx: { gold: 26, note: 'A brass compass from a quiet cave. Its needle points back where you found it.' } } },
        { label: 'Open the tin box', check: { label: 'Luck', kind: 'luck', dc: 12 },
          ok: { text: 'Inside, a folded chart of a place nobody has drawn yet. A real one.', end: 'win', fx: { rumour: true } },
          fail: { text: 'Biscuits. Centuries old, and hard as the shelf. One of your teeth is not pleased.', end: 'lose' } },
        { label: 'Leave everything as it is', go: { text: 'You step back into the light. The cave feels, somehow, grateful.', end: 'win', fx: { rep: true, gold: 8 } } }] },
    },
  },
};
const KINDS = ['larder', 'grotto', 'niche'];
const CAVE_TYPES = ['rocky', 'volcano', 'jungle'];

/** the cave on this island (or null): about one rocky, volcanic or jungle isle in nine, never twice. */
export function caveSite(d, seed, forced) {
  if (!CAVE_TYPES.includes(d.type) || d.hut) return null;
  const f = forced && forced[d.id];
  const h = hash2(Math.round(d.x), Math.round(d.z), seed + 77);
  if (!f && h % 9 !== 0) return null;
  const kind = f || KINDS[(h >> 4) % KINDS.length], th = ((h >> 8) % 628) / 100;
  const r = shoreR(d, th);
  return { id: `cave:${d.id}`, kind, x: d.x + Math.cos(th) * (r - 0.8), z: d.z + Math.sin(th) * (r - 0.8), th, r };
}

function buildMouth(glow) {
  const b = new Builder(); b.doubleSided = true;
  const rock = '#70737c', rock2 = '#585c66';
  b.box(-1.9, 0, 0, 1.6, 3.2, 1.8, rock, TILE.stone);
  b.box(1.9, 0, 0, 1.6, 3.6, 1.8, rock2, TILE.stone);
  b.box(0, 3.0, 0, 5.2, 1.2, 1.8, rock, TILE.stone);
  b.blob(-2.2, 3.4, -0.2, 1.4, 1.0, 1.2, rock2, TILE.stone, 0.3, 3);
  b.blob(1.8, 3.9, -0.1, 1.5, 1.1, 1.3, rock, TILE.stone, 0.3, 5);
  b.blob(0, 4.5, -0.6, 2.8, 1.1, 1.6, rock2, TILE.stone, 0.3, 8);
  b.box(0, 0, -0.85, 3.0, 3.0, 0.2, '#07070c', TILE.white);         // the dark inside
  b.box(0, 0.5, -0.7, 0.55, 0.55, 0.1, glow, TILE.glow);            // a light deep in, to draw the eye
  b.box(0, 0.1, 0.9, 3.2, 0.12, 1.4, '#b7b09a', TILE.stone);        // a wet sill at the water
  return b;
}

export class Caves {
  constructor(scene, world, state) {
    this.scene = scene; this.world = world; this.state = state; this.live = new Map(); this.sinking = [];
    this.forced = {};
  }
  /** the demo's three guaranteed caves: the nearest rocky/volcanic/jungle isles 150-700 from Tama (cell 0,-1), so every part can be tried */
  force(home, n = 2) {
    const list = [];
    for (let cx = -9; cx <= 9; cx++) for (let cz = -10; cz <= 8; cz++) {
      const d = this.world.desc(cx, cz); if (!d || !CAVE_TYPES.includes(d.type) || d.hut) continue;
      const dist = Math.hypot(d.x - home.x, d.z - home.z);
      if (dist > 150 && dist < 700) list.push({ d, dist });
    }
    list.sort((a, b) => a.dist - b.dist);
    list.slice(0, n).forEach((o, i) => { this.forced[o.d.id] = KINDS[i % KINDS.length]; });
  }
  done(id) { return !!(this.state.story.caves && this.state.story.caves[id]); }
  /** call every frame: keeps meshes for sites within reach, drops the rest */
  update(dt, ship, enabled) {
    for (let i = this.sinking.length - 1; i >= 0; i--) {   // a visited cave: the tide closes over the mouth
      const s = this.sinking[i]; s.t += dt; s.m.position.y = s.y0 - s.t * 0.9; s.m.rotation.z = Math.sin(s.t * 3) * 0.01;
      if (s.t > 5) { this.scene.remove(s.m); s.m.geometry.dispose(); this.sinking.splice(i, 1); }
    }
    if (!enabled) { for (const [id, o] of this.live) { this.scene.remove(o.m); o.m.geometry.dispose(); this.live.delete(id); } return; }
    for (const isl of this.world.islands.values()) {
      const d = isl.desc, id = `cave:${d.id}`;
      if (this.live.has(id) || this.done(id)) continue;
      if (Math.hypot(d.x - ship.pos.x, d.z - ship.pos.z) > d.r + 320) continue;
      const site = caveSite(d, this.state.seed, this.forced); if (!site) continue;
      const m = new THREE.Mesh(buildMouth(CAVES[site.kind].glow).geometry(), mats.props);
      m.position.set(site.x, 0.2, site.z); m.rotation.y = Math.atan2(Math.cos(site.th), Math.sin(site.th)); m.scale.setScalar(1.1);
      this.scene.add(m); this.live.set(id, { m, site, d });
    }
    for (const [id, o] of this.live) {
      if (Math.hypot(o.site.x - ship.pos.x, o.site.z - ship.pos.z) > 420 || this.done(id)) { this.scene.remove(o.m); o.m.geometry.dispose(); this.live.delete(id); }
    }
  }
  /** the cave mouth you are close enough to enter, if any */
  near(x, z, range = 15) {
    for (const o of this.live.values()) if (Math.hypot(o.site.x - x, o.site.z - z) < range) return o.site;
    return null;
  }
  /** a visit is over: remember it and let the sea take the mouth */
  finish(site, result) {
    this.state.story.caves = { ...(this.state.story.caves || {}), [site.id]: result };
    const o = this.live.get(site.id); if (!o) return;
    this.live.delete(site.id); this.sinking.push({ m: o.m, y0: o.m.position.y, t: 0 });
  }
}
