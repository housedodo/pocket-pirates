// The sound studio (dev tool, ?dev=1 then F9 or the pause menu). Load your own music and sounds, cut and shorten them on a
// waveform, and place them: each placement says WHERE it plays (situations such as "night", "storm", "in harbour", a dread
// range), in what STATE (loop or once, volume, fades, how much it hushes the game's own music) and which clip it uses.
// Everything is kept in this browser (IndexedDB for the files, localStorage for the placements) and can be exported as
// soundtrack.json plus the trimmed WAVs; public/audio/studio/soundtrack.json is loaded at start-up when it exists.

export const SITUATIONS = [
  ['title', 'Title screen'], ['sailing', 'Sailing'], ['harbour', 'In harbour'], ['yard', 'Shipyard'], ['hut', 'The hut'], ['cave', 'In a cave'],
  ['chart', 'Chart open'], ['log', 'Log / card'], ['talk', 'Talking'], ['paused', 'Paused'], ['fishing', 'Fishing'], ['combat', 'Raider near'],
  ['ending', 'Demo end'], ['day', 'Day'], ['twilight', 'Dawn / dusk'], ['night', 'Night'], ['rain', 'Rain'], ['storm', 'Storm'], ['fog', 'Fog'],
  ['windy', 'Strong wind'], ['land', 'Near land'], ['open', 'Open sea'],
];
const KEY = 'pocket-pirates-studio';
const MIN_FADE = 0.004;   // every cut gets a few milliseconds of fade so it never clicks

const css = `
#studio { position: fixed; left: 12px; right: 12px; bottom: 12px; height: min(58vh, 560px); z-index: 12; display: none; flex-direction: column; background: var(--pxmenu) 0 0 / 32px 32px; image-rendering: pixelated; color: #fff4d8; box-shadow: 0 -4px 0 #c9a85c, 0 4px 0 #c9a85c, -4px 0 0 #c9a85c, 4px 0 0 #c9a85c, 8px 8px 0 rgba(0,0,0,.5); font-size: 15px; }
#studio.open { display: flex; }
#studio.popped { position: fixed; inset: 0; height: auto; box-shadow: none; }
#studio.popped .stbody { grid-template-columns: minmax(380px, 1fr) minmax(380px, 1fr); }
#studio button, #studio select, #studio input[type=text], #studio input[type=number] { font-family: "DotGothic16", monospace; font-size: 14px; color: #fff4d8; }
#studio button { background: var(--pxbtn) 0 0 / 32px 32px; border: none; padding: 3px 9px; cursor: pointer; box-shadow: 0 -2px 0 #c9a85c, 0 2px 0 #c9a85c, -2px 0 0 #c9a85c, 2px 0 0 #c9a85c; }
#studio button:hover { color: #ffd84a; } #studio button.on { background: #5ec45a; color: #10200c; } #studio button.del:hover { color: #ff7a6a; }
#studio select, #studio input[type=text], #studio input[type=number] { background: #1c1410; border: 2px solid #6b5630; padding: 2px 4px; min-width: 0; }
#studio input[type=number] { width: 66px; }
#studio .sthead { display: flex; flex-wrap: wrap; gap: 8px 10px; align-items: center; padding: 8px 12px 6px; border-bottom: 2px solid #6b5630; }
#studio .sthead b { letter-spacing: 1px; margin-right: 6px; }
#studio .stchips { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 12px; border-bottom: 2px solid #6b5630; align-items: center; }
#studio .stchips small { opacity: .7; margin-right: 4px; }
#studio .chip { padding: 1px 7px; background: #2a1f16; border: 2px solid #6b5630; cursor: pointer; font-size: 13px; user-select: none; }
#studio .chip.live { background: #3a5a2a; border-color: #5ec45a; color: #eaffd8; }
#studio .chip.req { background: #2f5b86; border-color: #7fc0ff; } #studio .chip.not { background: #6b2a24; border-color: #ff8a7a; text-decoration: line-through; }
#studio .stbody { display: grid; grid-template-columns: minmax(320px, 1fr) minmax(320px, 1fr); gap: 0; flex: 1; min-height: 0; }
#studio .stcol { overflow-y: auto; padding: 8px 12px 12px; min-height: 0; } #studio .stcol + .stcol { border-left: 2px solid #6b5630; }
#studio h4 { margin: 4px 0 6px; font-weight: normal; color: #ffd84a; letter-spacing: 1px; font-size: 14px; display: flex; gap: 8px; align-items: center; }
#studio .clip, #studio .rule { display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: center; padding: 4px 6px; margin-bottom: 4px; background: rgba(0,0,0,.25); border: 2px solid transparent; }
#studio .clip.sel { border-color: #c9a85c; } #studio .clip .nm { flex: 1; min-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
#studio .rule.playing { border-color: #5ec45a; } #studio .rule.off { opacity: .55; }
#studio .rule .row { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; width: 100%; }
#studio .rule .row label { display: inline-flex; gap: 4px; align-items: center; } #studio .rule input[type=range] { width: 90px; }
#studio .dot { width: 10px; height: 10px; background: #4a3c2a; display: inline-block; } #studio .rule.playing .dot { background: #5ec45a; }
#studio canvas { width: 100%; height: 96px; display: block; background: #120d09; border: 2px solid #6b5630; cursor: crosshair; touch-action: none; }
#studio .ed { margin: 6px 0 10px; } #studio .edrow { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; margin-top: 6px; }
#studio .edrow label { display: inline-flex; gap: 4px; align-items: center; }
#studio .hint { opacity: .7; font-size: 13px; margin: 2px 0 6px; line-height: 1.35; }
#studio .drop { border: 2px dashed #6b5630; padding: 10px; text-align: center; opacity: .8; }
#studio.dragging .drop { border-color: #ffd84a; color: #ffd84a; }
`;

const uid = () => Math.random().toString(36).slice(2, 9);
const slug = (s) => (s || 'clip').toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'clip';
const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---- IndexedDB: the original files, so the studio is still full after a reload
const idb = () => new Promise((res, rej) => { const r = indexedDB.open('pocket-pirates-studio', 1); r.onupgradeneeded = () => r.result.createObjectStore('clips'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const idbDo = async (mode, fn) => { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction('clips', mode), st = tx.objectStore('clips'), r = fn(st); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); }); };
const idbPut = (id, rec) => idbDo('readwrite', (s) => s.put(rec, id)).catch(() => {});
const idbDel = (id) => idbDo('readwrite', (s) => s.delete(id)).catch(() => {});
const idbAll = async () => { const db = await idb(); return new Promise((res) => { const out = []; const rq = db.transaction('clips').objectStore('clips').openCursor(); rq.onsuccess = () => { const c = rq.result; if (c) { out.push({ id: c.key, ...c.value }); c.continue(); } else res(out); }; rq.onerror = () => res(out); }); };

function wav16(buf) {   // AudioBuffer -> 16-bit PCM WAV
  const ch = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const s = (o, t) => { for (let i = 0; i < t.length; i++) out.setUint8(o + i, t.charCodeAt(i)); };
  s(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); s(8, 'WAVE'); s(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
  out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); s(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const d = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44; for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { out.setInt16(o, clamp(d[c][i], -1, 1) * 32767, true); o += 2; }
  return new Blob([out], { type: 'audio/wav' });
}
function save(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }

export class SoundStudio {
  constructor(audio, toast) {
    this.a = audio; this.toast = toast;
    this.clips = []; this.rules = []; this.sel = null;
    this.forceOn = false; this.forced = new Set(); this.fdread = 0;
    this.audition = null; this.act = new Map(); this.pv = null;
    this.live = { flags: new Set(), dread: 0 }; this.duck = 0; this.duckAmb = 0; this.sig = '';
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    this.el = document.createElement('div'); this.el.id = 'studio'; document.body.appendChild(this.el);
    this.build();
    this.restore();
  }

  // ---------------------------------------------------------------- UI
  build() {
    this.el.innerHTML = `
      <div class="sthead"><b>SOUND STUDIO</b>
        <button data-a="load">Load sounds...</button><button data-a="export">Export soundtrack</button><button data-a="import">Import soundtrack.json</button>
        <label style="display:inline-flex;gap:4px;align-items:center" title="While you preview a clip, the game's own sound is hushed"><input type="checkbox" data-a="hush" checked> hush game on preview</label>
        <span style="flex:1"></span><button data-a="pop" title="Open the studio in its own window, e.g. on a second screen">Pop out</button><button data-a="close">Close (F9)</button>
        <input type="file" data-f="audio" accept="audio/*,.wav,.ogg,.mp3,.flac,.m4a" multiple hidden><input type="file" data-f="json" accept=".json,application/json" hidden></div>
      <div class="stchips"></div>
      <div class="stbody"><div class="stcol" data-c="clips"></div><div class="stcol" data-c="rules"></div></div>`;
    this.chips = this.el.querySelector('.stchips');
    this.colClips = this.el.querySelector('[data-c=clips]'); this.colRules = this.el.querySelector('[data-c=rules]');
    const fa = this.el.querySelector('[data-f=audio]'), fj = this.el.querySelector('[data-f=json]');
    this.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
      if (a === 'close') this.toggle(false);
      else if (a === 'pop') this.popped ? this.dock() : this.popOut();
      else if (a === 'load') fa.click();
      else if (a === 'import') fj.click();
      else if (a === 'export') this.exportAll();
    });
    fa.addEventListener('change', () => { this.addFiles([...fa.files]); fa.value = ''; });
    fj.addEventListener('change', async () => { const f = fj.files[0]; fj.value = ''; if (f) this.importJson(JSON.parse(await f.text())); });
    for (const t of ['dragenter', 'dragover']) this.el.addEventListener(t, (e) => { e.preventDefault(); this.el.classList.add('dragging'); });
    for (const t of ['dragleave', 'drop']) this.el.addEventListener(t, (e) => { e.preventDefault(); this.el.classList.remove('dragging'); });
    this.el.addEventListener('drop', (e) => this.addFiles([...e.dataTransfer.files]));
    this.drawChips(); this.drawClips(); this.drawRules();
  }

  /** move the whole panel into its own window; the game and the sound keep running in this one */
  popOut() {
    const w = window.open('', 'pocket-pirates-studio', 'width=1180,height=800');
    if (!w) { this.toast('The browser blocked the new window: allow pop-ups for this page.', false, 5000); return; }
    const d = w.document; d.title = 'Pocket Pirates - Sound studio';
    d.head.innerHTML = ''; for (const n of document.head.querySelectorAll('style, link[rel=stylesheet]')) d.head.appendChild(n.cloneNode(true));
    d.documentElement.style.cssText = document.documentElement.style.cssText; d.body.style.cssText = 'margin:0;background:#1b1538;font-family:"DotGothic16",monospace';
    d.body.innerHTML = ''; d.body.appendChild(d.adoptNode(this.el)); this.el.classList.add('popped', 'open');
    this.win = w; this.popped = true; this.el.querySelector('[data-a=pop]').textContent = 'Dock back';
    w.addEventListener('pagehide', () => { if (this.win === w) this.dock(true); });
    window.addEventListener('pagehide', () => { try { w.close(); } catch (e) { /* gone */ } }, { once: true });
    this.sig = ''; if (this.sel) this.drawClips();
  }
  dock(fromClose) {
    const w = this.win; this.win = null; this.popped = false;
    document.body.appendChild(document.adoptNode(this.el)); this.el.classList.remove('popped');
    this.el.classList.toggle('open', !!fromClose); this.el.querySelector('[data-a=pop]').textContent = 'Pop out';
    if (!fromClose && w) try { w.close(); } catch (e) { /* gone */ }
    if (fromClose) this.stopPreview();
    this.sig = ''; if (this.sel) this.drawClips();
  }
  toggle(on) {
    if (this.popped) { if (on === false) this.dock(false), this.el.classList.remove('open'); else this.win.focus(); return; }
    on = on === undefined ? !this.el.classList.contains('open') : on;
    this.el.classList.toggle('open', on);
    if (on) { this.ensureCtx(); this.drawChips(true); }
    else this.stopPreview();
  }
  ensureCtx() {
    if (!this.a.ctx) { this.toast('Start the game first: sound begins with the first click.', false, 4000); return false; }
    if (this.a.ctx.state === 'suspended') this.a.ctx.resume();
    return true;
  }

  drawChips(force) {
    const on = this.forceOn ? this.forced : this.live.flags;
    const sig = `${this.forceOn}|${[...on].join(',')}|${this.fdread}|${Math.round(this.live.dread * 100)}`;
    if (!force && sig === this.sig) return;
    this.sig = sig;
    const d = this.forceOn ? this.fdread : this.live.dread;
    this.chips.innerHTML = `<small>${this.forceOn ? 'FORCED situation (click to change)' : 'Live situation (click a chip to force one)'}</small>`
      + SITUATIONS.map(([k, n]) => `<span class="chip ${on.has(k) ? 'live' : ''}" data-chip="${k}">${n}</span>`).join('')
      + `<small style="margin-left:8px">Dread</small><input type="range" data-fd min="0" max="100" value="${Math.round(d * 100)}" ${this.forceOn ? '' : 'disabled'}><b>${Math.round(d * 100)}</b>`
      + (this.forceOn ? ' <button data-force="off">Back to live</button>' : '');
    this.chips.onclick = (e) => {
      const c = e.target.closest('[data-chip]'), f = e.target.closest('[data-force]');
      if (f) { this.forceOn = false; this.drawChips(true); this.drawRules(); return; }
      if (!c) return;
      if (!this.forceOn) { this.forceOn = true; this.forced = new Set(this.live.flags); this.fdread = this.live.dread; }
      const k = c.dataset.chip; this.forced.has(k) ? this.forced.delete(k) : this.forced.add(k);
      this.drawChips(true);
    };
    const fd = this.chips.querySelector('[data-fd]');
    if (fd) fd.oninput = () => { this.fdread = fd.value / 100; this.chips.querySelector('b').textContent = fd.value; this.sig = ''; };
  }

  // ---- clips column: the library and the waveform editor
  drawClips() {
    const c = this.sel && this.clips.find((x) => x.id === this.sel);
    this.colClips.innerHTML = `<h4>YOUR SOUNDS</h4>`
      + (this.clips.length ? '' : `<div class="drop">Drop audio files here or press "Load sounds..." (wav, ogg, mp3, flac). They stay in this browser.</div>`)
      + this.clips.map((x) => `<div class="clip ${x.id === this.sel ? 'sel' : ''}" data-id="${x.id}"><span class="nm" data-pick>${x.name}</span><small>${fmt(x.end - x.start)} / ${fmt(x.orig.duration)}</small><button data-del title="Remove this sound">x</button></div>`).join('')
      + (c ? this.editorHtml(c) : (this.clips.length ? '<div class="hint">Pick a sound to cut it.</div>' : ''));
    this.colClips.onclick = (e) => {
      const row = e.target.closest('.clip'); if (!row) return;
      if (e.target.closest('[data-del]')) { this.removeClip(row.dataset.id); return; }
      if (e.target.closest('[data-pick]')) { this.sel = row.dataset.id; this.stopPreview(); this.drawClips(); this.drawRules(); }
    };
    if (c) this.bindEditor(c);
  }
  editorHtml(c) {
    return `<div class="ed"><canvas width="900" height="96"></canvas>
      <div class="hint">Drag on the wave to pick the part you want; drag an edge to trim it. The bright part is kept.</div>
      <div class="edrow"><label>Name <input type="text" data-k="name" value="${c.name}" style="width:140px"></label>
        <label>Start <input type="number" data-k="start" step="0.01" min="0" value="${c.start.toFixed(2)}">s</label>
        <label>End <input type="number" data-k="end" step="0.01" min="0" value="${c.end.toFixed(2)}">s</label></div>
      <div class="edrow"><label>Fade in <input type="number" data-k="fi" step="0.05" min="0" value="${c.fi}">s</label><label>Fade out <input type="number" data-k="fo" step="0.05" min="0" value="${c.fo}">s</label>
        <label>Gain <input type="range" data-k="gain" min="0" max="200" value="${Math.round(c.gain * 100)}"><b data-gv>${Math.round(c.gain * 100)}%</b></label></div>
      <div class="edrow"><button data-p="play">Preview</button><button data-p="loop">Preview as loop</button><button data-p="stop">Stop</button><button data-p="whole">Whole file</button>
        <button data-p="wav">Save trimmed .wav</button><small data-pt></small></div></div>`;
  }
  bindEditor(c) {
    const cv = this.colClips.querySelector('canvas'); this.cv = cv; this.drawWave(c);
    const x2t = (ev) => { const r = cv.getBoundingClientRect(); return clamp((ev.clientX - r.left) / r.width, 0, 1) * c.orig.duration; };
    let mode = null, anchor = 0;
    cv.onpointerdown = (ev) => {
      cv.setPointerCapture(ev.pointerId); const t = x2t(ev), px = c.orig.duration / cv.getBoundingClientRect().width * 8;
      if (Math.abs(t - c.start) < px) mode = 'start'; else if (Math.abs(t - c.end) < px) mode = 'end'; else { mode = 'new'; anchor = t; c.start = t; c.end = t; }
    };
    cv.onpointermove = (ev) => {
      if (!mode) return; const t = x2t(ev);
      if (mode === 'start') c.start = Math.min(t, c.end - 0.02); else if (mode === 'end') c.end = Math.max(t, c.start + 0.02); else { c.start = Math.min(anchor, t); c.end = Math.max(anchor, t); }
      this.drawWave(c); this.syncFields(c);
    };
    cv.onpointerup = () => { if (!mode) return; mode = null; if (c.end - c.start < 0.02) { c.start = 0; c.end = c.orig.duration; } this.changed(c); this.syncFields(c); this.drawWave(c); };
    this.colClips.querySelector('.ed').oninput = (e) => {
      const k = e.target.dataset.k; if (!k) return; let v = e.target.value;
      if (k === 'name') c.name = v;
      else { v = parseFloat(v) || 0; if (k === 'gain') { c.gain = v / 100; this.colClips.querySelector('[data-gv]').textContent = `${Math.round(v)}%`; } else c[k] = k === 'start' ? clamp(v, 0, c.end - 0.02) : k === 'end' ? clamp(v, c.start + 0.02, c.orig.duration) : Math.max(0, v); }
      this.changed(c, k !== 'name'); this.drawWave(c);
      if (k === 'name') { const nm = this.colClips.querySelector('.clip.sel .nm'); if (nm) nm.textContent = c.name; this.drawRules(); }
    };
    this.colClips.querySelector('.ed').onclick = (e) => {
      const b = e.target.closest('[data-p]'); if (!b) return; const p = b.dataset.p;
      if (p === 'play' || p === 'loop') this.preview(c, p === 'loop'); else if (p === 'stop') this.stopPreview();
      else if (p === 'whole') { c.start = 0; c.end = c.orig.duration; this.changed(c); this.syncFields(c); this.drawWave(c); }
      else if (p === 'wav') save(`${slug(c.name)}.wav`, wav16(this.bake(c)));
    };
  }
  syncFields(c) {
    for (const k of ['start', 'end']) { const i = this.colClips.querySelector(`[data-k=${k}]`); if (i && document.activeElement !== i) i.value = c[k].toFixed(2); }
    const s = this.colClips.querySelector('.clip.sel small'); if (s) s.textContent = `${fmt(c.end - c.start)} / ${fmt(c.orig.duration)}`;
  }
  peaks(c) {
    if (c.pk) return c.pk; const W = 900, d = c.orig.getChannelData(0), n = d.length, step = n / W, pk = new Float32Array(W * 2);
    for (let x = 0; x < W; x++) { let lo = 0, hi = 0; const a = Math.floor(x * step), b = Math.min(n, Math.floor((x + 1) * step)); for (let i = a; i < b; i += 4) { if (d[i] < lo) lo = d[i]; if (d[i] > hi) hi = d[i]; } pk[x * 2] = lo; pk[x * 2 + 1] = hi; }
    return (c.pk = pk);
  }
  drawWave(c) {
    const cv = this.cv; if (!cv) return; const g = cv.getContext('2d'), W = cv.width, H = cv.height, pk = this.peaks(c), D = c.orig.duration;
    g.fillStyle = '#120d09'; g.fillRect(0, 0, W, H);
    const x0 = (c.start / D) * W, x1 = (c.end / D) * W;
    g.fillStyle = '#3a2d1c'; g.fillRect(x0, 0, x1 - x0, H);
    for (let x = 0; x < W; x++) {
      const inside = x >= x0 && x <= x1; g.fillStyle = inside ? '#ffd84a' : '#6b5630';
      const lo = pk[x * 2] * (H / 2 - 3), hi = pk[x * 2 + 1] * (H / 2 - 3); g.fillRect(x, H / 2 - hi - 1, 1, hi - lo + 2);
    }
    g.fillStyle = '#fff4d8'; g.fillRect(x0 - 1, 0, 3, H); g.fillRect(x1 - 1, 0, 3, H);
    if (this.pv && this.pv.clip === c) { const t = this.pvTime(); if (t != null) { g.fillStyle = '#5ec45a'; g.fillRect((t / D) * W - 1, 0, 3, H); } }
  }

  // ---- placements column
  drawRules() {
    const opts = (cur) => `<option value="">- choose a sound -</option>` + this.clips.map((c) => `<option value="${c.id}" ${c.id === cur ? 'selected' : ''}>${c.name}</option>`).join('');
    this.colRules.innerHTML = `<h4>PLACEMENTS <button data-new>+ New</button></h4>
      <div class="hint">A placement plays its sound when ALL its situations are true (blue = must be on, red = must be off) and the dread is in range. Several can play together.</div>`
      + (this.rules.length ? '' : '<div class="drop">No placements yet. Load a sound, then press "+ New".</div>')
      + this.rules.map((r) => `<div class="rule ${r.on ? '' : 'off'}" data-id="${r.id}">
        <div class="row"><span class="dot"></span><input type="text" data-k="name" value="${r.name}" style="flex:1;min-width:90px"><label><input type="checkbox" data-k="on" ${r.on ? 'checked' : ''}>on</label>
          <button data-game class="${this.isPreviewing(r) ? 'on' : ''}" title="Set the situation to this placement's conditions, so it plays the way it will in the game (the game's own sound stays)">preview in game</button><button data-aud class="${this.audition === r.id ? 'on' : ''}" title="Play this placement now, whatever the situation">hear</button><button data-del class="del">delete</button></div>
        <div class="row"><label>Sound <select data-k="clip">${opts(r.clip)}</select></label>
          <label>Mix <select data-k="bus"><option value="music" ${r.bus === 'music' ? 'selected' : ''}>music</option><option value="amb" ${r.bus === 'amb' ? 'selected' : ''}>ambience</option><option value="sfx" ${r.bus === 'sfx' ? 'selected' : ''}>effects</option></select></label>
          <label><input type="checkbox" data-k="loop" ${r.loop ? 'checked' : ''}>loop</label>
          <label>Volume <input type="range" data-k="vol" min="0" max="200" value="${Math.round(r.vol * 100)}"><b data-v="vol">${Math.round(r.vol * 100)}%</b></label></div>
        <div class="row"><label>Fade in <input type="number" data-k="fi" step="0.5" min="0" value="${r.fi}">s</label><label>Fade out <input type="number" data-k="fo" step="0.5" min="0" value="${r.fo}">s</label>
          <label>Hush game music <input type="range" data-k="duck" min="0" max="100" value="${Math.round(r.duck * 100)}"><b data-v="duck">${Math.round(r.duck * 100)}%</b></label>
          <label>Hush ambience <input type="range" data-k="duckAmb" min="0" max="100" value="${Math.round(r.duckAmb * 100)}"><b data-v="duckAmb">${Math.round(r.duckAmb * 100)}%</b></label></div>
        <div class="row"><label>Dread <input type="number" data-k="dmin" min="0" max="100" step="5" value="${Math.round(r.dmin * 100)}"> to <input type="number" data-k="dmax" min="0" max="100" step="5" value="${Math.round(r.dmax * 100)}"></label>
          <small>one-shots play once when the situation starts</small></div>
        <div class="row">${SITUATIONS.map(([k, n]) => `<span class="chip ${r.req.includes(k) ? 'req' : r.not.includes(k) ? 'not' : ''}" data-flag="${k}">${n}</span>`).join('')}</div>
      </div>`).join('');
    this.colRules.onclick = (e) => {
      if (e.target.closest('[data-new]')) { this.newRule(); return; }
      const row = e.target.closest('.rule'); if (!row) return; const r = this.rules.find((x) => x.id === row.dataset.id); if (!r) return;
      const f = e.target.closest('[data-flag]');
      if (f) { const k = f.dataset.flag; if (r.req.includes(k)) { r.req = r.req.filter((x) => x !== k); r.not.push(k); } else if (r.not.includes(k)) r.not = r.not.filter((x) => x !== k); else r.req.push(k); this.saveLocal(); this.drawRules(); return; }
      if (e.target.closest('[data-del]')) { this.killRule(r.id); this.rules = this.rules.filter((x) => x !== r); this.saveLocal(); this.drawRules(); return; }
      if (e.target.closest('[data-game]')) { if (!this.ensureCtx()) return; if (this.isPreviewing(r)) this.forceOn = false; else { this.audition = null; this.forceOn = true; this.forced = new Set(r.req); this.fdread = (r.dmin + r.dmax) / 2; this.hush(); } this.drawChips(true); this.drawRules(); return; }
      if (e.target.closest('[data-aud]')) { if (!this.ensureCtx()) return; this.audition = this.audition === r.id ? null : r.id; this.drawRules(); }
    };
    this.colRules.oninput = (e) => {
      const row = e.target.closest('.rule'); if (!row) return; const r = this.rules.find((x) => x.id === row.dataset.id); if (!r) return; const k = e.target.dataset.k; if (!k) return;
      const t = e.target;
      if (k === 'name' || k === 'clip' || k === 'bus') r[k] = t.value;
      else if (k === 'on' || k === 'loop') r[k] = t.checked;
      else if (k === 'vol' || k === 'duck' || k === 'duckAmb') { r[k] = t.value / 100; const b = row.querySelector(`[data-v=${k}]`); if (b) b.textContent = `${t.value}%`; }
      else if (k === 'dmin' || k === 'dmax') r[k] = clamp((parseFloat(t.value) || 0) / 100, 0, 1);
      else r[k] = Math.max(0, parseFloat(t.value) || 0);
      if (k === 'clip' || k === 'bus' || k === 'loop') this.killRule(r.id);   // restart with the new setting
      if (k === 'on') row.classList.toggle('off', !r.on);
      this.saveLocal(); this.liveTune(r);
    };
  }
  /** is the forced situation exactly this placement's conditions? */
  isPreviewing(r) { return this.forceOn && this.forced.size === r.req.length && r.req.every((k) => this.forced.has(k)) && Math.abs(this.fdread - (r.dmin + r.dmax) / 2) < 0.01; }
  newRule() {
    this.rules.push({ id: uid(), name: `Placement ${this.rules.length + 1}`, clip: this.sel || '', bus: 'music', loop: true, vol: 0.8, fi: 3, fo: 3, duck: 1, duckAmb: 0, dmin: 0, dmax: 1, req: [], not: [], on: true });
    this.saveLocal(); this.drawRules();
  }

  // ---------------------------------------------------------------- clips
  async addFiles(files) {
    if (!files.length) return; if (!this.ensureCtx()) return;
    for (const f of files) {
      try {
        const bytes = await f.arrayBuffer(), orig = await this.a.ctx.decodeAudioData(bytes.slice(0));
        const c = { id: uid(), name: f.name.replace(/\.[a-z0-9]+$/i, ''), orig, bytes, start: 0, end: orig.duration, fi: 0, fo: 0, gain: 1 };
        this.clips.push(c); this.sel = c.id; idbPut(c.id, { name: f.name, bytes });
      } catch (err) { this.toast(`Could not read ${f.name}`, false, 4000); }
    }
    this.saveLocal(); this.drawClips(); this.drawRules();
  }
  removeClip(id) {
    this.clips = this.clips.filter((c) => c.id !== id); idbDel(id); if (this.sel === id) this.sel = null;
    for (const r of this.rules) if (r.clip === id) { r.clip = ''; this.killRule(r.id); }
    this.stopPreview(); this.saveLocal(); this.drawClips(); this.drawRules();
  }
  changed(c, rebake = true) { if (rebake) { c.baked = null; for (const r of this.rules) if (r.clip === c.id) this.killRule(r.id); } this.saveLocal(); }
  bake(c) {   // the trimmed, faded, gained buffer that is actually played and exported
    if (c.baked) return c.baked;
    const o = c.orig, sr = o.sampleRate, s0 = Math.floor(c.start * sr), n = Math.max(16, Math.floor(c.end * sr) - s0);
    const out = this.a.ctx.createBuffer(o.numberOfChannels, n, sr), fi = Math.max(MIN_FADE, c.fi) * sr, fo = Math.max(MIN_FADE, c.fo) * sr;
    for (let ch = 0; ch < o.numberOfChannels; ch++) {
      const src = o.getChannelData(ch), dst = out.getChannelData(ch);
      for (let i = 0; i < n; i++) dst[i] = (src[s0 + i] || 0) * c.gain * Math.min(1, (i + 1) / fi, (n - i) / fo);
    }
    return (c.baked = out);
  }

  // ---------------------------------------------------------------- preview of one clip (straight to the master)
  preview(c, loop) {
    if (!this.ensureCtx()) return; this.stopPreview();
    const ctx = this.a.ctx, src = ctx.createBufferSource(); src.buffer = this.bake(c); src.loop = loop; src.connect(this.a.master); src.start();
    this.pv = { src, clip: c, t0: ctx.currentTime, loop }; src.onended = () => { if (this.pv && this.pv.src === src) { this.pv = null; this.hush(); this.drawWave(c); } };
    this.hush();
  }
  pvTime() { if (!this.pv) return null; const d = this.pv.src.buffer.duration, t = this.a.ctx.currentTime - this.pv.t0; return this.pv.clip.start + (this.pv.loop ? t % d : Math.min(t, d)); }
  stopPreview() { if (this.pv) { try { this.pv.src.onended = null; this.pv.src.stop(); } catch (e) { /* already stopped */ } this.pv = null; } this.hush(); if (this.cv && this.sel) { const c = this.clips.find((x) => x.id === this.sel); if (c) this.drawWave(c); } }
  hush() {
    const want = !!(this.pv || this.audition) && this.el.querySelector('[data-a=hush]').checked;
    const cur = this.a.preview === '__studio';
    if (want !== cur) { this.a.preview = want ? '__studio' : (cur ? null : this.a.preview); this.a.refreshLoops(); }
  }

  // ---------------------------------------------------------------- placements playing in the game
  bus(r) { return r.bus === 'music' ? this.a.musicBus : r.bus === 'amb' ? this.a.ambBus : this.a.sfxBus; }
  matches(r, sit) {
    if (sit.dread < r.dmin - 1e-6 || sit.dread > r.dmax + 1e-6) return false;
    return r.req.every((k) => sit.flags.has(k)) && !r.not.some((k) => sit.flags.has(k));
  }
  liveTune(r) { const st = this.act.get(r.id); if (st) { const t = this.a.ctx.currentTime; st.gain.gain.setTargetAtTime(r.vol, t, 0.08); } }
  killRule(id) {
    const st = this.act.get(id); if (!st) return; this.act.delete(id);
    try { st.gain.gain.cancelScheduledValues(0); st.gain.gain.setTargetAtTime(0, this.a.ctx.currentTime, 0.05); st.src.stop(this.a.ctx.currentTime + 0.3); } catch (e) { /* gone */ }
  }
  /** called every frame; live = { flags: Set, dread } from the game */
  update(dt, live) {
    this.live = live;
    if (this.el.classList.contains('open')) this.drawChips();
    const ctx = this.a.ctx; if (!ctx) return;
    if (this.pendingClips) this.flush();
    const sit = this.forceOn ? { flags: this.forced, dread: this.fdread } : live;
    let dm = 0, da = 0;
    for (const r of this.rules) {
      const clip = this.clips.find((c) => c.id === r.clip);
      const want = r.on && clip && (this.audition === r.id || this.matches(r, sit));
      let st = this.act.get(r.id);
      if (want && !st) {
        const src = ctx.createBufferSource(), gain = ctx.createGain(), t = ctx.currentTime;
        src.buffer = this.bake(clip); src.loop = r.loop; gain.gain.value = 0; src.connect(gain).connect(this.bus(r)); src.start();
        gain.gain.setTargetAtTime(r.vol, t, Math.max(0.02, r.fi / 3));
        st = { src, gain, done: false }; this.act.set(r.id, st);
        if (!r.loop) src.onended = () => { st.done = true; };
      } else if (!want && st) {
        const t = ctx.currentTime; this.act.delete(r.id);
        st.gain.gain.setTargetAtTime(0, t, Math.max(0.02, r.fo / 3)); try { st.src.stop(t + r.fo + 0.5); } catch (e) { /* ended */ }
      }
      if (st && !st.done) { dm = Math.max(dm, r.duck); da = Math.max(da, r.duckAmb); }
      if (this.el.classList.contains('open')) { const row = this.colRules.querySelector(`.rule[data-id="${r.id}"]`); if (row) row.classList.toggle('playing', !!st && !st.done); }
    }
    // hushing the game's own sound (smoothly, and it works while the game is paused too)
    const k = Math.min(1, dt * 2.5), a = this.a, od = a.studioDuck, oa = a.studioDuckAmb;
    a.studioDuck += (dm - a.studioDuck) * k; a.studioDuckAmb += (da - a.studioDuckAmb) * k;
    if (Math.abs(a.studioDuck - od) > 0.004 || Math.abs(a.studioDuckAmb - oa) > 0.004) a.refreshLoops();
    if (this.pv && this.cv && this.sel) { const c = this.clips.find((x) => x.id === this.sel); if (c && this.pv.clip === c) { this.drawWave(c); const pt = this.colClips.querySelector('[data-pt]'); if (pt) pt.textContent = fmt(this.pvTime() - c.start); } }
  }

  // ---------------------------------------------------------------- saving, exporting, importing
  meta() {
    return {
      version: 1,
      clips: this.clips.map((c) => ({ id: c.id, name: c.name, file: `${slug(c.name)}.wav`, start: +c.start.toFixed(3), end: +c.end.toFixed(3), fi: c.fi, fo: c.fo, gain: c.gain })),
      rules: this.rules.map((r) => ({ ...r, clipFile: (this.clips.find((c) => c.id === r.clip) || {}).name ? `${slug(this.clips.find((c) => c.id === r.clip).name)}.wav` : null })),
    };
  }
  saveLocal() { try { localStorage.setItem(KEY, JSON.stringify({ ...this.meta(), sel: this.sel })); } catch (e) { /* private window */ } }
  async restore() {
    let meta = null; try { meta = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* ignore */ }
    this.pending = (async () => {
      if (meta) {
        const recs = await idbAll().catch(() => []);
        for (const m of meta.clips || []) {
          const rec = recs.find((x) => x.id === m.id); if (!rec) continue;
          this.pendingClips = this.pendingClips || []; this.pendingClips.push({ m, bytes: rec.bytes });
        }
        this.rules = (meta.rules || []).map((r) => ({ dmin: 0, dmax: 1, req: [], not: [], duckAmb: 0, ...r })); this.sel = meta.sel || null;
      } else {
        try {   // a soundtrack that was committed with the game
          const res = await fetch('audio/studio/soundtrack.json'); if (res.ok && (res.headers.get('content-type') || '').includes('json')) {
            const j = await res.json(); this.rules = (j.rules || []).map((r) => ({ dmin: 0, dmax: 1, req: [], not: [], duckAmb: 0, ...r }));
            this.pendingClips = [];
            for (const m of j.clips || []) { const f = await fetch(`audio/studio/${m.file}`); if (f.ok) this.pendingClips.push({ m: { ...m, start: 0, end: null, fi: 0, fo: 0, gain: 1 }, bytes: await f.arrayBuffer() }); }
          }
        } catch (e) { /* no pack, fine */ }
      }
      this.drawRules();
    })();
  }
  /** decoding needs the audio context, which only exists after the first click */
  async flush() {
    if (!this.pendingClips || !this.a.ctx) return;
    const list = this.pendingClips; this.pendingClips = null;
    for (const { m, bytes } of list) {
      try {
        const orig = await this.a.ctx.decodeAudioData(bytes.slice(0));
        this.clips.push({ id: m.id, name: m.name, orig, bytes, start: m.start || 0, end: m.end || orig.duration, fi: m.fi || 0, fo: m.fo || 0, gain: m.gain == null ? 1 : m.gain });
      } catch (e) { /* damaged file */ }
    }
    this.drawClips(); this.drawRules();
  }
  async exportAll() {
    if (!this.clips.length && !this.rules.length) { this.toast('Nothing to export yet.', false, 3000); return; }
    if (!this.ensureCtx()) return;
    save('soundtrack.json', new Blob([JSON.stringify(this.meta(), null, 1)], { type: 'application/json' }));
    for (const c of this.clips) { await new Promise((r) => setTimeout(r, 350)); save(`${slug(c.name)}.wav`, wav16(this.bake(c))); }
    this.toast('Put soundtrack.json and the .wav files into public/audio/studio/ to ship them.', false, 7000);
  }
  importJson(j) {
    for (const m of j.clips || []) { const c = this.clips.find((x) => x.id === m.id || x.name === m.name); if (c) { Object.assign(c, { start: m.start, end: m.end || c.orig.duration, fi: m.fi, fo: m.fo, gain: m.gain }); c.baked = null; } }
    const byName = (n) => (this.clips.find((c) => slug(c.name) + '.wav' === n) || {}).id || '';
    this.rules = (j.rules || []).map((r) => ({ dmin: 0, dmax: 1, req: [], not: [], duckAmb: 0, ...r, clip: this.clips.some((c) => c.id === r.clip) ? r.clip : byName(r.clipFile) }));
    for (const id of [...this.act.keys()]) this.killRule(id);
    this.saveLocal(); this.drawClips(); this.drawRules(); this.toast('Placements imported. Sounds that are not loaded yet show as empty: load them again.', false, 5000);
  }
}
