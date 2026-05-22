import type { GitConnection, GitProviderType } from "~/db/schema";

export type GitRepo = {
  externalId: string;
  fullName: string;
  defaultBranch: string;
  htmlUrl: string;
  isArchived: boolean;
};

export type GitBranch = {
  ref: string;
  sha: string;
  htmlUrl: string;
};

export type GitPullRequest = {
  providerPrId: string;
  number: number;
  url: string;
  title: string;
  body: string | null;
  state: "open" | "closed" | "merged" | "draft";
  headRef: string;
  baseRef: string;
  headSha: string;
  mergedAt: Date | null;
  closedAt: Date | null;
};

export type GitCommit = {
  sha: string;
  message: string;
  authorLogin: string | null;
  committedAt: Date;
  htmlUrl: string;
};

export type GitCompareResult = {
  commits: GitCommit[];
  files: GitDiffFile[];
  baseRef: string;
  headRef: string;
};

export type GitReviewComment = {
  id: number;
  body: string;
  path: string;
  line: number | null;
  originalLine: number | null;
  side: "LEFT" | "RIGHT" | null;
  commitId: string;
  authorLogin: string;
  authorAvatarUrl: string | null;
  authorHtmlUrl: string | null;
  createdAt: Date;
  inReplyToId: number | null;
  reviewId: number | null;
  url: string;
  /** GraphQL node id of the review thread (for resolve / unresolve). */
  threadNodeId?: string;
  threadIsResolved?: boolean;
};

export type GitReviewThread = {
  nodeId: string;
  isResolved: boolean;
  path: string;
  line: number | null;
  originalLine: number | null;
  side: "LEFT" | "RIGHT" | null;
  commentIds: number[];
};

/** General PR conversation comment (timeline), not tied to a diff line. */
export type GitPullRequestIssueComment = {
  id: number;
  body: string;
  authorLogin: string;
  authorAvatarUrl: string | null;
  authorHtmlUrl: string | null;
  isBot: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  url: string;
};

export type GitCheckConclusion =
  | "success"
  | "failure"
  | "neutral"
  | "cancelled"
  | "skipped"
  | "timed_out"
  | "action_required"
  | "stale"
  | null;

export type GitCheckStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "waiting"
  | "pending"
  | "requested";

export type GitPullRequestCheck = {
  id: string;
  name: string;
  status: GitCheckStatus;
  conclusion: GitCheckConclusion;
  htmlUrl: string;
  description: string | null;
  source: "check_run" | "status";
  /** GitHub App slug when from a check run. */
  appSlug: string | null;
  /** App or status creator avatar from GitHub. */
  avatarUrl: string | null;
};

export type GitPullRequestMergeStatus = {
  state: GitPullRequest["state"];
  mergeable: boolean | null;
  mergeableState: string;
  checks: GitPullRequestCheck[];
};

export type GitPullRequestReview = {
  id: number;
  body: string | null;
  state: "COMMENTED" | "APPROVED" | "CHANGES_REQUESTED" | "DISMISSED" | "PENDING";
  commitId: string | null;
  authorLogin: string;
  authorAvatarUrl: string | null;
  authorHtmlUrl: string | null;
  submittedAt: Date | null;
  url: string | null;
};

export type CreateReviewCommentInput = {
  body: string;
  commitId: string;
  path: string;
  line: number;
  side?: "LEFT" | "RIGHT";
  inReplyTo?: number;
  reviewId: number;
};

export type SubmitPullRequestReviewInput = {
  reviewId?: number;
  commitId: string;
  body?: string;
  event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES";
};

export type GitDiffFile = {
  path: string;
  oldPath?: string;
  status: "added" | "removed" | "modified" | "renamed";
  patch?: string;
  oldContent?: string;
  newContent?: string;
};

export type GitWebhookEvent = {
  provider: GitProviderType;
  eventType: string;
  deliveryId: string;
  payload: unknown;
};

export interface GitProvider {
  listAccessibleRepos(connection: GitConnection): Promise<GitRepo[]>;
  syncRepositories(connection: GitConnection): Promise<GitRepo[]>;
  createBranch(
    connection: GitConnection,
    repo: GitRepo,
    options: { base: string; name: string; userAccessToken?: string }
  ): Promise<GitBranch>;
  getPullRequest(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number
  ): Promise<GitPullRequest>;
  listPullRequestsForRef(
    connection: GitConnection,
    repo: GitRepo,
    headRef: string
  ): Promise<GitPullRequest[]>;
  createPullRequest(
    connection: GitConnection,
    repo: GitRepo,
    options: {
      title: string;
      body: string;
      head: string;
      base: string;
      userAccessToken?: string;
    }
  ): Promise<GitPullRequest>;
  getPullRequestDiff(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number
  ): Promise<GitDiffFile[]>;
  compareBranches(
    connection: GitConnection,
    repo: GitRepo,
    base: string,
    head: string
  ): Promise<GitCompareResult>;
  listPullRequestCommits(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number
  ): Promise<GitCommit[]>;
  getCommitDiff(
    connection: GitConnection,
    repo: GitRepo,
    sha: string
  ): Promise<GitDiffFile[]>;
  listPullRequestIssueComments(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number
  ): Promise<GitPullRequestIssueComment[]>;
  listPullRequestReviewComments(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number
  ): Promise<GitReviewComment[]>;
  /** Includes pending review comments visible only to the author until submit. */
  listPullRequestReviewCommentsAsUser(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    userAccessToken: string
  ): Promise<GitReviewComment[]>;
  listPullRequestReviewCommentsForReviewAsUser(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    reviewId: number,
    userAccessToken: string
  ): Promise<GitReviewComment[]>;
  /** Line-accurate thread comments (GraphQL); best source for pending review placement. */
  listPullRequestReviewThreadCommentsAsUser(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    userAccessToken: string
  ): Promise<GitReviewComment[]>;
  listPullRequestReviewThreads(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number
  ): Promise<GitReviewThread[]>;
  setReviewThreadResolved(
    threadNodeId: string,
    resolved: boolean,
    userAccessToken: string
  ): Promise<void>;
  listPullRequestReviews(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number
  ): Promise<GitPullRequestReview[]>;
  findPendingReviewForUser(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    authorLogin: string,
    userAccessToken: string,
    options?: { retries?: number }
  ): Promise<GitPullRequestReview | null>;
  startPendingReview(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    commitId: string,
    userAccessToken: string,
    authorLogin: string
  ): Promise<GitPullRequestReview>;
  createPullRequestReviewComment(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    input: CreateReviewCommentInput,
    userAccessToken: string
  ): Promise<GitReviewComment>;
  submitPullRequestReview(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    input: SubmitPullRequestReviewInput,
    userAccessToken: string
  ): Promise<void>;
  discardPendingReview(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    reviewId: number,
    userAccessToken: string
  ): Promise<void>;
  getPullRequestMergeStatus(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    options?: { userAccessToken?: string }
  ): Promise<GitPullRequestMergeStatus>;
  mergePullRequest(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    userAccessToken: string,
    options?: { mergeMethod?: "merge" | "squash" | "rebase" }
  ): Promise<GitPullRequest>;
  closePullRequest(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    userAccessToken: string
  ): Promise<GitPullRequest>;
  parsePullRequestUrl(url: string): {
    owner: string;
    repo: string;
    number: number;
  } | null;
}
