// Ship upgrades bought at harbour shipwrights. 3 levels each.
export const UPGRADES = [
  { id: 'sails', name: 'Sails', cost: [120, 300, 650], text: ['Fine canvas: +12% top speed, bites better upwind', 'Double-stitched sails: +24% speed', 'Storm-silk sails: +36% speed, handles headwinds'] },
  { id: 'rudder', name: 'Rudder', cost: [100, 250, 500], text: ['Oiled tiller: turns 22% faster', 'Broad rudder: turns 44% faster', 'Whale-bone rudder: turns 66% faster'] },
  { id: 'lantern', name: 'Lantern', cost: [80, 200, 450], text: ['Brass lantern: a small pool of light at night', 'Lens lantern: wider glow', 'Beacon lantern: lights the way, and keeps the dark back'] },
  { id: 'spyglass', name: 'Spyglass', cost: [100, 250, 500], text: ['Brass spyglass: see further, zoom out wider', 'Long glass: even further', 'Captain\'s glass: sees almost to the horizon'] },
  { id: 'crew', name: 'Crew', cost: [150, 350, 700], text: ['Seasoned diggers: dig 20% faster, +20% loot value', 'Treasure hounds: 40% faster, +40% value', 'Veteran crew: 60% faster, +60% value'] },
];
export const MAX_LEVEL = 3;

export function computeMods(lv) {
  return {
    speed: 1 + 0.12 * (lv.sails || 0),
    floor: 0.2 + 0.07 * (lv.sails || 0),
    turn: 1 + 0.22 * (lv.rudder || 0),
    lantern: lv.lantern || 0,
    zoomMax: 70 + 16 * (lv.spyglass || 0),
    fogBonus: 40 * (lv.spyglass || 0),
    digTime: 1 - 0.2 * (lv.crew || 0),
    lootMul: 1 + 0.2 * (lv.crew || 0),
    sailScale: 1 + 0.07 * (lv.sails || 0),
  };
}

const SHIPWRIGHT = [
  ['"Best timber this side of the reef, captain."', '"Fair prices, fair winds."'],
  ['"Odd. The planks came in already cut. I never ordered them."'],
  ['"The hull creaks in a rhythm now. Like breathing. Don\'t mind it."'],
  ['"Take what you need. I\'ll stay and mind the lamps. Someone has to."'],
  ['"Upgrade it all. It will not matter, but it will be a comfort."'],
];
export const shipwrightLine = (rng, idx) => SHIPWRIGHT[Math.min(4, idx)][Math.floor(rng() * SHIPWRIGHT[Math.min(4, idx)].length)];
