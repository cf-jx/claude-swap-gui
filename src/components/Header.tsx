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
      className="drag relative shrink-0 bg-background cursor-move"
    >
      {/* Top bar — brand left, cost right */}
      <div data-tauri-drag-region className="flex h-[36px] items-center px-3">
        <span
          data-tauri-drag-region
          className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground"
        >
          Claude Swap
        </span>
        {hasTokens && (
          <div
            data-tauri-drag-region
            className="ml-auto flex items-baseline gap-3 mr-1"
            title={`${t("header.tokensTitle")}: ${tokenTotals.total_tokens.toLocaleString()}`}
          >
            <span className="num text-[11px] font-semibold text-foreground">
              {formatUsd(tokenTotals.total_cost_usd)}
            </span>
            <span className="num text-[10px] font-medium text-muted-foreground">
              {formatTokenCount(tokenTotals.total_tokens)} TKN
            </span>
          </div>
        )}
      </div>

      {/* Heavy rule */}
      <div className="rule-heavy" />

      {/* Sub-header — version+count left, icons right */}
      <div data-tauri-drag-region className="flex h-[28px] items-center px-3">
        <div
          data-tauri-drag-region
          className="pointer-events-none flex items-center gap-1 text-[9px] text-muted-foreground"
        >
          {appVersion && <span className="num font-medium">v{appVersion}</span>}
          {appVersion && accountCount > 0 && <span>·</span>}
          {accountCount > 0 && (
            <span className="num">{t("header.accountCount", { count: accountCount })}</span>
          )}
        </div>
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
              <span className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 bg-[hsl(var(--destructive))] ring-2 ring-background" />
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

      {/* Light rule */}
      <div className="rule-light" />
    </header>
  );
}
