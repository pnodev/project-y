import type { TaskGitPullRequest } from "~/db/schema";

type ProjectRepoLink = {
  repositoryId: string;
  defaultBaseBranch: string | null;
  repository: { defaultBranch: string };
};

type BranchRow = {
  id: string;
  ref: string;
  sha: string | null;
  state: string;
  repositoryId: string;
  repository: { fullName: string; htmlUrl: string; defaultBranch: string };
};

type PrRow = TaskGitPullRequest & {
  updatedAt: Date | string;
};

export type TaskDevPhase =
  | "no_repo"
  | "not_started"
  | "branch_only"
  | "open_pr"
  | "closed_pr";

export type TaskDevPhaseContext = {
  projectRepos: ProjectRepoLink[];
  branches: BranchRow[];
  pullRequests: PrRow[];
};

export function getActiveBranch(ctx: TaskDevPhaseContext) {
  return ctx.branches.find((b) => b.state === "active") ?? ctx.branches[0];
}

export function getOpenPr(ctx: TaskDevPhaseContext) {
  return ctx.pullRequests.find(
    (p) => p.state === "open" || p.state === "draft"
  );
}

export function getLatestPr(ctx: TaskDevPhaseContext) {
  return ctx.pullRequests[0] ?? null;
}

export function getTaskDevPhase(ctx: TaskDevPhaseContext): TaskDevPhase {
  if (ctx.projectRepos.length === 0) return "no_repo";
  if (getOpenPr(ctx)) return "open_pr";
  if (getActiveBranch(ctx)) return "branch_only";
  if (getLatestPr(ctx)) return "closed_pr";
  return "not_started";
}

export function resolveBaseRef(
  ctx: TaskDevPhaseContext,
  branch: BranchRow | undefined,
  pr: PrRow | null | undefined
): string {
  if (pr?.baseRef) return pr.baseRef;
  if (branch) {
    const link = ctx.projectRepos.find(
      (r) => r.repositoryId === branch.repositoryId
    );
    if (link?.defaultBaseBranch) return link.defaultBaseBranch;
    return branch.repository.defaultBranch;
  }
  if (ctx.projectRepos.length === 1) {
    const link = ctx.projectRepos[0];
    return link?.defaultBaseBranch ?? link?.repository.defaultBranch ?? "main";
  }
  return "main";
}

export function canReviewInline(phase: TaskDevPhase): boolean {
  return phase === "open_pr";
}
