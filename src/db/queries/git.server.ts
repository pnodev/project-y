import "@tanstack/react-start/server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "~/db";
import {
  gitConnections,
  gitRepositories,
  gitStatusRules,
  gitUserLinks,
  projectGitRepositories,
  taskGitActivity,
  taskGitBranches,
  taskGitPullRequests,
  tasks,
  projects,
} from "~/db/schema";
import { getOwningIdentity } from "~/lib/utils";
import { formatTaskKey } from "~/lib/git/task-key";
import {
  resolveTaskRepository,
  toGitRepo,
} from "~/lib/git/resolve-task-repo";
import {
  getActiveBranch,
  getLatestPr,
  getOpenPr,
  resolveBaseRef,
  type TaskDevPhaseContext,
} from "~/lib/git/task-dev-phase";
import type { GitPullRequest, GitReviewComment } from "~/lib/git/types";
import { upsertTaskPullRequest } from "~/lib/git/upsert-task-pull-request";
import { syncTaskGitUpdate } from "~/lib/git/sync-task-update.server";
import { invalidateGitHubCacheForPullRequest } from "~/lib/git/github/cache-invalidation";
import { v7 as uuid } from "uuid";
import { pickRicherReviewComment } from "~/lib/git/review-comment-annotation";
import { applyReviewThreadMetadata } from "~/lib/git/review-thread";
import type { requireSessionFromRequest } from "~/lib/session";

function mergeReviewCommentsById(
  ...lists: GitReviewComment[][]
): GitReviewComment[] {
  const byId = new Map<number, GitReviewComment>();
  for (const list of lists) {
    for (const comment of list) {
      const existing = byId.get(comment.id);
      byId.set(
        comment.id,
        existing ? pickRicherReviewComment(existing, comment) : comment
      );
    }
  }
  return [...byId.values()];
}

export type TaskGitSummary = {
  hasBranch: boolean;
  hasOpenPr: boolean;
  hasPr: boolean;
  prState?: string;
};

export async function getGitConnectionForSession(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>
) {
  const owner = getOwningIdentity(session);
  const connection = await db.query.gitConnections.findFirst({
    where: and(
      eq(gitConnections.owner, owner),
      eq(gitConnections.provider, "github")
    ),
  });
  const userLink = await db.query.gitUserLinks.findFirst({
    where: and(
      eq(gitUserLinks.userId, session.user.id),
      eq(gitUserLinks.provider, "github")
    ),
  });
  return { connection: connection ?? null, userLink: userLink ?? null };
}

export async function getGitRepositoriesForSession(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>
) {
  const owner = getOwningIdentity(session);
  return db.query.gitRepositories.findMany({
    where: eq(gitRepositories.owner, owner),
    orderBy: (r, { asc }) => [asc(r.fullName)],
  });
}

export async function getGitStatusRulesForSession(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>
) {
  const owner = getOwningIdentity(session);
  return db.query.gitStatusRules.findMany({
    where: eq(gitStatusRules.owner, owner),
    orderBy: (r, { desc: d }) => [d(r.priority)],
  });
}

export async function getProjectGitConfig(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  projectId: string
) {
  const owner = getOwningIdentity(session);
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.owner, owner)),
  });
  if (!project) return null;

  const links = await db.query.projectGitRepositories.findMany({
    where: eq(projectGitRepositories.projectId, projectId),
    with: { repository: true },
  });

  return {
    project,
    repositories: links.map((l) => ({
      ...l,
      repository: l.repository,
    })),
  };
}

export async function getTaskGitContext(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  taskId: string
) {
  const owner = getOwningIdentity(session);

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.owner, owner)),
    with: { project: true },
  });
  if (!task) return null;

  const taskKey = formatTaskKey(task.project.taskKeyPrefix, task.number);

  const branches = await db.query.taskGitBranches.findMany({
    where: and(
      eq(taskGitBranches.taskId, taskId),
      eq(taskGitBranches.owner, owner)
    ),
    with: { repository: true },
  });

  const pullRequests = await db.query.taskGitPullRequests.findMany({
    where: and(
      eq(taskGitPullRequests.taskId, taskId),
      eq(taskGitPullRequests.owner, owner)
    ),
    with: { repository: true, branch: true },
    orderBy: (pr, { desc: d }) => [d(pr.updatedAt)],
  });

  const activity = await db.query.taskGitActivity.findMany({
    where: eq(taskGitActivity.taskId, taskId),
    orderBy: [desc(taskGitActivity.occurredAt)],
    limit: 50,
  });

  const projectRepos = await db.query.projectGitRepositories.findMany({
    where: eq(projectGitRepositories.projectId, task.projectId),
    with: { repository: true },
  });

  return {
    taskKey,
    branches,
    pullRequests,
    activity: activity.map((a) => ({
      ...a,
      payload: JSON.parse(JSON.stringify(a.payload)) as Record<
        string,
        string | number | boolean | null
      >,
    })),
    projectRepos,
  };
}

export async function getTaskPullRequestMeta(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  taskId: string,
  pullRequestId: string
) {
  const owner = getOwningIdentity(session);
  const { repository, connection, pullRequest: pr } = await resolveTaskRepository(
    owner,
    taskId,
    { pullRequestId }
  );
  if (!pr) throw new Error("Pull request not found");

  let title = pr.title;
  let body = pr.body ?? null;
  let state = pr.state;
  let headRef = pr.headRef;
  let baseRef = pr.baseRef;
  let url = pr.url;

  const needsLiveFetch =
    body == null && (pr.state === "open" || pr.state === "draft");

  if (needsLiveFetch) {
    const { getGitProvider } = await import("~/lib/git/factory");
    const provider = getGitProvider(connection.provider);
    const livePr = await provider.getPullRequest(
      connection,
      toGitRepo(repository),
      pr.number
    );

    title = livePr.title;
    body = livePr.body;
    state = livePr.state;
    headRef = livePr.headRef;
    baseRef = livePr.baseRef;
    url = livePr.url;

    await db
      .update(taskGitPullRequests)
      .set({
        title,
        body,
        state,
        headRef,
        baseRef,
        url,
        updatedAt: new Date(),
      })
      .where(eq(taskGitPullRequests.id, pr.id));
  }

  return {
    pullRequest: {
      id: pr.id,
      number: pr.number,
      url,
      title,
      body,
      state,
      headRef,
      baseRef,
    },
  };
}

export async function getTaskPullRequestDiff(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  taskId: string,
  pullRequestId: string
) {
  const owner = getOwningIdentity(session);

  const pr = await db.query.taskGitPullRequests.findFirst({
    where: and(
      eq(taskGitPullRequests.id, pullRequestId),
      eq(taskGitPullRequests.taskId, taskId),
      eq(taskGitPullRequests.owner, owner)
    ),
    with: { repository: { with: { connection: true } } },
  });
  if (!pr?.repository?.connection) {
    throw new Error("Pull request not found");
  }

  const { getGitProvider } = await import("~/lib/git/factory");
  const provider = getGitProvider(pr.repository.connection.provider);
  const repo = toGitRepo(pr.repository);
  const [files, livePr] = await Promise.all([
    provider.getPullRequestDiff(pr.repository.connection, repo, pr.number),
    provider.getPullRequest(pr.repository.connection, repo, pr.number),
  ]);

  return { files, pullRequest: pr, headSha: livePr.headSha };
}

export async function getTaskBranchCommits(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  taskId: string
) {
  const owner = getOwningIdentity(session);
  const ctx = await getTaskGitContext(session, taskId);
  if (!ctx) throw new Error("Task not found");

  const phaseCtx = ctx as TaskDevPhaseContext;
  const branch = getActiveBranch(phaseCtx);
  if (!branch) {
    return { commits: [], baseRef: "main", headRef: "", scope: "branch" as const };
  }

  const { repository, connection } = await resolveTaskRepository(owner, taskId);
  const openPr = getOpenPr(phaseCtx);
  const latestPr = getLatestPr(phaseCtx);
  const pr = openPr ?? latestPr;
  const baseRef = resolveBaseRef(phaseCtx, branch, pr);
  const headRef = branch.ref;

  const { getGitProvider } = await import("~/lib/git/factory");
  const provider = getGitProvider(connection.provider);
  const compare = await provider.compareBranches(
    connection,
    toGitRepo(repository),
    baseRef,
    headRef
  );

  return {
    commits: compare.commits,
    baseRef,
    headRef,
    scope: "branch" as const,
  };
}

export async function getTaskPullRequestCommits(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  taskId: string,
  pullRequestId: string
) {
  const owner = getOwningIdentity(session);
  const { repository, connection, pullRequest: pr } = await resolveTaskRepository(
    owner,
    taskId,
    { pullRequestId }
  );
  if (!pr) throw new Error("Pull request not found");

  const { getGitProvider } = await import("~/lib/git/factory");
  const provider = getGitProvider(connection.provider);
  const commits = await provider.listPullRequestCommits(
    connection,
    toGitRepo(repository),
    pr.number
  );

  return {
    commits,
    baseRef: pr.baseRef,
    headRef: pr.headRef,
    scope: "pull_request" as const,
    pullRequestId: pr.id,
    prNumber: pr.number,
  };
}

export async function getTaskCommitDiff(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  taskId: string,
  sha: string,
  repositoryId?: string
) {
  const owner = getOwningIdentity(session);
  const { repository, connection } = await resolveTaskRepository(
    owner,
    taskId,
    { repositoryId }
  );

  const { getGitProvider } = await import("~/lib/git/factory");
  const provider = getGitProvider(connection.provider);
  const files = await provider.getCommitDiff(
    connection,
    toGitRepo(repository),
    sha
  );

  return { files, sha, scope: "commit" as const };
}

export async function getTaskBranchDiff(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  taskId: string
) {
  const owner = getOwningIdentity(session);
  const ctx = await getTaskGitContext(session, taskId);
  if (!ctx) throw new Error("Task not found");

  const phaseCtx = ctx as TaskDevPhaseContext;
  const branch = getActiveBranch(phaseCtx);
  if (!branch) throw new Error("No branch linked to this task");

  const { repository, connection } = await resolveTaskRepository(owner, taskId);
  const pr = getOpenPr(phaseCtx) ?? getLatestPr(phaseCtx);
  const baseRef = resolveBaseRef(phaseCtx, branch, pr);
  const headRef = branch.ref;

  const { getGitProvider } = await import("~/lib/git/factory");
  const provider = getGitProvider(connection.provider);
  const compare = await provider.compareBranches(
    connection,
    toGitRepo(repository),
    baseRef,
    headRef
  );

  return {
    files: compare.files,
    baseRef,
    headRef,
    scope: "branch" as const,
  };
}

export async function getTaskPullRequestReviewComments(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  taskId: string,
  pullRequestId: string
) {
  const owner = getOwningIdentity(session);
  const { repository, connection, pullRequest: pr } = await resolveTaskRepository(
    owner,
    taskId,
    { pullRequestId }
  );
  if (!pr) throw new Error("Pull request not found");

  const userLink = await db.query.gitUserLinks.findFirst({
    where: and(
      eq(gitUserLinks.userId, session.user.id),
      eq(gitUserLinks.provider, "github")
    ),
  });

  const { getGitProvider } = await import("~/lib/git/factory");
  const provider = getGitProvider(connection.provider);
  const repo = toGitRepo(repository);
  const [installationComments, issueComments, reviews, livePr, reviewThreads] =
    await Promise.all([
      provider.listPullRequestReviewComments(connection, repo, pr.number),
      provider.listPullRequestIssueComments(connection, repo, pr.number),
      provider.listPullRequestReviews(connection, repo, pr.number),
      provider.getPullRequest(connection, repo, pr.number),
      provider.listPullRequestReviewThreads(connection, repo, pr.number),
    ]);

  let pendingReview: Awaited<
    ReturnType<typeof provider.findPendingReviewForUser>
  > = null;
  let viewerComments: GitReviewComment[] = [];
  let userAccessToken: string | null = null;
  if (userLink?.providerLogin) {
    try {
      const { decryptSecret } = await import("~/lib/git/crypto");
      const { pickPendingReviewForViewer } = await import(
        "~/lib/git/pending-review"
      );
      const { Octokit } = await import("@octokit/rest");
      userAccessToken = decryptSecret(userLink.accessToken);
      const { data: authUser } = await new Octokit({
        auth: userAccessToken,
      }).rest.users.getAuthenticated();

      pendingReview =
        pickPendingReviewForViewer(reviews, authUser.login) ??
        (await provider.findPendingReviewForUser(
          connection,
          repo,
          pr.number,
          userLink.providerLogin,
          userAccessToken,
          { retries: 3 }
        ));

      viewerComments = await provider.listPullRequestReviewCommentsAsUser(
        connection,
        repo,
        pr.number,
        userAccessToken
      );
    } catch {
      pendingReview = null;
      viewerComments = [];
      userAccessToken = null;
    }
  }

  const pendingReviewId = pendingReview?.id ?? null;
  let pendingReviewComments: GitReviewComment[] = [];
  let threadComments: GitReviewComment[] = [];
  if (pendingReviewId != null && userAccessToken) {
    try {
      pendingReviewComments =
        await provider.listPullRequestReviewCommentsForReviewAsUser(
          connection,
          repo,
          pr.number,
          pendingReviewId,
          userAccessToken
        );
    } catch {
      pendingReviewComments = [];
    }
    try {
      threadComments =
        await provider.listPullRequestReviewThreadCommentsAsUser(
          connection,
          repo,
          pr.number,
          userAccessToken
        );
    } catch {
      threadComments = [];
    }
  }

  const comments = applyReviewThreadMetadata(
    mergeReviewCommentsById(
      installationComments,
      viewerComments,
      pendingReviewComments,
      threadComments
    ),
    reviewThreads
  );
  const pendingReviewCommentIds = new Set(
    pendingReviewComments.map((c) => c.id)
  );
  const pendingComments =
    pendingReviewId != null
      ? comments.filter(
          (c) =>
            c.reviewId === pendingReviewId ||
            pendingReviewCommentIds.has(c.id)
        )
      : [];
  const pendingIds = new Set(pendingComments.map((c) => c.id));
  const submittedComments = comments.filter((c) => !pendingIds.has(c.id));

  return {
    comments: submittedComments,
    issueComments,
    pendingComments,
    pendingReview,
    reviews: reviews.filter((r) => r.state !== "PENDING"),
    headSha: livePr.headSha,
    pullRequest: {
      id: pr.id,
      number: livePr.number,
      url: livePr.url,
      title: livePr.title,
      body: livePr.body,
      state: livePr.state,
      headRef: livePr.headRef,
      baseRef: livePr.baseRef,
    },
    viewerLogin: userLink?.providerLogin ?? null,
  };
}

export async function requireGitUserAccessToken(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>
) {
  const { token } = await requireGitUserLink(session);
  return token;
}

export async function requireGitUserLink(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>
) {
  const userLink = await db.query.gitUserLinks.findFirst({
    where: and(
      eq(gitUserLinks.userId, session.user.id),
      eq(gitUserLinks.provider, "github")
    ),
  });
  if (!userLink?.providerLogin) {
    throw new Error(
      "Connect your GitHub account in Settings → Integrations to review pull requests."
    );
  }
  const { decryptSecret } = await import("~/lib/git/crypto");
  return {
    token: decryptSecret(userLink.accessToken),
    login: userLink.providerLogin,
  };
}

async function resolvePendingReviewForUser(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  taskId: string,
  pullRequestId: string,
  commitId: string
) {
  const owner = getOwningIdentity(session);
  const { token, login } = await requireGitUserLink(session);
  const { repository, connection, pullRequest: pr } = await resolveTaskRepository(
    owner,
    taskId,
    { pullRequestId }
  );
  if (!pr) throw new Error("Pull request not found");

  const { getGitProvider } = await import("~/lib/git/factory");
  const provider = getGitProvider(connection.provider);
  const repo = toGitRepo(repository);

  let pending = await provider.findPendingReviewForUser(
    connection,
    repo,
    pr.number,
    login,
    token,
    { retries: 3 }
  );
  if (!pending) {
    pending = await provider.startPendingReview(
      connection,
      repo,
      pr.number,
      commitId,
      token,
      login
    );
  }

  return { provider, connection, repo, pr, token, pending };
}

export async function startTaskPullRequestReview(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  taskId: string,
  pullRequestId: string,
  commitId: string
) {
  const owner = getOwningIdentity(session);
  const { token, login } = await requireGitUserLink(session);
  const { repository, connection, pullRequest: pr } = await resolveTaskRepository(
    owner,
    taskId,
    { pullRequestId }
  );
  if (!pr) throw new Error("Pull request not found");

  const { getGitProvider } = await import("~/lib/git/factory");
  const provider = getGitProvider(connection.provider);
  const repo = toGitRepo(repository);

  const existing = await provider.findPendingReviewForUser(
    connection,
    repo,
    pr.number,
    login,
    token,
    { retries: 3 }
  );
  if (existing) return existing;

  return provider.startPendingReview(
    connection,
    repo,
    pr.number,
    commitId,
    token,
    login
  );
}

export async function setTaskPullRequestReviewThreadResolved(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  taskId: string,
  pullRequestId: string,
  input: { threadNodeId: string; resolved: boolean }
) {
  const { token } = await requireGitUserLink(session);
  const owner = getOwningIdentity(session);
  const { repository, connection, pullRequest: pr } = await resolveTaskRepository(
    owner,
    taskId,
    { pullRequestId }
  );
  if (!pr) throw new Error("Pull request not found");

  const { getGitProvider } = await import("~/lib/git/factory");
  const provider = getGitProvider(connection.provider);
  await provider.setReviewThreadResolved(
    input.threadNodeId,
    input.resolved,
    token
  );
}

export async function createTaskPullRequestReviewComment(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  taskId: string,
  pullRequestId: string,
  input: {
    body: string;
    commitId: string;
    path: string;
    line: number;
    side?: "LEFT" | "RIGHT";
    inReplyTo?: number;
    reviewId: number;
  }
) {
  const { isGitHubApiDebugEnabled, logGitHubApi } = await import(
    "~/lib/git/github/api-log"
  );
  if (isGitHubApiDebugEnabled()) {
    logGitHubApi("createTaskPullRequestReviewComment (server)", {
      taskId,
      pullRequestId,
      reviewId: input.reviewId,
      path: input.path,
      line: input.line,
      side: input.side,
      commitId: input.commitId,
    });
  }

  const owner = getOwningIdentity(session);
  const { token } = await requireGitUserLink(session);
  const { repository, connection, pullRequest: pr } = await resolveTaskRepository(
    owner,
    taskId,
    { pullRequestId }
  );
  if (!pr) throw new Error("Pull request not found");

  const { getGitProvider } = await import("~/lib/git/factory");
  const provider = getGitProvider(connection.provider);
  const repo = toGitRepo(repository);

  return provider.createPullRequestReviewComment(
    connection,
    repo,
    pr.number,
    {
      body: input.body,
      commitId: input.commitId,
      path: input.path,
      line: input.line,
      side: input.side,
      inReplyTo: input.inReplyTo,
      reviewId: input.reviewId,
    },
    token
  );
}

export async function submitTaskPullRequestReview(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  taskId: string,
  pullRequestId: string,
  input: {
    body?: string;
    event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES";
    commitId: string;
  }
) {
  const owner = getOwningIdentity(session);
  const { token, login } = await requireGitUserLink(session);
  const { repository, connection, pullRequest: pr } = await resolveTaskRepository(
    owner,
    taskId,
    { pullRequestId }
  );
  if (!pr) throw new Error("Pull request not found");

  const { getGitProvider } = await import("~/lib/git/factory");
  const provider = getGitProvider(connection.provider);
  const repo = toGitRepo(repository);

  const pending = await provider.findPendingReviewForUser(
    connection,
    repo,
    pr.number,
    login,
    token,
    { retries: 3 }
  );

  await provider.submitPullRequestReview(
    connection,
    repo,
    pr.number,
    {
      reviewId: pending?.id,
      commitId: input.commitId,
      body: input.body,
      event: input.event,
    },
    token
  );
}

export async function discardTaskPullRequestReview(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  taskId: string,
  pullRequestId: string
) {
  const owner = getOwningIdentity(session);
  const { token, login } = await requireGitUserLink(session);
  const { repository, connection, pullRequest: pr } = await resolveTaskRepository(
    owner,
    taskId,
    { pullRequestId }
  );
  if (!pr) throw new Error("Pull request not found");

  const { getGitProvider } = await import("~/lib/git/factory");
  const provider = getGitProvider(connection.provider);
  const repo = toGitRepo(repository);

  const pending = await provider.findPendingReviewForUser(
    connection,
    repo,
    pr.number,
    login,
    token,
    { retries: 3 }
  );
  if (!pending) return;

  await provider.discardPendingReview(
    connection,
    repo,
    pr.number,
    pending.id,
    token
  );
}

export async function getTaskPullRequestMergeStatus(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  taskId: string,
  pullRequestId: string
) {
  const owner = getOwningIdentity(session);
  const { repository, connection, pullRequest: pr } = await resolveTaskRepository(
    owner,
    taskId,
    { pullRequestId }
  );
  if (!pr) throw new Error("Pull request not found");

  const { getGitProvider } = await import("~/lib/git/factory");
  const provider = getGitProvider(connection.provider);
  const repo = toGitRepo(repository);

  let userAccessToken: string | undefined;
  try {
    userAccessToken = await requireGitUserAccessToken(session);
  } catch {
    userAccessToken = undefined;
  }

  return provider.getPullRequestMergeStatus(connection, repo, pr.number, {
    userAccessToken,
  });
}

async function persistTaskPullRequestFromGit(
  owner: string,
  taskId: string,
  repositoryId: string,
  branchId: string | null,
  pr: GitPullRequest
) {
  await upsertTaskPullRequest({
    owner,
    taskId,
    repositoryId,
    branchId,
    providerPrId: pr.providerPrId,
    number: pr.number,
    url: pr.url,
    title: pr.title,
    body: pr.body,
    state: pr.state,
    headRef: pr.headRef,
    baseRef: pr.baseRef,
    mergedAt: pr.mergedAt,
    closedAt: pr.closedAt,
  });
}

export async function mergeTaskPullRequest(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  taskId: string,
  pullRequestId: string,
  options?: { mergeMethod?: "merge" | "squash" | "rebase" }
) {
  const owner = getOwningIdentity(session);
  const token = await requireGitUserAccessToken(session);
  const { repository, connection, pullRequest: pr, branch } =
    await resolveTaskRepository(owner, taskId, { pullRequestId });
  if (!pr) throw new Error("Pull request not found");

  const { getGitProvider } = await import("~/lib/git/factory");
  const provider = getGitProvider(connection.provider);
  const repo = toGitRepo(repository);

  const merged = await provider.mergePullRequest(
    connection,
    repo,
    pr.number,
    token,
    options
  );

  await persistTaskPullRequestFromGit(
    owner,
    taskId,
    repository.id,
    branch?.id ?? pr.branchId,
    merged
  );

  await db.insert(taskGitActivity).values({
    id: uuid(),
    taskId,
    owner,
    type: "pull_request",
    payload: {
      number: merged.number,
      state: merged.state,
      url: merged.url,
      title: pr.title,
      action: "merged",
    },
    occurredAt: new Date(),
  });

  await syncTaskGitUpdate(taskId, [
    "task",
    "summaries",
    "pr-status",
    "pr-meta",
    "diff",
  ], { pullRequestId });
  await invalidateGitHubCacheForPullRequest(repository.fullName, pr.number, [
    "task",
    "diff",
    "pr-status",
    "pr-meta",
  ]);
  return merged;
}

export async function closeTaskPullRequest(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  taskId: string,
  pullRequestId: string
) {
  const owner = getOwningIdentity(session);
  const token = await requireGitUserAccessToken(session);
  const { repository, connection, pullRequest: pr, branch } =
    await resolveTaskRepository(owner, taskId, { pullRequestId });
  if (!pr) throw new Error("Pull request not found");

  const { getGitProvider } = await import("~/lib/git/factory");
  const provider = getGitProvider(connection.provider);
  const repo = toGitRepo(repository);

  const closed = await provider.closePullRequest(
    connection,
    repo,
    pr.number,
    token
  );

  await persistTaskPullRequestFromGit(
    owner,
    taskId,
    repository.id,
    branch?.id ?? pr.branchId,
    closed
  );

  await db.insert(taskGitActivity).values({
    id: uuid(),
    taskId,
    owner,
    type: "pull_request",
    payload: {
      number: closed.number,
      state: closed.state,
      url: closed.url,
      title: pr.title,
      action: "closed",
    },
    occurredAt: new Date(),
  });

  await syncTaskGitUpdate(taskId, [
    "task",
    "summaries",
    "pr-status",
    "pr-meta",
    "diff",
  ], { pullRequestId });
  await invalidateGitHubCacheForPullRequest(repository.fullName, pr.number, [
    "task",
    "diff",
    "pr-status",
    "pr-meta",
  ]);
  return closed;
}

export async function getTaskGitSummariesForTasks(
  owner: string,
  taskIds: string[]
): Promise<Record<string, TaskGitSummary>> {
  if (taskIds.length === 0) return {};

  const branches = await db.query.taskGitBranches.findMany({
    where: and(
      eq(taskGitBranches.owner, owner),
      eq(taskGitBranches.state, "active"),
      inArray(taskGitBranches.taskId, taskIds)
    ),
  });
  const prs = await db.query.taskGitPullRequests.findMany({
    where: and(
      eq(taskGitPullRequests.owner, owner),
      inArray(taskGitPullRequests.taskId, taskIds)
    ),
  });

  const result: Record<string, TaskGitSummary> = {};
  for (const taskId of taskIds) {
    const taskBranches = branches.filter((b) => b.taskId === taskId);
    const taskPrs = prs.filter((p) => p.taskId === taskId);
    const openPr = taskPrs.find((p) => p.state === "open" || p.state === "draft");
    result[taskId] = {
      hasBranch: taskBranches.length > 0,
      hasOpenPr: Boolean(openPr),
      hasPr: taskPrs.length > 0,
      prState: openPr?.state ?? taskPrs[0]?.state,
    };
  }
  return result;
}
