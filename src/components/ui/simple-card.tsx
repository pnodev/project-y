import * as React from "react";
import { cn } from "~/lib/utils";
import { Card } from "./card";

export const SimpleCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <Card
    ref={ref}
    className={cn("flex flex-col gap-1 p-2", className)}
    {...props}
  />
));
SimpleCard.displayName = "SimpleCard";
