import { Plus, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";

interface Props {
  onAdd: () => void;
  onSwitchNext: () => void;
  hasMultiple: boolean;
  busy?: boolean;
}

export function ActionBar({ onAdd, onSwitchNext, hasMultiple, busy }: Props) {
  const t = useT();
  return (
    <div className="no-drag flex items-center gap-1.5 border-t hairline px-3 py-2.5">
      <Button variant="outline" size="sm" className="flex-1" onClick={onAdd} disabled={busy}>
        <Plus className="h-3 w-3" />
        {t("action.add")}
      </Button>
      <Button
        variant="accent"
        size="sm"
        className="flex-1"
        onClick={onSwitchNext}
        disabled={busy || !hasMultiple}
        title={hasMultiple ? t("action.switchNext") : t("action.needTwo")}
      >
        <ArrowRightLeft className="h-3 w-3" />
        {t("action.switchNext")}
      </Button>
    </div>
  );
}
