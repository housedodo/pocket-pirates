// Pixel-art pieces for the HTML interface, so the HUD and menus share the chunky, dithered look of
// the 3D world: tiny textures and icons drawn on canvases, shown pixelated through CSS variables.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** an 8x8 dithered tile between two colours, with a few dirt pixels */
function tile(a, b, dirt, seed) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 8;
  const c = cv.getContext('2d');
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    c.fillStyle = BAYER[(y % 4) * 4 + (x % 4)] < 6 ? b : a;
    if (rnd() < 0.06) c.fillStyle = dirt;
    c.fillRect(x, y, 1, 1);
  }
  return cv.toDataURL();
}

const ICON_COLS = { b: '#3c78c8', g: '#4a9a40', B: '#8a5a30', k: '#8a8e98', K: '#2c2a30', p: '#ff30c8', '#': '#2a1608', y: '#f0c030', Y: '#fff0a0', o: '#b07810', W: '#e8f0ff', w: '#98a8d8', R: '#e04838', r: '#a82a20', S: '#f4ecd0', s: '#c8b890', G: '#5ec45a' };
const ICONS = {
  coin: ['..###..', '.#yYy#.', '#yYyyy#', '#yyyyo#', '#yyyoo#', '.#ooo#.', '..###..'],
  sun: ['y..y..y', '.yyyyy.', '.yYYYy.', 'yyYYYyy', '.yYYYy.', '.yyyyy.', 'y..y..y'],
  moon: ['..WWW..', '.WWw...', 'WWw....', 'WWw....', 'WWw....', '.WWw...', '..WWW..'],
  flag: ['#RRRR..', '#RRRRR.', '#rRRR..', '#......', '#......', '#......', '#......'],
  hull: ['.##.##.', '#RR#RR#', '#RRRRR#', '#RRRRr#', '.#RRr#.', '..#r#..', '...#...'],
  sail: ['...#...', '...#S..', '...#SS.', '...#SSs', '...#Ss.', '#######', '.#####.'],
};
// Small 7x7 pixel icons used in text (quests, the log, menus) instead of emoji and symbol glyphs.
// Use pxi('name') to get the markup.
const GLYPHS = {
  fish: ['.......', 'b..bbb.', 'bbbbbbb', '.bbbbWb', 'bbbbbbb', 'b..bbb.', '.......'],
  banana: ['......#', '.....y#', '....yy.', '...yy..', '..yy...', 'yyy....', '.......'],
  coconut: ['..BBB..', '.BBBBB.', 'BBoBBBB', 'BBBBBBB', 'BBBBBBB', '.BBBBB.', '..BBB..'],
  mango: ['....g..', '...gg..', '.ooRo..', 'oooRRo.', 'ooooRR.', '.ooooo.', '..ooo..'],
  pineapple: ['..g.g..', '...g...', '..yyy..', '.yoyoy.', '.yyyyy.', '.yoyoy.', '..yyy..'],
  papaya: ['..gg...', '.gooG..', 'gooooG.', 'goooooG', '.goooG.', '..ggg..', '.......'],
  crate: ['#######', '#BBBBB#', '#B#B#B#', '#######', '#BBBBB#', '#BBBBB#', '#######'],
  skull: ['.SSSSS.', 'SSSSSSS', 'S##S##S', 'SSSSSSS', '.SS#SS.', '.S.S.S.', '.......'],
  dolphin: ['...k...', '..kk...', '.kkkkk.', 'kkkkkkk', '.....kk', '......k', '.......'],
  letter: ['.......', '#######', '##SSS##', '#S#S#S#', '#SS#SS#', '#######', '.......'],
  talk: ['.SSSSS.', 'SSSSSSS', 'S#S#S#S', 'SSSSSSS', '.SSSSS.', '.SS....', '.S.....'],
  ball: ['..KKK..', '.KkKKK.', 'KkKKKKK', 'KKKKKKK', 'KKKKKKK', '.KKKKK.', '..KKK..'],
  paint: ['.SSSSS.', 'SRSbSgS', 'SSSSSSS', 'SySSS..', 'SSSSS..', '.SSSS..', '.......'],
  check: ['......g', '.....gg', 'g...gg.', 'gg.gg..', '.ggg...', '..g....', '.......'],
  open: ['.......', '..BBB..', '.B...B.', '.B...B.', '.B...B.', '..BBB..', '.......'],
  next: ['.R.....', '.RR....', '.RRR...', '.RRRR..', '.RRR...', '.RR....', '.R.....'],
  star: ['...y...', '..yyy..', 'yyyyyyy', '.yyyyy.', '.yy.yy.', '.y...y.', '.......'],
  nostar: ['...k...', '..k.k..', 'kk...kk', '.k...k.', '.k.k.k.', '.kk.kk.', '.......'],
  pip: ['.......', '.yyyyy.', '.yYYyy.', '.yYyyy.', '.yyyyo.', '.yyooo.', '.......'],
  nopip: ['.......', '.kkkkk.', '.k...k.', '.k...k.', '.k...k.', '.kkkkk.', '.......'],
  target: ['..###..', '.#...#.', '#..#..#', '#.###.#', '#..#..#', '.#...#.', '..###..'],
  left: ['....#..', '...##..', '..###..', '.####..', '..###..', '...##..', '....#..'],
  right: ['..#....', '..##...', '..###..', '..####.', '..###..', '..##...', '..#....'],
  up: ['.......', '...#...', '..###..', '.#####.', '#######', '.......', '.......'],
  down: ['.......', '.......', '#######', '.#####.', '..###..', '...#...', '.......'],
  rod: ['......#', '.....#.', '....#.S', '...#..S', '..#...S', '.#....R', '#......'],
};
export const pxi = (name) => `<i class="pxi ${name}"></i>`;

const SPRITES = { // Mara's portrait, 8x8, shown at 4x (the world's pixel size)
  anchor: ['...SS...', '..S..S..', '...SS...', '.SSSSSS.', '...SS...', 'S..SS..S', 'SS.SS.SS', '.SSSSSS.'],
  eye: ['........', '..####..', '.#WWWW#.', '#WWppWW#', '#WWppWW#', '.#WWWW#.', '..####..', '........'],
};
function icon(rows) {
  const cv = document.createElement('canvas'); cv.width = rows[0].length; cv.height = rows.length;
  const c = cv.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ICON_COLS[ch]) { c.fillStyle = ICON_COLS[ch]; c.fillRect(x, y, 1, 1); } }));
  return cv.toDataURL();
}

export function installPixelUI() {
  const root = document.documentElement.style;
  root.setProperty('--pxpanel', `url(${tile('rgba(20,18,44,0.86)', 'rgba(30,28,62,0.86)', 'rgba(8,6,18,0.9)', 7)})`);
  root.setProperty('--pxmenu', `url(${tile('#1b1538', '#241c4c', '#0e0a20', 11)})`);
  root.setProperty('--pxbtn', `url(${tile('#2c2160', '#352870', '#1a1240', 13)})`);
  const css = Object.entries(ICONS).map(([k, rows]) => `.ico.${k} { background-image: url(${icon(rows)}); }`).join('\n')
    + Object.entries(GLYPHS).map(([k, rows]) => `.pxi.${k} { background-image: url(${icon(rows)}); }`).join('\n');
  for (const [k, rows] of Object.entries(SPRITES)) root.setProperty(`--px-${k}`, `url(${icon(rows)})`);
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
}
