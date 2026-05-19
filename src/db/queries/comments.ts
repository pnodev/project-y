import { requireSessionFromRequest } from "~/lib/session";
import { createServerFn } from "@tanstack/react-start";
import { db } from "..";
import { formatUserName, getOwningIdentity } from "~/lib/utils";
import { and, asc, eq, inArray } from "drizzle-orm";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEventSource } from "~/hooks/use-event-source";
import { user } from "~/db/auth-schema";
import type { Comment } from "~/db/schema";

export type CommentWithAuthor = Omit<Comment, "author"> & {
  author: string | null;
  authorAvatar: string | null;
};

export async function getCommentsForTask(
  owner: string,
  taskId: string
): Promise<CommentWithAuthor[]> {
  const rawData = await db.query.comments.findMany({
    where: (model, { eq: eqFn }) =>
      and(eqFn(model.owner, owner), eqFn(model.taskId, taskId)),
    orderBy: (fields) => [asc(fields.createdAt)],
  });

  const authorIds = [...new Set(rawData.map((comment) => comment.author))];
  const authors =
    authorIds.length > 0
      ? await db
          .select({
            id: user.id,
            firstname: user.firstname,
            lastname: user.lastname,
            image: user.image,
          })
          .from(user)
          .where(inArray(user.id, authorIds))
      : [];

  const authorsById = new Map(authors.map((author) => [author.id, author]));

  return rawData.map((comment) => {
    const author = authorsById.get(comment.author);
    return {
      ...comment,
      author: author
        ? formatUserName(author.firstname, author.lastname)
        : null,
      authorAvatar: author?.image ?? null,
    };
  });
}

const fetchCommentsForTask = createServerFn({ method: "GET" })
  .inputValidator((data?: string) => data)
  .handler(async ({ data }): Promise<CommentWithAuthor[]> => {
    if (!data) {
      return [];
    }

    const session = await requireSessionFromRequest();
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
