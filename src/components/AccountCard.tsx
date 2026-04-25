import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, Trash2, AlertCircle } from "lucide-react";
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14 }}
      className={cn(
        "no-drag group relative overflow-hidden rounded-[18px] border px-3 py-2.5 shadow-[0_1px_10px_rgba(15,23,42,0.035)] transition-all",
        account.is_active
          ? "border-accent/28 bg-accent/[0.075] ring-1 ring-inset ring-accent/18"
          : "cursor-pointer border-transparent bg-background/72 hover:border-border/70 hover:bg-background/92"
      )}
      onClick={handleClick}
    >
      {/* Row 1: sequence number + email + active + actions */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
            account.is_active
              ? "bg-accent text-accent-foreground shadow-[0_0_0_4px_hsl(var(--accent)/0.13)]"
              : "bg-muted text-muted-foreground ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.06]"
          )}
        >
          {orderNumber}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {account.email}
        </span>

        <div className="flex shrink-0 items-center gap-0.5">
          {account.is_active && (
            <span className="mr-1 rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold text-accent">
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

      {/* Row 2: org subline */}
      {account.organization_name && (
        <div className="mt-0.5 truncate pl-7 text-[10.5px] font-normal text-muted-foreground">
          {account.organization_name}
        </div>
      )}

      {/* Row 3+: usage or friendly missing-credentials hint */}
      <div className="mt-2 pl-7">
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
          <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground/80">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span className="truncate">{t("account.noCredentials")}</span>
          </div>
        ) : (
          <div className="text-[10.5px] text-muted-foreground/80">
            {t("account.usageUnavailable")}
          </div>
        )}
      </div>
    </motion.div>
  );
}
