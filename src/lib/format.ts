export function usageColor(pct: number): string {
  if (pct >= 80) return "bg-[hsl(var(--danger))]";
  if (pct >= 50) return "bg-[hsl(var(--warning))]";
  return "bg-[hsl(var(--success))]";
}

export function truncateEmail(email: string, max = 28): string {
  if (email.length <= max) return email;
  const [local, domain] = email.split("@");
  if (!domain) return email.slice(0, max - 1) + "…";
  const keep = Math.max(4, max - domain.length - 2);
  return `${local.slice(0, keep)}…@${domain}`;
}

export function formatTokenCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1_000_000_000) return `${trimFixed(value / 1_000_000_000)}B`;
  if (value >= 1_000_000) return `${trimFixed(value / 1_000_000)}M`;
  if (value >= 1_000) return `${trimFixed(value / 1_000)}K`;
  return Math.round(value).toString();
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "$0.00";
  if (value >= 10_000) return `$${value.toFixed(0)}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(3)}`;
}

function trimFixed(value: number): string {
  return value.toFixed(value >= 10 ? 1 : 2).replace(/\.0+$|(\.\d*[1-9])0+$/, "$1");
}

export function orgTag(name: string): string {
  return name?.trim() || "personal";
}

const IS_MAC = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

/** Format a Tauri hotkey spec ("CmdOrCtrl+Shift+Backslash") for display. */
export function formatHotkey(spec: string): string {
  if (!spec) return "";
  return spec
    .split("+")
    .map((part) => {
      const key = part.trim();
      switch (key) {
        case "CmdOrCtrl":
        case "CommandOrControl":
          return IS_MAC ? "⌘" : "Ctrl";
        case "Cmd":
        case "Command":
        case "Meta":
        case "Super":
          return "⌘";
        case "Ctrl":
        case "Control":
          return "Ctrl";
        case "Shift":
          return IS_MAC ? "⇧" : "Shift";
        case "Alt":
        case "Option":
          return IS_MAC ? "⌥" : "Alt";
        case "Backslash":
          return "\\";
        case "Slash":
          return "/";
        case "Backquote":
          return "`";
        case "Minus":
          return "-";
        case "Equal":
          return "=";
        case "Comma":
          return ",";
        case "Period":
          return ".";
        case "Semicolon":
          return ";";
        case "Quote":
          return "'";
        case "BracketLeft":
          return "[";
        case "BracketRight":
          return "]";
        case "Space":
          return "Space";
        case "Enter":
        case "Return":
          return IS_MAC ? "⏎" : "Enter";
        case "Backspace":
          return IS_MAC ? "⌫" : "Backspace";
        case "Tab":
          return IS_MAC ? "⇥" : "Tab";
        case "Escape":
        case "Esc":
          return "Esc";
        case "ArrowUp":
          return "↑";
        case "ArrowDown":
          return "↓";
        case "ArrowLeft":
          return "←";
        case "ArrowRight":
          return "→";
        default:
          return key;
      }
    })
    .join(IS_MAC ? "" : " + ");
}
