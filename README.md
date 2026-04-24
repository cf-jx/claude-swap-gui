# Claude Swap GUI

> Lightweight tray GUI for managing multiple **Claude Code** accounts — switch in one click, watch your 5h / 7d usage live, and see the total USD you've spent across all local sessions.

[![Release](https://img.shields.io/github/v/release/cf-jx/claude-swap-gui?display_name=tag)](https://github.com/cf-jx/claude-swap-gui/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tauri 2](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri)](https://tauri.app)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)

[简体中文](./README.zh-CN.md) · **English**

---

## Why

If you juggle several Claude Code accounts (personal, work, client-A, client-B…) the official CLI doesn't make switching easy and gives you no visibility into shared spend. **Claude Swap GUI** wraps the excellent [`claude-swap`](https://github.com/realiti4/claude-swap) CLI in a 6 MB Tauri shell that:

- shows every managed account with live 5-hour / 7-day usage bars
- shows the **total USD cost** of all your local Claude Code sessions, computed per-model from `~/.claude/projects/**/*.jsonl`
- swaps the active account with one click (or a global hotkey)
- pops up next to the tray icon Raycast-style — or stays put if you drag it out

## Screenshots

<p align="center">
  <img src="../claude-swap-ui-check-360x480.png" alt="Claude Swap GUI" width="360"/>
</p>

## Features

| Area              | Detail                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------- |
| **Tray popup**    | Click the tray icon → opens centred above the icon, hides on focus loss                |
| **Persistent**    | Drag the window or open it from the menu → stays visible until you close it            |
| **Free drag**     | Drag from any blank area of the window (cards & buttons stay clickable)                |
| **Usage bars**    | Live 5h / 7d quota bars with reset countdown, polled at a configurable interval        |
| **USD totals**    | Per-model pricing (Opus / Sonnet / Haiku, including cache-read & cache-write discounts) |
| **One-click swap**| Switch to any account from the list                                                    |
| **Global hotkey** | Default `Ctrl + Shift + \\` to cycle to the next account, rebindable in Settings       |
| **Autostart**     | Optional launch-at-login                                                               |
| **Dark mode**     | Follows the system preference                                                          |
| **i18n**          | English + 简体中文                                                                     |

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  React 18 + Tailwind + shadcn-style UI (Vite)                    │
│  ─ AccountCard / Header / ActionBar / SettingsView               │
└──────────────────────────────────────────────────────────────────┘
                  │  invoke / event                  │
┌──────────────────────────────────────────────────────────────────┐
│  Tauri 2 (Rust)                                                  │
│  ─ token_stats.rs : scan ~/.claude/projects/**/*.jsonl,          │
│                     dedupe by message id, price by model         │
│  ─ usage.rs       : call Anthropic usage API                     │
│  ─ swap_cli.rs    : shell out to `cswap` for write ops           │
│  ─ tray.rs / lib  : popup-vs-persistent window mode toggle       │
└──────────────────────────────────────────────────────────────────┘
                  │
        `cswap` CLI (Python, transactional account swaps)
```

- **Read path** is pure Rust — no Python dependency for displaying anything.
- **Write path** (switch / add / remove) shells out to `cswap` so the battle-tested transactional logic stays the single source of truth.

## Requirements

- Node.js ≥ 18 and npm
- Rust ≥ 1.77 (`rustup default stable`)
- Platform Tauri prerequisites: <https://tauri.app/start/prerequisites/>
- [`cswap`](https://github.com/realiti4/claude-swap) CLI on `PATH`
  ```bash
  uv tool install claude-swap          # or
  pipx install claude-swap
  ```
- At least one Claude Code account already logged in (`claude login`)

## Quick start

```bash
git clone https://github.com/cf-jx/claude-swap-gui.git
cd claude-swap-gui
npm install
npm run tauri dev
```

A small window centres on screen. Click **Add current** to register your active Claude Code account, then add a few more by switching in the CLI and pressing **Add current** again.

## Build a release binary

```bash
npm run tauri build
```

Artifacts land in `src-tauri/target/release/bundle/`:

| OS      | Output                            |
| ------- | --------------------------------- |
| Windows | `*.msi` and `*.exe` (NSIS)        |
| macOS   | `*.app` and `*.dmg`               |
| Linux   | `*.deb` and `*.AppImage`          |

## Settings

Open the gear icon in the header.

| Setting       | Notes                                                       |
| ------------- | ----------------------------------------------------------- |
| Language      | English / 中文                                              |
| Launch at login | Toggles a system autolaunch entry                         |
| Hotkey        | Click to record a global combo (Esc to cancel)              |
| Poll interval | How often to refresh the usage API while the window is open |

Settings live in the platform's standard app-data directory under `com.scf.claudeswapgui/settings.json`.

## Pricing model (USD totals)

Cost is computed locally from your session JSONL files using the published Anthropic pricing per 1M tokens:

| Model family | Input | Output | Cache read | Cache write |
| ------------ | ----- | ------ | ---------- | ----------- |
| Opus 4.x     | $15.00 | $75.00 | $1.50  | $18.75 |
| Sonnet 4.x   | $3.00  | $15.00 | $0.30  | $3.75  |
| Haiku 4.x / 3.5 | $0.80 | $4.00 | $0.08 | $1.00 |
| Haiku 3      | $0.25  | $1.25  | $0.03  | $0.30  |

Unknown models default to Sonnet pricing. Edit `src-tauri/src/token_stats.rs` (`pricing_for`) to add new model families.

## Project layout

```
claude-swap-gui/
├─ src/                     # React + TS frontend
│  ├─ components/           # AccountCard, Header, ActionBar, SettingsView, EmptyState
│  ├─ hooks/                # useAccounts, useSettings
│  ├─ i18n/                 # zh / en strings
│  ├─ lib/                  # ipc.ts, format.ts, cn.ts
│  ├─ App.tsx
│  └─ main.tsx
├─ src-tauri/
│  ├─ src/
│  │  ├─ commands.rs        # tauri::command handlers
│  │  ├─ token_stats.rs     # JSONL scan + USD pricing
│  │  ├─ usage.rs           # Anthropic usage API client
│  │  ├─ swap_cli.rs        # cswap CLI bridge
│  │  ├─ tray.rs            # tray icon + popup positioning
│  │  └─ lib.rs             # popup-mode flag, plugins, setup
│  └─ tauri.conf.json
└─ README.md (this file)
```

## Roadmap / nice-to-haves

- [ ] One-click "open ~/.claude" / "open backup dir" entries in the tray menu
- [ ] Per-account session count + USD breakdown
- [ ] Configurable model pricing table (currently hard-coded constants)
- [ ] Linux tray icon polish

PRs welcome.

## License

MIT © 2026 cf-jx — see [LICENSE](LICENSE).

This project depends on [`claude-swap`](https://github.com/realiti4/claude-swap) by **realiti4** (MIT). Many thanks for the solid CLI foundation.
