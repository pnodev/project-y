import { getRequestHeaders } from "@tanstack/react-start/server";
import { createUploadthing, UploadThingError } from "uploadthing/server";
import type { FileRouter } from "uploadthing/server";
import { auth } from "~/lib/auth";

const f = createUploadthing();

async function uploadAuthMiddleware() {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  });

  if (!session) throw new UploadThingError("Unauthorized");

  return { uploadedBy: session.user.id };
}

export const uploadRouter = {
  attachmentUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 10,
    },
    video: {
      maxFileSize: "64MB",
      maxFileCount: 10,
    },
    pdf: {
      maxFileSize: "16MB",
      maxFileCount: 10,
    },
  })
    .middleware(uploadAuthMiddleware)
    .onUploadComplete(async ({ metadata }) => {
      return {
        uploadedBy: metadata.uploadedBy,
      };
    }),
  projectLogoUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(uploadAuthMiddleware)
    .onUploadComplete(async ({ metadata }) => {
      return {
        uploadedBy: metadata.uploadedBy,
      };
    }),
  avatarUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(uploadAuthMiddleware)
    .onUploadComplete(async ({ metadata }) => {
      return {
        uploadedBy: metadata.uploadedBy,
      };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
