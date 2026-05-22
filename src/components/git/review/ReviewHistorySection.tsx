import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PullRequestReviewItem } from "~/components/git/ReviewComment";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import type { GitPullRequestReview } from "~/lib/git/types";
import { cn } from "~/lib/utils";

export function ReviewHistorySection({
  reviews,
  className,
}: {
  reviews: GitPullRequestReview[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (reviews.length === 0) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn("shrink-0 border-t border-border/60", className)}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium hover:bg-muted/40">
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
        Review history ({reviews.length})
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="space-y-2 px-4 pb-4">
          {reviews.map((review) => (
            <li key={review.id}>
              <PullRequestReviewItem review={review} />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
