import * as React from "react";

import { cn } from "~/lib/utils";
import { formFieldClass } from "./surface-styles";

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
        formFieldClass,
        "selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 px-3 py-1 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground disabled:pointer-events-none",
        className
      )}
      {...props}
    />
  );
}

export { Input };
