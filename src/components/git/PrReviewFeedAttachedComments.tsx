import { DiffLineLocationLink } from "~/components/git/DiffLineLocationLink";
import { GitHubMarkdownBody } from "~/components/git/GitHubMarkdownBody";
import type { GitReviewComment } from "~/lib/git/types";
import { cn } from "~/lib/utils";

export function PrReviewFeedAttachedComments({
  comments,
  className,
}: {
  comments: GitReviewComment[];
  className?: string;
}) {
  if (comments.length === 0) return null;

  const sorted = [...comments].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  return (
    <ul className={cn("mt-2 space-y-2 border-t border-border/60 pt-2 pl-8", className)}>
      {sorted.map((comment) => {
        const body = comment.body?.trim() ?? "";
        if (!body) return null;
        return (
          <li
            key={comment.id}
            className="rounded-md border border-border/50 bg-muted/30 px-2.5 py-2 text-xs"
          >
            <div className="mb-1">
              <DiffLineLocationLink comment={comment} />
            </div>
            <GitHubMarkdownBody body={body} collapsible={false} />
          </li>
        );
      })}
    </ul>
  );
}
