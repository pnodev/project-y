import type {
  GitPullRequestIssueComment,
  GitPullRequestReview,
  GitReviewComment,
} from "~/lib/git/types";

export type ReviewCommentWithMeta = {
  comment: GitReviewComment;
  pending: boolean;
};

export type PrReviewCommentThread = {
  root: GitReviewComment;
  replies: GitReviewComment[];
  pendingCommentIds: Set<number>;
  threadNodeId: string | null;
  isResolved: boolean;
  at: Date;
};

export type PrReviewFeedEntry =
  | {
      kind: "review";
      at: Date;
      review: GitPullRequestReview;
      /** Inline comments submitted together with this review (e.g. request changes). */
      attachedComments: GitReviewComment[];
    }
  | { kind: "thread"; at: Date; thread: PrReviewCommentThread }
  | { kind: "issue_comment"; at: Date; comment: GitPullRequestIssueComment };

function shouldIncludeReview(review: GitPullRequestReview): boolean {
  if (review.state === "PENDING") return false;
  if (review.state === "COMMENTED" && !review.body?.trim()) return false;
  return true;
}

function latestThreadActivityAt(
  root: GitReviewComment,
  replies: GitReviewComment[]
): Date {
  const latest = Math.max(
    root.createdAt.getTime(),
    ...replies.map((r) => r.createdAt.getTime())
  );
  return new Date(latest);
}

/** Group line comments into threads via `inReplyToId`. */
export function groupReviewCommentsIntoThreads(
  items: ReviewCommentWithMeta[]
): PrReviewCommentThread[] {
  const visible = items.filter((item) => item.comment.body?.trim());
  if (visible.length === 0) return [];

  const byId = new Map(visible.map((item) => [item.comment.id, item]));
  const childrenOf = new Map<number, ReviewCommentWithMeta[]>();
  const roots: ReviewCommentWithMeta[] = [];

  for (const item of visible) {
    const parentId = item.comment.inReplyToId;
    if (parentId != null && byId.has(parentId)) {
      const siblings = childrenOf.get(parentId) ?? [];
      siblings.push(item);
      childrenOf.set(parentId, siblings);
    } else {
      roots.push(item);
    }
  }

  function collectReplies(parentId: number): ReviewCommentWithMeta[] {
    const direct = childrenOf.get(parentId) ?? [];
    const nested: ReviewCommentWithMeta[] = [];
    for (const child of direct) {
      nested.push(child, ...collectReplies(child.comment.id));
    }
    return nested.sort(
      (a, b) => a.comment.createdAt.getTime() - b.comment.createdAt.getTime()
    );
  }

  const threads = roots.map((root) => {
    const replyItems = collectReplies(root.comment.id);
    const pendingCommentIds = new Set<number>();
    if (root.pending) pendingCommentIds.add(root.comment.id);
    for (const reply of replyItems) {
      if (reply.pending) pendingCommentIds.add(reply.comment.id);
    }
    return {
      root: root.comment,
      replies: replyItems.map((r) => r.comment),
      pendingCommentIds,
      threadNodeId: root.comment.threadNodeId ?? null,
      isResolved: root.comment.threadIsResolved ?? false,
      at: latestThreadActivityAt(root.comment, replyItems.map((r) => r.comment)),
    };
  });

  threads.sort((a, b) => a.at.getTime() - b.at.getTime());
  return threads;
}

export function buildPrReviewFeedEntries(
  reviews: GitPullRequestReview[],
  submittedComments: GitReviewComment[],
  pendingComments: GitReviewComment[],
  issueComments: GitPullRequestIssueComment[] = []
): PrReviewFeedEntry[] {
  const entries: PrReviewFeedEntry[] = [];
  const includedReviews = reviews.filter(shouldIncludeReview);
  const submittedReviewIds = new Set(includedReviews.map((r) => r.id));

  const commentsByReviewId = new Map<number, GitReviewComment[]>();
  for (const comment of submittedComments) {
    if (
      comment.reviewId == null ||
      !submittedReviewIds.has(comment.reviewId)
    ) {
      continue;
    }
    const list = commentsByReviewId.get(comment.reviewId) ?? [];
    list.push(comment);
    commentsByReviewId.set(comment.reviewId, list);
  }

  const threadSourceComments = [
    ...submittedComments.filter(
      (comment) =>
        comment.reviewId == null ||
        !submittedReviewIds.has(comment.reviewId)
    ),
    ...pendingComments,
  ];

  for (const review of includedReviews) {
    entries.push({
      kind: "review",
      at: review.submittedAt ?? new Date(0),
      review,
      attachedComments: commentsByReviewId.get(review.id) ?? [],
    });
  }

  const pendingCommentIds = new Set(pendingComments.map((c) => c.id));
  const threads = groupReviewCommentsIntoThreads([
    ...threadSourceComments.map((comment) => ({
      comment,
      pending: pendingCommentIds.has(comment.id),
    })),
  ]);

  for (const thread of threads) {
    entries.push({ kind: "thread", at: thread.at, thread });
  }

  for (const comment of issueComments) {
    if (!comment.body?.trim()) continue;
    entries.push({
      kind: "issue_comment",
      at: comment.createdAt,
      comment,
    });
  }

  entries.sort((a, b) => a.at.getTime() - b.at.getTime());
  return entries;
}
