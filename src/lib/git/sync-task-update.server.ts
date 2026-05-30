import "@tanstack/react-start/server-only";

import { sync } from "~/db/mutations/sync";
import type { GitInvalidateScope, TaskGitSyncPayload } from "~/lib/git/sync-task-update";

export async function syncTaskGitUpdate(
  taskId: string,
  scopes: GitInvalidateScope[],
  options?: { pullRequestId?: string }
) {
  const payload: TaskGitSyncPayload = {
    id: taskId,
    gitInvalidate: scopes,
    pullRequestId: options?.pullRequestId,
  };
  await sync(`task-update-${taskId}`, payload);
}
