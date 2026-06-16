'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// The single, minimal surface exposed to the loaded site + offline page.
// Everything is funneled through validated IPC channels — no Node access leaks
// into the renderer (contextIsolation + sandbox are on).
contextBridge.exposeInMainWorld('dispatchtools', {
  // Fire a native OS notification. Returns a promise<boolean>.
  notify: (title, body) => ipcRenderer.invoke('dispatchtools:notify', { title, body }),

  // Ask the shell to reload the live site (used by the offline page).
  reloadApp: () => ipcRenderer.send('dispatchtools:reload-app'),

  // Lets pages react to connectivity changes without their own listeners.
  onConnectivityChange: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const online = () => callback(true);
    const offline = () => callback(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  },

  isDesktopApp: true,
  platform: process.platform,
});
