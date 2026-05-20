import { createServerFn, useServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import {
  CreateTask,
  insertTaskValidator,
  Label,
  labelsToTasks,
  PRIORITY_VALUES,
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
import { requireSessionFromRequest } from "~/lib/session";
import { getOwningIdentity } from "~/lib/utils";
import { sync } from "./sync";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { ALL_TASKS_SCOPE } from "~/db/queries/tasks";

const allTasksListQueryKey: QueryKey = ["tasks", ALL_TASKS_SCOPE];

function maybeIncludeAllTasksListKey(
  queryClient: QueryClient,
  keys: QueryKey[]
): QueryKey[] {
  const state = queryClient.getQueryState(allTasksListQueryKey);
  if (state?.dataUpdatedAt) {
    const key = JSON.stringify(allTasksListQueryKey);
    if (!keys.some((k) => JSON.stringify(k) === key)) {
      return [...keys, allTasksListQueryKey];
    }
  }
  return keys;
}

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

  return maybeIncludeAllTasksListKey(queryClient, keys);
}

function getBatchTaskListQueryKeys(
  queryClient: QueryClient,
  taskIds: string[]
): QueryKey[] {
  const keys = new Set<string>();
  const result: QueryKey[] = [];

  for (const taskId of taskIds) {
    for (const queryKey of getTaskListQueryKeys(queryClient, { id: taskId })) {
      const key = JSON.stringify(queryKey);
      if (!keys.has(key)) {
        keys.add(key);
        result.push(queryKey);
      }
    }
    const detail = queryClient.getQueryData<TaskWithRelations>([
      "tasks",
      taskId,
    ]);
    if (detail?.projectId) {
      const listKey = JSON.stringify(["tasks", detail.projectId]);
      if (!keys.has(listKey)) {
        keys.add(listKey);
        result.push(["tasks", detail.projectId]);
      }
    }
    if (detail?.sprintId) {
      const listKey = JSON.stringify(["tasks", detail.sprintId]);
      if (!keys.has(listKey)) {
        keys.add(listKey);
        result.push(["tasks", detail.sprintId]);
      }
    }
  }

  return maybeIncludeAllTasksListKey(queryClient, result);
}

type BatchTaskPatch = {
  statusId?: string | null;
  priority?: TaskWithRelations["priority"];
  sprintId?: string | null;
};

const batchUpdateTasksValidator = z.object({
  taskIds: z.array(z.string().uuid()).min(1),
  statusId: z.string().uuid().nullable().optional(),
  priority: z.enum(PRIORITY_VALUES).optional(),
  sprintId: z.string().uuid().nullable().optional(),
});

const batchDeleteTasksValidator = z.object({
  taskIds: z.array(z.string().uuid()).min(1),
});

const batchAssignTasksValidator = z.object({
  taskIds: z.array(z.string().uuid()).min(1),
  userIds: z.array(z.string()).min(1),
});

const batchSetLabelsForTasksValidator = z.object({
  taskIds: z.array(z.string().uuid()).min(1),
  labelIds: z.array(z.string().uuid()),
});

function assertAllTasksOwned(
  ownedTasks: { id: string }[],
  taskIds: string[]
) {
  if (ownedTasks.length === taskIds.length) return;
  const ownedIds = new Set(ownedTasks.map((t) => t.id));
  const missing = taskIds.filter((id) => !ownedIds.has(id));
  throw new Error(
    `Not authorized to modify some tasks: ${missing.join(", ")}`
  );
}

const createTask = createServerFn({ method: "POST" })
  .inputValidator(insertTaskValidator)
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();

    const newTask = {
      id: uuid(),
      name: data.name,
      description: data.description,
      statusId: data.statusId,
      projectId: data.projectId,
      sprintId: data.sprintId,
      owner: getOwningIdentity(session),
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
      queryClient.invalidateQueries({ queryKey: allTasksListQueryKey });

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
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);

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
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);

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
    try {
      const session = await requireSessionFromRequest();
      const { id, ...updates } = data;

      const setValues = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined)
      );

      await db
        .update(tasks)
        .set({
          ...setValues,
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, id), eq(tasks.owner, getOwningIdentity(session))));
      await sync(`task-update-${id}`, { data });
    } catch (error) {
      console.error("[updateTask] failed:", error);
      throw error;
    }
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
          data: task,
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
    const session = await requireSessionFromRequest();
    const { deleteAttachmentForOwner } = await import("./attachments.server");
    const task = await db.query.tasks.findFirst({
      with: {
        attachments: true,
      },
      where: (model, { eq, and }) =>
        and(eq(model.id, data.id), eq(model.owner, getOwningIdentity(session))),
    });
    if (!task) return;
    const owner = getOwningIdentity(session);
    await Promise.all(
      task.attachments.map((attachment) =>
        deleteAttachmentForOwner(owner, attachment.id)
      )
    );
    await db
      .delete(tasks)
      .where(
        and(eq(tasks.id, data.id), eq(tasks.owner, getOwningIdentity(session))),
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
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);

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

const batchUpdateTasks = createServerFn({ method: "POST" })
  .inputValidator(batchUpdateTasksValidator)
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);

    const ownedTasks = await db.query.tasks.findMany({
      where: (model, { eq, and, inArray }) =>
        and(inArray(model.id, data.taskIds), eq(model.owner, owner)),
    });
    assertAllTasksOwned(ownedTasks, data.taskIds);

    const { taskIds, ...updates } = data;
    const setValues = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );
    if (Object.keys(setValues).length === 0) {
      throw new Error("No updatable fields provided");
    }

    await db
      .update(tasks)
      .set({ ...setValues, updatedAt: new Date() })
      .where(and(inArray(tasks.id, taskIds), eq(tasks.owner, owner)));

    for (const id of taskIds) {
      await sync(`task-update-${id}`, { data: { id, ...setValues } });
    }
  });

const batchDeleteTasks = createServerFn({ method: "POST" })
  .inputValidator(batchDeleteTasksValidator)
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);
    const { deleteAttachmentForOwner } = await import("./attachments.server");

    const ownedTasks = await db.query.tasks.findMany({
      with: { attachments: true },
      where: (model, { eq, and, inArray }) =>
        and(inArray(model.id, data.taskIds), eq(model.owner, owner)),
    });
    assertAllTasksOwned(ownedTasks, data.taskIds);

    await Promise.all(
      ownedTasks.flatMap((task) =>
        task.attachments.map((attachment) =>
          deleteAttachmentForOwner(owner, attachment.id)
        )
      )
    );

    await db
      .delete(tasks)
      .where(
        and(inArray(tasks.id, data.taskIds), eq(tasks.owner, owner))
      );

    for (const id of data.taskIds) {
      await sync(`task-delete`, { data: { id } });
    }
  });

const batchAssignTasks = createServerFn({ method: "POST" })
  .inputValidator(batchAssignTasksValidator)
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);

    const ownedTasks = await db.query.tasks.findMany({
      where: (model, { eq, and, inArray }) =>
        and(inArray(model.id, data.taskIds), eq(model.owner, owner)),
    });
    assertAllTasksOwned(ownedTasks, data.taskIds);

    const existingAssignees = await db.query.taskAssignees.findMany({
      where: (model, { inArray }) => inArray(model.taskId, data.taskIds),
    });
    const assigneesByTaskId = new Map<string, typeof existingAssignees>();
    for (const assignee of existingAssignees) {
      const list = assigneesByTaskId.get(assignee.taskId) ?? [];
      list.push(assignee);
      assigneesByTaskId.set(assignee.taskId, list);
    }

    const newAssigneeRows: (typeof taskAssignees.$inferInsert)[] = [];
    for (const taskId of data.taskIds) {
      const taskAssigneesList = assigneesByTaskId.get(taskId) ?? [];
      const newUserIds = data.userIds.filter(
        (userId) => !taskAssigneesList.some((a) => a.userId === userId)
      );
      for (const userId of newUserIds) {
        newAssigneeRows.push({
          id: uuid(),
          taskId,
          owner,
          userId,
          assignedAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (newAssigneeRows.length > 0) {
      await db.insert(taskAssignees).values(newAssigneeRows);
    }

    for (const taskId of data.taskIds) {
      await sync(`task-update-${taskId}`, { data });
    }
  });

const batchSetLabelsForTasks = createServerFn({ method: "POST" })
  .inputValidator(batchSetLabelsForTasksValidator)
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);

    const ownedTasks = await db.query.tasks.findMany({
      where: (model, { eq, and, inArray }) =>
        and(inArray(model.id, data.taskIds), eq(model.owner, owner)),
    });
    assertAllTasksOwned(ownedTasks, data.taskIds);

    if (data.labelIds.length > 0) {
      const ownedLabels = await db.query.labels.findMany({
        where: (model, { eq, and, inArray }) =>
          and(inArray(model.id, data.labelIds), eq(model.owner, owner)),
      });
      if (ownedLabels.length !== data.labelIds.length) {
        throw new Error("Not authorized: some labels are not owned by the user");
      }
    }

    await db
      .delete(labelsToTasks)
      .where(inArray(labelsToTasks.taskId, data.taskIds));

    if (data.labelIds.length > 0) {
      await db.insert(labelsToTasks).values(
        data.taskIds.flatMap((taskId) =>
          data.labelIds.map((labelId) => ({ taskId, labelId }))
        )
      );
    }

    for (const id of data.taskIds) {
      await sync(`task-update-${id}`, { data });
    }
  });

function snapshotTaskQueries(
  queryClient: QueryClient,
  taskIds: string[],
  listQueryKeys: QueryKey[]
) {
  const detailKeys = taskIds.map((id): QueryKey => ["tasks", id]);
  const allKeys = [
    ...listQueryKeys.map((queryKey) => ({
      queryKey,
      data: queryClient.getQueryData(queryKey),
    })),
    ...detailKeys.map((queryKey) => ({
      queryKey,
      data: queryClient.getQueryData(queryKey),
    })),
  ];
  return allKeys;
}

export function useBatchUpdateTasksMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _batchUpdateTasks = useServerFn(batchUpdateTasks);

  return useCallback(
    async (taskIds: string[], patch: BatchTaskPatch) => {
      const listQueryKeys = getBatchTaskListQueryKeys(queryClient, taskIds);
      const snapshots = snapshotTaskQueries(
        queryClient,
        taskIds,
        listQueryKeys
      );

      const patchList = (oldData: TaskWithRelations[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((t) =>
          taskIds.includes(t.id) ? { ...t, ...patch, updatedAt: new Date() } : t
        );
      };

      for (const queryKey of listQueryKeys) {
        queryClient.setQueryData(queryKey, patchList);
      }
      for (const id of taskIds) {
        queryClient.setQueryData(
          ["tasks", id],
          (oldData: TaskWithRelations | undefined) => {
            if (!oldData) return oldData;
            return { ...oldData, ...patch, updatedAt: new Date() };
          }
        );
      }

      try {
        await _batchUpdateTasks({ data: { taskIds, ...patch } });
        for (const queryKey of listQueryKeys) {
          queryClient.invalidateQueries({ queryKey });
        }
        for (const id of taskIds) {
          queryClient.invalidateQueries({ queryKey: ["tasks", id] });
        }
        router.invalidate();
      } catch (error) {
        for (const { queryKey, data } of snapshots) {
          queryClient.setQueryData(queryKey, data);
        }
        toast.error("Failed to update tasks");
        throw error;
      }
    },
    [router, queryClient, _batchUpdateTasks]
  );
}

export function useBatchDeleteTasksMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _batchDeleteTasks = useServerFn(batchDeleteTasks);

  return useCallback(
    async (taskIds: string[]) => {
      const listQueryKeys = getBatchTaskListQueryKeys(queryClient, taskIds);
      const snapshots = snapshotTaskQueries(
        queryClient,
        taskIds,
        listQueryKeys
      );

      const removeFromList = (oldData: TaskWithRelations[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter((t) => !taskIds.includes(t.id));
      };

      for (const queryKey of listQueryKeys) {
        queryClient.setQueryData(queryKey, removeFromList);
      }

      try {
        await _batchDeleteTasks({ data: { taskIds } });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        router.invalidate();
      } catch (error) {
        for (const { queryKey, data } of snapshots) {
          queryClient.setQueryData(queryKey, data);
        }
        toast.error("Failed to delete tasks");
        throw error;
      }
    },
    [router, queryClient, _batchDeleteTasks]
  );
}

export function useBatchAssignTasksMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _batchAssignTasks = useServerFn(batchAssignTasks);

  return useCallback(
    async (selectedTasks: TaskWithRelations[], userIds: string[]) => {
      const taskIds = selectedTasks.map((t) => t.id);
      const listQueryKeys = getBatchTaskListQueryKeys(queryClient, taskIds);
      const snapshots = snapshotTaskQueries(
        queryClient,
        taskIds,
        listQueryKeys
      );

      const patchList = (oldData: TaskWithRelations[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((t) => {
          if (!taskIds.includes(t.id)) return t;
          const existingIds = new Set(t.assignees.map((a) => a.userId));
          const newAssignees = userIds
            .filter((id) => !existingIds.has(id))
            .map((userId) => ({
              id: uuid(),
              taskId: t.id,
              userId,
              owner: t.owner,
              assignedAt: new Date(),
              updatedAt: new Date(),
            }));
          return {
            ...t,
            assignees: [...t.assignees, ...newAssignees],
            updatedAt: new Date(),
          };
        });
      };

      const patchDetail = (oldData: TaskWithRelations | undefined) => {
        if (!oldData || !taskIds.includes(oldData.id)) return oldData;
        const existingIds = new Set(oldData.assignees.map((a) => a.userId));
        const newAssignees = userIds
          .filter((id) => !existingIds.has(id))
          .map((userId) => ({
            id: uuid(),
            taskId: oldData.id,
            userId,
            owner: oldData.owner,
            assignedAt: new Date(),
            updatedAt: new Date(),
          }));
        return {
          ...oldData,
          assignees: [...oldData.assignees, ...newAssignees],
          updatedAt: new Date(),
        };
      };

      for (const queryKey of listQueryKeys) {
        queryClient.setQueryData(queryKey, patchList);
      }
      for (const id of taskIds) {
        queryClient.setQueryData(["tasks", id], patchDetail);
      }

      try {
        await _batchAssignTasks({ data: { taskIds, userIds } });
        for (const queryKey of listQueryKeys) {
          queryClient.invalidateQueries({ queryKey });
        }
        for (const id of taskIds) {
          queryClient.invalidateQueries({ queryKey: ["tasks", id] });
        }
        router.invalidate();
      } catch (error) {
        for (const { queryKey, data } of snapshots) {
          queryClient.setQueryData(queryKey, data);
        }
        toast.error("Failed to assign tasks");
        throw error;
      }
    },
    [router, queryClient, _batchAssignTasks]
  );
}

export function useBatchSetLabelsForTasksMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _batchSetLabelsForTasks = useServerFn(batchSetLabelsForTasks);

  return useCallback(
    async (taskIds: string[], labelIds: string[]) => {
      const labels: Label[] = queryClient.getQueryData(["labels"]) || [];
      const resolvedLabels = labelIds
        .map((id) => labels.find((l) => l.id === id))
        .filter((l): l is Label => l != null);

      const listQueryKeys = getBatchTaskListQueryKeys(queryClient, taskIds);
      const snapshots = snapshotTaskQueries(
        queryClient,
        taskIds,
        listQueryKeys
      );

      const patchList = (oldData: TaskWithRelations[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((t) =>
          taskIds.includes(t.id)
            ? { ...t, labels: resolvedLabels, updatedAt: new Date() }
            : t
        );
      };

      for (const queryKey of listQueryKeys) {
        queryClient.setQueryData(queryKey, patchList);
      }
      for (const id of taskIds) {
        queryClient.setQueryData(
          ["tasks", id],
          (oldData: TaskWithRelations | undefined) => {
            if (!oldData) return oldData;
            return { ...oldData, labels: resolvedLabels, updatedAt: new Date() };
          }
        );
      }

      try {
        await _batchSetLabelsForTasks({ data: { taskIds, labelIds } });
        for (const queryKey of listQueryKeys) {
          queryClient.invalidateQueries({ queryKey });
        }
        for (const id of taskIds) {
          queryClient.invalidateQueries({ queryKey: ["tasks", id] });
        }
        router.invalidate();
      } catch (error) {
        for (const { queryKey, data } of snapshots) {
          queryClient.setQueryData(queryKey, data);
        }
        toast.error("Failed to update labels");
        throw error;
      }
    },
    [router, queryClient, _batchSetLabelsForTasks]
  );
}
