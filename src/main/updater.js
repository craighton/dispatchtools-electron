'use strict';

const { app } = require('electron');
const { UPDATE_REPO } = require('./config');

// Wires up auto-updates via update.electronjs.org (the free Electron update
// service). No-ops unless the build is packaged AND a repo is configured.
// macOS additionally requires the app to be code-signed, or Squirrel.Mac throws.
function initAutoUpdates() {
  if (!app.isPackaged) return;
  if (!UPDATE_REPO) return;

  try {
    const { updateElectronApp, UpdateSourceType } = require('update-electron-app');
    updateElectronApp({
      updateSource: {
        type: UpdateSourceType.ElectronPublicUpdateService,
        repo: UPDATE_REPO,
      },
      updateInterval: '1 hour',
    });
  } catch (err) {
    console.error('[updater] failed to initialize auto-updates:', err);
  }
}

module.exports = { initAutoUpdates };
