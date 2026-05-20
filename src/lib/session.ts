import "@tanstack/react-start/server-only";

import { redirect } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "~/lib/auth";

/** Read the session in server handlers (loaders, server functions, API routes). */
export async function getSessionFromRequest() {
  return auth.api.getSession({
    headers: getRequestHeaders(),
  });
}

/** Like getSessionFromRequest but redirects unauthenticated users to sign-in. */
export async function requireSessionFromRequest() {
  const session = await getSessionFromRequest();

  if (!session) {
    throw redirect({ to: "/sign-in/$" });
  }

  return session;
}
