import { createServerFn, useServerFn } from "@tanstack/react-start";
import {
  CreateSprint,
  insertSprintValidator,
  sprints,
  tasks,
  UpdateSprint,
  updateSprintValidator,
} from "../schema";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { db } from "..";
import { getOwningIdentity } from "~/lib/utils";
import { v7 as uuid } from "uuid";
import { sync } from "./sync";
import { useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";

const createSprint = createServerFn({ method: "POST" })
  .validator(insertSprintValidator)
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    await db.insert(sprints).values({
      ...data,
      id: uuid(),
      owner: getOwningIdentity(user),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await sync("sprint-create", { data });
  });

export function useCreateSprintMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _createSprint = useServerFn(createSprint);

  return useCallback(
    async (sprint: CreateSprint) => {
      const result = await _createSprint({ data: sprint });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["sprints"],
      });

      return result;
    },
    [_createSprint]
  );
}

const updateSprint = createServerFn({ method: "POST" })
  .validator(updateSprintValidator)
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    await db
      .update(sprints)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(eq(sprints.id, data.id), eq(sprints.owner, getOwningIdentity(user)))
      );
    await sync("sprint-update-" + data.id, { data });
  });

export function useUpdateSprintMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _updateSprint = useServerFn(updateSprint);

  return useCallback(
    async (sprint: UpdateSprint) => {
      const result = await _updateSprint({ data: sprint });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["sprints"],
      });
      queryClient.invalidateQueries({
        queryKey: ["sprints", sprint.id],
      });

      return result;
    },
    [_updateSprint]
  );
}

export const deleteSprint = createServerFn({ method: "POST" })
  .validator((d: { sprintId: string }) => d)
  .handler(async ({ data: { sprintId } }) => {
    const user = await getAuth(getWebRequest());

    // remove all tasks from the sprint
    await db
      .update(tasks)
      .set({ sprintId: null })
      .where(
        and(
          eq(tasks.sprintId, sprintId),
          eq(tasks.owner, getOwningIdentity(user))
        )
      );

    await db
      .delete(sprints)
      .where(
        and(
          eq(sprints.id, sprintId),
          eq(sprints.owner, getOwningIdentity(user))
        )
      );
    await sync("sprint-delete", { data: { id: sprintId } });
  });

export function useDeleteSprintMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _deleteSprint = useServerFn(deleteSprint);

  return useCallback(
    async (sprintId: string) => {
      const result = await _deleteSprint({ data: { sprintId } });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["sprints"],
      });
      queryClient.invalidateQueries({
        queryKey: ["sprints", sprintId],
      });

      return result;
    },
    [_deleteSprint]
  );
}
