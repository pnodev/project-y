import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "~/lib/utils";
import { CircleCheckBig } from "lucide-react";

type ProgressVariant = "default" | "card-progress";

interface ProgressProps
  extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  variant?: ProgressVariant;
}

function Progress({
  className,
  value,
  variant = "default",
  ...props
}: ProgressProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <ProgressPrimitive.Root
        data-slot="progress"
        className={cn(
          variant === "default" && "bg-primary/20 h-2",
          variant === "card-progress" && "bg-gray-200 h-[3px]",
          "relative w-full overflow-hidden rounded-full"
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={cn(
            variant === "default" && "bg-primary",
            variant === "card-progress" && (value || 0) < 100 && "bg-gray-400",
            variant === "card-progress" &&
              (value || 0) === 100 &&
              "bg-indigo-500",
            "h-full w-full flex-1 transition-all"
          )}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      </ProgressPrimitive.Root>
      {value === 100 ? (
        <CircleCheckBig className="size-4 text-indigo-700" />
      ) : null}
    </div>
  );
}

export { Progress };
