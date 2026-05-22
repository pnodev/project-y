import type { GitReviewComment, GitReviewThread } from "~/lib/git/types";

export function applyReviewThreadMetadata(
  comments: GitReviewComment[],
  threads: GitReviewThread[]
): GitReviewComment[] {
  const threadByCommentId = new Map<number, GitReviewThread>();
  for (const thread of threads) {
    for (const id of thread.commentIds) {
      threadByCommentId.set(id, thread);
    }
  }

  return comments.map((comment) => {
    const thread = threadByCommentId.get(comment.id);
    if (!thread) return comment;
    return {
      ...comment,
      threadNodeId: thread.nodeId,
      threadIsResolved: thread.isResolved,
    };
  });
}

/** First comment in a thread (for resolve UI — one control per conversation). */
export function isReviewThreadRoot(
  comment: GitReviewComment,
  comments: GitReviewComment[]
): boolean {
  if (!comment.threadNodeId) return false;
  if (comment.inReplyToId == null) return true;
  return !comments.some((c) => c.id === comment.inReplyToId);
}
