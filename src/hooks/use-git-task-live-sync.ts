import { useQueryClient } from "@tanstack/react-query";
import { useEventSource } from "~/hooks/use-event-source";

/** Refetch git task context when webhooks or mutations sync this task. */
export function useGitTaskLiveSync(taskId: string | undefined) {
  const queryClient = useQueryClient();

  useEventSource({
    topics: taskId ? [`task-update-${taskId}`] : [],
    callback: () => {
      if (!taskId) return;
      void queryClient.invalidateQueries({ queryKey: ["git", "task", taskId] });
      void queryClient.invalidateQueries({ queryKey: ["git", "summaries"] });
    },
  });
}
