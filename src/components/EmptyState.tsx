import { Users, Terminal, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";

interface Props {
  cswapMissing: boolean;
  noActiveLogin: boolean;
  empty: boolean;
  onAdd: () => void;
}

export function EmptyState({ cswapMissing, noActiveLogin, empty, onAdd }: Props) {
  const t = useT();

  if (noActiveLogin && empty) {
    return (
      <div className="drag flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Terminal className="h-8 w-8 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{t("empty.noLogin.title")}</h3>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("empty.noLogin.desc")}
        </p>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="drag flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Users className="h-8 w-8 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{t("empty.noAccounts.title")}</h3>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("empty.noAccounts.desc")}
        </p>
        <Button variant="accent" size="sm" onClick={onAdd} className="no-drag">
          {t("empty.noAccounts.add")}
        </Button>
      </div>
    );
  }

  if (cswapMissing) {
    return (
      <div className="drag flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Info className="h-6 w-6 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{t("empty.cswapMissing.title")}</h3>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("empty.cswapMissing.desc")}
        </p>
      </div>
    );
  }

  return null;
}
