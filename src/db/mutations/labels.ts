import { createServerFn, useServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import {
  CreateLabel,
  CreateStatus,
  insertLabelValidator,
  insertStatusValidator,
  labels,
  labelsToTasks,
  statuses,
  tasks,
  UpdateLabel,
  updateLabelValidator,
  updateMultipleLabelsValidator,
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
import { getOwningIdentity } from "~/lib/utils";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { sync } from "./sync";

const createLabel = createServerFn({ method: "POST" })
  .validator(insertLabelValidator)
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());
    await db.insert(labels).values({
      ...data,
      id: uuid(),
      owner: getOwningIdentity(user),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await sync("label-create", { data });
  });

export function useCreateLabelMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _createLabel = useServerFn(createLabel);

  return useCallback(
    async (label: CreateLabel) => {
      const result = await _createLabel({ data: label });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["labels"],
      });
      queryClient.invalidateQueries({
        queryKey: ["labels-with-counts"],
      });

      return result;
    },
    [router, queryClient, _createLabel]
  );
}

const updateLabel = createServerFn({ method: "POST" })
  .validator(updateLabelValidator)
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    await db
      .update(labels)
      .set({
        name: data.name,
        color: data.color,
        order: data.order,
        updatedAt: new Date(),
      })
      .where(
        and(eq(labels.id, data.id!), eq(labels.owner, getOwningIdentity(user)))
      );

    await sync(`label-update-${data.id}`, { data });
  });

export function useUpdateLabelMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _updateLabel = useServerFn(updateLabel);

  return useCallback(
    async (label: UpdateLabel) => {
      const result = await _updateLabel({ data: label });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["labels"],
      });
      queryClient.invalidateQueries({
        queryKey: ["labels-with-counts"],
      });

      return result;
    },
    [router, queryClient, _updateLabel]
  );
}

const updateMultipleLabels = createServerFn({ method: "POST" })
  .validator(updateMultipleLabelsValidator)
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    await Promise.all(
      data.map(async (entry) => {
        return await db
          .update(labels)
          .set({
            name: entry.name,
            color: entry.color,
            order: entry.order,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(labels.id, entry.id!),
              eq(labels.owner, getOwningIdentity(user))
            )
          );
      })
    );
    await Promise.all(
      data.map((s) => sync(`label-update-${s.id}`, { data: { ...s } }))
    );
  });

export function useUpdateMultipleLabelsMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _updateMultipleLabels = useServerFn(updateMultipleLabels);

  return useCallback(
    async (labels: UpdateLabel[]) => {
      // Generic update function that works for both cache types
      const updateCache = (oldData: any[] | undefined) => {
        if (!oldData) return oldData;
        const labelMap = new Map(labels.map((s) => [s.id, s]));
        return oldData.map((s) => {
          const update = labelMap.get(s.id);
          return update ? { ...s, ...update, updatedAt: new Date() } : s;
        });
      };

      // Update both caches
      queryClient.setQueryData(["labels"], updateCache);
      queryClient.setQueryData(["labels-with-counts"], updateCache);

      try {
        const result = await _updateMultipleLabels({ data: labels });
        return result;
      } catch (error) {
        queryClient.invalidateQueries({ queryKey: ["labels"] });
        queryClient.invalidateQueries({ queryKey: ["labels-with-counts"] });
        throw error;
      } finally {
        router.invalidate();
      }
    },
    [router, queryClient, _updateMultipleLabels]
  );
}

const deleteLabel = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    await db
      .delete(labels)
      .where(
        and(eq(labels.id, data.id), eq(labels.owner, getOwningIdentity(user)))
      );

    await sync(`label-update-${data.id}`, { data });
  });

export function useDeleteLabelMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _deleteLabel = useServerFn(deleteLabel);

  return useCallback(
    async (id: string) => {
      const result = await _deleteLabel({ data: { id } });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["labels"],
      });
      queryClient.invalidateQueries({
        queryKey: ["labels-with-counts"],
      });

      return result;
    },
    [router, queryClient, _deleteLabel]
  );
}
