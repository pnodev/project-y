import { createServerFn, useServerFn } from "@tanstack/react-start";
import { db } from ".";
import {
  CreateStatus,
  CreateTask,
  insertStatusValidator,
  insertTaskValidator,
  Status,
  statuses,
  Task,
  tasks,
} from "./schema";
import { v7 as uuid } from "uuid";
import z from "zod";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { eq } from "drizzle-orm";

export const createTask = createServerFn({ method: "POST" })
  .validator(insertTaskValidator)
  .handler(async ({ data }) => {
    await db.insert(tasks).values({
      id: uuid(),
      name: data.name,
      description: data.description,
      statusId: data.statusId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

export function useCreateTaskMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _createTask = useServerFn(createTask);

  return useCallback(
    async (task: CreateTask) => {
      const result = await _createTask({ data: task });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });

      return result;
    },
    [router, queryClient, _createTask]
  );
}

export const createStatus = createServerFn({ method: "POST" })
  .validator(insertStatusValidator)
  .handler(async ({ data }) => {
    await db.insert(statuses).values({
      id: uuid(),
      name: data.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

export function useCreateStatusMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _createStatus = useServerFn(createStatus);

  return useCallback(
    async (status: CreateStatus) => {
      const result = await _createStatus({ data: status });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["statuses"],
      });

      return result;
    },
    [router, queryClient, _createStatus]
  );
}

export const deleteStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await db.delete(statuses).where(eq(statuses.id, data.id));
  });

export function useDeleteStatusMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _deleteStatus = useServerFn(deleteStatus);

  return useCallback(
    async (id: string) => {
      const result = await _deleteStatus({ data: { id } });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["statuses"],
      });

      return result;
    },
    [router, queryClient, _deleteStatus]
  );
}
