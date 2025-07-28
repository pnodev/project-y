import { cn } from "~/lib/utils";

export const ButtonGroup = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "flex [&>button:not(:first-child)]:-ml-px [&>button:not(:first-child)]:rounded-l-none [&>button:not(:last-child)]:rounded-r-none",
        className
      )}
    >
      {children}
    </div>
  );
};
