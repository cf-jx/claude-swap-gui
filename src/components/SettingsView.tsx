import { useEffect, useState, type ReactNode } from "react";
import * as Switch from "@radix-ui/react-switch";
import {
  ArrowLeft,
  Github,
  ExternalLink,
  Download,
  Loader2,
  CheckCircle2,
  RefreshCw,
  X,
  SlidersHorizontal,
  Info,
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
type SettingsSection = "general" | "about";

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
  const [section, setSection] = useState<SettingsSection>("general");

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
    <div className="flex h-full flex-col">
      {/* Title bar */}
      <div className="drag flex h-[42px] shrink-0 items-center gap-2 border-b hairline bg-background/85 px-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="no-drag"
          title={t("settings.back")}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[13px] font-semibold tracking-[-0.01em]">{t("settings.title")}</span>
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

      {/* Horizontal tabs */}
      <div className="no-drag flex shrink-0 items-center gap-0.5 border-b hairline bg-background/85 px-3 pb-1.5 pt-1">
        <Tab
          active={section === "general"}
          icon={<SlidersHorizontal className="h-3 w-3" />}
          label={t("settings.general")}
          onClick={() => setSection("general")}
        />
        <Tab
          active={section === "about"}
          icon={<Info className="h-3 w-3" />}
          label={t("settings.about")}
          onClick={() => setSection("about")}
        />
      </div>

      {/* Body */}
      <div className="no-drag flex-1 overflow-y-auto bg-[hsl(var(--panel))] px-3 py-2.5">
        {section === "general" ? (
          <div className="space-y-1.5">
            <Row
              label={t("settings.language")}
              desc={t("settings.language.desc")}
              trailing={
                <div className="flex items-center gap-0.5 rounded-full bg-black/[0.06] p-0.5 dark:bg-white/[0.08]">
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
                    "num rounded-lg bg-black/[0.055] px-2.5 py-1 text-[11px] font-medium tracking-tight transition-colors dark:bg-white/[0.08]",
                    "hover:bg-black/[0.08] dark:hover:bg-white/[0.12]",
                    recording && "!bg-accent/10 !text-accent animate-pulse"
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
                  className="num rounded-lg bg-black/[0.055] px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
                  onClick={nextPoll}
                >
                  {normalizePollSeconds(settings.poll_seconds)}s
                </button>
              }
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <UpdateRow
              status={updateStatus}
              onCheck={onCheckUpdate}
              onInstall={onInstallUpdate}
              appVersion={appVersion}
              t={t}
            />
            <LinkRow
              icon={<Github className="h-3.5 w-3.5" />}
              label={t("settings.repo")}
              desc={t("settings.repo.desc")}
              onClick={() => void openUrl(REPO_URL)}
            />
            <LinkRow
              icon={<ExternalLink className="h-3.5 w-3.5" />}
              label={t("settings.feedback")}
              desc={t("settings.feedback.desc")}
              onClick={() => void openUrl(ISSUES_URL)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Tab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11.5px] font-medium transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span className={active ? "text-[hsl(var(--accent))]" : "text-muted-foreground"}>{icon}</span>
      <span>{label}</span>
      {active && (
        <span className="absolute -bottom-1.5 left-1.5 right-1.5 h-[1.5px] rounded-full bg-[hsl(var(--accent))]" />
      )}
    </button>
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
    desc = currentLabel ? `${currentLabel} → v${status.version}` : `v${status.version}`;
    action = (
      <button
        onClick={onInstall}
        className="rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground transition-colors hover:opacity-90"
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
    desc = pct !== null ? `${pct}% · v${status.version}` : `v${status.version}`;
    action = (
      <span className="num text-[10.5px] text-muted-foreground">{pct ?? "—"}%</span>
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
        className="rounded-md bg-black/[0.05] px-2.5 py-1 text-[11px] font-medium hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
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
        className="rounded-md bg-black/[0.05] px-2.5 py-1 text-[11px] font-medium hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
      >
        {t("settings.update.check")}
      </button>
    );
  }

  return (
    <div className="card-material flex min-h-[52px] items-center gap-2.5 rounded-xl px-3 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--panel-2))]">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-[12px] font-semibold">{label}</span>
        {desc && <span className="num truncate text-[10.5px] text-muted-foreground">{desc}</span>}
      </div>
      {action}
    </div>
  );
}

function LinkRow({
  icon,
  label,
  desc,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  desc?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card-material group flex min-h-[52px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:-translate-y-px"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--panel-2))] text-muted-foreground group-hover:text-foreground">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-[12px] font-semibold">{label}</span>
        {desc && (
          <span className="truncate text-[10.5px] text-muted-foreground">{desc}</span>
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
        "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
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
}: {
  label: string;
  desc?: string;
  trailing: ReactNode;
}) {
  return (
    <div className="card-material flex min-h-[52px] items-center gap-3 rounded-xl px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-[12px] font-semibold">{label}</span>
        {desc && <span className="text-[10.5px] text-muted-foreground">{desc}</span>}
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
        "relative inline-flex h-[18px] w-[30px] shrink-0 items-center rounded-full bg-black/[0.12] transition-colors dark:bg-white/[0.15]",
        "data-[state=checked]:bg-[hsl(142_71%_45%)]"
      )}
    >
      <Switch.Thumb className="block h-3.5 w-3.5 translate-x-[2px] rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[13px]" />
    </Switch.Root>
  );
}
