import type { ReactNode } from "react";
import {
  AlertCircle,
  Check,
  GitPullRequest,
  MessageSquare,
  MessageSquarePlus,
  X,
} from "lucide-react";
import { summarizeBotReviewIssueComment } from "~/lib/git/bot-review-comment-summary";
import { Badge } from "~/components/ui/badge";
import { DiffLineLocationLink } from "~/components/git/DiffLineLocationLink";
import { GitHubMarkdownBody } from "~/components/git/GitHubMarkdownBody";
import { PrReviewFeedAttachedComments } from "~/components/git/PrReviewFeedAttachedComments";
import { ReviewThreadResolveButton } from "~/components/git/ReviewThreadResolveButton";
import { ReviewThreadResolvedShell } from "~/components/git/ReviewThreadResolvedShell";
import {
  formatDateTimeTooltip,
  formatRelativeTime,
} from "~/lib/format-relative-time";
import type { PrReviewCommentThread } from "~/lib/git/pr-review-feed-entries";
import type {
  GitPullRequestIssueComment,
  GitPullRequestReview,
  GitReviewComment,
} from "~/lib/git/types";
import { cn } from "~/lib/utils";

function AuthorAvatar({
  login,
  avatarUrl,
}: {
  login: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="size-6 shrink-0 rounded-full"
      />
    );
  }
  return (
    <span className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
      {login.slice(0, 1).toUpperCase()}
    </span>
  );
}

function reviewActionLabel(state: GitPullRequestReview["state"]): string {
  switch (state) {
    case "APPROVED":
      return "approved";
    case "CHANGES_REQUESTED":
      return "requested changes";
    case "COMMENTED":
      return "commented";
    case "DISMISSED":
      return "dismissed";
    default:
      return "reviewed";
  }
}

function ReviewStateIcon({
  state,
}: {
  state: GitPullRequestReview["state"];
}) {
  const className = "size-3 shrink-0";
  switch (state) {
    case "APPROVED":
      return <Check className={cn(className, "text-green-600")} />;
    case "CHANGES_REQUESTED":
      return <X className={cn(className, "text-amber-600")} />;
    case "COMMENTED":
      return <MessageSquare className={cn(className, "text-muted-foreground")} />;
    default:
      return <GitPullRequest className={cn(className, "text-muted-foreground")} />;
  }
}

function FileLocation({ comment }: { comment: GitReviewComment }) {
  if (!comment.path) return null;
  return (
    <span className="bg-muted inline-flex max-w-full rounded px-1.5 py-0.5">
      <DiffLineLocationLink comment={comment} showGithub={false} />
    </span>
  );
}

function FeedCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-lg border border-border/60 bg-background/80 px-3 py-2.5",
        className
      )}
    >
      {children}
    </article>
  );
}

function FeedHeader({
  login,
  avatarUrl,
  htmlUrl,
  action,
  icon,
  githubUrl,
  occurredAt,
  trailing,
}: {
  login: string;
  avatarUrl: string | null;
  htmlUrl: string | null;
  action: ReactNode;
  icon?: ReactNode;
  githubUrl: string | null;
  occurredAt: Date;
  trailing?: ReactNode;
}) {
  const profileUrl = htmlUrl ?? `https://github.com/${login}`;

  return (
    <header className="flex items-start gap-2">
      <a href={profileUrl} target="_blank" rel="noopener noreferrer">
        <AuthorAvatar login={login} avatarUrl={avatarUrl} />
      </a>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-xs leading-snug">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
            >
              {login}
            </a>
            {icon}
            <span className="text-muted-foreground">{action}</span>
            {trailing}
          </div>
          <time
            className="text-muted-foreground shrink-0 text-[10px]"
            dateTime={occurredAt.toISOString()}
            title={formatDateTimeTooltip(occurredAt)}
          >
            {formatRelativeTime(occurredAt)}
          </time>
        </div>
        {githubUrl ? (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground text-[10px] hover:underline"
          >
            View on GitHub
          </a>
        ) : null}
      </div>
    </header>
  );
}

function reviewDetailHint(
  state: GitPullRequestReview["state"],
  hasAttachedComments: boolean
): string | null {
  if (hasAttachedComments) return null;
  switch (state) {
    case "CHANGES_REQUESTED":
      return "No summary was added. Feedback is usually on specific lines in the Pull request diff.";
    case "APPROVED":
      return "Approved without a written summary.";
    case "COMMENTED":
      return "Left a review without a summary comment.";
    default:
      return null;
  }
}

export function PrReviewFeedItemIssueComment({
  comment,
  occurredAt,
}: {
  comment: GitPullRequestIssueComment;
  occurredAt: Date;
}) {
  const body = comment.body?.trim() ?? "";
  if (!body) return null;

  const botSummary = summarizeBotReviewIssueComment(comment);

  return (
    <FeedCard
      className={cn(
        botSummary?.needsAction &&
          "border-amber-400/70 ring-1 ring-amber-400/30",
        botSummary &&
          !botSummary.needsAction &&
          "border-emerald-500/50 ring-1 ring-emerald-500/20"
      )}
    >
      <FeedHeader
        login={comment.authorLogin}
        avatarUrl={comment.authorAvatarUrl}
        htmlUrl={comment.authorHtmlUrl}
        action="commented"
        icon={<MessageSquare className="text-muted-foreground size-3 shrink-0" />}
        githubUrl={comment.url}
        occurredAt={occurredAt}
        trailing={
          <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {botSummary ? (
              <Badge
                className={cn(
                  "h-5 border-0 text-[10px] font-semibold",
                  botSummary.needsAction
                    ? "bg-amber-500 text-white"
                    : "bg-emerald-600 text-white"
                )}
              >
                {botSummary.needsAction ? "Needs action" : "Addressed"}
              </Badge>
            ) : null}
            {comment.isBot ? (
              <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]">
                Bot
              </span>
            ) : null}
          </span>
        }
      />
      {botSummary ? (
        <div
          className={cn(
            "mt-2 flex items-start gap-2 rounded-md border-2 px-2.5 py-2 text-xs font-medium",
            botSummary.needsAction
              ? "border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-50"
              : "border-emerald-500 bg-emerald-100 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-50"
          )}
        >
          {botSummary.needsAction ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          <span>
            <span className="block">{botSummary.label}</span>
            {botSummary.actionableCount != null ? (
              <span className="mt-0.5 block text-[10px] font-normal opacity-90">
                {botSummary.addressedCount} of {botSummary.actionableCount}{" "}
                marked addressed on GitHub
              </span>
            ) : null}
          </span>
        </div>
      ) : null}
      <div className="mt-2 pl-8">
        <GitHubMarkdownBody
          body={body}
          collapsible={false}
          collapseAddressedFindings={Boolean(botSummary)}
        />
      </div>
    </FeedCard>
  );
}

export function PrReviewFeedItemReview({
  review,
  occurredAt,
  attachedComments = [],
}: {
  review: GitPullRequestReview;
  occurredAt: Date;
  attachedComments?: GitReviewComment[];
}) {
  const body = review.body?.trim() ?? "";
  const visibleAttached = attachedComments.filter((c) => c.body?.trim());
  const hint = reviewDetailHint(review.state, visibleAttached.length > 0);

  return (
    <FeedCard>
      <FeedHeader
        login={review.authorLogin}
        avatarUrl={review.authorAvatarUrl}
        htmlUrl={review.authorHtmlUrl}
        action={reviewActionLabel(review.state)}
        icon={<ReviewStateIcon state={review.state} />}
        githubUrl={review.url}
        occurredAt={occurredAt}
      />
      {body ? (
        <div className="mt-2 pl-8">
          <GitHubMarkdownBody body={body} collapsible={false} />
        </div>
      ) : null}
      {visibleAttached.length > 0 ? (
        <>
          {visibleAttached.length > 0 && body ? (
            <p className="text-muted-foreground mt-2 pl-8 text-[10px] font-medium">
              Line comments in this review
            </p>
          ) : null}
          <PrReviewFeedAttachedComments comments={visibleAttached} />
        </>
      ) : hint ? (
        <p className="text-muted-foreground mt-2 pl-8 text-xs leading-relaxed">
          {hint}
        </p>
      ) : null}
    </FeedCard>
  );
}

function PrReviewFeedLineComment({
  comment,
  pending,
  occurredAt,
  isReply,
  replyToLogin,
}: {
  comment: GitReviewComment;
  pending: boolean;
  occurredAt: Date;
  isReply: boolean;
  replyToLogin?: string | null;
}) {
  const body = comment.body?.trim() ?? "";
  if (!body) return null;

  const action = isReply ? (
    <>
      replied
      {replyToLogin ? (
        <>
          {" "}
          to{" "}
          <span className="text-foreground font-medium">@{replyToLogin}</span>
        </>
      ) : null}
    </>
  ) : (
    "commented on a line"
  );

  return (
    <div className={cn(isReply && "border-border/60 mt-3 border-l-2 pl-3")}>
      <FeedHeader
        login={comment.authorLogin}
        avatarUrl={comment.authorAvatarUrl}
        htmlUrl={comment.authorHtmlUrl}
        action={action}
        icon={<MessageSquarePlus className="text-muted-foreground size-3 shrink-0" />}
        githubUrl={comment.url}
        occurredAt={occurredAt}
        trailing={
          <>
            {!isReply ? <FileLocation comment={comment} /> : null}
            {pending ? (
              <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]">
                Pending
              </span>
            ) : null}
          </>
        }
      />
      <div className="mt-2 pl-8">
        <GitHubMarkdownBody body={body} collapsible={false} />
      </div>
    </div>
  );
}

export function PrReviewFeedItemCommentThread({
  thread,
  canResolve = false,
  resolveLoading = false,
  onToggleResolved,
}: {
  thread: PrReviewCommentThread;
  canResolve?: boolean;
  resolveLoading?: boolean;
  onToggleResolved?: (resolved: boolean) => void;
}) {
  const byId = new Map<number, GitReviewComment>([
    [thread.root.id, thread.root],
    ...thread.replies.map((c) => [c.id, c] as const),
  ]);

  const rootPending = thread.pendingCommentIds.has(thread.root.id);
  if (!thread.root.body?.trim() && thread.replies.length === 0) return null;

  const commentCount = 1 + thread.replies.length;

  const threadBody = (
    <>
      {thread.root.body?.trim() ? (
        <PrReviewFeedLineComment
          comment={thread.root}
          pending={rootPending}
          occurredAt={thread.root.createdAt}
          isReply={false}
        />
      ) : null}
      {thread.replies.map((reply) => {
        const parent =
          reply.inReplyToId != null ? byId.get(reply.inReplyToId) : undefined;
        return (
          <PrReviewFeedLineComment
            key={reply.id}
            comment={reply}
            pending={thread.pendingCommentIds.has(reply.id)}
            occurredAt={reply.createdAt}
            isReply
            replyToLogin={parent?.authorLogin}
          />
        );
      })}
      {!thread.isResolved &&
      canResolve &&
      thread.threadNodeId &&
      onToggleResolved ? (
        <div className="pt-1">
          <ReviewThreadResolveButton
            resolved={false}
            loading={resolveLoading}
            onToggle={() => onToggleResolved(true)}
          />
        </div>
      ) : null}
    </>
  );

  if (thread.isResolved) {
    return (
      <ReviewThreadResolvedShell
        resolved
        commentCount={commentCount}
        authorLogin={thread.root.authorLogin}
        variant="feed"
        canResolve={canResolve && Boolean(thread.threadNodeId)}
        resolveLoading={resolveLoading}
        onToggleResolved={
          onToggleResolved ? () => onToggleResolved(false) : undefined
        }
      >
        {threadBody}
      </ReviewThreadResolvedShell>
    );
  }

  return <FeedCard>{threadBody}</FeedCard>;
}
