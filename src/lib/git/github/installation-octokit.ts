import "@tanstack/react-start/server-only";

import { Octokit } from "@octokit/rest";
import { getGitHubApp } from "./app";
import { readCache, writeCache } from "~/lib/cache/redis";

type CachedInstallationAuth = {
  token: string;
  expiresAt: string;
};

async function getCachedInstallationToken(
  installationId: number
): Promise<string | null> {
  const key = `gh:installation:${installationId}:token`;
  const cached = await readCache<CachedInstallationAuth>(key);
  if (!cached?.token || !cached.expiresAt) return null;

  const expiresAt = new Date(cached.expiresAt).getTime();
  if (expiresAt <= Date.now() + 60_000) return null;

  return cached.token;
}

async function cacheInstallationToken(
  installationId: number,
  token: string,
  expiresAt: string | number
) {
  const expiresAtMs =
    typeof expiresAt === "number" ? expiresAt : new Date(expiresAt).getTime();
  const ttlSeconds = Math.max(
    60,
    Math.floor((expiresAtMs - Date.now()) / 1000) - 60
  );

  await writeCache(
    `gh:installation:${installationId}:token`,
    { token, expiresAt: new Date(expiresAtMs).toISOString() },
    ttlSeconds
  );
}

export async function getInstallationOctokit(installationId: number) {
  const cachedToken = await getCachedInstallationToken(installationId);
  if (cachedToken) {
    return new Octokit({ auth: cachedToken });
  }

  const app = getGitHubApp();
  const installationAuth = (await app.octokit.auth({
    type: "installation",
    installationId,
  })) as { token: string; expiresAt: string | number };

  await cacheInstallationToken(
    installationId,
    installationAuth.token,
    installationAuth.expiresAt
  );
  return new Octokit({ auth: installationAuth.token });
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
