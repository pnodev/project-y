import { Skeleton } from "~/components/ui/skeleton";

export function ReviewToolbarSkeleton() {
  return (
    <div
      className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2"
      role="status"
      aria-label="Loading review"
    >
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-7 w-24" />
    </div>
  );
}
