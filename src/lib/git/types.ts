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
  parsePullRequestUrl(url: string): {
    owner: string;
    repo: string;
    number: number;
  } | null;
}
