import * as React from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "~/lib/utils";

function MetricTileGroup({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function MetricTile({
  label,
  value,
  description,
  highlight,
  className,
}: {
  label: string;
  value: number | string;
  description?: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card px-5 py-5 shadow-none",
        highlight && "border-destructive/50 bg-destructive/5",
        className
      )}
    >
      <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
        {highlight ? (
          <AlertCircle
            className="text-destructive size-4 shrink-0"
            aria-hidden
          />
        ) : null}
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-3xl font-semibold tabular-nums tracking-tight",
          highlight && "text-destructive"
        )}
      >
        {value}
      </p>
      {description ? (
        <p className="text-muted-foreground mt-1 text-xs">{description}</p>
      ) : null}
    </div>
  );
}

export { MetricTileGroup, MetricTile };
