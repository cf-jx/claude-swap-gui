import { Settings, RefreshCw, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { formatTokenCount, formatUsd } from "@/lib/format";
import type { TokenTotals } from "@/types";

interface Props {
  tokenTotals?: TokenTotals;
  refreshing?: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  hasUpdate?: boolean;
  appVersion?: string;
  accountCount?: number;
}

export function Header({
  tokenTotals,
  refreshing,
  onRefresh,
  onOpenSettings,
  hasUpdate,
  appVersion,
  accountCount = 0,
}: Props) {
  const t = useT();
  const hasTokens = !!tokenTotals && tokenTotals.total_tokens > 0;

  return (
    <header
      data-tauri-drag-region
      className="drag relative shrink-0 border-b hairline bg-background/85 cursor-move"
    >
      {/* Row 1: brand + window actions only — no metric clutter on the title line */}
      <div data-tauri-drag-region className="flex h-[40px] items-center px-3.5">
        <span data-tauri-drag-region className="text-[13px] font-semibold tracking-[-0.01em]">
          Claude Swap
        </span>
        <div className="no-drag ml-auto flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={onRefresh} title={t("header.refresh")}>
            <RefreshCw className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            title={hasUpdate ? t("header.settingsUpdateAvailable") : t("header.settings")}
            className="relative"
          >
            <Settings className="h-3.5 w-3.5" />
            {hasUpdate && (
              <span className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[hsl(var(--destructive))] ring-2 ring-background" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              void getCurrentWindow().hide();
            }}
            title={t("header.close")}
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Row 2: stat strip — the story is "what got spent / how many tokens" */}
      {hasTokens && (
        <div
          data-tauri-drag-region
          className="flex items-baseline gap-3 border-t hairline bg-[hsl(var(--panel-2)/0.5)] px-3.5 py-1.5"
          title={`${t("header.tokensTitle")}: ${tokenTotals.total_tokens.toLocaleString()}`}
        >
          <Stat label="SPENT" value={formatUsd(tokenTotals.total_cost_usd)} valueClass="text-[hsl(var(--success))]" />
          <span aria-hidden className="h-2.5 w-px bg-[hsl(var(--border))]" />
          <Stat label="TOKENS" value={formatTokenCount(tokenTotals.total_tokens)} />
        </div>
      )}

      {/* Row 3: meta — version + account count, demoted to a quiet line */}
      <div
        data-tauri-drag-region
        className="pointer-events-none flex items-center gap-1.5 px-3.5 py-1 text-[10px] text-muted-foreground/75"
      >
        {appVersion && <span className="num font-medium">v{appVersion}</span>}
        {appVersion && accountCount > 0 && (
          <span className="text-muted-foreground/50">·</span>
        )}
        {accountCount > 0 && (
          <span className="num">{t("header.accountCount", { count: accountCount })}</span>
        )}
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
        {label}
      </span>
      <span className={`num text-[13px] font-semibold tracking-tight ${valueClass ?? "text-foreground"}`}>
        {value}
      </span>
    </span>
  );
}
