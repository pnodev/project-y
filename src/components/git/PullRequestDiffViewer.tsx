import { useQuery } from "@tanstack/react-query";
import { fetchTaskPullRequestDiff } from "~/db/queries/git";
import { DiffReviewPanel } from "~/components/git/DiffReviewPanel";
import { DiffLoadingSkeleton } from "~/components/git/review/DiffLoadingSkeleton";
import { cn } from "~/lib/utils";

/** @deprecated Prefer TaskDevelopmentWorkspace; kept for inline layout fallback. */
export function PullRequestDiffViewer({
  taskId,
  pullRequestId,
  className,
  readOnly = false,
}: {
  taskId: string;
  pullRequestId: string;
  className?: string;
  readOnly?: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["git", "diff", taskId, pullRequestId],
    queryFn: () =>
      fetchTaskPullRequestDiff({
        data: { taskId, pullRequestId },
      }),
  });

  if (isLoading) {
    return <DiffLoadingSkeleton className="border-t-0" />;
  }

  if (!data) return null;

  return (
    <DiffReviewPanel
      taskId={taskId}
      pullRequestId={pullRequestId}
      scopeLabel={`PR #${data.pullRequest.number} vs ${data.pullRequest.baseRef}`}
      files={data.files}
      headSha={data.headSha}
      readOnly={readOnly}
      className={cn(className)}
    />
  );
}
