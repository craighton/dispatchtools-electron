'use strict';

const path = require('path');
const { BrowserWindow, shell } = require('electron');
const { APP_URL, ALLOWED_HOSTS, IN_APP_DOMAINS } = require('./config');
const { createWindowState } = require('./windowState');

const OFFLINE_PAGE = path.join(__dirname, '..', 'renderer', 'offline.html');
const PRELOAD = path.join(__dirname, '..', 'preload', 'index.js');

// Shared, locked-down webPreferences for every window we open.
const WEB_PREFERENCES = {
  preload: PRELOAD,
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  spellcheck: true,
};

let mainWindow = null;

function hostnameOf(targetUrl) {
  try {
    return new URL(targetUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

// The primary site that loads in the main window.
function hostIsAllowed(targetUrl) {
  const host = hostnameOf(targetUrl);
  return host !== null && ALLOWED_HOSTS.includes(host);
}

// A secondary resource (e.g. faa.gov) we still want to keep inside the app.
// Suffix match so subdomains like notams.aim.faa.gov are included.
function isInAppDomain(targetUrl) {
  const host = hostnameOf(targetUrl);
  if (!host) return false;
  return IN_APP_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function loadApp(window, urlToLoad = APP_URL) {
  window.loadURL(urlToLoad).catch(() => showOffline(window));
}

function showOffline(window) {
  window.loadFile(OFFLINE_PAGE).catch(() => {});
}

// Opens a URL in an independent in-app window. Used for IN_APP_DOMAINS links
// (faa.gov etc.) so they stay inside the app — and as a top-level window so a
// dispatcher can move it to another monitor instead of it stacking on the main view.
function openInAppWindow(targetUrl) {
  const child = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: '#0b1220',
    show: false,
    webPreferences: WEB_PREFERENCES,
  });
  child.once('ready-to-show', () => child.show());
  applyNavigationPolicy(child, { isMain: false });
  child.loadURL(targetUrl).catch(() => {});
  return child;
}

// Centralized link routing, shared by the main window and secondary windows.
// `isMain` distinguishes the primary site window from the secondary ones.
function applyNavigationPolicy(window, { isMain }) {
  const wc = window.webContents;

  // The offline fallback page is only meaningful for the primary site.
  if (isMain) {
    wc.on('did-fail-load', (event, errorCode, _desc, _url, isMainFrame) => {
      if (isMainFrame && errorCode !== -3) showOffline(window);
    });
  }

  // In-place (same-window) navigation.
  wc.on('will-navigate', (event, targetUrl) => {
    if (targetUrl.startsWith('file://')) return; // offline.html
    if (hostIsAllowed(targetUrl)) return; // primary site — allow in place

    if (isInAppDomain(targetUrl)) {
      // In the main window, don't navigate away from the app — pop a side window.
      // In a secondary window, let it navigate in place (browse faa.gov freely).
      if (isMain) {
        event.preventDefault();
        openInAppWindow(targetUrl);
      }
      return;
    }

    event.preventDefault();
    shell.openExternal(targetUrl);
  });

  // window.open / target=_blank.
  wc.setWindowOpenHandler(({ url }) => {
    if (isMain && hostIsAllowed(url)) {
      loadApp(window, url); // same-site popup re-uses the main window
      return { action: 'deny' };
    }
    if (hostIsAllowed(url) || isInAppDomain(url)) {
      openInAppWindow(url); // keep it in the app, in its own window
      return { action: 'deny' };
    }
    shell.openExternal(url); // everything else -> system browser
    return { action: 'deny' };
  });
}

function createMainWindow() {
  const state = createWindowState();

  mainWindow = new BrowserWindow({
    x: state.bounds.x,
    y: state.bounds.y,
    width: state.bounds.width,
    height: state.bounds.height,
    minWidth: 940,
    minHeight: 600,
    backgroundColor: '#0b1220',
    show: false,
    title: 'DispatchTools',
    webPreferences: WEB_PREFERENCES,
  });

  state.track(mainWindow);
  if (state.maximized) mainWindow.maximize();

  mainWindow.once('ready-to-show', () => mainWindow.show());
  applyNavigationPolicy(mainWindow, { isMain: true });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  loadApp(mainWindow);
  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

// Focus (and un-minimize) the existing window — used by single-instance + deep links.
function focusMainWindow() {
  if (!mainWindow) return null;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
  return mainWindow;
}

module.exports = {
  createMainWindow,
  getMainWindow,
  focusMainWindow,
  loadApp,
  showOffline,
  openInAppWindow,
};
