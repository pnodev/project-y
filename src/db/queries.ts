import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from ".";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { statuses, tasks } from "./schema";
import { asc, desc, eq, sql } from "drizzle-orm";

export const fetchTasks = createServerFn({ method: "GET" }).handler(
  async () => {
    console.info("Fetching tasks...");
    return await db.query.tasks.findMany();
  }
);

export const tasksQueryOptions = () =>
  queryOptions({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks(),
  });

export const fetchTask = createServerFn({ method: "GET" })
  .validator((d: string) => d)
  .handler(async ({ data }) => {
    console.info("Fetching task...");
    return await db.query.tasks.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, data);
      },
    });
  });

export const taskQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["tasks", id],
    queryFn: () => fetchTask({ data: id }),
  });

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

export const authStateFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getWebRequest();
    const { userId } = await getAuth(request);

    if (!userId) {
      // This will error because you're redirecting to a path that doesn't exist yet
      // You can create a sign-in route to handle this
      throw redirect({
        to: "/sign-in/$",
      });
    }

    return { userId };
  }
);

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
