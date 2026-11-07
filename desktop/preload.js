// The small bridge the game sees as window.hoistDesktop (src/main.js checks for it).
const { contextBridge, ipcRenderer } = require('electron');
let fs = ipcRenderer.sendSync('fs-get');
const subs = [];
ipcRenderer.on('fs', (e, on) => { fs = on; subs.forEach((f) => f(on)); });
contextBridge.exposeInMainWorld('hoistDesktop', {
  isFullscreen: () => fs,
  toggleFullscreen: () => ipcRenderer.send('fs-toggle'),
  onFullscreen: (f) => subs.push(f),
  quit: () => ipcRenderer.send('quit'),
});
