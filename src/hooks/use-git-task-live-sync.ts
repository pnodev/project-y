import { useQueryClient } from "@tanstack/react-query";
import { useEventSource } from "~/hooks/use-event-source";
import { invalidateGitTaskQueries } from "~/hooks/invalidate-git-task-queries";
import { parseTaskGitSyncPayload } from "~/lib/git/sync-task-update";

/** Refetch git queries when webhooks or mutations sync this task. */
export function useGitTaskLiveSync(taskId: string | undefined) {
  const queryClient = useQueryClient();

  useEventSource({
    topics: taskId ? [`task-update-${taskId}`] : [],
    callback: (data) => {
      if (!taskId) return;
      const payload = parseTaskGitSyncPayload(data);
      void invalidateGitTaskQueries(
        queryClient,
        taskId,
        payload?.gitInvalidate,
        payload?.pullRequestId
      );
    },
  });
}
