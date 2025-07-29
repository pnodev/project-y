import { createServerFn, useServerFn } from "@tanstack/react-start";
import {
  comments,
  CreateComment,
  CreateProject,
  insertCommentValidator,
  insertProjectValidator,
  projects,
  tasks,
  UpdateProject,
  updateProjectValidator,
} from "../schema";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { db } from "..";
import { v7 as uuid } from "uuid";
import { getOwningIdentity } from "~/lib/utils";
import { useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { sync } from "./sync";
import { and, eq } from "drizzle-orm";
import z from "zod";

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
    await sync(`project-create`, { data });
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

const updateProject = createServerFn({ method: "POST" })
  .validator(updateProjectValidator)
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    await db
      .update(projects)
      .set({
        name: data.name,
        description: data.description,
        logo: data.logo,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projects.id, data.id!),
          eq(projects.owner, getOwningIdentity(user))
        )
      );
    await sync(`project-update-${data.id}`, { data });
  });

export function useUpdateProjectMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _updateProject = useServerFn(updateProject);

  return useCallback(
    async (projectData: UpdateProject) => {
      const result = await _updateProject({ data: projectData });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["projects", projectData.id],
      });

      return result;
    },
    [_updateProject]
  );
}

const deleteProject = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    await db
      .delete(tasks)
      .where(
        and(
          eq(tasks.projectId, data.id),
          eq(tasks.owner, getOwningIdentity(user))
        )
      );
    await db
      .delete(projects)
      .where(
        and(
          eq(projects.id, data.id),
          eq(projects.owner, getOwningIdentity(user))
        )
      );
    await sync("project-delete", { data });
  });

export function useDeleteProjectMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _deleteProject = useServerFn(deleteProject);

  return useCallback(
    async (id: string) => {
      const result = await _deleteProject({ data: { id } });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
      queryClient.invalidateQueries({
        queryKey: ["projects-with-counts"],
      });

      return result;
    },
    [router, queryClient, _deleteProject]
  );
}
