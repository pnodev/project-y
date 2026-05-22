import { ExternalLink } from "lucide-react";
import { inferCommentSide } from "~/lib/git/review-comment-annotation";
import { useTaskGitReviewNav } from "~/lib/git/task-git-review-nav";
import type { GitReviewComment } from "~/lib/git/types";
import { cn } from "~/lib/utils";

export function DiffLineLocationLink({
  comment,
  className,
  showGithub = true,
}: {
  comment: GitReviewComment;
  className?: string;
  showGithub?: boolean;
}) {
  const nav = useTaskGitReviewNav();
  const line = comment.line ?? comment.originalLine;
  const label =
    line != null ? `${comment.path}:${line}` : comment.path;
  const canJump = line != null && Boolean(nav);

  const handleJump = () => {
    if (line == null || !nav) return;
    nav.focusLineInDiff({
      path: comment.path,
      line,
      side: inferCommentSide(comment),
    });
  };

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-1.5", className)}>
      {canJump ? (
        <button
          type="button"
          onClick={handleJump}
          className="text-primary font-mono text-[10px] font-medium underline-offset-2 hover:underline"
          title="Show on pull request diff"
        >
          {label}
        </button>
      ) : (
        <span className="text-muted-foreground font-mono text-[10px]">{label}</span>
      )}
      {showGithub ? (
        <a
          href={comment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground inline-flex items-center gap-0.5 text-[10px] hover:underline"
          title="Open on GitHub"
        >
          GitHub
          <ExternalLink className="size-2.5" />
        </a>
      ) : null}
    </span>
  );
}
