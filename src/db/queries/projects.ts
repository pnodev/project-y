import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { getOwningIdentity } from "~/lib/utils";
import { useEventSource } from "~/hooks/use-event-source";

const fetchProjects = createServerFn({ method: "GET" }).handler(async () => {
  console.info("Fetching projects...");
  const user = await getAuth(getWebRequest());
  return await db.query.projects.findMany({
    where: (model, { eq }) => eq(model.owner, getOwningIdentity(user)),
  });
});

export const projectsQueryOptions = () =>
  queryOptions({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(),
  });

export const useProjectsQuery = () => {
  const queryData = useSuspenseQuery(projectsQueryOptions());

  useEventSource({
    topics: [
      "project-create",
      "project-delete",
      ...queryData.data.map((t) => `project-update-${t.id}`),
    ],
    callback: () => {
      queryData.refetch();
    },
  });

  return { ...queryData };
};

const fetchProject = createServerFn({ method: "GET" })
  .validator((d: { projectId: string }) => d)
  .handler(async ({ data: { projectId } }) => {
    console.info("Fetching project...");
    const user = await getAuth(getWebRequest());
    return await db.query.projects.findFirst({
      where: (model, { eq, and }) =>
        and(eq(model.id, projectId), eq(model.owner, getOwningIdentity(user))),
    });
  });

export const projectQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: ["projects", projectId],
    queryFn: () => fetchProject({ data: { projectId } }),
  });

export const useProjectQuery = (projectId: string) => {
  const queryData = useSuspenseQuery(projectQueryOptions(projectId));

  useEventSource({
    topics: [`project-update-${projectId}`],
    callback: () => {
      queryData.refetch();
    },
  });

  return { ...queryData };
};
