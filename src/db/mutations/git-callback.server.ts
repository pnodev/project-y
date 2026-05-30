import "@tanstack/react-start/server-only";

import { and, eq } from "drizzle-orm";
import { v7 as uuid } from "uuid";
import { db } from "~/db";
import {
  gitConnections,
  gitRepositories,
  gitStatusRules,
  gitUserLinks,
  statuses,
} from "~/db/schema";
import { encryptSecret } from "~/lib/git/crypto";
import { getGitProvider } from "~/lib/git/factory";
import { DEFAULT_STATUS_RULE_PATTERNS } from "~/lib/git/status-rules";
import { Octokit } from "@octokit/rest";
import { exchangeGitHubUserAccessToken } from "~/lib/git/github/app";
import { isGitHubConfigured } from "~/env";
import { getClosingStatusOrLastByOrder } from "~/lib/statuses";
import { getOwningIdentity } from "~/lib/utils";
import type { requireSessionFromRequest } from "~/lib/session";

export async function runCompleteGitHubInstallation(
  session: Awaited<ReturnType<typeof requireSessionFromRequest>>,
  data: {
    installationId: string;
    accountLogin: string;
    accountType: string;
  }
) {
  const owner = getOwningIdentity(session);
  const now = new Date();

  const existing = await db.query.gitConnections.findFirst({
    where: and(
      eq(gitConnections.owner, owner),
      eq(gitConnections.provider, "github")
    ),
  });

  let connectionId: string;
  if (existing) {
    connectionId = existing.id;
    await db
      .update(gitConnections)
      .set({
        installationId: data.installationId,
        accountLogin: data.accountLogin,
        accountType: data.accountType,
        updatedAt: now,
      })
      .where(eq(gitConnections.id, existing.id));
  } else {
    connectionId = uuid();
    await db.insert(gitConnections).values({
      id: connectionId,
      owner,
      provider: "github",
      installationId: data.installationId,
      accountLogin: data.accountLogin,
      accountType: data.accountType,
      connectedByUserId: session.user.id,
      updatedAt: now,
    });

    const ownerStatuses = await db.query.statuses.findMany({
      where: eq(statuses.owner, owner),
      orderBy: (s, { asc }) => [asc(s.order)],
    });
    const doneStatus = getClosingStatusOrLastByOrder(ownerStatuses);
    const inProgressStatus =
      ownerStatuses[Math.min(1, ownerStatuses.length - 1)] ?? ownerStatuses[0];

    if (doneStatus && inProgressStatus) {
      await db.insert(gitStatusRules).values([
        {
          id: uuid(),
          owner,
          pattern: DEFAULT_STATUS_RULE_PATTERNS.close,
          targetStatusId: doneStatus.id,
          priority: 10,
          updatedAt: now,
        },
        {
          id: uuid(),
          owner,
          pattern: DEFAULT_STATUS_RULE_PATTERNS.wip,
          targetStatusId: inProgressStatus.id,
          priority: 5,
          updatedAt: now,
        },
      ]);
    }
  }

  const provider = getGitProvider("github");
  const conn = await db.query.gitConnections.findFirst({
    where: eq(gitConnections.id, connectionId),
  });
  if (conn) {
    try {
      const repos = await provider.syncRepositories(conn);
      for (const repo of repos) {
        const existingRepo = await db.query.gitRepositories.findFirst({
          where: and(
            eq(gitRepositories.connectionId, conn.id),
            eq(gitRepositories.externalId, repo.externalId)
          ),
        });
        if (!existingRepo) {
          await db.insert(gitRepositories).values({
            id: uuid(),
            connectionId: conn.id,
            owner,
            externalId: repo.externalId,
            fullName: repo.fullName,
            defaultBranch: repo.defaultBranch,
            htmlUrl: repo.htmlUrl,
            isArchived: repo.isArchived,
            updatedAt: now,
          });
        }
      }
    } catch (error) {
      console.error(
        "GitHub repository sync failed after install (connection saved)",
        error
      );
    }
  }

  return { connectionId };
}

export async function runSaveGitHubUserLink(
  userId: string,
  data: {
    providerUserId: string;
    providerLogin?: string;
    accessToken: string;
    refreshToken?: string;
    scopes?: string;
    expiresAt?: string;
  }
) {
  const now = new Date();
  const encrypted = encryptSecret(data.accessToken);

  const existing = await db.query.gitUserLinks.findFirst({
    where: and(
      eq(gitUserLinks.userId, userId),
      eq(gitUserLinks.provider, "github")
    ),
  });

  if (existing) {
    await db
      .update(gitUserLinks)
      .set({
        providerUserId: data.providerUserId,
        providerLogin: data.providerLogin,
        accessToken: encrypted,
        refreshToken: data.refreshToken
          ? encryptSecret(data.refreshToken)
          : null,
        scopes: data.scopes,
        tokenExpiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        updatedAt: now,
      })
      .where(eq(gitUserLinks.id, existing.id));
  } else {
    await db.insert(gitUserLinks).values({
      id: uuid(),
      userId,
      provider: "github",
      providerUserId: data.providerUserId,
      providerLogin: data.providerLogin,
      accessToken: encrypted,
      refreshToken: data.refreshToken
        ? encryptSecret(data.refreshToken)
        : null,
      scopes: data.scopes,
      tokenExpiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      updatedAt: now,
    });
  }
}

export async function runExchangeGitHubOAuthCode(code: string) {
  const { accessToken, refreshToken, expiresAt } =
    await exchangeGitHubUserAccessToken(code);
  const octokit = new Octokit({ auth: accessToken });
  const { data: ghUser } = await octokit.rest.users.getAuthenticated();
  return {
    accessToken,
    refreshToken,
    expiresAt,
    scopes: undefined,
    providerUserId: String(ghUser.id),
    providerLogin: ghUser.login,
  };
}
