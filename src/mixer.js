import { CUES } from './audio.js';

// The sound mixer (dev tool, ?dev=1 then F8 or the pause menu): a volume slider for every cue, a play button to
// hear it, live meters for the loops the game is playing right now, and a way to bake the result into the game.
const GROUPS = [
  ['Overall', ['_master', '_music']],
  ['Music (one per dread stage)', CUES.loops.filter((k) => k.startsWith('music_'))],
  ['Ambience', CUES.loops.filter((k) => k.startsWith('amb_'))],
  ['Sea and weather loops', CUES.loops.filter((k) => !k.startsWith('music_') && !k.startsWith('amb_'))],
  ['Effects', CUES.oneShots],
];
const LABEL = { _master: 'MASTER (everything)', _music: 'MUSIC (all music tracks)' };
const KEY = 'pocket-pirates-mixer';

export class Mixer {
  constructor(audio, toast) {
    this.a = audio; this.toast = toast;
    this.el = document.getElementById('mixer');
    this.list = document.getElementById('mixList');
    this.list.innerHTML = GROUPS.map(([title, keys]) => `<div class="mxsec">${title}</div>` + keys.map((k) => {
      const loop = CUES.loops.includes(k), meta = k.startsWith('_');
      return `<div class="mxrow" data-k="${k}"><span class="mxname">${LABEL[k] || k}</span>
        <input type="range" min="0" max="200" step="5" value="${Math.round(this.a.v(k) * 100)}">
        <b class="mxval">${Math.round(this.a.v(k) * 100)}%</b>
        ${meta ? '<i></i>' : loop ? `<button class="mxplay" title="Hear only this loop">solo</button>` : `<button class="mxplay" title="Play once">play</button>`}
        ${loop ? '<em class="mxmeter"><span></span></em>' : '<em></em>'}</div>`;
    }).join('')).join('');
    this.list.addEventListener('input', (e) => {
      const row = e.target.closest('.mxrow'); if (!row) return;
      const k = row.dataset.k, x = e.target.value / 100;
      this.a.setVol(k, x); row.querySelector('.mxval').textContent = `${e.target.value}%`;
      if (k === '_master') this.a.setMuted(this.a.muted);
      if (k === '_music') this.a.setMusic(this.a.musicOn);
      this.saveLocal();
    });
    this.list.addEventListener('click', (e) => {
      const b = e.target.closest('.mxplay'); if (!b) return;
      const k = b.closest('.mxrow').dataset.k;
      if (CUES.loops.includes(k)) {
        this.a.preview = this.a.preview === k ? null : k;
        this.list.querySelectorAll('.mxplay').forEach((x) => x.classList.toggle('on', x.closest('.mxrow').dataset.k === this.a.preview));
      } else this.a.play(k);
    });
    document.getElementById('mixClose').addEventListener('click', () => this.toggle(false));
    document.getElementById('mixReset').addEventListener('click', () => {
      for (const k of Object.keys(this.a.vol)) this.a.vol[k] = 1;
      this.list.querySelectorAll('.mxrow').forEach((r) => { r.querySelector('input').value = 100; r.querySelector('.mxval').textContent = '100%'; });
      this.a.setMuted(this.a.muted); this.a.setMusic(this.a.musicOn); this.saveLocal();
    });
    document.getElementById('mixSave').addEventListener('click', () => {
      const out = {};
      for (const [k, x] of Object.entries(this.a.vol)) if (Math.abs(x - 1) > 0.001) out[k] = Math.round(x * 100) / 100;
      const blob = new Blob([JSON.stringify(out, null, 2) + '\n'], { type: 'application/json' });
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'volumes.json'; link.click();
      this.toast('Saved volumes.json. Put it in public/audio/ to make these the game\'s volumes.', false, 7000);
    });
  }
  saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(this.a.vol)); } catch (e) { /* storage blocked */ } }
  toggle(on = !this.el.classList.contains('open')) {
    this.el.classList.toggle('open', on);
    if (!on) { this.a.preview = null; this.list.querySelectorAll('.mxplay.on').forEach((x) => x.classList.remove('on')); }
  }
  /** live meters: how loud the game is asking each loop to play right now */
  update() {
    if (!this.el.classList.contains('open')) return;
    this.list.querySelectorAll('.mxmeter').forEach((m) => {
      const k = m.closest('.mxrow').dataset.k, lv = (this.a.level[k] || 0) * this.a.v(k);
      m.firstChild.style.width = `${Math.min(100, lv * 100)}%`;
      m.closest('.mxrow').classList.toggle('live', lv > 0.04);
    });
  }
}
