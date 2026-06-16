# App icons

Drop production icons here, then uncomment `icon: 'assets/icon'` in `forge.config.js`
(no extension — `electron-packager` picks the correct file per platform):

| Platform | File                | Notes                          |
| -------- | ------------------- | ------------------------------ |
| macOS    | `assets/icon.icns`  | 1024×1024 source recommended   |
| Windows  | `assets/icon.ico`   | multi-resolution .ico          |
| Linux    | `assets/icon.png`   | 512×512 PNG                    |

Until real icons are added, the build uses the default Electron icon.
