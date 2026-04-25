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
    <div className="flex items-center gap-2.5">
      <span className="num w-[60px] shrink-0 whitespace-nowrap text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/75">
        {label}
      </span>
      <Progress
        value={pct}
        className="h-1.5 flex-1 bg-black/[0.05] dark:bg-white/[0.06]"
        indicatorClassName={cn("rounded-full transition-transform", indicatorColor ?? "bg-foreground")}
      />
      <span className="num w-9 text-right text-[10.5px] font-medium text-foreground/85">
        {Math.round(pct)}%
      </span>
      <span className="num w-12 shrink-0 text-right text-[10px] text-muted-foreground/70">
        {countdown ?? "—"}
      </span>
    </div>
  );
}
