import * as React from "react";

import { cn } from "~/lib/utils";
import { formFieldClass } from "./surface-styles";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        formFieldClass,
        "field-sizing-content flex min-h-16 w-full px-3 py-2",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
