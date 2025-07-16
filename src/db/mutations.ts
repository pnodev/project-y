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
  UpdateStatus,
  updateStatusValidator,
  UpdateTask,
  updateTaskValidator,
} from "./schema";
import { v7 as uuid } from "uuid";
import z from "zod";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { eq } from "drizzle-orm";

const createTask = createServerFn({ method: "POST" })
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

const updateTask = createServerFn({ method: "POST" })
  .validator(updateTaskValidator)
  .handler(async ({ data }) => {
    await db
      .update(tasks)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, data.id!));
  });

export function useUpdateTaskMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _updateTask = useServerFn(updateTask);

  return useCallback(
    async (task: UpdateTask) => {
      // Optimistically update the task in the cache
      queryClient.setQueryData(["tasks"], (oldData: Task[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((t) =>
          t.id === task.id ? { ...t, ...task, updatedAt: new Date() } : t
        );
      });

      try {
        const result = await _updateTask({ data: task });
        return result;
      } catch (error) {
        // If the mutation fails, roll back to the previous state
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        throw error;
      } finally {
        router.invalidate();
      }
    },
    [router, queryClient, _updateTask]
  );
}

const createStatus = createServerFn({ method: "POST" })
  .validator(insertStatusValidator)
  .handler(async ({ data }) => {
    await db.insert(statuses).values({
      ...data,
      id: uuid(),
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
      queryClient.invalidateQueries({
        queryKey: ["statuses-with-counts"],
      });

      return result;
    },
    [router, queryClient, _createStatus]
  );
}

const updateStatus = createServerFn({ method: "POST" })
  .validator(updateStatusValidator)
  .handler(async ({ data }) => {
    await db
      .update(statuses)
      .set({
        name: data.name,
        color: data.color,
        updatedAt: new Date(),
      })
      .where(eq(statuses.id, data.id!));
  });

export function useUpdateStatusMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _updateStatus = useServerFn(updateStatus);

  return useCallback(
    async (status: UpdateStatus) => {
      const result = await _updateStatus({ data: status });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["statuses"],
      });
      queryClient.invalidateQueries({
        queryKey: ["statuses-with-counts"],
      });

      return result;
    },
    [router, queryClient, _updateStatus]
  );
}

const deleteStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await db
      .update(tasks)
      .set({ statusId: null })
      .where(eq(tasks.statusId, data.id));
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
      queryClient.invalidateQueries({
        queryKey: ["statuses-with-counts"],
      });

      return result;
    },
    [router, queryClient, _deleteStatus]
  );
}
