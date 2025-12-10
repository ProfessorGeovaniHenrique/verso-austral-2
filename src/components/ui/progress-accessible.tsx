/**
 * Progress Bar com ARIA completo
 * Sprint AUDIT - UX-A03
 */

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

interface ProgressAccessibleProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
}

const ProgressAccessible = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressAccessibleProps
>(({ className, value = 0, max = 100, label, showPercentage = false, ...props }, ref) => {
  const percentage = Math.round((value / max) * 100);
  const ariaValueText = label 
    ? `${label}: ${percentage}%` 
    : `${percentage}% completo`;

  return (
    <div className="space-y-1">
      {(label || showPercentage) && (
        <div className="flex justify-between text-xs text-muted-foreground">
          {label && <span>{label}</span>}
          {showPercentage && <span>{percentage}%</span>}
        </div>
      )}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
          className
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={ariaValueText}
        aria-label={label || "Progresso"}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className="h-full w-full flex-1 bg-primary transition-all"
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
});

ProgressAccessible.displayName = "ProgressAccessible";

export { ProgressAccessible };
