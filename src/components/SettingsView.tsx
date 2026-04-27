import { useEffect, useState, type ReactNode } from "react";
import * as Switch from "@radix-ui/react-switch";
import {
  ArrowLeft,
  ExternalLink,
  Download,
  Loader2,
  CheckCircle2,
  RefreshCw,
  X,
} from "lucide-react";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "@/components/ui/button";
import { useI18n, useT, type Lang, type MessageKey } from "@/i18n";
import { POLL_OPTIONS, normalizePollSeconds, useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/cn";
import { formatHotkey } from "@/lib/format";
import type { UpdateStatus } from "@/hooks/useUpdate";

const REPO_URL = "https://github.com/cf-jx/claude-swap-gui";
const ISSUES_URL = "https://github.com/cf-jx/claude-swap-gui/issues";

interface Props {
  onBack: () => void;
  updateStatus: UpdateStatus;
  onCheckUpdate: () => void;
  onInstallUpdate: () => void;
  appVersion: string;
}

export function SettingsView({ onBack, updateStatus, onCheckUpdate, onInstallUpdate, appVersion }: Props) {
  const t = useT();
  const { lang, setLang } = useI18n();
  const { settings, save } = useSettings();
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!recording) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === "Escape") {
        setRecording(false);
        return;
      }
      if (["Control", "Meta", "Shift", "Alt"].includes(e.key)) return;
      const keys: string[] = [];
      if (e.ctrlKey || e.metaKey) keys.push("CmdOrCtrl");
      if (e.shiftKey) keys.push("Shift");
      if (e.altKey) keys.push("Alt");
      keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      save({ hotkey: keys.join("+") });
      setRecording(false);
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, { capture: true } as AddEventListenerOptions);
  }, [recording, save]);

  const nextPoll = () => {
    const current = normalizePollSeconds(settings.poll_seconds);
    const idx = POLL_OPTIONS.findIndex((v) => v === current);
    const next = POLL_OPTIONS[(idx + 1) % POLL_OPTIONS.length];
    save({ poll_seconds: next });
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Title bar */}
      <div className="drag flex h-[42px] shrink-0 items-center gap-2 px-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="no-drag"
          title={t("settings.back")}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[11px] font-bold uppercase tracking-[0.1em]">{t("settings.title")}</span>
        <div className="no-drag ml-auto flex items-center">
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
      {/* Heavy rule below title */}
      <div className="rule-heavy shrink-0" />

      {/* Scrollable body — all sections in one list */}
      <div className="no-drag flex-1 overflow-y-auto scroll-thin px-4 py-0">
        {/* General section */}
        <Row
          label={t("settings.language")}
          desc={t("settings.language.desc")}
          trailing={
            <div className="flex items-center gap-1">
              <LangPill active={lang === "zh"} onClick={() => setLang("zh" as Lang)}>
                {t("settings.language.zh")}
              </LangPill>
              <LangPill active={lang === "en"} onClick={() => setLang("en" as Lang)}>
                {t("settings.language.en")}
              </LangPill>
            </div>
          }
        />
        <Row
          label={t("settings.autostart")}
          desc={t("settings.autostart.desc")}
          trailing={
            <SwitchRoot
              checked={settings.autostart}
              onCheckedChange={(v) => save({ autostart: v })}
            />
          }
        />
        <Row
          label={t("settings.hotkey")}
          desc={t("settings.hotkey.desc")}
          trailing={
            <button
              className={cn(
                "num rounded-[2px] border-[1.5px] border-[hsl(var(--border))] px-2.5 py-0.5 text-[10px] font-medium tracking-tight transition-colors",
                "hover:border-foreground/40",
                recording && "!border-[hsl(var(--accent))] !text-[hsl(var(--accent))] animate-pulse"
              )}
              onClick={() => setRecording((r) => !r)}
            >
              {recording
                ? t("settings.hotkey.press")
                : settings.hotkey
                  ? formatHotkey(settings.hotkey)
                  : t("settings.hotkey.empty")}
            </button>
          }
        />
        <Row
          label={t("settings.poll")}
          desc={t("settings.poll.desc")}
          trailing={
            <button
              className="num rounded-[2px] border-[1.5px] border-[hsl(var(--accent))] px-2.5 py-0.5 text-[10px] font-bold text-[hsl(var(--accent))] transition-colors hover:opacity-80"
              onClick={nextPoll}
            >
              {normalizePollSeconds(settings.poll_seconds)}s
            </button>
          }
          last
        />

        {/* Heavy rule divider between General and About */}
        <div className="rule-heavy my-0" />

        {/* About section */}
        <UpdateRow
          status={updateStatus}
          onCheck={onCheckUpdate}
          onInstall={onInstallUpdate}
          appVersion={appVersion}
          t={t}
        />
        <LinkRow
          label={t("settings.repo")}
          desc={t("settings.repo.desc")}
          onClick={() => void openUrl(REPO_URL)}
        />
        <LinkRow
          label={t("settings.feedback")}
          desc={t("settings.feedback.desc")}
          onClick={() => void openUrl(ISSUES_URL)}
          last
        />
      </div>
    </div>
  );
}

function UpdateRow({
  status,
  onCheck,
  onInstall,
  appVersion,
  t,
}: {
  status: UpdateStatus;
  onCheck: () => void;
  onInstall: () => void;
  appVersion: string;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}) {
  const currentLabel = appVersion ? `v${appVersion}` : "";
  const isAvailable = status.state === "available";
  const isDownloading = status.state === "downloading";
  const isReady = status.state === "ready";
  const isError = status.state === "error";

  let icon: ReactNode;
  let label: string;
  let desc: string;
  let action: ReactNode;

  if (isAvailable) {
    icon = <Download className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />;
    label = t("settings.update.available");
    desc = currentLabel ? `${currentLabel} \u2192 v${status.version}` : `v${status.version}`;
    action = (
      <button
        onClick={onInstall}
        className="num rounded-[2px] border-[1.5px] border-[hsl(var(--accent))] bg-[hsl(var(--accent))] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em] text-white transition-colors hover:opacity-90"
      >
        {t("settings.update.install")}
      </button>
    );
  } else if (isDownloading) {
    const pct =
      status.total && status.total > 0
        ? Math.min(100, Math.round((status.downloaded / status.total) * 100))
        : null;
    icon = <Loader2 className="h-3.5 w-3.5 animate-spin text-[hsl(var(--accent))]" />;
    label = t("settings.update.downloading");
    desc = pct !== null ? `${pct}% \u00b7 v${status.version}` : `v${status.version}`;
    action = (
      <span className="num text-[10px] text-muted-foreground">{pct ?? "\u2014"}%</span>
    );
  } else if (isReady) {
    icon = <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" />;
    label = t("settings.update.ready");
    desc = t("settings.update.relaunch");
    action = null;
  } else if (isError) {
    icon = <RefreshCw className="h-3.5 w-3.5 text-destructive" />;
    label = t("settings.update.failed");
    desc = status.message;
    action = (
      <button
        onClick={onCheck}
        className="num rounded-[2px] border-[1.5px] border-[hsl(var(--border))] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em] transition-colors hover:border-foreground/40"
      >
        {t("settings.update.retry")}
      </button>
    );
  } else if (status.state === "checking") {
    icon = <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
    label = t("settings.update.checking");
    desc = "";
    action = null;
  } else {
    icon = <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" />;
    label = t("settings.update.uptodate");
    desc = currentLabel
      ? t("settings.update.currentVersion", { v: currentLabel })
      : t("settings.update.uptodate.desc");
    action = (
      <button
        onClick={onCheck}
        className="num rounded-[2px] border-[1.5px] border-[hsl(var(--border))] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em] transition-colors hover:border-foreground/40"
      >
        {t("settings.update.check")}
      </button>
    );
  }

  return (
    <div className="flex min-h-[44px] items-center gap-2.5 border-b border-[#D4D7DD] px-0 py-3">
      <span className="shrink-0">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em]">{label}</span>
        {desc && <span className="num truncate text-[9px] text-muted-foreground">{desc}</span>}
      </div>
      {action}
    </div>
  );
}

function LinkRow({
  label,
  desc,
  onClick,
  last,
}: {
  label: string;
  desc?: string;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex min-h-[44px] w-full items-center gap-2.5 px-0 py-3 text-left transition-colors",
        !last && "border-b border-[#D4D7DD]"
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em]">{label}</span>
        {desc && (
          <span className="truncate text-[9px] text-muted-foreground">{desc}</span>
        )}
      </span>
      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/55 transition-opacity group-hover:text-foreground" />
    </button>
  );
}

function LangPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={cn(
        "rounded-[2px] border-[1.5px] px-2.5 py-0.5 text-[11px] font-medium transition-all",
        active
          ? "border-foreground bg-foreground text-white"
          : "border-[hsl(var(--border))] bg-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Row({
  label,
  desc,
  trailing,
  last,
}: {
  label: string;
  desc?: string;
  trailing: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[44px] items-center gap-3 px-0 py-3",
        !last && "border-b border-[#D4D7DD]"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em]">{label}</span>
        {desc && <span className="text-[9px] text-muted-foreground">{desc}</span>}
      </div>
      {trailing}
    </div>
  );
}

function SwitchRoot(props: Switch.SwitchProps) {
  return (
    <Switch.Root
      {...props}
      className={cn(
        "relative inline-flex h-[18px] w-[34px] shrink-0 items-center rounded-[2px] bg-black/[0.12] transition-colors dark:bg-white/[0.15]",
        "data-[state=checked]:bg-[hsl(var(--success))]"
      )}
    >
      <Switch.Thumb className="block h-3.5 w-3.5 translate-x-[2px] rounded-[2px] bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[16px]" />
    </Switch.Root>
  );
}
