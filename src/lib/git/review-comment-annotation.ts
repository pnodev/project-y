import type { FileDiffMetadata } from "@pierre/diffs";
import type { DiffLineAnnotation } from "@pierre/diffs";
import type { GitReviewComment } from "~/lib/git/types";

export type DiffLineIndex = {
  deletions: Set<number>;
  additions: Set<number>;
};

export function buildDiffLineIndex(fileDiff: FileDiffMetadata): DiffLineIndex {
  const deletions = new Set<number>();
  const additions = new Set<number>();
  for (const hunk of fileDiff.hunks) {
    for (let i = 0; i < hunk.deletionCount; i++) {
      deletions.add(hunk.deletionStart + i);
    }
    for (let i = 0; i < hunk.additionCount; i++) {
      additions.add(hunk.additionStart + i);
    }
  }
  return { deletions, additions };
}

export function inferCommentSide(
  comment: GitReviewComment
): "LEFT" | "RIGHT" {
  if (comment.side === "LEFT" || comment.side === "RIGHT") {
    return comment.side;
  }
  if (comment.originalLine != null && comment.line == null) return "LEFT";
  return "RIGHT";
}

function lineForSide(
  comment: GitReviewComment,
  side: "LEFT" | "RIGHT"
): number | null {
  if (side === "LEFT") {
    return comment.originalLine ?? comment.line;
  }
  return comment.line ?? comment.originalLine;
}

function pierreSideForGitSide(side: "LEFT" | "RIGHT"): "deletions" | "additions" {
  return side === "LEFT" ? "deletions" : "additions";
}

/** Prefer comments that still have line/side after GitHub refetch. */
export function pickRicherReviewComment(
  a: GitReviewComment,
  b: GitReviewComment
): GitReviewComment {
  const score = (c: GitReviewComment) =>
    (c.line != null ? 2 : 0) +
    (c.originalLine != null ? 2 : 0) +
    (c.side != null ? 1 : 0);
  return score(a) >= score(b) ? a : b;
}

export function commentToDiffAnnotation(
  comment: GitReviewComment,
  index?: DiffLineIndex
): DiffLineAnnotation<GitReviewComment> | null {
  const gitSide = inferCommentSide(comment);
  let line = lineForSide(comment, gitSide);
  if (line == null) return null;

  let pierreSide = pierreSideForGitSide(gitSide);

  if (index) {
    const primary = index[pierreSide];
    if (!primary.has(line)) {
      const altGitSide = gitSide === "LEFT" ? "RIGHT" : "LEFT";
      const altLine = lineForSide(comment, altGitSide);
      const altPierreSide = pierreSideForGitSide(altGitSide);
      if (altLine != null && index[altPierreSide].has(altLine)) {
        line = altLine;
        pierreSide = altPierreSide;
      } else if (!primary.has(line)) {
        return null;
      }
    }
  }

  return { side: pierreSide, lineNumber: line, metadata: comment };
}
