import { createFileRoute } from "@tanstack/react-router";
import {
  runCompleteGitHubInstallation,
  runExchangeGitHubOAuthCode,
  runSaveGitHubUserLink,
} from "~/db/mutations/git-callback.server";
import { getInstallationAccount } from "~/lib/git/github/installation-octokit";
import { isGitHubConfigured } from "~/env";
import { auth } from "~/lib/auth";

const redirectBase = "/settings/integrations";

function redirectToIntegrations(
  origin: string,
  params?: Record<string, string>
) {
  const target = new URL(redirectBase, origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      target.searchParams.set(key, value);
    }
  }
  return Response.redirect(target.toString(), 302);
}

export const Route = createFileRoute("/api/git/github/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          if (!isGitHubConfigured()) {
            return new Response("GitHub integration is not configured", {
              status: 503,
            });
          }

          const url = new URL(request.url);
          const installationId = url.searchParams.get("installation_id");
          const setupAction = url.searchParams.get("setup_action");
          const code = url.searchParams.get("code");
          const state = url.searchParams.get("state");
          const error = url.searchParams.get("error");

          if (error) {
            return redirectToIntegrations(url.origin, { error });
          }

          const session = await auth.api.getSession({
            headers: request.headers,
          });

          const returnPath = `${url.pathname}${url.search}`;

          if (!session) {
            const signInUrl = new URL("/sign-in", url.origin);
            signInUrl.searchParams.set("redirectTo", returnPath);
            return Response.redirect(signInUrl.toString(), 302);
          }

          const shouldCompleteInstallation =
            installationId &&
            (!setupAction ||
              setupAction === "install" ||
              setupAction === "update");

          if (code && state === "user-oauth") {
            try {
              const tokenData = await runExchangeGitHubOAuthCode(code);
              await runSaveGitHubUserLink(session.user.id, tokenData);
              return redirectToIntegrations(url.origin, { user: "connected" });
            } catch (e) {
              console.error("GitHub user OAuth failed", e);
              return redirectToIntegrations(url.origin, { user: "error" });
            }
          }

          if (shouldCompleteInstallation) {
            try {
              const { accountLogin, accountType } = await getInstallationAccount(
                Number(installationId)
              );

              await runCompleteGitHubInstallation(session, {
                installationId,
                accountLogin,
                accountType,
              });

              return redirectToIntegrations(url.origin, { installed: "1" });
            } catch (e) {
              console.error("GitHub installation callback failed", e);
              return redirectToIntegrations(url.origin, { installed: "error" });
            }
          }

          return redirectToIntegrations(url.origin);
        } catch (e) {
          console.error("GitHub callback failed", e);
          const url = new URL(request.url);
          return redirectToIntegrations(url.origin, { user: "error" });
        }
      },
    },
  },
});
