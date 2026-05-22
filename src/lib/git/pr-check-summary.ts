import type { GitPullRequestCheck } from "~/lib/git/types";

export type PrCheckGroup = {
  neutral: GitPullRequestCheck[];
  successful: GitPullRequestCheck[];
  failed: GitPullRequestCheck[];
  inProgress: GitPullRequestCheck[];
};

export function groupPullRequestChecks(
  checks: GitPullRequestCheck[]
): PrCheckGroup {
  const inProgress = checks.filter((c) => c.status !== "completed");
  const completed = checks.filter((c) => c.status === "completed");

  const failed = completed.filter(
    (c) =>
      c.conclusion === "failure" ||
      c.conclusion === "timed_out" ||
      c.conclusion === "action_required"
  );
  const neutral = completed.filter(
    (c) =>
      c.conclusion === "neutral" ||
      c.conclusion === "skipped" ||
      c.conclusion === "cancelled" ||
      c.conclusion === "stale" ||
      c.conclusion === null
  );
  const successful = completed.filter((c) => c.conclusion === "success");

  return { neutral, successful, failed, inProgress };
}

export function checksSummaryLabel(group: PrCheckGroup): {
  headline: string;
  detail: string | null;
  tone: "success" | "failure" | "pending" | "none";
} {
  const total =
    group.neutral.length +
    group.successful.length +
    group.failed.length +
    group.inProgress.length;

  if (total === 0) {
    return {
      headline: "No checks reported",
      detail: null,
      tone: "none",
    };
  }

  if (group.inProgress.length > 0) {
    return {
      headline: "Checks in progress",
      detail: formatCheckCounts(group),
      tone: "pending",
    };
  }

  if (group.failed.length > 0) {
    return {
      headline: "Some checks failed",
      detail: formatCheckCounts(group),
      tone: "failure",
    };
  }

  if (group.successful.length === 0) {
    return {
      headline: "No successful checks",
      detail: formatCheckCounts(group),
      tone: "none",
    };
  }

  return {
    headline: "All checks have passed",
    detail: formatCheckCounts(group),
    tone: "success",
  };
}

function formatCheckCounts(group: PrCheckGroup): string {
  const parts: string[] = [];
  if (group.neutral.length > 0) {
    parts.push(
      `${group.neutral.length} neutral check${group.neutral.length === 1 ? "" : "s"}`
    );
  }
  if (group.successful.length > 0) {
    parts.push(
      `${group.successful.length} successful check${group.successful.length === 1 ? "" : "s"}`
    );
  }
  if (group.failed.length > 0) {
    parts.push(
      `${group.failed.length} failed check${group.failed.length === 1 ? "" : "s"}`
    );
  }
  if (group.inProgress.length > 0) {
    parts.push(
      `${group.inProgress.length} in progress`
    );
  }
  return parts.join(", ");
}

export function canMergePullRequest(params: {
  state: string;
  mergeable: boolean | null;
  mergeableState: string;
  checkGroup: PrCheckGroup;
}): boolean {
  if (params.state !== "open") return false;
  if (params.mergeable !== true) return false;
  if (params.checkGroup.failed.length > 0) return false;
  if (params.checkGroup.inProgress.length > 0) return false;
  const state = params.mergeableState.toLowerCase();
  return state === "clean";
}

export function mergeabilityMessage(params: {
  mergeable: boolean | null;
  mergeableState: string;
}): { ok: boolean; title: string; detail: string } {
  const state = params.mergeableState.toLowerCase();

  if (params.mergeable === true && state === "clean") {
    return {
      ok: true,
      title: "No conflicts with base branch",
      detail: "Merging can be performed automatically.",
    };
  }

  if (state === "dirty" || state === "conflicting") {
    return {
      ok: false,
      title: "Conflicts must be resolved",
      detail: "This branch has merge conflicts with the base branch.",
    };
  }

  if (params.mergeable === false && state === "unknown") {
    return {
      ok: false,
      title: "Conflicts must be resolved",
      detail: "This branch cannot be merged until conflicts with the base branch are fixed.",
    };
  }

  if (state === "behind") {
    return {
      ok: false,
      title: "Branch is out of date",
      detail: "Update the branch before merging.",
    };
  }
  if (state === "blocked") {
    return {
      ok: false,
      title: "Merging is blocked",
      detail: "Required reviews or checks are not satisfied yet.",
    };
  }
  if (state === "unstable") {
    return {
      ok: false,
      title: "Checks must pass before merge",
      detail: "Some required checks are failing or still running.",
    };
  }

  if (params.mergeable === null && state === "unknown") {
    return {
      ok: false,
      title: "Conflicts must be resolved",
      detail:
        "GitHub has not confirmed mergeability yet, but this pull request cannot be merged until you resolve conflicts with the base branch (check the PR on GitHub).",
    };
  }

  return {
    ok: false,
    title: "Merge status unknown",
    detail: "Open the pull request on GitHub for details.",
  };
}
