# Claude Swap GUI

> 轻量托盘式 GUI，用来管理多个 **Claude Code** 账户：一键切换、实时查看 5 小时 / 7 天用量、并自动汇总本地所有会话花费的美元成本。

[![Release](https://img.shields.io/github/v/release/cf-jx/claude-swap-gui?display_name=tag)](https://github.com/cf-jx/claude-swap-gui/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tauri 2](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri)](https://tauri.app)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)

**简体中文** · [English](./README.md)

---

## 为什么做这个

如果你同时有多个 Claude Code 账户（个人、公司、客户 A / B…），官方 CLI 切换繁琐，也看不到合计花费。**Claude Swap GUI** 在 [`claude-swap`](https://github.com/realiti4/claude-swap) CLI 之上套了一层 6 MB 的 Tauri 壳：

- 列出所有托管账户，实时显示 5 小时 / 7 天配额条
- 扫描 `~/.claude/projects/**/*.jsonl`，按模型分别计价，**汇总美元成本**
- 一键切换当前账户（或全局快捷键）
- 默认像 Raycast 那样从托盘弹出，拖出后会自动转为常驻窗口

## 截图

<p align="center">
  <img src="../claude-swap-ui-check-360x480.png" alt="Claude Swap GUI" width="360"/>
</p>

## 功能一览

| 模块         | 说明                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| **托盘弹窗** | 点击托盘图标 → 在图标附近弹出，失焦自动隐藏                             |
| **常驻模式** | 拖动窗口或从菜单"打开窗口"启动 → 不再自动隐藏                           |
| **自由拖动** | 在窗口任意空白处都可以拖动；按钮、卡片不受影响                          |
| **用量条**   | 实时 5h / 7d 配额条 + 重置倒计时，刷新间隔可配                          |
| **美元统计** | 按模型分别计价（Opus / Sonnet / Haiku，含缓存读 / 写折扣价）            |
| **一键切换** | 点击列表里任一账户即切换                                                |
| **全局快捷键** | 默认 `Ctrl + Shift + \\` 切换到下一个账户，可在设置里改                |
| **开机自启** | 可选                                                                    |
| **暗黑模式** | 跟随系统                                                                |
| **多语言**   | 中文 / English                                                          |

## 架构

```
┌──────────────────────────────────────────────────────────────────┐
│  React 18 + Tailwind + shadcn 风格 UI（Vite）                    │
│  ─ AccountCard / Header / ActionBar / SettingsView               │
└──────────────────────────────────────────────────────────────────┘
                  │  invoke / event                  │
┌──────────────────────────────────────────────────────────────────┐
│  Tauri 2（Rust）                                                 │
│  ─ token_stats.rs : 扫描 ~/.claude/projects/**/*.jsonl,          │
│                     按 message id 去重，按模型计价               │
│  ─ usage.rs       : 调用 Anthropic 用量 API                      │
│  ─ swap_cli.rs    : 写操作转发给 `cswap` CLI                     │
│  ─ tray.rs / lib  : 托盘弹窗 ↔ 常驻窗口 模式切换                 │
└──────────────────────────────────────────────────────────────────┘
                  │
        `cswap` CLI（Python，事务性账户切换）
```

- **读路径** 全部 Rust，没有 Python 依赖即可看用量。
- **写路径**（切换 / 添加 / 删除）转发给 `cswap`，复用其经过实战检验的事务逻辑。

## 环境要求

- Node.js ≥ 18 + npm
- Rust ≥ 1.77（`rustup default stable`）
- Tauri 各平台依赖：<https://tauri.app/start/prerequisites/>
- [`cswap`](https://github.com/realiti4/claude-swap) CLI 在 `PATH` 上
  ```bash
  uv tool install claude-swap          # 或者
  pipx install claude-swap
  ```
- 至少已经在 Claude Code 里登录过一个账户（`claude login`）

## 快速开始

```bash
git clone https://github.com/cf-jx/claude-swap-gui.git
cd claude-swap-gui
npm install
npm run tauri dev
```

启动后会在屏幕中央弹出一个小窗。点 **添加当前** 把你当前登录的 Claude Code 账户加进去；用 CLI 切到另一个账户后再点一次，就把第二个账户也加进来了。

## 打包发布版

```bash
npm run tauri build
```

产物在 `src-tauri/target/release/bundle/`：

| 系统    | 输出格式                          |
| ------- | --------------------------------- |
| Windows | `*.msi` 和 `*.exe`（NSIS）        |
| macOS   | `*.app` 和 `*.dmg`                |
| Linux   | `*.deb` 和 `*.AppImage`           |

## 设置说明

点击窗口顶部齿轮图标。

| 设置项     | 说明                                                  |
| ---------- | ----------------------------------------------------- |
| 语言       | 中文 / English                                        |
| 开机自启   | 控制系统级 autolaunch 项                              |
| 快捷键     | 点击后按下组合键录制（Esc 取消）                      |
| 轮询间隔   | 窗口可见时多久刷新一次用量数据                        |

设置文件存放于平台标准应用数据目录下的 `com.scf.claudeswapgui/settings.json`。

## 美元成本计价表

成本完全在本地根据会话 JSONL 文件计算，使用 Anthropic 公布的每百万 token 价格：

| 模型系列     | 输入  | 输出  | 缓存读 | 缓存写 |
| ------------ | ----- | ----- | ------ | ------ |
| Opus 4.x     | $15.00 | $75.00 | $1.50  | $18.75 |
| Sonnet 4.x   | $3.00  | $15.00 | $0.30  | $3.75  |
| Haiku 4.x / 3.5 | $0.80 | $4.00 | $0.08 | $1.00 |
| Haiku 3      | $0.25  | $1.25  | $0.03  | $0.30  |

未知模型按 Sonnet 计价。要新增模型系列，改 `src-tauri/src/token_stats.rs` 的 `pricing_for` 函数即可。

## 目录结构

```
claude-swap-gui/
├─ src/                     # React + TS 前端
│  ├─ components/           # AccountCard, Header, ActionBar, SettingsView, EmptyState
│  ├─ hooks/                # useAccounts, useSettings
│  ├─ i18n/                 # zh / en 文案
│  ├─ lib/                  # ipc.ts, format.ts, cn.ts
│  ├─ App.tsx
│  └─ main.tsx
├─ src-tauri/
│  ├─ src/
│  │  ├─ commands.rs        # tauri::command 处理函数
│  │  ├─ token_stats.rs     # JSONL 扫描 + USD 计价
│  │  ├─ usage.rs           # Anthropic 用量 API
│  │  ├─ swap_cli.rs        # cswap CLI 桥接
│  │  ├─ tray.rs            # 托盘图标 + 弹窗定位
│  │  └─ lib.rs             # 弹窗模式标志位、插件、setup
│  └─ tauri.conf.json
└─ README.md（本文件）
```

## Roadmap

- [ ] 托盘菜单加 "打开 ~/.claude" / "打开备份目录"
- [ ] 单账户会话数 + 单独 USD 成本细分
- [ ] 模型计价表外置成 JSON / 设置项（目前是硬编码常量）
- [ ] Linux 托盘图标细节打磨

欢迎提 PR。

## 许可证

MIT © 2026 cf-jx — 见 [LICENSE](LICENSE)。

本项目依赖 **realiti4** 维护的 [`claude-swap`](https://github.com/realiti4/claude-swap)（MIT）。感谢提供扎实的 CLI 基础。
