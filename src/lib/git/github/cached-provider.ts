import type { GitConnection } from "~/db/schema";
import { withCache } from "~/lib/cache/redis";
import type { GitProvider } from "~/lib/git/types";
import {
  GITHUB_CACHE_TTL,
  gitHubCommitDiffCacheKey,
  gitHubCompareCacheKey,
  gitHubPullRequestCacheKey,
} from "~/lib/git/github/cache-keys";

export class CachedGitHubProvider implements GitProvider {
  constructor(private readonly inner: GitProvider) {}

  listAccessibleRepos(...args: Parameters<GitProvider["listAccessibleRepos"]>) {
    return this.inner.listAccessibleRepos(...args);
  }

  syncRepositories(...args: Parameters<GitProvider["syncRepositories"]>) {
    return this.inner.syncRepositories(...args);
  }

  createBranch(...args: Parameters<GitProvider["createBranch"]>) {
    return this.inner.createBranch(...args);
  }

  getPullRequest(
    connection: GitConnection,
    repo: Parameters<GitProvider["getPullRequest"]>[1],
    prNumber: number
  ) {
    return withCache(
      gitHubPullRequestCacheKey(repo.fullName, prNumber, "meta"),
      GITHUB_CACHE_TTL.meta,
      () => this.inner.getPullRequest(connection, repo, prNumber)
    );
  }

  listPullRequestsForRef(
    connection: GitConnection,
    repo: Parameters<GitProvider["listPullRequestsForRef"]>[1],
    headRef: string
  ) {
    return this.inner.listPullRequestsForRef(connection, repo, headRef);
  }

  createPullRequest(
    connection: GitConnection,
    repo: Parameters<GitProvider["createPullRequest"]>[1],
    options: Parameters<GitProvider["createPullRequest"]>[2]
  ) {
    return this.inner.createPullRequest(connection, repo, options);
  }

  getPullRequestDiff(
    connection: GitConnection,
    repo: Parameters<GitProvider["getPullRequestDiff"]>[1],
    prNumber: number
  ) {
    return withCache(
      gitHubPullRequestCacheKey(repo.fullName, prNumber, "diff"),
      GITHUB_CACHE_TTL.diff,
      () => this.inner.getPullRequestDiff(connection, repo, prNumber)
    );
  }

  compareBranches(
    connection: GitConnection,
    repo: Parameters<GitProvider["compareBranches"]>[1],
    base: string,
    head: string
  ) {
    return withCache(
      gitHubCompareCacheKey(repo.fullName, base, head),
      GITHUB_CACHE_TTL.compare,
      () => this.inner.compareBranches(connection, repo, base, head)
    );
  }

  listPullRequestCommits(
    connection: GitConnection,
    repo: Parameters<GitProvider["listPullRequestCommits"]>[1],
    prNumber: number
  ) {
    return withCache(
      gitHubPullRequestCacheKey(repo.fullName, prNumber, "commits"),
      GITHUB_CACHE_TTL.commits,
      () => this.inner.listPullRequestCommits(connection, repo, prNumber)
    );
  }

  getCommitDiff(
    connection: GitConnection,
    repo: Parameters<GitProvider["getCommitDiff"]>[1],
    sha: string
  ) {
    return withCache(
      gitHubCommitDiffCacheKey(repo.fullName, sha),
      GITHUB_CACHE_TTL.commitDiff,
      () => this.inner.getCommitDiff(connection, repo, sha)
    );
  }

  listPullRequestIssueComments(
    connection: GitConnection,
    repo: Parameters<GitProvider["listPullRequestIssueComments"]>[1],
    prNumber: number
  ) {
    return withCache(
      gitHubPullRequestCacheKey(repo.fullName, prNumber, "issue-comments"),
      GITHUB_CACHE_TTL.issueComments,
      () => this.inner.listPullRequestIssueComments(connection, repo, prNumber)
    );
  }

  listPullRequestReviewComments(
    connection: GitConnection,
    repo: Parameters<GitProvider["listPullRequestReviewComments"]>[1],
    prNumber: number
  ) {
    return withCache(
      gitHubPullRequestCacheKey(repo.fullName, prNumber, "review-comments"),
      GITHUB_CACHE_TTL.reviewComments,
      () => this.inner.listPullRequestReviewComments(connection, repo, prNumber)
    );
  }

  listPullRequestReviewCommentsAsUser(
    connection: GitConnection,
    repo: Parameters<GitProvider["listPullRequestReviewCommentsAsUser"]>[1],
    prNumber: number,
    userAccessToken: string
  ) {
    return this.inner.listPullRequestReviewCommentsAsUser(
      connection,
      repo,
      prNumber,
      userAccessToken
    );
  }

  listPullRequestReviewCommentsForReviewAsUser(
    connection: GitConnection,
    repo: Parameters<
      GitProvider["listPullRequestReviewCommentsForReviewAsUser"]
    >[1],
    prNumber: number,
    reviewId: number,
    userAccessToken: string
  ) {
    return this.inner.listPullRequestReviewCommentsForReviewAsUser(
      connection,
      repo,
      prNumber,
      reviewId,
      userAccessToken
    );
  }

  listPullRequestReviewThreadCommentsAsUser(
    connection: GitConnection,
    repo: Parameters<
      GitProvider["listPullRequestReviewThreadCommentsAsUser"]
    >[1],
    prNumber: number,
    userAccessToken: string
  ) {
    return this.inner.listPullRequestReviewThreadCommentsAsUser(
      connection,
      repo,
      prNumber,
      userAccessToken
    );
  }

  listPullRequestReviewThreads(
    connection: GitConnection,
    repo: Parameters<GitProvider["listPullRequestReviewThreads"]>[1],
    prNumber: number
  ) {
    return withCache(
      gitHubPullRequestCacheKey(repo.fullName, prNumber, "threads"),
      GITHUB_CACHE_TTL.threads,
      () => this.inner.listPullRequestReviewThreads(connection, repo, prNumber)
    );
  }

  setReviewThreadResolved(
    threadNodeId: string,
    resolved: boolean,
    userAccessToken: string
  ) {
    return this.inner.setReviewThreadResolved(
      threadNodeId,
      resolved,
      userAccessToken
    );
  }

  listPullRequestReviews(
    connection: GitConnection,
    repo: Parameters<GitProvider["listPullRequestReviews"]>[1],
    prNumber: number
  ) {
    return withCache(
      gitHubPullRequestCacheKey(repo.fullName, prNumber, "reviews"),
      GITHUB_CACHE_TTL.reviews,
      () => this.inner.listPullRequestReviews(connection, repo, prNumber)
    );
  }

  findPendingReviewForUser(
    connection: GitConnection,
    repo: Parameters<GitProvider["findPendingReviewForUser"]>[1],
    prNumber: number,
    authorLogin: string,
    userAccessToken: string,
    options?: { retries?: number }
  ) {
    return this.inner.findPendingReviewForUser(
      connection,
      repo,
      prNumber,
      authorLogin,
      userAccessToken,
      options
    );
  }

  startPendingReview(
    connection: GitConnection,
    repo: Parameters<GitProvider["startPendingReview"]>[1],
    prNumber: number,
    commitId: string,
    userAccessToken: string,
    authorLogin: string
  ) {
    return this.inner.startPendingReview(
      connection,
      repo,
      prNumber,
      commitId,
      userAccessToken,
      authorLogin
    );
  }

  createPullRequestReviewComment(
    connection: GitConnection,
    repo: Parameters<GitProvider["createPullRequestReviewComment"]>[1],
    prNumber: number,
    input: Parameters<GitProvider["createPullRequestReviewComment"]>[3],
    userAccessToken: string
  ) {
    return this.inner.createPullRequestReviewComment(
      connection,
      repo,
      prNumber,
      input,
      userAccessToken
    );
  }

  submitPullRequestReview(
    connection: GitConnection,
    repo: Parameters<GitProvider["submitPullRequestReview"]>[1],
    prNumber: number,
    input: Parameters<GitProvider["submitPullRequestReview"]>[3],
    userAccessToken: string
  ) {
    return this.inner.submitPullRequestReview(
      connection,
      repo,
      prNumber,
      input,
      userAccessToken
    );
  }

  discardPendingReview(
    connection: GitConnection,
    repo: Parameters<GitProvider["discardPendingReview"]>[1],
    prNumber: number,
    reviewId: number,
    userAccessToken: string
  ) {
    return this.inner.discardPendingReview(
      connection,
      repo,
      prNumber,
      reviewId,
      userAccessToken
    );
  }

  getPullRequestMergeStatus(
    connection: GitConnection,
    repo: Parameters<GitProvider["getPullRequestMergeStatus"]>[1],
    prNumber: number,
    options?: { userAccessToken?: string }
  ) {
    return withCache(
      gitHubPullRequestCacheKey(repo.fullName, prNumber, "merge-status"),
      GITHUB_CACHE_TTL.mergeStatus,
      () =>
        this.inner.getPullRequestMergeStatus(connection, repo, prNumber, options)
    );
  }

  mergePullRequest(
    connection: GitConnection,
    repo: Parameters<GitProvider["mergePullRequest"]>[1],
    prNumber: number,
    userAccessToken: string,
    options?: { mergeMethod?: "merge" | "squash" | "rebase" }
  ) {
    return this.inner.mergePullRequest(
      connection,
      repo,
      prNumber,
      userAccessToken,
      options
    );
  }

  closePullRequest(
    connection: GitConnection,
    repo: Parameters<GitProvider["closePullRequest"]>[1],
    prNumber: number,
    userAccessToken: string
  ) {
    return this.inner.closePullRequest(
      connection,
      repo,
      prNumber,
      userAccessToken
    );
  }

  parsePullRequestUrl(url: string) {
    return this.inner.parsePullRequestUrl(url);
  }
}
