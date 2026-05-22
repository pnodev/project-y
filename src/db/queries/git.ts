import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { requireSessionFromRequest } from "~/lib/session";
import { getOwningIdentity } from "~/lib/utils";
import { z } from "zod";

export type { TaskGitSummary } from "~/db/queries/git.server";

export const fetchGitConnection = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await requireSessionFromRequest();
    const { getGitConnectionForSession } = await import(
      "~/db/queries/git.server"
    );
    return getGitConnectionForSession(session);
  }
);

export const fetchGitRepositories = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await requireSessionFromRequest();
    const { getGitRepositoriesForSession } = await import(
      "~/db/queries/git.server"
    );
    return getGitRepositoriesForSession(session);
  }
);

export const fetchGitStatusRules = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await requireSessionFromRequest();
    const { getGitStatusRulesForSession } = await import(
      "~/db/queries/git.server"
    );
    return getGitStatusRulesForSession(session);
  }
);

export const fetchProjectGitConfig = createServerFn({ method: "GET" })
  .inputValidator(z.object({ projectId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { getProjectGitConfig } = await import("~/db/queries/git.server");
    return getProjectGitConfig(session, data.projectId);
  });

export const fetchTaskGitContext = createServerFn({ method: "GET" })
  .inputValidator(z.object({ taskId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { getTaskGitContext } = await import("~/db/queries/git.server");
    return getTaskGitContext(session, data.taskId);
  });

export const fetchTaskPullRequestDiff = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      taskId: z.string().uuid(),
      pullRequestId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { getTaskPullRequestDiff } = await import("~/db/queries/git.server");
    return getTaskPullRequestDiff(session, data.taskId, data.pullRequestId);
  });

export const fetchTaskBranchCommits = createServerFn({ method: "GET" })
  .inputValidator(z.object({ taskId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { getTaskBranchCommits } = await import("~/db/queries/git.server");
    return getTaskBranchCommits(session, data.taskId);
  });

export const fetchTaskPullRequestCommits = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      taskId: z.string().uuid(),
      pullRequestId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { getTaskPullRequestCommits } = await import(
      "~/db/queries/git.server"
    );
    return getTaskPullRequestCommits(
      session,
      data.taskId,
      data.pullRequestId
    );
  });

export const fetchTaskCommitDiff = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      taskId: z.string().uuid(),
      sha: z.string().min(7),
      repositoryId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { getTaskCommitDiff } = await import("~/db/queries/git.server");
    return getTaskCommitDiff(
      session,
      data.taskId,
      data.sha,
      data.repositoryId
    );
  });

export const fetchTaskBranchDiff = createServerFn({ method: "GET" })
  .inputValidator(z.object({ taskId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { getTaskBranchDiff } = await import("~/db/queries/git.server");
    return getTaskBranchDiff(session, data.taskId);
  });

export const fetchTaskPullRequestMergeStatus = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      taskId: z.string().uuid(),
      pullRequestId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { getTaskPullRequestMergeStatus } = await import(
      "~/db/queries/git.server"
    );
    return getTaskPullRequestMergeStatus(
      session,
      data.taskId,
      data.pullRequestId
    );
  });

export const fetchTaskPullRequestReviewComments = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      taskId: z.string().uuid(),
      pullRequestId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const { getTaskPullRequestReviewComments } = await import(
      "~/db/queries/git.server"
    );
    return getTaskPullRequestReviewComments(
      session,
      data.taskId,
      data.pullRequestId
    );
  });

export function gitConnectionQueryOptions() {
  return queryOptions({
    queryKey: ["git", "connection"],
    queryFn: () => fetchGitConnection(),
  });
}

export function gitRepositoriesQueryOptions() {
  return queryOptions({
    queryKey: ["git", "repositories"],
    queryFn: () => fetchGitRepositories(),
  });
}

export function gitStatusRulesQueryOptions() {
  return queryOptions({
    queryKey: ["git", "status-rules"],
    queryFn: () => fetchGitStatusRules(),
  });
}

export function projectGitConfigQueryOptions(projectId: string) {
  return queryOptions({
    queryKey: ["git", "project", projectId],
    queryFn: () => fetchProjectGitConfig({ data: { projectId } }),
  });
}

export function taskGitContextQueryOptions(taskId: string) {
  return queryOptions({
    queryKey: ["git", "task", taskId],
    queryFn: () => fetchTaskGitContext({ data: { taskId } }),
  });
}

export function useGitConnectionQuery() {
  return useQuery(gitConnectionQueryOptions());
}

export function useGitRepositoriesQuery() {
  return useSuspenseQuery(gitRepositoriesQueryOptions());
}

export function useGitStatusRulesQuery() {
  return useSuspenseQuery(gitStatusRulesQueryOptions());
}

export function useProjectGitConfigQuery(projectId: string) {
  return useQuery(projectGitConfigQueryOptions(projectId));
}

export function useTaskGitContextQuery(taskId: string, enabled = true) {
  return useQuery({
    ...taskGitContextQueryOptions(taskId),
    enabled,
  });
}

export function useTaskBranchCommitsQuery(taskId: string, enabled = true) {
  return useQuery({
    queryKey: ["git", "commits", taskId, "branch"],
    queryFn: () => fetchTaskBranchCommits({ data: { taskId } }),
    enabled,
  });
}

export function useTaskPullRequestCommitsQuery(
  taskId: string,
  pullRequestId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: ["git", "commits", taskId, "pr", pullRequestId],
    queryFn: () =>
      fetchTaskPullRequestCommits({
        data: { taskId, pullRequestId: pullRequestId! },
      }),
    enabled: enabled && Boolean(pullRequestId),
  });
}

export function useTaskCommitDiffQuery(
  taskId: string,
  sha: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: ["git", "diff", taskId, "commit", sha],
    queryFn: () => fetchTaskCommitDiff({ data: { taskId, sha: sha! } }),
    enabled: enabled && Boolean(sha),
  });
}

export function useTaskBranchDiffQuery(taskId: string, enabled = true) {
  return useQuery({
    queryKey: ["git", "diff", taskId, "branch"],
    queryFn: () => fetchTaskBranchDiff({ data: { taskId } }),
    enabled,
  });
}

export function useTaskPullRequestReviewCommentsQuery(
  taskId: string,
  pullRequestId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: ["git", "pr-comments", taskId, pullRequestId],
    queryFn: () =>
      fetchTaskPullRequestReviewComments({
        data: { taskId, pullRequestId: pullRequestId! },
      }),
    enabled: enabled && Boolean(pullRequestId),
    placeholderData: (prev) => prev,
  });
}

export function useTaskPullRequestMergeStatusQuery(
  taskId: string,
  pullRequestId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: ["git", "pr-status", taskId, pullRequestId],
    queryFn: () =>
      fetchTaskPullRequestMergeStatus({
        data: { taskId, pullRequestId: pullRequestId! },
      }),
    enabled: enabled && Boolean(pullRequestId),
    refetchInterval: 60_000,
  });
}

export const fetchTaskGitSummaries = createServerFn({ method: "GET" })
  .inputValidator(z.object({ taskIds: z.array(z.string().uuid()) }))
  .handler(async ({ data }) => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);
    const { getTaskGitSummariesForTasks } = await import(
      "~/db/queries/git.server"
    );
    return getTaskGitSummariesForTasks(owner, data.taskIds);
  });
