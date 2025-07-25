import { getAuth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { db } from "..";
import { getOwningIdentity } from "~/lib/utils";
import { and } from "drizzle-orm";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { useEventSource } from "~/hooks/use-event-source";

const fetchCommentsForTask = createServerFn({ method: "GET" })
  .validator((data?: string) => data)
  .handler(async ({ data }) => {
    if (!data) {
      return [];
    }
    console.info(`Fetching comments for... ${data}`);
    const user = await getAuth(getWebRequest());
    const rawData = await db.query.comments.findMany({
      where: (model, { eq }) =>
        and(eq(model.owner, getOwningIdentity(user)), eq(model.taskId, data)),
      orderBy: (fields, { asc }) => [asc(fields.createdAt)],
    });

    return Promise.all(
      rawData.map(async (comment) => ({
        ...comment,
        author: (await clerkClient.users.getUser(comment.author)).fullName,
        authorAvatar: (await clerkClient.users.getUser(comment.author))
          .imageUrl,
      }))
    );
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
