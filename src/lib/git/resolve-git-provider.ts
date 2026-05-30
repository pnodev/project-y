import type { GitProviderType } from "~/db/schema/git";

export function resolveGitProvider(args: {
  connectionProvider?: GitProviderType | null;
  pullRequestUrl?: string | null;
  repositoryHtmlUrl?: string | null;
}): GitProviderType | null {
  if (args.connectionProvider) return args.connectionProvider;

  const url = args.pullRequestUrl ?? args.repositoryHtmlUrl ?? "";
  if (/github\.com/i.test(url)) return "github";
  if (/gitlab\.com/i.test(url)) return "gitlab";

  return null;
}
