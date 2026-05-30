import { createServerFn, useServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { v7 as uuid } from "uuid";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { db } from "~/db";
import {
  gitConnections,
  gitRepositories,
  gitStatusRules,
  gitUserLinks,
  insertGitStatusRuleValidator,
  projectGitRepositories,
  taskGitActivity,
  taskGitBranches,
  taskGitPullRequests,
  tasks,
  projects,
  updateGitStatusRuleValidator,
} from "~/db/schema";
import { requireSessionFromRequest } from "~/lib/session";
import { getOwningIdentity } from "~/lib/utils";
import { formatGitHubApiError } from "~/lib/git/errors";
import { getGitProvider } from "~/lib/git/factory";
import { pickRicherReviewComment } from "~/lib/git/review-comment-annotation";
import type { GitReviewComment } from "~/lib/git/types";
import { upsertTaskPullRequest } from "~/lib/git/upsert-task-pull-request";
import { resolveProjectRepositoryLink } from "~/lib/git/resolve-project-link";
import {
  defaultBranchName,
  formatTaskKey,
} from "~/lib/git/task-key";
import { sync } from "./sync";
import { env } from "~/env";

const saveProjectGitRepositories = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
      repositoryIds: z.array(z.string().uuid()).max(5),
      taskKeyPrefix: z
        .string()
        .regex(/^[A-Z][A-Z0-9]{0,15}$/)
        .optional(),
      defaultBaseBranches: z.record(z.string(), z.string()).optional(),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, data.projectId), eq(projects.owner, owner)),
    });
    if (!project) throw new Error("Project not found");

    if (data.taskKeyPrefix) {
      await db
        .update(projects)
        .set({ taskKeyPrefix: data.taskKeyPrefix, updatedAt: new Date() })
        .where(eq(projects.id, data.projectId));
    }

    await db
      .delete(projectGitRepositories)
      .where(eq(projectGitRepositories.projectId, data.projectId));

    for (const repositoryId of data.repositoryIds) {
      const repo = await db.query.gitRepositories.findFirst({
        where: and(
          eq(gitRepositories.id, repositoryId),
          eq(gitRepositories.owner, owner)
        ),
      });
      if (!repo) continue;

      await db.insert(projectGitRepositories).values({
        projectId: data.projectId,
        repositoryId,
        owner,
        isPrimary: false,
        defaultBaseBranch:
          data.defaultBaseBranches?.[repositoryId] ?? null,
      });
    }

    await sync(`project-update-${data.projectId}`, { id: data.projectId });
  });

const createTaskBranch = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().uuid(),
      repositoryId: z.string().uuid().optional(),
      branchName: z.string().min(1).max(256).optional(),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);

    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, data.taskId), eq(tasks.owner, owner)),
      with: { project: true },
    });
    if (!task) throw new Error("Task not found");

    const projectLink = await resolveProjectRepositoryLink(
      task.projectId,
      owner,
      { repositoryId: data.repositoryId, taskId: data.taskId }
    );

    const connection = projectLink.repository.connection;
    const repo = projectLink.repository;
    const taskKey = formatTaskKey(task.project.taskKeyPrefix, task.number);
    const branchName =
      data.branchName ?? defaultBranchName(taskKey, task.name);
    const baseBranch =
      projectLink.defaultBaseBranch ?? repo.defaultBranch;

    const userLink = await db.query.gitUserLinks.findFirst({
      where: and(
        eq(gitUserLinks.userId, session.user.id),
        eq(gitUserLinks.provider, "github")
      ),
    });

    const provider = getGitProvider(connection.provider);
    const gitBranch = await provider.createBranch(
      connection,
      {
        externalId: repo.externalId,
        fullName: repo.fullName,
        defaultBranch: repo.defaultBranch,
        htmlUrl: repo.htmlUrl,
        isArchived: repo.isArchived,
      },
      {
        base: baseBranch,
        name: branchName,
        userAccessToken: userLink
          ? (await import("~/lib/git/crypto")).decryptSecret(userLink.accessToken)
          : undefined,
      }
    );

    const existing = await db.query.taskGitBranches.findFirst({
      where: and(
        eq(taskGitBranches.taskId, data.taskId),
        eq(taskGitBranches.repositoryId, repo.id)
      ),
    });

    const now = new Date();
    let branchId: string;

    if (existing) {
      branchId = existing.id;
      await db
        .update(taskGitBranches)
        .set({
          ref: gitBranch.ref,
          sha: gitBranch.sha,
          state: "active",
          createdByUserId: session.user.id,
          updatedAt: now,
        })
        .where(eq(taskGitBranches.id, existing.id));
    } else {
      branchId = uuid();
      await db.insert(taskGitBranches).values({
        id: branchId,
        taskId: data.taskId,
        repositoryId: repo.id,
        owner,
        ref: gitBranch.ref,
        sha: gitBranch.sha,
        createdByUserId: session.user.id,
        updatedAt: now,
      });
    }

    await db.insert(taskGitActivity).values({
      id: uuid(),
      taskId: data.taskId,
      owner,
      type: "branch_created",
      payload: { ref: gitBranch.ref, url: gitBranch.htmlUrl },
      actorLogin: session.user.name,
      occurredAt: now,
    });

    await sync(`task-update-${data.taskId}`, { id: data.taskId });
    return { branchId, ref: gitBranch.ref, url: gitBranch.htmlUrl };
  });

const startTaskDevelopment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().uuid(),
      repositoryId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);

    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, data.taskId), eq(tasks.owner, owner)),
      with: { project: true },
    });
    if (!task) throw new Error("Task not found");

    const projectLink = await resolveProjectRepositoryLink(
      task.projectId,
      owner,
      { repositoryId: data.repositoryId, taskId: data.taskId }
    );

    const connection = projectLink.repository.connection;
    const repo = projectLink.repository;
    const taskKey = formatTaskKey(task.project.taskKeyPrefix, task.number);
    const branchName = defaultBranchName(taskKey, task.name);
    const baseBranch =
      projectLink.defaultBaseBranch ?? repo.defaultBranch;

    const userLink = await db.query.gitUserLinks.findFirst({
      where: and(
        eq(gitUserLinks.userId, session.user.id),
        eq(gitUserLinks.provider, "github")
      ),
    });

    const provider = getGitProvider(connection.provider);
    const gitBranch = await provider.createBranch(
      connection,
      {
        externalId: repo.externalId,
        fullName: repo.fullName,
        defaultBranch: repo.defaultBranch,
        htmlUrl: repo.htmlUrl,
        isArchived: repo.isArchived,
      },
      {
        base: baseBranch,
        name: branchName,
        userAccessToken: userLink
          ? (await import("~/lib/git/crypto")).decryptSecret(userLink.accessToken)
          : undefined,
      }
    );

    const existing = await db.query.taskGitBranches.findFirst({
      where: and(
        eq(taskGitBranches.taskId, data.taskId),
        eq(taskGitBranches.repositoryId, repo.id)
      ),
    });

    const now = new Date();
    let branchId: string;

    if (existing) {
      branchId = existing.id;
      await db
        .update(taskGitBranches)
        .set({
          ref: gitBranch.ref,
          sha: gitBranch.sha,
          state: "active",
          createdByUserId: session.user.id,
          updatedAt: now,
        })
        .where(eq(taskGitBranches.id, existing.id));
    } else {
      branchId = uuid();
      await db.insert(taskGitBranches).values({
        id: branchId,
        taskId: data.taskId,
        repositoryId: repo.id,
        owner,
        ref: gitBranch.ref,
        sha: gitBranch.sha,
        createdByUserId: session.user.id,
        updatedAt: now,
      });
    }

    await db.insert(taskGitActivity).values({
      id: uuid(),
      taskId: data.taskId,
      owner,
      type: "branch_created",
      payload: { ref: gitBranch.ref, url: gitBranch.htmlUrl },
      actorLogin: session.user.name,
      occurredAt: now,
    });

    await sync(`task-update-${data.taskId}`, { id: data.taskId });

    return {
      branchId,
      ref: gitBranch.ref,
      url: gitBranch.htmlUrl,
      taskKey,
      checkoutCommand: `git fetch origin && git checkout ${gitBranch.ref}`,
      repositoryFullName: repo.fullName,
    };
  });

const disconnectTaskGitBranch = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().uuid(),
      branchId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);

    const branch = await db.query.taskGitBranches.findFirst({
      where: and(
        eq(taskGitBranches.id, data.branchId),
        eq(taskGitBranches.taskId, data.taskId),
        eq(taskGitBranches.owner, owner)
      ),
      with: { repository: true },
    });
    if (!branch) throw new Error("Branch link not found");

    await db
      .delete(taskGitPullRequests)
      .where(
        and(
          eq(taskGitPullRequests.taskId, data.taskId),
          eq(taskGitPullRequests.owner, owner),
          eq(taskGitPullRequests.repositoryId, branch.repositoryId)
        )
      );

    await db.delete(taskGitBranches).where(eq(taskGitBranches.id, data.branchId));

    await db.insert(taskGitActivity).values({
      id: uuid(),
      taskId: data.taskId,
      owner,
      type: "branch_disconnected",
      payload: {
        ref: branch.ref,
        repositoryFullName: branch.repository.fullName,
      },
      actorLogin: session.user.name,
      occurredAt: new Date(),
    });

    await sync(`task-update-${data.taskId}`, { id: data.taskId });
  });

const linkTaskPullRequest = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().uuid(),
      prUrl: z.string().url(),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);

    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, data.taskId), eq(tasks.owner, owner)),
    });
    if (!task) throw new Error("Task not found");

    const connection = await db.query.gitConnections.findFirst({
      where: and(
        eq(gitConnections.owner, owner),
        eq(gitConnections.provider, "github")
      ),
    });
    if (!connection) throw new Error("GitHub not connected");

    const provider = getGitProvider("github");
    const parsed = provider.parsePullRequestUrl(data.prUrl);
    if (!parsed) throw new Error("Invalid pull request URL");

    const fullName = `${parsed.owner}/${parsed.repo}`;
    const repository = await db.query.gitRepositories.findFirst({
      where: and(
        eq(gitRepositories.owner, owner),
        eq(gitRepositories.fullName, fullName)
      ),
    });
    if (!repository) throw new Error("Repository not linked to workspace");

    const pr = await provider.getPullRequest(
      connection,
      {
        externalId: repository.externalId,
        fullName: repository.fullName,
        defaultBranch: repository.defaultBranch,
        htmlUrl: repository.htmlUrl,
        isArchived: repository.isArchived,
      },
      parsed.number
    );

    const branch = await db.query.taskGitBranches.findFirst({
      where: and(
        eq(taskGitBranches.taskId, data.taskId),
        eq(taskGitBranches.ref, pr.headRef)
      ),
    });

    await upsertTaskPullRequest({
      owner,
      taskId: data.taskId,
      repositoryId: repository.id,
      branchId: branch?.id ?? null,
      providerPrId: pr.providerPrId,
      number: pr.number,
      url: pr.url,
      title: pr.title,
      state: pr.state,
      headRef: pr.headRef,
      baseRef: pr.baseRef,
      mergedAt: pr.mergedAt,
      closedAt: pr.closedAt,
    });

    await sync(`task-update-${data.taskId}`, { id: data.taskId });
  });

const createTaskPullRequest = createServerFn({ method: "POST" })
  .inputValidator(z.object({ taskId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);

    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, data.taskId), eq(tasks.owner, owner)),
      with: { project: true },
    });
    if (!task) throw new Error("Task not found");

    const branches = await db.query.taskGitBranches.findMany({
      where: and(
        eq(taskGitBranches.taskId, data.taskId),
        eq(taskGitBranches.owner, owner)
      ),
      with: { repository: { with: { connection: true } } },
      orderBy: (b, { desc: d }) => [d(b.updatedAt)],
    });
    const branch =
      branches.find((b) => b.state === "active") ?? branches[0];
    if (!branch?.repository?.connection) {
      throw new Error("Create a branch before opening a pull request");
    }

    const projectLink = await db.query.projectGitRepositories.findFirst({
      where: and(
        eq(projectGitRepositories.projectId, task.projectId),
        eq(projectGitRepositories.repositoryId, branch.repositoryId)
      ),
    });

    const taskKey = formatTaskKey(task.project.taskKeyPrefix, task.number);
    const base =
      projectLink?.defaultBaseBranch ?? branch.repository.defaultBranch;
    const taskUrl = `${env.BETTER_AUTH_URL}/projects/${task.projectId}/tasks/${task.id}`;
    const body = `## Task\n\n[${taskKey}: ${task.name}](${taskUrl})\n\n## Summary\n\n${task.description?.slice(0, 500) ?? ""}`;

    const userLink = await db.query.gitUserLinks.findFirst({
      where: and(
        eq(gitUserLinks.userId, session.user.id),
        eq(gitUserLinks.provider, "github")
      ),
    });

    const provider = getGitProvider(branch.repository.connection.provider);
    let pr;
    try {
      pr = await provider.createPullRequest(
        branch.repository.connection,
        {
          externalId: branch.repository.externalId,
          fullName: branch.repository.fullName,
          defaultBranch: branch.repository.defaultBranch,
          htmlUrl: branch.repository.htmlUrl,
          isArchived: branch.repository.isArchived,
        },
        {
          title: `${taskKey}: ${task.name}`,
          body,
          head: branch.ref,
          base,
          userAccessToken: userLink
            ? (await import("~/lib/git/crypto")).decryptSecret(
                userLink.accessToken
              )
            : undefined,
        }
      );
    } catch (error) {
      throw new Error(formatGitHubApiError(error));
    }

    await upsertTaskPullRequest({
      owner,
      taskId: data.taskId,
      repositoryId: branch.repositoryId,
      branchId: branch.id,
      providerPrId: pr.providerPrId,
      number: pr.number,
      url: pr.url,
      title: pr.title,
      state: pr.state,
      headRef: pr.headRef,
      baseRef: pr.baseRef,
      mergedAt: pr.mergedAt,
      closedAt: pr.closedAt,
    });

    await sync(`task-update-${data.taskId}`, { id: data.taskId });
    return pr;
  });

const syncGitRepositories = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);
    const connection = await db.query.gitConnections.findFirst({
      where: and(
        eq(gitConnections.owner, owner),
        eq(gitConnections.provider, "github")
      ),
    });
    if (!connection) throw new Error("GitHub not connected");

    const provider = getGitProvider("github");
    const repos = await provider.syncRepositories(connection);
    const now = new Date();

    for (const repo of repos) {
      const existing = await db.query.gitRepositories.findFirst({
        where: and(
          eq(gitRepositories.connectionId, connection.id),
          eq(gitRepositories.externalId, repo.externalId)
        ),
      });
      if (existing) {
        await db
          .update(gitRepositories)
          .set({
            fullName: repo.fullName,
            defaultBranch: repo.defaultBranch,
            htmlUrl: repo.htmlUrl,
            isArchived: repo.isArchived,
            updatedAt: now,
          })
          .where(eq(gitRepositories.id, existing.id));
      } else {
        await db.insert(gitRepositories).values({
          id: uuid(),
          connectionId: connection.id,
          owner,
          externalId: repo.externalId,
          fullName: repo.fullName,
          defaultBranch: repo.defaultBranch,
          htmlUrl: repo.htmlUrl,
          isArchived: repo.isArchived,
          updatedAt: now,
        });
      }
    }
  }
);

const _completeGitHubInstallation = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      installationId: z.string(),
      accountLogin: z.string(),
      accountType: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { runCompleteGitHubInstallation } = await import(
      "./git-callback.server"
    );
    return runCompleteGitHubInstallation(session, data);
  });

const _saveGitHubUserLink = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      providerUserId: z.string(),
      providerLogin: z.string().optional(),
      accessToken: z.string(),
      refreshToken: z.string().optional(),
      scopes: z.string().optional(),
      expiresAt: z.string().datetime().optional(),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { runSaveGitHubUserLink } = await import("./git-callback.server");
    await runSaveGitHubUserLink(session.user.id, data);
  });

const createGitStatusRule = createServerFn({ method: "POST" })
  .inputValidator(insertGitStatusRuleValidator)
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);
    const now = new Date();
    await db.insert(gitStatusRules).values({
      id: uuid(),
      owner,
      pattern: data.pattern,
      targetStatusId: data.targetStatusId,
      priority: data.priority ?? 0,
      projectId: data.projectId ?? null,
      createdAt: now,
      updatedAt: now,
    });
  });

const updateGitStatusRule = createServerFn({ method: "POST" })
  .inputValidator(updateGitStatusRuleValidator)
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);
    await db
      .update(gitStatusRules)
      .set({
        pattern: data.pattern,
        targetStatusId: data.targetStatusId,
        priority: data.priority,
        projectId: data.projectId,
        updatedAt: new Date(),
      })
      .where(
        and(eq(gitStatusRules.id, data.id), eq(gitStatusRules.owner, owner))
      );
  });

const deleteGitStatusRule = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);
    await db
      .delete(gitStatusRules)
      .where(
        and(eq(gitStatusRules.id, data.id), eq(gitStatusRules.owner, owner))
      );
  });

const createTaskPullRequestReviewComment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().uuid(),
      pullRequestId: z.string().uuid(),
      reviewId: z.number().int().positive(),
      body: z.string().min(1),
      commitId: z.string().min(7),
      path: z.string().min(1),
      line: z.number().int().positive(),
      side: z.enum(["LEFT", "RIGHT"]).optional(),
      inReplyTo: z.number().int().optional(),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { createTaskPullRequestReviewComment } = await import(
      "~/db/queries/git.server"
    );
    return createTaskPullRequestReviewComment(
      session,
      data.taskId,
      data.pullRequestId,
      data
    );
  });

const startTaskPullRequestReview = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().uuid(),
      pullRequestId: z.string().uuid(),
      commitId: z.string().min(7),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { startTaskPullRequestReview } = await import(
      "~/db/queries/git.server"
    );
    return startTaskPullRequestReview(
      session,
      data.taskId,
      data.pullRequestId,
      data.commitId
    );
  });

const submitTaskPullRequestReview = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().uuid(),
      pullRequestId: z.string().uuid(),
      commitId: z.string().min(7),
      body: z.string().optional(),
      event: z.enum(["COMMENT", "APPROVE", "REQUEST_CHANGES"]),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { submitTaskPullRequestReview } = await import(
      "~/db/queries/git.server"
    );
    await submitTaskPullRequestReview(
      session,
      data.taskId,
      data.pullRequestId,
      data
    );
  });

const setTaskPullRequestReviewThreadResolved = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().uuid(),
      pullRequestId: z.string().uuid(),
      threadNodeId: z.string().min(1),
      resolved: z.boolean(),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { setTaskPullRequestReviewThreadResolved } = await import(
      "~/db/queries/git.server"
    );
    await setTaskPullRequestReviewThreadResolved(
      session,
      data.taskId,
      data.pullRequestId,
      {
        threadNodeId: data.threadNodeId,
        resolved: data.resolved,
      }
    );
  });

const mergeTaskPullRequest = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().uuid(),
      pullRequestId: z.string().uuid(),
      mergeMethod: z.enum(["merge", "squash", "rebase"]).optional(),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { mergeTaskPullRequest } = await import("~/db/queries/git.server");
    return mergeTaskPullRequest(
      session,
      data.taskId,
      data.pullRequestId,
      { mergeMethod: data.mergeMethod }
    );
  });

const closeTaskPullRequest = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().uuid(),
      pullRequestId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { closeTaskPullRequest } = await import("~/db/queries/git.server");
    return closeTaskPullRequest(session, data.taskId, data.pullRequestId);
  });

const discardTaskPullRequestReview = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().uuid(),
      pullRequestId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { discardTaskPullRequestReview } = await import(
      "~/db/queries/git.server"
    );
    await discardTaskPullRequestReview(
      session,
      data.taskId,
      data.pullRequestId
    );
  });

const disconnectGitHub = createServerFn({ method: "POST" }).handler(async () => {
  const session = await requireSessionFromRequest();
  const owner = getOwningIdentity(session);
  await db
    .delete(gitConnections)
    .where(
      and(
        eq(gitConnections.owner, owner),
        eq(gitConnections.provider, "github")
      )
    );
});

const disconnectGitHubUser = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await requireSessionFromRequest();
    await db
      .delete(gitUserLinks)
      .where(
        and(
          eq(gitUserLinks.userId, session.user.id),
          eq(gitUserLinks.provider, "github")
        )
      );
  }
);

type SaveProjectGitInput = {
  projectId: string;
  repositoryIds: string[];
  taskKeyPrefix?: string;
  defaultBaseBranches?: Record<string, string>;
};

export function useSaveProjectGitRepositoriesMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(saveProjectGitRepositories);
  return useCallback(
    async (input: SaveProjectGitInput) => {
      await fn({ data: input });
      queryClient.invalidateQueries({ queryKey: ["git"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    [fn, queryClient]
  );
}

export function useCreateTaskBranchMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(createTaskBranch);
  return useCallback(
    async (input: { taskId: string; repositoryId?: string; branchName?: string }) => {
      const result = await fn({ data: input });
      queryClient.invalidateQueries({ queryKey: ["git", "task", input.taskId] });
      return result;
    },
    [fn, queryClient]
  );
}

export function useStartTaskDevelopmentMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(startTaskDevelopment);
  return useCallback(
    async (input: { taskId: string; repositoryId?: string }) => {
      const result = await fn({ data: input });
      queryClient.invalidateQueries({ queryKey: ["git", "task", input.taskId] });
      return result;
    },
    [fn, queryClient]
  );
}

export function useDisconnectTaskGitBranchMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(disconnectTaskGitBranch);
  return useCallback(
    async (input: { taskId: string; branchId: string }) => {
      await fn({ data: input });
      queryClient.invalidateQueries({ queryKey: ["git", "task", input.taskId] });
    },
    [fn, queryClient]
  );
}

export function useLinkTaskPullRequestMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(linkTaskPullRequest);
  return useCallback(
    async (input: { taskId: string; prUrl: string }) => {
      await fn({ data: input });
      queryClient.invalidateQueries({ queryKey: ["git", "task", input.taskId] });
    },
    [fn, queryClient]
  );
}

export function useCreateTaskPullRequestMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(createTaskPullRequest);
  return useCallback(
    async (taskId: string) => {
      const result = await fn({ data: { taskId } });
      queryClient.invalidateQueries({ queryKey: ["git", "task", taskId] });
      return result;
    },
    [fn, queryClient]
  );
}

export function useSyncGitRepositoriesMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(syncGitRepositories);
  return useCallback(async () => {
    await fn();
    queryClient.invalidateQueries({ queryKey: ["git"] });
  }, [fn, queryClient]);
}

export function useCreateGitStatusRuleMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(createGitStatusRule);
  return useCallback(
    async (data: {
      pattern: string;
      targetStatusId: string;
      priority?: number;
      projectId?: string | null;
    }) => {
      await fn({ data });
      queryClient.invalidateQueries({ queryKey: ["git", "status-rules"] });
    },
    [fn, queryClient]
  );
}

export function useUpdateGitStatusRuleMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(updateGitStatusRule);
  return useCallback(
    async (data: z.infer<typeof updateGitStatusRuleValidator>) => {
      await fn({ data });
      queryClient.invalidateQueries({ queryKey: ["git", "status-rules"] });
    },
    [fn, queryClient]
  );
}

export function useDeleteGitStatusRuleMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(deleteGitStatusRule);
  return useCallback(
    async (id: string) => {
      await fn({ data: { id } });
      queryClient.invalidateQueries({ queryKey: ["git", "status-rules"] });
    },
    [fn, queryClient]
  );
}

function invalidatePrReviewQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  taskId: string,
  pullRequestId: string
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["git", "pr-comments", taskId, pullRequestId],
    }),
    queryClient.invalidateQueries({
      queryKey: ["git", "pr-status", taskId, pullRequestId],
    }),
    queryClient.invalidateQueries({ queryKey: ["git", "task", taskId] }),
  ]);
}

export function useStartTaskPullRequestReviewMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(startTaskPullRequestReview);
  return useCallback(
    async (input: {
      taskId: string;
      pullRequestId: string;
      commitId: string;
    }) => {
      const result = await fn({ data: input });
      await invalidatePrReviewQueries(
        queryClient,
        input.taskId,
        input.pullRequestId
      );
      return result;
    },
    [fn, queryClient]
  );
}

export function useCreateTaskPullRequestReviewCommentMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(createTaskPullRequestReviewComment);
  return useCallback(
    async (input: {
      taskId: string;
      pullRequestId: string;
      reviewId: number;
      body: string;
      commitId: string;
      path: string;
      line: number;
      side?: "LEFT" | "RIGHT";
      inReplyTo?: number;
    }) => {
      const result = await fn({ data: input });
      const key = ["git", "pr-comments", input.taskId, input.pullRequestId] as const;
      queryClient.setQueryData(key, (prev: unknown) => {
        if (!prev || typeof prev !== "object") return prev;
        const data = prev as {
          pendingComments?: GitReviewComment[];
        };
        const pending = data.pendingComments ?? [];
        const existing = pending.find((c) => c.id === result.id);
        const nextPending = existing
          ? pending.map((c) =>
              c.id === result.id ? pickRicherReviewComment(c, result) : c
            )
          : [...pending, result];
        return { ...data, pendingComments: nextPending };
      });
      await invalidatePrReviewQueries(
        queryClient,
        input.taskId,
        input.pullRequestId
      );
      return result;
    },
    [fn, queryClient]
  );
}

export function useSubmitTaskPullRequestReviewMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(submitTaskPullRequestReview);
  return useCallback(
    async (input: {
      taskId: string;
      pullRequestId: string;
      commitId: string;
      body?: string;
      event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES";
    }) => {
      await fn({ data: input });
      await invalidatePrReviewQueries(
        queryClient,
        input.taskId,
        input.pullRequestId
      );
    },
    [fn, queryClient]
  );
}

export function useSetTaskPullRequestReviewThreadResolvedMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(setTaskPullRequestReviewThreadResolved);
  return useCallback(
    async (input: {
      taskId: string;
      pullRequestId: string;
      threadNodeId: string;
      resolved: boolean;
    }) => {
      await fn({ data: input });
      await invalidatePrReviewQueries(
        queryClient,
        input.taskId,
        input.pullRequestId
      );
    },
    [fn, queryClient]
  );
}

export function useMergeTaskPullRequestMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(mergeTaskPullRequest);
  return useCallback(
    async (input: {
      taskId: string;
      pullRequestId: string;
      mergeMethod?: "merge" | "squash" | "rebase";
    }) => {
      const result = await fn({ data: input });
      await invalidatePrReviewQueries(
        queryClient,
        input.taskId,
        input.pullRequestId
      );
      return result;
    },
    [fn, queryClient]
  );
}

export function useCloseTaskPullRequestMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(closeTaskPullRequest);
  return useCallback(
    async (input: { taskId: string; pullRequestId: string }) => {
      const result = await fn({ data: input });
      await invalidatePrReviewQueries(
        queryClient,
        input.taskId,
        input.pullRequestId
      );
      return result;
    },
    [fn, queryClient]
  );
}

export function useDiscardTaskPullRequestReviewMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(discardTaskPullRequestReview);
  return useCallback(
    async (input: { taskId: string; pullRequestId: string }) => {
      await fn({ data: input });
      await invalidatePrReviewQueries(
        queryClient,
        input.taskId,
        input.pullRequestId
      );
    },
    [fn, queryClient]
  );
}

export function useDisconnectGitHubMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(disconnectGitHub);
  return useCallback(async () => {
    await fn();
    queryClient.invalidateQueries({ queryKey: ["git"] });
  }, [fn, queryClient]);
}

export function useDisconnectGitHubUserMutation() {
  const queryClient = useQueryClient();
  const fn = useServerFn(disconnectGitHubUser);
  return useCallback(async () => {
    await fn();
    queryClient.invalidateQueries({ queryKey: ["git"] });
  }, [fn, queryClient]);
}
