import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import { labels, labelsToTasks } from "~/db/schema";
import { asc, eq, sql } from "drizzle-orm";

export const fetchLabels = createServerFn({ method: "GET" }).handler(
  async () => {
    console.info("Fetching labels...");
    return await db.query.labels.findMany({
      orderBy: (fields, { asc }) => [asc(fields.order)],
    });
  }
);

export const labelsQueryOptions = () =>
  queryOptions({
    queryKey: ["labels"],
    queryFn: () => fetchLabels(),
  });

export const fetchLabelsWithTaskCounts = createServerFn({
  method: "GET",
}).handler(async () => {
  console.info("Fetching labels with task counts...");
  const labelsWithCounts = await db
    .select({
      id: labels.id,
      name: labels.name,
      color: labels.color,
      order: labels.order,
      createdAt: labels.createdAt,
      updatedAt: labels.updatedAt,
      taskCount: sql<number>`count(${labelsToTasks.taskId})::int`,
    })
    .from(labels)
    .leftJoin(labelsToTasks, eq(labels.id, labelsToTasks.labelId))
    .groupBy(labels.id)
    .orderBy(asc(labels.order));

  return labelsWithCounts;
});

export const labelsWithCountsQueryOptions = () =>
  queryOptions({
    queryKey: ["labels-with-counts"],
    queryFn: () => fetchLabelsWithTaskCounts(),
  });
