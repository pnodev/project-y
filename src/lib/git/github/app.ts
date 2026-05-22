import "@tanstack/react-start/server-only";

import { App } from "@octokit/app";
import { env, isGitHubConfigured, isGitHubUserOAuthConfigured } from "~/env";

let githubApp: App | null = null;

export function getGitHubApp(): App {
  if (!isGitHubConfigured()) {
    throw new Error("GitHub App is not configured");
  }
  if (!githubApp) {
    githubApp = new App({
      appId: env.GITHUB_APP_ID!,
      privateKey: env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      oauth: env.GITHUB_APP_CLIENT_ID
        ? {
            clientId: env.GITHUB_APP_CLIENT_ID,
            clientSecret: env.GITHUB_APP_CLIENT_SECRET ?? "",
          }
        : undefined,
    });
  }
  return githubApp;
}

export function getGitHubAppSlug(): string {
  return process.env.GITHUB_APP_SLUG ?? "project-y";
}

export function getGitHubAppInstallUrl(state?: string): string {
  const slug = getGitHubAppSlug();
  const base = `https://github.com/apps/${slug}/installations/new`;
  if (!state) return base;
  return `${base}?state=${encodeURIComponent(state)}`;
}

/** Must match the callback URL registered on the GitHub App. */
export function getGitHubOAuthCallbackUrl(): string {
  const base = env.BETTER_AUTH_URL.replace(/\/$/, "");
  return `${base}/api/git/github/callback`;
}

export function getGitHubUserOAuthUrl(state: string): string {
  if (!isGitHubUserOAuthConfigured()) {
    throw new Error("GitHub user OAuth is not configured");
  }
  const app = getGitHubApp();
  const { url } = app.oauth.getWebFlowAuthorizationUrl({
    state,
    redirectUrl: getGitHubOAuthCallbackUrl(),
  });
  return url;
}

type GitHubUserTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  error?: string;
  error_description?: string;
};

/**
 * Exchange OAuth code for a user access token.
 * Uses fetch directly because @octokit/oauth-methods calls scope.split() before
 * handling github-app responses that omit the scope field.
 */
export async function exchangeGitHubUserAccessToken(code: string) {
  if (!isGitHubUserOAuthConfigured()) {
    throw new Error("GitHub user OAuth is not configured");
  }

  const redirectUrl = getGitHubOAuthCallbackUrl();
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_APP_CLIENT_ID,
      client_secret: env.GITHUB_APP_CLIENT_SECRET,
      code,
      redirect_uri: redirectUrl,
    }),
  });

  const data = (await response.json()) as GitHubUserTokenResponse;
  if (!response.ok || data.error) {
    throw new Error(
      data.error_description ?? data.error ?? "GitHub token exchange failed"
    );
  }
  if (!data.access_token) {
    throw new Error("GitHub token exchange returned no access_token");
  }

  const expiresAt =
    data.expires_in != null
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
  };
}
