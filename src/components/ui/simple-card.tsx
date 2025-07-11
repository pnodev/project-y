import * as React from "react";
import { cn } from "~/lib/utils";

export const SimpleCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-sm border bg-card text-card-foreground p-2 flex flex-col gap-2 shadow",
      className
    )}
    {...props}
  />
));
SimpleCard.displayName = "SimpleCard";
