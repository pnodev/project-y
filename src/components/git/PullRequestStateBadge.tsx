import { Badge } from "~/components/ui/badge";
import type { GitPrState } from "~/db/schema/git";
import { cn } from "~/lib/utils";

const openBadgeClass =
  "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800/80 dark:bg-blue-950/50 dark:text-blue-300";

export function PullRequestStateBadge({
  state,
  className,
}: {
  state: GitPrState | string;
  className?: string;
}) {
  const isOpen = state === "open";

  return (
    <Badge
      variant="secondary"
      className={cn(
        "h-5 text-[10px] capitalize",
        isOpen && openBadgeClass,
        className
      )}
    >
      {state}
    </Badge>
  );
}
