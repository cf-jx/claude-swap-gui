import { useEffect, useState } from "react";
import * as Switch from "@radix-ui/react-switch";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n, useT, type Lang } from "@/i18n";
import { POLL_OPTIONS, normalizePollSeconds, useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/cn";
import { formatHotkey } from "@/lib/format";

interface Props {
  onBack: () => void;
}

export function SettingsView({ onBack }: Props) {
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
    <div className="flex h-full flex-col">
      <div className="drag flex items-center gap-2 border-b hairline px-3 py-2.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="no-drag"
          title={t("settings.back")}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[12px] font-semibold tracking-tight">{t("settings.title")}</span>
      </div>

      <div className="no-drag flex-1 space-y-2 overflow-y-auto p-3">
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
                "rounded-md bg-black/[0.05] px-2.5 py-1 text-[11px] font-medium tracking-wide transition-colors dark:bg-white/[0.08]",
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
              className="rounded-md bg-black/[0.05] px-2.5 py-1 text-[11px] font-medium tabular-nums transition-colors hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
              onClick={nextPoll}
            >
              {normalizePollSeconds(settings.poll_seconds)}s
            </button>
          }
        />
      </div>
    </div>
  );
}

function LangPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
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
  trailing: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-secondary/60 px-3.5 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[12px] font-medium tracking-tight">{label}</span>
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
