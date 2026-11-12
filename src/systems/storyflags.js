// Marks (what the world says of you) and keepsakes, stored in state.story. Not in the demo build.
import { state } from '../core/state.js';

export function addMark(key) { if (window.__BUILD === 'demo') return; state.story.marks = { ...(state.story.marks || {}), [key]: 1 }; }   // shown only on the Standing page, in the world's words
export function clearMark(key) { if (state.story.marks) { const m = { ...state.story.marks }; delete m[key]; state.story.marks = m; } }
export function keep(id, name, text) { if (window.__BUILD === 'demo') return; const k = state.story.keeps = state.story.keeps || []; if (!k.some((o) => o.id === id)) k.push({ id, name, text }); }
export function markFromRoll(n) { if (n === 1) addMark('counted'); else if (n === 20) addMark('called'); }   // a natural 1 gets you counted, a natural 20 gets you called   // optional dark threads (Story Bible, "Multiple paths"); the Colour is the first prototype
