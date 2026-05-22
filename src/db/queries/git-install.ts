import { createServerFn } from "@tanstack/react-start";
import { isGitHubConfigured, isGitHubUserOAuthConfigured } from "~/env";
import {
  getGitHubAppInstallUrl,
  getGitHubUserOAuthUrl,
} from "~/lib/git/github/app";
import { requireSessionFromRequest } from "~/lib/session";
import { getOwningIdentity } from "~/lib/utils";

export const fetchGitHubInstallUrls = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await requireSessionFromRequest();
    if (!isGitHubConfigured()) {
      return { configured: false as const };
    }
    const owner = getOwningIdentity(session);
    return {
      configured: true as const,
      installUrl: getGitHubAppInstallUrl(owner),
      userOAuthConfigured: isGitHubUserOAuthConfigured(),
      userOAuthUrl: isGitHubUserOAuthConfigured()
        ? getGitHubUserOAuthUrl("user-oauth")
        : null,
    };
  }
);
