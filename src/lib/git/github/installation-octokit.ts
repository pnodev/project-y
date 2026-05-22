import "@tanstack/react-start/server-only";

import { getGitHubApp } from "./app";

export async function getInstallationOctokit(installationId: number) {
  const app = getGitHubApp();
  return app.getInstallationOctokit(installationId);
}

/** Octokit from @octokit/app — has `.request()`, not `.rest`. */
export type InstallationOctokit = Awaited<
  ReturnType<typeof getInstallationOctokit>
>;

export async function getInstallationAccount(installationId: number) {
  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.request("GET /app/installations/{installation_id}", {
    installation_id: installationId,
  });
  const account = data.account;
  const accountLogin =
    account && "login" in account
      ? account.login
      : account && "slug" in account
        ? account.slug
        : "unknown";
  const accountType =
    account && "type" in account ? account.type : "Organization";
  return { accountLogin, accountType };
}

type InstallationRepo = {
  id: number;
  full_name?: string;
  name?: string;
  owner?: { login?: string };
  default_branch?: string;
  html_url?: string;
  archived?: boolean;
};

export async function listInstallationRepositories(
  octokit: InstallationOctokit
): Promise<InstallationRepo[]> {
  const repos: InstallationRepo[] = [];
  let page = 1;

  while (true) {
    const { data } = await octokit.request("GET /installation/repositories", {
      per_page: 100,
      page,
    });
    repos.push(...(data.repositories as InstallationRepo[]));
    if (repos.length >= data.total_count) break;
    page += 1;
  }

  return repos;
}
