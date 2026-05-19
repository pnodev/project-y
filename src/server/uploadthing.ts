import { getRequestHeaders } from "@tanstack/react-start/server";
import { createUploadthing, UploadThingError } from "uploadthing/server";
import type { FileRouter } from "uploadthing/server";
import { auth } from "~/lib/auth";

const f = createUploadthing();

export const uploadRouter = {
  attachmentUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 10,
    },
  })
    .middleware(async () => {
      const session = await auth.api.getSession({
        headers: getRequestHeaders(),
      });

      if (!session) throw new UploadThingError("Unauthorized");

      return { uploadedBy: session.user.id };
    })
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
    .middleware(async () => {
      const session = await auth.api.getSession({
        headers: getRequestHeaders(),
      });

      if (!session) throw new UploadThingError("Unauthorized");

      return { uploadedBy: session.user.id };
    })
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
    .middleware(async () => {
      const session = await auth.api.getSession({
        headers: getRequestHeaders(),
      });

      if (!session) throw new UploadThingError("Unauthorized");

      return { uploadedBy: session.user.id };
    })
    .onUploadComplete(async ({ metadata }) => {
      return {
        uploadedBy: metadata.uploadedBy,
      };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
