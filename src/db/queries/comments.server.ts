import "@tanstack/react-start/server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "~/db";
import { user } from "~/db/auth-schema";
import { formatUserName } from "~/lib/utils";
import type { Comment } from "~/db/schema";

export type CommentWithAuthor = Omit<Comment, "author"> & {
  author: string | null;
  authorAvatar: string | null;
};

export async function getCommentsForTask(
  owner: string,
  taskId: string,
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
