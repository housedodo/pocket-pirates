// HOIST as a standalone app: one window that plays the single-file demo (game/index.html, copied from pocket-pirates-demo.html by
// pack.js). Saves live in the app's own storage (localStorage under the user's app data). F11 or the game's Fullscreen button for fullscreen.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');   // the music may start without a first click

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 760, minWidth: 800, minHeight: 480,
    backgroundColor: '#0b0820', title: 'HOIST', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'game', 'index.html'));
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });   // links open in the browser
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
