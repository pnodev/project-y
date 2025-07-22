import { createServerFn, useServerFn } from "@tanstack/react-start";
import { comment, CreateComment, insertCommentValidator } from "../schema";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { db } from "..";
import { v7 as uuid } from "uuid";
import { getOwningIdentity } from "~/lib/utils";
import { useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

const createComment = createServerFn({ method: "POST" })
  .validator(insertCommentValidator)
  .handler(async ({ data }) => {
    const user = await getAuth(getWebRequest());

    await db.insert(comment).values({
      ...data,
      id: uuid(),
      owner: getOwningIdentity(user),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
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
