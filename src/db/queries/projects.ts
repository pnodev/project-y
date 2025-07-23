import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { getOwningIdentity } from "~/lib/utils";

export const fetchProjects = createServerFn({ method: "GET" }).handler(
  async () => {
    console.info("Fetching projects...");
    const user = await getAuth(getWebRequest());
    return await db.query.projects.findMany({
      where: (model, { eq }) => eq(model.owner, getOwningIdentity(user)),
    });
  }
);

export const projectsQueryOptions = () =>
  queryOptions({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(),
  });
