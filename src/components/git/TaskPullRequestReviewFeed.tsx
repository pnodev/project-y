import { useLayoutEffect, useRef, useState } from "react";
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
import { buildPrReviewFeedEntries } from "~/lib/git/pr-review-feed-entries";
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
  } = useTaskPullRequestReviewCommentsQuery(taskId, reviewPr?.id);
  const setThreadResolved =
    useSetTaskPullRequestReviewThreadResolvedMutation();
  const [resolvingThreadNodeId, setResolvingThreadNodeId] = useState<
    string | null
  >(null);

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
  const entries = reviewData
    ? buildPrReviewFeedEntries(
        reviewData.reviews,
        reviewData.comments,
        reviewData.pendingComments,
        reviewData.issueComments
      )
    : [];

  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || isLoading || entries.length === 0) return;
    el.scrollTop = el.scrollHeight;
  }, [entries, isLoading]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-3 px-4 py-4",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <TaskLabel>Pull request</TaskLabel>
        {isFetching && !isLoading ? (
          <LoadingSpinner isActive className="size-3.5" />
        ) : null}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : !reviewPr ? (
          <p className="text-muted-foreground text-sm">
            Link or open a pull request to see review comments and feedback from
            GitHub here.
          </p>
        ) : !connectionData?.userLink ? (
          <p className="text-muted-foreground text-sm">
            Connect GitHub in settings to load review comments for PR #
            {reviewPr.number}.
          </p>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No reviews or comments on PR #{reviewPr.number} yet.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {entries.map((entry) => {
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
