import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { db } from "..";
import { getOwningIdentity } from "~/lib/utils";
import { and } from "drizzle-orm";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEventSource } from "~/hooks/use-event-source";

const fetchCommentsForTask = createServerFn({ method: "GET" })
  .inputValidator((data?: string) => data)
  .handler(async ({ data }) => {
    if (!data) {
      return [];
    }
    console.info(`Fetching comments for... ${data}`);
    const user = await auth();
    const rawData = await db.query.comments.findMany({
      where: (model, { eq }) =>
        and(eq(model.owner, getOwningIdentity(user)), eq(model.taskId, data)),
      orderBy: (fields, { asc }) => [asc(fields.createdAt)],
    });

    const authorIds = [...new Set(rawData.map((comment) => comment.author))];
    const authorsById = new Map(
      await Promise.all(
        authorIds.map(async (authorId) => {
          const user = await clerkClient().users.getUser(authorId);
          return [
            authorId,
            { fullName: user.fullName, imageUrl: user.imageUrl },
          ] as const;
        }),
      ),
    );

    return rawData.map((comment) => {
      const author = authorsById.get(comment.author);
      return {
        ...comment,
        author: author?.fullName ?? null,
        authorAvatar: author?.imageUrl ?? null,
      };
    });
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
