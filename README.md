# Claude Swap GUI

> Lightweight tray GUI for managing multiple **Claude Code** accounts — switch in one click, watch your 5h / 7d usage live, and see the total USD you've spent across all local sessions.

[![Release](https://img.shields.io/github/v/release/cf-jx/claude-swap-gui?display_name=tag)](https://github.com/cf-jx/claude-swap-gui/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tauri 2](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri)](https://tauri.app)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)

[简体中文](./README.zh-CN.md) · **English**

---

## Why

If you juggle several Claude Code accounts (personal, work, client-A, client-B…) the official CLI doesn't make switching easy and gives you no visibility into shared spend. **Claude Swap GUI** is a self-contained 6 MB Tauri shell that:

- shows every managed account with live 5-hour / 7-day usage bars
- shows the **total USD cost** of all your local Claude Code sessions, computed per-model from `~/.claude/projects/**/*.jsonl`
- swaps the active account with one click (or a global hotkey)
- pops up next to the tray icon Raycast-style — or stays put if you drag it out
- updates itself in-place from GitHub Releases (signed with minisign)

> No Python or external CLI required — all read & write logic is native Rust.

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
│  Tauri 2 (Rust) — single binary, no external runtime             │
│  ─ switcher.rs    : transactional add / remove / switch          │
│  ─ credentials.rs : read & write keyring / .credentials.json     │
│  ─ sequence.rs    : on-disk sequence + slot bookkeeping          │
│  ─ token_stats.rs : scan ~/.claude/projects/**/*.jsonl,          │
│                     dedupe by message id, price by model         │
│  ─ usage.rs       : call Anthropic usage API                     │
│  ─ tray.rs / lib  : popup-vs-persistent window mode toggle       │
└──────────────────────────────────────────────────────────────────┘
```

Account state lives under `~/.claude-swap-backup/`; the app touches it directly with file locks (`fs4`) for crash-safe atomic writes. The previously-required `cswap` CLI is **no longer needed** — all read & write logic is implemented natively in Rust.

## Requirements

**End users:** just download the installer from the [latest release](https://github.com/cf-jx/claude-swap-gui/releases/latest) — no extra dependencies. You only need at least one Claude Code account already logged in (`claude login`).

**Building from source:**
- Node.js ≥ 18 and npm
- Rust ≥ 1.77 (`rustup default stable`)
- Platform Tauri prerequisites: <https://tauri.app/start/prerequisites/>

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
| Windows | `*-setup.exe` (NSIS)              |
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

## Auto-update

Once installed (v1.0.0+), the app checks the GitHub Releases endpoint on every launch:

1. If a newer version is published, the **gear icon shows a red dot**.
2. Open Settings → Update → **Install now** to download, verify the minisign signature, install, and relaunch — no manual download needed.

The signing public key is embedded in the binary; only releases signed by the matching private key (held in CI secrets) will install.

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

Inspired by the original [`claude-swap`](https://github.com/realiti4/claude-swap) Python CLI by **realiti4** (MIT). The GUI re-implements the swap / add / remove logic natively in Rust so no Python runtime is required.
