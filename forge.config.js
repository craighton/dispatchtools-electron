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
      },
    },
    // macOS — ZIP is required for Squirrel.Mac auto-update; DMG is the human installer.
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {},
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
  // To enable `npm run publish` + auto-update, uncomment and set your GitHub repo,
  // then set config.UPDATE_REPO (or env DISPATCHTOOLS_UPDATE_REPO) in src/main/config.js.
  // publishers: [
  //   {
  //     name: '@electron-forge/publisher-github',
  //     config: {
  //       repository: { owner: 'OWNER', name: 'dispatchtools-electron' },
  //       prerelease: false,
  //     },
  //   },
  // ],
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
