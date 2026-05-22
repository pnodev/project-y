import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function ReviewThreadResolveButton({
  resolved,
  disabled = false,
  loading = false,
  onToggle,
  className,
}: {
  resolved: boolean;
  disabled?: boolean;
  loading?: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("h-7 gap-1 px-2 text-xs", className)}
      disabled={disabled || loading}
      loading={loading}
      onClick={onToggle}
    >
      {resolved ? (
        <>
          <RotateCcw className="size-3.5" />
          Unresolve conversation
        </>
      ) : (
        <>
          <CheckCircle2 className="size-3.5" />
          Resolve conversation
        </>
      )}
    </Button>
  );
}
