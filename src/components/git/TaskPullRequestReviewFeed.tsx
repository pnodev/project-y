import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  PrReviewFeedItemCommentThread,
  PrReviewFeedItemIssueComment,
  PrReviewFeedItemReview,
} from "~/components/git/PrReviewFeedItem";
import { PullRequestMergePanel } from "~/components/git/PullRequestMergePanel";
import { TaskLabel } from "~/components/ui/TaskLabel";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { useSetTaskPullRequestReviewThreadResolvedMutation } from "~/db/mutations/git";
import {
  useGitConnectionQuery,
  useTaskGitContextQuery,
  useTaskPullRequestReviewCommentsQuery,
} from "~/db/queries/git";
import { useGitTaskLiveSync } from "~/hooks/use-git-task-live-sync";
import { formatClientError } from "~/lib/git/errors";
import {
  aggregateBotReviewDigests,
  feedEntryNeedsAction,
} from "~/lib/git/bot-review-comment-summary";
import { buildPrReviewFeedEntries } from "~/lib/git/pr-review-feed-entries";
import { TaskPullRequestReviewEmptyState } from "~/components/git/TaskDevelopmentEmptyState";
import { Button } from "~/components/ui/button";
import { getLatestPr, getOpenPr } from "~/lib/git/task-dev-phase";
import { cn } from "~/lib/utils";

export function TaskPullRequestReviewFeed({
  taskId,
  className,
}: {
  taskId: string;
  className?: string;
}) {
  const { data: gitContext, isLoading: contextLoading } =
    useTaskGitContextQuery(taskId);
  useGitTaskLiveSync(taskId);

  const reviewPr = gitContext
    ? (getOpenPr(gitContext) ?? getLatestPr(gitContext))
    : null;

  const { data: connectionData } = useGitConnectionQuery();
  const {
    data: reviewData,
    isLoading: commentsLoading,
    isFetching,
    refetch,
  } = useTaskPullRequestReviewCommentsQuery(
    taskId,
    reviewPr?.id,
    Boolean(connectionData?.connection)
  );
  const setThreadResolved =
    useSetTaskPullRequestReviewThreadResolvedMutation();
  const [resolvingThreadNodeId, setResolvingThreadNodeId] = useState<
    string | null
  >(null);
  const [needsActionOnly, setNeedsActionOnly] = useState(false);

  const canResolve = Boolean(connectionData?.userLink) && Boolean(reviewPr);

  const isLoading = contextLoading || commentsLoading;

  const handleToggleThreadResolved = async (
    threadNodeId: string,
    resolved: boolean
  ) => {
    if (!reviewPr) return;
    setResolvingThreadNodeId(threadNodeId);
    try {
      await setThreadResolved({
        taskId,
        pullRequestId: reviewPr.id,
        threadNodeId,
        resolved,
      });
      toast.success(
        resolved ? "Conversation resolved" : "Conversation unresolved"
      );
      await refetch();
    } catch (e) {
      toast.error(
        formatClientError(e, "Failed to update conversation on GitHub")
      );
    } finally {
      setResolvingThreadNodeId(null);
    }
  };
  const entries = useMemo(
    () =>
      reviewData
        ? buildPrReviewFeedEntries(
            reviewData.reviews,
            reviewData.comments,
            reviewData.pendingComments,
            reviewData.issueComments
          )
        : [],
    [reviewData]
  );

  const botDigestRollup = useMemo(
    () =>
      reviewData
        ? aggregateBotReviewDigests(reviewData.issueComments)
        : null,
    [reviewData]
  );

  const visibleEntries = useMemo(
    () =>
      needsActionOnly
        ? entries.filter((entry) => feedEntryNeedsAction(entry))
        : entries,
    [entries, needsActionOnly]
  );

  const hiddenByFilterCount = entries.length - visibleEntries.length;

  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || isLoading || visibleEntries.length === 0) return;
    el.scrollTop = el.scrollHeight;
  }, [visibleEntries, isLoading]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-3 px-4 py-4",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TaskLabel>Pull request</TaskLabel>
        <div className="flex items-center gap-2">
          {botDigestRollup &&
          (botDigestRollup.digestCount > 0 || needsActionOnly) ? (
            <Button
              type="button"
              variant={needsActionOnly ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setNeedsActionOnly((v) => !v)}
            >
              Needs action only
            </Button>
          ) : null}
          {isFetching && !isLoading ? (
            <LoadingSpinner isActive className="size-3.5" />
          ) : null}
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : !reviewPr ? (
          <TaskPullRequestReviewEmptyState
            variant={
              gitContext && gitContext.projectRepos.length === 0
                ? "no_setup"
                : "no_pr"
            }
          />
        ) : !connectionData?.connection ? (
          <p className="text-muted-foreground text-sm">
            Connect the GitHub app to load pull request activity.
          </p>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {connectionData.userLink
              ? "No reviews or comments yet."
              : "No reviews or comments yet. Connect your GitHub account in settings to see pending reviews and post comments."}
          </p>
        ) : visibleEntries.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing needs action right now
            {hiddenByFilterCount > 0
              ? ` (${hiddenByFilterCount} addressed item${hiddenByFilterCount === 1 ? "" : "s"} hidden)`
              : ""}
            .
          </p>
        ) : (
          <>
            {!connectionData.userLink ? (
              <p className="text-muted-foreground mb-2 text-xs">
                Connect GitHub in settings to see pending reviews and post
                comments.
              </p>
            ) : null}
            {botDigestRollup && botDigestRollup.digestCount > 0 ? (
              <div
                className={cn(
                  "mb-3 rounded-md border-2 px-3 py-2 text-xs font-medium",
                  botDigestRollup.openTotal > 0
                    ? "border-amber-400 bg-amber-100 text-amber-950"
                    : "border-emerald-500 bg-emerald-100 text-emerald-950"
                )}
              >
                {botDigestRollup.openTotal > 0
                  ? `${botDigestRollup.openTotal} CodeRabbit finding${botDigestRollup.openTotal === 1 ? "" : "s"} still need action across ${botDigestRollup.digestCount} review comment${botDigestRollup.digestCount === 1 ? "" : "s"}`
                  : `All CodeRabbit findings addressed (${botDigestRollup.digestCount} review comment${botDigestRollup.digestCount === 1 ? "" : "s"})`}
              </div>
            ) : null}
            {needsActionOnly && hiddenByFilterCount > 0 ? (
              <p className="text-muted-foreground mb-2 text-xs">
                Hiding {hiddenByFilterCount} addressed or resolved item
                {hiddenByFilterCount === 1 ? "" : "s"}.
              </p>
            ) : null}
            <ul className="space-y-2.5">
            {visibleEntries.map((entry) => {
              if (entry.kind === "issue_comment") {
                return (
                  <li key={`issue-comment-${entry.comment.id}`}>
                    <PrReviewFeedItemIssueComment
                      comment={entry.comment}
                      occurredAt={entry.at}
                    />
                  </li>
                );
              }

              if (entry.kind === "review") {
                return (
                  <li key={`review-${entry.review.id}`}>
                    <PrReviewFeedItemReview
                      review={entry.review}
                      occurredAt={entry.at}
                      attachedComments={entry.attachedComments}
                    />
                  </li>
                );
              }

              const { thread } = entry;
              const hasContent =
                thread.root.body?.trim() ||
                thread.replies.some((r) => r.body?.trim());
              if (!hasContent) return null;

              return (
                <li
                  key={`thread-${thread.root.id}-${[...thread.pendingCommentIds].join("-")}`}
                >
                  <PrReviewFeedItemCommentThread
                    thread={thread}
                    canResolve={canResolve && Boolean(thread.threadNodeId)}
                    resolveLoading={
                      resolvingThreadNodeId === thread.threadNodeId
                    }
                    onToggleResolved={
                      thread.threadNodeId
                        ? (resolved) =>
                            void handleToggleThreadResolved(
                              thread.threadNodeId!,
                              resolved
                            )
                        : undefined
                    }
                  />
                </li>
              );
            })}
            </ul>
          </>
        )}
      </div>

      {reviewPr && connectionData?.connection ? (
        <PullRequestMergePanel
          taskId={taskId}
          pullRequestId={reviewPr.id}
          prNumber={reviewPr.number}
          prUrl={reviewPr.url}
          prState={reviewPr.state}
          canAct={Boolean(connectionData.userLink)}
        />
      ) : null}
    </div>
  );
}
