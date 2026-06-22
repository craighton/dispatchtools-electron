'use strict';

// Quit immediately if launched by the Squirrel.Windows installer (handles
// shortcut creation/removal during install/update/uninstall).
if (require('electron-squirrel-startup')) {
  process.exit(0);
}

const path = require('path');
const { app, ipcMain, Notification, shell } = require('electron');
const { PROTOCOL, COMPACT_TOOLS } = require('./config');
const {
  createMainWindow,
  getMainWindow,
  getSiteContents,
  focusMainWindow,
  loadSite,
  openCompactTool,
} = require('./window');
const { buildMenu } = require('./menu');
const { initAutoUpdates } = require('./updater');
const { deepLinkToAppUrl, findDeepLink } = require('./deepLinks');

// --- Single instance --------------------------------------------------------
// A second launch (including via a deep link) should focus the running window,
// not spawn another process.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  registerProtocolClient();

  app.on('second-instance', (_event, argv) => {
    focusMainWindow();
    handleDeepLink(findDeepLink(argv));
  });

  // macOS delivers deep links here rather than through argv.
  app.on('open-url', (event, url) => {
    event.preventDefault();
    focusMainWindow();
    handleDeepLink(url);
  });

  app.whenReady().then(() => {
    // Register IPC before the window loads so the toolbar's synchronous
    // getCompactTools() request always has a handler waiting.
    registerIpc();
    createMainWindow();
    buildMenu();
    initAutoUpdates();

    // A deep link present in the initial argv (cold start on Windows/Linux).
    handleDeepLink(findDeepLink(process.argv));

    app.on('activate', () => {
      if (getMainWindow() === null) createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

// --- Helpers ----------------------------------------------------------------

function registerProtocolClient() {
  // In dev, argv is [electron, ., ...] — register explicitly so deep links work
  // when running unpackaged on Windows.
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }
}

function handleDeepLink(deepLink) {
  if (!deepLink) return;
  const target = deepLinkToAppUrl(deepLink);
  focusMainWindow();
  if (target) loadSite(target);
}

function registerIpc() {
  // Renderer-triggered native notifications (exposed via the preload bridge).
  ipcMain.handle('dispatchtools:notify', (_event, { title, body } = {}) => {
    if (!Notification.isSupported()) return false;
    new Notification({ title: title || 'Dispatch Tools', body: body || '' }).show();
    return true;
  });

  // Offline page "Retry" button asks the main window to reload the live site.
  ipcMain.on('dispatchtools:reload-app', () => loadSite());

  // Toolbar chrome actions (src/renderer/toolbar.html via the chrome preload).
  ipcMain.on('dispatchtools:chrome-back', () => {
    const wc = getSiteContents();
    if (wc?.navigationHistory.canGoBack()) wc.navigationHistory.goBack();
  });
  ipcMain.on('dispatchtools:chrome-home', () => loadSite());
  ipcMain.on('dispatchtools:chrome-open-external', () => {
    const url = getSiteContents()?.getURL();
    if (url && /^https?:/i.test(url)) shell.openExternal(url);
  });

  // Compact tool buttons: hand the toolbar its button list (minus the internal
  // path) and pop the requested tool into its own window.
  ipcMain.on('dispatchtools:get-compact-tools', (event) => {
    event.returnValue = COMPACT_TOOLS.map(({ id, label, title }) => ({ id, label, title }));
  });
  ipcMain.on('dispatchtools:chrome-open-compact', (_event, id) => {
    if (typeof id === 'string') openCompactTool(id);
  });
}
