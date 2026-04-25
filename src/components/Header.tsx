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
    <header className="drag relative shrink-0 border-b hairline bg-background/85 cursor-move">
      {/* Row 1: brand + hero cost + window actions */}
      <div className="flex h-[42px] items-center px-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-[13px] font-semibold tracking-[-0.01em]">Claude Swap</span>
          {hasTokens && (
            <span
              className="num shrink-0 text-[13px] font-semibold tracking-tight text-[hsl(var(--success))]"
              title={t("header.cost")}
            >
              {formatUsd(tokenTotals.total_cost_usd)}
            </span>
          )}
        </div>
        <div className="no-drag flex shrink-0 items-center gap-0.5">
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

      {/* Row 2: meta — version dot account count */}
      <div className="pointer-events-none flex items-center gap-1.5 px-3.5 pb-1.5 text-[10.5px] text-muted-foreground/85">
        {appVersion && <span className="num font-medium">v{appVersion}</span>}
        {appVersion && accountCount > 0 && (
          <span className="text-muted-foreground/55">·</span>
        )}
        {accountCount > 0 && (
          <span className="num">{t("header.accountCount", { count: accountCount })}</span>
        )}
        {hasTokens && (
          <>
            <span className="ml-auto" />
            <span className="num font-medium text-foreground/70">
              {formatTokenCount(tokenTotals.total_tokens)}
            </span>
            <span className="text-[9.5px] uppercase tracking-[0.08em] text-muted-foreground/65">
              tokens
            </span>
          </>
        )}
      </div>

      {/* Row 3: token breakdown stripe */}
      {hasTokens && (
        <div
          className="flex items-center gap-3 border-t hairline bg-[hsl(var(--panel-2)/0.5)] px-3.5 py-1.5 text-[10.5px] text-muted-foreground"
          title={`${t("header.tokensTitle")}: ${tokenTotals.total_tokens.toLocaleString()}`}
        >
          <TokenStat
            label={t("header.tokensInput")}
            value={formatTokenCount(tokenTotals.input_tokens)}
            dotColor="bg-[hsl(var(--success))]"
          />
          <span aria-hidden className="h-2.5 w-px bg-[hsl(var(--border))]" />
          <TokenStat
            label={t("header.tokensOutput")}
            value={formatTokenCount(tokenTotals.output_tokens)}
            dotColor="bg-[hsl(var(--accent))]"
          />
          <span aria-hidden className="h-2.5 w-px bg-[hsl(var(--border))]" />
          <TokenStat
            label={t("header.tokensCache")}
            value={formatTokenCount(tokenTotals.cache_read_tokens)}
            dotColor="bg-[hsl(var(--warning))]"
          />
        </div>
      )}
    </header>
  );
}

function TokenStat({ label, value, dotColor }: { label: string; value: string; dotColor?: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="flex items-center gap-1 text-[9.5px] uppercase tracking-[0.08em] text-muted-foreground/65">
        {dotColor && (
          <span aria-hidden className={`h-1 w-1 rounded-full ${dotColor} opacity-80`} />
        )}
        {label}
      </span>
      <span className="num text-[11px] font-medium text-foreground/85">{value}</span>
    </span>
  );
}
