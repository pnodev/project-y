import { requireSessionFromRequest } from "~/lib/session";
import { createServerFn } from "@tanstack/react-start";
import { db } from "..";
import { getOwningIdentity } from "~/lib/utils";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEventSource } from "~/hooks/use-event-source";

const fetchAttachmentsForTask = createServerFn({ method: "GET" })
  .inputValidator((data?: string) => data)
  .handler(async ({ data }) => {
    if (!data) {
      return [];
    }
    console.info(`Fetching attachments for... ${data}`);
    const session = await requireSessionFromRequest();
    return await db.query.attachments.findMany({
      where: (model, { eq, and }) =>
        and(eq(model.owner, getOwningIdentity(session)), eq(model.taskId, data)),
      orderBy: (fields, { asc }) => [asc(fields.createdAt)],
    });
  });

export const attachmentsQueryOptions = (taskId?: string) =>
  queryOptions({
    queryKey: ["attachments", taskId],
    queryFn: () => fetchAttachmentsForTask({ data: taskId }),
  });

export const useAttachmentsQuery = (taskId: string) => {
  const queryData = useSuspenseQuery(attachmentsQueryOptions(taskId));

  useEventSource({
    topics: [
      "attachment-create",
      "attachment-delete",
      ...queryData.data.map((t) => `attachment-update-${t.id}`),
    ],
    callback: () => {
      queryData.refetch();
    },
  });

  return { ...queryData };
};
