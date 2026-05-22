import { EndlessLoadingSpinner } from "~/components/EndlessLoadingSpinner";
import { cn } from "~/lib/utils";

export function ReviewLoadingOverlay({
  active,
  message,
  className,
}: {
  active: boolean;
  message: string;
  className?: string;
}) {
  if (!active) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center gap-2",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <EndlessLoadingSpinner isActive centered hasBackdrop className="absolute inset-0" />
      <p className="relative z-30 text-muted-foreground px-4 text-center text-sm font-medium">
        {message}
      </p>
    </div>
  );
}
