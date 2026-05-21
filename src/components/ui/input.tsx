import * as React from "react";

import { cn } from "~/lib/utils";

function Input({
  className,
  type,
  disablePasswordManagers,
  ...props
}: React.ComponentProps<"input"> & {
  disablePasswordManagers?: boolean;
}) {
  return (
    <input
      type={type}
      data-slot="input"
      data-1p-ignore={disablePasswordManagers}
      data-lpignore={disablePasswordManagers}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-lg border border-border/60 bg-background px-3 py-1 text-base shadow-none transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-muted/30",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Input };
