import { createServerFn, useServerFn } from "@tanstack/react-start";
import {
  comments,
  CreateComment,
  CreateProject,
  insertCommentValidator,
  insertProjectValidator,
  projects,
} from "../schema";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { db } from "..";
import { v7 as uuid } from "uuid";
import { getOwningIdentity } from "~/lib/utils";
import { useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

const createProject = createServerFn({ method: "POST" })
  .validator(insertProjectValidator)
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    await db.insert(projects).values({
      ...data,
      id: uuid(),
      owner: getOwningIdentity(user),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

export function useCreateProjectMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _createProject = useServerFn(createProject);

  return useCallback(
    async (projectData: CreateProject) => {
      const result = await _createProject({ data: projectData });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["projects"],
      });

      return result;
    },
    [_createProject]
  );
}
