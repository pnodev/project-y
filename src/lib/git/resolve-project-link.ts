import "@tanstack/react-start/server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "~/db";
import { projectGitRepositories, taskGitBranches } from "~/db/schema";
import { MULTI_REPO_SELECTION_MESSAGE } from "./constants";

export { MULTI_REPO_SELECTION_MESSAGE };

/**
 * Resolves a project↔repo link for git operations on a task.
 * Uses explicit repositoryId, else the task's linked branch repo, else the only linked repo.
 */
export async function resolveProjectRepositoryLink(
  projectId: string,
  owner: string,
  options?: { repositoryId?: string; taskId?: string }
) {
  const links = await db.query.projectGitRepositories.findMany({
    where: eq(projectGitRepositories.projectId, projectId),
    with: { repository: { with: { connection: true } } },
  });

  const withConnection = links.filter((l) => l.repository?.connection);
  if (withConnection.length === 0) {
    throw new Error("No repository linked to this project");
  }

  if (options?.repositoryId) {
    const link = withConnection.find(
      (l) => l.repositoryId === options.repositoryId
    );
    if (!link) {
      throw new Error("Repository is not linked to this project");
    }
    return link;
  }

  if (options?.taskId) {
    const branches = await db.query.taskGitBranches.findMany({
      where: and(
        eq(taskGitBranches.taskId, options.taskId),
        eq(taskGitBranches.owner, owner)
      ),
      orderBy: [desc(taskGitBranches.updatedAt)],
    });
    const active =
      branches.find((b) => b.state === "active") ?? branches[0];
    if (active) {
      const link = withConnection.find(
        (l) => l.repositoryId === active.repositoryId
      );
      if (link) return link;
    }
  }

  if (withConnection.length === 1) {
    return withConnection[0];
  }

  throw new Error(MULTI_REPO_SELECTION_MESSAGE);
}
