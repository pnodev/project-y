import { cn } from "~/lib/utils";

export function TaskLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("text-sm font-medium text-foreground", className)}>
      {children}
    </span>
  );
}
