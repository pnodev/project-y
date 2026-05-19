import { createServerFn, useServerFn } from "@tanstack/react-start";
import { comments, CreateComment, insertCommentValidator } from "../schema";
import { requireSession } from "~/lib/auth-functions";
import { db } from "..";
import { v7 as uuid } from "uuid";
import { getOwningIdentity } from "~/lib/utils";
import { useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { sync } from "./sync";

const createComment = createServerFn({ method: "POST" })
  .inputValidator(insertCommentValidator)
  .handler(async ({ data }) => {
    const session = await requireSession();

    await db.insert(comments).values({
      ...data,
      id: uuid(),
      owner: getOwningIdentity(session),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await sync("comment-create", { data });
  });

export function useCreateCommentMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const _createComment = useServerFn(createComment);

  return useCallback(
    async (commentData: CreateComment) => {
      const result = await _createComment({ data: commentData });

      router.invalidate();
      queryClient.invalidateQueries({
        queryKey: ["comments", commentData.taskId],
      });

      return result;
    },
    [_createComment]
  );
}
