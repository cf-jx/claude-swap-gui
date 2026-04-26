import { Activity, ArrowRightLeft, Archive, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { formatHotkey } from "@/lib/format";

interface Props {
  onAdd: () => void;
  onSwitchNext: () => void;
  onBackup: () => void;
  onValidate: () => void;
  hasMultiple: boolean;
  busy?: boolean;
  hotkey?: string;
}

export function ActionBar({
  onAdd,
  onSwitchNext,
  onBackup,
  onValidate,
  hasMultiple,
  busy,
  hotkey,
}: Props) {
  const t = useT();
  const hotkeyLabel = hotkey ? formatHotkey(hotkey) : "";
  return (
    <div className="no-drag shrink-0 space-y-1.5 border-t hairline-strong bg-background px-3 py-2.5">
      <Button
        variant="accent"
        size="sm"
        onClick={onSwitchNext}
        disabled={busy || !hasMultiple}
        title={hasMultiple ? t("action.switchNext") : t("action.needTwo")}
        className="relative h-9 w-full justify-center text-[12px] font-bold uppercase tracking-[0.08em]"
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
        <span>{t("action.switchNext")}</span>
        {hotkeyLabel && hasMultiple && (
          <span className="num pointer-events-none absolute right-2 bg-white/15 px-1.5 py-0.5 text-[9.5px] font-medium tracking-tight text-white/80">
            {hotkeyLabel}
          </span>
        )}
      </Button>
      <div className="grid grid-cols-3 gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={busy}
          className="h-7 text-[10.5px] font-semibold uppercase tracking-[0.06em]"
        >
          <Plus className="h-3 w-3" />
          {t("action.add")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onBackup}
          disabled={busy}
          className="h-7 text-[10.5px] font-semibold uppercase tracking-[0.06em]"
        >
          <Archive className="h-3 w-3" />
          {t("action.backup")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onValidate}
          disabled={busy}
          className="h-7 text-[10.5px] font-semibold uppercase tracking-[0.06em]"
        >
          <Activity className="h-3 w-3" />
          {t("action.validate")}
        </Button>
      </div>
    </div>
  );
}
