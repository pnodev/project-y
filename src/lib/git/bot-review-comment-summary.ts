import type { PrReviewFeedEntry } from "~/lib/git/pr-review-feed-entries";
import type { GitPullRequestIssueComment } from "~/lib/git/types";

/** Parsed status from CodeRabbit-style PR issue comments (timeline). */
export type BotReviewCommentSummary = {
  actionableCount: number | null;
  addressedCount: number;
  openCount: number;
  needsAction: boolean;
  label: string;
};

const ACTIONABLE_COUNT_RE = /Actionable comments posted:\s*(\d+)/i;

/** Per-file finding header in CodeRabbit digests, e.g. `\n`@src/foo.ts:12` */
const FINDING_PATH_HEADER_RE = /(?:^|\n)`@[^`\n]+`/;

/** CodeRabbit status line on a resolved finding, e.g. `✅ Addressed in commits abc to def`. */
export const ADDRESSED_FINDING_STATUS_RE =
  /(?:^|\n)\s*✅?\s*Addressed in commits?\s+[\da-f]+(?:\s+to\s+[\da-f]+)?/i;

function countAddressedMarkers(body: string): number {
  const matches = body.match(
    new RegExp(ADDRESSED_FINDING_STATUS_RE.source, "gi")
  );
  return matches?.length ?? 0;
}

function isCoderabbitAuthor(login: string): boolean {
  return /coderabbit/i.test(login);
}

/** True when the body looks like a multi-finding bot review dump (CodeRabbit, etc.). */
export function isBotReviewDigest(body: string): boolean {
  return (
    ACTIONABLE_COUNT_RE.test(body) ||
    /Potential issue|Committable suggestion|Prompt for AI agents/i.test(body) ||
    (FINDING_PATH_HEADER_RE.test(body) && countAddressedMarkers(body) > 0)
  );
}

export function summarizeBotReviewComment(
  body: string,
  options?: { authorLogin?: string }
): BotReviewCommentSummary | null {
  const forceBot =
    options?.authorLogin != null && isCoderabbitAuthor(options.authorLogin);

  if (!isBotReviewDigest(body) && !forceBot) return null;

  const actionableMatch = body.match(ACTIONABLE_COUNT_RE);
  const actionableCount = actionableMatch
    ? Number.parseInt(actionableMatch[1]!, 10)
    : null;

  const addressedCount = countAddressedMarkers(body);
  const baseSuggestedCount =
    /Committable suggestion|Potential issue/i.test(body) ? 1 : 0;
  const openCount =
    actionableCount != null
      ? Math.max(0, actionableCount - addressedCount)
      : Math.max(0, baseSuggestedCount - addressedCount);

  const needsAction = openCount > 0;

  let label: string;
  if (actionableCount != null) {
    if (needsAction) {
      label = `${openCount} finding${openCount === 1 ? "" : "s"} still need action`;
    } else if (actionableCount > 0) {
      label = `All ${actionableCount} finding${actionableCount === 1 ? "" : "s"} addressed`;
    } else {
      label = "No open findings";
    }
  } else if (addressedCount > 0 && !needsAction) {
    label = `${addressedCount} finding${addressedCount === 1 ? "" : "s"} addressed`;
  } else if (needsAction) {
    label = "Review feedback — action may be required";
  } else {
    label = "Review feedback";
  }

  return {
    actionableCount,
    addressedCount,
    openCount,
    needsAction,
    label,
  };
}

export function summarizeBotReviewIssueComment(
  comment: GitPullRequestIssueComment
): BotReviewCommentSummary | null {
  const body = comment.body?.trim() ?? "";
  if (!body) return null;
  if (!comment.isBot && !isCoderabbitAuthor(comment.authorLogin)) return null;
  return summarizeBotReviewComment(body, {
    authorLogin: comment.authorLogin,
  });
}

export function aggregateBotReviewDigests(
  issueComments: GitPullRequestIssueComment[]
): { openTotal: number; digestCount: number; allAddressed: boolean } {
  let openTotal = 0;
  let digestCount = 0;

  for (const comment of issueComments) {
    const summary = summarizeBotReviewIssueComment(comment);
    if (!summary) continue;
    digestCount += 1;
    openTotal += summary.openCount;
  }

  return {
    openTotal,
    digestCount,
    allAddressed: digestCount > 0 && openTotal === 0,
  };
}

/** Whether a feed row should appear when "Needs action only" is enabled. */
export function feedEntryNeedsAction(entry: PrReviewFeedEntry): boolean {
  switch (entry.kind) {
    case "issue_comment": {
      const summary = summarizeBotReviewIssueComment(entry.comment);
      if (summary) return summary.needsAction;
      return true;
    }
    case "review":
      return entry.review.state === "CHANGES_REQUESTED";
    case "thread": {
      const { thread } = entry;
      if (thread.pendingCommentIds.size > 0) return true;
      return !thread.isResolved;
    }
  }
}
