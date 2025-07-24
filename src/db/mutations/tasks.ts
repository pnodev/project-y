import { createServerFn, useServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import {
  CreateTask,
  insertTaskValidator,
  labelsToTasks,
  Task,
  tasks,
  UpdateTask,
  updateTaskValidator,
} from "~/db/schema";
import { v7 as uuid } from "uuid";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { and, eq } from "drizzle-orm";
import z from "zod";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { getOwningIdentity } from "~/lib/utils";
import { sync } from "./sync";

const createTask = createServerFn({ method: "POST" })
  .validator(insertTaskValidator)
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    await db.insert(tasks).values({
      id: uuid(),
      name: data.name,
      description: data.description,
      statusId: data.statusId,
      projectId: data.projectId,
      owner: getOwningIdentity(user),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await sync(`task-create`, { data });
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
        queryKey: ["tasks", task.projectId],
      });

      return result;
    },
    [router, queryClient, _createTask]
  );
}

const updateTask = createServerFn({ method: "POST" })
  .validator(updateTaskValidator)
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());
    await db
      .update(tasks)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(eq(tasks.id, data.id!), eq(tasks.owner, getOwningIdentity(user)))
      );
    await sync(`task-update-${data.id}`, { data });
  });

export function useUpdateTaskMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _updateTask = useServerFn(updateTask);

  return useCallback(
    async (task: UpdateTask) => {
      // Optimistically update the task in the cache
      console.info("Optimistically updating task in cache", task.projectId);
      queryClient.setQueryData(
        ["tasks", task.projectId],
        (oldData: Task[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((t) => (t.id === task.id ? { ...t, ...task } : t));
        }
      );
      queryClient.setQueryData(
        ["tasks", task.id],
        (oldData: Task | undefined) => {
          if (!oldData) return oldData;
          return { ...oldData, ...task };
        }
      );

      try {
        const result = await _updateTask({ data: task });
        return result;
      } catch (error) {
        // If the mutation fails, roll back to the previous state
        queryClient.invalidateQueries({ queryKey: ["tasks", task.projectId] });
        queryClient.invalidateQueries({ queryKey: ["tasks", task.id] });
        throw error;
      } finally {
        router.invalidate();
      }
    },
    [router, queryClient, _updateTask]
  );
}

const setLabelsForTask = createServerFn({ method: "POST" })
  .validator(
    z.object({
      taskId: z.string().uuid(),
      labelIds: z.array(z.string().uuid()),
    })
  )
  .handler(async ({ data }) => {
    // Remove existing labels for the task
    await db.delete(labelsToTasks).where(eq(labelsToTasks.taskId, data.taskId));

    // Insert new label associations
    if (data.labelIds.length > 0) {
      await db.insert(labelsToTasks).values(
        data.labelIds.map((labelId) => ({
          taskId: data.taskId,
          labelId: labelId,
        }))
      );
    }

    await sync(`task-update-${data.taskId}`, { data });
  });

export function useSetLabelsForTaskMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _setLabelsForTask = useServerFn(setLabelsForTask);

  return useCallback(
    async (task: Task, labelIds: string[]) => {
      await _setLabelsForTask({ data: { taskId: task.id, labelIds } });

      router.invalidate();
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", task.projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", task.id] });
    },
    [router, queryClient, _setLabelsForTask]
  );
}
