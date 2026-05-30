import "@tanstack/react-start/server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { v7 as uuid } from "uuid";
import { db } from "~/db";
import {
  gitCommitStatusApplications,
  gitConnections,
  gitRepositories,
  gitStatusRules,
  gitWebhookDeliveries,
  projects,
  taskGitActivity,
  taskGitBranches,
  taskGitPullRequests,
  tasks,
} from "~/db/schema";
import { env } from "~/env";
import { getGitProvider } from "../factory";
import { matchStatusRules } from "../status-rules";
import { branchMatchesTaskKey, extractTaskKeysFromText, formatTaskKey } from "../task-key";
import { upsertTaskPullRequest } from "../upsert-task-pull-request";
import {
  syncTaskGitUpdate,
} from "../sync-task-update.server";
import type { GitInvalidateScope } from "../sync-task-update";
import { invalidateGitHubCacheForPullRequest } from "~/lib/git/github/cache-invalidation";
import { encodeRepoFullName } from "~/lib/git/github/cache-keys";
import { deleteCacheByPrefix } from "~/lib/cache/redis";

export function verifyGitHubWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!signature || !env.GITHUB_APP_WEBHOOK_SECRET) return false;
  const expected =
    "sha256=" +
    createHmac("sha256", env.GITHUB_APP_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function isDeliveryProcessed(deliveryId: string) {
  const existing = await db.query.gitWebhookDeliveries.findFirst({
    where: eq(gitWebhookDeliveries.id, deliveryId),
  });
  return Boolean(existing);
}

async function markDeliveryProcessed(
  deliveryId: string,
  eventType: string
) {
  await db.insert(gitWebhookDeliveries).values({
    id: deliveryId,
    provider: "github",
    eventType,
    processedAt: new Date(),
  });
}

async function findConnectionByInstallationId(installationId: number) {
  return db.query.gitConnections.findFirst({
    where: eq(gitConnections.installationId, String(installationId)),
  });
}

async function syncReposForConnection(connectionId: string, owner: string) {
  const connection = await db.query.gitConnections.findFirst({
    where: eq(gitConnections.id, connectionId),
  });
  if (!connection) return;

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

async function resolveTaskByKey(
  owner: string,
  prefix: string,
  number: number
) {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.owner, owner), eq(projects.taskKeyPrefix, prefix)),
  });
  if (!project) return null;

  return db.query.tasks.findFirst({
    where: and(
      eq(tasks.owner, owner),
      eq(tasks.projectId, project.id),
      eq(tasks.number, number)
    ),
  });
}

async function findRepositoryByFullName(owner: string, fullName: string) {
  return db.query.gitRepositories.findFirst({
    where: and(
      eq(gitRepositories.owner, owner),
      eq(gitRepositories.fullName, fullName)
    ),
  });
}

async function findLinkedPullRequests(
  owner: string,
  repositoryId: string,
  prNumber: number
) {
  return db.query.taskGitPullRequests.findMany({
    where: and(
      eq(taskGitPullRequests.owner, owner),
      eq(taskGitPullRequests.repositoryId, repositoryId),
      eq(taskGitPullRequests.number, prNumber)
    ),
  });
}

async function notifyPullRequestGitUpdate(
  owner: string,
  repositoryFullName: string,
  prNumber: number,
  scopes: GitInvalidateScope[]
) {
  const repository = await findRepositoryByFullName(owner, repositoryFullName);
  if (!repository) return;

  await invalidateGitHubCacheForPullRequest(repositoryFullName, prNumber, scopes);

  const linked = await findLinkedPullRequests(owner, repository.id, prNumber);
  for (const pr of linked) {
    await syncTaskGitUpdate(pr.taskId, scopes, { pullRequestId: pr.id });
  }
}

async function linkPullRequestToTask(params: {
  owner: string;
  taskId: string;
  repositoryId: string;
  branchId?: string | null;
  pr: {
    providerPrId: string;
    number: number;
    url: string;
    title: string;
    body?: string | null;
    state: "open" | "closed" | "merged" | "draft";
    headRef: string;
    baseRef: string;
    mergedAt: Date | null;
    closedAt: Date | null;
  };
}) {
  return upsertTaskPullRequest({
    owner: params.owner,
    taskId: params.taskId,
    repositoryId: params.repositoryId,
    branchId: params.branchId,
    providerPrId: params.pr.providerPrId,
    number: params.pr.number,
    url: params.pr.url,
    title: params.pr.title,
    body: params.pr.body ?? null,
    state: params.pr.state,
    headRef: params.pr.headRef,
    baseRef: params.pr.baseRef,
    mergedAt: params.pr.mergedAt,
    closedAt: params.pr.closedAt,
  });
}

export async function processGitHubWebhook(
  eventType: string,
  deliveryId: string,
  payload: Record<string, unknown>
) {
  if (await isDeliveryProcessed(deliveryId)) {
    return { skipped: true };
  }

  try {
    if (eventType === "ping") {
      return { processed: true, ping: true };
    }

    if (eventType === "installation") {
      const action = payload.action as string;
      const installation = payload.installation as {
        id: number;
        account?: { login?: string; type?: string };
      };
      if (action === "deleted") {
        await db
          .delete(gitConnections)
          .where(
            eq(gitConnections.installationId, String(installation.id))
          );
      }
    }

    if (
      eventType === "installation" ||
      eventType === "installation_repositories"
    ) {
      const installation = payload.installation as { id: number };
      const connection = await findConnectionByInstallationId(
        installation.id
      );
      if (connection) {
        await syncReposForConnection(connection.id, connection.owner);
      }
    }

    if (eventType === "push") {
      await handlePushEvent(payload, deliveryId);
    }

    if (eventType === "pull_request") {
      await handlePullRequestEvent(payload);
    }

    if (
      eventType === "issue_comment" ||
      eventType === "pull_request_review" ||
      eventType === "pull_request_review_comment"
    ) {
      await handlePullRequestReviewActivityEvent(payload);
    }

    if (
      eventType === "check_run" ||
      eventType === "check_suite" ||
      eventType === "status"
    ) {
      await handleCheckStatusEvent(payload);
    }

    await markDeliveryProcessed(deliveryId, eventType);
    return { processed: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[github-webhook] ${eventType} delivery=${deliveryId} failed: ${message}`,
      error
    );
    throw error;
  }
}

async function handlePushEvent(
  payload: Record<string, unknown>,
  deliveryId: string
) {
  const repo = payload.repository as { full_name?: string; id?: number };
  const ref = payload.ref as string;
  const commits = (payload.commits as { id: string; message: string }[]) ?? [];
  const pusher = payload.pusher as { name?: string } | undefined;
  const installation = payload.installation as { id: number } | undefined;

  if (!repo?.full_name || !installation) return;

  const connection = await findConnectionByInstallationId(installation.id);
  if (!connection) return;

  const repository = await findRepositoryByFullName(
    connection.owner,
    repo.full_name
  );
  if (!repository) return;

  const branchRef = ref.replace(/^refs\/heads\//, "");
  const rules = await db.query.gitStatusRules.findMany({
    where: eq(gitStatusRules.owner, connection.owner),
  });

  for (const commit of commits) {
    const keys = extractTaskKeysFromText(commit.message);
    const match = matchStatusRules(commit.message, rules, keys);

    if (match) {
      const task = await resolveTaskByKey(
        connection.owner,
        match.taskKey.prefix,
        match.taskKey.number
      );
      if (task && task.statusId !== match.rule.targetStatusId) {
        const applied = await db.query.gitCommitStatusApplications.findFirst({
          where: and(
            eq(gitCommitStatusApplications.deliveryId, deliveryId),
            eq(gitCommitStatusApplications.commitSha, commit.id),
            eq(gitCommitStatusApplications.ruleId, match.rule.id),
            eq(gitCommitStatusApplications.taskId, task.id)
          ),
        });
        if (!applied) {
          await db.insert(gitCommitStatusApplications).values({
            deliveryId,
            commitSha: commit.id,
            ruleId: match.rule.id,
            taskId: task.id,
          });
          await db
            .update(tasks)
            .set({
              statusId: match.rule.targetStatusId,
              updatedAt: new Date(),
            })
            .where(eq(tasks.id, task.id));
          await syncTaskGitUpdate(task.id, ["task", "summaries"]);
        }
      }
    }

    for (const key of keys) {
      const task = await resolveTaskByKey(
        connection.owner,
        key.prefix,
        key.number
      );
      if (!task) continue;

      await db.insert(taskGitActivity).values({
        id: uuid(),
        taskId: task.id,
        owner: connection.owner,
        type: "commit",
        payload: {
          sha: commit.id,
          message: commit.message,
          ref: branchRef,
          repositoryId: repository.id,
        },
        actorLogin: pusher?.name ?? null,
        occurredAt: new Date(),
      });

      const taskKeyStr = formatTaskKey(key.prefix, key.number);
      let linkedBranch = await db.query.taskGitBranches.findFirst({
        where: and(
          eq(taskGitBranches.taskId, task.id),
          eq(taskGitBranches.repositoryId, repository.id)
        ),
      });

      if (
        !linkedBranch &&
        branchMatchesTaskKey(branchRef, taskKeyStr)
      ) {
        const branchId = uuid();
        await db.insert(taskGitBranches).values({
          id: branchId,
          taskId: task.id,
          repositoryId: repository.id,
          owner: connection.owner,
          ref: branchRef,
          sha: commit.id,
          updatedAt: new Date(),
        });
        linkedBranch = await db.query.taskGitBranches.findFirst({
          where: eq(taskGitBranches.id, branchId),
        });
      }

      if (linkedBranch && linkedBranch.ref === branchRef) {
        await db
          .update(taskGitBranches)
          .set({ sha: commit.id, updatedAt: new Date() })
          .where(eq(taskGitBranches.id, linkedBranch.id));
      }

      await deleteCacheByPrefix(
        `gh:github:${encodeRepoFullName(repo.full_name!)}:compare:`
      );

      const openPrs = await db.query.taskGitPullRequests.findMany({
        where: and(
          eq(taskGitPullRequests.taskId, task.id),
          eq(taskGitPullRequests.repositoryId, repository.id),
          eq(taskGitPullRequests.headRef, branchRef)
        ),
      });
      await syncTaskGitUpdate(task.id, ["task", "summaries", "diff", "commits"]);

      for (const openPr of openPrs) {
        if (openPr.state !== "open" && openPr.state !== "draft") continue;
        await invalidateGitHubCacheForPullRequest(
          repo.full_name!,
          openPr.number,
          ["task", "diff", "commits", "pr-status", "pr-meta"]
        );
        await syncTaskGitUpdate(task.id, ["pr-status", "pr-meta"], {
          pullRequestId: openPr.id,
        });
      }
    }
  }
}

async function handlePullRequestEvent(payload: Record<string, unknown>) {
  const action = payload.action as string | undefined;
  const pr = payload.pull_request as {
    id: number;
    number: number;
    html_url: string;
    title: string;
    state: string;
    merged_at: string | null;
    closed_at: string | null;
    draft?: boolean;
    head: { ref: string };
    base: { ref: string };
    body?: string | null;
  };
  const repo = payload.repository as { full_name?: string };
  const installation = payload.installation as { id: number } | undefined;

  if (!pr || !repo?.full_name || !installation) return;

  const connection = await findConnectionByInstallationId(installation.id);
  if (!connection) return;

  const repository = await findRepositoryByFullName(
    connection.owner,
    repo.full_name
  );
  if (!repository) return;

  const state =
    pr.merged_at ? "merged" : pr.draft ? "draft" : pr.state === "open" ? "open" : "closed";

  const linkedBranch = await db.query.taskGitBranches.findFirst({
    where: and(
      eq(taskGitBranches.owner, connection.owner),
      eq(taskGitBranches.repositoryId, repository.id),
      eq(taskGitBranches.ref, pr.head.ref)
    ),
  });

  let taskId = linkedBranch?.taskId ?? null;

  if (!taskId) {
    const text = `${pr.title}\n${pr.body ?? ""}`;
    const keys = extractTaskKeysFromText(text);
    for (const key of keys) {
      const task = await resolveTaskByKey(
        connection.owner,
        key.prefix,
        key.number
      );
      if (task) {
        taskId = task.id;
        break;
      }
    }
  }

  if (!taskId) return;

  const linkedPrId = await linkPullRequestToTask({
    owner: connection.owner,
    taskId,
    repositoryId: repository.id,
    branchId: linkedBranch?.id,
    pr: {
      providerPrId: String(pr.id),
      number: pr.number,
      url: pr.html_url,
      title: pr.title,
      body: pr.body ?? null,
      state,
      headRef: pr.head.ref,
      baseRef: pr.base.ref,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
    },
  });

  const logActivity =
    action === "opened" ||
    action === "reopened" ||
    action === "closed";

  if (logActivity) {
    await db.insert(taskGitActivity).values({
      id: uuid(),
      taskId,
      owner: connection.owner,
      type: "pull_request",
      payload: {
        number: pr.number,
        state,
        url: pr.html_url,
        title: pr.title,
        action: action === "closed" && state === "merged" ? "closed" : action,
      },
      occurredAt: new Date(),
    });
  }

  await invalidateGitHubCacheForPullRequest(repo.full_name, pr.number, [
    "task",
    "diff",
    "commits",
    "pr-status",
    "pr-meta",
    "pr-comments",
  ]);

  await syncTaskGitUpdate(
    taskId,
    ["task", "summaries", "diff", "commits", "pr-status", "pr-meta"],
    { pullRequestId: linkedPrId }
  );
}

async function handlePullRequestReviewActivityEvent(
  payload: Record<string, unknown>
) {
  const repo = payload.repository as { full_name?: string } | undefined;
  const installation = payload.installation as { id: number } | undefined;
  const pullRequest = payload.pull_request as { number?: number } | undefined;

  if (!repo?.full_name || !installation || pullRequest?.number == null) return;

  const connection = await findConnectionByInstallationId(installation.id);
  if (!connection) return;

  await notifyPullRequestGitUpdate(
    connection.owner,
    repo.full_name,
    pullRequest.number,
    ["pr-comments"]
  );
}

async function handleCheckStatusEvent(payload: Record<string, unknown>) {
  const repo = payload.repository as { full_name?: string } | undefined;
  const installation = payload.installation as { id: number } | undefined;

  if (!repo?.full_name || !installation) return;

  const connection = await findConnectionByInstallationId(installation.id);
  if (!connection) return;

  const pullRequests = new Set<number>();

  const checkRun = payload.check_run as
    | { pull_requests?: Array<{ number?: number }> }
    | undefined;
  for (const pr of checkRun?.pull_requests ?? []) {
    if (pr.number != null) pullRequests.add(pr.number);
  }

  const checkSuite = payload.check_suite as
    | { pull_requests?: Array<{ number?: number }> }
    | undefined;
  for (const pr of checkSuite?.pull_requests ?? []) {
    if (pr.number != null) pullRequests.add(pr.number);
  }

  const status = payload as {
    branches?: Array<{ name?: string }>;
  };
  if (status.branches?.length) {
    const repository = await findRepositoryByFullName(
      connection.owner,
      repo.full_name
    );
    if (repository) {
      for (const branch of status.branches) {
        if (!branch.name) continue;
        const linkedPrs = await db.query.taskGitPullRequests.findMany({
          where: and(
            eq(taskGitPullRequests.owner, connection.owner),
            eq(taskGitPullRequests.repositoryId, repository.id),
            eq(taskGitPullRequests.headRef, branch.name),
            inArray(taskGitPullRequests.state, ["open", "draft"])
          ),
        });
        for (const pr of linkedPrs) {
          pullRequests.add(pr.number);
        }
      }
    }
  }

  for (const prNumber of pullRequests) {
    await notifyPullRequestGitUpdate(
      connection.owner,
      repo.full_name,
      prNumber,
      ["pr-status"]
    );
  }
}
