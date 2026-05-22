import type { GitConnection } from "~/db/schema";
import type { GitProvider } from "../types";

const NOT_IMPLEMENTED = "GitLab integration is not yet available";

export class GitLabProvider implements GitProvider {
  listAccessibleRepos(_connection: GitConnection) {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  syncRepositories(_connection: GitConnection) {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  createBranch() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  getPullRequest() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  listPullRequestsForRef() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  createPullRequest() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  getPullRequestDiff() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  compareBranches() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  listPullRequestCommits() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  getCommitDiff() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  listPullRequestIssueComments() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  listPullRequestReviewComments() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  listPullRequestReviewCommentsAsUser() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  listPullRequestReviewCommentsForReviewAsUser() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  listPullRequestReviewThreadCommentsAsUser() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  listPullRequestReviewThreads() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  setReviewThreadResolved() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  listPullRequestReviews() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  findPendingReviewForUser() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  startPendingReview() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  createPullRequestReviewComment() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  submitPullRequestReview() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  discardPendingReview() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  getPullRequestMergeStatus() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  mergePullRequest() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  closePullRequest() {
    return Promise.reject(new Error(NOT_IMPLEMENTED));
  }
  parsePullRequestUrl() {
    return null;
  }
}
