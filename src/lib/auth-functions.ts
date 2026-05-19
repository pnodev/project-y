import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { auth } from "~/lib/auth";

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  return auth.api.getSession({
    headers: getRequestHeaders(),
  });
});

export const requireSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await auth.api.getSession({
      headers: getRequestHeaders(),
    });

    if (!session) {
      throw redirect({ to: "/sign-in/$" });
    }

    return session;
  }
);
