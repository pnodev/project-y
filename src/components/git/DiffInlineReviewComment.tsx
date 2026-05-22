import { GitHubMarkdownBody } from "~/components/git/GitHubMarkdownBody";
import { ReviewThreadResolveButton } from "~/components/git/ReviewThreadResolveButton";
import { ReviewThreadResolvedShell } from "~/components/git/ReviewThreadResolvedShell";
import type { GitReviewComment } from "~/lib/git/types";
import { cn } from "~/lib/utils";

function looksLikeMarkdown(body: string): boolean {
  return /(^|\n)\s{0,3}#{1,6}\s|```|<details[\s>]|<!--|\*\*|__|\[.+\]\(.+\)/.test(
    body
  );
}

function CommentBody({ body }: { body: string }) {
  const useMarkdown = looksLikeMarkdown(body);
  return (
    <div
      className={cn(
        "text-sm leading-relaxed",
        useMarkdown &&
          "gh-markdown diff-inline-comment__markdown text-inherit [&_a]:text-blue-700 dark:[&_a]:text-blue-300 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_pre]:font-mono [&_pre]:text-[0.8125rem] [&_pre]:border-zinc-300 dark:[&_pre]:border-zinc-600"
      )}
    >
      {useMarkdown ? (
        <GitHubMarkdownBody
          body={body}
          collapsible={false}
          className="text-sm leading-relaxed"
        />
      ) : (
        <p className="whitespace-pre-wrap">{body}</p>
      )}
    </div>
  );
}

function CommentAvatar({
  comment,
}: {
  comment: GitReviewComment;
}) {
  const profileUrl =
    comment.authorHtmlUrl ?? `https://github.com/${comment.authorLogin}`;

  return (
    <a
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 self-start"
    >
      {comment.authorAvatarUrl ? (
        <img
          src={comment.authorAvatarUrl}
          alt=""
          className="size-6 rounded-full"
        />
      ) : (
        <span className="flex size-6 items-center justify-center rounded-full bg-zinc-200 text-[11px] font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100">
          {comment.authorLogin.slice(0, 1).toUpperCase()}
        </span>
      )}
    </a>
  );
}

/**
 * Inline PR comments render inside Pierre’s dark diff, which does not inherit
 * app theme variables — use a fixed high-contrast card surface and sans-serif
 * (the diff itself stays monospace; only code spans in markdown use mono).
 */
export function DiffInlineReviewComment({
  comment,
  pending = false,
  showResolve = false,
  resolveLoading = false,
  onToggleResolved,
  threadCommentCount = 1,
  className,
}: {
  comment: GitReviewComment;
  pending?: boolean;
  showResolve?: boolean;
  resolveLoading?: boolean;
  onToggleResolved?: () => void;
  threadCommentCount?: number;
  className?: string;
}) {
  const body = comment.body?.trim() ?? "";
  if (!body) return null;

  const resolved = comment.threadIsResolved ?? false;
  const profileUrl =
    comment.authorHtmlUrl ?? `https://github.com/${comment.authorLogin}`;

  const card = (
    <div
      className={cn(
        "diff-inline-comment rounded-md border px-3 py-2.5 text-left font-sans antialiased shadow-md",
        "border-zinc-300 bg-zinc-50 text-zinc-900",
        "dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
      )}
    >
      <div className="flex gap-2.5">
        <CommentAvatar comment={comment} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-snug">
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-inherit hover:underline"
            >
              {comment.authorLogin}
            </a>
            {pending ? (
              <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                Pending
              </span>
            ) : null}
            <a
              href={comment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:underline dark:text-zinc-400"
            >
              on GitHub
            </a>
          </div>
          <CommentBody body={body} />
          {showResolve && comment.threadNodeId && onToggleResolved ? (
            <ReviewThreadResolveButton
              resolved={false}
              loading={resolveLoading}
              onToggle={onToggleResolved}
              className="-ml-2 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  const wrapClass = cn(
    "diff-inline-comment-wrap max-w-2xl mt-2.5 mb-1 font-sans",
    className
  );

  if (!resolved) {
    return <div className={wrapClass}>{card}</div>;
  }

  return (
    <ReviewThreadResolvedShell
      resolved
      commentCount={threadCommentCount}
      authorLogin={comment.authorLogin}
      variant="diff"
      canResolve={showResolve && Boolean(comment.threadNodeId)}
      resolveLoading={resolveLoading}
      onToggleResolved={onToggleResolved}
      className={wrapClass}
    >
      {card}
    </ReviewThreadResolvedShell>
  );
}
