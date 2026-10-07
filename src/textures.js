import * as THREE from 'three';
import { mulberry32 } from './util.js';

// Everything is drawn in code: a 4x4 atlas of 64px tiles, hand-"pixelled" with
// chunky 2px blocks, plus a tiling grit texture for terrain. No image files.
const T = 64;
export const TILE = {
  planks: 0, wall: 1, roof: 2, stone: 3, leaf: 4, bark: 5, glow: 6, white: 7,
  sail: 8, skull: 9, bone: 10, void: 11, flag: 12, rope: 13, spore: 14, sand: 15,
};
const ATLAS = 4;
const INSET = 0.6 / (T * ATLAS);

export function tileUV(tile) {
  const col = tile % ATLAS, row = Math.floor(tile / ATLAS);
  const size = 1 / ATLAS;
  return { u0: col * size + INSET, v0: 1 - (row + 1) * size + INSET, du: size - INSET * 2 };
}

function rgb(r, g, b) { return `rgb(${r | 0},${g | 0},${b | 0})`; }

export function makeAtlas() {
  const c = document.createElement('canvas');
  c.width = c.height = T * ATLAS;
  const g = c.getContext('2d');
  const rng = mulberry32(777);
  const R = (a, b) => a + (b - a) * rng();

  const tilePos = (t) => [(t % ATLAS) * T, Math.floor(t / ATLAS) * T];
  const rect = (t, x, y, w, h, col) => { const [ox, oy] = tilePos(t); g.fillStyle = col; g.fillRect(ox + x, oy + y, w, h); };
  const fill = (t, r, gg, b, v = 14, block = 2) => {
    for (let y = 0; y < T; y += block) for (let x = 0; x < T; x += block) {
      const k = R(-v, v);
      rect(t, x, y, block, block, rgb(r + k, gg + k, b + k));
    }
  };

  // planks - horizontal boards with grain
  fill(TILE.planks, 168, 120, 72, 10);
  for (let y = 0; y < T; y += 8) {
    rect(TILE.planks, 0, y, T, 1, 'rgb(70,42,24)');
    for (let i = 0; i < 6; i++) rect(TILE.planks, R(0, T - 10) | 0, y + 2 + ((R(0, 4)) | 0), 6 + ((R(0, 8)) | 0), 1, 'rgb(140,96,56)');
    rect(TILE.planks, ((y * 7) % T), y, 1, 8, 'rgb(70,42,24)');
  }

  // wall - warm plaster, timber frame, two glowing windows
  fill(TILE.wall, 236, 222, 190, 8);
  rect(TILE.wall, 0, 0, T, 3, 'rgb(120,78,48)');
  rect(TILE.wall, 0, T - 3, T, 3, 'rgb(120,78,48)');
  rect(TILE.wall, 0, 0, 3, T, 'rgb(120,78,48)');
  rect(TILE.wall, T - 3, 0, 3, T, 'rgb(120,78,48)');
  for (const wx of [9, 39]) {
    rect(TILE.wall, wx - 2, 17, 20, 24, 'rgb(90,56,34)');
    rect(TILE.wall, wx, 19, 16, 20, 'rgb(255,200,48)');
    rect(TILE.wall, wx + 7, 19, 2, 20, 'rgb(90,56,34)');
    rect(TILE.wall, wx, 28, 16, 2, 'rgb(90,56,34)');
  }

  // roof - near-white scallops (tinted by vertex colour)
  fill(TILE.roof, 235, 235, 235, 6);
  for (let y = 0; y < T; y += 8) for (let x = ((y / 8) % 2) * 6; x < T; x += 12) {
    rect(TILE.roof, x, y + 6, 12, 2, 'rgb(150,150,150)');
    rect(TILE.roof, x + 11, y, 2, 8, 'rgb(170,170,170)');
  }

  // stone bricks
  fill(TILE.stone, 150, 148, 142, 14);
  for (let y = 0; y < T; y += 10) {
    rect(TILE.stone, 0, y, T, 2, 'rgb(86,84,82)');
    for (let x = ((y / 10) % 2) * 8; x < T; x += 16) rect(TILE.stone, x, y, 2, 10, 'rgb(86,84,82)');
  }

  // leaf - feather frond with alpha cut-out (alphaTest on the props material)
  g.clearRect(...tilePos(TILE.leaf), T, T);
  for (let y = 0; y < T; y += 2) {
    const k = y / T;
    const half = Math.sin(Math.min(1, k * 1.05) * Math.PI) * 0.46 * T * (0.4 + 0.6 * (1 - k * 0.3));
    for (let x = 32 - half; x < 32 + half; x += 2) {
      const vein = Math.abs(x - 32) < 2 || ((Math.round(x) + y) % 10 < 2);
      const sh = R(-10, 10);
      rect(TILE.leaf, x | 0, T - 2 - y, 2, 2, vein ? rgb(40 + sh, 120 + sh, 40) : rgb(70 + sh, 170 + sh, 60));
    }
  }

  // bark
  fill(TILE.bark, 120, 86, 56, 10);
  for (let x = 0; x < T; x += 6) rect(TILE.bark, x, 0, 2, T, 'rgb(74,50,32)');
  for (let y = 0; y < T; y += 12) rect(TILE.bark, 0, y, T, 2, 'rgb(150,110,70)');

  // glow (windows / lanterns / gold) and plain white
  fill(TILE.glow, 255, 200, 48, 6);
  fill(TILE.white, 248, 248, 248, 6, 4);

  // sail - off-white cloth, horizontal seams, a patch
  fill(TILE.sail, 242, 232, 208, 8);
  for (let y = 10; y < T; y += 14) rect(TILE.sail, 0, y, T, 1, 'rgb(190,176,148)');
  rect(TILE.sail, 36, 34, 14, 12, 'rgb(214,196,160)');
  rect(TILE.sail, 36, 34, 14, 1, 'rgb(170,150,120)');
  rect(TILE.sail, 36, 45, 14, 1, 'rgb(170,150,120)');

  // skull flag
  fill(TILE.skull, 20, 20, 28, 4, 4);
  rect(TILE.skull, 20, 14, 24, 22, 'rgb(236,232,220)');
  rect(TILE.skull, 24, 34, 16, 8, 'rgb(236,232,220)');
  rect(TILE.skull, 24, 22, 6, 6, 'rgb(20,20,28)');
  rect(TILE.skull, 34, 22, 6, 6, 'rgb(20,20,28)');
  rect(TILE.skull, 30, 32, 4, 3, 'rgb(20,20,28)');
  for (let i = 0; i < 4; i++) rect(TILE.skull, 26 + i * 4, 38, 2, 4, 'rgb(20,20,28)');
  rect(TILE.skull, 10, 46, 44, 4, 'rgb(236,232,220)');

  // bone
  fill(TILE.bone, 224, 218, 200, 12);
  for (let i = 0; i < 8; i++) rect(TILE.bone, R(0, 60) | 0, R(0, 60) | 0, 3, 3, 'rgb(150,140,120)');

  // void - violet slab with a magenta eye (the eye glows)
  fill(TILE.void, 34, 24, 52, 8, 4);
  for (let y = 0; y < T; y += 16) rect(TILE.void, 0, y, T, 1, 'rgb(70,50,100)');
  rect(TILE.void, 14, 24, 36, 16, 'rgb(14,8,24)');
  rect(TILE.void, 18, 26, 28, 12, 'rgb(255,236,255)');
  rect(TILE.void, 26, 24, 12, 16, 'rgb(255,48,200)');
  rect(TILE.void, 30, 28, 4, 8, 'rgb(20,0,20)');

  // flag cloth
  fill(TILE.flag, 214, 52, 48, 10);
  for (let x = 0; x < T; x += 16) rect(TILE.flag, x, 0, 2, T, 'rgb(160,30,30)');

  // rope
  fill(TILE.rope, 190, 160, 100, 10);
  for (let x = 0; x < T; x += 8) rect(TILE.rope, x, 0, 2, T, 'rgb(120,92,52)');

  // spore (glowing magenta)
  fill(TILE.spore, 255, 64, 200, 12);

  // sand
  fill(TILE.sand, 236, 214, 150, 12);

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

export function makeGrit() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const rng = mulberry32(4242);
  for (let y = 0; y < 64; y += 2) for (let x = 0; x < 64; x += 2) {
    const v = 206 + rng() * 49;
    g.fillStyle = rgb(v, v, v);
    g.fillRect(x, y, 2, 2);
  }
  for (let i = 0; i < 70; i++) {
    g.fillStyle = 'rgb(168,168,168)';
    g.fillRect((rng() * 62) | 0, (rng() * 62) | 0, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}
