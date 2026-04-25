---
version: alpha
name: Telemetry
description: A calm, precise tray utility for engineers — refined like a wall-mounted instrument, not a marketing dashboard.
colors:
  primary: "#171A1F"
  secondary: "#5C6470"
  tertiary: "#3357D9"
  neutral: "#FAF8F4"
  surface: "#FFFFFF"
  surface-muted: "#F2EEE7"
  surface-sunk: "#ECE7DD"
  on-surface: "#171A1F"
  on-surface-muted: "#5C6470"
  on-tertiary: "#FFFFFF"
  tertiary-soft: "#EAEFFC"
  border: "#D8D2C6"
  hairline: "#C9C2B3"
  success: "#2F9E5F"
  warning: "#D89026"
  danger: "#D24A3F"
  active-halo: "#3357D9"
typography:
  display:
    fontFamily: "-apple-system, 'SF Pro Display', 'Segoe UI Variable Display', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em
  body-md:
    fontFamily: "-apple-system, 'SF Pro Text', 'Segoe UI Variable Text', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: -0.005em
  body-sm:
    fontFamily: "-apple-system, 'SF Pro Text', 'Segoe UI Variable Text', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: 11.5px
    fontWeight: 500
    lineHeight: 1.4
  label-md:
    fontFamily: "-apple-system, 'SF Pro Text', 'Segoe UI Variable Text', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.3
  label-sm:
    fontFamily: "-apple-system, 'SF Pro Text', 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: 10.5px
    fontWeight: 500
    lineHeight: 1.3
  label-caps:
    fontFamily: "-apple-system, 'SF Pro Text', 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: 9.5px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.1em
    fontFeature: '"cpsp" on'
  numeric-md:
    fontFamily: "-apple-system, 'SF Pro Text', 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.005em
    fontFeature: '"tnum" on, "ss01" on, "cv01" on'
  numeric-sm:
    fontFamily: "-apple-system, 'SF Pro Text', 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.2
    fontFeature: '"tnum" on, "ss01" on, "cv01" on'
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  gutter: 12px
  inset: 14px
rounded:
  none: 0px
  sm: 6px
  md: 10px
  lg: 14px
  xl: 18px
  full: 9999px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 10px
    height: 36px
  button-primary-hover:
    backgroundColor: "#2D4DC9"
  button-primary-active:
    backgroundColor: "#2543B5"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 8px
    height: 28px
  button-outline-hover:
    backgroundColor: "{colors.surface-muted}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface-muted}"
    rounded: "{rounded.md}"
    padding: 6px
    size: 28px
  button-ghost-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
  card-account:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 14px
  card-account-active:
    backgroundColor: "{colors.tertiary-soft}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 14px
  pill-status:
    backgroundColor: "transparent"
    textColor: "{colors.tertiary}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: 2px
  progress-track:
    backgroundColor: "{colors.surface-sunk}"
    rounded: "{rounded.full}"
    height: 6px
  progress-fill-ok:
    backgroundColor: "{colors.success}"
    rounded: "{rounded.full}"
  progress-fill-warn:
    backgroundColor: "{colors.warning}"
    rounded: "{rounded.full}"
  progress-fill-danger:
    backgroundColor: "{colors.danger}"
    rounded: "{rounded.full}"
  divider-hairline:
    backgroundColor: "{colors.hairline}"
    height: 1px
  tab-active:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: 6px
  tab-inactive:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: 6px
---

# Claude Swap — Telemetry

A 360×480 always-on-top tray window that lives next to a developer's IDE. Every pixel must earn its place: the user looks for one second, decides one thing (am I on the right account, do I have headroom, am I burning money), and dismisses the window.

## Overview

**Calm precision, refined utility.** Reads like a wall-mounted instrument — not a marketing dashboard. The visual mood sits between *Linear*'s reduced surfaces and *Things 3*'s editorial whitespace, with a parchment-warm rather than clinical-cool palette to soften long viewing sessions next to a bright IDE.

The product never demands attention. It surfaces the most decision-shaping number (USD spent today) prominently, demotes meta information (version, account count) to a quiet second line, and reserves saturated color exclusively for the active account and the primary action. Decoration is subtractive: shadows are sub-1px hairlines and tonal background layers, never glow halos or glassmorphism.

Three-word personality: **calm, precise, restrained.**

The interface should feel like an instrument that has been refined over many years — every element is there because it does load-bearing work, and what isn't there has been deliberately removed.

## Colors

The palette is a high-contrast warm-neutral foundation with a single deep-indigo accent. Saturated colors are scarce by construction; their rarity is what makes them legible.

- **Primary (#171A1F):** Deep ink. Used for headlines, account email, and any text that must read as load-bearing. Avoid as a fill — it is a typographic color.
- **Secondary (#5C6470):** Slate. Used for organization names, descriptions, button captions, and any second-tier information. Never sits on the tertiary or accent color (use `on-tertiary` instead).
- **Tertiary (#3357D9):** Indigo. The single accent — used only for the active account's surface and ring, the primary action button, and inline interactive affordances (hotkey badges, links). Never decorative.
- **Neutral (#FAF8F4):** Warm parchment. The window background. Softer than `#FFFFFF`, avoiding the surgical feel of pure white during long viewing.
- **Surface (#FFFFFF):** Pure white, used for cards that must rise above the parchment (account cards, settings rows, update banner). The `parchment → white card` step is the primary depth signal.
- **Surface-muted (#F2EEE7):** A half-step deeper than parchment — used for the token-breakdown stripe and other "tonal layer" panels.
- **Surface-sunk (#ECE7DD):** A full step deeper — used for progress-bar tracks, hotkey-recording chip backgrounds, and any sunken affordance.
- **Tertiary-soft (#EAEFFC):** A 6%-saturation tint of the indigo accent — used as the active card's background. Never used for text or borders.
- **Hairline (#C9C2B3):** The 1px border color. Tinted toward the parchment hue — never neutral gray, which would read as foreign matter on warm surfaces.
- **Success (#2F9E5F) / Warning (#D89026) / Danger (#D24A3F):** Semantic only. Reserved for usage-bar fills and balance amounts, never for ornament.

Numeric brand tokens are tinted toward the parchment hue (8–14° hue, 12–18% chroma at the neutrals), which produces subconscious cohesion across surfaces.

## Typography

A single system stack with **two voices**: a *narrative* voice for human-readable text and a *telemetric* voice for numbers. The same font family is used for both — the distinction is achieved purely via OpenType features (`tabular-nums`, `ss01`), not by switching to a monospace face. Lazy "developer = monospace" cosplay is rejected.

The narrative voice uses the OS-native sans (SF Pro on macOS, Segoe UI Variable on Windows 11, PingFang SC / Microsoft YaHei for CJK). System fonts are deliberate: a tray utility that loads instantly with the OS chrome reads as native, not as a webview wearing a costume. We explicitly avoid Inter — it is the AI-generated app monoculture.

- **Display (`display`):** Brand wordmark and section titles. Tight tracking, semi-bold, 14px. Used exactly once per screen.
- **Body Medium (`body-md`):** Account email, primary action button labels, settings row labels. The most-printed level — its leading and tracking are tuned for the 360px-wide window.
- **Body Small (`body-sm`):** Outline button labels, settings descriptions.
- **Label Medium (`label-md`):** Tab labels, second-tier interactive affordances.
- **Label Small (`label-sm`):** Card sub-line (organization name), `unavailable` hints.
- **Label Caps (`label-caps`):** ACTIVE pill, `INPUT / OUTPUT / CACHE` axis labels in the token stripe, bucket labels in usage bars (5H, 7D). Always uppercase, with 0.1em tracking. Reserved for short axis labels and status pills — never used for prose.
- **Numeric Medium (`numeric-md`):** USD amounts, account index. Tabular nums + `ss01` (alternate digit style with friendlier curves).
- **Numeric Small (`numeric-sm`):** Token counts, percentages, countdowns. Same OpenType features as `numeric-md`, smaller size.

## Layout

The window is a **fixed-width 360px** column at three vertical bands:

1. **Header** — `48px` minimum, expands to ~88px when token totals are present, structured as three sub-rows: (a) brand + hero USD + window controls, (b) version + account count + token total, (c) token-breakdown stripe.
2. **Account list** — vertically scrolling, parchment background, cards stacked with 8px gutters and 12px horizontal inset.
3. **Action bar** — fixed bottom, primary action full-width, three secondary actions in a 3-up grid below.

Spacing follows a **4pt scale**: `xs` (4) / `sm` (8) / `md` (12) / `lg` (16) / `xl` (24) / `xxl` (32). Half-steps and odd values (e.g. `10px`) are forbidden — they erode the visual rhythm.

Card-internal spacing uses an **inset of 14px** (slightly above the `md` step), creating a subtle "cards breathe more than the gutter between them" hierarchy that Linear pioneered. The 2px difference is felt, not seen.

The settings view replaces the account list with a tab strip + form rows; the header and action zones do not exist there. Tabs are horizontal, not the vertical sidebar variant — the window is too narrow for a sidebar to earn its 88px.

## Elevation & Depth

Depth is conveyed through **tonal layers and hairlines**, not shadow stacks. A card sitting on a `neutral` background is not lifted by a `0 8px 24px` drop-shadow; it is lifted by *being whiter than the page*. This is the discipline of editorial print — the page is the deepest, the column is shallower, the headline is shallowest.

- **Window:** Parchment background (`neutral`). No outer shadow — the OS provides the window shadow.
- **Header / action bar:** Same parchment as the window, separated by a single hairline (`hairline` color, 1px). No background fill change.
- **Cards (default):** Pure `surface` white, with a 1px `hairline` outline, a 1px inner highlight on the top edge (white-on-white 60% opacity, simulating a printed page's subtle bevel), and an 8px ambient shadow at 4% opacity. The shadow exists only to anchor the card on the warm background — it is below the threshold of conscious perception.
- **Cards (active):** `tertiary-soft` background, 1px `tertiary @ 32% opacity` ring, plus a 4px `tertiary @ 8% opacity` halo at the outside. The halo is what makes "active" feel like a *physical state* rather than a visual style change. No solid drop shadow on active — the halo replaces it.
- **Token stripe:** `surface-muted` half-tone (`#F2EEE7`), separated from the rest of the header by a hairline above it.

Glassmorphism, neon glow, and gradient halos are explicitly out of bounds — they read as decorative AI output.

## Shapes

The shape language is **soft-edged precision**: enough corner radius to feel modern and approachable, never so much that elements read as toys.

- `sm` (6px) — chips, pills, ghost-button hover backgrounds.
- `md` (10px) — buttons (primary, outline, secondary).
- `lg` (14px) — settings rows, link rows, update banner.
- `xl` (18px) — account cards (the largest and most recurring element gets the most generous radius — visual gravity).
- `full` — pills with binary state (ACTIVE), progress-bar tracks, the active-account index dot.

Shapes are never mixed within a single visual group. Account cards (lg) and the buttons that act on them (md) differ by one step on the radius scale — felt, not analyzed.

## Components

### Account Card

The most-printed and most-decision-shaping element. Three rows inside a single card:

1. **Identity row:** mono account index (01, 02 …) at left, account email centered-left in `body-md`, ACTIVE pill or hover-only refresh/remove icons at right.
2. **Sub-line:** organization name in `label-sm`, indented to align with email (skipping the index column).
3. **Usage block:** one or more progress bars stacked, each row = `[label-caps] [progress-fill] [percentage] [countdown]`. The bar's fill color reflects threshold (`success` < 50% < `warning` < 80% < `danger`).

The active card uses `card-account-active`; inactive cards use `card-account` and become `cursor: pointer` with a 1px upward translate on hover. On active cards, the ACTIVE pill shows a 6px solid `tertiary` dot followed by an uppercase `· ACTIVE` label — this is the **only** place the indigo color appears outside of the primary button.

### Action Bar

A two-band grid:
- **Band 1:** the primary `Switch to next` button, full-width, 36px tall, with the global hotkey rendered as a translucent chip on the right edge of the button. The hotkey chip is the only place we display monospaced-feeling text — and even there we use `numeric-md` plus the OS sans (Ctrl, Shift, etc. read fine in sans).
- **Band 2:** three outline buttons (`Add account`, `Backup`, `Verify`) in a 3-up grid, each 28px tall.

The primary action gets 36px because it is the action, not because emphasis was needed. The secondaries are deliberately smaller — the size *is* the hierarchy.

### Header

Three sub-rows as described in [Layout](#layout). The hero USD amount uses `numeric-md` in `success` color, sitting next to the brand wordmark — the first thing the eye lands on. Version + account count appear on the second line in `label-sm` muted color. The token-breakdown stripe (`INPUT / OUTPUT / CACHE`) uses `label-caps` axis labels with a 4px colored dot prefix (success / tertiary / warning) — the dot is small enough to read as a typographic mark, not an icon.

### Settings Row

A 52px-min-height white card containing a label/description on the left and an interactive control on the right (toggle switch, segmented pill group, recording chip, polling-interval chip). Settings rows use `rounded.lg` — slightly less than account cards, communicating "this is editable structure, not an entity."

### Tab

Horizontal tab with a 1.5px `tertiary` underline on the active state. No background fill change — the underline is sufficient signal at this scale. Inactive tabs hover to `on-surface` text color but never gain a background.

## Do's and Don'ts

- **Do** reserve the indigo `tertiary` color for exactly two surfaces: the active account card (background tint + ring) and the primary `Switch to next` button. Anything else uses ink or slate.
- **Do** use tabular numerics for *every* number on screen — USD amounts, token counts, percentages, countdowns, account indices, version numbers. Mixed-width digits make a calm interface look anxious.
- **Do** use `label-caps` (uppercase + 0.1em tracking) only for short axis labels and binary status pills. Never set prose in caps.
- **Do** lift cards via tonal background contrast plus a single 1px hairline. Trust the warm-on-white step — it is enough.
- **Do** use the system font stack (SF / Segoe UI Variable / PingFang). It loads instantly, supports CJK by default, and reads as native.

- **Don't** use `border-left` (or any one-sided colored stripe wider than 1px) as an accent on cards or callouts. It is the most overused AI-generated "design touch" and never reads as intentional.
- **Don't** use gradient text fills (`background-clip: text` + a gradient background). Solid color always.
- **Don't** introduce a second font family for "technical" or "developer" texture. The numeric voice is achieved via `tabular-nums` + `ss01`, not a monospace face.
- **Don't** apply drop shadows greater than 8px blur or 6% opacity on cards. The card lifts via tonal contrast; the shadow only anchors it on the warm field.
- **Don't** use Inter, Roboto, DM Sans, Plus Jakarta, Geist, or Space Grotesk. They are the AI-app monoculture; the system stack is more original *and* more native.
- **Don't** mix radius scales within a visual group. Cards and the buttons that act on them must be one step apart on the `rounded` scale, not two or three.
- **Don't** decorate the header with multiple stacked rows of pill-shaped metric chips. Token data goes in the muted stripe, not as floating chips above the brand line.
- **Don't** show every usage bucket on every card by default. The active card shows all buckets; inactive cards show only the canonical `5H` and `7D` and disclose model-specific buckets behind a chevron.
