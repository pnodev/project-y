import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Textarea } from "~/components/ui/textarea";
import type { ReviewOperation } from "~/components/git/review/types";

export function FinishReviewPopover({
  open,
  onOpenChange,
  reviewBody,
  onReviewBodyChange,
  operation,
  submittingEvent,
  onSubmit,
  disabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewBody: string;
  onReviewBodyChange: (value: string) => void;
  operation: ReviewOperation;
  submittingEvent: "COMMENT" | "APPROVE" | "REQUEST_CHANGES" | null;
  onSubmit: (event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES") => void;
  disabled?: boolean;
}) {
  const submitting = operation === "submit";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        onOpenChange(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="default"
          className="h-7 text-xs"
          disabled={disabled || submitting}
        >
          Finish review
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-80 p-3"
        collisionPadding={12}
      >
        <p className="text-sm font-medium">Finish your review</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Publishes pending inline comments and submits on GitHub.
        </p>
        <Textarea
          value={reviewBody}
          onChange={(e) => onReviewBodyChange(e.target.value)}
          placeholder="Review summary (optional)…"
          className="mt-3 min-h-[60px] text-sm"
          disabled={submitting}
        />
        {submitting ? (
          <p className="text-muted-foreground mt-2 text-xs">
            Submitting review on GitHub…
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={submitting && submittingEvent === "COMMENT"}
            disabled={submitting}
            onClick={() => onSubmit("COMMENT")}
          >
            Comment
          </Button>
          <Button
            type="button"
            size="sm"
            variant="default"
            loading={submitting && submittingEvent === "APPROVE"}
            disabled={submitting}
            onClick={() => onSubmit("APPROVE")}
          >
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            loading={submitting && submittingEvent === "REQUEST_CHANGES"}
            disabled={submitting}
            onClick={() => onSubmit("REQUEST_CHANGES")}
          >
            Request changes
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
