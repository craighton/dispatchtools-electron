# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **hybrid Electron desktop shell** around the live site at `https://dispatchtools.com`. It is not a standalone app: the renderer is the remote website, loaded into a `BrowserWindow`. The native layer adds desktop affordances — menus/shortcuts, persisted window bounds, an offline fallback page, OS notifications, `dispatchtools://` deep links, single-instance enforcement, and optional auto-update. Built with **Electron Forge** (Electron 42, Forge 7).

## Commands

```bash
npm start              # Run the app in dev (electron-forge start). Honors env overrides below.
npm run package        # Produce an unpackaged app bundle in out/ (no installers)
npm run make           # Build distributables for the CURRENT platform into out/make/
npm run publish        # Publish a release (requires a publisher + GitHub repo; see below)
```

There is no test runner, linter, or build/transform step configured — source runs as-is (CommonJS, no bundler for main/preload). Syntax-check a file with `node --check <file>`.

### Dev env overrides (read in `src/main/config.js`)

```bash
DISPATCHTOOLS_URL=http://localhost:8080 npm start     # point the shell at a local site build
DISPATCHTOOLS_UPDATE_REPO=owner/repo npm start        # enable auto-update wiring (packaged builds only)
```

### Cross-platform packaging caveat

`npm run make` only builds for the host OS. The DMG/ZIP makers are macOS-only; Squirrel (Windows) and deb/rpm (Linux) build natively on their own OS. Producing all three targets requires CI runners per platform (or wine/mono for Windows-from-mac) — there is no single local command that emits macOS + Windows + Linux at once.

## Architecture

Everything native lives in `src/main/` (main process) and `src/preload/`. The entry point is `src/main/index.js` (the `main` field in package.json). Module responsibilities:

- **`index.js`** — app lifecycle and the wiring hub. Owns the single-instance lock, registers the `dispatchtools://` protocol client, routes deep links (`open-url` on macOS, argv on Windows/Linux via `second-instance` and cold-start argv), and registers IPC handlers. Quits immediately under `electron-squirrel-startup` (Windows installer shortcut management).
- **`window.js`** — the single source of truth for windows. Holds the module-level `mainWindow` reference (other modules reach it via `getMainWindow()` / `focusMainWindow()`). Implements the **security model** (`contextIsolation` + `sandbox` on, `nodeIntegration` off) and **three-tier link routing** in `applyNavigationPolicy()`, shared by the main window and secondary windows: (1) `ALLOWED_HOSTS` → stays in the main window; (2) `IN_APP_DOMAINS` (suffix match, e.g. `faa.gov`) → opens in an independent secondary in-app window via `openInAppWindow()`; (3) everything else → `shell.openExternal`. On `did-fail-load` of the main frame it swaps to the offline page (main window only).
- **`windowState.js`** — hand-rolled bounds persistence to `userData/window-state.json` (no external dep), clamped to a currently-visible display on restore.
- **`deepLinks.js`** — pure URL translation: `dispatchtools://flights/123` → `https://dispatchtools.com/flights/123`. No Electron imports; the side effects (focus + load) live in `index.js`.
- **`menu.js`** — native application menu (Home/Reload/Back/Forward drive `getMainWindow()`).
- **`updater.js`** — `update-electron-app` via update.electronjs.org. No-ops unless `app.isPackaged` AND `config.UPDATE_REPO` is set; macOS additionally needs code-signing or it throws.
- **`config.js`** — central constants: `APP_URL`, `ALLOWED_HOSTS` (main-window hosts), `IN_APP_DOMAINS` (extra domains that open in a secondary window instead of the browser), `PROTOCOL`, `UPDATE_REPO`. **Change site/host/protocol/update settings here, not inline.**

The **preload** (`src/preload/index.js`) is the only renderer↔main bridge. It exposes a minimal `window.dispatchtools` API (`notify`, `reloadApp`, `onConnectivityChange`, `isDesktopApp`, `platform`) over validated IPC channels (`dispatchtools:notify`, `dispatchtools:reload-app`). Add new native capabilities here as IPC, never by relaxing `webPreferences`.

`src/renderer/offline.html` is the **only local renderer asset** — a self-contained offline fallback (locked-down CSP) whose Retry button calls `window.dispatchtools.reloadApp()` to reload `APP_URL`.

### Conventions worth keeping

- Paths to preload/offline must use `path.join(__dirname, ...)` so they resolve inside the packaged asar.
- Deep-link parsing stays side-effect-free in `deepLinks.js`; wiring stays in `index.js`.
- `forge.config.js` registers the `dispatchtools` scheme (macOS Info.plist + Linux deb mimeType) and hardens the build via the Fuses plugin — keep both in sync with `config.PROTOCOL`.

## Distribution still TODO

Real icons (`assets/` — see `assets/README.md`) and code-signing/notarization are not set up; auto-update and `publish` need a publisher block in `forge.config.js` plus a GitHub repo. These are intentionally stubbed/commented, not missing by oversight.
