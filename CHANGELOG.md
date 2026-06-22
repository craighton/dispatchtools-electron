# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2026-06-22

### Changed

- Require Node.js >= 22.12.0 (Electron 42's minimum). The requirement is now
  declared in `package.json` `engines`, pinned in `.nvmrc`, and consumed by CI
  via `node-version-file`, fixing build errors on older Node versions.

## [0.1.2] - 2026-06-22

### Added

- Toolbar buttons that pop out the compact tools — **NAS Status**, **Weather
  Monitor**, **D-ATIS Monitor**, and **Advisories** — each into its own window so
  it can be moved to a separate monitor. The tool list lives in `config.js`.
- Single-file portable Windows build (`DispatchTools-Portable-<version>.exe`),
  produced by electron-builder and attached to each GitHub Release. It runs with
  no installation and no extraction.

### Changed

- Space-free executable names on every platform (`DispatchTools`); the Windows
  installer is now `DispatchTools-Setup.exe`.
- Replaced the Windows portable **zip** with the single-file portable **.exe**.
  The auto-updating Squirrel installer is unchanged.
- `CLAUDE.md` is no longer tracked in the repository.

### Fixed

- Linux `.deb`/`.rpm` builds failing with a "re-bundle using executableName"
  error after the executable was renamed — the maker `bin` is now pinned to
  `DispatchTools`.

## [0.1.1]

### Added

- Auto-update for packaged builds via [update.electronjs.org], wired to the
  GitHub Releases of `craighton/dispatchtools-electron`.
- A GitHub Actions release workflow that builds and publishes Windows, macOS, and
  Linux artifacts when a version tag (`v*`) is pushed.
- Production application icons: a multi-resolution macOS `.icns`, a
  multi-resolution Windows `.ico`, and a Linux `.png`, plus the installer
  (Squirrel/DMG) and runtime window icons.
- `README.md` and a proprietary, All-Rights-Reserved `LICENSE`.

## [0.1.0]

### Added

- Initial desktop shell around the live site at dispatchtools.com: native
  toolbar chrome and application menus, persisted window bounds, an offline
  fallback page, OS notifications, `dispatchtools://` deep links, single-instance
  enforcement, and compact pop-out windows for dispatcher panels.

[update.electronjs.org]: https://github.com/electron/update.electronjs.org
