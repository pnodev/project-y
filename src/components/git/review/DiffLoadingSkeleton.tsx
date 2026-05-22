import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

export function DiffLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex min-h-0 flex-1 border-t", className)}
      role="status"
      aria-label="Loading diff"
    >
      <div className="w-48 shrink-0 space-y-1 border-r p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            style={{ width: `${55 + ((i * 17) % 40)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
