import "@tanstack/react-start/server-only";

import { Octokit } from "@octokit/rest";
import type { GitConnection } from "~/db/schema";
import type {
  CreateReviewCommentInput,
  GitBranch,
  GitCommit,
  GitCompareResult,
  GitDiffFile,
  GitProvider,
  GitPullRequest,
  GitRepo,
  GitPullRequestCheck,
  GitPullRequestIssueComment,
  GitPullRequestMergeStatus,
  GitPullRequestReview,
  GitReviewComment,
  GitReviewThread,
  SubmitPullRequestReviewInput,
} from "../types";
import {
  getInstallationOctokit,
  listInstallationRepositories,
  type InstallationOctokit,
} from "./installation-octokit";
import { computeDiffPosition } from "../diff-position";
import { formatGitHubApiError, isDuplicatePendingReviewError } from "../errors";
import {
  isPendingReviewState,
  pickPendingReviewForViewer,
} from "../pending-review";
import { sleep } from "../retry";
import { logGitHubApi, logGitHubApiGraphql, logGitHubApiRest } from "./api-log";
import { postPullRequestReviewComment } from "./post-review-comment";

function mapPrState(
  state: string,
  merged: boolean,
  draft: boolean
): GitPullRequest["state"] {
  if (merged) return "merged";
  if (draft) return "draft";
  if (state === "open") return "open";
  return "closed";
}

const NO_COMMITS_USER_MESSAGE =
  /push at least one commit to the branch before opening a pull request/i;

function parseRepoFullName(fullName: string) {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) throw new Error(`Invalid repository name: ${fullName}`);
  return { owner, repo };
}

export class GitHubProvider implements GitProvider {
  private async getInstallationClient(
    connection: GitConnection
  ): Promise<InstallationOctokit> {
    if (!connection.installationId) {
      throw new Error("GitHub connection has no installation ID");
    }
    return getInstallationOctokit(Number(connection.installationId));
  }

  async listAccessibleRepos(connection: GitConnection): Promise<GitRepo[]> {
    const octokit = await this.getInstallationClient(connection);
    const repos = await listInstallationRepositories(octokit);
    return repos.map((r) => ({
      externalId: String(r.id),
      fullName: r.full_name ?? `${r.owner?.login}/${r.name}`,
      defaultBranch: r.default_branch ?? "main",
      htmlUrl: r.html_url ?? "",
      isArchived: r.archived ?? false,
    }));
  }

  async syncRepositories(connection: GitConnection): Promise<GitRepo[]> {
    return this.listAccessibleRepos(connection);
  }

  async createBranch(
    connection: GitConnection,
    repo: GitRepo,
    options: { base: string; name: string; userAccessToken?: string }
  ): Promise<GitBranch> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);

    if (options.userAccessToken) {
      const octokit = new Octokit({ auth: options.userAccessToken });
      const refResponse = await octokit.rest.git.getRef({
        owner,
        repo: repoName,
        ref: `heads/${options.base}`,
      });
      const baseSha = refResponse.data.object.sha;

      try {
        await octokit.rest.git.createRef({
          owner,
          repo: repoName,
          ref: `refs/heads/${options.name}`,
          sha: baseSha,
        });
      } catch (error: unknown) {
        const err = error as { status?: number };
        if (err.status !== 422) throw error;
      }

      const branchRef = await octokit.rest.git.getRef({
        owner,
        repo: repoName,
        ref: `heads/${options.name}`,
      });

      return {
        ref: options.name,
        sha: branchRef.data.object.sha,
        htmlUrl: `${repo.htmlUrl}/tree/${options.name}`,
      };
    }

    const octokit = await this.getInstallationClient(connection);
    const { data: refData } = await octokit.request(
      "GET /repos/{owner}/{repo}/git/ref/{ref}",
      {
        owner,
        repo: repoName,
        ref: `heads/${options.base}`,
      }
    );
    const baseSha = refData.object.sha;

    try {
      await octokit.request("POST /repos/{owner}/{repo}/git/refs", {
        owner,
        repo: repoName,
        ref: `refs/heads/${options.name}`,
        sha: baseSha,
      });
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status !== 422) throw error;
    }

    const { data: branchRef } = await octokit.request(
      "GET /repos/{owner}/{repo}/git/ref/{ref}",
      {
        owner,
        repo: repoName,
        ref: `heads/${options.name}`,
      }
    );

    return {
      ref: options.name,
      sha: branchRef.object.sha,
      htmlUrl: `${repo.htmlUrl}/tree/${options.name}`,
    };
  }

  async getPullRequest(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number
  ): Promise<GitPullRequest> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = await this.getInstallationClient(connection);
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}",
      {
        owner,
        repo: repoName,
        pull_number: prNumber,
      }
    );
    return this.mapPullRequest(data);
  }

  async getPullRequestMergeStatus(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    options?: { userAccessToken?: string }
  ): Promise<GitPullRequestMergeStatus> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = await this.getInstallationClient(connection);
    const { mergeable, mergeableState, pr } =
      await this.resolvePullRequestMergeability(
        octokit,
        owner,
        repoName,
        prNumber,
        options?.userAccessToken
      );

    const checks: GitPullRequestCheck[] = [];
    const seenNames = new Set<string>();

    const { data: checkRuns } = await octokit.request(
      "GET /repos/{owner}/{repo}/commits/{ref}/check-runs",
      {
        owner,
        repo: repoName,
        ref: pr.head.sha,
        per_page: 100,
      }
    );

    for (const run of checkRuns.check_runs ?? []) {
      const name = run.name ?? "Check";
      seenNames.add(name);
      checks.push({
        id: `run-${run.id}`,
        name,
        status: this.mapCheckRunStatus(run.status),
        conclusion: this.mapCheckRunConclusion(run.conclusion),
        htmlUrl: run.html_url ?? pr.html_url,
        description: run.output?.summary ?? run.output?.title ?? null,
        source: "check_run",
        appSlug: run.app?.slug ?? null,
        avatarUrl: run.app?.owner?.avatar_url ?? null,
      });
    }

    try {
      const { data: combined } = await octokit.request(
        "GET /repos/{owner}/{repo}/commits/{ref}/status",
        {
          owner,
          repo: repoName,
          ref: pr.head.sha,
          per_page: 100,
        }
      );
      for (const status of combined.statuses ?? []) {
        const name = status.context ?? "Status";
        if (seenNames.has(name)) continue;
        seenNames.add(name);
        checks.push({
          id: `status-${status.id}`,
          name,
          status:
            status.state === "pending"
              ? "in_progress"
              : "completed",
          conclusion: this.mapLegacyStatusState(status.state),
          htmlUrl: status.target_url ?? pr.html_url,
          description: status.description ?? null,
          source: "status",
          appSlug: null,
          avatarUrl: status.avatar_url ?? null,
        });
      }
    } catch {
      // Legacy statuses are optional when check runs cover CI.
    }

    return {
      state: mapPrState(
        pr.state,
        Boolean(pr.merged_at),
        pr.draft ?? false
      ),
      mergeable,
      mergeableState,
      checks,
    };
  }

  /** REST `mergeable` is often null; GraphQL by PR `node_id` avoids repo name casing issues. */
  private async resolvePullRequestMergeability(
    installationOctokit: InstallationOctokit,
    owner: string,
    repo: string,
    prNumber: number,
    userAccessToken?: string
  ): Promise<{
    mergeable: boolean | null;
    mergeableState: string;
    pr: {
      head: { sha: string };
      html_url: string;
      state: string;
      merged_at: string | null;
      draft?: boolean;
    };
  }> {
    const fetchRestPull = () =>
      installationOctokit.request(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}",
        { owner, repo, pull_number: prNumber }
      );

    const { data: initialPr } = await fetchRestPull();
    let pr = initialPr;

    const repoOwner =
      pr.base?.repo?.owner?.login ?? pr.head?.repo?.owner?.login ?? owner;
    const repoName = pr.base?.repo?.name ?? pr.head?.repo?.name ?? repo;
    const nodeId = pr.node_id;

    const userOctokit = userAccessToken
      ? new Octokit({ auth: userAccessToken })
      : null;

    const graphqlFromUser = userOctokit
      ? await this.fetchPullRequestMergeGraphql(userOctokit, {
          nodeId,
          owner: repoOwner,
          repo: repoName,
          prNumber,
        })
      : null;
    const graphqlFromInstall = await this.fetchPullRequestMergeGraphql(
      installationOctokit,
      { nodeId, owner: repoOwner, repo: repoName, prNumber }
    );

    const graphql = graphqlFromUser ?? graphqlFromInstall;

    if (graphql) {
      const fromGraphql = this.resolveMergeabilityFromGraphql(graphql);
      if (fromGraphql) {
        return { ...fromGraphql, pr };
      }
    }

    let mergeable = pr.mergeable;
    let mergeableState = pr.mergeable_state ?? "unknown";

    const restResolved = this.resolveMergeabilityFromRest(mergeable, mergeableState);
    if (restResolved) {
      return { ...restResolved, pr };
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      await sleep(500 * attempt);
      const { data } = await fetchRestPull();
      pr = data;
      mergeable = data.mergeable;
      mergeableState = data.mergeable_state ?? "unknown";
      const resolved = this.resolveMergeabilityFromRest(mergeable, mergeableState);
      if (resolved) {
        return { ...resolved, pr };
      }
    }

    if (graphql) {
      const inferred = this.inferMergeabilityFromGraphqlHints(graphql);
      if (inferred) {
        return { ...inferred, pr };
      }
    }

    return {
      mergeable,
      mergeableState,
      pr,
    };
  }

  private resolveMergeabilityFromRest(
    mergeable: boolean | null,
    mergeableState: string
  ): { mergeable: boolean | null; mergeableState: string } | null {
    if (mergeable === false) {
      return {
        mergeable: false,
        mergeableState:
          mergeableState === "unknown" ? "dirty" : mergeableState,
      };
    }
    if (mergeable === true && mergeableState !== "unknown") {
      return { mergeable: true, mergeableState };
    }
    if (mergeableState === "dirty") {
      return { mergeable: false, mergeableState: "dirty" };
    }
    return null;
  }

  private async fetchPullRequestMergeGraphql(
    octokit: InstallationOctokit | Octokit,
    params: {
      nodeId?: string;
      owner: string;
      repo: string;
      prNumber: number;
    }
  ): Promise<{
    mergeable: string;
    mergeStateStatus: string;
    hasPotentialMergeCommit: boolean;
    isDraft: boolean;
  } | null> {
    type PullRequestFields = {
      mergeable?: string | null;
      mergeStateStatus?: string | null;
      isDraft?: boolean | null;
      potentialMergeCommit?: { oid?: string | null } | null;
    };

    const mapPull = (pull: PullRequestFields | null | undefined) => {
      if (!pull?.mergeable || !pull.mergeStateStatus) return null;
      return {
        mergeable: pull.mergeable,
        mergeStateStatus: pull.mergeStateStatus,
        hasPotentialMergeCommit: Boolean(pull.potentialMergeCommit?.oid),
        isDraft: pull.isDraft ?? false,
      };
    };

    if (params.nodeId) {
      type NodeQuery = {
        node?: PullRequestFields | null;
      };
      try {
        const result = await octokit.graphql<NodeQuery>(
          `query($id: ID!) {
            node(id: $id) {
              ... on PullRequest {
                mergeable
                mergeStateStatus
                isDraft
                potentialMergeCommit { oid }
              }
            }
          }`,
          { id: params.nodeId }
        );
        const mapped = mapPull(result.node ?? null);
        if (mapped) return mapped;
      } catch (error) {
        logGitHubApiGraphql("pullRequest mergeability (node) failed", {
          query: "node PullRequest mergeable",
          variables: { id: params.nodeId },
          error,
        });
      }
    }

    type RepoQuery = {
      repository?: {
        pullRequest?: PullRequestFields | null;
      } | null;
    };

    try {
      const result = await octokit.graphql<RepoQuery>(
        `query($owner: String!, $repo: String!, $pr: Int!) {
          repository(owner: $owner, name: $repo) {
            pullRequest(number: $pr) {
              mergeable
              mergeStateStatus
              isDraft
              potentialMergeCommit { oid }
            }
          }
        }`,
        {
          owner: params.owner,
          repo: params.repo,
          pr: params.prNumber,
        }
      );
      return mapPull(result.repository?.pullRequest ?? null);
    } catch (error) {
      logGitHubApiGraphql("pullRequest mergeability (repo) failed", {
        query: "repository pullRequest mergeable",
        variables: {
          owner: params.owner,
          repo: params.repo,
          pr: params.prNumber,
        },
        error,
      });
      return null;
    }
  }

  private resolveMergeabilityFromGraphql(graphql: {
    mergeable: string;
    mergeStateStatus: string;
    hasPotentialMergeCommit: boolean;
    isDraft: boolean;
  }): { mergeable: boolean | null; mergeableState: string } | null {
    if (graphql.mergeable === "CONFLICTING") {
      return { mergeable: false, mergeableState: "dirty" };
    }

    switch (graphql.mergeStateStatus) {
      case "DIRTY":
        return { mergeable: false, mergeableState: "dirty" };
      case "BEHIND":
        return { mergeable: false, mergeableState: "behind" };
      case "BLOCKED":
        return { mergeable: false, mergeableState: "blocked" };
      case "UNSTABLE":
        return { mergeable: false, mergeableState: "unstable" };
      case "CLEAN":
      case "HAS_HOOKS":
        return { mergeable: true, mergeableState: "clean" };
      case "DRAFT":
        return { mergeable: false, mergeableState: "blocked" };
    }

    if (graphql.mergeable === "MERGEABLE") {
      return { mergeable: true, mergeableState: "clean" };
    }

    if (
      !graphql.isDraft &&
      !graphql.hasPotentialMergeCommit &&
      graphql.mergeable === "UNKNOWN" &&
      graphql.mergeStateStatus === "UNKNOWN"
    ) {
      return { mergeable: false, mergeableState: "dirty" };
    }

    return null;
  }

  /** When primary GraphQL fields stay UNKNOWN but merge is clearly blocked. */
  private inferMergeabilityFromGraphqlHints(graphql: {
    mergeable: string;
    mergeStateStatus: string;
    hasPotentialMergeCommit: boolean;
    isDraft: boolean;
  }): { mergeable: boolean | null; mergeableState: string } | null {
    if (graphql.isDraft) return null;

    if (
      !graphql.hasPotentialMergeCommit &&
      graphql.mergeable !== "MERGEABLE" &&
      graphql.mergeStateStatus !== "CLEAN" &&
      graphql.mergeStateStatus !== "HAS_HOOKS"
    ) {
      if (graphql.mergeStateStatus === "BEHIND") {
        return { mergeable: false, mergeableState: "behind" };
      }
      if (graphql.mergeStateStatus === "BLOCKED") {
        return { mergeable: false, mergeableState: "blocked" };
      }
      return { mergeable: false, mergeableState: "dirty" };
    }

    return null;
  }

  async mergePullRequest(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    userAccessToken: string,
    options?: { mergeMethod?: "merge" | "squash" | "rebase" }
  ): Promise<GitPullRequest> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = new Octokit({ auth: userAccessToken });
    try {
      await octokit.rest.pulls.merge({
        owner,
        repo: repoName,
        pull_number: prNumber,
        merge_method: options?.mergeMethod ?? "merge",
      });
    } catch (error) {
      throw new Error(formatGitHubApiError(error));
    }
    return this.getPullRequest(connection, repo, prNumber);
  }

  async closePullRequest(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    userAccessToken: string
  ): Promise<GitPullRequest> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = new Octokit({ auth: userAccessToken });
    try {
      const { data } = await octokit.rest.pulls.update({
        owner,
        repo: repoName,
        pull_number: prNumber,
        state: "closed",
      });
      return this.mapPullRequest(data);
    } catch (error) {
      throw new Error(formatGitHubApiError(error));
    }
  }

  async listPullRequestsForRef(
    connection: GitConnection,
    repo: GitRepo,
    headRef: string
  ): Promise<GitPullRequest[]> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = await this.getInstallationClient(connection);
    const { data } = await octokit.request("GET /repos/{owner}/{repo}/pulls", {
      owner,
      repo: repoName,
      head: `${owner}:${headRef}`,
      state: "all",
    });
    return data.map((pr) => this.mapPullRequest(pr));
  }

  async createPullRequest(
    connection: GitConnection,
    repo: GitRepo,
    options: {
      title: string;
      body: string;
      head: string;
      base: string;
      userAccessToken?: string;
    }
  ): Promise<GitPullRequest> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);

    await this.assertBranchHasCommits(
      connection,
      repo,
      options.base,
      options.head,
      options.userAccessToken
    );

    try {
      if (options.userAccessToken) {
        const octokit = new Octokit({ auth: options.userAccessToken });
        const { data } = await octokit.rest.pulls.create({
          owner,
          repo: repoName,
          title: options.title,
          body: options.body,
          head: options.head,
          base: options.base,
        });
        return this.mapPullRequest(data);
      }

      const octokit = await this.getInstallationClient(connection);
      const { data } = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
        owner,
        repo: repoName,
        title: options.title,
        body: options.body,
        head: options.head,
        base: options.base,
      });
      return this.mapPullRequest(data);
    } catch (error) {
      throw new Error(formatGitHubApiError(error));
    }
  }

  private async assertBranchHasCommits(
    connection: GitConnection,
    repo: GitRepo,
    base: string,
    head: string,
    userAccessToken?: string
  ): Promise<void> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const basehead = `${base}...${head}`;

    try {
      if (userAccessToken) {
        const octokit = new Octokit({ auth: userAccessToken });
        const { data } = await octokit.rest.repos.compareCommitsWithBasehead({
          owner,
          repo: repoName,
          basehead,
        });
        if (data.ahead_by < 1) {
          throw new Error(
            "Push at least one commit to the branch before opening a pull request."
          );
        }
        return;
      }

      const octokit = await this.getInstallationClient(connection);
      const { data } = await octokit.request(
        "GET /repos/{owner}/{repo}/compare/{basehead}",
        { owner, repo: repoName, basehead }
      );
      if ((data.ahead_by as number) < 1) {
        throw new Error(
          "Push at least one commit to the branch before opening a pull request."
        );
      }
    } catch (error) {
      if (error instanceof Error && NO_COMMITS_USER_MESSAGE.test(error.message)) {
        throw error;
      }
      // Compare unavailable (permissions, network, etc.) — PR create will validate.
    }
  }

  async getPullRequestDiff(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number
  ): Promise<GitDiffFile[]> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = await this.getInstallationClient(connection);
    const { data: files } = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/files",
      {
        owner,
        repo: repoName,
        pull_number: prNumber,
      }
    );

    return files.map((file: (typeof files)[number]) => this.mapDiffFile(file));
  }

  async compareBranches(
    connection: GitConnection,
    repo: GitRepo,
    base: string,
    head: string
  ): Promise<GitCompareResult> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = await this.getInstallationClient(connection);
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/compare/{basehead}",
      { owner, repo: repoName, basehead: `${base}...${head}` }
    );

    return {
      baseRef: base,
      headRef: head,
      commits: (data.commits ?? []).map((c) => this.mapCommit(c, repo)),
      files: (data.files ?? []).map((f) => this.mapDiffFile(f)),
    };
  }

  async listPullRequestCommits(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number
  ): Promise<GitCommit[]> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = await this.getInstallationClient(connection);
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/commits",
      { owner, repo: repoName, pull_number: prNumber }
    );
    return data.map((c) => this.mapCommit(c, repo));
  }

  async getCommitDiff(
    connection: GitConnection,
    repo: GitRepo,
    sha: string
  ): Promise<GitDiffFile[]> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = await this.getInstallationClient(connection);
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/commits/{commit_sha}",
      { owner, repo: repoName, commit_sha: sha }
    );
    return (data.files ?? []).map((f: (typeof data.files)[number]) =>
      this.mapDiffFile(f)
    );
  }

  async listPullRequestIssueComments(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number
  ): Promise<GitPullRequestIssueComment[]> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = await this.getInstallationClient(connection);
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/issues/{issue_number}/comments",
      { owner, repo: repoName, issue_number: prNumber }
    );
    return data.map((c) => this.mapIssueComment(c));
  }

  async listPullRequestReviewComments(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number
  ): Promise<GitReviewComment[]> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = await this.getInstallationClient(connection);
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/comments",
      { owner, repo: repoName, pull_number: prNumber }
    );
    return data.map((c) => this.mapReviewComment(c));
  }

  async listPullRequestReviewCommentsAsUser(
    _connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    userAccessToken: string
  ): Promise<GitReviewComment[]> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = new Octokit({ auth: userAccessToken });
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/comments",
      { owner, repo: repoName, pull_number: prNumber }
    );
    return data.map((c) => this.mapReviewComment(c));
  }

  async listPullRequestReviewCommentsForReviewAsUser(
    _connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    reviewId: number,
    userAccessToken: string
  ): Promise<GitReviewComment[]> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = new Octokit({ auth: userAccessToken });
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments",
      { owner, repo: repoName, pull_number: prNumber, review_id: reviewId }
    );
    return data.map((c) =>
      this.mapReviewComment({
        ...c,
        pull_request_review_id: c.pull_request_review_id ?? reviewId,
      })
    );
  }

  private async fetchPullRequestReviewThreadsGraphql(
    octokit: Pick<Octokit, "graphql">,
    owner: string,
    repoName: string,
    prNumber: number
  ): Promise<{ threads: GitReviewThread[]; comments: GitReviewComment[] }> {
    type ThreadQuery = {
      repository?: {
        pullRequest?: {
          reviewThreads?: {
            nodes?: Array<{
              id?: string | null;
              isResolved?: boolean | null;
              path?: string | null;
              line?: number | null;
              originalLine?: number | null;
              diffSide?: string | null;
              comments?: {
                nodes?: Array<{
                  databaseId?: number | string | null;
                  body?: string | null;
                  path?: string | null;
                  line?: number | null;
                  originalLine?: number | null;
                  createdAt?: string | null;
                  url?: string | null;
                  commit?: { oid?: string | null } | null;
                  author?: {
                    login?: string | null;
                    avatarUrl?: string | null;
                    url?: string | null;
                  } | null;
                  pullRequestReview?: { databaseId?: number | string | null } | null;
                  replyTo?: { databaseId?: number | string | null } | null;
                } | null> | null;
              } | null;
            } | null> | null;
          } | null;
        } | null;
      } | null;
    };

    const { repository } = await octokit.graphql<ThreadQuery>(
      `query($owner: String!, $name: String!, $number: Int!) {
        repository(owner: $owner, name: $name) {
          pullRequest(number: $number) {
            reviewThreads(first: 100) {
              nodes {
                id
                isResolved
                path
                line
                originalLine
                diffSide
                comments(first: 50) {
                  nodes {
                    databaseId
                    body
                    path
                    line
                    originalLine
                    createdAt
                    url
                    commit { oid }
                    author { login avatarUrl url }
                    pullRequestReview { databaseId }
                    replyTo { databaseId }
                  }
                }
              }
            }
          }
        }
      }`,
      { owner, name: repoName, number: prNumber }
    );

    const threads: GitReviewThread[] = [];
    const comments: GitReviewComment[] = [];
    const nodes = repository?.pullRequest?.reviewThreads?.nodes ?? [];

    for (const thread of nodes) {
      if (!thread?.id) continue;
      const threadSide =
        thread.diffSide === "LEFT" || thread.diffSide === "RIGHT"
          ? thread.diffSide
          : null;
      const commentIds: number[] = [];

      for (const node of thread.comments?.nodes ?? []) {
        const path = node?.path ?? thread.path;
        if (node?.databaseId == null || !path) continue;
        const id = Number(node.databaseId);
        commentIds.push(id);
        const authorLogin = node.author?.login ?? "unknown";
        comments.push({
          id,
          body: node.body ?? "",
          path,
          line: node.line ?? thread.line ?? null,
          originalLine: node.originalLine ?? thread.originalLine ?? null,
          side: threadSide,
          commitId: node.commit?.oid ?? "",
          authorLogin,
          authorAvatarUrl: node.author?.avatarUrl ?? null,
          authorHtmlUrl: node.author?.url ?? `https://github.com/${authorLogin}`,
          createdAt: node.createdAt ? new Date(node.createdAt) : new Date(),
          inReplyToId:
            node.replyTo?.databaseId != null
              ? Number(node.replyTo.databaseId)
              : null,
          reviewId: node.pullRequestReview?.databaseId
            ? Number(node.pullRequestReview.databaseId)
            : null,
          url: node.url ?? "",
          threadNodeId: thread.id,
          threadIsResolved: thread.isResolved ?? false,
        });
      }

      if (commentIds.length > 0) {
        const threadPath =
          thread.path ??
          comments.find((c) => c.id === commentIds[0])?.path ??
          "";
        threads.push({
          nodeId: thread.id,
          isResolved: thread.isResolved ?? false,
          path: threadPath,
          line: thread.line ?? null,
          originalLine: thread.originalLine ?? null,
          side: threadSide,
          commentIds,
        });
      }
    }

    return { threads, comments };
  }

  async listPullRequestReviewThreads(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number
  ): Promise<GitReviewThread[]> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = await this.getInstallationClient(connection);
    const { threads } = await this.fetchPullRequestReviewThreadsGraphql(
      octokit,
      owner,
      repoName,
      prNumber
    );
    return threads;
  }

  async listPullRequestReviewThreadCommentsAsUser(
    _connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    userAccessToken: string
  ): Promise<GitReviewComment[]> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = new Octokit({ auth: userAccessToken });
    const { comments } = await this.fetchPullRequestReviewThreadsGraphql(
      octokit,
      owner,
      repoName,
      prNumber
    );
    return comments;
  }

  async setReviewThreadResolved(
    threadNodeId: string,
    resolved: boolean,
    userAccessToken: string
  ): Promise<void> {
    const octokit = new Octokit({ auth: userAccessToken });
    const mutation = resolved
      ? `mutation($threadId: ID!) {
          resolveReviewThread(input: { threadId: $threadId }) {
            thread { isResolved }
          }
        }`
      : `mutation($threadId: ID!) {
          unresolveReviewThread(input: { threadId: $threadId }) {
            thread { isResolved }
          }
        }`;

    logGitHubApiGraphql(
      resolved ? "resolveReviewThread" : "unresolveReviewThread",
      {
        mutation,
        variables: { threadId: threadNodeId },
      }
    );

    try {
      await octokit.graphql(mutation, { threadId: threadNodeId });
    } catch (error) {
      throw new Error(formatGitHubApiError(error));
    }
  }

  async listPullRequestReviews(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number
  ): Promise<GitPullRequestReview[]> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = await this.getInstallationClient(connection);
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews",
      { owner, repo: repoName, pull_number: prNumber }
    );
    return data.map((r) => this.mapPullRequestReview(r));
  }

  async findPendingReviewForUser(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    authorLogin: string,
    userAccessToken: string,
    options?: { retries?: number }
  ): Promise<GitPullRequestReview | null> {
    const userOctokit = new Octokit({ auth: userAccessToken });
    const { data: authUser } = await userOctokit.rest.users.getAuthenticated();

    const fromInstallation = await this.findPendingReviewViaInstallation(
      connection,
      repo,
      prNumber,
      authUser.login
    );
    if (fromInstallation) return fromInstallation;

    const attempts = Math.max(1, options?.retries ?? 1);
    for (let i = 0; i < attempts; i++) {
      const pending = await this.findPendingReviewForUserOnce(
        connection,
        repo,
        prNumber,
        authorLogin,
        userAccessToken,
        authUser
      );
      if (pending) return pending;
      if (i < attempts - 1) await sleep(400 * (i + 1));
    }

    return this.findPendingReviewViaGraphql(repo, prNumber, userAccessToken);
  }

  /** Installation listing often includes pending reviews the user-token list omits. */
  private async findPendingReviewViaInstallation(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    viewerLogin: string
  ): Promise<GitPullRequestReview | null> {
    const reviews = await this.listPullRequestReviews(connection, repo, prNumber);
    return pickPendingReviewForViewer(reviews, viewerLogin);
  }

  private async findPendingReviewViaGraphql(
    repo: GitRepo,
    prNumber: number,
    userAccessToken: string
  ): Promise<GitPullRequestReview | null> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = new Octokit({ auth: userAccessToken });
    const { data: authUser } = await octokit.rest.users.getAuthenticated();
    const login = authUser.login.toLowerCase();

    type GraphqlResponse = {
      repository?: {
        pullRequest?: {
          reviews?: {
            nodes?: Array<{
              databaseId?: string | null;
              state?: string | null;
              body?: string | null;
              submittedAt?: string | null;
              commit?: { oid?: string | null } | null;
              author?: { login?: string | null } | null;
            } | null> | null;
          } | null;
        } | null;
      } | null;
    };

    try {
      const result = await octokit.graphql<GraphqlResponse>(
        `query($owner: String!, $repo: String!, $pr: Int!) {
          repository(owner: $owner, name: $repo) {
            pullRequest(number: $pr) {
              reviews(last: 20, states: [PENDING]) {
                nodes {
                  databaseId
                  state
                  body
                  submittedAt
                  commit { oid }
                  author { login }
                }
              }
            }
          }
        }`,
        { owner, repo: repoName, pr: prNumber }
      );

      const nodes = result.repository?.pullRequest?.reviews?.nodes ?? [];
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        if (!node) continue;
        const id = node.databaseId ? Number(node.databaseId) : NaN;
        if (!Number.isFinite(id)) continue;
        if (node.author?.login?.toLowerCase() !== login) continue;
        const authorLogin = node.author?.login ?? authUser.login;
        return {
          id,
          body: node.body ?? null,
          state: "PENDING",
          commitId: node.commit?.oid ?? null,
          authorLogin,
          authorAvatarUrl: null,
          authorHtmlUrl: `https://github.com/${authorLogin}`,
          submittedAt: null,
          url: null,
        };
      }
    } catch {
      return null;
    }

    return null;
  }

  private reviewAuthoredBy(
    review: { user?: { id?: number; login?: string | null } | null },
    authUser: { id: number; login: string }
  ): boolean {
    if (review.user?.id != null && review.user.id === authUser.id) return true;
    return (
      review.user?.login?.toLowerCase() === authUser.login.toLowerCase()
    );
  }

  private pickPendingReviewForAuthUser(
    reviews: Array<{
      id: number;
      body?: string | null;
      state: string;
      commit_id?: string | null;
      submitted_at?: string | null;
      user?: { id?: number; login?: string | null } | null;
      html_url?: string | null;
    }>,
    authUser: { id: number; login: string }
  ): GitPullRequestReview | null {
    const mine = reviews.filter((review) => this.reviewAuthoredBy(review, authUser));
    for (let i = mine.length - 1; i >= 0; i--) {
      const review = mine[i];
      if (isPendingReviewState(review)) {
        return this.mapPullRequestReview(review);
      }
    }
    return null;
  }

  private async findPendingReviewForUserOnce(
    _connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    _authorLogin: string,
    userAccessToken: string,
    authUser: { id: number; login: string }
  ): Promise<GitPullRequestReview | null> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = new Octokit({ auth: userAccessToken });

    const reviews = await octokit.paginate(
      octokit.rest.pulls.listReviews,
      {
        owner,
        repo: repoName,
        pull_number: prNumber,
        per_page: 100,
      }
    );

    return this.pickPendingReviewForAuthUser(reviews, authUser);
  }

  async startPendingReview(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    _commitId: string,
    userAccessToken: string,
    authorLogin: string
  ): Promise<GitPullRequestReview> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = new Octokit({ auth: userAccessToken });

    const existing = await this.findPendingReviewForUser(
      connection,
      repo,
      prNumber,
      authorLogin,
      userAccessToken,
      { retries: 3 }
    );
    if (existing) return existing;

    try {
      const { data: pr } = await octokit.rest.pulls.get({
        owner,
        repo: repoName,
        pull_number: prNumber,
      });
      const createPayload = { commit_id: pr.head.sha };
      logGitHubApiRest("POST create pending review", {
        method: "POST",
        url: `https://api.github.com/repos/${owner}/${repoName}/pulls/${prNumber}/reviews`,
        payload: createPayload,
      });
      const { data } = await octokit.rest.pulls.createReview({
        owner,
        repo: repoName,
        pull_number: prNumber,
        commit_id: pr.head.sha,
      });
      logGitHubApi("create pending review ok", { reviewId: data.id, state: data.state });
      return this.mapPullRequestReview(data);
    } catch (error) {
      logGitHubApiRest("POST create pending review failed", {
        method: "POST",
        url: `https://api.github.com/repos/${owner}/${repoName}/pulls/${prNumber}/reviews`,
        payload: { commit_id: "(see prior log)" },
        error,
      });
      if (isDuplicatePendingReviewError(error)) {
        const pending = await this.findPendingReviewForUser(
          connection,
          repo,
          prNumber,
          authorLogin,
          userAccessToken,
          { retries: 8 }
        );
        if (pending) return pending;
      }
      throw new Error(
        isDuplicatePendingReviewError(error)
          ? "Could not resume your in-progress review. Open the pull request on GitHub to submit or discard it, or try Discard review here."
          : formatGitHubApiError(error)
      );
    }
  }

  private async resolveReviewNodeId(
    octokit: Octokit,
    owner: string,
    repoName: string,
    prNumber: number,
    reviewDatabaseId: number
  ): Promise<string | null> {
    type ReviewNodes = {
      repository?: {
        pullRequest?: {
          reviews?: {
            nodes?: Array<{
              id?: string;
              databaseId?: string | number | null;
            } | null> | null;
          } | null;
        } | null;
      } | null;
    };

    const variables = { owner, name: repoName, number: prNumber };
    logGitHubApiGraphql("resolveReviewNodeId query", {
      query: "pendingReviewNodes",
      variables,
    });

    const result = await octokit.graphql<ReviewNodes>(
      `query($owner: String!, $name: String!, $number: Int!) {
        repository(owner: $owner, name: $name) {
          pullRequest(number: $number) {
            reviews(states: [PENDING], last: 20) {
              nodes { id databaseId }
            }
          }
        }
      }`,
      variables
    );

    const nodes = result.repository?.pullRequest?.reviews?.nodes ?? [];
    logGitHubApi("resolveReviewNodeId result", {
      reviewDatabaseId,
      pendingNodes: nodes.map((n) => ({
        id: n?.id,
        databaseId: n?.databaseId,
      })),
    });
    for (const node of nodes) {
      if (!node?.id) continue;
      if (Number(node.databaseId) === reviewDatabaseId) return node.id;
    }
    return null;
  }

  private async createReviewThreadViaGraphql(
    octokit: Octokit,
    owner: string,
    repoName: string,
    prNumber: number,
    input: CreateReviewCommentInput
  ): Promise<GitReviewComment> {
    const reviewNodeId = await this.resolveReviewNodeId(
      octokit,
      owner,
      repoName,
      prNumber,
      input.reviewId
    );
    if (!reviewNodeId) {
      throw new Error(
        "Could not find your pending review on GitHub. Try Discard review, then start again."
      );
    }

    type MutationResult = {
      addPullRequestReviewThread?: {
        thread?: {
          comments?: {
            nodes?: Array<{
              databaseId?: number | string | null;
              body?: string | null;
              path?: string | null;
              line?: number | null;
              originalLine?: number | null;
              url?: string | null;
              createdAt?: string | null;
              author?: {
                login?: string | null;
                avatarUrl?: string | null;
                url?: string | null;
              } | null;
            } | null> | null;
          } | null;
        } | null;
      } | null;
    };

    const mutationInput = {
      pullRequestReviewId: reviewNodeId,
      body: input.body,
      path: input.path,
      line: input.line,
      side: input.side === "LEFT" ? "LEFT" : "RIGHT",
      subjectType: "LINE",
    };

    logGitHubApiGraphql("addPullRequestReviewThread", {
      mutation: "addPullRequestReviewThread",
      variables: {
        input: mutationInput,
        reviewDatabaseId: input.reviewId,
      },
    });

    let result: MutationResult;
    try {
      result = await octokit.graphql<MutationResult>(
        `mutation($input: AddPullRequestReviewThreadInput!) {
          addPullRequestReviewThread(input: $input) {
            thread {
              comments(first: 1) {
                nodes {
                  databaseId
                  body
                  path
                  line
                  originalLine
                  url
                  createdAt
                  author { login avatarUrl url }
                }
              }
            }
          }
        }`,
        { input: mutationInput }
      );
    } catch (error) {
      logGitHubApiGraphql("addPullRequestReviewThread failed", {
        mutation: "addPullRequestReviewThread",
        variables: { input: mutationInput },
        error,
      });
      throw error;
    }

    const comment =
      result.addPullRequestReviewThread?.thread?.comments?.nodes?.[0];
    if (!comment?.databaseId) {
      throw new Error("GitHub did not return the new review comment.");
    }

    const authorLogin = comment.author?.login ?? "unknown";
    return {
      id: Number(comment.databaseId),
      body: comment.body ?? input.body,
      path: comment.path ?? input.path,
      line: comment.line ?? input.line,
      originalLine: comment.originalLine ?? null,
      side: input.side ?? "RIGHT",
      commitId: input.commitId,
      authorLogin,
      authorAvatarUrl: comment.author?.avatarUrl ?? null,
      authorHtmlUrl: comment.author?.url ?? `https://github.com/${authorLogin}`,
      createdAt: comment.createdAt
        ? new Date(comment.createdAt)
        : new Date(),
      inReplyToId: input.inReplyTo ?? null,
      reviewId: input.reviewId,
      url: comment.url ?? "",
    };
  }

  async createPullRequestReviewComment(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    input: CreateReviewCommentInput,
    userAccessToken: string
  ): Promise<GitReviewComment> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = new Octokit({ auth: userAccessToken });
    const side = input.side ?? "RIGHT";

    logGitHubApi("createPullRequestReviewComment", {
      prNumber,
      input: {
        reviewId: input.reviewId,
        path: input.path,
        line: input.line,
        side: input.side,
        commitId: input.commitId,
        bodyLength: input.body.length,
        inReplyTo: input.inReplyTo,
      },
    });

    try {
      const { data: review } = await octokit.rest.pulls.getReview({
        owner,
        repo: repoName,
        pull_number: prNumber,
        review_id: input.reviewId,
      });
      logGitHubApi("getReview before comment", {
        reviewId: input.reviewId,
        state: review.state,
        submitted_at: review.submitted_at,
        commit_id: review.commit_id,
      });
      if (!isPendingReviewState(review)) {
        throw new Error(
          "This review is no longer in progress. Discard and start a new review, or refresh the page."
        );
      }
      const commitId = review.commit_id ?? input.commitId;

      const diffFiles = await this.getPullRequestDiff(
        connection,
        repo,
        prNumber
      );
      const file = diffFiles.find((f) => f.path === input.path);
      const position =
        file?.patch != null
          ? computeDiffPosition(file.patch, input.line, side)
          : null;

      if (input.inReplyTo != null) {
        const data = await postPullRequestReviewComment(
          userAccessToken,
          owner,
          repoName,
          prNumber,
          { body: input.body, in_reply_to: input.inReplyTo }
        );
        return this.mapReviewComment(
          data as Parameters<typeof this.mapReviewComment>[0]
        );
      }

      try {
        return await this.createReviewThreadViaGraphql(
          octokit,
          owner,
          repoName,
          prNumber,
          input
        );
      } catch (graphqlError) {
        logGitHubApi("GraphQL thread failed, trying REST fallback", {
          reviewId: input.reviewId,
          error:
            graphqlError instanceof Error ? graphqlError.message : graphqlError,
        });

        if (isDuplicatePendingReviewError(graphqlError)) {
          throw graphqlError;
        }

        const tryRestComment = async (payload: Record<string, unknown>) => {
          const data = await postPullRequestReviewComment(
            userAccessToken,
            owner,
            repoName,
            prNumber,
            payload
          );
          return this.mapReviewComment(
            data as Parameters<typeof this.mapReviewComment>[0]
          );
        };

        const linePayload = {
          body: input.body,
          commit_id: commitId,
          path: input.path,
          line: input.line,
          side,
        };

        try {
          return await tryRestComment(linePayload);
        } catch (lineError) {
          if (position == null) {
            throw graphqlError instanceof Error ? graphqlError : lineError;
          }
          try {
            return await tryRestComment({
              body: input.body,
              commit_id: commitId,
              path: input.path,
              position,
            });
          } catch (positionError) {
            throw positionError;
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("no longer in progress")) {
        throw error;
      }
      throw new Error(formatGitHubApiError(error));
    }
  }

  async submitPullRequestReview(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    input: SubmitPullRequestReviewInput,
    userAccessToken: string
  ): Promise<void> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = new Octokit({ auth: userAccessToken });
    try {
      if (input.reviewId != null) {
        await octokit.rest.pulls.submitReview({
          owner,
          repo: repoName,
          pull_number: prNumber,
          review_id: input.reviewId,
          event: input.event,
          body: input.body,
        });
        return;
      }
      await octokit.rest.pulls.createReview({
        owner,
        repo: repoName,
        pull_number: prNumber,
        commit_id: input.commitId,
        event: input.event,
        body: input.body,
      });
    } catch (error) {
      throw new Error(formatGitHubApiError(error));
    }
  }

  async discardPendingReview(
    connection: GitConnection,
    repo: GitRepo,
    prNumber: number,
    reviewId: number,
    userAccessToken: string
  ): Promise<void> {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    const octokit = new Octokit({ auth: userAccessToken });
    try {
      await octokit.rest.pulls.deletePendingReview({
        owner,
        repo: repoName,
        pull_number: prNumber,
        review_id: reviewId,
      });
    } catch (error) {
      throw new Error(formatGitHubApiError(error));
    }
  }

  parsePullRequestUrl(url: string) {
    const match = url.match(
      /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i
    );
    if (!match) return null;
    return {
      owner: match[1],
      repo: match[2],
      number: parseInt(match[3], 10),
    };
  }

  private mapCommit(
    data: {
      sha: string;
      commit: {
        message: string;
        author: { date?: string | null; name?: string | null } | null;
      };
      author?: { login?: string | null } | null;
      html_url?: string;
    },
    repo: GitRepo
  ): GitCommit {
    const { owner, repo: repoName } = parseRepoFullName(repo.fullName);
    return {
      sha: data.sha,
      message: data.commit.message.split("\n")[0] ?? data.commit.message,
      authorLogin: data.author?.login ?? data.commit.author?.name ?? null,
      committedAt: new Date(data.commit.author?.date ?? Date.now()),
      htmlUrl:
        data.html_url ??
        `https://github.com/${owner}/${repoName}/commit/${data.sha}`,
    };
  }

  private mapDiffFile(file: {
    filename: string;
    previous_filename?: string | null;
    status: string;
    patch?: string | null;
  }): GitDiffFile {
    return {
      path: file.filename,
      oldPath: file.previous_filename ?? undefined,
      status: file.status as GitDiffFile["status"],
      patch: file.patch ?? undefined,
    };
  }

  private mapIssueComment(data: {
    id: number;
    body?: string | null;
    created_at: string;
    updated_at?: string | null;
    html_url: string;
    user?: {
      login?: string | null;
      avatar_url?: string | null;
      html_url?: string | null;
      type?: string | null;
    } | null;
  }): GitPullRequestIssueComment {
    const login = data.user?.login ?? "unknown";
    return {
      id: data.id,
      body: data.body ?? "",
      authorLogin: login,
      authorAvatarUrl: data.user?.avatar_url ?? null,
      authorHtmlUrl: data.user?.html_url ?? `https://github.com/${login}`,
      isBot: data.user?.type === "Bot" || /\[bot\]$/i.test(login),
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : null,
      url: data.html_url,
    };
  }

  private mapReviewComment(data: {
    id: number;
    body: string;
    path: string;
    line?: number | null;
    original_line?: number | null;
    side?: string | null;
    commit_id: string;
    user?: {
      login?: string | null;
      avatar_url?: string | null;
      html_url?: string | null;
    } | null;
    created_at: string;
    in_reply_to_id?: number | null;
    pull_request_review_id?: number | null;
    html_url: string;
  }): GitReviewComment {
    return {
      id: data.id,
      body: data.body,
      path: data.path,
      line: data.line ?? null,
      originalLine: data.original_line ?? null,
      side: data.side === "LEFT" || data.side === "RIGHT" ? data.side : null,
      commitId: data.commit_id,
      authorLogin: data.user?.login ?? "unknown",
      authorAvatarUrl: data.user?.avatar_url ?? null,
      authorHtmlUrl: data.user?.html_url ?? null,
      createdAt: new Date(data.created_at),
      inReplyToId: data.in_reply_to_id ?? null,
      reviewId: data.pull_request_review_id ?? null,
      url: data.html_url,
    };
  }

  private mapPullRequestReview(data: {
    id: number;
    body?: string | null;
    state: string;
    commit_id?: string | null;
    user?: {
      login?: string | null;
      avatar_url?: string | null;
      html_url?: string | null;
    } | null;
    submitted_at?: string | null;
    html_url?: string | null;
  }): GitPullRequestReview {
    const state = data.state.toUpperCase().replace(/ /g, "_");
    const normalizedState =
      state === "COMMENTED" ||
      state === "APPROVED" ||
      state === "CHANGES_REQUESTED" ||
      state === "DISMISSED" ||
      state === "PENDING"
        ? state
        : data.state === "pending" || !data.state?.trim()
          ? "PENDING"
          : "COMMENTED";

    return {
      id: data.id,
      body: data.body ?? null,
      state: normalizedState as GitPullRequestReview["state"],
      commitId: data.commit_id ?? null,
      authorLogin: data.user?.login ?? "unknown",
      authorAvatarUrl: data.user?.avatar_url ?? null,
      authorHtmlUrl: data.user?.html_url ?? null,
      submittedAt: data.submitted_at ? new Date(data.submitted_at) : null,
      url: data.html_url ?? null,
    };
  }

  private mapCheckRunStatus(
    status: string | null | undefined
  ): GitPullRequestCheck["status"] {
    switch (status) {
      case "queued":
        return "queued";
      case "in_progress":
        return "in_progress";
      case "waiting":
        return "waiting";
      case "pending":
        return "pending";
      case "requested":
        return "requested";
      default:
        return "completed";
    }
  }

  private mapCheckRunConclusion(
    conclusion: string | null | undefined
  ): GitPullRequestCheck["conclusion"] {
    switch (conclusion) {
      case "success":
        return "success";
      case "failure":
        return "failure";
      case "neutral":
        return "neutral";
      case "cancelled":
        return "cancelled";
      case "skipped":
        return "skipped";
      case "timed_out":
        return "timed_out";
      case "action_required":
        return "action_required";
      case "stale":
        return "stale";
      default:
        return null;
    }
  }

  private mapLegacyStatusState(
    state: string
  ): GitPullRequestCheck["conclusion"] {
    switch (state) {
      case "success":
        return "success";
      case "failure":
      case "error":
        return "failure";
      case "pending":
        return null;
      default:
        return "neutral";
    }
  }

  private mapPullRequest(data: {
    id: number;
    number: number;
    html_url: string;
    title: string;
    state: string;
    merged_at: string | null;
    closed_at: string | null;
    draft?: boolean;
    head: { ref: string; sha: string };
    base: { ref: string };
  }): GitPullRequest {
    return {
      providerPrId: String(data.id),
      number: data.number,
      url: data.html_url,
      title: data.title,
      state: mapPrState(data.state, Boolean(data.merged_at), data.draft ?? false),
      headRef: data.head.ref,
      baseRef: data.base.ref,
      headSha: data.head.sha,
      mergedAt: data.merged_at ? new Date(data.merged_at) : null,
      closedAt: data.closed_at ? new Date(data.closed_at) : null,
    };
  }
}
