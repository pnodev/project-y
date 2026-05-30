export function encodeRepoFullName(fullName: string): string {
  return fullName.replaceAll("/", ":");
}

export function gitHubPullRequestCachePrefix(
  repoFullName: string,
  prNumber: number
): string {
  return `gh:github:${encodeRepoFullName(repoFullName)}:pr:${prNumber}:`;
}

export function gitHubPullRequestCacheKey(
  repoFullName: string,
  prNumber: number,
  segment: string
): string {
  return `${gitHubPullRequestCachePrefix(repoFullName, prNumber)}${segment}`;
}

export function gitHubCompareCacheKey(
  repoFullName: string,
  base: string,
  head: string
): string {
  return `gh:github:${encodeRepoFullName(repoFullName)}:compare:${base}:${head}`;
}

export function gitHubCommitDiffCacheKey(
  repoFullName: string,
  sha: string
): string {
  return `gh:github:${encodeRepoFullName(repoFullName)}:commit:${sha}:diff`;
}

export const GITHUB_CACHE_TTL = {
  meta: 5 * 60,
  diff: 5 * 60,
  compare: 5 * 60,
  commits: 5 * 60,
  commitDiff: 5 * 60,
  reviewComments: 60,
  issueComments: 60,
  reviews: 60,
  threads: 60,
  mergeStatus: 30,
} as const;
