import { createServerFn, useServerFn } from "@tanstack/react-start";
import {
  attachments,
  CreateAttachment,
  insertAttachmentValidator,
} from "../schema";
import { requireSessionFromRequest } from "~/lib/session";
import { db } from "..";
import { v7 as uuid } from "uuid";
import { getOwningIdentity } from "~/lib/utils";
import { useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { sync } from "./sync";
import z from "zod";
import { and, eq } from "drizzle-orm";
import { UTApi } from "uploadthing/server";

const createAttachment = createServerFn({ method: "POST" })
  .inputValidator(insertAttachmentValidator)
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();

    await db.insert(attachments).values({
      ...data,
      id: uuid(),
      owner: getOwningIdentity(session),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await sync("attachment-create", { data });
    await sync("task-update", { data: { taskId: data.taskId } });
  });

export function useCreateAttachmentMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _createAttachment = useServerFn(createAttachment);

  return useCallback(
    async (attachmentData: CreateAttachment) => {
      const result = await _createAttachment({ data: attachmentData });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["attachments", attachmentData.taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks", attachmentData.taskId],
      });

      return result;
    },
    [_createAttachment]
  );
}

export async function deleteAttachmentForOwner(
  owner: string,
  attachmentId: string
) {
  const attachment = await db.query.attachments.findFirst({
    where: (model, { eq, and }) =>
      and(eq(model.id, attachmentId), eq(model.owner, owner)),
  });
  if (!attachment) return;

  const utapi = new UTApi();
  utapi.deleteFiles([attachment.providerFileId]);
  await db
    .delete(attachments)
    .where(
      and(eq(attachments.id, attachmentId), eq(attachments.owner, owner))
    );

  await sync(`attachment-update-${attachmentId}`, { data: { id: attachmentId } });
  await sync(`task-update-${attachment.taskId}`, { data: { id: attachmentId } });

  return { id: attachmentId, taskId: attachment.taskId };
}

export const deleteAttachment = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    return deleteAttachmentForOwner(getOwningIdentity(session), data.id);
  });

export function useDeleteAttachmentMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _deleteAttachment = useServerFn(deleteAttachment);

  return useCallback(
    async (id: string) => {
      const result = await _deleteAttachment({ data: { id } });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["attachments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["attachments", id],
      });
      if (result) {
        queryClient.invalidateQueries({
          queryKey: ["tasks", result.taskId],
        });
      }

      return result;
    },
    [_deleteAttachment]
  );
}
