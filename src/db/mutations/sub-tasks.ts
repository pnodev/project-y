import { createServerFn, useServerFn } from "@tanstack/react-start";
import {
  CreateSubTask,
  insertSubTaskValidator,
  SubTask,
  subTaskAssignees,
  subTasks,
  UpdateSubTask,
  updateSubTaskValidator,
} from "../schema";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { db } from "..";
import { v7 as uuid } from "uuid";
import { getOwningIdentity } from "~/lib/utils";
import { sync } from "./sync";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { and, eq, inArray } from "drizzle-orm";
import z from "zod";

const createSubTask = createServerFn({ method: "POST" })
  .validator(insertSubTaskValidator)
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    await db.insert(subTasks).values({
      ...data,
      id: uuid(),
      owner: getOwningIdentity(user),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await sync("sub-task-create", { data });
  });

export function useCreateSubTaskMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _createSubTask = useServerFn(createSubTask);

  return useCallback(
    async (subTask: CreateSubTask) => {
      const result = await _createSubTask({ data: subTask });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["tasks", subTask.taskId],
      });

      return result;
    },
    [router, queryClient, _createSubTask]
  );
}

const updateSubTask = createServerFn({ method: "POST" })
  .validator(updateSubTaskValidator)
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    await db
      .update(subTasks)
      .set({
        ...data,
      })
      .where(
        and(
          eq(subTasks.id, data.id!),
          eq(subTasks.owner, getOwningIdentity(user))
        )
      );

    await sync(`task-update-${data.taskId}`, { data });
  });

export function useUpdateSubTaskMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _updateSubTask = useServerFn(updateSubTask);

  return useCallback(
    async (subTask: UpdateSubTask) => {
      // Get the current query data
      const previousTasks = queryClient.getQueryData(["tasks", subTask.taskId]);

      // Optimistically update the UI
      queryClient.setQueryData(["tasks", subTask.taskId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          subTasks: old.subTasks.map((task: any) =>
            task.id === subTask.id ? { ...task, ...subTask } : task
          ),
        };
      });

      try {
        const result = await _updateSubTask({ data: subTask });

        // On success, invalidate queries to ensure consistency
        router.invalidate();
        queryClient.invalidateQueries({
          queryKey: ["tasks", subTask.taskId],
        });
        queryClient.invalidateQueries({
          queryKey: ["tasks", subTask.projectId],
        });

        return result;
      } catch (error) {
        // On error, rollback to the previous state
        queryClient.setQueryData(["tasks", subTask.taskId], previousTasks);
        throw error;
      }
    },
    [router, queryClient, _updateSubTask]
  );
}

const deleteSubTask = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    const subTask = await db.query.subTasks.findFirst({
      where(fields, operators) {
        return operators.and(
          operators.eq(fields.id, data.id),
          operators.eq(fields.owner, getOwningIdentity(user))
        );
      },
    });
    await db
      .delete(subTasks)
      .where(
        and(
          eq(subTasks.id, data.id),
          eq(subTasks.owner, getOwningIdentity(user))
        )
      );

    await sync(`task-update-${data.id}`, { data });
    return subTask;
  });

export function useDeleteSubTaskMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _deleteSubTask = useServerFn(deleteSubTask);

  return useCallback(
    async (subTaskId: string) => {
      const result = await _deleteSubTask({ data: { id: subTaskId } });

      if (!result) return;
      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["tasks", result.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks", result.taskId],
      });

      return result;
    },
    [router, queryClient, _deleteSubTask]
  );
}

const unassignSubTask = createServerFn({ method: "POST" })
  .validator(
    z.object({
      subTaskId: z.string(),
      userIds: z.array(z.string()),
    })
  )
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());
    const subTask = await db.query.subTasks.findFirst({
      where(fields, operators) {
        return operators.and(
          operators.eq(fields.id, data.subTaskId),
          operators.eq(fields.owner, getOwningIdentity(user))
        );
      },
    });
    await db
      .delete(subTaskAssignees)
      .where(
        and(
          eq(subTaskAssignees.subTaskId, data.subTaskId),
          inArray(subTaskAssignees.userId, data.userIds),
          eq(subTaskAssignees.owner, getOwningIdentity(user))
        )
      );
    await sync(`task-update-${subTask?.taskId}`, { data });
  });

export function useUnassignSubTaskMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _unassignSubTask = useServerFn(unassignSubTask);

  return useCallback(
    async (subTask: SubTask, userIds: string[]) => {
      await _unassignSubTask({ data: { subTaskId: subTask.id, userIds } });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["tasks", subTask.taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks", subTask.projectId],
      });
    },
    [router, queryClient, _unassignSubTask]
  );
}

const assignSubTask = createServerFn({ method: "POST" })
  .validator(
    z.object({
      subTaskId: z.string(),
      userIds: z.array(z.string()),
    })
  )
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());
    const subTask = await db.query.subTasks.findFirst({
      where(fields, operators) {
        return operators.and(
          operators.eq(fields.id, data.subTaskId),
          operators.eq(fields.owner, getOwningIdentity(user))
        );
      },
    });

    // Get existing assignees for this task
    const existingAssignees = await db.query.subTaskAssignees.findMany({
      where: (model, { eq }) => eq(model.subTaskId, data.subTaskId),
    });

    // Filter out users that are already assigned
    const newUserIds = data.userIds.filter(
      (userId) => !existingAssignees.some((a) => a.userId === userId)
    );

    if (newUserIds.length > 0) {
      await db.insert(subTaskAssignees).values(
        newUserIds.map((userId) => ({
          id: uuid(),
          subTaskId: data.subTaskId,
          owner: getOwningIdentity(user),
          userId: userId,
          assignedAt: new Date(),
          updatedAt: new Date(),
        }))
      );
    }

    await sync(`task-update-${subTask?.taskId}`, { data });
  });

export function useAssignSubTaskMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _assignSubTask = useServerFn(assignSubTask);

  return useCallback(
    async (subTask: SubTask, userIds: string[]) => {
      await _assignSubTask({ data: { subTaskId: subTask.id, userIds } });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["tasks", subTask.taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks", subTask.projectId],
      });
    },
    [router, queryClient, _assignSubTask]
  );
}
