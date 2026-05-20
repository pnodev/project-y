import "@tanstack/react-start/server-only";

import { UTApi } from "uploadthing/server";
import { and, eq } from "drizzle-orm";
import { db } from "~/db";
import { attachments } from "../schema";
import { sync } from "./sync";

export async function deleteAttachmentFilesFromStorage(
  providerFileIds: string[],
) {
  if (providerFileIds.length === 0) return;

  const utapi = new UTApi();
  const deleteResult = await utapi.deleteFiles(providerFileIds);
  if (!deleteResult.success) {
    throw new Error("Failed to delete attachment file from storage");
  }
}

export async function deleteAttachmentForOwner(
  owner: string,
  attachmentId: string,
) {
  const attachment = await db.query.attachments.findFirst({
    where: (model, { eq, and }) =>
      and(eq(model.id, attachmentId), eq(model.owner, owner)),
  });
  if (!attachment) return;

  await deleteAttachmentFilesFromStorage([attachment.providerFileId]);

  await db
    .delete(attachments)
    .where(
      and(eq(attachments.id, attachmentId), eq(attachments.owner, owner)),
    );

  await sync(`attachment-update-${attachmentId}`, { data: { id: attachmentId } });
  await sync(`task-update-${attachment.taskId}`, {
    data: { id: attachmentId },
  });

  return { id: attachmentId, taskId: attachment.taskId };
}
