import pw from '/opt/node-tools/node_modules/playwright/index.js';
const D = process.env.TRAILER_OUT || '/tmp/claude-0/-home-user-pocket-pirates/37a2ff23-2cf5-5710-8414-270d3e0416b6/scratchpad/trailer';
const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto(`file://${D}/overlays.html`);
await p.waitForSelector('body[data-ready]'); await p.waitForTimeout(600);
for (const id of ['logo', 'end', 'c1', 'c2', 'c3', 'c4', 'c5']) await p.locator('#' + id).screenshot({ path: `${D}/ov-${id}.png`, omitBackground: true });
await b.close();
