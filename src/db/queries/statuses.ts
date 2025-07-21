import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import { statuses, tasks } from "~/db/schema";
import { asc, eq, sql } from "drizzle-orm";

export const fetchStatuses = createServerFn({ method: "GET" }).handler(
  async () => {
    console.info("Fetching statuses...");
    return await db.query.statuses.findMany({
      orderBy: (fields, { asc }) => [asc(fields.order)],
    });
  }
);

export const statusesQueryOptions = () =>
  queryOptions({
    queryKey: ["statuses"],
    queryFn: () => fetchStatuses(),
  });

export const fetchStatusesWithTaskCounts = createServerFn({
  method: "GET",
}).handler(async () => {
  console.info("Fetching statuses with task counts...");
  const statusesWithCounts = await db
    .select({
      id: statuses.id,
      name: statuses.name,
      color: statuses.color,
      order: statuses.order,
      createdAt: statuses.createdAt,
      updatedAt: statuses.updatedAt,
      taskCount: sql<number>`count(${tasks.id})::int`,
    })
    .from(statuses)
    .leftJoin(tasks, eq(statuses.id, tasks.statusId))
    .groupBy(statuses.id)
    .orderBy(asc(statuses.order));

  return statusesWithCounts;
});

export const statusesWithCountsQueryOptions = () =>
  queryOptions({
    queryKey: ["statuses-with-counts"],
    queryFn: () => fetchStatusesWithTaskCounts(),
  });
