import type { GitProviderType } from "~/db/schema";
import type { GitProvider } from "./types";
import { GitHubProvider } from "./github/provider";
import { CachedGitHubProvider } from "./github/cached-provider";
import { GitLabProvider } from "./gitlab/provider";
import { isRedisConfigured } from "~/env";

const githubProvider: GitProvider = isRedisConfigured()
  ? new CachedGitHubProvider(new GitHubProvider())
  : new GitHubProvider();
const gitlabProvider = new GitLabProvider();

export function getGitProvider(provider: GitProviderType): GitProvider {
  switch (provider) {
    case "github":
      return githubProvider;
    case "gitlab":
    case "gitlab_self_hosted":
      return gitlabProvider;
    default:
      throw new Error(`Unknown git provider: ${provider}`);
  }
}
