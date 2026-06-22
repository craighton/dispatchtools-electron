# App icons

Production icons are in place and wired up. `forge.config.js` references them via
`packagerConfig.icon: 'assets/icon'` (no extension — the packager picks the right
file per platform), plus `maker-squirrel.setupIcon` and `maker-dmg.icon`. The
runtime window icon (Linux / `npm start`) is set in `src/main/window.js`.

| Platform | File                | Notes                                         |
| -------- | ------------------- | --------------------------------------------- |
| macOS    | `assets/icon.icns`  | multi-resolution (16→1024, incl. @2x Retina)  |
| Windows  | `assets/icon.ico`   | multi-resolution (16→256)                     |
| Linux    | `assets/icon.png`   | 1000×1000 PNG                                 |

## Regenerating the `.icns` from a 1024px source (macOS)

The `.icns` must contain multiple sizes or small icons render blurry. To rebuild
from a 1024×1024 PNG:

```bash
mkdir icon.iconset
for s in 16 32 128 256 512; do
  sips -z $s $s         source-1024.png --out icon.iconset/icon_${s}x${s}.png
  sips -z $((s*2)) $((s*2)) source-1024.png --out icon.iconset/icon_${s}x${s}@2x.png
done
iconutil -c icns -o assets/icon.icns icon.iconset
```
