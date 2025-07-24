import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import { labels, labelsToTasks } from "~/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { getOwningIdentity } from "~/lib/utils";
import { useEventSource } from "~/hooks/use-event-source";

export const fetchLabels = createServerFn({ method: "GET" }).handler(
  async () => {
    console.info("Fetching labels...");
    const user = await getAuth(getWebRequest());
    return await db.query.labels.findMany({
      where: (model, { eq }) => eq(model.owner, getOwningIdentity(user)),
      orderBy: (fields, { asc }) => [asc(fields.order)],
    });
  }
);

export const labelsQueryOptions = () =>
  queryOptions({
    queryKey: ["labels"],
    queryFn: () => fetchLabels(),
  });

export const useLabelsQuery = () => {
  const queryData = useSuspenseQuery(labelsQueryOptions());

  useEventSource({
    topics: [
      "label-create",
      "label-delete",
      ...queryData.data.map((t) => `label-update-${t.id}`),
    ],
    callback: () => {
      queryData.refetch();
    },
  });

  return { ...queryData };
};

export const fetchLabelsWithTaskCounts = createServerFn({
  method: "GET",
}).handler(async () => {
  console.info("Fetching labels with task counts...");
  const user = await getAuth(getWebRequest());
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
    .where(eq(labels.owner, getOwningIdentity(user)))
    .groupBy(labels.id)
    .orderBy(asc(labels.order));

  return labelsWithCounts;
});

export const labelsWithCountsQueryOptions = () =>
  queryOptions({
    queryKey: ["labels-with-counts"],
    queryFn: () => fetchLabelsWithTaskCounts(),
  });

export const useLabelsWithCountsQuery = () => {
  const queryData = useSuspenseQuery(labelsWithCountsQueryOptions());

  useEventSource({
    topics: [
      "label-create",
      "label-delete",
      ...queryData.data.map((t) => `label-update-${t.id}`),
    ],
    callback: () => {
      queryData.refetch();
    },
  });

  return { ...queryData };
};
