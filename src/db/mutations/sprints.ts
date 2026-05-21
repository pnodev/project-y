import { createServerFn, useServerFn } from "@tanstack/react-start";
import {
  CreateSprint,
  insertSprintValidator,
  sprints,
  tasks,
  UpdateSprint,
  updateSprintValidator,
} from "../schema";
import { requireSessionFromRequest } from "~/lib/session";
import { db } from "..";
import { getOwningIdentity } from "~/lib/utils";
import { v7 as uuid } from "uuid";
import { sync, syncDashboard } from "./sync";
import { useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const createSprint = createServerFn({ method: "POST" })
  .inputValidator(insertSprintValidator)
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);

    await db.insert(sprints).values({
      ...data,
      id: uuid(),
      owner,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await sync("sprint-create", { data });
    await syncDashboard(owner, { data });
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
    [router, queryClient, _createSprint]
  );
}

const updateSprint = createServerFn({ method: "POST" })
  .inputValidator(updateSprintValidator)
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);

    await db
      .update(sprints)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(sprints.id, data.id), eq(sprints.owner, owner)));
    await sync("sprint-update-" + data.id, { data });
    await syncDashboard(owner, { data });
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
    [router, queryClient, _updateSprint]
  );
}

export const deleteSprint = createServerFn({ method: "POST" })
  .inputValidator(z.object({ sprintId: z.string() }))
  .handler(async ({ data: { sprintId } }) => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);

    // remove all tasks from the sprint
    await db
      .update(tasks)
      .set({ sprintId: null })
      .where(and(eq(tasks.sprintId, sprintId), eq(tasks.owner, owner)));

    await db
      .delete(sprints)
      .where(and(eq(sprints.id, sprintId), eq(sprints.owner, owner)));
    await sync("sprint-delete", { data: { id: sprintId } });
    await syncDashboard(owner, { data: { id: sprintId } });
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
    [router, queryClient, _deleteSprint]
  );
}
