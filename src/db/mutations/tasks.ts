import { createServerFn, useServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import {
  assignTaskValidator,
  CreateTask,
  insertTaskValidator,
  Label,
  labels,
  labelsToTasks,
  Task,
  taskAssignees,
  tasks,
  TaskWithRelations,
  UpdateTask,
  updateTaskValidator,
} from "~/db/schema";
import { v7 as uuid } from "uuid";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { and, eq, inArray } from "drizzle-orm";
import z from "zod";
import { auth } from "@clerk/tanstack-react-start/server";
import { getOwningIdentity } from "~/lib/utils";
import { sync } from "./sync";
import { deleteAttachment } from "./attachments";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

function getTaskListQueryKeys(
  queryClient: QueryClient,
  task: UpdateTask
): QueryKey[] {
  const detail = queryClient.getQueryData<TaskWithRelations>(["tasks", task.id]);
  const projectIds = new Set<string>();
  const sprintIds = new Set<string>();

  if (detail?.projectId) projectIds.add(detail.projectId);
  if (task.projectId) projectIds.add(task.projectId);
  if (detail?.sprintId) sprintIds.add(detail.sprintId);
  if (task.sprintId) sprintIds.add(task.sprintId);

  const keys: QueryKey[] = [];
  for (const projectId of projectIds) {
    keys.push(["tasks", projectId]);
  }
  for (const sprintId of sprintIds) {
    keys.push(["tasks", sprintId]);
  }

  return keys;
}

const createTask = createServerFn({ method: "POST" })
  .inputValidator(insertTaskValidator)
  .handler(async ({ data }) => {
    const user = await auth();

    const newTask = {
      id: uuid(),
      name: data.name,
      description: data.description,
      statusId: data.statusId,
      projectId: data.projectId,
      sprintId: data.sprintId,
      owner: getOwningIdentity(user),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(tasks).values(newTask);
    await sync(`task-create`, { data });

    return newTask;
  });

export function useCreateTaskMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _createTask = useServerFn(createTask);

  return useCallback(
    async (task: CreateTask) => {
      const result = await _createTask({
        data: { ...task, updatedAt: new Date() },
      });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["tasks", task.projectId],
      });
      if (task.sprintId) {
        queryClient.invalidateQueries({
          queryKey: ["tasks", task.sprintId],
        });
      }

      return result;
    },
    [router, queryClient, _createTask]
  );
}

// First, update the validator schema in assignTask
const assignTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string(),
      userIds: z.array(z.string()), // Changed from userId to userIds array
    })
  )
  .handler(async ({ data }) => {
    const user = await auth();
    const owner = getOwningIdentity(user);

    const task = await db.query.tasks.findFirst({
      where: (model, { eq, and }) =>
        and(eq(model.id, data.taskId), eq(model.owner, owner)),
    });
    if (!task) return;

    // Get existing assignees for this task
    const existingAssignees = await db.query.taskAssignees.findMany({
      where: (model, { eq }) => eq(model.taskId, data.taskId),
    });

    // Filter out users that are already assigned
    const newUserIds = data.userIds.filter(
      (userId) => !existingAssignees.some((a) => a.userId === userId)
    );

    if (newUserIds.length > 0) {
      await db.insert(taskAssignees).values(
        newUserIds.map((userId) => ({
          id: uuid(),
          taskId: data.taskId,
          owner,
          userId: userId,
          assignedAt: new Date(),
          updatedAt: new Date(),
        }))
      );
    }

    await sync(`task-update-${data.taskId}`, { data });
  });

// Update the unassign mutation similarly
const unassignTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string(),
      userIds: z.array(z.string()),
    })
  )
  .handler(async ({ data }) => {
    const user = await auth();
    const owner = getOwningIdentity(user);

    const task = await db.query.tasks.findFirst({
      where: (model, { eq, and }) =>
        and(eq(model.id, data.taskId), eq(model.owner, owner)),
    });
    if (!task) return;

    await db
      .delete(taskAssignees)
      .where(
        and(
          eq(taskAssignees.taskId, data.taskId),
          inArray(taskAssignees.userId, data.userIds),
          eq(taskAssignees.owner, owner),
        ),
      );
    await sync(`task-update-${data.taskId}`, { data });
  });

// Update the hook interfaces
export function useAssignTaskMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _assignTask = useServerFn(assignTask);

  return useCallback(
    async (task: Task, userIds: string[]) => {
      await _assignTask({ data: { taskId: task.id, userIds } });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["tasks", task.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks", task.id],
      });
      if (task.sprintId) {
        queryClient.invalidateQueries({
          queryKey: ["tasks", task.sprintId],
        });
      }
    },
    [router, queryClient, _assignTask]
  );
}

export function useUnassignTaskMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _unassignTask = useServerFn(unassignTask);

  return useCallback(
    async (task: Task, userIds: string[]) => {
      await _unassignTask({ data: { taskId: task.id, userIds } });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["tasks", task.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks", task.id],
      });
      if (task.sprintId) {
        queryClient.invalidateQueries({
          queryKey: ["tasks", task.sprintId],
        });
      }
    },
    [router, queryClient, _unassignTask]
  );
}

const updateTask = createServerFn({ method: "POST" })
  .inputValidator(updateTaskValidator)
  .handler(async ({ data }) => {
    const user = await auth();
    const { id, ...updates } = data;
    if (!id) {
      throw new Error("Task id is required");
    }

    await db
      .update(tasks)
      .set({
        ...updates,
        updatedAt: updates.updatedAt ?? new Date(),
      })
      .where(and(eq(tasks.id, id), eq(tasks.owner, getOwningIdentity(user))));
    await sync(`task-update-${id}`, { data });
  });

export function useUpdateTaskMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _updateTask = useServerFn(updateTask);

  return useCallback(
    async (task: UpdateTask) => {
      const listQueryKeys = getTaskListQueryKeys(queryClient, task);
      const detailQueryKey: QueryKey = ["tasks", task.id];

      const snapshots = [
        ...listQueryKeys.map((queryKey) => ({
          queryKey,
          data: queryClient.getQueryData(queryKey),
        })),
        {
          queryKey: detailQueryKey,
          data: queryClient.getQueryData(detailQueryKey),
        },
      ];

      const patchTaskList = (oldData: TaskWithRelations[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((t) => (t.id === task.id ? { ...t, ...task } : t));
      };

      for (const queryKey of listQueryKeys) {
        queryClient.setQueryData(queryKey, patchTaskList);
      }
      queryClient.setQueryData(
        detailQueryKey,
        (oldData: TaskWithRelations | undefined) => {
          if (!oldData) return oldData;
          return { ...oldData, ...task };
        }
      );

      try {
        const result = await _updateTask({
          data: { ...task, updatedAt: new Date() },
        });

        for (const queryKey of listQueryKeys) {
          queryClient.invalidateQueries({ queryKey });
        }
        queryClient.invalidateQueries({ queryKey: detailQueryKey });
        router.invalidate();

        return result;
      } catch (error) {
        for (const { queryKey, data } of snapshots) {
          queryClient.setQueryData(queryKey, data);
        }
        await Promise.all(
          snapshots.map(({ queryKey }) =>
            queryClient.invalidateQueries({ queryKey })
          )
        );
        toast.error("Failed to update task");
        throw error;
      }
    },
    [router, queryClient, _updateTask]
  );
}

const deleteTask = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await auth();
    const task = await db.query.tasks.findFirst({
      with: {
        attachments: true,
      },
      where: (model, { eq, and }) =>
        and(eq(model.id, data.id), eq(model.owner, getOwningIdentity(user))),
    });
    if (!task) return;
    await Promise.all(
      task.attachments.map((attachment) =>
        deleteAttachment({ data: { id: attachment.id } })
      )
    );
    await db
      .delete(tasks)
      .where(
        and(eq(tasks.id, data.id), eq(tasks.owner, getOwningIdentity(user))),
      );
    await sync(`task-delete`, { data });
  });

export function useDeleteTaskMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _deleteTask = useServerFn(deleteTask);

  return useCallback(
    async (id: string) => {
      const result = await _deleteTask({ data: { id } });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks", id],
      });

      return result;
    },
    [router, queryClient, _deleteTask]
  );
}

const setLabelsForTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().uuid(),
      labelIds: z.array(z.string().uuid()),
    })
  )
  .handler(async ({ data }) => {
    const user = await auth();
    const owner = getOwningIdentity(user);

    const task = await db.query.tasks.findFirst({
      where: (model, { eq, and }) =>
        and(eq(model.id, data.taskId), eq(model.owner, owner)),
    });
    if (!task) return;

    if (data.labelIds.length > 0) {
      const ownedLabels = await db.query.labels.findMany({
        where: (model, { eq, and, inArray }) =>
          and(inArray(model.id, data.labelIds), eq(model.owner, owner)),
      });
      if (ownedLabels.length !== data.labelIds.length) return;
    }

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
      const labels: Label[] = queryClient.getQueryData(["labels"]) || [];

      queryClient.setQueryData(
        ["tasks", task.id],
        (oldData: TaskWithRelations | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            labels: [...labelIds.map((id) => labels.find((l) => l.id === id))],
          };
        }
      );

      await _setLabelsForTask({ data: { taskId: task.id, labelIds } });

      router.invalidate();
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", task.projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", task.id] });
    },
    [router, queryClient, _setLabelsForTask]
  );
}
