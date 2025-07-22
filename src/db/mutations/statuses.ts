import { createServerFn, useServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import {
  CreateStatus,
  insertStatusValidator,
  statuses,
  tasks,
  updateMultipleStatusesValidator,
  UpdateStatus,
  updateStatusValidator,
} from "~/db/schema";
import { v7 as uuid } from "uuid";
import z from "zod";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { and, eq } from "drizzle-orm";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { getOwningIdentity } from "~/lib/utils";

const createStatus = createServerFn({ method: "POST" })
  .validator(insertStatusValidator)
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    await db.insert(statuses).values({
      ...data,
      id: uuid(),
      owner: getOwningIdentity(user),
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
    const user = await getAuth(getWebRequest());

    await db
      .update(statuses)
      .set({
        name: data.name,
        color: data.color,
        order: data.order,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(statuses.id, data.id!),
          eq(statuses.owner, getOwningIdentity(user))
        )
      );
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

const updateMultipleStatuses = createServerFn({ method: "POST" })
  .validator(updateMultipleStatusesValidator)
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    await Promise.all(
      data.map(async (entry) => {
        return await db
          .update(statuses)
          .set({
            name: entry.name,
            color: entry.color,
            order: entry.order,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(statuses.id, entry.id!),
              eq(statuses.owner, getOwningIdentity(user))
            )
          );
      })
    );
  });

export function useUpdateMultipleStatusesMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _updateMultipleStatuses = useServerFn(updateMultipleStatuses);

  return useCallback(
    async (statuses: UpdateStatus[]) => {
      // Generic update function that works for both cache types
      const updateCache = (oldData: any[] | undefined) => {
        if (!oldData) return oldData;
        const statusMap = new Map(statuses.map((s) => [s.id, s]));
        return oldData.map((s) => {
          const update = statusMap.get(s.id);
          return update ? { ...s, ...update, updatedAt: new Date() } : s;
        });
      };

      // Update both caches
      queryClient.setQueryData(["statuses"], updateCache);
      queryClient.setQueryData(["statuses-with-counts"], updateCache);

      try {
        const result = await _updateMultipleStatuses({ data: statuses });
        return result;
      } catch (error) {
        queryClient.invalidateQueries({ queryKey: ["statuses"] });
        queryClient.invalidateQueries({ queryKey: ["statuses-with-counts"] });
        throw error;
      } finally {
        router.invalidate();
      }
    },
    [router, queryClient, _updateMultipleStatuses]
  );
}

const deleteStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    await db
      .update(tasks)
      .set({ statusId: null })
      .where(
        and(
          eq(tasks.statusId, data.id),
          eq(tasks.owner, getOwningIdentity(user))
        )
      );
    await db
      .delete(statuses)
      .where(
        and(
          eq(statuses.id, data.id),
          eq(statuses.owner, getOwningIdentity(user))
        )
      );
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
