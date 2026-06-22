'use strict';

const path = require('path');
const { BrowserWindow, WebContentsView, shell } = require('electron');
const {
  APP_URL,
  ALLOWED_HOSTS,
  IN_APP_DOMAINS,
  COMPACT_VIEW_SEGMENTS,
  COMPACT_TOOLS,
} = require('./config');
const { createWindowState } = require('./windowState');

const OFFLINE_PAGE = path.join(__dirname, '..', 'renderer', 'offline.html');
const CHROME_PAGE = path.join(__dirname, '..', 'renderer', 'toolbar.html');
const PRELOAD = path.join(__dirname, '..', 'preload', 'index.js');
const CHROME_PRELOAD = path.join(__dirname, '..', 'preload', 'chrome.js');

// Window icon for Linux and dev-mode windows. macOS uses the bundle icon and
// Windows uses the exe icon (both from forge's packagerConfig.icon), so this is
// only consulted by Linux/X11 and `npm start`; harmlessly ignored elsewhere.
const WINDOW_ICON = path.join(__dirname, '..', '..', 'assets', 'icon.png');

// Height of the native toolbar chrome — keep in sync with body height in toolbar.html.
const TOOLBAR_HEIGHT = 44;

// Shared, locked-down webPreferences for every window/view that loads the site.
const WEB_PREFERENCES = {
  preload: PRELOAD,
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  spellcheck: true,
};

// The toolbar chrome gets its own minimal bridge (no site preload, no spellcheck).
const CHROME_WEB_PREFERENCES = {
  preload: CHROME_PRELOAD,
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
};

let mainWindow = null; // BrowserWindow: container; its own webContents renders the toolbar.
let siteView = null; // WebContentsView: the live site, inset below the toolbar.

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

// A compact "pop-out" view on the primary site (e.g. /nas/compact/, /wx/compact/).
// Must be an allowed host AND have a configured segment somewhere in the path, so
// it opens in its own window rather than taking over the current one.
function isCompactView(targetUrl) {
  if (!hostIsAllowed(targetUrl)) return false;
  let pathname;
  try {
    pathname = new URL(targetUrl).pathname.toLowerCase();
  } catch {
    return false;
  }
  const segments = pathname.split('/').filter(Boolean);
  return segments.some((segment) => COMPACT_VIEW_SEGMENTS.includes(segment));
}

// Load a URL into the main window's site view, falling back to the offline page.
function loadSite(urlToLoad = APP_URL) {
  if (!siteView) return;
  siteView.webContents.loadURL(urlToLoad).catch(() => showOffline());
}

function showOffline() {
  if (siteView) siteView.webContents.loadFile(OFFLINE_PAGE).catch(() => {});
}

// The webContents the menu/IPC should drive for the primary site.
function getSiteContents() {
  return siteView ? siteView.webContents : null;
}

// Keep the site view sized to the content area beneath the toolbar.
function layoutSiteView() {
  if (!mainWindow || mainWindow.isDestroyed() || !siteView) return;
  const { width, height } = mainWindow.getContentBounds();
  siteView.setBounds({
    x: 0,
    y: TOOLBAR_HEIGHT,
    width,
    height: Math.max(0, height - TOOLBAR_HEIGHT),
  });
}

// Push the site's navigation state to the toolbar so it can enable/disable Back
// and show the current host.
function pushNavState() {
  if (!mainWindow || mainWindow.isDestroyed() || !siteView) return;
  const wc = siteView.webContents;
  mainWindow.webContents.send('dispatchtools:nav-state', {
    canGoBack: wc.navigationHistory.canGoBack(),
    url: wc.getURL(),
  });
}

// Opens a URL in an independent in-app window. Used for IN_APP_DOMAINS links
// (faa.gov etc.) and compact pop-outs so they stay inside the app — and as a
// top-level window so a dispatcher can move it to another monitor instead of it
// stacking on the main view. These are plain windows, without the toolbar chrome.
function openInAppWindow(targetUrl) {
  const child = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: '#0b1220',
    show: false,
    icon: WINDOW_ICON,
    // Hide the File/Edit/View/Window/Help menu bar on Windows/Linux (the toolbar
    // chrome covers navigation). Menu accelerators still work; Alt reveals the
    // bar. No effect on macOS, where the menu lives in the system menu bar.
    autoHideMenuBar: true,
    webPreferences: WEB_PREFERENCES,
  });
  // `ready-to-show` is unreliable for remote content (it can fail to fire while
  // the window is hidden, leaving the pop-out invisible). Reveal on whichever of
  // ready-to-show / did-finish-load / did-fail-load happens first.
  const reveal = () => {
    if (!child.isDestroyed() && !child.isVisible()) child.show();
  };
  child.once('ready-to-show', reveal);
  child.webContents.once('did-finish-load', reveal);
  child.webContents.once('did-fail-load', (_event, errorCode) => {
    if (errorCode !== -3) reveal();
  });

  applyNavigationPolicy(child.webContents, { isMain: false });
  child.loadURL(targetUrl).catch(reveal);
  return child;
}

// Opens one of the configured COMPACT_TOOLS by id in its own pop-out window.
// Returns the window, or null if the id is unknown.
function openCompactTool(id) {
  const tool = COMPACT_TOOLS.find((t) => t.id === id);
  if (!tool) return null;
  return openInAppWindow(new URL(tool.path, APP_URL).toString());
}

// Centralized link routing, shared by the main site view and secondary windows.
// `isMain` distinguishes the primary site from the secondary ones.
function applyNavigationPolicy(wc, { isMain }) {
  // The offline fallback page is only meaningful for the primary site.
  if (isMain) {
    wc.on('did-fail-load', (event, errorCode, _desc, _url, isMainFrame) => {
      if (isMainFrame && errorCode !== -3) showOffline();
    });
  }

  // In-place (same-window) navigation.
  wc.on('will-navigate', (event, targetUrl) => {
    if (targetUrl.startsWith('file://')) return; // offline.html

    // Compact pop-outs always get their own window — never take over the main one.
    if (isMain && isCompactView(targetUrl)) {
      event.preventDefault();
      openInAppWindow(targetUrl);
      return;
    }

    if (hostIsAllowed(targetUrl)) return; // primary site — allow in place

    if (isInAppDomain(targetUrl)) {
      // In the main view, don't navigate away from the app — pop a side window.
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
    if (isCompactView(url)) {
      openInAppWindow(url); // compact pop-out -> its own window, even from main
      return { action: 'deny' };
    }
    if (isMain && hostIsAllowed(url)) {
      loadSite(url); // same-site popup re-uses the main site view
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
    title: 'Dispatch Tools',
    icon: WINDOW_ICON,
    autoHideMenuBar: true, // hide the menu bar on Windows/Linux; no effect on macOS
    webPreferences: CHROME_WEB_PREFERENCES, // the window itself renders the toolbar
  });

  // Keep the title fixed — don't let the toolbar/site page <title> override it.
  mainWindow.webContents.on('page-title-updated', (event) => event.preventDefault());

  state.track(mainWindow);
  if (state.maximized) mainWindow.maximize();

  // The live site lives in a view inset below the toolbar.
  siteView = new WebContentsView({ webPreferences: WEB_PREFERENCES });
  siteView.setBackgroundColor('#0b1220');
  mainWindow.contentView.addChildView(siteView);
  layoutSiteView();

  mainWindow.on('resize', layoutSiteView);
  mainWindow.on('enter-full-screen', layoutSiteView);
  mainWindow.on('leave-full-screen', layoutSiteView);

  applyNavigationPolicy(siteView.webContents, { isMain: true });
  siteView.webContents.on('did-navigate', pushNavState);
  siteView.webContents.on('did-navigate-in-page', pushNavState);

  // Sync the toolbar once it has loaded (initial Back-button / host state).
  mainWindow.webContents.once('did-finish-load', pushNavState);
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('closed', () => {
    mainWindow = null;
    siteView = null;
  });

  mainWindow.loadFile(CHROME_PAGE); // toolbar chrome
  loadSite(); // the live site
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
  getSiteContents,
  focusMainWindow,
  loadSite,
  showOffline,
  openInAppWindow,
  openCompactTool,
};
