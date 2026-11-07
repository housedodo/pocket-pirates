// Copies the single-file demo (built by `python3 scripts/single.py`) and the licences into the app.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), src = path.join(root, 'pocket-pirates-demo.html');
if (!fs.existsSync(src)) { console.error('pocket-pirates-demo.html is missing: run `npx vite build && python3 scripts/single.py` first'); process.exit(1); }
fs.mkdirSync(path.join(__dirname, 'game'), { recursive: true });
fs.copyFileSync(src, path.join(__dirname, 'game', 'index.html'));
fs.cpSync(path.join(root, 'LICENSES'), path.join(__dirname, 'LICENSES'), { recursive: true });
console.log('game/index.html ready');
