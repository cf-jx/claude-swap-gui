import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, Trash2, AlertCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UsageBar } from "@/components/UsageBar";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";
import { ipc } from "@/lib/ipc";
import { usageColor } from "@/lib/format";
import type { Account, UsageState } from "@/types";

interface Props {
  account: Account;
  orderNumber: number;
  onSwitch: (account: Account) => Promise<void> | void;
  onRemove: (account: Account) => Promise<void> | void;
  onUsagePatch: (slot: number, usage: UsageState) => void;
}

export function AccountCard({ account, orderNumber, onSwitch, onRemove, onUsagePatch }: Props) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleClick = async () => {
    if (account.is_active || busy) return;
    setBusy(true);
    try {
      await onSwitch(account);
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (refreshing) return;
    setRefreshing(true);
    try {
      const usage = await ipc.refreshUsage(account.slot);
      onUsagePatch(account.slot, usage);
      if (usage.status === "no_credentials") {
        toast.message(t("toast.noCredentials"));
      } else if (usage.status === "unavailable") {
        toast.error(usage.message || t("account.usageUnavailable"));
      } else {
        toast.success(t("toast.refreshed"));
      }
    } catch (err) {
      toast.error(String(err).replace(/^Error: /, ""));
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await onRemove(account);
    } finally {
      setBusy(false);
    }
  };

  const usage = account.usage;
  const hasUsage = usage.status === "ok";
  const buckets = hasUsage ? usage.buckets : [];
  const hasAnyBucket = buckets.length > 0;
  const plan = hasUsage ? usage.plan ?? null : null;
  const indexLabel = String(orderNumber).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12 }}
      className={cn(
        "no-drag group relative overflow-hidden py-2.5 px-3 transition-colors duration-100",
        account.is_active
          ? "border-l-[3px] border-l-[hsl(var(--accent))] pl-[12px]"
          : "cursor-pointer hover:bg-foreground/[0.03]"
      )}
      onClick={handleClick}
    >
      {/* Watermark number */}
      <span
        className={cn(
          "watermark",
          account.is_active ? "watermark-active" : "watermark-inactive"
        )}
      >
        {indexLabel}
      </span>

      {/* Content */}
      <div className="relative">
        {/* Email + plan + actions */}
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-semibold tracking-[-0.01em]",
              account.is_active ? "text-[14px]" : "text-[12px]"
            )}
          >
            {account.email}
          </span>
          <div className="flex shrink-0 items-center gap-0.5">
            {plan && (
              <span className="num mr-0.5 shrink-0 border border-border px-1.5 py-px text-[8.5px] font-bold uppercase tracking-[0.1em] text-foreground/75">
                {plan}
              </span>
            )}
            {account.is_active && (
              <span className="mr-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--accent))]">
                <span className="h-[5px] w-[5px] bg-[hsl(var(--accent))]" />
                {t("account.active")}
              </span>
            )}
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={handleRefresh}
                  title={t("account.refresh")}
                >
                  <RefreshCw
                    className={cn("h-3 w-3", refreshing && "animate-spin text-accent")}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                  onClick={handleRemove}
                  title={t("account.remove")}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Usage rows */}
        <div className="mt-1.5">
          {hasUsage && hasAnyBucket ? (
            <div className="space-y-1">
              {buckets.map((b) => (
                <UsageBar
                  key={b.key}
                  label={b.label}
                  bucket={b}
                  indicatorColor={usageColor(b.pct)}
                />
              ))}
            </div>
          ) : usage.status === "no_credentials" ? (
            <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span className="truncate">{t("account.noCredentials")}</span>
            </div>
          ) : usage.status === "unavailable" && !usage.message?.trim() ? (
            <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground/70">
              <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
              <span className="truncate">{t("account.usageLoading")}</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground"
              title={usage.status === "unavailable" ? usage.message : undefined}
            >
              <AlertTriangle className="h-3 w-3 shrink-0 text-[hsl(var(--warning))]" />
              <span className="truncate">{t("account.usageFailed")}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
