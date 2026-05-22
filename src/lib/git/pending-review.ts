import type { GitPullRequestReview } from "~/lib/git/types";

/** Whether a GitHub pull request review is still in progress (not submitted). */
export function isPendingReviewState(review: {
  state?: string | null;
  submitted_at?: string | null;
}): boolean {
  if (review.submitted_at) return false;
  const state = (review.state ?? "").toUpperCase().replace(/ /g, "_");
  if (state === "DISMISSED" || state === "APPROVED" || state === "CHANGES_REQUESTED") {
    return false;
  }
  return true;
}

/** Pick the current viewer's unsubmitted review from a list (newest first). */
export function pickPendingReviewForViewer(
  reviews: GitPullRequestReview[],
  viewerLogin: string
): GitPullRequestReview | null {
  const login = viewerLogin.toLowerCase();
  for (let i = reviews.length - 1; i >= 0; i--) {
    const review = reviews[i];
    if (review.authorLogin.toLowerCase() !== login) continue;
    if (review.submittedAt != null) continue;
    if (review.state === "DISMISSED") continue;
    return review;
  }
  return null;
}
