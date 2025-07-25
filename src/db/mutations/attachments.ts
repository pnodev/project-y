import { createServerFn, useServerFn } from "@tanstack/react-start";
import {
  attachments,
  CreateAttachment,
  insertAttachmentValidator,
} from "../schema";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
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
  .validator(insertAttachmentValidator)
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    await db.insert(attachments).values({
      ...data,
      id: uuid(),
      owner: getOwningIdentity(user),
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

export const deleteAttachment = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    const attachment = await db.query.attachments.findFirst({
      where: (model, { eq, and }) =>
        and(eq(model.id, data.id), eq(model.owner, getOwningIdentity(user))),
    });
    if (!attachment) return;
    const utapi = new UTApi();
    utapi.deleteFiles([attachment?.providerFileId]);
    await db
      .delete(attachments)
      .where(
        and(
          eq(attachments.id, data.id),
          eq(attachments.owner, getOwningIdentity(user))
        )
      );

    await sync(`attachment-update-${data.id}`, { data });
    await sync(`task-update-${attachment?.taskId}`, { data });

    return { id: data.id, taskId: attachment?.taskId };
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
