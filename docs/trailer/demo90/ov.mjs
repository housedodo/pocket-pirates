import pw from '/opt/node-tools/node_modules/playwright/index.js';
const D = '/tmp/claude-0/-home-user/873242d7-1967-55ab-8931-dd9da76ea10f/scratchpad/teaser';
const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto(`file://${D}/overlays.html`);
await p.waitForSelector('body[data-ready]'); await p.waitForTimeout(600);
for (const id of ['end', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'dark']) await p.locator('#' + id).screenshot({ path: `${D}/ov-${id}.png`, omitBackground: true });
await b.close();
