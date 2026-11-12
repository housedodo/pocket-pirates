// node pack.js win32|darwin|linux [demo|dev]: copies the single-file game into game/index.html and packs the app into electron/out/.
// Build the single-file games first (npx vite build && python3 scripts/single.py in the repo root).
const fs = require('fs'), path = require('path');
const { packager } = require('@electron/packager');
const platform = process.argv[2] || 'win32', which = process.argv[3] || 'demo';
(async () => {
  const src = path.join(__dirname, '..', `pocket-pirates-${which}.html`);
  if (!fs.existsSync(src)) throw new Error(`missing ${src}: build the single-file games first`);
  fs.mkdirSync(path.join(__dirname, 'game'), { recursive: true });
  fs.copyFileSync(src, path.join(__dirname, 'game', 'index.html'));
  const out = await packager({
    dir: __dirname, out: path.join(__dirname, 'out'), overwrite: true, platform, arch: platform === 'darwin' ? 'universal' : 'x64',
    name: 'HOIST', executableName: 'HOIST', appCopyright: 'HOIST', asar: true, prune: true,
    ignore: [/^\/out($|\/)/, /^\/pack\.js$/, /^\/README\.md$/],
  });
  console.log('packed:', out.join(', '));
})().catch((e) => { console.error(e); process.exit(1); });
