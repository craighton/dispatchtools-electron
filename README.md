# Dispatch Tools (Desktop)

A native desktop shell around the live site at **[dispatchtools.com](https://dispatchtools.com)**, built with [Electron Forge](https://www.electronforge.io/) (Electron 42, Forge 7).

It is not a standalone app — the renderer *is* the remote website, loaded into a `BrowserWindow`. The native layer adds desktop affordances on top:

- Native toolbar chrome and application menus with keyboard shortcuts
- Compact "pop-out" panels (e.g. `/nas/compact/`, `/wx/compact/`) that open in their own window so a dispatcher can move them to a second monitor
- Persisted window bounds (restored to a currently-visible display)
- Offline fallback page with a Retry button
- OS notifications
- `dispatchtools://` deep links (e.g. `dispatchtools://flights/123` → `/flights/123`)
- Single-instance enforcement
- Auto-update from GitHub Releases

## Requirements

- **Node.js 18+** (CI builds on Node 22)
- npm
- Platform build tools are only needed when packaging (see [Building](#building))

## Getting started

```bash
npm install
npm start          # run the app in development
```

### Dev environment overrides

| Variable                    | Effect                                                          |
| --------------------------- | --------------------------------------------------------------- |
| `DISPATCHTOOLS_URL`         | Point the shell at a local site build, e.g. `http://localhost:8080` |
| `DISPATCHTOOLS_UPDATE_REPO` | Override the `owner/repo` used for auto-update                  |

```bash
DISPATCHTOOLS_URL=http://localhost:8080 npm start
```

There is no test runner, linter, or bundler — source runs as-is (CommonJS). Syntax-check a file with `node --check <file>`.

## Configuration

All shell constants live in [`src/main/config.js`](src/main/config.js) — change site URL, allowed hosts, deep-link protocol, and the update repo there, not inline:

| Key                    | Purpose                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `APP_URL`              | The live site the shell wraps                                           |
| `ALLOWED_HOSTS`        | Hosts allowed to load in the main window                                |
| `IN_APP_DOMAINS`       | Extra domains (suffix match, e.g. `faa.gov`) that open in a secondary in-app window instead of the browser |
| `COMPACT_VIEW_SEGMENTS`| Path segments that designate a pop-out compact panel                    |
| `PROTOCOL`             | Deep-link scheme (`dispatchtools`)                                      |
| `UPDATE_REPO`          | GitHub `owner/repo` that serves release updates                         |

## Building

```bash
npm run package    # unpackaged app bundle in out/ (no installers)
npm run make       # installers for the CURRENT platform into out/make/
```

> **`npm run make` only builds for the host OS.** The DMG/ZIP makers are macOS-only; Squirrel (Windows) and deb/rpm (Linux) build natively on their own OS. Produce all three via CI (see below) rather than one local command.

Per-platform artifacts:

| Platform | Output                  |
| -------- | ----------------------- |
| Windows  | `.exe` (Squirrel) installer |
| macOS    | `.dmg` + `.zip`         |
| Linux    | `.deb` + `.rpm`         |

## Releasing & auto-update

Releases are built on real per-platform runners and published to GitHub Releases by [`.github/workflows/release.yml`](.github/workflows/release.yml). Installed apps then auto-update via [update.electronjs.org](https://github.com/electron/update.electronjs.org), polled hourly.

To cut a release:

```bash
# 1. Bump the version in package.json (must increase), commit.
# 2. Tag and push — the tag must match the package.json version:
git tag v0.1.1
git push origin v0.1.1
```

The workflow builds Windows, macOS, and Linux, and uploads all artifacts to a single Release. No personal token is needed in CI (the workflow grants the built-in `GITHUB_TOKEN` write access to releases).

To publish **locally** instead of via CI, set a GitHub token with `repo` scope and run `npm run publish`:

```bash
GITHUB_TOKEN=ghp_xxxx npm run publish
```

### Auto-update requirements

- ⚠️ **The GitHub repo must be public** for the free update service to serve it.
- ⚠️ **macOS auto-update requires code-signing + notarization** (an Apple Developer cert). Unsigned macOS builds will not auto-update. Windows auto-updates fine unsigned.

## Project structure

```
src/
  main/            Main process (Node) — all native behavior
    index.js       App lifecycle, single-instance lock, deep-link routing, IPC wiring
    window.js      Window/view creation, security model, link-routing policy
    windowState.js Window-bounds persistence
    deepLinks.js   Pure dispatchtools:// → https:// URL translation
    menu.js        Native application menu
    updater.js     Auto-update wiring (update.electronjs.org)
    config.js      Central constants — edit site/host/protocol/update settings here
  preload/         Renderer↔main bridge (the only one) — minimal validated IPC
  renderer/        Local assets: offline.html (fallback) + toolbar.html (chrome)
assets/            App icons (.icns / .ico / .png) — see assets/README.md
forge.config.js    Electron Forge config (makers, publishers, protocol, fuses)
```

### Security model

The renderer loads remote content, so the shell is locked down: `contextIsolation` and `sandbox` are **on**, `nodeIntegration` is **off**, and the preload exposes only a minimal `window.dispatchtools` API over validated IPC channels. New native capabilities are added as IPC in the preload — never by relaxing `webPreferences`. Navigation uses three-tier routing: allowed hosts stay in the main window, configured in-app domains open in a secondary window, and everything else opens in the system browser.

## License

Proprietary — All Rights Reserved. See [LICENSE](LICENSE).
