import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Button } from "~/components/ui/button";
import { useDialogFloatingPortal } from "~/components/ui/dialog-floating-portal";
import { popoverSurfaceClass } from "~/components/ui/surface-styles";
import { Textarea } from "~/components/ui/textarea";
import type { ReviewOperation, SelectedReviewLine } from "~/components/git/review/types";
import { cn } from "~/lib/utils";

const POPOVER_WIDTH = 320;
const POPOVER_HEIGHT_ESTIMATE = 220;
/** Matches DiffViewer file list `w-48`. */
const FILE_LIST_WIDTH_PX = 192;

type FixedPosition = { top: number; left: number };

function measureLineRect(selectedLine: SelectedReviewLine): DOMRect | null {
  const row = selectedLine.lineElement;
  if (row?.isConnected) {
    return row.getBoundingClientRect();
  }
  return selectedLine.anchorRect;
}

function computeFixedPosition(
  lineRect: DOMRect,
  diffBounds: DOMRect
): FixedPosition {
  const rowSpansPanel =
    lineRect.width > diffBounds.width * 0.65 ||
    lineRect.right >= diffBounds.right - 24;

  let left = rowSpansPanel
    ? diffBounds.left + FILE_LIST_WIDTH_PX + 16
    : lineRect.right + 8;
  let top = lineRect.top;

  if (left + POPOVER_WIDTH > diffBounds.right - 12) {
    left = diffBounds.right - POPOVER_WIDTH - 12;
  }
  if (left < diffBounds.left + 12) {
    left = diffBounds.left + 12;
  }

  if (top + POPOVER_HEIGHT_ESTIMATE > diffBounds.bottom - 12) {
    top = diffBounds.bottom - POPOVER_HEIGHT_ESTIMATE - 12;
  }
  if (top < diffBounds.top + 12) {
    top = diffBounds.top + 12;
  }

  return { top, left };
}

export function LineCommentPopover({
  open,
  selectedLine,
  diffBoundsRef,
  draft,
  onDraftChange,
  operation,
  onAdd,
  onCancel,
}: {
  open: boolean;
  selectedLine: SelectedReviewLine | null;
  diffBoundsRef: RefObject<HTMLElement | null>;
  draft: string;
  onDraftChange: (value: string) => void;
  operation: ReviewOperation;
  onAdd: () => void;
  onCancel: () => void;
}) {
  const portalHost = useDialogFloatingPortal();
  const adding = operation === "addComment";
  const [position, setPosition] = useState<FixedPosition | null>(null);

  useLayoutEffect(() => {
    if (!open || !selectedLine) {
      setPosition(null);
      return;
    }

    const update = () => {
      const container = diffBoundsRef.current;
      if (!container) {
        setPosition(null);
        return;
      }
      const diffBounds = container.getBoundingClientRect();
      const lineRect = measureLineRect(selectedLine);
      if (!lineRect || lineRect.width + lineRect.height <= 0) {
        setPosition({
          top: diffBounds.top + 96,
          left: Math.max(
            diffBounds.left + 12,
            diffBounds.right - POPOVER_WIDTH - 12
          ),
        });
        return;
      }
      setPosition(computeFixedPosition(lineRect, diffBounds));
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, selectedLine, diffBoundsRef]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !adding) onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, adding, onCancel]);

  if (!open || !selectedLine || !position) return null;

  const host = portalHost ?? document.body;

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[290] cursor-default bg-transparent"
        aria-label="Close comment"
        onClick={() => {
          if (!adding) onCancel();
        }}
      />
      <div
        role="dialog"
        aria-label={`Comment on ${selectedLine.path} line ${selectedLine.line}`}
        className={cn(
          popoverSurfaceClass,
          "fixed z-[300] flex w-80 flex-col p-3 shadow-lg outline-hidden"
        )}
        style={{
          top: position.top,
          left: position.left,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-muted-foreground mb-2 text-xs leading-snug">
          <span className="font-medium text-foreground">
            {selectedLine.path}:{selectedLine.line}
          </span>
          <br />
          Added to your review when you finish
        </p>
        <Textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Leave a comment…"
          className="min-h-[72px] text-sm"
          disabled={adding}
          autoFocus
        />
        {adding ? (
          <p className="text-muted-foreground mt-2 text-xs">Sending to GitHub…</p>
        ) : null}
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            size="sm"
            loading={adding}
            disabled={adding || !draft.trim()}
            onClick={onAdd}
          >
            Add comment
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={adding}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </>,
    host
  );
}
