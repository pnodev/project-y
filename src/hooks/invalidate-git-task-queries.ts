import type { QueryClient } from "@tanstack/react-query";
import type { GitInvalidateScope } from "~/lib/git/sync-task-update";

export function invalidateGitTaskQueries(
  queryClient: QueryClient,
  taskId: string,
  scopes: GitInvalidateScope[] | undefined,
  pullRequestId?: string
) {
  const allScopes = scopes?.length ? scopes : (["task", "summaries"] as const);
  const tasks: Promise<void>[] = [];

  for (const scope of allScopes) {
    switch (scope) {
      case "task":
        tasks.push(
          queryClient.invalidateQueries({ queryKey: ["git", "task", taskId] })
        );
        break;
      case "summaries":
        tasks.push(
          queryClient.invalidateQueries({ queryKey: ["git", "summaries"] })
        );
        break;
      case "diff":
        tasks.push(
          queryClient.invalidateQueries({
            queryKey: ["git", "diff", taskId],
            exact: false,
          })
        );
        break;
      case "commits":
        tasks.push(
          queryClient.invalidateQueries({
            queryKey: ["git", "commits", taskId],
            exact: false,
          })
        );
        break;
      case "pr-comments":
        tasks.push(
          queryClient.invalidateQueries({
            queryKey: pullRequestId
              ? ["git", "pr-comments", taskId, pullRequestId]
              : ["git", "pr-comments", taskId],
            exact: Boolean(pullRequestId),
          })
        );
        break;
      case "pr-status":
        tasks.push(
          queryClient.invalidateQueries({
            queryKey: pullRequestId
              ? ["git", "pr-status", taskId, pullRequestId]
              : ["git", "pr-status", taskId],
            exact: Boolean(pullRequestId),
          })
        );
        break;
      case "pr-meta":
        tasks.push(
          queryClient.invalidateQueries({
            queryKey: pullRequestId
              ? ["git", "pr-meta", taskId, pullRequestId]
              : ["git", "pr-meta", taskId],
            exact: Boolean(pullRequestId),
          })
        );
        break;
    }
  }

  return Promise.all(tasks);
}
