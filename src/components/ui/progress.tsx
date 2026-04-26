import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/cn";

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value: number;
  indicatorClassName?: string;
}

export const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-[2px] w-full overflow-hidden bg-foreground/[0.06]",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 transition-transform duration-300",
        indicatorClassName ?? "bg-foreground"
      )}
      style={{
        transform: `translateX(-${100 - Math.min(100, Math.max(0, value))}%)`,
      }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = "Progress";
