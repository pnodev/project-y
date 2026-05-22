import { Link } from "@tanstack/react-router";
import { FinishReviewPopover } from "~/components/git/review/FinishReviewPopover";
import type { ReviewOperation } from "~/components/git/review/types";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { cn } from "~/lib/utils";

export function ReviewToolbar({
  scopeLabel,
  compact = false,
  canInteract,
  readOnly,
  hasUserLink,
  reviewInProgress,
  pendingCount,
  reviewFetching,
  operation,
  submittingEvent,
  reviewBody,
  onReviewBodyChange,
  onStartReview,
  onDiscardReview,
  finishReviewOpen,
  onFinishReviewOpenChange,
  onSubmitReview,
  className,
}: {
  scopeLabel: string;
  /** Hides the scope title row (e.g. when PR context is shown in tabs). */
  compact?: boolean;
  canInteract: boolean;
  readOnly: boolean;
  hasUserLink: boolean;
  reviewInProgress: boolean;
  pendingCount: number;
  reviewFetching?: boolean;
  operation: ReviewOperation;
  submittingEvent: "COMMENT" | "APPROVE" | "REQUEST_CHANGES" | null;
  reviewBody: string;
  onReviewBodyChange: (value: string) => void;
  onStartReview: () => void;
  onDiscardReview: () => void;
  finishReviewOpen: boolean;
  onFinishReviewOpenChange: (open: boolean) => void;
  onSubmitReview: (event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES") => void;
  className?: string;
}) {
  const reviewActionsDisabled =
    operation === "start" ||
    operation === "submit" ||
    operation === "discard" ||
    operation === "addComment";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-2",
        className
      )}
    >
      {compact ? (
        canInteract && !reviewInProgress ? (
          <p className="text-muted-foreground text-xs">
            Start review, then click a line to comment
          </p>
        ) : (
          <span />
        )
      ) : (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{scopeLabel}</p>
          {canInteract && !reviewInProgress ? (
            <p className="text-muted-foreground mt-0.5 text-xs">
              Start review, then click a line to comment
            </p>
          ) : null}
        </div>
      )}

      {!canInteract ? (
        <p className="text-muted-foreground text-xs">
          {!readOnly && !hasUserLink ? (
            <>
              <Link to="/settings/integrations" className="underline">
                Connect GitHub
              </Link>{" "}
              to review
            </>
          ) : (
            "Read-only"
          )}
        </p>
      ) : reviewInProgress ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 text-xs">
            {reviewFetching ? (
              <LoadingSpinner isActive className="size-3" />
            ) : null}
            Review in progress
            {pendingCount > 0
              ? ` · ${pendingCount} pending`
              : ""}
            {reviewFetching ? (
              <span className="text-muted-foreground font-normal">
                · syncing
              </span>
            ) : null}
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            loading={operation === "discard"}
            disabled={reviewActionsDisabled && operation !== "discard"}
            onClick={onDiscardReview}
          >
            Discard
          </Button>
          <FinishReviewPopover
            open={finishReviewOpen}
            onOpenChange={onFinishReviewOpenChange}
            reviewBody={reviewBody}
            onReviewBodyChange={onReviewBodyChange}
            operation={operation}
            submittingEvent={submittingEvent}
            onSubmit={onSubmitReview}
            disabled={reviewActionsDisabled && operation !== "submit"}
          />
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          loading={operation === "start"}
          disabled={reviewActionsDisabled}
          onClick={onStartReview}
        >
          Start review
        </Button>
      )}
    </div>
  );
}
