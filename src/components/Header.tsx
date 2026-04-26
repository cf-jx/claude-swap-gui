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
      className="drag relative shrink-0 border-b hairline-strong bg-background cursor-move"
    >
      {/* Masthead — Swiss wordmark */}
      <div data-tauri-drag-region className="flex h-[38px] items-center px-3">
        <span
          data-tauri-drag-region
          className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground"
        >
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

      {/* Stat strip — dominant USD as the typographic hero */}
      {hasTokens && (
        <div
          data-tauri-drag-region
          className="flex items-baseline gap-4 border-t hairline px-3 py-2"
          title={`${t("header.tokensTitle")}: ${tokenTotals.total_tokens.toLocaleString()}`}
        >
          <div className="flex items-baseline gap-1.5">
            <span className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
              SPENT
            </span>
            <span className="num text-[16px] font-semibold tracking-tight text-foreground">
              {formatUsd(tokenTotals.total_cost_usd)}
            </span>
          </div>
          <span aria-hidden className="h-3 w-px bg-[hsl(var(--border))]" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
              TOKENS
            </span>
            <span className="num text-[13px] font-medium tracking-tight text-foreground/85">
              {formatTokenCount(tokenTotals.total_tokens)}
            </span>
          </div>
        </div>
      )}

      {/* Meta — version + count, quietest line */}
      <div
        data-tauri-drag-region
        className="pointer-events-none flex items-center gap-1.5 border-t hairline px-3 py-1 text-[10px] text-muted-foreground/65"
      >
        {appVersion && <span className="num font-medium">v{appVersion}</span>}
        {appVersion && accountCount > 0 && <span>·</span>}
        {accountCount > 0 && (
          <span className="num">{t("header.accountCount", { count: accountCount })}</span>
        )}
      </div>
    </header>
  );
}
