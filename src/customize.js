// Cosmetic ship customisation, sold at harbour shipyards. Some figureheads are earned, not bought.
export const HULLS = [
  { id: 'oak', name: 'Oak', cost: 0, upper: '#c4733a', lower: '#8a5028' },
  { id: 'ocean', name: 'Ocean blue', cost: 30, upper: '#3c78c8', lower: '#25497a' },
  { id: 'crimson', name: 'Crimson', cost: 30, upper: '#c0392b', lower: '#7a241b' },
  { id: 'forest', name: 'Forest green', cost: 30, upper: '#3f9a4a', lower: '#276033' },
  { id: 'ivory', name: 'Ivory', cost: 45, upper: '#eee4cc', lower: '#b9ac90' },
  { id: 'midnight', name: 'Midnight', cost: 45, upper: '#4a3a6a', lower: '#2a2040' },
];
export const SAILS = [
  { id: 'canvas', name: 'Canvas', cost: 0, tint: [1, 1, 1] },
  { id: 'sky', name: 'Sky', cost: 20, tint: [0.7, 0.86, 1.1] },
  { id: 'rose', name: 'Rose', cost: 20, tint: [1.1, 0.72, 0.78] },
  { id: 'sun', name: 'Sunlit gold', cost: 25, tint: [1.1, 0.95, 0.55] },
  { id: 'jade', name: 'Jade', cost: 25, tint: [0.7, 1.05, 0.8] },
  { id: 'night', name: 'Night', cost: 35, tint: [0.45, 0.45, 0.62] },
];
export const FLAGS = [
  { id: 'red', name: 'Red', cost: 0, color: '#d63a30' },
  { id: 'blue', name: 'Blue', cost: 10, color: '#3c70d0' },
  { id: 'gold', name: 'Gold', cost: 10, color: '#e8b838' },
  { id: 'green', name: 'Green', cost: 10, color: '#3fa650' },
  { id: 'white', name: 'White', cost: 10, color: '#f4f0e6' },
  { id: 'violet', name: 'Violet', cost: 10, color: '#9a58d0' },
];
export const FIGURES = [
  { id: 'none', name: 'None', cost: 0 },
  { id: 'parrot', name: 'Parrot', cost: 40 },
  { id: 'dolphin', name: 'Dolphin', cost: 60, req: 'Catch 5 fish', ok: (s) => s.stats.fish >= 5 },
  { id: 'mermaid', name: 'Mermaid', cost: 80, req: 'Salvage a wreck', ok: (s) => s.stats.wrecks >= 1 },
  { id: 'lion', name: 'Golden lion', cost: 90, req: 'Be well known at a harbour (3 stars)', ok: (s) => Object.values(s.rep).some((r) => Math.min(3, Math.floor((r.visits + 2 * r.deliveries) / 3)) >= 3) },
  { id: 'skull', name: 'Skull', cost: 70, req: 'Sink a raider', ok: (s) => s.stats.sunk >= 1 },
];
export const GROUPS = [['hull', 'Hull paint', HULLS], ['sail', 'Sails', SAILS], ['flag', 'Pennant', FLAGS], ['figure', 'Figurehead', FIGURES]];
export const DEFAULT_CUSTOM = { hull: 'oak', sail: 'canvas', flag: 'red', figure: 'none' };
export const byId = (list, id) => list.find((o) => o.id === id) || list[0];
