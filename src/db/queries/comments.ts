import { getAuth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { db } from "..";
import { getOwningIdentity } from "~/lib/utils";
import { and } from "drizzle-orm";
import { queryOptions } from "@tanstack/react-query";
import { clerkClient } from "@clerk/clerk-sdk-node";

export const fetchCommentsForTask = createServerFn({ method: "GET" })
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
