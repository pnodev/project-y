import { createServerFn, useServerFn } from "@tanstack/react-start";
import {
  CreateSubTask,
  insertSubTaskValidator,
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
import { and, eq } from "drizzle-orm";

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
