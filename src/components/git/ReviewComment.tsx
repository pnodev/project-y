import type { GitPullRequestReview, GitReviewComment } from "~/lib/git/types";
import { cn } from "~/lib/utils";

function AuthorLink({
  login,
  avatarUrl,
  htmlUrl,
}: {
  login: string;
  avatarUrl: string | null;
  htmlUrl: string | null;
}) {
  const profileUrl = htmlUrl ?? `https://github.com/${login}`;

  return (
    <a
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 hover:underline"
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="size-5 rounded-full" />
      ) : (
        <span className="bg-muted flex size-5 items-center justify-center rounded-full text-[10px] font-medium">
          {login.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="font-medium">{login}</span>
    </a>
  );
}

export function ReviewComment({
  comment,
  pending = false,
  className,
}: {
  comment: GitReviewComment;
  pending?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("text-xs", className)}>
      <div className="flex flex-wrap items-center gap-2 pl-0">
        <AuthorLink
          login={comment.authorLogin}
          avatarUrl={comment.authorAvatarUrl}
          htmlUrl={comment.authorHtmlUrl}
        />
        {pending ? (
          <span className="text-muted-foreground rounded bg-muted px-1.5 py-0.5 text-[10px]">
            Pending
          </span>
        ) : null}
        <a
          href={comment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:underline"
        >
          on GitHub
        </a>
      </div>
      <p className="mt-1 whitespace-pre-wrap pl-7">{comment.body}</p>
    </div>
  );
}

const reviewEventLabels: Record<GitPullRequestReview["state"], string> = {
  COMMENTED: "commented",
  APPROVED: "approved",
  CHANGES_REQUESTED: "requested changes",
  DISMISSED: "dismissed",
  PENDING: "pending review",
};

export function PullRequestReviewItem({
  review,
  className,
}: {
  review: GitPullRequestReview;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border border-border/60 px-3 py-2 text-xs", className)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <AuthorLink
          login={review.authorLogin}
          avatarUrl={review.authorAvatarUrl}
          htmlUrl={review.authorHtmlUrl}
        />
        <span className="text-muted-foreground">
          {reviewEventLabels[review.state]}
        </span>
        {review.url ? (
          <a
            href={review.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:underline"
          >
            on GitHub
          </a>
        ) : null}
      </div>
      {review.body ? (
        <p className="text-muted-foreground mt-1 whitespace-pre-wrap pl-7">
          {review.body}
        </p>
      ) : null}
    </div>
  );
}
