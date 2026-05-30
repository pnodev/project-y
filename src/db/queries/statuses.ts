import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import { statuses, tasks } from "~/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { requireSessionFromRequest } from "~/lib/session";
import { getOwningIdentity } from "~/lib/utils";
import { useEventSource } from "~/hooks/use-event-source";

export const fetchStatuses = createServerFn({ method: "GET" }).handler(
  async () => {
    console.info("Fetching statuses...");
    const session = await requireSessionFromRequest();

    return await db.query.statuses.findMany({
      where: (model, { eq }) => eq(model.owner, getOwningIdentity(session)),
      orderBy: (fields, { asc }) => [asc(fields.order)],
    });
  }
);

export const statusesQueryOptions = () =>
  queryOptions({
    queryKey: ["statuses"],
    queryFn: () => fetchStatuses(),
    staleTime: 5 * 60_000,
  });

export const useStatusesQuery = () => {
  const queryData = useSuspenseQuery(statusesQueryOptions());

  useEventSource({
    topics: [
      "status-create",
      "status-delete",
      ...queryData.data.map((t) => `status-update-${t.id}`),
    ],
    callback: () => {
      queryData.refetch();
    },
  });

  return { ...queryData };
};

export const fetchStatusesWithTaskCounts = createServerFn({
  method: "GET",
}).handler(async () => {
  console.info("Fetching statuses with task counts...");
  const session = await requireSessionFromRequest();

  const statusesWithCounts = await db
    .select({
      id: statuses.id,
      name: statuses.name,
      color: statuses.color,
      order: statuses.order,
      isClosing: statuses.isClosing,
      createdAt: statuses.createdAt,
      updatedAt: statuses.updatedAt,
      taskCount: sql<number>`count(${tasks.id})::int`,
    })
    .from(statuses)
    .leftJoin(tasks, eq(statuses.id, tasks.statusId))
    .where(eq(statuses.owner, getOwningIdentity(session)))
    .groupBy(statuses.id)
    .orderBy(asc(statuses.order));

  return statusesWithCounts;
});

export const statusesWithCountsQueryOptions = () =>
  queryOptions({
    queryKey: ["statuses-with-counts"],
    queryFn: () => fetchStatusesWithTaskCounts(),
  });

export const useStatusesWithCountsQuery = () => {
  const queryData = useSuspenseQuery(statusesWithCountsQueryOptions());

  useEventSource({
    topics: [
      "status-create",
      "status-delete",
      ...queryData.data.map((t) => `status-update-${t.id}`),
    ],
    callback: () => {
      queryData.refetch();
    },
  });

  return { ...queryData };
};
