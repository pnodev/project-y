import { requireSessionFromRequest } from "~/lib/session";
import { createServerFn } from "@tanstack/react-start";
import { getOwningIdentity } from "~/lib/utils";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEventSource } from "~/hooks/use-event-source";

export type { CommentWithAuthor } from "~/db/queries/comments.server";

const fetchCommentsForTask = createServerFn({ method: "GET" })
  .inputValidator((data?: string) => data)
  .handler(async ({ data }) => {
    if (!data) {
      return [];
    }

    const session = await requireSessionFromRequest();
    const { getCommentsForTask } = await import("~/db/queries/comments.server");
    return getCommentsForTask(getOwningIdentity(session), data);
  });

export const commentsQueryOptions = (taskId?: string) =>
  queryOptions({
    queryKey: ["comments", taskId],
    queryFn: () => fetchCommentsForTask({ data: taskId }),
  });

export const useCommentsQuery = (taskId: string) => {
  const queryData = useSuspenseQuery(commentsQueryOptions(taskId));

  useEventSource({
    topics: [
      "comment-create",
      ...queryData.data.map((t) => `comment-update-${t.id}`),
    ],
    callback: () => {
      queryData.refetch();
    },
  });

  return { ...queryData };
};
