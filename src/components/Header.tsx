import { Settings, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { formatTokenCount, formatUsd } from "@/lib/format";
import type { TokenTotals } from "@/types";

interface Props {
  activeEmail: string | null;
  tokenTotals?: TokenTotals;
  refreshing?: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
}

export function Header({
  activeEmail,
  tokenTotals,
  refreshing,
  onRefresh,
  onOpenSettings,
}: Props) {
  const t = useT();
  return (
    <div className="drag flex items-center gap-2 border-b hairline bg-background/55 px-3.5 py-2.5 cursor-move">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent/80 shadow-sm">
        <span className="text-[11px] font-bold text-accent-foreground">CS</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[12px] font-semibold leading-none">Claude Swap</span>
        <span className="mt-1 truncate text-[10.5px] text-muted-foreground">
          {activeEmail ?? t("header.noActive")}
        </span>
        {tokenTotals && tokenTotals.total_tokens > 0 && (
          <span
            className="mt-0.5 truncate text-[9.5px] text-muted-foreground/80"
            title={`${t("header.tokensTitle")}: ${tokenTotals.total_tokens} · ${t(
              "header.cost"
            )} ${formatUsd(tokenTotals.total_cost_usd)}`}
          >
            {t("header.tokens")}: {formatTokenCount(tokenTotals.total_tokens)}
            {" · "}
            {t("header.cost")} {formatUsd(tokenTotals.total_cost_usd)}
            {" · "}
            {t("header.tokensInput")} {formatTokenCount(tokenTotals.input_tokens)}
            {" / "}
            {t("header.tokensOutput")} {formatTokenCount(tokenTotals.output_tokens)}
          </span>
        )}
      </div>
      <div className="no-drag flex items-center gap-0.5">
        <Button variant="ghost" size="icon" onClick={onRefresh} title={t("header.refresh")}>
          <RefreshCw className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
        </Button>
        <Button variant="ghost" size="icon" onClick={onOpenSettings} title={t("header.settings")}>
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
