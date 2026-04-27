import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import type { Bucket } from "@/types";

interface Props {
  label: string;
  bucket: Bucket | null;
  indicatorColor?: string;
}

export function UsageBar({ label, bucket, indicatorColor }: Props) {
  const pct = bucket?.pct ?? 0;
  const countdown = bucket?.countdown?.trim();
  return (
    <div className="flex items-center gap-2">
      <span className="w-[68px] shrink-0 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">
        {label}
      </span>
      <Progress
        value={pct}
        className="h-[2px] flex-1 rounded-none bg-foreground/[0.06]"
        indicatorClassName={cn("rounded-none transition-transform", indicatorColor ?? "bg-foreground")}
      />
      <span className="num w-8 text-right text-[10.5px] font-medium text-foreground/85">
        {Math.round(pct)}%
      </span>
      <span className="num w-11 shrink-0 text-right text-[9.5px] text-muted-foreground/65">
        {countdown ?? "—"}
      </span>
    </div>
  );
}
