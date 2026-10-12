# HexPick

海克斯大乱斗风格的桌面抽卡工具。任意应用里按快捷键（默认 ⌘H，可在设置里改），当前屏幕弹出原版强化选择界面，从插件预设的内容里三选一。
适合开会/课堂点人、今天吃什么，以及任何“从一堆东西里挑一个”的场景。仅支持 macOS（Apple Silicon）。

## 使用

1. 安装 `release/HexPick-<版本>-arm64.dmg`。安装包仅 ad-hoc 签名，首次打开需在“系统设置 → 隐私与安全性”中允许。
2. HexPick 常驻菜单栏，没有 Dock 图标。按快捷键呼出，再按一次或 Esc 关闭。
3. 浮层快捷键：`1-3` 选择，`R` 刷新悬停的卡，`Space` 下一次/再来一局，`Tab` 切换插件，`M` 静音。

规则对齐海克斯大乱斗：一局 4 次选择，每次三张同品质（白银/黄金/棱彩），每张可刷新一次，本局出现过的不再出现，
前两次不会都是白银，白银/黄金轮可能出现“金色刷新”（刷新时升一档）。

## 插件

插件目录：`~/Library/Application Support/HexPick/plugins/`，每个插件一个文件夹，保存即生效。
完整格式见 [plugins/README.md](plugins/README.md)，首次启动会连同 4 个示例插件一起复制到插件目录。

## 开发

```sh
npm install
npm run dev          # Electron 开发模式
npm run dev:web      # 浏览器演示模式 http://localhost:5199/index.html?plugin=workday
npm test             # 单元测试
npm run typecheck
npm run dist:mac     # 打包 dmg 到 release/
node tools/fetch-game-assets.mjs   # 重新下载游戏素材
```

目录：`src/shared` 规则引擎与插件格式（纯函数，有单测），`src/main` 主进程，`src/preload` 桥接，
`src/renderer` 浮层与设置界面，`assets/game` 游戏素材，`plugins` 示例插件。设计说明见 `docs/design.md`。

## 版权

代码采用 MIT 许可。`assets/game/` 下的卡片、背景、特效与图标来自《英雄联盟》，版权归 Riot Games 所有，
不适用 MIT 许可，详见 [assets/game/NOTICE.md](assets/game/NOTICE.md)。HexPick 是非商业粉丝工具，与 Riot Games 无关。
