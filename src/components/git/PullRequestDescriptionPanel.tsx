import { useState, type ReactNode } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { GitHubMarkdownBody } from "~/components/git/GitHubMarkdownBody";
import { PullRequestStateBadge } from "~/components/git/PullRequestStateBadge";
import { Button } from "~/components/ui/button";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import {
  useGitConnectionQuery,
  useTaskPullRequestReviewCommentsQuery,
} from "~/db/queries/git";
import { cn } from "~/lib/utils";

export function PullRequestDescriptionPanel({
  taskId,
  pullRequestId,
  repository,
  headerActions,
  className,
}: {
  taskId: string;
  pullRequestId: string;
  repository?: { fullName: string; htmlUrl: string };
  headerActions?: ReactNode;
  className?: string;
}) {
  const { data: connectionData } = useGitConnectionQuery();
  const { data, isLoading, isFetching } = useTaskPullRequestReviewCommentsQuery(
    taskId,
    pullRequestId,
    Boolean(connectionData?.connection)
  );

  const pr = data?.pullRequest;
  const description = pr?.body?.trim() ?? "";
  const [collapsed, setCollapsed] = useState(false);

  if (!connectionData?.connection) return null;

  if (isLoading && !pr) {
    return (
      <div
        className={cn(
          "border-b border-border/60 px-4 py-6",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <LoadingSpinner isActive className="size-4" />
          <span className="text-muted-foreground text-sm">
            Loading pull request…
          </span>
        </div>
      </div>
    );
  }

  if (!pr) return null;

  return (
    <section
      className={cn("shrink-0 border-b border-border/60 px-4 py-3", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 flex-1 text-base leading-snug font-semibold tracking-tight text-pretty">
          {pr.title}
        </h2>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8" asChild>
            <a href={pr.url} target="_blank" rel="noopener noreferrer">
              Open on GitHub
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
          {headerActions}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {repository ? (
          <a
            href={repository.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
          >
            {repository.fullName}
            <ExternalLink className="size-3 opacity-70" />
          </a>
        ) : null}
        {repository ? (
          <span className="text-muted-foreground/50 text-xs" aria-hidden>
            ·
          </span>
        ) : null}
        <span className="text-muted-foreground inline-flex items-center gap-1.5 font-mono text-xs">
          <span className="text-foreground/90">{pr.headRef}</span>
          <span aria-hidden>→</span>
          <span>{pr.baseRef}</span>
        </span>
        <PullRequestStateBadge state={pr.state} />
        {isFetching ? <LoadingSpinner isActive className="size-3" /> : null}
      </div>

      {!collapsed ? (
        <div className="mt-2 min-w-0">
          {description.length > 280 ? (
            <div className="mb-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground -mr-2 h-7 text-xs"
                onClick={() => setCollapsed(true)}
              >
                <ChevronDown className="size-3.5 rotate-180" />
                Hide description
              </Button>
            </div>
          ) : null}
          <div
            className={cn(
              "[&_.gh-markdown_p:first-child]:mt-0",
              description.length > 0 &&
                "max-h-56 overflow-y-auto overscroll-contain pr-1"
            )}
          >
            {description ? (
              <GitHubMarkdownBody
                body={description}
                collapsible={false}
                className="pr-description-markdown"
              />
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No description on this pull request.
              </p>
            )}
          </div>
        </div>
      ) : description.length > 280 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground mt-2 h-7 text-xs"
          onClick={() => setCollapsed(false)}
        >
          <ChevronDown className="size-3.5" />
          Show description
        </Button>
      ) : null}
    </section>
  );
}
