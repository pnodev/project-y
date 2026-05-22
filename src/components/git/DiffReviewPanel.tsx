import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DiffViewer } from "~/components/git/DiffViewer";
import { LineCommentPopover } from "~/components/git/review/LineCommentPopover";
import { ReviewHistorySection } from "~/components/git/review/ReviewHistorySection";
import { ReviewLoadingOverlay } from "~/components/git/review/ReviewLoadingOverlay";
import { ReviewToolbar } from "~/components/git/review/ReviewToolbar";
import { ReviewToolbarSkeleton } from "~/components/git/review/ReviewToolbarSkeleton";
import type {
  ReviewOperation,
  SelectedReviewLine,
} from "~/components/git/review/types";
import {
  useGitConnectionQuery,
  useTaskPullRequestReviewCommentsQuery,
} from "~/db/queries/git";
import {
  useCreateTaskPullRequestReviewCommentMutation,
  useDiscardTaskPullRequestReviewMutation,
  useStartTaskPullRequestReviewMutation,
  useSubmitTaskPullRequestReviewMutation,
} from "~/db/mutations/git";
import type {
  GitDiffFile,
  GitPullRequestReview,
  GitReviewComment,
} from "~/lib/git/types";
import {
  formatClientError,
  isPendingReviewConflictMessage,
} from "~/lib/git/errors";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

function shouldRecoverPendingReview(message: string): boolean {
  return (
    isPendingReviewConflictMessage(message) ||
    /could not resume your in-progress review/i.test(message)
  );
}

export function DiffReviewPanel({
  taskId,
  pullRequestId,
  scopeLabel,
  files,
  headSha,
  readOnly = false,
  className,
}: {
  taskId: string;
  pullRequestId: string;
  scopeLabel: string;
  files: GitDiffFile[];
  headSha: string;
  readOnly?: boolean;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const { data: connectionData, isLoading: connectionLoading } =
    useGitConnectionQuery();
  const {
    data: reviewData,
    refetch,
    isLoading: reviewLoading,
    isFetching: reviewFetching,
  } = useTaskPullRequestReviewCommentsQuery(taskId, pullRequestId);
  const activeHeadSha = reviewData?.headSha ?? headSha;
  const startReview = useStartTaskPullRequestReviewMutation();
  const createComment = useCreateTaskPullRequestReviewCommentMutation();
  const submitReview = useSubmitTaskPullRequestReviewMutation();
  const discardReview = useDiscardTaskPullRequestReviewMutation();

  const [selectedLine, setSelectedLine] = useState<SelectedReviewLine | null>(
    null
  );
  const [draft, setDraft] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [operation, setOperation] = useState<ReviewOperation>(null);
  const [submittingEvent, setSubmittingEvent] = useState<
    "COMMENT" | "APPROVE" | "REQUEST_CHANGES" | null
  >(null);
  const [finishReviewOpen, setFinishReviewOpen] = useState(false);
  const [sessionPending, setSessionPending] =
    useState<GitPullRequestReview | null>(null);
  const startReviewInFlight = useRef<Promise<GitPullRequestReview> | null>(
    null
  );
  const diffBoundsRef = useRef<HTMLDivElement>(null);

  const submittedComments: GitReviewComment[] = reviewData?.comments ?? [];
  const pendingComments: GitReviewComment[] = reviewData?.pendingComments ?? [];
  const pendingReview = reviewData?.pendingReview ?? null;
  const activePendingReview = pendingReview ?? sessionPending;
  const reviews = reviewData?.reviews ?? [];
  const hasUserLink = Boolean(connectionData?.userLink);
  const canInteract = !readOnly && hasUserLink;
  const reviewInProgress = Boolean(activePendingReview);

  useEffect(() => {
    if (pendingReview) setSessionPending(null);
  }, [pendingReview]);

  const diffComments: GitReviewComment[] = [
    ...submittedComments,
    ...pendingComments,
  ];

  const interactionDisabled =
    operation === "start" ||
    operation === "submit" ||
    operation === "addComment" ||
    operation === "discard";

  const overlayMessage =
    operation === "submit"
      ? "Submitting review on GitHub…"
      : operation === "start"
        ? "Starting review on GitHub…"
        : null;

  const applyPendingReviewToCache = (pending: GitPullRequestReview) => {
    queryClient.setQueryData(
      ["git", "pr-comments", taskId, pullRequestId],
      (prev: typeof reviewData | undefined) =>
        prev ? { ...prev, pendingReview: pending } : prev
    );
  };

  const adoptPendingReview = (pending: GitPullRequestReview) => {
    setSessionPending(pending);
    applyPendingReviewToCache(pending);
    return pending;
  };

  const recoverInProgressReview = async (): Promise<GitPullRequestReview | null> => {
    const { data } = await refetch();
    if (data?.pendingReview) {
      return adoptPendingReview(data.pendingReview);
    }
    return null;
  };

  const ensureReviewStarted = async (): Promise<GitPullRequestReview> => {
    if (activePendingReview) return activePendingReview;
    if (startReviewInFlight.current) {
      return startReviewInFlight.current;
    }

    const promise = (async () => {
      const pending = await startReview({
        taskId,
        pullRequestId,
        commitId: activeHeadSha,
      });
      return adoptPendingReview(pending);
    })();

    startReviewInFlight.current = promise;
    try {
      return await promise;
    } finally {
      if (startReviewInFlight.current === promise) {
        startReviewInFlight.current = null;
      }
    }
  };

  const handleLineClick = (info: SelectedReviewLine) => {
    if (!canInteract || interactionDisabled) return;
    if (!reviewInProgress) {
      toast.error("Click Start review before commenting on a line.");
      return;
    }
    setSelectedLine(info);
  };

  const handleStartReview = async () => {
    setOperation("start");
    try {
      const hadPending = Boolean(activePendingReview);
      await ensureReviewStarted();
      void refetch();
      toast.success(
        hadPending
          ? "Continuing your review"
          : "Review started — click a line to add comments"
      );
    } catch (e) {
      const message = formatClientError(e, "Failed to start review");
      if (shouldRecoverPendingReview(message)) {
        const pending = await recoverInProgressReview();
        if (pending) {
          toast.success("Continuing your in-progress review");
          return;
        }
      }
      toast.error(message);
    } finally {
      setOperation(null);
    }
  };

  const handleAddComment = async () => {
    if (!selectedLine || !draft.trim()) return;
    if (!activePendingReview) {
      toast.error("Start a review before adding inline comments.");
      return;
    }
    setOperation("addComment");
    try {
      await createComment({
        taskId,
        pullRequestId,
        reviewId: activePendingReview.id,
        body: draft.trim(),
        commitId: activeHeadSha,
        path: selectedLine.path,
        line: selectedLine.line,
        side: selectedLine.side,
      });
      setDraft("");
      setSelectedLine(null);
      toast.success("Comment added to your review");
    } catch (e) {
      toast.error(formatClientError(e, "Failed to add comment"));
    } finally {
      setOperation(null);
    }
  };

  const handleFinishReview = async (
    event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES"
  ) => {
    setSubmittingEvent(event);
    setOperation("submit");
    try {
      await submitReview({
        taskId,
        pullRequestId,
        commitId: activeHeadSha,
        event,
        body: reviewBody.trim() || undefined,
      });
      setSessionPending(null);
      setReviewBody("");
      setSelectedLine(null);
      setFinishReviewOpen(false);
      await refetch();
      toast.success(
        event === "APPROVE"
          ? "Review submitted — approved"
          : event === "REQUEST_CHANGES"
            ? "Review submitted — changes requested"
            : "Review submitted"
      );
    } catch (e) {
      toast.error(formatClientError(e, "Failed to submit review"));
    } finally {
      setOperation(null);
      setSubmittingEvent(null);
    }
  };

  const handleDiscardReview = async () => {
    setOperation("discard");
    try {
      await discardReview({ taskId, pullRequestId });
      setSessionPending(null);
      setDraft("");
      setReviewBody("");
      setSelectedLine(null);
      setFinishReviewOpen(false);
      toast.success("Review discarded");
    } catch (e) {
      toast.error(formatClientError(e, "Failed to discard review"));
    } finally {
      setOperation(null);
    }
  };

  const toolbarLoading = connectionLoading || reviewLoading;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {toolbarLoading ? (
        <ReviewToolbarSkeleton />
      ) : (
        <ReviewToolbar
          scopeLabel={scopeLabel}
          canInteract={canInteract}
          readOnly={readOnly}
          hasUserLink={hasUserLink}
          reviewInProgress={reviewInProgress}
          pendingCount={pendingComments.length}
          reviewFetching={reviewFetching && !reviewLoading}
          operation={operation}
          submittingEvent={submittingEvent}
          reviewBody={reviewBody}
          onReviewBodyChange={setReviewBody}
          onStartReview={handleStartReview}
          onDiscardReview={handleDiscardReview}
          finishReviewOpen={finishReviewOpen}
          onFinishReviewOpenChange={setFinishReviewOpen}
          onSubmitReview={handleFinishReview}
        />
      )}

      <div
        ref={diffBoundsRef}
        className="relative flex min-h-0 flex-1 flex-col"
      >
        <DiffViewer
          files={files}
          comments={diffComments}
          pendingCommentIds={new Set(pendingComments.map((c) => c.id))}
          readOnly={!canInteract}
          fillHeight
          interactionDisabled={interactionDisabled}
          className="min-h-0 flex-1 border-t-0"
          selectedLine={selectedLine}
          onLineClick={canInteract ? handleLineClick : undefined}
        />
        <ReviewLoadingOverlay
          active={overlayMessage != null}
          message={overlayMessage ?? ""}
        />
      </div>

      {canInteract ? (
        <LineCommentPopover
          open={Boolean(selectedLine && reviewInProgress)}
          selectedLine={selectedLine}
          diffBoundsRef={diffBoundsRef}
          draft={draft}
          onDraftChange={setDraft}
          operation={operation}
          onAdd={handleAddComment}
          onCancel={() => {
            if (operation !== "addComment") setSelectedLine(null);
          }}
        />
      ) : null}

      <ReviewHistorySection reviews={reviews} />
    </div>
  );
}
