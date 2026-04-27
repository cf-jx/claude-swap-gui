import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { formatHotkey } from "@/lib/format";

interface Props {
  onAdd: () => void;
  onSwitchNext: () => void;
  onBackup: () => void;
  onImport: () => void;
  onValidate: () => void;
  hasMultiple: boolean;
  busy?: boolean;
  hotkey?: string;
}

export function ActionBar({
  onAdd,
  onSwitchNext,
  onBackup,
  onImport,
  onValidate,
  hasMultiple,
  busy,
  hotkey,
}: Props) {
  const t = useT();
  const hotkeyLabel = hotkey ? formatHotkey(hotkey) : "";
  return (
    <div className="no-drag shrink-0 bg-background px-3 py-2.5">
      {/* Heavy rule top */}
      <div className="rule-heavy mb-2.5" />

      {/* Primary action */}
      <Button
        variant="accent"
        size="sm"
        onClick={onSwitchNext}
        disabled={busy || !hasMultiple}
        title={hasMultiple ? t("action.switchNext") : t("action.needTwo")}
        className="relative h-[36px] w-full justify-center text-[12px] font-bold uppercase tracking-[0.14em]"
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
        <span className="num">{t("action.switchNext")}</span>
      </Button>

      {/* Secondary actions — text buttons with middots */}
      <div className="mt-2 flex items-center text-[10px] font-semibold uppercase tracking-[0.06em]">
        <div className="flex items-center gap-0">
          <button
            onClick={onAdd}
            disabled={busy}
            className="text-foreground/75 hover:text-foreground disabled:opacity-40 transition-colors"
          >
            {t("action.add")}
          </button>
          <span className="mx-1.5 text-muted-foreground/50">&middot;</span>
          <button
            onClick={onBackup}
            disabled={busy}
            className="text-foreground/75 hover:text-foreground disabled:opacity-40 transition-colors"
          >
            {t("action.backup")}
          </button>
          <span className="mx-1.5 text-muted-foreground/50">&middot;</span>
          <button
            onClick={onImport}
            disabled={busy}
            className="text-foreground/75 hover:text-foreground disabled:opacity-40 transition-colors"
          >
            {t("action.import")}
          </button>
          <span className="mx-1.5 text-muted-foreground/50">&middot;</span>
          <button
            onClick={onValidate}
            disabled={busy}
            className="text-foreground/75 hover:text-foreground disabled:opacity-40 transition-colors"
          >
            {t("action.validate")}
          </button>
        </div>
        {hotkeyLabel && hasMultiple && (
          <span className="num ml-auto text-[9px] font-medium tracking-tight text-muted-foreground/65">
            {hotkeyLabel}
          </span>
        )}
      </div>
    </div>
  );
}
