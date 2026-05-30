import "@tanstack/react-start/server-only";

import { deleteCacheByPrefix } from "~/lib/cache/redis";
import type { GitInvalidateScope } from "~/lib/git/sync-task-update";
import {
  gitHubCompareCacheKey,
  gitHubPullRequestCacheKey,
  gitHubPullRequestCachePrefix,
} from "~/lib/git/github/cache-keys";

export async function invalidateGitHubCacheForPullRequest(
  repoFullName: string,
  prNumber: number,
  scopes: GitInvalidateScope[]
) {
  const hasBroadScope = scopes.some((scope) =>
    ["task", "diff", "commits", "pr-status", "pr-meta"].includes(scope)
  );

  if (hasBroadScope) {
    await deleteCacheByPrefix(
      gitHubPullRequestCachePrefix(repoFullName, prNumber)
    );
    return;
  }

  if (scopes.includes("pr-comments")) {
    await deleteCacheByPrefix(
      gitHubPullRequestCachePrefix(repoFullName, prNumber)
    );
  }
}

export async function invalidateGitHubCacheForCompare(
  repoFullName: string,
  base: string,
  head: string
) {
  const { deleteCacheKeys } = await import("~/lib/cache/redis");
  await deleteCacheKeys([gitHubCompareCacheKey(repoFullName, base, head)]);
}

export async function invalidateGitHubCacheForPullRequestSegment(
  repoFullName: string,
  prNumber: number,
  segment: string
) {
  const { deleteCacheKeys } = await import("~/lib/cache/redis");
  await deleteCacheKeys([
    gitHubPullRequestCacheKey(repoFullName, prNumber, segment),
  ]);
}
