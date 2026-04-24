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
      <span className="w-6 shrink-0 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <Progress
        value={pct}
        className="h-1 flex-1"
        indicatorClassName={cn("rounded-full", indicatorColor ?? "bg-foreground")}
      />
      <span className="w-8 text-right text-[10px] font-medium tabular-nums text-foreground/80">
        {Math.round(pct)}%
      </span>
      {countdown && (
        <span className="w-12 shrink-0 text-right text-[9.5px] tabular-nums text-muted-foreground/70">
          {countdown}
        </span>
      )}
    </div>
  );
}
