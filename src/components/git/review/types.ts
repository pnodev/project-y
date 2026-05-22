export type ReviewOperation = "start" | "addComment" | "submit" | "discard" | null;

export type SelectedReviewLine = {
  path: string;
  line: number;
  side: "LEFT" | "RIGHT";
  anchorRect: DOMRect | null;
  lineElement: HTMLElement | null;
  /** When false, line is highlighted/scrolled only (review nav), not comment draft. */
  opensPopover?: boolean;
};
