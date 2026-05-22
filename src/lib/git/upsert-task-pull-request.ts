import "@tanstack/react-start/server-only";

import { and, eq } from "drizzle-orm";
import { v7 as uuid } from "uuid";
import { db } from "~/db";
import { taskGitPullRequests, type GitPrState } from "~/db/schema";

export type UpsertTaskPullRequestInput = {
  owner: string;
  taskId: string;
  repositoryId: string;
  branchId?: string | null;
  providerPrId: string;
  number: number;
  url: string;
  title: string;
  state: GitPrState;
  headRef: string;
  baseRef: string;
  mergedAt: Date | null;
  closedAt: Date | null;
};

/** Insert or update by (repositoryId, number) — matches webhook + manual link behavior. */
export async function upsertTaskPullRequest(
  input: UpsertTaskPullRequestInput
): Promise<string> {
  const existing = await db.query.taskGitPullRequests.findFirst({
    where: and(
      eq(taskGitPullRequests.repositoryId, input.repositoryId),
      eq(taskGitPullRequests.number, input.number)
    ),
  });

  const now = new Date();

  if (existing) {
    await db
      .update(taskGitPullRequests)
      .set({
        taskId: input.taskId,
        branchId: input.branchId ?? existing.branchId,
        owner: input.owner,
        providerPrId: input.providerPrId,
        url: input.url,
        title: input.title,
        state: input.state,
        headRef: input.headRef,
        baseRef: input.baseRef,
        mergedAt: input.mergedAt,
        closedAt: input.closedAt,
        updatedAt: now,
      })
      .where(eq(taskGitPullRequests.id, existing.id));
    return existing.id;
  }

  const id = uuid();
  await db.insert(taskGitPullRequests).values({
    id,
    taskId: input.taskId,
    repositoryId: input.repositoryId,
    branchId: input.branchId ?? null,
    owner: input.owner,
    number: input.number,
    providerPrId: input.providerPrId,
    url: input.url,
    title: input.title,
    state: input.state,
    headRef: input.headRef,
    baseRef: input.baseRef,
    mergedAt: input.mergedAt,
    closedAt: input.closedAt,
    updatedAt: now,
  });
  return id;
}
