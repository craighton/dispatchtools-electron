const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    name: 'Dispatch Tools',
    icon: 'assets/icon',
    appBundleId: 'com.dispatchtools.desktop',
    // Registers the dispatchtools:// deep-link scheme in the macOS Info.plist.
    protocols: [
      {
        name: 'Dispatch Tools',
        schemes: ['dispatchtools'],
      },
    ],
  },
  rebuildConfig: {},
  makers: [
    // Windows installer
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        // Squirrel/NuGet package id — must be space-free, so it stays
        // "DispatchTools". The user-facing app name ("Dispatch Tools") comes
        // from packagerConfig.name above.
        name: 'DispatchTools',
        // Icon shown in the installer wizard and Add/Remove Programs.
        setupIcon: 'assets/icon.ico',
      },
    },
    // macOS — ZIP is required for Squirrel.Mac auto-update; DMG is the human installer.
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        // Volume icon for the mounted DMG installer window.
        icon: 'assets/icon.icns',
      },
      platforms: ['darwin'],
    },
    // Linux
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          mimeType: ['x-scheme-handler/dispatchtools'],
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  // `npm run publish` uploads the built artifacts to a GitHub Release. Installed
  // apps then auto-update from that release via update.electronjs.org (wired in
  // src/main/updater.js, gated on config.UPDATE_REPO). Requires a GITHUB_TOKEN
  // env var with `repo` scope when publishing. The repo must be PUBLIC for the
  // free update service to serve it.
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: { owner: 'craighton', name: 'dispatchtools-electron' },
        prerelease: false,
        // Set draft:false so the release is live (and updatable) immediately on
        // publish. Flip to true if you'd rather review releases before they ship.
        draft: false,
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Hardens the packaged app by flipping Electron fuses.
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
