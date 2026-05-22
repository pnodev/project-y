import "@tanstack/react-start/server-only";

import { and, eq } from "drizzle-orm";
import { db } from "~/db";
import {
  gitRepositories,
  projectGitRepositories,
  taskGitBranches,
  taskGitPullRequests,
  tasks,
} from "~/db/schema";
import { resolveProjectRepositoryLink } from "./resolve-project-link";
import type { GitRepo } from "./types";

export function toGitRepo(
  repository: typeof gitRepositories.$inferSelect
): GitRepo {
  return {
    externalId: repository.externalId,
    fullName: repository.fullName,
    defaultBranch: repository.defaultBranch,
    htmlUrl: repository.htmlUrl,
    isArchived: repository.isArchived,
  };
}

export async function resolveTaskRepository(
  owner: string,
  taskId: string,
  options?: { repositoryId?: string; pullRequestId?: string }
) {
  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.owner, owner)),
    with: { project: true },
  });
  if (!task) throw new Error("Task not found");

  if (options?.pullRequestId) {
    const pr = await db.query.taskGitPullRequests.findFirst({
      where: and(
        eq(taskGitPullRequests.id, options.pullRequestId),
        eq(taskGitPullRequests.taskId, taskId),
        eq(taskGitPullRequests.owner, owner)
      ),
      with: {
        repository: { with: { connection: true } },
        branch: true,
      },
    });
    if (!pr?.repository?.connection) throw new Error("Pull request not found");
    return {
      task,
      repository: pr.repository,
      connection: pr.repository.connection,
      branch: pr.branch ?? null,
      pullRequest: pr,
    };
  }

  const branchWhere = options?.repositoryId
    ? and(
        eq(taskGitBranches.taskId, taskId),
        eq(taskGitBranches.owner, owner),
        eq(taskGitBranches.repositoryId, options.repositoryId)
      )
    : and(eq(taskGitBranches.taskId, taskId), eq(taskGitBranches.owner, owner));

  const branches = await db.query.taskGitBranches.findMany({
    where: branchWhere,
    with: { repository: { with: { connection: true } } },
    orderBy: (b, { desc: d }) => [d(b.updatedAt)],
  });
  const branch = branches[0];

  if (branch?.repository?.connection) {
    return {
      task,
      repository: branch.repository,
      connection: branch.repository.connection,
      branch,
      pullRequest: null as null,
    };
  }

  const projectLink = await resolveProjectRepositoryLink(
    task.projectId,
    owner,
    {
      repositoryId: options?.repositoryId,
      taskId,
    }
  );

  return {
    task,
    repository: projectLink.repository,
    connection: projectLink.repository.connection,
    branch: null as null,
    pullRequest: null as null,
  };
}
