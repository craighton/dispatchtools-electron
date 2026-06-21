'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Bridge for the native toolbar chrome (src/renderer/toolbar.html). Separate from
// the site preload — the toolbar drives the live site view via the main process.
contextBridge.exposeInMainWorld('dispatchtoolsChrome', {
  // Toolbar button actions, all routed to the site view in the main process.
  back: () => ipcRenderer.send('dispatchtools:chrome-back'),
  home: () => ipcRenderer.send('dispatchtools:chrome-home'),
  openInBrowser: () => ipcRenderer.send('dispatchtools:chrome-open-external'),

  // Subscribe to site navigation state ({ canGoBack, url }). Returns an
  // unsubscribe function.
  onNavState: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('dispatchtools:nav-state', handler);
    return () => ipcRenderer.removeListener('dispatchtools:nav-state', handler);
  },
});
