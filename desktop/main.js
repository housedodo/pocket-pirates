// HOIST desktop wrapper: one window, the single-file demo inside it.
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

// a fixed name keeps the save folder (localStorage lives in userData) the same across updates
app.setName('HOIST Demo');
Menu.setApplicationMenu(null);
if (!app.requestSingleInstanceLock()) app.quit();

let win;
function create() {
  win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 800, minHeight: 450,
    fullscreen: !process.argv.includes('--windowed'),
    backgroundColor: '#0b0820', title: 'HOIST Demo', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  win.loadFile(path.join(__dirname, 'game', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.on('enter-full-screen', () => win.webContents.send('fs', true));
  win.on('leave-full-screen', () => win.webContents.send('fs', false));
  // links (a feedback form, the store page) open in the player's browser, never inside the game window
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) require('electron').shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) e.preventDefault(); });
  // F11 / Alt+Enter toggle fullscreen; dev tools only when started with --dev
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F11' || (i.alt && i.key === 'Enter')) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (i.key === 'F12' && process.argv.includes('--dev')) win.webContents.toggleDevTools();
  });
}
ipcMain.on('fs-get', (e) => { e.returnValue = !!(win && win.isFullScreen()); });
ipcMain.on('fs-toggle', () => win && win.setFullScreen(!win.isFullScreen()));
ipcMain.on('quit', () => app.quit());

app.whenReady().then(create);
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
