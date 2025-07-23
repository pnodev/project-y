import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { getOwningIdentity } from "~/lib/utils";

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
