import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { getOwningIdentity } from "~/lib/utils";
import { useEventSource } from "~/hooks/use-event-source";

const fetchSprints = createServerFn({ method: "GET" }).handler(async () => {
  console.info("Fetching sprints...");
  const user = await getAuth(getWebRequest());

  return await db.query.sprints.findMany({
    where: (model, { eq }) => eq(model.owner, getOwningIdentity(user)),
    orderBy: (fields, { asc }) => [asc(fields.createdAt)],
  });
});

export const sprintsQueryOptions = () =>
  queryOptions({
    queryKey: ["sprints"],
    queryFn: () => fetchSprints(),
  });

export const useSprintsQuery = () => {
  const queryData = useSuspenseQuery(sprintsQueryOptions());

  useEventSource({
    topics: [
      "sprint-create",
      "sprint-delete",
      ...queryData.data.map((t) => `sprint-update-${t.id}`),
    ],
    callback: () => {
      queryData.refetch();
    },
  });

  return { ...queryData };
};

const fetchSprint = createServerFn({ method: "GET" })
  .validator((d: { sprintId: string }) => d)
  .handler(async ({ data: { sprintId } }) => {
    console.info("Fetching sprint...");
    const user = await getAuth(getWebRequest());

    return await db.query.sprints.findFirst({
      where: (model, { eq, and }) =>
        and(eq(model.owner, getOwningIdentity(user)), eq(model.id, sprintId)),
      orderBy: (fields, { asc }) => [asc(fields.createdAt)],
    });
  });

export const sprintQueryOptions = (sprintId: string) =>
  queryOptions({
    queryKey: ["sprint", sprintId],
    queryFn: () => fetchSprint({ data: { sprintId } }),
  });

export const useSprintQuery = (sprintId: string) => {
  const queryData = useSuspenseQuery(sprintQueryOptions(sprintId));

  useEventSource({
    topics: [`sprint-update-${sprintId}`],
    callback: () => {
      queryData.refetch();
    },
  });

  return { ...queryData };
};
