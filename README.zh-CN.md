# Claude Swap GUI

> 轻量托盘式 GUI，用来管理多个 **Claude Code** 账户：一键切换、实时查看 5 小时 / 7 天用量、并自动汇总本地所有会话花费的美元成本。

[![Release](https://img.shields.io/github/v/release/cf-jx/claude-swap-gui?display_name=tag)](https://github.com/cf-jx/claude-swap-gui/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tauri 2](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri)](https://tauri.app)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)

**简体中文** · [English](./README.md)

---

## 为什么做这个

如果你同时有多个 Claude Code 账户（个人、公司、客户 A / B…），官方 CLI 切换繁琐，也看不到合计花费。**Claude Swap GUI** 是一个独立的 6 MB Tauri 应用：

- 列出所有托管账户，实时显示 5 小时 / 7 天配额条
- 扫描 `~/.claude/projects/**/*.jsonl`，按模型分别计价，**汇总美元成本**
- 一键切换当前账户（或全局快捷键）
- 默认像 Raycast 那样从托盘弹出，拖出后会自动转为常驻窗口
- 自动从 GitHub Releases 拉取签名更新（minisign 校验）

> 不依赖 Python，也不依赖任何外部 CLI——所有读写逻辑都是原生 Rust 实现。

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
│  Tauri 2（Rust）— 单一可执行，零外部运行时依赖                   │
│  ─ switcher.rs    : 事务性 添加 / 删除 / 切换                    │
│  ─ credentials.rs : 读写 keyring / .credentials.json             │
│  ─ sequence.rs    : 本地账户序列与槽位簿记                       │
│  ─ token_stats.rs : 扫描 ~/.claude/projects/**/*.jsonl,          │
│                     按 message id 去重，按模型计价               │
│  ─ usage.rs       : 调用 Anthropic 用量 API                      │
│  ─ tray.rs / lib  : 托盘弹窗 ↔ 常驻窗口 模式切换                 │
└──────────────────────────────────────────────────────────────────┘
```

账户状态保存在 `~/.claude-swap-backup/`，全部用文件锁（`fs4`）做崩溃安全的原子写入。**不再需要 `cswap` CLI**——所有读写逻辑都已用 Rust 原生实现。

## 环境要求

**普通用户：** 直接从 [最新 Release](https://github.com/cf-jx/claude-swap-gui/releases/latest) 下载安装包即可，没有任何额外依赖。只需要至少有一个 Claude Code 账户已经登录（`claude login`）。

**从源码构建：**
- Node.js ≥ 18 + npm
- Rust ≥ 1.77（`rustup default stable`）
- Tauri 各平台依赖：<https://tauri.app/start/prerequisites/>

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

## 自动更新

装好 v1.0.0 及以上版本后，App 每次启动都会去 GitHub Releases 检查更新：

1. 发现新版本 → **设置齿轮图标显示红点**
2. 进设置 → 更新 → **立即更新** → 自动下载、minisign 签名校验、覆盖安装、重启 App

公钥已编进二进制；只有用对应私钥（保存在 CI Secrets）签过名的 Release 才能装上。

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

本项目灵感来自 **realiti4** 的 Python CLI [`claude-swap`](https://github.com/realiti4/claude-swap)（MIT）。GUI 用 Rust 原生重新实现了 切换 / 添加 / 删除 逻辑，因此不再需要 Python 运行时。
