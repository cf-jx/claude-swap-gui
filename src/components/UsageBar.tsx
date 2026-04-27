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
      {/* Colored dot */}
      <span
        className={cn(
          "h-[5px] w-[5px] shrink-0 rounded-full",
          indicatorColor ?? "bg-foreground"
        )}
      />
      {/* Label */}
      <span className="num w-[68px] shrink-0 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">
        {label}
      </span>
      {/* Percentage */}
      <span className="num w-8 shrink-0 text-right text-[10px] font-bold text-foreground">
        {Math.round(pct)}%
      </span>
      {/* Countdown */}
      <span className="num ml-auto shrink-0 text-[9px] text-muted-foreground/65">
        {countdown ?? "\u2014"}
      </span>
    </div>
  );
}
