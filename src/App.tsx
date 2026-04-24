import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster, toast } from "sonner";
import { listen } from "@tauri-apps/api/event";
import { AccountCard } from "@/components/AccountCard";
import { ActionBar } from "@/components/ActionBar";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { SettingsView } from "@/components/SettingsView";
import { LanguageProvider, useT } from "@/i18n";
import { useAccounts } from "@/hooks/useAccounts";
import { useSettings } from "@/hooks/useSettings";
import { ipc } from "@/lib/ipc";
import type { Account, AccountsSnapshot, UsageState } from "@/types";

export default function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  );
}

function AppInner() {
  const t = useT();
  const { settings } = useSettings();
  const pollMs = Math.max(5, settings.poll_seconds) * 1000;

  const { data, loading, error, refresh, patchUsage } = useAccounts(pollMs);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"list" | "settings">("list");

  useEffect(() => {
    const unlistenP = listen<{ ok: boolean; action: string; email?: string; error?: string }>(
      "cswap://action-result",
      (evt) => {
        const p = evt.payload;
        if (p.ok && p.action === "switch_next") {
          toast.success(
            p.email
              ? t("toast.switched", { email: p.email })
              : t("toast.switchedNext")
          );
          refresh();
        } else if (!p.ok) {
          toast.error(p.error ?? t("toast.actionFailed"));
        }
      }
    );
    return () => {
      unlistenP.then((un) => un());
    };
  }, [refresh, t]);

  const doAction = useCallback(
    async (fn: () => Promise<unknown>, successMsg: string) => {
      if (busy) return;
      setBusy(true);
      try {
        await fn();
        toast.success(successMsg);
        await refresh();
      } catch (e) {
        toast.error(String(e).replace(/^Error: /, ""));
      } finally {
        setBusy(false);
      }
    },
    [busy, refresh]
  );

  const handleSwitch = useCallback(
    (acc: Account) =>
      doAction(() => ipc.switchTo(String(acc.slot)), t("toast.switched", { email: acc.email })),
    [doAction, t]
  );
  const handleSwitchNext = useCallback(
    () => doAction(() => ipc.switchNext(), t("toast.switchedNext")),
    [doAction, t]
  );
  const handleAdd = useCallback(
    () => doAction(() => ipc.addCurrent(), t("toast.added")),
    [doAction, t]
  );
  const handleRemove = useCallback(
    async (acc: Account) => {
      if (!confirm(t("toast.confirmRemove", { email: acc.email }))) return;
      await doAction(() => ipc.removeAccount(String(acc.slot)), t("toast.removed", { email: acc.email }));
    },
    [doAction, t]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className="mac-shadow flex h-full w-full flex-col overflow-hidden rounded-2xl border hairline bg-background/85 backdrop-blur-2xl backdrop-saturate-150"
    >
      {view === "settings" ? (
        <SettingsView onBack={() => setView("list")} />
      ) : (
        <ListView
          data={data}
          loading={loading}
          error={error}
          busy={busy}
          onRefresh={refresh}
          onOpenSettings={() => setView("settings")}
          onSwitch={handleSwitch}
          onSwitchNext={handleSwitchNext}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onUsagePatch={patchUsage}
        />
      )}
      <Toaster
        position="bottom-center"
        theme="system"
        toastOptions={{ className: "text-xs" }}
        richColors
      />
    </motion.div>
  );
}

interface ListProps {
  data: AccountsSnapshot | null;
  loading: boolean;
  error: string | null;
  busy: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onSwitch: (a: Account) => void;
  onSwitchNext: () => void;
  onAdd: () => void;
  onRemove: (a: Account) => void;
  onUsagePatch: (slot: number, usage: UsageState) => void;
}

function ListView({
  data,
  loading,
  error,
  busy,
  onRefresh,
  onOpenSettings,
  onSwitch,
  onSwitchNext,
  onAdd,
  onRemove,
  onUsagePatch,
}: ListProps) {
  const t = useT();
  const accounts = data?.accounts ?? [];
  const activeEmail = data?.active_email ?? null;
  const hasMultiple = accounts.length >= 2;

  const showEmpty = useMemo(() => {
    if (!data) return false;
    if (data.empty) return true;
    return false;
  }, [data]);

  return (
    <>
      <Header
        activeEmail={activeEmail}
        tokenTotals={data?.token_totals}
        refreshing={loading && data !== null}
        onRefresh={onRefresh}
        onOpenSettings={onOpenSettings}
      />

      {error && !data && (
        <div className="px-3 py-3 text-[11px] text-destructive">
          {t("list.readFailed", { error })}
        </div>
      )}

      {showEmpty ? (
        <EmptyState
          cswapMissing={data?.cswap_missing ?? false}
          noActiveLogin={data?.no_active_login ?? false}
          empty={data?.empty ?? false}
          onAdd={onAdd}
        />
      ) : (
        <div className="drag flex-1 space-y-1.5 overflow-y-auto p-3">
          <AnimatePresence initial={false}>
            {accounts.map((acc, index) => (
              <motion.div
                key={acc.slot}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AccountCard
                  account={acc}
                  orderNumber={index + 1}
                  onSwitch={onSwitch}
                  onRemove={onRemove}
                  onUsagePatch={onUsagePatch}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && !accounts.length && (
            <div className="py-8 text-center text-[11px] text-muted-foreground">
              {t("list.loading")}
            </div>
          )}
        </div>
      )}

      {!showEmpty && (
        <ActionBar
          onAdd={onAdd}
          onSwitchNext={onSwitchNext}
          hasMultiple={hasMultiple}
          busy={busy}
        />
      )}
    </>
  );
}
