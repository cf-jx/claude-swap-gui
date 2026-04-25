import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster, toast } from "sonner";
import { listen } from "@tauri-apps/api/event";
import { getVersion } from "@tauri-apps/api/app";
import { AccountCard } from "@/components/AccountCard";
import { ActionBar } from "@/components/ActionBar";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { SettingsView } from "@/components/SettingsView";
import { LanguageProvider, useT } from "@/i18n";
import { useAccounts } from "@/hooks/useAccounts";
import { useSettings } from "@/hooks/useSettings";
import { useUpdate } from "@/hooks/useUpdate";
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
  const update = useUpdate();
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"list" | "settings">("list");
  const [appVersion, setAppVersion] = useState<string>("");
  const accountsKey = useMemo(() => {
    if (!data) return "";
    return `${data.active_slot ?? "none"}:${data.accounts.map((acc) => acc.slot).join(",")}`;
  }, [data]);

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion(""));
  }, []);

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

  useEffect(() => {
    if (!data?.accounts.length) return;
    let cancelled = false;
    const queue = [...data.accounts];
    const workerCount = Math.min(3, queue.length);

    const runWorker = async () => {
      while (!cancelled) {
        const account = queue.shift();
        if (!account) return;
        if (account.usage.status === "no_credentials") continue;
        try {
          const usage = await ipc.refreshUsage(account.slot);
          if (!cancelled) patchUsage(account.slot, usage);
        } catch {
          // Keep the card-level refresh button as the explicit error surface.
        }
      }
    };

    void Promise.all(Array.from({ length: workerCount }, runWorker));
    return () => {
      cancelled = true;
    };
  }, [accountsKey, patchUsage]);

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
    async () => {
      if (busy) return;
      setBusy(true);
      try {
        const slot = await ipc.addCurrent();
        toast.success(t("toast.addedSlot", { slot: String(slot) }));
        await refresh();
      } catch (e) {
        toast.error(String(e).replace(/^Error: /, ""));
      } finally {
        setBusy(false);
      }
    },
    [busy, refresh, t]
  );
  const handleBackup = useCallback(async () => {
    if (busy) return;
    const destination = prompt(t("backup.prompt"));
    if (!destination) return;
    setBusy(true);
    try {
      const summary = await ipc.backupAccounts(destination);
      toast.success(
        t("backup.done", {
          accounts: String(summary.accounts),
          credentials: String(summary.credentials),
          path: summary.path,
        })
      );
    } catch (e) {
      toast.error(String(e).replace(/^Error: /, ""));
    } finally {
      setBusy(false);
    }
  }, [busy, t]);
  const handleValidate = useCallback(async () => {
    if (busy || !data?.accounts.length) return;
    setBusy(true);
    try {
      const results = await Promise.all(
        data.accounts.map(async (account) => {
          const usage = await ipc.refreshUsage(account.slot);
          patchUsage(account.slot, usage);
          return usage;
        })
      );
      const invalid = results.filter((usage) => usage.status !== "ok").length;
      if (invalid > 0) {
        toast.error(t("validate.failed", { count: String(invalid) }));
      } else {
        toast.success(t("validate.done"));
      }
    } catch (e) {
      toast.error(String(e).replace(/^Error: /, ""));
    } finally {
      setBusy(false);
    }
  }, [busy, data?.accounts, patchUsage, t]);
  const handleRemove = useCallback(
    (acc: Account) => {
      toast(t("toast.confirmRemove", { email: acc.email }), {
        action: {
          label: t("action.remove"),
          onClick: () => {
            void doAction(
              () => ipc.removeAccount(String(acc.slot)),
              t("toast.removed", { email: acc.email })
            );
          },
        },
        cancel: {
          label: t("action.cancel"),
          onClick: () => {},
        },
      });
    },
    [doAction, t]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className="mac-shadow flex h-full w-full flex-col overflow-hidden rounded-[20px] border hairline bg-background/92 backdrop-blur-2xl backdrop-saturate-150"
    >
      {view === "settings" ? (
        <SettingsView
          onBack={() => setView("list")}
          updateStatus={update.status}
          onCheckUpdate={update.checkNow}
          onInstallUpdate={update.installNow}
          appVersion={appVersion}
        />
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
          onBackup={handleBackup}
          onValidate={handleValidate}
          onRemove={handleRemove}
          onUsagePatch={patchUsage}
          hasUpdate={update.hasUpdate}
          appVersion={appVersion}
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
  onBackup: () => void;
  onValidate: () => void;
  onRemove: (a: Account) => void;
  onUsagePatch: (slot: number, usage: UsageState) => void;
  hasUpdate: boolean;
  appVersion: string;
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
  onBackup,
  onValidate,
  onRemove,
  onUsagePatch,
  hasUpdate,
  appVersion,
}: ListProps) {
  const t = useT();
  const accounts = data?.accounts ?? [];
  const hasMultiple = accounts.length >= 2;

  const showEmpty = useMemo(() => {
    if (!data) return false;
    if (data.empty) return true;
    return false;
  }, [data]);

  return (
    <>
      <Header
        tokenTotals={data?.token_totals}
        refreshing={loading && data !== null}
        onRefresh={onRefresh}
        onOpenSettings={onOpenSettings}
        hasUpdate={hasUpdate}
        appVersion={appVersion}
      />

      {error && !data && (
        <div className="px-3 py-3 text-[11px] text-destructive">
          {t("list.readFailed", { error })}
        </div>
      )}

      {showEmpty ? (
        <EmptyState
          noActiveLogin={data?.no_active_login ?? false}
          empty={data?.empty ?? false}
          onAdd={onAdd}
        />
      ) : (
        <div className="drag flex-1 space-y-2 overflow-y-auto bg-[hsl(var(--panel))] p-3">
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
          onBackup={onBackup}
          onValidate={onValidate}
          hasMultiple={hasMultiple}
          busy={busy}
        />
      )}
    </>
  );
}
