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
}

export function Header({ tokenTotals, refreshing, onRefresh, onOpenSettings, hasUpdate }: Props) {
  const t = useT();
  return (
    <div className="drag relative flex items-center border-b hairline bg-background/55 px-3.5 py-2.5 cursor-move">
      <div className="pointer-events-none flex flex-1 flex-col items-center gap-1">
        <span className="text-[12px] font-semibold leading-none tracking-tight">Claude Swap</span>
        {tokenTotals && tokenTotals.total_tokens > 0 && (
          <div
            className="flex flex-col items-center gap-0.5"
            title={`${t("header.tokensTitle")}: ${tokenTotals.total_tokens.toLocaleString()}`}
          >
            <div className="flex items-center gap-1.5">
              <span className="rounded-md bg-[hsl(var(--success)/0.12)] px-1.5 py-px text-[10px] font-semibold tabular-nums text-[hsl(var(--success))]">
                {formatUsd(tokenTotals.total_cost_usd)}
              </span>
              <span className="rounded-md bg-muted px-1.5 py-px text-[10px] font-medium tabular-nums text-muted-foreground">
                {formatTokenCount(tokenTotals.total_tokens)} tok
              </span>
            </div>
            <span className="text-[9.5px] tabular-nums text-muted-foreground/80">
              {t("header.tokensInput")} {formatTokenCount(tokenTotals.input_tokens)}
              {" · "}
              {t("header.tokensOutput")} {formatTokenCount(tokenTotals.output_tokens)}
              {" · "}
              {t("header.tokensCache")} {formatTokenCount(tokenTotals.cache_read_tokens)}
            </span>
          </div>
        )}
      </div>
      <div className="no-drag absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
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
  );
}
