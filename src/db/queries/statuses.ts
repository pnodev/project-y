import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import { statuses, tasks } from "~/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { getOwningIdentity } from "~/lib/utils";

export const fetchStatuses = createServerFn({ method: "GET" }).handler(
  async () => {
    console.info("Fetching statuses...");
    const user = await getAuth(getWebRequest());

    return await db.query.statuses.findMany({
      where: (model, { eq }) => eq(model.owner, getOwningIdentity(user)),
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
  const user = await getAuth(getWebRequest());

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
    .where(eq(statuses.owner, getOwningIdentity(user)))
    .groupBy(statuses.id)
    .orderBy(asc(statuses.order));

  return statusesWithCounts;
});

export const statusesWithCountsQueryOptions = () =>
  queryOptions({
    queryKey: ["statuses-with-counts"],
    queryFn: () => fetchStatusesWithTaskCounts(),
  });
